import { describe, it, expect } from 'vitest';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { KitAssetInfo } from '../src/domain/kit-assets.js';
import { and, eq } from 'drizzle-orm';
import type { connect } from '../src/persistence/database.js';
import { Engine } from '../src/application/engine.js';
import { DEFAULT_EXTERNAL_CONFIG, ExternalOperations, type ExternalConfig } from '../src/application/external-operations.js';
import { SimulatedProvider } from '../src/application/provider-adapter.js';
import { SimulatedCanva } from '../src/application/canva-adapter.js';
import { createDemoExternal } from '../src/transport/external-demo.js';
import { createVault } from '../src/application/credential-vault.js';
import { budgetRule, campaignChecks, normalizeCampaign, plannedMinor } from '../src/domain/campaign.js';
import { seedIdentity } from '../scripts/seed.js';
import * as t from '../src/persistence/schema.js';

const databaseError = async (q: Promise<unknown>) => { try { await q; return 'no error'; } catch (e) { return String((e as { cause?: { message?: string } }).cause?.message ?? (e as Error).message); } };
const future = (days: number) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

/** Block 8 · campaigns in pause through the ADR-0031 queue (simulator), Canva (CNV-001/002), results and cycle review. */
export function campaignCases(connection: () => ReturnType<typeof connect>) {
  const setup = async (config: Partial<ExternalConfig> = {}) => {
    let now = Date.now();
    const clock = () => new Date(now++), advance = (ms: number) => { now += ms; }; // monotonic, like real time
    const hooks: { beforeNetworkWrite?: (attemptId: string) => Promise<void> | void } = {};
    const db = connection().db, adapter = new SimulatedProvider(clock), canva = new SimulatedCanva();
    const ops = new ExternalOperations(db, createVault(randomBytes(32), 't1'), adapter, { ...DEFAULT_EXTERNAL_CONFIG, ...config }, clock, hooks);
    const engine = new Engine(db).useExternal({ ops, adapter, canva, simulated: true }), who = await seedIdentity(db);
    const brand = await engine.createBrand(who.token, 'Café Ñandú');
    const offerContent = (name: string) => ({ name, kind: 'SERVICE', audience: { customerDecisionVersionId: null, segment: 'Cafeterías' }, need: 'Café de especialidad', outcome: 'Café constante', benefits: ['Entrega semanal'], differentiators: [], conditions: '', proofIds: [], sourceDecisionVersionIds: [], hypothesisIds: [], price: null });
    const approvedOffer = async (name = 'Café para cafeterías') => {
      const o = await engine.offerCommand(who.token, 'create', { brandId: brand.id, content: offerContent(name), idempotencyKey: randomUUID() });
      const v = await engine.offerCommand(who.token, 'submit', { reviewerId: who.userId, brandId: brand.id, offerId: o.offerId, expectedRevision: 0 });
      await engine.offerCommand(who.token, 'decide', { brandId: brand.id, offerId: o.offerId, versionId: v.versionId, fingerprint: v.fingerprint, decision: 'APPROVE', criterion: 'Oferta aprobada', idempotencyKey: randomUUID() });
      const offers = await engine.offers(who.token, brand.id);
      const offer = offers.find((x: { id: string }) => x.id === o.offerId) as { id: string; approved: { id: string } };
      return { offerId: offer.id, offerVersionId: offer.approved.id, name };
    };
    const cmd = (action: Parameters<Engine['campaignsCommand']>[1], input: Record<string, unknown>, token = who.token) => engine.campaignsCommand(token, action, { brandId: brand.id, ...input }) as Promise<Record<string, unknown>>;
    const read = async (token = who.token) => engine.campaigns(token, brand.id);
    const google = (offer: { offerId: string; offerVersionId: string; name: string }, over: Record<string, unknown> = {}) => ({ name: 'Búsqueda café', offer, destination: { kind: 'URL', url: 'https://cafe-nandu.mx/cafeterias' }, search: { keywords: [{ text: 'café para cafeterías', match: 'PHRASE' }], headlines: ['Café de origen', 'Entrega semanal', 'Prueba sin costo'], descriptions: ['Café de especialidad para tu barra.', 'Pedidos fijos cada semana.'] }, audience: { geo: ['Ciudad de México'] }, budget: { type: 'DAILY', amount: '150', currency: 'MXN' }, schedule: { startDate: future(2), endDate: future(31) }, ...over });
    /** Create → draft → review → approve; returns the campaign and its approved version. */
    const approvedCampaignFor = async (provider: 'GOOGLE_ADS' | 'META_ADS', content: Record<string, unknown>, objective?: string) => {
      const created = await cmd('create', { provider, objective, name: String(content.name ?? 'Campaña'), idempotencyKey: randomUUID() }) as { campaignId: string };
      let c = (await read()).campaigns.find(z => z.id === created.campaignId)!;
      await cmd('draft', { campaignId: c.id, expectedRevision: c.revision, content });
      c = (await read()).campaigns.find(z => z.id === created.campaignId)!;
      const sub = await cmd('submit', { campaignId: c.id, expectedRevision: c.revision }) as { versionId: string; fingerprint: string };
      await cmd('decide', { campaignId: c.id, versionId: sub.versionId, fingerprint: sub.fingerprint, decision: 'APPROVE', criterion: 'Revisado con el equipo', idempotencyKey: randomUUID() });
      return { campaignId: c.id, versionId: sub.versionId };
    };
    /** A site with a live publication (rows as the publisher leaves them), to be a lead campaign destination. */
    const liveSite = async () => {
      const siteId = randomUUID(), versionId = randomUUID(), now = new Date();
      await db.insert(t.sites).values({ id: siteId, workspaceId: who.workspaceId, brandId: brand.id, name: 'Sitio', slug: `sitio-${randomUUID().slice(0, 8)}`, goal: 'LEADS', status: 'ACTIVE', revision: 0, createdBy: who.userId, idempotencyKey: randomUUID(), createdAt: now, updatedAt: now });
      await db.insert(t.siteVersions).values({ id: versionId, workspaceId: who.workspaceId, brandId: brand.id, siteId, sequence: 1, status: 'APPROVED', content: {}, fingerprint: 'f'.repeat(64), measurementFingerprint: 'm'.repeat(64), manifest: {}, provenance: 'MANUAL', createdBy: who.userId, createdAt: now, decidedAt: now });
      await db.insert(t.sitePublications).values({ id: randomUUID(), workspaceId: who.workspaceId, brandId: brand.id, siteId, versionId, status: 'PUBLISHED', host: 'x.localhost:3999', fingerprint: 'f'.repeat(64), publishedBy: who.userId, idempotencyKey: randomUUID(), createdAt: now, completedAt: now });
      await db.update(t.sites).set({ approvedVersionId: versionId, publishedVersionId: versionId }).where(eq(t.sites.id, siteId));
      return { siteId, versionId };
    };
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
    const connect = async (provider: 'GOOGLE_ADS' | 'META_ADS' = 'GOOGLE_ADS') => engine.connectSimulated(who.token, { brandId: brand.id, provider }) as Promise<{ connectionId: string; linkId: string }>;
    const request = async (campaignId: string, linkId: string, scenario = 'NORMAL', idempotencyKey = randomUUID(), operation = 'CREATE_PAUSED') => {
      const screen = await engine.campaignScreen(who.token, { brandId: brand.id, campaignId, linkId, operation });
      return engine.campaignRequest(who.token, { brandId: brand.id, campaignId, linkId, operation, screenFingerprint: screen.screenFingerprint, scenario, idempotencyKey });
    };
    const worker = await ops.registerWorker('test-host', process.pid);
    const work = async () => { const results: string[] = []; for (let i = 0; i < 5; i++) { const claim = await ops.claimNext(worker, brand.id); if (!claim) break; results.push(await ops.runJob(worker, claim)); } return results; };
    const job = async (jobId: string) => (await read()).campaigns.flatMap(c => c.operations).find(o => o.jobId === jobId)!;
    /** A valid raster image of the kit (metadata as the kit inspector leaves it) for Meta ads. */
    const kitImage = async () => (await engine.registerKitAsset(who.token, brand.id, { id: randomUUID(), role: 'REFERENCE', originalName: 'taza.png', info: { format: 'PNG', kind: 'RASTER', mediaType: 'image/png', width: 1080, height: 1080, alpha: false, previewable: true } as KitAssetInfo, bytes: 1000, sha256: createHash('sha256').update(randomUUID()).digest('hex'), storageKey: `${who.workspaceId}/${brand.id}/kit/${randomUUID()}` })).assetId as string;
    return { db, engine, ops, adapter, who, brand, cmd, read, google, approvedOffer, approvedCampaign, approvedCampaignFor, liveSite, connect, request, work, job, hooks, advance, kitImage };
  };

  describe('Block 8 · campaigns, Canva and cycle review (simulator)', () => {
    it('adapter separation: the DEMO wiring only ever builds the simulators (no real provider can be selected) and refuses to run in production', async () => {
      const root = process.env.BRANDOPOLIS_EXTERNAL_ROOT;
      process.env.BRANDOPOLIS_EXTERNAL_ROOT = mkdtempSync(join(tmpdir(), 'bp-external-'));
      const external = createDemoExternal({} as never);
      expect([external.adapter.name, external.canva.name, external.simulated]).toEqual(['SIMULATOR', 'SIMULATOR', true]);
      expect(external.adapter).toBeInstanceOf(SimulatedProvider);
      const env = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      try { expect(() => createDemoExternal({} as never)).toThrow(); } finally { process.env.NODE_ENV = env; if (root === undefined) delete process.env.BRANDOPOLIS_EXTERNAL_ROOT; else process.env.BRANDOPOLIS_EXTERNAL_ROOT = root; }
    });

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
      // Security review: a version nobody approved can never be cited (a draft offer version of this same brand).
      const draftOffer = await x.engine.offerCommand(x.who.token, 'create', { brandId: x.brand.id, content: { name: 'Borrador', kind: 'SERVICE', audience: { customerDecisionVersionId: null, segment: 'x' }, need: 'x', outcome: 'x', benefits: [], differentiators: [], conditions: '', proofIds: [], sourceDecisionVersionIds: [], hypothesisIds: [], price: null }, idempotencyKey: randomUUID() }) as { offerId: string; versionId: string };
      await expect(x.cmd('draft', { campaignId: c.id, expectedRevision: c.revision, content: x.google({ offerId: draftOffer.offerId, offerVersionId: draftOffer.versionId, name: 'Borrador' }) })).rejects.toMatchObject({ code: 'INVALID', message: 'Only an approved version of the offer can be cited' });
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
      // Security review: a member granted MANAGE_CONNECTIONS who did not connect the account cannot change it, and a brand
      // without a link to the connection does not see it.
      await x.engine.changeBrandCapability(x.who.token, { brandId: x.brand.id, userId: member.userId, capability: 'MANAGE_CONNECTIONS', grant: true });
      const connId = (await x.read()).connections.ads[0].connectionId;
      await expect(x.engine.connectionStatus(member.token, { brandId: x.brand.id, connectionId: connId, status: 'EXPIRED' })).rejects.toMatchObject({ code: 'FORBIDDEN' });
      await expect(x.engine.connectionStatus(x.who.token, { brandId: other.id, connectionId: connId, status: 'EXPIRED' })).rejects.toMatchObject({ code: 'NOT_FOUND' });
      expect((await x.read()).connections.ads[0].status).toBe('ACTIVE');
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
      const sub = await x.engine.deliverableCommand(x.who.token, 'submit', { reviewerId: x.who.userId, brandId: x.brand.id, deliverableId: d.deliverableId, expectedRevision: 1 }) as { versionId: string; fingerprint: string };
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

    it('Google and Meta, full local path: creation in pause → second, independent authorization → simulated activation → status → pause without amount confirmation; operations are bound to the created account and version', async () => {
      for (const provider of ['GOOGLE_ADS', 'META_ADS'] as const) {
        const x = await setup();
        const offer = await x.approvedOffer();
        const content = provider === 'GOOGLE_ADS' ? x.google(offer) : { ...x.google(offer), search: undefined, social: { primaryText: 'Café de origen para tu barra', headline: 'Café semanal', imageAssetId: await x.kitImage(), imageAlt: 'Una taza de café' } };
        const a = provider === 'GOOGLE_ADS' ? await x.approvedCampaign() : await x.approvedCampaignFor('META_ADS', content);
        const { linkId } = await x.connect(provider);
        const create = await x.request(a.campaignId, linkId);
        await x.work();
        expect((await x.job(create.jobId)).status).toBe('SUCCEEDED');
        expect((await x.read()).campaigns.find(c => c.id === a.campaignId)!.delivery).toBe('PAUSED');
        // Second authorization: its own screen, fingerprint, authorization and job; AUTHORIZE_SPEND; same account.
        const screen = await x.engine.campaignScreen(x.who.token, { brandId: x.brand.id, campaignId: a.campaignId, linkId: 'otro', operation: 'ACTIVATE' });
        expect(screen).toMatchObject({ operation: 'ACTIVATE', linkId, sequence: 1, summary: { budget: { kind: 'DAILY_AVERAGE' } } });
        expect(screen.effect).toContain('segunda autorización');
        const member = await seedIdentity(x.db, 'MEMBER', x.who.workspaceId);
        await x.db.insert(t.assignments).values({ workspaceId: x.who.workspaceId, brandId: x.brand.id, userId: member.userId });
        await expect(x.engine.campaignRequest(member.token, { brandId: x.brand.id, campaignId: a.campaignId, linkId, operation: 'ACTIVATE', screenFingerprint: screen.screenFingerprint, idempotencyKey: randomUUID() })).rejects.toMatchObject({ code: 'FORBIDDEN' });
        const act = await x.request(a.campaignId, linkId, 'NORMAL', randomUUID(), 'ACTIVATE');
        expect(act.authorizationId).not.toBe(create.authorizationId);
        expect(act.jobId).not.toBe(create.jobId);
        await x.work();
        const activation = await x.job(act.jobId);
        expect(activation).toMatchObject({ operation: 'ACTIVATE', status: 'SUCCEEDED', steps: [{ key: 'activate', status: 'SUCCEEDED' }] });
        expect((await x.read()).campaigns.find(c => c.id === a.campaignId)!.delivery).toBe('ACTIVE');
        const reading = await x.engine.campaignReadStatus(x.who.token, { brandId: x.brand.id, campaignId: a.campaignId });
        expect(reading).toMatchObject({ simulated: true, reading: { status: 'ENABLED', providerConversions: 3 } });
        await expect(x.request(a.campaignId, linkId, 'NORMAL', randomUUID(), 'ACTIVATE')).rejects.toMatchObject({ code: 'CONFLICT' }); // already active
        // Pause: AUTHORIZE_SPEND, no amount (budget null), its own authorization.
        const pauseScreen = await x.engine.campaignScreen(x.who.token, { brandId: x.brand.id, campaignId: a.campaignId, linkId, operation: 'PAUSE' });
        expect(pauseScreen.summary.budget).toBeNull();
        const pause = await x.request(a.campaignId, linkId, 'NORMAL', randomUUID(), 'PAUSE');
        await x.work();
        expect((await x.job(pause.jobId)).status).toBe('SUCCEEDED');
        expect((await x.read()).campaigns.find(c => c.id === a.campaignId)!.delivery).toBe('PAUSED');
        expect((await x.engine.campaignReadStatus(x.who.token, { brandId: x.brand.id, campaignId: a.campaignId })).reading).toMatchObject({ status: 'PAUSED', spendMinor: 0 });
        expect(x.adapter.calls.map(cl => cl.stepKey).filter(k => k === 'activate' || k === 'pause')).toEqual(['activate', 'pause']);
        expect(x.adapter.calls.filter(cl => cl.stepKey === 'activate')[0].parentIds.campaign).toMatch(/^sim-/); // acts on what was created
      }
    });

    it('activation is bound to what was created: a newer approved version blocks it; a lead campaign needs verified measurement of its live destination, checked again right before sending', async () => {
      const x = await setup();
      const a = await x.approvedCampaign();
      const { linkId } = await x.connect();
      await x.request(a.campaignId, linkId); await x.work();
      let c = (await x.read()).campaigns.find(z => z.id === a.campaignId)!;
      await x.cmd('new-draft', { campaignId: c.id, expectedRevision: c.revision });
      c = (await x.read()).campaigns.find(z => z.id === a.campaignId)!;
      const sub = await x.cmd('submit', { campaignId: c.id, expectedRevision: c.revision }) as { versionId: string; fingerprint: string };
      await x.cmd('decide', { campaignId: c.id, versionId: sub.versionId, fingerprint: sub.fingerprint, decision: 'APPROVE', criterion: 'Versión dos aprobada', idempotencyKey: randomUUID() });
      await expect(x.engine.campaignScreen(x.who.token, { brandId: x.brand.id, campaignId: a.campaignId, linkId, operation: 'ACTIVATE' })).rejects.toMatchObject({ code: 'CONFLICT', message: expect.stringContaining('approved version changed') });
      // Lead capture (Meta): destination must be a live site; activation needs SIMULATED verified measurement.
      const site = await x.liveSite();
      const offer = await x.approvedOffer('Cotización para cafeterías');
      const leads = await x.approvedCampaignFor('META_ADS', { ...x.google(offer), search: undefined, destination: { kind: 'SITE', siteId: site.siteId }, social: { primaryText: 'Pide tu cotización', headline: 'Cotiza tu café', imageAssetId: await x.kitImage(), imageAlt: 'Una taza de café' } }, 'LEADS');
      const meta = await x.connect('META_ADS');
      await x.request(leads.campaignId, meta.linkId); await x.work();
      await expect(x.engine.campaignScreen(x.who.token, { brandId: x.brand.id, campaignId: leads.campaignId, linkId: meta.linkId, operation: 'ACTIVATE' })).rejects.toMatchObject({ code: 'CONFLICT', message: expect.stringContaining('verified measurement') });
      const ev = await x.engine.measurementCommand(x.who.token, 'verify', { brandId: x.brand.id, siteId: site.siteId }) as { evidenceId: string };
      expect((await x.read()).campaigns.find(z => z.id === leads.campaignId)!.measurement).toMatchObject({ verified: true, source: 'SIMULATED' });
      const act = await x.request(leads.campaignId, meta.linkId, 'NORMAL', randomUUID(), 'ACTIVATE');
      // Measurement stops being valid after authorizing and before sending: nothing is sent.
      await x.engine.measurementCommand(x.who.token, 'withdraw', { brandId: x.brand.id, evidenceId: ev.evidenceId });
      const sent = x.adapter.calls.length;
      await x.work();
      expect(await x.job(act.jobId)).toMatchObject({ status: 'FAILED', blockedReason: 'MEASUREMENT_NOT_VERIFIED' });
      expect(x.adapter.calls.length).toBe(sent);
      // Verified again: a new authorization activates it.
      await x.engine.measurementCommand(x.who.token, 'verify', { brandId: x.brand.id, siteId: site.siteId });
      const again = await x.request(leads.campaignId, meta.linkId, 'NORMAL', randomUUID(), 'ACTIVATE');
      await x.work();
      expect((await x.job(again.jobId)).status).toBe('SUCCEEDED');
      // A site that publishes another version has another measurement fingerprint: the old evidence does not cover it.
      await expect(x.engine.campaignsCommand(x.who.token, 'create', { brandId: x.brand.id, provider: 'GOOGLE_ADS', objective: 'LEADS', name: 'x', idempotencyKey: randomUUID() })).rejects.toMatchObject({ code: 'INVALID' });
    });

    it('EXT-008 / EXT-017 · cancelling or revoking during an attempt stops the next steps, keeps what may have happened, says what is pending; a late answer is recorded without reactivating anything; without access nothing is checked or inferred', async () => {
      // Cancel while the first step is in flight: that step completes, nothing else is sent.
      let x = await setup();
      let a = await x.approvedCampaign();
      let conn = await x.connect();
      let r = await x.request(a.campaignId, conn.linkId);
      let cancelled: Record<string, unknown> | null = null;
      x.hooks.beforeNetworkWrite = async () => { x.hooks.beforeNetworkWrite = undefined; cancelled = await x.engine.campaignCancel(x.who.token, { brandId: x.brand.id, authorizationId: r.authorizationId }); };
      await x.work();
      expect(cancelled).toMatchObject({ status: 'CANCELLED', inFlight: true });
      let j = await x.job(r.jobId);
      expect(j.status).toBe('PARTIAL');
      expect(j.authorization!.status).toBe('CANCELLED');
      expect(j.steps.map(s => s.status)).toEqual(['SUCCEEDED', 'PENDING', 'PENDING', 'PENDING', 'PENDING']);
      expect(x.adapter.calls).toHaveLength(1);
      // Cancel while the answer is lost: the step stays pending verification; finding it later links it, never requeues.
      x = await setup(); a = await x.approvedCampaign(); conn = await x.connect();
      r = await x.request(a.campaignId, conn.linkId, 'LOST_RESPONSE');
      await x.work();
      expect((await x.engine.campaignCancel(x.who.token, { brandId: x.brand.id, authorizationId: r.authorizationId }))).toMatchObject({ inFlight: true });
      expect((await x.engine.campaignReconcile(x.who.token, { brandId: x.brand.id, jobId: r.jobId })).results).toEqual([{ step: 'campaign', resolution: 'FOUND' }]);
      expect(await x.work()).toEqual([]);
      j = await x.job(r.jobId);
      expect(j.status).toBe('PARTIAL');
      expect(j.steps.filter(s => s.status === 'PENDING').map(s => s.key)).toEqual(['ad_group', 'keywords', 'ad']);
      // Access revoked during an attempt: the attempt's result is kept, the following steps are not sent.
      x = await setup(); a = await x.approvedCampaign(); conn = await x.connect();
      r = await x.request(a.campaignId, conn.linkId, 'LOST_RESPONSE');
      x.hooks.beforeNetworkWrite = async () => { if (x.adapter.calls.length === 1) await x.engine.connectionStatus(x.who.token, { brandId: x.brand.id, connectionId: conn.connectionId, status: 'EXPIRED' }); };
      await x.work();
      j = await x.job(r.jobId);
      expect(j.steps.map(s => s.status)).toEqual(['SUCCEEDED', 'NEEDS_CHECK', 'PENDING', 'PENDING', 'PENDING']);
      // Without valid access the provider is not queried and nothing is inferred.
      expect((await x.engine.campaignReconcile(x.who.token, { brandId: x.brand.id, jobId: r.jobId })).results).toEqual([{ step: 'campaign', resolution: 'ACCESS_UNAVAILABLE' }]);
      expect((await x.job(r.jobId)).steps[1].status).toBe('NEEDS_CHECK');
      await x.engine.connectionStatus(x.who.token, { brandId: x.brand.id, connectionId: conn.connectionId, status: 'ACTIVE' });
      expect((await x.engine.campaignReconcile(x.who.token, { brandId: x.brand.id, jobId: r.jobId })).results).toEqual([{ step: 'campaign', resolution: 'FOUND' }]);
    });

    it('EXT-014 · the authorization expires with steps done and others pending: PARTIAL, authorization EXPIRED; only a new authorization continues what is missing, nothing is repeated', async () => {
      const x = await setup({ authorizationTtlMs: 60_000 });
      const a = await x.approvedCampaign();
      const conn = await x.connect();
      const r = await x.request(a.campaignId, conn.linkId);
      x.hooks.beforeNetworkWrite = () => { if (x.adapter.calls.length === 2) x.advance(61_000); }; // the third attempt starts and then misses its deadline
      await x.work();
      x.hooks.beforeNetworkWrite = undefined;
      const j = await x.job(r.jobId);
      expect(j).toMatchObject({ status: 'PARTIAL', authorization: { status: 'EXPIRED' } });
      expect(j.steps.filter(s => s.status === 'SUCCEEDED').map(s => s.key)).toEqual(['budget', 'campaign']);
      const again = await x.request(a.campaignId, conn.linkId);
      expect(again.jobId).toBe(r.jobId); // continues the same job
      await x.work();
      expect((await x.job(r.jobId)).status).toBe('SUCCEEDED');
      expect(['budget', 'campaign', 'ad_group', 'keywords', 'ad'].map(k => x.adapter.calls.filter(cl => cl.stepKey === k).length)).toEqual([1, 1, 1, 1, 1]);
    });

    it('RES-002 · conversions attributed by Google and Meta are shown per provider and never added to each other or counted as people or opportunities (synthetic provider data)', async () => {
      const x = await setup();
      const g = await x.approvedCampaign();
      const offer = await x.approvedOffer('Segunda oferta');
      const m = await x.approvedCampaignFor('META_ADS', { ...x.google(offer), search: undefined, social: { primaryText: 'Texto', headline: 'Titular', imageAssetId: await x.kitImage(), imageAlt: 'Una taza' } });
      const row = (campaignId: string, conversions: number) => ({ id: randomUUID(), workspaceId: x.who.workspaceId, brandId: x.brand.id, campaignId, jobId: null, source: 'PROVIDER', providerStatus: 'ENABLED', reviewStatus: 'APPROVED', periodStart: '2026-10-01', periodEnd: '2026-10-10', currency: 'MXN', spendMinor: 50000, impressions: 1000, clicks: 40, providerConversions: conversions, recordedAt: new Date() });
      await x.db.insert(t.campaignMetrics).values([row(g.campaignId, 5), row(m.campaignId, 4)]);
      const form = await x.engine.clientsCommand(x.who.token, 'form', { brandId: x.brand.id, name: 'Formulario', idempotencyKey: randomUUID() }) as { publicId: string };
      for (const name of ['Ana', 'Luis', 'Eva']) await x.engine.submitLeadForm({ form: form.publicId, submissionId: randomUUID(), name, email: `${name.toLowerCase()}@example.com`, need: 'Precios', consent: { contactPurpose: true } });
      const r = await x.engine.results(x.who.token, x.brand.id);
      const attributed = r.campaigns.flatMap(c => c.metrics.filter(z => z.id.startsWith('attributed_')));
      expect(attributed.map(z => [z.label, z.value, z.kind])).toEqual([['Conversiones atribuidas por Google Ads', 5, 'PROVIDER'], ['Conversiones atribuidas por Meta Ads', 4, 'PROVIDER']]);
      expect(r.operations.find(z => z.id === 'new_opportunities')!.value).toBe(3);
      const all = [...r.marketing, ...r.operations, ...r.sales, ...r.campaigns.flatMap(c => c.metrics)];
      expect(all.some(z => z.value === 9 || z.value === 12)).toBe(false); // never 5+4, never 5+4+3
      expect(all.find(z => z.id === `roas_${g.campaignId}`)).toMatchObject({ available: false }); // no revenue: no ROAS even with spend
    });

    it('cycle review → Validation: a revisable proposal; a person creates (or links) the experiment in the existing cycle, once; sources, period, campaign and version are kept; nothing is approved or changed', async () => {
      const x = await setup();
      const a = await x.approvedCampaign();
      const hypothesis = await x.engine.captureContext(x.who.token, x.brand.id, 'hypothesis', { statement: 'Las cafeterías responden a la búsqueda' });
      const ctx = await x.engine.context(x.who.token, x.brand.id), q = ctx.questions.find(z => z.module === 'Priority Experiment')!;
      await x.engine.prepareQuestion(x.who.token, x.brand.id, q.id, null);
      const priority = await x.engine.commitDecision(x.who.token, { brandId: x.brand.id, questionId: q.id, selectedOption: 'Probar la búsqueda', rationale: 'Criterio humano', expectedActiveVersion: null, sourceRecommendationId: null, idempotencyKey: randomUUID(), actorUserId: x.who.userId });
      const draft = await x.engine.cycleReview(x.who.token, x.brand.id);
      const suggestion = draft.suggestions.items.find(i => i.campaignId === a.campaignId)!;
      const saved = await x.engine.cycleReviewSave(x.who.token, { brandId: x.brand.id, periodStart: '2026-09-11', periodEnd: '2026-10-11', learnings: 'Sin datos reales', proposals: [{ text: suggestion.text, origin: 'BRANDO', campaignId: a.campaignId }, { text: 'Revisar el formulario', origin: 'PERSON' }], decision: 'RETEST', criterion: 'Volvemos a probar con medición', idempotencyKey: randomUUID() });
      const before = { decisions: (await x.db.select().from(t.versions).where(eq(t.versions.brandId, x.brand.id))).length, learnings: (await x.db.select().from(t.learnings).where(eq(t.learnings.brandId, x.brand.id))).length };
      const proposal = await x.engine.cycleExperimentProposal(x.who.token, { brandId: x.brand.id, reviewId: saved.reviewId, proposalIndex: 0 });
      expect(proposal).toMatchObject({ linked: null, sources: { campaignId: a.campaignId, campaignVersionId: a.versionId, periodStart: '2026-09-11' } });
      expect(proposal.draft.intendedSignal).toContain('utm_campaign=');
      expect(await x.db.select().from(t.experiments).where(eq(t.experiments.brandId, x.brand.id))).toHaveLength(0); // proposing creates nothing
      const input = { brandId: x.brand.id, reviewId: saved.reviewId, proposalIndex: 0, mode: 'CREATE', hypothesisId: hypothesis.id, decisionId: priority.decisionId, successCriteria: 'Una oportunidad con la referencia' };
      const [r1, r2] = await Promise.all([x.engine.cycleExperiment(x.who.token, input), x.engine.cycleExperiment(x.who.token, input)].map(p => p.catch(e => e)));
      const ok = [r1, r2].filter(z => z && z.experimentId);
      expect(new Set(ok.map(z => z.experimentId)).size).toBe(1);
      expect(await x.engine.cycleExperiment(x.who.token, input)).toMatchObject({ experimentId: ok[0].experimentId, replayed: true });
      const experiments = await x.db.select().from(t.experiments).where(eq(t.experiments.brandId, x.brand.id));
      expect(experiments).toHaveLength(1);
      expect(experiments[0].payload).toMatchObject({ status: 'PLANNED', hypothesisId: hypothesis.id });
      expect((experiments[0].payload as { limitations: string[] }).limitations.join(' ')).toContain('Origen: revisión del ciclo del 2026-09-11 al 2026-10-11');
      const [link] = await x.db.select().from(t.cycleReviewExperiments).where(eq(t.cycleReviewExperiments.reviewId, saved.reviewId));
      expect(link).toMatchObject({ mode: 'CREATED', campaignId: a.campaignId, campaignVersionId: a.versionId, proposalIndex: 0 });
      // The second proposal is linked to the existing experiment instead.
      expect(await x.engine.cycleExperiment(x.who.token, { brandId: x.brand.id, reviewId: saved.reviewId, proposalIndex: 1, mode: 'LINK', experimentId: experiments[0].id })).toMatchObject({ mode: 'LINKED', replayed: false });
      expect({ decisions: (await x.db.select().from(t.versions).where(eq(t.versions.brandId, x.brand.id))).length, learnings: (await x.db.select().from(t.learnings).where(eq(t.learnings.brandId, x.brand.id))).length }).toEqual(before);
      const outsider = await seedIdentity(x.db);
      await expect(x.engine.cycleExperimentProposal(outsider.token, { brandId: x.brand.id, reviewId: saved.reviewId, proposalIndex: 0 })).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });

    it('Canva · link an existing design (provider confirms it), withdrawn access blocks sending and retrieving, another brand never sees the design', async () => {
      const x = await setup();
      const brief = { type: 'DESIGN_BRIEF', name: 'Cartel', offerId: null, sourceDecisionVersionIds: [], body: { for: 'CANVA', piece: 'Cartel', format: 'A3', audience: '', message: 'Café', mustInclude: '', avoid: '', dueDate: null } };
      const d = await x.engine.deliverableCommand(x.who.token, 'create', { brandId: x.brand.id, content: brief, idempotencyKey: randomUUID() }) as { deliverableId: string };
      const sub = await x.engine.deliverableCommand(x.who.token, 'submit', { reviewerId: x.who.userId, brandId: x.brand.id, deliverableId: d.deliverableId, expectedRevision: 0 }) as { versionId: string; fingerprint: string };
      await x.engine.deliverableCommand(x.who.token, 'decide', { brandId: x.brand.id, deliverableId: d.deliverableId, versionId: sub.versionId, fingerprint: sub.fingerprint, decision: 'APPROVE', criterion: 'Brief aprobado', idempotencyKey: randomUUID() });
      const canva = await x.engine.connectSimulated(x.who.token, { brandId: x.brand.id, provider: 'CANVA' }) as { connectionId: string };
      await expect(x.engine.canvaLink(x.who.token, { brandId: x.brand.id, deliverableId: d.deliverableId, designRef: 'no-existe-123', idempotencyKey: randomUUID() })).rejects.toMatchObject({ code: 'NOT_FOUND' });
      const linked = await x.engine.canvaLink(x.who.token, { brandId: x.brand.id, deliverableId: d.deliverableId, designRef: 'sim-design-existing-1', idempotencyKey: randomUUID() }) as { designId: string };
      expect((await x.read()).designs.find(z => z.id === linked.designId)).toMatchObject({ designRef: 'sim-design-existing-1', status: 'CREATED' });
      expect((await x.read()).canvaCapabilities.find(z => z.key === 'LINK_DESIGN')!.state).toBe('SIMULATED');
      // Withdrawn access: neither sending nor retrieving works until the person reconnects.
      await x.engine.connectionStatus(x.who.token, { brandId: x.brand.id, connectionId: canva.connectionId, status: 'EXPIRED' });
      await expect(x.engine.canvaSend(x.who.token, { brandId: x.brand.id, deliverableId: d.deliverableId, idempotencyKey: randomUUID() })).rejects.toMatchObject({ code: 'CONFLICT' });
      await expect(x.engine.canvaRetrieve(x.who.token, { brandId: x.brand.id, designId: linked.designId })).rejects.toMatchObject({ code: 'CONFLICT' });
      await x.engine.connectionStatus(x.who.token, { brandId: x.brand.id, connectionId: canva.connectionId, status: 'ACTIVE' });
      const other = await x.engine.createBrand(x.who.token, 'Otra marca');
      await expect(x.engine.canvaRetrieve(x.who.token, { brandId: other.id, designId: linked.designId })).rejects.toMatchObject({ code: 'NOT_FOUND' });
      expect(await x.engine.canvaRetrieve(x.who.token, { brandId: x.brand.id, designId: linked.designId })).toMatchObject({ replayed: false });
    });

    it('security review fixes: the offer name comes from the cited version; an empty destination blocks; a pause never waits on editorial state; another person cannot link someone else\'s Canva design; two people at once create one experiment', async () => {
      // F1 · forged offer name is replaced by the cited version's name.
      const x = await setup();
      const offer = await x.approvedOffer('Café de verdad');
      const created = await x.cmd('create', { provider: 'GOOGLE_ADS', name: 'C', idempotencyKey: randomUUID() }) as { campaignId: string };
      let c = (await x.read()).campaigns.find(z => z.id === created.campaignId)!;
      await x.cmd('draft', { campaignId: c.id, expectedRevision: c.revision, content: x.google({ ...offer, name: 'Oferta Premium 50% off' }) });
      c = (await x.read()).campaigns.find(z => z.id === created.campaignId)!;
      expect(c.draft!.content.offer!.name).toBe('Café de verdad');
      // F2 · a destination without an address never passes the checks.
      const empty = normalizeCampaign({ ...x.google(offer), destination: { kind: 'SITE', siteId: 's1', url: '' } }, 'GOOGLE_ADS');
      expect(campaignChecks(empty, { today: '2026-01-01', offerApproved: true, destinationLive: true, imageValid: true, outdated: [] }).map(i => i.code)).toContain('DESTINATION');
      // F3 · pause authorized, then someone approves a newer version: the pause is still sent.
      const a = await x.approvedCampaign();
      const { linkId } = await x.connect();
      await x.request(a.campaignId, linkId); await x.work();
      await x.request(a.campaignId, linkId, 'NORMAL', randomUUID(), 'ACTIVATE'); await x.work();
      const pause = await x.request(a.campaignId, linkId, 'NORMAL', randomUUID(), 'PAUSE');
      let cc = (await x.read()).campaigns.find(z => z.id === a.campaignId)!;
      await x.cmd('new-draft', { campaignId: cc.id, expectedRevision: cc.revision });
      cc = (await x.read()).campaigns.find(z => z.id === a.campaignId)!;
      const sub = await x.cmd('submit', { campaignId: cc.id, expectedRevision: cc.revision }) as { versionId: string; fingerprint: string };
      await x.cmd('decide', { campaignId: cc.id, versionId: sub.versionId, fingerprint: sub.fingerprint, decision: 'APPROVE', criterion: 'Otra versión aprobada', idempotencyKey: randomUUID() });
      await x.work();
      expect((await x.job(pause.jobId)).status).toBe('SUCCEEDED');
      // F4 · Canva designs are found only with the credential that created them.
      const brief = { type: 'DESIGN_BRIEF', name: 'Cartel', offerId: null, sourceDecisionVersionIds: [], body: { for: 'CANVA', piece: 'Cartel', format: 'A3', audience: '', message: 'Café', mustInclude: '', avoid: '', dueDate: null } };
      const d = await x.engine.deliverableCommand(x.who.token, 'create', { brandId: x.brand.id, content: brief, idempotencyKey: randomUUID() }) as { deliverableId: string };
      const dv = await x.engine.deliverableCommand(x.who.token, 'submit', { reviewerId: x.who.userId, brandId: x.brand.id, deliverableId: d.deliverableId, expectedRevision: 0 }) as { versionId: string; fingerprint: string };
      await x.engine.deliverableCommand(x.who.token, 'decide', { brandId: x.brand.id, deliverableId: d.deliverableId, versionId: dv.versionId, fingerprint: dv.fingerprint, decision: 'APPROVE', criterion: 'Brief aprobado', idempotencyKey: randomUUID() });
      await x.engine.connectSimulated(x.who.token, { brandId: x.brand.id, provider: 'CANVA' });
      const mine = await x.engine.canvaSend(x.who.token, { brandId: x.brand.id, deliverableId: d.deliverableId, idempotencyKey: randomUUID() }) as { designRef: string };
      const colleague = await seedIdentity(x.db, 'ADMIN', x.who.workspaceId);
      await x.engine.connectSimulated(colleague.token, { brandId: x.brand.id, provider: 'CANVA' });
      await expect(x.engine.canvaLink(colleague.token, { brandId: x.brand.id, deliverableId: d.deliverableId, designRef: mine.designRef, idempotencyKey: randomUUID() })).rejects.toMatchObject({ code: 'NOT_FOUND' });
      expect(await x.engine.canvaLink(x.who.token, { brandId: x.brand.id, deliverableId: d.deliverableId, designRef: mine.designRef, idempotencyKey: randomUUID() })).toMatchObject({ replayed: false });
      // P1 · two people create the experiment of the same proposal at the same time: one experiment, one link.
      const hypothesis = await x.engine.captureContext(x.who.token, x.brand.id, 'hypothesis', { statement: 'La búsqueda trae cafeterías' });
      const ctx = await x.engine.context(x.who.token, x.brand.id), q = ctx.questions.find(z => z.module === 'Priority Experiment')!;
      await x.engine.prepareQuestion(x.who.token, x.brand.id, q.id, null);
      const priority = await x.engine.commitDecision(x.who.token, { brandId: x.brand.id, questionId: q.id, selectedOption: 'Probar la búsqueda', rationale: 'Criterio', expectedActiveVersion: null, sourceRecommendationId: null, idempotencyKey: randomUUID(), actorUserId: x.who.userId });
      const saved = await x.engine.cycleReviewSave(x.who.token, { brandId: x.brand.id, periodStart: '2026-09-11', periodEnd: '2026-10-11', proposals: [{ text: 'Probar la campaña', origin: 'PERSON', campaignId: a.campaignId }], decision: 'RETEST', criterion: 'Volvemos a probar', idempotencyKey: randomUUID() });
      const body = { brandId: x.brand.id, reviewId: saved.reviewId, proposalIndex: 0, mode: 'CREATE', hypothesisId: hypothesis.id, decisionId: priority.decisionId };
      const results = await Promise.allSettled([x.engine.cycleExperiment(x.who.token, body), x.engine.cycleExperiment(colleague.token, body)]);
      const ids = results.filter(r => r.status === 'fulfilled').map(r => (r as PromiseFulfilledResult<{ experimentId: string }>).value.experimentId);
      expect(ids.length).toBeGreaterThan(0);
      expect(new Set(ids).size).toBe(1);
      expect(await x.db.select().from(t.experiments).where(eq(t.experiments.brandId, x.brand.id))).toHaveLength(1);
    });
  });
}
