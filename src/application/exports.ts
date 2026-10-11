import { and, eq, inArray } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { AppError } from '../domain/contracts.js';
import type { KitContent } from '../domain/brand-kit.js';
import type { DeliverableContent } from '../domain/deliverables.js';
import type { Transaction } from '../persistence/database.js';
import * as t from '../persistence/schema.js';
import type { BrandActor } from './brand-access.js';

/**
 * ADR-0030 «Exportaciones» · what a document is made of. Reading only: an export never changes, approves or publishes
 * its source. Every source is resolved inside the actor's brand scope (team members only; guests have no route here)
 * and names the exact versions it uses. The transport loads the referenced files from the brand's private storage and
 * hands the bytes to the document builders.
 */
type Scoped = { workspaceId: string; brandId: string };
const byBrand = (table: { workspaceId: AnyPgColumn; brandId: AnyPgColumn }, a: Scoped) => and(eq(table.workspaceId, a.workspaceId), eq(table.brandId, a.brandId));

export type ExportAsset = { id: string; role: string; format: string; storageKey: string; originalName: string; bytes: number };
export type ExportKit = { versionId: string; sequence: number; status: string; published: boolean; content: KitContent };
export type ExportSource = {
  brand: { id: string; name: string };
  kit: ExportKit | null;
  assets: ExportAsset[];
  deliverable: { id: string; versionId: string; sequence: number; status: string; content: DeliverableContent; offerName: string | null } | null;
};

async function kitAssets(tx: Transaction, a: Scoped, kit: ExportKit | null): Promise<ExportAsset[]> {
  if (!kit) return [];
  const logoIds = kit.content.logos.map(l => l.assetId);
  // Fonts are matched to the kit's typography by the family name inside each file (see export-fonts.ts).
  const rows = await tx.select().from(t.kitAssets).where(byBrand(t.kitAssets, a));
  return rows.filter(r => r.role === 'FONT' || logoIds.includes(r.id)).map(r => ({ id: r.id, role: r.role, format: r.format, storageKey: r.storageKey, originalName: r.originalName, bytes: r.bytes }));
}
async function kitVersion(tx: Transaction, a: Scoped, versionId: string | null | undefined, publishedId: string | null): Promise<ExportKit | null> {
  if (!versionId) return null;
  const [v] = await tx.select().from(t.brandKitVersions).where(and(byBrand(t.brandKitVersions, a), eq(t.brandKitVersions.id, versionId)));
  return v ? { versionId: v.id, sequence: v.sequence, status: v.status, published: v.id === publishedId, content: v.content as KitContent } : null;
}
async function brandOf(tx: Transaction, a: Scoped) {
  const [b] = await tx.select({ id: t.brands.id, name: t.brands.name }).from(t.brands).where(and(eq(t.brands.workspaceId, a.workspaceId), eq(t.brands.id, a.brandId)));
  if (!b) throw new AppError('NOT_FOUND', 'Brand not available');
  return b;
}

/** Brand guide: only the published kit version (never a draft or a version in review). */
export async function guideSource(tx: Transaction, a: BrandActor): Promise<ExportSource> {
  const [kit] = await tx.select().from(t.brandKits).where(byBrand(t.brandKits, a));
  if (!kit?.publishedVersionId) throw new AppError('CONFLICT', 'Publish a kit version before exporting its guide');
  const k = await kitVersion(tx, a, kit.publishedVersionId, kit.publishedVersionId);
  return { brand: await brandOf(tx, a), kit: k, assets: await kitAssets(tx, a, k), deliverable: null };
}

/**
 * One deliverable version with the kit version it was written with (its manifest). Drafts can be exported for review;
 * the document says which version and state it shows. Comments, approvals and internal notes are never included.
 */
export async function deliverableSource(tx: Transaction, a: BrandActor, versionId: unknown): Promise<ExportSource> {
  if (typeof versionId !== 'string' || !versionId || versionId.length > 200) throw new AppError('INVALID', 'Version required');
  const [v] = await tx.select().from(t.deliverableVersions).where(and(byBrand(t.deliverableVersions, a), eq(t.deliverableVersions.id, versionId)));
  if (!v) throw new AppError('NOT_FOUND', 'Version not available');
  const [kit] = await tx.select().from(t.brandKits).where(byBrand(t.brandKits, a));
  const k = await kitVersion(tx, a, (v.manifest as { kitVersionId?: string | null }).kitVersionId, kit?.publishedVersionId ?? null);
  const content = v.content as DeliverableContent;
  let offerName: string | null = null;
  const offerVersionId = (v.manifest as { offerVersionId?: string | null }).offerVersionId;
  if (offerVersionId) {
    const [ov] = await tx.select({ content: t.offerVersions.content }).from(t.offerVersions).where(and(byBrand(t.offerVersions, a), inArray(t.offerVersions.id, [offerVersionId])));
    offerName = (ov?.content as { name?: string } | undefined)?.name ?? null;
  }
  return { brand: await brandOf(tx, a), kit: k, assets: await kitAssets(tx, a, k), deliverable: { id: v.deliverableId, versionId: v.id, sequence: v.sequence, status: v.status, content, offerName } };
}
