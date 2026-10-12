import { randomBytes, randomUUID } from 'node:crypto';
import { and, asc, desc, eq, inArray, isNull } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { AppError } from '../domain/contracts.js';
import { approve, contentFingerprint, editorialTransition, type EditorialStatus } from '../domain/editorial-versions.js';
import { budgetRule, campaignChecks, campaignFingerprint, CAMPAIGN_PROVIDERS, NON_BLOCKING_CAMPAIGN, minorUnits, normalizeCampaign, plannedMinor, type CampaignContent, type CampaignProvider } from '../domain/campaign.js';
import { slugify } from '../domain/site.js';
import { today } from '../domain/clients.js';
import { MAX_IMAGE_PIXELS } from './pdf-brand.js';
import { brandopolisHost, siteConfig } from './site-config.js';
import type { Transaction } from '../persistence/database.js';
import * as t from '../persistence/schema.js';
import type { BrandActor } from './brand-access.js';

/**
 * Block 8 · campaigns (ADR-0031). Preparing a proposal, approving a version, requesting the provider operation,
 * confirming its result and activating spend are separate acts: this module covers the editorial part and the read
 * model; the authorization, queue, worker and reconciliation are ExternalOperations. Creation reaches only the
 * paused state; activation is not offered in this phase. Brando proposes and never writes.
 */
type Scoped = { workspaceId: string; brandId: string };
const byBrand = (table: { workspaceId: AnyPgColumn; brandId: AnyPgColumn }, a: Scoped) => and(eq(table.workspaceId, a.workspaceId), eq(table.brandId, a.brandId));
const key = (v: unknown) => { if (typeof v !== 'string' || !v.trim() || v.length > 200) throw new AppError('INVALID', 'Invalid idempotency key'); return v; };
const idOf = (v: unknown, what: string) => { if (typeof v !== 'string' || !v || v.length > 200) throw new AppError('INVALID', `${what} required`); return v; };
export const SIMULATED_SCOPE = 'SIMULATED';

async function lockCampaign(tx: Transaction, a: Scoped, id: unknown, expected?: unknown) {
  const [row] = await tx.select().from(t.campaigns).where(and(byBrand(t.campaigns, a), eq(t.campaigns.id, idOf(id, 'Campaign')))).for('update');
  if (!row) throw new AppError('NOT_FOUND', 'Campaign not available');
  if (expected !== undefined && expected !== row.revision) throw new AppError('CONFLICT', 'This campaign changed; reload to see the current version');
  return row;
}
const touch = (tx: Transaction, id: string, values: Partial<typeof t.campaigns.$inferInsert>) => tx.update(t.campaigns).set({ ...values, updatedAt: new Date() }).where(eq(t.campaigns.id, id));

