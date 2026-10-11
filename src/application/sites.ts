import { randomUUID } from 'node:crypto';
import { and, asc, desc, eq, inArray, isNull, ne } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { AppError } from '../domain/contracts.js';
import { approve, editorialTransition, type EditorialStatus } from '../domain/editorial-versions.js';
import { channelGaps, pairContrast, type KitContent } from '../domain/brand-kit.js';
import { DOMAIN, SITE_GOALS, challengeOf, measurementFingerprint, newToken, normalizeSite, preflight, sha256, siteFingerprint, slugify, type SiteContent, type SiteGoal, type SectionSource } from '../domain/site.js';
import { DEV_PRIVACY_NOTICE, newPublicFormId } from '../domain/clients.js';
import { MAX_IMAGE_PIXELS } from './pdf-brand.js';
import { brandopolisHost, siteConfig } from './site-config.js';
import type { Transaction } from '../persistence/database.js';
import * as t from '../persistence/schema.js';
import type { BrandActor } from './brand-access.js';

/**
 * ADR-0032 · sites. Team operations receive a BrandActor (membership + brand scope). Publishing and domains need
 * PUBLISH_SITE (ADR-0033); approving the content is not enough. The authenticated preview and the public server
 * resolve access themselves (see previewReader and resolvePublicHost). Nothing here touches files: the transport
 * renders and writes snapshots, then confirms the publication.
 */
type Scoped = { workspaceId: string; brandId: string };
const byBrand = (table: { workspaceId: AnyPgColumn; brandId: AnyPgColumn }, a: Scoped) => and(eq(table.workspaceId, a.workspaceId), eq(table.brandId, a.brandId));
const key = (v: unknown) => { if (typeof v !== 'string' || !v.trim() || v.length > 200) throw new AppError('INVALID', 'Invalid idempotency key'); return v; };
const idOf = (v: unknown, what: string) => { if (typeof v !== 'string' || !v || v.length > 200) throw new AppError('INVALID', `${what} required`); return v; };
const needsPublish = (a: BrandActor) => { if (!a.capabilities.includes('PUBLISH_SITE')) throw new AppError('FORBIDDEN', 'Publishing a site needs the publish permission'); };
const IMAGE_ROLES = ['LOGO', 'REFERENCE', 'DESIGNER_DELIVERY'];
const IMAGE_FORMATS = ['PNG', 'JPEG', 'WEBP'];
export const SITE_FORM_PRIVACY = `Aviso de privacidad provisional de desarrollo (versión ${DEV_PRIVACY_NOTICE}). El texto definitivo está pendiente. Tu solicitud no activa etiquetas publicitarias.`;
const emptyContent = (name: string, goal: SiteGoal, kitVersionId: string | null): SiteContent => ({ goal, name, pages: [], navigation: [], kitVersionId, measurement: { provider: 'NONE' }, consent: { required: false, noticeVersion: null } });

/** Kit version a site uses (ADR-0034): the published one, else the approved one; null if the brand has none. */
async function currentKit(tx: Transaction, a: Scoped) {
  const [kit] = await tx.select().from(t.brandKits).where(byBrand(t.brandKits, a));
  const id = kit?.publishedVersionId ?? kit?.approvedVersionId ?? null;
  if (!id) return null;
  const [v] = await tx.select().from(t.brandKitVersions).where(eq(t.brandKitVersions.id, id));
  return v ? { id: v.id, sequence: v.sequence, published: v.id === kit?.publishedVersionId, content: v.content as KitContent } : null;
}
async function kitById(tx: Transaction, a: Scoped, id: string | null) {
  if (!id) return null;
  const [v] = await tx.select().from(t.brandKitVersions).where(and(byBrand(t.brandKitVersions, a), eq(t.brandKitVersions.id, id)));
  return v ? { id: v.id, sequence: v.sequence, content: v.content as KitContent } : null;
}
/** Approved offers of the brand with the exact version a site cites. */
async function approvedOffers(tx: Transaction, a: Scoped) {
  const offers = await tx.select().from(t.offers).where(and(byBrand(t.offers, a), eq(t.offers.status, 'ACTIVE')));
  const ids = offers.map(o => o.approvedVersionId).filter((x): x is string => !!x);
  const versions = ids.length ? await tx.select().from(t.offerVersions).where(and(byBrand(t.offerVersions, a), inArray(t.offerVersions.id, ids))) : [];
  return offers.filter(o => o.approvedVersionId).map(o => { const v = versions.find(x => x.id === o.approvedVersionId)!; const c = v.content as { name: string; need: string; outcome: string; benefits: string[] }; return { offerId: o.id, offerVersionId: v.id, sequence: v.sequence, name: c.name, need: c.need, outcome: c.outcome, benefits: c.benefits ?? [] }; });
}
/** Images a site may use: raster kit files whose declared size is within the export limits (ADR-0032, 6957ce6). */
async function siteImages(tx: Transaction, a: Scoped) {
  const rows = await tx.select().from(t.kitAssets).where(byBrand(t.kitAssets, a)).orderBy(asc(t.kitAssets.createdAt));
  return rows.filter(r => IMAGE_ROLES.includes(r.role) && IMAGE_FORMATS.includes(r.format) && r.width && r.height && r.width * r.height <= MAX_IMAGE_PIXELS).map(r => ({ id: r.id, role: r.role, format: r.format, originalName: r.originalName, width: r.width!, height: r.height! }));
}
/** Every reference must be the brand's own: offers (with an existing version of that offer) and images. */
async function checkReferences(tx: Transaction, a: Scoped, c: SiteContent) {
  const offerRefs = c.pages.flatMap(p => p.sections.flatMap(s => (s.type === 'OFFERS' ? s.items : [])));
  if (offerRefs.length) {
    const versions = await tx.select({ id: t.offerVersions.id, offerId: t.offerVersions.offerId }).from(t.offerVersions).where(and(byBrand(t.offerVersions, a), inArray(t.offerVersions.id, offerRefs.map(o => o.offerVersionId))));
    for (const o of offerRefs) if (!versions.some(v => v.id === o.offerVersionId && v.offerId === o.offerId)) throw new AppError('INVALID', 'Unknown offer for this brand');
  }
  const imageRefs = c.pages.flatMap(p => p.sections.flatMap(s => (s.type === 'IMAGE' ? [s.assetId] : s.type === 'HERO' && s.imageAssetId ? [s.imageAssetId] : [])));
  if (imageRefs.length) { const allowed = new Set((await siteImages(tx, a)).map(i => i.id)); for (const i of imageRefs) if (!allowed.has(i)) throw new AppError('INVALID', 'This image is not an image of the brand kit that a site can use'); }
}
const manifestOf = (c: SiteContent) => ({ kitVersionId: c.kitVersionId, offerVersionIds: [...new Set(c.pages.flatMap(p => p.sections.flatMap(s => (s.type === 'OFFERS' ? s.items.map(i => i.offerVersionId) : []))))] });

