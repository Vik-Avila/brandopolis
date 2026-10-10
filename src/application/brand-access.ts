import { randomUUID } from 'node:crypto';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { AppError, validate } from '../domain/contracts.js';
import { isBrandCapability, type BrandCapability } from '../domain/brand-capabilities.js';
import { isWorkIntent, INTENT_ENTRY } from '../domain/work-priority.js';
import type { Transaction } from '../persistence/database.js';
import * as t from '../persistence/schema.js';

/** Resolved by Engine.withBrandActor from the session (identity + brand scope); callers never supply it. */
export type BrandActor = { workspaceId: string; brandId: string; userId: string; role: string; capabilities: BrandCapability[] };

const key = (value: unknown) => {
  if (typeof value !== 'string' || !value.trim() || value.length > 200) throw new AppError('INVALID', 'Invalid idempotency key');
  return value;
};

/** PHASE4_SPEC §4.9 · current priority (latest record) plus its history, newest first. */
export async function readWorkPriority(tx: Transaction, actor: BrandActor) {
  const rows = await tx.select().from(t.brandWorkPriorities)
    .where(and(eq(t.brandWorkPriorities.workspaceId, actor.workspaceId), eq(t.brandWorkPriorities.brandId, actor.brandId)))
    .orderBy(desc(t.brandWorkPriorities.createdAt), desc(t.brandWorkPriorities.id));
  const view = (r: typeof rows[number]) => ({ id: r.id, brandId: r.brandId, intent: r.intent, note: r.note, createdBy: r.createdBy, createdAt: r.createdAt.toISOString(), entry: INTENT_ENTRY[r.intent as keyof typeof INTENT_ENTRY] });
  return { current: rows[0] ? view(rows[0]) : null, history: rows.map(view) };
}

/**
 * Appends a new priority (never updates). Idempotent per (brand, author, key): same key and content replays the
 * record; same key with other content is a conflict. Writes no decision, context, plan or permission.
 */
export async function recordWorkPriority(tx: Transaction, actor: BrandActor, input: { intent?: unknown; note?: unknown; idempotencyKey?: unknown }) {
  if (!isWorkIntent(input.intent)) throw new AppError('INVALID', 'Unknown work intent');
  const note = input.note == null || input.note === '' ? null : input.note;
  if (note !== null && (typeof note !== 'string' || note.length > 500)) throw new AppError('INVALID', 'Note too long');
  const idempotencyKey = key(input.idempotencyKey);
  const trimmed = typeof note === 'string' ? note.trim() || null : null;
  const scopeWhere = and(eq(t.brandWorkPriorities.workspaceId, actor.workspaceId), eq(t.brandWorkPriorities.brandId, actor.brandId), eq(t.brandWorkPriorities.createdBy, actor.userId), eq(t.brandWorkPriorities.idempotencyKey, idempotencyKey));
  const [prior] = await tx.select().from(t.brandWorkPriorities).where(scopeWhere);
  if (prior) {
    if (prior.intent !== input.intent || prior.note !== trimmed) throw new AppError('CONFLICT', 'Idempotency key already used with other content');
    return { id: prior.id, intent: prior.intent, note: prior.note, createdAt: prior.createdAt.toISOString(), replayed: true };
  }
  const row = { id: randomUUID(), workspaceId: actor.workspaceId, brandId: actor.brandId, intent: input.intent, note: trimmed, createdBy: actor.userId, idempotencyKey, createdAt: new Date() };
  validate('work-priority', { id: row.id, brandId: row.brandId, intent: row.intent, note: row.note, createdBy: row.createdBy, createdAt: row.createdAt.toISOString() });
  const inserted = await tx.insert(t.brandWorkPriorities).values(row).onConflictDoNothing().returning({ id: t.brandWorkPriorities.id });
  if (!inserted.length) {
    const [winner] = await tx.select().from(t.brandWorkPriorities).where(scopeWhere);
    if (winner.intent !== row.intent || winner.note !== row.note) throw new AppError('CONFLICT', 'Idempotency key already used with other content');
    return { id: winner.id, intent: winner.intent, note: winner.note, createdAt: winner.createdAt.toISOString(), replayed: true };
  }
  return { id: row.id, intent: row.intent, note: row.note, createdAt: row.createdAt.toISOString(), replayed: false };
}

