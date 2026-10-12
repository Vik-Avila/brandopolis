import { and, asc, desc, eq, inArray, isNull } from 'drizzle-orm';
import { AppError } from '../domain/contracts.js';
import { contentFingerprint } from '../domain/editorial-versions.js';
import { isBrandFilePurpose, isTemplateCategory, type BrandFileInfo, type BrandFilePurpose } from '../domain/brand-files.js';
import type { DeliverableContent } from '../domain/deliverables.js';
import type { Transaction } from '../persistence/database.js';
import * as t from '../persistence/schema.js';
import type { BrandActor } from './brand-access.js';
import type { GuestActor } from './collaboration.js';
import { newDeliverableDraft } from './deliverables.js';

/**
 * PHASE4_SPEC §13 · brand files. Team members of the brand upload and download them; guests never see references or
 * templates, and see a final art file only while its exact deliverable version is shared with them.
 *
 * - REFERENCE belongs to a design brief and stays internal: it is never sent to Canva by itself (the brief text is).
 * - FINAL_ART is part of the reviewed content of a deliverable version (content.finalArt, written only here): attached
 *   to the open draft, or, when there is none (after an approval), to a NEW draft that needs review. The approved
 *   version never changes.
 * - TEMPLATE lives in Marca y recursos, classified by category and versioned by lineage (a new upload of the same
 *   template is sequence + 1; older versions stay downloadable).
 */
type Scoped = { workspaceId: string; brandId: string };
const byBrand = (s: Scoped) => and(eq(t.brandFiles.workspaceId, s.workspaceId), eq(t.brandFiles.brandId, s.brandId));
const idOf = (v: unknown, what: string) => { if (typeof v !== 'string' || !v || v.length > 200) throw new AppError('INVALID', `${what} required`); return v; };
const optionalId = (v: unknown, what: string) => (v == null || v === '' ? null : idOf(v, what));

async function deliverableOf(tx: Transaction, a: Scoped, id: string) {
  const [d] = await tx.select().from(t.deliverables).where(and(eq(t.deliverables.workspaceId, a.workspaceId), eq(t.deliverables.brandId, a.brandId), eq(t.deliverables.id, id)));
  if (!d) throw new AppError('NOT_FOUND', 'Deliverable not available');
  if (d.status !== 'ACTIVE') throw new AppError('CONFLICT', 'A retired deliverable is read-only');
  return d;
}

export type UploadIntent = { purpose: BrandFilePurpose; deliverableId: string | null; previousFileId: string | null; category: string | null };

/** Checks an upload before its bytes are stored, so a refused one never leaves a file on disk. */
export async function brandFileUploadIntent(tx: Transaction, a: BrandActor, input: { purpose?: unknown; deliverableId?: unknown; previousFileId?: unknown; category?: unknown }): Promise<UploadIntent> {
  if (!isBrandFilePurpose(input.purpose)) throw new AppError('INVALID', 'Unknown file use');
  const deliverableId = optionalId(input.deliverableId, 'Deliverable'), previousFileId = optionalId(input.previousFileId, 'File');
  if (input.purpose === 'TEMPLATE') {
    if (deliverableId) throw new AppError('INVALID', 'A template does not belong to a deliverable');
    if (previousFileId) {
      const [prev] = await tx.select().from(t.brandFiles).where(and(byBrand(a), eq(t.brandFiles.id, previousFileId)));
      if (!prev || prev.purpose !== 'TEMPLATE') throw new AppError('NOT_FOUND', 'Template not available');
      if (prev.retiredAt) throw new AppError('CONFLICT', 'This template was retired');
      return { purpose: 'TEMPLATE', deliverableId: null, previousFileId, category: prev.category };
    }
    if (!isTemplateCategory(input.category)) throw new AppError('INVALID', 'Choose a category for the template');
    return { purpose: 'TEMPLATE', deliverableId: null, previousFileId: null, category: input.category };
  }
  if (!deliverableId) throw new AppError('INVALID', 'Deliverable required');
  const d = await deliverableOf(tx, a, deliverableId);
  if (input.purpose === 'REFERENCE' && d.type !== 'DESIGN_BRIEF') throw new AppError('INVALID', 'References belong to a design brief');
  return { purpose: input.purpose, deliverableId, previousFileId: null, category: null };
}

