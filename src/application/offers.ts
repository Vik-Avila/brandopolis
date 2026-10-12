import { randomUUID } from 'node:crypto';
import { and, asc, eq, inArray } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { AppError } from '../domain/contracts.js';
import { approve, contentFingerprint, editorialTransition, type EditorialStatus } from '../domain/editorial-versions.js';
import { derivedContent, normalizeOfferContent, offerGaps, originOutdated, type OfferContent } from '../domain/offers.js';
import type { Transaction } from '../persistence/database.js';
import * as t from '../persistence/schema.js';
import type { BrandActor } from './brand-access.js';
import { assignReviewer, closeReview, commentsOf, requireReviewer, reviewsOf } from './review-workflow.js';

/**
 * ADR-0030 / PHASE4_SPEC §4.1 · offers. Every function receives the actor resolved by Engine.withBrandActor (same
 * identity, workspace and brand assignment rules as the strategy). Guests have no membership and never reach this.
 */
const byBrand = (table: { workspaceId: AnyPgColumn; brandId: AnyPgColumn }, a: BrandActor) => and(eq(table.workspaceId, a.workspaceId), eq(table.brandId, a.brandId));
const key = (value: unknown) => { if (typeof value !== 'string' || !value.trim() || value.length > 200) throw new AppError('INVALID', 'Invalid idempotency key'); return value; };
const revisionOf = (value: unknown) => { if (!Number.isInteger(value) || (value as number) < 0) throw new AppError('INVALID', 'Expected revision required'); return value as number; };

/** Every referenced decision version, evidence and hypothesis must belong to this brand (INV-004, INV-005). */
async function checkReferences(tx: Transaction, a: BrandActor, c: OfferContent) {
  const versionIds = [...new Set([...c.sourceDecisionVersionIds, ...(c.audience.customerDecisionVersionId ? [c.audience.customerDecisionVersionId] : [])])];
  if (versionIds.length) {
    const found = await tx.select({ id: t.versions.id, decisionId: t.versions.decisionId }).from(t.versions).where(and(eq(t.versions.workspaceId, a.workspaceId), eq(t.versions.brandId, a.brandId), inArray(t.versions.id, versionIds)));
    if (found.length !== versionIds.length) throw new AppError('INVALID', 'Unknown decision version for this brand');
    if (c.audience.customerDecisionVersionId) {
      const decisionId = found.find(f => f.id === c.audience.customerDecisionVersionId)!.decisionId;
      const [row] = await tx.select({ module: t.questions.module }).from(t.decisions).innerJoin(t.questions, eq(t.questions.id, t.decisions.questionId)).where(eq(t.decisions.id, decisionId));
      if (row?.module !== 'Primary Customer') throw new AppError('INVALID', 'The audience must cite a Primary Customer version');
    }
  }
  if (c.proofIds.length && (await tx.select({ id: t.evidence.id }).from(t.evidence).where(and(eq(t.evidence.workspaceId, a.workspaceId), eq(t.evidence.brandId, a.brandId), inArray(t.evidence.id, c.proofIds)))).length !== c.proofIds.length) throw new AppError('INVALID', 'Unknown evidence for this brand');
  if (c.hypothesisIds.length && (await tx.select({ id: t.hypotheses.id }).from(t.hypotheses).where(and(eq(t.hypotheses.workspaceId, a.workspaceId), eq(t.hypotheses.brandId, a.brandId), inArray(t.hypotheses.id, c.hypothesisIds)))).length !== c.hypothesisIds.length) throw new AppError('INVALID', 'Unknown hypothesis for this brand');
}

/** Locks the offer row. `expected` is the revision the client saw; pass REVISION_NOT_GUARDED only where the version + fingerprint bind the operation. */
const REVISION_NOT_GUARDED = Symbol('not guarded');
async function lockOffer(tx: Transaction, a: BrandActor, offerId: unknown, expected: unknown) {
  if (typeof offerId !== 'string' || !offerId || offerId.length > 200) throw new AppError('INVALID', 'Offer required');
  const [offer] = await tx.select().from(t.offers).where(and(byBrand(t.offers, a), eq(t.offers.id, offerId))).for('update');
  if (!offer) throw new AppError('NOT_FOUND', 'Offer not available');
  if (expected !== REVISION_NOT_GUARDED && offer.revision !== revisionOf(expected)) throw new AppError('CONFLICT', 'The offer changed; reload before saving');
  return offer;
}
const touch = (tx: Transaction, offerId: string, values: Partial<typeof t.offers.$inferInsert>) =>
  tx.update(t.offers).set({ ...values, updatedAt: new Date() }).where(eq(t.offers.id, offerId));

