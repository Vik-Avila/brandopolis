import { randomUUID } from 'node:crypto';
import { and, desc, eq, inArray, isNull } from 'drizzle-orm';
import { AppError } from '../domain/contracts.js';
import type { Transaction } from '../persistence/database.js';
import * as t from '../persistence/schema.js';

/**
 * PHASE4_SPEC §13 · notifications. One record per recipient and event feeds the right panel, its counter and the
 * Inicio summary (same rows, never two sources). Reading or opening one never resolves the work it points to: an
 * approval is still decided in its own screen, with its own checks. Opening revalidates access to the brand and the
 * subject at that moment.
 */
export type NotificationKind = 'REVIEW_ASSIGNED' | 'REVIEW_REASSIGNED' | 'CHANGES_REQUESTED' | 'APPROVED' | 'COMMENT' | 'MENTION' | 'GUEST_COMMENT' | 'GUEST_DECISION' | 'EMAIL_FAILED';
type Scoped = { workspaceId: string; brandId: string };
export type Notice = { kind: NotificationKind; subjectType: string; subjectId: string; versionId?: string | null; actorId?: string | null; title: string; dedupe: string };

/** Records the event for each recipient except the actor. Idempotent per recipient and dedupe key (retries never duplicate). */
export async function notify(tx: Transaction, s: Scoped, recipients: readonly (string | null | undefined)[], n: Notice) {
  const unique = [...new Set(recipients.filter((r): r is string => Boolean(r) && r !== n.actorId))];
  const now = new Date();
  for (const recipientId of unique)
    await tx.insert(t.notifications).values({ id: randomUUID(), workspaceId: s.workspaceId, brandId: s.brandId, recipientId, kind: n.kind, subjectType: n.subjectType, subjectId: n.subjectId, versionId: n.versionId ?? null, actorId: n.actorId ?? null, title: n.title.slice(0, 300), dedupeKey: n.dedupe, createdAt: now }).onConflictDoNothing();
  return unique.length;
}

/** Where a notification leads inside the product (the view revalidates everything when it loads). */
export function notificationView(subjectType: string): string {
  if (subjectType === 'OFFER') return 'offers';
  if (subjectType === 'SOCIAL_POST') return 'social';
  if (subjectType === 'AD') return 'ads';
  if (['SALES_PRESENTATION', 'OFFER_COPY', 'DESIGN_BRIEF'].includes(subjectType)) return 'materials';
  return 'collaboration';
}

/** Brands of this workspace the person can open right now (ADMIN: all; MEMBER: assigned). */
async function reachableBrands(tx: Transaction, workspaceId: string, userId: string, role: string) {
  if (role === 'ADMIN') return new Map((await tx.select({ id: t.brands.id, name: t.brands.name }).from(t.brands).where(eq(t.brands.workspaceId, workspaceId))).map(b => [b.id, b.name]));
  const rows = await tx.select({ id: t.brands.id, name: t.brands.name }).from(t.assignments).innerJoin(t.brands, and(eq(t.brands.workspaceId, t.assignments.workspaceId), eq(t.brands.id, t.assignments.brandId))).where(and(eq(t.assignments.workspaceId, workspaceId), eq(t.assignments.userId, userId)));
  return new Map(rows.map(b => [b.id, b.name]));
}

/** The person's notifications in this workspace, only for brands they can still open. Newest first. */
export async function listNotifications(tx: Transaction, who: { workspaceId: string; userId: string; role: string }, limit = 50) {
  const brands = await reachableBrands(tx, who.workspaceId, who.userId, who.role);
  if (!brands.size) return { unread: 0, items: [] };
  const rows = await tx.select().from(t.notifications).where(and(eq(t.notifications.workspaceId, who.workspaceId), eq(t.notifications.recipientId, who.userId), inArray(t.notifications.brandId, [...brands.keys()]))).orderBy(desc(t.notifications.createdAt)).limit(200);
  return {
    unread: rows.filter(r => !r.readAt).length,
    items: rows.slice(0, limit).map(r => ({ id: r.id, brandId: r.brandId, brandName: brands.get(r.brandId) ?? '', kind: r.kind, title: r.title, subjectType: r.subjectType, subjectId: r.subjectId, versionId: r.versionId, view: notificationView(r.subjectType), createdAt: r.createdAt.toISOString(), readAt: r.readAt?.toISOString() ?? null }))
  };
}

/** Marks one (or all) of the person's notifications as read. Never touches the work they point to. */
export async function markNotificationsRead(tx: Transaction, who: { workspaceId: string; userId: string }, input: { notificationId?: unknown; all?: unknown }) {
  const mine = and(eq(t.notifications.workspaceId, who.workspaceId), eq(t.notifications.recipientId, who.userId), isNull(t.notifications.readAt));
  if (input.all === true) return { updated: (await tx.update(t.notifications).set({ readAt: new Date() }).where(mine).returning({ id: t.notifications.id })).length };
  if (typeof input.notificationId !== 'string' || !input.notificationId || input.notificationId.length > 200) throw new AppError('INVALID', 'Notification required');
  return { updated: (await tx.update(t.notifications).set({ readAt: new Date() }).where(and(mine, eq(t.notifications.id, input.notificationId))).returning({ id: t.notifications.id })).length };
}

/**
 * Opening a notification revalidates, now: it is the person's, the brand is still reachable and the subject still
 * exists in that brand. Otherwise it is indistinguishable from an unknown notification.
 */
export async function openNotification(tx: Transaction, who: { workspaceId: string; userId: string; role: string }, notificationId: unknown) {
  if (typeof notificationId !== 'string' || !notificationId || notificationId.length > 200) throw new AppError('NOT_FOUND', 'Notification not available');
  const [n] = await tx.select().from(t.notifications).where(and(eq(t.notifications.workspaceId, who.workspaceId), eq(t.notifications.recipientId, who.userId), eq(t.notifications.id, notificationId)));
  if (!n) throw new AppError('NOT_FOUND', 'Notification not available');
  const brands = await reachableBrands(tx, who.workspaceId, who.userId, who.role);
  if (!brands.has(n.brandId)) throw new AppError('NOT_FOUND', 'Notification not available');
  const scoped = { workspaceId: n.workspaceId, brandId: n.brandId };
  const exists = n.subjectType === 'OFFER'
    ? (await tx.select({ id: t.offers.id }).from(t.offers).where(and(eq(t.offers.workspaceId, scoped.workspaceId), eq(t.offers.brandId, scoped.brandId), eq(t.offers.id, n.subjectId)))).length > 0
    : ['SALES_PRESENTATION', 'OFFER_COPY', 'SOCIAL_POST', 'AD', 'DESIGN_BRIEF'].includes(n.subjectType)
      ? (await tx.select({ id: t.deliverables.id }).from(t.deliverables).where(and(eq(t.deliverables.workspaceId, scoped.workspaceId), eq(t.deliverables.brandId, scoped.brandId), eq(t.deliverables.id, n.subjectId)))).length > 0
      : true;
  if (!exists) throw new AppError('NOT_FOUND', 'Notification not available');
  if (!n.readAt) await tx.update(t.notifications).set({ readAt: new Date() }).where(eq(t.notifications.id, n.id));
  return { brandId: n.brandId, view: notificationView(n.subjectType), subjectType: n.subjectType, subjectId: n.subjectId, versionId: n.versionId };
}
