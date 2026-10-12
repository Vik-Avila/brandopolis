/**
 * ADR-0032 · public site server. A separate process and origin: it serves only published snapshots, never reads,
 * sets or logs cookies, has no route of the private API, and answers 404 for unknown hosts or sites without a live
 * publication. Pages contain no scripts; the CSP forbids them. The contact form posts here, is checked (honeypot,
 * size, rate limits, fields) and is saved through the existing Clientes capture; success is shown only after the
 * opportunity is stored (POST → 303 → thank-you page).
 *
 * Duplicates are stopped on the server, not by the browser: the page's submission id is the Clientes capture key
 * (unique per form in the database), so a retry after a lost response, two simultaneous posts or going back and
 * sending the same page again all return the same record. The HTML is `private, no-cache`, so no shared cache may
 * hand one page (and its id) to several visitors; if one ever did, or a visitor goes back and changes the request, the
 * same id arrives with other content. That submission is then kept as its own opportunity under a key derived from the
 * id and its content (deterministic, so its own retries still collapse): nothing is merged, lost or blocked.
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { createHash, randomUUID } from 'node:crypto';
import type { Engine } from '../application/engine.js';
import { AppError } from '../domain/contracts.js';
import { CLICK_ID_KEYS, UTM_KEYS } from '../domain/clients.js';
import { SUBMISSION_PLACEHOLDER, TRACKING_PLACEHOLDER } from '../domain/site-render.js';
import { RateLimiter } from './http.js';
import { contentType, filePathFor, readSnapshotFile, snapshotDir } from './site-files.js';

const CSP = "default-src 'none'; style-src 'self'; img-src 'self'; font-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'";
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const safeParam = (v: string | null) => (v && /^[\p{L}\p{N} ._~:+\-|/()%,]{1,200}$/u.test(v) ? v : null);

function headers(res: ServerResponse, type: string, extra: Record<string, string> = {}) {
  res.writeHead(res.statusCode || 200, { 'Content-Type': type, 'Content-Security-Policy': CSP, 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'Cache-Control': type.startsWith('text/html') ? 'private, no-cache' : 'public, max-age=300', ...extra });
}
function page(res: ServerResponse, status: number, title: string, body: string) {
  res.statusCode = status;
  headers(res, 'text/html; charset=utf-8');
  res.end(`<!doctype html><html lang="es-MX"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)}</title><link rel="stylesheet" href="/styles.css"></head><body><main id="contenido"><section><h1>${esc(title)}</h1>${body}</section></main></body></html>`);
}
const notFound = (res: ServerResponse) => { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Content-Security-Policy': CSP, 'Cache-Control': 'no-store' }); res.end('No encontrado'); };

async function form(req: IncomingMessage): Promise<URLSearchParams> {
  if (!String(req.headers['content-type'] ?? '').startsWith('application/x-www-form-urlencoded')) throw new AppError('INVALID', 'Form required');
  let body = '';
  for await (const chunk of req) { body += chunk.toString(); if (body.length > 16000) throw new AppError('INVALID', 'Too large'); }
  return new URLSearchParams(body);
}

/** Fills the per-request placeholders of a page: a fresh submission id and the acquisition fields of this visit. */
export function personalize(html: string, url: URL, referer: string | undefined) {
  const hidden: string[] = [];
  for (const k of UTM_KEYS) { const v = safeParam(url.searchParams.get(`utm_${k}`)); if (v) hidden.push(`<input type="hidden" name="utm_${k}" value="${esc(v)}">`); }
  for (const k of CLICK_ID_KEYS) { const v = safeParam(url.searchParams.get(k)); if (v) hidden.push(`<input type="hidden" name="${k}" value="${esc(v)}">`); }
  hidden.push(`<input type="hidden" name="landing" value="${esc(url.pathname.slice(0, 300))}">`);
  if (referer && /^https?:\/\//.test(referer)) { try { const h = new URL(referer).hostname; if (/^[a-z0-9.-]{1,253}$/.test(h)) hidden.push(`<input type="hidden" name="referrer" value="https://${esc(h)}/">`); } catch { /* ignore */ } }
  return html.split(SUBMISSION_PLACEHOLDER).join(randomUUID()).replace(TRACKING_PLACEHOLDER, hidden.join(''));
}

/** Key for a submission that reuses a page id with other content: the id plus a digest of the posted fields. */
export function derivedSubmission(submissionId: string, f: URLSearchParams) {
  const fields = [...f.entries()].filter(([k]) => k !== 'submission').sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `${submissionId.slice(0, 40)}-${createHash('sha256').update(JSON.stringify(fields)).digest('hex').slice(0, 20)}`;
}

export function createPublicSiteServer(engine: Engine, options: { limiter?: RateLimiter } = {}) {
  const limiter = options.limiter ?? new RateLimiter();
  return createServer(async (req, res) => {
    try {
      const host = String(req.headers.host ?? '').toLowerCase();
      const live = await engine.resolvePublicSite(host);
      if (!live) return notFound(res);
      const url = new URL(req.url ?? '/', `http://${host}`), dir = snapshotDir(live.workspaceId, live.brandId, live.siteId, live.versionId);
      const client = req.socket.remoteAddress ?? 'unknown';
      if (req.method === 'POST' && url.pathname === '/__form') {
        if (!limiter.allow(`site-form:${client}`, 10, 600000) || !limiter.allow(`site-form-site:${live.siteId}`, 300, 3600000)) return page(res, 429, 'Demasiados envíos', '<p>Espera un momento y vuelve a intentarlo.</p>');
        if (!live.formPublicId) return page(res, 404, 'Formulario no disponible', '<p>Este sitio no recibe solicitudes ahora.</p>');
        let f: URLSearchParams;
        try { f = await form(req); } catch { return page(res, 400, 'No pudimos leer tu solicitud', '<p>Vuelve atrás e inténtalo de nuevo.</p>'); }
        if (f.get('website')) return page(res, 400, 'No pudimos procesar tu solicitud', '<p>Vuelve atrás e inténtalo de nuevo.</p>');
        const pick = (keys: readonly string[], prefix = '') => Object.fromEntries(keys.map(k => [k, f.get(prefix + k)]).filter(([, v]) => v));
        const submissionId = f.get('submission') ?? '';
        try {
          const input = { form: live.formPublicId, submissionId, name: f.get('name'), email: f.get('email'), phone: f.get('phone'), need: f.get('need'), consent: { contactPurpose: f.get('contactPurpose') === 'yes', marketingOptIn: f.get('marketingOptIn') === 'yes' }, utm: pick(UTM_KEYS, 'utm_'), clickIds: pick(CLICK_ID_KEYS), landingPath: f.get('landing'), referrer: f.get('referrer') };
          const saved = await engine.submitLeadForm(input).catch(error => {
            if (!(error instanceof AppError && error.code === 'CONFLICT')) throw error;
            return engine.submitLeadForm({ ...input, submissionId: derivedSubmission(submissionId, f) });
          });
          res.writeHead(303, { Location: `/__gracias?ref=${encodeURIComponent(saved.reference)}`, 'Content-Security-Policy': CSP, 'Cache-Control': 'no-store' });
          return res.end();
        } catch (error) {
          if (error instanceof AppError && error.code === 'INVALID') return page(res, 400, 'Revisa tus datos', '<p>Deja tu nombre, un correo o teléfono válido, qué necesitas y acepta que te contacten. Vuelve atrás para corregirlo; tus datos siguen en el formulario.</p>');
          if (error instanceof AppError && error.code === 'CONFLICT') return page(res, 409, 'Esta solicitud ya se envió con otros datos', '<p>Vuelve a cargar la página para enviar una solicitud nueva.</p>');
          return page(res, 503, 'No pudimos confirmar tu envío', '<p>No se guardó la confirmación. Vuelve atrás y envíalo otra vez: si ya llegó, no se duplicará.</p>');
        }
      }
      if (req.method !== 'GET' && req.method !== 'HEAD') return notFound(res);
      if (url.pathname === '/__gracias') {
        const ref = /^OP-[0-9A-F]{8}$/.test(url.searchParams.get('ref') ?? '') ? url.searchParams.get('ref')! : '';
        return page(res, 200, 'Recibimos tu solicitud', `<p>${ref ? `Referencia: <strong>${esc(ref)}</strong>. ` : ''}Te contactaremos por el medio que dejaste.</p><p><a href="/">Volver al inicio</a></p>`);
      }
      const path = filePathFor(url.pathname);
      if (!path) return notFound(res);
      const data = await readSnapshotFile(dir, path);
      if (!data) return notFound(res);
      res.statusCode = 200;
      if (path.endsWith('.html')) { headers(res, contentType(path)); return res.end(req.method === 'HEAD' ? undefined : personalize(data.toString('utf8'), url, req.headers.referer)); }
      headers(res, contentType(path));
      res.end(req.method === 'HEAD' ? undefined : data);
    } catch { if (!res.headersSent) { res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }); res.end('No disponible'); } }
  });
}
