import { randomUUID } from 'node:crypto';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { AppError } from '../domain/contracts.js';
import { approve, contentFingerprint, editorialTransition, type EditorialStatus } from '../domain/editorial-versions.js';
import { DELIVERABLE_TYPES, deliverableGaps, normalizeDeliverable, type DeliverableContent, type DeliverableType } from '../domain/deliverables.js';
import type { Transaction } from '../persistence/database.js';
import * as t from '../persistence/schema.js';
import type { BrandActor } from './brand-access.js';

/**
 * ADR-0030 / PHASE4_SPEC §4.4 · deliverables. Same guarantees as offers: brand scope from Engine.withBrandActor,
 * mandatory revision (409), idempotent creation and decisions, append-only approvals, versions frozen out of DRAFT by
 * the database. Each version stores an origin manifest and its provenance, both decided by the server.
 */
type Manifest = { decisionVersionIds: string[]; offerVersionId: string | null; kitVersionId: string | null };
const byBrand = (table: { workspaceId: AnyPgColumn; brandId: AnyPgColumn }, a: BrandActor) => and(eq(table.workspaceId, a.workspaceId), eq(table.brandId, a.brandId));
const key = (value: unknown) => { if (typeof value !== 'string' || !value.trim() || value.length > 200) throw new AppError('INVALID', 'Invalid idempotency key'); return value; };
const revisionOf = (value: unknown) => { if (!Number.isInteger(value) || (value as number) < 0) throw new AppError('INVALID', 'Expected revision required'); return value as number; };
const NOT_GUARDED = Symbol('not guarded');

/** References belong to this brand; the manifest records the offer's approved version at this moment (or none). */
async function manifestFor(tx: Transaction, a: BrandActor, c: DeliverableContent): Promise<Manifest> {
  if (c.sourceDecisionVersionIds.length) {
    const found = await tx.select({ id: t.versions.id }).from(t.versions).where(and(byBrand(t.versions, a), inArray(t.versions.id, c.sourceDecisionVersionIds)));
    if (found.length !== c.sourceDecisionVersionIds.length) throw new AppError('INVALID', 'Unknown decision version for this brand');
  }
  let offerVersionId: string | null = null;
  if (c.offerId) {
    const [offer] = await tx.select().from(t.offers).where(and(byBrand(t.offers, a), eq(t.offers.id, c.offerId)));
    if (!offer) throw new AppError('INVALID', 'Unknown offer for this brand');
    offerVersionId = offer.approvedVersionId;
  }
  // ADR-0034 · the approved kit version at this moment (null while the brand has none).
  const [kit] = await tx.select({ approvedVersionId: t.brandKits.approvedVersionId }).from(t.brandKits).where(byBrand(t.brandKits, a));
  return { decisionVersionIds: c.sourceDecisionVersionIds, offerVersionId, kitVersionId: kit?.approvedVersionId ?? null };
}

async function lockDeliverable(tx: Transaction, a: BrandActor, id: unknown, expected: unknown) {
  if (typeof id !== 'string' || !id || id.length > 200) throw new AppError('INVALID', 'Deliverable required');
  const [row] = await tx.select().from(t.deliverables).where(and(byBrand(t.deliverables, a), eq(t.deliverables.id, id))).for('update');
  if (!row) throw new AppError('NOT_FOUND', 'Deliverable not available');
  if (expected !== NOT_GUARDED && row.revision !== revisionOf(expected)) throw new AppError('CONFLICT', 'This changed since you opened it; reload before saving');
  return row;
}
const touch = (tx: Transaction, id: string, values: Partial<typeof t.deliverables.$inferInsert>) => tx.update(t.deliverables).set({ ...values, updatedAt: new Date() }).where(eq(t.deliverables.id, id));
const active = (row: { status: string }) => { if (row.status !== 'ACTIVE') throw new AppError('CONFLICT', 'A retired deliverable is read-only'); };

