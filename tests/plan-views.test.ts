// PHASE4_SPEC §4.2 · Plan de Marketing projections (pure; no DOM, no requests).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync('src/transport/public/product-views.js', 'utf8').replace(/export (?=const |function )/g, '');
const views = runInNewContext(source + '\n({planHtml,sharedPlanHtml,calendarDays,actionFormHtml,objectiveFormHtml,moneyText,planActionBadge});') as {
  planHtml: (d: unknown, mode?: string, month?: string | null) => string; sharedPlanHtml: (d: unknown) => string;
  calendarDays: (a: unknown[], month: string) => { iso: string; weekday: number; actions: { id: string }[] }[]; actionFormHtml: (d: unknown, a?: unknown) => string;
  objectiveFormHtml: (h: string, o?: unknown) => string; moneyText: (b: unknown) => string; planActionBadge: (s: string) => string;
};
const action = (extra: Record<string, unknown> = {}) => ({ id: 'a1', revision: 0, title: 'Webinar <b>agencias</b>', kind: 'INSTITUTIONAL', offerId: null, objectiveId: null, owner: '', startDate: null, dueDate: null, budget: null, indicator: '', status: 'PLANNED', ...extra });
const data = (plan: Record<string, unknown> | null, offers: unknown[] = []) => ({ year: 2027, offers, plan: plan && { id: 'p1', year: 2027, focusStart: null, focus: null, revision: 0, objectives: [], actions: [], gaps: [], changes: [], ...plan } });

describe('PHASE4_SPEC §4.2 · plan views', () => {
  it('lives in Marketing → Plan de Marketing; without a plan it invites to start one without requiring the full strategy', () => {
    const html = views.planHtml(data(null));
    expect(html).toContain('<p class="eyebrow">Marketing</p><h2>Plan de Marketing</h2>');
    expect(html).toContain('Empezar el plan de 2027');
    expect(html).toContain('aunque tu estrategia no esté completa');
    // The Marketing sections (tabs) are added by the area navigation; the plan itself never fakes a section.
    expect(html).not.toMatch(/<button[^>]*>[^<]*(Sitio web)/);
  });

  it('shows what is missing in plain words, the 90-day window and each action with owner, dates, budget certainty and indicator', () => {
    const html = views.planHtml(data({
      focusStart: '2027-01-04', focus: { start: '2027-01-04', end: '2027-04-03' }, gaps: ['OWNER', 'INDICATOR'],
      objectives: [{ id: 'o1', revision: 0, horizon: 'NINETY_DAYS', title: 'Diez clientes', measure: '', status: 'ACTIVE' }],
      actions: [action({ objectiveId: 'o1', kind: 'COMMERCIAL', offerId: 'f1', owner: 'Ana', startDate: '2027-01-11', dueDate: '2027-01-29', budget: { amountMinor: 500000, currency: 'MXN', certainty: 'ESTIMATED' }, indicator: 'Registros' })]
    }, [{ id: 'f1', status: 'ACTIVE', approved: true, name: 'Diagnóstico' }]));
    expect(html).toContain('quién es responsable de cada acción');
    expect(html).toContain('Del 4 de enero de 2027 al 3 de abril de 2027.');
    expect(html).toContain('Comercial · Diagnóstico');
    expect(html).toContain('11 de enero de 2027 a 29 de enero de 2027');
    expect(html).toMatch(/\$5,000\.00 · estimado/);
    expect(html).toContain('Registros');
    expect(html).toContain('<span class="badge">Planeada</span>');
    expect(html).toContain('Webinar &lt;b&gt;agencias&lt;/b&gt;');
    expect(html).toContain('Falta decir cómo se medirá.');
    // Only the transitions of the state machine are offered.
    expect(html).toContain('data-action-status="IN_PROGRESS"');
    expect(html).not.toContain('data-action-status="DONE"');
  });

  it('month view groups the same records by due month; cancelled actions are kept apart; finished actions have no controls', () => {
    const plan = { actions: [action({ id: 'a1', dueDate: '2027-03-02' }), action({ id: 'a2', dueDate: '2027-01-15', status: 'DONE' }), action({ id: 'a3' }), action({ id: 'a4', status: 'CANCELLED' })] };
    const html = views.planHtml(data(plan), 'month');
    expect(html.indexOf('enero 2027')).toBeLessThan(html.indexOf('marzo 2027'));
    expect(html.indexOf('marzo 2027')).toBeLessThan(html.indexOf('Sin fecha'));
    expect(html).toContain('Acciones canceladas (1)');
    expect(html).toContain('aria-pressed="true">Por mes');
    expect(html.match(/data-action-edit="a2"/)).toBeNull();
  });

  it('the action form offers only active offers of the brand and keeps an estimate labelled as such', () => {
    const d = data({ objectives: [{ id: 'o1', revision: 0, horizon: 'ANNUAL', title: 'Crecer', measure: 'x', status: 'ACTIVE' }, { id: 'o2', revision: 0, horizon: 'ANNUAL', title: 'Archivado', measure: '', status: 'ARCHIVED' }] },
      [{ id: 'f1', status: 'ACTIVE', approved: false, name: 'Diagnóstico' }, { id: 'f2', status: 'RETIRED', approved: true, name: 'Retirada' }]);
    const html = views.actionFormHtml(d);
    expect(html).toContain('Diagnóstico (sin aprobar)');
    expect(html).not.toContain('Retirada');
    expect(html).toContain('Año · Crecer');
    expect(html).not.toContain('Archivado');
    expect(views.moneyText({ amountMinor: 1000, currency: 'MXN', certainty: 'CONFIRMED' })).toMatch(/confirmado$/);
    expect(views.actionFormHtml(data({}), null)).toContain('Aún no hay ofertas. Créalas en Productos y servicios.');
  });
});

