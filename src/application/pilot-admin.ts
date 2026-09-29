import { eq, inArray } from 'drizzle-orm';
import type { Database } from '../persistence/database.js';
import * as t from '../persistence/schema.js';
import { AppError } from '../domain/contracts.js';
import { ACCESS_STATUS, PilotAccess, type AccessStatus } from './pilot-access.js';

/**
 * Operator administration for the pilot.
 *
 * Two rules govern this module:
 *  1. Every metric is read from the canonical aggregation in PilotAccess (metrics/report), which already
 *     strips demo-brand activity server-side. Nothing here recomputes participant evidence, so the
 *     CoffeePolis exclusions cannot drift between the admin surface and the pilot's own reporting.
 *  2. Nothing strategic ever leaves this module: no decision text, no document content, no session,
 *     OAuth or reset material. Only operational metadata an operator needs to run the pilot.
 */

/** Admin identities come from configuration. No address is ever compiled into the source. */
export function adminEmails(env: NodeJS.ProcessEnv = process.env): readonly string[] {
  const raw = env.BRANDOPOLIS_ADMIN_EMAILS?.trim();
  if (!raw) return [];
  return Object.freeze(raw.split(',').map(value => value.trim().toLowerCase()).filter(Boolean));
}

export class PilotAdmin {
  constructor(private db: Database, private access: PilotAccess, private allowlist: readonly string[] = adminEmails()) {}

  /**
   * Authorizes an operator. Three conditions, all required: a live PILOT session, an account whose
   * email the identity provider verified, and membership of the configured allowlist. Every endpoint
   * calls this independently; there is no shared "already checked" state to get wrong.
   */
  async authorizeAdmin(token: string) {
    const who = await this.access.authorize(token) as { userId: string };
    const [account] = await this.db.select().from(t.userAccounts).where(eq(t.userAccounts.userId, who.userId));
    if (!account?.emailVerifiedAt) throw new AppError('FORBIDDEN', 'Administración no disponible');
    if (!this.allowlist.includes(account.normalizedEmail)) throw new AppError('FORBIDDEN', 'Administración no disponible');
    return { userId: who.userId, email: account.normalizedEmail };
  }

  /** Whether this session may see the admin surface at all. Never reveals why it may not. */
  async isAdmin(token: string) {
    try { await this.authorizeAdmin(token); return true; } catch { return false; }
  }

  /** Real brands, demo brands and who owns them. The single place brand classification is resolved. */
  private async brandCensus() {
    const brands = await this.db.select().from(t.brands).where(eq(t.brands.dataClass, 'PILOT'));
    const profiles = await this.db.select().from(t.brandProfiles);
    const demo = new Set(profiles.filter(p => p.isDemo).map(p => p.brandId));
    const assignments = await this.db.select().from(t.assignments);
    const realByUser = new Map<string, Set<string>>();
    for (const a of assignments) {
      if (demo.has(a.brandId) || !brands.some(b => b.id === a.brandId)) continue;
      realByUser.set(a.userId, (realByUser.get(a.userId) ?? new Set()).add(a.brandId));
    }
    return {
      realBrands: brands.filter(b => !demo.has(b.id)).length,
      demoBrands: brands.filter(b => demo.has(b.id)).length,
      realByUser
    };
  }

