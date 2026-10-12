import { AppError, validate } from './contracts.js';

/**
 * ADR-0030 / PHASE4_SPEC §4.4 · five deliverable types with typed content. Pure rules: normalization (trim, defaults,
 * lists) validated against deliverable-version v1, and the «what is still missing» guidance per type.
 */
export type DeliverableType = 'SALES_PRESENTATION' | 'OFFER_COPY' | 'SOCIAL_POST' | 'AD' | 'DESIGN_BRIEF';
export const DELIVERABLE_TYPES: readonly DeliverableType[] = ['SALES_PRESENTATION', 'OFFER_COPY', 'SOCIAL_POST', 'AD', 'DESIGN_BRIEF'];
export type FinalArt = { fileId: string; name: string; format: string; bytes: number; sha256: string; source: 'UPLOAD' | 'CANVA'; attachedAt: string };
export type DeliverableContent = { type: DeliverableType; name: string; offerId: string | null; sourceDecisionVersionIds: string[]; body: Record<string, unknown>; finalArt?: FinalArt };

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

/**
 * PHASE4_SPEC §13 · one base piece adapted per network. The rules are checked when the draft is saved and shown while
 * typing; choosing networks never authorizes publishing (a person publishes outside Brandopolis and records it).
 */
export const NETWORK_RULES: Record<string, { maxText: number; maxHashtags: number; formats: readonly string[] }> = {
  INSTAGRAM: { maxText: 2200, maxHashtags: 30, formats: ['POST', 'CAROUSEL', 'REEL', 'STORY', 'VIDEO'] },
  FACEBOOK: { maxText: 3000, maxHashtags: 30, formats: ['POST', 'CAROUSEL', 'REEL', 'STORY', 'VIDEO'] },
  LINKEDIN: { maxText: 3000, maxHashtags: 30, formats: ['POST', 'CAROUSEL', 'VIDEO', 'ARTICLE'] },
  TIKTOK: { maxText: 2200, maxHashtags: 30, formats: ['VIDEO', 'CAROUSEL'] },
  X: { maxText: 280, maxHashtags: 10, formats: ['POST', 'VIDEO'] },
  OTHER: { maxText: 3000, maxHashtags: 30, formats: ['POST', 'CAROUSEL', 'REEL', 'STORY', 'VIDEO', 'ARTICLE'] }
};
export type VariantIssue = 'TEXT_TOO_LONG' | 'TOO_MANY_HASHTAGS' | 'FORMAT_NOT_AVAILABLE' | 'EMPTY_TEXT';
/** Problems of one network variant (empty when it is ready). Hashtags count toward the text as they are published. */
export function variantIssues(v: { network: string; format: string; text: string; hashtags: string[] }): VariantIssue[] {
  const rule = NETWORK_RULES[v.network] ?? NETWORK_RULES.OTHER, issues: VariantIssue[] = [];
  const published = [v.text, v.hashtags.join(' ')].filter(Boolean).join('\n\n');
  if (!v.text) issues.push('EMPTY_TEXT');
  if (published.length > rule.maxText) issues.push('TEXT_TOO_LONG');
  if (v.hashtags.length > rule.maxHashtags) issues.push('TOO_MANY_HASHTAGS');
  if (!rule.formats.includes(v.format)) issues.push('FORMAT_NOT_AVAILABLE');
  return issues;
}
const list = (value: unknown) => (Array.isArray(value) ? value.map(text).filter(Boolean) : []);
const dateOrNull = (value: unknown) => text(value) || null;

