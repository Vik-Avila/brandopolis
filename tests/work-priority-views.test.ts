// PHASE4_SPEC §4.9 · work priority projections (pure; no DOM, no requests). INT-001, INT-005, INT-008 at view level.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync('src/transport/public/product-views.js', 'utf8').replace(/export (?=const |function )/g, '');
const views = runInNewContext(source + '\n({priorityHtml,workIntentFieldsHtml,WORK_INTENTS,workIntentLabel,homeHtml,labels});') as {
  priorityHtml: (p: unknown, c: unknown, available?: Record<string, boolean>) => string;
  workIntentFieldsHtml: (prefix: string, current?: string | null, note?: string) => string;
  WORK_INTENTS: [string, string][];
  workIntentLabel: (id: string) => string; homeHtml: (c: unknown, d?: unknown, p?: unknown) => string; labels: Record<string, string>;
};
const MODULES = Object.keys(views.labels);
const context = (decided: string[] = []) => ({
  questions: MODULES.map(m => ({ id: `q-${m}`, module: m })),
  decisions: MODULES.map(m => ({ id: `d-${m}`, questionId: `q-${m}`, activeVersionId: decided.includes(m) ? `v-${m}` : null, reviewStatus: 'APPROVED' })),
  versions: [], dependencies: [], reviews: [], hypotheses: [], evidence: [], experiments: [], signals: [], learnings: [], userInputs: [], openQuestions: []
});

describe('PHASE4_SPEC §4.9 · work priority views', () => {
  it('the eleven offered choices plus the earlier CONTENT value cover exactly the schema intents', () => {
    const schema = JSON.parse(readFileSync('schemas/work-priority.schema.json', 'utf8')).properties.intent.enum;
    const shown = views.WORK_INTENTS.map(([k]) => k);
    expect([...shown, 'CONTENT'].sort()).toEqual([...schema].sort());
    expect(views.workIntentLabel('CONTENT')).toBe('Crear contenidos o materiales'); // earlier choices keep their name
  });

  it('INT-001 (owner list 2026-10-11): eleven understandable choices, «Otro» with an optional note, «No lo sé todavía»', () => {
    const html = views.workIntentFieldsHtml('brand');
    expect(html).toContain('¿Qué te gustaría trabajar primero con tu marca?');
    expect([...html.matchAll(/name="brand-intent" value="([A-Z_]+)"[^>]*> <span>([^<]+)/g)].map(m => m[2])).toEqual(['Mi estrategia completa', 'Un punto concreto de mi estrategia', 'Mis productos y servicios', 'Mi identidad visual', 'Mi Plan de Marketing', 'Mis redes sociales', 'Mi sitio web', 'Mis campañas digitales', 'Mis materiales de venta', 'Otro', 'No lo sé todavía']);
    expect(html).toMatch(/class="work-intent-note" hidden/);
    expect(html).toContain('no oculta nada y puedes cambiarlo después');
    const other = views.workIntentFieldsHtml('home', 'OTHER', 'Ordenar mi catálogo <b>');
    expect(other).not.toMatch(/class="work-intent-note" hidden/);
    expect(other).toContain('value="Ordenar mi catálogo &lt;b&gt;"');
    expect(views.priorityHtml({ intent: 'OTHER', note: 'Ordenar mi catálogo' }, context())).toContain('Nos contaste: «Ordenar mi catálogo»');
    expect(views.priorityHtml({ intent: 'SOCIAL_MEDIA' }, context(), { SOCIAL_MEDIA: true })).toContain('data-priority-area="SOCIAL_MEDIA"');
    expect(views.priorityHtml({ intent: 'SALES_MATERIALS' }, context(), { SALES_MATERIALS: true })).toContain('Materiales de venta');
  });

  it('full strategy and a single point lead to different suggestions; a point never forces the nine decisions', () => {
    expect(views.priorityHtml({ intent: 'STRATEGY_FULL' }, context())).toContain('recorrido completo de las nueve decisiones');
    const point = views.priorityHtml({ intent: 'STRATEGY_POINT' }, context(['Positioning']));
    expect(point).toContain('No necesitas recorrer las nueve decisiones');
    expect(point.match(/data-attention-module=/g)).toHaveLength(9);
    expect(point).toContain('Posicionamiento · Definida');
  });

  it('an area that does not exist yet is named honestly, without a button to it (no fake capability)', () => {
    const html = views.priorityHtml({ intent: 'WEBSITE' }, context());
    expect(html).toContain('todavía no está disponible en tu espacio');
    expect(html).not.toContain('data-priority-area');
    expect(html.match(/data-attention-module=/g)).toHaveLength(2);
    expect(views.priorityHtml({ intent: 'WEBSITE' }, context(), { WEBSITE: true })).toContain('data-priority-area="WEBSITE"');
  });

  it('«ayúdame a elegir» suggests the first undecided decisions deterministically; no priority invites a choice', () => {
    const help = views.priorityHtml({ intent: 'HELP_ME_CHOOSE' }, context(['Strategic Objective']));
    expect(help).toContain('data-attention-module="Market Arena"');
    expect(help).not.toContain('data-attention-module="Strategic Objective"');
    expect(views.priorityHtml(null, context())).toContain('Aún no has elegido por dónde empezar');
    expect(views.homeHtml(context(), undefined)).not.toContain('Tu prioridad');
    expect(views.homeHtml(context(), undefined, null)).toContain('Tu prioridad');
  });
});
