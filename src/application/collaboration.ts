import { randomUUID } from 'node:crypto';
import { and, asc, desc, eq, inArray, isNull } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { AppError } from '../domain/contracts.js';
import { contentFingerprint } from '../domain/editorial-versions.js';
import { approvalComment, commentBody, INVITATION_DAYS, invitationOpen, invitationState, isShareTarget, newInvitationToken, normalizeEmail, tokenHash, validInvitationToken, type ShareTarget } from '../domain/collaboration.js';
import { sharedProgress, type ActionStatus, type SnapshotContent } from '../domain/marketing-plan.js';
import { focusWindow } from './marketing-plan.js';
import { channelGaps, pairContrast, type KitContent } from '../domain/brand-kit.js';
import type { Transaction } from '../persistence/database.js';
import * as t from '../persistence/schema.js';
import type { BrandActor } from './brand-access.js';

/**
 * ADR-0033 · collaboration. Team operations receive a BrandActor (membership + brand scope from Engine.withBrandActor);
 * portal operations receive a GuestActor resolved from an ACTIVE BrandGuest of that exact brand. No path mixes both:
 * a guest never reaches team endpoints (their session workspace is not the brand's) and the portal reads only what
 * was shared, the published kit and the files those need.
 */
export type GuestActor = { workspaceId: string; brandId: string; userId: string; guestId: string };
type Scoped = { workspaceId: string; brandId: string };
const byBrand = (table: { workspaceId: AnyPgColumn; brandId: AnyPgColumn }, a: Scoped) => and(eq(table.workspaceId, a.workspaceId), eq(table.brandId, a.brandId));
const key = (v: unknown) => { if (typeof v !== 'string' || !v.trim() || v.length > 200) throw new AppError('INVALID', 'Invalid idempotency key'); return v; };
const idOf = (v: unknown, what: string) => { if (typeof v !== 'string' || !v || v.length > 200) throw new AppError('INVALID', `${what} required`); return v; };
const needsGuestsCapability = (a: BrandActor) => { if (!a.capabilities.includes('MANAGE_GUESTS')) throw new AppError('FORBIDDEN', 'Managing guests needs its own permission'); };
// PHASE4_SPEC §12.5 option A (owner decision 2026-10-11): what the client sees is decided by whoever may decide who
// the client is. Sharing and withdrawing need MANAGE_GUESTS for this brand; commenting, approving, publishing and
// authorizing spend stay separate.
const needsShareCapability = (a: BrandActor) => { if (!a.capabilities.includes('MANAGE_GUESTS')) throw new AppError('FORBIDDEN', 'Sharing with the client needs the «Gestionar invitados» permission'); };

// ─── Team side ───────────────────────────────────────────────────────────────────────────────────────────────────

/** Invites one email to this brand. Returns the single-use token only now; the database keeps its hash. */
export async function createInvitation(tx: Transaction, a: BrandActor, input: { email?: unknown; idempotencyKey?: unknown }) {
  needsGuestsCapability(a);
  const email = normalizeEmail(input.email), idempotencyKey = key(input.idempotencyKey);
  const [prior] = await tx.select().from(t.brandInvitations).where(and(byBrand(t.brandInvitations, a), eq(t.brandInvitations.invitedBy, a.userId), eq(t.brandInvitations.idempotencyKey, idempotencyKey)));
  if (prior) {
    if (prior.normalizedEmail !== email) throw new AppError('CONFLICT', 'Idempotency key already used for another invitation');
    // The token cannot be shown again (only its hash exists): revoke and invite again if the link was lost.
    return { invitationId: prior.id, token: null, expiresAt: prior.expiresAt.toISOString(), replayed: true };
  }
  const { token, hash } = newInvitationToken(), now = new Date(), id = randomUUID();
  const expiresAt = new Date(now.getTime() + INVITATION_DAYS * 86400000);
  // Email delivery needs a configured provider (none yet): the invitation is delivered by link and says so.
  await tx.insert(t.brandInvitations).values({ id, workspaceId: a.workspaceId, brandId: a.brandId, normalizedEmail: email, tokenHash: hash, status: 'PENDING', delivery: 'LINK', expiresAt, invitedBy: a.userId, idempotencyKey, createdAt: now });
  return { invitationId: id, token, expiresAt: expiresAt.toISOString(), replayed: false };
}