/** Active grants of MEMBERs for this brand (an ADMIN holds every capability implicitly and is not listed). */
export async function listCapabilityGrants(tx: Transaction, actor: BrandActor) {
  // Members see only their own capabilities; the grant list of the brand is an administrator view.
  if (actor.role !== 'ADMIN') return { mine: actor.capabilities, grants: [] };
  const rows = await tx.select().from(t.brandCapabilities)
    .where(and(eq(t.brandCapabilities.workspaceId, actor.workspaceId), eq(t.brandCapabilities.brandId, actor.brandId), isNull(t.brandCapabilities.revokedAt)));
  return { mine: actor.capabilities, grants: rows.map(r => ({ userId: r.userId, capability: r.capability, grantedBy: r.grantedBy, grantedAt: r.grantedAt.toISOString() })) };
}

/** Active grants of one user for one brand (used to compute capabilities inside a transaction). */
export async function grantedCapabilities(tx: Transaction, workspaceId: string, brandId: string, userId: string) {
  const rows = await tx.select({ capability: t.brandCapabilities.capability }).from(t.brandCapabilities)
    .where(and(eq(t.brandCapabilities.workspaceId, workspaceId), eq(t.brandCapabilities.brandId, brandId), eq(t.brandCapabilities.userId, userId), isNull(t.brandCapabilities.revokedAt)));
  return rows.map(r => r.capability);
}

/**
 * Only a workspace ADMIN grants or revokes, and only to an active MEMBER assigned to this brand (an ADMIN already
 * holds everything; guests have no membership). Idempotent by state: granting an active grant or revoking an absent
 * one changes nothing. Every change is audited by the caller.
 */
export async function changeCapability(tx: Transaction, actor: BrandActor, input: { userId?: unknown; capability?: unknown }, grant: boolean) {
  if (actor.role !== 'ADMIN') throw new AppError('FORBIDDEN', 'Only a workspace administrator manages brand capabilities');
  if (typeof input.userId !== 'string' || !input.userId || input.userId.length > 200) throw new AppError('INVALID', 'User required');
  if (!isBrandCapability(input.capability)) throw new AppError('INVALID', 'Unknown capability');
  const [member] = await tx.select().from(t.memberships).where(and(eq(t.memberships.workspaceId, actor.workspaceId), eq(t.memberships.userId, input.userId)));
  // Indistinguishable from an unknown user: never reveal memberships of other workspaces.
  if (!member || !member.active) throw new AppError('NOT_FOUND', 'Member not available');
  if (member.role !== 'MEMBER') throw new AppError('INVALID', 'Capabilities are granted to members; administrators already hold them');
  const [assignment] = await tx.select().from(t.assignments).where(and(eq(t.assignments.workspaceId, actor.workspaceId), eq(t.assignments.brandId, actor.brandId), eq(t.assignments.userId, input.userId)));
  if (!assignment) throw new AppError('INVALID', 'Assign the brand to this member first');
  const where = and(eq(t.brandCapabilities.workspaceId, actor.workspaceId), eq(t.brandCapabilities.brandId, actor.brandId), eq(t.brandCapabilities.userId, input.userId), eq(t.brandCapabilities.capability, input.capability), isNull(t.brandCapabilities.revokedAt));
  const [active] = await tx.select().from(t.brandCapabilities).where(where);
  if (grant) {
    if (active) return { changed: false };
    await tx.insert(t.brandCapabilities).values({ id: randomUUID(), workspaceId: actor.workspaceId, brandId: actor.brandId, userId: input.userId, capability: input.capability, grantedBy: actor.userId, grantedAt: new Date() }).onConflictDoNothing();
    return { changed: true };
  }
  if (!active) return { changed: false };
  await tx.update(t.brandCapabilities).set({ revokedAt: new Date(), revokedBy: actor.userId }).where(eq(t.brandCapabilities.id, active.id));
  return { changed: true };
}