async function lockSite(tx: Transaction, a: Scoped, id: unknown, expected?: unknown) {
  const [row] = await tx.select().from(t.sites).where(and(byBrand(t.sites, a), eq(t.sites.id, idOf(id, 'Site')))).for('update');
  if (!row) throw new AppError('NOT_FOUND', 'Site not available');
  if (expected !== undefined && expected !== row.revision) throw new AppError('CONFLICT', 'This site changed; reload to see the current version');
  return row;
}
const touch = (tx: Transaction, id: string, values: Partial<typeof t.sites.$inferInsert>) => tx.update(t.sites).set({ ...values, updatedAt: new Date() }).where(eq(t.sites.id, id));

/** What changed since a version was made: newer kit or offer versions (a notice; nothing changes by itself). */
async function outdated(tx: Transaction, a: Scoped, c: SiteContent) {
  const out: string[] = [];
  const kit = await currentKit(tx, a);
  if (kit && c.kitVersionId && kit.id !== c.kitVersionId) out.push(`El kit de marca tiene una versión más reciente (${kit.sequence}). Revisa el sitio y guarda una versión nueva para usarla.`);
  const offers = await approvedOffers(tx, a);
  for (const o of c.pages.flatMap(p => p.sections.flatMap(s => (s.type === 'OFFERS' ? s.items : [])))) {
    const now = offers.find(x => x.offerId === o.offerId);
    if (!now) out.push(`La oferta «${o.name}» ya no está aprobada o activa.`);
    else if (now.offerVersionId !== o.offerVersionId) out.push(`La oferta «${o.name}» tiene una versión aprobada más reciente.`);
  }
  return [...new Set(out)];
}
/** Pre-publication check of a version. NO_KIT and OUTDATED are notices; every other issue blocks publishing. */
async function checksFor(tx: Transaction, a: Scoped, c: SiteContent) {
  const kit = await kitById(tx, a, c.kitVersionId);
  const images = new Set((await siteImages(tx, a)).map(i => i.id));
  const pairs = kit ? pairContrast(kit.content) : [];
  const words: Record<string, string> = { PRIMARY_LOGO: 'El kit no tiene logotipo principal para el sitio.', FAVICON: 'El kit no tiene símbolo o favicon para el sitio.', WEB_FONT: 'El kit no tiene una tipografía con permiso web ni una alternativa web revisada.', CONTRAST_PAIRS: 'El kit no define combinaciones de texto y fondo.' };
  const gaps = kit ? channelGaps(kit.content).filter(g => g.channel === 'WEBSITE').map(g => words[g.need]).filter(Boolean) : [];
  // The contact form gets its destination when a person with the publish permission publishes (startPublication).
  const issues = preflight(c, { images, formReady: true, contrastOk: pairs.every(p => p.normalText === 'AA'), kitWebsiteGaps: gaps, outdated: await outdated(tx, a, c) });
  if (!kit) issues.push({ code: 'NO_KIT', message: 'La marca todavía no tiene un kit aprobado: el sitio usa colores y tipografía neutros hasta que lo tenga.' });
  return issues;
}
export const NON_BLOCKING = new Set(['NO_KIT', 'OUTDATED']);

// ─── Reading ─────────────────────────────────────────────────────────────────────────────────────────────────────
type VersionRow = typeof t.siteVersions.$inferSelect;
const versionView = (v: VersionRow) => ({ id: v.id, sequence: v.sequence, status: v.status, fingerprint: v.fingerprint, measurementFingerprint: v.measurementFingerprint, content: v.content as SiteContent, manifest: v.manifest, provenance: v.provenance, createdAt: v.createdAt.toISOString(), decidedAt: v.decidedAt?.toISOString() ?? null, decisionCriterion: v.decisionCriterion });