export async function revokeInvitation(tx: Transaction, a: BrandActor, input: { invitationId?: unknown }) {
  needsGuestsCapability(a);
  const [row] = await tx.select().from(t.brandInvitations).where(and(byBrand(t.brandInvitations, a), eq(t.brandInvitations.id, idOf(input.invitationId, 'Invitation')))).for('update');
  if (!row) throw new AppError('NOT_FOUND', 'Invitation not available');
  if (row.status !== 'PENDING') throw new AppError('CONFLICT', 'This invitation is already closed');
  await tx.update(t.brandInvitations).set({ status: 'REVOKED', revokedBy: a.userId, revokedAt: new Date() }).where(eq(t.brandInvitations.id, row.id));
  return { invitationId: row.id, status: 'REVOKED' };
}

/** Withdraws a guest's access; it applies on their next request (page, download, preview, direct link). */
export async function revokeGuest(tx: Transaction, a: BrandActor, input: { guestId?: unknown }) {
  needsGuestsCapability(a);
  const [row] = await tx.select().from(t.brandGuests).where(and(byBrand(t.brandGuests, a), eq(t.brandGuests.id, idOf(input.guestId, 'Guest')))).for('update');
  if (!row) throw new AppError('NOT_FOUND', 'Guest not available');
  if (row.status !== 'ACTIVE') throw new AppError('CONFLICT', 'This access was already withdrawn');
  await tx.update(t.brandGuests).set({ status: 'REVOKED', revokedBy: a.userId, revokedAt: new Date() }).where(eq(t.brandGuests.id, row.id));
  return { guestId: row.id, status: 'REVOKED' };
}

/** The approved strategy right now (each decision's active, approved version), frozen for a share. */
async function strategyContent(tx: Transaction, a: Scoped) {
  const rows = await tx.select({ module: t.questions.module, decisionId: t.decisions.id, versionId: t.versions.id, sequence: t.versions.sequence, selectedOption: t.versions.selectedOption, rationale: t.versions.rationale, status: t.versions.versionStatus, approvedAt: t.versions.approvedAt })
    .from(t.decisions).innerJoin(t.questions, eq(t.questions.id, t.decisions.questionId)).innerJoin(t.versions, eq(t.versions.id, t.decisions.activeVersionId))
    .where(and(byBrand(t.decisions, a), eq(t.versions.versionStatus, 'APPROVED')));
  return { decisions: rows.map(r => ({ module: r.module, decisionId: r.decisionId, versionId: r.versionId, sequence: r.sequence, selectedOption: r.selectedOption, rationale: r.rationale, approvedAt: r.approvedAt.toISOString() })).sort((x, y) => x.module.localeCompare(y.module)) };
}

/** The exact, immutable version behind a share and its fingerprint. Drafts can never be shared. */
async function shareable(tx: Transaction, a: Scoped, type: ShareTarget, targetId: string) {
  if (type === 'DELIVERABLE_VERSION') {
    const [v] = await tx.select().from(t.deliverableVersions).where(and(byBrand(t.deliverableVersions, a), eq(t.deliverableVersions.id, targetId)));
    if (!v) throw new AppError('NOT_FOUND', 'Version not available');
    if (!['IN_REVIEW', 'APPROVED'].includes(v.status)) throw new AppError('CONFLICT', 'Only a version in review or approved can be shared');
    return { fingerprint: v.fingerprint, title: String((v.content as { name?: string }).name ?? 'Material') + ` · versión ${v.sequence}` };
  }
  if (type === 'PLAN_SNAPSHOT') {
    const [s] = await tx.select().from(t.planSnapshots).where(and(byBrand(t.planSnapshots, a), eq(t.planSnapshots.id, targetId)));
    if (!s) throw new AppError('NOT_FOUND', 'Snapshot not available');
    if (s.status !== 'APPROVED') throw new AppError('CONFLICT', 'Only the approved plan snapshot can be shared');
    return { fingerprint: s.fingerprint, title: `Plan de Marketing · copia ${s.sequence}` };
  }
  const [v] = await tx.select().from(t.brandKitVersions).where(and(byBrand(t.brandKitVersions, a), eq(t.brandKitVersions.id, targetId)));
  if (!v) throw new AppError('NOT_FOUND', 'Version not available');
  if (!['IN_REVIEW', 'APPROVED'].includes(v.status)) throw new AppError('CONFLICT', 'Only a kit version in review or approved can be shared');
  return { fingerprint: v.fingerprint, title: `Identidad visual · versión ${v.sequence}` };
}

