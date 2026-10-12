import { describe, it, expect } from 'vitest';
import { randomUUID, randomBytes } from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import type { connect } from '../src/persistence/database.js';
import { Engine } from '../src/application/engine.js';
import { seedIdentity } from '../scripts/seed.js';
import * as t from '../src/persistence/schema.js';
import { createVault } from '../src/application/credential-vault.js';
import { emailError, type EmailProvider } from '../src/application/email-outbox.js';
import { downloadName, inspectBrandFile } from '../src/domain/brand-files.js';
import { derivedContent, legacyPlan, normalizeOfferContent } from '../src/domain/offers.js';
import { normalizeDeliverable, variantIssues } from '../src/domain/deliverables.js';
import { change, resultsPeriod } from '../src/domain/results-period.js';

const databaseError = async (query: Promise<unknown>) => { try { await query; return 'no error'; } catch (e) { return String((e as { cause?: { message?: string } }).cause?.message ?? (e as Error).message); } };

/** Minimal ZIP container (stored entries) with the given names: enough for the structure checks. */
function zip(names: string[]) {
  const parts: Buffer[] = [], central: Buffer[] = []; let offset = 0;
  for (const name of names) {
    const n = Buffer.from(name), local = Buffer.alloc(30), c = Buffer.alloc(46);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(n.length, 26);
    c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(n.length, 28); c.writeUInt32LE(offset, 42);
    parts.push(local, n); central.push(c, n); offset += 30 + n.length;
  }
  const cd = Buffer.concat(central), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(names.length, 8); end.writeUInt16LE(names.length, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
  return new Uint8Array(Buffer.concat([...parts, cd, end]));
}
/** A 1×1 PNG header (IHDR only): the signature and dimensions the inspector reads. */
const png = () => { const b = Buffer.alloc(33); Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b, 0); b.writeUInt32BE(13, 8); b.write('IHDR', 12, 'ascii'); b.writeUInt32BE(1, 16); b.writeUInt32BE(1, 20); b[24] = 8; b[25] = 6; return new Uint8Array(b); };

/** Email provider for tests: records what it would send; deterministic failures by recipient domain. */
function testProvider() {
  const sent: { id: string; to: string; subject: string; text: string }[] = [];
  const provider: EmailProvider = { name: 'TEST', simulated: true, async send(m) { if (m.to.endsWith('@rechazado.example')) throw emailError('PERMANENT', 'RECIPIENT_REJECTED'); if (m.to.endsWith('@fallo.example')) throw emailError('TRANSIENT', 'PROVIDER_UNAVAILABLE'); sent.push({ id: m.id, to: m.to, subject: m.subject, text: m.text }); return { providerMessageId: `test-${m.id.slice(0, 8)}` }; } };
  return { provider, sent };
}