  /**
   * Pilot summary. Canonical values come straight from report(); anything this surface adds is
   * operational (intake completion, real-brand counts) and is computed from classified records, never
   * inferred. A metric the architecture cannot derive is returned as null and labelled unavailable
   * rather than filled with a plausible number.
   */
  /**
   * Strategic progression and human authority over AI, derived from durable state rather than clicks.
   *
   *  - phaseCompletionCounts: modules with an approved active version, per canonical module. Demo brands
   *    are excluded exactly as every participant metric excludes them.
   *  - strategyReady: brands whose canonical questions all have an active version and which carry no
   *    HARD review outstanding (docs/09-validation/metrics.md: Strategy Ready Rate).
   *  - humanOverride: of the recommendations a person resolved, how many they changed or rejected.
   *    Accepted vs modified is read from the committed version against the proposal it came from, so a
   *    participant who edited the wording counts as an override, which is the point of the metric.
   */
  private async progression() {
    const demo = new Set((await this.db.select().from(t.brandProfiles).where(eq(t.brandProfiles.isDemo, true))).map(b => b.brandId));
    const real = <T extends { brandId: string }>(rows: T[]) => rows.filter(r => !demo.has(r.brandId));
    const questions = real(await this.db.select().from(t.questions));
    const decisions = real(await this.db.select().from(t.decisions));
    const versions = real(await this.db.select().from(t.versions));
    const reviews = real(await this.db.select().from(t.reviews));
    const recommendations = real(await this.db.select().from(t.recommendations));

    const activeVersion = new Map(versions.map(v => [v.id, v]));
    const moduleOf = new Map(questions.map(q => [q.id, q.module]));
    const decided = decisions.filter(d => d.activeVersionId && activeVersion.has(d.activeVersionId));

    const phaseCompletionCounts: Record<string, number> = {};
    for (const decision of decided) {
      const module = moduleOf.get(decision.questionId);
      if (module) phaseCompletionCounts[module] = (phaseCompletionCounts[module] ?? 0) + 1;
    }

    // Strategy Ready: every canonical question of the brand decided, and no HARD review left open.
    const byBrand = new Map<string, { total: number; decided: number; hardOpen: boolean }>();
    for (const question of questions) {
      const entry = byBrand.get(question.brandId) ?? { total: 0, decided: 0, hardOpen: false };
      entry.total += 1;
      byBrand.set(question.brandId, entry);
    }
    for (const decision of decided) {
      const entry = byBrand.get(decision.brandId);
      if (entry) entry.decided += 1;
    }
    for (const review of reviews) {
      if (review.dependencyType === 'HARD' && review.status !== 'COMPLETED') {
        const entry = byBrand.get(review.brandId);
        if (entry) entry.hardOpen = true;
      }
    }
    const eligible = [...byBrand.values()].filter(b => b.total > 0);
    const ready = eligible.filter(b => b.decided === b.total && !b.hardOpen).length;

    // Human Override: resolved recommendations, and how the human resolved them.
    const rejected = recommendations.filter(r => r.resolution === 'REJECTED').length;
    const audits = real(await this.db.select().from(t.audits));
    const versionById = new Map(versions.map(v => [v.id, v]));
    const proposalById = new Map(recommendations.map(r => [r.id, r]));
    const fromProposal = audits.filter(a => a.sourceRecommendationId && a.newVersion && versionById.has(a.newVersion));
    let accepted = 0, modified = 0;
    for (const entry of fromProposal) {
      const proposal = proposalById.get(entry.sourceRecommendationId!);
      const payload = proposal?.payload as { options?: { label: string }[] } | undefined;
      const labels = new Set((payload?.options ?? []).map(o => o.label));
      // Taken as offered if the committed text is one of the proposed options verbatim; otherwise the
      // participant rewrote it, which is exactly what this metric is meant to catch.
      if (labels.has(versionById.get(entry.newVersion!)!.selectedOption)) accepted += 1; else modified += 1;
    }
    const resolved = accepted + modified + rejected;
    return {
      phaseCompletionCounts,
      strategyReady: { eligibleBrands: eligible.length, ready, rate: eligible.length ? Math.round(ready / eligible.length * 1000) / 1000 : null },
      humanOverride: { resolved, accepted, modified, rejected, rate: resolved ? Math.round((modified + rejected) / resolved * 1000) / 1000 : null },
      // Per-option Incorporar/Modificar/Descartar is a client-side comparison aid and is not persisted,
      // so only the outcomes that became strategy are counted here. Discards leave no durable trace.
      optionActionCounts: { incorporatedOrModified: fromProposal.length, rejectedProposals: rejected, discarded: null }
    };
  }