/**
 * Shares the exact version with the brand's guests. Sharing the strategy freezes the approved decisions now and
 * withdraws the previous strategy share (the portal shows one strategy). Idempotent per author and key.
 */
export async function shareToPortal(tx: Transaction, a: BrandActor, input: { targetType?: unknown; targetId?: unknown; idempotencyKey?: unknown }) {
  needsShareCapability(a);
  if (!isShareTarget(input.targetType)) throw new AppError('INVALID', 'Unknown share target');
  const type = input.targetType, idempotencyKey = key(input.idempotencyKey);
  const [prior] = await tx.select().from(t.portalShares).where(and(byBrand(t.portalShares, a), eq(t.portalShares.sharedBy, a.userId), eq(t.portalShares.idempotencyKey, idempotencyKey)));
  if (prior) {
    if (prior.targetType !== type || (type !== 'STRATEGY_SNAPSHOT' && prior.targetId !== input.targetId)) throw new AppError('CONFLICT', 'Idempotency key already used for another share');
    return { shareId: prior.id, fingerprint: prior.fingerprint, replayed: true };
  }
  const now = new Date(), id = randomUUID();
  if (type === 'STRATEGY_SNAPSHOT') {
    const content = await strategyContent(tx, a);
    if (!content.decisions.length) throw new AppError('CONFLICT', 'There is no approved decision to share yet');
    await tx.update(t.portalShares).set({ withdrawnBy: a.userId, withdrawnAt: now }).where(and(byBrand(t.portalShares, a), eq(t.portalShares.targetType, 'STRATEGY_SNAPSHOT'), isNull(t.portalShares.withdrawnAt)));
    const fingerprint = contentFingerprint(content);
    await tx.insert(t.portalShares).values({ id, workspaceId: a.workspaceId, brandId: a.brandId, targetType: type, targetId: id, fingerprint, title: 'Estrategia de marca', content, sharedBy: a.userId, sharedAt: now, idempotencyKey });
    return { shareId: id, fingerprint, replayed: false };
  }
  const targetId = idOf(input.targetId, 'Version');
  const target = await shareable(tx, a, type, targetId);
  const [active] = await tx.select().from(t.portalShares).where(and(byBrand(t.portalShares, a), eq(t.portalShares.targetType, type), eq(t.portalShares.targetId, targetId), isNull(t.portalShares.withdrawnAt)));
  if (active) throw new AppError('CONFLICT', 'This version is already shared');
  await tx.insert(t.portalShares).values({ id, workspaceId: a.workspaceId, brandId: a.brandId, targetType: type, targetId, fingerprint: target.fingerprint, title: target.title, content: null, sharedBy: a.userId, sharedAt: now, idempotencyKey });
  return { shareId: id, fingerprint: target.fingerprint, replayed: false };
}

export async function withdrawShare(tx: Transaction, a: BrandActor, input: { shareId?: unknown }) {
  needsShareCapability(a);
  const [row] = await tx.select().from(t.portalShares).where(and(byBrand(t.portalShares, a), eq(t.portalShares.id, idOf(input.shareId, 'Share')))).for('update');
  if (!row) throw new AppError('NOT_FOUND', 'Share not available');
  if (row.withdrawnAt) throw new AppError('CONFLICT', 'This share was already withdrawn');
  await tx.update(t.portalShares).set({ withdrawnBy: a.userId, withdrawnAt: new Date() }).where(eq(t.portalShares.id, row.id));
  return { shareId: row.id, withdrawn: true };
}