/** Deliverables of the brand (optionally of some types) with versions, gaps, «origin updated» and manual publications. */
export async function listDeliverables(tx: Transaction, a: BrandActor, types: readonly string[] | null) {
  const wanted = types?.length ? types.filter(x => DELIVERABLE_TYPES.includes(x as DeliverableType)) : [...DELIVERABLE_TYPES];
  if (!wanted.length) throw new AppError('INVALID', 'Unknown deliverable type');
  const rows = await tx.select().from(t.deliverables).where(and(byBrand(t.deliverables, a), inArray(t.deliverables.type, wanted))).orderBy(asc(t.deliverables.createdAt));
  if (!rows.length) return [];
  const ids = rows.map(r => r.id);
  const versions = await tx.select().from(t.deliverableVersions).where(and(byBrand(t.deliverableVersions, a), inArray(t.deliverableVersions.deliverableId, ids))).orderBy(asc(t.deliverableVersions.sequence));
  const publications = await tx.select().from(t.deliverablePublications).where(and(byBrand(t.deliverablePublications, a), inArray(t.deliverablePublications.deliverableId, ids))).orderBy(desc(t.deliverablePublications.createdAt));
  const decisions = await tx.select({ id: t.decisions.id, activeVersionId: t.decisions.activeVersionId }).from(t.decisions).where(byBrand(t.decisions, a));
  const decisionVersions = await tx.select({ id: t.versions.id, decisionId: t.versions.decisionId }).from(t.versions).where(byBrand(t.versions, a));
  const offers = await tx.select({ id: t.offers.id, approvedVersionId: t.offers.approvedVersionId }).from(t.offers).where(byBrand(t.offers, a));
  const [kit] = await tx.select({ approvedVersionId: t.brandKits.approvedVersionId }).from(t.brandKits).where(byBrand(t.brandKits, a));
  const activeOf = new Map(decisions.map(d => [d.id, d.activeVersionId])), decisionOf = new Map(decisionVersions.map(v => [v.id, v.decisionId]));
  const outdated = (content: DeliverableContent, m: Manifest) => [
    ...m.decisionVersionIds.filter(v => decisionOf.has(v) && activeOf.get(decisionOf.get(v)!) !== v).map(() => 'DECISION'),
    ...(content.offerId && offers.find(o => o.id === content.offerId)?.approvedVersionId !== m.offerVersionId ? ['OFFER'] : []),
    ...(m.kitVersionId && kit?.approvedVersionId && kit.approvedVersionId !== m.kitVersionId ? ['KIT'] : [])
  ];
  return rows.map(d => {
    const own = versions.filter(v => v.deliverableId === d.id);
    const view = (v: typeof own[number]) => ({ id: v.id, sequence: v.sequence, status: v.status, fingerprint: v.fingerprint, content: v.content as DeliverableContent, manifest: v.manifest as Manifest, provenance: v.provenance, createdAt: v.createdAt.toISOString(), decidedAt: v.decidedAt?.toISOString() ?? null });
    const approved = own.find(v => v.id === d.approvedVersionId), draft = own.find(v => v.id === d.draftVersionId);
    return {
      id: d.id, type: d.type, status: d.status, revision: d.revision,
      approved: approved ? { ...view(approved), originOutdated: outdated(approved.content as DeliverableContent, approved.manifest as Manifest) } : null,
      draft: draft ? { ...view(draft), gaps: deliverableGaps(draft.content as DeliverableContent) } : null,
      inReview: own.filter(v => v.status === 'IN_REVIEW').map(view),
      history: own.map(v => ({ id: v.id, sequence: v.sequence, status: v.status })),
      publications: publications.filter(p => p.deliverableId === d.id).map(p => ({ versionId: p.versionId, publishedOn: p.publishedOn, url: p.url, note: p.note, createdAt: p.createdAt.toISOString() }))
    };
  });
}

