/**
 * ADR-0032 · ZIP export of one exact approved version (portability; it never replaces publishing). The files are the
 * renderer's, built from the same plan as a publication, with three differences for a copy hosted elsewhere:
 * - the contact section has no form (it shows OFFLINE_FORM_NOTICE): outside Brandopolis there is no operative,
 *   authorized destination, so nothing pretends to send;
 * - links are relative and point to the page file, so the copy opens from a folder or under any path;
 * - no sitemap or canonical address (they depend on where it is hosted).
 * It adds LEEME.txt (what it contains, how to use it, what needs Brandopolis services) and manifest.json (site, version
 * number, content fingerprint and SHA-256 of every file). Nothing else leaves: no preview links, no internal notes or
 * sources of testimonials and figures, no ids of workspace or brand, no credentials, no other brand's files. Fonts are
 * included only when the kit declares web embedding permission (the same rule as publishing).
 */
import { createHash } from 'node:crypto';
import JSZip from 'jszip';
import { slugify } from '../domain/site.js';
import { buildSiteFiles, type FileLoader, type RenderPlan } from './site-files.js';

export type SiteExportSource = { plan: RenderPlan; siteName: string; slug: string; sequence: number; fingerprint: string; approvedAt: string; live: boolean };

/** Root-relative links of one page → relative to its folder, with directory links pointing to their index.html. */
export function relativize(html: string, path: string) {
  const up = '../'.repeat(path.split('/').length - 1);
  return html.replace(/(href|src)="\/(?!\/)([^"#]*)(#[^"]*)?"/g, (_m, attr: string, target: string, hash = '') => `${attr}="${up}${target === '' || target.endsWith('/') ? `${target}index.html` : target}${hash}"`);
}

function readme(s: SiteExportSource, files: string[], notices: string[]) {
  const lines = [
    `Sitio «${s.siteName}» · versión ${s.sequence} (aprobada el ${s.approvedAt.slice(0, 10)})`,
    `Huella del contenido: ${s.fingerprint}`,
    '',
    'QUÉ CONTIENE',
    '- Las páginas del sitio en HTML (sin JavaScript), la hoja de estilos con los colores del kit y las imágenes y',
    '  tipografías del kit que usa esta versión.',
    '- manifest.json: versión exportada y la huella SHA-256 de cada archivo, para comprobar que nada cambió.',
    '',
    'CÓMO USARLO',
    '- Para verlo: descomprime la carpeta y abre index.html en el navegador.',
    '- Para alojarlo: sube todo el contenido de la carpeta a cualquier alojamiento de archivos estáticos.',
    '  Los enlaces son relativos, así que funciona en la raíz del dominio o en una subcarpeta.',
    '',
    'QUÉ NECESITA LOS SERVICIOS DE BRANDOPOLIS',
    '- Formulario de contacto: en esta copia no envía nada; la página lo dice a quien la visita. Las solicitudes sólo se',
    '  reciben en el sitio publicado por Brandopolis, que las guarda en Clientes. Para recibirlas fuera hay que conectar',
    '  un destino propio y autorizado, con su aviso de privacidad; esta copia no lo incluye.',
    '- Publicación, versiones, restauración, vista previa y dominio verificado: sólo dentro de Brandopolis.',
    '- Medición y consentimiento: esta copia no carga etiquetas de medición ni aviso de cookies. Si añades medición',
    '  donde la alojes, necesitarás tu propio aviso de privacidad y, si corresponde, consentimiento.',
    '- HTTPS y dominio: dependen del alojamiento que elijas.',
    '',
    'LICENCIAS',
    '- Las tipografías incluidas tienen permiso de uso web declarado en el kit de marca. Revisa su licencia si cambias',
    '  de dominio o de uso. Si una tipografía no tenía ese permiso, no se incluye y se usa la del sistema.',
    '- Imágenes y textos son de la marca; usa esta copia sólo con su autorización.',
    '',
    `ARCHIVOS (${files.length})`,
    ...files.map(f => `- ${f}`),
  ];
  if (notices.length) lines.push('', 'AVISOS DE ESTA EXPORTACIÓN', ...notices.map(n => `- ${n}`));
  return lines.join('\r\n') + '\r\n';
}

/** Builds the ZIP of the version. Deterministic for the same version and day (fixed file dates). */
export async function buildSiteZip(s: SiteExportSource, load: FileLoader, now = new Date()) {
  const built = await buildSiteFiles(s.plan, load, { baseUrl: null, noindex: false, form: 'NONE' });
  const files = new Map<string, string | Buffer>();
  for (const [path, data] of built.files) files.set(path, typeof data === 'string' && path.endsWith('.html') ? relativize(data, path) : typeof data === 'string' && path.endsWith('.css') ? data.replace(/url\("\//g, 'url("') : data);
  const paths = [...files.keys()].sort();
  const manifest = { format: 'brandopolis-site-export/1', site: s.siteName, version: s.sequence, approvedAt: s.approvedAt, contentFingerprint: s.fingerprint, files: paths.map(p => ({ path: p, sha256: createHash('sha256').update(files.get(p)!).digest('hex') })) };
  const folder = `${slugify(s.siteName) || s.slug || 'sitio'}-v${s.sequence}`;
  const zip = new JSZip(), date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  for (const p of paths) zip.file(`${folder}/${p}`, files.get(p)!, { date });
  zip.file(`${folder}/manifest.json`, JSON.stringify(manifest, null, 2) + '\n', { date });
  zip.file(`${folder}/LEEME.txt`, readme(s, paths, built.notices), { date });
  const bytes = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', platform: 'DOS' });
  return { bytes, filename: `${folder}.zip`, notices: built.notices, manifest };
}