async function addComment(tx: Transaction, s: Scoped, authorId: string, context: 'TEAM' | 'GUEST', input: { shareId?: unknown; body?: unknown; visibility?: unknown; idempotencyKey?: unknown }) {
  const body = commentBody(input.body), idempotencyKey = key(input.idempotencyKey);
  const visibility = context === 'GUEST' ? 'SHARED' : input.visibility === 'INTERNAL' ? 'INTERNAL' : input.visibility === 'SHARED' ? 'SHARED' : null;
  if (!visibility) throw new AppError('INVALID', 'Choose who sees the comment');
  const [prior] = await tx.select().from(t.portalComments).where(and(byBrand(t.portalComments, s), eq(t.portalComments.authorId, authorId), eq(t.portalComments.idempotencyKey, idempotencyKey)));
  if (prior) { if (prior.body !== body || prior.shareId !== input.shareId) throw new AppError('CONFLICT', 'Idempotency key already used'); return { commentId: prior.id, replayed: true }; }
  const [share] = await tx.select().from(t.portalShares).where(and(byBrand(t.portalShares, s), eq(t.portalShares.id, idOf(input.shareId, 'Share'))));
  if (!share || (context === 'GUEST' && share.withdrawnAt)) throw new AppError('NOT_FOUND', 'Share not available');
  if (share.withdrawnAt) throw new AppError('CONFLICT', 'This share was withdrawn');
  const id = randomUUID();
  await tx.insert(t.portalComments).values({ id, workspaceId: s.workspaceId, brandId: s.brandId, shareId: share.id, authorId, actorContext: context, visibility, body, idempotencyKey, createdAt: new Date() });
  return { commentId: id, replayed: false };
}
export const teamComment = (tx: Transaction, a: BrandActor, input: Parameters<typeof addComment>[4]) => addComment(tx, a, a.userId, 'TEAM', input);

const authorName = async (tx: Transaction, ids: string[]) => {
  if (!ids.length) return new Map<string, string>();
  const rows = await tx.select({ userId: t.userAccounts.userId, displayName: t.userAccounts.displayName, email: t.userAccounts.email }).from(t.userAccounts).where(inArray(t.userAccounts.userId, ids));
  return new Map(rows.map(r => [r.userId, r.displayName || r.email]));
};

