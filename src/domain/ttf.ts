/**
 * ADR-0030 «Exportaciones» · TrueType fonts for exported documents. Pure and defensive: the bytes come from a file a
 * person uploaded to the brand kit, so every offset is bounds-checked, sizes are capped and any malformed input
 * becomes a controlled FontError (the export then falls back to a reviewed alternative and says so).
 *
 * Scope: TrueType outlines (sfnt 0x00010000 / 'true') and WOFF 1.0 (zlib tables). CFF-based OpenType ('OTTO') and
 * WOFF2 are recognised but not embedded yet; the caller reports them as unsupported instead of guessing.
 *
 * Permission (OS/2 fsType, OpenType spec): bit 1 «restricted» forbids embedding; bit 9 «bitmap only» forbids outline
 * embedding; bit 2 «preview & print» allows embedding only in documents opened for consultation or printing (PDF) and
 * forbids it in editable documents; bit 3 «editable» and 0 «installable» allow both. Bit 8 «no subsetting» means the
 * whole font is embedded. This is the technical restriction inside the file; the licence information declared in the
 * kit (documentEmbedding) is checked separately by the caller.
 */
import { inflateSync } from 'node:zlib';

export class FontError extends Error {}
export const FONT_MAX_BYTES = 10 * 1024 * 1024;
const MAX_GLYPHS = 65535;

export type FontPermission = { fsType: number | null; pdf: boolean; editable: boolean; subsetting: boolean; reason: string | null };
export type ParsedFont = {
  format: 'TRUETYPE';
  family: string; postscriptName: string; unitsPerEm: number; ascent: number; descent: number; capHeight: number;
  italicAngle: number; bbox: [number, number, number, number]; numGlyphs: number; bold: boolean; italic: boolean;
  permission: FontPermission;
  glyphFor(codePoint: number): number; advance(glyph: number): number;
  sfnt: Buffer; tables: Map<string, { offset: number; length: number }>; locaLong: boolean;
};

function need(cond: unknown, message: string): asserts cond { if (!cond) throw new FontError(message); }

/** Recognises the container without parsing it. */
export function fontKind(bytes: Buffer): 'TRUETYPE' | 'CFF' | 'WOFF' | 'WOFF2' | 'UNKNOWN' {
  if (bytes.length < 12) return 'UNKNOWN';
  const tag = bytes.toString('latin1', 0, 4);
  if (bytes.readUInt32BE(0) === 0x00010000 || tag === 'true') return 'TRUETYPE';
  if (tag === 'OTTO') return 'CFF';
  if (tag === 'wOFF') return 'WOFF';
  if (tag === 'wOF2') return 'WOFF2';
  return 'UNKNOWN';
}

/** WOFF 1.0 → plain sfnt (tables inflated, directory rebuilt). The flavor must be TrueType. */
export function woffToSfnt(bytes: Buffer): Buffer {
  need(bytes.length >= 44 && bytes.length <= FONT_MAX_BYTES, 'Invalid WOFF size');
  const flavor = bytes.readUInt32BE(4), numTables = bytes.readUInt16BE(12);
  need(flavor === 0x00010000 || flavor === 0x74727565, 'Only TrueType WOFF files are supported');
  need(numTables > 0 && numTables <= 64 && 44 + numTables * 20 <= bytes.length, 'Invalid WOFF directory');
  const tables: { tag: string; data: Buffer }[] = [];
  let total = 0;
  for (let i = 0; i < numTables; i++) {
    const o = 44 + i * 20, tag = bytes.toString('latin1', o, o + 4), offset = bytes.readUInt32BE(o + 4), compLength = bytes.readUInt32BE(o + 8), origLength = bytes.readUInt32BE(o + 12);
    need(offset + compLength <= bytes.length && origLength <= FONT_MAX_BYTES, 'Invalid WOFF table');
    total += origLength; need(total <= FONT_MAX_BYTES, 'WOFF too large');
    const raw = bytes.subarray(offset, offset + compLength);
    let data: Buffer;
    try { data = compLength < origLength ? inflateSync(raw, { maxOutputLength: origLength }) : Buffer.from(raw); } catch { throw new FontError('Corrupt WOFF table'); }
    need(data.length === origLength, 'Corrupt WOFF table');
    tables.push({ tag, data });
  }
  return buildSfnt(tables, flavor);
}

