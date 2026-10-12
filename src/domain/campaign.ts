/**
 * Block 8 · ADR-0031 coverage for Google Ads (Search with responsive search ads) and Meta Ads (traffic). Pure rules:
 * structured campaign content with limits, the pre-authorization check, the confirmation summary shown before a
 * human authorizes creation in a paused state, and the budget wording. Nothing here talks to a provider.
 */
import { createHash } from 'node:crypto';
import { AppError } from './contracts.js';
import { canonicalJson } from './editorial-versions.js';

export const CAMPAIGN_PROVIDERS = ['GOOGLE_ADS', 'META_ADS'] as const;
export type CampaignProvider = typeof CAMPAIGN_PROVIDERS[number];
export const CURRENCIES = ['MXN', 'USD', 'EUR', 'COP', 'ARS', 'CLP', 'PEN'] as const;
export const MATCH_TYPES = ['BROAD', 'PHRASE', 'EXACT'] as const;
export const CAMPAIGN_TIMEZONE = 'America/Mexico_City';
export const LIMITS = { headline: 30, description: 90, headlines: 15, descriptions: 4, keywords: 50, keyword: 80, primaryText: 500, metaHeadline: 40, geo: 10 } as const;

export type CampaignContent = {
  provider: CampaignProvider;
  name: string;
  objective: 'SEARCH' | 'TRAFFIC';
  offer: { offerId: string; offerVersionId: string; name: string } | null;
  destination: { kind: 'SITE'; siteId: string; url: string } | { kind: 'URL'; url: string } | null;
  adDeliverable: { deliverableId: string; versionId: string } | null;
  search: { keywords: { text: string; match: typeof MATCH_TYPES[number] }[]; headlines: string[]; descriptions: string[] } | null;
  social: { primaryText: string; headline: string; imageAssetId: string | null; imageAlt: string } | null;
  audience: { geo: string[]; language: 'es'; ageMin: number | null; ageMax: number | null };
  budget: { type: 'DAILY' | 'TOTAL'; amount: string; currency: typeof CURRENCIES[number] };
  schedule: { startDate: string; endDate: string | null; timezone: string };
};

