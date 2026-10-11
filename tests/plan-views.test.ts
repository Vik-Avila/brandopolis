// PHASE4_SPEC §4.2 · Plan de Marketing projections (pure; no DOM, no requests).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync('src/transport/public/product-views.js', 'utf8').replace(/export (?=const |function )/g, '');
const views = runInNewContext(source + '\n({planHtml,actionFormHtml,objectiveFormHtml,moneyText,planActionBadge});') as {
  planHtml: (d: unknown, mode?: string) => string; actionFormHtml: (d: unknown, a?: unknown) => string;
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
    // Other Marketing areas are named as not available yet, never as a button.
    expect(html).toContain('Redes sociales, Sitio web y Campañas digitales se sumarán');
    expect(html).not.toMatch(/<button[^>]*>[^<]*(Redes sociales|Sitio web|Campañas digitales)/);
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
