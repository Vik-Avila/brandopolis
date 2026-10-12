import { randomUUID } from 'node:crypto';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { AppError } from '../domain/contracts.js';
import { commentBody } from '../domain/collaboration.js';
import { DELIVERABLE_TYPES } from '../domain/deliverables.js';
import type { Transaction } from '../persistence/database.js';
import * as t from '../persistence/schema.js';
import type { BrandActor } from './brand-access.js';
import { notify } from './notifications.js';

/**
 * PHASE4_SPEC §13 · approval circuit for offers and the five deliverable types.
 *
 * - A policy per brand and subject type names the default reviewer, whether the author may approve alone and whether a
 *   client step follows (deliverables only: a guest never approves offers or strategy, ADR-0033).
 * - Submitting a version assigns exactly one reviewer (chosen, or the policy default). Without one it is not sent.
 * - Only the assigned reviewer decides that version. Approving alone is possible only when the policy allows it, and it
 *   is recorded as such (selfApproval, guarded in SQL); it never pretends a second person took part.
 * - Reassigning changes who reviews, nothing else: no capability is granted or implied.
 * Editorial approval, publication and spend stay separate (ADR-0030, ADR-0031).
 */
export const SUBJECT_TYPES = ['OFFER', ...DELIVERABLE_TYPES] as const;
export type SubjectType = typeof SUBJECT_TYPES[number];
type Scoped = { workspaceId: string; brandId: string };
export const isSubjectType = (v: unknown): v is SubjectType => typeof v === 'string' && (SUBJECT_TYPES as readonly string[]).includes(v);
const idOf = (v: unknown, what: string) => { if (typeof v !== 'string' || !v || v.length > 200) throw new AppError('INVALID', `${what} required`); return v; };

const SUBJECT_WORDS: Record<SubjectType, string> = { OFFER: 'Oferta', SALES_PRESENTATION: 'Presentación comercial', OFFER_COPY: 'Textos de producto o servicio', SOCIAL_POST: 'Publicación para redes', AD: 'Anuncio', DESIGN_BRIEF: 'Brief para diseñador o Canva' };

/** The brand's team right now: workspace administrators and members assigned to the brand (guests never). */
export async function brandTeam(tx: Transaction, s: Scoped) {
  const members = await tx.select({ userId: t.memberships.userId, role: t.memberships.role }).from(t.memberships).where(and(eq(t.memberships.workspaceId, s.workspaceId), eq(t.memberships.active, true)));
  const assigned = new Set((await tx.select({ userId: t.assignments.userId }).from(t.assignments).where(and(eq(t.assignments.workspaceId, s.workspaceId), eq(t.assignments.brandId, s.brandId)))).map(r => r.userId));
  const team = members.filter(m => m.role === 'ADMIN' || (m.role === 'MEMBER' && assigned.has(m.userId)));
  const accounts = team.length ? await tx.select({ userId: t.userAccounts.userId, displayName: t.userAccounts.displayName, email: t.userAccounts.email }).from(t.userAccounts).where(inArray(t.userAccounts.userId, team.map(m => m.userId))) : [];
  const named = new Map(accounts.map(a => [a.userId, a.displayName || a.email]));
  return team.map((m, i) => ({ userId: m.userId, role: m.role, name: named.get(m.userId) ?? `Persona del equipo ${i + 1}` }));
}

const DEFAULT_POLICY = { defaultReviewerId: null as string | null, allowSelfApproval: true, clientStep: false, revision: 0, configured: false };

/** The policy of one subject type (the stored one, or the default: no default reviewer, approving alone allowed). */
export async function policyOf(tx: Transaction, s: Scoped, subjectType: SubjectType) {
  const [row] = await tx.select().from(t.approvalPolicies).where(and(eq(t.approvalPolicies.workspaceId, s.workspaceId), eq(t.approvalPolicies.brandId, s.brandId), eq(t.approvalPolicies.subjectType, subjectType)));
  return row ? { defaultReviewerId: row.defaultReviewerId, allowSelfApproval: row.allowSelfApproval, clientStep: row.clientStep, revision: row.revision, configured: true } : { ...DEFAULT_POLICY };
}

