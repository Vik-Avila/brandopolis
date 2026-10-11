import { randomUUID } from 'node:crypto';
import { and, asc, eq, inArray } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { AppError } from '../domain/contracts.js';
import { approve, contentFingerprint, editorialTransition, type EditorialStatus } from '../domain/editorial-versions.js';
import { adoptValues, assertNoSilentConfirmation, channelGaps, emptyKit, kitDiff, normalizeKit, pairContrast, type KitContent } from '../domain/brand-kit.js';
import { resolutionWarning, type KitAssetInfo } from '../domain/kit-assets.js';
import type { Transaction } from '../persistence/database.js';
import * as t from '../persistence/schema.js';
import type { BrandActor } from './brand-access.js';

/**
 * ADR-0034 · brand kit. Same guarantees as the other editorial objects (brand scope from Engine.withBrandActor,
 * mandatory revision, idempotent decisions with append-only approvals, versions frozen out of DRAFT by the database)
 * plus: a value becomes CONFIRMED only by explicit adoption, and publishing is a separate capability (ADR-0033).
 */
type Entry = 'INGEST' | 'COMPLETE' | 'CREATE';
const byBrand = (table: { workspaceId: AnyPgColumn; brandId: AnyPgColumn }, a: BrandActor) => and(eq(table.workspaceId, a.workspaceId), eq(table.brandId, a.brandId));
const key = (v: unknown) => { if (typeof v !== 'string' || !v.trim() || v.length > 200) throw new AppError('INVALID', 'Invalid idempotency key'); return v; };
const revisionOf = (v: unknown) => { if (!Number.isInteger(v) || (v as number) < 0) throw new AppError('INVALID', 'Expected revision required'); return v as number; };

async function lockKit(tx: Transaction, a: BrandActor, expected?: unknown) {
  const [kit] = await tx.select().from(t.brandKits).where(byBrand(t.brandKits, a)).for('update');
  if (!kit) throw new AppError('NOT_FOUND', 'This brand has no kit yet');
  if (expected !== undefined && kit.revision !== revisionOf(expected)) throw new AppError('CONFLICT', 'The kit changed since you opened it; reload before saving');
  return kit;
}
const touch = (tx: Transaction, id: string, values: Partial<typeof t.brandKits.$inferInsert>) => tx.update(t.brandKits).set({ ...values, updatedAt: new Date() }).where(eq(t.brandKits.id, id));

/** Logos must cite uploaded raster or vector files of this brand with their exact fingerprint (ADR-0034). */
async function checkAssets(tx: Transaction, a: BrandActor, c: KitContent) {
  const ids = [...new Set([...c.logos.map(l => l.assetId), ...[...c.palette, ...c.typography, ...c.logos].map(v => v.origin.assetId).filter((x): x is string => Boolean(x))])];
  if (!ids.length) return;
  const rows = await tx.select().from(t.kitAssets).where(and(byBrand(t.kitAssets, a), inArray(t.kitAssets.id, ids)));
  if (rows.length !== ids.length) throw new AppError('INVALID', 'Unknown file for this brand');
  for (const l of c.logos) {
    const row = rows.find(r => r.id === l.assetId)!;
    if (row.sha256 !== l.fingerprint) throw new AppError('INVALID', 'A logo must cite the exact file it uses');
    if (!['PNG', 'JPEG', 'WEBP', 'SVG'].includes(row.format)) throw new AppError('INVALID', 'A logo must be an image file');
  }
}

