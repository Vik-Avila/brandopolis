import { describe, it, expect } from 'vitest';
import { randomBytes, randomUUID } from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import type { AddressInfo } from 'node:net';
import type { connect } from '../src/persistence/database.js';
import { Engine } from '../src/application/engine.js';
import { ExternalOperations, DEFAULT_EXTERNAL_CONFIG, type ExternalConfig } from '../src/application/external-operations.js';
import { SimulatedProvider } from '../src/application/provider-adapter.js';
import { createVault } from '../src/application/credential-vault.js';
import { contentFingerprint } from '../src/domain/editorial-versions.js';
import { createApp } from '../src/transport/http.js';
import { seedIdentity } from '../scripts/seed.js';
import * as t from '../src/persistence/schema.js';

const SECRET = 'sim-secret-never-shown';
/** Message of the PostgreSQL error behind a failed query (drizzle wraps it as cause). */
const databaseError = async (query: Promise<unknown>) => { try { await query; return 'no error'; } catch (e) { return String((e as { cause?: { message?: string } }).cause?.message ?? (e as Error).message); } };

/** Phase 4 · block 2 (ADR-0030/0031/0033): work priority, per-brand capabilities and external operations (C1). */
export function phase4Cases(connection: () => ReturnType<typeof connect>) {
  const brandOf = async (role = 'ADMIN') => {
    const db = connection().db, engine = new Engine(db), who = await seedIdentity(db, role);
    const brand = await engine.createBrand(who.token, 'Marca Fase 4');
    return { db, engine, who, brand };
  };

  describe('PHASE4_SPEC §4.9 · work priority (INT-002, INT-003)', () => {
    it('appends priorities, keeps history, replays the same key and rejects reuse with other content', async () => {
      const { db, engine, who, brand } = await brandOf();
      expect((await engine.workPriority(who.token, brand.id)).current).toBeNull();
      const key = randomUUID();
      const first = await engine.setWorkPriority(who.token, { brandId: brand.id, intent: 'STRATEGY_POINT', note: '  Revisar el posicionamiento  ', idempotencyKey: key });
      expect(first).toMatchObject({ intent: 'STRATEGY_POINT', note: 'Revisar el posicionamiento', replayed: false });
      expect(await engine.setWorkPriority(who.token, { brandId: brand.id, intent: 'STRATEGY_POINT', note: 'Revisar el posicionamiento', idempotencyKey: key })).toMatchObject({ id: first.id, replayed: true });
      await expect(engine.setWorkPriority(who.token, { brandId: brand.id, intent: 'CAMPAIGN', idempotencyKey: key })).rejects.toMatchObject({ code: 'CONFLICT' });
      await engine.setWorkPriority(who.token, { brandId: brand.id, intent: 'CAMPAIGN', idempotencyKey: randomUUID() });
      const view = await engine.workPriority(who.token, brand.id);
      expect(view.current).toMatchObject({ intent: 'CAMPAIGN', entry: { area: 'Marketing', section: 'Campañas digitales' } });
      expect(view.history.map(h => h.intent)).toEqual(['CAMPAIGN', 'STRATEGY_POINT']);
      // 2026-10-11 · eleven choices (additive migration 0024): the new values are accepted, and an earlier CONTENT choice
      // stays valid and readable in the history next to them.
      for (const intent of ['SOCIAL_MEDIA', 'SALES_MATERIALS', 'OTHER', 'HELP_ME_CHOOSE', 'CONTENT'])
        await engine.setWorkPriority(who.token, { brandId: brand.id, intent, note: intent === 'OTHER' ? 'Ordenar mi catálogo' : null, idempotencyKey: randomUUID() });
      const later = await engine.workPriority(who.token, brand.id);
      // Records written within the same millisecond have no defined order, so the history is compared as a set.
      expect(later.history.map(h => h.intent).sort()).toEqual(['CAMPAIGN', 'CONTENT', 'HELP_ME_CHOOSE', 'OTHER', 'SALES_MATERIALS', 'SOCIAL_MEDIA', 'STRATEGY_POINT']);
      expect(later.history.find(h => h.intent === 'OTHER')).toMatchObject({ note: 'Ordenar mi catálogo', entry: { area: 'Inicio' } });
      expect(later.history.find(h => h.intent === 'SALES_MATERIALS')!.entry).toEqual({ area: 'Productos y servicios', section: 'Materiales de venta' });
      await expect(engine.setWorkPriority(who.token, { brandId: brand.id, intent: 'NOT_AN_INTENT', idempotencyKey: randomUUID() })).rejects.toMatchObject({ code: 'INVALID' });
      await expect(engine.setWorkPriority(who.token, { brandId: brand.id, intent: 'CONTENT', note: 'x'.repeat(501), idempotencyKey: randomUUID() })).rejects.toMatchObject({ code: 'INVALID' });
      // INT-003: choosing a priority never writes a decision, a version, context or a plan; history is append-only.
      expect(await db.select().from(t.versions).where(eq(t.versions.brandId, brand.id))).toEqual([]);
      expect(await db.select().from(t.userInputs).where(eq(t.userInputs.brandId, brand.id))).toEqual([]);
      expect(await databaseError(db.execute(sql`update brand_work_priorities set intent='WEBSITE' where id=${first.id}`))).toMatch(/append-only/);
      expect(await databaseError(db.execute(sql`delete from brand_work_priorities where id=${first.id}`))).toMatch(/append-only/);
      expect((await db.select().from(t.audits).where(and(eq(t.audits.brandId, brand.id), eq(t.audits.operation, 'WORK_PRIORITY_SET')))).length).toBe(7); // two earlier + five new choices, each audited
    });

    it('is scoped like every brand operation: other workspace 404, unassigned member 403, no session 401', async () => {
      const { db, engine, who, brand } = await brandOf();
      const stranger = await seedIdentity(db), member = await seedIdentity(db, 'MEMBER', who.workspaceId);
      await expect(engine.workPriority(stranger.token, brand.id)).rejects.toMatchObject({ code: 'NOT_FOUND' });
      await expect(engine.setWorkPriority(member.token, { brandId: brand.id, intent: 'WEBSITE', idempotencyKey: randomUUID() })).rejects.toMatchObject({ code: 'FORBIDDEN' });
      await expect(engine.workPriority('', brand.id)).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    });
  });

  describe('ADR-0033 · per-brand capabilities (PRT-005)', () => {
    it('only an ADMIN grants/revokes, only to an assigned MEMBER; changes are audited; the member then holds the capability', async () => {
      const { db, engine, who, brand } = await brandOf();
      const member = await seedIdentity(db, 'MEMBER', who.workspaceId), other = await seedIdentity(db);
      expect((await engine.brandCapabilities(who.token, brand.id)).mine).toContain('AUTHORIZE_SPEND');
      const grant = (token: string, userId: string, g = true, capability = 'AUTHORIZE_SPEND') => engine.changeBrandCapability(token, { brandId: brand.id, userId, capability, grant: g });
      await expect(grant(who.token, member.userId)).rejects.toMatchObject({ code: 'INVALID' }); // not assigned yet
      await db.insert(t.assignments).values({ workspaceId: who.workspaceId, brandId: brand.id, userId: member.userId });
      expect((await engine.brandCapabilities(member.token, brand.id)).mine).toEqual([]);
      await expect(grant(member.token, member.userId)).rejects.toMatchObject({ code: 'FORBIDDEN' });
      await expect(grant(who.token, other.userId)).rejects.toMatchObject({ code: 'NOT_FOUND' }); // another workspace: indistinguishable
      await expect(grant(who.token, who.userId)).rejects.toMatchObject({ code: 'INVALID' }); // ADMIN already holds all
      await expect(grant(who.token, member.userId, true, 'ROOT')).rejects.toMatchObject({ code: 'INVALID' });
      expect(await grant(who.token, member.userId)).toEqual({ changed: true });
      expect(await grant(who.token, member.userId)).toEqual({ changed: false });
      expect((await engine.brandCapabilities(member.token, brand.id)).mine).toEqual(['AUTHORIZE_SPEND']);
      expect(await grant(who.token, member.userId, false)).toEqual({ changed: true });
      expect((await engine.brandCapabilities(member.token, brand.id)).mine).toEqual([]);
      const audited = await db.select().from(t.audits).where(eq(t.audits.brandId, brand.id));
      expect(audited.filter(a => a.operation.startsWith('BRAND_CAPABILITY_')).map(a => a.operation)).toEqual(['BRAND_CAPABILITY_GRANTED', 'BRAND_CAPABILITY_REVOKED']);
    });

    it('HTTP: same-origin POST, session and scope are enforced on the new endpoints', async () => {
      const { db, engine, who, brand } = await brandOf();
      const stranger = await seedIdentity(db);
      const server = createApp(engine);
      await new Promise<void>(r => server.listen(0, '127.0.0.1', r));
      const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
      const post = (path: string, body: unknown, token: string | null, origin: string | null = base) => fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(origin ? { Origin: origin } : {}), ...(token ? { Cookie: `brandopolis_session=${token}` } : {}) }, body: JSON.stringify(body) });
      try {
        const body = { brandId: brand.id, intent: 'VISUAL_IDENTITY', idempotencyKey: randomUUID() };
        expect((await post('/api/brands/work-priority', body, who.token, null)).status).toBe(403);
        expect((await post('/api/brands/work-priority', body, null)).status).toBe(401);
        expect((await post('/api/brands/work-priority', body, stranger.token)).status).toBe(404);
        const created = await post('/api/brands/work-priority', body, who.token);
        expect(created.status).toBe(201);
        const read = await fetch(`${base}/api/brands/work-priority?brandId=${brand.id}`, { headers: { Cookie: `brandopolis_session=${who.token}` } });
        expect((await read.json()).current.intent).toBe('VISUAL_IDENTITY');
        expect((await fetch(`${base}/api/brands/capabilities?brandId=${brand.id}`, { headers: { Cookie: `brandopolis_session=${stranger.token}` } })).status).toBe(404);
        expect((await post('/api/brands/capabilities', { brandId: brand.id, userId: who.userId, capability: 'PUBLISH_SITE', grant: 'yes' }, who.token)).status).toBe(400);
      } finally { await new Promise<void>(r => server.close(() => r())); }
    });
  });

  describe('ADR-0031 · external operations with the simulator', () => {
    const prepare = async (overrides: Partial<ExternalConfig> = {}) => {
      const { db, engine, who, brand } = await brandOf();
      let now = Date.now();
      const clock = () => new Date(now), advance = (ms: number) => { now += ms; };
      const sim = new SimulatedProvider(clock), vault = createVault(randomBytes(32), 'k-test');
      const hooks: { beforeNetworkWrite?: (attemptId: string) => Promise<void> | void } = {};
      const config = { ...DEFAULT_EXTERNAL_CONFIG, ...overrides };
      const ext = new ExternalOperations(db, vault, sim, config, clock, hooks);
      // Isolated tests share one database: this worker only claims jobs of this test's brand.
      const claimNext = ext.claimNext.bind(ext);
      ext.claimNext = (instanceId: string) => claimNext(instanceId, brand.id);
      const as = <T>(fn: Parameters<Engine['withBrandActor']>[2] extends (tx: infer X, a: infer A) => Promise<unknown> ? (tx: X, a: A) => Promise<T> : never, token = who.token) => engine.withBrandActor(token, brand.id, fn as never) as Promise<T>;
      const connection = await as((tx, a) => ext.storeConnection(tx, a, { provider: 'GOOGLE_ADS', accountLabel: 'MCC de prueba', scopes: ['adwords'], secret: SECRET, perUser: false }));
      const link = await as((tx, a) => ext.linkAccount(tx, a, { connectionId: connection.id, externalAccountId: '123-456', externalAccountLabel: 'Cuenta de prueba' }));
      const summary = { accountLabel: 'Cuenta de prueba', destination: 'https://ejemplo.test/oferta', currency: 'MXN', budget: { kind: 'DAILY_AVERAGE', amountMinor: 25000 }, startsOn: '2026-11-01', endsOn: '2026-11-30', timeZone: 'America/Mexico_City' };
      const subject = { kind: 'CAMPAIGN' as const, id: 'camp-' + randomUUID(), versionId: 'v1' };
      const authorize = (key = randomUUID()) => as<{ id: string }>((tx, a) => ext.authorize(tx, a, { linkId: link.id, operation: 'CREATE_PAUSED', subject, summary, contentFingerprint: contentFingerprint({ subject, v: 1 }), idempotencyKey: key }));
      const enqueue = (authorizationId: string) => as<{ jobId: string; continued?: boolean }>((tx, a) => ext.enqueue(tx, a, authorizationId));
      const view = (jobId: string) => as<{ status: string; blockedReason: string | null; steps: { key: string; status: string; providerIds: Record<string, string> }[] }>((tx, a) => ext.jobView(tx, a, jobId));
      const retry = (jobId: string, stepKey: string, criterion: string) => as((tx, a) => ext.humanRetry(tx, a, { jobId, stepKey, criterion }));
      const calls = (stepKey: string) => sim.calls.filter(c => c.stepKey === stepKey).length;
      return { db, engine, who, brand, ext, sim, hooks, clock, advance, connection, link, subject, authorize, enqueue, view, retry, calls, as };
    };

    it('happy path: reserve + queue in one transaction, run every step, consume the authorization; secrets never leave the server', async () => {
      const x = await prepare();
      const auth = await x.authorize();
      const { jobId } = await x.enqueue(auth.id);
      expect(await x.enqueue(auth.id)).toMatchObject({ jobId, replayed: true }); // EXT-001: one job per authorization
      const w = await x.ext.registerWorker('host-a', 101);
      const claim = (await x.ext.claimNext(w))!;
      expect(await x.ext.runJob(w, claim)).toBe('DONE');
      const v = await x.view(jobId);
      expect(v.status).toBe('SUCCEEDED');
      expect(v.steps.map(s => s.status)).toEqual(['SUCCEEDED', 'SUCCEEDED', 'SUCCEEDED', 'SUCCEEDED', 'SUCCEEDED']);
      const [stored] = await x.db.select().from(t.operationAuthorizations).where(eq(t.operationAuthorizations.id, auth.id));
      expect(stored.status).toBe('CONSUMED');
      expect(JSON.stringify(v)).not.toContain(SECRET);
      expect(JSON.stringify(x.sim.calls)).not.toContain(SECRET);
      const [conn] = await x.db.select().from(t.connections).where(eq(t.connections.id, x.connection.id));
      expect(conn.credentialCiphertext).not.toContain(SECRET);
    });

    it('authorization needs AUTHORIZE_SPEND and a budget for spend operations; a member without the grant is refused', async () => {
      const x = await prepare();
      const member = await seedIdentity(x.db, 'MEMBER', x.who.workspaceId);
      await x.db.insert(t.assignments).values({ workspaceId: x.who.workspaceId, brandId: x.brand.id, userId: member.userId });
      await expect(x.as((tx, a) => x.ext.authorize(tx, a, { linkId: x.link.id, operation: 'ACTIVATE', subject: x.subject, summary: { accountLabel: 'c', destination: 'd', currency: 'MXN', budget: null, startsOn: null, endsOn: null, timeZone: 'UTC' }, contentFingerprint: contentFingerprint(1), idempotencyKey: randomUUID() }))).rejects.toMatchObject({ code: 'INVALID' });
      await expect(x.as((tx, a) => x.ext.authorize(tx, a, { linkId: x.link.id, operation: 'CREATE_PAUSED', subject: x.subject, summary: {}, contentFingerprint: contentFingerprint(1), idempotencyKey: randomUUID() }), member.token)).rejects.toMatchObject({ code: 'FORBIDDEN' });
    });

    it('EXT-002: after a relay, the worker that lost its lease cannot start an attempt; the new holder completes once', async () => {
      const x = await prepare({ leaseMs: 1_000 });
      const { jobId } = await x.enqueue((await x.authorize()).id);
      const a = await x.ext.registerWorker('host-a', 1), b = await x.ext.registerWorker('host-b', 2);
      const claimA = (await x.ext.claimNext(a))!;
      x.advance(2_000);
      const claimB = (await x.ext.claimNext(b))!;
      expect(claimB.leaseNumber).toBe(claimA.leaseNumber + 1);
      expect(await x.ext.runJob(a, claimA)).toBe('LEASE_LOST');
      expect(x.sim.calls).toHaveLength(0);
      expect(await x.ext.runJob(b, claimB)).toBe('DONE');
      expect(x.calls('budget')).toBe(1);
      expect((await x.view(jobId)).status).toBe('SUCCEEDED');
    });

    it('EXT-004/005/013: a lost response is NEEDS_CHECK, never resent; a resource visible later is linked and the job continues', async () => {
      const x = await prepare();
      x.sim.arm('campaign', 'TIMEOUT_AFTER_SEND', 'DELAYED_VISIBILITY');
      const { jobId } = await x.enqueue((await x.authorize()).id);
      const w = await x.ext.registerWorker('host-a', 1);
      expect(await x.ext.runJob(w, (await x.ext.claimNext(w))!)).toBe('NEEDS_CHECK');
      expect((await x.view(jobId)).steps.find(s => s.key === 'campaign')!.status).toBe('NEEDS_CHECK');
      expect(await x.ext.claimNext(w)).toBeUndefined(); // nothing runnable: never resent
      expect(await x.ext.reconcile(jobId)).toEqual([{ step: 'campaign', resolution: 'UNRESOLVED' }]); // not visible yet ≠ not created
      x.sim.release((await x.db.select().from(t.externalSteps).where(and(eq(t.externalSteps.jobId, jobId), eq(t.externalSteps.stepKey, 'campaign'))))[0].remoteTag);
      expect(await x.ext.reconcile(jobId)).toEqual([{ step: 'campaign', resolution: 'FOUND' }]);
      expect((await x.view(jobId)).status).toBe('QUEUED');
      expect(await x.ext.runJob(w, (await x.ext.claimNext(w))!)).toBe('DONE');
      expect(x.calls('campaign')).toBe(1);
      expect((await x.view(jobId)).status).toBe('SUCCEEDED');
    });

    it('EXT-007: an authorization valid when queued but expired at send time dispatches nothing', async () => {
      const x = await prepare({ authorizationTtlMs: 5_000 });
      const auth = await x.authorize();
      const { jobId } = await x.enqueue(auth.id);
      x.advance(6_000);
      const w = await x.ext.registerWorker('host-a', 1);
      expect(await x.ext.runJob(w, (await x.ext.claimNext(w))!)).toBe('BLOCKED');
      expect(x.sim.calls).toHaveLength(0);
      expect(await x.view(jobId)).toMatchObject({ status: 'EXPIRED', blockedReason: 'AUTHORIZATION_EXPIRED' });
      expect((await x.db.select().from(t.operationAuthorizations).where(eq(t.operationAuthorizations.id, auth.id)))[0].status).toBe('EXPIRED');
    });

    it('EXT-015/020: A suspended after DISPATCHING; B recovers without sending; A sends late and the provider-confirmed result is linked, not repeated', async () => {
      const x = await prepare({ leaseMs: 1_000, dispatchWindowMs: 60_000 });
      const { jobId } = await x.enqueue((await x.authorize()).id);
      const a = await x.ext.registerWorker('host-a', 1), b = await x.ext.registerWorker('host-b', 2);
      let suspended = false;
      x.hooks.beforeNetworkWrite = async () => {
        if (suspended) return; suspended = true;
        x.advance(2_000); // A is suspended after the last deadline check and before writing to the network
        expect(await x.ext.claimNext(b)).toBeUndefined(); // B recovers: the in-flight step becomes NEEDS_CHECK
        expect((await x.view(jobId)).steps[0].status).toBe('NEEDS_CHECK');
        await expect(x.retry(jobId, 'budget', 'Quiero reintentar ahora mismo')).rejects.toThrow(/NO_EVIDENCE_THAT_ATTEMPT_CANNOT_EMIT/);
      };
      expect(await x.ext.runJob(a, (await x.ext.claimNext(a))!)).toBe('LATE');
      expect(x.calls('budget')).toBe(1); // only A's late call; B sent nothing
      const steps = await x.db.select().from(t.externalSteps).where(and(eq(t.externalSteps.jobId, jobId), eq(t.externalSteps.stepKey, 'budget')));
      expect(steps[0].status).toBe('SUCCEEDED');
      const kinds = (await x.db.select().from(t.externalAttemptOutcomes).where(eq(t.externalAttemptOutcomes.brandId, x.brand.id))).map(o => o.kind);
      expect(kinds).toEqual(['LATE_RESULT']); // added, nothing overwritten
      expect((await x.view(jobId)).status).toBe('QUEUED');
    });

    it('EXT-018 (C1): no human retry without verifiable evidence; with terminated process + confirmed absence + criterion, a new attempt runs once', async () => {
      const x = await prepare({ leaseMs: 1_000, processingWindowMs: 10_000 });
      const { jobId } = await x.enqueue((await x.authorize()).id);
      const a = await x.ext.registerWorker('host-a', 1), b = await x.ext.registerWorker('host-b', 2);
      x.hooks.beforeNetworkWrite = () => { throw new Error('process crashed after DISPATCHING'); };
      await expect(x.ext.runJob(a, (await x.ext.claimNext(a))!)).rejects.toThrow(/crashed/);
      x.hooks.beforeNetworkWrite = undefined;
      x.advance(2_000);
      expect(await x.ext.claimNext(b)).toBeUndefined();
      await expect(x.retry(jobId, 'budget', 'No lo veo en el proveedor')).rejects.toThrow(/NO_EVIDENCE_THAT_ATTEMPT_CANNOT_EMIT/);
      await x.ext.recordWorkerTermination(a, 'supervisor@host-a');
      expect(await x.ext.reconcile(jobId)).toEqual([{ step: 'budget', resolution: 'UNRESOLVED' }]); // processing window still open
      await expect(x.retry(jobId, 'budget', 'No lo veo en el proveedor')).rejects.toThrow(/REMOTE_RESULT_UNRESOLVED/);
      x.advance(11_000);
      expect(await x.ext.reconcile(jobId)).toEqual([{ step: 'budget', resolution: 'ABSENCE_CONFIRMED' }]);
      // Security review BLOCKER: confirmed absence alone never makes the step runnable; only a human release does.
      expect((await x.view(jobId)).status).toBe('NEEDS_CHECK');
      expect(await x.ext.claimNext(b)).toBeUndefined();
      expect(x.sim.calls).toHaveLength(0);
      await expect(x.retry(jobId, 'budget', 'no lo veo')).rejects.toThrow(/CRITERION_REQUIRED/);
      expect(await x.retry(jobId, 'budget', 'El registro de cambios del proveedor no muestra la creación')).toMatchObject({ queued: true });
      expect(await x.ext.runJob(b, (await x.ext.claimNext(b))!)).toBe('DONE');
      expect(x.calls('budget')).toBe(1);
      const attempts = await x.db.select().from(t.externalAttempts).where(eq(t.externalAttempts.brandId, x.brand.id));
      expect(attempts.filter(r => r.attemptNumber === 2)).toHaveLength(1); // earlier attempt kept
      expect((await x.view(jobId)).status).toBe('SUCCEEDED');
    });

    it('C1 evidence: a credential expiry recorded only in Brandopolis never counts; the provider confirmation does', async () => {
      const x = await prepare({ leaseMs: 1_000, processingWindowMs: 10_000 });
      const { jobId } = await x.enqueue((await x.authorize()).id);
      const a = await x.ext.registerWorker('host-a', 1), b = await x.ext.registerWorker('host-b', 2);
      x.hooks.beforeNetworkWrite = () => { throw new Error('process crashed after DISPATCHING'); };
      await expect(x.ext.runJob(a, (await x.ext.claimNext(a))!)).rejects.toThrow(/crashed/);
      x.hooks.beforeNetworkWrite = undefined;
      x.advance(2_000);
      expect(await x.ext.claimNext(b)).toBeUndefined();
      const [attempt] = await x.db.select().from(t.externalAttempts).where(eq(t.externalAttempts.brandId, x.brand.id));
      // A local record claiming the credential is unusable (not confirmed by the provider) is ignored.
      await x.db.insert(t.externalAttemptOutcomes).values({ id: randomUUID(), workspaceId: x.who.workspaceId, brandId: x.brand.id, attemptId: attempt.id, kind: 'EMIT_IMPOSSIBLE', providerIds: {}, evidence: { type: 'CREDENTIAL_UNUSABLE', source: 'BRANDOPOLIS', reason: 'EXPIRED' }, recordedAt: x.clock() });
      x.advance(11_000);
      expect(await x.ext.reconcile(jobId)).toEqual([{ step: 'budget', resolution: 'UNRESOLVED' }]);
      await expect(x.retry(jobId, 'budget', 'La credencial venció según Brandopolis')).rejects.toThrow(/NO_EVIDENCE_THAT_ATTEMPT_CANNOT_EMIT/);
      // The provider confirms it no longer accepts that attempt's credential: recorded as evidence, then the window.
      x.sim.revokeAttemptCredential(attempt.id);
      expect(await x.ext.reconcile(jobId)).toEqual([{ step: 'budget', resolution: 'UNRESOLVED' }]);
      await expect(x.retry(jobId, 'budget', 'El proveedor revocó la credencial')).rejects.toThrow(/REMOTE_RESULT_UNRESOLVED/);
      x.advance(11_000);
      expect(await x.ext.reconcile(jobId)).toEqual([{ step: 'budget', resolution: 'ABSENCE_CONFIRMED' }]);
      expect(await x.retry(jobId, 'budget', 'El proveedor revocó la credencial y no hay creación')).toMatchObject({ queued: true });
      expect(await x.ext.runJob(b, (await x.ext.claimNext(b))!)).toBe('DONE');
      expect(x.calls('budget')).toBe(1);
    });
    it('C1 evidence: the supervisor records a real child-process exit as PROCESS_TERMINATED for that worker only', async () => {
      const x = await prepare();
      const { spawn } = await import('node:child_process');
      const { superviseWorker } = await import('../src/application/worker-supervisor.js');
      const child = spawn(process.execPath, ['-e', 'setTimeout(()=>{},30)'], { stdio: 'ignore' });
      const instance = await x.ext.registerWorker('this-host', child.pid!);
      const other = await x.ext.registerWorker('this-host', process.pid);
      expect(await superviseWorker(child, instance, x.ext)).toMatchObject({ code: 0 });
      const [recorded] = await x.db.select().from(t.workerInstances).where(eq(t.workerInstances.id, instance));
      expect(recorded.terminatedAt).toBeInstanceOf(Date);
      expect(recorded.terminationEvidence).toMatchObject({ type: 'PROCESS_TERMINATED', observer: expect.stringMatching(/^supervisor@/) });
      const [untouched] = await x.db.select().from(t.workerInstances).where(eq(t.workerInstances.id, other));
      expect(untouched.terminatedAt).toBeNull();
    });

    it('EXT-019: a late success that contradicts a recorded absence keeps all evidence, flags a possible duplicate and stops', async () => {
      const x = await prepare({ leaseMs: 1_000, dispatchWindowMs: 600_000, processingWindowMs: 1_000 });
      const { jobId } = await x.enqueue((await x.authorize()).id);
      const a = await x.ext.registerWorker('host-a', 1), b = await x.ext.registerWorker('host-b', 2);
      let suspended = false;
      x.hooks.beforeNetworkWrite = async () => {
        if (suspended) return; suspended = true;
        x.advance(2_000); await x.ext.claimNext(b);
        await x.ext.recordWorkerTermination(a, 'supervisor@host-a'); // wrong evidence on purpose: A is alive
        x.advance(2_000); expect(await x.ext.reconcile(jobId)).toEqual([{ step: 'budget', resolution: 'ABSENCE_CONFIRMED' }]);
      };
      expect(await x.ext.runJob(a, (await x.ext.claimNext(a))!)).toBe('LATE');
      expect(await x.view(jobId)).toMatchObject({ status: 'NEEDS_CHECK', blockedReason: 'POSSIBLE_DUPLICATE' });
      const kinds = (await x.db.select().from(t.externalAttemptOutcomes).where(eq(t.externalAttemptOutcomes.brandId, x.brand.id))).map(o => o.kind).sort();
      expect(kinds).toEqual(['EMIT_IMPOSSIBLE', 'LATE_RESULT', 'REMOTE_ABSENCE_CONFIRMED']);
    });

    it('security review: a flagged possible duplicate is never cleared by reconciliation nor retried', async () => {
      const x = await prepare({ leaseMs: 1_000, dispatchWindowMs: 600_000, processingWindowMs: 1_000 });
      const { jobId } = await x.enqueue((await x.authorize()).id);
      const a = await x.ext.registerWorker('host-a', 1), b = await x.ext.registerWorker('host-b', 2);
      let suspended = false;
      x.hooks.beforeNetworkWrite = async () => {
        if (suspended) return; suspended = true;
        x.advance(2_000); await x.ext.claimNext(b);
        await x.ext.recordWorkerTermination(a, 'supervisor@host-a');
        x.advance(2_000); await x.ext.reconcile(jobId);
      };
      expect(await x.ext.runJob(a, (await x.ext.claimNext(a))!)).toBe('LATE');
      expect(await x.ext.reconcile(jobId)).toEqual([]);
      expect(await x.view(jobId)).toMatchObject({ status: 'NEEDS_CHECK', blockedReason: 'POSSIBLE_DUPLICATE' });
      await expect(x.retry(jobId, 'budget', 'El proveedor no muestra la campaña')).rejects.toThrow(/POSSIBLE_DUPLICATE/);
      expect(await x.ext.claimNext(b)).toBeUndefined();
      expect(x.calls('budget')).toBe(1);
    });

    it('security review: one open job per campaign — a second authorization cannot create a parallel job', async () => {
      const x = await prepare();
      const first = await x.authorize(), second = await x.authorize();
      await x.enqueue(first.id);
      await expect(x.enqueue(second.id)).rejects.toMatchObject({ code: 'CONFLICT' });
    });

    it('security review: a worker fenced as terminated cannot claim or start an attempt', async () => {
      const x = await prepare();
      await x.enqueue((await x.authorize()).id);
      const w = await x.ext.registerWorker('host-a', 1);
      const claim = (await x.ext.claimNext(w))!;
      await x.ext.recordWorkerTermination(w, 'supervisor@host-a');
      expect(await x.ext.runJob(w, claim)).toBe('LEASE_LOST');
      expect(await x.ext.claimNext(w)).toBeUndefined();
      expect(x.sim.calls).toHaveLength(0);
    });

    it('security review: linking requires an account the credential can access, and the connector or an ADMIN', async () => {
      const x = await prepare();
      await expect(x.as((tx, a) => x.ext.linkAccount(tx, a, { connectionId: x.connection.id, externalAccountId: '999-000', externalAccountLabel: 'Ajena' }))).rejects.toMatchObject({ code: 'NOT_FOUND' });
      const member = await seedIdentity(x.db, 'MEMBER', x.who.workspaceId);
      await x.db.insert(t.assignments).values({ workspaceId: x.who.workspaceId, brandId: x.brand.id, userId: member.userId });
      await x.engine.changeBrandCapability(x.who.token, { brandId: x.brand.id, userId: member.userId, capability: 'MANAGE_CONNECTIONS', grant: true });
      x.sim.accounts.push({ id: '777-888', label: 'Segunda' });
      await expect(x.as((tx, a) => x.ext.linkAccount(tx, a, { connectionId: x.connection.id, externalAccountId: '777-888', externalAccountLabel: 'Segunda' }), member.token)).rejects.toMatchObject({ code: 'FORBIDDEN' });
      expect((await x.engine.brandCapabilities(member.token, x.brand.id)).grants, 'members do not see the grant list').toEqual([]);
      // The confirmed account travels with every remote step.
      await x.enqueue((await x.authorize()).id);
      const w = await x.ext.registerWorker('host-a', 1);
      await x.ext.runJob(w, (await x.ext.claimNext(w))!);
      expect(new Set(x.sim.calls.map(c => c.externalAccountId))).toEqual(new Set(['123-456']));
    });

    it('EXT-021: while a step is uncertain, no new authorization or job for the same campaign is accepted', async () => {
      const x = await prepare();
      x.sim.arm('budget', 'TIMEOUT_AFTER_SEND');
      await x.enqueue((await x.authorize()).id);
      const w = await x.ext.registerWorker('host-a', 1);
      expect(await x.ext.runJob(w, (await x.ext.claimNext(w))!)).toBe('NEEDS_CHECK');
      await expect(x.authorize()).rejects.toMatchObject({ code: 'CONFLICT' });
    });

    it('a rejected step needs a valid authorization; a new authorization continues the same job without repeating created steps', async () => {
      const x = await prepare({ authorizationTtlMs: 60_000 });
      x.sim.arm('ad_group', 'REJECT');
      const { jobId } = await x.enqueue((await x.authorize()).id);
      const w = await x.ext.registerWorker('host-a', 1);
      expect(await x.ext.runJob(w, (await x.ext.claimNext(w))!)).toBe('REJECTED');
      expect((await x.view(jobId)).status).toBe('PARTIAL');
      x.advance(61_000);
      await expect(x.retry(jobId, 'ad_group', 'Corregimos el grupo de anuncios')).rejects.toMatchObject({ code: 'CONFLICT' });
      x.sim.arm('ad_group');
      const continued = await x.enqueue((await x.authorize()).id);
      expect(continued).toMatchObject({ jobId, continued: true });
      // The new authorization alone does not resend the rejected step: a person releases it with a criterion.
      expect(await x.ext.runJob(w, (await x.ext.claimNext(w))!)).toBe('BLOCKED');
      expect(x.calls('ad_group')).toBe(1);
      await x.retry(jobId, 'ad_group', 'Corregimos el grupo de anuncios');
      expect(await x.ext.runJob(w, (await x.ext.claimNext(w))!)).toBe('DONE');
      expect([x.calls('budget'), x.calls('campaign'), x.calls('ad_group'), x.calls('keywords'), x.calls('ad')]).toEqual([1, 1, 2, 1, 1]);
      expect((await x.view(jobId)).status).toBe('SUCCEEDED');
    });

    it('DEL-001 (security review): a campaign left live by a successful ACTIVATE blocks deletion even with no open job', async () => {
      const x = await prepare();
      await x.enqueue((await x.authorize()).id);
      const w = await x.ext.registerWorker('host-a', 1);
      expect(await x.ext.runJob(w, (await x.ext.claimNext(w))!)).toBe('DONE');
      const summary = { accountLabel: 'Cuenta de prueba', destination: 'https://ejemplo.test/oferta', currency: 'MXN', budget: { kind: 'DAILY_AVERAGE', amountMinor: 25000 }, startsOn: '2026-11-01', endsOn: '2026-11-30', timeZone: 'America/Mexico_City' };
      const activation = await x.as<{ id: string }>((tx, a) => x.ext.authorize(tx, a, { linkId: x.link.id, operation: 'ACTIVATE', subject: x.subject, summary, contentFingerprint: contentFingerprint({ subject: x.subject, v: 1 }), idempotencyKey: randomUUID() }));
      await x.enqueue(activation.id);
      expect(await x.ext.runJob(w, (await x.ext.claimNext(w))!)).toBe('DONE');
      await expect(x.engine.deleteBrand(x.who.token, { brandId: x.brand.id, confirmName: 'Marca Fase 4', idempotencyKey: randomUUID() })).rejects.toMatchObject({ code: 'CONFLICT' });
    });
    it('DEL-001/003: a brand with unresolved external operations cannot be deleted; once resolved, deletion removes its Phase 4 rows but keeps the workspace connection', async () => {
      const x = await prepare();
      x.sim.arm('budget', 'TIMEOUT_AFTER_SEND');
      const { jobId } = await x.enqueue((await x.authorize()).id);
      const w = await x.ext.registerWorker('host-a', 1);
      await x.ext.runJob(w, (await x.ext.claimNext(w))!);
      const del = () => x.engine.deleteBrand(x.who.token, { brandId: x.brand.id, confirmName: 'Marca Fase 4', idempotencyKey: randomUUID() });
      await expect(del()).rejects.toMatchObject({ code: 'CONFLICT' });
      await x.ext.reconcile(jobId);
      expect(await x.ext.runJob(w, (await x.ext.claimNext(w))!)).toBe('DONE');
      await x.engine.setWorkPriority(x.who.token, { brandId: x.brand.id, intent: 'WEBSITE', idempotencyKey: randomUUID() });
      expect(await del()).toMatchObject({ status: 'DELETED' });
      for (const table of [t.externalAttemptOutcomes, t.externalAttempts, t.externalStepReleases, t.externalSteps, t.externalJobs, t.operationAuthorizations, t.connectionBrandLinks, t.brandCapabilities, t.brandWorkPriorities])
        expect(await x.db.select().from(table).where(eq(table.brandId, x.brand.id))).toEqual([]);
      expect(await x.db.select().from(t.connections).where(eq(t.connections.id, x.connection.id))).toHaveLength(1);
    });
  });
}