const text = (v: unknown, max: number, what: string) => {
  const s = typeof v === 'string' ? v.replace(/[\u0000-\u001F\u007F]/g, ' ').trim() : '';
  if (s.length > max) throw new AppError('INVALID', `${what} too long`);
  return s;
};
const ref = (v: unknown) => (typeof v === 'string' && /^[A-Za-z0-9-]{1,80}$/.test(v) ? v : null);
const list = (v: unknown, n: number, max: number, what: string) => (Array.isArray(v) ? v : []).slice(0, n).map(x => text(x, max, what)).filter(Boolean);
const date = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`)) ? v : '');
/** An amount with at most two decimals, as text (never a float): «150», «150.5», «150.50». */
export const amount = (v: unknown) => { const s = typeof v === 'number' ? String(v) : typeof v === 'string' ? v.trim().replace(',', '.') : ''; return /^\d{1,9}(\.\d{1,2})?$/.test(s) ? s : ''; };
export const minorUnits = (a: string) => { const [i, d = ''] = a.split('.'); return Number(i) * 100 + Number((d + '00').slice(0, 2)); };
export const httpsUrl = (v: unknown) => { const s = typeof v === 'string' ? v.trim() : ''; if (!s) return ''; if (!/^https:\/\/[^\s"'<>]{3,300}$/.test(s)) throw new AppError('INVALID', 'The destination must be an https:// address'); try { new URL(s); } catch { throw new AppError('INVALID', 'The destination must be an https:// address'); } return s; };

/** Normalises a campaign version's content for its provider. Only the fields that provider supports survive. */
export function normalizeCampaign(raw: unknown, provider: CampaignProvider): CampaignContent {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new AppError('INVALID', 'Invalid campaign');
  const r = raw as Record<string, unknown>;
  const o = (r.offer ?? null) as Record<string, unknown> | null, d = (r.destination ?? null) as Record<string, unknown> | null;
  const offer = o && ref(o.offerId) && ref(o.offerVersionId) ? { offerId: ref(o.offerId)!, offerVersionId: ref(o.offerVersionId)!, name: text(o.name, 120, 'Offer') } : null;
  let destination: CampaignContent['destination'] = null;
  if (d?.kind === 'SITE' && ref(d.siteId)) destination = { kind: 'SITE', siteId: ref(d.siteId)!, url: text(d.url, 300, 'Destination') };
  else if (d?.kind === 'URL' && d.url) destination = { kind: 'URL', url: httpsUrl(d.url) };
  const ad = (r.adDeliverable ?? null) as Record<string, unknown> | null;
  const s = (r.search ?? {}) as Record<string, unknown>, so = (r.social ?? {}) as Record<string, unknown>, a = (r.audience ?? {}) as Record<string, unknown>;
  const b = (r.budget ?? {}) as Record<string, unknown>, sc = (r.schedule ?? {}) as Record<string, unknown>;
  const age = (v: unknown) => (Number.isInteger(v) && (v as number) >= 18 && (v as number) <= 65 ? v as number : null);
  const google = provider === 'GOOGLE_ADS';
  return {
    provider, name: text(r.name, 120, 'Campaign name'), objective: google ? 'SEARCH' : 'TRAFFIC', offer, destination,
    adDeliverable: ad && ref(ad.deliverableId) && ref(ad.versionId) ? { deliverableId: ref(ad.deliverableId)!, versionId: ref(ad.versionId)! } : null,
    search: google ? {
      keywords: (Array.isArray(s.keywords) ? s.keywords : []).slice(0, LIMITS.keywords).map(k => { const x = (k ?? {}) as Record<string, unknown>; return { text: text(x.text, LIMITS.keyword, 'Keyword'), match: (MATCH_TYPES as readonly string[]).includes(String(x.match)) ? x.match as typeof MATCH_TYPES[number] : 'PHRASE' }; }).filter(k => k.text),
      headlines: list(s.headlines, LIMITS.headlines, 200, 'Headline'), descriptions: list(s.descriptions, LIMITS.descriptions, 300, 'Description'),
    } : null,
    social: google ? null : { primaryText: text(so.primaryText, LIMITS.primaryText, 'Text'), headline: text(so.headline, 120, 'Headline'), imageAssetId: ref(so.imageAssetId), imageAlt: text(so.imageAlt, 300, 'Image description') },
    audience: { geo: list(a.geo, LIMITS.geo, 80, 'Location'), language: 'es', ageMin: google ? null : age(a.ageMin), ageMax: google ? null : age(a.ageMax) },
    budget: { type: google ? 'DAILY' : b.type === 'TOTAL' ? 'TOTAL' : 'DAILY', amount: amount(b.amount), currency: (CURRENCIES as readonly string[]).includes(String(b.currency)) ? b.currency as typeof CURRENCIES[number] : 'MXN' },
    schedule: { startDate: date(sc.startDate), endDate: date(sc.endDate) || null, timezone: CAMPAIGN_TIMEZONE },
  };
}
export const campaignFingerprint = (c: CampaignContent) => createHash('sha256').update(canonicalJson(c)).digest('hex');

export type CampaignIssue = { code: string; message: string };
/**
 * Blocking check before an authorization can be requested (notices: OUTDATED). Headlines and descriptions follow the
 * provider limits; a traffic campaign never becomes a lead campaign here (that needs verified measurement, ADR-0032).
 */
export function campaignChecks(c: CampaignContent, ctx: { today: string; offerApproved: boolean; destinationLive: boolean; imageValid: boolean; outdated: string[] }): CampaignIssue[] {
  const out: CampaignIssue[] = [];
  if (!c.name) out.push({ code: 'NAME', message: 'Ponle nombre a la campaña.' });
  if (!c.offer) out.push({ code: 'OFFER', message: 'Elige la oferta aprobada que anuncia.' });
  else if (!ctx.offerApproved) out.push({ code: 'OFFER', message: 'La oferta elegida ya no está aprobada o activa.' });
  if (!c.destination) out.push({ code: 'DESTINATION', message: 'Elige a dónde llega quien hace clic: tu sitio publicado o una dirección https.' });
  else if (c.destination.kind === 'SITE' && !ctx.destinationLive) out.push({ code: 'DESTINATION', message: 'El sitio de destino no tiene una versión publicada.' });
  if (c.search) {
    if (c.search.headlines.length < 3) out.push({ code: 'HEADLINES', message: 'Google pide al menos 3 títulos.' });
    if (c.search.headlines.some(h => h.length > LIMITS.headline)) out.push({ code: 'HEADLINES', message: `Cada título tiene como máximo ${LIMITS.headline} caracteres.` });
    if (c.search.descriptions.length < 2) out.push({ code: 'DESCRIPTIONS', message: 'Google pide al menos 2 descripciones.' });
    if (c.search.descriptions.some(h => h.length > LIMITS.description)) out.push({ code: 'DESCRIPTIONS', message: `Cada descripción tiene como máximo ${LIMITS.description} caracteres.` });
    if (!c.search.keywords.length) out.push({ code: 'KEYWORDS', message: 'Añade al menos una palabra clave.' });
  }
  if (c.social) {
    if (!c.social.primaryText) out.push({ code: 'TEXT', message: 'Escribe el texto principal del anuncio.' });
    if (!c.social.headline || c.social.headline.length > LIMITS.metaHeadline) out.push({ code: 'HEADLINE', message: `El titular es obligatorio y tiene como máximo ${LIMITS.metaHeadline} caracteres.` });
    if (!c.social.imageAssetId || !ctx.imageValid) out.push({ code: 'IMAGE', message: 'Elige una imagen válida del kit de marca.' });
    else if (!c.social.imageAlt) out.push({ code: 'IMAGE', message: 'Describe la imagen para quien no puede verla.' });
    if (c.audience.ageMin && c.audience.ageMax && c.audience.ageMin > c.audience.ageMax) out.push({ code: 'AUDIENCE', message: 'La edad mínima es mayor que la máxima.' });
  }
  if (!c.audience.geo.length) out.push({ code: 'GEO', message: 'Indica al menos una ubicación.' });
  if (!c.budget.amount || minorUnits(c.budget.amount) <= 0) out.push({ code: 'BUDGET', message: 'Indica un presupuesto mayor que cero.' });
  if (!c.schedule.startDate) out.push({ code: 'DATES', message: 'Indica la fecha de inicio.' });
  else if (c.schedule.startDate < ctx.today) out.push({ code: 'DATES', message: 'La fecha de inicio ya pasó.' });
  if (c.schedule.endDate && c.schedule.startDate && c.schedule.endDate < c.schedule.startDate) out.push({ code: 'DATES', message: 'La fecha de fin es anterior a la de inicio.' });
  if (c.budget.type === 'TOTAL' && !c.schedule.endDate) out.push({ code: 'DATES', message: 'Un presupuesto total necesita fecha de fin.' });
  for (const o of ctx.outdated) out.push({ code: 'OUTDATED', message: o });
  return out;
}
export const NON_BLOCKING_CAMPAIGN = new Set(['OUTDATED']);

/** What the provider may spend under this budget, said plainly (a daily budget is an average, never a total cap). */
export function budgetRule(c: CampaignContent) {
  return c.budget.type === 'DAILY'
    ? `Presupuesto diario promedio de ${c.budget.amount} ${c.budget.currency}. El proveedor puede gastar más un día concreto y compensarlo otros días; no es un tope total.`
    : `Presupuesto total de ${c.budget.amount} ${c.budget.currency} entre ${c.schedule.startDate} y ${c.schedule.endDate}.`;
}
/** Planned amount of a version in minor units over its dates (daily × days, or the total). Null without an end date. */
export function plannedMinor(c: CampaignContent): number | null {
  if (!c.budget.amount) return null;
  if (c.budget.type === 'TOTAL') return minorUnits(c.budget.amount);
  if (!c.schedule.endDate || !c.schedule.startDate) return null;
  const days = Math.round((Date.parse(`${c.schedule.endDate}T00:00:00Z`) - Date.parse(`${c.schedule.startDate}T00:00:00Z`)) / 86400000) + 1;
  return days > 0 ? minorUnits(c.budget.amount) * days : null;
}
