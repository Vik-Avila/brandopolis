/**
 * Editorial PDF engine (ADR-0028). A superset of `pdf-writer.ts` for documents that must read as designed
 * pieces, not as field dumps: A4 portrait, serif display type and sans text (the standard PDF fonts, so nothing
 * is embedded and no font licence travels with the file), vector rules and fills, PNG images with alpha, a
 * table of contents filled with real page numbers after layout, PDF bookmarks and paginated footers.
 *
 * Text stays selectable. Every string is encoded as WinAnsi through the same escaping as the existing writer,
 * so user text can never break out of a PDF string. Only local, allowlisted image files are ever read: callers
 * pass bytes they loaded themselves; this module never resolves a path or a URL taken from user content.
 */
import { inflateSync, deflateSync } from 'node:zlib';
import { textWidth, pdfString } from './pdf-writer.js';

export const PAGE = { width: 595.28, height: 841.89 };
export type Face = 'sans' | 'sansBold' | 'sansItalic' | 'serif' | 'serifBold' | 'serifItalic';
export type Rgb = [number, number, number];
const FONT_REF: Record<Face, string> = { sans: 'F1', sansBold: 'F2', sansItalic: 'F6', serif: 'F3', serifBold: 'F4', serifItalic: 'F5' };
const FONT_BASE: Record<string, string> = { F1: 'Helvetica', F2: 'Helvetica-Bold', F3: 'Times-Roman', F4: 'Times-Bold', F5: 'Times-Italic', F6: 'Helvetica-Oblique' };

/** Width in points. Serif faces use the Helvetica metrics as a conservative upper bound (Times is narrower). */
export function measure(text: string, size: number, face: Face): number {
  const bold = face === 'sansBold' || face === 'serifBold';
  const base = textWidth(text, size, bold ? 'bold' : 'regular');
  return face.startsWith('serif') ? base * 0.93 : base;
}
/** Word wrap measured with the face's metrics; long words are split rather than overflowing. */
export function wrapText(text: string, width: number, size: number, face: Face): string[] {
  const lines: string[] = [];
  for (const paragraph of String(text ?? '').replace(/\r/g, '').split('\n')) {
    let line = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (measure(candidate, size, face) <= width) { line = candidate; continue; }
      if (line) lines.push(line);
      if (measure(word, size, face) <= width) { line = word; continue; }
      let piece = '';
      for (const character of word) { if (measure(piece + character, size, face) > width && piece) { lines.push(piece); piece = ''; } piece += character; }
      line = piece;
    }
    lines.push(line);
  }
  return lines;
}

type Png = { width: number; height: number; rgb: Buffer; alpha: Buffer | null };
/** Minimal PNG decoder: 8-bit, non-interlaced, grey/RGB with or without alpha. Rejects everything else.
 *  Only trusted Brand Master files are decoded today; bounds are still checked so a malformed file fails closed. */
