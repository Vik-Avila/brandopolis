import { describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import type { connect } from '../src/persistence/database.js';
import { Engine, hash } from '../src/application/engine.js';
import { submitWebForm } from '../src/application/clients.js';
import { seedIdentity } from '../scripts/seed.js';
import * as t from '../src/persistence/schema.js';
import { attention, calendarDate, evidence, landingPath, referrerHost } from '../src/domain/clients.js';

const databaseError = async (query: Promise<unknown>) => { try { await query; return 'no error'; } catch (e) { return String((e as { cause?: { message?: string } }).cause?.message ?? (e as Error).message); } };

/** ADR-0035 · Clientes capture (I10-CLI, I10-SEC, I10-RES, I10-ATR-01…03/08, I10-CHN-03). Deterministic DEMO; no AI. */
export function clientCases(connection: () => ReturnType<typeof connect>) {
  const setup = async () => {
    const db = connection().db, engine = new Engine(db), team = await seedIdentity(db);
    const brand = await engine.createBrand(team.token, 'Marca con clientes');
    const otherBrand = await engine.createBrand(team.token, 'Otra marca del espacio');
    const cmd = (action: Parameters<Engine['clientsCommand']>[1], input: Record<string, unknown>, token = team.token, brandId = brand.id) => engine.clientsCommand(token, action, { brandId, idempotencyKey: randomUUID(), ...input }) as Promise<Record<string, unknown>>;
    const form = async (brandId = brand.id, extra: Record<string, unknown> = {}) => (await cmd('form', { name: 'Contacto del sitio', ...extra }, team.token, brandId)) as { formId: string; publicId: string };
    const submission = (publicId: string, over: Record<string, unknown> = {}) => ({ form: publicId, submissionId: randomUUID(), name: 'Ana Pérez', email: 'ana@example.com', need: 'Cotización de 50 cajas', consent: { contactPurpose: true }, ...over });
    return { db, engine, team, brand, otherBrand, cmd, form, submission };
  };

  describe('ADR-0035 · Clientes: capture, follow-up, isolation and results', () => {
    it('domain: allow-listed evidence, campaign status with cause, sanitized path and referrer, dates and pending work', () => {
      const e = evidence({ utm: { source: 'facebook', medium: 'cpc', campaign: 'otono', evil: 'x' }, clickIds: { fbclid: 'IwAR0abc', other: 'y' }, landingPath: '/formulario?email=ana@example.com#x', referrer: 'https://l.facebook.com/l.php?u=secret' }, { attentionChannel: 'WEB_FORM' });
      expect(e).toMatchObject({ attentionChannel: 'WEB_FORM', acquisitionPlatform: 'META', utm: { source: 'facebook', medium: 'cpc', campaign: 'otono' }, clickIds: { fbclid: 'IwAR0abc' }, landingPath: '/formulario', referrerHost: 'l.facebook.com', campaignStatus: 'CAPTURED_UNVERIFIED', campaignCause: null });
      expect(JSON.stringify(e)).not.toMatch(/evil|other|secret|ana@/);
      expect(evidence({}, { attentionChannel: 'UNKNOWN' })).toMatchObject({ campaignStatus: 'UNIDENTIFIED', campaignCause: 'NO_REFERENCE', acquisitionPlatform: 'UNKNOWN' });
      expect(evidence({ declaredOrigin: 'Me lo recomendó un amigo' }, { attentionChannel: 'PHONE' })).toMatchObject({ campaignStatus: 'UNIDENTIFIED', campaignCause: 'DECLARED_ONLY', declaredOrigin: 'Me lo recomendó un amigo' });
      // A utm_source alone does not prove the platform; a campaign without click id is still only captured.
      expect(evidence({ utm: { source: 'google' } }, { attentionChannel: 'WEB_FORM' })).toMatchObject({ acquisitionPlatform: 'OTHER', campaignStatus: 'UNIDENTIFIED' });
      expect(evidence({ utm: { campaign: '<script>' } }, { attentionChannel: 'WEB_FORM' }).utm).toEqual({});
      expect(landingPath('https://evil.example/x')).toBeNull();
      expect(referrerHost('not a url')).toBeNull();
      expect(() => calendarDate('2026-02-30')).toThrow();
      expect(attention({ ownerUserId: null, nextActionDate: null }, '2026-10-11')).toEqual(['UNASSIGNED', 'NO_FOLLOW_UP']);
      expect(attention({ ownerUserId: 'u', nextActionDate: '2026-10-10' }, '2026-10-11')).toEqual(['OVERDUE']);
      expect(attention({ ownerUserId: 'u', nextActionDate: '2026-10-11' }, '2026-10-11')).toEqual([]);
    });

    it('I10-CLI-01/03/07/08 · I10-ATR-02/03: manual entry persists with origin, queue and pending work; follow-up with revision (409 on stale) and audited history', async () => {
      const x = await setup();
      const segment = (await x.cmd('segment', { name: 'Restaurantes' })) as { segmentId: string };
      const created = (await x.cmd('create', { personName: 'Luis Gómez', contactPhone: '+52 55 1234 5678', need: 'Quiere precios para su cafetería', attentionChannel: 'PHONE', declaredOrigin: 'Vio un anuncio en Instagram', segmentId: segment.segmentId })) as { opportunityId: string; reference: string; replayed: boolean };
      expect(created).toMatchObject({ replayed: false, reference: expect.stringMatching(/^OP-[0-9A-F]{8}$/) });
      // A new session (another token of the same person) sees the same persisted record.
      const again = await x.db.insert(t.sessions).values({ tokenHash: hash('second-session-token-0123456789abcdef'), userId: x.team.userId, workspaceId: x.team.workspaceId, expiresAt: new Date(Date.now() + 3600000) }).then(() => 'second-session-token-0123456789abcdef');
      let data = await x.engine.clients(again, x.brand.id);
      const o = data.opportunities.find(r => r.id === created.opportunityId)!;
      expect(o).toMatchObject({ status: 'NEW', source: 'MANUAL', ownerUserId: null, segmentId: segment.segmentId, nextActionDate: null, attention: ['UNASSIGNED', 'NO_FOLLOW_UP'] });
      expect(o.origin).toMatchObject({ kind: 'MANUAL_ENTRY', attentionChannel: 'PHONE', declaredOrigin: 'Vio un anuncio en Instagram', campaignStatus: 'UNIDENTIFIED', campaignCause: 'DECLARED_ONLY' });
      // Follow-up and assignment with the revision the client saw; a stale revision is a 409 and changes nothing.
      const tomorrow = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
      expect(await x.cmd('update', { opportunityId: o.id, expectedRevision: 0, ownerUserId: x.team.userId, nextAction: 'Llamar con precios', nextActionDate: tomorrow, status: 'IN_PROGRESS' })).toMatchObject({ revision: 1, changed: true });
      await expect(x.cmd('update', { opportunityId: o.id, expectedRevision: 0, nextAction: 'Otra cosa', nextActionDate: tomorrow })).rejects.toMatchObject({ code: 'CONFLICT' });
      data = await x.engine.clients(x.team.token, x.brand.id);
      expect(data.opportunities[0]).toMatchObject({ revision: 1, status: 'IN_PROGRESS', ownerUserId: x.team.userId, ownerName: 'Tú', nextAction: 'Llamar con precios', nextActionDate: tomorrow, attention: [] });
      expect(data.opportunities[0].history.map(h => h.kind).sort()).toEqual(['ASSIGNED', 'CREATED', 'FOLLOW_UP_SET', 'STATUS_CHANGED']);
      // A follow-up date without saying what it is, an unknown status or a past-due follow-up are handled explicitly.
      await expect(x.cmd('update', { opportunityId: o.id, expectedRevision: 1, nextAction: '', nextActionDate: tomorrow })).rejects.toMatchObject({ code: 'INVALID' });
      await expect(x.cmd('update', { opportunityId: o.id, expectedRevision: 1, status: 'WON' })).rejects.toMatchObject({ code: 'INVALID' });
      await x.cmd('update', { opportunityId: o.id, expectedRevision: 1, nextActionDate: '2020-01-01' });
      expect((await x.engine.clients(x.team.token, x.brand.id)).opportunities[0].attention).toEqual(['OVERDUE']);
      // Audit carries ids only, never the person's name, contact or need.
      const audits = await x.db.select().from(t.audits).where(and(eq(t.audits.brandId, x.brand.id), sql`${t.audits.operation} like 'CLIENTS_%'`));
      expect(audits.map(a => a.operation).sort()).toEqual(['CLIENTS_CREATE', 'CLIENTS_SEGMENT', 'CLIENTS_UPDATE', 'CLIENTS_UPDATE']);
      expect(JSON.stringify(audits)).not.toMatch(/Luis|1234|cafetería/);
    });

    it('I10-CLI-02/04/05/06 · I10-ATR-01 · I10-CHN-03: web form persists evidence and consent; retries and simultaneous submissions keep one row; reused key with other content conflicts; same email with another submission is kept', async () => {
      const x = await setup();
      const f = await x.form();
      const body = x.submission(f.publicId, { utm: { source: 'facebook', medium: 'cpc', campaign: 'otono-2026', content: 'video-a' }, clickIds: { fbclid: 'IwAR0abc' }, landingPath: '/formulario', referrer: 'https://l.facebook.com/' });
      const first = await x.engine.submitLeadForm(body);
      expect(first).toMatchObject({ replayed: false });
      // Lost response after commit: the page retries with the same submission id and gets the same reference.
      expect(await x.engine.submitLeadForm(body)).toEqual({ ...first, replayed: true });
      // Simultaneous duplicates of one submission → one row.
      const twin = x.submission(f.publicId);
      const both = await Promise.all([x.engine.submitLeadForm(twin), x.engine.submitLeadForm(twin)]);
      expect(both[0].opportunityId).toBe(both[1].opportunityId);
      await expect(x.engine.submitLeadForm({ ...body, need: 'Otra necesidad' })).rejects.toMatchObject({ code: 'CONFLICT' });
      // Same person, another submission: a second opportunity; identities are never merged by email.
      await x.engine.submitLeadForm(x.submission(f.publicId, { need: 'Otra consulta distinta' }));
      const data = await x.engine.clients(x.team.token, x.brand.id);
      expect(data.opportunities.filter(o => o.contactEmail === 'ana@example.com')).toHaveLength(3);
      const o = data.opportunities.find(r => r.id === first.opportunityId)!;
      expect(o).toMatchObject({ source: 'WEB_FORM', formId: f.formId, status: 'NEW', ownerUserId: null, attention: ['UNASSIGNED', 'NO_FOLLOW_UP'] });
      expect(o.origin).toMatchObject({ kind: 'WEB_FORM_SUBMISSION', attentionChannel: 'WEB_FORM', acquisitionPlatform: 'META', utm: { source: 'facebook', medium: 'cpc', campaign: 'otono-2026', content: 'video-a' }, clickIds: { fbclid: 'IwAR0abc' }, referrerHost: 'l.facebook.com', campaignStatus: 'CAPTURED_UNVERIFIED' });
      const [interaction] = await x.db.select().from(t.clientInteractions).where(eq(t.clientInteractions.opportunityId, first.opportunityId));
      expect(interaction.consent).toEqual({ contactPurpose: true, privacyNoticeVersion: 'dev-2026-10-11', marketingOptIn: false });
      // Contact purpose is required; at least one contact means; marketing consent is never implied.
      await expect(x.engine.submitLeadForm(x.submission(f.publicId, { consent: {} }))).rejects.toMatchObject({ code: 'INVALID' });
      await expect(x.engine.submitLeadForm(x.submission(f.publicId, { email: '', phone: '' }))).rejects.toMatchObject({ code: 'INVALID' });
      // Failure before commit leaves nothing; the retry then stores exactly one row.
      const crash = x.submission(f.publicId);
      await expect(x.db.transaction(async tx => { await submitWebForm(tx, crash); throw new Error('crash before commit'); })).rejects.toThrow('crash before commit');
      expect(await x.db.select().from(t.clientOpportunities).where(eq(t.clientOpportunities.captureKey, crash.submissionId))).toHaveLength(0);
      await x.engine.submitLeadForm(crash);
      expect(await x.db.select().from(t.clientOpportunities).where(eq(t.clientOpportunities.captureKey, crash.submissionId))).toHaveLength(1);
      // Without a reference the lead is kept and the campaign stays unidentified.
      const plain = await x.engine.submitLeadForm(x.submission(f.publicId));
      expect((await x.engine.clients(x.team.token, x.brand.id)).opportunities.find(r => r.id === plain.opportunityId)!.origin).toMatchObject({ campaignStatus: 'UNIDENTIFIED', campaignCause: 'NO_REFERENCE' });
    });

    it('I10-SEC-01/02/03/04: other workspaces, guests, cross-brand references, owners without access, members without publish permission and disabled forms', async () => {
      const x = await setup();
      const outsider = await seedIdentity(x.db);
      await expect(x.engine.clients(outsider.token, x.brand.id)).rejects.toMatchObject({ code: 'NOT_FOUND' });
      await expect(x.cmd('create', { personName: 'X', need: 'Y' }, outsider.token)).rejects.toMatchObject({ code: 'NOT_FOUND' });
      // A client guest of this brand (ADR-0033) is not a seller: Clientes refuses them like any non-member.
      const inv = (await x.engine.collaborationCommand(x.team.token, 'invite', { brandId: x.brand.id, email: 'cliente@empresa.com', idempotencyKey: randomUUID() })) as { token: string };
      const guest = await seedIdentity(x.db);
      await x.engine.acceptInvitation(guest.token, { token: inv.token });
      await expect(x.engine.clients(guest.token, x.brand.id)).rejects.toMatchObject({ code: 'NOT_FOUND' });
      await expect(x.engine.results(guest.token, x.brand.id)).rejects.toMatchObject({ code: 'NOT_FOUND' });
      // References of another brand (segment, offer, form) and owners without access are refused.
      const foreignSegment = (await x.cmd('segment', { name: 'Hoteles' }, x.team.token, x.otherBrand.id)) as { segmentId: string };
      await expect(x.cmd('create', { personName: 'X', need: 'Y', segmentId: foreignSegment.segmentId })).rejects.toMatchObject({ code: 'INVALID' });
      await expect(x.cmd('create', { personName: 'X', need: 'Y', offerId: randomUUID() })).rejects.toMatchObject({ code: 'INVALID' });
      await expect(x.cmd('create', { personName: 'X', need: 'Y', ownerUserId: outsider.userId })).rejects.toMatchObject({ code: 'INVALID' });
      const member = await seedIdentity(x.db, 'MEMBER', x.team.workspaceId);
      await expect(x.cmd('create', { personName: 'X', need: 'Y', ownerUserId: member.userId })).rejects.toMatchObject({ code: 'INVALID' }); // not assigned to the brand
      await x.db.insert(t.assignments).values({ workspaceId: x.team.workspaceId, brandId: x.brand.id, userId: member.userId });
      const owned = (await x.cmd('create', { personName: 'X', need: 'Y', ownerUserId: member.userId })) as { opportunityId: string };
      // The assigned member works the brand's Clientes but cannot open a public form without PUBLISH_SITE.
      expect((await x.engine.clients(member.token, x.brand.id)).opportunities.some(o => o.id === owned.opportunityId)).toBe(true);
      await expect(x.cmd('form', { name: 'Formulario' }, member.token)).rejects.toMatchObject({ code: 'FORBIDDEN' });
      await expect(x.engine.clients(member.token, x.otherBrand.id)).rejects.toMatchObject({ code: 'FORBIDDEN' });
      // Removing the member's access applies on their next operation (I10-SEC-03).
      await x.db.update(t.memberships).set({ active: false }).where(eq(t.memberships.userId, member.userId));
      await expect(x.engine.clients(member.token, x.brand.id)).rejects.toMatchObject({ code: expect.stringMatching(/UNAUTHORIZED|FORBIDDEN|NOT_FOUND/) });
      // The form decides the brand: the browser cannot point a submission elsewhere; a disabled form accepts nothing.
      const f = await x.form();
      const r = await x.engine.submitLeadForm({ ...x.submission(f.publicId), brandId: x.otherBrand.id, workspaceId: outsider.workspaceId });
      const [row] = await x.db.select().from(t.clientOpportunities).where(eq(t.clientOpportunities.id, r.opportunityId));
      expect(row).toMatchObject({ brandId: x.brand.id, workspaceId: x.team.workspaceId });
      await x.cmd('disable-form', { formId: f.formId });
      await expect(x.engine.submitLeadForm(x.submission(f.publicId))).rejects.toMatchObject({ code: 'NOT_FOUND' });
      await expect(x.engine.publicLeadForm(f.publicId)).rejects.toMatchObject({ code: 'NOT_FOUND' });
      await expect(x.engine.submitLeadForm(x.submission('A'.repeat(22)))).rejects.toMatchObject({ code: 'NOT_FOUND' });
      await expect(x.engine.submitLeadForm(x.submission(f.publicId, { name: 'x'.repeat(161) }))).rejects.toMatchObject({ code: expect.stringMatching(/INVALID|NOT_FOUND/) });
      // The other brand's Clientes stays empty.
      expect((await x.engine.clients(x.team.token, x.otherBrand.id)).opportunities).toHaveLength(0);
    });

    it('guards: capture identity is immutable, revision advances by one, evidence and events are append-only, forms only disable', async () => {
      const x = await setup();
      const c = (await x.cmd('create', { personName: 'Ana', need: 'Algo' })) as { opportunityId: string };
      expect(await databaseError(x.db.update(t.clientOpportunities).set({ captureKey: 'otra' }).where(eq(t.clientOpportunities.id, c.opportunityId)))).toMatch(/revision must advance|immutable/);
      expect(await databaseError(x.db.update(t.clientOpportunities).set({ revision: 1, receivedAt: new Date(0) }).where(eq(t.clientOpportunities.id, c.opportunityId)))).toMatch(/immutable/);
      expect(await databaseError(x.db.update(t.clientOpportunities).set({ revision: 5 }).where(eq(t.clientOpportunities.id, c.opportunityId)))).toMatch(/advance by one/);
      expect(await databaseError(x.db.update(t.clientInteractions).set({ declaredOrigin: 'x' }).where(eq(t.clientInteractions.opportunityId, c.opportunityId)))).toMatch(/append-only/);
      expect(await databaseError(x.db.delete(t.clientOpportunityEvents).where(eq(t.clientOpportunityEvents.opportunityId, c.opportunityId)))).toMatch(/append-only/);
      expect(await databaseError(x.db.delete(t.clientOpportunities).where(eq(t.clientOpportunities.id, c.opportunityId)))).toMatch(/kept/);
      const f = await x.form();
      expect(await databaseError(x.db.update(t.leadForms).set({ name: 'Otro' }).where(eq(t.leadForms.id, f.formId)))).toMatch(/only changes by being disabled/);
    });

    it('I10-RES-01/02/03: results from persisted opportunities with definition, source, period and timezone; zero is measured, missing sources say so', async () => {
      const x = await setup();
      let r = await x.engine.results(x.team.token, x.brand.id);
      const byId = (list: typeof r.operations, id: string) => list.find(m => m.id === id)!;
      expect(byId(r.operations, 'new_opportunities')).toMatchObject({ value: 0, available: true, timezone: 'America/Mexico_City', source: expect.stringContaining('Clientes') });
      expect(byId(r.marketing, 'web_requests')).toMatchObject({ available: false, state: 'NOT_CONNECTED', value: null });
      expect(byId(r.marketing, 'site_campaigns_spend')).toMatchObject({ available: false, state: 'NOT_CONNECTED' });
      expect(r.sales.every(m => !m.available && m.value === null)).toBe(true);
      const f = await x.form();
      await x.engine.submitLeadForm(x.submission(f.publicId, { utm: { campaign: 'otono' } }));
      await x.cmd('create', { personName: 'Luis', need: 'Precios', ownerUserId: x.team.userId, nextAction: 'Llamar', nextActionDate: '2020-01-01' });
      await x.cmd('create', { personName: 'Mar', need: 'Precios' }, x.team.token, x.otherBrand.id); // another brand never counts
      r = await x.engine.results(x.team.token, x.brand.id);
      expect(byId(r.operations, 'new_opportunities').value).toBe(2);
      expect(byId(r.operations, 'unassigned').value).toBe(1);
      expect(byId(r.operations, 'no_follow_up').value).toBe(1);
      expect(byId(r.operations, 'overdue').value).toBe(1);
      expect(byId(r.marketing, 'web_requests')).toMatchObject({ value: 1, available: true });
      expect(byId(r.marketing, 'campaign_captured').value).toBe(1);
      expect(byId(r.marketing, 'campaign_unidentified').value).toBe(1);
      for (const m of [...r.marketing, ...r.operations].filter(m => m.available)) expect(m).toMatchObject({ definition: expect.any(String), period: expect.objectContaining({ label: expect.any(String) }), computedAt: expect.any(String), scope: 'Marca activa' });
    });

    it('I10-SEC-06: deleting a brand removes its Clientes rows and leaves the other brand intact', async () => {
      const x = await setup();
      const f = await x.form();
      await x.cmd('segment', { name: 'Restaurantes' });
      await x.engine.submitLeadForm(x.submission(f.publicId));
      await x.cmd('create', { personName: 'Otra', need: 'Algo' }, x.team.token, x.otherBrand.id);
      await x.engine.deleteBrand(x.team.token, { brandId: x.brand.id, confirmName: 'Marca con clientes', idempotencyKey: randomUUID() });
      for (const table of [t.clientOpportunities, t.clientInteractions, t.clientOpportunityEvents, t.leadForms, t.clientSegments]) expect(await x.db.select().from(table).where(eq(table.brandId, x.brand.id))).toHaveLength(0);
      expect(await x.db.select().from(t.clientOpportunities).where(eq(t.clientOpportunities.brandId, x.otherBrand.id))).toHaveLength(1);
    });
  });
}