  async summary() {
    const report = await this.access.report();
    const identities = await this.db.select().from(t.pilotIdentities);
    const accounts = await this.db.select().from(t.userAccounts);
    const profiles = await this.db.select().from(t.participantProfiles);
    const census = await this.brandCensus();
    const since = (days: number) => { const d = new Date(); d.setUTCDate(d.getUTCDate() - days); return d; };
    const startOfToday = new Date(); startOfToday.setUTCHours(0, 0, 0, 0);
    const createdAfter = (at: Date) => accounts.filter(a => a.createdAt >= at).length;
    return {
      generatedAt: report.generatedAt,
      participants: identities.length,
      activeParticipants: identities.filter(i => i.active).length,
      newToday: createdAfter(startOfToday),
      new7d: createdAfter(since(7)),
      new30d: createdAfter(since(30)),
      intakeComplete: profiles.length,
      participantsWithRealBrand: census.realByUser.size,
      realBrands: census.realBrands,
      demoBrands: census.demoBrands,
      participantsWithSecondRealBrand: [...census.realByUser.values()].filter(set => set.size > 1).length,
      participantsWithSessions: report.testersWithSessions,
      returningParticipants: report.returningTesters,
      activated: report.activated,
      activationRate: report.activationRate,
      timeToFirstInsight: report.timeToFirstInsight,
      timeToFirstDecision: report.timeToFirstDecision,
      ai: report.ai,
      reviewsCompleted: report.reviewsCompleted,
      mapaEstrategico: report.mapaEstrategico,
      evidence: report.evidence,
      retention: report.retention,
      ...await this.progression(),
      // Measurable only with capability this build does not have: AI cost is not captured per request,
      // and there is no payment or offer surface, so cost-per-decision, cost-per-active-brand, WTP and
      // paid conversion are reported as absent rather than approximated.
      unavailable: ['aiCostPerDecision', 'aiCostPerActiveBrand', 'willingnessToPay', 'pilotPaidConversion']
    };
  }

  /** Operational roster. Strategic content is never selected, so it cannot leak by accident. */
  async participants() {
    const identities = await this.db.select().from(t.pilotIdentities);
    const accounts = new Map((await this.db.select().from(t.userAccounts)).map(a => [a.userId, a]));
    const profiles = new Map((await this.db.select().from(t.participantProfiles)).map(p => [p.userId, p]));
    const workspaces = new Map((await this.db.select().from(t.pilotWorkspaces)).map(w => [w.workspaceId, w]));
    const metrics = new Map((await this.access.metrics()).map(m => [m.userId, m]));
    const census = await this.brandCensus();
    return identities.map(identity => {
      const account = accounts.get(identity.userId), profile = profiles.get(identity.userId);
      return {
        userId: identity.userId,
        name: profile ? `${profile.firstName} ${profile.lastName}` : null,
        email: account?.email ?? null,
        country: profile?.country ?? null,
        region: profile?.region ?? null,
        city: profile?.city ?? null,
        primaryProfile: profile?.primaryProfile ?? null,
        companyOrProject: profile?.companyOrProject ?? null,
        registeredAt: account?.createdAt ?? null,
        lastLoginAt: account?.lastLoginAt ?? null,
        sessions: metrics.get(identity.userId)?.sessions ?? 0,
        realBrands: census.realByUser.get(identity.userId)?.size ?? 0,
        cohort: workspaces.get(identity.workspaceId)?.cohort ?? null,
        accessStatus: account?.accessStatus ?? ACCESS_STATUS.approved,
        identityActive: identity.active,
        intakeComplete: Boolean(profile),
        activated: metrics.get(identity.userId)?.activated ?? false,
        decisionsApproved: metrics.get(identity.userId)?.decisionsApproved ?? 0,
        timeToFirstInsightSeconds: metrics.get(identity.userId)?.timeToFirstInsightSeconds ?? null,
        timeToFirstDecisionSeconds: metrics.get(identity.userId)?.timeToFirstDecisionSeconds ?? null,
        recurrent: (metrics.get(identity.userId)?.sessions ?? 0) > 1,
        openedEvidence: metrics.get(identity.userId)?.openedEvidence ?? false,
        evidenceSupplied: metrics.get(identity.userId)?.evidenceSupplied ?? 0,
        mapaEstrategicoViewed: metrics.get(identity.userId)?.mapaEstrategicoViewed ?? false,
        mapaEstrategicoExports: metrics.get(identity.userId)?.mapaEstrategicoExports ?? 0,
        recommendationsRequested: metrics.get(identity.userId)?.recommendationsRequested ?? 0,
        recommendationsFailed: metrics.get(identity.userId)?.recommendationsFailed ?? 0
      };
    });
  }

