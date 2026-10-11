/**
 * ADR-0032 · authenticated preview on its own origin (dev 127.0.0.2). Not a signed link: access starts and ends in the
 * same browser.
 *  1. A clean URL without a preview session starts a browser transaction: random state + secret verifier in a
 *     host-only cookie (HttpOnly, SameSite=Lax, 5 minutes); the app receives the state and the derived challenge only.
 *  2. The app identifies the person with their own session (confirmation page + same-site action) and issues a
 *     single-use code bound to person, brand, version, state and challenge.
 *  3. Here the code is redeemed once with this browser's verifier; only then a preview session cookie is created
 *     (HttpOnly, SameSite=Strict, 30 minutes) and the transaction cookie removed. A code copied to another browser
 *     has no transaction cookie and fails.
 * Every request (HTML, CSS, images, fonts) re-checks the session and the permission: a team member with the brand,
 * or a guest with that exact version shared. noindex, no-store, no-referrer. Codes and sessions are never logged.
 */
import { createServer, type ServerResponse } from 'node:http';
import type { Engine } from '../application/engine.js';
import { challengeOf, newToken } from '../domain/site.js';
import { siteConfig } from '../application/site-config.js';
import { buildSiteFiles, contentType, filePathFor, type FileLoader } from './site-files.js';

const CSP = "default-src 'none'; style-src 'self'; img-src 'self'; font-src 'self'; form-action 'none'; base-uri 'none'; frame-ancestors 'none'";
const TX = 'bp_preview_tx', SESSION = 'bp_preview';
const common = { 'Content-Security-Policy': CSP, 'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff' };
const cookie = (header: string | undefined, name: string) => header?.split(';').map(v => v.trim()).find(v => v.startsWith(`${name}=`))?.slice(name.length + 1);
const deny = (res: ServerResponse, status = 404) => { res.writeHead(status, { ...common, 'Content-Type': 'text/plain; charset=utf-8' }); res.end(status === 404 ? 'No disponible' : 'Sin acceso'); };
const CLEAN = /^\/b\/([A-Za-z0-9-]{1,80})\/v\/([A-Za-z0-9-]{1,80})(\/.*)?$/;

export function createPreviewServer(engine: Engine, load: FileLoader) {
  return createServer(async (req, res) => {
    try {
      const cfg = siteConfig(), url = new URL(req.url ?? '/', cfg.previewOrigin), secure = cfg.secure ? '; Secure' : '';
      if (req.method !== 'GET') return deny(res);
      // Step 3: redeem the code with this browser's transaction.
      if (url.pathname === '/__preview/callback') {
        const tx = cookie(req.headers.cookie, TX), [state, verifier] = (tx ?? '').split('.');
        const back = url.searchParams.get('return') ?? '';
        if (!state || !verifier || url.searchParams.get('state') !== state || !CLEAN.test(back)) return deny(res, 403);
        let session: { token: string; versionId: string };
        try { session = await engine.exchangeSitePreviewCode({ code: url.searchParams.get('code'), state, verifier }); } catch { return deny(res, 403); }
        if (CLEAN.exec(back)![2] !== session.versionId) return deny(res, 403);
        // A same-origin navigation (not a redirect chain started on another site) so the Strict cookie is sent next.
        res.writeHead(200, { ...common, 'Content-Type': 'text/html; charset=utf-8', 'Set-Cookie': [`${SESSION}=${session.token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=1800${secure}`, `${TX}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`] });
        return res.end(`<!doctype html><html lang="es-MX"><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=${back.replace(/"/g, '')}"><title>Abriendo vista previa</title></head><body><p><a href="${back.replace(/"/g, '')}">Abrir la vista previa</a></p></body></html>`);
      }
      const m = CLEAN.exec(url.pathname);
      if (!m) return deny(res);
      const [, brandId, versionId, rest = '/'] = m;
      const access = await engine.sitePreviewAccess(cookie(req.headers.cookie, SESSION), versionId);
      if (!access || access.brandId !== brandId) {
        // Step 1: only an HTML page request starts a transaction; resources without a session are simply denied.
        if (rest.match(/\.(css|png|jpg|webp|woff|ttf)$/)) return deny(res, 403);
        const state = newToken(24), verifier = newToken(32);
        const confirm = `${cfg.appOrigin}/preview/confirm?brand=${encodeURIComponent(brandId)}&version=${encodeURIComponent(versionId)}&state=${state}&challenge=${challengeOf(verifier)}&return=${encodeURIComponent(url.pathname)}`;
        res.writeHead(303, { ...common, Location: confirm, 'Set-Cookie': `${TX}=${state}.${verifier}; HttpOnly; SameSite=Lax; Path=/; Max-Age=300${secure}` });
        return res.end();
      }
      const path = filePathFor(rest);
      if (!path) return deny(res);
      const plan = await engine.siteRenderPlan({ workspaceId: access.workspaceId, brandId: access.brandId }, versionId);
      const built = await buildSiteFiles(plan, load, { baseUrl: null, noindex: true });
      // Links inside the preview stay under the clean prefix of this version.
      const prefix = `/b/${brandId}/v/${versionId}`;
      const data = built.files.get(path);
      if (data === undefined) return deny(res);
      res.writeHead(200, { ...common, 'Content-Type': contentType(path) });
      if (typeof data === 'string' && path.endsWith('.html')) return res.end(data.replace(/(href|src)="\/(?!\/)/g, `$1="${prefix}/`).replace(/action="\/__form"/g, 'action="#"').replace('<body>', `<body><p class="hint preview-banner">Vista previa · ${access.as === 'GUEST' ? 'versión compartida contigo' : 'versión interna'} · no se publica ni recibe solicitudes</p>`));
      if (typeof data === 'string' && path.endsWith('.css')) return res.end(data.replace(/url\("\//g, `url("${prefix}/`));
      res.end(data);
    } catch { if (!res.headersSent) deny(res, 503); }
  });
}