/** Sites of the brand with versions, publications, domains, checks and what the editor can use. */
export async function readSites(tx: Transaction, a: BrandActor) {
  const sites = await tx.select().from(t.sites).where(byBrand(t.sites, a)).orderBy(asc(t.sites.createdAt));
  const versions = sites.length ? await tx.select().from(t.siteVersions).where(byBrand(t.siteVersions, a)).orderBy(desc(t.siteVersions.sequence)) : [];
  const publications = sites.length ? await tx.select().from(t.sitePublications).where(byBrand(t.sitePublications, a)).orderBy(desc(t.sitePublications.createdAt)) : [];
  const domains = sites.length ? await tx.select().from(t.siteDomains).where(byBrand(t.siteDomains, a)).orderBy(asc(t.siteDomains.createdAt)) : [];
  const kit = await currentKit(tx, a);
  const out = [];
  for (const s of sites) {
    const vs = versions.filter(v => v.siteId === s.id);
    const draft = vs.find(v => v.id === s.draftVersionId) ?? null;
    const checked = async (v: VersionRow | null) => (v ? { ...versionView(v), checks: await checksFor(tx, a, v.content as SiteContent) } : null);
    out.push({
      id: s.id, name: s.name, slug: s.slug, goal: s.goal, revision: s.revision, hasForm: Boolean(s.formId),
      draft: await checked(draft), approved: await checked(vs.find(v => v.id === s.approvedVersionId) ?? null),
      inReview: vs.filter(v => v.status === 'IN_REVIEW').map(versionView),
      history: vs.map(v => ({ id: v.id, sequence: v.sequence, status: v.status, createdAt: v.createdAt.toISOString(), decidedAt: v.decidedAt?.toISOString() ?? null })),
      publications: publications.filter(p => p.siteId === s.id).map(p => ({ id: p.id, versionId: p.versionId, sequence: vs.find(v => v.id === p.versionId)?.sequence ?? null, status: p.status, host: p.host, restoredFrom: p.restoredFrom, createdAt: p.createdAt.toISOString(), completedAt: p.completedAt?.toISOString() ?? null, failure: p.failure })),
      liveVersionId: s.publishedVersionId,
      domains: domains.filter(d => d.siteId === s.id).map(d => ({ id: d.id, hostname: d.hostname, kind: d.kind, status: d.status, record: d.kind === 'CUSTOM' ? { name: `_brandopolis.${d.hostname}`, type: 'TXT', value: `brandopolis-site-verification=${d.token}` } : null, checkedAt: d.checkedAt?.toISOString() ?? null, verifiedAt: d.verifiedAt?.toISOString() ?? null })),
    });
  }
  return {
    sites: out, canPublish: a.capabilities.includes('PUBLISH_SITE'), goals: SITE_GOALS,
    kit: kit ? { versionId: kit.id, sequence: kit.sequence, published: kit.published } : null,
    offers: await approvedOffers(tx, a), images: await siteImages(tx, a),
    previewOrigin: siteConfig().previewOrigin, publicScheme: siteConfig().publicScheme,
  };
}

// ─── Creating and editing ────────────────────────────────────────────────────────────────────────────────────────

/** A site starts from its goal and name; no strategy is required to begin. It gets its Brandopolis address now. */
export async function createSite(tx: Transaction, a: BrandActor, input: { name?: unknown; goal?: unknown; idempotencyKey?: unknown }) {
  const idempotencyKey = key(input.idempotencyKey);
  if (!SITE_GOALS.includes(input.goal as SiteGoal)) throw new AppError('INVALID', 'Choose what the site is for');
  const name = typeof input.name === 'string' ? input.name.trim().slice(0, 120) : '';
  if (!name) throw new AppError('INVALID', 'Name the site');
  const [prior] = await tx.select().from(t.sites).where(and(byBrand(t.sites, a), eq(t.sites.createdBy, a.userId), eq(t.sites.idempotencyKey, idempotencyKey)));
  if (prior) return { siteId: prior.id, versionId: prior.draftVersionId, replayed: true };
  const base = slugify(name).slice(0, 30) || 'sitio';
  let slug = '';
  for (let i = 0; i < 5 && !slug; i++) { const candidate = `${base}-${newToken(4).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || 'x1'}`.replace(/-+/g, '-'); const [taken] = await tx.select({ id: t.sites.id }).from(t.sites).where(eq(t.sites.slug, candidate)); if (!taken && /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/.test(candidate)) slug = candidate; }
  if (!slug) throw new AppError('CONFLICT', 'Could not reserve an address; try again');
  const now = new Date(), siteId = randomUUID(), versionId = randomUUID();
  const kit = await currentKit(tx, a), content = emptyContent(name, input.goal as SiteGoal, kit?.id ?? null);
  await tx.insert(t.sites).values({ id: siteId, workspaceId: a.workspaceId, brandId: a.brandId, name, slug, goal: input.goal as string, status: 'ACTIVE', draftVersionId: null, revision: 0, createdBy: a.userId, idempotencyKey, createdAt: now, updatedAt: now });
  await tx.insert(t.siteVersions).values({ id: versionId, workspaceId: a.workspaceId, brandId: a.brandId, siteId, sequence: 1, status: 'DRAFT', content, fingerprint: siteFingerprint(content), measurementFingerprint: measurementFingerprint(content), manifest: manifestOf(content), provenance: 'MANUAL', createdBy: a.userId, createdAt: now });
  await touch(tx, siteId, { draftVersionId: versionId });
  await tx.insert(t.siteDomains).values({ id: randomUUID(), workspaceId: a.workspaceId, brandId: a.brandId, siteId, hostname: brandopolisHost(slug), kind: 'BRANDOPOLIS', status: 'VERIFIED', token: newToken(), createdBy: a.userId, idempotencyKey: `auto:${siteId}`, createdAt: now, verifiedAt: now });
  return { siteId, versionId, replayed: false };
}

/** Saves the working draft (revision checked). The site uses the kit version that is current when it is saved. */
export async function saveSiteDraft(tx: Transaction, a: BrandActor, input: { siteId?: unknown; expectedRevision?: unknown; content?: unknown; provenance?: unknown }) {
  const site = await lockSite(tx, a, input.siteId, input.expectedRevision);
  if (!site.draftVersionId) throw new AppError('CONFLICT', 'Start a new version first');
  const [draft] = await tx.select().from(t.siteVersions).where(eq(t.siteVersions.id, site.draftVersionId)).for('update');
  if (!draft || draft.status !== 'DRAFT') throw new AppError('CONFLICT', 'This version is no longer a draft');
  const kit = await currentKit(tx, a);
  const content = { ...normalizeSite({ ...(input.content as object), goal: (input.content as { goal?: unknown })?.goal ?? site.goal, name: (input.content as { name?: unknown })?.name ?? site.name }), kitVersionId: kit?.id ?? null };
  await checkReferences(tx, a, content);
  const provenance = input.provenance === 'AI_ASSISTED' || draft.provenance === 'AI_ASSISTED' ? 'AI_ASSISTED' : 'MANUAL';
  await tx.update(t.siteVersions).set({ content, fingerprint: siteFingerprint(content), measurementFingerprint: measurementFingerprint(content), manifest: manifestOf(content), provenance }).where(eq(t.siteVersions.id, draft.id));
  await touch(tx, site.id, { revision: site.revision + 1, name: content.name || site.name, goal: content.goal });
  return { siteId: site.id, versionId: draft.id, revision: site.revision + 1, fingerprint: siteFingerprint(content) };
}

