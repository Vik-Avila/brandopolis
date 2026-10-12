import { randomUUID } from 'node:crypto';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { AppError } from '../domain/contracts.js';
import { invitationOpen } from '../domain/collaboration.js';
import { guestInvitationEmail, type EmailMessage } from '../domain/email-templates.js';
import type { Database, Transaction } from '../persistence/database.js';
import * as t from '../persistence/schema.js';
import type { BrandActor } from './brand-access.js';
import type { Vault } from './credential-vault.js';
import { notify } from './notifications.js';

/**
 * PHASE4_SPEC §13 · email outbox. A message is queued in the same transaction as the act that needs it (one row per
 * dedupe key: retries never duplicate), and sent later by a worker through the configured provider.
 *
 * - The invitation link is sealed with the server vault (only the outbox can open it) and scrubbed once sent.
 * - Right before sending, the invitation is checked again: revoked or expired → CANCELLED, nothing is sent.
 * - Transient errors are retried with backoff; permanent ones (or too many attempts) end FAILED, visible to the team
 *   and notified to whoever invited. A person may retry a FAILED message; it stays the same message (same id).
 * - The provider receives the outbox id as its idempotency key, so a send interrupted after the provider accepted it
 *   is not delivered twice when it is retried.
 * Three levels of evidence stay apart: local tests with the simulated provider; acceptance by a real provider; and
 * delivery to an authorized inbox. Only the first exists in this phase (no provider, domain or recipient configured).
 */
export type EmailSendError = Error & { kind: 'TRANSIENT' | 'PERMANENT'; code: string };
export type EmailProvider = { name: string; simulated: boolean; send(message: EmailMessage & { id: string; to: string }): Promise<{ providerMessageId: string }> };
export type EmailService = { provider: EmailProvider; vault: Vault; appOrigin: string; backoffSeconds: number; maxAttempts: number };
export const emailError = (kind: 'TRANSIENT' | 'PERMANENT', code: string): EmailSendError => Object.assign(new Error(code), { kind, code });

const aad = (id: string) => `email-outbox:${id}`;

/** Queues the invitation email (same transaction as the invitation). The raw link is sealed, never stored in clear. */
export async function enqueueInvitationEmail(tx: Transaction, a: BrandActor, service: EmailService, input: { invitationId: string; recipient: string; token: string; expiresAt: string }) {
  const [brand] = await tx.select({ name: t.brands.name }).from(t.brands).where(and(eq(t.brands.workspaceId, a.workspaceId), eq(t.brands.id, a.brandId)));
  const [account] = await tx.select({ displayName: t.userAccounts.displayName, email: t.userAccounts.email }).from(t.userAccounts).where(eq(t.userAccounts.userId, a.userId));
  const id = randomUUID(), now = new Date();
  const link = `${service.appOrigin.replace(/\/$/, '')}/#invitacion=${input.token}`;
  const payload = { brandName: brand?.name ?? 'tu marca', inviterName: account?.displayName || account?.email || 'El equipo de la marca', expiresAt: input.expiresAt, sealedLink: service.vault.seal(link, aad(id)), keyId: service.vault.keyId };
  await tx.insert(t.emailOutbox).values({ id, workspaceId: a.workspaceId, brandId: a.brandId, template: 'GUEST_INVITATION', recipient: input.recipient, relatedType: 'INVITATION', relatedId: input.invitationId, payload, dedupeKey: `invitation:${input.invitationId}`, status: 'QUEUED', attempts: 0, nextAttemptAt: now, provider: service.provider.name, simulated: service.provider.simulated, createdBy: a.userId, createdAt: now, updatedAt: now }).onConflictDoNothing();
  return id;
}

/** Status of the emails of some invitations (team view). Never returns the payload. */
export async function emailsOfInvitations(tx: Transaction, s: { workspaceId: string; brandId: string }, invitationIds: string[]) {
  if (!invitationIds.length) return new Map<string, { id: string; status: string; attempts: number; lastError: string | null; simulated: boolean; provider: string | null; sentAt: string | null; nextAttemptAt: string }>();
  const rows = await tx.select().from(t.emailOutbox).where(and(eq(t.emailOutbox.workspaceId, s.workspaceId), eq(t.emailOutbox.brandId, s.brandId), eq(t.emailOutbox.relatedType, 'INVITATION'), inArray(t.emailOutbox.relatedId, invitationIds)));
  return new Map(rows.map(r => [r.relatedId, { id: r.id, status: r.status, attempts: r.attempts, lastError: r.lastError, simulated: r.simulated, provider: r.provider, sentAt: r.sentAt?.toISOString() ?? null, nextAttemptAt: r.nextAttemptAt.toISOString() }]));
}