/** Offers of the brand with their versions, gaps and the read-only «origin updated» projection. */
export async function listOffers(tx: Transaction, a: BrandActor) {
  const rows = await tx.select().from(t.offers).where(byBrand(t.offers, a)).orderBy(asc(t.offers.createdAt));
  const versions = rows.length ? await tx.select().from(t.offerVersions).where(and(byBrand(t.offerVersions, a), inArray(t.offerVersions.offerId, rows.map(r => r.id)))).orderBy(asc(t.offerVersions.sequence)) : [];
  const decisions = await tx.select({ id: t.decisions.id, activeVersionId: t.decisions.activeVersionId }).from(t.decisions).where(and(eq(t.decisions.workspaceId, a.workspaceId), eq(t.decisions.brandId, a.brandId)));
  const allVersions = await tx.select({ id: t.versions.id, decisionId: t.versions.decisionId }).from(t.versions).where(and(eq(t.versions.workspaceId, a.workspaceId), eq(t.versions.brandId, a.brandId)));
  const active = new Map(decisions.filter(d => d.activeVersionId).map(d => [d.id, d.activeVersionId as string]));
  const decisionOf = new Map(allVersions.map(v => [v.id, v.decisionId]));
  const reviews = await reviewsOf(tx, a, versions.map(v => v.id));
  const comments = await commentsOf(tx, a, rows.map(r => r.id));
  const sourceName = new Map(versions.map(v => [v.id, (v.content as OfferContent).name]));
  return rows.map(o => {
    const own = versions.filter(v => v.offerId === o.id);
    const view = (v: typeof own[number]) => ({ id: v.id, sequence: v.sequence, status: v.status, fingerprint: v.fingerprint, content: v.content as OfferContent, createdAt: v.createdAt.toISOString(), decidedAt: v.decidedAt?.toISOString() ?? null, decisionCriterion: v.decisionCriterion, review: reviews.get(v.id) ?? null });
    const approved = own.find(v => v.id === o.approvedVersionId);
    const draft = own.find(v => v.id === o.draftVersionId);
    return {
      id: o.id, status: o.status, revision: o.revision,
      derivedFrom: o.derivedFromOfferId ? { offerId: o.derivedFromOfferId, versionId: o.derivedFromVersionId, name: (o.derivedFromVersionId && sourceName.get(o.derivedFromVersionId)) || null } : null,
      comments: comments.filter(c => c.subjectId === o.id),
      approved: approved ? { ...view(approved), originOutdated: originOutdated(approved.content as OfferContent, active, decisionOf) } : null,
      draft: draft ? { ...view(draft), gaps: offerGaps(draft.content as OfferContent) } : null,
      inReview: own.filter(v => v.status === 'IN_REVIEW').map(view),
      history: own.map(v => ({ id: v.id, sequence: v.sequence, status: v.status, decidedAt: v.decidedAt?.toISOString() ?? null }))
    };
  });
}

/** Same author and key: same offer if the first version has the same content; otherwise a conflict (INV-010). */
async function replayCreate(tx: Transaction, a: BrandActor, idempotencyKey: string, fingerprint: string) {
  const [prior] = await tx.select().from(t.offers).where(and(byBrand(t.offers, a), eq(t.offers.createdBy, a.userId), eq(t.offers.idempotencyKey, idempotencyKey)));
  if (!prior) return null;
  const [v1] = await tx.select().from(t.offerVersions).where(and(eq(t.offerVersions.offerId, prior.id), eq(t.offerVersions.sequence, 1)));
  if (v1.fingerprint !== fingerprint) throw new AppError('CONFLICT', 'Idempotency key already used with other content');
  return { offerId: prior.id, versionId: v1.id, replayed: true };
}