  /**
   * Validation evidence. Aggregates only: distributions are counts by bucket, never rows, so an export
   * cannot identify a participant. City is deliberately omitted even in aggregate, because a city count
   * of one in a small pilot names somebody.
   */
  async evidence(range?: { from?: Date; to?: Date }) {
    const summary = await this.summary();
    const accounts = await this.db.select().from(t.userAccounts);
    const inRange = (at: Date | null) => !at ? false
      : (!range?.from || at >= range.from) && (!range?.to || at <= range.to);
    const scoped = range?.from || range?.to ? accounts.filter(a => inRange(a.createdAt)).map(a => a.userId) : accounts.map(a => a.userId);
    const profiles = scoped.length
      ? await this.db.select().from(t.participantProfiles).where(inArray(t.participantProfiles.userId, scoped))
      : [];
    const workspaces = await this.db.select().from(t.pilotWorkspaces);
    const identities = await this.db.select().from(t.pilotIdentities);
    const tally = (values: (string | null)[]) => {
      const counts = new Map<string, number>();
      for (const value of values) if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
      return Object.fromEntries([...counts].sort((a, b) => b[1] - a[1]));
    };
    const cohortOf = (userId: string) => workspaces.find(w => w.workspaceId === identities.find(i => i.userId === userId)?.workspaceId)?.cohort ?? null;
    const feedback = await this.db.select().from(t.feedback);
    const mean = (values: number[]) => values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length * 100) / 100 : null;
    return {
      generatedAt: summary.generatedAt,
      range: { from: range?.from?.toISOString() ?? null, to: range?.to?.toISOString() ?? null },
      sample: { participants: summary.participants, intakeComplete: summary.intakeComplete, active: summary.activeParticipants },
      engagement: {
        participantsWithSessions: summary.participantsWithSessions,
        returningParticipants: summary.returningParticipants
      },
      product: {
        realBrands: summary.realBrands,
        demoBrands: summary.demoBrands,
        participantsWithRealBrand: summary.participantsWithRealBrand,
        participantsWithSecondRealBrand: summary.participantsWithSecondRealBrand,
        activated: summary.activated,
        activationRate: summary.activationRate,
        timeToFirstInsight: summary.timeToFirstInsight,
        timeToFirstDecision: summary.timeToFirstDecision,
        ai: summary.ai,
        mapaEstrategico: summary.mapaEstrategico,
        evidenceEngagement: summary.evidence,
        phaseCompletionCounts: summary.phaseCompletionCounts,
        strategyReady: summary.strategyReady,
        humanOverride: summary.humanOverride,
        optionActionCounts: summary.optionActionCounts,
        retention: summary.retention
      },
      segmentation: {
        primaryProfile: tally(profiles.map(p => p.primaryProfile)),
        country: tally(profiles.map(p => p.country)),
        region: tally(profiles.map(p => p.region)),
        cohort: tally(scoped.map(cohortOf))
      },
      feedback: {
        responses: feedback.filter(f => f.kind === 'FEEDBACK').length,
        issues: feedback.filter(f => f.kind === 'ISSUE').length,
        usefulness: mean(feedback.map(f => f.usefulness)),
        clarity: mean(feedback.map(f => f.clarity)),
        confidence: mean(feedback.map(f => f.confidence))
      },
      unavailable: summary.unavailable
    };
  }

  /** Feedback for an operator: ratings, kind and the participant's own comment. No strategy text. */
  async feedback() {
    const rows = await this.db.select().from(t.feedback);
    const accounts = new Map((await this.db.select().from(t.userAccounts)).map(a => [a.userId, a.email]));
    return rows
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map(row => ({
        id: row.id, kind: row.kind, createdAt: row.createdAt,
        usefulness: row.usefulness, clarity: row.clarity, confidence: row.confidence,
        comment: row.comment, email: accounts.get(row.userId) ?? null
      }));
  }

  /**
   * Operator status control. Deliberately narrower than disable(): an identity an operator disabled
   * stays disabled, because re-approval here must never silently resurrect a hard kill.
   */
  async setAccessStatus(token: string, userId: string, status: AccessStatus) {
    const admin = await this.authorizeAdmin(token);
    if (status === ACCESS_STATUS.pending) throw new AppError('INVALID', 'PENDING no se asigna manualmente en este piloto');
    const [identity] = await this.db.select().from(t.pilotIdentities).where(eq(t.pilotIdentities.userId, userId));
    if (!identity) throw new AppError('NOT_FOUND', 'Participante no disponible');
    const result = await this.access.setAccessStatus(userId, status);
    // Audited against the acting operator, never anonymous.
    await this.db.insert(t.capabilityEvents).values({
      id: crypto.randomUUID(), userId: admin.userId,
      payload: { event: 'admin_access_status_changed', target: userId, status, at: new Date().toISOString() }
    });
    return { ...result, identityActive: identity.active };
  }
}