/**
 * Brando's structure and text proposal from what the brand already has (approved offers, approved decisions, kit
 * tone). Deterministic in this block (no AI call); every section says where it comes from. Proposing writes nothing:
 * the person incorporates the sections they want, which is saved as an AI-assisted draft.
 */
export async function proposeSite(tx: Transaction, a: BrandActor, input: { siteId?: unknown }) {
  const [site] = await tx.select().from(t.sites).where(and(byBrand(t.sites, a), eq(t.sites.id, idOf(input.siteId, 'Site'))));
  if (!site) throw new AppError('NOT_FOUND', 'Site not available');
  const [brand] = await tx.select({ name: t.brands.name }).from(t.brands).where(and(eq(t.brands.workspaceId, a.workspaceId), eq(t.brands.id, a.brandId)));
  const decisions = await tx.select({ module: t.questions.module, option: t.versions.selectedOption, sequence: t.versions.sequence }).from(t.decisions).innerJoin(t.questions, eq(t.questions.id, t.decisions.questionId)).innerJoin(t.versions, eq(t.versions.id, t.decisions.activeVersionId)).where(and(byBrand(t.decisions, a), eq(t.versions.versionStatus, 'APPROVED')));
  const d = (m: string) => decisions.find(x => x.module === m);
  const offers = await approvedOffers(tx, a), kit = await currentKit(tx, a);
  const promise = d('Brand Promise') ?? d('Positioning'), message = d('Core Message'), customer = d('Primary Customer');
  const src = (kind: SectionSource['kind'], label: string): SectionSource => ({ kind, label });
  const missing: string[] = [];
  if (!promise) missing.push('Promesa de marca o posicionamiento aprobados (la portada usará el nombre de la marca)');
  if (!offers.length) missing.push('Ofertas aprobadas en Productos y servicios (no se propone la lista de ofertas)');
  if (!kit) missing.push('Kit de marca aprobado (el sitio usará colores neutros)');
  const home = { id: 'p-home', slug: '', title: 'Inicio', description: (message?.option ?? promise?.option ?? brand?.name ?? site.name).slice(0, 160), sections: [] as unknown[] };
  const sources: Record<string, SectionSource> = {};
  const add = (page: { sections: unknown[] }, section: Record<string, unknown>, source: SectionSource) => { page.sections.push(section); sources[section.id as string] = source; };
  add(home, { id: 's-hero', type: 'HERO', title: (promise?.option ?? brand?.name ?? site.name).slice(0, 120), subtitle: (message?.option ?? (customer ? `Para ${customer.option}` : '')).slice(0, 300), ctaLabel: site.goal === 'LEADS' || site.goal === 'SELL' ? 'Contáctanos' : '', ctaTarget: site.goal === 'LEADS' || site.goal === 'SELL' ? '#contacto' : '', imageAssetId: null, imageAlt: '' }, promise ? src('DECISION', `${promise.module === 'Brand Promise' ? 'Promesa de marca' : 'Posicionamiento'} · versión ${promise.sequence}`) : src('BRAND', 'Nombre de la marca'));
  if (offers.length) add(home, { id: 's-offers', type: 'OFFERS', heading: 'Lo que ofrecemos', items: offers.slice(0, 6).map(o => ({ offerId: o.offerId, offerVersionId: o.offerVersionId, name: o.name, description: [o.outcome || o.need, ...o.benefits.slice(0, 3).map(b => `• ${b}`)].filter(Boolean).join('\n') })) }, src('OFFER', offers.slice(0, 6).map(o => `«${o.name}» v${o.sequence}`).join(', ')));
  if (customer) add(home, { id: 's-for', type: 'TEXT', heading: 'Para quién es', body: customer.option }, src('DECISION', `Cliente principal · versión ${customer.sequence}`));
  const pages: Record<string, unknown>[] = [home];
  for (const o of offers.slice(0, 4)) {
    const page = { id: `p-${o.offerId.slice(0, 8)}`, slug: slugify(o.name), title: o.name, description: (o.outcome || o.need || o.name).slice(0, 160), sections: [] as unknown[] };
    add(page, { id: `s-o-${o.offerId.slice(0, 8)}`, type: 'TEXT', heading: o.name, body: [o.need && `Necesidad: ${o.need}`, o.outcome && `Resultado: ${o.outcome}`, ...o.benefits.map(b => `• ${b}`)].filter(Boolean).join('\n\n') }, src('OFFER', `«${o.name}» versión ${o.sequence}`));
    if (site.goal === 'LEADS' || site.goal === 'SELL') add(page, { id: `s-c-${o.offerId.slice(0, 8)}`, type: 'CTA', heading: '¿Te interesa?', text: 'Cuéntanos qué necesitas y te respondemos.', label: 'Escríbenos', target: '#contacto' }, src('BRAND', 'Objetivo del sitio'));
    pages.push(page);
  }
  if (site.goal !== 'INFORM') { const contact = { id: 'p-contact', slug: 'contacto', title: 'Contacto', description: `Escribe a ${brand?.name ?? site.name}.`.slice(0, 160), sections: [] as unknown[] }; add(contact, { id: 's-contact', type: 'CONTACT', heading: 'Escríbenos', text: 'Te respondemos lo antes posible.' }, src('BRAND', 'Objetivo del sitio')); pages.push(contact); }
  return { proposal: { pages, navigation: pages.map(p => p.id as string) }, sources, missing, provenance: 'AI_ASSISTED', mode: 'DETERMINISTIC_DEMO', tone: kit?.content.verbal.tone ?? null };
}

export async function submitSite(tx: Transaction, a: BrandActor, input: { siteId?: unknown; expectedRevision?: unknown }) {
  const site = await lockSite(tx, a, input.siteId, input.expectedRevision);
  if (!site.draftVersionId) throw new AppError('CONFLICT', 'There is no draft to send for review');
  const [draft] = await tx.select().from(t.siteVersions).where(eq(t.siteVersions.id, site.draftVersionId)).for('update');
  if (!(draft.content as SiteContent).pages.length) throw new AppError('CONFLICT', 'Add at least one page before sending for review');
  editorialTransition(draft.status as EditorialStatus, 'IN_REVIEW');
  await tx.update(t.siteVersions).set({ status: 'IN_REVIEW', submittedAt: new Date() }).where(eq(t.siteVersions.id, draft.id));
  await touch(tx, site.id, { draftVersionId: null, revision: site.revision + 1 });
  return { siteId: site.id, versionId: draft.id, fingerprint: draft.fingerprint };
}