// ─── What a campaign may use (all of this brand, all approved) ──────────────────────────────────────────────────────
async function approvedOffers(tx: Transaction, a: Scoped) {
  const offers = await tx.select().from(t.offers).where(and(byBrand(t.offers, a), eq(t.offers.status, 'ACTIVE')));
  const ids = offers.map(o => o.approvedVersionId).filter((x): x is string => !!x);
  const versions = ids.length ? await tx.select().from(t.offerVersions).where(and(byBrand(t.offerVersions, a), inArray(t.offerVersions.id, ids))) : [];
  return offers.filter(o => o.approvedVersionId).map(o => { const v = versions.find(x => x.id === o.approvedVersionId)!; const c = v.content as { name: string; need?: string; outcome?: string }; return { offerId: o.id, offerVersionId: v.id, sequence: v.sequence, name: c.name, need: c.need ?? '', outcome: c.outcome ?? '' }; });
}
/** Sites with a live publication, with the address the campaign would send visitors to. */
async function liveSites(tx: Transaction, a: Scoped) {
  const sites = await tx.select().from(t.sites).where(and(byBrand(t.sites, a), eq(t.sites.status, 'ACTIVE')));
  return sites.filter(s => s.publishedVersionId).map(s => ({ siteId: s.id, name: s.name, publishedVersionId: s.publishedVersionId!, url: `${siteConfig().publicScheme}://${brandopolisHost(s.slug)}/` }));
}
/** Approved «Anuncio» deliverables whose headlines and descriptions a campaign may take. */
async function approvedAds(tx: Transaction, a: Scoped) {
  const rows = await tx.select().from(t.deliverables).where(and(byBrand(t.deliverables, a), eq(t.deliverables.type, 'AD')));
  const ids = rows.map(r => r.approvedVersionId).filter((x): x is string => !!x);
  const versions = ids.length ? await tx.select().from(t.deliverableVersions).where(and(byBrand(t.deliverableVersions, a), inArray(t.deliverableVersions.id, ids))) : [];
  return versions.map(v => { const c = v.content as { name: string; offerId: string | null; body: { headlines?: string[]; descriptions?: string[]; landingUrl?: string | null } }; return { deliverableId: v.deliverableId, versionId: v.id, sequence: v.sequence, name: c.name, offerId: c.offerId, headlines: c.body.headlines ?? [], descriptions: c.body.descriptions ?? [], landingUrl: c.body.landingUrl ?? null }; });
}
async function kitImages(tx: Transaction, a: Scoped) {
  const rows = await tx.select().from(t.kitAssets).where(byBrand(t.kitAssets, a)).orderBy(asc(t.kitAssets.createdAt));
  return rows.filter(r => ['LOGO', 'REFERENCE', 'DESIGNER_DELIVERY'].includes(r.role) && ['PNG', 'JPEG'].includes(r.format) && r.width && r.height && r.width * r.height <= MAX_IMAGE_PIXELS).map(r => ({ id: r.id, originalName: r.originalName, width: r.width!, height: r.height! }));
}
/** Every reference must be this brand's: approved offer version, live site, approved ad version, valid kit image. */
async function checkReferences(tx: Transaction, a: Scoped, c: CampaignContent) {
  // Only versions that a person approved (current or superseded) can be cited; a draft or rejected version never.
  const wasApproved = (status: string) => status === 'APPROVED' || status === 'SUPERSEDED';
  if (c.offer) { const [v] = await tx.select({ offerId: t.offerVersions.offerId, status: t.offerVersions.status }).from(t.offerVersions).where(and(byBrand(t.offerVersions, a), eq(t.offerVersions.id, c.offer.offerVersionId))); if (!v || v.offerId !== c.offer.offerId) throw new AppError('INVALID', 'Unknown offer for this brand'); if (!wasApproved(v.status)) throw new AppError('INVALID', 'Only an approved version of the offer can be cited'); }
  if (c.destination?.kind === 'SITE') { const [s] = await tx.select({ id: t.sites.id }).from(t.sites).where(and(byBrand(t.sites, a), eq(t.sites.id, c.destination.siteId))); if (!s) throw new AppError('INVALID', 'Unknown site for this brand'); }
  if (c.adDeliverable) { const [v] = await tx.select({ deliverableId: t.deliverableVersions.deliverableId, status: t.deliverableVersions.status }).from(t.deliverableVersions).where(and(byBrand(t.deliverableVersions, a), eq(t.deliverableVersions.id, c.adDeliverable.versionId))); if (!v || v.deliverableId !== c.adDeliverable.deliverableId) throw new AppError('INVALID', 'Unknown ad for this brand'); if (!wasApproved(v.status)) throw new AppError('INVALID', 'Only an approved version of the ad can be cited'); }
  if (c.social?.imageAssetId && !(await kitImages(tx, a)).some(i => i.id === c.social!.imageAssetId)) throw new AppError('INVALID', 'This image is not a valid image of the brand kit');
}
/** Destination address resolved on the server (a live site's address is never taken from the browser). */
async function resolveDestination(tx: Transaction, a: Scoped, c: CampaignContent): Promise<CampaignContent> {
  if (c.destination?.kind !== 'SITE') return c;
  const site = (await liveSites(tx, a)).find(s => s.siteId === (c.destination as { siteId: string }).siteId);
  return { ...c, destination: { kind: 'SITE', siteId: c.destination.siteId, url: site?.url ?? '' } };
}
const manifestOf = (c: CampaignContent, siteVersionId: string | null) => ({ offerVersionId: c.offer?.offerVersionId ?? null, siteVersionId, adVersionId: c.adDeliverable?.versionId ?? null, imageAssetId: c.social?.imageAssetId ?? null });