/** Kit of the brand: pointers, versions, files, what channels still need, contrast per pair, differences and impact. */
export async function readKit(tx: Transaction, a: BrandActor) {
  const assets = (await tx.select().from(t.kitAssets).where(byBrand(t.kitAssets, a)).orderBy(asc(t.kitAssets.createdAt))).map(r => ({ id: r.id, role: r.role, originalName: r.originalName, format: r.format, bytes: r.bytes, sha256: r.sha256, width: r.width, height: r.height, alpha: r.alpha, rights: r.rights, previewable: ['PNG', 'JPEG', 'WEBP'].includes(r.format), createdAt: r.createdAt.toISOString() }));
  const [kit] = await tx.select().from(t.brandKits).where(byBrand(t.brandKits, a));
  if (!kit) return { kit: null, assets };
  const versions = await tx.select().from(t.brandKitVersions).where(and(byBrand(t.brandKitVersions, a), eq(t.brandKitVersions.kitId, kit.id))).orderBy(asc(t.brandKitVersions.sequence));
  const view = (v: typeof versions[number]) => {
    const content = v.content as KitContent;
    const assetOf = (id: string) => assets.find(x => x.id === id);
    return {
      id: v.id, sequence: v.sequence, entry: v.entry, status: v.status, fingerprint: v.fingerprint, content, adoptions: v.adoptions, decidedAt: v.decidedAt?.toISOString() ?? null,
      gaps: channelGaps(content), contrast: pairContrast(content),
      warnings: content.logos.flatMap(l => { const f = assetOf(l.assetId); const w = f && f.width ? resolutionWarning({ kind: 'RASTER', width: f.width } as KitAssetInfo, l.minWidthPx) : null; return w ? [{ logoId: l.id, warning: w }] : []; })
    };
  };
  const approved = versions.find(v => v.id === kit.approvedVersionId), draft = versions.find(v => v.id === kit.draftVersionId), published = versions.find(v => v.id === kit.publishedVersionId);
  // ADR-0034 · impact of the approved version: materials that still use an earlier kit version. Read-only; nothing changes.
  const deliverableVersions = approved ? await tx.select({ id: t.deliverableVersions.id, deliverableId: t.deliverableVersions.deliverableId, manifest: t.deliverableVersions.manifest, content: t.deliverableVersions.content, status: t.deliverableVersions.status }).from(t.deliverableVersions).where(and(byBrand(t.deliverableVersions, a), eq(t.deliverableVersions.status, 'APPROVED'))) : [];
  const impact = deliverableVersions.filter(v => { const k = (v.manifest as { kitVersionId?: string | null }).kitVersionId; return Boolean(k) && k !== approved!.id; }).map(v => ({ deliverableId: v.deliverableId, versionId: v.id, name: String((v.content as { name?: string }).name ?? ''), kitVersionId: (v.manifest as { kitVersionId: string }).kitVersionId }));
  return {
    assets,
    kit: {
      id: kit.id, revision: kit.revision,
      approved: approved ? view(approved) : null,
      published: published ? { id: published.id, sequence: published.sequence } : null,
      draft: draft ? { ...view(draft), diff: approved ? kitDiff(approved.content as KitContent, draft.content as KitContent) : null } : null,
      inReview: versions.filter(v => v.status === 'IN_REVIEW').map(view),
      history: versions.map(v => ({ id: v.id, sequence: v.sequence, entry: v.entry, status: v.status })),
      impact
    }
  };
}

/**
 * Starts a draft through one of the three entries: INGEST (from files the brand already has), COMPLETE (from the
 * approved version, keeping it) or CREATE (from strategy, empty until directions are proposed). One kit per brand.
 */
export async function startKitDraft(tx: Transaction, a: BrandActor, input: { entry?: unknown; expectedRevision?: unknown }) {
  if (!['INGEST', 'COMPLETE', 'CREATE'].includes(input.entry as string)) throw new AppError('INVALID', 'Unknown entry');
  const entry = input.entry as Entry, now = new Date();
  let [kit] = await tx.select().from(t.brandKits).where(byBrand(t.brandKits, a)).for('update');
  if (!kit) {
    if (entry === 'COMPLETE') throw new AppError('CONFLICT', 'There is no approved kit to complete yet');
    [kit] = await tx.insert(t.brandKits).values({ id: randomUUID(), workspaceId: a.workspaceId, brandId: a.brandId, draftVersionId: null, approvedVersionId: null, publishedVersionId: null, revision: 0, createdBy: a.userId, createdAt: now, updatedAt: now }).returning();
  } else if (kit.revision !== revisionOf(input.expectedRevision)) throw new AppError('CONFLICT', 'The kit changed since you opened it; reload before saving');
  if (kit.draftVersionId) throw new AppError('CONFLICT', 'A draft already exists');
  const versions = await tx.select().from(t.brandKitVersions).where(eq(t.brandKitVersions.kitId, kit.id)).orderBy(asc(t.brandKitVersions.sequence));
  const base = entry === 'COMPLETE' ? versions.find(v => v.id === kit.approvedVersionId) : undefined;
  if (entry === 'COMPLETE' && !base) throw new AppError('CONFLICT', 'There is no approved kit to complete yet');
  const content = base ? base.content as KitContent : emptyKit(), id = randomUUID();
  await tx.insert(t.brandKitVersions).values({ id, workspaceId: a.workspaceId, brandId: a.brandId, kitId: kit.id, sequence: (versions[versions.length - 1]?.sequence ?? 0) + 1, previousVersionId: base?.id ?? null, entry, status: 'DRAFT', content, fingerprint: contentFingerprint(content), adoptions: base ? base.adoptions : [], createdBy: a.userId, createdAt: now });
  await touch(tx, kit.id, { draftVersionId: id, revision: kit.revision + 1 });
  return { kitId: kit.id, versionId: id, revision: kit.revision + 1 };
}

