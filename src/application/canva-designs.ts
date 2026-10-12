import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { AppError } from '../domain/contracts.js';
import { contentFingerprint } from '../domain/editorial-versions.js';
import type { DeliverableContent } from '../domain/deliverables.js';
import type { Transaction } from '../persistence/database.js';
import * as t from '../persistence/schema.js';
import type { BrandActor } from './brand-access.js';
import { newDeliverableDraft } from './deliverables.js';
import { SIMULATED_SCOPE } from './campaigns.js';

/**
 * Block 8 · Canva (CNV-001/002). The person sends the APPROVED brief to their own Canva connection and later retrieves
 * the design: retrieving creates a NEW draft version of the brief with the design reference, which needs review like
 * any version; the approved version never changes. Provider calls happen outside these transactions (Engine).
 */
const key = (v: unknown) => { if (typeof v !== 'string' || !v.trim() || v.length > 200) throw new AppError('INVALID', 'Invalid idempotency key'); return v; };
const idOf = (v: unknown, what: string) => { if (typeof v !== 'string' || !v || v.length > 200) throw new AppError('INVALID', `${what} required`); return v; };

/** Phase 1 of «send to Canva»: the approved brief of this brand and the person's own active Canva connection. */
export async function canvaSendPlan(tx: Transaction, a: BrandActor, input: { deliverableId?: unknown; idempotencyKey?: unknown }) {
  const idempotencyKey = key(input.idempotencyKey);
  const [prior] = await tx.select().from(t.canvaDesigns).where(and(eq(t.canvaDesigns.workspaceId, a.workspaceId), eq(t.canvaDesigns.brandId, a.brandId), eq(t.canvaDesigns.createdBy, a.userId), eq(t.canvaDesigns.idempotencyKey, idempotencyKey)));
  if (prior) return { replay: { designId: prior.id, designRef: prior.designRef, simulated: prior.simulated, replayed: true } };
  const [d] = await tx.select().from(t.deliverables).where(and(eq(t.deliverables.workspaceId, a.workspaceId), eq(t.deliverables.brandId, a.brandId), eq(t.deliverables.id, idOf(input.deliverableId, 'Deliverable'))));
  if (!d || d.type !== 'DESIGN_BRIEF') throw new AppError('NOT_FOUND', 'Design brief not available');
  if (!d.approvedVersionId) throw new AppError('CONFLICT', 'Approve the brief before sending it to Canva');
  const [v] = await tx.select().from(t.deliverableVersions).where(eq(t.deliverableVersions.id, d.approvedVersionId));
  const [connection] = await tx.select().from(t.connections).where(and(eq(t.connections.workspaceId, a.workspaceId), eq(t.connections.provider, 'CANVA'), eq(t.connections.ownerUserId, a.userId), eq(t.connections.status, 'ACTIVE')));
  if (!connection) throw new AppError('CONFLICT', 'Connect your Canva account first');
  const content = v.content as DeliverableContent, b = content.body as Record<string, string>;
  const assets = await tx.select({ id: t.kitAssets.id }).from(t.kitAssets).where(and(eq(t.kitAssets.workspaceId, a.workspaceId), eq(t.kitAssets.brandId, a.brandId)));
  return { plan: { deliverableId: d.id, versionId: v.id, connectionId: connection.id, simulated: (connection.scopes as string[]).includes(SIMULATED_SCOPE), title: content.name || b.piece || 'Pieza', brief: [b.piece, b.format, b.message, b.mustInclude && `Incluir: ${b.mustInclude}`, b.avoid && `Evitar: ${b.avoid}`].filter(Boolean).join('\n'), assetCount: assets.length, idempotencyKey } };
}

