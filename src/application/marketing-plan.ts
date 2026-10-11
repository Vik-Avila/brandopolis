import { randomUUID } from 'node:crypto';
import { and, asc, desc, eq } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { AppError } from '../domain/contracts.js';
import { canonicalJson, contentFingerprint } from '../domain/editorial-versions.js';
import { actionTransition, normalizeAction, normalizeObjective, planGaps, sharedProgress, snapshotContent, type ActionContent, type ActionStatus, type ObjectiveContent, type SnapshotContent } from '../domain/marketing-plan.js';
import type { Transaction } from '../persistence/database.js';
import * as t from '../persistence/schema.js';
import type { BrandActor } from './brand-access.js';

/**
 * ADR-0030 / PHASE4_SPEC §4.2 · annual marketing plan with 90-day priorities. Every function receives the actor resolved
 * by Engine.withBrandActor. Each write requires the revision the client saw (409 when stale, INV-009), creations are
 * idempotent per author and key (INV-010) and every change appends a record to plan_changes.
 */
const byBrand = (table: { workspaceId: AnyPgColumn; brandId: AnyPgColumn }, a: BrandActor) => and(eq(table.workspaceId, a.workspaceId), eq(table.brandId, a.brandId));
const key = (value: unknown) => { if (typeof value !== 'string' || !value.trim() || value.length > 200) throw new AppError('INVALID', 'Invalid idempotency key'); return value; };
const revisionOf = (value: unknown) => { if (!Number.isInteger(value) || (value as number) < 0) throw new AppError('INVALID', 'Expected revision required'); return value as number; };
const idOf = (value: unknown, what: string) => { if (typeof value !== 'string' || !value || value.length > 200) throw new AppError('INVALID', `${what} required`); return value; };
const dateOrNull = (value: unknown) => {
  if (value == null || value === '') return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) throw new AppError('INVALID', 'Invalid date');
  return value;
};
/** 90-day window that starts on focusStart (inclusive), as ISO dates. */
export const focusWindow = (focusStart: string | null) => {
  if (!focusStart) return null;
  const end = new Date(`${focusStart}T00:00:00Z`); end.setUTCDate(end.getUTCDate() + 89);
  return { start: focusStart, end: end.toISOString().slice(0, 10) };
};

async function logChange(tx: Transaction, a: BrandActor, planId: string, entityType: 'PLAN' | 'OBJECTIVE' | 'ACTION', entityId: string, revision: number, operation: 'CREATE' | 'UPDATE' | 'STATUS', content: Record<string, unknown>) {
  await tx.insert(t.planChanges).values({ id: randomUUID(), workspaceId: a.workspaceId, brandId: a.brandId, planId, entityType, entityId, revision, operation, content, actorId: a.userId, createdAt: new Date() });
}
async function lockPlan(tx: Transaction, a: BrandActor, planId: unknown) {
  const [plan] = await tx.select().from(t.marketingPlans).where(and(byBrand(t.marketingPlans, a), eq(t.marketingPlans.id, idOf(planId, 'Plan')))).for('update');
  if (!plan) throw new AppError('NOT_FOUND', 'Plan not available');
  return plan;
}
const stale = (current: number, expected: unknown) => { if (current !== revisionOf(expected)) throw new AppError('CONFLICT', 'This changed since you opened it; reload before saving'); };

/** The objective must belong to this plan; a commercial action must cite an offer of this brand that is still active (or the one it already had). */
async function checkActionReferences(tx: Transaction, a: BrandActor, planId: string, c: ActionContent, previousOfferId: string | null) {
  if (c.objectiveId) {
    const [objective] = await tx.select({ id: t.planObjectives.id }).from(t.planObjectives).where(and(byBrand(t.planObjectives, a), eq(t.planObjectives.planId, planId), eq(t.planObjectives.id, c.objectiveId)));
    if (!objective) throw new AppError('INVALID', 'Unknown objective for this plan');
  }
  if (c.offerId) {
    const [offer] = await tx.select({ status: t.offers.status }).from(t.offers).where(and(byBrand(t.offers, a), eq(t.offers.id, c.offerId)));
    if (!offer) throw new AppError('INVALID', 'Unknown offer for this brand');
    if (offer.status !== 'ACTIVE' && c.offerId !== previousOfferId) throw new AppError('INVALID', 'A retired offer cannot be added to the plan');
  }
}