export function decodePng(bytes: Buffer): Png {
  if (bytes.length < 33 || bytes.readUInt32BE(0) !== 0x89504e47) throw new Error('Not a PNG');
  let offset = 8, width = 0, height = 0, depth = 0, type = 0, interlace = 0;
  const idat: Buffer[] = [];
  while (offset < bytes.length) {
    if (offset + 12 > bytes.length) throw new Error('Truncated PNG');
    const length = bytes.readUInt32BE(offset);
    if (offset + 12 + length > bytes.length) throw new Error('Truncated PNG');
    const kind = bytes.toString('latin1', offset + 4, offset + 8), data = bytes.subarray(offset + 8, offset + 8 + length);
    if (kind === 'IHDR') { width = data.readUInt32BE(0); height = data.readUInt32BE(4); depth = data[8]; type = data[9]; interlace = data[12]; }
    else if (kind === 'IDAT') idat.push(data);
    else if (kind === 'IEND') break;
    offset += 12 + length;
  }
  const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[type as 0 | 2 | 4 | 6];
  if (depth !== 8 || interlace !== 0 || !channels || width <= 0 || height <= 0 || width * height > 16_000_000) throw new Error('Unsupported PNG');
  const raw = inflateSync(Buffer.concat(idat)), stride = width * channels, out = Buffer.alloc(stride * height);
  if (raw.length < (stride + 1) * height) throw new Error('Truncated PNG data');
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)], line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)), row = y * stride;
    for (let x = 0; x < stride; x++) {
      const left = x >= channels ? out[row + x - channels] : 0, up = y ? out[row - stride + x] : 0, upLeft = y && x >= channels ? out[row - stride + x - channels] : 0;
      let value = line[x];
      if (filter === 1) value += left; else if (filter === 2) value += up; else if (filter === 3) value += (left + up) >> 1;
      else if (filter === 4) { const p = left + up - upLeft, pa = Math.abs(p - left), pb = Math.abs(p - up), pc = Math.abs(p - upLeft); value += pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft; }
      out[row + x] = value & 0xff;
    }
  }
  const pixels = width * height, rgb = Buffer.alloc(pixels * 3), alpha = channels === 2 || channels === 4 ? Buffer.alloc(pixels) : null;
  for (let i = 0; i < pixels; i++) {
    if (channels >= 3) { rgb[i * 3] = out[i * channels]; rgb[i * 3 + 1] = out[i * channels + 1]; rgb[i * 3 + 2] = out[i * channels + 2]; }
    else rgb.fill(out[i * channels], i * 3, i * 3 + 3);
    if (alpha) alpha[i] = out[i * channels + channels - 1];
  }
  return { width, height, rgb, alpha };
}

type Page = { ops: string[]; images: Set<string>; links: { rect: number[]; page: number }[] };
export type TextOptions = { size?: number; face?: Face; color?: Rgb; leading?: number; x?: number; width?: number; align?: 'left' | 'center' | 'right'; after?: number };

/** A4 portrait document laid out top-down with a flowing cursor. Coordinates are points from the top-left. */
export class EditorialPdf {
  readonly pages: Page[] = [];
  readonly outline: { title: string; page: number }[] = [];
  private images = new Map<string, Png>();
  y = 0;
  constructor(readonly margin = { top: 72, bottom: 72, left: 64, right: 64 }) {}
  get page(): Page { return this.pages[this.pages.length - 1]; }
  get index(): number { return this.pages.length - 1; }
  get contentWidth(): number { return PAGE.width - this.margin.left - this.margin.right; }
  get bottom(): number { return PAGE.height - this.margin.bottom; }
  newPage(): number { this.pages.push({ ops: [], images: new Set(), links: [] }); this.y = this.margin.top; return this.index; }
  /** Breaks the page when fewer than `height` points remain (keeps headings with their first lines). */
  ensure(height: number) { if (!this.pages.length || this.y + height > this.bottom) this.newPage(); }
  remaining(): number { return this.bottom - this.y; }
  private on(page: number | undefined) { return this.pages[page ?? this.index]; }
  private colour(c: Rgb) { return c.map(v => v.toFixed(3)).join(' '); }