/** Colaboración (team view): invitations, guests, shares with every comment and approval, and what can be shared. */
export async function readCollaboration(tx: Transaction, a: BrandActor) {
  const now = new Date();
  const invitations = await tx.select().from(t.brandInvitations).where(byBrand(t.brandInvitations, a)).orderBy(desc(t.brandInvitations.createdAt));
  const guests = await tx.select().from(t.brandGuests).where(byBrand(t.brandGuests, a)).orderBy(desc(t.brandGuests.createdAt));
  const shares = await tx.select().from(t.portalShares).where(byBrand(t.portalShares, a)).orderBy(desc(t.portalShares.sharedAt));
  const comments = await tx.select().from(t.portalComments).where(byBrand(t.portalComments, a)).orderBy(asc(t.portalComments.createdAt));
  const approvals = await tx.select().from(t.portalApprovals).where(byBrand(t.portalApprovals, a)).orderBy(asc(t.portalApprovals.createdAt));
  const names = await authorName(tx, [...new Set([...guests.map(g => g.userId), ...comments.map(c => c.authorId), ...approvals.map(x => x.actorId)])]);
  const invitationEmail = new Map(invitations.map(i => [i.id, i.normalizedEmail]));
  const deliverables = await tx.select({ id: t.deliverableVersions.id, deliverableId: t.deliverableVersions.deliverableId, sequence: t.deliverableVersions.sequence, status: t.deliverableVersions.status, content: t.deliverableVersions.content }).from(t.deliverableVersions).where(and(byBrand(t.deliverableVersions, a), inArray(t.deliverableVersions.status, ['IN_REVIEW', 'APPROVED'])));
  const snapshots = await tx.select({ id: t.planSnapshots.id, sequence: t.planSnapshots.sequence }).from(t.planSnapshots).where(and(byBrand(t.planSnapshots, a), eq(t.planSnapshots.status, 'APPROVED')));
  const kitVersions = await tx.select({ id: t.brandKitVersions.id, sequence: t.brandKitVersions.sequence, status: t.brandKitVersions.status }).from(t.brandKitVersions).where(and(byBrand(t.brandKitVersions, a), inArray(t.brandKitVersions.status, ['IN_REVIEW', 'APPROVED'])));
  const activeTargets = new Set(shares.filter(s => !s.withdrawnAt).map(s => `${s.targetType}:${s.targetId}`));
  const strategy = await strategyContent(tx, a);
  return {
    canManageGuests: a.capabilities.includes('MANAGE_GUESTS'),
    emailDelivery: false,
    invitations: invitations.map(i => ({ id: i.id, email: i.normalizedEmail, state: invitationState(i, now), delivery: i.delivery, expiresAt: i.expiresAt.toISOString(), createdAt: i.createdAt.toISOString() })),
    guests: guests.map(g => ({ id: g.id, name: names.get(g.userId) ?? invitationEmail.get(g.invitationId) ?? 'Invitado', email: invitationEmail.get(g.invitationId) ?? '', status: g.status, createdAt: g.createdAt.toISOString(), revokedAt: g.revokedAt?.toISOString() ?? null })),
    shares: shares.map(s => ({
      id: s.id, targetType: s.targetType, targetId: s.targetId, title: s.title, fingerprint: s.fingerprint, sharedAt: s.sharedAt.toISOString(), withdrawnAt: s.withdrawnAt?.toISOString() ?? null,
      comments: comments.filter(c => c.shareId === s.id).map(c => ({ id: c.id, author: names.get(c.authorId) ?? (c.actorContext === 'GUEST' ? 'Invitado' : 'Equipo'), context: c.actorContext, visibility: c.visibility, body: c.body, createdAt: c.createdAt.toISOString() })),
      approvals: approvals.filter(x => x.shareId === s.id).map(x => ({ id: x.id, actor: names.get(x.actorId) ?? 'Invitado', context: x.actorContext, decision: x.decision, comment: x.comment, fingerprint: x.fingerprint, createdAt: x.createdAt.toISOString() }))
    })),
    shareable: {
      strategy: { decisions: strategy.decisions.length },
      deliverables: deliverables.filter(v => !activeTargets.has(`DELIVERABLE_VERSION:${v.id}`)).map(v => ({ id: v.id, title: `${String((v.content as { name?: string }).name ?? 'Material')} · versión ${v.sequence}`, status: v.status })),
      planSnapshots: snapshots.filter(s => !activeTargets.has(`PLAN_SNAPSHOT:${s.id}`)).map(s => ({ id: s.id, title: `Plan de Marketing · copia ${s.sequence}` })),
      kitVersions: kitVersions.filter(v => !activeTargets.has(`KIT_VERSION:${v.id}`)).map(v => ({ id: v.id, title: `Identidad visual · versión ${v.sequence}`, status: v.status }))
    }
  };
}

// ─── Guest side ──────────────────────────────────────────────────────────────────────────────────────────────────

/** The guest context for this exact brand, or 404 without revealing whether the brand exists. */
export async function resolveGuest(tx: Transaction, userId: string, brandId: unknown): Promise<GuestActor> {
  if (typeof brandId !== 'string' || !brandId || brandId.length > 200) throw new AppError('NOT_FOUND', 'Brand not available');
  const [g] = await tx.select().from(t.brandGuests).where(and(eq(t.brandGuests.userId, userId), eq(t.brandGuests.brandId, brandId), eq(t.brandGuests.status, 'ACTIVE')));
  if (!g) throw new AppError('NOT_FOUND', 'Brand not available');
  return { workspaceId: g.workspaceId, brandId: g.brandId, userId, guestId: g.id };
}