/** Plan of a year (null when not started) with objectives, actions, recent changes, guidance and the offers to choose from. */
export async function readPlan(tx: Transaction, a: BrandActor, year: number) {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) throw new AppError('INVALID', 'Invalid year');
  const offers = await tx.select({ id: t.offers.id, status: t.offers.status, approvedVersionId: t.offers.approvedVersionId, draftVersionId: t.offers.draftVersionId }).from(t.offers).where(byBrand(t.offers, a)).orderBy(asc(t.offers.createdAt));
  const names = offers.length ? await tx.select({ id: t.offerVersions.id, content: t.offerVersions.content, offerId: t.offerVersions.offerId, sequence: t.offerVersions.sequence }).from(t.offerVersions).where(byBrand(t.offerVersions, a)).orderBy(desc(t.offerVersions.sequence)) : [];
  const offerChoices = offers.map(o => {
    const shown = names.find(v => v.id === o.approvedVersionId) ?? names.find(v => v.offerId === o.id);
    return { id: o.id, status: o.status, approved: Boolean(o.approvedVersionId), name: String((shown?.content as { name?: string } | undefined)?.name ?? 'Oferta') };
  });
  const [plan] = await tx.select().from(t.marketingPlans).where(and(byBrand(t.marketingPlans, a), eq(t.marketingPlans.year, year)));
  if (!plan) return { year, plan: null, offers: offerChoices };
  const objectives = await tx.select().from(t.planObjectives).where(and(byBrand(t.planObjectives, a), eq(t.planObjectives.planId, plan.id))).orderBy(asc(t.planObjectives.createdAt));
  const actions = await tx.select().from(t.planActions).where(and(byBrand(t.planActions, a), eq(t.planActions.planId, plan.id))).orderBy(asc(t.planActions.createdAt));
  const changes = await tx.select().from(t.planChanges).where(and(byBrand(t.planChanges, a), eq(t.planChanges.planId, plan.id))).orderBy(desc(t.planChanges.createdAt)).limit(30);
  const snapshots = await tx.select().from(t.planSnapshots).where(and(byBrand(t.planSnapshots, a), eq(t.planSnapshots.planId, plan.id))).orderBy(asc(t.planSnapshots.sequence));
  const current = contentFingerprint(await currentSnapshotContent(tx, a, plan));
  const approved = snapshots.find(x => x.status === 'APPROVED');
  const inReview = snapshots.find(x => x.status === 'IN_REVIEW');
  const sharing = {
    approved: approved ? { id: approved.id, sequence: approved.sequence, decidedAt: approved.decidedAt?.toISOString() ?? null, criterion: approved.decisionCriterion, actionIds: (approved.content as SnapshotContent).actions.map(x => x.id) } : null,
    inReview: inReview ? { id: inReview.id, sequence: inReview.sequence, fingerprint: inReview.fingerprint, content: inReview.content as SnapshotContent, matchesPlan: inReview.fingerprint === current } : null,
    // Read-only projection: the plan has edits that the client does not see until a new version is reviewed and approved.
    changedSinceShared: approved ? approved.fingerprint !== current : null,
    history: snapshots.map(x => ({ id: x.id, sequence: x.sequence, status: x.status, decidedAt: x.decidedAt?.toISOString() ?? null }))
  };
  return {
    year,
    offers: offerChoices,
    plan: {
      id: plan.id, year: plan.year, focusStart: plan.focusStart, focus: focusWindow(plan.focusStart), revision: plan.revision,
      objectives: objectives.map(o => ({ id: o.id, revision: o.revision, ...(o.content as ObjectiveContent) })),
      actions: actions.map(x => ({ id: x.id, revision: x.revision, ...(x.content as ActionContent) })),
      gaps: planGaps(objectives.map(o => o.content as ObjectiveContent), actions.map(x => x.content as ActionContent)),
      changes: changes.map(c => ({ entityType: c.entityType, entityId: c.entityId, revision: c.revision, operation: c.operation, createdAt: c.createdAt.toISOString(), title: String((c.content as { title?: string }).title ?? '') })),
      sharing
    }
  };
}

