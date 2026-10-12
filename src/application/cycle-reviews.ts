import { randomUUID } from 'node:crypto';
import { and, desc, eq, inArray, isNotNull } from 'drizzle-orm';
import { AppError } from '../domain/contracts.js';
import type { Transaction } from '../persistence/database.js';
import * as t from '../persistence/schema.js';
import type { BrandActor } from './brand-access.js';
import { readResults } from './clients.js';

/**
 * Block 8 · cycle review (PHASE4_SPEC §4.8, RES-001…003). A person reviews the period's available results with their
 * sources and limitations, writes what was learned and the proposals for the next period, and decides to maintain,
 * adjust or test again, with a criterion. Brando may suggest proposals (labelled, deterministic in DEMO); none is
 * accepted automatically and saving never changes strategy, the plan or a campaign (INV-006, VAL-010).
 */
type Metric = { id: string; label: string; value: number | null; available: boolean; kind: string; state?: string; reason?: string; limitations?: string; source?: string; currency?: string };
const DECISIONS = ['MAINTAIN', 'ADJUST', 'RETEST'] as const;
const idKey = (v: unknown) => { if (typeof v !== 'string' || !v.trim() || v.length > 200) throw new AppError('INVALID', 'Invalid idempotency key'); return v; };
const day = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

/** What the review starts from: results with their kind and source, the limitations they imply and Brando's suggestions. */
export async function cycleReviewDraft(tx: Transaction, a: BrandActor, now = new Date()) {
  const results = await readResults(tx, a, {}, now);
  const all = [...results.marketing, ...results.operations, ...results.sales, ...results.campaigns.flatMap(c => c.metrics.map(m => ({ ...m, label: `${c.name} · ${m.label}` })))] as Metric[];
  const limitations: string[] = [];
  if (all.some(m => m.state === 'NOT_CONNECTED' && m.kind === 'PROVIDER')) limitations.push('No hay cuentas reales de Google o Meta conectadas: no hay gasto ni actividad real de campañas.');
  if (all.some(m => m.kind === 'SIMULATED')) limitations.push('Hay lecturas del simulador: sirven para probar el recorrido, no son resultados.');
  if (all.some(m => m.kind === 'PLANNED_BUDGET' && m.available)) limitations.push('El presupuesto planificado no es gasto.');
  limitations.push('Las referencias de campaña de las oportunidades se capturan sin verificar: no son atribución.');
  limitations.push('Ventas, importes y ROAS no están disponibles en esta fase.');
  const suggestions: { text: string; basis: string; campaignId?: string }[] = [];
  const unassigned = all.find(m => m.id === 'unassigned'), noFollow = all.find(m => m.id === 'no_follow_up');
  if (unassigned?.value) suggestions.push({ text: `Asignar responsable a las ${unassigned.value} oportunidades pendientes antes de abrir nuevas campañas.`, basis: 'Clientes · por asignar' });
  if (noFollow?.value) suggestions.push({ text: `Fijar fecha de seguimiento a ${noFollow.value} oportunidades.`, basis: 'Clientes · sin seguimiento' });
  for (const c of results.campaigns) suggestions.push({ text: `Probar en el siguiente periodo si la campaña «${c.name}» trae oportunidades con su referencia (activar exige su propia autorización; en DEMO sólo con el simulador).`, basis: `Campaña «${c.name}»`, campaignId: c.id });
  const previous = await tx.select().from(t.cycleReviews).where(and(eq(t.cycleReviews.workspaceId, a.workspaceId), eq(t.cycleReviews.brandId, a.brandId))).orderBy(desc(t.cycleReviews.createdAt));
  const links = previous.length ? await tx.select().from(t.cycleReviewExperiments).where(and(eq(t.cycleReviewExperiments.workspaceId, a.workspaceId), eq(t.cycleReviewExperiments.brandId, a.brandId), inArray(t.cycleReviewExperiments.reviewId, previous.map(r => r.id)))) : [];
  return {
    period: { start: new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10), end: now.toISOString().slice(0, 10) },
    results: all.map(m => ({ id: m.id, label: m.label, value: m.value, available: m.available, kind: m.kind, state: m.state ?? null, currency: m.currency ?? null })),
    limitations, suggestions: { mode: 'DETERMINISTIC_DEMO', items: suggestions },
    previous: previous.map(r => ({ id: r.id, periodStart: r.periodStart, periodEnd: r.periodEnd, decision: r.decision, criterion: r.criterion, learnings: r.learnings, proposals: r.proposals, limitations: r.limitations, createdAt: r.createdAt.toISOString(), experiments: links.filter(l => l.reviewId === r.id).map(l => ({ proposalIndex: l.proposalIndex, experimentId: l.experimentId, mode: l.mode })) })),
    validation: await validationOptions(tx, a),
  };
}