/**
 * Accepts an invitation with the signed-in identity. The recipient check is the same for both delivery routes:
 * a verified account email equal to the invited one; a local DEMO identity (no account) only for DEMO brands.
 * Team members of the brand's workspace do not become guests.
 */
export async function acceptInvitation(tx: Transaction, userId: string, input: { token?: unknown }) {
  const token = validInvitationToken(input.token);
  const [inv] = await tx.select().from(t.brandInvitations).where(eq(t.brandInvitations.tokenHash, tokenHash(token))).for('update');
  if (!inv) throw new AppError('NOT_FOUND', 'Invitation not available');
  if (inv.status === 'ACCEPTED' && inv.acceptedBy === userId) return { brandId: inv.brandId, replayed: true };
  if (!invitationOpen(inv)) throw new AppError('CONFLICT', 'This invitation expired, was revoked or was already used');
  const [account] = await tx.select().from(t.userAccounts).where(eq(t.userAccounts.userId, userId));
  const [brand] = await tx.select({ dataClass: t.brands.dataClass }).from(t.brands).where(and(eq(t.brands.workspaceId, inv.workspaceId), eq(t.brands.id, inv.brandId)));
  const recipient = account ? Boolean(account.emailVerifiedAt) && account.normalizedEmail === inv.normalizedEmail : brand?.dataClass === 'DEMO';
  if (!recipient) throw new AppError('FORBIDDEN', 'This invitation is for another email address');
  const [member] = await tx.select().from(t.memberships).where(and(eq(t.memberships.workspaceId, inv.workspaceId), eq(t.memberships.userId, userId)));
  if (member?.active) throw new AppError('CONFLICT', 'You already belong to the team of this brand');
  const now = new Date();
  await tx.update(t.brandInvitations).set({ status: 'ACCEPTED', acceptedBy: userId, acceptedAt: now }).where(eq(t.brandInvitations.id, inv.id));
  const [active] = await tx.select().from(t.brandGuests).where(and(eq(t.brandGuests.userId, userId), eq(t.brandGuests.brandId, inv.brandId), eq(t.brandGuests.status, 'ACTIVE')));
  if (!active) await tx.insert(t.brandGuests).values({ id: randomUUID(), workspaceId: inv.workspaceId, brandId: inv.brandId, userId, invitationId: inv.id, status: 'ACTIVE', invitedBy: inv.invitedBy, createdAt: now });
  return { brandId: inv.brandId, replayed: false };
}

/** Brands this identity is a guest of (for the portal entry), never other brands of those workspaces. */
export async function guestBrands(tx: Transaction, userId: string) {
  const rows = await tx.select({ brandId: t.brandGuests.brandId, name: t.brands.name }).from(t.brandGuests).innerJoin(t.brands, and(eq(t.brands.workspaceId, t.brandGuests.workspaceId), eq(t.brands.id, t.brandGuests.brandId))).where(and(eq(t.brandGuests.userId, userId), eq(t.brandGuests.status, 'ACTIVE')));
  return rows.map(r => ({ brandId: r.brandId, name: r.name }));
}

/** Living guide: the published kit version (never a draft), with contrast per pair and the files it cites. */
async function publishedGuide(tx: Transaction, s: Scoped) {
  const [kit] = await tx.select().from(t.brandKits).where(byBrand(t.brandKits, s));
  if (!kit?.publishedVersionId) return null;
  const [v] = await tx.select().from(t.brandKitVersions).where(eq(t.brandKitVersions.id, kit.publishedVersionId));
  return kitView(tx, s, v);
}
async function kitView(tx: Transaction, s: Scoped, v: typeof t.brandKitVersions.$inferSelect) {
  const content = v.content as KitContent;
  const ids = content.logos.map(l => l.assetId);
  const files = ids.length ? await tx.select({ id: t.kitAssets.id, format: t.kitAssets.format, originalName: t.kitAssets.originalName }).from(t.kitAssets).where(and(byBrand(t.kitAssets, s), inArray(t.kitAssets.id, ids))) : [];
  return { versionId: v.id, sequence: v.sequence, status: v.status, fingerprint: v.fingerprint, content, contrast: pairContrast(content), gaps: channelGaps(content), files: files.map(f => ({ id: f.id, previewable: ['PNG', 'JPEG', 'WEBP'].includes(f.format), originalName: f.originalName })) };
}
export const brandGuide = (tx: Transaction, a: BrandActor) => publishedGuide(tx, a);

