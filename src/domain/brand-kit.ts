import { AppError, validate } from './contracts.js';

/**
 * ADR-0034 · brand kit, the single identity model. Pure rules: normalization of a version's content, the certainty
 * rule (a value becomes CONFIRMED only through an explicit human adoption), WCAG contrast of the pairs actually used,
 * and what each channel the brand uses still needs. Files and persistence live in the application layer.
 */
export type Certainty = 'DECLARED' | 'ESTIMATED' | 'PROPOSED' | 'CONFIRMED';
export type Channel = 'SOCIAL' | 'WEBSITE' | 'ADS' | 'PRESENTATION' | 'PRINT' | 'CANVA';
type Origin = { kind: 'DOCUMENT' | 'IMAGE' | 'PERSON' | 'BRANDO' | 'DESIGNER'; assetId: string | null; page: number | null; note: string };
export type KitContent = {
  channels: Channel[];
  logos: { id: string; variant: string; assetId: string; fingerprint: string; minWidthPx: number | null; usage: string; certainty: Certainty; origin: Origin }[];
  palette: { id: string; name: string; hex: string; role: 'PRIMARY' | 'ACCENT' | 'BACKGROUND' | 'TEXT' | 'SUPPORT'; reference: string; certainty: Certainty; origin: Origin }[];
  typography: { id: string; family: string; use: string; weights: number[]; source: string; webEmbedding: string; documentEmbedding: string; alternatives: { channel: Channel; family: string; reviewed: boolean }[]; certainty: Certainty; origin: Origin }[];
  pairs: { text: string; background: string; use: string }[];
  style: { photography: string; illustration: string; icons: string; composition: string; do: string[]; dont: string[] };
  verbal: { tone: string; messages: string[]; examples: string[] };
  rights: 'UNKNOWN' | 'DECLARED_OWNED' | 'LICENSED';
};

export const emptyKit = (): KitContent => ({ channels: [], logos: [], palette: [], typography: [], pairs: [], style: { photography: '', illustration: '', icons: '', composition: '', do: [], dont: [] }, verbal: { tone: '', messages: [], examples: [] }, rights: 'UNKNOWN' });

const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const list = (v: unknown) => (Array.isArray(v) ? v.map(text).filter(Boolean) : []);
const arr = (v: unknown) => (Array.isArray(v) ? v as Record<string, unknown>[] : []);
const origin = (v: unknown): Origin => { const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>; return { kind: o.kind as Origin['kind'] ?? 'PERSON', assetId: text(o.assetId) || null, page: Number.isInteger(o.page) ? o.page as number : null, note: text(o.note) }; };

export function normalizeKit(input: unknown): KitContent {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new AppError('INVALID', 'Invalid brand kit');
  const r = input as Record<string, unknown>, style = (r.style ?? {}) as Record<string, unknown>, verbal = (r.verbal ?? {}) as Record<string, unknown>;
  const content: KitContent = {
    channels: [...new Set(list(r.channels))] as Channel[],
    logos: arr(r.logos).map(l => ({ id: text(l.id), variant: l.variant as string, assetId: text(l.assetId), fingerprint: text(l.fingerprint), minWidthPx: Number.isInteger(l.minWidthPx) ? l.minWidthPx as number : null, usage: text(l.usage), certainty: l.certainty as Certainty, origin: origin(l.origin) })),
    palette: arr(r.palette).map(c => ({ id: text(c.id), name: text(c.name), hex: text(c.hex).toUpperCase(), role: c.role as KitContent['palette'][number]['role'], reference: text(c.reference), certainty: c.certainty as Certainty, origin: origin(c.origin) })),
    typography: arr(r.typography).map(f => ({ id: text(f.id), family: text(f.family), use: f.use as string, weights: Array.isArray(f.weights) ? [...new Set(f.weights as number[])].sort((a, b) => a - b) : [], source: text(f.source), webEmbedding: (f.webEmbedding as string) ?? 'UNKNOWN', documentEmbedding: (f.documentEmbedding as string) ?? 'UNKNOWN', alternatives: arr(f.alternatives).map(a => ({ channel: a.channel as Channel, family: text(a.family), reviewed: a.reviewed === true })), certainty: f.certainty as Certainty, origin: origin(f.origin) })),
    pairs: arr(r.pairs).map(p => ({ text: text(p.text), background: text(p.background), use: text(p.use) })),
    style: { photography: text(style.photography), illustration: text(style.illustration), icons: text(style.icons), composition: text(style.composition), do: list(style.do), dont: list(style.dont) },
    verbal: { tone: text(verbal.tone), messages: list(verbal.messages), examples: list(verbal.examples) },
    rights: (r.rights as KitContent['rights']) ?? 'UNKNOWN'
  };
  validate('brand-kit-version', content);
  const ids = [...content.logos, ...content.palette, ...content.typography].map(v => v.id);
  if (new Set(ids).size !== ids.length) throw new AppError('INVALID', 'Every kit value needs its own id');
  const colors = new Set(content.palette.map(c => c.id));
  if (content.pairs.some(p => !colors.has(p.text) || !colors.has(p.background))) throw new AppError('INVALID', 'A pair must use colors of this kit');
  return content;
}

