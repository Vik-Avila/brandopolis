/**
 * ADR-0030 «Exportaciones» · brand PDF builder. Same family as pdf-writer/pdf-editorial (deterministic, selectable
 * text, no dependency) plus the brand kit's TrueType fonts embedded as CIDFontType2 subsets with a ToUnicode map, so
 * the document shows the brand's typography and its text can be selected, copied and searched.
 *
 * A character the kit font does not contain is drawn with the standard font (Helvetica) and reported; a character
 * neither can draw becomes «?» and is reported too. Nothing is substituted silently: the caller turns `notices` into
 * the explanation shown with the download.
 */
import { deflateSync } from 'node:zlib';
import { decodePng } from './pdf-editorial.js';
import { pdfString, textWidth } from './pdf-writer.js';
import { subsetTrueType, type ParsedFont } from '../domain/ttf.js';

export const A4 = { width: 595.28, height: 841.89 };
/** Largest image (pixels) an export decodes: generous for a logo, bounded for memory. */
export const MAX_IMAGE_PIXELS = 12_000_000;
export type Rgb = [number, number, number];
export type Role = 'heading' | 'body';
type Std = 'F1' | 'F2';
type Segment = { font: 'E' | Std; text: string; role: Role; bold: boolean };

const WIN_ANSI_EXTRA = new Set('€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ');
const winAnsi = (ch: string) => { const c = ch.codePointAt(0)!; return (c >= 32 && c <= 126) || (c >= 160 && c <= 255) || WIN_ANSI_EXTRA.has(ch); };
export const hexRgb = (hex: string): Rgb => { const m = /^#?([0-9a-f]{6})$/i.exec(hex); const n = m ? parseInt(m[1], 16) : 0; return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };

type EmbeddedFont = { font: ParsedFont; ref: string; used: Set<number>; codes: Map<number, number> };

export class BrandPdf {
  private pages: string[][] = [];
  private images: { name: string; object: (add: (b: string | Buffer) => number) => number }[] = [];
  private pageImages: Set<string>[] = [];
  private y = 0;
  readonly margin = 56;
  readonly width = A4.width - 112;
  private embedded = new Map<Role | 'bodyBold', EmbeddedFont>();
  private refs = new Map<ParsedFont, EmbeddedFont>();
  readonly notices = new Set<string>();
  private missing = new Set<string>();

  constructor(fonts: Partial<Record<Role | 'bodyBold', ParsedFont | null>>) {
    for (const role of ['heading', 'body', 'bodyBold'] as const) {
      const f = fonts[role];
      if (!f) continue;
      const existing = this.refs.get(f) ?? { font: f, ref: `E${this.refs.size + 1}`, used: new Set<number>(), codes: new Map() };
      this.refs.set(f, existing); this.embedded.set(role, existing);
    }
    this.newPage();
  }
  get missingCharacters() { return [...this.missing].sort(); }

  newPage() { this.pages.push([]); this.pageImages.push(new Set()); this.y = A4.height - this.margin; }
  private get ops() { return this.pages[this.pages.length - 1]; }
  private ensure(height: number) { if (this.y - height < this.margin + 30) this.newPage(); }

  /** Splits text into runs: kit font where it has the glyph, standard font otherwise, «?» if neither. */
  /** The embedded font for a run: body text in bold uses the kit's bold file when there is one. */
  private fontFor(role: Role, bold: boolean) { return role === 'body' && bold ? this.embedded.get('bodyBold') ?? this.embedded.get('body') : this.embedded.get(role); }
  private segments(text: string, role: Role, bold: boolean): Segment[] {
    const e = this.fontFor(role, bold), std: Std = bold ? 'F2' : 'F1', out: Segment[] = [];
    for (const ch of text) {
      const cp = ch.codePointAt(0)!;
      let font: Segment['font'] = std, value = ch;
      if (e && (e.font.glyphFor(cp) !== 0 || ch === ' ')) font = 'E';
      else if (!winAnsi(ch)) { this.missing.add(ch); value = '?'; }
      else if (e) this.missing.add(ch);
      const last = out[out.length - 1];
      if (last && last.font === font) last.text += value; else out.push({ font, text: value, role, bold });
    }
    return out;
  }
  private segWidth(s: Segment, size: number) {
    if (s.font !== 'E') return textWidth(s.text, size, s.font === 'F2' ? 'bold' : 'regular');
    const f = this.fontFor(s.role, s.bold)!.font;
    let w = 0; for (const ch of s.text) w += f.advance(f.glyphFor(ch.codePointAt(0)!));
    return (w * size) / f.unitsPerEm;
  }
  measure(text: string, size: number, role: Role, bold = false) { return this.segments(text, role, bold).reduce((n, s) => n + this.segWidth(s, size), 0); }
  wrap(text: string, width: number, size: number, role: Role, bold = false) {
    const lines: string[] = [];
    for (const paragraph of String(text ?? '').replace(/\r/g, '').split('\n')) {
      let line = '';
      for (const word of paragraph.split(/\s+/).filter(Boolean)) {
        const candidate = line ? `${line} ${word}` : word;
        if (this.measure(candidate, size, role, bold) <= width) { line = candidate; continue; }
        if (line) lines.push(line);
        if (this.measure(word, size, role, bold) <= width) { line = word; continue; }
        let piece = '';
        for (const ch of word) { if (piece && this.measure(piece + ch, size, role, bold) > width) { lines.push(piece); piece = ''; } piece += ch; }
        line = piece;
      }
      lines.push(line);
    }
    while (lines.length > 1 && lines[lines.length - 1] === '') lines.pop();
    return lines;
  }
  /** Draws one line at (x, baseline y). */
  private draw(text: string, x: number, y: number, size: number, role: Role, bold: boolean, color: Rgb) {
    let cx = x;
    for (const s of this.segments(text, role, bold)) {
      if (s.font === 'E') {
        const e = this.fontFor(role, bold)!;
        let hex = '';
        for (const ch of s.text) { const cp = ch.codePointAt(0)!, g = e.font.glyphFor(cp); e.used.add(g); if (!e.codes.has(g)) e.codes.set(g, cp); hex += g.toString(16).padStart(4, '0'); }
        this.ops.push(`BT /${e.ref} ${size} Tf ${color.map(c => c.toFixed(3)).join(' ')} rg 1 0 0 1 ${cx.toFixed(2)} ${y.toFixed(2)} Tm <${hex}> Tj ET`);
      } else {
        this.ops.push(`BT /${s.font} ${size} Tf ${color.map(c => c.toFixed(3)).join(' ')} rg 1 0 0 1 ${cx.toFixed(2)} ${y.toFixed(2)} Tm (${pdfString(s.text)}) Tj ET`);
      }
      cx += this.segWidth(s, size);
    }
  }
  text(value: string, o: { size?: number; role?: Role; bold?: boolean; color?: Rgb; indent?: number; width?: number; after?: number } = {}) {
    const size = o.size ?? 10.5, role = o.role ?? 'body', bold = o.bold ?? false, indent = o.indent ?? 0, lh = size * 1.42;
    for (const line of this.wrap(value, (o.width ?? this.width) - indent, size, role, bold)) {
      this.ensure(lh);
      this.draw(line, this.margin + indent, this.y - size, size, role, bold, o.color ?? [0.16, 0.18, 0.17]);
      this.y -= lh;
    }
    this.y -= o.after ?? 0;
  }
  gap(h = 10) { this.ensure(h); this.y -= h; }
  rule(color: Rgb = [0.82, 0.8, 0.76]) { this.ensure(12); this.y -= 6; this.ops.push(`${color.map(c => c.toFixed(3)).join(' ')} RG 0.7 w ${this.margin} ${this.y.toFixed(2)} m ${(A4.width - this.margin).toFixed(2)} ${this.y.toFixed(2)} l S`); this.y -= 8; }
  /** Two-column table of label/value rows; rows never split across pages unless taller than a page. */
  facts(rows: [string, string][], o: { labelWidth?: number; size?: number } = {}) {
    const size = o.size ?? 10, lw = o.labelWidth ?? 150, lh = size * 1.42;
    for (const [label, value] of rows) {
      const left = this.wrap(label, lw - 10, size, 'body', true), right = this.wrap(value || '—', this.width - lw, size, 'body');
      const height = Math.max(left.length, right.length) * lh + 6;
      if (height < A4.height - 2 * this.margin - 60) this.ensure(height);
      const top = this.y;
      left.forEach((l, i) => { this.ensure(lh); this.draw(l, this.margin, top - size - i * lh, size, 'body', true, [0.25, 0.27, 0.26]); });
      right.forEach((l, i) => { this.draw(l, this.margin + lw, top - size - i * lh, size, 'body', false, [0.16, 0.18, 0.17]); });
      this.y = top - height;
      this.ops.push(`0.9 0.89 0.86 RG 0.5 w ${this.margin} ${(this.y + 3).toFixed(2)} m ${(A4.width - this.margin).toFixed(2)} ${(this.y + 3).toFixed(2)} l S`);
    }
  }
  swatch(hex: string, label: string, detail: string) {
    this.ensure(46);
    const c = hexRgb(hex), top = this.y;
    this.ops.push(`${c.map(v => v.toFixed(3)).join(' ')} rg 0.8 0.8 0.8 RG 0.5 w ${this.margin} ${(top - 36).toFixed(2)} 54 36 re B`);
    this.draw(label, this.margin + 66, top - 14, 11, 'body', true, [0.16, 0.18, 0.17]);
    this.draw(detail, this.margin + 66, top - 30, 9, 'body', false, [0.35, 0.37, 0.36]);
    this.y = top - 46;
  }
  /** PNG (with alpha) or JPEG image, scaled to fit the box. Unsupported formats are reported, never guessed. */
  image(bytes: Buffer, format: string, maxW: number, maxH: number) {
    let w: number, h: number, object: (add: (b: string | Buffer) => number) => number;
    if (format === 'PNG') {
      // Kit logos are uploads: check the declared size before decoding and report a bad file instead of failing.
      if (bytes.length < 24 || bytes.readUInt32BE(16) * bytes.readUInt32BE(20) > MAX_IMAGE_PIXELS) { this.notices.add('IMAGE_FORMAT'); return; }
      let png: ReturnType<typeof decodePng>;
      try { png = decodePng(bytes); } catch { this.notices.add('IMAGE_FORMAT'); return; }
      w = png.width; h = png.height;
      object = add => {
        const smask = png.alpha ? add(stream(`<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode`, deflateSync(png.alpha))) : 0;
        return add(stream(`<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode${smask ? ` /SMask ${smask} 0 R` : ''}`, deflateSync(png.rgb)));
      };
    } else if (format === 'JPEG') {
      let size: ReturnType<typeof jpegSize>;
      try { size = jpegSize(bytes); } catch { this.notices.add('IMAGE_FORMAT'); return; }
      if (!size.width || !size.height || size.width * size.height > MAX_IMAGE_PIXELS) { this.notices.add('IMAGE_FORMAT'); return; }
      w = size.width; h = size.height;
      object = add => add(stream(`<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /${size.components === 1 ? 'DeviceGray' : size.components === 4 ? 'DeviceCMYK' : 'DeviceRGB'} /BitsPerComponent 8 /Filter /DCTDecode`, bytes));
    } else { this.notices.add('IMAGE_FORMAT'); return; }
    const scale = Math.min(maxW / w, maxH / h, 1), dw = w * scale, dh = h * scale;
    this.ensure(dh + 8);
    const name = `Im${this.images.length + 1}`;
    this.images.push({ name, object });
    this.pageImages[this.pageImages.length - 1].add(name);
    this.ops.push(`q ${dw.toFixed(2)} 0 0 ${dh.toFixed(2)} ${this.margin} ${(this.y - dh).toFixed(2)} cm /${name} Do Q`);
    this.y -= dh + 8;
  }
  footer(text: string) {
    this.pages.forEach((ops, i) => {
      ops.push(`BT /F1 7.5 Tf 0.45 0.47 0.46 rg 1 0 0 1 ${this.margin} 30 Tm (${pdfString(text)}) Tj ET`);
      ops.push(`BT /F1 7.5 Tf 0.45 0.47 0.46 rg 1 0 0 1 ${(A4.width - this.margin - 20).toFixed(2)} 30 Tm (${pdfString(`${i + 1}/${this.pages.length}`)}) Tj ET`);
    });
  }

  build(meta: { title: string; created: Date; subject?: string }): Buffer {
    const objects: (string | Buffer)[] = [];
    const add = (b: string | Buffer) => { objects.push(b); return objects.length; };
    const std = { F1: add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'), F2: add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>') };
    const fontRefs: string[] = [`/F1 ${std.F1} 0 R`, `/F2 ${std.F2} 0 R`];
    const tagged = new Set<string>();
    for (const e of this.refs.values()) {
      if (!e.used.size) continue;
      const f = e.font;
      const program = f.permission.subsetting ? subsetTrueType(f, e.used) : f.sfnt;
      let tag = ''; let seed = [...e.used].reduce((a, g) => (a * 31 + g) >>> 0, 7) + e.ref.charCodeAt(1);
      do { tag = ''; for (let i = 0; i < 6; i++) { tag += String.fromCharCode(65 + (seed % 26)); seed = Math.floor(seed / 26) + 7 * (i + 1); } } while (tagged.has(tag));
      tagged.add(tag);
      const base = `${f.permission.subsetting ? `${tag}+` : ''}${f.postscriptName}`, k = 1000 / f.unitsPerEm;
      const file = add(stream(`<< /Length1 ${program.length} /Filter /FlateDecode`, deflateSync(program)));
      const descriptor = add(`<< /Type /FontDescriptor /FontName /${base} /Flags ${32 + (f.italic ? 64 : 0)} /FontBBox [${f.bbox.map(v => Math.round(v * k)).join(' ')}] /ItalicAngle ${f.italicAngle} /Ascent ${Math.round(f.ascent * k)} /Descent ${Math.round(f.descent * k)} /CapHeight ${Math.round(f.capHeight * k)} /StemV ${f.bold ? 120 : 80} /FontFile2 ${file} 0 R >>`);
      const glyphs = [...e.used].sort((a, b) => a - b);
      const widths = glyphs.map(g => `${g} [${Math.round(f.advance(g) * k)}]`).join(' ');
      const cid = add(`<< /Type /Font /Subtype /CIDFontType2 /BaseFont /${base} /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor ${descriptor} 0 R /DW ${Math.round(f.advance(0) * k)} /W [${widths}] /CIDToGIDMap /Identity >>`);
      const toUnicode = add(stream('<<', Buffer.from(toUnicodeCMap(e.codes), 'latin1')));
      fontRefs.push(`/${e.ref} ${add(`<< /Type /Font /Subtype /Type0 /BaseFont /${base} /Encoding /Identity-H /DescendantFonts [${cid} 0 R] /ToUnicode ${toUnicode} 0 R >>`)} 0 R`);
    }
    const imageRefs = new Map(this.images.map(i => [i.name, i.object(add)]));
    const pagesId = objects.length + this.pages.length * 2 + 1;
    const kids: number[] = [];
    this.pages.forEach((ops, i) => {
      const content = add(stream('<< /Filter /FlateDecode', deflateSync(Buffer.from(ops.join('\n'), 'latin1'))));
      const xo = [...this.pageImages[i]].map(n => `/${n} ${imageRefs.get(n)} 0 R`).join(' ');
      kids.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${A4.width} ${A4.height}] /Resources << /Font << ${fontRefs.join(' ')} >>${xo ? ` /XObject << ${xo} >>` : ''} >> /Contents ${content} 0 R >>`));
    });
    const pages = add(`<< /Type /Pages /Count ${kids.length} /Kids [${kids.map(k => `${k} 0 R`).join(' ')}] >>`);
    if (pages !== pagesId) throw new Error('PDF object numbering');
    const stamp = `D:${meta.created.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z')}`;
    const info = add(`<< /Title ${utf16(meta.title)} ${meta.subject ? `/Subject ${utf16(meta.subject)} ` : ''}/Producer (Brandopolis) /Creator (Brandopolis) /CreationDate (${stamp}) >>`);
    const catalog = add(`<< /Type /Catalog /Pages ${pages} 0 R /Lang (es-MX) >>`);
    const chunks: Buffer[] = [Buffer.from('%PDF-1.7\n%\xe2\xe3\xcf\xd3\n', 'latin1')];
    let length = chunks[0].length;
    const offsets: number[] = [];
    objects.forEach((body, i) => {
      offsets.push(length);
      const part = Buffer.concat([Buffer.from(`${i + 1} 0 obj\n`, 'latin1'), typeof body === 'string' ? Buffer.from(body, 'latin1') : body, Buffer.from('\nendobj\n', 'latin1')]);
      chunks.push(part); length += part.length;
    });
    let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (const o of offsets) xref += `${String(o).padStart(10, '0')} 00000 n \n`;
    xref += `trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R /Info ${info} 0 R >>\nstartxref\n${length}\n%%EOF\n`;
    chunks.push(Buffer.from(xref, 'latin1'));
    return Buffer.concat(chunks);
  }
}

function stream(dict: string, data: Buffer) {
  const head = dict === '<<' ? `<< /Length ${data.length} >>` : `${dict} /Length ${data.length} >>`;
  return Buffer.concat([Buffer.from(`${head}\nstream\n`, 'latin1'), data, Buffer.from('\nendstream', 'latin1')]);
}
/** UTF-16BE text string for metadata (titles may carry accents beyond WinAnsi). */
function utf16(text: string) { const b = Buffer.from(`﻿${text}`, 'utf16le').swap16(); return `<${b.toString('hex')}>`; }
function toUnicodeCMap(codes: Map<number, number>) {
  const entries = [...codes.entries()].sort((a, b) => a[0] - b[0]).map(([g, cp]) => `<${g.toString(16).padStart(4, '0')}> <${Buffer.from(String.fromCodePoint(cp), 'utf16le').swap16().toString('hex')}>`);
  const blocks: string[] = [];
  for (let i = 0; i < entries.length; i += 100) blocks.push(`${Math.min(100, entries.length - i)} beginbfchar\n${entries.slice(i, i + 100).join('\n')}\nendbfchar`);
  return `/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def\n/CMapName /Adobe-Identity-UCS def\n/CMapType 2 def\n1 begincodespacerange\n<0000> <FFFF>\nendcodespacerange\n${blocks.join('\n')}\nendcmap\nCMapName currentdict /CMap defineresource pop\nend\nend`;
}
/** Dimensions and components of a baseline or progressive JPEG (SOF marker), bounds-checked. */
export function jpegSize(b: Buffer) {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) throw new Error('Not a JPEG');
  let o = 2;
  while (o + 9 < b.length) {
    if (b[o] !== 0xff) { o++; continue; }
    const marker = b[o + 1], len = b.readUInt16BE(o + 2);
    if ([0xc0, 0xc1, 0xc2].includes(marker)) return { height: b.readUInt16BE(o + 5), width: b.readUInt16BE(o + 7), components: b[o + 9] };
    o += 2 + len;
  }
  throw new Error('JPEG without size');
}