describe('PLN-001…003 · sharing and calendar views', () => {
  const actions = [action({ id: 'a1', title: 'Webinar', owner: 'Ana', startDate: '2027-01-11', dueDate: '2027-01-13', status: 'IN_PROGRESS' }), action({ id: 'a2', title: 'Boletín', owner: 'Luis', dueDate: '2027-01-29' }), action({ id: 'a3', title: 'Sin fecha' })];
  it('the calendar uses the same records: an action spans its dates; weeks start on Monday', () => {
    const days = views.calendarDays(actions, '2027-01');
    expect(days).toHaveLength(31);
    expect(days[0]).toMatchObject({ iso: '2027-01-01', weekday: 4 }); // Friday
    expect(days.filter(d => d.actions.some(a => a.id === 'a1')).map(d => d.iso)).toEqual(['2027-01-11', '2027-01-12', '2027-01-13']);
    expect(days.filter(d => d.actions.some(a => a.id === 'a2')).map(d => d.iso)).toEqual(['2027-01-29']);
  });
  it('owner and status match across list, month and calendar (grid and mobile agenda); undated actions are named', () => {
    const d = data({ actions });
    for (const mode of ['list', 'month', 'calendar']) {
      const html = views.planHtml(d, mode, '2027-01');
      expect(html, mode).toContain('Ana');
      expect(html, mode).toContain('En curso');
      expect(html, mode).toContain('Luis');
    }
    const calendar = views.planHtml(d, 'calendar', '2027-01');
    expect(calendar).toContain('<table class="plan-calendar-grid"');
    expect(calendar).toContain('<ol class="plan-agenda"');
    expect(calendar).toContain('11 de enero de 2027');
    expect(calendar).toContain('Sin fecha: Sin fecha.');
    expect(calendar).toContain('data-plan-month="2026-12"');
    expect(calendar).toContain('data-plan-month="2027-02"');
    expect(calendar.match(/data-action-edit="a1"/g)!.length).toBeGreaterThanOrEqual(4); // 3 grid days + agenda
  });
  it('sharing states: nothing shared, version in review with criterion form, approved with pending internal changes', () => {
    expect(views.planHtml(data({ actions, sharing: { approved: null, inReview: null, changedSinceShared: null, history: [] } }))).toContain('Preparar versión para revisión');
    const review = views.planHtml(data({ actions, sharing: { approved: null, inReview: { id: 's1', sequence: 1, fingerprint: 'f'.repeat(64), matchesPlan: false, content: { objectives: [], actions: [{}, {}] } }, changedSinceShared: null, history: [] } }));
    expect(review).toContain('Versión 1 en revisión.');
    expect(review).toContain('lo que se aprueba es esta copia');
    expect(review).toContain('Aprobar y compartir esta versión');
    expect(review).not.toContain('id="plan-share"');
    const pending = views.planHtml(data({ actions, sharing: { approved: { id: 's1', sequence: 1, decidedAt: null, criterion: 'x', actionIds: ['a1'] }, inReview: null, changedSinceShared: true, history: [] } }));
    expect(pending).toContain('El cliente ve la versión 1');
    expect(pending).toContain('Hay cambios en el plan que el cliente aún no ve.');
    expect(pending).toContain('id="plan-share"');
    // Only actions of the shared version get the progress note.
    expect(pending).toContain('data-note-for="a1"');
    expect(pending).not.toContain('data-note-for="a2"');
  });
  it('the client view shows the approved copy and its progress, never internal state', () => {
    const html = views.sharedPlanHtml({ year: 2027, shared: { snapshotId: 's1', sequence: 2, approvedAt: null, content: { year: 2027, focusStart: null, focus: null, objectives: [], actions: [action({ id: 'a1', title: 'Webinar', owner: 'Ana', status: 'PLANNED', offerName: null })] }, progress: [{ actionId: 'a1', status: 'DONE', date: '2027-01-14', note: 'Asistieron <40>' }] } });
    expect(html).toContain('Versión 2 del plan 2027');
    expect(html).toContain('<span class="badge">Hecha</span>');
    expect(html).toContain('Avance del 14 de enero de 2027: Asistieron &lt;40&gt;');
    expect(html).not.toMatch(/data-action-(edit|status)|Añadir|Editar/);
    expect(views.sharedPlanHtml({ year: 2027, shared: null })).toContain('Aún no hay una versión aprobada');
  });
});