  /** One line of text at an absolute position (no wrapping). */
  textAt(x: number, y: number, value: string, { size = 10, face = 'sans', color = [0.13, 0.15, 0.14] as Rgb, align = 'left' as 'left' | 'center' | 'right', page }: { size?: number; face?: Face; color?: Rgb; align?: 'left' | 'center' | 'right'; page?: number } = {}) {
    const w = measure(value, size, face), left = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
    this.on(page).ops.push(`BT /${FONT_REF[face]} ${size} Tf ${this.colour(color)} rg ${left.toFixed(2)} ${(PAGE.height - y).toFixed(2)} Td (${pdfString(value)}) Tj ET`);
  }
  /** Flowing paragraph at the cursor; breaks pages line by line, never splitting a line. */
  text(value: string, { size = 10.5, face = 'sans', color = [0.13, 0.15, 0.14], leading = 0, x, width, align = 'left', after = 6 }: TextOptions = {}) {
    if (!String(value ?? '').trim()) return;
    if (!this.pages.length) this.newPage();
    const left = x ?? this.margin.left, w = width ?? this.contentWidth - (left - this.margin.left), line = leading || size * 1.42;
    for (const row of wrapText(value, w, size, face)) {
      if (this.y + line > this.bottom) this.newPage();
      this.y += line;
      const anchor = align === 'center' ? left + w / 2 : align === 'right' ? left + w : left;
      this.textAt(anchor, this.y - line * 0.28, row, { size, face, color, align });
    }
    this.y += after;
  }
  /** Height a paragraph will need, for keep-together decisions. */
  height(value: string, { size = 10.5, face = 'sans', leading = 0, width }: TextOptions = {}) {
    return wrapText(value, width ?? this.contentWidth, size, face).length * (leading || size * 1.42);
  }
  rect(x: number, y: number, w: number, h: number, { fill, stroke, line = 0.6, page }: { fill?: Rgb; stroke?: Rgb; line?: number; page?: number } = {}) {
    const ops = [`${line} w`]; if (fill) ops.push(`${this.colour(fill)} rg`); if (stroke) ops.push(`${this.colour(stroke)} RG`);
    ops.push(`${x.toFixed(2)} ${(PAGE.height - y - h).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re ${fill && stroke ? 'B' : fill ? 'f' : 'S'}`);
    this.on(page).ops.push(ops.join(' '));
  }
  rule(x1: number, y1: number, x2: number, y2: number, { color = [0.84, 0.81, 0.75] as Rgb, line = 0.6, page }: { color?: Rgb; line?: number; page?: number } = {}) {
    this.on(page).ops.push(`${line} w ${this.colour(color)} RG ${x1.toFixed(2)} ${(PAGE.height - y1).toFixed(2)} m ${x2.toFixed(2)} ${(PAGE.height - y2).toFixed(2)} l S`);
  }
  /** Registers a PNG once (by name) and draws it; the file is embedded a single time even if used on many pages. */
  image(name: string, png: Buffer | Png, x: number, y: number, w: number, h: number, page?: number) {
    if (!this.images.has(name)) this.images.set(name, Buffer.isBuffer(png) ? decodePng(png) : png);
    const target = this.on(page); target.images.add(name);
    target.ops.push(`q ${w.toFixed(2)} 0 0 ${h.toFixed(2)} ${x.toFixed(2)} ${(PAGE.height - y - h).toFixed(2)} cm /${this.imageRef(name)} Do Q`);
  }
  imageSize(name: string, png: Buffer) { if (!this.images.has(name)) this.images.set(name, decodePng(png)); const i = this.images.get(name)!; return { width: i.width, height: i.height }; }
  private imageRef(name: string) { return `Im${[...this.images.keys()].indexOf(name) + 1}`; }
  /** Internal link (TOC entries): clicking the rectangle opens `target` page. */
  link(page: number, rect: [number, number, number, number], target: number) {
    const [x, y, w, h] = rect; this.pages[page].links.push({ rect: [x, PAGE.height - y - h, x + w, PAGE.height - y], page: target });
  }
  bookmark(title: string, page = this.index) { this.outline.push({ title, page }); }

