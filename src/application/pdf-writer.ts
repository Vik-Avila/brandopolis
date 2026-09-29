/**
 * A very small PDF writer, written here rather than taken from a dependency.
 *
 * The Blueprint export is a structured text document: headings, paragraphs and labelled rows. That
 * needs page objects, two standard fonts and measured line wrapping — no images, no vector graphics,
 * no HTML layout. A headless browser would be orders of magnitude heavier for printing text we
 * already hold as data, and the prompt for this work explicitly asked to avoid one.
 *
 * Helvetica and Helvetica-Bold are two of the 14 standard fonts every PDF reader must provide, so
 * nothing is embedded and no font licence travels with the file. Text is encoded as WinAnsi, which
 * covers the Latin-1 range Spanish needs (á é í ó ú ñ ü ¿ ¡ « » — …).
 *
 * Output is deterministic: identical input and timestamp produce byte-identical files, which is what
 * makes the export testable.
 */

/** Advance widths (1/1000 em) for codes 32..126, from the Adobe standard font metrics. */
const HELVETICA = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
  1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
  333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556,
  556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584
];

const HELVETICA_BOLD = [
  278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611,
  975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556,
  333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611,
  611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584
];

/**
 * Accented letters carry the advance width of the letter underneath the accent.
 *
 * Only the lowercase forms are written out and the uppercase ones are derived. That keeps U+00C3 and
 * U+00C2 out of this file: they are the classic symptom of UTF-8 read as Latin-1, so the repository's
 * mojibake guard watches for them and stays strict rather than being exempted for this table.
 */
const BASE_LETTER: Record<string, string> = Object.fromEntries(
  [['a', 'áàâäãå'], ['e', 'éèêë'], ['i', 'íìîï'], ['o', 'óòôöõ'], ['u', 'úùûü'], ['n', 'ñ'], ['c', 'ç'], ['y', 'ýÿ']]
    .flatMap(([base, accented]) => [...accented].flatMap(character =>
      [[character, base], [character.toUpperCase(), base.toUpperCase()]]))
);

/** Punctuation outside ASCII that the interface copy actually uses. */
const PUNCTUATION_WIDTH: Record<string, [number, number]> = {
  '¡': [333, 333], '¿': [611, 611], '«': [556, 556], '»': [556, 556], '·': [278, 278],
  '–': [556, 556], '—': [1000, 1000], '…': [1000, 1000], '°': [400, 400],
  '‘': [222, 278], '’': [222, 278], '“': [333, 500], '”': [333, 500]
};

/** Codes 0x80..0x9F in WinAnsi, which are not Latin-1. */
const WIN_ANSI_HIGH: Record<string, number> = {
  '€': 0x80, '‚': 0x82, 'ƒ': 0x83, '„': 0x84, '…': 0x85, '†': 0x86, '‡': 0x87, 'ˆ': 0x88,
  '‰': 0x89, 'Š': 0x8a, '‹': 0x8b, 'Œ': 0x8c, 'Ž': 0x8e, '‘': 0x91, '’': 0x92,
  '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97, '˜': 0x98, '™': 0x99,
  'š': 0x9a, '›': 0x9b, 'œ': 0x9c, 'ž': 0x9e, 'Ÿ': 0x9f
};

/** Symbols the interface uses that WinAnsi cannot represent, spelled out rather than dropped. */
const TRANSLITERATE: Record<string, string> = {
  '✓': '-', '✦': '*', '✕': 'x', '×': 'x', '→': '->', '←': '<-', '·': '·', ' ': ' '
};

export type FontName = 'regular' | 'bold';

/** Width of one line of text in points. */
export function textWidth(text: string, size: number, font: FontName): number {
  const table = font === 'bold' ? HELVETICA_BOLD : HELVETICA;
  let total = 0;
  for (const character of text) {
    const punctuation = PUNCTUATION_WIDTH[character];
    if (punctuation) { total += punctuation[font === 'bold' ? 1 : 0]; continue; }
    const plain = BASE_LETTER[character] ?? character;
    const code = plain.codePointAt(0) ?? 63;
    total += code >= 32 && code <= 126 ? table[code - 32] : 556;
  }
  return (total * size) / 1000;
}

/** Splits text into lines that fit `width`, breaking inside a very long word only when it must. */
export function wrap(text: string, width: number, size: number, font: FontName): string[] {
  const lines: string[] = [];
  for (const paragraph of String(text ?? '').split(/\r?\n/)) {
    let line = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (textWidth(candidate, size, font) <= width) { line = candidate; continue; }
      if (line) lines.push(line);
      if (textWidth(word, size, font) <= width) { line = word; continue; }
      // A single word wider than the column: break it so nothing ever runs off the page.
      let piece = '';
      for (const character of word) {
        if (textWidth(piece + character, size, font) > width && piece) { lines.push(piece); piece = ''; }
        piece += character;
      }
      line = piece;
    }
    lines.push(line);
  }
  // Collapse the trailing empty line a blank paragraph would add, but keep deliberate blank lines.
  while (lines.length > 1 && lines[lines.length - 1] === '') lines.pop();
  return lines.length ? lines : [''];
}