export async function decideSite(tx: Transaction, a: BrandActor, input: { siteId?: unknown; versionId?: unknown; fingerprint?: unknown; decision?: unknown; criterion?: unknown; idempotencyKey?: unknown }) {
  const idempotencyKey = key(input.idempotencyKey);
  const site = await lockSite(tx, a, input.siteId);
  if (input.decision !== 'APPROVE' && input.decision !== 'REQUEST_CHANGES') throw new AppError('INVALID', 'Decision must be APPROVE or REQUEST_CHANGES');
  const criterion = typeof input.criterion === 'string' ? input.criterion.trim() : '';
  if (criterion.length < 10 || criterion.length > 2000) throw new AppError('INVALID', 'Criterion required');
  const [prior] = await tx.select().from(t.siteApprovals).where(and(byBrand(t.siteApprovals, a), eq(t.siteApprovals.actorId, a.userId), eq(t.siteApprovals.idempotencyKey, idempotencyKey)));
  if (prior) { if (prior.versionId !== input.versionId || prior.decision !== input.decision) throw new AppError('CONFLICT', 'Idempotency key already used with other content'); return { siteId: site.id, versionId: prior.versionId, status: prior.decision === 'APPROVE' ? 'APPROVED' : 'CHANGES_REQUESTED', replayed: true }; }
  const versions = await tx.select().from(t.siteVersions).where(eq(t.siteVersions.siteId, site.id)).for('update');
  const target = versions.find(v => v.id === input.versionId);
  if (!target) throw new AppError('NOT_FOUND', 'Version not available');
  if (target.fingerprint !== input.fingerprint) throw new AppError('CONFLICT', 'Content changed since it was sent for review');
  const now = new Date();
  if (input.decision === 'REQUEST_CHANGES') {
    editorialTransition(target.status as EditorialStatus, 'CHANGES_REQUESTED');
    await tx.update(t.siteVersions).set({ status: 'CHANGES_REQUESTED', decidedBy: a.userId, decidedAt: now, decisionCriterion: criterion }).where(eq(t.siteVersions.id, target.id));
    await tx.insert(t.siteApprovals).values({ id: randomUUID(), workspaceId: a.workspaceId, brandId: a.brandId, siteId: site.id, versionId: target.id, fingerprint: target.fingerprint, decision: 'REQUEST_CHANGES', criterion, actorId: a.userId, idempotencyKey, createdAt: now });
    await touch(tx, site.id, { revision: site.revision + 1 });
    return { siteId: site.id, versionId: target.id, status: 'CHANGES_REQUESTED' };
  }
  const result = approve({ draftVersionId: site.draftVersionId, approvedVersionId: site.approvedVersionId, publishedVersionId: site.publishedVersionId }, versions.map(v => ({ id: v.id, sequence: v.sequence, status: v.status as EditorialStatus, fingerprint: v.fingerprint })), target.id, String(input.fingerprint));
  await tx.update(t.siteVersions).set({ status: 'APPROVED', decidedBy: a.userId, decidedAt: now, decisionCriterion: criterion }).where(eq(t.siteVersions.id, target.id));
  if (result.superseded) await tx.update(t.siteVersions).set({ status: 'SUPERSEDED' }).where(eq(t.siteVersions.id, result.superseded));
  await tx.insert(t.siteApprovals).values({ id: randomUUID(), workspaceId: a.workspaceId, brandId: a.brandId, siteId: site.id, versionId: target.id, fingerprint: target.fingerprint, decision: 'APPROVE', criterion, actorId: a.userId, supersededVersionId: result.superseded, idempotencyKey, createdAt: now });
  await touch(tx, site.id, { approvedVersionId: target.id, revision: site.revision + 1 });
  return { siteId: site.id, versionId: target.id, status: 'APPROVED', superseded: result.superseded };
}

/** New draft from the approved version (or the latest). The live site and the approved version do not change. */
export async function newSiteDraft(tx: Transaction, a: BrandActor, input: { siteId?: unknown; expectedRevision?: unknown }) {
  const site = await lockSite(tx, a, input.siteId, input.expectedRevision);
  if (site.draftVersionId) throw new AppError('CONFLICT', 'There is already a draft');
  const [base] = site.approvedVersionId ? await tx.select().from(t.siteVersions).where(eq(t.siteVersions.id, site.approvedVersionId)) : await tx.select().from(t.siteVersions).where(eq(t.siteVersions.siteId, site.id)).orderBy(desc(t.siteVersions.sequence)).limit(1);
  const [last] = await tx.select({ sequence: t.siteVersions.sequence }).from(t.siteVersions).where(eq(t.siteVersions.siteId, site.id)).orderBy(desc(t.siteVersions.sequence)).limit(1);
  const kit = await currentKit(tx, a);
  const content = { ...(base.content as SiteContent), kitVersionId: kit?.id ?? null };
  const id = randomUUID();
  await tx.insert(t.siteVersions).values({ id, workspaceId: a.workspaceId, brandId: a.brandId, siteId: site.id, sequence: last.sequence + 1, previousVersionId: base.id, status: 'DRAFT', content, fingerprint: siteFingerprint(content), measurementFingerprint: measurementFingerprint(content), manifest: manifestOf(content), provenance: base.provenance, createdBy: a.userId, createdAt: new Date() });
  await touch(tx, site.id, { draftVersionId: id, revision: site.revision + 1 });
  return { siteId: site.id, versionId: id };
}

// ─── Publication (two phases: the transport writes the snapshot between them) ──────────────────────────────────────

