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
      // Not derivable from the canonical envelope today; surfaced as a documented gap, never guessed.
      unavailable: ['documentEngagement', 'phaseCompletionCounts', 'optionActionCounts']
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
        intakeComplete: Boolean(profile)
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
        ai: summary.ai
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
  push('feedback_responses', evidence.feedback.responses);
  push('feedback_issues', evidence.feedback.issues);
  for (const [group, values] of Object.entries(evidence.segmentation))
    for (const [bucket, count] of Object.entries(values)) push(`${group}:${bucket}`, count);
  return rows.map(row => row.map(cell => /[",\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell).join(',')).join('\n');
}
