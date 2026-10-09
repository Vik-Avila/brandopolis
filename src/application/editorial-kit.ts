/**
 * Shared editorial language of the two exports (ADR-0028): palette, type roles and the few composed blocks
 * (section opener, labelled field, standing tag, note) both documents use, so they read as one family.
 *
 * The Brandopolis credit uses the canonical premium symbol from the immutable Brand Master. The path is a
 * constant, never derived from user input or brand data.
 */
import { readFileSync } from 'node:fs';
import { EditorialPdf, PAGE, measure, type Rgb } from './pdf-editorial.js';

export const INK: Rgb = [0.13, 0.15, 0.14];
export const MUTED: Rgb = [0.40, 0.43, 0.41];
export const SOFT: Rgb = [0.55, 0.57, 0.55];
export const EMERALD: Rgb = [0.027, 0.239, 0.176];
export const EMERALD_TINT: Rgb = [0.929, 0.957, 0.937];
export const CHAMPAGNE: Rgb = [0.69, 0.57, 0.36];
export const CHAMPAGNE_TINT: Rgb = [0.984, 0.961, 0.914];
export const PAPER: Rgb = [0.984, 0.973, 0.949];
export const LINE: Rgb = [0.86, 0.83, 0.77];

const SYMBOL_PATH = 'design/brandopolis-ui/brand-master/final-canonical-2026-09-25/03_premium/brandopolis-symbol-premium-512.png';
let symbol: Buffer | null | undefined;
/** The canonical premium symbol, or null if the Brand Master file is unavailable (the credit falls back to text). */
export function brandopolisSymbol(): Buffer | null {
  if (symbol === undefined) { try { symbol = readFileSync(SYMBOL_PATH); } catch { symbol = null; } }
  return symbol;
}

/** Standing of a piece of content. Shown as a small tag so a reader always knows what kind of claim it is. */
export type Standing = 'APROBADO' | 'OBSERVACIÓN DOCUMENTADA' | 'APRENDIZAJE ACEPTADO' | 'HIPÓTESIS' | 'DECLARADO' | 'NO DOCUMENTADO' | 'EN REVISIÓN';
const STANDING_COLOUR: Record<Standing, [Rgb, Rgb]> = {
  APROBADO: [EMERALD, EMERALD_TINT], 'APRENDIZAJE ACEPTADO': [EMERALD, EMERALD_TINT],
  'OBSERVACIÓN DOCUMENTADA': [[0.20, 0.30, 0.42], [0.925, 0.945, 0.965]], DECLARADO: [MUTED, [0.95, 0.94, 0.92]],
  HIPÓTESIS: [[0.55, 0.40, 0.12], CHAMPAGNE_TINT], 'EN REVISIÓN': [[0.55, 0.40, 0.12], CHAMPAGNE_TINT], 'NO DOCUMENTADO': [SOFT, [0.95, 0.94, 0.92]]
};

/** Accent of a document: the Mapa uses Brandopolis emerald; the Brand Book stays neutral (it is the brand's document). */
export type Accent = { main: Rgb; tint: Rgb; rule: Rgb };
export const BRANDOPOLIS_ACCENT: Accent = { main: EMERALD, tint: EMERALD_TINT, rule: CHAMPAGNE };
export const NEUTRAL_ACCENT: Accent = { main: [0.16, 0.17, 0.17], tint: [0.955, 0.948, 0.933], rule: [0.62, 0.60, 0.56] };

export class Composer {
  constructor(readonly pdf: EditorialPdf, readonly accent: Accent = BRANDOPOLIS_ACCENT) {}
  get left() { return this.pdf.margin.left; }
  get width() { return this.pdf.contentWidth; }