/**
 * Starts publishing an exact version that is (or was) approved. Needs PUBLISH_SITE and a confirmation naming site,
 * version and destination. Creates the site's form destination if a page has a contact section. Returns what the
 * transport needs to render and write the immutable snapshot.
 */
export async function startPublication(tx: Transaction, a: BrandActor, input: { siteId?: unknown; versionId?: unknown; confirm?: unknown; idempotencyKey?: unknown }) {
  needsPublish(a);
  const idempotencyKey = key(input.idempotencyKey);
  const site = await lockSite(tx, a, input.siteId);
  const [prior] = await tx.select().from(t.sitePublications).where(and(byBrand(t.sitePublications, a), eq(t.sitePublications.publishedBy, a.userId), eq(t.sitePublications.idempotencyKey, idempotencyKey)));
  if (prior) return { publicationId: prior.id, status: prior.status, replayed: true, plan: null };
  const [version] = await tx.select().from(t.siteVersions).where(and(byBrand(t.siteVersions, a), eq(t.siteVersions.siteId, site.id), eq(t.siteVersions.id, idOf(input.versionId, 'Version'))));
  if (!version) throw new AppError('NOT_FOUND', 'Version not available');
  if (!['APPROVED', 'SUPERSEDED'].includes(version.status) || !version.decidedAt) throw new AppError('CONFLICT', 'Only an approved version can be published');
  const [domain] = await tx.select().from(t.siteDomains).where(and(eq(t.siteDomains.siteId, site.id), eq(t.siteDomains.kind, 'BRANDOPOLIS'), eq(t.siteDomains.status, 'VERIFIED')));
  const host = domain?.hostname ?? brandopolisHost(site.slug);
  const c = (input.confirm ?? {}) as Record<string, unknown>;
  if (c.siteName !== site.name || c.sequence !== version.sequence || c.host !== host) throw new AppError('CONFLICT', 'Confirm the site, the version and the address you are publishing to');
  const content = version.content as SiteContent;
  const issues = (await checksFor(tx, a, content)).filter(i => !NON_BLOCKING.has(i.code));
  if (issues.length) throw new AppError('CONFLICT', `This version cannot be published yet: ${issues.map(i => i.message).join(' ')}`);
  let formId = site.formId;
  if (!formId && content.pages.some(p => p.sections.some(s => s.type === 'CONTACT'))) {
    formId = randomUUID();
    await tx.insert(t.leadForms).values({ id: formId, workspaceId: a.workspaceId, brandId: a.brandId, publicId: newPublicFormId(), name: `Sitio · ${site.name}`.slice(0, 120), segmentId: null, status: 'ACTIVE', privacyNoticeVersion: DEV_PRIVACY_NOTICE, createdBy: a.userId, idempotencyKey: `site:${site.id}`, createdAt: new Date() });
    await touch(tx, site.id, { formId });
  }
  const restoredFrom = site.publishedVersionId && version.id !== site.approvedVersionId ? site.publishedVersionId : null;
  const id = randomUUID();
  await tx.insert(t.sitePublications).values({ id, workspaceId: a.workspaceId, brandId: a.brandId, siteId: site.id, versionId: version.id, status: 'PENDING', host, fingerprint: version.fingerprint, restoredFrom, publishedBy: a.userId, idempotencyKey, createdAt: new Date() });
  return { publicationId: id, status: 'PENDING', replayed: false, plan: { workspaceId: a.workspaceId, brandId: a.brandId, siteId: site.id, versionId: version.id, host } };
}

/** Completes a publication after the snapshot exists: the live pointer moves atomically; the previous one is REPLACED. */
export async function finishPublication(tx: Transaction, s: Scoped, input: { publicationId: string; ok: boolean; failure?: string }) {
  const [pub] = await tx.select().from(t.sitePublications).where(and(byBrand(t.sitePublications, s), eq(t.sitePublications.id, input.publicationId))).for('update');
  if (!pub || pub.status !== 'PENDING') throw new AppError('CONFLICT', 'Publication not pending');
  const now = new Date();
  if (!input.ok) { await tx.update(t.sitePublications).set({ status: 'FAILED', completedAt: now, failure: (input.failure ?? 'WRITE_FAILED').slice(0, 120) }).where(eq(t.sitePublications.id, pub.id)); return { publicationId: pub.id, status: 'FAILED' }; }
  await tx.select().from(t.sites).where(eq(t.sites.id, pub.siteId)).for('update');
  await tx.update(t.sitePublications).set({ status: 'REPLACED', replacedAt: now }).where(and(eq(t.sitePublications.siteId, pub.siteId), eq(t.sitePublications.status, 'PUBLISHED')));
  await tx.update(t.sitePublications).set({ status: 'PUBLISHED', completedAt: now }).where(eq(t.sitePublications.id, pub.id));
  await tx.update(t.sites).set({ publishedVersionId: pub.versionId, updatedAt: now }).where(eq(t.sites.id, pub.siteId));
  return { publicationId: pub.id, status: 'PUBLISHED', versionId: pub.versionId, host: pub.host };
}

/** What a renderer needs for one version: content, kit version and the kit files it uses (images, logo, fonts). */
export async function renderPlan(tx: Transaction, s: Scoped, versionId: string) {
  const [v] = await tx.select().from(t.siteVersions).where(and(byBrand(t.siteVersions, s), eq(t.siteVersions.id, versionId)));
  if (!v) throw new AppError('NOT_FOUND', 'Version not available');
  const [site] = await tx.select().from(t.sites).where(eq(t.sites.id, v.siteId));
  const [brand] = await tx.select({ name: t.brands.name }).from(t.brands).where(and(eq(t.brands.workspaceId, s.workspaceId), eq(t.brands.id, s.brandId)));
  const content = v.content as SiteContent, kit = await kitById(tx, s, content.kitVersionId);
  const used = new Set(content.pages.flatMap(p => p.sections.flatMap(x => (x.type === 'IMAGE' ? [x.assetId] : x.type === 'HERO' && x.imageAssetId ? [x.imageAssetId] : []))));
  const logo = kit?.content.logos.find(l => l.variant === 'PRIMARY') ?? kit?.content.logos[0];
  if (logo) used.add(logo.assetId);
  const rows = await tx.select().from(t.kitAssets).where(byBrand(t.kitAssets, s));
  const assets = rows.filter(r => used.has(r.id) || r.role === 'FONT').map(r => ({ id: r.id, role: r.role, format: r.format, storageKey: r.storageKey, width: r.width, height: r.height, originalName: r.originalName }));
  let formPublicId: string | null = null;
  if (site?.formId) { const [f] = await tx.select({ publicId: t.leadForms.publicId, status: t.leadForms.status }).from(t.leadForms).where(eq(t.leadForms.id, site.formId)); formPublicId = f?.status === 'ACTIVE' ? f.publicId : null; }
  return { version: versionView(v), siteName: site?.name ?? content.name, brandName: brand?.name ?? '', kit: kit ? { versionId: kit.id, sequence: kit.sequence, content: kit.content } : null, logoAssetId: logo?.assetId ?? null, assets, formPublicId };
}