/** Every policy of the brand with the team that can review (for the submit dialog and the settings view). */
export async function readApprovalPolicies(tx: Transaction, a: BrandActor) {
  const team = await brandTeam(tx, a);
  const policies: Record<string, Awaited<ReturnType<typeof policyOf>>> = {};
  for (const type of SUBJECT_TYPES) policies[type] = await policyOf(tx, a, type);
  return { me: a.userId, canEdit: a.role === 'ADMIN', team: team.map(m => ({ ...m, isMe: m.userId === a.userId })), policies };
}

/** Only a workspace administrator edits a policy. The default reviewer must belong to the brand's team. */
export async function setApprovalPolicy(tx: Transaction, a: BrandActor, input: { subjectType?: unknown; defaultReviewerId?: unknown; allowSelfApproval?: unknown; clientStep?: unknown; expectedRevision?: unknown }) {
  if (a.role !== 'ADMIN') throw new AppError('FORBIDDEN', 'Only a workspace administrator changes the approval circuit');
  if (!isSubjectType(input.subjectType)) throw new AppError('INVALID', 'Unknown subject type');
  if (typeof input.allowSelfApproval !== 'boolean' || typeof input.clientStep !== 'boolean') throw new AppError('INVALID', 'Say whether approving alone and the client step apply');
  if (input.subjectType === 'OFFER' && input.clientStep) throw new AppError('INVALID', 'A guest never approves offers');
  const reviewer = input.defaultReviewerId == null || input.defaultReviewerId === '' ? null : idOf(input.defaultReviewerId, 'Reviewer');
  if (reviewer && !(await brandTeam(tx, a)).some(m => m.userId === reviewer)) throw new AppError('INVALID', 'The reviewer must belong to this brand’s team');
  const current = await policyOf(tx, a, input.subjectType);
  if (!Number.isInteger(input.expectedRevision) || input.expectedRevision !== current.revision) throw new AppError('CONFLICT', 'The approval circuit changed; reload before saving');
  const values = { defaultReviewerId: reviewer, allowSelfApproval: input.allowSelfApproval, clientStep: input.clientStep, revision: current.revision + 1, updatedBy: a.userId, updatedAt: new Date() };
  if (current.configured) await tx.update(t.approvalPolicies).set(values).where(and(eq(t.approvalPolicies.workspaceId, a.workspaceId), eq(t.approvalPolicies.brandId, a.brandId), eq(t.approvalPolicies.subjectType, input.subjectType)));
  else await tx.insert(t.approvalPolicies).values({ id: randomUUID(), workspaceId: a.workspaceId, brandId: a.brandId, subjectType: input.subjectType, ...values });
  return { subjectType: input.subjectType, revision: values.revision, versionId: null };
}

/**
 * Who counts as an author of a version: the person who created the draft and the person who sends it. A reviewer who
 * is either of them reviews alone (recorded with that author, so the SQL guard selfApproval = reviewer is author holds).
 */
const authorship = (submitterId: string, creatorId: string, reviewerId: string) => ({ selfApproval: reviewerId === submitterId || reviewerId === creatorId, authorId: reviewerId === creatorId ? creatorId : submitterId });

/** Resolves who reviews a version being submitted and records the assignment (same transaction as the submit). */
export async function assignReviewer(tx: Transaction, a: BrandActor, subject: { type: SubjectType; id: string; versionId: string; title: string; creatorId: string }, requested: unknown) {
  const policy = await policyOf(tx, a, subject.type);
  const reviewerId = requested == null || requested === '' ? policy.defaultReviewerId : idOf(requested, 'Reviewer');
  if (!reviewerId) throw new AppError('CONFLICT', 'Choose who reviews this version before sending it');
  const team = await brandTeam(tx, a);
  if (!team.some(m => m.userId === reviewerId)) throw new AppError('INVALID', 'The reviewer must belong to this brand’s team');
  const { selfApproval, authorId } = authorship(a.userId, subject.creatorId, reviewerId);
  if (selfApproval && !policy.allowSelfApproval) throw new AppError('FORBIDDEN', 'This brand requires another person to review this type');
  await tx.insert(t.reviewAssignments).values({ id: randomUUID(), workspaceId: a.workspaceId, brandId: a.brandId, subjectType: subject.type, subjectId: subject.id, versionId: subject.versionId, authorId, reviewerId, selfApproval, assignedBy: a.userId, assignedAt: new Date(), active: true });
  if (!selfApproval) await notify(tx, a, [reviewerId], { kind: 'REVIEW_ASSIGNED', subjectType: subject.type, subjectId: subject.id, versionId: subject.versionId, actorId: a.userId, title: `Te pidieron revisar: ${subject.title}`, dedupe: `assigned:${subject.versionId}:${reviewerId}` });
  return { reviewerId, selfApproval };
}