/** Aggregate evidence as CSV. Counts only, so no row can identify a participant. */
export function evidenceCsv(evidence: Awaited<ReturnType<PilotAdmin['evidence']>>) {
  const rows: string[][] = [['metric', 'value']];
  const push = (metric: string, value: unknown) => rows.push([metric, value == null ? '' : String(value)]);
  push('participants', evidence.sample.participants);
  push('intake_complete', evidence.sample.intakeComplete);
  push('active_participants', evidence.sample.active);
  push('participants_with_sessions', evidence.engagement.participantsWithSessions);
  push('returning_participants', evidence.engagement.returningParticipants);
  push('real_brands', evidence.product.realBrands);
  push('demo_brands', evidence.product.demoBrands);
  push('participants_with_real_brand', evidence.product.participantsWithRealBrand);
  push('participants_with_second_real_brand', evidence.product.participantsWithSecondRealBrand);
  push('activated', evidence.product.activated);
  push('activation_rate', evidence.product.activationRate);
  push('time_to_first_insight_median_seconds', evidence.product.timeToFirstInsight.medianSeconds);
  push('time_to_first_decision_median_seconds', evidence.product.timeToFirstDecision.medianSeconds);
  push('ai_requested', evidence.product.ai.requested);
  push('ai_failed', evidence.product.ai.failed);
  push('mapa_estrategico_viewed', evidence.product.mapaEstrategico.viewed);
  push('mapa_estrategico_export_participants', evidence.product.mapaEstrategico.exportedParticipants);
  push('mapa_estrategico_exports', evidence.product.mapaEstrategico.exports);
  push('evidence_exposed', evidence.product.evidenceEngagement.exposed);
  push('evidence_opened', evidence.product.evidenceEngagement.opened);
  push('evidence_engagement_rate', evidence.product.evidenceEngagement.rate);
  push('evidence_participants_supplying', evidence.product.evidenceEngagement.participantsSupplying);
  push('strategy_ready_brands', evidence.product.strategyReady.ready);
  push('strategy_ready_rate', evidence.product.strategyReady.rate);
  push('human_override_resolved', evidence.product.humanOverride.resolved);
  push('human_override_rate', evidence.product.humanOverride.rate);
  for (const [module, count] of Object.entries(evidence.product.phaseCompletionCounts)) push('phase_completed:' + module, count);
  for (const [window, value] of Object.entries(evidence.product.retention)) {
    push('retention_' + window + '_observed', value.observed);
    push('retention_' + window + '_returned', value.returned);
    push('retention_' + window + '_rate', value.rate);
  }
  push('feedback_responses', evidence.feedback.responses);
  push('feedback_issues', evidence.feedback.issues);
  for (const [group, values] of Object.entries(evidence.segmentation))
    for (const [bucket, count] of Object.entries(values)) push(`${group}:${bucket}`, count);
  return rows.map(row => row.map(cell => /[",\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell).join(',')).join('\n');
}