// ─── Domains ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** Registers a custom domain to verify with a TXT record the client adds. Nothing is bought or changed automatically. */
export async function addCustomDomain(tx: Transaction, a: BrandActor, input: { siteId?: unknown; hostname?: unknown; idempotencyKey?: unknown }) {
  needsPublish(a);
  const idempotencyKey = key(input.idempotencyKey);
  const site = await lockSite(tx, a, input.siteId);
  const hostname = typeof input.hostname === 'string' ? input.hostname.trim().toLowerCase().replace(/\.$/, '') : '';
  if (!DOMAIN.test(hostname) || hostname.endsWith(siteConfig().publicBase.split(':')[0]) || hostname.endsWith('brandopolis.ai')) throw new AppError('INVALID', 'Write a domain like www.tumarca.com');
  const [prior] = await tx.select().from(t.siteDomains).where(and(byBrand(t.siteDomains, a), eq(t.siteDomains.createdBy, a.userId), eq(t.siteDomains.idempotencyKey, idempotencyKey)));
  if (prior) return { domainId: prior.id, replayed: true };
  // An unverified claim reserves nothing (no squatting): several brands may claim a hostname and only the one that proves
  // DNS control verifies it. The answer never reveals whether another brand or workspace claims or holds it.
  const [mine] = await tx.select({ id: t.siteDomains.id }).from(t.siteDomains).where(and(byBrand(t.siteDomains, a), eq(t.siteDomains.hostname, hostname), ne(t.siteDomains.status, 'REMOVED')));
  if (mine) throw new AppError('CONFLICT', 'This domain is already added to this brand');
  const id = randomUUID();
  await tx.insert(t.siteDomains).values({ id, workspaceId: a.workspaceId, brandId: a.brandId, siteId: site.id, hostname, kind: 'CUSTOM', status: 'PENDING_VERIFICATION', token: newToken(), createdBy: a.userId, idempotencyKey, createdAt: new Date() });
  return { domainId: id, replayed: false };
}
export type TxtResolver = (name: string) => Promise<string[]>;
/** Checks the TXT record; a verified domain that loses it becomes FAILED (no dangling domains). */
export async function checkDomain(tx: Transaction, a: BrandActor, input: { domainId?: unknown }, resolveTxt: TxtResolver) {
  needsPublish(a);
  const [d] = await tx.select().from(t.siteDomains).where(and(byBrand(t.siteDomains, a), eq(t.siteDomains.id, idOf(input.domainId, 'Domain')))).for('update');
  if (!d || d.kind !== 'CUSTOM' || d.status === 'REMOVED') throw new AppError('NOT_FOUND', 'Domain not available');
  const proves = async (token: string) => { try { return (await resolveTxt(`_brandopolis.${d.hostname}`)).some(v => v.trim() === `brandopolis-site-verification=${token}`); } catch { return false; } };
  const found = await proves(d.token);
  const now = new Date();
  if (found && d.status !== 'VERIFIED') {
    // Serialise every claim of this hostname; a current holder keeps it only while its own record is still published.
    const claims = await tx.select().from(t.siteDomains).where(eq(t.siteDomains.hostname, d.hostname)).orderBy(t.siteDomains.id).for('update');
    const holder = claims.find(c => c.id !== d.id && c.status === 'VERIFIED');
    if (holder) {
      if (holder.kind !== 'CUSTOM' || await proves(holder.token)) throw new AppError('CONFLICT', 'This domain is not available');
      await tx.update(t.siteDomains).set({ status: 'FAILED', checkedAt: now }).where(eq(t.siteDomains.id, holder.id));
    }
  }
  const status = found ? 'VERIFIED' : d.status === 'VERIFIED' ? 'FAILED' : d.status;
  await tx.update(t.siteDomains).set({ status, checkedAt: now, ...(found && d.status !== 'VERIFIED' ? { verifiedAt: now } : {}) }).where(eq(t.siteDomains.id, d.id));
  return { domainId: d.id, status, found };
}
export async function removeDomain(tx: Transaction, a: BrandActor, input: { domainId?: unknown }) {
  needsPublish(a);
  const [d] = await tx.select().from(t.siteDomains).where(and(byBrand(t.siteDomains, a), eq(t.siteDomains.id, idOf(input.domainId, 'Domain')))).for('update');
  if (!d || d.kind !== 'CUSTOM' || d.status === 'REMOVED') throw new AppError('NOT_FOUND', 'Domain not available');
  await tx.update(t.siteDomains).set({ status: 'REMOVED', removedBy: a.userId, removedAt: new Date() }).where(eq(t.siteDomains.id, d.id));
  return { domainId: d.id, status: 'REMOVED' };
}

// ─── Public server ───────────────────────────────────────────────────────────────────────────────────────────────

