/**
 * The Blueprint estratégico export.
 *
 * This is a strategic document built from canonical state, not a picture of a screen. Everything in
 * it is something the Estratega de Marca decided or registered: the current approved version of each
 * decision, the context they captured, the competitive findings they chose to incorporate.
 *
 * Truthfulness rules, enforced here rather than left to the caller:
 *  - only the ACTIVE version of a decision appears; superseded versions never do;
 *  - AI proposals are not decisions and are never exported as one;
 *  - hypotheses are printed under an explicit heading that says they are unvalidated;
 *  - discarded competitive findings are absent — rejecting one means it is not part of the context;
 *  - a section with no approved data says «Aún no definido» instead of inventing content.
 */
import { PdfBuilder } from './pdf-writer.js';

const GEOGRAPHY_LABELS: Record<string, string> = {
  LOCAL: 'Local', REGIONAL: 'Regional', STATE: 'Estatal',
  NATIONAL: 'Nacional', LATAM: 'Latinoamérica', GLOBAL: 'Global'
};

const MODULE_LABELS: Record<string, string> = {
  'Primary Customer': 'Cliente principal',
  'Value Mechanism': 'Modelo de valor',
  Positioning: 'Posicionamiento',
  'Core Message': 'Mensaje principal'
};

const DEPENDENCY_LABELS: Record<string, string> = {
  HARD: 'Dependencia estricta', SOFT: 'Dependencia sugerida', INFORMATIVE: 'Informativa'
};

const NOT_DEFINED = 'Aún no definido';

export type BlueprintInput = {
  brand: { name: string; isDemo: boolean; geographicInfluence?: string | null; primaryMarket?: string | null };
  context: {
    questions: { id: string; module: string }[];
    decisions: { id: string; questionId: string; activeVersionId: string | null }[];
    versions: { id: string; decisionId: string; sequence: number; selectedOption: string; rationale: string; approvedAt: string }[];
    dependencies: { upstreamDecisionId: string; downstreamDecisionId: string; kind: string }[];
    userInputs: { statement?: string }[];
    evidence: { claim?: string; source?: string; sourceDate?: string; provenance?: string; limitations?: string[] }[];
    hypotheses: { statement?: string; status?: string }[];
    learnings: { interpretation?: string; status?: string; limitations?: string[] }[];
  };
  competitiveStatus: string;
  generatedAt: Date;
};

const COMPETITIVE_MARK = 'Entorno competitivo';

/** Evidence that came from competitive research, i.e. findings the participant incorporated. */
function competitiveFindings(evidence: BlueprintInput['context']['evidence']) {
  return evidence.filter(item =>
    String(item?.provenance ?? '').toLowerCase().includes(COMPETITIVE_MARK.toLowerCase())
    || String(item?.claim ?? '').startsWith(`${COMPETITIVE_MARK} —`));
}

const longDate = (date: Date) => new Intl.DateTimeFormat('es-MX', {
  day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'
}).format(date);

/** Safe download name: Brandopolis-Blueprint-<brand-slug>-YYYY-MM-DD.pdf */
export function blueprintFilename(brandName: string, generatedAt: Date): string {
  const slug = brandName
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
    .toLowerCase() || 'marca';
  return `Brandopolis-Blueprint-${slug}-${generatedAt.toISOString().slice(0, 10)}.pdf`;
}

