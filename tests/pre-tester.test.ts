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

  it('binds the possibilities button in the same function that renders it', () => {
    expect(app).toContain('id="possibilities"');
    expect(app).toContain('Ayúdame a generar posibilidades</button>');
    expect(app).toContain('Escribe tu propia respuesta o pide posibilidades');

    // THE PRODUCTION DEFECT. The button is rendered only inside the `draft` branch of render(), and
    // its listener used to live in mountRecommendation(), whose first statement is `if(draft)return;`.
    // Button and handler were mutually exclusive, so the click did nothing: no request, no error, no
    // loading state. Binding must therefore happen inside render(), never behind the draft guard.
    const render = app.slice(app.indexOf('function render() {'), app.indexOf('function mountRecommendation'));
    expect(render, 'listener must be bound where the button is rendered').toContain("$('#possibilities')?.addEventListener");
    const mount = app.slice(app.indexOf('function mountRecommendation'));
    expect(mount.slice(0, mount.indexOf('function showBlueprint')), 'must not sit behind if(draft)return')
      .not.toContain("$('#possibilities')");

    // One engine, reached by both surfaces: the CTA must call the shared path, not fake a click on a
    // control that does not exist while the draft form is open.
    const handler = app.slice(app.indexOf("$('#possibilities')?.addEventListener"));
    const body = handler.slice(0, 700);
    expect(body).toContain('generatePossibilities(q.id');
    expect(body).toContain("stage:'initial_input'");
    expect(body).not.toContain('engine.click();');
    // Typed content is preserved first, and nothing is ever approved automatically.
    expect(body).toContain('preserveDraft();');
    expect(body).not.toContain('decisions/commit');
  });

  it('keeps one generation path that cannot fail silently or leak provider detail', () => {
    // Exactly one request site in the whole client, so no surface can double-count or diverge. The
    // AI-notice acceptance used to hold a third copy that never released the draft nor selected the
    // «Opciones» panel, so a first-time PILOT participant accepting it saw nothing.
    expect(app.split("api('/api/recommendations/generate'").length - 1, 'one generation request site').toBe(1);
    const consent = app.slice(app.indexOf('function showAiNotice'));
    expect(consent).toContain('generatePossibilities(questionId,{...origin,afterConsent:true})');
    expect(app).toContain('showAiNotice(questionId,{locked,stage,fromDraft})');
    const engine = app.slice(app.indexOf('async function generatePossibilities'), app.indexOf('function mountRecommendation'));
    expect(engine).toContain("api('/api/recommendations/generate',{brandId,questionId})");
    // Failure is announced to the participant in their own words, never as provider or transport text.
    expect(app).toContain('const POSSIBILITIES_FAILED=');
    expect(app).toContain('No pudimos generar posibilidades en este momento.');
    expect(engine).toContain('notice(POSSIBILITIES_FAILED,true,\'assistance\')');
    expect(engine).toContain("if(error.code==='AI_CONSENT_REQUIRED'");
    // api() already writes participant-safe messages and returns the page to sign-in on
    // UNAUTHORIZED, so those failures must keep propagating. Swallowing them stranded an expired
    // session on a dead screen and replaced the daily-AI-cap message with a pointless retry.
    expect(engine).toContain('if(GENERATION_ERRORS_HANDLED_BY_API.has(error.code))throw error;');
    for (const code of ['UNAUTHORIZED', 'AI_CAP_REACHED', 'RATE_LIMITED', 'CONFLICT'])
      expect(app.slice(app.indexOf('const GENERATION_ERRORS_HANDLED_BY_API'), app.indexOf('async function generatePossibilities')), code).toContain(code);
    // The result must land on the visible panel: «Opciones» is a tab, so generating into it while the
    // «Decisión» tab is active rendered candidates that nobody could see.
    expect(engine).toContain("activeDecisionTab='recommendation'");
    expect(engine).toContain('if(fromDraft)draft=null;');
    // Both surfaces call the one path.
    expect(app).toContain("generatePossibilities(q.id,{locked,stage:'options'})");
  });

  it('scopes a discarded option to its own proposal', () => {
    // Option ids are positional ("option-1", "option-2") and repeat in every recommendation, so a
    // Set keyed by the bare id made an untouched option in a later phase render as already discarded,
    // replacing Incorporar/Modificar/Descartar with Reconsiderar.
    expect(app).toContain('const discardKey=optionId=>');
    expect(app).toContain('discardedOptions.has(discardKey(o.id))');
    expect(app).toContain('discardedOptions.add(discardKey(optionDrop))');
    expect(app).toContain('discardedOptions.delete(discardKey(optionRestore))');
    expect(app, 'no bare-id membership test may remain').not.toContain('discardedOptions.has(o.id)');
  });

  it('reuses one journey model for every completion hand-off', () => {
    // The hand-off was reachable only from the decision-form submit, so completing the competitive
    // review left the participant with no next action at all.
    expect(app).toContain('function showPhaseHandoff({done=');
    const competitive = app.slice(app.indexOf('async function showCompetitiveContext'), app.indexOf('async function showBrandContext'));
    expect(competitive).toContain('showPhaseHandoff({');
    // Canonical completion is the HUMAN-reviewed state, not "the AI finished generating".
    expect(competitive).toContain('const reviewComplete=Boolean(activeResult?.findings?.length)&&pendingFindings.length===0');
    // Destination still comes from the canonical journey; no second ordering is introduced.
    expect(app.split('function nextPhase()').length - 1).toBe(1);
    expect(app.slice(app.indexOf('function nextPhase()'))).toContain("document.querySelectorAll('#journey [data-module]')");
    const handoff = app.slice(app.indexOf('function showPhaseHandoff'));
    expect(handoff.slice(0, 900)).toContain('const next=nextPhase();');
    // Completion is reported once per research round, so a re-render cannot inflate it.
    expect(competitive).toContain('if(competitiveCompletionReported!==brandId)');
    expect(competitive).toContain("analytics.send(PILOT_EVENTS.phaseCompleted,{pilot_stage:'competitive_review'})");
    expect(app).toContain('competitiveCompletionReported=null;');
  });

  it('emits each repaired milestone from exactly one place, with no new event names', () => {
    // Duplicate call sites double-count in GA4; the previous code had possibilities_requested in two.
    for (const event of ['possibilitiesRequested', 'phaseCompleted', 'nextPhaseStarted'])
      expect(app, event).toContain('PILOT_EVENTS.' + event);
    expect(app.split('PILOT_EVENTS.possibilitiesRequested').length - 1, 'one emit site').toBe(1);
    expect(app.split('PILOT_EVENTS.nextPhaseStarted').length - 1, 'one emit site').toBe(1);
    expect(app.split('PILOT_EVENTS.phaseCompleted').length - 1, 'decision commit and competitive review').toBe(2);
    // Only allowlisted, non-identifying dimensions travel with them. The shared generation path takes
    // the calling surface as `stage` and is the only thing that turns it into the GA4 dimension.
    expect(app).toContain('analytics.send(PILOT_EVENTS.possibilitiesRequested,{pilot_stage:stage})');
    for (const stage of ["stage:'initial_input'", "stage:'options'", "pilot_stage:'competitive_review'", "pilot_stage:'phase_done'", "pilot_stage:'next_phase'"])
      expect(app, stage).toContain(stage);
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