/** Starts the plan of a year. One plan per brand and year: starting it again returns the existing one. */
export async function createPlan(tx: Transaction, a: BrandActor, input: { year?: unknown; focusStart?: unknown }) {
  const year = input.year;
  if (!Number.isInteger(year) || (year as number) < 2000 || (year as number) > 2100) throw new AppError('INVALID', 'Invalid year');
  const focusStart = dateOrNull(input.focusStart);
  const now = new Date(), id = randomUUID();
  const inserted = await tx.insert(t.marketingPlans).values({ id, workspaceId: a.workspaceId, brandId: a.brandId, year: year as number, focusStart, revision: 0, createdBy: a.userId, createdAt: now, updatedAt: now }).onConflictDoNothing().returning({ id: t.marketingPlans.id });
  if (!inserted.length) {
    const [existing] = await tx.select().from(t.marketingPlans).where(and(byBrand(t.marketingPlans, a), eq(t.marketingPlans.year, year as number)));
    return { planId: existing.id, revision: existing.revision, replayed: true };
  }
  await logChange(tx, a, id, 'PLAN', id, 0, 'CREATE', { title: `Plan ${year}`, year, focusStart });
  return { planId: id, revision: 0, replayed: false };
}

/** Moves the 90-day window. */
export async function updatePlan(tx: Transaction, a: BrandActor, input: { planId?: unknown; expectedRevision?: unknown; focusStart?: unknown }) {
  const plan = await lockPlan(tx, a, input.planId);
  stale(plan.revision, input.expectedRevision);
  const focusStart = dateOrNull(input.focusStart), revision = plan.revision + 1;
  await tx.update(t.marketingPlans).set({ focusStart, revision, updatedAt: new Date() }).where(eq(t.marketingPlans.id, plan.id));
  await logChange(tx, a, plan.id, 'PLAN', plan.id, revision, 'UPDATE', { title: `Plan ${plan.year}`, year: plan.year, focusStart });
  return { planId: plan.id, revision };
}

export async function addObjective(tx: Transaction, a: BrandActor, input: { planId?: unknown; content?: unknown; idempotencyKey?: unknown }) {
  const idempotencyKey = key(input.idempotencyKey), content = normalizeObjective({ ...(input.content as object), status: 'ACTIVE' });
  const plan = await lockPlan(tx, a, input.planId);
  const [prior] = await tx.select().from(t.planObjectives).where(and(byBrand(t.planObjectives, a), eq(t.planObjectives.createdBy, a.userId), eq(t.planObjectives.idempotencyKey, idempotencyKey)));
  if (prior) {
    if (prior.planId !== plan.id || canonicalJson(prior.content) !== canonicalJson(content)) throw new AppError('CONFLICT', 'Idempotency key already used with other content');
    return { objectiveId: prior.id, revision: prior.revision, replayed: true };
  }
  const id = randomUUID(), now = new Date();
  await tx.insert(t.planObjectives).values({ id, workspaceId: a.workspaceId, brandId: a.brandId, planId: plan.id, content, revision: 0, createdBy: a.userId, idempotencyKey, createdAt: now, updatedAt: now });
  await logChange(tx, a, plan.id, 'OBJECTIVE', id, 0, 'CREATE', content);
  return { objectiveId: id, revision: 0, replayed: false };
}

/** Edits an objective (including archiving it). Actions that point to it keep the link. */
export async function updateObjective(tx: Transaction, a: BrandActor, input: { objectiveId?: unknown; expectedRevision?: unknown; content?: unknown }) {
  const [objective] = await tx.select().from(t.planObjectives).where(and(byBrand(t.planObjectives, a), eq(t.planObjectives.id, idOf(input.objectiveId, 'Objective')))).for('update');
  if (!objective) throw new AppError('NOT_FOUND', 'Objective not available');
  stale(objective.revision, input.expectedRevision);
  const content = normalizeObjective(input.content), revision = objective.revision + 1;
  await tx.update(t.planObjectives).set({ content, revision, updatedAt: new Date() }).where(eq(t.planObjectives.id, objective.id));
  await logChange(tx, a, objective.planId, 'OBJECTIVE', objective.id, revision, 'UPDATE', content);
  return { objectiveId: objective.id, revision };
}