  /** Chapter opener: eyebrow, serif title, a short champagne rule. Starts a new page when asked. */
  chapter(title: string, { eyebrow, page = false, bookmark = true, intro }: { eyebrow?: string; page?: boolean; bookmark?: boolean; intro?: string } = {}) {
    const pdf = this.pdf;
    if (page || !pdf.pages.length) pdf.newPage(); else { pdf.ensure(130); if (pdf.y > pdf.margin.top) pdf.y += 18; }
    if (bookmark) pdf.bookmark(title);
    const start = pdf.index;
    if (eyebrow) pdf.text(eyebrow.toUpperCase(), { size: 8, face: 'sansBold', color: this.accent.rule, after: 2 });
    pdf.text(title, { size: 24, face: 'serif', color: this.accent.main, leading: 28, after: 8 });
    pdf.rule(this.left, pdf.y, this.left + 36, pdf.y, { color: this.accent.rule, line: 1.4 });
    pdf.y += 14;
    if (intro) pdf.text(intro, { size: 10, color: MUTED, after: 12 });
    return start;
  }
  /** Section heading inside a chapter, kept with at least a few lines of what follows. */
  section(title: string, keep = 70) {
    this.pdf.ensure(keep);
    this.pdf.y += 6;
    this.pdf.text(title, { size: 13.5, face: 'serifBold', color: INK, after: 4 });
  }
  label(value: string, color: Rgb = MUTED) { this.pdf.text(value.toUpperCase(), { size: 7.5, face: 'sansBold', color, after: 2 }); }
  body(value: string, opts: { size?: number; color?: Rgb; after?: number; x?: number; width?: number; face?: 'sans' | 'serif' | 'serifItalic' | 'sansItalic' } = {}) {
    this.pdf.text(value, { size: opts.size ?? 10.5, color: opts.color ?? INK, after: opts.after ?? 6, x: opts.x, width: opts.width, face: opts.face ?? 'sans' });
  }
  note(value: string) { this.pdf.text(value, { size: 8.5, color: MUTED, after: 6 }); }
  /** A standing tag drawn inline at the cursor's left edge, followed by the text it qualifies. */
  tag(standing: Standing, x = this.left) {
    const pdf = this.pdf, [fg, bg] = STANDING_COLOUR[standing], w = measure(standing, 6.5, 'sansBold') + 12;
    pdf.ensure(20);
    pdf.rect(x, pdf.y + 2, w, 12, { fill: bg });
    pdf.textAt(x + 6, pdf.y + 10.6, standing, { size: 6.5, face: 'sansBold', color: fg });
    pdf.y += 17;
  }
  /** Labelled field: small caps label and value. */
  field(label: string, value: string, opts: { x?: number; width?: number; size?: number } = {}) {
    this.pdf.ensure(34);
    this.pdf.text(label.toUpperCase(), { size: 7.5, face: 'sansBold', color: MUTED, after: 1, x: opts.x, width: opts.width });
    this.pdf.text(value, { size: opts.size ?? 11, color: INK, after: 9, x: opts.x, width: opts.width });
  }
  /** A paragraph inside a soft box with an accent edge; breaks across pages like normal text if it must. */
  callout(value: string, { color = this.accent.main, fill = this.accent.tint, size = 11, face = 'serifItalic' as 'serifItalic' | 'sans' | 'serif' } = {}) {
    const pdf = this.pdf, pad = 10, w = this.width - pad * 2 - 3, h = pdf.height(value, { size, face, width: w }) + pad * 2;
    if (h < pdf.bottom - pdf.margin.top) pdf.ensure(h + 6);
    const top = pdf.y, page = pdf.index;
    if (h < pdf.remaining()) { pdf.rect(this.left, top, this.width, h, { fill }); pdf.rect(this.left, top, 3, h, { fill: color }); }
    pdf.y += pad;
    pdf.text(value, { size, face, color: INK, x: this.left + pad + 3, width: w, after: 0 });
    pdf.y = pdf.index === page ? Math.max(pdf.y + pad, top + h) + 8 : pdf.y + pad + 8;
  }
  /** Brandopolis credit: premium symbol (or a text mark) plus a line. */
  credit(x: number, y: number, line: string, page?: number, size = 22) {
    const pdf = this.pdf, png = brandopolisSymbol();
    if (png) pdf.image('brandopolis-symbol', png, x, y, size, size, page);
    pdf.textAt(x + (png ? size + 8 : 0), y + size / 2 + 3, line, { size: 8.5, face: 'sansBold', color: EMERALD, page });
  }
}

/** Full-bleed warm paper background for a cover page. */
export function paperBackground(pdf: EditorialPdf, page: number, fill: Rgb = PAPER) {
  pdf.rect(0, 0, PAGE.width, PAGE.height, { fill, page });
}