/**
 * Saves the human review (append-only). Results and limitations are recomputed on the server at that moment, never
 * taken from the browser. Proposals are text decided by the person, each marked with its origin; none is applied.
 */
export async function saveCycleReview(tx: Transaction, a: BrandActor, input: { periodStart?: unknown; periodEnd?: unknown; learnings?: unknown; proposals?: unknown; decision?: unknown; criterion?: unknown; idempotencyKey?: unknown }) {
  const idempotencyKey = idKey(input.idempotencyKey);
  const [prior] = await tx.select().from(t.cycleReviews).where(and(eq(t.cycleReviews.workspaceId, a.workspaceId), eq(t.cycleReviews.brandId, a.brandId), eq(t.cycleReviews.createdBy, a.userId), eq(t.cycleReviews.idempotencyKey, idempotencyKey)));
  if (prior) return { reviewId: prior.id, replayed: true };
  const start = day(input.periodStart), end = day(input.periodEnd);
  if (!start || !end || end < start) throw new AppError('INVALID', 'Choose the period you are reviewing');
  if (!DECISIONS.includes(input.decision as typeof DECISIONS[number])) throw new AppError('INVALID', 'Choose maintain, adjust or test again');
  const criterion = typeof input.criterion === 'string' ? input.criterion.trim() : '';
  if (criterion.length < 10 || criterion.length > 2000) throw new AppError('INVALID', 'Explain your decision');
  const learnings = typeof input.learnings === 'string' ? input.learnings.trim().slice(0, 4000) : '';
  // A proposal may name a campaign of this brand; the server pins the campaign's approved version at this moment.
  const own = await tx.select({ id: t.campaigns.id, approvedVersionId: t.campaigns.approvedVersionId }).from(t.campaigns).where(and(eq(t.campaigns.workspaceId, a.workspaceId), eq(t.campaigns.brandId, a.brandId)));
  const proposals = (Array.isArray(input.proposals) ? input.proposals : []).slice(0, 12).map(p => { const o = (p ?? {}) as Record<string, unknown>; const c = own.find(x => x.id === o.campaignId); return { text: typeof o.text === 'string' ? o.text.trim().slice(0, 500) : '', origin: o.origin === 'BRANDO' ? 'BRANDO' : 'PERSON', status: 'PROPOSED_FOR_NEXT_PERIOD', ...(c ? { campaignId: c.id, campaignVersionId: c.approvedVersionId } : {}) }; }).filter(p => p.text);
  const draft = await cycleReviewDraft(tx, a);
  const id = randomUUID();
  await tx.insert(t.cycleReviews).values({ id, workspaceId: a.workspaceId, brandId: a.brandId, periodStart: start, periodEnd: end, results: { computedAt: new Date().toISOString(), items: draft.results }, limitations: draft.limitations, learnings, proposals, decision: input.decision as string, criterion, createdBy: a.userId, idempotencyKey, createdAt: new Date() });
  return { reviewId: id, replayed: false };
}

// ─── Link to the Validation engine (Experiment/Signal/Learning, Phase 3) ────────────────────────────────────────────
/** What an experiment may hang from: the brand's hypotheses and decisions with an active version, and its experiments. */
async function validationOptions(tx: Transaction, a: BrandActor) {
  const scope = (table: typeof t.hypotheses | typeof t.experiments) => and(eq(table.workspaceId, a.workspaceId), eq(table.brandId, a.brandId));
  const hypotheses = (await tx.select().from(t.hypotheses).where(scope(t.hypotheses))).map(h => ({ id: h.id, statement: String((h.payload as { statement?: string }).statement ?? ''), status: String((h.payload as { status?: string }).status ?? '') }));
  const decisions = await tx.select({ id: t.decisions.id, module: t.questions.module }).from(t.decisions).innerJoin(t.questions, eq(t.questions.id, t.decisions.questionId)).where(and(eq(t.decisions.workspaceId, a.workspaceId), eq(t.decisions.brandId, a.brandId), isNotNull(t.decisions.activeVersionId)));
  const experiments = (await tx.select().from(t.experiments).where(scope(t.experiments))).map(e => ({ id: e.id, objective: e.objective, status: String((e.payload as { status?: string }).status ?? ''), hypothesisId: e.hypothesisId }));
  return { hypotheses, decisions, experiments };
}
/**
 * A revisable experiment proposal from one saved proposal of a review: what to observe, how, in which period, with
 * which limitations and sources (review, period, campaign and version). It writes nothing; a person edits it, chooses
 * the hypothesis and decision and creates (or links) the experiment explicitly.
 */