/** Creates an offer with its first DRAFT version. Idempotent per author and key. */
export async function createOffer(tx: Transaction, a: BrandActor, input: { content?: unknown; idempotencyKey?: unknown }) {
  const idempotencyKey = key(input.idempotencyKey), content = normalizeOfferContent(input.content), fingerprint = contentFingerprint(content);
  const replay = await replayCreate(tx, a, idempotencyKey, fingerprint);
  if (replay) return replay;
  await checkReferences(tx, a, content);
  const offerId = randomUUID(), versionId = randomUUID(), now = new Date();
  const inserted = await tx.insert(t.offers).values({ id: offerId, workspaceId: a.workspaceId, brandId: a.brandId, status: 'ACTIVE', draftVersionId: versionId, approvedVersionId: null, revision: 0, createdBy: a.userId, idempotencyKey, createdAt: now, updatedAt: now }).onConflictDoNothing().returning({ id: t.offers.id });
  if (!inserted.length) return replayCreate(tx, a, idempotencyKey, fingerprint);
  await tx.insert(t.offerVersions).values({ id: versionId, workspaceId: a.workspaceId, brandId: a.brandId, offerId, sequence: 1, previousVersionId: null, status: 'DRAFT', content, fingerprint, createdBy: a.userId, createdAt: now });
  return { offerId, versionId, replayed: false };
}

/** Saves the working draft (only a DRAFT version is editable). Optimistic concurrency on the offer revision. */
export async function saveOfferDraft(tx: Transaction, a: BrandActor, input: { offerId?: unknown; expectedRevision?: unknown; content?: unknown }) {
  const offer = await lockOffer(tx, a, input.offerId, input.expectedRevision);
  if (offer.status !== 'ACTIVE') throw new AppError('CONFLICT', 'A retired offer is read-only');
  if (!offer.draftVersionId) throw new AppError('CONFLICT', 'There is no draft; start a new version first');
  const [draft] = await tx.select().from(t.offerVersions).where(eq(t.offerVersions.id, offer.draftVersionId)).for('update');
  if (draft.status !== 'DRAFT') throw new AppError('CONFLICT', 'Only a draft can be edited');
  const content = normalizeOfferContent(input.content);
  await checkReferences(tx, a, content);
  await tx.update(t.offerVersions).set({ content, fingerprint: contentFingerprint(content) }).where(eq(t.offerVersions.id, draft.id));
  await touch(tx, offer.id, { revision: offer.revision + 1 });
  return { offerId: offer.id, versionId: draft.id, revision: offer.revision + 1 };
}

/** Sends the draft to review: it becomes immutable (content and fingerprint frozen by the database). */
export async function submitOffer(tx: Transaction, a: BrandActor, input: { offerId?: unknown; expectedRevision?: unknown; reviewerId?: unknown }) {
  const offer = await lockOffer(tx, a, input.offerId, input.expectedRevision);
  if (offer.status !== 'ACTIVE') throw new AppError('CONFLICT', 'A retired offer is read-only');
  if (!offer.draftVersionId) throw new AppError('CONFLICT', 'There is no draft to review');
  const [draft] = await tx.select().from(t.offerVersions).where(eq(t.offerVersions.id, offer.draftVersionId)).for('update');
  editorialTransition(draft.status as EditorialStatus, 'IN_REVIEW');
  await tx.update(t.offerVersions).set({ status: 'IN_REVIEW', submittedAt: new Date() }).where(eq(t.offerVersions.id, draft.id));
  // PHASE4_SPEC §13 · without a reviewer the version is not sent (same transaction: no unassigned version exists).
  const review = await assignReviewer(tx, a, { type: 'OFFER', id: offer.id, versionId: draft.id, title: `${(draft.content as OfferContent).name} · versión ${draft.sequence}` }, input.reviewerId);
  await touch(tx, offer.id, { draftVersionId: null, revision: offer.revision + 1 });
  return { offerId: offer.id, versionId: draft.id, revision: offer.revision + 1, fingerprint: draft.fingerprint, ...review };
}

/**
 * A person approves or requests changes on the exact version and content they saw (fingerprint), with a criterion.
 * Approving a later version supersedes the previously approved one; nothing else moves (ADR-0030).
 */