/** Encodes a string as WinAnsi bytes, escaped for a PDF literal string. */
function pdfString(text: string): string {
  let out = '';
  for (const character of text) {
    const replacement = TRANSLITERATE[character];
    if (replacement !== undefined && replacement !== character) { out += pdfString(replacement); continue; }
    const high = WIN_ANSI_HIGH[character];
    const code = high ?? character.codePointAt(0) ?? 63;
    const byte = code <= 0xff ? code : 63;
    if (byte === 0x28 || byte === 0x29 || byte === 0x5c) out += `\\${String.fromCharCode(byte)}`;
    else if (byte < 32 || byte > 126) out += `\\${byte.toString(8).padStart(3, '0')}`;
    else out += String.fromCharCode(byte);
  }
  return out;
}

const A4 = { width: 595.28, height: 841.89 };
const MARGIN = 56;

type Op = string;

/**
 * Builds a paginated text document. Callers add blocks in order; pages break automatically and the
 * cursor never leaves the margins.
 */
export class PdfBuilder {
  private pages: Op[][] = [];
  private current: Op[] = [];
  private y = A4.height - MARGIN;
  readonly columnWidth = A4.width - MARGIN * 2;

  constructor() { this.pages.push(this.current); }

  private space(height: number) {
    if (this.y - height < MARGIN + 28) this.pageBreak();
  }

  pageBreak() {
    this.current = [];
    this.pages.push(this.current);
    this.y = A4.height - MARGIN;
  }

  /** Raw text at the current cursor, wrapped to the column. */
  text(value: string, { size = 10.5, font = 'regular' as FontName, leading = 0, colour = [0.16, 0.18, 0.17], indent = 0 } = {}) {
    const lineHeight = leading || size * 1.42;
    for (const line of wrap(value, this.columnWidth - indent, size, font)) {
      this.space(lineHeight);
      this.current.push(
        `BT /${font === 'bold' ? 'F2' : 'F1'} ${size} Tf ${colour.map(c => c.toFixed(3)).join(' ')} rg ` +
        `1 0 0 1 ${(MARGIN + indent).toFixed(2)} ${(this.y - size).toFixed(2)} Tm (${pdfString(line)}) Tj ET`
      );
      this.y -= lineHeight;
    }
  }

  gap(height = 10) {
    this.space(height);
    this.y -= height;
  }

  rule() {
    this.space(12);
    this.y -= 6;
    this.current.push(`0.82 0.80 0.76 RG 0.7 w ${MARGIN} ${this.y.toFixed(2)} m ${(A4.width - MARGIN).toFixed(2)} ${this.y.toFixed(2)} l S`);
    this.y -= 8;
  }

  /** Stamps the same footer line, plus a page number, onto every page. Call once, after the content. */
  footer(text: string) {
    this.pages.forEach((ops, index) => {
      ops.push(`BT /F1 7.5 Tf 0.45 0.47 0.46 rg 1 0 0 1 ${MARGIN} 30 Tm (${pdfString(text)}) Tj ET`);
      ops.push(`BT /F1 7.5 Tf 0.45 0.47 0.46 rg 1 0 0 1 ${(A4.width - MARGIN - 16).toFixed(2)} 30 Tm (${pdfString(`${index + 1}/${this.pages.length}`)}) Tj ET`);
    });
  }

  /** Serialises the document. `created` fixes the timestamp so output stays deterministic. */
  build(meta: { title: string; created: Date }): Uint8Array {
    const objects: string[] = [];
    const add = (body: string) => { objects.push(body); return objects.length; };

    const pageIds: number[] = [];
    const contentIds: number[] = [];
    for (const ops of this.pages) {
      const stream = ops.join('\n');
      contentIds.push(add(`<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream`));
      pageIds.push(0);
    }
    const fontRegular = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    const fontBold = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    const pagesId = objects.length + this.pages.length + 1;
    for (let index = 0; index < this.pages.length; index++) {
      pageIds[index] = add(
        `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${A4.width} ${A4.height}] ` +
        `/Resources << /Font << /F1 ${fontRegular} 0 R /F2 ${fontBold} 0 R >> >> /Contents ${contentIds[index]} 0 R >>`
      );
    }
    const pagesObject = add(`<< /Type /Pages /Count ${pageIds.length} /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] >>`);
    const stamp = `D:${meta.created.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z')}`;
    const info = add(`<< /Title (${pdfString(meta.title)}) /Producer (Brandopolis) /Creator (Brandopolis) /CreationDate (${stamp}) >>`);
    const catalog = add(`<< /Type /Catalog /Pages ${pagesObject} 0 R >>`);

    let pdf = '%PDF-1.4\n';
    const offsets: number[] = [];
    objects.forEach((body, index) => {
      offsets.push(Buffer.byteLength(pdf, 'latin1'));
      pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
    });
    const xref = Buffer.byteLength(pdf, 'latin1');
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (const offset of offsets) pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    return new Uint8Array(Buffer.from(pdf, 'latin1'));
  }
}
