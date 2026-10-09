/**
 * Brand Book integral (ADR-0028). The brand's own reference document: an editorial A4 book whose chapters
 * adapt to what the brand has really documented. It is the brand's document, not Brandopolis's: neutral
 * typography, a typographic cover (Brandopolis holds no logo or identity assets for brands) and only a
 * discreet «Elaborado con Brandopolis» credit.
 *
 * Content rules, enforced here:
 *  - sources are only the authorized, current and traceable state of THIS brand (brandKnowledge);
 *  - every block carries its standing: Aprobado, Observación documentada, Aprendizaje aceptado, Hipótesis,
 *    Declarado or No documentado. AI proposals are never part of the book;
 *  - mission, vision, values, colours, typography, personality and voice are never invented: when they are
 *    not documented, the book says so in its own chapter;
 *  - a chapter with nothing documented is omitted (and listed as not documented), never padded;
 *  - the table of contents is laid out after the chapters, with their real page numbers and links;
 *  - it needs no AI: it is a deterministic projection of stored state.
 */
import { EditorialPdf, PAGE, measure } from './pdf-editorial.js';
import { brandKnowledge, documentSlug, kindLabel, longDate, shortDate, verdictText, type BrandDocumentInput, type Decision } from './brand-documents.js';
import { Composer, NEUTRAL_ACCENT, INK, MUTED, SOFT, LINE, type Standing } from './editorial-kit.js';

/** Safe download name: Brandopolis-Brand-Book-<brand-slug>-YYYY-MM-DD.pdf */
export function brandBookFilename(brandName: string, generatedAt: Date): string {
  return `Brandopolis-Brand-Book-${documentSlug(brandName)}-${generatedAt.toISOString().slice(0, 10)}.pdf`;
}

type ChapterSpec = { title: string; eyebrow: string; module?: string; intro: string };
const DECISION_CHAPTERS: ChapterSpec[] = [
  { title: 'Cliente principal', eyebrow: 'Para quién existe la marca', module: 'Primary Customer', intro: 'La persona o el grupo al que la marca decidió servir primero.' },
  { title: 'Propuesta de valor', eyebrow: 'Cómo crea valor', module: 'Value Mechanism', intro: 'El mecanismo con el que la marca crea y captura valor para su cliente principal.' },
  { title: 'Posicionamiento', eyebrow: 'El lugar que quiere ocupar', module: 'Positioning', intro: 'Cómo quiere ser percibida frente a las alternativas de su mercado.' },
  { title: 'Promesa de marca', eyebrow: 'Lo que la marca se compromete a cumplir', module: 'Brand Promise', intro: 'El compromiso que la marca asume con su cliente y que debe sostener en cada contacto.' },
  { title: 'Mensaje central', eyebrow: 'Lo que la marca dice', module: 'Core Message', intro: 'La idea principal que la marca comunica. Es un mensaje aprobado, no una guía de voz ni de tono.' }
];