/** What changed since a version was made (notices; nothing changes by itself). */
async function outdated(tx: Transaction, a: Scoped, c: CampaignContent, manifest: Record<string, unknown>) {
  const out: string[] = [];
  if (c.offer) { const now = (await approvedOffers(tx, a)).find(o => o.offerId === c.offer!.offerId); if (!now) out.push(`La oferta «${c.offer.name}» ya no está aprobada o activa.`); else if (now.offerVersionId !== c.offer.offerVersionId) out.push(`La oferta «${c.offer.name}» tiene una versión aprobada más reciente: crea una versión nueva de la campaña para usarla.`); }
  if (c.adDeliverable) { const [d] = await tx.select({ approvedVersionId: t.deliverables.approvedVersionId }).from(t.deliverables).where(and(byBrand(t.deliverables, a), eq(t.deliverables.id, c.adDeliverable.deliverableId))); if (d && d.approvedVersionId !== c.adDeliverable.versionId) out.push('El anuncio del que salieron los textos tiene otra versión aprobada.'); }
  if (c.destination?.kind === 'SITE' && manifest.siteVersionId) { const site = (await liveSites(tx, a)).find(s => s.siteId === (c.destination as { siteId: string }).siteId); if (site && site.publishedVersionId !== manifest.siteVersionId) out.push('El sitio de destino publicó otra versión desde que se preparó la campaña; revisa que la página siga siendo la adecuada.'); }
  return out;
}
async function checksFor(tx: Transaction, a: Scoped, c: CampaignContent, manifest: Record<string, unknown>) {
  const offerApproved = !!c.offer && (await approvedOffers(tx, a)).some(o => o.offerId === c.offer!.offerId);
  const destinationLive = c.destination?.kind !== 'SITE' || (await liveSites(tx, a)).some(s => s.siteId === (c.destination as { siteId: string }).siteId);
  const imageValid = !c.social?.imageAssetId || (await kitImages(tx, a)).some(i => i.id === c.social!.imageAssetId);
  return campaignChecks(c, { today: today(new Date()), offerApproved, destinationLive, imageValid, outdated: await outdated(tx, a, c, manifest) });
}

// ─── Reading ─────────────────────────────────────────────────────────────────────────────────────────────────────
type VersionRow = typeof t.campaignVersions.$inferSelect;
const versionView = (v: VersionRow) => ({ id: v.id, sequence: v.sequence, status: v.status, fingerprint: v.fingerprint, content: v.content as CampaignContent, manifest: v.manifest, provenance: v.provenance, createdAt: v.createdAt.toISOString(), decidedAt: v.decidedAt?.toISOString() ?? null, decisionCriterion: v.decisionCriterion });
const STEP_WORDS: Record<string, string> = { budget: 'Presupuesto', campaign: 'Campaña', ad_group: 'Grupo de anuncios', keywords: 'Palabras clave', ad: 'Anuncio', ad_set: 'Conjunto de anuncios', creative: 'Creatividad' };

/** Connections usable by this brand: Ads accounts linked to it and the person's own Canva connection. Never secrets. */
export async function brandConnections(tx: Transaction, a: BrandActor) {
  const links = await tx.select({ id: t.connectionBrandLinks.id, connectionId: t.connectionBrandLinks.connectionId, externalAccountLabel: t.connectionBrandLinks.externalAccountLabel, provider: t.connections.provider, status: t.connections.status, scopes: t.connections.scopes })
    .from(t.connectionBrandLinks).innerJoin(t.connections, and(eq(t.connections.id, t.connectionBrandLinks.connectionId), eq(t.connections.workspaceId, t.connectionBrandLinks.workspaceId)))
    .where(and(byBrand(t.connectionBrandLinks, a), isNull(t.connectionBrandLinks.unlinkedAt)));
  const canva = await tx.select({ id: t.connections.id, status: t.connections.status, scopes: t.connections.scopes, accountLabel: t.connections.accountLabel }).from(t.connections).where(and(eq(t.connections.workspaceId, a.workspaceId), eq(t.connections.provider, 'CANVA'), eq(t.connections.ownerUserId, a.userId)));
  return {
    ads: links.map(l => ({ linkId: l.id, connectionId: l.connectionId, provider: l.provider, account: l.externalAccountLabel, status: l.status, simulated: (l.scopes as string[]).includes(SIMULATED_SCOPE) })),
    canva: canva.map(c => ({ connectionId: c.id, account: c.accountLabel, status: c.status, simulated: (c.scopes as string[]).includes(SIMULATED_SCOPE) })),
  };
}

