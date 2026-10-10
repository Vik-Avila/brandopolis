/**
 * Mapa estratégico ejecutivo (ADR-0028; formerly the Blueprint export). A short executive document for
 * leadership: what was decided, why, how it connects, what is in tension, what is being validated and what to
 * decide next. Built from canonical state, not a picture of a screen.
 *
 * Truthfulness rules, enforced here rather than left to the caller:
 *  - only the ACTIVE version of a decision appears; superseded versions never do;
 *  - AI proposals are not decisions and are never exported as one;
 *  - hypotheses are printed under an explicit heading that says they are unvalidated;
 *  - discarded competitive findings are absent — rejecting one means it is not part of the context;
 *  - a section with no approved data says «Aún no definido» instead of inventing content.
 */
import { EditorialPdf, PAGE, measure } from './pdf-editorial.js';
import { brandKnowledge, documentSlug, kindLabel, longDate, shortDate, verdictText, type BrandDocumentInput } from './brand-documents.js';
import { Composer, paperBackground, EMERALD, EMERALD_TINT, CHAMPAGNE, CHAMPAGNE_TINT, INK, MUTED, SOFT, LINE } from './editorial-kit.js';

export type BlueprintInput = BrandDocumentInput;
const NOT_DEFINED = 'Aún no definido';

/** Safe download name: Brandopolis-Blueprint-<brand-slug>-YYYY-MM-DD.pdf (kept for links already shared). */
export function blueprintFilename(brandName: string, generatedAt: Date): string {
  return `Brandopolis-Blueprint-${documentSlug(brandName)}-${generatedAt.toISOString().slice(0, 10)}.pdf`;
}

