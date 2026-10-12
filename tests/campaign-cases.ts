import { describe, it, expect } from 'vitest';
import { randomBytes, randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import type { connect } from '../src/persistence/database.js';
import { Engine } from '../src/application/engine.js';
import { ExternalOperations } from '../src/application/external-operations.js';
import { SimulatedProvider } from '../src/application/provider-adapter.js';
import { SimulatedCanva } from '../src/application/canva-adapter.js';
import { createVault } from '../src/application/credential-vault.js';
import { budgetRule, campaignChecks, normalizeCampaign, plannedMinor } from '../src/domain/campaign.js';
import { seedIdentity } from '../scripts/seed.js';
import * as t from '../src/persistence/schema.js';

const databaseError = async (q: Promise<unknown>) => { try { await q; return 'no error'; } catch (e) { return String((e as { cause?: { message?: string } }).cause?.message ?? (e as Error).message); } };
const future = (days: number) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

/** Block 8 · campaigns in pause through the ADR-0031 queue (simulator), Canva (CNV-001/002), results and cycle review. */
export function campaignCases(connection: () => ReturnType<typeof connect>) {
  const setup = async () => {
    const db = connection().db, adapter = new SimulatedProvider(), canva = new SimulatedCanva();
    const ops = new ExternalOperations(db, createVault(randomBytes(32), 't1'), adapter);
    const engine = new Engine(db).useExternal({ ops, adapter, canva, simulated: true }), who = await seedIdentity(db);
    const brand = await engine.createBrand(who.token, 'Café Ñandú');
    const offerContent = (name: string) => ({ name, kind: 'SERVICE', audience: { customerDecisionVersionId: null, segment: 'Cafeterías' }, need: 'Café de especialidad', outcome: 'Café constante', benefits: ['Entrega semanal'], differentiators: [], conditions: '', proofIds: [], sourceDecisionVersionIds: [], hypothesisIds: [], price: null });
    const approvedOffer = async (name = 'Café para cafeterías') => {
      const o = await engine.offerCommand(who.token, 'create', { brandId: brand.id, content: offerContent(name), idempotencyKey: randomUUID() });
      const v = await engine.offerCommand(who.token, 'submit', { brandId: brand.id, offerId: o.offerId, expectedRevision: 0 });
      await engine.offerCommand(who.token, 'decide', { brandId: brand.id, offerId: o.offerId, versionId: v.versionId, fingerprint: v.fingerprint, decision: 'APPROVE', criterion: 'Oferta aprobada', idempotencyKey: randomUUID() });
      const offers = await engine.offers(who.token, brand.id);
      const offer = offers.find((x: { id: string }) => x.id === o.offerId) as { id: string; approved: { id: string } };
      return { offerId: offer.id, offerVersionId: offer.approved.id, name };
    };
    const cmd = (action: Parameters<Engine['campaignsCommand']>[1], input: Record<string, unknown>, token = who.token) => engine.campaignsCommand(token, action, { brandId: brand.id, ...input }) as Promise<Record<string, unknown>>;
    const read = async (token = who.token) => engine.campaigns(token, brand.id);
    const google = (offer: { offerId: string; offerVersionId: string; name: string }, over: Record<string, unknown> = {}) => ({ name: 'Búsqueda café', offer, destination: { kind: 'URL', url: 'https://cafe-nandu.mx/cafeterias' }, search: { keywords: [{ text: 'café para cafeterías', match: 'PHRASE' }], headlines: ['Café de origen', 'Entrega semanal', 'Prueba sin costo'], descriptions: ['Café de especialidad para tu barra.', 'Pedidos fijos cada semana.'] }, audience: { geo: ['Ciudad de México'] }, budget: { type: 'DAILY', amount: '150', currency: 'MXN' }, schedule: { startDate: future(2), endDate: future(31) }, ...over });
    /** Create → draft → review → approve; returns the campaign and its approved version. */
    const approvedCampaign = async (content?: Record<string, unknown>) => {
      const offer = await approvedOffer();
      const created = await cmd('create', { provider: 'GOOGLE_ADS', name: 'Búsqueda café', idempotencyKey: randomUUID() }) as { campaignId: string };
      let c = (await read()).campaigns.find(z => z.id === created.campaignId)!;
      await cmd('draft', { campaignId: c.id, expectedRevision: c.revision, content: content ?? google(offer) });
      c = (await read()).campaigns.find(z => z.id === created.campaignId)!;
      const sub = await cmd('submit', { campaignId: c.id, expectedRevision: c.revision }) as { versionId: string; fingerprint: string };
      await cmd('decide', { campaignId: c.id, versionId: sub.versionId, fingerprint: sub.fingerprint, decision: 'APPROVE', criterion: 'Revisado con el equipo', idempotencyKey: randomUUID() });
      return { campaignId: c.id, versionId: sub.versionId, offer };
    };
    const connect = async () => engine.connectSimulated(who.token, { brandId: brand.id, provider: 'GOOGLE_ADS' }) as Promise<{ connectionId: string; linkId: string }>;
    const request = async (campaignId: string, linkId: string, scenario = 'NORMAL', idempotencyKey = randomUUID()) => {
      const screen = await engine.campaignScreen(who.token, { brandId: brand.id, campaignId, linkId });
      return engine.campaignRequest(who.token, { brandId: brand.id, campaignId, linkId, screenFingerprint: screen.screenFingerprint, scenario, idempotencyKey });
    };
    const worker = await ops.registerWorker('test-host', process.pid);
    const work = async () => { const results: string[] = []; for (let i = 0; i < 5; i++) { const claim = await ops.claimNext(worker, brand.id); if (!claim) break; results.push(await ops.runJob(worker, claim)); } return results; };
    const job = async (jobId: string) => (await read()).campaigns.flatMap(c => c.operations).find(o => o.jobId === jobId)!;
    return { db, engine, ops, adapter, who, brand, cmd, read, google, approvedOffer, approvedCampaign, connect, request, work, job };
  };

  describe('Block 8 · campaigns, Canva and cycle review (simulator)', () => {
    it('domain: provider limits, dates, budget rules; a daily budget is an average, never a total cap; planned amount over the dates', () => {
      const c = normalizeCampaign({ name: 'x', search: { headlines: ['Un título demasiado largo para Google Ads', 'b'], descriptions: ['d'], keywords: [] }, audience: { geo: [] }, budget: { type: 'TOTAL', amount: '0', currency: 'MXN' }, schedule: { startDate: '2020-01-01' } }, 'GOOGLE_ADS');
      expect(c.budget.type).toBe('DAILY'); // Google: daily only
      const codes = campaignChecks(c, { today: '2026-10-11', offerApproved: false, destinationLive: true, imageValid: true, outdated: [] }).map(i => i.code);
      expect(codes).toEqual(expect.arrayContaining(['OFFER', 'DESTINATION', 'HEADLINES', 'DESCRIPTIONS', 'KEYWORDS', 'GEO', 'BUDGET', 'DATES']));
      expect(() => normalizeCampaign({ destination: { kind: 'URL', url: 'http://inseguro.mx' } }, 'META_ADS')).toThrow();
      const meta = normalizeCampaign({ name: 'm', budget: { type: 'TOTAL', amount: '1000.5', currency: 'USD' }, schedule: { startDate: '2026-11-01', endDate: '2026-11-10' } }, 'META_ADS');
      expect(meta.objective).toBe('TRAFFIC');
      expect(plannedMinor(meta)).toBe(100050);
      const daily = normalizeCampaign({ budget: { amount: '150' }, schedule: { startDate: '2026-11-01', endDate: '2026-11-10' } }, 'GOOGLE_ADS');
      expect(plannedMinor(daily)).toBe(150000);
      expect(budgetRule(daily)).toContain('no es un tope total');
      expect(plannedMinor(normalizeCampaign({ budget: { amount: '150' }, schedule: { startDate: '2026-11-01' } }, 'GOOGLE_ADS'))).toBeNull();
    });

    it('proposal, approval, request and result are separate acts: Brando writes nothing; approving queues nothing; the request needs AUTHORIZE_SPEND and the exact screen; a retry never duplicates; creation stops in pause', async () => {
      const x = await setup();
      const offer = await x.approvedOffer();
      const created = await x.cmd('create', { provider: 'GOOGLE_ADS', name: 'Búsqueda café', idempotencyKey: randomUUID() }) as { campaignId: string };
      // Brando proposes from approved material; nothing is written, queued or authorized.
      const before = (await x.db.select().from(t.campaignVersions).where(eq(t.campaignVersions.campaignId, created.campaignId)))[0].fingerprint;
      const proposal = await x.cmd('propose', { campaignId: created.campaignId }) as { proposal: { offer: { offerId: string } }; missing: string[]; mode: string };
      expect(proposal).toMatchObject({ mode: 'DETERMINISTIC_DEMO', proposal: { offer: { offerId: offer.offerId } } });
      expect(proposal.missing.join(' ')).toContain('Brando no propone gasto');
      expect((await x.db.select().from(t.campaignVersions).where(eq(t.campaignVersions.campaignId, created.campaignId)))[0].fingerprint).toBe(before);
      expect(await x.db.select().from(t.operationAuthorizations).where(eq(t.operationAuthorizations.brandId, x.brand.id))).toHaveLength(0);
      // Only this brand's references; a stale revision is a 409.
      const other = await x.engine.createBrand(x.who.token, 'Otra marca');
      let c = (await x.read()).campaigns[0];
      await expect(x.cmd('draft', { campaignId: c.id, expectedRevision: c.revision, content: x.google({ ...offer, offerId: randomUUID() }) })).rejects.toMatchObject({ code: 'INVALID' });
      await x.cmd('draft', { campaignId: c.id, expectedRevision: c.revision, content: x.google(offer) });
      await expect(x.cmd('draft', { campaignId: c.id, expectedRevision: c.revision, content: x.google(offer) })).rejects.toMatchObject({ code: 'CONFLICT' });
      c = (await x.read()).campaigns[0];
      expect(c.draft!.checks.filter(i => i.code !== 'OUTDATED')).toEqual([]);
      const sub = await x.cmd('submit', { campaignId: c.id, expectedRevision: c.revision }) as { versionId: string; fingerprint: string };
      await x.cmd('decide', { campaignId: c.id, versionId: sub.versionId, fingerprint: sub.fingerprint, decision: 'APPROVE', criterion: 'Revisado con el equipo', idempotencyKey: randomUUID() });
      expect(await x.db.select().from(t.externalJobs).where(eq(t.externalJobs.brandId, x.brand.id))).toHaveLength(0); // approving queues nothing
      // A member without AUTHORIZE_SPEND sees the campaign but cannot request; the screen must be the exact one confirmed.
      const { linkId } = await x.connect();
      const member = await seedIdentity(x.db, 'MEMBER', x.who.workspaceId);
      await x.db.insert(t.assignments).values({ workspaceId: x.who.workspaceId, brandId: x.brand.id, userId: member.userId });
      expect((await x.read(member.token)).canAuthorize).toBe(false);
      const screen = await x.engine.campaignScreen(x.who.token, { brandId: x.brand.id, campaignId: c.id, linkId });
      expect(screen).toMatchObject({ operation: 'CREATE_PAUSED', simulated: true, sequence: 1, summary: { accountLabel: 'Cuenta simulada (sin conexión real)', destination: 'https://cafe-nandu.mx/cafeterias', currency: 'MXN', budget: { kind: 'DAILY_AVERAGE', amountMinor: 15000 } } });
      expect(screen.effect).toContain('EN PAUSA');
      await expect(x.engine.campaignRequest(member.token, { brandId: x.brand.id, campaignId: c.id, linkId, screenFingerprint: screen.screenFingerprint, idempotencyKey: randomUUID() })).rejects.toMatchObject({ code: 'FORBIDDEN' });
      await expect(x.engine.campaignRequest(x.who.token, { brandId: x.brand.id, campaignId: c.id, linkId, screenFingerprint: 'otra', idempotencyKey: randomUUID() })).rejects.toMatchObject({ code: 'CONFLICT' });
      const key = randomUUID();
      const r1 = await x.engine.campaignRequest(x.who.token, { brandId: x.brand.id, campaignId: c.id, linkId, screenFingerprint: screen.screenFingerprint, idempotencyKey: key });
      const r2 = await x.engine.campaignRequest(x.who.token, { brandId: x.brand.id, campaignId: c.id, linkId, screenFingerprint: screen.screenFingerprint, idempotencyKey: key });
      expect(r2).toMatchObject({ jobId: r1.jobId, authorizationId: r1.authorizationId, replayed: true });
      await expect(x.request(c.id, linkId)).rejects.toMatchObject({ code: 'CONFLICT' }); // one open operation per campaign
      expect((await x.job(r1.jobId)).status).toBe('QUEUED');
      expect(await x.work()).toEqual(['DONE']);
      const done = await x.job(r1.jobId);
      expect(done).toMatchObject({ status: 'SUCCEEDED', authorization: { status: 'CONSUMED', sequence: 1 } });
      expect(done.steps.map(s => [s.key, s.status])).toEqual([['budget', 'SUCCEEDED'], ['campaign', 'SUCCEEDED'], ['ad_group', 'SUCCEEDED'], ['keywords', 'SUCCEEDED'], ['ad', 'SUCCEEDED']]);
      expect(x.adapter.calls).toHaveLength(5); // one send per step
      expect(x.adapter.calls.every(call => call.credential === '[redacted]')).toBe(true);
      // Status: the simulator reports PAUSED and zero spend, stored as SIMULATED, never as provider data.
      const status = await x.engine.campaignReadStatus(x.who.token, { brandId: x.brand.id, campaignId: c.id });
      expect(status).toMatchObject({ simulated: true, reading: { status: 'PAUSED', spendMinor: 0 } });
      const data = await x.read();
      expect(data.campaigns[0].metrics[0]).toMatchObject({ source: 'SIMULATED', providerStatus: 'PAUSED', reviewStatus: 'UNDER_REVIEW' });
      expect(JSON.stringify(data)).not.toMatch(/simulated-[0-9a-f-]{36}|credentialCiphertext/); // no secret ever leaves
      // No activation path exists in this phase.
      await expect(x.engine.campaignsCommand(x.who.token, 'activate' as never, { brandId: x.brand.id })).rejects.toMatchObject({ code: 'INVALID' });
      // Another workspace never reads the campaigns or reconciles this job.
      const outsider = await seedIdentity(x.db);
      await expect(x.engine.campaigns(outsider.token, x.brand.id)).rejects.toMatchObject({ code: 'NOT_FOUND' });
      await expect(x.engine.campaignReconcile(outsider.token, { brandId: x.brand.id, jobId: r1.jobId })).rejects.toMatchObject({ code: 'NOT_FOUND' });
      void other;
      // Database guard: an approved campaign version is immutable.
      expect(await databaseError(x.db.update(t.campaignVersions).set({ content: {} }).where(eq(t.campaignVersions.id, sub.versionId)))).toMatch(/immutable|not allowed/);
    });

    it('lost response after the creation: pending verification, never resent; no new operation can bypass it; reconciliation links what exists and the rest continues once', async () => {
      const x = await setup();
      const a = await x.approvedCampaign();
      const { linkId } = await x.connect();
      const r = await x.request(a.campaignId, linkId, 'LOST_RESPONSE');
      expect(await x.work()).toEqual(['NEEDS_CHECK']);
      let j = await x.job(r.jobId);
      expect(j.status).toBe('NEEDS_CHECK');
      const campaign = j.steps.find(s => s.key === 'campaign')!;
      expect(campaign.status).toBe('NEEDS_CHECK');
      expect(campaign.attempts[0].outcomes.map(o => [o.kind, o.code])).toEqual([['AMBIGUOUS', 'DEADLINE_EXCEEDED']]);
      expect(j.steps.filter(s => s.status === 'PENDING').map(s => s.key)).toEqual(['ad_group', 'keywords', 'ad']); // dependents not sent
      expect(await x.work()).toEqual([]); // nothing to claim: an uncertain step is never resent
      expect(x.adapter.createdCount(campaign.reference)).toBe(1);
      await expect(x.request(a.campaignId, linkId)).rejects.toMatchObject({ code: 'CONFLICT' }); // EXT-021
      const rec = await x.engine.campaignReconcile(x.who.token, { brandId: x.brand.id, jobId: r.jobId });
      expect(rec.results).toEqual([{ step: 'campaign', resolution: 'FOUND' }]);
      expect(await x.work()).toEqual(['DONE']);
      j = await x.job(r.jobId);
      expect(j.status).toBe('SUCCEEDED');
      expect(x.adapter.calls.filter(call => call.remoteTag === campaign.reference)).toHaveLength(1); // created once, never repeated
    });

    it('resource visible with delay: an empty lookup keeps it pending (not «not created»); once visible it is linked', async () => {
      const x = await setup();
      const a = await x.approvedCampaign();
      const { linkId } = await x.connect();
      const r = await x.request(a.campaignId, linkId, 'LOST_AND_DELAYED');
      await x.work();
      expect((await x.engine.campaignReconcile(x.who.token, { brandId: x.brand.id, jobId: r.jobId })).results).toEqual([{ step: 'campaign', resolution: 'UNRESOLVED' }]);
      expect((await x.job(r.jobId)).status).toBe('NEEDS_CHECK');
      await expect(x.engine.campaignRetry(x.who.token, { brandId: x.brand.id, jobId: r.jobId, stepKey: 'campaign', criterion: 'No lo veo en la cuenta' })).rejects.toMatchObject({ code: 'CONFLICT' }); // «no lo veo» is not evidence
      await x.engine.simulatorRelease(x.who.token, { brandId: x.brand.id, jobId: r.jobId, stepKey: 'campaign' });
      expect((await x.engine.campaignReconcile(x.who.token, { brandId: x.brand.id, jobId: r.jobId })).results).toEqual([{ step: 'campaign', resolution: 'FOUND' }]);
      await x.work();
      expect((await x.job(r.jobId)).status).toBe('SUCCEEDED');
    });

    it('provider limit and insufficient access are rejections without effect: the limit is retried only by a person under the valid authorization; expired access sends nothing', async () => {
      const x = await setup();
      const a = await x.approvedCampaign();
      const { linkId, connectionId } = await x.connect();
      const r = await x.request(a.campaignId, linkId, 'RATE_LIMIT');
      expect(await x.work()).toEqual(['REJECTED']);
      let j = await x.job(r.jobId);
      expect(j).toMatchObject({ status: 'FAILED', lastErrorCode: 'RESOURCE_EXHAUSTED' });
      expect(await x.work()).toEqual([]); // no automatic retry
      await expect(x.engine.campaignRetry(x.who.token, { brandId: x.brand.id, jobId: r.jobId, stepKey: 'budget', criterion: 'corto' })).rejects.toMatchObject({ code: 'INVALID' });
      await x.engine.campaignRetry(x.who.token, { brandId: x.brand.id, jobId: r.jobId, stepKey: 'budget', criterion: 'El proveedor limitó; reintento autorizado' });
      expect(await x.work()).toEqual(['DONE']);
      j = await x.job(r.jobId);
      expect(j.status).toBe('SUCCEEDED');
      expect(j.steps[0].attempts.map(at => at.outcomes[0].kind)).toEqual(['PROVIDER_REJECTED', 'PROVIDER_SUCCESS']); // earlier attempt kept
      // Insufficient access on another campaign.
      const b = await x.approvedCampaign();
      const denied = await x.request(b.campaignId, linkId, 'PERMISSION_DENIED');
      await x.work();
      expect(await x.job(denied.jobId)).toMatchObject({ status: 'FAILED', lastErrorCode: 'PERMISSION_DENIED' });
      // Expired access before sending: the worker sends nothing and says why.
      const c = await x.approvedCampaign();
      const queued = await x.request(c.campaignId, linkId);
      await x.engine.connectionStatus(x.who.token, { brandId: x.brand.id, connectionId, status: 'EXPIRED' });
      const sent = x.adapter.calls.length;
      await x.work();
      expect(await x.job(queued.jobId)).toMatchObject({ status: 'FAILED', blockedReason: 'CONNECTION_UNAVAILABLE' });
      expect(x.adapter.calls.length).toBe(sent);
      await expect(x.engine.campaignScreen(x.who.token, { brandId: x.brand.id, campaignId: c.campaignId, linkId })).rejects.toMatchObject({ code: 'CONFLICT' });
    });

    it('a newer approved version after the authorization: the queued step is not sent (CONTENT_CHANGED); cancelling before sending says nothing was sent', async () => {
      const x = await setup();
      const a = await x.approvedCampaign();
      const { linkId } = await x.connect();
      const r = await x.request(a.campaignId, linkId);
      let c = (await x.read()).campaigns.find(z => z.id === a.campaignId)!;
      await x.cmd('new-draft', { campaignId: c.id, expectedRevision: c.revision });
      c = (await x.read()).campaigns.find(z => z.id === a.campaignId)!;
      await x.cmd('draft', { campaignId: c.id, expectedRevision: c.revision, content: x.google(a.offer, { budget: { type: 'DAILY', amount: '300', currency: 'MXN' } }) });
      c = (await x.read()).campaigns.find(z => z.id === a.campaignId)!;
      const sub = await x.cmd('submit', { campaignId: c.id, expectedRevision: c.revision }) as { versionId: string; fingerprint: string };
      await x.cmd('decide', { campaignId: c.id, versionId: sub.versionId, fingerprint: sub.fingerprint, decision: 'APPROVE', criterion: 'Presupuesto ajustado', idempotencyKey: randomUUID() });
      await x.work();
      expect(await x.job(r.jobId)).toMatchObject({ status: 'FAILED', blockedReason: 'CONTENT_CHANGED' });
      expect(x.adapter.calls).toHaveLength(0);
      // Cancelling a queued operation of another campaign: nothing was sent.
      const b = await x.approvedCampaign();
      const q = await x.request(b.campaignId, linkId);
      expect(await x.engine.campaignCancel(x.who.token, { brandId: x.brand.id, authorizationId: q.authorizationId })).toMatchObject({ status: 'CANCELLED', inFlight: false });
      expect((await x.job(q.jobId)).status).toBe('CANCELLED');
    });

    it('results keep sources apart: planned budget is not spend, simulator readings are labelled and never provider data, opportunities are not sales, no ROAS without real spend and revenue', async () => {
      const x = await setup();
      const a = await x.approvedCampaign();
      const { linkId } = await x.connect();
      await x.request(a.campaignId, linkId); await x.work();
      await x.engine.campaignReadStatus(x.who.token, { brandId: x.brand.id, campaignId: a.campaignId });
      const r = await x.engine.results(x.who.token, x.brand.id);
      const m = Object.fromEntries(r.campaigns[0].metrics.map(z => [z.id.replace(`_${a.campaignId}`, ''), z]));
      expect(m.planned).toMatchObject({ available: true, kind: 'PLANNED_BUDGET', value: 4500, currency: 'MXN' }); // 150 × 30 days
      expect(m.spend).toMatchObject({ available: false, state: 'NOT_CONNECTED', kind: 'PROVIDER' });
      expect(m.simulated).toMatchObject({ available: true, kind: 'SIMULATED', value: 0 });
      expect(m.arrived).toMatchObject({ available: true, value: 0 });
      expect(m.sales).toMatchObject({ available: false, state: 'NO_DATA' });
      expect(m.roas).toMatchObject({ available: false });
      expect((m.roas as { reason?: string }).reason).toContain('gasto real');
    });

    it('cycle review: results and limitations come from the server; Brando suggests; the human decision needs a criterion; saving never changes the plan, campaigns or strategy', async () => {
      const x = await setup();
      const a = await x.approvedCampaign();
      const draft = await x.engine.cycleReview(x.who.token, x.brand.id);
      expect(draft.limitations.join(' ')).toContain('No hay cuentas reales de Google o Meta');
      expect(draft.suggestions.mode).toBe('DETERMINISTIC_DEMO');
      expect(draft.suggestions.items.some(i => i.text.includes('Búsqueda café'))).toBe(true);
      const snapshot = async () => ({ versions: (await x.db.select().from(t.campaignVersions).where(eq(t.campaignVersions.brandId, x.brand.id))).map(v => v.fingerprint).sort(), decisions: (await x.db.select().from(t.versions)).length, plans: (await x.db.select().from(t.planActions).where(eq(t.planActions.brandId, x.brand.id))).length });
      const before = await snapshot();
      await expect(x.engine.cycleReviewSave(x.who.token, { brandId: x.brand.id, periodStart: '2026-09-11', periodEnd: '2026-10-11', decision: 'ADJUST', criterion: 'corto', idempotencyKey: randomUUID() })).rejects.toMatchObject({ code: 'INVALID' });
      const key = randomUUID();
      const input = { brandId: x.brand.id, periodStart: '2026-09-11', periodEnd: '2026-10-11', learnings: 'Sin datos reales todavía', proposals: [{ text: draft.suggestions.items[0].text, origin: 'BRANDO' }, { text: 'Conectar la cuenta real cuando haya acceso', origin: 'PERSON' }], decision: 'RETEST', criterion: 'Volvemos a probar con datos reales', results: { forged: true }, idempotencyKey: key };
      const saved = await x.engine.cycleReviewSave(x.who.token, input);
      expect(await x.engine.cycleReviewSave(x.who.token, input)).toEqual({ ...saved, replayed: true });
      const [row] = await x.db.select().from(t.cycleReviews).where(eq(t.cycleReviews.id, saved.reviewId));
      expect(row.results).not.toHaveProperty('forged'); // computed by the server
      expect(row.proposals.map(p => [p.origin, p.status])).toEqual([['BRANDO', 'PROPOSED_FOR_NEXT_PERIOD'], ['PERSON', 'PROPOSED_FOR_NEXT_PERIOD']]);
      expect(await snapshot()).toEqual(before);
      expect(await databaseError(x.db.update(t.cycleReviews).set({ criterion: 'cambiado después' }).where(eq(t.cycleReviews.id, saved.reviewId)))).toMatch(/append-only/);
      void a;
    });

    it('CNV-001/002 · Canva: the approved brief goes to the person\'s own connection; retrieving creates a NEW draft that needs review; the approved version never changes; a browser cannot forge the design; capabilities say what is simulated or unavailable', async () => {
      const x = await setup();
      const brief = { type: 'DESIGN_BRIEF', name: 'Carrusel de lanzamiento', offerId: null, sourceDecisionVersionIds: [], body: { for: 'CANVA', piece: 'Carrusel', format: '1080×1350', audience: 'Cafeterías', message: 'Café de origen', mustInclude: '', avoid: '', dueDate: null } };
      const d = await x.engine.deliverableCommand(x.who.token, 'create', { brandId: x.brand.id, content: brief, idempotencyKey: randomUUID() }) as { deliverableId: string };
      // Forged design in a draft is replaced by the server's (none).
      await x.engine.deliverableCommand(x.who.token, 'draft', { brandId: x.brand.id, deliverableId: d.deliverableId, expectedRevision: 0, content: { ...brief, body: { ...brief.body, design: { provider: 'CANVA', designRef: 'falso', format: 'PNG', sha256: 'a'.repeat(64), pages: 1, simulated: false, retrievedAt: new Date().toISOString() } } } });
      const [draftRow] = await x.db.select().from(t.deliverableVersions).where(eq(t.deliverableVersions.deliverableId, d.deliverableId));
      expect((draftRow.content as { body: Record<string, unknown> }).body.design).toBeUndefined();
      await expect(x.engine.canvaSend(x.who.token, { brandId: x.brand.id, deliverableId: d.deliverableId, idempotencyKey: randomUUID() })).rejects.toMatchObject({ code: 'CONFLICT' }); // not approved
      const sub = await x.engine.deliverableCommand(x.who.token, 'submit', { brandId: x.brand.id, deliverableId: d.deliverableId, expectedRevision: 1 }) as { versionId: string; fingerprint: string };
      await x.engine.deliverableCommand(x.who.token, 'decide', { brandId: x.brand.id, deliverableId: d.deliverableId, versionId: sub.versionId, fingerprint: sub.fingerprint, decision: 'APPROVE', criterion: 'Brief aprobado', idempotencyKey: randomUUID() });
      await expect(x.engine.canvaSend(x.who.token, { brandId: x.brand.id, deliverableId: d.deliverableId, idempotencyKey: randomUUID() })).rejects.toMatchObject({ code: 'CONFLICT' }); // no Canva connection
      await x.engine.connectSimulated(x.who.token, { brandId: x.brand.id, provider: 'CANVA' });
      const key = randomUUID();
      const sent = await x.engine.canvaSend(x.who.token, { brandId: x.brand.id, deliverableId: d.deliverableId, idempotencyKey: key }) as { designId: string; designRef: string };
      expect(sent).toMatchObject({ simulated: true, replayed: false });
      expect(await x.engine.canvaSend(x.who.token, { brandId: x.brand.id, deliverableId: d.deliverableId, idempotencyKey: key })).toMatchObject({ designId: sent.designId, replayed: true });
      const got = await x.engine.canvaRetrieve(x.who.token, { brandId: x.brand.id, designId: sent.designId }) as { versionId: string };
      const versions = await x.db.select().from(t.deliverableVersions).where(eq(t.deliverableVersions.deliverableId, d.deliverableId));
      const approved = versions.find(v => v.id === sub.versionId)!, fresh = versions.find(v => v.id === got.versionId)!;
      expect(approved.status).toBe('APPROVED');
      expect((approved.content as { body: Record<string, unknown> }).body.design).toBeUndefined();
      expect(fresh).toMatchObject({ status: 'DRAFT', sequence: 2 });
      expect((fresh.content as { body: { design: Record<string, unknown> } }).body.design).toMatchObject({ provider: 'CANVA', designRef: sent.designRef, simulated: true });
      expect(await x.engine.canvaRetrieve(x.who.token, { brandId: x.brand.id, designId: sent.designId })).toMatchObject({ versionId: got.versionId, replayed: true });
      const caps = (await x.read()).canvaCapabilities;
      expect(caps.find(cp => cp.key === 'AUTOFILL')!.state).toBe('UNAVAILABLE');
      expect(caps.every(cp => cp.state !== 'VERIFIED')).toBe(true); // nothing is «verified» with a simulator
      // Another person in the workspace cannot retrieve with someone else's Canva connection.
      const member = await seedIdentity(x.db, 'ADMIN', x.who.workspaceId);
      const second = await x.engine.canvaSend(x.who.token, { brandId: x.brand.id, deliverableId: d.deliverableId, idempotencyKey: randomUUID() }) as { designId: string };
      await expect(x.engine.canvaRetrieve(member.token, { brandId: x.brand.id, designId: second.designId })).rejects.toMatchObject({ code: 'CONFLICT' });
      expect(await x.db.select().from(t.canvaDesigns).where(and(eq(t.canvaDesigns.id, second.designId), eq(t.canvaDesigns.status, 'CREATED')))).toHaveLength(1);
    });
  });
}