async function activeAssignment(tx: Transaction, s: Scoped, versionId: string) {
  const [row] = await tx.select().from(t.reviewAssignments).where(and(eq(t.reviewAssignments.workspaceId, s.workspaceId), eq(t.reviewAssignments.brandId, s.brandId), eq(t.reviewAssignments.versionId, versionId), eq(t.reviewAssignments.active, true))).for('update');
  return row ?? null;
}

/**
 * Before a decision: only the assigned reviewer decides. Versions submitted before the circuit existed (no assignment
 * row; never created after migration 0033, because submit and assignment share a transaction) keep the earlier rule.
 */
export async function requireReviewer(tx: Transaction, a: BrandActor, versionId: string) {
  const row = await activeAssignment(tx, a, versionId);
  if (row && row.reviewerId !== a.userId) throw new AppError('FORBIDDEN', 'Only the person assigned to review this version decides it');
  return row;
}

/** After a decision: closes the assignment and tells the author (unless they approved alone). */
export async function closeReview(tx: Transaction, a: BrandActor, row: Awaited<ReturnType<typeof requireReviewer>>, outcome: 'APPROVED' | 'CHANGES_REQUESTED', title: string) {
  if (!row) return;
  await tx.update(t.reviewAssignments).set({ active: false, closedAt: new Date(), closeReason: 'DECIDED' }).where(eq(t.reviewAssignments.id, row.id));
  await notify(tx, a, [row.authorId], { kind: outcome, subjectType: row.subjectType, subjectId: row.subjectId, versionId: row.versionId, actorId: a.userId, title: outcome === 'APPROVED' ? `Aprobada: ${title}` : `Piden cambios en: ${title}`, dedupe: `${outcome}:${row.versionId}` });
}

/** The version under review of a subject and its title, checked against this brand. */
async function subjectVersion(tx: Transaction, s: Scoped, subjectType: SubjectType, subjectId: string, versionId: string) {
  if (subjectType === 'OFFER') {
    const [v] = await tx.select().from(t.offerVersions).where(and(eq(t.offerVersions.workspaceId, s.workspaceId), eq(t.offerVersions.brandId, s.brandId), eq(t.offerVersions.id, versionId), eq(t.offerVersions.offerId, subjectId)));
    if (!v) throw new AppError('NOT_FOUND', 'Version not available');
    return { status: v.status, sequence: v.sequence, title: `${String((v.content as { name?: string }).name ?? 'Oferta')} · versión ${v.sequence}`, authorId: v.createdBy };
  }
  const [d] = await tx.select().from(t.deliverables).where(and(eq(t.deliverables.workspaceId, s.workspaceId), eq(t.deliverables.brandId, s.brandId), eq(t.deliverables.id, subjectId)));
  if (!d || d.type !== subjectType) throw new AppError('NOT_FOUND', 'Version not available');
  const [v] = await tx.select().from(t.deliverableVersions).where(and(eq(t.deliverableVersions.workspaceId, s.workspaceId), eq(t.deliverableVersions.brandId, s.brandId), eq(t.deliverableVersions.id, versionId), eq(t.deliverableVersions.deliverableId, subjectId)));
  if (!v) throw new AppError('NOT_FOUND', 'Version not available');
  return { status: v.status, sequence: v.sequence, title: `${String((v.content as { name?: string }).name ?? SUBJECT_WORDS[subjectType])} · versión ${v.sequence}`, authorId: v.createdBy };
}

/**
 * Reassigns the review of a version in review. The author, the current reviewer or an administrator may do it; the new
 * reviewer must be on the team, and approving alone still needs the policy. Nothing else changes.
 */
