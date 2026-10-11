/**
 * ADR-0032 · building and writing site files. Kit files are untrusted input: images go through the same checks as the
 * exports (6957ce6: declared size within MAX_IMAGE_PIXELS, signature and dimensions verified by the kit inspector,
 * damaged files skipped with a notice) and are copied byte for byte (never decoded). Web fonts are served only when
 * the kit declares web permission and the file parses as a TrueType/WOFF font of that family; otherwise the
 * reviewed web alternative's name (or the system stack) is used, with a notice.
 */
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import { randomUUID } from 'node:crypto';
import { inspectKitAsset, KIT_ASSET_MAX_BYTES } from '../domain/kit-assets.js';
import { renderSite, type RenderImage, type Theme } from '../domain/site-render.js';
import type { SiteContent } from '../domain/site.js';
import type { KitContent } from '../domain/brand-kit.js';
import { FONT_MAX_BYTES, fontKind, parseTrueType } from '../domain/ttf.js';
import { MAX_IMAGE_PIXELS } from '../application/pdf-brand.js';
import { SITE_FORM_PRIVACY } from '../application/sites.js';

export type RenderPlan = { version: { id: string; content: SiteContent }; brandName: string; kit: { content: KitContent } | null; logoAssetId: string | null; assets: { id: string; role: string; format: string; storageKey: string; originalName: string }[] };
export type FileLoader = (storageKey: string, maxBytes: number) => Promise<Buffer | null>;
export type BuiltSite = { files: Map<string, string | Buffer>; notices: string[] };
const EXT: Record<string, string> = { PNG: 'png', JPEG: 'jpg', WEBP: 'webp' };
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '');

export function sitesRoot() { return resolve(process.env.BRANDOPOLIS_SITES_ROOT?.trim() || '.local/sites'); }
export function snapshotDir(ws: string, brand: string, site: string, version: string) {
  const root = sitesRoot(), dir = resolve(root, ws, brand, site, version);
  if (!dir.startsWith(root + sep) || [ws, brand, site, version].some(p => !/^[A-Za-z0-9-]{1,80}$/.test(p))) throw new Error('Invalid snapshot path');
  return dir;
}

/** A kit image that is safe to serve: declared format, verified signature and dimensions within the limit. */
export function safeImage(bytes: Buffer | null, format: string): { width: number; height: number } | null {
  if (!bytes || bytes.length > KIT_ASSET_MAX_BYTES || !EXT[format]) return null;
  try {
    const info = inspectKitAsset(new Uint8Array(bytes));
    if (info.format !== format || !info.width || !info.height || info.width * info.height > MAX_IMAGE_PIXELS) return null;
    return { width: info.width, height: info.height };
  } catch { return null; }
}