describe('PHASE4_SPEC §3/§4.4 · area tabs and deliverable views', () => {
  const v = runInNewContext(source + '\n({areaTabsHtml,deliverablesHtml,deliverableFormHtml,deliverableText,AREA_TYPES});') as {
    areaTabsHtml: (a: string, k: string) => string; deliverablesHtml: (a: string, l: unknown[], o: unknown[]) => string;
    deliverableFormHtml: (t: string, c: unknown, o: unknown[], content?: unknown, d?: unknown) => string; deliverableText: (c: unknown) => string; AREA_TYPES: Record<string, string[]>;
  };
  it('Marketing tabs: Plan, Redes sociales, Campañas digitales; Sitio web named as later, never a tab; a selector mirrors the tabs', () => {
    const html = v.areaTabsHtml('marketing', 'social');
    expect([...html.matchAll(/role="tab"[^>]*>([^<]+)</g)].map(m => m[1])).toEqual(['Plan de Marketing', 'Redes sociales', 'Campañas digitales']);
    expect(html).toContain('id="area-tab-social" data-area-tab="social" aria-selected="true" tabindex="0"');
    expect(html).toContain('aria-selected="false" tabindex="-1"');
    expect(html).toContain('<option value="social" selected>Redes sociales</option>');
    expect(html).toContain('Sitio web llegará más adelante.');
    expect(html).not.toContain('data-area-tab="web"');
  });
  const post = (extra: Record<string, unknown> = {}) => ({ id: 'd1', type: 'SOCIAL_POST', status: 'ACTIVE', revision: 2, history: [], publications: [], inReview: [], draft: null,
    approved: { id: 'v1', sequence: 1, status: 'APPROVED', fingerprint: 'f'.repeat(64), provenance: 'MANUAL', originOutdated: [], manifest: {}, content: { type: 'SOCIAL_POST', name: 'Lanzamiento <b>', offerId: null, sourceDecisionVersionIds: [], body: { network: 'LINKEDIN', format: 'POST', objective: 'Dar a conocer', scheduledDate: '2026-11-03', text: 'Hola', hashtags: ['#marca'], materials: '' } } }, ...extra });
  it('social posts are grouped by planned month; approved posts offer copy, download and the manual publication record', () => {
    const html = v.deliverablesHtml('social', [post()], []);
    expect(html).toContain('<h2>Redes sociales</h2>');
    expect(html).toContain('noviembre 2026');
    expect(html).toContain('Lanzamiento &lt;b&gt;');
    expect(html).toContain('Copiar texto');
    expect(html).toContain('Descargar .txt');
    expect(html).toContain('Brandopolis no publica por ti');
    expect(html).toContain('Registrar publicación');
    expect(html).toContain('Escrito por una persona');
    expect(html).toContain('Presentación en PowerPoint o PDF y documento de Word llegarán más adelante.');
    const published = v.deliverablesHtml('social', [post({ publications: [{ versionId: 'v1', publishedOn: '2026-11-04', url: 'https://example.com/p', note: null }] })], []);
    expect(published).toContain('Publicada el 4 de noviembre de 2026');
    expect(published).toContain('rel="noopener noreferrer"');
  });
  it('the plain text export carries the content of each type; ads say publication and spend come later', () => {
    expect(v.deliverableText(post().approved.content)).toBe('Lanzamiento <b>\n\nLinkedIn · Publicación · 2026-11-03\n\nHola\n\n#marca\n');
    expect(v.deliverablesHtml('ads', [], [])).toContain('La publicación y el gasto en anuncios llegarán con las conexiones');
    expect(v.AREA_TYPES.materials).toEqual(['SALES_PRESENTATION', 'OFFER_COPY', 'DESIGN_BRIEF']);
  });
  it('an offer copy form requires an offer and only offers active offers of the brand', () => {
    const ctx = { questions: [], decisions: [], versions: [] };
    expect(v.deliverableFormHtml('OFFER_COPY', ctx, [])).toContain('Necesitas una oferta: créala primero en Productos y servicios.');
    const html = v.deliverableFormHtml('OFFER_COPY', ctx, [{ id: 'o1', status: 'ACTIVE', approved: true, name: 'Diagnóstico' }, { id: 'o2', status: 'RETIRED', approved: true, name: 'Retirada' }]);
    expect(html).toContain('Diagnóstico');
    expect(html).not.toContain('Retirada');
  });
});

