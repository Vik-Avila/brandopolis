/**
 * ADR-0030 / EXP-004 · which typeface an exported document uses, and why. Pure: receives the kit typography and the
 * kit's font files (bytes already loaded) and never changes the kit.
 *
 * - PDF (consultation and printing): the kit font is embedded when its file is a supported TrueType/WOFF, the file's
 *   technical permission allows embedding for consultation/printing, and the kit does not declare
 *   «documentEmbedding: NOT_ALLOWED». An undeclared licence (UNKNOWN) is embedded only if the file allows it, and the
 *   export says the licence is unconfirmed.
 * - Editable documents (PPTX/DOCX): fonts are never embedded; the document names the typeface so it shows where the
 *   font is installed, and the notice says the application will substitute it elsewhere (with the reviewed
 *   alternative for presentations, if the kit has one).
 * - Otherwise the reviewed alternative for the channel is used when its file exists; failing that, the standard font.
 * Every fallback is reported; the identity is never changed silently.
 */
import type { KitContent } from './brand-kit.js';
import { FontError, fontKind, parseTrueType, type ParsedFont } from './ttf.js';

export type FontPurpose = 'PDF' | 'EDITABLE';
export type ExportNotice = { code: string; message: string };
export type FontFile = { assetId: string; originalName: string; bytes: Buffer };
export type FontChoice = { heading: ParsedFont | null; body: ParsedFont | null; bodyBold: ParsedFont | null; declared: { heading: string | null; body: string | null }; notices: ExportNotice[] };

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '');

export function chooseFonts(kit: KitContent | null, files: readonly FontFile[], purpose: FontPurpose): FontChoice {
  const notices: ExportNotice[] = [];
  const note = (code: string, message: string) => { if (!notices.some(n => n.message === message)) notices.push({ code, message }); };
  if (!kit) { note('NO_KIT', 'Este material no tiene una versión del kit asociada: se usa la tipografía estándar (Helvetica).'); return { heading: null, body: null, bodyBold: null, declared: { heading: null, body: null }, notices }; }
  if (!kit.typography.length) note('NO_TYPOGRAPHY', 'El kit no define tipografías: se usa la tipografía estándar (Helvetica).');
  // Parse each font file once; unsupported or damaged files are reported, never guessed.
  const parsed: ParsedFont[] = [];
  for (const f of files) {
    try { parsed.push(parseTrueType(f.bytes)); }
    catch (e) {
      const kind = fontKind(f.bytes);
      const why = kind === 'CFF' ? 'es OpenType CFF, que todavía no se puede incrustar' : kind === 'WOFF2' ? 'es WOFF2, que todavía no se puede incrustar' : e instanceof FontError ? 'no se pudo leer como fuente TrueType válida' : 'no se pudo leer';
      note('FONT_UNSUPPORTED', `El archivo de fuente «${f.originalName}» ${why}.`);
    }
  }
  const fileFor = (family: string) => {
    const matches = parsed.filter(p => norm(p.family) === norm(family));
    return { regular: matches.find(m => !m.bold && !m.italic) ?? matches[0] ?? null, bold: matches.find(m => m.bold && !m.italic) ?? null };
  };
  const channel = purpose === 'PDF' ? ['PRINT', 'PRESENTATION'] : ['PRESENTATION', 'PRINT'];
  const alternative = (entry: KitContent['typography'][number]) => channel.map(c => entry.alternatives.find(a => a.channel === c && a.reviewed)).find(Boolean)?.family ?? null;

  const boldOf = (font: ParsedFont | null) => { const b = font ? fileFor(font.family).bold : null; return b && b.permission.pdf ? b : null; };
  const pick = (use: 'HEADINGS' | 'BODY'): { font: ParsedFont | null; declared: string | null } => {
    const entry = kit.typography.find(f => f.use === use) ?? kit.typography.find(f => f.use === (use === 'HEADINGS' ? 'BODY' : 'HEADINGS')) ?? null;
    if (!entry) return { font: null, declared: null };
    const alt = alternative(entry);
    if (purpose === 'EDITABLE') {
      note('NOT_EMBEDDED_EDITABLE', `«${entry.family}» se indica por su nombre y no va incrustada en el archivo editable: si el equipo que lo abre no la tiene instalada, PowerPoint o Word mostrarán otra fuente.${alt ? ` Alternativa revisada del kit: «${alt}».` : ' El kit no tiene una alternativa revisada para presentaciones.'}`);
      return { font: null, declared: entry.family };
    }
    const tryFamily = (family: string, licence: string): ParsedFont | null | 'BLOCKED' => {
      const { regular, bold } = fileFor(family);
      const file = use === 'HEADINGS' ? bold ?? regular : regular;
      if (!file) { note('FONT_FILE_MISSING', `No hay un archivo de fuente de «${family}» en el kit.`); return null; }
      if (licence === 'NOT_ALLOWED') { note('LICENSE_NOT_ALLOWED', `El kit indica que «${family}» no se puede incrustar en documentos.`); return 'BLOCKED'; }
      if (!file.permission.pdf) { note('FONT_RESTRICTED', `El archivo de «${family}» no permite incrustarlo (${file.permission.reason === 'BITMAP_ONLY' ? 'sólo mapa de bits' : 'incrustación restringida'}).`); return 'BLOCKED'; }
      if (licence !== 'ALLOWED') note('LICENSE_UNCONFIRMED', `La licencia de «${family}» para documentos no está confirmada en el kit; el archivo permite incrustarla para consulta e impresión. Confírmala antes de distribuir el PDF.`);
      return file;
    };
    const main = tryFamily(entry.family, entry.documentEmbedding);
    if (main && main !== 'BLOCKED') return { font: main, declared: entry.family };
    if (alt) {
      const second = tryFamily(alt, 'ALLOWED'); // a reviewed alternative is one a person checked for this channel
      if (second && second !== 'BLOCKED') { note('ALTERNATIVE_USED', `En lugar de «${entry.family}» se usa la alternativa revisada del kit «${alt}».`); return { font: second, declared: alt }; }
    }
    note('STANDARD_FONT_USED', `En lugar de «${entry.family}» se usa la tipografía estándar (Helvetica).`);
    return { font: null, declared: null };
  };
  const heading = pick('HEADINGS'), body = pick('BODY');
  return { heading: heading.font, body: body.font, bodyBold: boldOf(body.font), declared: { heading: heading.declared, body: body.declared }, notices };
}