// Stored content comes back from jsonb with its keys reordered, so values are compared with sorted keys.
const stable = (v: unknown): unknown => (Array.isArray(v) ? v.map(stable) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, stable((v as Record<string, unknown>)[k])])) : v);
const stableJson = (v: unknown) => JSON.stringify(stable(v));

/**
 * IDN-003 · nothing becomes CONFIRMED without a person adopting it: a saved draft may only keep CONFIRMED on values that
 * were already CONFIRMED with the same content; adoption is a separate, explicit command.
 */
export function assertNoSilentConfirmation(previous: KitContent, next: KitContent) {
  const key = (v: Record<string, unknown>) => stableJson({ ...v, certainty: undefined });
  const before = new Map([...previous.logos, ...previous.palette, ...previous.typography].map(v => [v.id, v as Record<string, unknown>]));
  for (const v of [...next.logos, ...next.palette, ...next.typography] as Record<string, unknown>[]) {
    if (v.certainty !== 'CONFIRMED') continue;
    const old = before.get(v.id as string);
    if (!old || old.certainty !== 'CONFIRMED' || key(old) !== key(v)) throw new AppError('INVALID', 'Only an explicit adoption can confirm a value');
  }
}

export const CORRECTED_NOTE = 'Corregido por una persona';
/**
 * ONB-007 · provenance is decided here, not by the client: a value whose content a person changed is attributed to
 * that person (the earlier file and page stay as a reference) and a new value can only claim a person as its origin.
 * Certainty is untouched, so a correction is never a confirmation (adoption stays a separate command).
 */
export function attributeCorrections(previous: KitContent, next: KitContent): KitContent {
  const before = new Map([...previous.logos, ...previous.palette, ...previous.typography].map(v => [v.id, v as Record<string, unknown> & { origin: Origin }]));
  const body = (v: Record<string, unknown>) => stableJson({ ...v, certainty: undefined, origin: undefined });
  const fix = <T extends { id: string; origin: Origin }>(v: T): T => {
    const old = before.get(v.id);
    if (!old) return v.origin.kind === 'PERSON' && !v.origin.assetId ? v : { ...v, origin: { kind: 'PERSON', assetId: null, page: null, note: '' } };
    if (body(old) === body(v as unknown as Record<string, unknown>)) return { ...v, origin: old.origin };
    return { ...v, origin: old.origin.kind === 'PERSON' ? old.origin : { kind: 'PERSON', assetId: old.origin.assetId, page: old.origin.page, note: CORRECTED_NOTE } };
  };
  return { ...next, logos: next.logos.map(fix), palette: next.palette.map(fix), typography: next.typography.map(fix) };
}

/** Adopts values by id: they become CONFIRMED (a person with authority over this brand does it). */
export function adoptValues(content: KitContent, ids: readonly string[]): KitContent {
  const wanted = new Set(ids);
  const known = new Set([...content.logos, ...content.palette, ...content.typography].map(v => v.id));
  if (!ids.length || ids.some(id => !known.has(id))) throw new AppError('INVALID', 'Unknown kit value');
  const adopt = <T extends { id: string; certainty: Certainty }>(v: T): T => (wanted.has(v.id) ? { ...v, certainty: 'CONFIRMED' } : v);
  return { ...content, logos: content.logos.map(adopt), palette: content.palette.map(adopt), typography: content.typography.map(adopt) };
}

/** WCAG 2.x relative luminance and contrast ratio of two #RRGGBB colors. */
export function contrastRatio(a: string, b: string) {
  const lum = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return Math.round(((x + 0.05) / (y + 0.05)) * 100) / 100;
}

/** Each pair actually used, measured one by one (never a claim about the whole identity). */
export function pairContrast(content: KitContent) {
  const color = new Map(content.palette.map(c => [c.id, c]));
  return content.pairs.map(p => {
    const ratio = contrastRatio(color.get(p.text)!.hex, color.get(p.background)!.hex);
    return { ...p, ratio, normalText: ratio >= 4.5 ? 'AA' : 'FAILS', largeText: ratio >= 3 ? 'AA' : 'FAILS' };
  });
}