export async function buildSiteFiles(plan: RenderPlan, load: FileLoader, o: { baseUrl: string | null; noindex: boolean }): Promise<BuiltSite> {
  const notices: string[] = [], files = new Map<string, string | Buffer>(), images = new Map<string, RenderImage>();
  const kit = plan.kit?.content ?? null;
  for (const a of plan.assets.filter(x => x.role !== 'FONT')) {
    const bytes = await load(a.storageKey, KIT_ASSET_MAX_BYTES), size = safeImage(bytes, a.format);
    if (!size || !bytes) { notices.push(`La imagen «${a.originalName}» no es válida o supera el tamaño admitido y no se incluyó.`); continue; }
    const path = `assets/${a.id}.${EXT[a.format]}`;
    files.set(path, bytes); images.set(a.id, { path, ...size });
  }
  const role = (r: string, fallback: string) => kit?.palette.find(p => p.role === r)?.hex ?? fallback;
  const fontFaces: Theme['fontFaces'] = [];
  const pick = async (use: 'HEADINGS' | 'BODY') => {
    const entry = kit?.typography.find(f => f.use === use) ?? kit?.typography[0];
    if (!entry) return '';
    if (entry.webEmbedding === 'ALLOWED') {
      for (const a of plan.assets.filter(x => x.role === 'FONT')) {
        const bytes = await load(a.storageKey, FONT_MAX_BYTES);
        if (!bytes) continue;
        try {
          const kind = fontKind(bytes);
          if (kind !== 'TRUETYPE' && kind !== 'WOFF') continue;
          if (norm(parseTrueType(bytes).family) !== norm(entry.family)) continue;
          const path = `fonts/${a.id}.${kind === 'WOFF' ? 'woff' : 'ttf'}`;
          if (!files.has(path)) { files.set(path, bytes); fontFaces.push({ family: entry.family, path, format: kind === 'WOFF' ? 'woff' : 'truetype' }); }
          return entry.family;
        } catch { notices.push(`El archivo de fuente «${a.originalName}» no se pudo leer.`); }
      }
      notices.push(`No hay un archivo web utilizable de «${entry.family}»: se usa su nombre con la alternativa del sistema.`);
      return entry.family;
    }
    const alt = entry.alternatives.find(x => x.channel === 'WEBSITE' && x.reviewed)?.family;
    notices.push(alt ? `«${entry.family}» no tiene permiso web confirmado: se usa la alternativa web revisada «${alt}».` : `«${entry.family}» no tiene permiso web confirmado ni alternativa web revisada: se usa la tipografía del sistema.`);
    return alt ?? '';
  };
  const logoImg = plan.logoAssetId ? images.get(plan.logoAssetId) : undefined;
  const theme: Theme = { brandName: plan.brandName, primary: role('PRIMARY', '#1D2A26'), text: role('TEXT', '#1F2523'), background: role('BACKGROUND', '#FFFFFF'), accent: role('ACCENT', role('PRIMARY', '#1D2A26')), headingFont: await pick('HEADINGS'), bodyFont: await pick('BODY'), fontFaces, logo: logoImg ? { path: logoImg.path, alt: plan.brandName } : null };
  for (const [path, text] of renderSite(plan.version.content, theme, images, { baseUrl: o.baseUrl, noindex: o.noindex, formAction: '/__form', formPrivacy: SITE_FORM_PRIVACY })) files.set(path, text);
  return { files, notices: [...new Set(notices)] };
}

/** Writes an immutable snapshot atomically (temporary directory, then rename). An existing snapshot is kept as is. */
export async function writeSnapshot(dir: string, files: Map<string, string | Buffer>) {
  try { if ((await stat(dir)).isDirectory()) return; } catch { /* not there yet */ }
  const tmp = `${dir}.tmp-${randomUUID()}`;
  try {
    for (const [path, data] of files) {
      const target = resolve(tmp, path);
      if (!target.startsWith(tmp + sep)) throw new Error('Invalid snapshot file');
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, data);
    }
    await mkdir(dirname(dir), { recursive: true });
    await rename(tmp, dir);
  } catch (error) { await rm(tmp, { recursive: true, force: true }); throw error; }
}
/** Reads a file of a snapshot; any path outside it is refused. */
export async function readSnapshotFile(dir: string, path: string): Promise<Buffer | null> {
  const target = resolve(dir, path);
  if (!target.startsWith(dir + sep)) return null;
  try { const s = await stat(target); if (!s.isFile()) return null; return await readFile(target); } catch { return null; }
}
export const contentType = (path: string) => path.endsWith('.html') ? 'text/html; charset=utf-8' : path.endsWith('.css') ? 'text/css; charset=utf-8' : path.endsWith('.png') ? 'image/png' : path.endsWith('.jpg') ? 'image/jpeg' : path.endsWith('.webp') ? 'image/webp' : path.endsWith('.woff') ? 'font/woff' : path.endsWith('.ttf') ? 'font/ttf' : path.endsWith('.xml') ? 'application/xml; charset=utf-8' : path.endsWith('.txt') ? 'text/plain; charset=utf-8' : 'application/octet-stream';
/** URL path → file inside a site: «/» and «/page/» map to index.html; nothing else is guessed. */
export function filePathFor(urlPath: string) {
  let p: string;
  try { p = decodeURIComponent(urlPath); } catch { return null; }
  if (p.includes('\0') || p.includes('\\') || p.split('/').some(seg => seg === '..' || seg === '.')) return null;
  if (p.endsWith('/')) p += 'index.html';
  p = p.replace(/^\/+/, '');
  return /^[A-Za-z0-9._/-]{1,200}$/.test(p) ? p : null;
}
export const joinPath = join;
