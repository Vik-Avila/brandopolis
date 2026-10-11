import { describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import type { connect } from '../src/persistence/database.js';
import { Engine } from '../src/application/engine.js';
import { seedIdentity } from '../scripts/seed.js';
import * as t from '../src/persistence/schema.js';
import { emptyKit } from '../src/domain/brand-kit.js';
import { invitationState, normalizeEmail, tokenHash } from '../src/domain/collaboration.js';

const databaseError = async (query: Promise<unknown>) => { try { await query; return 'no error'; } catch (e) { return String((e as { cause?: { message?: string } }).cause?.message ?? (e as Error).message); } };

/** ADR-0033 · invitations (IVT), guest portal (PRT) and approval of the exact shared version (APR, ACC-03). */
export function collaborationCases(connection: () => ReturnType<typeof connect>) {
  const setup = async () => {
    const db = connection().db, engine = new Engine(db), team = await seedIdentity(db);
    const brand = await engine.createBrand(team.token, 'Marca del cliente');
    const otherBrand = await engine.createBrand(team.token, 'Otra marca de la agencia');
    const guest = await seedIdentity(db); // a person with their own workspace, invited to one brand of another agency
    const cmd = (action: Parameters<Engine['collaborationCommand']>[1], input: Record<string, unknown>, token = team.token) => engine.collaborationCommand(token, action, { brandId: brand.id, idempotencyKey: randomUUID(), ...input });
    const invite = async (email = 'cliente@empresa.com') => (await cmd('invite', { email })) as { invitationId: string; token: string };
    const commit = async (module: string, text: string) => {
      const c = await engine.context(team.token, brand.id), q = c.questions.find(x => x.module === module)!, d = c.decisions.find(x => x.questionId === q.id);
      await engine.prepareQuestion(team.token, brand.id, q.id, d?.activeVersionId ?? null);
      return engine.commitDecision(team.token, { brandId: brand.id, questionId: q.id, selectedOption: text, rationale: 'Criterio humano sintético', expectedActiveVersion: d?.activeVersionId ?? null, sourceRecommendationId: null, idempotencyKey: randomUUID(), actorUserId: team.userId });
    };
    /** A kit version in review (an identity proposal), the approvable shared item used below. */
    const kitInReview = async () => {
      await engine.kitCommand(team.token, 'start', { brandId: brand.id, entry: 'INGEST', expectedRevision: 0 });
      let k = (await engine.brandKit(team.token, brand.id)).kit!;
      await engine.kitCommand(team.token, 'draft', { brandId: brand.id, expectedRevision: k.revision, content: { ...emptyKit(), palette: [{ id: 'c-1', name: 'Rojo', hex: '#C8102E', role: 'PRIMARY', reference: '', certainty: 'PROPOSED', origin: { kind: 'PERSON', assetId: null, page: null, note: '' } }] } });
      k = (await engine.brandKit(team.token, brand.id)).kit!;
      return engine.kitCommand(team.token, 'submit', { brandId: brand.id, expectedRevision: k.revision }) as Promise<{ versionId: string; fingerprint: string }>;
    };
    return { db, engine, team, brand, otherBrand, guest, cmd, invite, commit, kitInReview };
  };

  describe('ADR-0033 · invitations, guest portal and approval by version', () => {
    it('domain: recipient normalization, token hash and derived expiry', () => {
      expect(normalizeEmail('  Cliente@Empresa.COM ')).toBe('cliente@empresa.com');
      expect(() => normalizeEmail('sin-arroba')).toThrow();
      expect(tokenHash('a')).not.toBe(tokenHash('b'));
      expect(invitationState({ status: 'PENDING', expiresAt: new Date(Date.now() - 1) })).toBe('EXPIRED');
      expect(invitationState({ status: 'PENDING', expiresAt: new Date(Date.now() + 60000) })).toBe('PENDING');
    });

    it('IVT-001/002/004 · PRT-001: one single-use link opens only its brand; the token is stored as a hash; team endpoints refuse the guest', async () => {
      const x = await setup();
      const inv = await x.invite();
      expect(inv.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
      const [row] = await x.db.select().from(t.brandInvitations).where(eq(t.brandInvitations.id, inv.invitationId));
      expect(row).toMatchObject({ status: 'PENDING', delivery: 'LINK', normalizedEmail: 'cliente@empresa.com', tokenHash: tokenHash(inv.token) });
      expect(JSON.stringify(row)).not.toContain(inv.token);
      expect(await x.engine.acceptInvitation(x.guest.token, { token: inv.token })).toEqual({ brandId: x.brand.id, replayed: false });
      // Reusing the link with the same identity replays; with another identity it fails (single use).
      expect(await x.engine.acceptInvitation(x.guest.token, { token: inv.token })).toMatchObject({ replayed: true });
      const third = await seedIdentity(x.db);
      await expect(x.engine.acceptInvitation(third.token, { token: inv.token })).rejects.toMatchObject({ code: 'CONFLICT' });
      expect(await x.engine.portalBrands(x.guest.token)).toEqual([{ brandId: x.brand.id, name: 'Marca del cliente' }]);
      // Only its brand: the other brand of the same agency and every team endpoint answer as if they did not exist.
      await expect(x.engine.portal(x.guest.token, x.otherBrand.id)).rejects.toMatchObject({ code: 'NOT_FOUND' });
      await expect(x.engine.context(x.guest.token, x.brand.id)).rejects.toMatchObject({ code: 'NOT_FOUND' });
      await expect(x.engine.collaboration(x.guest.token, x.brand.id)).rejects.toMatchObject({ code: 'NOT_FOUND' });
      await expect(x.engine.brandKit(x.guest.token, x.brand.id)).rejects.toMatchObject({ code: 'NOT_FOUND' });
      await expect(x.engine.offers(x.guest.token, x.brand.id)).rejects.toMatchObject({ code: 'NOT_FOUND' });
      // PRT-006 (part): the guest's own workspace keeps working; its brands are not visible to the agency.
      const own = await x.engine.createBrand(x.guest.token, 'Marca propia del invitado');
      expect((await x.engine.listBrands(x.guest.token)).map(b => b.id)).toEqual([own.id]);
      await expect(x.engine.context(x.team.token, own.id)).rejects.toMatchObject({ code: 'NOT_FOUND' });
      // A malformed or unknown token reveals nothing.
      await expect(x.engine.acceptInvitation(x.guest.token, { token: 'x' })).rejects.toMatchObject({ code: 'NOT_FOUND' });
      await expect(x.engine.acceptInvitation(x.guest.token, { token: 'A'.repeat(43) })).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });

    it('IVT-001: the recipient check uses the verified account email; a PILOT brand never accepts an identity without one', async () => {
      const x = await setup();
      const inv = await x.invite('ana@cliente.mx');
      const now = new Date();
      await x.db.insert(t.userAccounts).values({ userId: x.guest.userId, email: 'Otra@cliente.mx', normalizedEmail: 'otra@cliente.mx', emailVerifiedAt: now, createdAt: now, accessStatus: 'APPROVED' });
      await expect(x.engine.acceptInvitation(x.guest.token, { token: inv.token })).rejects.toMatchObject({ code: 'FORBIDDEN' });
      const ana = await seedIdentity(x.db);
      await x.db.insert(t.userAccounts).values({ userId: ana.userId, email: 'Ana@cliente.mx', normalizedEmail: 'ana@cliente.mx', emailVerifiedAt: now, createdAt: now, accessStatus: 'APPROVED' });
      expect(await x.engine.acceptInvitation(ana.token, { token: inv.token })).toMatchObject({ brandId: x.brand.id });
      // PILOT brand: a local identity without a verified account cannot accept.
      await x.db.execute(sql`update brands set "dataClass"='PILOT' where id=${x.otherBrand.id}`);
      const pilotInvite = (await x.engine.collaborationCommand(x.team.token, 'invite', { brandId: x.otherBrand.id, email: 'p@cliente.mx', idempotencyKey: randomUUID() })) as { token: string };
      const local = await seedIdentity(x.db);
      await expect(x.engine.acceptInvitation(local.token, { token: pilotInvite.token })).rejects.toMatchObject({ code: 'FORBIDDEN' });
      // A team member of the brand's workspace never becomes a guest of it.
      const member = await seedIdentity(x.db, 'MEMBER', x.team.workspaceId);
      const memberInvite = await x.invite('m@agencia.mx');
      await expect(x.engine.acceptInvitation(member.token, { token: memberInvite.token })).rejects.toMatchObject({ code: 'CONFLICT' });
    });

    it('IVT-003 · PRT-004: expired or revoked invitations are refused; withdrawing access denies the next request', async () => {
      const x = await setup();
      const revoked = await x.invite();
      await x.cmd('revoke-invitation', { invitationId: revoked.invitationId });
      await expect(x.engine.acceptInvitation(x.guest.token, { token: revoked.token })).rejects.toMatchObject({ code: 'CONFLICT' });
      const expired = await x.invite('otro@empresa.com');
      await x.db.execute(sql`alter table brand_invitations disable trigger brand_invitations_guard`);
      await x.db.execute(sql`update brand_invitations set "expiresAt"=now() - interval '1 minute' where id=${expired.invitationId}`);
      await x.db.execute(sql`alter table brand_invitations enable trigger brand_invitations_guard`);
      await expect(x.engine.acceptInvitation(x.guest.token, { token: expired.token })).rejects.toMatchObject({ code: 'CONFLICT' });
      expect((await x.engine.collaboration(x.team.token, x.brand.id)).invitations.find(i => i.id === expired.invitationId)!.state).toBe('EXPIRED');
      const ok = await x.invite('tres@empresa.com');
      await x.engine.acceptInvitation(x.guest.token, { token: ok.token });
      await x.commit('Primary Customer', 'Agencias');
      await x.cmd('share', { targetType: 'STRATEGY_SNAPSHOT' });
      expect((await x.engine.portal(x.guest.token, x.brand.id)).shares).toHaveLength(1);
      const guestId = (await x.engine.collaboration(x.team.token, x.brand.id)).guests[0].id;
      await x.cmd('revoke-guest', { guestId });
      await expect(x.engine.portal(x.guest.token, x.brand.id)).rejects.toMatchObject({ code: 'NOT_FOUND' });
      await expect(x.engine.portalAssetFile(x.guest.token, x.brand.id, 'any')).rejects.toMatchObject({ code: 'NOT_FOUND' });
      expect(await x.engine.portalBrands(x.guest.token)).toEqual([]);
    });

    it('PRT-002/003 · ACC-03: the guest sees only shared versions and shared comments; never internal notes, drafts or other versions', async () => {
      const x = await setup();
      const inv = await x.invite();
      await x.engine.acceptInvitation(x.guest.token, { token: inv.token });
      expect(await x.engine.portal(x.guest.token, x.brand.id)).toMatchObject({ guide: null, shares: [] });
      await x.commit('Primary Customer', 'Agencias');
      const strategy = (await x.cmd('share', { targetType: 'STRATEGY_SNAPSHOT' })) as { shareId: string };
      // The strategy share is frozen: a later decision does not appear until it is shared again.
      await x.commit('Positioning', 'Continuidad estratégica');
      let portal = await x.engine.portal(x.guest.token, x.brand.id);
      expect((portal.shares[0].body as { decisions: { module: string; selectedOption: string }[] }).decisions.map(d => d.module)).toEqual(['Primary Customer']);
      await x.cmd('comment', { shareId: strategy.shareId, body: 'Nota interna del equipo', visibility: 'INTERNAL' });
      await x.cmd('comment', { shareId: strategy.shareId, body: 'Para el cliente', visibility: 'SHARED' });
      await x.engine.portalComment(x.guest.token, { brandId: x.brand.id, shareId: strategy.shareId, body: 'Me gusta', idempotencyKey: randomUUID() });
      portal = await x.engine.portal(x.guest.token, x.brand.id);
      expect(portal.shares[0].comments.map(c => c.body)).toEqual(['Para el cliente', 'Me gusta']);
      expect(JSON.stringify(portal)).not.toContain('Nota interna');
      // A new strategy share replaces the previous one; the team still sees both with every comment.
      await x.cmd('share', { targetType: 'STRATEGY_SNAPSHOT' });
      portal = await x.engine.portal(x.guest.token, x.brand.id);
      expect(portal.shares).toHaveLength(1);
      expect((portal.shares[0].body as { decisions: unknown[] }).decisions).toHaveLength(2);
      const team = await x.engine.collaboration(x.team.token, x.brand.id);
      expect(team.shares.map(s => Boolean(s.withdrawnAt))).toEqual([false, true]);
      expect(team.shares[1].comments.map(c => c.visibility)).toEqual(['INTERNAL', 'SHARED', 'SHARED']);
      // A draft cannot be shared; a guest cannot comment on a withdrawn share or on another brand.
      await x.engine.kitCommand(x.team.token, 'start', { brandId: x.brand.id, entry: 'INGEST', expectedRevision: 0 });
      const draftId = (await x.engine.brandKit(x.team.token, x.brand.id)).kit!.draft!.id;
      await expect(x.cmd('share', { targetType: 'KIT_VERSION', targetId: draftId })).rejects.toMatchObject({ code: 'CONFLICT' });
      await expect(x.engine.portalComment(x.guest.token, { brandId: x.brand.id, shareId: strategy.shareId, body: 'Tarde', idempotencyKey: randomUUID() })).rejects.toMatchObject({ code: 'NOT_FOUND' });
      await expect(x.engine.portalComment(x.guest.token, { brandId: x.otherBrand.id, shareId: strategy.shareId, body: 'Otra', idempotencyKey: randomUUID() })).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });

    it('APR-001/002/003 on the portal: approval binds share, version and fingerprint; a stale fingerprint is a 409; it never grants publishing', async () => {
      const x = await setup();
      const inv = await x.invite();
      await x.engine.acceptInvitation(x.guest.token, { token: inv.token });
      const v1 = await x.kitInReview();
      const share = (await x.cmd('share', { targetType: 'KIT_VERSION', targetId: v1.versionId })) as { shareId: string; fingerprint: string };
      expect(share.fingerprint).toBe(v1.fingerprint);
      await expect(x.cmd('share', { targetType: 'KIT_VERSION', targetId: v1.versionId })).rejects.toMatchObject({ code: 'CONFLICT' }); // already shared
      const decide = (input: Record<string, unknown>) => x.engine.portalDecide(x.guest.token, { brandId: x.brand.id, shareId: share.shareId, idempotencyKey: randomUUID(), comment: '', ...input });
      await expect(decide({ fingerprint: 'otra-huella', decision: 'APPROVE' })).rejects.toMatchObject({ code: 'CONFLICT' });
      expect(await x.db.select().from(t.portalApprovals)).toHaveLength(0); // no effects
      await expect(decide({ fingerprint: share.fingerprint, decision: 'REQUEST_CHANGES' })).rejects.toMatchObject({ code: 'INVALID' }); // say what to change
      const key = randomUUID();
      const approved = await decide({ fingerprint: share.fingerprint, decision: 'APPROVE', idempotencyKey: key });
      expect(await decide({ fingerprint: share.fingerprint, decision: 'APPROVE', idempotencyKey: key })).toEqual({ ...approved, replayed: true });
      await expect(decide({ fingerprint: share.fingerprint, decision: 'REQUEST_CHANGES', comment: 'Otro', idempotencyKey: key })).rejects.toMatchObject({ code: 'CONFLICT' });
      const [record] = await x.db.select().from(t.portalApprovals);
      expect(record).toMatchObject({ shareId: share.shareId, targetType: 'KIT_VERSION', targetId: v1.versionId, fingerprint: v1.fingerprint, actorId: x.guest.userId, actorContext: 'GUEST', decision: 'APPROVE' });
      // Approving changed nothing editorial: the version is still in review and nothing was published.
      const kit = (await x.engine.brandKit(x.team.token, x.brand.id)).kit!;
      expect([kit.inReview.map(v => v.id), kit.approved, kit.published]).toEqual([[v1.versionId], null, null]);
      // Strategy and plan shares are for reading and comments only.
      await x.commit('Primary Customer', 'Agencias');
      const strategy = (await x.cmd('share', { targetType: 'STRATEGY_SNAPSHOT' })) as { shareId: string; fingerprint: string };
      await expect(x.engine.portalDecide(x.guest.token, { brandId: x.brand.id, shareId: strategy.shareId, fingerprint: strategy.fingerprint, decision: 'APPROVE', comment: '', idempotencyKey: randomUUID() })).rejects.toMatchObject({ code: 'INVALID' });
    });

    it('PRT-005: inviting, revoking and withdrawing access need MANAGE_GUESTS for a MEMBER; an unassigned member is refused', async () => {
      const x = await setup();
      const member = await seedIdentity(x.db, 'MEMBER', x.team.workspaceId);
      await x.db.insert(t.assignments).values({ workspaceId: x.team.workspaceId, brandId: x.brand.id, userId: member.userId });
      await expect(x.cmd('invite', { email: 'a@b.mx' }, member.token)).rejects.toMatchObject({ code: 'FORBIDDEN' });
      expect((await x.engine.collaboration(member.token, x.brand.id)).canManageGuests).toBe(false);
      await x.engine.changeBrandCapability(x.team.token, { brandId: x.brand.id, userId: member.userId, capability: 'MANAGE_GUESTS', grant: true });
      expect(await x.cmd('invite', { email: 'a@b.mx' }, member.token)).toMatchObject({ replayed: false });
      const unassigned = await seedIdentity(x.db, 'MEMBER', x.team.workspaceId);
      await expect(x.engine.collaboration(unassigned.token, x.brand.id)).rejects.toMatchObject({ code: 'FORBIDDEN' });
      // Same key twice replays without a second token (only its hash exists).
      const key = randomUUID();
      const first = (await x.cmd('invite', { email: 'c@d.mx', idempotencyKey: key })) as { token: string | null };
      expect(first.token).toBeTruthy();
      expect(await x.cmd('invite', { email: 'c@d.mx', idempotencyKey: key })).toMatchObject({ token: null, replayed: true });
      await expect(x.cmd('invite', { email: 'e@f.mx', idempotencyKey: key })).rejects.toMatchObject({ code: 'CONFLICT' });
    });

    it('database: invitations close once, guests only by revocation, shares only by withdrawal, comments and approvals append-only', async () => {
      const x = await setup();
      const inv = await x.invite();
      await x.engine.acceptInvitation(x.guest.token, { token: inv.token });
      expect(await databaseError(x.db.execute(sql`update brand_invitations set status='PENDING', "acceptedBy"=null, "acceptedAt"=null where id=${inv.invitationId}`))).toMatch(/closed/);
      const pending = await x.invite('z@z.mx');
      expect(await databaseError(x.db.execute(sql`update brand_invitations set "normalizedEmail"='otro@z.mx' where id=${pending.invitationId}`))).toMatch(/only changes by acceptance or revocation/);
      expect(await databaseError(x.db.execute(sql`delete from brand_invitations where id=${pending.invitationId}`))).toMatch(/kept/);
      const [g] = await x.db.select().from(t.brandGuests);
      expect(await databaseError(x.db.execute(sql`update brand_guests set "brandId"=${x.otherBrand.id} where id=${g.id}`))).toMatch(/only changes by revocation/);
      await x.commit('Primary Customer', 'Agencias');
      const share = (await x.cmd('share', { targetType: 'STRATEGY_SNAPSHOT' })) as { shareId: string };
      expect(await databaseError(x.db.execute(sql`update portal_shares set fingerprint='x' where id=${share.shareId}`))).toMatch(/only changes by its withdrawal/);
      await x.engine.portalComment(x.guest.token, { brandId: x.brand.id, shareId: share.shareId, body: 'Hola', idempotencyKey: randomUUID() });
      expect(await databaseError(x.db.execute(sql`update portal_comments set body='Editado'`))).toMatch(/append-only/);
      expect(await databaseError(x.db.execute(sql`insert into portal_comments (id,"workspaceId","brandId","shareId","authorId","actorContext",visibility,body,"idempotencyKey","createdAt") values (${randomUUID()},${x.team.workspaceId},${x.brand.id},${share.shareId},${x.guest.userId},'GUEST','INTERNAL','x',${randomUUID()},now())`))).toMatch(/portal_comment_context/);
      // Brand deletion removes every collaboration row of that brand.
      await x.engine.deleteBrand(x.team.token, { brandId: x.brand.id, confirmName: 'Marca del cliente', idempotencyKey: randomUUID() });
      for (const table of [t.brandInvitations, t.brandGuests, t.portalShares, t.portalComments, t.portalApprovals]) expect(await x.db.select().from(table).where(eq(table.brandId, x.brand.id))).toEqual([]);
    });
  });
}