async function shareBody(tx: Transaction, s: Scoped, share: typeof t.portalShares.$inferSelect) {
  if (share.targetType === 'STRATEGY_SNAPSHOT') return share.content;
  if (share.targetType === 'DELIVERABLE_VERSION') {
    const [v] = await tx.select().from(t.deliverableVersions).where(and(byBrand(t.deliverableVersions, s), eq(t.deliverableVersions.id, share.targetId)));
    const [d] = v ? await tx.select({ type: t.deliverables.type }).from(t.deliverables).where(and(byBrand(t.deliverables, s), eq(t.deliverables.id, v.deliverableId))) : [];
    return v ? { type: d?.type ?? null, sequence: v.sequence, content: v.content } : null;
  }
  if (share.targetType === 'PLAN_SNAPSHOT') {
    const [snap] = await tx.select().from(t.planSnapshots).where(and(byBrand(t.planSnapshots, s), eq(t.planSnapshots.id, share.targetId)));
    if (!snap) return null;
    const updates = await tx.select().from(t.planProgressUpdates).where(and(byBrand(t.planProgressUpdates, s), eq(t.planProgressUpdates.snapshotId, snap.id)));
    const content = snap.content as SnapshotContent;
    return { sequence: snap.sequence, content: { ...content, focus: focusWindow(content.focusStart) }, progress: sharedProgress(content, updates.map(u => ({ actionId: u.actionId, status: u.status as ActionStatus, date: u.date, note: u.note, createdAt: u.createdAt.toISOString() }))) };
  }
  const [v] = await tx.select().from(t.brandKitVersions).where(and(byBrand(t.brandKitVersions, s), eq(t.brandKitVersions.id, share.targetId)));
  return v ? kitView(tx, s, v) : null;
}

/** The portal: brand name, published guide and active shares with SHARED comments only and their approvals. */
export async function readPortal(tx: Transaction, g: GuestActor) {
  const [brand] = await tx.select({ name: t.brands.name }).from(t.brands).where(and(eq(t.brands.workspaceId, g.workspaceId), eq(t.brands.id, g.brandId)));
  const shares = await tx.select().from(t.portalShares).where(and(byBrand(t.portalShares, g), isNull(t.portalShares.withdrawnAt))).orderBy(desc(t.portalShares.sharedAt));
  const ids = shares.map(s => s.id);
  const comments = ids.length ? await tx.select().from(t.portalComments).where(and(byBrand(t.portalComments, g), inArray(t.portalComments.shareId, ids), eq(t.portalComments.visibility, 'SHARED'))).orderBy(asc(t.portalComments.createdAt)) : [];
  const approvals = ids.length ? await tx.select().from(t.portalApprovals).where(and(byBrand(t.portalApprovals, g), inArray(t.portalApprovals.shareId, ids))).orderBy(asc(t.portalApprovals.createdAt)) : [];
  const names = await authorName(tx, [...new Set([...comments.map(c => c.authorId), ...approvals.map(x => x.actorId)])]);
  const items = [];
  for (const s of shares) items.push({
    id: s.id, targetType: s.targetType, title: s.title, fingerprint: s.fingerprint, sharedAt: s.sharedAt.toISOString(), body: await shareBody(tx, g, s),
    comments: comments.filter(c => c.shareId === s.id).map(c => ({ id: c.id, author: c.authorId === g.userId ? 'Tú' : names.get(c.authorId) ?? (c.actorContext === 'GUEST' ? 'Invitado' : 'Equipo'), context: c.actorContext, body: c.body, createdAt: c.createdAt.toISOString() })),
    approvals: approvals.filter(x => x.shareId === s.id).map(x => ({ actor: x.actorId === g.userId ? 'Tú' : names.get(x.actorId) ?? 'Invitado', decision: x.decision, comment: x.comment, createdAt: x.createdAt.toISOString() }))
  });
  return { brand: { id: g.brandId, name: brand?.name ?? '' }, guide: await publishedGuide(tx, g), shares: items };
}