/** Parses a TrueType font (sfnt). Throws FontError on anything inconsistent. */
export function parseTrueType(input: Buffer): ParsedFont {
  need(input.length >= 12 && input.length <= FONT_MAX_BYTES, 'Invalid font size');
  const kind = fontKind(input);
  const sfnt = kind === 'WOFF' ? woffToSfnt(input) : input;
  need(kind === 'TRUETYPE' || kind === 'WOFF', kind === 'CFF' ? 'OpenType CFF fonts are not embedded yet' : kind === 'WOFF2' ? 'WOFF2 fonts are not embedded yet' : 'Not a font');
  const numTables = sfnt.readUInt16BE(4);
  need(numTables > 0 && numTables <= 128 && 12 + numTables * 16 <= sfnt.length, 'Invalid table directory');
  const tables = new Map<string, { offset: number; length: number }>();
  for (let i = 0; i < numTables; i++) {
    const o = 12 + i * 16, tag = sfnt.toString('latin1', o, o + 4), offset = sfnt.readUInt32BE(o + 8), length = sfnt.readUInt32BE(o + 12);
    need(offset + length <= sfnt.length, `Table ${tag} out of bounds`);
    tables.set(tag, { offset, length });
  }
  for (const tag of ['head', 'hhea', 'hmtx', 'maxp', 'cmap', 'loca', 'glyf']) need(tables.has(tag), `Missing ${tag} table`);
  const t = (tag: string) => tables.get(tag)!;
  const u16 = (o: number) => { need(o + 2 <= sfnt.length, 'Read out of bounds'); return sfnt.readUInt16BE(o); };
  const i16 = (o: number) => { need(o + 2 <= sfnt.length, 'Read out of bounds'); return sfnt.readInt16BE(o); };
  const u32 = (o: number) => { need(o + 4 <= sfnt.length, 'Read out of bounds'); return sfnt.readUInt32BE(o); };

  const head = t('head').offset;
  need(u32(head + 12) === 0x5f0f3cf5, 'Invalid head table');
  const unitsPerEm = u16(head + 18);
  need(unitsPerEm >= 16 && unitsPerEm <= 16384, 'Invalid unitsPerEm');
  const bbox: [number, number, number, number] = [i16(head + 36), i16(head + 38), i16(head + 40), i16(head + 42)];
  const macStyle = u16(head + 44), locaLong = i16(head + 50) === 1;
  const numGlyphs = u16(t('maxp').offset + 4);
  need(numGlyphs > 0 && numGlyphs <= MAX_GLYPHS, 'Invalid glyph count');
  const hhea = t('hhea').offset, numberOfHMetrics = u16(hhea + 34);
  need(numberOfHMetrics > 0 && numberOfHMetrics <= numGlyphs && numberOfHMetrics * 4 <= t('hmtx').length, 'Invalid hmtx');
  need(t('loca').length >= (numGlyphs + 1) * (locaLong ? 4 : 2), 'Invalid loca');
  let ascent = i16(hhea + 4), descent = i16(hhea + 6), capHeight = ascent, fsType: number | null = null, weightBold = false;
  if (tables.has('OS/2') && t('OS/2').length >= 78) {
    const os2 = t('OS/2').offset, version = u16(os2);
    fsType = u16(os2 + 8); weightBold = u16(os2 + 4) >= 600;
    ascent = i16(os2 + 68) || ascent; descent = i16(os2 + 70) || descent;
    if (version >= 2 && t('OS/2').length >= 90) capHeight = i16(os2 + 88) || ascent;
  }
  let italicAngle = 0;
  if (tables.has('post') && t('post').length >= 8) italicAngle = sfnt.readInt32BE(t('post').offset + 4) / 65536;

  // Names: prefer typographic family (16) then family (1); PostScript name (6). Windows Unicode (3,1) or Mac Roman.
  const names = new Map<number, string>();
  if (tables.has('name')) {
    const n = t('name').offset, count = u16(n + 2), strings = n + u16(n + 4);
    for (let i = 0; i < Math.min(count, 512); i++) {
      const r = n + 6 + i * 12, platform = u16(r), encoding = u16(r + 2), id = u16(r + 6), length = u16(r + 8), offset = u16(r + 10);
      if (![1, 6, 16].includes(id) || strings + offset + length > sfnt.length) continue;
      const raw = sfnt.subarray(strings + offset, strings + offset + length);
      const value = platform === 3 && (encoding === 1 || encoding === 10) ? Buffer.from(raw).swap16().toString('utf16le') : platform === 1 && encoding === 0 ? raw.toString('latin1') : '';
      if (value && (!names.has(id) || platform === 3)) names.set(id, value.replace(/[\u0000-\u001f]/g, '').trim().slice(0, 120));
    }
  }
  const family = names.get(16) || names.get(1) || '';
  const postscriptName = (names.get(6) || family || 'Font').replace(/[^A-Za-z0-9-]/g, '').slice(0, 60) || 'Font';

  // Character map: format 12 (full Unicode) preferred, else format 4 (BMP).
  const cmap = t('cmap').offset, subtables = u16(cmap + 2);
  let f12 = -1, f4 = -1;
  for (let i = 0; i < Math.min(subtables, 64); i++) {
    const r = cmap + 4 + i * 8, platform = u16(r), encoding = u16(r + 2), offset = cmap + u32(r + 4);
    if (offset + 2 > sfnt.length) continue;
    const format = u16(offset);
    if (format === 12 && (platform === 3 && encoding === 10 || platform === 0)) f12 = offset;
    if (format === 4 && (platform === 3 && encoding === 1 || platform === 0)) f4 = f4 < 0 ? offset : f4;
  }
  need(f12 >= 0 || f4 >= 0, 'No Unicode character map');
  const cache = new Map<number, number>();
  const glyphFor = (cp: number): number => {
    if (cache.has(cp)) return cache.get(cp)!;
    let g = 0;
    if (f12 >= 0) {
      const groups = u32(f12 + 12);
      let lo = 0, hi = Math.min(groups, 200000) - 1;
      while (lo <= hi) { const mid = (lo + hi) >> 1, o = f12 + 16 + mid * 12, start = u32(o), end = u32(o + 4); if (cp < start) hi = mid - 1; else if (cp > end) lo = mid + 1; else { g = u32(o + 8) + cp - start; break; } }
    } else if (cp <= 0xffff) {
      const segX2 = u16(f4 + 6), ends = f4 + 14, starts = ends + segX2 + 2, deltas = starts + segX2, ranges = deltas + segX2;
      for (let s = 0; s < segX2; s += 2) {
        if (cp > u16(ends + s)) continue;
        const start = u16(starts + s);
        if (cp < start) break;
        const delta = i16(deltas + s), range = u16(ranges + s);
        if (range === 0) g = (cp + delta) & 0xffff;
        else { const at = ranges + s + range + (cp - start) * 2, v = u16(at); g = v === 0 ? 0 : (v + delta) & 0xffff; }
        break;
      }
    }
    if (g >= numGlyphs) g = 0;
    cache.set(cp, g);
    return g;
  };
  const hmtx = t('hmtx').offset;
  const advance = (glyph: number) => u16(hmtx + 4 * Math.min(glyph, numberOfHMetrics - 1));

  const restricted = fsType !== null && (fsType & 0x0002) !== 0, bitmapOnly = fsType !== null && (fsType & 0x0200) !== 0;
  const previewOnly = fsType !== null && !restricted && (fsType & 0x0004) !== 0 && (fsType & 0x0008) === 0;
  const permission: FontPermission = {
    fsType, pdf: !restricted && !bitmapOnly, editable: !restricted && !bitmapOnly && !previewOnly, subsetting: fsType === null || (fsType & 0x0100) === 0,
    reason: restricted ? 'RESTRICTED' : bitmapOnly ? 'BITMAP_ONLY' : previewOnly ? 'PREVIEW_AND_PRINT_ONLY' : fsType === null ? 'NO_OS2_TABLE' : null,
  };
  return { format: 'TRUETYPE', family, postscriptName, unitsPerEm, ascent, descent, capHeight, italicAngle, bbox, numGlyphs, bold: weightBold || (macStyle & 1) === 1, italic: (macStyle & 2) === 2, permission, glyphFor, advance, sfnt, tables, locaLong };
}

