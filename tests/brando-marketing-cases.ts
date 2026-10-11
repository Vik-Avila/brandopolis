import { describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { eq } from 'drizzle-orm';
import type { connect } from '../src/persistence/database.js';
import { Engine } from '../src/application/engine.js';
import { DemoProvider, ModelGateway, type MarketingGatewayRequest, type ModelProvider } from '../src/domain/analysis.js';
import { demoMarketingProposal, MarketingAssistance, type MarketingPacket } from '../src/domain/brando-marketing.js';
import { seedIdentity } from '../scripts/seed.js';
import * as t from '../src/persistence/schema.js';

const evals = JSON.parse(readFileSync('evals/brando-marketing.json', 'utf8')) as { fixtures: { id: string; type: string; request: string; expectedWrites: number }[] };

/** ADR-0030 · Brando for marketing: proposals only, minimum authorized context, server-decided provenance. */
export function brandoMarketingCases(connection: () => ReturnType<typeof connect>) {
  const setup = async (provider: ModelProvider = new DemoProvider()) => {
    const requests: MarketingGatewayRequest[] = [];
    const recording: ModelProvider = { name: provider.name, model: provider.model, generate: r => provider.generate(r), ...(provider.propose ? { propose: async (r: MarketingGatewayRequest) => { requests.push(r); return provider.propose!(r); } } : {}) };
    const db = connection().db, engine = new Engine(db, undefined, new ModelGateway(recording)), who = await seedIdentity(db);
    const brand = await engine.createBrand(who.token, 'Marca con Brando de marketing');
    const offerContent = (name: string) => ({ name, kind: 'SERVICE', audience: { customerDecisionVersionId: null, segment: 'Agencias pequeñas' }, need: 'Ordenar la estrategia', outcome: 'Estrategia aprobada', benefits: ['Menos retrabajo'], differentiators: [], conditions: '', proofIds: [], sourceDecisionVersionIds: [], hypothesisIds: [], price: null });
    const approvedOffer = async (name: string) => {
      const o = await engine.offerCommand(who.token, 'create', { brandId: brand.id, content: offerContent(name), idempotencyKey: randomUUID() });
      const v = await engine.offerCommand(who.token, 'submit', { brandId: brand.id, offerId: o.offerId, expectedRevision: 0 });
      await engine.offerCommand(who.token, 'decide', { brandId: brand.id, offerId: o.offerId, versionId: v.versionId, fingerprint: v.fingerprint, decision: 'APPROVE', criterion: 'Oferta aprobada', idempotencyKey: randomUUID() });
      return o.offerId as string;
    };
    const writes = async () => ({ deliverables: (await db.select().from(t.deliverables).where(eq(t.deliverables.brandId, brand.id))).length, versions: (await db.select().from(t.deliverableVersions).where(eq(t.deliverableVersions.brandId, brand.id))).length, audits: (await db.select().from(t.audits).where(eq(t.audits.brandId, brand.id))).length });
    const propose = (input: Record<string, unknown>, token = who.token) => engine.proposeDeliverable(token, { brandId: brand.id, ...input });
    return { db, engine, who, brand, requests, approvedOffer, offerContent, writes, propose };
  };

  describe('ADR-0030 · Brando for marketing', () => {
    it('evals: every fixture returns a draft of the requested type with zero writes; the request travels as untrusted data', async () => {
      const x = await setup();
      const offerId = await x.approvedOffer('Diagnóstico de marca');
      const before = await x.writes();
      for (const f of evals.fixtures) {
        const r = await x.propose({ type: f.type, offerId, request: f.request });
        expect(r.error, f.id).toBeNull();
        expect(r.demo).toBe(true);
        expect(r.proposal!.content.type, f.id).toBe(f.type);
        expect(r.proposal!.content.offerId, f.id).toBe(offerId);
        expect(r.assistanceProof, f.id).not.toBeNull();
      }
      expect(await x.writes()).toEqual(before); // zero writes, whatever the request says
      expect(x.requests.every(q => q.input.request.trust === 'UNTRUSTED_USER_TEXT')).toBe(true);
      expect(x.requests.map(q => q.input.request.text)).toEqual(evals.fixtures.map(f => f.request));
      expect(x.requests.every(q => q.promptVersion === 'brando-marketing-v1' && q.outputSchema === 'marketing-proposal-v1')).toBe(true);
    });

    it('minimum authorized context: approved offers only, no drafts, no other brand, no learning reflections', async () => {
      const x = await setup();
      const approved = await x.approvedOffer('Aprobada');
      const draft = await x.engine.offerCommand(x.who.token, 'create', { brandId: x.brand.id, content: x.offerContent('Borrador secreto'), idempotencyKey: randomUUID() });
      const other = await x.engine.createBrand(x.who.token, 'Otra marca');
      await x.engine.offerCommand(x.who.token, 'create', { brandId: other.id, content: x.offerContent('De otra marca'), idempotencyKey: randomUUID() });
      await x.propose({ type: 'SOCIAL_POST', offerId: null, request: '' });
      const packet = x.requests[0].input, sent = JSON.stringify(packet);
      expect(packet.offers.map(o => o.id)).toEqual([approved]);
      expect(sent).not.toContain('Borrador secreto');
      expect(sent).not.toContain('De otra marca');
      expect(packet.brand).toEqual({ name: 'Marca con Brando de marketing' });
      expect(Object.keys(packet).sort()).toEqual(['brand', 'contextVersion', 'decisions', 'includedIds', 'offers', 'priorities', 'request', 'target']);
      // An offer that is not approved cannot be the subject of a proposal.
      await expect(x.propose({ type: 'OFFER_COPY', offerId: draft.offerId, request: '' })).rejects.toMatchObject({ code: 'INVALID' });
      // Another workspace or an unassigned member never reach it.
      const stranger = await seedIdentity(x.db), member = await seedIdentity(x.db, 'MEMBER', x.who.workspaceId);
      await expect(x.propose({ type: 'AD', request: '' }, stranger.token)).rejects.toMatchObject({ code: 'NOT_FOUND' });
      await expect(x.propose({ type: 'AD', request: '' }, member.token)).rejects.toMatchObject({ code: 'FORBIDDEN' });
      await expect(x.propose({ type: 'PDF', request: '' })).rejects.toMatchObject({ code: 'INVALID' });
      await expect(x.propose({ type: 'AD', request: 'x'.repeat(1001) })).rejects.toMatchObject({ code: 'INVALID' });
    });

    it('provenance is decided by the server: only a current proof of this person, brand and type marks AI_ASSISTED, once', async () => {
      const x = await setup();
      const offerId = await x.approvedOffer('Diagnóstico');
      const r = await x.propose({ type: 'SOCIAL_POST', offerId, request: '' });
      const create = (proof: unknown, content = r.proposal!.content, token = x.who.token) => x.engine.deliverableCommand(token, 'create', { brandId: x.brand.id, content, idempotencyKey: randomUUID(), assistanceProof: proof });
      const provenance = async (id: unknown) => (await x.engine.deliverables(x.who.token, x.brand.id, null)).find(d => d.id === id)!.draft!.provenance;
      const edited = { ...r.proposal!.content, name: 'Editado por la persona' };
      const first = await create(r.assistanceProof!.proofId, edited);
      expect(await provenance(first.deliverableId)).toBe('AI_ASSISTED');
      const reused = await create(r.assistanceProof!.proofId);
      expect(await provenance(reused.deliverableId)).toBe('MANUAL'); // single use
      const ad = await x.propose({ type: 'AD', offerId, request: '' });
      const wrongType = await create(ad.assistanceProof!.proofId);
      expect(await provenance(wrongType.deliverableId)).toBe('MANUAL');
      // A client cannot claim provenance: an extra field in the content is discarded and the draft stays MANUAL.
      const claimed = await x.engine.deliverableCommand(x.who.token, 'create', { brandId: x.brand.id, content: { ...r.proposal!.content, provenance: 'AI_ASSISTED' }, idempotencyKey: randomUUID() });
      expect(await provenance(claimed.deliverableId)).toBe('MANUAL');
      // A proof issued to one person is useless to another member of the same brand.
      const member = await seedIdentity(x.db, 'MEMBER', x.who.workspaceId);
      await x.db.insert(t.assignments).values({ workspaceId: x.who.workspaceId, brandId: x.brand.id, userId: member.userId });
      const notMine = await x.propose({ type: 'SOCIAL_POST', offerId, request: '' });
      const byOther = await create(notMine.assistanceProof!.proofId, notMine.proposal!.content, member.token);
      expect(await provenance(byOther.deliverableId)).toBe('MANUAL');
    });

    it('output outside the packet or of the wrong shape is never a proposal; a provider without the surface leaves manual work', async () => {
      const bad: ModelProvider = { name: 'fixture', model: 'x', generate: async () => { throw new Error('unused'); }, propose: async r => ({ output: { ...demoMarketingProposal(r.input as MarketingPacket), sourceIds: ['id-de-otra-marca'] }, tokenIn: null, tokenOut: null }) };
      const x = await setup(bad);
      const r = await x.propose({ type: 'SOCIAL_POST', request: '' });
      expect(r).toMatchObject({ proposal: null, assistanceProof: null, error: 'INVALID_OUTPUT' });
      const wrongBody: ModelProvider = { name: 'fixture', model: 'x', generate: async () => { throw new Error('unused'); }, propose: async r2 => ({ output: { ...demoMarketingProposal(r2.input as MarketingPacket), body: { network: 'MYSPACE' } }, tokenIn: null, tokenOut: null }) };
      const y = await setup(wrongBody);
      expect(await y.propose({ type: 'SOCIAL_POST', request: '' })).toMatchObject({ proposal: null, error: 'INVALID_OUTPUT' });
      const none: ModelProvider = { name: 'legacy', model: 'x', generate: async () => { throw new Error('unused'); } };
      const z = await setup(none);
      expect(await z.propose({ type: 'AD', request: '' })).toMatchObject({ proposal: null, error: 'UNAVAILABLE' });
      await z.engine.deliverableCommand(z.who.token, 'create', { brandId: z.brand.id, content: { type: 'AD', name: 'Manual', offerId: null, sourceDecisionVersionIds: [], body: { channel: 'META', objective: 'LEADS', headlines: ['h'], descriptions: [], callToAction: '', landingUrl: null } }, idempotencyKey: randomUUID() });
      expect((await z.engine.deliverables(z.who.token, z.brand.id, null))[0].draft!.provenance).toBe('MANUAL');
    });

    it('if the brand information changes while Brando answers, nothing is returned (409)', async () => {
      let engineRef: Engine | null = null, change: (() => Promise<unknown>) | null = null;
      const racing: ModelProvider = { name: 'fixture', model: 'x', generate: async () => { throw new Error('unused'); }, propose: async r => { await change?.(); return { output: demoMarketingProposal(r.input as MarketingPacket), tokenIn: null, tokenOut: null }; } };
      const x = await setup(racing);
      engineRef = x.engine;
      change = () => x.approvedOffer('Aprobada durante la respuesta');
      await expect(x.propose({ type: 'SOCIAL_POST', request: '' })).rejects.toMatchObject({ code: 'CONFLICT' });
      expect(engineRef).toBeTruthy();
    });

    it('security review: the proof is bound to the offer and to an unchanged brand context; one person cannot evict the proofs of another', async () => {
      const x = await setup();
      const a = await x.approvedOffer('Oferta A');
      const b = await x.approvedOffer('Oferta B');
      const create = (proof: unknown, content: unknown) => x.engine.deliverableCommand(x.who.token, 'create', { brandId: x.brand.id, content, idempotencyKey: randomUUID(), assistanceProof: proof });
      const provenance = async (id: unknown) => (await x.engine.deliverables(x.who.token, x.brand.id, null)).find(d => d.id === id)!.draft!.provenance;
      // A proof for offer A does not mark hand-written content about offer B.
      const forA = await x.propose({ type: 'OFFER_COPY', offerId: a, request: '' });
      const aboutB = await create(forA.assistanceProof!.proofId, { ...forA.proposal!.content, offerId: b });
      expect(await provenance(aboutB.deliverableId)).toBe('MANUAL');
      // If the brand context changed after the proposal (a new approved offer), the draft is MANUAL.
      const before = await x.propose({ type: 'SOCIAL_POST', offerId: a, request: '' });
      await x.approvedOffer('Oferta C');
      const stale = await create(before.assistanceProof!.proofId, before.proposal!.content);
      expect(await provenance(stale.deliverableId)).toBe('MANUAL');
      const fresh = await x.propose({ type: 'SOCIAL_POST', offerId: a, request: '' });
      expect(await provenance((await create(fresh.assistanceProof!.proofId, fresh.proposal!.content)).deliverableId)).toBe('AI_ASSISTED');
      // Per-person cap: one person's many proposals only replace their own oldest proofs.
      const store = new MarketingAssistance(Date.now, 60_000, 512, 2);
      const scope = (userId: string) => ({ workspaceId: 'w', brandId: 'b', userId, type: 'AD' as const, offerId: null, contextVersion: 'c' });
      const other = store.issue(scope('otra-persona'));
      const mine = [1, 2, 3, 4, 5].map(() => store.issue(scope('una-persona')));
      expect(store.read(other.proofId, scope('otra-persona'), 'AD')).not.toBeNull();
      expect(mine.filter(p => store.read(p.proofId, scope('una-persona'), 'AD')).length).toBe(2);
    });
  });
}