  /** Serialises the document. `footer(page, total)` returns the footer line(s) for each page, or null. */
  build(meta: { title: string; subject?: string; created: Date; footer?: (page: number, total: number) => { left?: string; right?: string } | null }): Uint8Array {
    const total = this.pages.length;
    if (meta.footer) for (let p = 0; p < total; p++) {
      const f = meta.footer(p, total); if (!f) continue;
      const y = PAGE.height - 38;
      this.rule(this.margin.left, y - 12, PAGE.width - this.margin.right, y - 12, { page: p, line: 0.4 });
      if (f.left) this.textAt(this.margin.left, y, f.left, { size: 7.5, color: [0.42, 0.44, 0.42], page: p });
      if (f.right) this.textAt(PAGE.width - this.margin.right, y, f.right, { size: 7.5, color: [0.42, 0.44, 0.42], align: 'right', page: p });
    }
    const objects: (string | Buffer)[] = [];
    const add = (body: string | Buffer) => { objects.push(body); return objects.length; };
    const fonts = Object.entries(FONT_BASE).map(([ref, base]) => [ref, add(`<< /Type /Font /Subtype /Type1 /BaseFont /${base} /Encoding /WinAnsiEncoding >>`)] as const);
    const imageIds = new Map<string, number>();
    for (const [name, png] of this.images) {
      const smask = png.alpha ? add(stream(`<< /Type /XObject /Subtype /Image /Width ${png.width} /Height ${png.height} /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode`, deflateSync(png.alpha))) : 0;
      imageIds.set(name, add(stream(`<< /Type /XObject /Subtype /Image /Width ${png.width} /Height ${png.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode${smask ? ` /SMask ${smask} 0 R` : ''}`, deflateSync(png.rgb))));
    }
    const contentIds = this.pages.map(page => add(stream('<< /Filter /FlateDecode', deflateSync(Buffer.from(page.ops.join('\n'), 'latin1')))));
    const pagesId = objects.length + total + 1;
    const pageIds: number[] = [];
    const firstPage = objects.length + 1;
    this.pages.forEach((page, index) => {
      const xobjects = [...page.images].map(name => `/${this.imageRef(name)} ${imageIds.get(name)} 0 R`).join(' ');
      const annots = page.links.map(l => `<< /Type /Annot /Subtype /Link /Rect [${l.rect.map(v => v.toFixed(2)).join(' ')}] /Border [0 0 0] /Dest [${firstPage + l.page} 0 R /XYZ null null null] >>`).join(' ');
      pageIds.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE.width} ${PAGE.height}] /Resources << /Font << ${fonts.map(([ref, id]) => `/${ref} ${id} 0 R`).join(' ')} >>${xobjects ? ` /XObject << ${xobjects} >>` : ''} >> /Contents ${contentIds[index]} 0 R${annots ? ` /Annots [${annots}]` : ''} >>`));
    });
    const pagesObject = add(`<< /Type /Pages /Count ${total} /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] >>`);
    let outlineRef = '';
    if (this.outline.length) {
      const outlinesId = objects.length + 1 + this.outline.length;
      const first = objects.length + 1;
      this.outline.forEach((item, i) => add(`<< /Title (${pdfString(item.title)}) /Parent ${outlinesId} 0 R${i ? ` /Prev ${first + i - 1} 0 R` : ''}${i < this.outline.length - 1 ? ` /Next ${first + i + 1} 0 R` : ''} /Dest [${pageIds[item.page]} 0 R /XYZ null null null] >>`));
      add(`<< /Type /Outlines /First ${first} 0 R /Last ${first + this.outline.length - 1} 0 R /Count ${this.outline.length} >>`);
      outlineRef = ` /Outlines ${outlinesId} 0 R /PageMode /UseOutlines`;
    }
    const stamp = `D:${meta.created.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z')}`;
    const info = add(`<< /Title (${pdfString(meta.title)})${meta.subject ? ` /Subject (${pdfString(meta.subject)})` : ''} /Producer (Brandopolis) /Creator (Brandopolis) /CreationDate (${stamp}) >>`);
    const catalog = add(`<< /Type /Catalog /Pages ${pagesObject} 0 R /Lang (es-MX)${outlineRef} >>`);
    const chunks: Buffer[] = [Buffer.from('%PDF-1.5\n%\xe2\xe3\xcf\xd3\n', 'latin1')];
    let length = chunks[0].length;
    const offsets: number[] = [];
    objects.forEach((body, i) => {
      offsets.push(length);
      const chunk = Buffer.concat([Buffer.from(`${i + 1} 0 obj\n`, 'latin1'), Buffer.isBuffer(body) ? body : Buffer.from(body, 'latin1'), Buffer.from('\nendobj\n', 'latin1')]);
      chunks.push(chunk); length += chunk.length;
    });
    let tail = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (const offset of offsets) tail += `${String(offset).padStart(10, '0')} 00000 n \n`;
    tail += `trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R /Info ${info} 0 R >>\nstartxref\n${length}\n%%EOF\n`;
    chunks.push(Buffer.from(tail, 'latin1'));
    return new Uint8Array(Buffer.concat(chunks));
  }
}
function stream(dict: string, data: Buffer): Buffer {
  return Buffer.concat([Buffer.from(`${dict} /Length ${data.length} >>\nstream\n`, 'latin1'), data, Buffer.from('\nendstream', 'latin1')]);
}