export async function addAction(tx: Transaction, a: BrandActor, input: { planId?: unknown; content?: unknown; idempotencyKey?: unknown }) {
  const idempotencyKey = key(input.idempotencyKey), content = normalizeAction(input.content);
  const plan = await lockPlan(tx, a, input.planId);
  const [prior] = await tx.select().from(t.planActions).where(and(byBrand(t.planActions, a), eq(t.planActions.createdBy, a.userId), eq(t.planActions.idempotencyKey, idempotencyKey)));
  if (prior) {
    if (prior.planId !== plan.id || canonicalJson(prior.content) !== canonicalJson(content)) throw new AppError('CONFLICT', 'Idempotency key already used with other content');
    return { actionId: prior.id, revision: prior.revision, replayed: true };
  }
  await checkActionReferences(tx, a, plan.id, content, null);
  const id = randomUUID(), now = new Date();
  await tx.insert(t.planActions).values({ id, workspaceId: a.workspaceId, brandId: a.brandId, planId: plan.id, content, revision: 0, createdBy: a.userId, idempotencyKey, createdAt: now, updatedAt: now });
  await logChange(tx, a, plan.id, 'ACTION', id, 0, 'CREATE', content);
  return { actionId: id, revision: 0, replayed: false };
}

async function lockAction(tx: Transaction, a: BrandActor, actionId: unknown, expected: unknown) {
  const [action] = await tx.select().from(t.planActions).where(and(byBrand(t.planActions, a), eq(t.planActions.id, idOf(actionId, 'Action')))).for('update');
  if (!action) throw new AppError('NOT_FOUND', 'Action not available');
  stale(action.revision, expected);
  return action;
}

/** Edits an action's fields; its status changes only through actionStatus. Finished or cancelled actions are read-only. */
export async function updateAction(tx: Transaction, a: BrandActor, input: { actionId?: unknown; expectedRevision?: unknown; content?: unknown }) {
  const action = await lockAction(tx, a, input.actionId, input.expectedRevision);
  const previous = action.content as ActionContent;
  if (previous.status === 'DONE' || previous.status === 'CANCELLED') throw new AppError('CONFLICT', 'A finished or cancelled action is read-only');
  const content = normalizeAction(input.content, previous.status), revision = action.revision + 1;
  await checkActionReferences(tx, a, action.planId, content, previous.offerId);
  await tx.update(t.planActions).set({ content, revision, updatedAt: new Date() }).where(eq(t.planActions.id, action.id));
  await logChange(tx, a, action.planId, 'ACTION', action.id, revision, 'UPDATE', content);
  return { actionId: action.id, revision };
}

/** PLANNED → IN_PROGRESS → DONE; PLANNED/IN_PROGRESS → CANCELLED. */
export async function actionStatus(tx: Transaction, a: BrandActor, input: { actionId?: unknown; expectedRevision?: unknown; status?: unknown; note?: unknown }) {
  const note = input.note == null || input.note === '' ? null : input.note;
  if (note !== null && (typeof note !== 'string' || note.trim().length > 280)) throw new AppError('INVALID', 'Note too long');
  const action = await lockAction(tx, a, input.actionId, input.expectedRevision);
  const previous = action.content as ActionContent;
  const status: ActionStatus = actionTransition(previous.status, input.status);
  const content = { ...previous, status }, revision = action.revision + 1;
  await tx.update(t.planActions).set({ content, revision, updatedAt: new Date() }).where(eq(t.planActions.id, action.id));
  await logChange(tx, a, action.planId, 'ACTION', action.id, revision, 'STATUS', content);
  // PLN-003 · progress is shared on the approved snapshot without a new approval; an action added after it is not shown.
  const [shared] = await tx.select().from(t.planSnapshots).where(and(byBrand(t.planSnapshots, a), eq(t.planSnapshots.planId, action.planId), eq(t.planSnapshots.status, 'APPROVED')));
  const progressShared = Boolean(shared && (shared.content as SnapshotContent).actions.some(x => x.id === action.id));
  if (shared && progressShared) await tx.insert(t.planProgressUpdates).values({ id: randomUUID(), workspaceId: a.workspaceId, brandId: a.brandId, snapshotId: shared.id, actionId: action.id, status, date: new Date().toISOString().slice(0, 10), note: typeof note === 'string' ? note.trim() || null : null, actorId: a.userId, createdAt: new Date() });
  return { actionId: action.id, revision, status, progressShared };
}