export function buildBlueprintPdf(input: BlueprintInput): Uint8Array {
  const { brand, context } = input;
  const pdf = new PdfBuilder();
  const emerald = [0.027, 0.239, 0.176];
  const muted = [0.42, 0.45, 0.43];

  const activeVersion = (module: string) => {
    const question = context.questions.find(q => q.module === module);
    const decision = context.decisions.find(d => d.questionId === question?.id);
    return context.versions.find(v => v.id === decision?.activeVersionId) ?? null;
  };
  const decided = Object.keys(MODULE_LABELS).filter(module => activeVersion(module)).length;
  // The four canonical decisions, in the order the projection returns them. A brand can carry other
  // questions (context notes, for instance); those are not strategic decisions and never appear here.
  const canonical = context.questions.map(q => q.module).filter(module => module in MODULE_LABELS);
  const ordered = canonical.length ? canonical : Object.keys(MODULE_LABELS);

  // --- Cover -----------------------------------------------------------------------------------
  pdf.gap(120);
  pdf.text('BRANDOPOLIS', { size: 12, font: 'bold', colour: emerald });
  pdf.gap(6);
  pdf.text('Blueprint estratégico', { size: 30, font: 'bold', colour: emerald });
  pdf.gap(10);
  pdf.text(brand.name, { size: 18, colour: [0.16, 0.18, 0.17] });
  if (brand.isDemo) {
    pdf.gap(6);
    pdf.text('Marca demo · espacio de práctica, no es una marca real', { size: 11, font: 'bold', colour: muted });
  }
  pdf.gap(14);
  pdf.text(`Generado el ${longDate(input.generatedAt)}`, { size: 11, colour: muted });
  pdf.gap(20);
  pdf.text('La IA propone. Tú decides. Brandopolis recuerda.', { size: 11, font: 'bold', colour: emerald });
  pdf.pageBreak();

  const heading = (title: string) => {
    pdf.gap(6);
    pdf.text(title, { size: 15, font: 'bold', colour: emerald });
    pdf.rule();
  };
  const field = (label: string, value: string) => {
    pdf.text(label.toUpperCase(), { size: 8.5, font: 'bold', colour: muted });
    pdf.text(value, { size: 11 });
    pdf.gap(8);
  };

  // --- Strategic snapshot ----------------------------------------------------------------------
  heading('Estado estratégico');
  field('Decisiones aprobadas', `${decided} de ${Object.keys(MODULE_LABELS).length}`);
  field('Influencia geográfica', brand.geographicInfluence ? (GEOGRAPHY_LABELS[brand.geographicInfluence] ?? brand.geographicInfluence) : NOT_DEFINED);
  field('Mercado principal', brand.primaryMarket?.trim() || NOT_DEFINED);
  field('Contexto competitivo', input.competitiveStatus);
  pdf.gap(6);

  // --- The four decisions ----------------------------------------------------------------------
  heading('Decisiones estratégicas');
  ordered.forEach((module, index) => {
    const label = MODULE_LABELS[module] ?? module;
    const version = activeVersion(module);
    pdf.text(`${String(index + 1).padStart(2, '0')} · ${label}`, { size: 12, font: 'bold' });
    pdf.gap(3);
    if (!version) {
      pdf.text(NOT_DEFINED, { size: 11, colour: muted });
      pdf.gap(12);
      return;
    }
    pdf.text(version.selectedOption, { size: 11.5 });
    pdf.gap(4);
    pdf.text('POR QUÉ', { size: 8.5, font: 'bold', colour: muted });
    pdf.text(version.rationale?.trim() || NOT_DEFINED, { size: 10.5 });
    pdf.gap(3);
    pdf.text(`Versión vigente v${version.sequence} · aprobada el ${longDate(new Date(version.approvedAt))} por el Estratega de Marca`, { size: 9, colour: muted });
    pdf.gap(12);
  });

  // --- Connected view --------------------------------------------------------------------------
  heading('Cómo se conectan');
  const moduleOf = (decisionId: string) => {
    const decision = context.decisions.find(d => d.id === decisionId);
    const question = context.questions.find(q => q.id === decision?.questionId);
    return MODULE_LABELS[question?.module ?? ''] ?? 'Decisión';
  };
  if (!context.dependencies.length) pdf.text('Aún no hay decisiones conectadas.', { size: 10.5, colour: muted });
  for (const link of context.dependencies) {
    pdf.text(`${moduleOf(link.upstreamDecisionId)}  ->  ${moduleOf(link.downstreamDecisionId)}  ·  ${DEPENDENCY_LABELS[link.kind] ?? link.kind}`, { size: 10.5 });
  }
  pdf.gap(10);

  // --- Competitive context ---------------------------------------------------------------------
  heading('Contexto competitivo');
  pdf.text(`Estado: ${input.competitiveStatus}`, { size: 10.5, colour: muted });
  pdf.gap(6);
  const findings = competitiveFindings(context.evidence);
  if (!findings.length) {
    pdf.text('Todavía no has incorporado hallazgos externos al contexto competitivo.', { size: 10.5, colour: muted });
  } else {
    pdf.text('Sólo aparecen los hallazgos que decidiste incorporar. Los descartados no forman parte del contexto.', { size: 9.5, colour: muted });
    pdf.gap(6);
    for (const item of findings) {
      pdf.text(String(item.claim ?? ''), { size: 10.5 });
      pdf.text(`${item.source ?? 'Fuente no declarada'} · ${item.sourceDate ?? 's/f'} · Límites: ${(item.limitations ?? []).join('; ') || 'No declarados'}`, { size: 9, colour: muted });
      pdf.gap(7);
    }
  }
  pdf.gap(6);

  // --- Strategic context -----------------------------------------------------------------------
  heading('Contexto estratégico');
  const contributions = context.userInputs.map(i => String(i?.statement ?? '')).filter(Boolean);
  pdf.text('APORTACIONES DEL ESTRATEGA DE MARCA', { size: 8.5, font: 'bold', colour: muted });
  if (!contributions.length) pdf.text('Aún no hay aportaciones registradas.', { size: 10.5, colour: muted });
  for (const statement of contributions) { pdf.text(statement, { size: 10.5 }); pdf.gap(4); }
  pdf.gap(8);

  const otherEvidence = context.evidence.filter(item => !findings.includes(item));
  pdf.text('EVIDENCIA REGISTRADA', { size: 8.5, font: 'bold', colour: muted });
  if (!otherEvidence.length) pdf.text('Sin evidencia registrada fuera del entorno competitivo.', { size: 10.5, colour: muted });
  for (const item of otherEvidence) {
    pdf.text(String(item.claim ?? ''), { size: 10.5 });
    pdf.text(`${item.source ?? 'Fuente no declarada'} · ${item.sourceDate ?? 's/f'} · Límites: ${(item.limitations ?? []).join('; ') || 'No declarados'}`, { size: 9, colour: muted });
    pdf.gap(6);
  }
  pdf.gap(8);

  // Hypotheses are never facts. The heading says so before a single one is read.
  const openHypotheses = context.hypotheses.filter(h => h?.status !== 'REJECTED');
  pdf.text('HIPÓTESIS · SIN VALIDAR, NO SON HECHOS', { size: 8.5, font: 'bold', colour: muted });
  if (!openHypotheses.length) pdf.text('Aún no declaras hipótesis para esta marca.', { size: 10.5, colour: muted });
  for (const hypothesis of openHypotheses) {
    pdf.text(String(hypothesis?.statement ?? ''), { size: 10.5 });
    pdf.text(hypothesis?.status === 'SUPPORTED' ? 'Con soporte registrado · sigue siendo una hipótesis' : 'Por validar', { size: 9, colour: muted });
    pdf.gap(6);
  }
  pdf.gap(8);

  const accepted = context.learnings.filter(l => l?.status === 'ACCEPTED');
  pdf.text('APRENDIZAJES ACEPTADOS', { size: 8.5, font: 'bold', colour: muted });
  if (!accepted.length) pdf.text('Aún no hay aprendizajes aceptados.', { size: 10.5, colour: muted });
  for (const learning of accepted) {
    pdf.text(String(learning?.interpretation ?? ''), { size: 10.5 });
    pdf.text(`Límites: ${(learning?.limitations ?? []).join('; ') || 'No declarados'}`, { size: 9, colour: muted });
    pdf.gap(6);
  }

  pdf.footer(`Brandopolis · ${brand.isDemo ? 'Marca demo · ' : ''}Este documento refleja el estado estratégico vigente al momento de su generación (${longDate(input.generatedAt)}).`);
  return pdf.build({ title: `Blueprint estratégico · ${brand.name}`, created: input.generatedAt });
}