/** Registers a stored upload. Final art goes into a draft version (the open one, or a new one after an approval). */
export async function registerBrandFile(tx: Transaction, a: BrandActor, intent: UploadIntent, file: { id: string; originalName: string; info: BrandFileInfo; bytes: number; sha256: string; storageKey: string }) {
  const now = new Date();
  const base = { id: file.id, workspaceId: a.workspaceId, brandId: a.brandId, purpose: intent.purpose, category: intent.category, originalName: file.originalName.slice(0, 200), format: file.info.format, mediaType: file.info.mediaType, bytes: file.bytes, sha256: file.sha256, storageKey: file.storageKey, uploadedBy: a.userId, createdAt: now };
  if (intent.purpose === 'TEMPLATE') {
    if (intent.previousFileId) {
      const [prev] = await tx.select().from(t.brandFiles).where(and(byBrand(a), eq(t.brandFiles.id, intent.previousFileId))).for('update');
      const lineage = await tx.select({ sequence: t.brandFiles.sequence, retiredAt: t.brandFiles.retiredAt }).from(t.brandFiles).where(eq(t.brandFiles.lineageId, prev.lineageId)).orderBy(desc(t.brandFiles.sequence));
      if (lineage.some(l => l.retiredAt)) throw new AppError('CONFLICT', 'This template was retired');
      await tx.insert(t.brandFiles).values({ ...base, lineageId: prev.lineageId, sequence: lineage[0].sequence + 1, previousFileId: prev.id, deliverableId: null, deliverableVersionId: null });
      return { fileId: file.id, sequence: lineage[0].sequence + 1, versionId: null, newVersion: false };
    }
    await tx.insert(t.brandFiles).values({ ...base, lineageId: file.id, sequence: 1, previousFileId: null, deliverableId: null, deliverableVersionId: null });
    return { fileId: file.id, sequence: 1, versionId: null, newVersion: false };
  }
  const [d] = await tx.select().from(t.deliverables).where(and(eq(t.deliverables.workspaceId, a.workspaceId), eq(t.deliverables.brandId, a.brandId), eq(t.deliverables.id, intent.deliverableId!))).for('update');
  if (!d || d.status !== 'ACTIVE') throw new AppError('CONFLICT', 'A retired deliverable is read-only');
  if (intent.purpose === 'REFERENCE') {
    await tx.insert(t.brandFiles).values({ ...base, lineageId: file.id, sequence: 1, previousFileId: null, deliverableId: d.id, deliverableVersionId: null });
    return { fileId: file.id, sequence: 1, versionId: null, newVersion: false };
  }
  // FINAL_ART: the reviewed content carries it. Without an open draft (e.g. after an approval) a new draft is created.
  let draftId = d.draftVersionId, newVersion = false;
  if (!draftId) { draftId = (await newDeliverableDraft(tx, a, { deliverableId: d.id, expectedRevision: d.revision })).versionId; newVersion = true; }
  const [draft] = await tx.select().from(t.deliverableVersions).where(eq(t.deliverableVersions.id, draftId)).for('update');
  if (draft.status !== 'DRAFT') throw new AppError('CONFLICT', 'Only a draft can receive the final art');
  const previous = (draft.content as DeliverableContent).finalArt?.fileId ?? null;
  const [prevRow] = previous ? await tx.select({ lineageId: t.brandFiles.lineageId, sequence: t.brandFiles.sequence }).from(t.brandFiles).where(eq(t.brandFiles.id, previous)) : [];
  await tx.insert(t.brandFiles).values({ ...base, lineageId: prevRow?.lineageId ?? file.id, sequence: (prevRow?.sequence ?? 0) + 1, previousFileId: previous, deliverableId: d.id, deliverableVersionId: draft.id });
  const content: DeliverableContent = { ...(draft.content as DeliverableContent), finalArt: { fileId: file.id, name: base.originalName, format: file.info.format, bytes: file.bytes, sha256: file.sha256, source: 'UPLOAD', attachedAt: now.toISOString() } };
  await tx.update(t.deliverableVersions).set({ content, fingerprint: contentFingerprint(content) }).where(eq(t.deliverableVersions.id, draft.id));
  const [fresh] = await tx.select({ revision: t.deliverables.revision }).from(t.deliverables).where(eq(t.deliverables.id, d.id));
  await tx.update(t.deliverables).set({ revision: fresh.revision + 1, updatedAt: now }).where(eq(t.deliverables.id, d.id));
  return { fileId: file.id, sequence: (prevRow?.sequence ?? 0) + 1, versionId: draft.id, newVersion };
}