/** Campaigns of the brand with versions, checks, operations (job, steps, attempts summary) and metrics by source. */
export async function readCampaigns(tx: Transaction, a: BrandActor) {
  const rows = await tx.select().from(t.campaigns).where(byBrand(t.campaigns, a)).orderBy(asc(t.campaigns.createdAt));
  const versions = rows.length ? await tx.select().from(t.campaignVersions).where(byBrand(t.campaignVersions, a)).orderBy(desc(t.campaignVersions.sequence)) : [];
  const jobs = rows.length ? await tx.select().from(t.externalJobs).where(and(byBrand(t.externalJobs, a), eq(t.externalJobs.subjectKind, 'CAMPAIGN'), inArray(t.externalJobs.subjectId, rows.map(r => r.id)))).orderBy(desc(t.externalJobs.createdAt)) : [];
  const steps = jobs.length ? await tx.select().from(t.externalSteps).where(inArray(t.externalSteps.jobId, jobs.map(j => j.id))).orderBy(asc(t.externalSteps.ordinal)) : [];
  const attempts = steps.length ? await tx.select().from(t.externalAttempts).where(inArray(t.externalAttempts.stepId, steps.map(s => s.id))) : [];
  const outcomes = attempts.length ? await tx.select().from(t.externalAttemptOutcomes).where(inArray(t.externalAttemptOutcomes.attemptId, attempts.map(x => x.id))).orderBy(asc(t.externalAttemptOutcomes.recordedAt)) : [];
  const auths = jobs.length ? await tx.select().from(t.operationAuthorizations).where(and(byBrand(t.operationAuthorizations, a), inArray(t.operationAuthorizations.id, jobs.map(j => j.authorizationId)))) : [];
  const metrics = rows.length ? await tx.select().from(t.campaignMetrics).where(and(byBrand(t.campaignMetrics, a), inArray(t.campaignMetrics.campaignId, rows.map(r => r.id)))).orderBy(desc(t.campaignMetrics.recordedAt)) : [];
  const out = [];
  for (const c of rows) {
    const vs = versions.filter(v => v.campaignId === c.id);
    const checked = async (v: VersionRow | undefined) => (v ? { ...versionView(v), checks: await checksFor(tx, a, v.content as CampaignContent, v.manifest) } : null);
    out.push({
      id: c.id, name: c.name, provider: c.provider, objective: c.objective, utmCampaign: c.utmCampaign, revision: c.revision,
      draft: await checked(vs.find(v => v.id === c.draftVersionId)), approved: await checked(vs.find(v => v.id === c.approvedVersionId)),
      inReview: vs.filter(v => v.status === 'IN_REVIEW').map(versionView),
      history: vs.map(v => ({ id: v.id, sequence: v.sequence, status: v.status })),
      operations: jobs.filter(j => j.subjectId === c.id).map(j => {
        const auth = auths.find(x => x.id === j.authorizationId);
        return {
          jobId: j.id, operation: j.operation, status: j.status, blockedReason: j.blockedReason, lastErrorCode: j.lastErrorCode, createdAt: j.createdAt.toISOString(), updatedAt: j.updatedAt.toISOString(),
          authorization: auth ? { id: auth.id, status: auth.status, versionId: auth.subjectVersionId, sequence: vs.find(v => v.id === auth.subjectVersionId)?.sequence ?? null, expiresAt: auth.expiresAt.toISOString(), summary: auth.summary } : null,
          steps: steps.filter(s => s.jobId === j.id).map(s => {
            const own = attempts.filter(x => x.stepId === s.id).sort((x, y) => x.attemptNumber - y.attemptNumber);
            return { key: s.stepKey, label: STEP_WORDS[s.stepKey] ?? s.stepKey, status: s.status, providerIds: s.providerIds, reference: s.remoteTag, attempts: own.map(x => ({ number: x.attemptNumber, startedAt: x.startedAt.toISOString(), outcomes: outcomes.filter(o => o.attemptId === x.id).map(o => ({ kind: o.kind, code: typeof o.evidence?.code === 'string' ? o.evidence.code : null, at: o.recordedAt.toISOString() })) })) };
          }),
        };
      }),
      metrics: metrics.filter(m => m.campaignId === c.id).slice(0, 5).map(m => ({ source: m.source, providerStatus: m.providerStatus, reviewStatus: m.reviewStatus, periodStart: m.periodStart, periodEnd: m.periodEnd, currency: m.currency, spendMinor: m.spendMinor, impressions: m.impressions, clicks: m.clicks, providerConversions: m.providerConversions, recordedAt: m.recordedAt.toISOString() })),
    });
  }
  return {
    campaigns: out, providers: CAMPAIGN_PROVIDERS,
    canAuthorize: a.capabilities.includes('AUTHORIZE_SPEND') || a.role === 'ADMIN', canManageConnections: a.capabilities.includes('MANAGE_CONNECTIONS') || a.role === 'ADMIN',
    connections: await brandConnections(tx, a),
    offers: await approvedOffers(tx, a), sites: await liveSites(tx, a), ads: await approvedAds(tx, a), images: await kitImages(tx, a),
  };
}

// ─── Editorial ───────────────────────────────────────────────────────────────────────────────────────────────────
const emptyContent = (provider: CampaignProvider, name: string): CampaignContent => normalizeCampaign({ name, budget: { type: 'DAILY', amount: '', currency: 'MXN' }, audience: { geo: ['México'] } }, provider);