/** What the channels this brand uses still need from the kit (guidance; ADR-0034 «requisitos por canal»). */
export function channelGaps(content: KitContent) {
  const gaps: { channel: Channel | 'ALL'; need: string }[] = [];
  const has = (role: string) => content.palette.some(c => c.role === role);
  if (!content.palette.length) gaps.push({ channel: 'ALL', need: 'PALETTE' });
  if (!content.verbal.tone) gaps.push({ channel: 'ALL', need: 'TONE' });
  for (const ch of content.channels) {
    if (['SOCIAL', 'WEBSITE', 'PRESENTATION', 'PRINT', 'CANVA'].includes(ch) && !content.logos.some(l => l.variant === 'PRIMARY')) gaps.push({ channel: ch, need: 'PRIMARY_LOGO' });
    if (ch === 'WEBSITE') {
      if (!content.logos.some(l => l.variant === 'FAVICON' || l.variant === 'SYMBOL')) gaps.push({ channel: ch, need: 'FAVICON' });
      if (!content.typography.some(f => f.webEmbedding === 'ALLOWED' || f.alternatives.some(a => a.channel === 'WEBSITE' && a.reviewed))) gaps.push({ channel: ch, need: 'WEB_FONT' });
      if (!content.pairs.length) gaps.push({ channel: ch, need: 'CONTRAST_PAIRS' });
    }
    if (ch === 'PRESENTATION' && !content.typography.some(f => f.documentEmbedding === 'ALLOWED' || f.alternatives.some(a => a.channel === 'PRESENTATION' && a.reviewed))) gaps.push({ channel: ch, need: 'DOCUMENT_FONT' });
    if (ch === 'SOCIAL' && !has('PRIMARY')) gaps.push({ channel: ch, need: 'PRIMARY_COLOR' });
  }
  return gaps;
}

/** «Quiero completarla»: differences between two versions, value by value, so nothing approved changes silently. */
export function kitDiff(before: KitContent, after: KitContent) {
  const index = (c: KitContent) => new Map([...c.logos, ...c.palette, ...c.typography].map(v => [v.id, JSON.stringify(v)]));
  const a = index(before), b = index(after);
  return {
    added: [...b.keys()].filter(id => !a.has(id)),
    removed: [...a.keys()].filter(id => !b.has(id)),
    changed: [...b.keys()].filter(id => a.has(id) && a.get(id) !== b.get(id))
  };
}

/**
 * «Ya tengo identidad» · candidates written in a brand document, with file and page (DECLARED, never CONFIRMED):
 * hexadecimal or RGB colors (with a nearby Pantone reference when present) and typefaces named after a label such as
 * «Tipografía», «Fuente» or «Typeface». A person reviews, corrects and adopts them; nothing is adopted here.
 */
export function kitCandidatesFromText(pages: readonly { index: number; text: string }[], assetId: string) {
  const palette: KitContent['palette'] = [], typography: KitContent['typography'] = [];
  const seenHex = new Set<string>(), seenFont = new Set<string>();
  const hexOf = (r: number, g: number, b: number) => `#${[r, g, b].map(n => Math.min(255, n).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
  for (const page of pages) {
    const textOf = page.text.replace(/\s+/g, ' ');
    const colors: { hex: string; at: number }[] = [];
    for (const m of textOf.matchAll(/#([0-9a-fA-F]{6})\b/g)) colors.push({ hex: `#${m[1].toUpperCase()}`, at: m.index! });
    for (const m of textOf.matchAll(/\bRGB\s*:?\s*\(?\s*(\d{1,3})\s*[,/ ]\s*(\d{1,3})\s*[,/ ]\s*(\d{1,3})/gi)) colors.push({ hex: hexOf(+m[1], +m[2], +m[3]), at: m.index! });
    colors.sort((x, y) => x.at - y.at);
    // A Pantone reference belongs to the closest color only, never across another color mention.
    const owner = new Map<number, string>();
    for (const ref of textOf.matchAll(/Pantone\s+[\w-]+(?:\s+[CU])?\b/gi)) {
      const closest = colors.reduce<{ at: number } | null>((best, c) => (best === null || Math.abs(c.at - ref.index!) < Math.abs(best.at - ref.index!) ? c : best), null);
      if (closest && Math.abs(closest.at - ref.index!) <= 80 && !owner.has(closest.at)) owner.set(closest.at, ref[0]);
    }
    for (const { hex, at } of colors) {
      if (seenHex.has(hex)) continue;
      seenHex.add(hex);
      const pantone = owner.get(at) ?? '';
      palette.push({ id: `c-${palette.length + 1}`, name: `Color ${palette.length + 1}`, hex, role: 'SUPPORT', reference: pantone.slice(0, 80), certainty: 'DECLARED', origin: { kind: 'DOCUMENT', assetId, page: page.index, note: '' } });
    }
    for (const m of textOf.matchAll(/\b(?:Tipograf[ií]a|Fuente|Typeface|Font)\s*(?:principal|secundaria|primary|secondary)?\s*:?\s+([A-Z][\w-]*(?:\s+[A-Z][\w-]*){0,2})/g)) {
      const family = m[1].trim();
      if (seenFont.has(family.toLowerCase()) || family.length > 80) continue;
      seenFont.add(family.toLowerCase());
      typography.push({ id: `f-${typography.length + 1}`, family, use: typography.length ? 'BODY' : 'HEADINGS', weights: [], source: '', webEmbedding: 'UNKNOWN', documentEmbedding: 'UNKNOWN', alternatives: [], certainty: 'DECLARED', origin: { kind: 'DOCUMENT', assetId, page: page.index, note: '' } });
    }
  }
  return { palette: palette.slice(0, 16), typography: typography.slice(0, 8) };
}