/** Creates a deliverable with its first DRAFT. Provenance is MANUAL unless the server verified an AI proposal. */
export async function createDeliverable(tx: Transaction, a: BrandActor, input: { content?: unknown; idempotencyKey?: unknown }, provenance: 'MANUAL' | 'AI_ASSISTED' = 'MANUAL') {
  const idempotencyKey = key(input.idempotencyKey), content = serverDesign(normalizeDeliverable(input.content), undefined), fingerprint = contentFingerprint(content);
  const replay = async () => {
    const [prior] = await tx.select().from(t.deliverables).where(and(byBrand(t.deliverables, a), eq(t.deliverables.createdBy, a.userId), eq(t.deliverables.idempotencyKey, idempotencyKey)));
    if (!prior) return null;
    const [v1] = await tx.select().from(t.deliverableVersions).where(and(eq(t.deliverableVersions.deliverableId, prior.id), eq(t.deliverableVersions.sequence, 1)));
    if (v1.fingerprint !== fingerprint) throw new AppError('CONFLICT', 'Idempotency key already used with other content');
    return { deliverableId: prior.id, versionId: v1.id, replayed: true };
  };
  const prior = await replay();
  if (prior) return prior;
  const manifest = await manifestFor(tx, a, content);
  const id = randomUUID(), versionId = randomUUID(), now = new Date();
  const inserted = await tx.insert(t.deliverables).values({ id, workspaceId: a.workspaceId, brandId: a.brandId, type: content.type, status: 'ACTIVE', draftVersionId: versionId, approvedVersionId: null, revision: 0, createdBy: a.userId, idempotencyKey, createdAt: now, updatedAt: now }).onConflictDoNothing().returning({ id: t.deliverables.id });
  if (!inserted.length) return (await replay())!;
  await tx.insert(t.deliverableVersions).values({ id: versionId, workspaceId: a.workspaceId, brandId: a.brandId, deliverableId: id, sequence: 1, previousVersionId: null, status: 'DRAFT', content, fingerprint, manifest, provenance, createdBy: a.userId, createdAt: now });
  return { deliverableId: id, versionId, replayed: false };
}

/** A retrieved Canva design is decided by the server only (CNV-001): whatever the browser sends is replaced. */
export function serverDesign(content: DeliverableContent, design: unknown): DeliverableContent {
  if (content.type !== 'DESIGN_BRIEF') return content;
  const { design: _ignored, ...body } = content.body;
  return { ...content, body: design ? { ...body, design } : body };
}

/** Saves the working draft. The type never changes; an edit by a person keeps the provenance it had. */
export async function saveDeliverableDraft(tx: Transaction, a: BrandActor, input: { deliverableId?: unknown; expectedRevision?: unknown; content?: unknown }) {
  const row = await lockDeliverable(tx, a, input.deliverableId, input.expectedRevision);
  active(row);
  if (!row.draftVersionId) throw new AppError('CONFLICT', 'There is no draft; start a new version first');
  const [draft] = await tx.select().from(t.deliverableVersions).where(eq(t.deliverableVersions.id, row.draftVersionId)).for('update');
  if (draft.status !== 'DRAFT') throw new AppError('CONFLICT', 'Only a draft can be edited');
  const content = serverDesign(normalizeDeliverable(input.content), (draft.content as DeliverableContent).body.design);
  if (content.type !== row.type) throw new AppError('INVALID', 'The type of a deliverable cannot change');
  const manifest = await manifestFor(tx, a, content);
  await tx.update(t.deliverableVersions).set({ content, fingerprint: contentFingerprint(content), manifest }).where(eq(t.deliverableVersions.id, draft.id));
  await touch(tx, row.id, { revision: row.revision + 1 });
  return { deliverableId: row.id, versionId: draft.id, revision: row.revision + 1 };
}

export async function submitDeliverable(tx: Transaction, a: BrandActor, input: { deliverableId?: unknown; expectedRevision?: unknown }) {
  const row = await lockDeliverable(tx, a, input.deliverableId, input.expectedRevision);
  active(row);
  if (!row.draftVersionId) throw new AppError('CONFLICT', 'There is no draft to review');
  const [draft] = await tx.select().from(t.deliverableVersions).where(eq(t.deliverableVersions.id, row.draftVersionId)).for('update');
  editorialTransition(draft.status as EditorialStatus, 'IN_REVIEW');
  await tx.update(t.deliverableVersions).set({ status: 'IN_REVIEW', submittedAt: new Date() }).where(eq(t.deliverableVersions.id, draft.id));
  await touch(tx, row.id, { draftVersionId: null, revision: row.revision + 1 });
  return { deliverableId: row.id, versionId: draft.id, revision: row.revision + 1, fingerprint: draft.fingerprint };
}