/**
 * Subset for embedding: glyph ids stay the same (so CIDToGIDMap is Identity) but the outlines of glyphs that are
 * not used are emptied; composite glyphs pull in their components. Only the tables a PDF CIDFontType2 needs are kept.
 */
export function subsetTrueType(font: ParsedFont, used: Iterable<number>): Buffer {
  const { sfnt, tables } = font;
  const loca = tables.get('loca')!, glyf = tables.get('glyf')!;
  const offsetOf = (g: number) => font.locaLong ? sfnt.readUInt32BE(loca.offset + g * 4) : sfnt.readUInt16BE(loca.offset + g * 2) * 2;
  const keep = new Set<number>([0]);
  const queue = [...used].filter(g => g >= 0 && g < font.numGlyphs);
  while (queue.length) {
    const g = queue.pop()!;
    if (keep.has(g) && g !== 0) continue;
    keep.add(g);
    const start = offsetOf(g), end = offsetOf(g + 1);
    need(end >= start && glyf.offset + end <= glyf.offset + glyf.length, 'Invalid glyph offsets');
    if (end - start < 10 || sfnt.readInt16BE(glyf.offset + start) >= 0) continue;
    // Composite glyph: walk its components.
    let p = glyf.offset + start + 10, guard = 0;
    for (;;) {
      need(p + 4 <= glyf.offset + end && guard++ < 64, 'Invalid composite glyph');
      const flags = sfnt.readUInt16BE(p), component = sfnt.readUInt16BE(p + 2);
      if (component < font.numGlyphs && !keep.has(component)) queue.push(component);
      p += 4 + (flags & 0x0001 ? 4 : 2) + (flags & 0x0008 ? 2 : flags & 0x0040 ? 4 : flags & 0x0080 ? 8 : 0);
      if (!(flags & 0x0020)) break;
    }
  }
  const parts: Buffer[] = [], newLoca = Buffer.alloc((font.numGlyphs + 1) * 4);
  let size = 0;
  for (let g = 0; g < font.numGlyphs; g++) {
    newLoca.writeUInt32BE(size, g * 4);
    if (!keep.has(g)) continue;
    const start = offsetOf(g), end = offsetOf(g + 1);
    const data = sfnt.subarray(glyf.offset + start, glyf.offset + end);
    const padded = data.length % 4 ? Buffer.concat([data, Buffer.alloc(4 - (data.length % 4))]) : data;
    parts.push(padded); size += padded.length;
  }
  newLoca.writeUInt32BE(size, font.numGlyphs * 4);
  const copy = (tag: string) => { const x = tables.get(tag); return x ? Buffer.from(sfnt.subarray(x.offset, x.offset + x.length)) : null; };
  const head = copy('head')!; head.writeUInt32BE(0, 8); head.writeInt16BE(1, 50);
  const out: { tag: string; data: Buffer }[] = [{ tag: 'head', data: head }, { tag: 'loca', data: newLoca }, { tag: 'glyf', data: Buffer.concat(parts) }];
  for (const tag of ['hhea', 'hmtx', 'maxp', 'cvt ', 'fpgm', 'prep', 'OS/2', 'post']) { const d = copy(tag); if (d) out.push({ tag, data: d }); }
  return buildSfnt(out, 0x00010000);
}

