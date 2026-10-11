/**
 * ADR-0032 · multi-page sites as structured content. Pure rules: a closed, typed catalogue of sections (no HTML, CSS
 * or JavaScript from people or from the AI), normalisation with limits, the pre-publication check, the measurement
 * fingerprint and the measurement status rules. Rendering lives in site-render.ts; persistence in the application.
 */
import { createHash, randomBytes } from 'node:crypto';
import { AppError } from './contracts.js';
import { canonicalJson } from './editorial-versions.js';

export const SITE_GOALS = ['LEADS', 'SELL', 'INFORM', 'EVENT'] as const;
export type SiteGoal = typeof SITE_GOALS[number];
export const SECTION_TYPES = ['HERO', 'TEXT', 'OFFERS', 'IMAGE', 'CTA', 'CONTACT', 'FAQ'] as const;
export type SectionType = typeof SECTION_TYPES[number];
export const LIMITS = { pages: 12, sections: 20, title: 120, short: 300, body: 4000, items: 12, slug: 60 } as const;

export type OfferItem = { offerId: string; offerVersionId: string; name: string; description: string };
export type Section =
  | { id: string; type: 'HERO'; title: string; subtitle: string; ctaLabel: string; ctaTarget: string; imageAssetId: string | null; imageAlt: string }
  | { id: string; type: 'TEXT'; heading: string; body: string }
  | { id: string; type: 'OFFERS'; heading: string; items: OfferItem[] }
  | { id: string; type: 'IMAGE'; assetId: string; alt: string; caption: string }
  | { id: string; type: 'CTA'; heading: string; text: string; label: string; target: string }
  | { id: string; type: 'CONTACT'; heading: string; text: string }
  | { id: string; type: 'FAQ'; heading: string; items: { question: string; answer: string }[] };
export type Page = { id: string; slug: string; title: string; description: string; sections: Section[] };
export type Measurement = { provider: 'NONE' } | { provider: 'GOOGLE' | 'META'; propertyId: string; event: string; template: string };
export type Consent = { required: boolean; noticeVersion: string | null };
export type SiteContent = { goal: SiteGoal; name: string; pages: Page[]; navigation: string[]; kitVersionId: string | null; measurement: Measurement; consent: Consent };
export type SectionSource = { kind: 'OFFER' | 'DECISION' | 'KIT' | 'BRAND' | 'PERSON'; label: string };