async function lockDraft(tx: Transaction, a: BrandActor, expected: unknown) {
  const kit = await lockKit(tx, a, expected);
  if (!kit.draftVersionId) throw new AppError('CONFLICT', 'There is no draft; start one first');
  const [draft] = await tx.select().from(t.brandKitVersions).where(eq(t.brandKitVersions.id, kit.draftVersionId)).for('update');
  if (draft.status !== 'DRAFT') throw new AppError('CONFLICT', 'Only a draft can be edited');
  return { kit, draft };
}

/** Saves the draft. IDN-003: no value can arrive CONFIRMED unless it already was, unchanged. */
export async function saveKitDraft(tx: Transaction, a: BrandActor, input: { expectedRevision?: unknown; content?: unknown }) {
  const { kit, draft } = await lockDraft(tx, a, input.expectedRevision);
  const content = normalizeKit(input.content);
  assertNoSilentConfirmation(draft.content as KitContent, content);
  await checkAssets(tx, a, content);
  await tx.update(t.brandKitVersions).set({ content, fingerprint: contentFingerprint(content) }).where(eq(t.brandKitVersions.id, draft.id));
  await touch(tx, kit.id, { revision: kit.revision + 1 });
  return { kitId: kit.id, versionId: draft.id, revision: kit.revision + 1 };
}

/** A person adopts values: they become CONFIRMED, with who and when recorded beside the version. */
export async function adoptKitValues(tx: Transaction, a: BrandActor, input: { expectedRevision?: unknown; valueIds?: unknown }) {
  const { kit, draft } = await lockDraft(tx, a, input.expectedRevision);
  if (!Array.isArray(input.valueIds) || input.valueIds.length > 40 || input.valueIds.some(v => typeof v !== 'string')) throw new AppError('INVALID', 'Values required');
  const content = adoptValues(draft.content as KitContent, input.valueIds as string[]);
  const at = new Date().toISOString();
  const adoptions = [...(draft.adoptions as Record<string, unknown>[]), ...(input.valueIds as string[]).map(valueId => ({ valueId, by: a.userId, at }))];
  await tx.update(t.brandKitVersions).set({ content, fingerprint: contentFingerprint(content), adoptions }).where(eq(t.brandKitVersions.id, draft.id));
  await touch(tx, kit.id, { revision: kit.revision + 1 });
  return { kitId: kit.id, versionId: draft.id, revision: kit.revision + 1, adopted: input.valueIds };
}

export async function submitKit(tx: Transaction, a: BrandActor, input: { expectedRevision?: unknown }) {
  const { kit, draft } = await lockDraft(tx, a, input.expectedRevision);
  editorialTransition(draft.status as EditorialStatus, 'IN_REVIEW');
  await tx.update(t.brandKitVersions).set({ status: 'IN_REVIEW', submittedAt: new Date() }).where(eq(t.brandKitVersions.id, draft.id));
  await touch(tx, kit.id, { draftVersionId: null, revision: kit.revision + 1 });
  return { kitId: kit.id, versionId: draft.id, revision: kit.revision + 1, fingerprint: draft.fingerprint };
}