/** PHASE4_SPEC §13 (owner review 2026-10-12): approval circuit, comments, notifications, email, files, plans and periods. */
export function reviewCases(connection: () => ReturnType<typeof connect>) {
  const setup = async () => {
    const db = connection().db, mail = testProvider();
    const engine = new Engine(db).useEmail({ provider: mail.provider, vault: createVault(randomBytes(32), 't1'), appOrigin: 'http://127.0.0.1:3000', backoffSeconds: 0, maxAttempts: 2, autoDrain: false });
    const admin = await seedIdentity(db), brand = await engine.createBrand(admin.token, 'Marca con circuito');
    const member = await seedIdentity(db, 'MEMBER', admin.workspaceId);
    await db.insert(t.assignments).values({ workspaceId: admin.workspaceId, brandId: brand.id, userId: member.userId });
    const offer = (name = 'Diagnóstico de marca', extra: Record<string, unknown> = {}) => ({ name, kind: 'SERVICE', audience: { customerDecisionVersionId: null, segment: 'Agencias' }, need: 'Ordenar la estrategia', outcome: 'Estrategia aprobada', benefits: ['Menos retrabajo'], differentiators: [], conditions: '', proofIds: [], sourceDecisionVersionIds: [], hypothesisIds: [], price: null, ...extra });
    const offerCmd = (token: string, action: Parameters<Engine['offerCommand']>[1], input: Record<string, unknown>) => engine.offerCommand(token, action, { brandId: brand.id, ...(action === 'decide' ? { idempotencyKey: randomUUID() } : {}), ...input }) as Promise<Record<string, unknown> & { versionId: string; fingerprint: string; offerId: string }>;
    const created = async (token = admin.token, name?: string) => offerCmd(token, 'create', { content: offer(name), idempotencyKey: randomUUID() });
    const policy = async (subjectType: string, values: Record<string, unknown>) => { const p = await engine.approvalPolicies(admin.token, brand.id); return engine.reviewCommand(admin.token, 'policy', { brandId: brand.id, subjectType, defaultReviewerId: null, allowSelfApproval: true, clientStep: false, expectedRevision: p.policies[subjectType].revision, ...values }); };
    return { db, engine, mail, admin, member, brand, offer, offerCmd, created, policy };
  };

  describe('PHASE4_SPEC §13 · approval circuit (R12-08)', () => {
    it('without a reviewer nothing is sent; the policy default is used; only the assignee decides and every step is recorded', async () => {
      const x = await setup();
      const o = await x.created();
      await expect(x.offerCmd(x.admin.token, 'submit', { offerId: o.offerId, expectedRevision: 0 })).rejects.toMatchObject({ code: 'CONFLICT' });
      // Nothing moved: still a draft, no assignment.
      expect((await x.engine.offers(x.admin.token, x.brand.id))[0].draft).not.toBeNull();
      await x.policy('OFFER', { defaultReviewerId: x.member.userId });
      const sent = await x.offerCmd(x.admin.token, 'submit', { offerId: o.offerId, expectedRevision: 0 });
      expect(sent).toMatchObject({ reviewerId: x.member.userId, selfApproval: false });
      // The author is not the reviewer: deciding is refused without effects; the reviewer decides.
      await expect(x.offerCmd(x.admin.token, 'decide', { offerId: o.offerId, versionId: sent.versionId, fingerprint: sent.fingerprint, decision: 'APPROVE', criterion: 'Lo apruebo yo mismo' })).rejects.toMatchObject({ code: 'FORBIDDEN' });
      // Asking for changes needs a comment (at least ten characters).
      await expect(x.offerCmd(x.member.token, 'decide', { offerId: o.offerId, versionId: sent.versionId, fingerprint: sent.fingerprint, decision: 'REQUEST_CHANGES', criterion: 'corto' })).rejects.toMatchObject({ code: 'INVALID' });
      const decided = await x.offerCmd(x.member.token, 'decide', { offerId: o.offerId, versionId: sent.versionId, fingerprint: sent.fingerprint, decision: 'REQUEST_CHANGES', criterion: 'Falta la evidencia del resultado' });
      expect(decided).toMatchObject({ status: 'CHANGES_REQUESTED' });
      const [view] = await x.engine.offers(x.admin.token, x.brand.id);
      expect(view.history.at(-1)).toMatchObject({ status: 'CHANGES_REQUESTED', decisionCriterion: 'Falta la evidencia del resultado' });
      // The author is told; the assignment is closed (history kept).
      const rows = await x.db.select().from(t.reviewAssignments).where(eq(t.reviewAssignments.versionId, sent.versionId));
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ active: false, closeReason: 'DECIDED', reviewerId: x.member.userId, selfApproval: false });
      const notes = await x.engine.notifications(x.admin.token);
      expect(notes.items.map(n => n.kind)).toContain('CHANGES_REQUESTED');
      const audits = (await x.db.select().from(t.audits).where(eq(t.audits.brandId, x.brand.id))).map(r => r.operation);
      expect(audits).toEqual(expect.arrayContaining(['APPROVAL_POLICY_SET', 'OFFER_REVIEW_ASSIGNED', 'OFFER_REQUEST_CHANGES']));
      // An approval never carries over: a new version needs its own reviewer and decision.
      await x.offerCmd(x.admin.token, 'new-draft', { offerId: o.offerId, expectedRevision: view.revision });
      const [again] = await x.engine.offers(x.admin.token, x.brand.id);
      const v2 = await x.offerCmd(x.admin.token, 'submit', { offerId: o.offerId, expectedRevision: again.revision });
      expect(v2.reviewerId).toBe(x.member.userId);
      expect(v2.versionId).not.toBe(sent.versionId);
    });

    it('approving alone is explicit, allowed by the policy and audited; a policy that forbids it also covers the draft’s creator', async () => {
      const x = await setup();
      const o = await x.created();
      const self = await x.offerCmd(x.admin.token, 'submit', { offerId: o.offerId, expectedRevision: 0, reviewerId: x.admin.userId });
      expect(self).toMatchObject({ selfApproval: true });
      expect(await x.offerCmd(x.admin.token, 'decide', { offerId: o.offerId, versionId: self.versionId, fingerprint: self.fingerprint, decision: 'APPROVE', criterion: 'Uso individual de la marca' })).toMatchObject({ status: 'APPROVED', selfApproval: true });
      const audits = (await x.db.select().from(t.audits).where(eq(t.audits.brandId, x.brand.id))).map(r => r.operation);
      expect(audits).toEqual(expect.arrayContaining(['OFFER_REVIEW_SELF_ASSIGNED', 'OFFER_SELF_APPROVAL']));
      // The policy forbids it: the submitter cannot review, and neither can the person who created the draft.
      await x.policy('OFFER', { allowSelfApproval: false });
      const mine = await x.created();
      await expect(x.offerCmd(x.admin.token, 'submit', { offerId: mine.offerId, expectedRevision: 0, reviewerId: x.admin.userId })).rejects.toMatchObject({ code: 'FORBIDDEN' });
      const byMember = await x.created(x.member.token, 'Creada por otra persona');
      await expect(x.offerCmd(x.admin.token, 'submit', { offerId: byMember.offerId, expectedRevision: 0, reviewerId: x.member.userId })).rejects.toMatchObject({ code: 'FORBIDDEN' });
      // A reviewer outside the brand's team is refused (indistinguishable from an unknown person).
      const outsider = await seedIdentity(x.db);
      await expect(x.offerCmd(x.admin.token, 'submit', { offerId: byMember.offerId, expectedRevision: 0, reviewerId: outsider.userId })).rejects.toMatchObject({ code: 'INVALID' });
      // SQL guard: selfApproval must say whether the reviewer is the author; an assignment only closes.
      const [row] = await x.db.select().from(t.reviewAssignments).where(eq(t.reviewAssignments.versionId, self.versionId));
      expect(await databaseError(x.db.execute(sql`insert into review_assignments ("id","workspaceId","brandId","subjectType","subjectId","versionId","authorId","reviewerId","selfApproval","assignedBy","assignedAt","active") values (${randomUUID()},${x.admin.workspaceId},${x.brand.id},'OFFER',${o.offerId},${randomUUID()},${x.admin.userId},${x.admin.userId},false,${x.admin.userId},now(),true)`))).toMatch(/review_assignment_values/);
      expect(await databaseError(x.db.execute(sql`update review_assignments set "reviewerId"=${x.member.userId} where id=${row.id}`))).toMatch(/only closes/);
    });

    it('reassigning changes who decides and nothing else; policies are edited by administrators with their revision', async () => {
      const x = await setup();
      const o = await x.created();
      const sent = await x.offerCmd(x.admin.token, 'submit', { offerId: o.offerId, expectedRevision: 0, reviewerId: x.admin.userId });
      const capsBefore = await x.engine.brandCapabilities(x.member.token, x.brand.id);
      await x.engine.reviewCommand(x.admin.token, 'reassign', { brandId: x.brand.id, subjectType: 'OFFER', subjectId: o.offerId, versionId: sent.versionId, reviewerId: x.member.userId });
      expect((await x.engine.brandCapabilities(x.member.token, x.brand.id)).mine).toEqual(capsBefore.mine);
      expect((await x.engine.notifications(x.member.token)).items.map(n => n.kind)).toContain('REVIEW_REASSIGNED');
      await expect(x.offerCmd(x.admin.token, 'decide', { offerId: o.offerId, versionId: sent.versionId, fingerprint: sent.fingerprint, decision: 'APPROVE', criterion: 'Ya no me toca a mí' })).rejects.toMatchObject({ code: 'FORBIDDEN' });
      expect(await x.offerCmd(x.member.token, 'decide', { offerId: o.offerId, versionId: sent.versionId, fingerprint: sent.fingerprint, decision: 'APPROVE', criterion: 'Revisada por la responsable' })).toMatchObject({ status: 'APPROVED' });
      const history = await x.db.select().from(t.reviewAssignments).where(eq(t.reviewAssignments.versionId, sent.versionId));
      expect(history.map(h => h.closeReason).sort()).toEqual(['DECIDED', 'REASSIGNED']);
      // Policies: administrators only, stale revision refused, a guest never approves offers.
      const p = await x.engine.approvalPolicies(x.member.token, x.brand.id);
      expect(p.canEdit).toBe(false);
      await expect(x.engine.reviewCommand(x.member.token, 'policy', { brandId: x.brand.id, subjectType: 'AD', defaultReviewerId: null, allowSelfApproval: true, clientStep: false, expectedRevision: 0 })).rejects.toMatchObject({ code: 'FORBIDDEN' });
      await expect(x.policy('OFFER', { clientStep: true })).rejects.toMatchObject({ code: 'INVALID' });
      await x.policy('AD', { clientStep: true });
      await expect(x.engine.reviewCommand(x.admin.token, 'policy', { brandId: x.brand.id, subjectType: 'AD', defaultReviewerId: null, allowSelfApproval: true, clientStep: false, expectedRevision: 0 })).rejects.toMatchObject({ code: 'CONFLICT' });
    });
  });

  describe('PHASE4_SPEC §13 · comments per version and notifications (R12-21, R12-22)', () => {
    it('internal or shared comments; mentions notify the team only; the guest reads shared comments of what was shared, never internal ones', async () => {
      const x = await setup();
      const d = await x.engine.deliverableCommand(x.admin.token, 'create', { brandId: x.brand.id, content: { type: 'SALES_PRESENTATION', name: 'Presentación', offerId: null, sourceDecisionVersionIds: [], body: { audience: 'Agencias', slides: [{ title: 'Inicio', text: 'Hola' }] } }, idempotencyKey: randomUUID() }) as { deliverableId: string; versionId: string };
      const sub = await x.engine.deliverableCommand(x.admin.token, 'submit', { brandId: x.brand.id, deliverableId: d.deliverableId, expectedRevision: 0, reviewerId: x.member.userId }) as { versionId: string };
      const comment = (body: string, visibility: string, mentions: string[] = [], token = x.admin.token) => x.engine.reviewCommand(token, 'comment', { brandId: x.brand.id, subjectType: 'SALES_PRESENTATION', subjectId: d.deliverableId, versionId: sub.versionId, body, visibility, mentions, idempotencyKey: randomUUID() });
      await comment('Nota interna para el equipo', 'INTERNAL', [x.member.userId]);
      await comment('Comentario para el cliente', 'SHARED');
      const outsider = await seedIdentity(x.db);
      await expect(comment('Mención externa', 'INTERNAL', [outsider.userId])).rejects.toMatchObject({ code: 'INVALID' });
      expect((await x.engine.notifications(x.member.token)).items.map(n => n.kind)).toEqual(expect.arrayContaining(['MENTION', 'REVIEW_ASSIGNED']));
      // Offers never take shared comments (they are not shared with guests).
      const o = await x.created();
      const os = await x.offerCmd(x.admin.token, 'submit', { offerId: o.offerId, expectedRevision: 0, reviewerId: x.admin.userId });
      await expect(x.engine.reviewCommand(x.admin.token, 'comment', { brandId: x.brand.id, subjectType: 'OFFER', subjectId: o.offerId, versionId: os.versionId, body: 'Para el cliente', visibility: 'SHARED', idempotencyKey: randomUUID() })).rejects.toMatchObject({ code: 'INVALID' });
      // The guest: shared comment of the shared version only.
      const inv = await x.engine.collaborationCommand(x.admin.token, 'invite', { brandId: x.brand.id, email: 'cliente@empresa.com', idempotencyKey: randomUUID() }) as { token: string };
      const guest = await seedIdentity(x.db);
      await x.engine.acceptInvitation(guest.token, { token: inv.token });
      let portal = await x.engine.portal(guest.token, x.brand.id) as { shares: { comments: { body: string }[] }[] };
      expect(portal.shares).toHaveLength(0);
      await x.engine.collaborationCommand(x.admin.token, 'share', { brandId: x.brand.id, targetType: 'DELIVERABLE_VERSION', targetId: sub.versionId, idempotencyKey: randomUUID() });
      portal = await x.engine.portal(guest.token, x.brand.id) as typeof portal;
      const bodies = portal.shares[0].comments.map(c => c.body);
      expect(bodies).toContain('Comentario para el cliente');
      expect(bodies).not.toContain('Nota interna para el equipo');
      // Comments are append-only.
      expect(await databaseError(x.db.execute(sql`update review_comments set body='otro' where "subjectId"=${d.deliverableId}`))).toMatch(/append-only/);
    });

    it('notifications: per person, only for brands still reachable; opening revalidates access; reading resolves nothing', async () => {
      const x = await setup();
      const o = await x.created();
      const sent = await x.offerCmd(x.admin.token, 'submit', { offerId: o.offerId, expectedRevision: 0, reviewerId: x.member.userId });
      const list = await x.engine.notifications(x.member.token);
      expect(list.unread).toBe(1);
      expect(list.items[0]).toMatchObject({ kind: 'REVIEW_ASSIGNED', view: 'offers', subjectId: o.offerId });
      // Another person's notification is invisible and cannot be opened.
      expect((await x.engine.notifications(x.admin.token)).items.some(n => n.id === list.items[0].id)).toBe(false);
      await expect(x.engine.notificationCommand(x.admin.token, 'open', { notificationId: list.items[0].id })).rejects.toMatchObject({ code: 'NOT_FOUND' });
      // Marking it read leaves the review pending.
      await x.engine.notificationCommand(x.member.token, 'read', { all: true });
      expect((await x.engine.notifications(x.member.token)).unread).toBe(0);
      const [assignment] = await x.db.select().from(t.reviewAssignments).where(eq(t.reviewAssignments.versionId, sent.versionId));
      expect(assignment.active).toBe(true);
      // Losing the brand: the notification disappears and its link no longer opens.
      await x.db.delete(t.assignments).where(and(eq(t.assignments.brandId, x.brand.id), eq(t.assignments.userId, x.member.userId)));
      expect((await x.engine.notifications(x.member.token)).items).toHaveLength(0);
      await expect(x.engine.notificationCommand(x.member.token, 'open', { notificationId: list.items[0].id })).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });
  });

  describe('PHASE4_SPEC §13 · price plans, create from an offer and Brando’s offer proposal (R12-06, R12-07, R12-09)', () => {
    it('several plans per version; periodicity is never invented for a legacy price; validity is apart from periodicity', () => {
      const legacy = { amountMinor: 150000, currency: 'MXN', validFrom: null, validUntil: '2026-12-31', certainty: 'ESTIMATED' as const };
      expect(legacyPlan(legacy)).toMatchObject({ periodicity: null, validUntil: '2026-12-31', unit: 'PER_SERVICE' });
      const base = { name: 'Oferta', kind: 'SERVICE', audience: { customerDecisionVersionId: null, segment: '' }, need: '', outcome: '', benefits: [], differentiators: [], conditions: '', proofIds: [], sourceDecisionVersionIds: [], hypothesisIds: [], price: null };
      const plan = (over: Record<string, unknown>) => ({ name: 'Básico', amountMinor: 50000, currency: 'mxn', periodicity: 'MONTHLY', customPeriod: '', unit: 'PER_PERSON', unitLabel: '', conditions: '', validFrom: null, validUntil: null, certainty: 'CONFIRMED', ...over });
      const c = normalizeOfferContent({ ...base, pricePlans: [plan({}), plan({ name: 'Anual', periodicity: 'YEARLY', amountMinor: 500000 })] });
      expect(c.pricePlans?.map(p => [p.name, p.periodicity, p.currency])).toEqual([['Básico', 'MONTHLY', 'MXN'], ['Anual', 'YEARLY', 'MXN']]);
      expect(() => normalizeOfferContent({ ...base, pricePlans: [plan({ periodicity: 'CUSTOM' })] })).toThrow(/custom periodicity/);
      expect(() => normalizeOfferContent({ ...base, pricePlans: [plan({ unit: 'OTHER' })] })).toThrow(/unit/);
      expect(() => normalizeOfferContent({ ...base, pricePlans: [plan({}), plan({})] })).toThrow(/own name/);
      expect(() => normalizeOfferContent({ ...base, pricePlans: [plan({ validFrom: '2026-12-01', validUntil: '2026-11-01' })] })).toThrow(/validity/);
      // A version made before plans stays valid as it was; a copy turns its price into one plan without periodicity.
      const old = normalizeOfferContent({ ...base, price: legacy });
      expect(old.pricePlans).toBeUndefined();
      expect(derivedContent(old)).toMatchObject({ name: 'Oferta (copia)', price: null, pricePlans: [{ periodicity: null, amountMinor: 150000 }] });
    });

    it('create from an approved offer: an independent draft of the same brand with its origin; nothing approved, shared or authorized travels', async () => {
      const x = await setup();
      const o = await x.offerCmd(x.admin.token, 'create', { content: x.offer('Diagnóstico', { pricePlans: [{ name: 'Único', amountMinor: 100000, currency: 'MXN', periodicity: 'ONE_TIME', customPeriod: '', unit: 'PER_SERVICE', unitLabel: '', conditions: '', validFrom: null, validUntil: null, certainty: 'CONFIRMED' }] }), idempotencyKey: randomUUID() });
      const sent = await x.offerCmd(x.admin.token, 'submit', { offerId: o.offerId, expectedRevision: 0, reviewerId: x.admin.userId });
      await x.offerCmd(x.admin.token, 'decide', { offerId: o.offerId, versionId: sent.versionId, fingerprint: sent.fingerprint, decision: 'APPROVE', criterion: 'Lista para vender' });
      const key = randomUUID();
      const copy = await x.offerCmd(x.admin.token, 'create-from', { sourceOfferId: o.offerId, idempotencyKey: key });
      expect(await x.offerCmd(x.admin.token, 'create-from', { sourceOfferId: o.offerId, idempotencyKey: key })).toMatchObject({ offerId: copy.offerId, replayed: true });
      const list = await x.engine.offers(x.admin.token, x.brand.id);
      const derived = list.find(z => z.id === copy.offerId)!;
      expect(derived).toMatchObject({ approved: null, inReview: [], derivedFrom: { offerId: o.offerId, versionId: sent.versionId, name: 'Diagnóstico' } });
      expect(derived.draft!.content).toMatchObject({ name: 'Diagnóstico (copia)', pricePlans: [{ name: 'Único', periodicity: 'ONE_TIME' }] });
      expect(await x.db.select().from(t.offerApprovals).where(eq(t.offerApprovals.offerId, copy.offerId))).toHaveLength(0);
      expect(await x.db.select().from(t.reviewAssignments).where(eq(t.reviewAssignments.subjectId, copy.offerId))).toHaveLength(0);
      // Another brand's offer cannot be the origin.
      const other = await x.engine.createBrand(x.admin.token, 'Otra marca');
      await expect(x.engine.offerCommand(x.admin.token, 'create-from', { brandId: other.id, sourceOfferId: o.offerId, idempotencyKey: randomUUID() })).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });

    it('Brando’s offer proposal reads approved decisions only, proposes no price, condition or evidence and writes nothing', async () => {
      const x = await setup();
      const before = (await x.db.select().from(t.offers)).length;
      const r = await x.engine.offerProposal(x.admin.token, x.brand.id);
      expect(r.mode).toBe('DETERMINISTIC_DEMO');
      expect(r.proposal).not.toHaveProperty('price');
      expect(r.proposal).not.toHaveProperty('pricePlans');
      expect(r.proposal.need).toBe('');
      expect(r.missing.join(' ')).toMatch(/Precios, condiciones y evidencias/);
      expect((await x.db.select().from(t.offers)).length).toBe(before);
    });
  });

  describe('PHASE4_SPEC §13 · email outbox (R12-02) — simulated provider only', () => {
    it('queued with the invitation, sealed link, sent once, scrubbed; a revoked invitation is never sent; failures are visible and retried without duplicates', async () => {
      const x = await setup();
      const inv = await x.engine.collaborationCommand(x.admin.token, 'invite', { brandId: x.brand.id, email: 'cliente@empresa.com', sendEmail: true, idempotencyKey: randomUUID() }) as { invitationId: string; token: string; emailId: string };
      const [row] = await x.db.select().from(t.emailOutbox).where(eq(t.emailOutbox.id, inv.emailId));
      expect(row).toMatchObject({ status: 'QUEUED', template: 'GUEST_INVITATION', recipient: 'cliente@empresa.com', simulated: true });
      expect(JSON.stringify(row.payload)).not.toContain(inv.token);
      const [invitation] = await x.db.select().from(t.brandInvitations).where(eq(t.brandInvitations.id, inv.invitationId));
      expect(invitation.delivery).toBe('EMAIL');
      expect(await x.engine.processEmails()).toEqual(['SENT']);
      expect(await x.engine.processEmails()).toEqual([]);
      expect(x.mail.sent).toHaveLength(1);
      expect(x.mail.sent[0].text).toContain(`#invitacion=${inv.token}`);
      const [sent] = await x.db.select().from(t.emailOutbox).where(eq(t.emailOutbox.id, inv.emailId));
      expect(sent).toMatchObject({ status: 'SENT', attempts: 1 });
      expect(sent.payload).not.toHaveProperty('sealedLink');
      const view = await x.engine.collaboration(x.admin.token, x.brand.id) as { invitations: { id: string; message: { status: string } | null }[] };
      expect(view.invitations.find(i => i.id === inv.invitationId)!.message).toMatchObject({ status: 'SENT' });
      // Revoked before sending: cancelled, nothing sent.
      const second = await x.engine.collaborationCommand(x.admin.token, 'invite', { brandId: x.brand.id, email: 'otra@empresa.com', sendEmail: true, idempotencyKey: randomUUID() }) as { invitationId: string; emailId: string };
      await x.engine.collaborationCommand(x.admin.token, 'revoke-invitation', { brandId: x.brand.id, invitationId: second.invitationId });
      expect(await x.engine.processEmails()).toEqual(['CANCELLED']);
      expect(x.mail.sent).toHaveLength(1);
      // Transient failures retry, then FAILED with a notification; a person retries the same message.
      const failing = await x.engine.collaborationCommand(x.admin.token, 'invite', { brandId: x.brand.id, email: 'persona@fallo.example', sendEmail: true, idempotencyKey: randomUUID() }) as { emailId: string };
      expect(await x.engine.processEmails()).toEqual(['RETRY', 'FAILED']);
      expect((await x.engine.notifications(x.admin.token)).items.map(n => n.kind)).toContain('EMAIL_FAILED');
      await x.engine.collaborationCommand(x.admin.token, 'retry-email', { brandId: x.brand.id, emailId: failing.emailId });
      const [requeued] = await x.db.select().from(t.emailOutbox).where(eq(t.emailOutbox.id, failing.emailId));
      expect(requeued.status).toBe('QUEUED');
      expect((await x.db.select().from(t.emailOutbox).where(eq(t.emailOutbox.recipient, 'persona@fallo.example')))).toHaveLength(1);
      // Permanent rejection ends at once; retrying needs MANAGE_GUESTS.
      await x.engine.collaborationCommand(x.admin.token, 'invite', { brandId: x.brand.id, email: 'nadie@rechazado.example', sendEmail: true, idempotencyKey: randomUUID() });
      const outcomes = await x.engine.processEmails();
      expect(outcomes).toContain('FAILED');
      await expect(x.engine.collaborationCommand(x.member.token, 'retry-email', { brandId: x.brand.id, emailId: failing.emailId })).rejects.toMatchObject({ code: 'FORBIDDEN' });
      // Without an email service the invitation is by link only, and says so.
      const plain = new Engine(x.db);
      await expect(plain.collaborationCommand(x.admin.token, 'invite', { brandId: x.brand.id, email: 'sin@correo.com', sendEmail: true, idempotencyKey: randomUUID() })).rejects.toMatchObject({ code: 'UNAVAILABLE' });
    });
  });

  describe('PHASE4_SPEC §13 · brand files: references, final art and templates (R12-10, R12-11, R12-12)', () => {
    it('the format comes from the structure: images, PDF and Office documents; macros, vectors and ambiguous containers are refused; downloads are named by format', () => {
      expect(inspectBrandFile(png())).toMatchObject({ format: 'PNG', previewable: true });
      expect(inspectBrandFile(zip(['[Content_Types].xml', 'word/document.xml']))).toMatchObject({ format: 'DOCX', previewable: false });
      expect(inspectBrandFile(zip(['[Content_Types].xml', 'ppt/presentation.xml', 'ppt/slides/slide1.xml']))).toMatchObject({ format: 'PPTX' });
      expect(() => inspectBrandFile(zip(['[Content_Types].xml', 'word/document.xml', 'word/vbaProject.bin']))).toThrow(/macros/);
      expect(() => inspectBrandFile(zip(['[Content_Types].xml', 'word/document.xml', 'xl/workbook.xml']))).toThrow(/Unsupported/);
      expect(() => inspectBrandFile(zip(['readme.txt']))).toThrow(/Unsupported/);
      expect(() => inspectBrandFile(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toThrow();
      expect(downloadName('informe.html', 'PNG')).toBe('informe.png');
      expect(downloadName('"quote".pdf', 'PDF')).toBe('_quote_.pdf');
    });

    it('final art after an approval creates a new draft to review (the approved version stays); the browser cannot forge it; guests see it only while shared', async () => {
      const x = await setup();
      const d = await x.engine.deliverableCommand(x.admin.token, 'create', { brandId: x.brand.id, content: { type: 'DESIGN_BRIEF', name: 'Brief de portada', offerId: null, sourceDecisionVersionIds: [], body: { for: 'CANVA', piece: 'Portada', format: '1080x1350', audience: '', message: 'Hola', mustInclude: '', avoid: '', dueDate: null } }, idempotencyKey: randomUUID() }) as { deliverableId: string };
      const sub = await x.engine.deliverableCommand(x.admin.token, 'submit', { brandId: x.brand.id, deliverableId: d.deliverableId, expectedRevision: 0, reviewerId: x.admin.userId }) as { versionId: string; fingerprint: string };
      await x.engine.deliverableCommand(x.admin.token, 'decide', { brandId: x.brand.id, deliverableId: d.deliverableId, versionId: sub.versionId, fingerprint: sub.fingerprint, decision: 'APPROVE', criterion: 'Brief aprobado', idempotencyKey: randomUUID() });
      const info = inspectBrandFile(png()), file = (id: string) => ({ id, originalName: 'arte.png', info, bytes: 33, sha256: 'a'.repeat(64), storageKey: `${x.admin.workspaceId}/${x.brand.id}/file-${id}/original` });
      const art = await x.engine.brandFileIntent(x.admin.token, x.brand.id, { purpose: 'FINAL_ART', deliverableId: d.deliverableId });
      const first = randomUUID(), r = await x.engine.registerBrandFile(x.admin.token, x.brand.id, art.intent, file(first));
      expect(r).toMatchObject({ newVersion: true });
      let [view] = await x.engine.deliverables(x.admin.token, x.brand.id, ['DESIGN_BRIEF']);
      expect(view.approved!.id).toBe(sub.versionId);
      expect(view.approved!.content.finalArt).toBeUndefined();
      expect(view.draft!.content.finalArt).toMatchObject({ fileId: first, format: 'PNG', source: 'UPLOAD' });
      // A save from the browser keeps the server's final art (it cannot replace or remove it).
      await x.engine.deliverableCommand(x.admin.token, 'draft', { brandId: x.brand.id, deliverableId: d.deliverableId, expectedRevision: view.revision, content: { ...view.draft!.content, finalArt: { fileId: 'forjado', name: 'x', format: 'PNG', bytes: 1, sha256: 'b'.repeat(64), source: 'UPLOAD', attachedAt: new Date().toISOString() } } });
      [view] = await x.engine.deliverables(x.admin.token, x.brand.id, ['DESIGN_BRIEF']);
      expect(view.draft!.content.finalArt!.fileId).toBe(first);
      // References belong to a brief only and stay internal.
      const ref = await x.engine.brandFileIntent(x.admin.token, x.brand.id, { purpose: 'REFERENCE', deliverableId: d.deliverableId });
      await x.engine.registerBrandFile(x.admin.token, x.brand.id, ref.intent, file(randomUUID()));
      const ad = await x.engine.deliverableCommand(x.admin.token, 'create', { brandId: x.brand.id, content: { type: 'AD', name: 'Anuncio', offerId: null, sourceDecisionVersionIds: [], body: { channel: 'GOOGLE', objective: 'TRAFFIC', headlines: ['Uno'], descriptions: [], callToAction: '', landingUrl: null } }, idempotencyKey: randomUUID() }) as { deliverableId: string };
      await expect(x.engine.brandFileIntent(x.admin.token, x.brand.id, { purpose: 'REFERENCE', deliverableId: ad.deliverableId })).rejects.toMatchObject({ code: 'INVALID' });
      // Guest: only the final art of a shared version.
      const inv = await x.engine.collaborationCommand(x.admin.token, 'invite', { brandId: x.brand.id, email: 'cliente@empresa.com', idempotencyKey: randomUUID() }) as { token: string };
      const guest = await seedIdentity(x.db);
      await x.engine.acceptInvitation(guest.token, { token: inv.token });
      await expect(x.engine.portalFinalArt(guest.token, x.brand.id, first)).rejects.toMatchObject({ code: 'NOT_FOUND' });
      [view] = await x.engine.deliverables(x.admin.token, x.brand.id, ['DESIGN_BRIEF']);
      const v2 = await x.engine.deliverableCommand(x.admin.token, 'submit', { brandId: x.brand.id, deliverableId: d.deliverableId, expectedRevision: view.revision, reviewerId: x.admin.userId }) as { versionId: string };
      await x.engine.collaborationCommand(x.admin.token, 'share', { brandId: x.brand.id, targetType: 'DELIVERABLE_VERSION', targetId: v2.versionId, idempotencyKey: randomUUID() });
      expect(await x.engine.portalFinalArt(guest.token, x.brand.id, first)).toMatchObject({ id: first, purpose: 'FINAL_ART' });
      const references = (await x.engine.brandFiles(x.admin.token, x.brand.id, { deliverableIds: [d.deliverableId] })).files.filter(f => f.purpose === 'REFERENCE');
      await expect(x.engine.portalFinalArt(guest.token, x.brand.id, references[0].id)).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });

    it('templates: classified, versioned by lineage, retired as a whole and isolated by brand', async () => {
      const x = await setup();
      const info = inspectBrandFile(zip(['[Content_Types].xml', 'ppt/presentation.xml'])), file = (id: string) => ({ id, originalName: 'plantilla.pptx', info, bytes: 200, sha256: 'c'.repeat(64), storageKey: `k/${id}` });
      await expect(x.engine.brandFileIntent(x.admin.token, x.brand.id, { purpose: 'TEMPLATE' })).rejects.toMatchObject({ code: 'INVALID' });
      const first = randomUUID();
      await x.engine.registerBrandFile(x.admin.token, x.brand.id, (await x.engine.brandFileIntent(x.admin.token, x.brand.id, { purpose: 'TEMPLATE', category: 'PRESENTATION' })).intent, file(first));
      const v2 = await x.engine.registerBrandFile(x.admin.token, x.brand.id, (await x.engine.brandFileIntent(x.admin.token, x.brand.id, { purpose: 'TEMPLATE', previousFileId: first })).intent, file(randomUUID()));
      expect(v2.sequence).toBe(2);
      const list = await x.engine.brandFiles(x.admin.token, x.brand.id, { purpose: 'TEMPLATE' });
      expect(list.templates).toHaveLength(1);
      expect(list.templates[0]).toMatchObject({ category: 'PRESENTATION', sequence: 2, format: 'PPTX' });
      expect(list.templates[0].versions.map(v => v.sequence)).toEqual([2, 1]);
      const other = await x.engine.createBrand(x.admin.token, 'Otra marca');
      expect((await x.engine.brandFiles(x.admin.token, other.id, { purpose: 'TEMPLATE' })).templates).toHaveLength(0);
      await expect(x.engine.brandFile(x.admin.token, other.id, first)).rejects.toMatchObject({ code: 'NOT_FOUND' });
      await x.engine.retireBrandFile(x.admin.token, { brandId: x.brand.id, fileId: first });
      expect((await x.engine.brandFiles(x.admin.token, x.brand.id, { purpose: 'TEMPLATE' })).templates).toHaveLength(0);
      expect(await databaseError(x.db.execute(sql`delete from brand_files where id=${first}`))).toMatch(/kept/);
    });
  });

  describe('PHASE4_SPEC §13 · social variants, sharing several items and Results periods (R12-13, R12-16, R12-17)', () => {
    it('one base piece with validated variants per network; choosing networks never publishes', () => {
      const base = { type: 'SOCIAL_POST', name: 'Lanzamiento', offerId: null, sourceDecisionVersionIds: [], body: { network: 'INSTAGRAM', format: 'POST', objective: '', scheduledDate: null, text: 'Hola', hashtags: [], materials: '' } };
      const ok = normalizeDeliverable({ ...base, body: { ...base.body, variants: [{ network: 'LINKEDIN', format: 'ARTICLE', text: 'Hola LinkedIn', hashtags: ['marca'] }] } });
      expect((ok.body.variants as { hashtags: string[] }[])[0].hashtags).toEqual(['#marca']);
      expect(() => normalizeDeliverable({ ...base, body: { ...base.body, variants: [{ network: 'X', format: 'POST', text: 'x'.repeat(281), hashtags: [] }] } })).toThrow(/X variant/);
      expect(() => normalizeDeliverable({ ...base, body: { ...base.body, variants: [{ network: 'TIKTOK', format: 'STORY', text: 'Hola', hashtags: [] }] } })).toThrow(/TIKTOK/);
      expect(() => normalizeDeliverable({ ...base, body: { ...base.body, variants: [{ network: 'INSTAGRAM', format: 'POST', text: 'Repetida', hashtags: [] }] } })).toThrow(/once/);
      expect(variantIssues({ network: 'X', format: 'POST', text: 'Hola', hashtags: Array.from({ length: 11 }, (_, i) => `#t${i}`) })).toContain('TOO_MANY_HASHTAGS');
    });

    it('sharing several items is all or nothing, each the exact version', async () => {
      const x = await setup();
      const make = async (name: string) => { const d = await x.engine.deliverableCommand(x.admin.token, 'create', { brandId: x.brand.id, content: { type: 'SALES_PRESENTATION', name, offerId: null, sourceDecisionVersionIds: [], body: { audience: '', slides: [{ title: 'Uno', text: '' }] } }, idempotencyKey: randomUUID() }) as { deliverableId: string }; return x.engine.deliverableCommand(x.admin.token, 'submit', { brandId: x.brand.id, deliverableId: d.deliverableId, expectedRevision: 0, reviewerId: x.admin.userId }) as Promise<{ versionId: string }>; };
      const a = await make('Uno'), b = await make('Dos');
      const draft = await x.engine.deliverableCommand(x.admin.token, 'create', { brandId: x.brand.id, content: { type: 'SALES_PRESENTATION', name: 'Borrador', offerId: null, sourceDecisionVersionIds: [], body: { audience: '', slides: [{ title: 'Uno', text: '' }] } }, idempotencyKey: randomUUID() }) as { versionId: string };
      await expect(x.engine.collaborationCommand(x.admin.token, 'share-many', { brandId: x.brand.id, targets: [{ targetType: 'DELIVERABLE_VERSION', targetId: a.versionId }, { targetType: 'DELIVERABLE_VERSION', targetId: draft.versionId }], idempotencyKey: randomUUID() })).rejects.toMatchObject({ code: 'CONFLICT' });
      expect(await x.db.select().from(t.portalShares).where(eq(t.portalShares.brandId, x.brand.id))).toHaveLength(0);
      const r = await x.engine.collaborationCommand(x.admin.token, 'share-many', { brandId: x.brand.id, targets: [{ targetType: 'DELIVERABLE_VERSION', targetId: a.versionId }, { targetType: 'DELIVERABLE_VERSION', targetId: b.versionId }], idempotencyKey: randomUUID() }) as { shareIds: string[] };
      expect(r.shareIds).toHaveLength(2);
      await expect(x.engine.collaborationCommand(x.member.token, 'share-many', { brandId: x.brand.id, targets: [{ targetType: 'DELIVERABLE_VERSION', targetId: a.versionId }], idempotencyKey: randomUUID() })).rejects.toMatchObject({ code: 'FORBIDDEN' });
    });

    it('periods: presets, custom dates, the previous period of equal length or the same dates a year earlier; no percentage over zero', () => {
      const now = new Date('2026-10-12T18:00:00Z');
      const p = resultsPeriod({ preset: 'LAST_7', compare: 'PREVIOUS' }, now);
      expect(p.current).toMatchObject({ from: '2026-10-06', to: '2026-10-12', days: 7 });
      expect(p.comparison).toMatchObject({ from: '2026-09-29', to: '2026-10-05', days: 7 });
      expect(p.current.fromInstant).toBe('2026-10-06T06:00:00.000Z'); // 00:00 in America/Mexico_City
      expect(resultsPeriod({ preset: 'LAST_MONTH' }, now).current).toMatchObject({ from: '2026-09-01', to: '2026-09-30' });
      expect(resultsPeriod({ preset: 'CUSTOM', from: '2024-02-29', to: '2024-03-01', compare: 'YEAR_AGO' }, now).comparison).toMatchObject({ from: '2023-02-28', to: '2023-03-01' });
      expect(() => resultsPeriod({ preset: 'CUSTOM', from: '2026-10-10', to: '2026-10-01' }, now)).toThrow(/after the end/);
      expect(() => resultsPeriod({ preset: 'CUSTOM', from: '2026-10-01', to: '2026-10-20' }, now)).toThrow(/after today/);
      expect(() => resultsPeriod({ preset: 'CUSTOM', from: '2024-01-01', to: '2026-01-01' }, now)).toThrow(/at most/);
      expect(change(5, 0)).toMatchObject({ difference: 5, percent: null });
      expect(change(6, 4)).toMatchObject({ difference: 2, percent: 50 });
      expect(change(3, null)).toMatchObject({ percent: null, previous: null });
    });

    it('the chosen period filters activity figures and their comparison; state figures say they do not depend on it', async () => {
      const x = await setup();
      const add = (daysAgo: number) => x.db.insert(t.clientOpportunities).values({ id: randomUUID(), workspaceId: x.admin.workspaceId, brandId: x.brand.id, status: 'NEW', source: 'MANUAL', personName: 'Persona', need: 'Necesita algo', receivedAt: new Date(Date.now() - daysAgo * 86400000), captureScope: `USER:${x.admin.userId}`, captureKey: randomUUID(), captureFingerprint: 'f'.repeat(64), createdBy: x.admin.userId, createdAt: new Date(), updatedAt: new Date() });
      await add(1); await add(2); await add(10);
      const week = await x.engine.results(x.admin.token, x.brand.id, { preset: 'LAST_7', compare: 'PREVIOUS' });
      const metric = (r: typeof week, id: string) => r.operations.find((m: { id: string }) => m.id === id) as unknown as { value: number; comparison: { previous: number; difference: number } | null; period: { label: string | null } };
      expect(metric(week, 'new_opportunities').value).toBe(2);
      expect(metric(week, 'new_opportunities').comparison).toMatchObject({ previous: 1, difference: 1 });
      expect(metric(week, 'unassigned').period.label).toMatch(/Estado actual/);
      const month = await x.engine.results(x.admin.token, x.brand.id, { preset: 'LAST_30' });
      expect(metric(month, 'new_opportunities').value).toBe(3);
      expect(metric(month, 'new_opportunities').comparison).toBeNull();
      expect(month.period).toMatchObject({ preset: 'LAST_30', timezone: 'America/Mexico_City' });
    });
  });
}