/** Approve or request changes on the exact version + fingerprint, with a criterion and an idempotency key (INV-010). */
export async function decideDeliverable(tx: Transaction, a: BrandActor, input: { deliverableId?: unknown; versionId?: unknown; fingerprint?: unknown; decision?: unknown; criterion?: unknown; idempotencyKey?: unknown }) {
  const idempotencyKey = key(input.idempotencyKey);
  const row = await lockDeliverable(tx, a, input.deliverableId, NOT_GUARDED);
  if (input.decision !== 'APPROVE' && input.decision !== 'REQUEST_CHANGES') throw new AppError('INVALID', 'Decision must be APPROVE or REQUEST_CHANGES');
  const criterion = typeof input.criterion === 'string' ? input.criterion.trim() : '';
  if (criterion.length < 10 || criterion.length > 2000) throw new AppError('INVALID', 'Criterion required');
  const [prior] = await tx.select().from(t.deliverableApprovals).where(and(byBrand(t.deliverableApprovals, a), eq(t.deliverableApprovals.actorId, a.userId), eq(t.deliverableApprovals.idempotencyKey, idempotencyKey)));
  if (prior) {
    if (prior.deliverableId !== row.id || prior.versionId !== input.versionId || prior.fingerprint !== input.fingerprint || prior.decision !== input.decision || prior.criterion !== criterion) throw new AppError('CONFLICT', 'Idempotency key already used for another decision');
    return { deliverableId: row.id, versionId: prior.versionId, status: prior.decision === 'APPROVE' ? 'APPROVED' : 'CHANGES_REQUESTED', superseded: prior.supersededVersionId, criterion, replayed: true };
  }
  active(row);
  const versions = await tx.select().from(t.deliverableVersions).where(eq(t.deliverableVersions.deliverableId, row.id)).for('update');
  const target = versions.find(v => v.id === input.versionId);
  if (!target) throw new AppError('NOT_FOUND', 'Version not available');
  if (target.fingerprint !== input.fingerprint) throw new AppError('CONFLICT', 'Content changed since it was shared for review');
  const now = new Date();
  const record = (decision: 'APPROVE' | 'REQUEST_CHANGES', superseded: string | null) => tx.insert(t.deliverableApprovals).values({ id: randomUUID(), workspaceId: a.workspaceId, brandId: a.brandId, deliverableId: row.id, versionId: target.id, fingerprint: target.fingerprint, decision, criterion, supersededVersionId: superseded, actorId: a.userId, idempotencyKey, createdAt: now });
  if (input.decision === 'REQUEST_CHANGES') {
    editorialTransition(target.status as EditorialStatus, 'CHANGES_REQUESTED');
    await tx.update(t.deliverableVersions).set({ status: 'CHANGES_REQUESTED', decidedBy: a.userId, decidedAt: now, decisionCriterion: criterion }).where(eq(t.deliverableVersions.id, target.id));
    await record('REQUEST_CHANGES', null);
    await touch(tx, row.id, { revision: row.revision + 1 });
    return { deliverableId: row.id, versionId: target.id, status: 'CHANGES_REQUESTED', superseded: null, criterion };
  }
  const current = versions.find(v => v.id === row.approvedVersionId);
  if (current && current.sequence > target.sequence) throw new AppError('CONFLICT', 'A later version is already approved; start a new version instead');
  const result = approve({ draftVersionId: row.draftVersionId, approvedVersionId: row.approvedVersionId, publishedVersionId: null }, versions.map(v => ({ id: v.id, sequence: v.sequence, status: v.status as EditorialStatus, fingerprint: v.fingerprint })), target.id, String(input.fingerprint));
  await tx.update(t.deliverableVersions).set({ status: 'APPROVED', decidedBy: a.userId, decidedAt: now, decisionCriterion: criterion }).where(eq(t.deliverableVersions.id, target.id));
  if (result.superseded) await tx.update(t.deliverableVersions).set({ status: 'SUPERSEDED' }).where(eq(t.deliverableVersions.id, result.superseded));
  await record('APPROVE', result.superseded);
  await touch(tx, row.id, { approvedVersionId: result.pointers.approvedVersionId, draftVersionId: result.pointers.draftVersionId, revision: row.revision + 1 });
  return { deliverableId: row.id, versionId: target.id, status: 'APPROVED', superseded: result.superseded, criterion };
}