/** Approve or request changes on the exact version + fingerprint (APR-001/002), criterion and idempotency key. */
export async function decideKit(tx: Transaction, a: BrandActor, input: { versionId?: unknown; fingerprint?: unknown; decision?: unknown; criterion?: unknown; idempotencyKey?: unknown }) {
  const idempotencyKey = key(input.idempotencyKey);
  const kit = await lockKit(tx, a);
  if (input.decision !== 'APPROVE' && input.decision !== 'REQUEST_CHANGES') throw new AppError('INVALID', 'Decision must be APPROVE or REQUEST_CHANGES');
  const criterion = typeof input.criterion === 'string' ? input.criterion.trim() : '';
  if (criterion.length < 10 || criterion.length > 2000) throw new AppError('INVALID', 'Criterion required');
  const [prior] = await tx.select().from(t.brandKitApprovals).where(and(byBrand(t.brandKitApprovals, a), eq(t.brandKitApprovals.actorId, a.userId), eq(t.brandKitApprovals.idempotencyKey, idempotencyKey)));
  if (prior) {
    if (prior.versionId !== input.versionId || prior.fingerprint !== input.fingerprint || prior.decision !== input.decision || prior.criterion !== criterion) throw new AppError('CONFLICT', 'Idempotency key already used for another decision');
    return { kitId: kit.id, versionId: prior.versionId, status: prior.decision === 'APPROVE' ? 'APPROVED' : 'CHANGES_REQUESTED', superseded: prior.supersededVersionId, criterion, replayed: true };
  }
  const versions = await tx.select().from(t.brandKitVersions).where(eq(t.brandKitVersions.kitId, kit.id)).for('update');
  const target = versions.find(v => v.id === input.versionId);
  if (!target) throw new AppError('NOT_FOUND', 'Version not available');
  if (target.fingerprint !== input.fingerprint) throw new AppError('CONFLICT', 'Content changed since it was shared for review');
  const now = new Date();
  const record = (decision: 'APPROVE' | 'REQUEST_CHANGES', superseded: string | null) => tx.insert(t.brandKitApprovals).values({ id: randomUUID(), workspaceId: a.workspaceId, brandId: a.brandId, kitId: kit.id, versionId: target.id, fingerprint: target.fingerprint, decision, criterion, supersededVersionId: superseded, actorId: a.userId, idempotencyKey, createdAt: now });
  if (input.decision === 'REQUEST_CHANGES') {
    editorialTransition(target.status as EditorialStatus, 'CHANGES_REQUESTED');
    await tx.update(t.brandKitVersions).set({ status: 'CHANGES_REQUESTED', decidedBy: a.userId, decidedAt: now, decisionCriterion: criterion }).where(eq(t.brandKitVersions.id, target.id));
    await record('REQUEST_CHANGES', null);
    await touch(tx, kit.id, { revision: kit.revision + 1 });
    return { kitId: kit.id, versionId: target.id, status: 'CHANGES_REQUESTED', superseded: null, criterion };
  }
  const current = versions.find(v => v.id === kit.approvedVersionId);
  if (current && current.sequence > target.sequence) throw new AppError('CONFLICT', 'A later version is already approved');
  const result = approve({ draftVersionId: kit.draftVersionId, approvedVersionId: kit.approvedVersionId, publishedVersionId: kit.publishedVersionId }, versions.map(v => ({ id: v.id, sequence: v.sequence, status: v.status as EditorialStatus, fingerprint: v.fingerprint })), target.id, String(input.fingerprint));
  await tx.update(t.brandKitVersions).set({ status: 'APPROVED', decidedBy: a.userId, decidedAt: now, decisionCriterion: criterion }).where(eq(t.brandKitVersions.id, target.id));
  if (result.superseded) await tx.update(t.brandKitVersions).set({ status: 'SUPERSEDED' }).where(eq(t.brandKitVersions.id, result.superseded));
  await record('APPROVE', result.superseded);
  // Approving never publishes: the published pointer stays where it was (ADR-0034).
  await touch(tx, kit.id, { approvedVersionId: result.pointers.approvedVersionId, draftVersionId: result.pointers.draftVersionId, revision: kit.revision + 1 });
  return { kitId: kit.id, versionId: target.id, status: 'APPROVED', superseded: result.superseded, criterion };
}

/** Publishing (guide, portal, PDF) is a separate action that needs PUBLISH_BRAND_KIT; only an approved version. */
export async function publishKit(tx: Transaction, a: BrandActor, input: { versionId?: unknown; fingerprint?: unknown; idempotencyKey?: unknown }) {
  const idempotencyKey = key(input.idempotencyKey);
  if (!a.capabilities.includes('PUBLISH_BRAND_KIT')) throw new AppError('FORBIDDEN', 'Publishing the brand kit needs its own permission');
  const kit = await lockKit(tx, a);
  const [prior] = await tx.select().from(t.brandKitPublications).where(and(byBrand(t.brandKitPublications, a), eq(t.brandKitPublications.actorId, a.userId), eq(t.brandKitPublications.idempotencyKey, idempotencyKey)));
  if (prior) { if (prior.versionId !== input.versionId) throw new AppError('CONFLICT', 'Idempotency key already used'); return { kitId: kit.id, versionId: prior.versionId, replayed: true }; }
  const [target] = await tx.select().from(t.brandKitVersions).where(and(eq(t.brandKitVersions.kitId, kit.id), eq(t.brandKitVersions.id, String(input.versionId ?? ''))));
  if (!target) throw new AppError('NOT_FOUND', 'Version not available');
  if (target.status !== 'APPROVED') throw new AppError('CONFLICT', 'Only the approved version can be published');
  if (target.fingerprint !== input.fingerprint) throw new AppError('CONFLICT', 'Content changed since you opened it');
  await tx.insert(t.brandKitPublications).values({ id: randomUUID(), workspaceId: a.workspaceId, brandId: a.brandId, kitId: kit.id, versionId: target.id, fingerprint: target.fingerprint, actorId: a.userId, idempotencyKey, createdAt: new Date() });
  await touch(tx, kit.id, { publishedVersionId: target.id, revision: kit.revision + 1 });
  return { kitId: kit.id, versionId: target.id, previousVersionId: kit.publishedVersionId };
}