export async function createCampaign(tx: Transaction, a: BrandActor, input: { provider?: unknown; name?: unknown; idempotencyKey?: unknown }) {
  const idempotencyKey = key(input.idempotencyKey);
  if (!CAMPAIGN_PROVIDERS.includes(input.provider as CampaignProvider)) throw new AppError('INVALID', 'Choose Google Ads or Meta Ads');
  const name = typeof input.name === 'string' ? input.name.trim().slice(0, 120) : '';
  if (!name) throw new AppError('INVALID', 'Name the campaign');
  const [prior] = await tx.select().from(t.campaigns).where(and(byBrand(t.campaigns, a), eq(t.campaigns.createdBy, a.userId), eq(t.campaigns.idempotencyKey, idempotencyKey)));
  if (prior) return { campaignId: prior.id, versionId: prior.draftVersionId, replayed: true };
  const provider = input.provider as CampaignProvider, now = new Date(), campaignId = randomUUID(), versionId = randomUUID();
  // Campaign reference for UTM tags: links opportunities that arrive with it (captured, unverified) to this campaign.
  const utmCampaign = `bp-${(slugify(name).slice(0, 40) || 'campana').replace(/-+$/, '')}-${randomBytes(3).toString('hex')}`;
  const content = emptyContent(provider, name);
  await tx.insert(t.campaigns).values({ id: campaignId, workspaceId: a.workspaceId, brandId: a.brandId, provider, name, objective: content.objective, utmCampaign, status: 'ACTIVE', draftVersionId: null, revision: 0, createdBy: a.userId, idempotencyKey, createdAt: now, updatedAt: now });
  await tx.insert(t.campaignVersions).values({ id: versionId, workspaceId: a.workspaceId, brandId: a.brandId, campaignId, sequence: 1, status: 'DRAFT', content, fingerprint: campaignFingerprint(content), manifest: manifestOf(content, null), provenance: 'MANUAL', createdBy: a.userId, createdAt: now });
  await touch(tx, campaignId, { draftVersionId: versionId });
  return { campaignId, versionId, replayed: false };
}

export async function saveCampaignDraft(tx: Transaction, a: BrandActor, input: { campaignId?: unknown; expectedRevision?: unknown; content?: unknown; provenance?: unknown }) {
  const c = await lockCampaign(tx, a, input.campaignId, input.expectedRevision);
  if (!c.draftVersionId) throw new AppError('CONFLICT', 'Start a new version first');
  const [draft] = await tx.select().from(t.campaignVersions).where(eq(t.campaignVersions.id, c.draftVersionId)).for('update');
  if (!draft || draft.status !== 'DRAFT') throw new AppError('CONFLICT', 'This version is no longer a draft');
  const content = await resolveDestination(tx, a, normalizeCampaign({ ...(input.content as object), name: (input.content as { name?: unknown })?.name ?? c.name }, c.provider as CampaignProvider));
  await checkReferences(tx, a, content);
  const siteVersionId = content.destination?.kind === 'SITE' ? (await liveSites(tx, a)).find(s => s.siteId === (content.destination as { siteId: string }).siteId)?.publishedVersionId ?? null : null;
  const provenance = input.provenance === 'AI_ASSISTED' || draft.provenance === 'AI_ASSISTED' ? 'AI_ASSISTED' : 'MANUAL';
  await tx.update(t.campaignVersions).set({ content, fingerprint: campaignFingerprint(content), manifest: manifestOf(content, siteVersionId), provenance }).where(eq(t.campaignVersions.id, draft.id));
  await touch(tx, c.id, { revision: c.revision + 1, name: content.name || c.name });
  return { campaignId: c.id, versionId: draft.id, revision: c.revision + 1, fingerprint: campaignFingerprint(content) };
}

/**
 * Brando's proposal for the draft from approved material (offer, live site, approved ad texts). Deterministic in DEMO;
 * every part says where it comes from. Writes nothing, queues nothing and never authorizes (BRN-001).
 */