const text = (v: unknown, max: number, what: string) => {
  const s = typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim() : '';
  if (s.length > max) throw new AppError('INVALID', `${what} too long`);
  return s;
};
const id = (v: unknown, prefix: string) => (typeof v === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(v) ? v : `${prefix}-${randomBytes(5).toString('hex')}`);
const ref = (v: unknown) => (typeof v === 'string' && /^[A-Za-z0-9-]{1,80}$/.test(v) ? v : null);
/** A link target: another page of the site («page:<id>»), the contact section («#contacto») or an https URL. */
export function linkTarget(v: unknown) {
  const s = typeof v === 'string' ? v.trim() : '';
  if (!s) return '';
  if (/^page:[A-Za-z0-9_-]{1,40}$/.test(s) || s === '#contacto') return s;
  if (/^https:\/\/[^\s"'<>]{3,300}$/.test(s)) { try { new URL(s); return s; } catch { /* invalid */ } }
  throw new AppError('INVALID', 'Links go to a page of the site, the contact form or an https:// address');
}
export function slugify(v: string) {
  return v.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, LIMITS.slug);
}

function section(raw: unknown): Section {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const sid = id(r.id, 's');
  switch (r.type) {
    case 'HERO': return { id: sid, type: 'HERO', title: text(r.title, LIMITS.title, 'Title'), subtitle: text(r.subtitle, LIMITS.short, 'Subtitle'), ctaLabel: text(r.ctaLabel, 60, 'Button'), ctaTarget: linkTarget(r.ctaTarget), imageAssetId: ref(r.imageAssetId), imageAlt: text(r.imageAlt, LIMITS.short, 'Image description') };
    case 'TEXT': return { id: sid, type: 'TEXT', heading: text(r.heading, LIMITS.title, 'Heading'), body: text(r.body, LIMITS.body, 'Text') };
    case 'OFFERS': {
      const items = (Array.isArray(r.items) ? r.items : []).slice(0, LIMITS.items).map(i => { const o = (i ?? {}) as Record<string, unknown>; const offerId = ref(o.offerId), offerVersionId = ref(o.offerVersionId); if (!offerId || !offerVersionId) throw new AppError('INVALID', 'Offer reference required'); return { offerId, offerVersionId, name: text(o.name, LIMITS.title, 'Offer name'), description: text(o.description, LIMITS.body, 'Offer description') }; });
      return { id: sid, type: 'OFFERS', heading: text(r.heading, LIMITS.title, 'Heading'), items };
    }
    case 'IMAGE': { const assetId = ref(r.assetId); if (!assetId) throw new AppError('INVALID', 'Image required'); return { id: sid, type: 'IMAGE', assetId, alt: text(r.alt, LIMITS.short, 'Image description'), caption: text(r.caption, LIMITS.short, 'Caption') }; }
    case 'CTA': return { id: sid, type: 'CTA', heading: text(r.heading, LIMITS.title, 'Heading'), text: text(r.text, LIMITS.short, 'Text'), label: text(r.label, 60, 'Button'), target: linkTarget(r.target) };
    case 'CONTACT': return { id: sid, type: 'CONTACT', heading: text(r.heading, LIMITS.title, 'Heading'), text: text(r.text, LIMITS.short, 'Text') };
    case 'FAQ': return { id: sid, type: 'FAQ', heading: text(r.heading, LIMITS.title, 'Heading'), items: (Array.isArray(r.items) ? r.items : []).slice(0, LIMITS.items).map(i => { const o = (i ?? {}) as Record<string, unknown>; return { question: text(o.question, LIMITS.short, 'Question'), answer: text(o.answer, LIMITS.body, 'Answer') }; }).filter(i => i.question || i.answer) };
    default: throw new AppError('INVALID', 'Unknown section type');
  }
}

/** Normalises a site version's content. Only catalogue sections survive; everything is text with limits. */
export function normalizeSite(raw: unknown): SiteContent {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new AppError('INVALID', 'Invalid site');
  const r = raw as Record<string, unknown>;
  if (!SITE_GOALS.includes(r.goal as SiteGoal)) throw new AppError('INVALID', 'Unknown site goal');
  const rawPages = Array.isArray(r.pages) ? r.pages : [];
  if (rawPages.length > LIMITS.pages) throw new AppError('INVALID', 'Too many pages');
  const pages: Page[] = rawPages.map((p, i) => {
    const o = (p ?? {}) as Record<string, unknown>;
    const sections = Array.isArray(o.sections) ? o.sections : [];
    if (sections.length > LIMITS.sections) throw new AppError('INVALID', 'Too many sections in a page');
    const title = text(o.title, LIMITS.title, 'Page title');
    return { id: id(o.id, 'p'), slug: i === 0 ? '' : slugify(text(o.slug, LIMITS.slug, 'Address') || title) || `pagina-${i + 1}`, title, description: text(o.description, 160, 'Page description'), sections: sections.map(section) };
  });
  const slugs = pages.map(p => p.slug);
  if (new Set(slugs).size !== slugs.length) throw new AppError('INVALID', 'Two pages share the same address');
  const ids = new Set(pages.map(p => p.id));
  const navigation = (Array.isArray(r.navigation) ? r.navigation : pages.map(p => p.id)).filter((n): n is string => typeof n === 'string' && ids.has(n));
  const m = (r.measurement ?? { provider: 'NONE' }) as Record<string, unknown>;
  const measurement: Measurement = m.provider === 'GOOGLE' || m.provider === 'META'
    ? { provider: m.provider, propertyId: text(m.propertyId, 40, 'Property'), event: text(m.event, 60, 'Event'), template: text(m.template, 20, 'Template') }
    : { provider: 'NONE' };
  const c = (r.consent ?? {}) as Record<string, unknown>;
  return { goal: r.goal as SiteGoal, name: text(r.name, LIMITS.title, 'Site name'), pages, navigation: [...new Set(navigation)], kitVersionId: ref(r.kitVersionId), measurement, consent: { required: c.required === true, noticeVersion: typeof c.noticeVersion === 'string' ? text(c.noticeVersion, 40, 'Notice') || null : null } };
}

export const siteFingerprint = (c: SiteContent) => createHash('sha256').update(canonicalJson(c)).digest('hex');
/**
 * ADR-0032 «Vigencia de la medición»: only what matters for measuring (measurement and consent configuration and the
 * page and form that are measured). A purely visual change keeps it; changing any of these produces another.
 */
export function measurementFingerprint(c: SiteContent) {
  const formPages = c.pages.filter(p => p.sections.some(s => s.type === 'CONTACT')).map(p => ({ id: p.id, slug: p.slug }));
  return createHash('sha256').update(canonicalJson({ measurement: c.measurement, consent: c.consent, formPages })).digest('hex');
}
export type MeasurementState = 'NOT_CONNECTED' | 'PENDING_VERIFICATION' | 'VERIFIED' | 'NEEDS_REVERIFICATION' | 'LOST';
/**
 * Status of a measurement binding for the live publication: same fingerprint as the verified one → still VERIFIED
 * (a compatibility record links them); different → NEEDS_REVERIFICATION; the live version has no measurement →
 * NOT_CONNECTED; lost connection → LOST. Never fabricates a verification.
 */
export function measurementStatus(binding: { verifiedFingerprint: string | null; connectionLost: boolean } | null, live: SiteContent | null): { state: MeasurementState; compatible: boolean } {
  if (!live || live.measurement.provider === 'NONE') return { state: 'NOT_CONNECTED', compatible: false };
  if (!binding) return { state: 'NOT_CONNECTED', compatible: false };
  if (binding.connectionLost) return { state: 'LOST', compatible: false };
  if (!binding.verifiedFingerprint) return { state: 'PENDING_VERIFICATION', compatible: false };
  return binding.verifiedFingerprint === measurementFingerprint(live) ? { state: 'VERIFIED', compatible: true } : { state: 'NEEDS_REVERIFICATION', compatible: false };
}

export type PreflightIssue = { code: string; message: string; pageId?: string; sectionId?: string };
/**
 * Blocking pre-publication check (ADR-0032): titles and descriptions, image descriptions and existing images, links
 * that resolve, a destination for the contact form, contrast of the pairs used, and the kit's website requirements.
 */
export function preflight(c: SiteContent, context: { images: Set<string>; formReady: boolean; contrastOk: boolean; kitWebsiteGaps: string[]; outdated: string[] }): PreflightIssue[] {
  const issues: PreflightIssue[] = [];
  const pageIds = new Set(c.pages.map(p => p.id));
  if (!c.pages.length) issues.push({ code: 'NO_PAGES', message: 'El sitio todavía no tiene páginas.' });
  const target = (t: string, pageId: string, sectionId: string) => { if (t.startsWith('page:') && !pageIds.has(t.slice(5))) issues.push({ code: 'BROKEN_LINK', message: 'Un botón lleva a una página que ya no existe.', pageId, sectionId }); if (t === '#contacto' && !c.pages.some(p => p.sections.some(s => s.type === 'CONTACT'))) issues.push({ code: 'BROKEN_LINK', message: 'Un botón lleva al formulario de contacto, pero el sitio no tiene uno.', pageId, sectionId }); };
  for (const p of c.pages) {
    if (!p.title) issues.push({ code: 'PAGE_TITLE', message: 'Falta el título de una página.', pageId: p.id });
    if (!p.description) issues.push({ code: 'PAGE_DESCRIPTION', message: `Falta la descripción para buscadores de «${p.title || 'una página'}».`, pageId: p.id });
    if (!p.sections.length) issues.push({ code: 'EMPTY_PAGE', message: `La página «${p.title || 'sin título'}» no tiene contenido.`, pageId: p.id });
    for (const s of p.sections) {
      if (s.type === 'HERO') { if (!s.title) issues.push({ code: 'EMPTY_SECTION', message: 'La portada necesita un título.', pageId: p.id, sectionId: s.id }); if (s.ctaLabel && !s.ctaTarget) issues.push({ code: 'BROKEN_LINK', message: 'El botón de la portada no tiene destino.', pageId: p.id, sectionId: s.id }); if (s.ctaTarget) target(s.ctaTarget, p.id, s.id); if (s.imageAssetId) { if (!context.images.has(s.imageAssetId)) issues.push({ code: 'IMAGE_MISSING', message: 'Una imagen ya no está disponible o no es válida.', pageId: p.id, sectionId: s.id }); if (!s.imageAlt) issues.push({ code: 'IMAGE_ALT', message: 'Describe la imagen de la portada para quien no puede verla.', pageId: p.id, sectionId: s.id }); } }
      if (s.type === 'TEXT' && !s.body) issues.push({ code: 'EMPTY_SECTION', message: 'Hay un bloque de texto vacío.', pageId: p.id, sectionId: s.id });
      if (s.type === 'OFFERS' && !s.items.length) issues.push({ code: 'EMPTY_SECTION', message: 'La lista de ofertas está vacía.', pageId: p.id, sectionId: s.id });
      if (s.type === 'IMAGE') { if (!context.images.has(s.assetId)) issues.push({ code: 'IMAGE_MISSING', message: 'Una imagen ya no está disponible o no es válida.', pageId: p.id, sectionId: s.id }); if (!s.alt) issues.push({ code: 'IMAGE_ALT', message: 'Describe la imagen para quien no puede verla.', pageId: p.id, sectionId: s.id }); }
      if (s.type === 'CTA') { if (!s.label || !s.target) issues.push({ code: 'BROKEN_LINK', message: 'Una llamada a la acción no tiene botón o destino.', pageId: p.id, sectionId: s.id }); else target(s.target, p.id, s.id); }
      if (s.type === 'CONTACT' && !context.formReady) issues.push({ code: 'FORM_DESTINATION', message: 'El formulario necesita un destino: se crea al publicar con permiso de publicar.', pageId: p.id, sectionId: s.id });
      if (s.type === 'FAQ' && !s.items.length) issues.push({ code: 'EMPTY_SECTION', message: 'Las preguntas frecuentes están vacías.', pageId: p.id, sectionId: s.id });
    }
  }
  if (!context.contrastOk) issues.push({ code: 'CONTRAST', message: 'El color del texto y el del fondo del kit no tienen contraste suficiente.' });
  for (const gap of context.kitWebsiteGaps) issues.push({ code: 'KIT_WEBSITE', message: gap });
  for (const o of context.outdated) issues.push({ code: 'OUTDATED', message: o });
  return issues;
}

export const SITE_SLUG = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/;
export const DOMAIN = /^(?=.{4,253}$)(?!-)(?:[a-z0-9-]{1,63}\.)+[a-z]{2,63}$/;
export const newToken = (bytes = 24) => randomBytes(bytes).toString('base64url');
export const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');
/** PKCE-style challenge of a preview verifier (base64url SHA-256). */
export const challengeOf = (verifier: string) => createHash('sha256').update(verifier).digest('base64url');
