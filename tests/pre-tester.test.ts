import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { assetPath, NON_INDEXABLE_VIEWS } from '../src/transport/assets.js';

const html = readFileSync('src/transport/public/index.html', 'utf8');
const app = readFileSync('src/transport/public/app.js', 'utf8');
const views = readFileSync('src/transport/public/product-views.js', 'utf8');
const responsive = readFileSync('src/transport/public/product-responsive.css', 'utf8');
const context = readFileSync('src/transport/public/product-context.css', 'utf8');
const pdf = readFileSync('src/application/blueprint-pdf.ts', 'utf8');

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
    // The rule generalised when /gracias-encuesta joined: every public document, legal or not, is
    // readable without a session and is never intercepted by the gate.
    expect(app).toContain('const PUBLIC_DOCUMENT_PATHS=[...LEGAL_PATHS,');
    expect(app).toContain('const isPublicDocument=()');
    // A public document is decided before the gate, on boot and after sign-in alike.
    const boot = app.slice(app.indexOf('if(state.authenticated){'));
    const legalAt = boot.indexOf('isPublicDocument()');
    const intakeAt = boot.indexOf('state.intakeRequired');
    expect(legalAt).toBeGreaterThan(-1);
    expect(legalAt, 'public documents must be checked before the intake gate').toBeLessThan(intakeAt);
    // The same precedence holds on the shared sign-in entry point.
    const enter = app.slice(app.indexOf('async function enterWorkspace()'));
    expect(enter.indexOf('isPublicDocument()')).toBeLessThan(enter.indexOf('state.intakeRequired'));
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
    // Copy is parameterised so every workflow reuses one hand-off; the signature grew an eyebrow and a
    // secondary action when Entorno competitivo started using it.
    expect(app).toContain('function showPhaseHandoff({');
    expect(app.slice(app.indexOf('function showPhaseHandoff({'), app.indexOf('function showPhaseHandoff({') + 400)).toContain('done=');
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

  it('places Entorno competitivo under strategic preparation without making it a decision', () => {
    // The public header has its own <nav>, so the closing tag must be found after this one opens.
    const navStart = html.indexOf('<nav id="journey"');
    const nav = html.slice(navStart, html.indexOf('</nav>', navStart));
    const groups = [...nav.matchAll(/<p class="nav-group">([^<]+)<\/p>/g)].map(m => m[1]);
    expect(groups).toEqual(['Preparación estratégica', 'Estrategia', 'Contexto y aprendizaje', 'Práctica y visión']);
    // Research informs the four decisions, so it sits above them.
    expect(nav.indexOf('Preparación estratégica')).toBeLessThan(nav.indexOf('id="competitive-context"'));
    expect(nav.indexOf('id="competitive-context"')).toBeLessThan(nav.indexOf('>Estrategia<'));
    // It is NOT a decision: no number, no data-module. The Decision Spine has exactly the six journey
    // sections of ADR-0021 (Objetivo and Arena precede the four original ones), in canonical order.
    expect([...nav.matchAll(/data-module="([^"]+)"/g)].map(m => m[1])).toEqual(['Strategic Objective', 'Market Arena', 'Primary Customer', 'Value Mechanism', 'Positioning', 'Core Message']);
    const competitive = nav.slice(nav.indexOf('id="competitive-context"'), nav.indexOf('</button>', nav.indexOf('id="competitive-context"')));
    expect(competitive).not.toMatch(/<span>\d/);
    expect(competitive).not.toContain('data-module');
    // Every item survives the move, in its new home.
    const learning = nav.slice(nav.indexOf('>Contexto y aprendizaje<'), nav.indexOf('>Práctica y visión<'));
    expect(learning).toContain('id="brand-context"');
    expect(learning).toContain('id="learning-loop"');
    expect(learning).not.toContain('id="competitive-context"');
    const practice = nav.slice(nav.indexOf('>Práctica y visión<'));
    expect(practice).toContain('id="practice"');
    expect(practice).toContain('id="blueprint"');
  });

  it('mirrors one AI activity state beside the control that started it', () => {
    // The global panel sits at the top of the workspace, so asking for possibilities further down the
    // page looked like a freeze. This is a second VIEW of the same state, never a second process.
    expect(app).toContain('id="possibilities-activity"');
    expect(app).toContain('class="local-activity"');
    const block = app.slice(app.indexOf('id="possibilities-activity"'), app.indexOf('id="possibilities-activity"') + 200);
    expect(block).toContain('aria-live="polite"');
    expect(block).toContain('role="status"');
    // Driven by the existing lifecycle, so no extra request, timer or generation state exists.
    for (const hook of ['const activityStart=', 'const activityStep=', 'const activityDone=', 'const activityFail='])
      expect(app.slice(app.indexOf(hook), app.indexOf(hook) + 160), hook).toContain('paintMirror(');
    expect(app).toContain('setActivityMirror($(\'#possibilities-activity\'))');
    expect(app.split("api('/api/recommendations/generate'").length - 1, 'still one request site').toBe(1);
    // The button says what is happening rather than only spinning.
    expect(app).toContain("cta.textContent='Generando posibilidades…'");
    // And the result is brought into view instead of rendering off-screen.
    expect(app).toContain('function revealRecommendation()');
    expect(app).toContain('if(fromDraft)revealRecommendation();');
  });

  it('reports competitive context separately from the four decisions', () => {
    expect(app).toContain('class="context-market"');
    expect(app).toContain('Contexto del mercado');
    // Status words come from one canonical vocabulary.
    expect(app).toContain("NONE:'Sin investigar'");
    expect(app).toContain("PENDING:'Pendiente de revisión'");
    expect(app).toContain("REVIEWED:'Revisado'");
    // Derived from stored state and the open round, never from what the screen happens to show.
    const derive = app.slice(app.indexOf('function competitiveStatus()'), app.indexOf('function competitiveStatus()') + 700);
    expect(derive).toContain('competitiveFindingAccepted');
    expect(derive).toContain('competitiveFindingRejected');
    expect(derive).toContain('competitiveEvidence()');
    expect(derive).toContain('competitiveRejectedClaims.size');
    // Preparation, not a decision: the «X de N» count (N = the brand's sections) comes from approved versions alone.
    expect(app).toContain('No cuenta como decisión.');
    const count = app.slice(app.indexOf('<span class="context-count">'), app.indexOf('<span class="context-count">') + 160);
    expect(count).toContain('${versions.length} de ${context.questions.length}');
    expect(count).not.toContain('competitive');
  });

  it('gives the competitive hand-off its own words while reusing the journey', () => {
    const handoff = app.slice(app.indexOf('function showPhaseHandoff({'), app.indexOf('function showPhaseHandoff({') + 400);
    for (const parameter of ['eyebrow=', 'done=', 'complete=', 'secondaryLabel=', 'secondaryAction='])
      expect(handoff, parameter).toContain(parameter);
    const competitive = app.slice(app.indexOf('async function showCompetitiveContext'), app.indexOf('async function showBrandContext'));
    expect(competitive).toContain("eyebrow:'Contexto competitivo revisado'");
    expect(competitive).toContain("secondaryLabel:'Revisar contexto'");
    expect(competitive).toContain('secondaryAction:showBrandContext');
    // One journey model still decides where «Continuar» goes.
    expect(app.split('function nextPhase()').length - 1).toBe(1);
    expect(app.slice(app.indexOf('function showPhaseHandoff'), app.indexOf('function showPhaseHandoff') + 900)).toContain('const next=nextPhase();');
  });

  it('offers the Mapa estratégico as a downloaded document, not a navigation', () => {
    expect(app).toContain('id="blueprint-pdf"');
    expect(app).toContain('>Descargar PDF<');
    const handler = app.slice(app.indexOf("$('#blueprint-pdf')?.addEventListener"));
    const body = handler.slice(0, 1400);
    expect(body).toContain("button.textContent='Preparando tu mapa…'");
    expect(body).toContain('/api/blueprint/pdf?brandId=');
    expect(body).toContain("credentials:'same-origin'");
    // The participant stays in Brandopolis: a blob download, then the object URL is released.
    expect(body).toContain('URL.createObjectURL');
    expect(body).toContain('URL.revokeObjectURL');
    expect(body).toContain('link.download=');
    // Failure is safe and retryable, and never carries transport detail.
    expect(body).toContain('No pudimos preparar tu mapa estratégico en este momento. Vuelve a intentarlo.');
    expect(body).not.toContain('response.statusText');
  });

  it('names the connected view «Mapa estratégico» wherever a participant reads it', () => {
    // «Blueprint» is industry jargon an entrepreneur should not need explained. One vocabulary is used
    // everywhere it is read, including the exported document.
    const nav = html.slice(html.indexOf('<nav id="journey"'), html.indexOf('</nav>', html.indexOf('<nav id="journey"')));
    expect(nav).toContain('<button id="blueprint" class="secondary">Mapa estratégico</button>');
    expect(nav, 'no jargon left in the navigation').not.toContain('Blueprint');
    expect(app).toContain("enterView('#blueprint','Mapa estratégico')");
    expect(app).toContain('Mapa estratégico · estrategia vigente');
    expect(app).toContain('Mapa estratégico descargado.');
    expect(pdf).toContain("pdf.text('Mapa estratégico de la marca'");
    expect(pdf).toContain('Mapa estratégico · ${brand.name}');
    // The heading that already read plainly is left alone.
    expect(app).toContain('Una visión conectada de tu marca.');

    // Routes, ids, endpoints and the download filename keep their technical names: no URL changes.
    expect(app).toContain("$('#blueprint')");
    expect(app).toContain('/api/blueprint/pdf?brandId=');
    expect(app).toContain("api(`/api/blueprint?brandId=");
    expect(pdf).toContain('Brandopolis-Blueprint-${slug}');
  });

  it('ranks the right panel: heading, section label, section item, then status', () => {
    const market = app.slice(app.indexOf('<section class="context-market"'), app.indexOf('<details class="context-details"'));
    // «Contexto del mercado» is a section label; «Entorno competitivo» is the section's item.
    expect(market).toContain('<p class="context-section"');
    expect(market).toContain('<h4 class="context-market-title">Entorno competitivo</h4>');
    expect(market).toContain('<p class="context-market-status">');
    // «Lo que ya decidiste» shares the same label treatment, so the two sections read as siblings.
    expect(app).toContain('<summary><span class="context-section">Lo que ya decidiste</span>');
    // Hierarchy comes from type and spacing, never from a heavy block.
    const label = context.slice(context.indexOf('.context-section {'), context.indexOf('}', context.indexOf('.context-section {')));
    expect(label).toContain('letter-spacing: 0.18em');
    expect(label).toContain('font-weight: 700');
    expect(label).not.toContain('background');
    const details = context.slice(context.indexOf('.context-details {'), context.indexOf('}', context.indexOf('.context-details {')));
    expect(details, 'the decisions section gets its own break').toContain('border-top: 1px solid');
    // The market section is no longer a card competing with the panel heading.
    const section = context.slice(context.indexOf('.context-market {'), context.indexOf('}', context.indexOf('.context-market {')));
    expect(section).not.toContain('border-radius');
    expect(section).not.toContain('background');
    // And the decision count is untouched by any of it.
    expect(app).toContain('${versions.length} de ${context.questions.length}');
  });

  it('leaves no interactive styling on the static market title', () => {
    // THE DEFECT. It was a bare <button>, so base.css gave it background:var(--action-primary) and,
    // on hover, var(--action-primary-hover). The local rule reset the resting state but not :hover,
    // and the element was display:block;width:100%, so hovering painted a dark band across the panel.
    // It is a status title, not navigation — the left navigation already goes there — so it is static.
    expect(app, 'the rail title must not be a button').not.toContain('context-market-link');
    expect(app).not.toContain('data-open-competitive');
    expect(context).not.toContain('.context-market-link');
    // No click wiring and no needless focus stop remain in the rail.
    const rail = app.slice(app.indexOf('function renderContext()'), app.indexOf('function updateShell()'));
    expect(rail).not.toContain('addEventListener');
    expect(rail).not.toContain('aria-label="Abrir Entorno competitivo"');
    // Nothing in the market section carries a hover rule at all.
    const marketCss = context.slice(context.indexOf('.context-market {'));
    expect(marketCss.slice(0, marketCss.indexOf('.context-lineage')), 'no hover treatment on static labels').not.toContain(':hover');
    // The fix is structural, not a paint-over of the inherited rule.
    const marketBlock = context.slice(context.indexOf('.context-market {'), context.indexOf('.context-lineage'));
    expect(marketBlock).not.toContain('!important');
  });

  it('serves the public survey thank-you page without a session', () => {
    // Same routing architecture as the legal documents: the server returns the one document and the
    // client decides the view. Both the bare path and the trailing slash must resolve.
    for (const route of ['/gracias-encuesta', '/gracias-encuesta/'])
      expect(assetPath(route), route).toBe('/');
    // Nothing else moved: the homepage and the pilot routes resolve exactly as before.
    for (const route of ['/', '/login', '/request-access', '/privacidad', '/terminos', '/admin'])
      expect(assetPath(route), route).toBe('/');
    expect(assetPath('/gracias')).toBeUndefined();
    expect(assetPath('/gracias-encuesta/extra')).toBeUndefined();

    // It is a public document, so it outranks the intake gate and never pulls anyone into the pilot.
    expect(app).toContain("PUBLIC_DOCUMENT_PATHS=[...LEGAL_PATHS,'/gracias-encuesta']");
    // The section starts hidden and is revealed by the client router, like every other view.
    expect(html).toMatch(/<section id="gracias-encuesta"[^>]*\shidden/);
    expect(app).toContain("$('#gracias-encuesta').hidden=legalPath!=='/gracias-encuesta'");
    // Opening it takes the surface over: no gateway hero and no access card competing with it.
    expect(app).toContain("const isDocument=isLegal||legalPath==='/gracias-encuesta';");
    expect(app).toContain("$('#gateway').hidden=path!=='/'||isDocument");
    expect(app).toContain("$('#login').hidden=path==='/request-access'||isDocument");
    // Document title follows the existing setTitle convention, which appends the brand.
    expect(app).toContain("legalPath==='/gracias-encuesta'?'Gracias por compartir tu experiencia'");
    expect(app).toContain("document.title=text?`${text} · Brandopolis`");
  });

  it('carries the approved thank-you copy and a single way onward', () => {
    const page = html.slice(html.indexOf('<section id="gracias-encuesta"'), html.indexOf('<section id="admin"'));
    expect(page).toContain('<p class="eyebrow">Gracias por compartir tu experiencia</p>');
    expect(page).toContain('<h1 id="gratitude-title">Tu experiencia también construye lo que sigue.</h1>');
    expect(page).toContain('Gracias por dedicar unos minutos a compartir tu experiencia con Brandopolis. Cada respuesta nos ayuda a comprender mejor cómo acompañar a quienes están construyendo marcas con más claridad, criterio y propósito.');
    expect(page).toContain('Convertirse en un mejor Estratega de Marca es un proceso continuo: cada decisión, cada aprendizaje y cada nueva evidencia amplían tu capacidad para construir marcas más sólidas y relevantes.');
    expect(page).toContain('Esperamos seguir acompañándote en esa evolución. Seguiremos en contacto para compartir contigo los próximos pasos de Brandopolis.');
    expect(page).toContain('Gracias por ser parte de esta etapa.');

    // Exactly one action, and it returns to the homepage on the same origin.
    expect(page).toContain('<a class="cta" href="/">Volver al inicio <span aria-hidden="true">→</span></a>');
    expect(page.match(/<a\s/g) ?? []).toHaveLength(1);
    expect(page.match(/<button/g), 'no competing actions on the page').toBeNull();

    // Semantic structure: one h1, labelled section, and the decorative mark is hidden from AT.
    expect(page.match(/<h1/g) ?? []).toHaveLength(1);
    expect(page).toContain('aria-labelledby="gratitude-title"');
    expect(page).toContain('class="gratitude-mark" src="/brand/symbol.svg" alt=""');
    // The canonical symbol is reused as-is; the Ribbon B is never redrawn here.
    expect(page).not.toContain('<svg');
    // No participant or survey data can appear on a page the server renders identically for everyone.
    for (const leak of ['email', 'token', 'userId', 'workspaceId', 'brandId', 'respuesta='])
      expect(page.toLowerCase(), leak).not.toContain(leak.toLowerCase());
  });

  it('styles the thank-you page from the existing design system only', () => {
    const css = readFileSync('src/transport/public/public.css', 'utf8');
    const rules = css.slice(css.indexOf('.gratitude {'));
    // Palette and tokens come from the design system, never new colour literals.
    expect(rules).toContain('var(--bp-brand-charcoal)');
    expect(rules).toContain('var(--bp-brand-emerald)');
    expect(rules).toContain('var(--action-primary)');
    expect(rules).toContain('var(--font-display)');
    expect(rules).not.toMatch(/#[0-9a-fA-F]{6}/);
    // Editorial restraint: a readable measure, one column on phones, no hero gradient, no card.
    expect(rules).toContain('max-width: 62ch');
    expect(rules).toContain('grid-template-columns: 1fr');
    expect(rules).not.toContain('linear-gradient');
    // Motion is opt-in: the entrance only exists where reduced motion is not requested.
    expect(rules).toContain('@media (prefers-reduced-motion: no-preference)');
    const animated = rules.indexOf('animation: gratitude-settle');
    expect(animated).toBeGreaterThan(rules.indexOf('@media (prefers-reduced-motion: no-preference)'));
    // The CTA keeps a real target size for touch.
    expect(rules).toContain('min-height: 48px');
  });

  it('marks only the survey thank-you page non-indexable', () => {
    // The page is reached once, from a redirect after the survey: it has no standalone search value.
    // The directive is route-specific and must never become global.
    expect(NON_INDEXABLE_VIEWS.has('/gracias-encuesta')).toBe(true);
    expect(NON_INDEXABLE_VIEWS.has('/gracias-encuesta/')).toBe(true);
    // Nothing else may be swept in: the landing, the legal documents, access and the product routes
    // keep their SEO behaviour exactly as before.
    for (const route of ['/', '/login', '/request-access', '/privacidad', '/privacidad/', '/terminos', '/terminos/', '/admin', '/workspace', '/app.js', '/public.css', '/brand/logo.svg'])
      expect(NON_INDEXABLE_VIEWS.has(route), route).toBe(false);
    expect(NON_INDEXABLE_VIEWS.size, 'only the thank-you page is non-indexable').toBe(2);

    // Served from the existing header path, conditioned on the declared set, with no new meta-tag
    // architecture and no global directive.
    const http = readFileSync('src/transport/http.ts', 'utf8');
    expect(http).toContain("NON_INDEXABLE_VIEWS.has(path)?{'X-Robots-Tag':'noindex, follow'}:{}");
    expect(http.split('X-Robots-Tag').length - 1, 'one place sets the header').toBe(1);
    // It must sit inside the per-request header object, not among the headers set for every response.
    const global = http.slice(http.indexOf("res.setHeader('Cache-Control','no-store')"), http.indexOf("res.setHeader('Content-Security-Policy',csp)"));
    expect(global).not.toContain('X-Robots-Tag');
    // No robots meta tag was introduced into the single document either.
    expect(html).not.toMatch(/<meta[^>]+name="robots"/);
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
