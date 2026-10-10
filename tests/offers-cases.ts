import { describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import type { connect } from '../src/persistence/database.js';
import { Engine } from '../src/application/engine.js';
import { seedIdentity } from '../scripts/seed.js';
import * as t from '../src/persistence/schema.js';

const databaseError = async (query: Promise<unknown>) => { try { await query; return 'no error'; } catch (e) { return String((e as { cause?: { message?: string } }).cause?.message ?? (e as Error).message); } };

/** PHASE4_SPEC §4.1 · offers (MKT-001…006, VER-001…003, APR-001/002) on the editorial-version rules of ADR-0030. */
export function offersCases(connection: () => ReturnType<typeof connect>) {
  const setup = async () => {
    const db = connection().db, engine = new Engine(db), who = await seedIdentity(db);
    const brand = await engine.createBrand(who.token, 'Marca con ofertas');
    const ctx = () => engine.context(who.token, brand.id);
    const commit = async (module: string, option: string) => {
      const c = await ctx(), q = c.questions.find(x => x.module === module)!, d = c.decisions.find(x => x.questionId === q.id);
      await engine.prepareQuestion(who.token, brand.id, q.id, d?.activeVersionId ?? null);
      return engine.commitDecision(who.token, { brandId: brand.id, questionId: q.id, selectedOption: option, rationale: 'Criterio humano', expectedActiveVersion: d?.activeVersionId ?? null, sourceRecommendationId: null, idempotencyKey: randomUUID(), actorUserId: who.userId });
    };
    const cmd = (action: Parameters<Engine['offerCommand']>[1], input: Record<string, unknown>, token = who.token) => engine.offerCommand(token, action, { brandId: brand.id, ...input });
    const content = (extra: Record<string, unknown> = {}) => ({ name: 'Diagnóstico de marca', kind: 'SERVICE', audience: { customerDecisionVersionId: null, segment: 'Agencias pequeñas' }, need: 'Ordenar la estrategia', outcome: 'Estrategia aprobada', benefits: ['Menos retrabajo'], differentiators: [], conditions: '', proofIds: [], sourceDecisionVersionIds: [], hypothesisIds: [], price: null, ...extra });
    const list = async () => (await engine.offers(who.token, brand.id));
    return { db, engine, who, brand, commit, cmd, content, list };
  };

  describe('PHASE4_SPEC §4.1 · offers', () => {
    it('create → edit draft → review → approve; a new draft never moves the approved version; approving it supersedes the old one', async () => {
      const x = await setup();
      const key = randomUUID();
      const created = await x.cmd('create', { content: x.content(), idempotencyKey: key });
      expect(await x.cmd('create', { content: x.content(), idempotencyKey: key })).toMatchObject({ offerId: created.offerId, replayed: true });
      await expect(x.cmd('create', { content: x.content({ name: 'Otra' }), idempotencyKey: key })).rejects.toMatchObject({ code: 'CONFLICT' });
      let [offer] = await x.list();
      expect(offer.draft).toMatchObject({ sequence: 1, status: 'DRAFT', gaps: expect.arrayContaining(['PROOF']) });
      await x.cmd('draft', { offerId: offer.id, expectedRevision: 0, content: x.content({ need: 'Ordenar la estrategia del cliente' }) });
      await expect(x.cmd('draft', { offerId: offer.id, expectedRevision: 0, content: x.content() })).rejects.toMatchObject({ code: 'CONFLICT' }); // MKT-004 stale
      const submitted = await x.cmd('submit', { offerId: offer.id, expectedRevision: 1 });
      await expect(x.cmd('decide', { offerId: offer.id, versionId: submitted.versionId, fingerprint: 'f'.repeat(64), decision: 'APPROVE', criterion: 'Lo revisamos con el equipo' })).rejects.toMatchObject({ code: 'CONFLICT' }); // APR-002
      await expect(x.cmd('decide', { offerId: offer.id, versionId: submitted.versionId, fingerprint: submitted.fingerprint, decision: 'APPROVE', criterion: 'ok' })).rejects.toMatchObject({ code: 'INVALID' });
      await x.cmd('decide', { offerId: offer.id, versionId: submitted.versionId, fingerprint: submitted.fingerprint, decision: 'APPROVE', criterion: 'Lo revisamos con el equipo' });
      [offer] = await x.list();
      expect(offer.approved).toMatchObject({ sequence: 1, status: 'APPROVED' });
      // VER-001: a new draft leaves the approved version intact.
      await x.cmd('new-draft', { offerId: offer.id, expectedRevision: offer.revision });
      [offer] = await x.list();
      expect(offer.approved).toMatchObject({ sequence: 1, status: 'APPROVED' });
      expect(offer.draft).toMatchObject({ sequence: 2, status: 'DRAFT' });
      await x.cmd('draft', { offerId: offer.id, expectedRevision: offer.revision, content: x.content({ outcome: 'Estrategia aprobada y plan de 90 días' }) });
      [offer] = await x.list();
      const v2 = await x.cmd('submit', { offerId: offer.id, expectedRevision: offer.revision });
      // VER-002: the old approved version is superseded only when v2 is approved.
      expect((await x.list())[0].approved).toMatchObject({ sequence: 1, status: 'APPROVED' });
      await x.cmd('decide', { offerId: offer.id, versionId: v2.versionId, fingerprint: v2.fingerprint, decision: 'APPROVE', criterion: 'Nueva versión revisada' });
      [offer] = await x.list();
      expect(offer.approved).toMatchObject({ sequence: 2, status: 'APPROVED' });
      expect(offer.history.map(h => h.status)).toEqual(['SUPERSEDED', 'APPROVED']);
      const audited = await x.db.select().from(t.audits).where(eq(t.audits.brandId, x.brand.id));
      expect(audited.filter(a => a.operation.startsWith('OFFER_')).length).toBe(8);
    });

    it('MKT-003: a version out of DRAFT is immutable in the database; versions are never deleted directly', async () => {
      const x = await setup();
      const created = await x.cmd('create', { content: x.content(), idempotencyKey: randomUUID() });
      await x.cmd('submit', { offerId: created.offerId, expectedRevision: 0 });
      expect(await databaseError(x.db.execute(sql`update offer_versions set content='{}'::jsonb where id=${created.versionId}`))).toMatch(/immutable/);
      expect(await databaseError(x.db.execute(sql`delete from offer_versions where id=${created.versionId}`))).toMatch(/cannot be deleted/);
      await expect(x.cmd('draft', { offerId: created.offerId, expectedRevision: 1, content: x.content() })).rejects.toMatchObject({ code: 'CONFLICT' });
    });

    it('MKT-006: a price needs currency and coherent validity; an estimate stays labelled as such', async () => {
      const x = await setup();
      await expect(x.cmd('create', { content: x.content({ price: { amountMinor: 1000, currency: 'MX', validFrom: null, validUntil: null, certainty: 'CONFIRMED' } }), idempotencyKey: randomUUID() })).rejects.toMatchObject({ code: 'INVALID' });
      await expect(x.cmd('create', { content: x.content({ price: { amountMinor: 1000, currency: 'MXN', validFrom: '2026-12-01', validUntil: '2026-11-01', certainty: 'CONFIRMED' } }), idempotencyKey: randomUUID() })).rejects.toMatchObject({ code: 'INVALID' });
      await expect(x.cmd('create', { content: x.content({ price: { amountMinor: 1000, currency: 'MXN', validFrom: null, validUntil: null } }), idempotencyKey: randomUUID() })).rejects.toMatchObject({ code: 'INVALID' });
      await x.cmd('create', { content: x.content({ price: { amountMinor: 150000, currency: 'mxn', validFrom: '2026-11-01', validUntil: null, certainty: 'ESTIMATED' } }), idempotencyKey: randomUUID() });
      expect((await x.list())[0].draft!.content.price).toEqual({ amountMinor: 150000, currency: 'MXN', validFrom: '2026-11-01', validUntil: null, certainty: 'ESTIMATED' });
    });

    it('MKT-001/002: references must belong to the brand; a newer decision version marks «origin updated» without rewriting', async () => {
      const x = await setup();
      const customer = await x.commit('Primary Customer', 'Agencias pequeñas');
      const versionId = String((customer as { versionId?: string }).versionId ?? (await x.engine.context(x.who.token, x.brand.id)).versions[0].id);
      const other = await x.engine.createBrand(x.who.token, 'Otra marca');
      await expect(x.cmd('create', { content: x.content({ proofIds: ['no-existe'] }), idempotencyKey: randomUUID() })).rejects.toMatchObject({ code: 'INVALID' });
      const created = await x.cmd('create', { content: x.content({ audience: { customerDecisionVersionId: versionId, segment: '' }, sourceDecisionVersionIds: [versionId] }), idempotencyKey: randomUUID() });
      const submitted = await x.cmd('submit', { offerId: created.offerId, expectedRevision: 0 });
      await x.cmd('decide', { offerId: created.offerId, versionId: submitted.versionId, fingerprint: submitted.fingerprint, decision: 'APPROVE', criterion: 'Aprobada por el equipo' });
      expect((await x.list())[0].approved!.originOutdated).toEqual([]);
      await x.commit('Primary Customer', 'Agencias medianas');
      const [offer] = await x.list();
      expect(offer.approved!.originOutdated).toEqual([versionId]);
      expect(offer.approved!.content.sourceDecisionVersionIds).toEqual([versionId]); // never rewritten
      // Another workspace or another brand never sees or edits it.
      const stranger = await seedIdentity(x.db);
      await expect(x.engine.offers(stranger.token, x.brand.id)).rejects.toMatchObject({ code: 'NOT_FOUND' });
      expect(await x.engine.offers(x.who.token, other.id)).toEqual([]);
      await expect(x.engine.offerCommand(x.who.token, 'retire', { brandId: other.id, offerId: offer.id, expectedRevision: offer.revision })).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });
  });
}
