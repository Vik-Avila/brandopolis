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
