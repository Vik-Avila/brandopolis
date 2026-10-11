import { AppError, validate } from './contracts.js';

/**
 * ADR-0030 / PHASE4_SPEC §4.2 · annual marketing plan with 90-day priorities. Pure rules: normalization of objectives
 * and actions, PlanAction state machine and the «what is still missing» guidance. Persistence, revisions and the change
 * log live in the application layer.
 */
export type ObjectiveContent = { horizon: 'ANNUAL' | 'NINETY_DAYS'; title: string; measure: string; status: 'ACTIVE' | 'ARCHIVED' };
export type ActionStatus = 'PLANNED' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
export type ActionContent = {
  title: string;
  kind: 'COMMERCIAL' | 'INSTITUTIONAL';
  offerId: string | null;
  objectiveId: string | null;
  owner: string;
  startDate: string | null;
  dueDate: string | null;
  budget: { amountMinor: number; currency: string; certainty: 'CONFIRMED' | 'ESTIMATED' } | null;
  indicator: string;
  status: ActionStatus;
};

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
const optionalId = (value: unknown) => text(value) || null;
const record = (input: unknown, what: string) => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new AppError('INVALID', `Invalid ${what}`);
  return input as Record<string, unknown>;
};

export function normalizeObjective(input: unknown): ObjectiveContent {
  const raw = record(input, 'objective');
  const content = { horizon: raw.horizon, title: text(raw.title), measure: text(raw.measure), status: raw.status ?? 'ACTIVE' } as ObjectiveContent;
  validate('plan-objective', content);
  return content;
}

/** The status is not part of an edit: it changes only through actionTransition (state machine). */
export function normalizeAction(input: unknown, status: ActionStatus = 'PLANNED'): ActionContent {
  const raw = record(input, 'action');
  const budget = raw.budget && typeof raw.budget === 'object' ? raw.budget as Record<string, unknown> : null;
  const content = {
    title: text(raw.title),
    kind: raw.kind,
    offerId: raw.kind === 'COMMERCIAL' ? optionalId(raw.offerId) : null,
    objectiveId: optionalId(raw.objectiveId),
    owner: text(raw.owner),
    startDate: text(raw.startDate) || null,
    dueDate: text(raw.dueDate) || null,
    budget: budget ? { amountMinor: budget.amountMinor, currency: text(budget.currency).toUpperCase(), certainty: budget.certainty } : null,
    indicator: text(raw.indicator),
    status
  } as ActionContent;
  validate('plan-action', content);
  if (content.kind === 'COMMERCIAL' && !content.offerId) throw new AppError('INVALID', 'A commercial action needs an offer');
  if (content.startDate && content.dueDate && content.dueDate < content.startDate) throw new AppError('INVALID', 'The action ends before it starts');
  return content;
}

const TRANSITIONS: Record<ActionStatus, readonly ActionStatus[]> = {
  PLANNED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['DONE', 'CANCELLED'],
  DONE: [],
  CANCELLED: []
};
export function actionTransition(from: ActionStatus, to: unknown): ActionStatus {
  if (typeof to !== 'string' || !(to in TRANSITIONS)) throw new AppError('INVALID', 'Unknown action status');
  if (!TRANSITIONS[from].includes(to as ActionStatus)) throw new AppError('CONFLICT', `Action transition ${from} -> ${to} is not allowed`);
  return to as ActionStatus;
}

/** What still makes the plan less useful; guidance only, never a blocker (a draft exists before the full strategy). */
export function planGaps(objectives: readonly ObjectiveContent[], actions: readonly ActionContent[]) {
  const active = objectives.filter(o => o.status === 'ACTIVE');
  const open = actions.filter(a => a.status !== 'CANCELLED' && a.status !== 'DONE');
  const gaps: string[] = [];
  if (!active.some(o => o.horizon === 'ANNUAL')) gaps.push('ANNUAL_OBJECTIVE');
  if (!active.some(o => o.horizon === 'NINETY_DAYS')) gaps.push('NINETY_DAY_PRIORITY');
  if (!open.length) gaps.push('ACTIONS');
  if (open.some(a => !a.owner)) gaps.push('OWNER');
  if (open.some(a => !a.dueDate)) gaps.push('DATES');
  if (open.some(a => !a.indicator)) gaps.push('INDICATOR');
  if (active.some(o => !o.measure)) gaps.push('MEASURE');
  return gaps;
}