export async function decideOffer(tx: Transaction, a: BrandActor, input: { offerId?: unknown; versionId?: unknown; fingerprint?: unknown; decision?: unknown; criterion?: unknown; idempotencyKey?: unknown }) {
  const idempotencyKey = key(input.idempotencyKey);
  const offer = await lockOffer(tx, a, input.offerId, REVISION_NOT_GUARDED);
  if (input.decision !== 'APPROVE' && input.decision !== 'REQUEST_CHANGES') throw new AppError('INVALID', 'Decision must be APPROVE or REQUEST_CHANGES');
  const criterion = typeof input.criterion === 'string' ? input.criterion.trim() : '';
  if (criterion.length < 10 || criterion.length > 2000) throw new AppError('INVALID', 'Criterion required');
  // INV-010: a retried decision (same author and key) replays the recorded one; the same key for anything else is a conflict.
  const [prior] = await tx.select().from(t.offerApprovals).where(and(byBrand(t.offerApprovals, a), eq(t.offerApprovals.actorId, a.userId), eq(t.offerApprovals.idempotencyKey, idempotencyKey)));
  if (prior) {
    if (prior.offerId !== offer.id || prior.versionId !== input.versionId || prior.fingerprint !== input.fingerprint || prior.decision !== input.decision || prior.criterion !== criterion) throw new AppError('CONFLICT', 'Idempotency key already used for another decision');
    return { offerId: offer.id, versionId: prior.versionId, status: prior.decision === 'APPROVE' ? 'APPROVED' as const : 'CHANGES_REQUESTED' as const, superseded: prior.supersededVersionId, criterion, replayed: true };
  }
  if (offer.status !== 'ACTIVE') throw new AppError('CONFLICT', 'A retired offer is read-only');
  const record = (decision: 'APPROVE' | 'REQUEST_CHANGES', versionId: string, fingerprint: string, supersededVersionId: string | null) =>
    tx.insert(t.offerApprovals).values({ id: randomUUID(), workspaceId: a.workspaceId, brandId: a.brandId, offerId: offer.id, versionId, fingerprint, decision, criterion, supersededVersionId, actorId: a.userId, idempotencyKey, createdAt: new Date() });
  const versions = await tx.select().from(t.offerVersions).where(eq(t.offerVersions.offerId, offer.id)).for('update');
  const target = versions.find(v => v.id === input.versionId);
  if (!target) throw new AppError('NOT_FOUND', 'Version not available');
  if (target.fingerprint !== input.fingerprint) throw new AppError('CONFLICT', 'Content changed since it was shared for review');
  const assignment = await requireReviewer(tx, a, target.id);
  const title = `${(target.content as OfferContent).name} · versión ${target.sequence}`;
  const now = new Date();
  if (input.decision === 'REQUEST_CHANGES') {
    editorialTransition(target.status as EditorialStatus, 'CHANGES_REQUESTED');
    await tx.update(t.offerVersions).set({ status: 'CHANGES_REQUESTED', decidedBy: a.userId, decidedAt: now, decisionCriterion: criterion }).where(eq(t.offerVersions.id, target.id));
    await record('REQUEST_CHANGES', target.id, target.fingerprint, null);
    await closeReview(tx, a, assignment, 'CHANGES_REQUESTED', title);
    await touch(tx, offer.id, { revision: offer.revision + 1 });
    return { offerId: offer.id, versionId: target.id, status: 'CHANGES_REQUESTED' as const, superseded: null, criterion };
  }
  const current = versions.find(v => v.id === offer.approvedVersionId);
  if (current && current.sequence > target.sequence) throw new AppError('CONFLICT', 'A later version is already approved; start a new version instead');
  const result = approve({ draftVersionId: offer.draftVersionId, approvedVersionId: offer.approvedVersionId, publishedVersionId: null }, versions.map(v => ({ id: v.id, sequence: v.sequence, status: v.status as EditorialStatus, fingerprint: v.fingerprint })), target.id, String(input.fingerprint));
  await tx.update(t.offerVersions).set({ status: 'APPROVED', decidedBy: a.userId, decidedAt: now, decisionCriterion: criterion }).where(eq(t.offerVersions.id, target.id));
  if (result.superseded) await tx.update(t.offerVersions).set({ status: 'SUPERSEDED' }).where(eq(t.offerVersions.id, result.superseded));
  await record('APPROVE', target.id, target.fingerprint, result.superseded);
  await closeReview(tx, a, assignment, 'APPROVED', title);
  await touch(tx, offer.id, { approvedVersionId: result.pointers.approvedVersionId, draftVersionId: result.pointers.draftVersionId, revision: offer.revision + 1 });
  return { offerId: offer.id, versionId: target.id, status: 'APPROVED' as const, superseded: result.superseded, criterion, selfApproval: assignment?.selfApproval ?? false };
}

