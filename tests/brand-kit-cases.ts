import { describe, it, expect } from 'vitest';
import { randomUUID, createHash } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import type { connect } from '../src/persistence/database.js';
import { Engine } from '../src/application/engine.js';
import { seedIdentity } from '../scripts/seed.js';
import * as t from '../src/persistence/schema.js';
import { emptyKit } from '../src/domain/brand-kit.js';
import type { KitAssetInfo } from '../src/domain/kit-assets.js';

const databaseError = async (query: Promise<unknown>) => { try { await query; return 'no error'; } catch (e) { return String((e as { cause?: { message?: string } }).cause?.message ?? (e as Error).message); } };

/** ADR-0034 · brand kit: one identity model, explicit adoption, versioned approval, separate publication (IDN-001…006). */
export function brandKitCases(connection: () => ReturnType<typeof connect>) {
  const setup = async () => {
    const db = connection().db, engine = new Engine(db), who = await seedIdentity(db);
    const brand = await engine.createBrand(who.token, 'Marca con identidad');
    const cmd = (action: Parameters<Engine['kitCommand']>[1], input: Record<string, unknown>, token = who.token) => engine.kitCommand(token, action, { brandId: brand.id, ...(action === 'decide' || action === 'publish' ? { idempotencyKey: randomUUID() } : {}), ...input });
    const read = (token = who.token) => engine.brandKit(token, brand.id);
    const upload = async (role: string, info: Partial<KitAssetInfo> = {}, brandId = brand.id) => {
      const sha256 = createHash('sha256').update(randomUUID()).digest('hex');
      const r = await engine.registerKitAsset(who.token, brandId, { id: randomUUID(), role, originalName: `${role}.png`, info: { format: 'PNG', kind: 'RASTER', mediaType: 'image/png', width: 1200, height: 600, alpha: true, previewable: true, ...info } as KitAssetInfo, bytes: 1000, sha256, storageKey: `x/${randomUUID()}` });
      return { assetId: r.assetId, sha256 };
    };
    const color = (id: string, hex: string, certainty = 'DECLARED') => ({ id, name: id, hex, role: 'PRIMARY', reference: '', certainty, origin: { kind: 'DOCUMENT', assetId: null, page: 3, note: '' } });
    const approveDraft = async () => { const k = (await read()).kit!; const v = await cmd('submit', { expectedRevision: k.revision }); await cmd('decide', { versionId: v.versionId, fingerprint: v.fingerprint, decision: 'APPROVE', criterion: 'Kit revisado por el equipo' }); return v; };
    return { db, engine, who, brand, cmd, read, upload, color, approveDraft };
  };

  describe('ADR-0034 · brand kit', () => {
    it('IDN-001/003: ingest → declared candidates → explicit adoption; nothing becomes CONFIRMED by saving', async () => {
      const x = await setup();
      expect((await x.read()).kit).toBeNull();
      await expect(x.cmd('start', { entry: 'COMPLETE', expectedRevision: 0 })).rejects.toMatchObject({ code: 'CONFLICT' });
      await x.cmd('start', { entry: 'INGEST', expectedRevision: 0 });
      let k = (await x.read()).kit!;
      expect(k.draft).toMatchObject({ sequence: 1, entry: 'INGEST', status: 'DRAFT' });
      await x.cmd('draft', { expectedRevision: k.revision, content: { ...emptyKit(), palette: [x.color('rojo', '#C8102E'), x.color('gris', '#777777', 'ESTIMATED')] } });
      k = (await x.read()).kit!;
      // Saving a value as CONFIRMED without adoption is refused.
      await expect(x.cmd('draft', { expectedRevision: k.revision, content: { ...emptyKit(), palette: [x.color('rojo', '#C8102E', 'CONFIRMED')] } })).rejects.toMatchObject({ code: 'INVALID' });
      await x.cmd('adopt', { expectedRevision: k.revision, valueIds: ['rojo'] });
      k = (await x.read()).kit!;
      expect(k.draft!.content.palette.map(c => [c.id, c.certainty])).toEqual([['rojo', 'CONFIRMED'], ['gris', 'ESTIMATED']]);
      expect(k.draft!.adoptions).toEqual([expect.objectContaining({ valueId: 'rojo', by: x.who.userId })]);
      await expect(x.cmd('adopt', { expectedRevision: k.revision - 1, valueIds: ['gris'] })).rejects.toMatchObject({ code: 'CONFLICT' });
    });

    it('logos cite the exact uploaded file of this brand; a font or a file of another brand is refused', async () => {
      const x = await setup();
      const logo = await x.upload('LOGO');
      await expect(x.upload('FONT')).rejects.toMatchObject({ code: 'INVALID' }); // a PNG is not a font
      const other = await x.engine.createBrand(x.who.token, 'Otra marca');
      const foreign = await x.upload('LOGO', {}, other.id);
      await x.cmd('start', { entry: 'INGEST', expectedRevision: 0 });
      const k = (await x.read()).kit!;
      const withLogo = (assetId: string, fingerprint: string) => ({ ...emptyKit(), logos: [{ id: 'logo', variant: 'PRIMARY', assetId, fingerprint, minWidthPx: 800, usage: '', certainty: 'DECLARED', origin: { kind: 'PERSON', assetId: null, page: null, note: '' } }] });
      await expect(x.cmd('draft', { expectedRevision: k.revision, content: withLogo(logo.assetId, 'f'.repeat(64)) })).rejects.toMatchObject({ code: 'INVALID' });
      await expect(x.cmd('draft', { expectedRevision: k.revision, content: withLogo(foreign.assetId, foreign.sha256) })).rejects.toMatchObject({ code: 'INVALID' });
      await x.cmd('draft', { expectedRevision: k.revision, content: withLogo(logo.assetId, logo.sha256) });
      const view = await x.read();
      // 1200 px wide for a minimum width of use of 800 px: below twice the minimum, flagged (ADR-0034 resolution).
      expect(view.kit!.draft!.warnings).toEqual([{ logoId: 'logo', warning: 'LOW_RESOLUTION' }]);
    });

    it('IDN-005: approving another version supersedes the previous one; publication stays where it was; materials are flagged, never changed', async () => {
      const x = await setup();
      await x.cmd('start', { entry: 'INGEST', expectedRevision: 0 });
      let k = (await x.read()).kit!;
      await x.cmd('draft', { expectedRevision: k.revision, content: { ...emptyKit(), palette: [x.color('rojo', '#C8102E')] } });
      const v1 = await x.approveDraft();
      // Publishing needs its own capability: an assigned MEMBER without it is refused; the ADMIN holds it.
      const member = await seedIdentity(x.db, 'MEMBER', x.who.workspaceId);
      await x.db.insert(t.assignments).values({ workspaceId: x.who.workspaceId, brandId: x.brand.id, userId: member.userId });
      await expect(x.cmd('publish', { versionId: v1.versionId, fingerprint: v1.fingerprint }, member.token)).rejects.toMatchObject({ code: 'FORBIDDEN' });
      await x.cmd('publish', { versionId: v1.versionId, fingerprint: v1.fingerprint });
      // A material made now records kit version 1 in its origin manifest.
      const post = await x.engine.deliverableCommand(x.who.token, 'create', { brandId: x.brand.id, content: { type: 'AD', name: 'Anuncio', offerId: null, sourceDecisionVersionIds: [], body: { channel: 'META', objective: 'LEADS', headlines: ['h'], descriptions: [], callToAction: '', landingUrl: null } }, idempotencyKey: randomUUID() });
      const ps = await x.engine.deliverableCommand(x.who.token, 'submit', { brandId: x.brand.id, deliverableId: post.deliverableId, expectedRevision: 0 });
      await x.engine.deliverableCommand(x.who.token, 'decide', { brandId: x.brand.id, deliverableId: post.deliverableId, versionId: ps.versionId, fingerprint: ps.fingerprint, decision: 'APPROVE', criterion: 'Anuncio aprobado', idempotencyKey: randomUUID() });
      expect((await x.engine.deliverables(x.who.token, x.brand.id, null))[0].approved).toMatchObject({ manifest: { kitVersionId: v1.versionId }, originOutdated: [] });
      // «Completar»: new version from the approved one; v1 stays approved and published meanwhile.
      k = (await x.read()).kit!;
      await x.cmd('start', { entry: 'COMPLETE', expectedRevision: k.revision });
      k = (await x.read()).kit!;
      expect(k.approved!.sequence).toBe(1);
      await x.cmd('draft', { expectedRevision: k.revision, content: { ...k.draft!.content, palette: [...k.draft!.content.palette, x.color('oro', '#C9A227', 'PROPOSED')] } });
      k = (await x.read()).kit!;
      expect(k.draft!.diff).toEqual({ added: ['oro'], removed: [], changed: [] });
      const v2 = await x.approveDraft();
      k = (await x.read()).kit!;
      expect(k.history.map(h => h.status)).toEqual(['SUPERSEDED', 'APPROVED']);
      expect(k.published).toMatchObject({ id: v1.versionId }); // approving never publishes
      expect(k.impact).toEqual([expect.objectContaining({ deliverableId: post.deliverableId, kitVersionId: v1.versionId })]);
      expect((await x.engine.deliverables(x.who.token, x.brand.id, null))[0].approved).toMatchObject({ manifest: { kitVersionId: v1.versionId }, originOutdated: ['KIT'] });
      await expect(x.cmd('publish', { versionId: v1.versionId, fingerprint: v1.fingerprint })).rejects.toMatchObject({ code: 'CONFLICT' }); // superseded
      await x.cmd('publish', { versionId: v2.versionId, fingerprint: v2.fingerprint });
      expect((await x.read()).kit!.published).toMatchObject({ id: v2.versionId });
      // Database: versions frozen out of DRAFT; approvals, publications and files append-only.
      expect(await databaseError(x.db.execute(sql`update brand_kit_versions set content='{}'::jsonb where id=${v2.versionId}`))).toMatch(/immutable/);
      expect(await databaseError(x.db.execute(sql`update brand_kit_versions set status='DRAFT' where id=${v2.versionId}`))).toMatch(/not allowed/);
      expect(await databaseError(x.db.execute(sql`delete from brand_kit_publications where "versionId"=${v2.versionId}`))).toMatch(/append-only/);
      const audits = (await x.db.select().from(t.audits).where(eq(t.audits.brandId, x.brand.id))).filter(a => a.operation.startsWith('KIT_'));
      expect(audits.map(a => a.operation)).toEqual(expect.arrayContaining(['KIT_START', 'KIT_DRAFT', 'KIT_SUBMIT', 'KIT_APPROVE', 'KIT_PUBLISH']));
    });

    it('IDN-006: another workspace or an unassigned member never sees the kit or its files', async () => {
      const x = await setup();
      const logo = await x.upload('LOGO');
      const stranger = await seedIdentity(x.db), member = await seedIdentity(x.db, 'MEMBER', x.who.workspaceId);
      await expect(x.read(stranger.token)).rejects.toMatchObject({ code: 'NOT_FOUND' });
      await expect(x.read(member.token)).rejects.toMatchObject({ code: 'FORBIDDEN' });
      await expect(x.engine.kitAssetFile(member.token, x.brand.id, logo.assetId)).rejects.toMatchObject({ code: 'FORBIDDEN' });
      const other = await x.engine.createBrand(x.who.token, 'Otra marca');
      await expect(x.engine.kitAssetFile(x.who.token, other.id, logo.assetId)).rejects.toMatchObject({ code: 'NOT_FOUND' });
      // The same file uploaded twice is one record.
      const again = await x.engine.registerKitAsset(x.who.token, x.brand.id, { id: randomUUID(), role: 'LOGO', originalName: 'otra.png', info: { format: 'PNG', kind: 'RASTER', mediaType: 'image/png', width: 10, height: 10, alpha: false, previewable: true }, bytes: 10, sha256: logo.sha256, storageKey: 'y' });
      expect(again).toEqual({ assetId: logo.assetId, reused: true });
    });
  });
}
