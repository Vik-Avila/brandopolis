import { randomUUID } from 'node:crypto';
import { and, desc, eq } from 'drizzle-orm';
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
  const results = await readResults(tx, a, now);
  const all = [...results.marketing, ...results.operations, ...results.sales, ...results.campaigns.flatMap(c => c.metrics.map(m => ({ ...m, label: `${c.name} · ${m.label}` })))] as Metric[];
  const limitations: string[] = [];
  if (all.some(m => m.state === 'NOT_CONNECTED' && m.kind === 'PROVIDER')) limitations.push('No hay cuentas reales de Google o Meta conectadas: no hay gasto ni actividad real de campañas.');
  if (all.some(m => m.kind === 'SIMULATED')) limitations.push('Hay lecturas del simulador: sirven para probar el recorrido, no son resultados.');
  if (all.some(m => m.kind === 'PLANNED_BUDGET' && m.available)) limitations.push('El presupuesto planificado no es gasto.');
  limitations.push('Las referencias de campaña de las oportunidades se capturan sin verificar: no son atribución.');
  limitations.push('Ventas, importes y ROAS no están disponibles en esta fase.');
  const suggestions: { text: string; basis: string }[] = [];
  const unassigned = all.find(m => m.id === 'unassigned'), noFollow = all.find(m => m.id === 'no_follow_up');
  if (unassigned?.value) suggestions.push({ text: `Asignar responsable a las ${unassigned.value} oportunidades pendientes antes de abrir nuevas campañas.`, basis: 'Clientes · por asignar' });
  if (noFollow?.value) suggestions.push({ text: `Fijar fecha de seguimiento a ${noFollow.value} oportunidades.`, basis: 'Clientes · sin seguimiento' });
  for (const c of results.campaigns) suggestions.push({ text: `Decidir si la campaña «${c.name}» sigue en pausa o se prepara su activación en el siguiente periodo (activar exige otra autorización y una cuenta real).`, basis: `Campaña «${c.name}»` });
  const previous = await tx.select().from(t.cycleReviews).where(and(eq(t.cycleReviews.workspaceId, a.workspaceId), eq(t.cycleReviews.brandId, a.brandId))).orderBy(desc(t.cycleReviews.createdAt));
  return {
    period: { start: new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10), end: now.toISOString().slice(0, 10) },
    results: all.map(m => ({ id: m.id, label: m.label, value: m.value, available: m.available, kind: m.kind, state: m.state ?? null, currency: m.currency ?? null })),
    limitations, suggestions: { mode: 'DETERMINISTIC_DEMO', items: suggestions },
    previous: previous.map(r => ({ id: r.id, periodStart: r.periodStart, periodEnd: r.periodEnd, decision: r.decision, criterion: r.criterion, learnings: r.learnings, proposals: r.proposals, limitations: r.limitations, createdAt: r.createdAt.toISOString() })),
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
  const proposals = (Array.isArray(input.proposals) ? input.proposals : []).slice(0, 12).map(p => { const o = (p ?? {}) as Record<string, unknown>; return { text: typeof o.text === 'string' ? o.text.trim().slice(0, 500) : '', origin: o.origin === 'BRANDO' ? 'BRANDO' : 'PERSON', status: 'PROPOSED_FOR_NEXT_PERIOD' }; }).filter(p => p.text);
  const draft = await cycleReviewDraft(tx, a);
  const id = randomUUID();
  await tx.insert(t.cycleReviews).values({ id, workspaceId: a.workspaceId, brandId: a.brandId, periodStart: start, periodEnd: end, results: { computedAt: new Date().toISOString(), items: draft.results }, limitations: draft.limitations, learnings, proposals, decision: input.decision as string, criterion, createdBy: a.userId, idempotencyKey, createdAt: new Date() });
  return { reviewId: id, replayed: false };
}
