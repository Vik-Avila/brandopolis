/**
 * PHASE4_SPEC §4.10 · persistence helpers of the guided start draft. A draft belongs to its author inside their
 * workspace: another member never reads or writes it (the engine resolves the actor from the session).
 */
import { and, eq, inArray } from 'drizzle-orm';
import { AppError, validate } from '../domain/contracts.js';
import { identityPostponable, missingFor, proposalsFrom, setupSummary, type SetupFields } from '../domain/brand-setup.js';
import { INTENT_ENTRY, isWorkIntent, type WorkIntent } from '../domain/work-priority.js';
import type { Transaction } from '../persistence/database.js';
import * as t from '../persistence/schema.js';

export type SetupRow = typeof t.brandSetupDrafts.$inferSelect;

/** The author's draft, locked for update. Absent, foreign or closed drafts are indistinguishable from absent. */
export async function lockDraft(tx: Transaction, workspaceId: string, userId: string, draftId: unknown) {
  if (typeof draftId !== 'string' || !draftId || draftId.length > 200) throw new AppError('INVALID', 'Draft required');
  const [row] = await tx.select().from(t.brandSetupDrafts).where(and(eq(t.brandSetupDrafts.id, draftId), eq(t.brandSetupDrafts.workspaceId, workspaceId))).for('update');
  if (!row || row.createdBy !== userId) throw new AppError('NOT_FOUND', 'Draft unavailable');
  return row;
}

/** Optimistic concurrency: a save from a stale screen is a 409, never a silent overwrite. */
export function expectVersion(row: SetupRow, expected: unknown) {
  if (row.status !== 'IN_PROGRESS') throw new AppError('CONFLICT', 'This draft is already closed');
  if (expected !== row.version) throw new AppError('CONFLICT', 'The draft changed since you opened it; reload before saving');
}

/** Document proposals of the brand (candidate or accepted claims mapped to ficha fields), with document names. */
export async function brandProposals(tx: Transaction, workspaceId: string, brandId: string | null) {
  if (!brandId) return { proposals: [], conflicts: [] as ('offer' | 'audience')[] };
  const claims = await tx.select().from(t.documentClaims).where(and(eq(t.documentClaims.workspaceId, workspaceId), eq(t.documentClaims.brandId, brandId), inArray(t.documentClaims.claimType, ['OFFER', 'AUDIENCE'])));
  const docs = await tx.select({ id: t.sourceDocuments.id, name: t.sourceDocuments.originalName }).from(t.sourceDocuments).where(and(eq(t.sourceDocuments.workspaceId, workspaceId), eq(t.sourceDocuments.brandId, brandId)));
  return proposalsFrom(claims.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id)), new Map(docs.map(d => [d.id, d.name])));
}

/** A value taken from a document must name a claim of this brand and that document; the name comes from the store. */
export async function resolveSources(tx: Transaction, workspaceId: string, brandId: string | null, fields: SetupFields) {
  for (const key of ['offer', 'audience'] as const) {
    const source = fields[key]?.source;
    if (!source) continue;
    if (!brandId) throw new AppError('INVALID', 'Documents belong to a created brand');
    const [claim] = await tx.select().from(t.documentClaims).where(and(eq(t.documentClaims.id, source.claimId), eq(t.documentClaims.workspaceId, workspaceId), eq(t.documentClaims.brandId, brandId)));
    const [doc] = await tx.select().from(t.sourceDocuments).where(and(eq(t.sourceDocuments.id, source.documentId), eq(t.sourceDocuments.workspaceId, workspaceId), eq(t.sourceDocuments.brandId, brandId)));
    if (!claim || !doc || claim.documentId !== doc.id) throw new AppError('INVALID', 'Unknown document source');
    fields[key] = { ...fields[key]!, source: { documentId: doc.id, claimId: claim.id, documentName: doc.originalName } };
  }
  return fields;
}

/** Current work priority of the linked brand (the priority never lives in the draft). */
export async function currentIntent(tx: Transaction, workspaceId: string, brandId: string | null): Promise<WorkIntent | null> {
  if (!brandId) return null;
  const rows = await tx.select({ intent: t.brandWorkPriorities.intent, createdAt: t.brandWorkPriorities.createdAt, id: t.brandWorkPriorities.id }).from(t.brandWorkPriorities)
    .where(and(eq(t.brandWorkPriorities.workspaceId, workspaceId), eq(t.brandWorkPriorities.brandId, brandId)));
  const latest = rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id.localeCompare(a.id))[0];
  return latest && isWorkIntent(latest.intent) ? latest.intent : null;
}

/** Public view of a draft: fields, real stages, what the guide still asks, proposals and conflicts. */
export async function draftView(tx: Transaction, row: SetupRow) {
  const fields = row.fields as SetupFields;
  const intent = await currentIntent(tx, row.workspaceId, row.brandId);
  const { proposals, conflicts } = await brandProposals(tx, row.workspaceId, row.brandId);
  const payload = {
    id: row.id, brandId: row.brandId, status: row.status, step: row.step, fields, identityChoice: row.identityChoice,
    version: row.version, createdBy: row.createdBy, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString()
  };
  validate('brand-setup-draft', payload);
  return {
    ...payload, intent, entry: intent ? INTENT_ENTRY[intent] : null,
    missing: missingFor(intent, fields), identityPostponable: identityPostponable(intent),
    proposals: proposals.filter(p => !fields[p.field]), conflicts: conflicts.filter(f => !fields[f]),
    summary: setupSummary(fields, proposals, intent)
  };
}