export async function proposeCampaign(tx: Transaction, a: BrandActor, input: { campaignId?: unknown }) {
  const [c] = await tx.select().from(t.campaigns).where(and(byBrand(t.campaigns, a), eq(t.campaigns.id, idOf(input.campaignId, 'Campaign'))));
  if (!c) throw new AppError('NOT_FOUND', 'Campaign not available');
  const offers = await approvedOffers(tx, a), sites = await liveSites(tx, a), ads = await approvedAds(tx, a), images = await kitImages(tx, a);
  const ad = ads[0] ?? null, offer = (ad?.offerId && offers.find(o => o.offerId === ad.offerId)) || offers[0] || null, site = sites[0] ?? null;
  const missing: string[] = [], sources: Record<string, string> = {};
  if (!offer) missing.push('Una oferta aprobada en Productos y servicios'); else sources.offer = `Oferta «${offer.name}» versión ${offer.sequence}`;
  if (!site) missing.push('Un sitio publicado o una dirección https de destino'); else sources.destination = `Sitio «${site.name}» publicado`;
  if (!ad) missing.push('Un anuncio aprobado en Campañas digitales para tomar sus textos'); else sources.texts = `Anuncio «${ad.name}» versión ${ad.sequence}`;
  const google = c.provider === 'GOOGLE_ADS';
  if (!google && !images.length) missing.push('Una imagen válida del kit de marca');
  const words = [offer?.name, offer?.need].filter(Boolean).join(' ').toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(w => w.length > 3).slice(0, 5);
  const proposal = {
    name: c.name, offer: offer ? { offerId: offer.offerId, offerVersionId: offer.offerVersionId, name: offer.name } : null,
    destination: site ? { kind: 'SITE', siteId: site.siteId, url: site.url } : null,
    adDeliverable: ad ? { deliverableId: ad.deliverableId, versionId: ad.versionId } : null,
    search: google ? { keywords: words.map(w => ({ text: w, match: 'PHRASE' })), headlines: (ad?.headlines ?? []).slice(0, 15), descriptions: (ad?.descriptions ?? []).slice(0, 4) } : null,
    social: google ? null : { primaryText: (ad?.descriptions ?? [])[0] ?? '', headline: ((ad?.headlines ?? [])[0] ?? '').slice(0, 40), imageAssetId: images[0]?.id ?? null, imageAlt: '' },
    audience: { geo: ['México'] },
    budget: { type: 'DAILY', amount: '', currency: 'MXN' },
  };
  if (words.length) sources.keywords = 'Palabras de la oferta aprobada (revísalas: Brando no consulta volúmenes de búsqueda)';
  missing.push('Presupuesto, fechas y ubicaciones: los decides tú; Brando no propone gasto');
  return { proposal, sources, missing, provenance: 'AI_ASSISTED', mode: 'DETERMINISTIC_DEMO' };
}

export async function submitCampaign(tx: Transaction, a: BrandActor, input: { campaignId?: unknown; expectedRevision?: unknown }) {
  const c = await lockCampaign(tx, a, input.campaignId, input.expectedRevision);
  if (!c.draftVersionId) throw new AppError('CONFLICT', 'There is no draft to send for review');
  const [draft] = await tx.select().from(t.campaignVersions).where(eq(t.campaignVersions.id, c.draftVersionId)).for('update');
  editorialTransition(draft.status as EditorialStatus, 'IN_REVIEW');
  await tx.update(t.campaignVersions).set({ status: 'IN_REVIEW', submittedAt: new Date() }).where(eq(t.campaignVersions.id, draft.id));
  await touch(tx, c.id, { draftVersionId: null, revision: c.revision + 1 });
  return { campaignId: c.id, versionId: draft.id, fingerprint: draft.fingerprint };
}