const view = (r: typeof t.brandFiles.$inferSelect) => ({ id: r.id, purpose: r.purpose, lineageId: r.lineageId, sequence: r.sequence, previousFileId: r.previousFileId, deliverableId: r.deliverableId, deliverableVersionId: r.deliverableVersionId, category: r.category, originalName: r.originalName, format: r.format, bytes: r.bytes, previewable: ['PNG', 'JPEG', 'WEBP'].includes(r.format), createdAt: r.createdAt.toISOString(), retiredAt: r.retiredAt?.toISOString() ?? null });

/** Team view: templates grouped by lineage (latest first, with their history) and files of some deliverables. */
export async function listBrandFiles(tx: Transaction, a: BrandActor, input: { purpose?: unknown; deliverableIds?: unknown }) {
  if (input.purpose === 'TEMPLATE') {
    const rows = await tx.select().from(t.brandFiles).where(and(byBrand(a), eq(t.brandFiles.purpose, 'TEMPLATE'))).orderBy(asc(t.brandFiles.sequence));
    const lineages = [...new Set(rows.map(r => r.lineageId))];
    return { files: [], templates: lineages.map(id => { const own = rows.filter(r => r.lineageId === id); const latest = own[own.length - 1]; return { ...view(latest), retired: own.some(r => r.retiredAt), versions: own.map(view).reverse() }; }).filter(x => !x.retired).sort((x, y) => y.createdAt.localeCompare(x.createdAt)) };
  }
  const ids = Array.isArray(input.deliverableIds) ? input.deliverableIds.filter((x): x is string => typeof x === 'string' && x.length > 0 && x.length <= 200).slice(0, 200) : [];
  if (!ids.length) return { templates: [], files: [] };
  const rows = await tx.select().from(t.brandFiles).where(and(byBrand(a), inArray(t.brandFiles.deliverableId, ids), isNull(t.brandFiles.retiredAt))).orderBy(asc(t.brandFiles.createdAt));
  return { templates: [], files: rows.map(view) };
}

/** A file of this brand for a team download (attachment), authorized now. */
export async function brandFileForTeam(tx: Transaction, a: BrandActor, fileId: unknown) {
  const [row] = await tx.select().from(t.brandFiles).where(and(byBrand(a), eq(t.brandFiles.id, idOf(fileId, 'File'))));
  if (!row) throw new AppError('NOT_FOUND', 'File not available');
  return row;
}

/** Retires a reference or a whole template (all its versions); final art stays with the versions that carry it. */
export async function retireBrandFile(tx: Transaction, a: BrandActor, input: { fileId?: unknown }) {
  const row = await brandFileForTeam(tx, a, input.fileId);
  if (row.purpose === 'FINAL_ART') throw new AppError('CONFLICT', 'Final art stays with its version; attach a new one in a new draft');
  const rows = row.purpose === 'TEMPLATE' ? await tx.select().from(t.brandFiles).where(and(byBrand(a), eq(t.brandFiles.lineageId, row.lineageId), isNull(t.brandFiles.retiredAt))) : row.retiredAt ? [] : [row];
  if (!rows.length) return { fileId: row.id, replayed: true };
  const now = new Date();
  for (const r of rows) await tx.update(t.brandFiles).set({ retiredAt: now }).where(eq(t.brandFiles.id, r.id));
  return { fileId: row.id, replayed: false };
}

/** A guest sees final art only while a deliverable version that carries it (content.finalArt) is actively shared. */
export async function finalArtForGuest(tx: Transaction, g: GuestActor, fileId: unknown) {
  const id = idOf(fileId, 'File');
  const [row] = await tx.select().from(t.brandFiles).where(and(byBrand(g), eq(t.brandFiles.id, id)));
  if (!row || row.purpose !== 'FINAL_ART') throw new AppError('NOT_FOUND', 'File not available');
  const shares = await tx.select({ targetId: t.portalShares.targetId }).from(t.portalShares).where(and(eq(t.portalShares.workspaceId, g.workspaceId), eq(t.portalShares.brandId, g.brandId), eq(t.portalShares.targetType, 'DELIVERABLE_VERSION'), isNull(t.portalShares.withdrawnAt)));
  const versions = shares.length ? await tx.select({ content: t.deliverableVersions.content }).from(t.deliverableVersions).where(and(eq(t.deliverableVersions.workspaceId, g.workspaceId), eq(t.deliverableVersions.brandId, g.brandId), inArray(t.deliverableVersions.id, shares.map(s => s.targetId)))) : [];
  if (!versions.some(v => (v.content as DeliverableContent).finalArt?.fileId === id)) throw new AppError('NOT_FOUND', 'File not available');
  return row;
}