/** A person with MANAGE_GUESTS retries a FAILED invitation email (same message, same id; the invitation must be open). */
export async function retryEmail(tx: Transaction, a: BrandActor, input: { emailId?: unknown }) {
  if (!a.capabilities.includes('MANAGE_GUESTS')) throw new AppError('FORBIDDEN', 'Managing guests needs its own permission');
  if (typeof input.emailId !== 'string' || !input.emailId || input.emailId.length > 200) throw new AppError('INVALID', 'Email required');
  const [row] = await tx.select().from(t.emailOutbox).where(and(eq(t.emailOutbox.workspaceId, a.workspaceId), eq(t.emailOutbox.brandId, a.brandId), eq(t.emailOutbox.id, input.emailId))).for('update');
  if (!row) throw new AppError('NOT_FOUND', 'Email not available');
  if (row.status !== 'FAILED') throw new AppError('CONFLICT', 'Only a failed email can be retried');
  const [inv] = await tx.select().from(t.brandInvitations).where(eq(t.brandInvitations.id, row.relatedId));
  if (!inv || !invitationOpen(inv)) throw new AppError('CONFLICT', 'This invitation expired or was revoked; create a new one');
  if (!(row.payload as { sealedLink?: string }).sealedLink) throw new AppError('CONFLICT', 'This message can no longer be sent; create a new invitation');
  await tx.update(t.emailOutbox).set({ status: 'QUEUED', lastError: null, nextAttemptAt: new Date(), updatedAt: new Date() }).where(eq(t.emailOutbox.id, row.id));
  return { emailId: row.id, status: 'QUEUED' };
}

/**
 * Sends at most one due message. The claim is atomic (SKIP LOCKED), so the web server and the worker can both call it
 * without sending a message twice. A message left SENDING for too long (crash after claiming) is due again.
 */
export async function processNextEmail(db: Database, service: EmailService, now = new Date()): Promise<'NONE' | 'SENT' | 'RETRY' | 'FAILED' | 'CANCELLED'> {
  const stale = new Date(now.getTime() - 10 * 60_000);
  const claimed = await db.transaction(async tx => {
    const [row] = await tx.select().from(t.emailOutbox).where(sql`(${t.emailOutbox.status} = 'QUEUED' AND ${t.emailOutbox.nextAttemptAt} <= ${now}) OR (${t.emailOutbox.status} = 'SENDING' AND ${t.emailOutbox.updatedAt} <= ${stale})`).orderBy(asc(t.emailOutbox.nextAttemptAt)).limit(1).for('update', { skipLocked: true });
    if (!row) return null;
    const [inv] = await tx.select().from(t.brandInvitations).where(eq(t.brandInvitations.id, row.relatedId));
    if (!inv || !invitationOpen(inv, now)) {
      await tx.update(t.emailOutbox).set({ status: 'CANCELLED', lastError: 'INVITATION_CLOSED', payload: scrub(row.payload), updatedAt: now }).where(eq(t.emailOutbox.id, row.id));
      return { row, cancelled: true as const };
    }
    await tx.update(t.emailOutbox).set({ status: 'SENDING', attempts: row.attempts + 1, updatedAt: now }).where(eq(t.emailOutbox.id, row.id));
    return { row: { ...row, attempts: row.attempts + 1 }, cancelled: false as const };
  });
  if (!claimed) return 'NONE';
  if (claimed.cancelled) return 'CANCELLED';
  const { row } = claimed, p = row.payload as { brandName: string; inviterName: string; expiresAt: string; sealedLink?: string; keyId?: string };
  let outcome: { providerMessageId: string } | EmailSendError;
  try {
    if (!p.sealedLink || !p.keyId) throw emailError('PERMANENT', 'MESSAGE_UNAVAILABLE');
    const link = service.vault.open(p.sealedLink, p.keyId, aad(row.id));
    outcome = await service.provider.send({ id: row.id, to: row.recipient, ...guestInvitationEmail({ brandName: p.brandName, inviterName: p.inviterName, link, expiresAt: p.expiresAt }) });
  } catch (error) {
    const e = error as Partial<EmailSendError>;
    outcome = e.kind ? (error as EmailSendError) : emailError('TRANSIENT', 'PROVIDER_ERROR');
  }
  return db.transaction(async tx => {
    const done = new Date();
    if (!(outcome instanceof Error)) {
      await tx.update(t.emailOutbox).set({ status: 'SENT', sentAt: done, providerMessageId: outcome.providerMessageId, lastError: null, payload: scrub(row.payload), updatedAt: done }).where(eq(t.emailOutbox.id, row.id));
      return 'SENT' as const;
    }
    if (outcome.kind === 'TRANSIENT' && row.attempts < service.maxAttempts) {
      await tx.update(t.emailOutbox).set({ status: 'QUEUED', lastError: outcome.code, nextAttemptAt: new Date(done.getTime() + service.backoffSeconds * 1000 * 2 ** (row.attempts - 1)), updatedAt: done }).where(eq(t.emailOutbox.id, row.id));
      return 'RETRY' as const;
    }
    await tx.update(t.emailOutbox).set({ status: 'FAILED', lastError: outcome.code, updatedAt: done }).where(eq(t.emailOutbox.id, row.id));
    await notify(tx, { workspaceId: row.workspaceId, brandId: row.brandId }, [row.createdBy], { kind: 'EMAIL_FAILED', subjectType: 'INVITATION', subjectId: row.relatedId, actorId: null, title: `No se pudo enviar la invitación a ${row.recipient}`, dedupe: `email-failed:${row.id}:${row.attempts}` });
    return 'FAILED' as const;
  });
}

/** The sealed link is removed once a message is sent or cancelled: nothing can resend it afterwards. */
function scrub(payload: Record<string, unknown>) { const { sealedLink: _l, keyId: _k, ...rest } = payload; return rest; }

/** Sends every message due now (bounded); used by the worker loop and after a new message is queued. */
export async function drainEmails(db: Database, service: EmailService, limit = 20) {
  const outcomes: string[] = [];
  for (let i = 0; i < limit; i++) { const r = await processNextEmail(db, service); if (r === 'NONE') break; outcomes.push(r); }
  return outcomes;
}