export async function experimentProposal(tx: Transaction, a: BrandActor, input: { reviewId?: unknown; proposalIndex?: unknown }) {
  const [review] = await tx.select().from(t.cycleReviews).where(and(eq(t.cycleReviews.workspaceId, a.workspaceId), eq(t.cycleReviews.brandId, a.brandId), eq(t.cycleReviews.id, String(input.reviewId ?? ''))));
  if (!review) throw new AppError('NOT_FOUND', 'Review not available');
  const index = Number(input.proposalIndex), proposal = Number.isInteger(index) ? (review.proposals as { text: string; campaignId?: string; campaignVersionId?: string | null }[])[index] : undefined;
  if (!proposal) throw new AppError('NOT_FOUND', 'Proposal not available');
  const [link] = await tx.select().from(t.cycleReviewExperiments).where(and(eq(t.cycleReviewExperiments.reviewId, review.id), eq(t.cycleReviewExperiments.proposalIndex, index)));
  let campaign: { id: string; name: string; utmCampaign: string; sequence: number | null } | null = null;
  if (proposal.campaignId) {
    const [c] = await tx.select().from(t.campaigns).where(and(eq(t.campaigns.workspaceId, a.workspaceId), eq(t.campaigns.brandId, a.brandId), eq(t.campaigns.id, proposal.campaignId)));
    const [v] = proposal.campaignVersionId ? await tx.select({ sequence: t.campaignVersions.sequence }).from(t.campaignVersions).where(eq(t.campaignVersions.id, proposal.campaignVersionId)) : [];
    if (c) campaign = { id: c.id, name: c.name, utmCampaign: c.utmCampaign, sequence: v?.sequence ?? null };
  }
  const limitations = [`Origen: revisión del ciclo del ${review.periodStart} al ${review.periodEnd} (${review.decision === 'RETEST' ? 'volver a probar' : review.decision === 'ADJUST' ? 'ajustar' : 'mantener'}).`, ...(campaign ? [`Campaña «${campaign.name}»${campaign.sequence ? `, versión ${campaign.sequence}` : ''}.`] : []), ...(review.limitations as string[]).slice(0, 6)].map(x => x.slice(0, 1000)).slice(0, 10);
  return {
    reviewId: review.id, proposalIndex: index, text: proposal.text, linked: link ? { experimentId: link.experimentId, mode: link.mode } : null,
    draft: { intendedSignal: campaign ? `Oportunidades que llegan con utm_campaign=${campaign.utmCampaign}` : proposal.text.slice(0, 200), method: proposal.text, plannedPeriod: 'Siguiente periodo de revisión', objective: proposal.text, successCriteria: campaign ? 'Al menos una oportunidad registrada con la referencia de la campaña en el periodo' : 'Definir con el equipo', limitations },
    sources: { reviewId: review.id, periodStart: review.periodStart, periodEnd: review.periodEnd, campaignId: campaign?.id ?? null, campaignVersionId: proposal.campaignVersionId ?? null },
    options: await validationOptions(tx, a),
  };
}
/** Records the link once (unique per review proposal): a retry returns the existing one. */
export async function recordExperimentLink(tx: Transaction, a: BrandActor, input: { reviewId: string; proposalIndex: number; experimentId: string; mode: 'CREATED' | 'LINKED'; campaignId: string | null; campaignVersionId: string | null; periodStart: string; periodEnd: string }) {
  const [experiment] = await tx.select({ id: t.experiments.id }).from(t.experiments).where(and(eq(t.experiments.workspaceId, a.workspaceId), eq(t.experiments.brandId, a.brandId), eq(t.experiments.id, input.experimentId)));
  if (!experiment) throw new AppError('NOT_FOUND', 'Experiment not available');
  const inserted = await tx.insert(t.cycleReviewExperiments).values({ id: randomUUID(), workspaceId: a.workspaceId, brandId: a.brandId, ...input, createdBy: a.userId, createdAt: new Date() }).onConflictDoNothing().returning({ id: t.cycleReviewExperiments.id });
  const [link] = await tx.select().from(t.cycleReviewExperiments).where(and(eq(t.cycleReviewExperiments.reviewId, input.reviewId), eq(t.cycleReviewExperiments.proposalIndex, input.proposalIndex)));
  return { experimentId: link.experimentId, mode: link.mode, replayed: !inserted.length };
}