/** Host → live publication. Unknown host, removed domain, or no publication → null (the server answers 404). */
export async function resolvePublicHost(tx: Transaction, host: string) {
  if (!/^[a-z0-9.:-]{4,260}$/.test(host)) return null;
  const [d] = await tx.select().from(t.siteDomains).where(and(eq(t.siteDomains.hostname, host), eq(t.siteDomains.status, 'VERIFIED')));
  if (!d) return null;
  const [site] = await tx.select().from(t.sites).where(eq(t.sites.id, d.siteId));
  if (!site || site.status !== 'ACTIVE' || !site.publishedVersionId) return null;
  const [pub] = await tx.select().from(t.sitePublications).where(and(eq(t.sitePublications.siteId, site.id), eq(t.sitePublications.status, 'PUBLISHED')));
  if (!pub) return null;
  let formPublicId: string | null = null;
  if (site.formId) { const [f] = await tx.select().from(t.leadForms).where(eq(t.leadForms.id, site.formId)); formPublicId = f?.status === 'ACTIVE' ? f.publicId : null; }
  return { workspaceId: site.workspaceId, brandId: site.brandId, siteId: site.id, versionId: pub.versionId, publicationId: pub.id, formPublicId };
}

// ─── Authenticated preview (ADR-0032: browser-bound exchange, authorisation on every request) ───────────────────────

/** Who may read a version: a team member with the brand (any version) or a guest with that exact version shared. */
async function previewReader(tx: Transaction, userId: string, brandId: string, versionId: string) {
  const [brand] = await tx.select().from(t.brands).where(eq(t.brands.id, brandId));
  if (!brand) return null;
  const [v] = await tx.select().from(t.siteVersions).where(and(eq(t.siteVersions.workspaceId, brand.workspaceId), eq(t.siteVersions.brandId, brandId), eq(t.siteVersions.id, versionId)));
  if (!v) return null;
  const [m] = await tx.select().from(t.memberships).where(and(eq(t.memberships.workspaceId, brand.workspaceId), eq(t.memberships.userId, userId), eq(t.memberships.active, true)));
  if (m && (m.role === 'ADMIN' || (await tx.select().from(t.assignments).where(and(eq(t.assignments.workspaceId, brand.workspaceId), eq(t.assignments.brandId, brandId), eq(t.assignments.userId, userId)))).length)) return { workspaceId: brand.workspaceId, brandId, siteId: v.siteId, versionId, as: 'TEAM' as const };
  const [g] = await tx.select().from(t.brandGuests).where(and(eq(t.brandGuests.brandId, brandId), eq(t.brandGuests.userId, userId), eq(t.brandGuests.status, 'ACTIVE')));
  if (!g) return null;
  const [share] = await tx.select().from(t.portalShares).where(and(eq(t.portalShares.workspaceId, brand.workspaceId), eq(t.portalShares.brandId, brandId), eq(t.portalShares.targetType, 'SITE_VERSION'), eq(t.portalShares.targetId, versionId), isNull(t.portalShares.withdrawnAt)));
  return share ? { workspaceId: brand.workspaceId, brandId, siteId: v.siteId, versionId, as: 'GUEST' as const } : null;
}
/** Step 2 of the exchange, in the app: the person's own session asks for a short single-use code bound to state and challenge. */
export async function issuePreviewCode(tx: Transaction, userId: string, input: { brandId?: unknown; versionId?: unknown; state?: unknown; challenge?: unknown }) {
  const brandId = idOf(input.brandId, 'Brand'), versionId = idOf(input.versionId, 'Version');
  if (typeof input.state !== 'string' || !/^[A-Za-z0-9_-]{20,100}$/.test(input.state) || typeof input.challenge !== 'string' || !/^[A-Za-z0-9_-]{40,60}$/.test(input.challenge)) throw new AppError('INVALID', 'Invalid preview request');
  const reader = await previewReader(tx, userId, brandId, versionId);
  if (!reader) throw new AppError('NOT_FOUND', 'Preview not available');
  const code = newToken(32), now = new Date();
  await tx.insert(t.sitePreviewCodes).values({ id: randomUUID(), codeHash: sha256(code), workspaceId: reader.workspaceId, brandId, siteId: reader.siteId, versionId, userId, state: input.state, challenge: input.challenge, expiresAt: new Date(now.getTime() + 60_000), createdAt: now });
  return { code, previewOrigin: siteConfig().previewOrigin };
}
/** Step 3, server to server: the preview origin presents the code, its own state and the verifier. Used once. */
export async function exchangePreviewCode(tx: Transaction, input: { code?: unknown; state?: unknown; verifier?: unknown }) {
  if (typeof input.code !== 'string' || typeof input.state !== 'string' || typeof input.verifier !== 'string' || input.code.length > 100 || input.verifier.length > 100) throw new AppError('UNAUTHORIZED', 'Invalid preview code');
  const [row] = await tx.select().from(t.sitePreviewCodes).where(eq(t.sitePreviewCodes.codeHash, sha256(input.code))).for('update');
  if (!row || row.usedAt || row.expiresAt <= new Date() || row.state !== input.state || row.challenge !== challengeOf(input.verifier)) throw new AppError('UNAUTHORIZED', 'Invalid preview code');
  await tx.update(t.sitePreviewCodes).set({ usedAt: new Date() }).where(eq(t.sitePreviewCodes.id, row.id));
  if (!(await previewReader(tx, row.userId, row.brandId, row.versionId))) throw new AppError('UNAUTHORIZED', 'Invalid preview code');
  const token = newToken(32), now = new Date();
  await tx.insert(t.sitePreviewSessions).values({ id: randomUUID(), tokenHash: sha256(token), workspaceId: row.workspaceId, brandId: row.brandId, siteId: row.siteId, versionId: row.versionId, userId: row.userId, expiresAt: new Date(now.getTime() + 30 * 60_000), createdAt: now });
  return { token, siteId: row.siteId, versionId: row.versionId, brandId: row.brandId };
}
/** Every preview request: a live preview session for this version and a permission that still holds. */
export async function previewAccess(tx: Transaction, token: unknown, versionId: string) {
  if (typeof token !== 'string' || token.length > 100) return null;
  const [s] = await tx.select().from(t.sitePreviewSessions).where(eq(t.sitePreviewSessions.tokenHash, sha256(token)));
  if (!s || s.expiresAt <= new Date() || s.versionId !== versionId) return null;
  return previewReader(tx, s.userId, s.brandId, s.versionId);
}
