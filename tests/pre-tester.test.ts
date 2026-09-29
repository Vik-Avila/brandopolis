import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { assetPath } from '../src/transport/assets.js';

const html = readFileSync('src/transport/public/index.html', 'utf8');
const app = readFileSync('src/transport/public/app.js', 'utf8');
const views = readFileSync('src/transport/public/product-views.js', 'utf8');
const responsive = readFileSync('src/transport/public/product-responsive.css', 'utf8');

describe('pre-tester hardening', () => {
  it('serves the public legal routes Google OAuth production requires', () => {
    // Every view returns the same document; routing happens client-side.
    for (const route of ['/privacidad', '/privacidad/', '/terminos', '/terminos/'])
      expect(assetPath(route), route).toBe('/');
    // An unknown route must still 404 rather than silently serving the app.
    expect(assetPath('/no-existe')).toBeUndefined();
    expect(html).toContain('id="privacidad"');
    expect(html).toContain('id="terminos"');
    expect(html).toContain('Política de Privacidad');
    expect(html).toContain('Términos del piloto');
    // Both start hidden and are revealed by the client router.
    expect(html).toMatch(/<section id="privacidad"[^>]*\shidden/);
    expect(html).toMatch(/<section id="terminos"[^>]*\shidden/);
    expect(app).toContain("['/privacidad','/terminos'].includes(legalPath)");
  });

  it('exposes the canonical contact address and links both documents from the footer', () => {
    const footer = html.slice(html.indexOf('<footer'));
    expect(footer).toContain('href="/privacidad/"');
    expect(footer).toContain('href="/terminos/"');
    expect(footer).toContain('mailto:contacto@brandopolis.ai');
    // No other contact address may creep into the public document.
    const addresses = new Set([...html.matchAll(/[A-Za-z0-9._%+-]+@brandopolis\.ai/g)].map(m => m[0]));
    expect([...addresses]).toEqual(['contacto@brandopolis.ai']);
  });

  it('names the Estratega de Marca instead of "humana" in participant-facing copy', () => {
    // The role is named where the copy refers to the person doing the work.
    expect(app).toContain('Estratega de Marca');
    // No participant-role "humana/humano" phrasing survives in the served application copy.
    for (const banned of [
      'revisión humana', 'Revisión humana', 'decisión humana', 'Decisión humana',
      'Aportación humana', 'Aportaciones humanas', 'Aporte humano',
      'Evaluación humana', 'versión humana', 'aprobación humana'
    ]) {
      expect(app, `app.js still contains "${banned}"`).not.toContain(banned);
      expect(views, `product-views.js still contains "${banned}"`).not.toContain(banned);
    }
    // The doctrine itself is untouched.
    expect(html).toContain('La IA propone. Tú decides. Brandopolis recuerda.');
  });

  it('keeps the AI activity panel inside the viewport on phones', () => {
    // product-shell.css sets `.primary-workspace > .ai-activity {width:100%}` with no media query, which
    // outranks a bare `.ai-activity`. The phone rule must match that specificity or the fixed panel is
    // one viewport wide starting at its left inset and overflows by exactly that amount.
    const at = responsive.indexOf('.ai-activity, .primary-workspace > .ai-activity');
    expect(at, 'phone rule must match the shell selector specificity').toBeGreaterThan(-1);
    const rule = responsive.slice(at, responsive.indexOf('}', at));
    expect(rule).toContain('position: fixed;');
    expect(rule).toContain('width: auto;');
    expect(rule).toContain('max-width: none;');
    // It must live inside the phone breakpoint rather than applying everywhere.
    expect(responsive.lastIndexOf('@media (max-width: 760px)', at)).toBeGreaterThan(-1);
  });

  it('shows the PILOT mode label on phones while keeping the long DEMO label out of the way', () => {
    // Measured: PILOT costs 38px and fits; DEMO LOCAL costs 74px of a 358px row and starves the selector.
    expect(app).toContain("document.body.dataset.mode='PILOT'");
    expect(responsive).toContain('body[data-mode="PILOT"].app header #mode-badge');
    const phoneRules = responsive.slice(responsive.indexOf('@media (max-width: 767px)'));
    expect(phoneRules).toContain('.app header #mode-badge');
  });
});