/** Phase 3 of «send to Canva»: records the design created by the provider (idempotent per person and key). */
export async function canvaRecordDesign(tx: Transaction, a: BrandActor, plan: { deliverableId: string; versionId: string; connectionId: string; simulated: boolean; idempotencyKey: string }, designRef: string) {
  const id = randomUUID();
  const inserted = await tx.insert(t.canvaDesigns).values({ id, workspaceId: a.workspaceId, brandId: a.brandId, deliverableId: plan.deliverableId, sourceVersionId: plan.versionId, connectionId: plan.connectionId, designRef, simulated: plan.simulated, status: 'CREATED', createdBy: a.userId, idempotencyKey: plan.idempotencyKey, createdAt: new Date() }).onConflictDoNothing().returning({ id: t.canvaDesigns.id });
  if (!inserted.length) { const [prior] = await tx.select().from(t.canvaDesigns).where(and(eq(t.canvaDesigns.workspaceId, a.workspaceId), eq(t.canvaDesigns.brandId, a.brandId), eq(t.canvaDesigns.createdBy, a.userId), eq(t.canvaDesigns.idempotencyKey, plan.idempotencyKey))); return { designId: prior.id, designRef: prior.designRef, simulated: prior.simulated, replayed: true }; }
  return { designId: id, designRef, simulated: plan.simulated, replayed: false };
}

/** Phase 1 of «retrieve»: a design of this brand still not retrieved, with the person's connection still active. */
export async function canvaRetrievePlan(tx: Transaction, a: BrandActor, input: { designId?: unknown }) {
  const [design] = await tx.select().from(t.canvaDesigns).where(and(eq(t.canvaDesigns.workspaceId, a.workspaceId), eq(t.canvaDesigns.brandId, a.brandId), eq(t.canvaDesigns.id, idOf(input.designId, 'Design'))));
  if (!design) throw new AppError('NOT_FOUND', 'Design not available');
  if (design.status === 'RETRIEVED') return { replay: { designId: design.id, versionId: design.retrievedVersionId, replayed: true } };
  const [connection] = await tx.select().from(t.connections).where(and(eq(t.connections.workspaceId, a.workspaceId), eq(t.connections.id, design.connectionId)));
  if (!connection || connection.status !== 'ACTIVE' || connection.ownerUserId !== a.userId) throw new AppError('CONFLICT', 'Reconnect the Canva account that created this design');
  return { plan: { designId: design.id, designRef: design.designRef, deliverableId: design.deliverableId, simulated: design.simulated, connectionId: design.connectionId } };
}

/** Phase 3 of «retrieve»: a NEW draft of the brief carrying the design; it needs review. The approved one stays. */
export async function canvaRecordRetrieval(tx: Transaction, a: BrandActor, plan: { designId: string; designRef: string; deliverableId: string; simulated: boolean }, exported: { format: 'PNG'; sha256: string; pages: number }) {
  const [design] = await tx.select().from(t.canvaDesigns).where(eq(t.canvaDesigns.id, plan.designId)).for('update');
  if (design.status === 'RETRIEVED') return { designId: design.id, versionId: design.retrievedVersionId, replayed: true };
  const [d] = await tx.select().from(t.deliverables).where(eq(t.deliverables.id, plan.deliverableId));
  if (d.draftVersionId) throw new AppError('CONFLICT', 'This brief already has an open draft: send it for review or finish it first');
  const created = await newDeliverableDraft(tx, a, { deliverableId: d.id, expectedRevision: d.revision });
  const [draft] = await tx.select().from(t.deliverableVersions).where(eq(t.deliverableVersions.id, created.versionId));
  const base = draft.content as DeliverableContent;
  const content = { ...base, body: { ...base.body, design: { provider: 'CANVA', designRef: plan.designRef, format: exported.format, sha256: exported.sha256, pages: exported.pages, simulated: plan.simulated, retrievedAt: new Date().toISOString() } } };
  await tx.update(t.deliverableVersions).set({ content, fingerprint: contentFingerprint(content) }).where(eq(t.deliverableVersions.id, draft.id));
  await tx.update(t.canvaDesigns).set({ status: 'RETRIEVED', retrievedVersionId: draft.id, retrievedAt: new Date() }).where(eq(t.canvaDesigns.id, design.id));
  return { designId: design.id, versionId: draft.id, replayed: false };
}

export async function readCanvaDesigns(tx: Transaction, a: BrandActor) {
  const rows = await tx.select().from(t.canvaDesigns).where(and(eq(t.canvaDesigns.workspaceId, a.workspaceId), eq(t.canvaDesigns.brandId, a.brandId)));
  return rows.map(r => ({ id: r.id, deliverableId: r.deliverableId, sourceVersionId: r.sourceVersionId, designRef: r.designRef, simulated: r.simulated, status: r.status, retrievedVersionId: r.retrievedVersionId, createdAt: r.createdAt.toISOString(), retrievedAt: r.retrievedAt?.toISOString() ?? null }));
}