describe('ADR-0030 · Brando marketing proposal view', () => {
  const v = runInNewContext(source + '\n({brandoProposalHtml,deliverableFormHtml});') as { brandoProposalHtml: (r: unknown) => string; deliverableFormHtml: (t: string, c: unknown, o: unknown[], content?: unknown, d?: unknown) => string };
  const content = { type: 'SOCIAL_POST', name: 'Propuesta <x>', offerId: null, sourceDecisionVersionIds: [], body: { network: 'LINKEDIN', format: 'POST', objective: 'o', scheduledDate: null, text: 'Hola', hashtags: [], materials: '' } };
  it('labels DEMO honestly, explains why, cites approved information, lists what is missing and asks; never applies itself', () => {
    const html = v.brandoProposalHtml({ demo: true, proposal: { content, rationale: 'Usa tu mensaje', sources: [{ id: 'v1', label: 'Core Message' }], missing: ['Fecha'], questions: ['¿Cuándo?'] } });
    expect(html).toContain('Propuesta de ejemplo (modo DEMO, no generada por IA)');
    expect(html).toContain('Propuesta &lt;x&gt;');
    expect(html).toContain('<strong>Por qué:</strong> Usa tu mensaje');
    expect(html).toContain('Lo que falta para afinarla');
    expect(html).toContain('Preguntas para ti');
    expect(html).toContain('Usar esta propuesta en el formulario');
    expect(v.brandoProposalHtml({ proposal: null, error: 'UNAVAILABLE' })).toContain('el formulario sigue disponible');
  });
  it('the Brando panel appears only when creating; editing an existing draft keeps the manual form', () => {
    const ctx = { questions: [], decisions: [], versions: [] };
    expect(v.deliverableFormHtml('SOCIAL_POST', ctx, [])).toContain('Pedir una propuesta a Brando');
    expect(v.deliverableFormHtml('SOCIAL_POST', ctx, [], content, { id: 'd1' })).not.toContain('Pedir una propuesta a Brando');
  });
});
