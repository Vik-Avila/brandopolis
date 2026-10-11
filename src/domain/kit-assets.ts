import { AppError } from './contracts.js';

/**
 * ADR-0034 · seguridad de archivos. The format is decided by the file's signature, never by its name or the declared
 * media type. Raster images report real dimensions and whether they really carry transparency (alpha channel or a
 * tRNS chunk); a raster image is never labelled a vector. SVG is accepted only as a private original and never served
 * until a sanitizer exists; PDF only for extraction; fonts only when the file is a real font.
 */
export type KitAssetFormat = 'PNG' | 'JPEG' | 'WEBP' | 'SVG' | 'PDF' | 'TTF' | 'OTF' | 'WOFF' | 'WOFF2';
export type KitAssetInfo = { format: KitAssetFormat; kind: 'RASTER' | 'VECTOR' | 'DOCUMENT' | 'FONT'; mediaType: string; width: number | null; height: number | null; alpha: boolean | null; previewable: boolean };
export const KIT_ASSET_MAX_BYTES = 15 * 1024 * 1024;

const ascii = (b: Uint8Array, start: number, length: number) => String.fromCharCode(...b.subarray(start, start + length));
const u32be = (b: Uint8Array, o: number) => ((b[o] << 24) >>> 0) + (b[o + 1] << 16) + (b[o + 2] << 8) + b[o + 3];
const u24le = (b: Uint8Array, o: number) => b[o] + (b[o + 1] << 8) + (b[o + 2] << 16);

function png(b: Uint8Array): KitAssetInfo {
  if (b.length < 33 || ascii(b, 12, 4) !== 'IHDR') throw new AppError('INVALID', 'Damaged PNG file');
  const colorType = b[25];
  let alpha = colorType === 4 || colorType === 6;
  // Walk the chunks looking for a transparency chunk before the image data.
  for (let o = 8; !alpha && o + 8 <= b.length;) {
    const length = u32be(b, o), type = ascii(b, o + 4, 4);
    if (type === 'tRNS') alpha = true;
    if (type === 'IDAT' || type === 'IEND') break;
    o += 12 + length;
  }
  return { format: 'PNG', kind: 'RASTER', mediaType: 'image/png', width: u32be(b, 16), height: u32be(b, 20), alpha, previewable: true };
}

function jpeg(b: Uint8Array): KitAssetInfo {
  for (let o = 2; o + 9 < b.length;) {
    if (b[o] !== 0xff) { o++; continue; }
    const marker = b[o + 1], length = (b[o + 2] << 8) + b[o + 3];
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker))
      return { format: 'JPEG', kind: 'RASTER', mediaType: 'image/jpeg', width: (b[o + 7] << 8) + b[o + 8], height: (b[o + 5] << 8) + b[o + 6], alpha: false, previewable: true };
    o += 2 + length;
  }
  throw new AppError('INVALID', 'Damaged JPEG file');
}

function webp(b: Uint8Array): KitAssetInfo {
  const chunk = ascii(b, 12, 4);
  const base = { format: 'WEBP' as const, kind: 'RASTER' as const, mediaType: 'image/webp', previewable: true };
  if (chunk === 'VP8X') return { ...base, width: u24le(b, 24) + 1, height: u24le(b, 27) + 1, alpha: (b[20] & 0x10) !== 0 };
  if (chunk === 'VP8L') { const bits = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24); return { ...base, width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1, alpha: ((bits >> 28) & 1) === 1 }; }
  if (chunk === 'VP8 ') return { ...base, width: (b[26] | (b[27] << 8)) & 0x3fff, height: (b[28] | (b[29] << 8)) & 0x3fff, alpha: false };
  throw new AppError('INVALID', 'Damaged WebP file');
}

/** Inspects the first bytes of an upload. Anything not recognized by its signature is refused. */
export function inspectKitAsset(bytes: Uint8Array): KitAssetInfo {
  if (!bytes.length) throw new AppError('INVALID', 'Empty file');
  if (bytes.length > KIT_ASSET_MAX_BYTES) throw new AppError('INVALID', 'File too large');
  const head = ascii(bytes, 0, 12);
  if (bytes[0] === 0x89 && head.slice(1, 4) === 'PNG') return png(bytes);
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return jpeg(bytes);
  if (head.startsWith('RIFF') && head.slice(8, 12) === 'WEBP') return webp(bytes);
  if (head.startsWith('%PDF-')) return { format: 'PDF', kind: 'DOCUMENT', mediaType: 'application/pdf', width: null, height: null, alpha: null, previewable: false };
  if (u32be(bytes, 0) === 0x00010000 || head.startsWith('true')) return { format: 'TTF', kind: 'FONT', mediaType: 'font/ttf', width: null, height: null, alpha: null, previewable: false };
  if (head.startsWith('OTTO')) return { format: 'OTF', kind: 'FONT', mediaType: 'font/otf', width: null, height: null, alpha: null, previewable: false };
  if (head.startsWith('wOFF')) return { format: 'WOFF', kind: 'FONT', mediaType: 'font/woff', width: null, height: null, alpha: null, previewable: false };
  if (head.startsWith('wOF2')) return { format: 'WOFF2', kind: 'FONT', mediaType: 'font/woff2', width: null, height: null, alpha: null, previewable: false };
  const textStart = new TextDecoder('utf-8', { fatal: false }).decode(bytes.subarray(0, 512)).replace(/^﻿/, '').trimStart();
  if (/^(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*(<!DOCTYPE svg[^>]*>\s*)?<svg[\s>]/i.test(textStart))
    return { format: 'SVG', kind: 'VECTOR', mediaType: 'image/svg+xml', width: null, height: null, alpha: null, previewable: false };
  throw new AppError('INVALID', 'Unsupported file type');
}

/** ADR-0034 · resolution against the sizes of use: a logo smaller than twice its minimum width is flagged. */
export function resolutionWarning(info: KitAssetInfo, minWidthPx: number | null) {
  if (info.kind !== 'RASTER' || !info.width || !minWidthPx) return null;
  return info.width < minWidthPx * 2 ? 'LOW_RESOLUTION' : null;
}
