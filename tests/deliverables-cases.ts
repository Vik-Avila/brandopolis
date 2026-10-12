import { describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import type { connect } from '../src/persistence/database.js';
import { Engine } from '../src/application/engine.js';
import { seedIdentity } from '../scripts/seed.js';
import * as t from '../src/persistence/schema.js';

const databaseError = async (query: Promise<unknown>) => { try { await query; return 'no error'; } catch (e) { return String((e as { cause?: { message?: string } }).cause?.message ?? (e as Error).message); } };

/** PHASE4_SPEC §4.4 · five deliverable types on the editorial-version rules of ADR-0030 (same guarantees as offers). */
export function deliverablesCases(connection: () => ReturnType<typeof connect>) {
  const setup = async () => {
    const db = connection().db, engine = new Engine(db), who = await seedIdentity(db);
    const brand = await engine.createBrand(who.token, 'Marca con materiales');
    const cmd = (action: Parameters<Engine['deliverableCommand']>[1], input: Record<string, unknown>, token = who.token) => engine.deliverableCommand(token, action, { brandId: brand.id, ...(action === 'submit' ? { reviewerId: who.userId } : {}), ...(action === 'decide' ? { idempotencyKey: randomUUID() } : {}), ...input });
    const list = (types: string[] | null = null, token = who.token) => engine.deliverables(token, brand.id, types);
    const post = (extra: Record<string, unknown> = {}) => ({ type: 'SOCIAL_POST', name: 'Lanzamiento', offerId: null, sourceDecisionVersionIds: [], body: { network: 'LINKEDIN', format: 'POST', objective: 'Dar a conocer el diagnóstico', scheduledDate: '2026-11-03', text: 'Ordena tu estrategia.', hashtags: ['marca', '#estrategia'], materials: '' }, ...extra });
    const approveAll = async (id: unknown, revision: number) => { const v = await cmd('submit', { deliverableId: id, expectedRevision: revision }); await cmd('decide', { deliverableId: id, versionId: v.versionId, fingerprint: v.fingerprint, decision: 'APPROVE', criterion: 'Revisado por el equipo' }); return v; };
    return { db, engine, who, brand, cmd, list, post, approveAll };
  };
  const offerContent = { name: 'Diagnóstico', kind: 'SERVICE', audience: { customerDecisionVersionId: null, segment: '' }, need: '', outcome: '', benefits: [], differentiators: [], conditions: '', proofIds: [], sourceDecisionVersionIds: [], hypothesisIds: [], price: null };

  describe('PHASE4_SPEC §4.4 · deliverables', () => {
    it('each of the five types validates its own body; an offer copy needs an offer; the type never changes', async () => {
      const x = await setup();
      const offer = await x.engine.offerCommand(x.who.token, 'create', { brandId: x.brand.id, content: offerContent, idempotencyKey: randomUUID() });
      const bodies: Record<string, Record<string, unknown>> = {
        SALES_PRESENTATION: { audience: 'Agencias', slides: [{ title: 'Problema', text: 'Retrabajo' }] },
        OFFER_COPY: { headline: 'Ordena tu marca', short: 'En 30 días', long: '', callToAction: 'Agenda' },
        SOCIAL_POST: x.post().body,
        AD: { channel: 'GOOGLE', objective: 'TRAFFIC', headlines: ['Diagnóstico de marca'], descriptions: [], callToAction: 'Conoce más', landingUrl: 'https://example.com' },
        DESIGN_BRIEF: { for: 'CANVA', piece: 'Carrusel de lanzamiento', format: '1080×1350', audience: '', message: '', mustInclude: '', avoid: '', dueDate: null }
      };
      for (const [type, body] of Object.entries(bodies))
        await x.cmd('create', { content: { type, name: type, offerId: type === 'OFFER_COPY' ? offer.offerId : null, sourceDecisionVersionIds: [], body }, idempotencyKey: randomUUID() });
      expect((await x.list()).map(d => d.type).sort()).toEqual(Object.keys(bodies).sort());
      expect((await x.list(['SOCIAL_POST'])).map(d => d.draft!.content.body.hashtags)).toEqual([['#marca', '#estrategia']]);
      await expect(x.cmd('create', { content: { type: 'OFFER_COPY', name: 'Sin oferta', offerId: null, sourceDecisionVersionIds: [], body: bodies.OFFER_COPY }, idempotencyKey: randomUUID() })).rejects.toMatchObject({ code: 'INVALID' });
      await expect(x.cmd('create', { content: { type: 'AD', name: 'URL insegura', offerId: null, sourceDecisionVersionIds: [], body: { ...bodies.AD, landingUrl: 'http://example.com' } }, idempotencyKey: randomUUID() })).rejects.toMatchObject({ code: 'INVALID' });
      await expect(x.cmd('create', { content: { type: 'SALES_PRESENTATION', name: 'Vacía', offerId: null, sourceDecisionVersionIds: [], body: { audience: '', slides: [] } }, idempotencyKey: randomUUID() })).rejects.toMatchObject({ code: 'INVALID' });
      await expect(x.cmd('create', { content: { type: 'PDF', name: 'x', offerId: null, sourceDecisionVersionIds: [], body: {} }, idempotencyKey: randomUUID() })).rejects.toMatchObject({ code: 'INVALID' });
      const [social] = await x.list(['SOCIAL_POST']);
      await expect(x.cmd('draft', { deliverableId: social.id, expectedRevision: 0, content: { type: 'AD', name: 'x', offerId: null, sourceDecisionVersionIds: [], body: bodies.AD } })).rejects.toMatchObject({ code: 'INVALID' });
      await expect(x.engine.deliverables(x.who.token, x.brand.id, ['UNKNOWN'])).rejects.toMatchObject({ code: 'INVALID' });
    });

    it('draft → review → approval on the exact fingerprint; a new version keeps the approved one; decisions replay; all audited', async () => {
      const x = await setup();
      const key = randomUUID();
      const created = await x.cmd('create', { content: x.post(), idempotencyKey: key });
      expect(await x.cmd('create', { content: x.post(), idempotencyKey: key })).toMatchObject({ deliverableId: created.deliverableId, replayed: true });
      await expect(x.cmd('create', { content: x.post({ name: 'Otra' }), idempotencyKey: key })).rejects.toMatchObject({ code: 'CONFLICT' });
      let [d] = await x.list();
      expect(d.draft).toMatchObject({ sequence: 1, status: 'DRAFT', provenance: 'MANUAL', gaps: ['ORIGIN'] });
      await expect(x.cmd('submit', { deliverableId: d.id })).rejects.toMatchObject({ code: 'INVALID' }); // revision required
      const v1 = await x.cmd('submit', { deliverableId: d.id, expectedRevision: 0 });
      await expect(x.cmd('decide', { deliverableId: d.id, versionId: v1.versionId, fingerprint: 'f'.repeat(64), decision: 'APPROVE', criterion: 'Revisado por el equipo' })).rejects.toMatchObject({ code: 'CONFLICT' });
      const decision = { deliverableId: d.id, versionId: v1.versionId, fingerprint: v1.fingerprint, decision: 'APPROVE', criterion: 'Revisado por el equipo', idempotencyKey: randomUUID() };
      await x.cmd('decide', decision);
      expect(await x.cmd('decide', decision)).toMatchObject({ status: 'APPROVED', replayed: true });
      expect(await databaseError(x.db.execute(sql`update deliverable_versions set content='{}'::jsonb where id=${v1.versionId}`))).toMatch(/immutable/);
      expect(await databaseError(x.db.execute(sql`update deliverable_versions set status='DRAFT' where id=${v1.versionId}`))).toMatch(/not allowed/);
      expect(await databaseError(x.db.execute(sql`delete from deliverable_approvals where "versionId"=${v1.versionId}`))).toMatch(/append-only/);
      [d] = await x.list();
      await x.cmd('new-draft', { deliverableId: d.id, expectedRevision: d.revision });
      [d] = await x.list();
      expect(d.approved).toMatchObject({ sequence: 1, status: 'APPROVED' });
      expect(d.draft).toMatchObject({ sequence: 2, status: 'DRAFT' });
      await x.cmd('draft', { deliverableId: d.id, expectedRevision: d.revision, content: x.post({ body: { ...x.post().body, text: 'Texto nuevo' } }) });
      [d] = await x.list();
      await x.approveAll(d.id, d.revision);
      [d] = await x.list();
      expect(d.history.map(h => h.status)).toEqual(['SUPERSEDED', 'APPROVED']);
      // PHASE4_SPEC §13: the approval circuit leaves its own entries beside the editorial ones (author reviewing alone).
      const circuit = (op: string) => /_REVIEW_|_SELF_APPROVAL$/.test(op);
      const all = (await x.db.select().from(t.audits).where(eq(t.audits.brandId, x.brand.id))).filter(a => a.operation.startsWith('DELIVERABLE_'));
      const audits = all.filter(a => !circuit(a.operation));
      expect(audits.map(a => a.operation).sort()).toEqual(['DELIVERABLE_APPROVE', 'DELIVERABLE_APPROVE', 'DELIVERABLE_CREATE', 'DELIVERABLE_DRAFT', 'DELIVERABLE_NEW_DRAFT', 'DELIVERABLE_SUBMIT', 'DELIVERABLE_SUBMIT']);
      expect(audits.filter(a => a.operation !== 'DELIVERABLE_APPROVE').every(a => a.rationale === null)).toBe(true);
      expect(all.filter(a => circuit(a.operation)).map(a => a.operation).sort()).toEqual(['DELIVERABLE_REVIEW_SELF_ASSIGNED', 'DELIVERABLE_REVIEW_SELF_ASSIGNED', 'DELIVERABLE_SELF_APPROVAL', 'DELIVERABLE_SELF_APPROVAL']);
    });

    it('origin manifest: decision versions and the offer\'s approved version; a newer one marks «origin updated» without rewriting', async () => {
      const x = await setup();
      const offer = await x.engine.offerCommand(x.who.token, 'create', { brandId: x.brand.id, content: offerContent, idempotencyKey: randomUUID() });
      const ov1 = await x.engine.offerCommand(x.who.token, 'submit', { reviewerId: x.who.userId, brandId: x.brand.id, offerId: offer.offerId, expectedRevision: 0 });
      await x.engine.offerCommand(x.who.token, 'decide', { brandId: x.brand.id, offerId: offer.offerId, versionId: ov1.versionId, fingerprint: ov1.fingerprint, decision: 'APPROVE', criterion: 'Oferta aprobada', idempotencyKey: randomUUID() });
      const created = await x.cmd('create', { content: { type: 'OFFER_COPY', name: 'Textos', offerId: offer.offerId, sourceDecisionVersionIds: [], body: { headline: 'h', short: 's', long: '', callToAction: 'c' } }, idempotencyKey: randomUUID() });
      await x.approveAll(created.deliverableId, 0);
      let [d] = await x.list();
      expect(d.approved).toMatchObject({ manifest: { offerVersionId: ov1.versionId, kitVersionId: null }, originOutdated: [] });
      // A newer approved offer version: the deliverable is flagged, never rewritten.
      await x.engine.offerCommand(x.who.token, 'new-draft', { brandId: x.brand.id, offerId: offer.offerId, expectedRevision: 2 });
      const ov2 = await x.engine.offerCommand(x.who.token, 'submit', { reviewerId: x.who.userId, brandId: x.brand.id, offerId: offer.offerId, expectedRevision: 3 });
      await x.engine.offerCommand(x.who.token, 'decide', { brandId: x.brand.id, offerId: offer.offerId, versionId: ov2.versionId, fingerprint: ov2.fingerprint, decision: 'APPROVE', criterion: 'Nueva versión aprobada', idempotencyKey: randomUUID() });
      [d] = await x.list();
      expect(d.approved).toMatchObject({ manifest: { offerVersionId: ov1.versionId }, originOutdated: ['OFFER'] });
      // References of another brand are refused.
      const other = await x.engine.createBrand(x.who.token, 'Otra marca');
      const foreign = await x.engine.offerCommand(x.who.token, 'create', { brandId: other.id, content: offerContent, idempotencyKey: randomUUID() });
      await expect(x.cmd('create', { content: { type: 'OFFER_COPY', name: 'Ajena', offerId: foreign.offerId, sourceDecisionVersionIds: [], body: { headline: '', short: '', long: '', callToAction: '' } }, idempotencyKey: randomUUID() })).rejects.toMatchObject({ code: 'INVALID' });
      await expect(x.cmd('create', { content: x.post({ sourceDecisionVersionIds: ['no-existe'] }), idempotencyKey: randomUUID() })).rejects.toMatchObject({ code: 'INVALID' });
    });

    it('manual publication record: only for the approved version of a social post; never an automatic publication', async () => {
      const x = await setup();
      const created = await x.cmd('create', { content: x.post(), idempotencyKey: randomUUID() });
      const record = (extra: Record<string, unknown> = {}) => x.cmd('publication', { deliverableId: created.deliverableId, versionId: created.versionId, publishedOn: '2026-11-03', url: 'https://www.linkedin.com/posts/123', idempotencyKey: randomUUID(), ...extra });
      await expect(record()).rejects.toMatchObject({ code: 'CONFLICT' }); // not approved yet
      const v1 = await x.approveAll(created.deliverableId, 0);
      await expect(record({ url: 'javascript:alert(1)' })).rejects.toMatchObject({ code: 'INVALID' });
      await expect(record({ publishedOn: '03/11/2026' })).rejects.toMatchObject({ code: 'INVALID' });
      const key = randomUUID();
      await record({ versionId: v1.versionId, idempotencyKey: key, note: 'Publicado por Ana' });
      expect(await record({ versionId: v1.versionId, idempotencyKey: key, note: 'Publicado por Ana' })).toMatchObject({ replayed: true });
      const [d] = await x.list();
      expect(d.publications).toEqual([expect.objectContaining({ versionId: v1.versionId, publishedOn: '2026-11-03', url: 'https://www.linkedin.com/posts/123', note: 'Publicado por Ana' })]);
      expect(await databaseError(x.db.execute(sql`update deliverable_publications set url=null where "deliverableId"=${created.deliverableId}`))).toMatch(/append-only/);
      // Security review: the same key with another link or note is a conflict, never a silent replay.
      await expect(record({ versionId: v1.versionId, idempotencyKey: key, note: 'Publicado por Ana', url: 'https://www.linkedin.com/posts/456' })).rejects.toMatchObject({ code: 'CONFLICT' });
      await expect(record({ versionId: v1.versionId, idempotencyKey: key, note: 'Otra nota' })).rejects.toMatchObject({ code: 'CONFLICT' });
      // A retired deliverable records no publication.
      await x.cmd('retire', { deliverableId: created.deliverableId, expectedRevision: 2 });
      await expect(record({ versionId: v1.versionId })).rejects.toMatchObject({ code: 'CONFLICT' });
      const ad = await x.cmd('create', { content: { type: 'AD', name: 'Anuncio', offerId: null, sourceDecisionVersionIds: [], body: { channel: 'META', objective: 'LEADS', headlines: ['h'], descriptions: [], callToAction: '', landingUrl: null } }, idempotencyKey: randomUUID() });
      await expect(x.cmd('publication', { deliverableId: ad.deliverableId, versionId: ad.versionId, publishedOn: '2026-11-03', idempotencyKey: randomUUID() })).rejects.toMatchObject({ code: 'INVALID' });
    });

    it('scope: another workspace, an unassigned member and ids of another brand never reach a deliverable; retired is read-only', async () => {
      const x = await setup();
      const created = await x.cmd('create', { content: x.post(), idempotencyKey: randomUUID() });
      const stranger = await seedIdentity(x.db), member = await seedIdentity(x.db, 'MEMBER', x.who.workspaceId);
      await expect(x.list(null, stranger.token)).rejects.toMatchObject({ code: 'NOT_FOUND' });
      await expect(x.list(null, member.token)).rejects.toMatchObject({ code: 'FORBIDDEN' });
      const other = await x.engine.createBrand(x.who.token, 'Otra marca');
      await expect(x.engine.deliverableCommand(x.who.token, 'submit', { reviewerId: x.who.userId, brandId: other.id, deliverableId: created.deliverableId, expectedRevision: 0 })).rejects.toMatchObject({ code: 'NOT_FOUND' });
      const v1 = await x.cmd('submit', { deliverableId: created.deliverableId, expectedRevision: 0 });
      await x.cmd('retire', { deliverableId: created.deliverableId, expectedRevision: 1 });
      await expect(x.cmd('decide', { deliverableId: created.deliverableId, versionId: v1.versionId, fingerprint: v1.fingerprint, decision: 'APPROVE', criterion: 'Después de retirar' })).rejects.toMatchObject({ code: 'CONFLICT' });
    });
  });
}
