/**
 * ADR-0032 · deterministic site renderer. Pure: SiteVersion content + a theme derived from the kit + the list of
 * processed images → static text files (escaped HTML per page, theme CSS, sitemap.xml, robots.txt). No network, no
 * database, no scripts: the pages contain no JavaScript at all. Binary files (images, fonts) are copied by the
 * publisher from the kit after validation; the renderer only references them by path.
 *
 * Two placeholders are left for the public server, which fills them per request with escaped values: the contact
 * form's submission id (so a re-submission is recognised) and the hidden acquisition fields (UTM, click ids).
 */
import type { Page, ProofSource, Section, SiteContent } from './site.js';

export type Theme = {
  brandName: string; primary: string; text: string; background: string; accent: string;
  headingFont: string; bodyFont: string; fontFaces: { family: string; path: string; format: 'woff2' | 'woff' | 'truetype' }[];
  logo: { path: string; alt: string } | null;
};
export type RenderImage = { path: string; width: number; height: number };
/** formAction null (ZIP copy): the contact section shows formPrivacy as a notice instead of a form that cannot send. */
export type RenderOptions = { baseUrl: string | null; noindex: boolean; formAction: string | null; formPrivacy: string };
export const SUBMISSION_PLACEHOLDER = '__BP_SUBMISSION__';
export const TRACKING_PLACEHOLDER = '<!--BP_TRACKING-->';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const hex = (v: string, fallback: string) => (/^#[0-9A-Fa-f]{6}$/.test(v) ? v.toUpperCase() : fallback);
const fontName = (v: string) => v.replace(/[^\p{L}\p{N} -]/gu, '').trim().slice(0, 60);
const paragraphs = (s: string) => s.split(/\n{2,}/).map(p => p.trim()).filter(Boolean).map(p => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
export const pagePath = (p: Page) => (p.slug ? `${p.slug}/index.html` : 'index.html');
const pageUrl = (p: Page) => (p.slug ? `/${p.slug}/` : '/');

function href(target: string, c: SiteContent) {
  if (target === '#contacto') { const page = c.pages.find(p => p.sections.some(s => s.type === 'CONTACT')); return page ? `${pageUrl(page)}#contacto` : '#'; }
  if (target.startsWith('page:')) { const page = c.pages.find(p => p.id === target.slice(5)); return page ? pageUrl(page) : '#'; }
  return target; // https URL validated by normalizeSite
}
const sample = (src: ProofSource | null) => (src?.kind === 'PERSON' && src.example ? '<p class="sample">Ejemplo de demostración: no es un dato real.</p>' : '');
const external = (url: string) => url.startsWith('https://') ? ' rel="noopener noreferrer"' : '';

function sectionHtml(s: Section, c: SiteContent, images: Map<string, RenderImage>, o: RenderOptions) {
  const img = (assetId: string | null, alt: string, cls: string) => { const i = assetId ? images.get(assetId) : undefined; return i ? `<img class="${cls}" src="/${esc(i.path)}" alt="${esc(alt)}" width="${i.width}" height="${i.height}" loading="lazy">` : ''; };
  switch (s.type) {
    case 'HERO': { const link = s.ctaLabel && s.ctaTarget ? href(s.ctaTarget, c) : ''; return `<section class="hero">${img(s.imageAssetId, s.imageAlt, 'hero-image')}<div class="hero-text"><h1>${esc(s.title)}</h1>${s.subtitle ? `<p class="lead">${esc(s.subtitle)}</p>` : ''}${link ? `<a class="button" href="${esc(link)}"${external(link)}>${esc(s.ctaLabel)}</a>` : ''}</div></section>`; }
    case 'TEXT': return `<section class="text">${s.heading ? `<h2>${esc(s.heading)}</h2>` : ''}${paragraphs(s.body)}</section>`;
    case 'OFFERS': return `<section class="offers">${s.heading ? `<h2>${esc(s.heading)}</h2>` : ''}<ul class="cards">${s.items.map(i => `<li class="card"><h3>${esc(i.name)}</h3>${paragraphs(i.description)}</li>`).join('')}</ul></section>`;
    case 'IMAGE': return `<figure class="image">${img(s.assetId, s.alt, 'image-file')}${s.caption ? `<figcaption>${esc(s.caption)}</figcaption>` : ''}</figure>`;
    case 'CTA': { const link = href(s.target, c); return `<section class="cta">${s.heading ? `<h2>${esc(s.heading)}</h2>` : ''}${s.text ? `<p>${esc(s.text)}</p>` : ''}<a class="button" href="${esc(link)}"${external(link)}>${esc(s.label)}</a></section>`; }
    case 'FAQ': return `<section class="faq">${s.heading ? `<h2>${esc(s.heading)}</h2>` : ''}${s.items.map(i => `<details><summary>${esc(i.question)}</summary>${paragraphs(i.answer)}</details>`).join('')}</section>`;
    // Testimonials and figures: the source is kept in the version for review, never printed; DEMO samples say so.
    case 'TESTIMONIALS': return `<section class="testimonials">${s.heading ? `<h2>${esc(s.heading)}</h2>` : ''}<ul class="quotes">${s.items.map(i => `<li class="quote"><blockquote><p>${esc(i.quote)}</p></blockquote><p class="who">${esc(i.author)}${i.role ? `, ${esc(i.role)}` : ''}</p>${sample(i.source)}</li>`).join('')}</ul></section>`;
    case 'FIGURES': return `<section class="figures">${s.heading ? `<h2>${esc(s.heading)}</h2>` : ''}<ul class="figure-list">${s.items.map(i => `<li class="figure"><strong class="figure-value">${esc(i.value)}</strong><span class="figure-label">${esc(i.label)}</span>${i.context ? `<span class="figure-context">${esc(i.context)}</span>` : ''}${sample(i.source)}</li>`).join('')}</ul></section>`;
    case 'CONTACT': if (o.formAction === null) return `<section class="contact" id="contacto">${s.heading ? `<h2>${esc(s.heading)}</h2>` : ''}${s.text ? `<p>${esc(s.text)}</p>` : ''}<p class="form-off">${esc(o.formPrivacy)}</p></section>`;
      return `<section class="contact" id="contacto">${s.heading ? `<h2>${esc(s.heading)}</h2>` : ''}${s.text ? `<p>${esc(s.text)}</p>` : ''}
<form method="post" action="${esc(o.formAction)}" class="contact-form">
<input type="hidden" name="submission" value="${SUBMISSION_PLACEHOLDER}">${TRACKING_PLACEHOLDER}
<div class="trap" aria-hidden="true"><label for="website">No completes este campo</label><input id="website" name="website" tabindex="-1" autocomplete="off"></div>
<label for="name">Nombre</label><input id="name" name="name" maxlength="160" autocomplete="name" required>
<label for="email">Correo</label><input id="email" name="email" type="email" maxlength="254" autocomplete="email">
<label for="phone">Teléfono</label><input id="phone" name="phone" type="tel" maxlength="40" autocomplete="tel">
<p class="hint">Deja al menos un correo o un teléfono para que te podamos responder.</p>
<label for="need">¿En qué te podemos ayudar?</label><textarea id="need" name="need" maxlength="2000" rows="4" required></textarea>
<label class="check"><input type="checkbox" name="contactPurpose" value="yes" required> <span>Acepto que me contacten sobre esta solicitud.</span></label>
<label class="check"><input type="checkbox" name="marketingOptIn" value="yes"> <span>Opcional: también quiero recibir novedades y promociones.</span></label>
<p class="hint">${esc(o.formPrivacy)}</p>
<button type="submit" class="button">Enviar</button>
</form></section>`;
  }
}

function layout(c: SiteContent, theme: Theme, page: Page, body: string, o: RenderOptions) {
  const nav = c.navigation.map(id => c.pages.find(p => p.id === id)).filter((p): p is Page => !!p);
  const canonical = o.baseUrl ? `<link rel="canonical" href="${esc(o.baseUrl + pageUrl(page))}">` : '';
  return `<!doctype html>
<html lang="es-MX"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(page.title ? `${page.title} · ${theme.brandName}` : theme.brandName)}</title><meta name="description" content="${esc(page.description)}">${o.noindex ? '<meta name="robots" content="noindex, nofollow">' : ''}${canonical}
<link rel="stylesheet" href="/styles.css"></head>
<body><a class="skip" href="#contenido">Ir al contenido</a>
<header class="site-header"><a class="brand" href="/">${theme.logo ? `<img src="/${esc(theme.logo.path)}" alt="${esc(theme.logo.alt)}" height="40">` : esc(theme.brandName)}</a>${nav.length > 1 ? `<nav aria-label="Principal"><ul>${nav.map(p => `<li><a href="${pageUrl(p)}"${p.id === page.id ? ' aria-current="page"' : ''}>${esc(p.title)}</a></li>`).join('')}</ul></nav>` : ''}</header>
<main id="contenido">${body}</main>
<footer class="site-footer"><p>© ${esc(theme.brandName)}</p></footer>
</body></html>
`;
}

function css(theme: Theme) {
  const primary = hex(theme.primary, '#1D2A26'), text = hex(theme.text, '#1F2523'), bg = hex(theme.background, '#FFFFFF'), accent = hex(theme.accent, primary);
  const faces = theme.fontFaces.map(f => `@font-face{font-family:"${fontName(f.family)}";src:url("/${esc(f.path)}") format("${f.format}");font-display:swap}`).join('\n');
  const stack = (f: string) => `${f ? `"${fontName(f)}", ` : ''}system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`;
  return `${faces}
:root{--primary:${primary};--text:${text};--bg:${bg};--accent:${accent};--heading:${stack(theme.headingFont)};--body:${stack(theme.bodyFont)}}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}body{margin:0;background:var(--bg);color:var(--text);font:17px/1.6 var(--body)}
img{max-width:100%;height:auto}a{color:var(--primary)}h1,h2,h3{font-family:var(--heading);line-height:1.2;color:var(--primary)}
.skip{position:absolute;left:-9999px}.skip:focus{left:16px;top:16px;background:#fff;padding:8px}
.site-header{display:flex;flex-wrap:wrap;gap:12px 24px;align-items:center;justify-content:space-between;padding:16px clamp(16px,5vw,64px);border-bottom:1px solid rgba(0,0,0,.08)}
.brand{font:700 20px/1 var(--heading);text-decoration:none;color:var(--primary)}.site-header ul{display:flex;flex-wrap:wrap;gap:8px 20px;list-style:none;margin:0;padding:0}.site-header nav a{text-decoration:none;color:var(--text)}.site-header nav a[aria-current]{color:var(--primary);font-weight:700}
main{max-width:1080px;margin:0 auto;padding:0 clamp(16px,5vw,64px) 48px}section,figure{margin:48px 0}
.hero{display:grid;gap:24px;align-items:center}@media(min-width:800px){.hero{grid-template-columns:1fr 1fr}}.hero h1{font-size:clamp(32px,6vw,52px);margin:0 0 12px}.lead{font-size:20px}
.button{display:inline-block;min-height:44px;padding:12px 22px;border-radius:8px;background:var(--primary);color:#fff;text-decoration:none;font-weight:700;border:0;font-size:17px;cursor:pointer}
.cards{list-style:none;padding:0;display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(240px,1fr))}.card{padding:20px;border:1px solid rgba(0,0,0,.1);border-radius:12px}
.quotes,.figure-list{list-style:none;padding:0;display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(240px,1fr))}.quote,.figure{padding:20px;border-left:4px solid var(--accent);background:rgba(0,0,0,.03);border-radius:8px}blockquote{margin:0;font-size:19px}.who{font-weight:700;margin:8px 0 0}
.figure{display:grid;gap:4px}.figure-value{font:700 clamp(28px,5vw,40px)/1.1 var(--heading);color:var(--primary)}.figure-context{font-size:15px;opacity:.8}.sample,.form-off{font-size:15px;padding:8px 12px;border:1px dashed currentColor;border-radius:8px}
.cta{padding:32px;border-radius:12px;background:rgba(0,0,0,.04)}figcaption{font-size:15px;opacity:.8}
details{border-bottom:1px solid rgba(0,0,0,.1);padding:12px 0}summary{cursor:pointer;font-weight:700}
.contact-form{display:grid;gap:8px;max-width:560px}.contact-form label{font-weight:700}.contact-form input:not([type=checkbox]),.contact-form textarea{width:100%;font:inherit;padding:10px 12px;border:1px solid rgba(0,0,0,.3);border-radius:8px}
.contact-form .check{display:flex;gap:8px;font-weight:400}.hint{font-size:15px;opacity:.8;margin:0}.trap{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}
:focus-visible{outline:3px solid var(--accent);outline-offset:2px}.site-footer{padding:24px clamp(16px,5vw,64px);border-top:1px solid rgba(0,0,0,.08);font-size:15px}
`;
}

/** Renders every text file of a version. Same input → same output (tested with snapshots). */
export function renderSite(c: SiteContent, theme: Theme, images: Map<string, RenderImage>, o: RenderOptions): Map<string, string> {
  const files = new Map<string, string>();
  for (const page of c.pages) files.set(pagePath(page), layout(c, theme, page, page.sections.map(s => sectionHtml(s, c, images, o)).join('\n'), o));
  files.set('styles.css', css(theme));
  if (o.baseUrl) {
    files.set('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${c.pages.map(p => `<url><loc>${esc(o.baseUrl + pageUrl(p))}</loc></url>`).join('')}</urlset>\n`);
    files.set('robots.txt', o.noindex ? 'User-agent: *\nDisallow: /\n' : `User-agent: *\nAllow: /\nSitemap: ${o.baseUrl}/sitemap.xml\n`);
  }
  return files;
}
