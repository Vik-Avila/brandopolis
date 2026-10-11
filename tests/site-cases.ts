import { describe, it, expect } from 'vitest';
import { randomUUID, createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { request as httpRequest } from 'node:http';
import { and, eq } from 'drizzle-orm';
import type { connect } from '../src/persistence/database.js';
import { Engine } from '../src/application/engine.js';
import { seedIdentity } from '../scripts/seed.js';
import * as t from '../src/persistence/schema.js';
import { linkTarget, measurementFingerprint, measurementStatus, normalizeSite, preflight, challengeOf, type SiteContent } from '../src/domain/site.js';
import { renderSite, SUBMISSION_PLACEHOLDER } from '../src/domain/site-render.js';
import { buildSiteFiles, snapshotDir, writeSnapshot } from '../src/transport/site-files.js';
import { createPublicSiteServer } from '../src/transport/sites-public.js';
import { createPreviewServer } from '../src/transport/sites-preview.js';
import type { KitAssetInfo } from '../src/domain/kit-assets.js';

const databaseError = async (q: Promise<unknown>) => { try { await q; return 'no error'; } catch (e) { return String((e as { cause?: { message?: string } }).cause?.message ?? (e as Error).message); } };
const content = (over: Partial<SiteContent> = {}): SiteContent => normalizeSite({ goal: 'LEADS', name: 'Sitio de café', pages: [
  { id: 'p-home', title: 'Inicio', description: 'Café de origen', sections: [{ id: 's-hero', type: 'HERO', title: 'Café <script>alert(1)</script>', subtitle: 'Tostado cada semana', ctaLabel: 'Escríbenos', ctaTarget: '#contacto', imageAssetId: null, imageAlt: '' }] },
  { id: 'p-contact', slug: 'contacto', title: 'Contacto', description: 'Escríbenos', sections: [{ id: 's-c', type: 'CONTACT', heading: 'Escríbenos', text: 'Respondemos pronto.' }] }], ...over });
const theme = { brandName: 'Café Ñandú', primary: '#8B2E1F', text: '#222222', background: '#FFFFFF', accent: '#C9A86A', headingFont: '', bodyFont: '', fontFaces: [], logo: null };

/** ADR-0032 · sites: SITE-001…010, MEA-006…008/012/013 (rules), DOM-001…006 (dev), CNS-004 and the form → Clientes path. */
export function siteCases(connection: () => ReturnType<typeof connect>) {
  const setup = async () => {
    const db = connection().db, engine = new Engine(db), who = await seedIdentity(db);
    const brand = await engine.createBrand(who.token, 'Café Ñandú');
    const cmd = (action: Parameters<Engine['sitesCommand']>[1], input: Record<string, unknown>, token = who.token, resolver?: (n: string) => Promise<string[]>) => engine.sitesCommand(token, action, { brandId: brand.id, ...input }, resolver) as Promise<Record<string, unknown>>;
    return { db, engine, who, brand, cmd };
  };
  /** Isolated file roots for documents and site snapshots. */
  const withRoots = async (run: () => Promise<void>) => {
    const docs = mkdtempSync(join(tmpdir(), 'bp-docs-')), sites = mkdtempSync(join(tmpdir(), 'bp-sites-'));
    const prev = { d: process.env.BRANDOPOLIS_DOCUMENT_ROOT, s: process.env.BRANDOPOLIS_SITES_ROOT, b: process.env.BRANDOPOLIS_SITES_BASE };
    process.env.BRANDOPOLIS_DOCUMENT_ROOT = docs; process.env.BRANDOPOLIS_SITES_ROOT = sites; process.env.BRANDOPOLIS_SITES_BASE = 'localhost:3999';
    try { await run(); } finally {
      for (const [k, v] of [['BRANDOPOLIS_DOCUMENT_ROOT', prev.d], ['BRANDOPOLIS_SITES_ROOT', prev.s], ['BRANDOPOLIS_SITES_BASE', prev.b]] as const) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
      rmSync(docs, { recursive: true, force: true }); rmSync(sites, { recursive: true, force: true });
    }
  };
  const loader = async (key: string, max: number) => { try { const b = readFileSync(join(process.env.BRANDOPOLIS_DOCUMENT_ROOT!, key)); return b.length <= max ? b : null; } catch { return null; } };
  const writer = (engine: Engine) => async (plan: { workspaceId: string; brandId: string; siteId: string; versionId: string; host: string }) => {
    const built = await buildSiteFiles(await engine.siteRenderPlan(plan, plan.versionId), loader, { baseUrl: `http://${plan.host}`, noindex: false });
    await writeSnapshot(snapshotDir(plan.workspaceId, plan.brandId, plan.siteId, plan.versionId), built.files);
  };
  /** Create → draft → review → approve; returns the approved version. */
  const approvedSite = async (x: Awaited<ReturnType<typeof setup>>, c: SiteContent = content()) => {
    const created = await x.cmd('create', { name: 'Sitio de café', goal: 'LEADS', idempotencyKey: randomUUID() }) as { siteId: string };
    let site = (await x.engine.sites(x.who.token, x.brand.id)).sites[0];
    await x.cmd('draft', { siteId: created.siteId, expectedRevision: site.revision, content: c });
    site = (await x.engine.sites(x.who.token, x.brand.id)).sites[0];
    const sub = await x.cmd('submit', { siteId: created.siteId, expectedRevision: site.revision }) as { versionId: string; fingerprint: string };
    await x.cmd('decide', { siteId: created.siteId, versionId: sub.versionId, fingerprint: sub.fingerprint, decision: 'APPROVE', criterion: 'Revisado por el equipo', idempotencyKey: randomUUID() });
    site = (await x.engine.sites(x.who.token, x.brand.id)).sites[0];
    return { siteId: created.siteId, versionId: sub.versionId, site };
  };
  /** fetch() ignores the Host header, so host-based requests use node:http directly. */
  const hostFetch = (url: string, init: { method?: string; headers?: Record<string, string>; body?: string; redirect?: string } = {}) => new Promise<{ status: number; headers: { get: (k: string) => string | null }; text: () => Promise<string> }>((resolve, reject) => {
    const u = new URL(url);
    const req = httpRequest({ hostname: u.hostname, port: u.port, path: u.pathname + u.search, method: init.method ?? 'GET', headers: init.headers ?? {} }, res => {
      const chunks: Buffer[] = []; res.on('data', c => chunks.push(c)); res.on('end', () => { const body = Buffer.concat(chunks).toString('utf8'); resolve({ status: res.statusCode ?? 0, headers: { get: (k: string) => { const v = res.headers[k.toLowerCase()]; return v === undefined ? null : Array.isArray(v) ? v.join(', ') : String(v); } }, text: async () => body }); });
    });
    req.on('error', reject); if (init.body) req.write(init.body); req.end();
  });
  const serve = async (server: ReturnType<typeof createPublicSiteServer>) => { await new Promise<void>(r => server.listen(0, '127.0.0.1', r)); return `http://127.0.0.1:${(server.address() as AddressInfo).port}`; };

  describe('ADR-0032 · sites', () => {
    it('SITE-004 · closed catalogue, escaped content, links only to pages, the form or https; no script in any page; deterministic', () => {
      expect(() => normalizeSite({ goal: 'LEADS', pages: [{ title: 'x', sections: [{ type: 'HTML', html: '<script>' }] }] })).toThrow();
      for (const bad of ['javascript:alert(1)', 'http://inseguro.mx', 'data:text/html,x', '//evil.example']) expect(() => linkTarget(bad)).toThrow();
      expect(linkTarget('https://tumarca.mx/precios')).toBe('https://tumarca.mx/precios');
      const files = renderSite(content(), theme, new Map(), { baseUrl: 'http://cafe.localhost:3100', noindex: false, formAction: '/__form', formPrivacy: 'Aviso' });
      const home = files.get('index.html')!;
      expect(home).toContain('Café &lt;script&gt;alert(1)&lt;/script&gt;');
      expect([...files.values()].join('')).not.toMatch(/<script/i);
      expect(home).toContain('href="/contacto/#contacto"');
      expect(files.get('contacto/index.html')).toContain(`value="${SUBMISSION_PLACEHOLDER}"`);
      expect(files.get('sitemap.xml')).toContain('<loc>http://cafe.localhost:3100/contacto/</loc>');
      expect(renderSite(content(), theme, new Map(), { baseUrl: 'http://cafe.localhost:3100', noindex: false, formAction: '/__form', formPrivacy: 'Aviso' })).toEqual(files);
    });

    it('SITE-005 · pre-publication check: titles, descriptions, image descriptions, broken links, contrast and kit website needs', () => {
      const c = normalizeSite({ goal: 'LEADS', pages: [{ id: 'p1', title: '', description: '', sections: [{ id: 's1', type: 'CTA', heading: 'x', text: '', label: 'Ir', target: 'page:p9' }, { id: 's2', type: 'IMAGE', assetId: 'img-1', alt: '', caption: '' }] }] });
      const codes = preflight(c, { images: new Set(), formReady: true, contrastOk: false, kitWebsiteGaps: ['El kit no tiene logotipo principal para el sitio.'], outdated: [] }).map(i => i.code);
      expect(codes).toEqual(expect.arrayContaining(['PAGE_TITLE', 'PAGE_DESCRIPTION', 'BROKEN_LINK', 'IMAGE_MISSING', 'IMAGE_ALT', 'CONTRAST', 'KIT_WEBSITE']));
      expect(preflight(content(), { images: new Set(), formReady: true, contrastOk: true, kitWebsiteGaps: [], outdated: [] })).toEqual([]);
    });

    it('MEA-006/007/008/012/013 · CNS-004 · measurement fingerprint and status rules: visual changes keep it; measurement, form or consent changes invalidate it', () => {
      const measured = content({ measurement: { provider: 'GOOGLE', propertyId: 'G-ABC123', event: 'generate_lead', template: 'v1' } });
      const visual = normalizeSite({ ...measured, pages: measured.pages.map((p, i) => i === 0 ? { ...p, sections: [{ ...p.sections[0], subtitle: 'Otro texto' }] } : p) });
      expect(measurementFingerprint(visual)).toBe(measurementFingerprint(measured));
      const binding = { verifiedFingerprint: measurementFingerprint(measured), connectionLost: false };
      expect(measurementStatus(binding, visual)).toEqual({ state: 'VERIFIED', compatible: true });
      expect(measurementStatus(binding, normalizeSite({ ...measured, measurement: { provider: 'GOOGLE', propertyId: 'G-ABC123', event: 'purchase', template: 'v1' } })).state).toBe('NEEDS_REVERIFICATION');
      expect(measurementStatus(binding, normalizeSite({ ...measured, pages: [measured.pages[0]] })).state).toBe('NEEDS_REVERIFICATION'); // form removed
      expect(measurementStatus(binding, normalizeSite({ ...measured, consent: { required: true, noticeVersion: 'v2' } })).state).toBe('NEEDS_REVERIFICATION');
      expect(measurementStatus(binding, content()).state).toBe('NOT_CONNECTED'); // restored version without measurement
      expect(measurementStatus({ ...binding, connectionLost: true }, measured).state).toBe('LOST');
      expect(measurementStatus({ verifiedFingerprint: null, connectionLost: false }, measured).state).toBe('PENDING_VERIFICATION');
    });

    it('create without strategy → save and resume with revision (409) → own references only → propose writes nothing', async () => {
      const x = await setup();
      const created = await x.cmd('create', { name: 'Sitio de café', goal: 'LEADS', idempotencyKey: randomUUID() }) as { siteId: string };
      let data = await x.engine.sites(x.who.token, x.brand.id);
      expect(data.sites[0]).toMatchObject({ id: created.siteId, goal: 'LEADS', draft: { sequence: 1, status: 'DRAFT' } });
      expect(data.sites[0].domains).toEqual([expect.objectContaining({ kind: 'BRANDOPOLIS', status: 'VERIFIED', hostname: expect.stringMatching(/^sitio-de-cafe-[a-z0-9]+\.localhost:3100$/) })]);
      const proposal = await x.cmd('propose', { siteId: created.siteId }) as { proposal: { pages: unknown[] }; missing: string[]; sources: Record<string, unknown> };
      expect(proposal.missing.length).toBeGreaterThan(0);
      expect(proposal.proposal.pages.length).toBeGreaterThan(0);
      expect((await x.engine.sites(x.who.token, x.brand.id)).sites[0].draft!.content.pages).toEqual([]); // proposing wrote nothing
      await x.cmd('draft', { siteId: created.siteId, expectedRevision: data.sites[0].revision, content: { ...proposal.proposal, goal: 'LEADS', name: 'Sitio de café' }, provenance: 'AI_ASSISTED' });
      await expect(x.cmd('draft', { siteId: created.siteId, expectedRevision: data.sites[0].revision, content: content() })).rejects.toMatchObject({ code: 'CONFLICT' });
      data = await x.engine.sites(x.who.token, x.brand.id);
      expect(data.sites[0].draft).toMatchObject({ provenance: 'AI_ASSISTED' });
      const other = await x.engine.createBrand(x.who.token, 'Otra marca');
      const img = await x.engine.registerKitAsset(x.who.token, other.id, { id: randomUUID(), role: 'LOGO', originalName: 'otra.png', info: { format: 'PNG', kind: 'RASTER', mediaType: 'image/png', width: 100, height: 100, alpha: false, previewable: true } as KitAssetInfo, bytes: 10, sha256: createHash('sha256').update(randomUUID()).digest('hex'), storageKey: 'x/y' });
      await expect(x.cmd('draft', { siteId: created.siteId, expectedRevision: data.sites[0].revision, content: content({ pages: [{ id: 'p', slug: '', title: 'I', description: 'd', sections: [{ id: 's', type: 'IMAGE', assetId: img.assetId, alt: 'a', caption: '' }] }] }) })).rejects.toMatchObject({ code: 'INVALID' });
      await expect(x.cmd('draft', { siteId: created.siteId, expectedRevision: data.sites[0].revision, content: content({ pages: [{ id: 'p', slug: '', title: 'I', description: 'd', sections: [{ id: 's', type: 'OFFERS', heading: 'h', items: [{ offerId: randomUUID(), offerVersionId: randomUUID(), name: 'x', description: '' }] }] }] }) })).rejects.toMatchObject({ code: 'INVALID' });
      // Another workspace and a guest never reach the team routes.
      const outsider = await seedIdentity(x.db);
      await expect(x.engine.sites(outsider.token, x.brand.id)).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });

    it('SITE-002 · publish an exact approved version (PUBLISH_SITE + confirmation), public server serves it without cookies, form → Clientes once, restore an earlier version', async () => withRoots(async () => {
      const x = await setup();
      const first = await approvedSite(x);
      const host = first.site.domains[0].hostname;
      const confirm = { siteName: 'Sitio de café', sequence: 1, host };
      // A member without PUBLISH_SITE, a wrong confirmation or an unapproved version cannot publish.
      const member = await seedIdentity(x.db, 'MEMBER', x.who.workspaceId);
      await x.db.insert(t.assignments).values({ workspaceId: x.who.workspaceId, brandId: x.brand.id, userId: member.userId });
      await expect(x.engine.publishSite(member.token, { brandId: x.brand.id, siteId: first.siteId, versionId: first.versionId, confirm, idempotencyKey: randomUUID() }, writer(x.engine))).rejects.toMatchObject({ code: 'FORBIDDEN' });
      await expect(x.engine.publishSite(x.who.token, { brandId: x.brand.id, siteId: first.siteId, versionId: first.versionId, confirm: { ...confirm, sequence: 2 }, idempotencyKey: randomUUID() }, writer(x.engine))).rejects.toMatchObject({ code: 'CONFLICT' });
      const pub1 = await x.engine.publishSite(x.who.token, { brandId: x.brand.id, siteId: first.siteId, versionId: first.versionId, confirm, idempotencyKey: randomUUID() }, writer(x.engine));
      expect(pub1).toMatchObject({ status: 'PUBLISHED' });
      const server = createPublicSiteServer(x.engine), base = await serve(server);
      const get = (path: string, h = host, headers: Record<string, string> = {}) => hostFetch(base + path, { headers: { Host: h, ...headers } });
      try {
        const home = await get('/?utm_source=facebook&utm_campaign=otono&fbclid=IwAR0abc', host, { Cookie: 'brandopolis_session=secreto' });
        expect(home.status).toBe(200);
        expect(home.headers.get('set-cookie')).toBeNull();
        expect(home.headers.get('cache-control')).toBe('private, no-cache'); // back navigation reuses the visitor's copy (same submission id); never a shared cache
        expect(home.headers.get('content-security-policy')).toContain("default-src 'none'");
        const html = await home.text();
        expect(html).toContain('Café &lt;script&gt;');
        expect((await get('/', 'otro-sitio.localhost:3999')).status).toBe(404);
        expect((await get('/../../etc/passwd')).status).toBe(404);
        const contact = await (await get('/contacto/?utm_source=facebook&utm_campaign=otono&fbclid=IwAR0abc')).text();
        const submission = /name="submission" value="([^"]+)"/.exec(contact)![1];
        expect(contact).toContain('name="utm_campaign" value="otono"');
        const body = new URLSearchParams({ submission, website: '', name: 'Ana', email: 'ana@example.com', need: 'Precios', contactPurpose: 'yes', utm_source: 'facebook', utm_campaign: 'otono', fbclid: 'IwAR0abc', landing: '/contacto/' });
        const post = (b: URLSearchParams) => hostFetch(base + '/__form', { method: 'POST', headers: { Host: host, 'Content-Type': 'application/x-www-form-urlencoded' }, body: b.toString() });
        const sent = await post(body);
        expect(sent.status).toBe(303);
        expect(sent.headers.get('location')).toMatch(/^\/__gracias\?ref=OP-[0-9A-F]{8}$/);
        expect((await post(body)).status).toBe(303); // re-submission of the same page → same record
        expect((await post(new URLSearchParams({ ...Object.fromEntries(body), website: 'spam', submission: randomUUID() }))).status).toBe(400);
        expect((await post(new URLSearchParams({ ...Object.fromEntries(body), contactPurpose: '', submission: randomUUID() }))).status).toBe(400);
        const clients = await x.engine.clients(x.who.token, x.brand.id);
        expect(clients.opportunities).toHaveLength(1);
        expect(clients.opportunities[0]).toMatchObject({ source: 'WEB_FORM', ownerUserId: null, attention: ['UNASSIGNED', 'NO_FOLLOW_UP'] });
        expect(clients.opportunities[0].origin).toMatchObject({ acquisitionPlatform: 'META', campaignStatus: 'CAPTURED_UNVERIFIED', utm: { source: 'facebook', campaign: 'otono' }, landingPath: '/contacto/' });
        // Version 2 published, then version 1 restored as a new publication; history intact.
        let site = (await x.engine.sites(x.who.token, x.brand.id)).sites[0];
        await x.cmd('new-draft', { siteId: first.siteId, expectedRevision: site.revision });
        site = (await x.engine.sites(x.who.token, x.brand.id)).sites[0];
        await x.cmd('draft', { siteId: first.siteId, expectedRevision: site.revision, content: normalizeSite({ ...content(), pages: content().pages.map((p, i) => i ? p : { ...p, sections: [{ ...p.sections[0], title: 'Versión dos' }] }) }) });
        site = (await x.engine.sites(x.who.token, x.brand.id)).sites[0];
        const sub2 = await x.cmd('submit', { siteId: first.siteId, expectedRevision: site.revision }) as { versionId: string; fingerprint: string };
        await x.cmd('decide', { siteId: first.siteId, versionId: sub2.versionId, fingerprint: sub2.fingerprint, decision: 'APPROVE', criterion: 'Segunda versión revisada', idempotencyKey: randomUUID() });
        await x.engine.publishSite(x.who.token, { brandId: x.brand.id, siteId: first.siteId, versionId: sub2.versionId, confirm: { ...confirm, sequence: 2 }, idempotencyKey: randomUUID() }, writer(x.engine));
        expect(await (await get('/')).text()).toContain('Versión dos');
        const restored = await x.engine.publishSite(x.who.token, { brandId: x.brand.id, siteId: first.siteId, versionId: first.versionId, confirm, idempotencyKey: randomUUID() }, writer(x.engine));
        expect(restored).toMatchObject({ status: 'PUBLISHED', versionId: first.versionId });
        expect(await (await get('/')).text()).not.toContain('Versión dos');
        site = (await x.engine.sites(x.who.token, x.brand.id)).sites[0];
        expect(site.publications.map(p => [p.sequence, p.status])).toEqual([[1, 'PUBLISHED'], [2, 'REPLACED'], [1, 'REPLACED']]);
        expect(site.liveVersionId).toBe(first.versionId);
        // A published snapshot is immutable: a later version never changes its files.
        expect(existsSync(snapshotDir(x.who.workspaceId, x.brand.id, first.siteId, first.versionId))).toBe(true);
        // Database guards: publications only move forward; versions are immutable once approved.
        expect(await databaseError(x.db.update(t.sitePublications).set({ status: 'PENDING' }).where(eq(t.sitePublications.siteId, first.siteId)))).toMatch(/not allowed/);
        expect(await databaseError(x.db.update(t.siteVersions).set({ content: {} }).where(eq(t.siteVersions.id, first.versionId)))).toMatch(/immutable|not allowed/);
      } finally { server.close(); }
    }));

    it('SITE-001/007/008/009/010 · preview: browser-bound single-use code, member sees drafts, guest only the shared version, every request re-checks access', async () => withRoots(async () => {
      const x = await setup();
      process.env.BRANDOPOLIS_PREVIEW_ORIGIN = 'http://127.0.0.2:3998'; process.env.BRANDOPOLIS_APP_ORIGIN = 'http://127.0.0.1:3997';
      const server = createPreviewServer(x.engine, loader); await new Promise<void>(r => server.listen(0, '127.0.0.1', r));
      const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
      const get = (path: string, cookie = '') => fetch(base + path, { headers: cookie ? { Cookie: cookie } : {}, redirect: 'manual' });
      try {
        const created = await x.cmd('create', { name: 'Sitio de café', goal: 'LEADS', idempotencyKey: randomUUID() }) as { siteId: string; versionId: string };
        let site = (await x.engine.sites(x.who.token, x.brand.id)).sites[0];
        await x.cmd('draft', { siteId: created.siteId, expectedRevision: site.revision, content: content() });
        const clean = `/b/${x.brand.id}/v/${created.versionId}/`;
        // Step 1: no session → a browser transaction and a hand-off to the app with state and challenge only.
        const start = await get(clean);
        expect(start.status).toBe(303);
        const location = new URL(start.headers.get('location')!);
        expect(location.origin + location.pathname).toBe('http://127.0.0.1:3997/preview/confirm');
        const txCookie = /bp_preview_tx=([^;]+)/.exec(start.headers.get('set-cookie')!)![1], [state, verifier] = txCookie.split('.');
        expect(start.headers.get('set-cookie')).toMatch(/HttpOnly; SameSite=Lax/);
        expect(location.searchParams.get('state')).toBe(state);
        expect(location.searchParams.get('challenge')).toBe(challengeOf(verifier));
        expect(location.search).not.toContain(verifier);
        // Resources without a session are denied, never redirected.
        expect((await get(clean + 'styles.css')).status).toBe(403);
        // Step 2: the app issues the code to the person's own session.
        const outsider = await seedIdentity(x.db);
        await expect(x.engine.issueSitePreviewCode(outsider.token, { brandId: x.brand.id, versionId: created.versionId, state, challenge: challengeOf(verifier) })).rejects.toMatchObject({ code: 'NOT_FOUND' });
        const issued = await x.engine.issueSitePreviewCode(x.who.token, { brandId: x.brand.id, versionId: created.versionId, state, challenge: challengeOf(verifier) });
        const callback = `/__preview/callback?code=${encodeURIComponent(issued.code)}&state=${state}&return=${encodeURIComponent(clean)}`;
        // Step 3: another browser (no transaction cookie) or a wrong verifier never creates a session...
        expect((await get(callback)).status).toBe(403);
        expect((await get(callback, `bp_preview_tx=${state}.otro-verificador-distinto-del-original-123`)).status).toBe(403);
        await expect(x.engine.exchangeSitePreviewCode({ code: issued.code, state, verifier: 'x'.repeat(40) })).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
        // ...and the right browser redeems it once.
        const done = await get(callback, `bp_preview_tx=${txCookie}`);
        expect(done.status).toBe(200);
        const sessionCookie = /bp_preview=([^;]+); HttpOnly; SameSite=Strict/.exec(done.headers.get('set-cookie')!)![1];
        expect(await done.text()).not.toContain(issued.code);
        expect((await get(callback, `bp_preview_tx=${txCookie}`)).status).toBe(403); // single use
        const page = await get(clean, `bp_preview=${sessionCookie}`);
        expect(page.status).toBe(200);
        expect(page.headers.get('x-robots-tag')).toBe('noindex, nofollow');
        expect(page.headers.get('cache-control')).toBe('no-store');
        expect(page.headers.get('referrer-policy')).toBe('no-referrer');
        const html = await page.text();
        expect(html).toContain('Vista previa · versión interna');
        expect(html).toContain(`href="/b/${x.brand.id}/v/${created.versionId}/styles.css"`);
        expect((await get(clean + 'styles.css', `bp_preview=${sessionCookie}`)).status).toBe(200);
        site = (await x.engine.sites(x.who.token, x.brand.id)).sites[0];
        const sub = await x.cmd('submit', { siteId: created.siteId, expectedRevision: site.revision }) as { versionId: string };
        expect(sub.versionId).toBe(created.versionId);
        // A guest: nothing until this exact version is shared; then only it; withdrawing applies on the next request.
        const inv = await x.engine.collaborationCommand(x.who.token, 'invite', { brandId: x.brand.id, email: 'cliente@empresa.com', idempotencyKey: randomUUID() }) as { token: string };
        const guest = await seedIdentity(x.db); await x.engine.acceptInvitation(guest.token, { token: inv.token });
        const gState = 'g' + randomUUID().replace(/-/g, ''), gVerifier = randomUUID() + randomUUID();
        await expect(x.engine.issueSitePreviewCode(guest.token, { brandId: x.brand.id, versionId: created.versionId, state: gState, challenge: challengeOf(gVerifier) })).rejects.toMatchObject({ code: 'NOT_FOUND' });
        await x.engine.collaborationCommand(x.who.token, 'share', { brandId: x.brand.id, targetType: 'SITE_VERSION', targetId: created.versionId, idempotencyKey: randomUUID() });
        const gCode = await x.engine.issueSitePreviewCode(guest.token, { brandId: x.brand.id, versionId: created.versionId, state: gState, challenge: challengeOf(gVerifier) });
        const gSession = await x.engine.exchangeSitePreviewCode({ code: gCode.code, state: gState, verifier: gVerifier });
        expect(await (await get(clean, `bp_preview=${gSession.token}`)).text()).toContain('versión compartida contigo');
        const portal = await x.engine.portal(guest.token, x.brand.id);
        expect(portal.shares[0]).toMatchObject({ targetType: 'SITE_VERSION' });
        await expect(x.engine.portalDecide(guest.token, { brandId: x.brand.id, shareId: portal.shares[0].id, fingerprint: portal.shares[0].fingerprint, decision: 'APPROVE', comment: '', idempotencyKey: randomUUID() })).rejects.toMatchObject({ code: 'INVALID' });
        const shareId = (await x.engine.collaboration(x.who.token, x.brand.id)).shares[0].id;
        await x.engine.collaborationCommand(x.who.token, 'withdraw', { brandId: x.brand.id, shareId });
        expect((await get(clean, `bp_preview=${gSession.token}`)).status).toBe(303); // no longer authorised: back to the exchange
        expect((await get(clean + 'styles.css', `bp_preview=${gSession.token}`)).status).toBe(403);
        // A member whose access is removed loses the preview on the next request too.
        await x.db.update(t.memberships).set({ active: false }).where(eq(t.memberships.userId, x.who.userId));
        expect((await get(clean, `bp_preview=${sessionCookie}`)).status).toBe(303);
      } finally { server.close(); delete process.env.BRANDOPOLIS_PREVIEW_ORIGIN; delete process.env.BRANDOPOLIS_APP_ORIGIN; }
    }));

    it('DOM-001/002/004/006 · custom domain: TXT proof by the client, an unverified claim never blocks the real owner, a holder keeps it only while its record exists, removal stops serving; nothing is bought or changed', async () => withRoots(async () => {
      const x = await setup();
      const first = await approvedSite(x);
      await x.engine.publishSite(x.who.token, { brandId: x.brand.id, siteId: first.siteId, versionId: first.versionId, confirm: { siteName: 'Sitio de café', sequence: 1, host: first.site.domains[0].hostname }, idempotencyKey: randomUUID() }, writer(x.engine));
      // A squatter in another workspace claims the hostname first: it reserves nothing.
      const other = await setup();
      await other.cmd('create', { name: 'Otro sitio', goal: 'INFORM', idempotencyKey: randomUUID() });
      const otherSite = (await other.engine.sites(other.who.token, other.brand.id)).sites[0];
      const squat = await other.cmd('domain-add', { siteId: otherSite.id, hostname: 'www.cafe-nandu.mx', idempotencyKey: randomUUID() }) as { domainId: string };
      const added = await x.cmd('domain-add', { siteId: first.siteId, hostname: 'www.cafe-nandu.mx', idempotencyKey: randomUUID() }) as { domainId: string };
      await expect(x.cmd('domain-add', { siteId: first.siteId, hostname: 'www.cafe-nandu.mx', idempotencyKey: randomUUID() })).rejects.toMatchObject({ code: 'CONFLICT' }); // once per brand
      let d = (await x.engine.sites(x.who.token, x.brand.id)).sites[0].domains.find(z => z.kind === 'CUSTOM')!;
      expect(d).toMatchObject({ status: 'PENDING_VERIFICATION', record: { name: '_brandopolis.www.cafe-nandu.mx', type: 'TXT', value: expect.stringMatching(/^brandopolis-site-verification=/) } });
      const squatRecord = (await other.engine.sites(other.who.token, other.brand.id)).sites[0].domains.find(z => z.kind === 'CUSTOM')!.record!.value;
      expect(squatRecord).not.toBe(d.record!.value); // every claim has its own token
      const server = createPublicSiteServer(x.engine), base = await serve(server);
      const dns: string[] = [];
      const resolver = async () => [...dns];
      try {
        expect((await hostFetch(base + '/', { headers: { Host: 'www.cafe-nandu.mx' } })).status).toBe(404); // not verified → not served
        expect((await other.cmd('domain-check', { domainId: squat.domainId }, other.who.token, resolver)).status).toBe('PENDING_VERIFICATION');
        dns.push('otra-cosa');
        expect((await x.cmd('domain-check', { domainId: added.domainId }, x.who.token, resolver)).status).toBe('PENDING_VERIFICATION');
        dns.push(d.record!.value); // the owner publishes its record
        expect((await x.cmd('domain-check', { domainId: added.domainId }, x.who.token, resolver)).status).toBe('VERIFIED');
        expect((await hostFetch(base + '/', { headers: { Host: 'www.cafe-nandu.mx' } })).status).toBe(200);
        // While the holder's record is published nobody else verifies, even with a record of its own; the answer reveals nothing.
        dns.push(squatRecord);
        await expect(other.cmd('domain-check', { domainId: squat.domainId }, other.who.token, resolver)).rejects.toMatchObject({ code: 'CONFLICT', message: 'This domain is not available' });
        dns.splice(0, dns.length, squatRecord); // the domain changed hands: only the new controller's record remains
        expect((await other.cmd('domain-check', { domainId: squat.domainId }, other.who.token, resolver)).status).toBe('VERIFIED');
        d = (await x.engine.sites(x.who.token, x.brand.id)).sites[0].domains.find(z => z.kind === 'CUSTOM')!;
        expect(d.status).toBe('FAILED'); // the stale holder no longer serves it
        expect(await x.db.select().from(t.siteDomains).where(and(eq(t.siteDomains.hostname, 'www.cafe-nandu.mx'), eq(t.siteDomains.status, 'VERIFIED')))).toHaveLength(1);
        // Losing the record on a later check withdraws it (no dangling domain); removing releases the claim.
        dns.length = 0;
        expect((await other.cmd('domain-check', { domainId: squat.domainId }, other.who.token, resolver)).status).toBe('FAILED');
        expect((await hostFetch(base + '/', { headers: { Host: 'www.cafe-nandu.mx' } })).status).toBe(404);
        await x.cmd('domain-remove', { domainId: added.domainId });
        d = (await x.engine.sites(x.who.token, x.brand.id)).sites[0].domains.find(z => z.kind === 'CUSTOM')!;
        expect(d.status).toBe('REMOVED');
        expect(await x.cmd('domain-add', { siteId: first.siteId, hostname: 'www.cafe-nandu.mx', idempotencyKey: randomUUID() })).toMatchObject({ replayed: false });
        for (const bad of ['localhost', 'tienda.localhost:3999', 'x.brandopolis.ai', 'no valido', 'a.b']) await expect(x.cmd('domain-add', { siteId: first.siteId, hostname: bad, idempotencyKey: randomUUID() })).rejects.toMatchObject({ code: 'INVALID' });
      } finally { server.close(); }
    }));

    it('kit files are untrusted: a damaged image is omitted with a notice (same limits as exports); brand deletion removes sites, versions and snapshots', async () => withRoots(async () => {
      const x = await setup();
      const key = `${x.who.workspaceId}/${x.brand.id}/kit-bad/original`;
      mkdirSync(join(process.env.BRANDOPOLIS_DOCUMENT_ROOT!, x.who.workspaceId, x.brand.id, 'kit-bad'), { recursive: true });
      writeFileSync(join(process.env.BRANDOPOLIS_DOCUMENT_ROOT!, key), Buffer.from('not really a png'));
      const img = await x.engine.registerKitAsset(x.who.token, x.brand.id, { id: randomUUID(), role: 'REFERENCE', originalName: 'falsa.png', info: { format: 'PNG', kind: 'RASTER', mediaType: 'image/png', width: 800, height: 600, alpha: false, previewable: true } as KitAssetInfo, bytes: 16, sha256: createHash('sha256').update('falsa').digest('hex'), storageKey: key });
      const base = content();
      const withImage = normalizeSite({ ...base, pages: [{ ...base.pages[0], sections: [...base.pages[0].sections, { id: 's-img', type: 'IMAGE', assetId: img.assetId, alt: 'Una taza', caption: '' }] }, base.pages[1]] });
      const first = await approvedSite(x, withImage);
      const built = await buildSiteFiles(await x.engine.siteRenderPlan({ workspaceId: x.who.workspaceId, brandId: x.brand.id }, first.versionId), loader, { baseUrl: null, noindex: true });
      expect(built.notices.join(' ')).toContain('«falsa.png» no es válida');
      expect([...built.files.keys()].some(k => k.startsWith('assets/'))).toBe(false);
      await x.engine.publishSite(x.who.token, { brandId: x.brand.id, siteId: first.siteId, versionId: first.versionId, confirm: { siteName: 'Sitio de café', sequence: 1, host: first.site.domains[0].hostname }, idempotencyKey: randomUUID() }, writer(x.engine));
      expect(existsSync(snapshotDir(x.who.workspaceId, x.brand.id, first.siteId, first.versionId))).toBe(true);
      await x.engine.deleteBrand(x.who.token, { brandId: x.brand.id, confirmName: 'Café Ñandú', idempotencyKey: randomUUID() });
      for (const table of [t.sites, t.siteVersions, t.sitePublications, t.siteDomains, t.siteApprovals]) expect(await x.db.select().from(table).where(eq(table.brandId, x.brand.id))).toHaveLength(0);
    }));
  });
}
