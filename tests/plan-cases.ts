import { describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import type { connect } from '../src/persistence/database.js';
import { Engine } from '../src/application/engine.js';
import { seedIdentity } from '../scripts/seed.js';
import * as t from '../src/persistence/schema.js';

const databaseError = async (query: Promise<unknown>) => { try { await query; return 'no error'; } catch (e) { return String((e as { cause?: { message?: string } }).cause?.message ?? (e as Error).message); } };

/** PHASE4_SPEC §4.2 · annual marketing plan with 90-day priorities, actions, owners, dates, budget and indicators. */
export function planCases(connection: () => ReturnType<typeof connect>) {
  const setup = async () => {
    const db = connection().db, engine = new Engine(db), who = await seedIdentity(db);
    const brand = await engine.createBrand(who.token, 'Marca con plan');
    const cmd = (action: Parameters<Engine['planCommand']>[1], input: Record<string, unknown>, token = who.token) => engine.planCommand(token, action, { brandId: brand.id, ...input });
    const read = (year = 2027, token = who.token) => engine.marketingPlan(token, brand.id, year);
    const action = (extra: Record<string, unknown> = {}) => ({ title: 'Webinar para agencias', kind: 'INSTITUTIONAL', offerId: null, objectiveId: null, owner: '', startDate: null, dueDate: null, budget: null, indicator: '', ...extra });
    return { db, engine, who, brand, cmd, read, action };
  };

  describe('PHASE4_SPEC §4.2 · marketing plan', () => {
    it('a useful draft exists without the full strategy: guidance lists what is missing; objectives, 90-day priorities and actions fill it', async () => {
      const x = await setup();
      expect(await x.read()).toMatchObject({ year: 2027, plan: null });
      const plan = await x.cmd('create', { year: 2027, focusStart: '2027-01-04' });
      expect(await x.cmd('create', { year: 2027 })).toMatchObject({ planId: plan.planId, replayed: true });
      let view = (await x.read()).plan!;
      expect(view.focus).toEqual({ start: '2027-01-04', end: '2027-04-03' });
      expect(view.gaps).toEqual(['ANNUAL_OBJECTIVE', 'NINETY_DAY_PRIORITY', 'ACTIONS']);
      await x.cmd('add-objective', { planId: plan.planId, content: { horizon: 'ANNUAL', title: 'Duplicar clientes recurrentes', measure: 'Clientes recurrentes al cierre del año' }, idempotencyKey: randomUUID() });
      const priority = await x.cmd('add-objective', { planId: plan.planId, content: { horizon: 'NINETY_DAYS', title: 'Primeros diez clientes del diagnóstico', measure: '' }, idempotencyKey: randomUUID() });
      const added = await x.cmd('add-action', { planId: plan.planId, content: x.action({ objectiveId: priority.objectiveId }), idempotencyKey: randomUUID() });
      view = (await x.read()).plan!;
      expect(view.gaps).toEqual(['OWNER', 'DATES', 'INDICATOR', 'MEASURE']);
      await x.cmd('update-action', { actionId: added.actionId, expectedRevision: 0, content: x.action({ objectiveId: priority.objectiveId, owner: 'Ana', startDate: '2027-01-11', dueDate: '2027-01-29', budget: { amountMinor: 500000, currency: 'mxn', certainty: 'ESTIMATED' }, indicator: 'Registros al webinar' }) });
      view = (await x.read()).plan!;
      expect(view.actions[0]).toMatchObject({ owner: 'Ana', dueDate: '2027-01-29', budget: { amountMinor: 500000, currency: 'MXN', certainty: 'ESTIMATED' }, indicator: 'Registros al webinar', status: 'PLANNED', revision: 1 });
      expect(view.gaps).toEqual(['MEASURE']);
      // Another year is another plan.
      expect((await x.read(2028)).plan).toBeNull();
    });

    it('INV-009/010: every edit needs the revision the client saw; creations replay by key; changes are logged append-only', async () => {
      const x = await setup();
      const plan = await x.cmd('create', { year: 2027 });
      const key = randomUUID();
      const first = await x.cmd('add-action', { planId: plan.planId, content: x.action(), idempotencyKey: key });
      expect(await x.cmd('add-action', { planId: plan.planId, content: x.action(), idempotencyKey: key })).toMatchObject({ actionId: first.actionId, replayed: true });
      await expect(x.cmd('add-action', { planId: plan.planId, content: x.action({ title: 'Otra' }), idempotencyKey: key })).rejects.toMatchObject({ code: 'CONFLICT' });
      await expect(x.cmd('update-action', { actionId: first.actionId, content: x.action({ owner: 'Luis' }) })).rejects.toMatchObject({ code: 'INVALID' });
      await x.cmd('update-action', { actionId: first.actionId, expectedRevision: 0, content: x.action({ owner: 'Luis' }) });
      await expect(x.cmd('update-action', { actionId: first.actionId, expectedRevision: 0, content: x.action({ owner: 'Ana' }) })).rejects.toMatchObject({ code: 'CONFLICT' });
      await expect(x.cmd('update', { planId: plan.planId, expectedRevision: 3, focusStart: '2027-02-01' })).rejects.toMatchObject({ code: 'CONFLICT' });
      await x.cmd('update', { planId: plan.planId, expectedRevision: 0, focusStart: '2027-02-01' });
      const changes = await x.db.select().from(t.planChanges).where(eq(t.planChanges.planId, String(plan.planId)));
      expect(changes.map(c => `${c.entityType}:${c.operation}:${c.revision}`).sort()).toEqual(['ACTION:CREATE:0', 'ACTION:UPDATE:1', 'PLAN:CREATE:0', 'PLAN:UPDATE:1']);
      expect(await databaseError(x.db.execute(sql`update plan_changes set operation='UPDATE' where "planId"=${plan.planId}`))).toMatch(/append-only/);
      expect(await databaseError(x.db.execute(sql`delete from plan_changes where "planId"=${plan.planId}`))).toMatch(/append-only/);
      expect(await databaseError(x.db.execute(sql`update plan_actions set revision=0 where id=${first.actionId}`))).toMatch(/backwards/);
      const audits = (await x.db.select().from(t.audits).where(eq(t.audits.brandId, x.brand.id))).filter(a => a.operation.startsWith('PLAN_'));
      expect(audits.map(a => a.operation).sort()).toEqual(['PLAN_ADD_ACTION', 'PLAN_CREATE', 'PLAN_UPDATE', 'PLAN_UPDATE_ACTION']);
    });

    it('a commercial action cites an offer of this brand; objectives belong to the plan; dates and budget are coherent', async () => {
      const x = await setup();
      const plan = await x.cmd('create', { year: 2027 });
      await expect(x.cmd('add-action', { planId: plan.planId, content: x.action({ kind: 'COMMERCIAL' }), idempotencyKey: randomUUID() })).rejects.toMatchObject({ code: 'INVALID' });
      const other = await x.engine.createBrand(x.who.token, 'Otra marca');
      const foreignOffer = await x.engine.offerCommand(x.who.token, 'create', { brandId: other.id, content: { name: 'Ajena', kind: 'SERVICE', audience: { customerDecisionVersionId: null, segment: '' }, need: '', outcome: '', benefits: [], differentiators: [], conditions: '', proofIds: [], sourceDecisionVersionIds: [], hypothesisIds: [], price: null }, idempotencyKey: randomUUID() });
      await expect(x.cmd('add-action', { planId: plan.planId, content: x.action({ kind: 'COMMERCIAL', offerId: foreignOffer.offerId }), idempotencyKey: randomUUID() })).rejects.toMatchObject({ code: 'INVALID' });
      const own = await x.engine.offerCommand(x.who.token, 'create', { brandId: x.brand.id, content: { name: 'Diagnóstico', kind: 'SERVICE', audience: { customerDecisionVersionId: null, segment: '' }, need: '', outcome: '', benefits: [], differentiators: [], conditions: '', proofIds: [], sourceDecisionVersionIds: [], hypothesisIds: [], price: null }, idempotencyKey: randomUUID() });
      const commercial = await x.cmd('add-action', { planId: plan.planId, content: x.action({ kind: 'COMMERCIAL', offerId: own.offerId }), idempotencyKey: randomUUID() });
      expect((await x.read()).offers).toEqual([{ id: own.offerId, status: 'ACTIVE', approved: false, name: 'Diagnóstico' }]);
      // An institutional action never keeps an offer.
      await x.cmd('update-action', { actionId: commercial.actionId, expectedRevision: 0, content: x.action({ kind: 'INSTITUTIONAL', offerId: own.offerId }) });
      expect((await x.read()).plan!.actions[0].offerId).toBeNull();
      const otherPlan = await x.engine.planCommand(x.who.token, 'create', { brandId: other.id, year: 2027 });
      const foreignObjective = await x.engine.planCommand(x.who.token, 'add-objective', { brandId: other.id, planId: otherPlan.planId, content: { horizon: 'ANNUAL', title: 'Ajeno', measure: '' }, idempotencyKey: randomUUID() });
      await expect(x.cmd('add-action', { planId: plan.planId, content: x.action({ objectiveId: foreignObjective.objectiveId }), idempotencyKey: randomUUID() })).rejects.toMatchObject({ code: 'INVALID' });
      await expect(x.cmd('add-action', { planId: plan.planId, content: x.action({ startDate: '2027-03-01', dueDate: '2027-02-01' }), idempotencyKey: randomUUID() })).rejects.toMatchObject({ code: 'INVALID' });
      await expect(x.cmd('add-action', { planId: plan.planId, content: x.action({ budget: { amountMinor: 100, currency: 'PESOS', certainty: 'CONFIRMED' } }), idempotencyKey: randomUUID() })).rejects.toMatchObject({ code: 'INVALID' });
      await expect(x.cmd('add-action', { planId: plan.planId, content: x.action({ budget: { amountMinor: 100, currency: 'MXN' } }), idempotencyKey: randomUUID() })).rejects.toMatchObject({ code: 'INVALID' });
      await expect(x.cmd('add-objective', { planId: plan.planId, content: { horizon: 'MONTH', title: 'x', measure: '' }, idempotencyKey: randomUUID() })).rejects.toMatchObject({ code: 'INVALID' });
      await expect(x.cmd('create', { year: 1999 })).rejects.toMatchObject({ code: 'INVALID' });
    });

    it('PlanAction state machine: PLANNED → IN_PROGRESS → DONE; PLANNED/IN_PROGRESS → CANCELLED; finished actions are read-only', async () => {
      const x = await setup();
      const plan = await x.cmd('create', { year: 2027 });
      const a = await x.cmd('add-action', { planId: plan.planId, content: x.action(), idempotencyKey: randomUUID() });
      await expect(x.cmd('action-status', { actionId: a.actionId, expectedRevision: 0, status: 'DONE' })).rejects.toMatchObject({ code: 'CONFLICT' });
      await expect(x.cmd('action-status', { actionId: a.actionId, expectedRevision: 0, status: 'FINISHED' })).rejects.toMatchObject({ code: 'INVALID' });
      await x.cmd('action-status', { actionId: a.actionId, expectedRevision: 0, status: 'IN_PROGRESS' });
      await x.cmd('action-status', { actionId: a.actionId, expectedRevision: 1, status: 'DONE' });
      await expect(x.cmd('action-status', { actionId: a.actionId, expectedRevision: 2, status: 'CANCELLED' })).rejects.toMatchObject({ code: 'CONFLICT' });
      await expect(x.cmd('update-action', { actionId: a.actionId, expectedRevision: 2, content: x.action({ title: 'Cambio' }) })).rejects.toMatchObject({ code: 'CONFLICT' });
      // Editing never changes the status.
      const b = await x.cmd('add-action', { planId: plan.planId, content: x.action({ title: 'Otra' }), idempotencyKey: randomUUID() });
      await x.cmd('update-action', { actionId: b.actionId, expectedRevision: 0, content: { ...x.action({ title: 'Otra' }), status: 'DONE' } });
      expect((await x.read()).plan!.actions.find(r => r.id === b.actionId)!.status).toBe('PLANNED');
    });

    it('tenancy: another workspace sees nothing; an unassigned member is refused; ids of another brand are not found', async () => {
      const x = await setup();
      const plan = await x.cmd('create', { year: 2027 });
      const a = await x.cmd('add-action', { planId: plan.planId, content: x.action(), idempotencyKey: randomUUID() });
      const stranger = await seedIdentity(x.db);
      await expect(x.read(2027, stranger.token)).rejects.toMatchObject({ code: 'NOT_FOUND' });
      const member = await seedIdentity(x.db, 'MEMBER', x.who.workspaceId);
      await expect(x.read(2027, member.token)).rejects.toMatchObject({ code: 'FORBIDDEN' });
      await expect(x.cmd('update-action', { actionId: a.actionId, expectedRevision: 0, content: x.action() }, member.token)).rejects.toMatchObject({ code: 'FORBIDDEN' });
      await x.db.insert(t.assignments).values({ workspaceId: x.who.workspaceId, brandId: x.brand.id, userId: member.userId });
      await x.cmd('update-action', { actionId: a.actionId, expectedRevision: 0, content: x.action({ owner: 'Integrante' }) }, member.token);
      const other = await x.engine.createBrand(x.who.token, 'Otra marca');
      await expect(x.engine.planCommand(x.who.token, 'update-action', { brandId: other.id, actionId: a.actionId, expectedRevision: 1, content: x.action() })).rejects.toMatchObject({ code: 'NOT_FOUND' });
      await expect(x.engine.planCommand(x.who.token, 'add-action', { brandId: other.id, planId: plan.planId, content: x.action(), idempotencyKey: randomUUID() })).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });

    it('PLN-001/002: a fixed version is reviewed and approved on its exact content; internal edits never change what the client received', async () => {
      const x = await setup();
      const plan = await x.cmd('create', { year: 2027, focusStart: '2027-01-04' });
      await expect(x.cmd('share', { planId: plan.planId, idempotencyKey: randomUUID() })).rejects.toMatchObject({ code: 'INVALID' });
      const first = await x.cmd('add-action', { planId: plan.planId, content: x.action({ owner: 'Ana', dueDate: '2027-01-29' }), idempotencyKey: randomUUID() });
      const key = randomUUID();
      const v1 = await x.cmd('share', { planId: plan.planId, idempotencyKey: key });
      expect(await x.cmd('share', { planId: plan.planId, idempotencyKey: key })).toMatchObject({ snapshotId: v1.snapshotId, replayed: true });
      await expect(x.cmd('share', { planId: plan.planId, idempotencyKey: randomUUID() })).rejects.toMatchObject({ code: 'CONFLICT' }); // one in review
      expect((await x.engine.sharedPlan(x.who.token, x.brand.id, 2027)).shared).toBeNull(); // nothing shared before approval
      const decide = (snapshot: Record<string, unknown>, extra: Record<string, unknown> = {}) => x.cmd('decide-share', { snapshotId: snapshot.snapshotId, fingerprint: snapshot.fingerprint, decision: 'APPROVE', criterion: 'Revisado con la dirección', idempotencyKey: randomUUID(), ...extra });
      await expect(decide(v1, { fingerprint: 'f'.repeat(64) })).rejects.toMatchObject({ code: 'CONFLICT' }); // PLN-002
      const decision = { idempotencyKey: randomUUID() };
      await decide(v1, decision);
      expect(await decide(v1, decision)).toMatchObject({ status: 'APPROVED', replayed: true });
      await expect(decide(v1)).rejects.toMatchObject({ code: 'CONFLICT' });
      let shared = (await x.engine.sharedPlan(x.who.token, x.brand.id, 2027)).shared!;
      expect(shared.content.actions.map(a => [a.title, a.owner])).toEqual([['Webinar para agencias', 'Ana']]);
      expect(shared.content.focus).toEqual({ start: '2027-01-04', end: '2027-04-03' });
      await expect(x.cmd('share', { planId: plan.planId, idempotencyKey: randomUUID() })).rejects.toMatchObject({ code: 'CONFLICT' }); // identical to shared
      // PLN-001: editing the plan leaves the shared copy intact and marks «changed since shared».
      await x.cmd('update-action', { actionId: first.actionId, expectedRevision: 0, content: x.action({ owner: 'Luis', dueDate: '2027-02-12' }) });
      shared = (await x.engine.sharedPlan(x.who.token, x.brand.id, 2027)).shared!;
      expect(shared.content.actions[0]).toMatchObject({ owner: 'Ana', dueDate: '2027-01-29', revision: 0 });
      expect((await x.read()).plan!.sharing.changedSinceShared).toBe(true);
      // A change of approved content needs a new version and its review; until approved the client keeps v1.
      const v2 = await x.cmd('share', { planId: plan.planId, idempotencyKey: randomUUID() });
      expect((await x.engine.sharedPlan(x.who.token, x.brand.id, 2027)).shared!.sequence).toBe(1);
      await decide(v2);
      shared = (await x.engine.sharedPlan(x.who.token, x.brand.id, 2027)).shared!;
      expect(shared).toMatchObject({ sequence: 2 });
      expect(shared.content.actions[0].owner).toBe('Luis');
      const view = (await x.read()).plan!;
      expect(view.sharing.history.map(h => h.status)).toEqual(['SUPERSEDED', 'APPROVED']);
      expect(view.sharing.changedSinceShared).toBe(false);
      // Database: a snapshot is immutable and only moves forward; approvals are append-only.
      expect(await databaseError(x.db.execute(sql`update plan_snapshots set content='{}'::jsonb where id=${v2.snapshotId}`))).toMatch(/immutable/);
      expect(await databaseError(x.db.execute(sql`update plan_snapshots set status='IN_REVIEW' where id=${v2.snapshotId}`))).toMatch(/not allowed/);
      expect(await databaseError(x.db.execute(sql`delete from plan_snapshot_approvals where "snapshotId"=${v2.snapshotId}`))).toMatch(/append-only/);
      const audits = (await x.db.select().from(t.audits).where(eq(t.audits.brandId, x.brand.id))).filter(a => a.operation.startsWith('PLAN_SHARE'));
      expect(audits.map(a => a.operation).sort()).toEqual(['PLAN_SHARE', 'PLAN_SHARE', 'PLAN_SHARE_APPROVE', 'PLAN_SHARE_APPROVE']);
      expect(audits.find(a => a.operation === 'PLAN_SHARE_APPROVE' && a.previousVersion === v1.snapshotId)).toMatchObject({ newVersion: v2.snapshotId, rationale: 'Revisado con la dirección' });
    });

    it('PLN-002: requesting changes keeps the client on the approved version; an older version cannot be approved after a newer one', async () => {
      const x = await setup();
      const plan = await x.cmd('create', { year: 2027 });
      const a = await x.cmd('add-action', { planId: plan.planId, content: x.action(), idempotencyKey: randomUUID() });
      const v1 = await x.cmd('share', { planId: plan.planId, idempotencyKey: randomUUID() });
      await x.cmd('decide-share', { snapshotId: v1.snapshotId, fingerprint: v1.fingerprint, decision: 'REQUEST_CHANGES', criterion: 'Falta el presupuesto del webinar', idempotencyKey: randomUUID() });
      expect((await x.engine.sharedPlan(x.who.token, x.brand.id, 2027)).shared).toBeNull();
      await expect(x.cmd('decide-share', { snapshotId: v1.snapshotId, fingerprint: v1.fingerprint, decision: 'APPROVE', criterion: 'Lo aprobamos después', idempotencyKey: randomUUID() })).rejects.toMatchObject({ code: 'CONFLICT' });
      await x.cmd('update-action', { actionId: a.actionId, expectedRevision: 0, content: x.action({ budget: { amountMinor: 100000, currency: 'MXN', certainty: 'ESTIMATED' } }) });
      const v2 = await x.cmd('share', { planId: plan.planId, idempotencyKey: randomUUID() });
      expect(v2.sequence).toBe(2);
      await x.cmd('decide-share', { snapshotId: v2.snapshotId, fingerprint: v2.fingerprint, decision: 'APPROVE', criterion: 'Ya incluye el presupuesto', idempotencyKey: randomUUID() });
      expect((await x.engine.sharedPlan(x.who.token, x.brand.id, 2027)).shared!.content.actions[0].budget).toEqual({ amountMinor: 100000, currency: 'MXN', certainty: 'ESTIMATED' });
    });

    it('PLN-003: progress is shared without a new approval; actions added later are not visible until another version', async () => {
      const x = await setup();
      const plan = await x.cmd('create', { year: 2027 });
      const a = await x.cmd('add-action', { planId: plan.planId, content: x.action(), idempotencyKey: randomUUID() });
      // Before sharing, a status change records no shared progress.
      expect(await x.cmd('action-status', { actionId: a.actionId, expectedRevision: 0, status: 'IN_PROGRESS' })).toMatchObject({ progressShared: false });
      const v1 = await x.cmd('share', { planId: plan.planId, idempotencyKey: randomUUID() });
      await x.cmd('decide-share', { snapshotId: v1.snapshotId, fingerprint: v1.fingerprint, decision: 'APPROVE', criterion: 'Plan listo para el cliente', idempotencyKey: randomUUID() });
      expect((await x.engine.sharedPlan(x.who.token, x.brand.id, 2027)).shared!.progress).toEqual([{ actionId: a.actionId, status: 'IN_PROGRESS', date: null, note: null }]);
      await expect(x.cmd('action-status', { actionId: a.actionId, expectedRevision: 1, status: 'DONE', note: 'x'.repeat(281) })).rejects.toMatchObject({ code: 'INVALID' });
      expect(await x.cmd('action-status', { actionId: a.actionId, expectedRevision: 1, status: 'DONE', note: 'Asistieron 40 personas' })).toMatchObject({ progressShared: true });
      const later = await x.cmd('add-action', { planId: plan.planId, content: x.action({ title: 'Acción posterior' }), idempotencyKey: randomUUID() });
      await x.cmd('action-status', { actionId: later.actionId, expectedRevision: 0, status: 'IN_PROGRESS' });
      const shared = (await x.engine.sharedPlan(x.who.token, x.brand.id, 2027)).shared!;
      expect(shared.sequence).toBe(1); // no new approval was needed
      expect(shared.content.actions.map(r => r.title)).toEqual(['Webinar para agencias']);
      expect(shared.progress).toEqual([{ actionId: a.actionId, status: 'DONE', date: new Date().toISOString().slice(0, 10), note: 'Asistieron 40 personas' }]);
      // The snapshot keeps the status it had when shared; progress is a separate record.
      expect(shared.content.actions[0].status).toBe('IN_PROGRESS');
      expect(await databaseError(x.db.execute(sql`update plan_progress_updates set note='otra' where "snapshotId"=${v1.snapshotId}`))).toMatch(/append-only/);
    });

    it('scope of the shared plan: only members of the brand read it; another workspace or an unassigned member never do', async () => {
      const x = await setup();
      const plan = await x.cmd('create', { year: 2027 });
      await x.cmd('add-action', { planId: plan.planId, content: x.action(), idempotencyKey: randomUUID() });
      const v1 = await x.cmd('share', { planId: plan.planId, idempotencyKey: randomUUID() });
      const stranger = await seedIdentity(x.db), member = await seedIdentity(x.db, 'MEMBER', x.who.workspaceId);
      await expect(x.engine.sharedPlan(stranger.token, x.brand.id, 2027)).rejects.toMatchObject({ code: 'NOT_FOUND' });
      await expect(x.engine.sharedPlan(member.token, x.brand.id, 2027)).rejects.toMatchObject({ code: 'FORBIDDEN' });
      await expect(x.engine.planCommand(member.token, 'decide-share', { brandId: x.brand.id, snapshotId: v1.snapshotId, fingerprint: v1.fingerprint, decision: 'APPROVE', criterion: 'Sin asignación', idempotencyKey: randomUUID() })).rejects.toMatchObject({ code: 'FORBIDDEN' });
      const other = await x.engine.createBrand(x.who.token, 'Otra marca');
      await expect(x.engine.planCommand(x.who.token, 'decide-share', { brandId: other.id, snapshotId: v1.snapshotId, fingerprint: v1.fingerprint, decision: 'APPROVE', criterion: 'Desde otra marca', idempotencyKey: randomUUID() })).rejects.toMatchObject({ code: 'NOT_FOUND' });
      expect((await x.engine.sharedPlan(x.who.token, other.id, 2027)).shared).toBeNull();
    });
  });
}