export async function reassignReview(tx: Transaction, a: BrandActor, input: { subjectType?: unknown; subjectId?: unknown; versionId?: unknown; reviewerId?: unknown }) {
  if (!isSubjectType(input.subjectType)) throw new AppError('INVALID', 'Unknown subject type');
  const subjectId = idOf(input.subjectId, 'Subject'), versionId = idOf(input.versionId, 'Version'), reviewerId = idOf(input.reviewerId, 'Reviewer');
  const version = await subjectVersion(tx, a, input.subjectType, subjectId, versionId);
  if (version.status !== 'IN_REVIEW') throw new AppError('CONFLICT', 'Only a version in review can be reassigned');
  const current = await activeAssignment(tx, a, versionId);
  // The submitter is who opened the first assignment of this version (reassignments never change it); the creator is the version's.
  const [first] = await tx.select({ assignedBy: t.reviewAssignments.assignedBy }).from(t.reviewAssignments).where(and(eq(t.reviewAssignments.workspaceId, a.workspaceId), eq(t.reviewAssignments.brandId, a.brandId), eq(t.reviewAssignments.versionId, versionId))).orderBy(asc(t.reviewAssignments.assignedAt)).limit(1);
  const submitterId = first?.assignedBy ?? version.authorId;
  if (!(a.role === 'ADMIN' || a.userId === submitterId || a.userId === version.authorId || a.userId === current?.reviewerId)) throw new AppError('FORBIDDEN', 'Only the author, the reviewer or an administrator reassigns a review');
  if (current?.reviewerId === reviewerId) return { versionId, reviewerId, replayed: true };
  if (!(await brandTeam(tx, a)).some(m => m.userId === reviewerId)) throw new AppError('INVALID', 'The reviewer must belong to this brand’s team');
  const { selfApproval, authorId } = authorship(submitterId, version.authorId, reviewerId);
  if (selfApproval && !(await policyOf(tx, a, input.subjectType)).allowSelfApproval) throw new AppError('FORBIDDEN', 'This brand requires another person to review this type');
  if (current) await tx.update(t.reviewAssignments).set({ active: false, closedAt: new Date(), closeReason: 'REASSIGNED' }).where(eq(t.reviewAssignments.id, current.id));
  await tx.insert(t.reviewAssignments).values({ id: randomUUID(), workspaceId: a.workspaceId, brandId: a.brandId, subjectType: input.subjectType, subjectId, versionId, authorId, reviewerId, selfApproval, assignedBy: a.userId, assignedAt: new Date(), active: true });
  await notify(tx, a, [reviewerId], { kind: 'REVIEW_REASSIGNED', subjectType: input.subjectType, subjectId, versionId, actorId: a.userId, title: `Ahora revisas: ${version.title}`, dedupe: `reassigned:${versionId}:${reviewerId}:${Date.now()}` });
  return { versionId, reviewerId, replayed: false };
}

/** Assignments (current and past) of some versions, with names, for the cards. */
export async function reviewsOf(tx: Transaction, s: Scoped, versionIds: string[]) {
  if (!versionIds.length) return new Map<string, { reviewerId: string; reviewer: string; selfApproval: boolean; assignedAt: string; active: boolean; history: { reviewer: string; assignedAt: string; closeReason: string | null }[] }>();
  const rows = await tx.select().from(t.reviewAssignments).where(and(eq(t.reviewAssignments.workspaceId, s.workspaceId), eq(t.reviewAssignments.brandId, s.brandId), inArray(t.reviewAssignments.versionId, versionIds))).orderBy(asc(t.reviewAssignments.assignedAt));
  const team = new Map((await brandTeam(tx, s)).map(m => [m.userId, m.name]));
  const name = (id: string) => team.get(id) ?? 'Persona que ya no está en el equipo';
  const out = new Map();
  for (const id of versionIds) {
    const own = rows.filter(r => r.versionId === id);
    if (!own.length) continue;
    const last = own.find(r => r.active) ?? own[own.length - 1];
    out.set(id, { reviewerId: last.reviewerId, reviewer: name(last.reviewerId), selfApproval: last.selfApproval, assignedAt: last.assignedAt.toISOString(), active: last.active, history: own.map(r => ({ reviewer: name(r.reviewerId), assignedAt: r.assignedAt.toISOString(), closeReason: r.closeReason })) });
  }
  return out;
}

// ─── Comments next to the subject and its version ────────────────────────────────────────────────────────────────

/**
 * A team comment on one version: INTERNAL (team only) or SHARED (also shown to guests while that version is shared).
 * Mentions must be people of the brand's team; mentioned people, the author and the reviewer are notified.
 */