/** Approve or request changes on the exact version and fingerprint, with a criterion. Approving never authorizes. */
export async function decideCampaign(tx: Transaction, a: BrandActor, input: { campaignId?: unknown; versionId?: unknown; fingerprint?: unknown; decision?: unknown; criterion?: unknown; idempotencyKey?: unknown }) {
  const idempotencyKey = key(input.idempotencyKey);
  const c = await lockCampaign(tx, a, input.campaignId);
  if (input.decision !== 'APPROVE' && input.decision !== 'REQUEST_CHANGES') throw new AppError('INVALID', 'Decision must be APPROVE or REQUEST_CHANGES');
  const criterion = typeof input.criterion === 'string' ? input.criterion.trim() : '';
  if (criterion.length < 10 || criterion.length > 2000) throw new AppError('INVALID', 'Criterion required');
  const [prior] = await tx.select().from(t.campaignApprovals).where(and(byBrand(t.campaignApprovals, a), eq(t.campaignApprovals.actorId, a.userId), eq(t.campaignApprovals.idempotencyKey, idempotencyKey)));
  if (prior) { if (prior.versionId !== input.versionId || prior.decision !== input.decision) throw new AppError('CONFLICT', 'Idempotency key already used with other content'); return { campaignId: c.id, versionId: prior.versionId, status: prior.decision === 'APPROVE' ? 'APPROVED' : 'CHANGES_REQUESTED', replayed: true }; }
  const versions = await tx.select().from(t.campaignVersions).where(eq(t.campaignVersions.campaignId, c.id)).for('update');
  const target = versions.find(v => v.id === input.versionId);
  if (!target) throw new AppError('NOT_FOUND', 'Version not available');
  if (target.fingerprint !== input.fingerprint) throw new AppError('CONFLICT', 'Content changed since it was sent for review');
  const now = new Date();
  if (input.decision === 'REQUEST_CHANGES') {
    editorialTransition(target.status as EditorialStatus, 'CHANGES_REQUESTED');
    await tx.update(t.campaignVersions).set({ status: 'CHANGES_REQUESTED', decidedBy: a.userId, decidedAt: now, decisionCriterion: criterion }).where(eq(t.campaignVersions.id, target.id));
    await tx.insert(t.campaignApprovals).values({ id: randomUUID(), workspaceId: a.workspaceId, brandId: a.brandId, campaignId: c.id, versionId: target.id, fingerprint: target.fingerprint, decision: 'REQUEST_CHANGES', criterion, actorId: a.userId, idempotencyKey, createdAt: now });
    await touch(tx, c.id, { revision: c.revision + 1 });
    return { campaignId: c.id, versionId: target.id, status: 'CHANGES_REQUESTED' };
  }
  const result = approve({ draftVersionId: c.draftVersionId, approvedVersionId: c.approvedVersionId, publishedVersionId: null }, versions.map(v => ({ id: v.id, sequence: v.sequence, status: v.status as EditorialStatus, fingerprint: v.fingerprint })), target.id, String(input.fingerprint));
  await tx.update(t.campaignVersions).set({ status: 'APPROVED', decidedBy: a.userId, decidedAt: now, decisionCriterion: criterion }).where(eq(t.campaignVersions.id, target.id));
  if (result.superseded) await tx.update(t.campaignVersions).set({ status: 'SUPERSEDED' }).where(eq(t.campaignVersions.id, result.superseded));
  await tx.insert(t.campaignApprovals).values({ id: randomUUID(), workspaceId: a.workspaceId, brandId: a.brandId, campaignId: c.id, versionId: target.id, fingerprint: target.fingerprint, decision: 'APPROVE', criterion, actorId: a.userId, supersededVersionId: result.superseded, idempotencyKey, createdAt: now });
  await touch(tx, c.id, { approvedVersionId: target.id, revision: c.revision + 1 });
  return { campaignId: c.id, versionId: target.id, status: 'APPROVED', superseded: result.superseded };
}

export async function newCampaignDraft(tx: Transaction, a: BrandActor, input: { campaignId?: unknown; expectedRevision?: unknown }) {
  const c = await lockCampaign(tx, a, input.campaignId, input.expectedRevision);
  if (c.draftVersionId) throw new AppError('CONFLICT', 'There is already a draft');
  const all = await tx.select().from(t.campaignVersions).where(eq(t.campaignVersions.campaignId, c.id)).orderBy(desc(t.campaignVersions.sequence));
  const base = all.find(v => v.id === c.approvedVersionId) ?? all[0];
  const id = randomUUID(), content = base.content as CampaignContent;
  await tx.insert(t.campaignVersions).values({ id, workspaceId: a.workspaceId, brandId: a.brandId, campaignId: c.id, sequence: all[0].sequence + 1, previousVersionId: base.id, status: 'DRAFT', content, fingerprint: base.fingerprint, manifest: base.manifest, provenance: base.provenance, createdBy: a.userId, createdAt: new Date() });
  await touch(tx, c.id, { draftVersionId: id, revision: c.revision + 1 });
  return { campaignId: c.id, versionId: id };
}

// ─── Authorization screen (built on the server) ─────────────────────────────────────────────────────────────────────
/**
 * The confirmation a person with AUTHORIZE_SPEND sees before requesting creation in a paused state: account, brand,
 * campaign and exact approved version, destination, currency, budget and its rule, dates and time zone, and whether the
 * account is simulated. Its fingerprint must be echoed back, so a stale screen can never be confirmed.
 */
