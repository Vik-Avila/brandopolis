import { describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import type { AddressInfo } from 'node:net';
import type { connect } from '../src/persistence/database.js';
import { Engine } from '../src/application/engine.js';
import { createApp } from '../src/transport/http.js';
import { seedIdentity } from '../scripts/seed.js';
import * as t from '../src/persistence/schema.js';

const databaseError = async (query: Promise<unknown>) => { try { await query; return 'no error'; } catch (e) { return String((e as { cause?: { message?: string } }).cause?.message ?? (e as Error).message); } };
const confirmed = (value: string) => ({ value, state: 'CONFIRMED' });
const unknown = { value: null, state: 'UNKNOWN' };

/** PHASE4_SPEC §4.10 · guided start draft (ONB-005…ONB-012 at engine and database level). */
export function brandSetupCases(connection: () => ReturnType<typeof connect>) {
  const ctx = async () => { const db = connection().db; return { db, engine: new Engine(db), who: await seedIdentity(db) }; };
  /** A document of the brand with one claim (direct rows: the extractor itself is covered elsewhere). */
  const claimOf = async (db: ReturnType<typeof connect>['db'], workspaceId: string, brandId: string, name: string, claimType: string, statement: string) => {
    const documentId = randomUUID(), extractionId = randomUUID(), claimId = randomUUID(), now = new Date();
    await db.insert(t.sourceDocuments).values({ id: documentId, workspaceId, brandId, originalName: name, mediaType: 'application/pdf', bytes: 10, sha256: randomUUID(), storageKey: `k/${documentId}`, uploadedBy: (await db.select().from(t.assignments).where(eq(t.assignments.brandId, brandId)))[0].userId, uploadedAt: now });
    await db.insert(t.documentExtractions).values({ id: extractionId, workspaceId, brandId, documentId, status: 'COMPLETED', createdAt: now });
    await db.insert(t.documentClaims).values({ id: claimId, workspaceId, brandId, documentId, extractionId, claimType, statement, createdAt: now });
    return { documentId, claimId };
  };

  describe('PHASE4_SPEC §4.10 · guided start draft', () => {
    it('ONB-008: start is idempotent and resumable; creating the brand twice returns the same brand; the priority is recorded once', async () => {
      const { db, engine, who } = await ctx();
      const key = randomUUID();
      const draft = await engine.startSetupDraft(who.token, { startKey: key, fields: { name: confirmed('Café Norte') } });
      expect(draft).toMatchObject({ status: 'IN_PROGRESS', step: 1, brandId: null, version: 1, replayed: false });
      expect((await engine.startSetupDraft(who.token, { startKey: key })).id).toBe(draft.id);
      expect((await engine.startSetupDraft(who.token, { startKey: randomUUID() })).id).toBe(draft.id); // one open unlinked draft
      expect((await engine.setupDraft(who.token)).draft?.id).toBe(draft.id); // «salir y retomar»
      const first = await engine.createBrandFromDraft(who.token, { draftId: draft.id, expectedVersion: 1, intent: 'SELL_OFFER' });
      const again = await engine.createBrandFromDraft(who.token, { draftId: draft.id, expectedVersion: 1, intent: 'SELL_OFFER' });
      expect(again).toMatchObject({ replayed: true, brand: { id: first.brand.id } });
      expect((await db.select().from(t.brands).where(and(eq(t.brands.workspaceId, who.workspaceId), eq(t.brands.name, 'Café Norte')))).length).toBe(1);
      expect((await engine.workPriority(who.token, first.brand.id)).history.map(h => h.intent)).toEqual(['SELL_OFFER']);
      expect(first.draft).toMatchObject({ brandId: first.brand.id, step: 2, intent: 'SELL_OFFER', missing: ['offer', 'audience', 'geography'], identityPostponable: true });
      // After linking, a new unlinked draft can be started for another brand.
      expect((await engine.startSetupDraft(who.token, { startKey: randomUUID() })).id).not.toBe(draft.id);
    });

    it('ONB-005/010/012: asks only what is missing for the priority; «No lo sé todavía» is pending; confirming records declared context and nothing else', async () => {
      const { db, engine, who } = await ctx();
      const d = await engine.startSetupDraft(who.token, { startKey: randomUUID(), fields: { name: confirmed('Taller Sur'), ownership: confirmed('CLIENT') } });
      const { brand, draft } = await engine.createBrandFromDraft(who.token, { draftId: d.id, expectedVersion: 1, intent: 'STRATEGY_POINT' });
      expect(draft.missing).toEqual(['offer', 'goal']);
      const v1 = await engine.saveSetupDraft(who.token, { draftId: d.id, expectedVersion: draft.version, fields: { offer: confirmed('Reparación de bicicletas'), goal: unknown }, step: 4 });
      expect(v1.missing).toEqual([]);
      expect(v1.summary).toEqual({ confirmed: ['name', 'ownership', 'offer'], proposed: [], pending: ['goal'] });
      const done = await engine.confirmSetupDraft(who.token, { draftId: d.id, expectedVersion: v1.version });
      expect(done).toMatchObject({ status: 'CONFIRMED', recorded: 2 });
      const statements = (await db.select().from(t.userInputs).where(eq(t.userInputs.brandId, brand.id))).map(r => (r.payload as { statement: string }).statement).sort();
      expect(statements).toEqual(['Qué está construyendo: Reparación de bicicletas', 'Relación con la marca: Es la marca de un cliente.']);
      // ONB-010: no decision version, no kit, no plan, no approval of any kind.
      for (const table of [t.versions, t.brandKitVersions, t.marketingPlans, t.offerApprovals, t.deliverableApprovals] as const)
        expect(await db.select().from(table).where(eq(table.brandId, brand.id))).toEqual([]);
      // Replaying the same confirmation is harmless; a closed draft is immutable (also in the database).
      expect((await engine.confirmSetupDraft(who.token, { draftId: d.id, expectedVersion: v1.version })).replayed).toBe(true);
      await expect(engine.saveSetupDraft(who.token, { draftId: d.id, expectedVersion: done.version, fields: { goal: confirmed('x') } })).rejects.toMatchObject({ code: 'CONFLICT' });
      expect(await databaseError(db.execute(sql`update brand_setup_drafts set step=1, version=version+1 where id=${d.id}`))).toMatch(/closed/);
      expect(await databaseError(db.execute(sql`delete from brand_setup_drafts where id=${d.id}`))).toMatch(/kept/);
      const audits = (await db.select().from(t.audits).where(eq(t.audits.brandId, brand.id))).map(a => a.operation);
      expect(audits).toEqual(expect.arrayContaining(['BRAND_CREATED', 'WORK_PRIORITY_SET', 'BRAND_SETUP_STARTED', 'BRAND_SETUP_CONFIRMED']));
    });

    it('existing brand: the ficha is read back from declared context; a correction is recorded once and wins in the projection', async () => {
      const { db, engine, who } = await ctx();
      const brand = await engine.createBrand(who.token, 'Marca existente', 'Qué está construyendo: Pan artesanal');
      await engine.setBrandGeography(who.token, brand.id, 'NATIONAL', 'México');
      const view = await engine.setupDraft(who.token, brand.id);
      expect(view.draft).toBeNull();
      expect(view.ficha).toMatchObject({ name: { value: 'Marca existente' }, offer: { value: 'Pan artesanal' }, geography: { value: 'NATIONAL' }, market: { value: 'México' } });
      const d = await engine.startSetupDraft(who.token, { startKey: randomUUID(), brandId: brand.id });
      expect(d).toMatchObject({ step: 2, brandId: brand.id, fields: { offer: { value: 'Pan artesanal' } } });
      await expect(engine.saveSetupDraft(who.token, { draftId: d.id, expectedVersion: d.version, fields: { name: confirmed('Otro nombre') } })).rejects.toMatchObject({ code: 'INVALID' });
      const s = await engine.saveSetupDraft(who.token, { draftId: d.id, expectedVersion: d.version, fields: { offer: confirmed('Pan y café de especialidad') } });
      expect((await engine.confirmSetupDraft(who.token, { draftId: d.id, expectedVersion: s.version })).recorded).toBe(1); // only the change; geography unchanged
      expect((await engine.setupDraft(who.token, brand.id)).ficha?.offer?.value).toBe('Pan y café de especialidad');
      expect((await db.select().from(t.userInputs).where(eq(t.userInputs.brandId, brand.id))).length).toBe(2); // history kept
    });

    it('ONB-006/007: document proposals keep their origin, conflicts stay visible; nothing is confirmed without the person choosing it', async () => {
      const { db, engine, who } = await ctx();
      const d = await engine.startSetupDraft(who.token, { startKey: randomUUID(), fields: { name: confirmed('Agencia Uno') } });
      const { brand, draft } = await engine.createBrandFromDraft(who.token, { draftId: d.id, expectedVersion: 1 });
      const manual = await claimOf(db, who.workspaceId, brand.id, 'manual.pdf', 'OFFER', 'Consultoría de marca');
      await claimOf(db, who.workspaceId, brand.id, 'catalogo.pdf', 'OFFER', 'Diseño de empaques');
      await claimOf(db, who.workspaceId, brand.id, 'catalogo.pdf', 'AUDIENCE', 'Pymes de alimentos');
      const seen = (await engine.setupDraft(who.token, brand.id)).draft!;
      expect(seen.proposals.map(p => [p.field, p.documentName, p.statement])).toEqual([['offer', 'manual.pdf', 'Consultoría de marca'], ['offer', 'catalogo.pdf', 'Diseño de empaques'], ['audience', 'catalogo.pdf', 'Pymes de alimentos']]);
      expect(seen.conflicts).toEqual(['offer']);
      expect(seen.summary).toMatchObject({ confirmed: ['name'], proposed: ['offer', 'audience'] });
      // A forged source (another brand's claim) is rejected; the chosen one keeps its document name from the store.
      const other = await engine.createBrand(who.token, 'Otra');
      const foreign = await claimOf(db, who.workspaceId, other.id, 'ajeno.pdf', 'OFFER', 'Ajeno');
      await expect(engine.saveSetupDraft(who.token, { draftId: d.id, expectedVersion: draft.version, fields: { offer: { ...confirmed('Ajeno'), source: foreign } } })).rejects.toMatchObject({ code: 'INVALID' });
      const chosen = await engine.saveSetupDraft(who.token, { draftId: d.id, expectedVersion: draft.version, fields: { offer: { ...confirmed('Consultoría de marca para pymes'), source: manual } } });
      expect(chosen.fields.offer).toEqual({ value: 'Consultoría de marca para pymes', state: 'CONFIRMED', source: { ...manual, documentName: 'manual.pdf' } });
      expect(chosen.conflicts).toEqual([]);
      await engine.confirmSetupDraft(who.token, { draftId: d.id, expectedVersion: chosen.version });
      const statements = (await db.select().from(t.userInputs).where(eq(t.userInputs.brandId, brand.id))).map(r => (r.payload as { statement: string }).statement);
      expect(statements).toEqual(['Qué está construyendo: Consultoría de marca para pymes']); // the unchosen audience is not recorded
    });

    it('ONB-008/011: 409 on a stale save; drafts are private to their author; members without brand creation cannot start one', async () => {
      const { db, engine, who } = await ctx();
      const d = await engine.startSetupDraft(who.token, { startKey: randomUUID(), fields: { name: confirmed('Privada') } });
      await engine.saveSetupDraft(who.token, { draftId: d.id, expectedVersion: 1, fields: { goal: confirmed('Vender más') } });
      await expect(engine.saveSetupDraft(who.token, { draftId: d.id, expectedVersion: 1, fields: { goal: confirmed('Otra cosa') } })).rejects.toMatchObject({ code: 'CONFLICT' });
      await expect(engine.saveSetupDraft(who.token, { draftId: d.id, expectedVersion: 2, step: 3 })).rejects.toMatchObject({ code: 'INVALID' }); // no brand yet
      const colleague = await seedIdentity(db, 'ADMIN', who.workspaceId), member = await seedIdentity(db, 'MEMBER', who.workspaceId), stranger = await seedIdentity(db);
      await expect(engine.saveSetupDraft(colleague.token, { draftId: d.id, expectedVersion: 2, fields: { goal: confirmed('x') } })).rejects.toMatchObject({ code: 'NOT_FOUND' });
      await expect(engine.createBrandFromDraft(stranger.token, { draftId: d.id, expectedVersion: 2 })).rejects.toMatchObject({ code: 'NOT_FOUND' });
      expect((await engine.setupDraft(colleague.token)).draft).toBeNull();
      await expect(engine.startSetupDraft(member.token, { startKey: randomUUID() })).rejects.toMatchObject({ code: 'FORBIDDEN' });
      const { brand } = await engine.createBrandFromDraft(who.token, { draftId: d.id, expectedVersion: 2 });
      const colleagueView = await engine.setupDraft(colleague.token, brand.id);
      expect(colleagueView).toMatchObject({ draft: null, otherOpen: true });
      await expect(engine.startSetupDraft(colleague.token, { startKey: randomUUID(), brandId: brand.id })).rejects.toMatchObject({ code: 'CONFLICT' });
      await expect(engine.setupDraft(stranger.token, brand.id)).rejects.toMatchObject({ code: 'NOT_FOUND' });
      // Abandon: the brand stays, the draft closes; replay is harmless.
      const open = (await engine.setupDraft(who.token, brand.id)).draft!;
      expect((await engine.abandonSetupDraft(who.token, { draftId: open.id, expectedVersion: open.version })).status).toBe('ABANDONED');
      expect((await engine.abandonSetupDraft(who.token, { draftId: open.id, expectedVersion: open.version })).replayed).toBe(true);
      expect((await db.select().from(t.brands).where(eq(t.brands.id, brand.id))).length).toBe(1);
    });

    it('ONB-008: the same file is stored once per brand (a retry returns the kept document)', async () => {
      const { db, engine, who } = await ctx();
      const brand = await engine.createBrand(who.token, 'Archivos');
      const doc = (id: string) => ({ id, originalName: 'manual.pdf', mediaType: 'application/pdf', bytes: 10, sha256: 'b'.repeat(64), storageKey: `k/${id}` });
      const first = await engine.registerSourceDocument(who.token, brand.id, doc(randomUUID()));
      const again = await engine.registerSourceDocument(who.token, brand.id, doc(randomUUID()));
      expect(first.reused).toBe(false);
      expect(again).toMatchObject({ id: first.id, reused: true });
      expect((await db.select().from(t.sourceDocuments).where(eq(t.sourceDocuments.brandId, brand.id))).length).toBe(1);
      const other = await engine.createBrand(who.token, 'Otra marca');
      expect((await engine.registerSourceDocument(who.token, other.id, doc(randomUUID()))).reused).toBe(false); // per brand
    });

    it('brand deletion removes its drafts; HTTP enforces session, same origin and scope', async () => {
      const { db, engine, who } = await ctx();
      const server = createApp(engine);
      await new Promise<void>(r => server.listen(0, '127.0.0.1', r));
      const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
      const post = (path: string, body: unknown, token: string | null, origin: string | null = base) => fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(origin ? { Origin: origin } : {}), ...(token ? { Cookie: `brandopolis_session=${token}` } : {}) }, body: JSON.stringify(body) });
      try {
        const body = { startKey: randomUUID(), fields: { name: confirmed('HTTP') } };
        expect((await post('/api/brand-setup/start', body, who.token, null)).status).toBe(403);
        expect((await post('/api/brand-setup/start', body, null)).status).toBe(401);
        const started = await post('/api/brand-setup/start', body, who.token);
        expect(started.status).toBe(201);
        const d = await started.json();
        const created = await (await post('/api/brand-setup/create-brand', { draftId: d.id, expectedVersion: 1 }, who.token)).json();
        expect((await post('/api/brand-setup/save', { draftId: d.id, expectedVersion: 1, step: 3 }, who.token)).status).toBe(409);
        const read = await fetch(`${base}/api/brand-setup?brandId=${created.brand.id}`, { headers: { Cookie: `brandopolis_session=${who.token}` } });
        expect((await read.json()).draft.id).toBe(d.id);
        await engine.deleteBrand(who.token, { brandId: created.brand.id, confirmName: 'HTTP', idempotencyKey: randomUUID() });
        expect(await db.select().from(t.brandSetupDrafts).where(eq(t.brandSetupDrafts.id, d.id))).toEqual([]);
      } finally { await new Promise<void>(r => server.close(() => r())); }
    });
  });
}