/** Content the plan would have if it were shared now (offer names resolved from the offer's approved or latest version). */
async function currentSnapshotContent(tx: Transaction, a: BrandActor, plan: { id: string; year: number; focusStart: string | null }) {
  const objectives = await tx.select().from(t.planObjectives).where(and(byBrand(t.planObjectives, a), eq(t.planObjectives.planId, plan.id))).orderBy(asc(t.planObjectives.createdAt));
  const actions = await tx.select().from(t.planActions).where(and(byBrand(t.planActions, a), eq(t.planActions.planId, plan.id))).orderBy(asc(t.planActions.createdAt));
  const offerIds = [...new Set(actions.map(x => (x.content as ActionContent).offerId).filter((id): id is string => Boolean(id)))];
  const names = new Map<string, string>();
  for (const offerId of offerIds) {
    const [offer] = await tx.select().from(t.offers).where(and(byBrand(t.offers, a), eq(t.offers.id, offerId)));
    const [version] = offer ? await tx.select().from(t.offerVersions).where(eq(t.offerVersions.id, offer.approvedVersionId ?? offer.draftVersionId ?? '')) : [];
    const [latest] = offer && !version ? await tx.select().from(t.offerVersions).where(eq(t.offerVersions.offerId, offer.id)).orderBy(desc(t.offerVersions.sequence)).limit(1) : [];
    names.set(offerId, String(((version ?? latest)?.content as { name?: string } | undefined)?.name ?? 'Oferta'));
  }
  return snapshotContent(plan,
    objectives.map(o => ({ id: o.id, revision: o.revision, ...(o.content as ObjectiveContent) })),
    actions.map(x => { const c = x.content as ActionContent; return { id: x.id, revision: x.revision, ...c, offerName: c.offerId ? names.get(c.offerId) ?? null : null }; }));
}

/**
 * PLN-001 · prepares the version of the plan that will be shared: a frozen copy for review. Only one version is in
 * review at a time; a copy identical to the shared one is refused (nothing to review). Idempotent per author and key.
 */
export async function createSnapshot(tx: Transaction, a: BrandActor, input: { planId?: unknown; idempotencyKey?: unknown }) {
  const idempotencyKey = key(input.idempotencyKey);
  const plan = await lockPlan(tx, a, input.planId);
  const [prior] = await tx.select().from(t.planSnapshots).where(and(byBrand(t.planSnapshots, a), eq(t.planSnapshots.createdBy, a.userId), eq(t.planSnapshots.idempotencyKey, idempotencyKey)));
  if (prior) {
    if (prior.planId !== plan.id) throw new AppError('CONFLICT', 'Idempotency key already used for another plan');
    return { snapshotId: prior.id, sequence: prior.sequence, fingerprint: prior.fingerprint, replayed: true };
  }
  const existing = await tx.select().from(t.planSnapshots).where(and(byBrand(t.planSnapshots, a), eq(t.planSnapshots.planId, plan.id))).orderBy(asc(t.planSnapshots.sequence));
  if (existing.some(x => x.status === 'IN_REVIEW')) throw new AppError('CONFLICT', 'A version of the plan is already waiting for review');
  const content = await currentSnapshotContent(tx, a, plan), fingerprint = contentFingerprint(content);
  if (existing.find(x => x.status === 'APPROVED')?.fingerprint === fingerprint) throw new AppError('CONFLICT', 'The shared version already matches the plan');
  if (!content.objectives.length && !content.actions.length) throw new AppError('INVALID', 'Add an objective or an action before sharing the plan');
  const id = randomUUID(), sequence = (existing[existing.length - 1]?.sequence ?? 0) + 1;
  await tx.insert(t.planSnapshots).values({ id, workspaceId: a.workspaceId, brandId: a.brandId, planId: plan.id, sequence, status: 'IN_REVIEW', content, fingerprint, planRevision: plan.revision, createdBy: a.userId, idempotencyKey, createdAt: new Date() });
  return { snapshotId: id, sequence, fingerprint, replayed: false };
}

/**
 * PLN-002 · a person approves or requests changes on the exact snapshot and content they saw (fingerprint), with a
 * criterion and an idempotency key. Approving supersedes the previously approved snapshot; an older one is refused.
 */
