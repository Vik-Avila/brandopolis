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
  });
}