function checksum(data: Buffer) {
  let sum = 0;
  const padded = data.length % 4 ? Buffer.concat([data, Buffer.alloc(4 - (data.length % 4))]) : data;
  for (let i = 0; i < padded.length; i += 4) sum = (sum + padded.readUInt32BE(i)) >>> 0;
  return sum;
}
function buildSfnt(tables: { tag: string; data: Buffer }[], flavor: number): Buffer {
  const sorted = [...tables].sort((a, b) => (a.tag < b.tag ? -1 : 1));
  const n = sorted.length, entrySelector = Math.floor(Math.log2(n)), searchRange = 2 ** entrySelector * 16;
  const header = Buffer.alloc(12 + n * 16);
  header.writeUInt32BE(flavor >>> 0, 0); header.writeUInt16BE(n, 4); header.writeUInt16BE(searchRange, 6); header.writeUInt16BE(entrySelector, 8); header.writeUInt16BE(n * 16 - searchRange, 10);
  const bodies: Buffer[] = [];
  let offset = header.length;
  sorted.forEach((table, i) => {
    const o = 12 + i * 16;
    header.write(table.tag.padEnd(4, ' ').slice(0, 4), o, 'latin1');
    header.writeUInt32BE(checksum(table.data), o + 4); header.writeUInt32BE(offset, o + 8); header.writeUInt32BE(table.data.length, o + 12);
    const padded = table.data.length % 4 ? Buffer.concat([table.data, Buffer.alloc(4 - (table.data.length % 4))]) : table.data;
    bodies.push(padded); offset += padded.length;
  });
  return Buffer.concat([header, ...bodies]);
}
