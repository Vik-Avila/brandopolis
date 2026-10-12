import { AppError } from './contracts.js';
import { inspectKitAsset, KIT_ASSET_MAX_BYTES } from './kit-assets.js';

/**
 * PHASE4_SPEC §13 · brand files with a purpose: REFERENCE (internal material of a brief), FINAL_ART (the final file of
 * a deliverable version) and TEMPLATE (Marca y recursos). As with kit files (ADR-0034), the format is decided by the
 * file's own structure, never by its name: raster images and PDF by signature; PowerPoint, Word and Excel by the
 * entries of their ZIP container. Vector images and fonts are refused here (no sanitizer; the kit keeps its own rules).
 */
export type BrandFilePurpose = 'REFERENCE' | 'FINAL_ART' | 'TEMPLATE';
export const BRAND_FILE_PURPOSES: readonly BrandFilePurpose[] = ['REFERENCE', 'FINAL_ART', 'TEMPLATE'];
export type BrandFileFormat = 'PNG' | 'JPEG' | 'WEBP' | 'PDF' | 'PPTX' | 'DOCX' | 'XLSX';
export const TEMPLATE_CATEGORIES = ['PRESENTATION', 'DOCUMENT', 'SOCIAL', 'ADVERTISING', 'OTHER'] as const;
export type TemplateCategory = typeof TEMPLATE_CATEGORIES[number];
export const BRAND_FILE_MAX_BYTES = KIT_ASSET_MAX_BYTES;
export type BrandFileInfo = { format: BrandFileFormat; mediaType: string; previewable: boolean; width: number | null; height: number | null };

export const isBrandFilePurpose = (v: unknown): v is BrandFilePurpose => typeof v === 'string' && (BRAND_FILE_PURPOSES as readonly string[]).includes(v);
export const isTemplateCategory = (v: unknown): v is TemplateCategory => typeof v === 'string' && (TEMPLATE_CATEGORIES as readonly string[]).includes(v);

/** The main part that makes each Office document what it is (exactly one must be present). */
const OFFICE: Record<string, { format: BrandFileFormat; mediaType: string }> = {
  'ppt/presentation.xml': { format: 'PPTX', mediaType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' },
  'word/document.xml': { format: 'DOCX', mediaType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  'xl/workbook.xml': { format: 'XLSX', mediaType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
};
/** Active content is refused: macro-enabled documents must never pass as macro-free .pptx/.docx/.xlsx. */
const ACTIVE_PART = /(^|\/)(vbaProject\.bin|vbaData\.xml)$|(^|\/)activeX\//i;
/** Canonical extension per format: downloads are always named by what the file is, never by what it was called. */
export const FORMAT_EXTENSION: Record<BrandFileFormat, string> = { PNG: 'png', JPEG: 'jpg', WEBP: 'webp', PDF: 'pdf', PPTX: 'pptx', DOCX: 'docx', XLSX: 'xlsx' };
/** A safe download name: the original base name (sanitized) with the detected format's extension. */
export function downloadName(originalName: string, format: BrandFileFormat) {
  const base = originalName.replace(/\.[^.]*$/, '').replace(/[^\w\- ]+/g, '_').trim().slice(0, 100) || 'archivo';
  return `${base}.${FORMAT_EXTENSION[format]}`;
}
const u16 = (b: Uint8Array, o: number) => b[o] | (b[o + 1] << 8);
const u32 = (b: Uint8Array, o: number) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;

/** Names in the ZIP central directory (bounded walk); a damaged or truncated container is refused. */
export function zipEntryNames(b: Uint8Array, max = 2000): string[] {
  let eocd = -1;
  for (let o = b.length - 22; o >= Math.max(0, b.length - 22 - 65535); o--) if (u32(b, o) === 0x06054b50) { eocd = o; break; }
  if (eocd < 0) throw new AppError('INVALID', 'Damaged document');
  const count = u16(b, eocd + 10), start = u32(b, eocd + 16);
  if (count > max || start >= b.length) throw new AppError('INVALID', 'Damaged document');
  const names: string[] = [];
  for (let i = 0, o = start; i < count; i++) {
    if (o + 46 > b.length || u32(b, o) !== 0x02014b50) throw new AppError('INVALID', 'Damaged document');
    const nameLength = u16(b, o + 28), extra = u16(b, o + 30), comment = u16(b, o + 32);
    if (o + 46 + nameLength > b.length) throw new AppError('INVALID', 'Damaged document');
    names.push(new TextDecoder().decode(b.subarray(o + 46, o + 46 + nameLength)));
    o += 46 + nameLength + extra + comment;
  }
  return names;
}

/** Inspects an upload for a brand file. Anything not recognized by its structure is refused. */
export function inspectBrandFile(bytes: Uint8Array): BrandFileInfo {
  if (!bytes.length) throw new AppError('INVALID', 'Empty file');
  if (bytes.length > BRAND_FILE_MAX_BYTES) throw new AppError('INVALID', 'File too large');
  if (u32(bytes, 0) === 0x04034b50) {
    const names = zipEntryNames(bytes);
    if (!names.includes('[Content_Types].xml')) throw new AppError('INVALID', 'Unsupported file type');
    if (names.some(n => ACTIVE_PART.test(n))) throw new AppError('INVALID', 'Documents with macros or active content are not accepted');
    const kinds = Object.keys(OFFICE).filter(part => names.includes(part));
    if (kinds.length !== 1) throw new AppError('INVALID', 'Unsupported file type');
    return { ...OFFICE[kinds[0]], previewable: false, width: null, height: null };
  }
  const info = inspectKitAsset(bytes);
  if (!['PNG', 'JPEG', 'WEBP', 'PDF'].includes(info.format)) throw new AppError('INVALID', 'Unsupported file type for this use');
  return { format: info.format as BrandFileFormat, mediaType: info.mediaType, previewable: info.previewable, width: info.width, height: info.height };
}