/** Starts a new DRAFT from the approved version (or the latest one). The approved version stays approved. */
export async function newOfferDraft(tx: Transaction, a: BrandActor, input: { offerId?: unknown; expectedRevision?: unknown }) {
  const offer = await lockOffer(tx, a, input.offerId, input.expectedRevision);
  if (offer.status !== 'ACTIVE') throw new AppError('CONFLICT', 'A retired offer is read-only');
  if (offer.draftVersionId) throw new AppError('CONFLICT', 'A draft already exists');
  const versions = await tx.select().from(t.offerVersions).where(eq(t.offerVersions.offerId, offer.id)).orderBy(asc(t.offerVersions.sequence));
  const base = versions.find(v => v.id === offer.approvedVersionId) ?? versions[versions.length - 1];
  const id = randomUUID(), sequence = versions[versions.length - 1].sequence + 1;
  await tx.insert(t.offerVersions).values({ id, workspaceId: a.workspaceId, brandId: a.brandId, offerId: offer.id, sequence, previousVersionId: base.id, status: 'DRAFT', content: base.content, fingerprint: base.fingerprint, createdBy: a.userId, createdAt: new Date() });
  await touch(tx, offer.id, { draftVersionId: id, revision: offer.revision + 1 });
  return { offerId: offer.id, versionId: id, previousVersionId: base.id, revision: offer.revision + 1 };
}

/** Retires an offer (kept with its history; read-only). */
export async function retireOffer(tx: Transaction, a: BrandActor, input: { offerId?: unknown; expectedRevision?: unknown }) {
  const offer = await lockOffer(tx, a, input.offerId, input.expectedRevision);
  const versionId = offer.approvedVersionId ?? offer.draftVersionId;
  if (offer.status === 'RETIRED') return { offerId: offer.id, versionId, status: 'RETIRED' as const, replayed: true };
  await touch(tx, offer.id, { status: 'RETIRED', revision: offer.revision + 1 });
  return { offerId: offer.id, versionId, status: 'RETIRED' as const };
}

/**
 * PHASE4_SPEC §13 · «Create from this offer»: a new, independent offer of the same brand with a DRAFT copied from the
 * chosen version (the approved one by default) and a link to its origin. It inherits no approval, reviewer,
 * invitation, publication or authorization (none of them live in the content). Idempotent per author and key.
 */
export async function createOfferFrom(tx: Transaction, a: BrandActor, input: { sourceOfferId?: unknown; sourceVersionId?: unknown; idempotencyKey?: unknown }) {
  const idempotencyKey = key(input.idempotencyKey);
  const source = await lockOffer(tx, a, input.sourceOfferId, REVISION_NOT_GUARDED);
  const versions = await tx.select().from(t.offerVersions).where(eq(t.offerVersions.offerId, source.id)).orderBy(asc(t.offerVersions.sequence));
  const chosen = input.sourceVersionId == null || input.sourceVersionId === '' ? versions.find(v => v.id === source.approvedVersionId) ?? versions[versions.length - 1] : versions.find(v => v.id === input.sourceVersionId);
  if (!chosen) throw new AppError('NOT_FOUND', 'Version not available');
  const content = derivedContent(chosen.content as OfferContent), fingerprint = contentFingerprint(content);
  const origin = { sourceOfferId: source.id, sourceVersionId: chosen.id, previousVersionId: chosen.id };
  const replay = await replayCreate(tx, a, idempotencyKey, fingerprint);
  if (replay) return { ...replay, ...origin };
  await checkReferences(tx, a, content);
  const offerId = randomUUID(), versionId = randomUUID(), now = new Date();
  const inserted = await tx.insert(t.offers).values({ id: offerId, workspaceId: a.workspaceId, brandId: a.brandId, status: 'ACTIVE', draftVersionId: versionId, approvedVersionId: null, revision: 0, createdBy: a.userId, idempotencyKey, createdAt: now, updatedAt: now, derivedFromOfferId: source.id, derivedFromVersionId: chosen.id }).onConflictDoNothing().returning({ id: t.offers.id });
  if (!inserted.length) return { ...(await replayCreate(tx, a, idempotencyKey, fingerprint))!, ...origin };
  await tx.insert(t.offerVersions).values({ id: versionId, workspaceId: a.workspaceId, brandId: a.brandId, offerId, sequence: 1, previousVersionId: null, status: 'DRAFT', content, fingerprint, createdBy: a.userId, createdAt: now });
  return { offerId, versionId, replayed: false, ...origin };
}