function normalizeBody(type: DeliverableType, raw: Record<string, unknown>): Record<string, unknown> {
  switch (type) {
    case 'SALES_PRESENTATION':
      return { audience: text(raw.audience), slides: (Array.isArray(raw.slides) ? raw.slides : []).map(s => ({ title: text((s as Record<string, unknown>)?.title), text: text((s as Record<string, unknown>)?.text) })).filter(s => s.title || s.text) };
    case 'OFFER_COPY':
      return { headline: text(raw.headline), short: text(raw.short), long: text(raw.long), callToAction: text(raw.callToAction) };
    case 'SOCIAL_POST':
      return { network: raw.network, format: raw.format, objective: text(raw.objective), scheduledDate: dateOrNull(raw.scheduledDate), text: text(raw.text), hashtags: list(raw.hashtags).map(h => (h.startsWith('#') ? h : `#${h}`)), materials: text(raw.materials), ...(Array.isArray(raw.variants) ? { variants: raw.variants.map(v => { const x = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>; return { network: x.network, format: x.format, text: text(x.text), hashtags: list(x.hashtags).map(h => (h.startsWith('#') ? h : `#${h}`)) }; }) } : {}) };
    case 'AD':
      return { channel: raw.channel, objective: raw.objective, headlines: list(raw.headlines), descriptions: list(raw.descriptions), callToAction: text(raw.callToAction), landingUrl: text(raw.landingUrl) || null };
    case 'DESIGN_BRIEF':
      // A retrieved Canva design (CNV-001) is kept as given by the server; the schema validates its shape.
      return { for: raw.for, piece: text(raw.piece), format: text(raw.format), audience: text(raw.audience), message: text(raw.message), mustInclude: text(raw.mustInclude), avoid: text(raw.avoid), dueDate: dateOrNull(raw.dueDate), ...(raw.design && typeof raw.design === 'object' ? { design: raw.design } : {}) };
  }
}

export function normalizeDeliverable(input: unknown): DeliverableContent {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new AppError('INVALID', 'Invalid deliverable');
  const raw = input as Record<string, unknown>;
  if (!DELIVERABLE_TYPES.includes(raw.type as DeliverableType)) throw new AppError('INVALID', 'Unknown deliverable type');
  const type = raw.type as DeliverableType;
  const body = raw.body && typeof raw.body === 'object' && !Array.isArray(raw.body) ? raw.body as Record<string, unknown> : {};
  const content: DeliverableContent = { type, name: text(raw.name), offerId: text(raw.offerId) || null, sourceDecisionVersionIds: [...new Set(list(raw.sourceDecisionVersionIds))], body: normalizeBody(type, body) };
  validate('deliverable-version', content);
  if (type === 'SOCIAL_POST' && Array.isArray(content.body.variants)) {
    const variants = content.body.variants as { network: string; format: string; text: string; hashtags: string[] }[];
    const networks = variants.map(v => v.network);
    if (new Set(networks).size !== networks.length || networks.includes(content.body.network as string)) throw new AppError('INVALID', 'Each network appears once (the base piece already covers its own network)');
    const bad = variants.find(v => variantIssues(v).some(i => i !== 'EMPTY_TEXT'));
    if (bad) throw new AppError('INVALID', `The ${bad.network} variant does not fit that network: ${variantIssues(bad).join(', ')}`);
  }
  return content;
}

/** Guidance only (never blocks a draft): what would make this piece usable. */
export function deliverableGaps(c: DeliverableContent): string[] {
  const b = c.body as Record<string, unknown>, gaps: string[] = [];
  const empty = (k: string) => !b[k] || (Array.isArray(b[k]) && !(b[k] as unknown[]).length);
  if (c.type === 'SALES_PRESENTATION') { if (empty('audience')) gaps.push('AUDIENCE'); if ((b.slides as unknown[]).length < 3) gaps.push('SLIDES'); }
  if (c.type === 'OFFER_COPY') { if (empty('headline')) gaps.push('HEADLINE'); if (empty('short')) gaps.push('SHORT'); if (empty('callToAction')) gaps.push('CALL_TO_ACTION'); }
  if (c.type === 'SOCIAL_POST') { if (empty('text')) gaps.push('TEXT'); if (empty('scheduledDate')) gaps.push('DATE'); if (empty('objective')) gaps.push('OBJECTIVE'); }
  if (c.type === 'AD') { if ((b.headlines as unknown[]).length < 3) gaps.push('HEADLINES'); if (empty('descriptions')) gaps.push('DESCRIPTIONS'); if (empty('landingUrl')) gaps.push('LANDING'); }
  if (c.type === 'DESIGN_BRIEF') { if (empty('message')) gaps.push('MESSAGE'); if (empty('format')) gaps.push('FORMAT'); }
  if (!c.offerId && !c.sourceDecisionVersionIds.length) gaps.push('ORIGIN');
  return gaps;
}