describe('final pre-tester workspace UX', () => {
  it('asks for strategic geography in the canonical new-brand dialog, optionally', () => {
    // One implementation: the dialog posts to the existing endpoint rather than duplicating persistence.
    expect(html).toContain('id="brand-geography"');
    expect(html).toContain('id="brand-market"');
    expect(html).toContain('¿En qué mercado geográfico compite y quiere crecer esta marca?');
    expect(html).toContain('La ubicación de tu empresa no siempre es el mercado donde compite tu marca.');
    for (const value of ['LOCAL', 'REGIONAL', 'STATE', 'NATIONAL', 'LATAM', 'GLOBAL'])
      expect(html, value).toContain(`value="${value}"`);
    // Never required: a missing declaration must not block creating a brand.
    expect(html).not.toMatch(/<select id="brand-geography"[^>]*\srequired/);
    expect(app).toContain("api('/api/brands/geography'");
    // The seed never runs this path; only the participant's own creation does.
    expect(app).toContain('await saveBrandGeography(brand.id);');
  });

  it('offers AI possibilities as an optional path beside the participant own answer', () => {
    expect(app).toContain('Ayúdame a generar posibilidades');
    expect(app).toContain('Opcional. Tu propia respuesta siempre es el punto de partida');
    // It reuses the canonical recommendation endpoint: no parallel engine.
    expect(app).toContain("api('/api/recommendations/generate'");
  });

  it('gives every generated option its own visible decision controls', () => {
    for (const marker of ['data-option-take', 'data-option-edit', 'data-option-drop'])
      expect(app, marker).toContain(marker);
    expect(app).toContain('>Incorporar<');
    expect(app).toContain('>Modificar<');
    expect(app).toContain('>Descartar<');
    // Incorporar and Modificar open a draft through prepare(); neither commits a decision.
    expect(app).toContain('await prepare(Boolean(optionEdit));');
    expect(app).not.toMatch(/data-option-take[\s\S]{0,400}decisions\/commit/);
    // Provenance survives: the draft still carries the recommendation it came from.
    expect(app).toContain('sourceRecommendationId:rec.id');
    // Descartar sets aside and can be reconsidered; the audited rejection keeps its own reasoned form.
    expect(app).toContain('data-option-restore');
    expect(app).toContain("api('/api/recommendations/reject'");
  });

  it('hands off to the next phase without depending on the drawer', () => {
    expect(app).toContain('function nextPhase()');
    // Journey order is read from the canonical navigation, never duplicated in a second list.
    expect(app).toContain("document.querySelectorAll('#journey [data-module]')");
    // A continuation appears only when a next phase genuinely exists.
    expect(app).toContain('const next=nextPhase();');
    expect(app).toContain('Continuar a ${escape(label)}');
    expect(app).toContain('Completaste las decisiones de esta marca.');
    expect(app).toContain('Revisar avance');
    // It is rendered into the decision surface, not behind the hamburger.
    expect(app).toContain('host.prepend(panel);');
  });
});

describe('production verification hotfix', () => {
  it('lets public legal routes outrank the intake gate', () => {
    // Production defect: an authenticated participant who still owed intake saw the intake form at
    // /privacidad/ and /terminos/, because showIntake() runs on boot regardless of path and hides them.
    expect(app).toContain("const LEGAL_PATHS=['/privacidad','/terminos'];");
    expect(app).toContain('const isLegalPath=()');
    // A public document is decided before the gate, on boot and after sign-in alike.
    const boot = app.slice(app.indexOf('if(state.authenticated){'));
    const legalAt = boot.indexOf('isLegalPath()');
    const intakeAt = boot.indexOf('state.intakeRequired');
    expect(legalAt).toBeGreaterThan(-1);
    expect(legalAt, 'legal routes must be checked before the intake gate').toBeLessThan(intakeAt);
    // The gate itself still stands for the workspace.
    expect(app).toContain('if(state.intakeRequired)await showIntake();');
  });

  it('gives the intake form the content column on desktop', () => {
    // .welcome declares three column tracks; intake overrode to two while still having three children,
    // so the form wrapped into column one under the image at ~288px with ~103px fields.
    const css = readFileSync('src/transport/public/public.css', 'utf8');
    expect(css).toContain('#intake .access-art');
    expect(css).toContain('#intake .access-copy');
    expect(css).toContain('#intake-form');
    const form = css.slice(css.indexOf('#intake-form {'));
    expect(form.slice(0, form.indexOf('}'))).toContain('grid-column: 2');
  });

  it('offers optional possibilities where the participant is asked to write', () => {
    expect(app).toContain('id="possibilities"');
    expect(app).toContain('Ayúdame a generar posibilidades</button>');
    expect(app).toContain('Escribe tu propia respuesta o pide posibilidades');
    // It delegates to the canonical control instead of introducing a second engine.
    const handler = app.slice(app.indexOf("$('#possibilities')?.addEventListener"));
    expect(handler.slice(0, 600)).toContain("$('#generate-recommendation')");
    expect(handler.slice(0, 600)).toContain('engine.click();');
    // Typed content is preserved, never replaced, and nothing is approved automatically.
    expect(handler.slice(0, 600)).toContain('preserveDraft();');
    expect(handler.slice(0, 600)).not.toContain('decisions/commit');
  });

  it('keeps migration files byte-stable so applied hashes stay valid', () => {
    // core.autocrlf rewrote drizzle/*.sql to CRLF on checkout, changing their hashes, and a healthy
    // database then reported MIGRATIONS_REQUIRED. Applied migrations are immutable and hash-checked.
    const attrs = readFileSync('.gitattributes', 'utf8');
    expect(attrs).toContain('drizzle/** text eol=lf');
    for (const file of ['drizzle/0011_illegal_gertrude_yorkes.sql', 'drizzle/0013_red_thor_girl.sql'])
      expect(readFileSync(file, 'utf8'), file).not.toContain('\r\n');
  });
});