export function buildBlueprintPdf(input: BlueprintInput): Uint8Array {
  const k = brandKnowledge(input);
  const pdf = new EditorialPdf({ top: 64, bottom: 70, left: 60, right: 60 });
  const ui = new Composer(pdf);
  const L = pdf.margin.left, W = pdf.contentWidth;

  // --- Cover --------------------------------------------------------------------------------------------------
  const cover = pdf.newPage();
  paperBackground(pdf, cover);
  ui.credit(L, 60, 'BRANDOPOLIS · MAPA ESTRATÉGICO EJECUTIVO', cover, 26);
  pdf.y = 250;
  pdf.text('Mapa estratégico de la marca', { size: 13, face: 'sansBold', color: MUTED, after: 8 });
  pdf.text(k.brand.name, { size: 38, face: 'serif', color: EMERALD, leading: 44, after: 14 });
  pdf.rule(L, pdf.y, L + 56, pdf.y, { color: CHAMPAGNE, line: 1.6 });
  pdf.y += 18;
  if (k.brand.isDemo) pdf.text('Marca demo · espacio de práctica, no es una marca real', { size: 10.5, face: 'sansBold', color: MUTED, after: 6 });
  pdf.text(`${k.defined.length} de ${k.decisions.length} decisiones aprobadas por personas`, { size: 12, color: INK, after: 4 });
  pdf.text(`Generado el ${longDate(k.generatedAt)} · Instantánea ${k.snapshot}`, { size: 10, color: MUTED, after: 4 });
  pdf.textAt(L, PAGE.height - 96, 'La IA propone. Tú decides. Brandopolis recuerda.', { size: 11, face: 'serifItalic', color: EMERALD, page: cover });
  pdf.textAt(L, PAGE.height - 78, 'Este documento refleja el estado estratégico vigente al momento de su generación.', { size: 8.5, color: MUTED, page: cover });

  // --- Executive summary --------------------------------------------------------------------------------------
  ui.chapter('Estado estratégico', { eyebrow: 'Resumen ejecutivo', page: true });
  const objective = k.byModule('Strategic Objective')?.option, customer = k.byModule('Primary Customer')?.option, positioning = k.byModule('Positioning')?.option;
  const summary = [
    objective ? `El objetivo vigente es: ${objective}` : null,
    customer ? `El cliente principal decidido es: ${customer}` : null,
    positioning ? `La marca se posiciona así: ${positioning}` : null
  ].filter(Boolean).join(' ');
  if (summary) ui.callout(summary, { size: 11.5 });
  else ui.note('Aún no hay decisiones centrales aprobadas; el resumen se completará a medida que el equipo decida.');
  const col = (W - 24) / 2, top = pdf.y;
  const facts: [string, string][] = [
    ['Decisiones aprobadas', `${k.defined.length} de ${k.decisions.length}`],
    ['Influencia geográfica', k.geography ?? NOT_DEFINED],
    ['Mercado principal', k.primaryMarket?.trim() || NOT_DEFINED],
    ['Contexto competitivo', k.competitiveStatus],
    ['Coherencia estratégica', verdictText(k.verdict, k.defined.length) ?? NOT_DEFINED],
    ['Decisiones en revisión', k.reviewing.length ? k.reviewing.map(d => d.label).join(', ') : 'Ninguna']
  ];
  let leftY = top, rightY = top;
  facts.forEach(([label, value], i) => {
    const x = i % 2 ? L + col + 24 : L;
    pdf.y = i % 2 ? rightY : leftY;
    ui.field(label, value, { x, width: col });
    if (i % 2) rightY = pdf.y; else leftY = pdf.y;
  });
  pdf.y = Math.max(leftY, rightY) + 4;

  // --- The nine decisions at a glance (3 × 3) --------------------------------------------------------------------
  ui.chapter('Decisiones estratégicas', { eyebrow: 'Las decisiones de un vistazo', page: true });
  const gap = 10, cw = (W - gap * 2) / 3, ch = 150;
  const gridTop = pdf.y;
  k.decisions.forEach((d, i) => {
    const r = Math.floor(i / 3), c = i % 3, x = L + c * (cw + gap), y = gridTop + r * (ch + gap);
    pdf.rect(x, y, cw, ch, { fill: d.option ? (d.review ? CHAMPAGNE_TINT : [0.992, 0.988, 0.976]) : [0.965, 0.957, 0.941], stroke: LINE, line: 0.5 });
    pdf.rect(x, y, cw, 2.5, { fill: d.option ? (d.review ? CHAMPAGNE : EMERALD) : LINE });
    pdf.textAt(x + 10, y + 20, d.number, { size: 9, face: 'sansBold', color: d.option ? EMERALD : SOFT });
    pdf.textAt(x + 28, y + 20, d.label, { size: 9.5, face: 'sansBold', color: INK });
    const lines = (d.option ? wrapLines(d.option, cw - 20, 9.5) : [NOT_DEFINED]);
    const shown = lines.slice(0, 7);
    if (lines.length > 7) shown[6] = `${shown[6].replace(/\s+\S*$/, '')}…`;
    shown.forEach((line, j) => pdf.textAt(x + 10, y + 40 + j * 13, line, { size: 9.5, face: d.option ? 'serif' : 'sansItalic', color: d.option ? INK : SOFT }));
    const foot = d.option ? `${d.review ? 'En revisión · ' : ''}v${d.sequence} · ${shortDate(d.approvedAt)}` : 'Pendiente';
    pdf.textAt(x + 10, y + ch - 11, foot, { size: 7.5, color: d.review ? [0.55, 0.40, 0.12] : MUTED });
  });
  pdf.y = gridTop + Math.ceil(k.decisions.length / 3) * (ch + gap) + 6;
  ui.note('El texto completo y el criterio de cada decisión están en las páginas siguientes.');

  // --- Each decision with its rationale ------------------------------------------------------------------------
  ui.chapter('Fundamentos de cada decisión', { eyebrow: 'Qué se decidió y por qué', page: true });
  for (const d of k.decisions) {
    pdf.ensure(d.option ? 110 : 50);
    pdf.text(`${d.number} · ${d.label}`, { size: 12.5, face: 'serifBold', color: INK, after: 3 });
    if (!d.option) { pdf.text(NOT_DEFINED, { size: 10.5, face: 'sansItalic', color: SOFT, after: 14 }); continue; }
    if (d.review) ui.tag('EN REVISIÓN');
    pdf.text(d.option, { size: 11, color: INK, after: 4 });
    ui.label('Por qué');
    pdf.text(d.rationale?.trim() || NOT_DEFINED, { size: 10, color: INK, after: 3 });
    pdf.text(`Versión vigente v${d.sequence} · aprobada el ${longDate(new Date(d.approvedAt ?? 0))} por el Estratega de Marca`, { size: 8.5, color: MUTED, after: 6 });
    pdf.rule(L, pdf.y, L + W, pdf.y, { color: LINE, line: 0.4 });
    pdf.y += 10;
  }

  // --- Relationships and tensions ------------------------------------------------------------------------------
  ui.chapter('Cómo se conectan', { eyebrow: 'Relaciones entre decisiones' });
  const links = k.decisions.flatMap(d => d.affects.map(a => ({ from: d.label, to: a.label, kind: a.kind })));
  if (!links.length) ui.note('Aún no hay decisiones conectadas.');
  for (const link of links) pdf.text(`${link.from} orienta a ${link.to} · ${kindLabel(link.kind)}`, { size: 10, color: INK, after: 2 });
  pdf.y += 6;
  ui.section('Coherencia estratégica');
  ui.note('Puntos detectados por las reglas de Brandopolis sobre lo registrado. No son decisiones ni certezas: el equipo decide qué revisar.');
  if (!k.issues.length && !k.reviewing.length) pdf.text('No se detectaron tensiones ni revisiones pendientes.', { size: 10.5, color: INK });
  for (const d of k.reviewing) pdf.text(`Requiere revisión · ${d.label} tiene un cambio conectado por revisar.`, { size: 10.5, color: INK, after: 3 });
  for (const issue of k.issues) pdf.text(`${issue.severity === 'CONFLICT' ? 'Contradicción' : issue.severity === 'REVIEW' ? 'Requiere revisión' : 'Información'} · ${issue.text}`, { size: 10.5, color: INK, after: 3 });

  // --- Validation ----------------------------------------------------------------------------------------------
  ui.chapter('Validación', { eyebrow: 'Lo que se está poniendo a prueba' });
  ui.label('Hipótesis · sin validar, no son hechos');
  const open = k.hypotheses.filter(h => h.status !== 'REJECTED');
  if (!open.length) ui.note('Aún no se declaran hipótesis para esta marca.');
  for (const h of open) { pdf.text(h.statement, { size: 10.5, color: INK, after: 1 }); pdf.text(`${h.state}${h.status === 'SUPPORTED' ? ' · sigue siendo una hipótesis' : ''}`, { size: 8.5, color: MUTED, after: 6 }); }
  pdf.y += 4;
  ui.label('Aprendizajes aceptados');
  if (!k.learnings.length) ui.note('Aún no hay aprendizajes aceptados.');
  for (const l of k.learnings) { pdf.text(l.interpretation, { size: 10.5, color: INK, after: 1 }); pdf.text(`Límites: ${l.limitations.join('; ') || 'No declarados'}`, { size: 8.5, color: MUTED, after: 6 }); }

  // --- Next decisions ------------------------------------------------------------------------------------------
  ui.chapter('Próximas decisiones', { eyebrow: 'Qué decidir después' });
  if (!k.next.length && !k.reviewing.length) pdf.text('Todas las decisiones tienen una versión vigente. El siguiente paso es validar y revisar cuando cambie el contexto.', { size: 10.5, color: INK });
  for (const d of k.reviewing) pdf.text(`Revisar ${d.label}: un cambio conectado pide una revisión humana.`, { size: 10.5, color: INK, after: 3 });
  for (const d of k.next) pdf.text(`Decidir ${d.number} · ${d.label}.${d.dependsOn.length ? ` Se apoya en: ${d.dependsOn.map(x => x.label).join(', ')}.` : ''}`, { size: 10.5, color: INK, after: 3 });

  // --- Context -------------------------------------------------------------------------------------------------
  ui.chapter('Contexto competitivo', { eyebrow: 'Entorno', page: true });
  pdf.text(`Estado: ${k.competitiveStatus}`, { size: 9.5, color: MUTED, after: 6 });
  if (!k.competitive.length) ui.note('Todavía no se han incorporado hallazgos externos al contexto competitivo.');
  else ui.note('Sólo aparecen los hallazgos que el equipo decidió incorporar. Los descartados no forman parte del contexto.');
  for (const e of k.competitive) { pdf.text(e.claim, { size: 10.5, color: INK, after: 1 }); pdf.text(`${e.source || 'Fuente no declarada'} · ${e.date || 's/f'} · Límites: ${e.limitations.join('; ') || 'No declarados'}`, { size: 8.5, color: MUTED, after: 7 }); }

  ui.chapter('Contexto estratégico', { eyebrow: 'Lo que la marca declaró y documentó' });
  ui.label('Aportaciones del Estratega de Marca');
  const contributions = input.context.userInputs.map(i => String(i?.statement ?? '')).filter(Boolean);
  if (!contributions.length) ui.note('Aún no hay aportaciones registradas.');
  for (const s of contributions) pdf.text(s, { size: 10.5, color: INK, after: 4 });
  pdf.y += 4;
  ui.label('Evidencia registrada');
  if (!k.evidence.length) ui.note('Sin evidencia registrada fuera del entorno competitivo.');
  for (const e of k.evidence) { pdf.text(e.claim, { size: 10.5, color: INK, after: 1 }); pdf.text(`${e.source || 'Fuente no declarada'} · ${e.date || 's/f'} · Límites: ${e.limitations.join('; ') || 'No declarados'}`, { size: 8.5, color: MUTED, after: 7 }); }

  // --- Traceability annex --------------------------------------------------------------------------------------
  ui.chapter('Anexo · Trazabilidad', { eyebrow: 'Versiones y fuentes', page: true });
  ui.note('Cada decisión muestra su versión vigente y cuántas versiones tiene su historial. Las versiones anteriores se conservan en Brandopolis y no se reproducen aquí.');
  for (const d of k.decisions) pdf.text(`${d.number} · ${d.label} — ${d.option ? `v${d.sequence} vigente de ${d.versions} · ${shortDate(d.approvedAt)}` : 'sin versión'}`, { size: 9.5, color: INK, after: 2 });
  pdf.y += 8;
  ui.field('Instantánea del contexto', `${k.snapshot} · ${longDate(k.generatedAt)}`);
  ui.note('Fuentes: decisiones aprobadas por personas, aportaciones declaradas, evidencia con fuente y aprendizajes aceptados de esta marca. No incluye propuestas de IA, reflexiones personales ni información de otras marcas.');
  pdf.y += 6;
  pdf.rect(L, pdf.y, W, 1, { fill: EMERALD_TINT });
  pdf.y += 10;
  pdf.text('Este documento refleja el estado estratégico vigente al momento de su generación.', { size: 9, face: 'sansItalic', color: MUTED });

  return pdf.build({
    title: `Mapa estratégico · ${k.brand.name}`, subject: 'Mapa estratégico ejecutivo', created: k.generatedAt,
    footer: (page, total) => page === 0 ? null : { left: `Brandopolis · ${k.brand.isDemo ? 'Marca demo · ' : ''}Mapa estratégico ejecutivo · ${k.brand.name}`, right: `${page + 1} / ${total}` }
  });
}

function wrapLines(text: string, width: number, size: number) {
  // Grid cells use the serif face; Helvetica metrics × 0.93 are a safe upper bound.
  const words = text.split(/\s+/).filter(Boolean), lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (approx(candidate, size) <= width) { line = candidate; continue; }
    if (line) lines.push(line);
    line = word.length > 40 ? `${word.slice(0, 38)}…` : word;
  }
  if (line) lines.push(line);
  return lines;
}
const approx = (text: string, size: number) => measure(text, size, 'serif');
