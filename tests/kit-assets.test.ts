// ADR-0034 · file safety: format by signature, real dimensions and transparency, disguised files refused (IDN-007).
import { describe, it, expect } from 'vitest';
import { inspectKitAsset, resolutionWarning } from '../src/domain/kit-assets.js';

const bytes = (...parts: (number[] | string)[]) => new Uint8Array(parts.flatMap(p => typeof p === 'string' ? [...p].map(c => c.charCodeAt(0)) : p));
const be32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const png = (width: number, height: number, colorType: number, extra: (number[] | string)[] = []) =>
  bytes([0x89], 'PNG', [13, 10, 26, 10], be32(13), 'IHDR', be32(width), be32(height), [8, colorType, 0, 0, 0], be32(0), ...extra, be32(0), 'IDAT', be32(0));

describe('ADR-0034 · kit asset inspection', () => {
  it('PNG: real size; alpha from the color type or a tRNS chunk, never from the name', () => {
    expect(inspectKitAsset(png(800, 400, 6))).toMatchObject({ format: 'PNG', kind: 'RASTER', width: 800, height: 400, alpha: true, previewable: true });
    expect(inspectKitAsset(png(800, 400, 2))).toMatchObject({ alpha: false });
    expect(inspectKitAsset(png(800, 400, 3, [be32(1), 'tRNS', [0], be32(0)]))).toMatchObject({ alpha: true });
  });
  it('JPEG and WebP report their dimensions; JPEG has no transparency', () => {
    const jpeg = bytes([0xff, 0xd8, 0xff, 0xe0], [0, 16], 'JFIF', [0, 1, 1, 0, 0, 1, 0, 1, 0, 0], [0xff, 0xc0, 0, 17, 8], [1, 44], [2, 88], [3, 1, 0x22, 0]);
    expect(inspectKitAsset(jpeg)).toMatchObject({ format: 'JPEG', width: 600, height: 300, alpha: false });
    const vp8x = bytes('RIFF', be32(0), 'WEBP', 'VP8X', [10, 0, 0, 0], [0x10, 0, 0, 0], [0xff, 0x03, 0x00], [0xc7, 0x01, 0x00]);
    expect(inspectKitAsset(vp8x)).toMatchObject({ format: 'WEBP', width: 1024, height: 456, alpha: true });
  });
  it('documents, fonts and SVG are recognized; SVG is never previewable (no raw serving)', () => {
    expect(inspectKitAsset(bytes('%PDF-1.7\n'))).toMatchObject({ format: 'PDF', previewable: false });
    expect(inspectKitAsset(bytes([0, 1, 0, 0], [0, 10]))).toMatchObject({ format: 'TTF', kind: 'FONT' });
    expect(inspectKitAsset(bytes('OTTO', [0, 0]))).toMatchObject({ format: 'OTF' });
    expect(inspectKitAsset(bytes('wOF2', [0, 1]))).toMatchObject({ format: 'WOFF2' });
    expect(inspectKitAsset(bytes('<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'))).toMatchObject({ format: 'SVG', kind: 'VECTOR', previewable: false });
  });
  it('anything else is refused, whatever it claims to be', () => {
    expect(() => inspectKitAsset(bytes('<html><script>alert(1)</script></html>'))).toThrow(/Unsupported/);
    expect(() => inspectKitAsset(bytes('MZ', [0x90, 0]))).toThrow(/Unsupported/);
    expect(() => inspectKitAsset(new Uint8Array())).toThrow(/Empty/);
    expect(() => inspectKitAsset(bytes([0x89], 'PNG', [13, 10, 26, 10], be32(13), 'XXXX'))).toThrow(/Damaged/);
  });
  it('a logo below twice its minimum width of use is flagged as low resolution', () => {
    const small = inspectKitAsset(png(120, 60, 6));
    expect(resolutionWarning(small, 80)).toBe('LOW_RESOLUTION');
    expect(resolutionWarning(small, 40)).toBeNull();
  });
});