export async function addReviewComment(tx: Transaction, a: BrandActor, input: { subjectType?: unknown; subjectId?: unknown; versionId?: unknown; body?: unknown; visibility?: unknown; parentId?: unknown; mentions?: unknown; idempotencyKey?: unknown }) {
  if (!isSubjectType(input.subjectType)) throw new AppError('INVALID', 'Unknown subject type');
  const subjectId = idOf(input.subjectId, 'Subject'), versionId = idOf(input.versionId, 'Version'), body = commentBody(input.body);
  const idempotencyKey = idOf(input.idempotencyKey, 'Idempotency key');
  if (input.visibility !== 'INTERNAL' && input.visibility !== 'SHARED') throw new AppError('INVALID', 'Choose who sees the comment');
  const mentions = Array.isArray(input.mentions) ? [...new Set(input.mentions.filter((m): m is string => typeof m === 'string' && m.length > 0 && m.length <= 200))] : [];
  if (mentions.length > 10) throw new AppError('INVALID', 'Too many mentions');
  const [prior] = await tx.select().from(t.reviewComments).where(and(eq(t.reviewComments.workspaceId, a.workspaceId), eq(t.reviewComments.brandId, a.brandId), eq(t.reviewComments.authorId, a.userId), eq(t.reviewComments.idempotencyKey, idempotencyKey)));
  if (prior) { if (prior.body !== body || prior.versionId !== versionId) throw new AppError('CONFLICT', 'Idempotency key already used'); return { commentId: prior.id, replayed: true }; }
  const version = await subjectVersion(tx, a, input.subjectType, subjectId, versionId);
  if (input.visibility === 'SHARED' && input.subjectType === 'OFFER') throw new AppError('INVALID', 'Offers are not shared with guests; use an internal comment');
  const team = await brandTeam(tx, a);
  if (mentions.some(m => !team.some(p => p.userId === m))) throw new AppError('INVALID', 'Mention people of this brand’s team only');
  let parentId: string | null = null;
  if (input.parentId != null && input.parentId !== '') {
    const [parent] = await tx.select().from(t.reviewComments).where(and(eq(t.reviewComments.workspaceId, a.workspaceId), eq(t.reviewComments.brandId, a.brandId), eq(t.reviewComments.id, idOf(input.parentId, 'Comment'))));
    if (!parent || parent.subjectId !== subjectId) throw new AppError('INVALID', 'Reply to a comment of the same item');
    parentId = parent.id;
  }
  const id = randomUUID();
  await tx.insert(t.reviewComments).values({ id, workspaceId: a.workspaceId, brandId: a.brandId, subjectType: input.subjectType, subjectId, versionId, authorId: a.userId, visibility: input.visibility, body, parentId, mentions, idempotencyKey, createdAt: new Date() });
  await notify(tx, a, mentions, { kind: 'MENTION', subjectType: input.subjectType, subjectId, versionId, actorId: a.userId, title: `Te mencionaron en: ${version.title}`, dedupe: `mention:${id}` });
  const assignment = (await reviewsOf(tx, a, [versionId])).get(versionId);
  await notify(tx, a, [version.authorId, assignment?.reviewerId].filter(r => !mentions.includes(String(r))), { kind: 'COMMENT', subjectType: input.subjectType, subjectId, versionId, actorId: a.userId, title: `Nuevo comentario en: ${version.title}`, dedupe: `comment:${id}` });
  return { commentId: id, replayed: false };
}

/** Team view of comments for some subjects, oldest first, with author names and visibility. */
export async function commentsOf(tx: Transaction, s: Scoped, subjectIds: string[]) {
  if (!subjectIds.length) return [];
  const rows = await tx.select().from(t.reviewComments).where(and(eq(t.reviewComments.workspaceId, s.workspaceId), eq(t.reviewComments.brandId, s.brandId), inArray(t.reviewComments.subjectId, subjectIds))).orderBy(asc(t.reviewComments.createdAt));
  const team = new Map((await brandTeam(tx, s)).map(m => [m.userId, m.name]));
  return rows.map(r => ({ id: r.id, subjectId: r.subjectId, versionId: r.versionId, author: team.get(r.authorId) ?? 'Persona que ya no está en el equipo', authorId: r.authorId, visibility: r.visibility, body: r.body, parentId: r.parentId, mentions: r.mentions.map(m => team.get(m) ?? 'Persona del equipo'), createdAt: r.createdAt.toISOString() }));
}