export const guestComment = (tx: Transaction, g: GuestActor, input: { shareId?: unknown; body?: unknown; idempotencyKey?: unknown }) => addComment(tx, g, g.userId, 'GUEST', input);

/**
 * Approve or request changes on the exact shared version. A fingerprint that is not the shared one → 409 without
 * effects; a new version needs its own share and its own approval. Never grants publishing or spend.
 */
export async function guestDecide(tx: Transaction, g: GuestActor, input: { shareId?: unknown; fingerprint?: unknown; decision?: unknown; comment?: unknown; idempotencyKey?: unknown }) {
  const { decision, comment } = approvalComment(input.decision, input.comment), idempotencyKey = key(input.idempotencyKey);
  const [prior] = await tx.select().from(t.portalApprovals).where(and(byBrand(t.portalApprovals, g), eq(t.portalApprovals.actorId, g.userId), eq(t.portalApprovals.idempotencyKey, idempotencyKey)));
  if (prior) {
    if (prior.shareId !== input.shareId || prior.fingerprint !== input.fingerprint || prior.decision !== decision || prior.comment !== comment) throw new AppError('CONFLICT', 'Idempotency key already used for another decision');
    return { approvalId: prior.id, decision, replayed: true };
  }
  const [share] = await tx.select().from(t.portalShares).where(and(byBrand(t.portalShares, g), eq(t.portalShares.id, idOf(input.shareId, 'Share')), isNull(t.portalShares.withdrawnAt)));
  if (!share) throw new AppError('NOT_FOUND', 'Share not available');
  if (share.targetType === 'STRATEGY_SNAPSHOT' || share.targetType === 'PLAN_SNAPSHOT') throw new AppError('INVALID', 'This shared item is for reading and comments');
  if (input.fingerprint !== share.fingerprint) throw new AppError('CONFLICT', 'This version changed since you opened it; reload before deciding');
  const id = randomUUID();
  await tx.insert(t.portalApprovals).values({ id, workspaceId: g.workspaceId, brandId: g.brandId, shareId: share.id, targetType: share.targetType, targetId: share.targetId, fingerprint: share.fingerprint, actorId: g.userId, actorContext: 'GUEST', decision, comment, idempotencyKey, createdAt: new Date() });
  return { approvalId: id, decision, replayed: false };
}

/** A kit file a guest may preview: cited by the published guide or by an active shared kit version of this brand. */
export async function guestAsset(tx: Transaction, g: GuestActor, assetId: unknown) {
  const id = idOf(assetId, 'File');
  const cited = new Set<string>();
  const [kit] = await tx.select().from(t.brandKits).where(byBrand(t.brandKits, g));
  const versionIds = [kit?.publishedVersionId, ...(await tx.select({ targetId: t.portalShares.targetId }).from(t.portalShares).where(and(byBrand(t.portalShares, g), eq(t.portalShares.targetType, 'KIT_VERSION'), isNull(t.portalShares.withdrawnAt)))).map(s => s.targetId)].filter((x): x is string => Boolean(x));
  if (versionIds.length) for (const v of await tx.select({ content: t.brandKitVersions.content }).from(t.brandKitVersions).where(and(byBrand(t.brandKitVersions, g), inArray(t.brandKitVersions.id, versionIds)))) (v.content as KitContent).logos.forEach(l => cited.add(l.assetId));
  if (!cited.has(id)) throw new AppError('NOT_FOUND', 'File not available');
  const [row] = await tx.select().from(t.kitAssets).where(and(byBrand(t.kitAssets, g), eq(t.kitAssets.id, id)));
  if (!row) throw new AppError('NOT_FOUND', 'File not available');
  return row;
}