/** Registers an uploaded file already validated by signature and stored privately. Same file twice → same record. */
export async function registerKitAsset(tx: Transaction, a: BrandActor, input: { id: string; role: string; originalName: string; info: KitAssetInfo; bytes: number; sha256: string; storageKey: string }) {
  if (!['LOGO', 'MANUAL', 'FONT', 'REFERENCE', 'DESIGNER_DELIVERY'].includes(input.role)) throw new AppError('INVALID', 'Unknown file role');
  if (input.role === 'LOGO' && !['RASTER', 'VECTOR'].includes(input.info.kind)) throw new AppError('INVALID', 'A logo must be an image file');
  if (input.role === 'FONT' && input.info.kind !== 'FONT') throw new AppError('INVALID', 'This file is not a font');
  if (input.role === 'MANUAL' && input.info.kind !== 'DOCUMENT') throw new AppError('INVALID', 'A brand manual must be a PDF');
  const [existing] = await tx.select().from(t.kitAssets).where(and(byBrand(t.kitAssets, a), eq(t.kitAssets.sha256, input.sha256)));
  if (existing) return { assetId: existing.id, reused: true };
  await tx.insert(t.kitAssets).values({ id: input.id, workspaceId: a.workspaceId, brandId: a.brandId, role: input.role, originalName: input.originalName, format: input.info.format, mediaType: input.info.mediaType, bytes: input.bytes, sha256: input.sha256, width: input.info.width, height: input.info.height, alpha: input.info.alpha, storageKey: input.storageKey, rights: 'UNKNOWN', createdBy: a.userId, createdAt: new Date() });
  return { assetId: input.id, reused: false };
}

export async function kitAsset(tx: Transaction, a: BrandActor, assetId: unknown) {
  if (typeof assetId !== 'string' || !assetId || assetId.length > 200) throw new AppError('INVALID', 'File required');
  const [row] = await tx.select().from(t.kitAssets).where(and(byBrand(t.kitAssets, a), eq(t.kitAssets.id, assetId)));
  if (!row) throw new AppError('NOT_FOUND', 'File not available');
  return row;
}

/** Merges candidates extracted from a brand manual into the draft as DECLARED values (never adopted here). */
export async function mergeKitCandidates(tx: Transaction, a: BrandActor, input: { expectedRevision?: unknown }, candidates: Pick<KitContent, 'palette' | 'typography'>) {
  const { kit, draft } = await lockDraft(tx, a, input.expectedRevision);
  const current = draft.content as KitContent;
  const hexes = new Set(current.palette.map(c => c.hex)), families = new Set(current.typography.map(f => f.family.toLowerCase()));
  const used = new Set([...current.logos, ...current.palette, ...current.typography].map(v => v.id));
  const fresh = (prefix: string) => { let i = 1; while (used.has(`${prefix}-${i}`)) i++; used.add(`${prefix}-${i}`); return `${prefix}-${i}`; };
  const palette = candidates.palette.filter(c => !hexes.has(c.hex)).map(c => ({ ...c, id: fresh('c') }));
  const typography = candidates.typography.filter(f => !families.has(f.family.toLowerCase())).map(f => ({ ...f, id: fresh('f') }));
  const content = normalizeKit({ ...current, palette: [...current.palette, ...palette].slice(0, 16), typography: [...current.typography, ...typography].slice(0, 8) });
  await tx.update(t.brandKitVersions).set({ content, fingerprint: contentFingerprint(content) }).where(eq(t.brandKitVersions.id, draft.id));
  await touch(tx, kit.id, { revision: kit.revision + 1 });
  return { kitId: kit.id, versionId: draft.id, revision: kit.revision + 1, added: { palette: palette.length, typography: typography.length } };
}

/** The approved kit version a new material version records in its origin manifest (null while there is none). */
export async function approvedKitVersion(tx: Transaction, a: BrandActor) {
  const [kit] = await tx.select({ approvedVersionId: t.brandKits.approvedVersionId }).from(t.brandKits).where(byBrand(t.brandKits, a));
  return kit?.approvedVersionId ?? null;
}