export function buildBrandBookPdf(input: BrandDocumentInput): Uint8Array {
  const k = brandKnowledge(input);
  const pdf = new EditorialPdf({ top: 70, bottom: 74, left: 66, right: 66 });
  const ui = new Composer(pdf, NEUTRAL_ACCENT);
  const L = pdf.margin.left, W = pdf.contentWidth;
  const toc: { title: string; page: number; level: 0 | 1 }[] = [];
  let chapterNo = 0;
  // A chapter opens a new page unless more than half of the current one is still free, so length follows content.
  const chapter = (title: string, eyebrow: string, intro: string, newPage = pdf.remaining() < (pdf.bottom - pdf.margin.top) * 0.55) => {
    chapterNo += 1;
    const page = ui.chapter(title, { eyebrow: `Capítulo ${chapterNo} · ${eyebrow}`, page: newPage, intro });
    toc.push({ title, page, level: 0 });
  };
  const decisionBlock = (d: Decision) => {
    ui.tag(d.review ? 'EN REVISIÓN' : 'APROBADO');
    ui.callout(d.option ?? '', { size: 13 });
    if (d.rationale?.trim()) { ui.label('Criterio de la decisión'); ui.body(d.rationale, { after: 8 }); }
    if (d.review) ui.note('Un cambio en una decisión conectada pide revisar esta decisión. Sigue vigente hasta que una persona la revise.');
    if (d.dependsOn.length) { ui.label('Se apoya en'); ui.body(d.dependsOn.map(x => `${x.label} (${kindLabel(x.kind)})`).join(' · '), { size: 9.5, after: 6 }); }
    if (d.affects.length) { ui.label('Orienta a'); ui.body(d.affects.map(x => `${x.label} (${kindLabel(x.kind)})`).join(' · '), { size: 9.5, after: 6 }); }
    ui.note(`Fuente: decisión aprobada por una persona · versión vigente v${d.sequence} del ${longDate(new Date(d.approvedAt ?? 0))}${d.versions > 1 ? ` · ${d.versions - 1} versión(es) anterior(es) conservada(s) en el historial` : ''}.`);
  };
  const standingLine = (standing: Standing, text: string, meta?: string) => {
    pdf.ensure(46);
    ui.tag(standing);
    ui.body(text, { after: meta ? 1 : 8 });
    if (meta) ui.note(meta);
  };

  // --- Cover (typographic: the brand has no identity assets in Brandopolis) -----------------------------------
  const cover = pdf.newPage();
  pdf.rect(0, 0, PAGE.width, PAGE.height, { fill: [0.976, 0.972, 0.962], page: cover });
  pdf.rect(L, 92, 28, 2, { fill: INK, page: cover });
  pdf.textAt(L, 120, 'BRAND BOOK', { size: 10, face: 'sansBold', color: MUTED, page: cover });
  pdf.y = 300;
  pdf.text(k.brand.name, { size: 46, face: 'serif', color: INK, leading: 52, after: 18, width: W });
  pdf.text('Libro de marca · decisiones, fundamentos y evidencia', { size: 13, face: 'serifItalic', color: MUTED, after: 24 });
  if (k.brand.isDemo) pdf.text('Marca demo · espacio de práctica, no es una marca real', { size: 10, face: 'sansBold', color: MUTED, after: 6 });
  pdf.text(`${longDate(k.generatedAt)} · Instantánea ${k.snapshot}`, { size: 10, color: MUTED });
  pdf.rule(L, PAGE.height - 110, L + W, PAGE.height - 110, { color: LINE, page: cover, line: 0.5 });
  pdf.textAt(L, PAGE.height - 90, 'Elaborado con Brandopolis', { size: 8.5, color: SOFT, page: cover });
  pdf.textAt(L + W, PAGE.height - 90, 'Documento generado a partir del estado vigente', { size: 8.5, color: SOFT, align: 'right', page: cover });

  // --- Table of contents: reserved now, filled after layout with the real page numbers ------------------------
  const tocPage = pdf.newPage();

  // --- How to read --------------------------------------------------------------------------------------------
  pdf.newPage();
  pdf.text('CÓMO LEER ESTE LIBRO', { size: 8, face: 'sansBold', color: NEUTRAL_ACCENT.rule, after: 2 });
  pdf.text('Qué es cada afirmación', { size: 24, face: 'serif', color: INK, leading: 28, after: 8 });
  pdf.bookmark('Cómo leer este libro'); toc.push({ title: 'Cómo leer este libro', page: pdf.index, level: 0 });
  pdf.rule(L, pdf.y, L + 36, pdf.y, { color: NEUTRAL_ACCENT.rule, line: 1.4 }); pdf.y += 14;
  ui.body('Este libro reúne lo que la marca ha decidido y documentado en Brandopolis. Cada bloque indica qué tipo de afirmación es, para que nadie confunda una hipótesis con un hecho ni una propuesta con una decisión.', { after: 12 });
  const legend: [Standing, string][] = [
    ['APROBADO', 'Decisión vigente aprobada por una persona. Es la versión actual; las anteriores se conservan en el historial.'],
    ['OBSERVACIÓN DOCUMENTADA', 'Evidencia registrada con una fuente y sus límites.'],
    ['APRENDIZAJE ACEPTADO', 'Interpretación de señales que una persona revisó y aceptó.'],
    ['HIPÓTESIS', 'Creencia por validar. No es un hecho, aunque esté en prueba o respaldada.'],
    ['DECLARADO', 'Lo que el equipo declaró sobre la marca al empezar. Es contexto, no una decisión.'],
    ['EN REVISIÓN', 'Decisión vigente que un cambio conectado pide revisar.'],
    ['NO DOCUMENTADO', 'Elemento que la marca aún no ha documentado. El libro no lo inventa.']
  ];
  for (const [standing, text] of legend) { ui.tag(standing); ui.body(text, { size: 10, after: 8 }); }
  ui.note('Las propuestas de la IA nunca forman parte de este libro: sólo lo que una persona decidió, registró o aceptó.');

  // --- 1. Introduction ----------------------------------------------------------------------------------------
  const objective = k.byModule('Strategic Objective');
  if (k.declared.building || k.declared.goal || k.declared.stage || objective?.option) {
    chapter('Introducción a la marca', 'Qué es y qué busca', 'Lo que la marca es hoy y el objetivo que orienta sus decisiones.', true);
    if (k.declared.building) standingLine('DECLARADO', k.declared.building, 'Qué está construyendo, según el equipo.');
    if (k.declared.stage) standingLine('DECLARADO', k.declared.stage, 'Punto de partida declarado.');
    if (k.declared.goal) standingLine('DECLARADO', k.declared.goal, 'Objetivo inmediato declarado al empezar.');
    if (objective?.option) { ui.section('Objetivo estratégico'); decisionBlock(objective); }
  }

  // --- 2. Market ----------------------------------------------------------------------------------------------
  const arena = k.byModule('Market Arena');
  if (arena?.option || k.geography || k.primaryMarket || k.competitive.length || k.declared.references) {
    chapter('Contexto de mercado', 'Dónde compite', 'El mercado que la marca eligió y lo documentado sobre su entorno.');
    if (k.geography || k.primaryMarket) {
      const top = pdf.y, col = (W - 24) / 2;
      ui.field('Influencia geográfica', k.geography ?? 'No documentada', { x: L, width: col });
      const after = pdf.y; pdf.y = top;
      ui.field('Mercado principal', k.primaryMarket?.trim() || 'No documentado', { x: L + col + 24, width: col });
      pdf.y = Math.max(after, pdf.y);
    }
    if (arena?.option) { ui.section('Mercado objetivo'); decisionBlock(arena); }
    if (k.competitive.length || k.declared.references) {
      ui.section('Entorno competitivo');
      if (k.declared.references) standingLine('DECLARADO', k.declared.references, 'Referencias competitivas aportadas por el equipo.');
      for (const e of k.competitive) standingLine('OBSERVACIÓN DOCUMENTADA', e.claim, `${e.source || 'Fuente no declarada'} · ${e.date || 's/f'} · Límites: ${e.limitations.join('; ') || 'no declarados'}`);
      ui.note('Sólo aparecen los hallazgos que el equipo decidió incorporar.');
    }
  }

  // --- 3–7. Customer, value, positioning, promise, message ---------------------------------------------------
  for (const spec of DECISION_CHAPTERS) {
    const d = k.byModule(spec.module!);
    if (!d?.option) continue;
    chapter(spec.title, spec.eyebrow, spec.intro);
    decisionBlock(d);
  }

  // --- 8. Implementation priorities ---------------------------------------------------------------------------
  const gtm = k.byModule('GTM Priority'), experiment = k.byModule('Priority Experiment');
  if (gtm?.option || experiment?.option) {
    chapter('Prioridades de implementación', 'Por dónde empezar', 'Cómo la marca decidió salir al mercado y qué supuesto valida primero.');
    if (gtm?.option) { ui.section('Prioridad de lanzamiento'); decisionBlock(gtm); }
    if (experiment?.option) { ui.section('Experimento prioritario'); decisionBlock(experiment); }
  }

  // --- 9. Strategic consistency -------------------------------------------------------------------------------
  const links = k.decisions.flatMap(d => d.affects.map(a => ({ from: d.label, to: a.label, kind: a.kind })));
  if (links.length || k.issues.length || k.reviewing.length) {
    chapter('Consistencia estratégica', 'Cómo encajan las decisiones', 'Las conexiones entre decisiones y los puntos que las reglas de Brandopolis piden revisar. No son veredictos de la IA: el equipo decide.');
    if (k.verdict) ui.field('Lectura de coherencia', verdictText(k.verdict, k.defined.length) ?? 'Sin lectura');
    if (links.length) { ui.section('Conexiones'); for (const link of links) ui.body(`${link.from} orienta a ${link.to} · ${kindLabel(link.kind)}`, { size: 10, after: 2 }); pdf.y += 6; }
    if (k.reviewing.length || k.issues.length) {
      ui.section('Puntos por revisar');
      for (const d of k.reviewing) standingLine('EN REVISIÓN', `${d.label}: un cambio conectado pide una revisión humana.`);
      for (const issue of k.issues) standingLine('EN REVISIÓN', `${issue.severity === 'CONFLICT' ? 'Contradicción · ' : ''}${issue.text}`);
    }
  }

  // --- 10. Validation and evidence ----------------------------------------------------------------------------
  if (k.evidence.length || k.hypotheses.length || k.learnings.length) {
    chapter('Validación y evidencia', 'Lo que se sabe y lo que se prueba', 'La evidencia documentada, lo que el equipo aprendió y las hipótesis que todavía se ponen a prueba.');
    if (k.evidence.length) { ui.section('Observaciones documentadas'); for (const e of k.evidence) standingLine('OBSERVACIÓN DOCUMENTADA', e.claim, `${e.source || 'Fuente no declarada'} · ${e.date || 's/f'} · Límites: ${e.limitations.join('; ') || 'no declarados'}`); }
    if (k.learnings.length) { ui.section('Aprendizajes aceptados'); for (const l of k.learnings) standingLine('APRENDIZAJE ACEPTADO', l.interpretation, `Límites: ${l.limitations.join('; ') || 'no declarados'}`); }
    const open = k.hypotheses.filter(h => h.status !== 'REJECTED'), rejected = k.hypotheses.filter(h => h.status === 'REJECTED');
    if (open.length) { ui.section('Hipótesis · sin validar, no son hechos'); for (const h of open) standingLine('HIPÓTESIS', h.statement, h.state); }
    if (rejected.length) { ui.section('Hipótesis descartadas'); ui.note('Creencias que un aprendizaje aceptado rechazó. Se conservan para no repetirlas; no orientan decisiones.'); for (const h of rejected) standingLine('HIPÓTESIS', h.statement, h.state); }
  }

  // --- 11. Not documented -------------------------------------------------------------------------------------
  chapter('Lo que aún no está documentado', 'Sin inventar', 'Elementos habituales de un libro de marca que esta marca todavía no ha documentado en Brandopolis. El libro no los completa por su cuenta.');
  for (const [title, why] of k.undocumented) standingLine('NO DOCUMENTADO', title, why);
  const pendingDecisions = k.decisions.filter(d => !d.option && d.module !== 'Primary Customer');
  if (pendingDecisions.length) standingLine('NO DOCUMENTADO', `Decisiones pendientes: ${pendingDecisions.map(d => d.label).join(', ')}.`, 'Aún no tienen una versión aprobada.');

  // --- Annex --------------------------------------------------------------------------------------------------
  chapter('Anexo · Fuentes y trazabilidad', 'De dónde sale cada afirmación', 'Versiones vigentes y fuentes de este libro.', true);
  for (const d of k.decisions) ui.body(`${d.number} · ${d.label} — ${d.option ? `v${d.sequence} vigente · ${shortDate(d.approvedAt)} · ${d.versions} versión(es) en el historial` : 'sin versión aprobada'}`, { size: 9.5, after: 2 });
  pdf.y += 8;
  if (k.evidence.length || k.competitive.length) {
    ui.label('Fuentes de evidencia');
    for (const e of [...k.evidence, ...k.competitive]) ui.body(`${e.source || 'Fuente no declarada'} · ${e.date || 's/f'}`, { size: 9.5, after: 2 });
    pdf.y += 8;
  }
  ui.field('Instantánea del contexto', `${k.snapshot} · generado el ${longDate(k.generatedAt)}`);
  ui.note('Incluye sólo información vigente, autorizada y trazable de esta marca: decisiones aprobadas por personas, aportaciones declaradas, evidencia con fuente, aprendizajes aceptados e hipótesis con su estado. No incluye propuestas de IA, reflexiones personales, documentos personales ni información de otras marcas.');

  // --- Fill the table of contents with real page numbers ------------------------------------------------------
  let y = 118;
  pdf.textAt(L, 94, 'ÍNDICE', { size: 8, face: 'sansBold', color: NEUTRAL_ACCENT.rule, page: tocPage });
  pdf.textAt(L, y, 'Contenido', { size: 24, face: 'serif', color: INK, page: tocPage });
  y += 34;
  for (const entry of toc) {
    const number = String(entry.page + 1), title = entry.title;
    pdf.textAt(L, y, title, { size: 11.5, face: 'serif', color: INK, page: tocPage });
    pdf.textAt(L + W, y, number, { size: 11, color: MUTED, align: 'right', page: tocPage });
    const from = L + measure(title, 11.5, 'serif') + 8, to = L + W - measure(number, 11, 'sans') - 8;
    if (to > from) pdf.rule(from, y - 2, to, y - 2, { color: LINE, line: 0.4, page: tocPage });
    pdf.link(tocPage, [L, y - 12, W, 16], entry.page);
    y += 24;
  }
  pdf.outline.unshift({ title: 'Índice', page: tocPage });

  return pdf.build({
    title: `Brand Book · ${k.brand.name}`, subject: 'Brand Book integral', created: k.generatedAt,
    footer: (page, total) => page === 0 ? null : { left: `${k.brand.name} · Brand Book${k.brand.isDemo ? ' · Marca demo' : ''} · Elaborado con Brandopolis`, right: `${page + 1} / ${total}` }
  });
}
