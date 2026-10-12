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
    // A decision needs its own idempotency key (INV-010); tests that do not exercise retries get a fresh one.
    const cmd = (action: Parameters<Engine['offerCommand']>[1], input: Record<string, unknown>, token = who.token) => engine.offerCommand(token, action, { brandId: brand.id, ...(action === 'submit' ? { reviewerId: who.userId } : {}), ...(action === 'decide' ? { idempotencyKey: randomUUID() } : {}), ...input });
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
      // PHASE4_SPEC §13: the approval circuit leaves its own entries beside the editorial ones (author reviewing alone).
      const circuit = (op: string) => /_REVIEW_|_SELF_APPROVAL$/.test(op);
      expect(audited.filter(a => a.operation.startsWith('OFFER_') && !circuit(a.operation)).length).toBe(8);
      expect(audited.filter(a => circuit(a.operation)).map(a => a.operation).sort()).toEqual(['OFFER_REVIEW_SELF_ASSIGNED', 'OFFER_REVIEW_SELF_ASSIGNED', 'OFFER_SELF_APPROVAL', 'OFFER_SELF_APPROVAL']);
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

    it('security review: brand permissions, required revision, retired offers, version order and concurrent decisions', async () => {
      const x = await setup();
      const approveAll = async (offerId: string, revision: number) => {
        const v = await x.cmd('submit', { offerId, expectedRevision: revision });
        return { v, decided: await x.cmd('decide', { offerId, versionId: v.versionId, fingerprint: v.fingerprint, decision: 'APPROVE', criterion: 'Revisada por el equipo' }) };
      };
      // A MEMBER of the workspace not assigned to the brand cannot read or change offers; once assigned, can approve (ADR-0033).
      const member = await seedIdentity(x.db, 'MEMBER', x.who.workspaceId);
      const created = await x.cmd('create', { content: x.content(), idempotencyKey: randomUUID() });
      await expect(x.engine.offers(member.token, x.brand.id)).rejects.toMatchObject({ code: 'FORBIDDEN' });
      await expect(x.cmd('submit', { offerId: created.offerId, expectedRevision: 0 }, member.token)).rejects.toMatchObject({ code: 'FORBIDDEN' });
      await x.db.insert(t.assignments).values({ workspaceId: x.who.workspaceId, brandId: x.brand.id, userId: member.userId });
      // INV-009: every revision-guarded operation requires the revision the client saw.
      for (const action of ['draft', 'submit', 'new-draft', 'retire'] as const)
        await expect(x.cmd(action, { offerId: created.offerId, content: x.content() })).rejects.toMatchObject({ code: 'INVALID' });
      const v1 = await x.cmd('submit', { offerId: created.offerId, expectedRevision: 0 }, member.token);
      // Concurrent approvals of the same version: exactly one wins, the other is a conflict without effects.
      const both = await Promise.allSettled([1, 2].map(() => x.cmd('decide', { offerId: created.offerId, versionId: v1.versionId, fingerprint: v1.fingerprint, decision: 'APPROVE', criterion: 'Aprobada en paralelo' })));
      expect(both.filter(r => r.status === 'fulfilled')).toHaveLength(1);
      expect(both.find(r => r.status === 'rejected')).toMatchObject({ reason: { code: 'CONFLICT' } });
      // Two versions in review: approving v3 first must not let the older v2 be approved afterwards (no going back, never two APPROVED).
      let [offer] = await x.list();
      await x.cmd('new-draft', { offerId: offer.id, expectedRevision: offer.revision });
      [offer] = await x.list();
      const v2 = await x.cmd('submit', { offerId: offer.id, expectedRevision: offer.revision });
      [offer] = await x.list();
      await x.cmd('new-draft', { offerId: offer.id, expectedRevision: offer.revision });
      [offer] = await x.list();
      await approveAll(offer.id, offer.revision);
      await expect(x.cmd('decide', { offerId: offer.id, versionId: v2.versionId, fingerprint: v2.fingerprint, decision: 'APPROVE', criterion: 'Versión anterior' })).rejects.toMatchObject({ code: 'CONFLICT' });
      [offer] = await x.list();
      expect(offer.approved!.sequence).toBe(3);
      expect(offer.history.filter(h => h.status === 'APPROVED')).toHaveLength(1);
      // A retired offer is read-only: no review, no decision.
      const other = await x.cmd('create', { content: x.content({ name: 'Retirada' }), idempotencyKey: randomUUID() });
      const pending = await x.cmd('submit', { offerId: other.offerId, expectedRevision: 0 });
      await x.cmd('retire', { offerId: other.offerId, expectedRevision: 1 });
      await expect(x.cmd('decide', { offerId: other.offerId, versionId: pending.versionId, fingerprint: pending.fingerprint, decision: 'APPROVE', criterion: 'Después de retirar' })).rejects.toMatchObject({ code: 'CONFLICT' });
      // Concurrent creation with the same key replays one offer (INV-010), never a database error.
      const key = randomUUID();
      const same = await Promise.all([1, 2].map(() => x.cmd('create', { content: x.content({ name: 'Idempotente' }), idempotencyKey: key })));
      expect(new Set(same.map(r => r.offerId)).size).toBe(1);
    });

    it('security review II: decisions are idempotent and append-only, audited with their versions; foreign ids and inactive members are refused', async () => {
      const x = await setup();
      const created = await x.cmd('create', { content: x.content(), idempotencyKey: randomUUID() });
      const v1 = await x.cmd('submit', { offerId: created.offerId, expectedRevision: 0 });
      const decision = { offerId: created.offerId, versionId: v1.versionId, fingerprint: v1.fingerprint, decision: 'APPROVE', criterion: 'Revisada con el equipo', idempotencyKey: randomUUID() };
      const first = await x.cmd('decide', decision);
      // A retry after a timeout replays the recorded decision instead of failing with 409.
      expect(await x.cmd('decide', decision)).toMatchObject({ versionId: v1.versionId, status: 'APPROVED', replayed: true });
      await expect(x.cmd('decide', { ...decision, decision: 'REQUEST_CHANGES' })).rejects.toMatchObject({ code: 'CONFLICT' });
      await expect(x.cmd('decide', { ...decision, idempotencyKey: undefined })).rejects.toMatchObject({ code: 'INVALID' });
      expect(first).toMatchObject({ status: 'APPROVED' });
      const approvals = await x.db.select().from(t.offerApprovals).where(eq(t.offerApprovals.offerId, String(created.offerId)));
      expect(approvals).toHaveLength(1);
      expect(approvals[0]).toMatchObject({ versionId: v1.versionId, fingerprint: v1.fingerprint, decision: 'APPROVE', actorId: x.who.userId });
      expect(await databaseError(x.db.execute(sql`update offer_approvals set criterion='otro' where id=${approvals[0].id}`))).toMatch(/append-only/);
      // The audit names the version acted on; the criterion appears only on the decision.
      const audits = (await x.db.select().from(t.audits).where(eq(t.audits.brandId, x.brand.id))).filter(r => r.operation.startsWith('OFFER_'));
      expect(audits.map(r => r.operation)).toEqual(expect.arrayContaining(['OFFER_CREATE', 'OFFER_SUBMIT', 'OFFER_APPROVE']));
      expect(audits.find(r => r.operation === 'OFFER_APPROVE')).toMatchObject({ newVersion: v1.versionId, rationale: 'Revisada con el equipo' });
      expect(audits.filter(r => r.operation !== 'OFFER_APPROVE' && !/_REVIEW_/.test(r.operation)).every(r => r.rationale === null)).toBe(true);
      expect(audits.find(r => r.operation === 'OFFER_REVIEW_SELF_ASSIGNED')).toMatchObject({ newVersion: v1.versionId, rationale: `reviewer:${x.who.userId}` });
      await x.cmd('retire', { offerId: created.offerId, expectedRevision: 2, criterion: 'Aprobado por dirección' });
      expect((await x.db.select().from(t.audits).where(eq(t.audits.operation, 'OFFER_RETIRE'))).find(r => r.brandId === x.brand.id)).toMatchObject({ rationale: null, newVersion: v1.versionId });
      // Database: an approved version cannot go back to DRAFT, and a recorded decision cannot be rewritten.
      expect(await databaseError(x.db.execute(sql`update offer_versions set status='DRAFT' where id=${v1.versionId}`))).toMatch(/not allowed/);
      expect(await databaseError(x.db.execute(sql`update offer_versions set "decisionCriterion"='otro' where id=${v1.versionId}`))).toMatch(/immutable/);
      // Ids of another brand of the same workspace are not found from this brand.
      const other = await x.engine.createBrand(x.who.token, 'Otra marca con ofertas');
      const foreign = await x.engine.offerCommand(x.who.token, 'create', { brandId: other.id, content: x.content(), idempotencyKey: randomUUID() });
      const foreignV = await x.engine.offerCommand(x.who.token, 'submit', { reviewerId: x.who.userId, brandId: other.id, offerId: foreign.offerId, expectedRevision: 0 });
      await expect(x.cmd('decide', { offerId: foreign.offerId, versionId: foreignV.versionId, fingerprint: foreignV.fingerprint, decision: 'APPROVE', criterion: 'Desde la marca equivocada' })).rejects.toMatchObject({ code: 'NOT_FOUND' });
      const mine = await x.cmd('create', { content: x.content({ name: 'Propia' }), idempotencyKey: randomUUID() });
      await x.cmd('submit', { offerId: mine.offerId, expectedRevision: 0 });
      await expect(x.cmd('decide', { offerId: mine.offerId, versionId: foreignV.versionId, fingerprint: foreignV.fingerprint, decision: 'APPROVE', criterion: 'Versión de otra marca' })).rejects.toMatchObject({ code: 'NOT_FOUND' });
      // An assigned member whose membership is deactivated loses access at once.
      const member = await seedIdentity(x.db, 'MEMBER', x.who.workspaceId);
      await x.db.insert(t.assignments).values({ workspaceId: x.who.workspaceId, brandId: x.brand.id, userId: member.userId });
      expect(await x.engine.offers(member.token, x.brand.id)).toHaveLength(2);
      await x.db.update(t.memberships).set({ active: false }).where(eq(t.memberships.userId, member.userId));
      await expect(x.engine.offers(member.token, x.brand.id)).rejects.toMatchObject({ code: 'FORBIDDEN' });
    });
  });
}