export async function decideSnapshot(tx: Transaction, a: BrandActor, input: { snapshotId?: unknown; fingerprint?: unknown; decision?: unknown; criterion?: unknown; idempotencyKey?: unknown }) {
  const idempotencyKey = key(input.idempotencyKey);
  if (input.decision !== 'APPROVE' && input.decision !== 'REQUEST_CHANGES') throw new AppError('INVALID', 'Decision must be APPROVE or REQUEST_CHANGES');
  const criterion = typeof input.criterion === 'string' ? input.criterion.trim() : '';
  if (criterion.length < 10 || criterion.length > 2000) throw new AppError('INVALID', 'Criterion required');
  const [target] = await tx.select().from(t.planSnapshots).where(and(byBrand(t.planSnapshots, a), eq(t.planSnapshots.id, idOf(input.snapshotId, 'Snapshot')))).for('update');
  if (!target) throw new AppError('NOT_FOUND', 'Snapshot not available');
  const [prior] = await tx.select().from(t.planSnapshotApprovals).where(and(byBrand(t.planSnapshotApprovals, a), eq(t.planSnapshotApprovals.actorId, a.userId), eq(t.planSnapshotApprovals.idempotencyKey, idempotencyKey)));
  if (prior) {
    if (prior.snapshotId !== target.id || prior.fingerprint !== input.fingerprint || prior.decision !== input.decision || prior.criterion !== criterion) throw new AppError('CONFLICT', 'Idempotency key already used for another decision');
    return { snapshotId: target.id, status: prior.decision === 'APPROVE' ? 'APPROVED' : 'CHANGES_REQUESTED', superseded: prior.supersededSnapshotId, criterion, replayed: true };
  }
  if (target.fingerprint !== input.fingerprint) throw new AppError('CONFLICT', 'Content changed since it was shared for review');
  if (target.status !== 'IN_REVIEW') throw new AppError('CONFLICT', 'Only a version in review can be decided');
  const siblings = await tx.select().from(t.planSnapshots).where(and(byBrand(t.planSnapshots, a), eq(t.planSnapshots.planId, target.planId))).for('update');
  const approved = siblings.find(x => x.status === 'APPROVED');
  if (input.decision === 'APPROVE' && approved && approved.sequence > target.sequence) throw new AppError('CONFLICT', 'A later version is already approved');
  const now = new Date(), status = input.decision === 'APPROVE' ? 'APPROVED' : 'CHANGES_REQUESTED';
  await tx.update(t.planSnapshots).set({ status, decidedBy: a.userId, decidedAt: now, decisionCriterion: criterion }).where(eq(t.planSnapshots.id, target.id));
  const superseded = input.decision === 'APPROVE' && approved ? approved.id : null;
  if (superseded) await tx.update(t.planSnapshots).set({ status: 'SUPERSEDED' }).where(eq(t.planSnapshots.id, superseded));
  await tx.insert(t.planSnapshotApprovals).values({ id: randomUUID(), workspaceId: a.workspaceId, brandId: a.brandId, snapshotId: target.id, fingerprint: target.fingerprint, decision: input.decision, criterion, supersededSnapshotId: superseded, actorId: a.userId, idempotencyKey, createdAt: now });
  return { snapshotId: target.id, status, superseded, criterion };
}

/**
 * What the client receives: the approved snapshot exactly as approved, plus the shared progress of its actions.
 * Internal edits, drafts, versions in review, change log and actions added later are never part of it.
 */
export async function readSharedPlan(tx: Transaction, a: BrandActor, year: number) {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) throw new AppError('INVALID', 'Invalid year');
  const [plan] = await tx.select().from(t.marketingPlans).where(and(byBrand(t.marketingPlans, a), eq(t.marketingPlans.year, year)));
  if (!plan) return { year, shared: null };
  const [snapshot] = await tx.select().from(t.planSnapshots).where(and(byBrand(t.planSnapshots, a), eq(t.planSnapshots.planId, plan.id), eq(t.planSnapshots.status, 'APPROVED')));
  if (!snapshot) return { year, shared: null };
  const updates = await tx.select().from(t.planProgressUpdates).where(and(byBrand(t.planProgressUpdates, a), eq(t.planProgressUpdates.snapshotId, snapshot.id)));
  const content = snapshot.content as SnapshotContent;
  return {
    year,
    shared: {
      snapshotId: snapshot.id, sequence: snapshot.sequence, approvedAt: snapshot.decidedAt?.toISOString() ?? null,
      content: { ...content, focus: focusWindow(content.focusStart) },
      progress: sharedProgress(content, updates.map(u => ({ actionId: u.actionId, status: u.status as ActionStatus, date: u.date, note: u.note, createdAt: u.createdAt.toISOString() })))
    }
  };
}