/** New DRAFT from the approved version (or the latest). The approved version stays approved until another is. */
export async function newDeliverableDraft(tx: Transaction, a: BrandActor, input: { deliverableId?: unknown; expectedRevision?: unknown }) {
  const row = await lockDeliverable(tx, a, input.deliverableId, input.expectedRevision);
  active(row);
  if (row.draftVersionId) throw new AppError('CONFLICT', 'A draft already exists');
  const versions = await tx.select().from(t.deliverableVersions).where(eq(t.deliverableVersions.deliverableId, row.id)).orderBy(asc(t.deliverableVersions.sequence));
  const base = versions.find(v => v.id === row.approvedVersionId) ?? versions[versions.length - 1];
  const id = randomUUID(), content = base.content as DeliverableContent;
  await tx.insert(t.deliverableVersions).values({ id, workspaceId: a.workspaceId, brandId: a.brandId, deliverableId: row.id, sequence: versions[versions.length - 1].sequence + 1, previousVersionId: base.id, status: 'DRAFT', content, fingerprint: base.fingerprint, manifest: await manifestFor(tx, a, content), provenance: base.provenance, createdBy: a.userId, createdAt: new Date() });
  await touch(tx, row.id, { draftVersionId: id, revision: row.revision + 1 });
  return { deliverableId: row.id, versionId: id, previousVersionId: base.id, revision: row.revision + 1 };
}

export async function retireDeliverable(tx: Transaction, a: BrandActor, input: { deliverableId?: unknown; expectedRevision?: unknown }) {
  const row = await lockDeliverable(tx, a, input.deliverableId, input.expectedRevision);
  const versionId = row.approvedVersionId ?? row.draftVersionId;
  if (row.status === 'RETIRED') return { deliverableId: row.id, versionId, status: 'RETIRED', replayed: true };
  await touch(tx, row.id, { status: 'RETIRED', revision: row.revision + 1 });
  return { deliverableId: row.id, versionId, status: 'RETIRED' };
}

/**
 * Manual record that a person published the approved version of a social post outside Brandopolis. Brandopolis never
 * publishes it: the record keeps date, optional https link and note, append-only and idempotent.
 */
export async function recordPublication(tx: Transaction, a: BrandActor, input: { deliverableId?: unknown; versionId?: unknown; publishedOn?: unknown; url?: unknown; note?: unknown; idempotencyKey?: unknown }) {
  const idempotencyKey = key(input.idempotencyKey);
  const row = await lockDeliverable(tx, a, input.deliverableId, NOT_GUARDED);
  if (row.type !== 'SOCIAL_POST') throw new AppError('INVALID', 'Only a social post records a manual publication');
  const trimmedNote = (value: unknown) => (typeof value === 'string' ? value.trim() || null : null);
  const publishedOn = typeof input.publishedOn === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input.publishedOn) && !Number.isNaN(Date.parse(`${input.publishedOn}T00:00:00Z`)) ? input.publishedOn : null;
  if (!publishedOn) throw new AppError('INVALID', 'Publication date required');
  const url = input.url == null || input.url === '' ? null : input.url;
  if (url !== null && (typeof url !== 'string' || url.length > 500 || !/^https:\/\/[^\s]+$/.test(url))) throw new AppError('INVALID', 'The link must start with https://');
  const note = input.note == null || input.note === '' ? null : input.note;
  if (note !== null && (typeof note !== 'string' || note.trim().length > 280)) throw new AppError('INVALID', 'Note too long');
  const [prior] = await tx.select().from(t.deliverablePublications).where(and(byBrand(t.deliverablePublications, a), eq(t.deliverablePublications.actorId, a.userId), eq(t.deliverablePublications.idempotencyKey, idempotencyKey)));
  if (prior) {
    if (prior.deliverableId !== row.id || prior.versionId !== input.versionId || prior.publishedOn !== publishedOn || prior.url !== url || prior.note !== trimmedNote(note)) throw new AppError('CONFLICT', 'Idempotency key already used for another record');
    return { deliverableId: row.id, versionId: prior.versionId, replayed: true };
  }
  active(row);
  if (!row.approvedVersionId || input.versionId !== row.approvedVersionId) throw new AppError('CONFLICT', 'Only the approved version can be recorded as published');
  await tx.insert(t.deliverablePublications).values({ id: randomUUID(), workspaceId: a.workspaceId, brandId: a.brandId, deliverableId: row.id, versionId: row.approvedVersionId, publishedOn, url, note: trimmedNote(note), actorId: a.userId, idempotencyKey, createdAt: new Date() });
  return { deliverableId: row.id, versionId: row.approvedVersionId };
}