export async function authorizationScreen(tx: Transaction, a: BrandActor, input: { campaignId?: unknown; linkId?: unknown }) {
  const [c] = await tx.select().from(t.campaigns).where(and(byBrand(t.campaigns, a), eq(t.campaigns.id, idOf(input.campaignId, 'Campaign'))));
  if (!c) throw new AppError('NOT_FOUND', 'Campaign not available');
  if (!c.approvedVersionId) throw new AppError('CONFLICT', 'Approve a version before requesting its creation');
  const [v] = await tx.select().from(t.campaignVersions).where(eq(t.campaignVersions.id, c.approvedVersionId));
  const content = v.content as CampaignContent;
  const blocking = (await checksFor(tx, a, content, v.manifest)).filter(i => !NON_BLOCKING_CAMPAIGN.has(i.code));
  if (blocking.length) throw new AppError('CONFLICT', `This version cannot be sent yet: ${blocking.map(i => i.message).join(' ')}`);
  const link = (await brandConnections(tx, a)).ads.find(l => l.linkId === input.linkId);
  if (!link || link.provider !== c.provider) throw new AppError('NOT_FOUND', 'Linked account not available');
  if (link.status !== 'ACTIVE') throw new AppError('CONFLICT', 'Reconnect the account before requesting an operation');
  const [brand] = await tx.select({ name: t.brands.name }).from(t.brands).where(and(eq(t.brands.workspaceId, a.workspaceId), eq(t.brands.id, a.brandId)));
  const summary = { accountLabel: link.account, destination: content.destination!.url, currency: content.budget.currency, budget: { kind: content.budget.type === 'DAILY' ? 'DAILY_AVERAGE' : 'LIFETIME_TOTAL', amountMinor: minorUnits(content.budget.amount) }, startsOn: content.schedule.startDate, endsOn: content.schedule.endDate, timeZone: content.schedule.timezone };
  const screen = { operation: 'CREATE_PAUSED', provider: c.provider, simulated: link.simulated, brand: brand?.name ?? '', campaign: c.name, campaignId: c.id, versionId: v.id, sequence: v.sequence, contentFingerprint: v.fingerprint, linkId: link.linkId, budgetRule: budgetRule(content), plannedMinor: plannedMinor(content), summary, effect: 'Se crea la campaña EN PAUSA en la cuenta indicada. No se activa ni gasta: activar es otra autorización que no está disponible en esta fase.' };
  return { ...screen, screenFingerprint: contentFingerprint(screen) };
}

// ─── Connections in DEMO (simulated accounts, visibly labelled) ──────────────────────────────────────────────────────
export const SIMULATED_ACCOUNT = { id: '123-456', label: 'Cuenta simulada (sin conexión real)' };
/** Expiry or reconnection of a simulated connection, to show what happens when access is lost (EXT-007/017). */
export async function setSimulatedConnectionStatus(tx: Transaction, a: BrandActor, input: { connectionId?: unknown; status?: unknown }) {
  if (!a.capabilities.includes('MANAGE_CONNECTIONS') && a.role !== 'ADMIN') throw new AppError('FORBIDDEN', 'Managing connections requires its capability');
  if (input.status !== 'EXPIRED' && input.status !== 'ACTIVE') throw new AppError('INVALID', 'Unknown status');
  const [c] = await tx.select().from(t.connections).where(and(eq(t.connections.workspaceId, a.workspaceId), eq(t.connections.id, idOf(input.connectionId, 'Connection'))));
  if (!c || !(c.scopes as string[]).includes(SIMULATED_SCOPE)) throw new AppError('NOT_FOUND', 'Connection not available');
  // Same rules as linking (ADR-0031): a personal connection only by its owner; an Ads connection only from a brand it is
  // linked to, and only by who connected it or an ADMIN. Otherwise indistinguishable from a missing connection.
  if (c.ownerUserId && c.ownerUserId !== a.userId) throw new AppError('NOT_FOUND', 'Connection not available');
  if (!c.ownerUserId) {
    const [link] = await tx.select({ id: t.connectionBrandLinks.id }).from(t.connectionBrandLinks).where(and(byBrand(t.connectionBrandLinks, a), eq(t.connectionBrandLinks.connectionId, c.id), isNull(t.connectionBrandLinks.unlinkedAt)));
    if (!link) throw new AppError('NOT_FOUND', 'Connection not available');
    if (a.role !== 'ADMIN' && c.connectedBy !== a.userId) throw new AppError('FORBIDDEN', 'Only who connected this account or an administrator can change it');
  }
  await tx.update(t.connections).set({ status: input.status as string, updatedAt: new Date() }).where(eq(t.connections.id, c.id));
  return { connectionId: c.id, status: input.status };
}

/** Records a status/metrics reading of a created campaign; SIMULATED rows are never provider data. */
export async function recordCampaignReading(tx: Transaction, a: Scoped, input: { campaignId: string; jobId: string; simulated: boolean; reading: { status: string; reviewStatus: string; periodStart: string; periodEnd: string; currency: string; spendMinor: number; impressions: number; clicks: number; providerConversions: number } }) {
  const r = input.reading;
  await tx.insert(t.campaignMetrics).values({ id: randomUUID(), workspaceId: a.workspaceId, brandId: a.brandId, campaignId: input.campaignId, jobId: input.jobId, source: input.simulated ? 'SIMULATED' : 'PROVIDER', providerStatus: r.status, reviewStatus: r.reviewStatus, periodStart: r.periodStart, periodEnd: r.periodEnd, currency: r.currency, spendMinor: r.spendMinor, impressions: r.impressions, clicks: r.clicks, providerConversions: r.providerConversions, recordedAt: new Date() });
}
