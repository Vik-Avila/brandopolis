/**
 * Shared knowledge model for the two exports (ADR-0028): the Mapa estratégico ejecutivo and the Brand Book
 * integral. Built only from the authorized, brand-scoped projection the participant can already read, so both
 * documents share one source of truth and neither can see another brand, a private reflection or a proposal.
 *
 * Every item carries its standing, never upgraded silently:
 *   APPROVED     – the current human version of a decision (superseded versions are never current)
 *   OBSERVED     – evidence with a known source (documented observation)
 *   LEARNING     – an interpretation a person accepted
 *   HYPOTHESIS   – a belief still to validate (or its reviewed state), never a fact
 *   DECLARED     – what the brand declared at onboarding (context, not a decision)
 * Anything missing is listed as «no documentado», never invented.
 */
import { createHash } from 'node:crypto';

export const DECISION_ORDER = ['Strategic Objective','Market Arena','Primary Customer','Value Mechanism','Positioning','Brand Promise','Core Message','GTM Priority','Priority Experiment'] as const;
export const DECISION_LABELS: Record<string, string> = {
  'Strategic Objective':'Objetivo estratégico','Market Arena':'Mercado objetivo','Primary Customer':'Cliente principal','Value Mechanism':'Modelo de valor',
  Positioning:'Posicionamiento','Brand Promise':'Promesa de marca','Core Message':'Mensaje principal','GTM Priority':'Prioridad de lanzamiento','Priority Experiment':'Experimento prioritario'
};
const GEOGRAPHY: Record<string, string> = { LOCAL:'Local', REGIONAL:'Regional', STATE:'Estatal', NATIONAL:'Nacional', LATAM:'Latinoamérica', GLOBAL:'Global' };
const HYPOTHESIS_STATE: Record<string, string> = { UNTESTED:'Sin probar', TESTING:'En prueba', SUPPORTED:'Respaldada por un aprendizaje aceptado', WEAKENED:'Debilitada por un aprendizaje aceptado', REJECTED:'Rechazada por un aprendizaje aceptado' };

type Row = Record<string, unknown>;
export type BrandDocumentInput = {
  brand: { name: string; isDemo: boolean; geographicInfluence?: string | null; primaryMarket?: string | null };
  context: {
    questions: Row[]; decisions: Row[]; versions: Row[]; dependencies: Row[]; reviews?: Row[];
    userInputs: Row[]; evidence: Row[]; hypotheses: Row[]; learnings: Row[]; experiments?: Row[];
    contextVersion?: string; brandoContextVersion?: string;
    intelligence?: { evaluatorResult: string; issues: { kind: string; severity: string; modules: string[]; reviewFirst?: string }[] };
  };
  competitiveStatus: string;
  generatedAt: Date;
};
export type Decision = { module: string; label: string; number: string; option: string | null; rationale: string | null; sequence: number | null; approvedAt: string | null; versions: number; review: boolean; dependsOn: { label: string; kind: string }[]; affects: { label: string; kind: string }[] };
export type BrandKnowledge = ReturnType<typeof brandKnowledge>;

const str = (v: unknown) => typeof v === 'string' ? v : '';
const ONBOARDING: { prefix: string; key: 'building' | 'goal' | 'stage' | 'references' }[] = [
  { prefix: 'Qué está construyendo:', key: 'building' }, { prefix: 'Objetivo inmediato:', key: 'goal' },
  { prefix: 'Punto de partida declarado:', key: 'stage' }, { prefix: 'Entorno competitivo — referencias aportadas por el usuario:', key: 'references' }
];
const COMPETITIVE = 'entorno competitivo';

export function brandKnowledge(input: BrandDocumentInput) {
  const c = input.context;
  const decisionOf = (module: string) => { const q = c.questions.find(x => x.module === module); return { q, d: c.decisions.find(x => x.questionId === q?.id) }; };
  const moduleOfDecision = (id: unknown) => str(c.questions.find(q => q.id === c.decisions.find(d => d.id === id)?.questionId)?.module);
  const openReview = (id: unknown) => (c.reviews ?? []).some(r => r.downstreamDecisionId === id && r.status !== 'COMPLETED');
  const decisions: Decision[] = DECISION_ORDER.filter(m => decisionOf(m).q).map(module => {
    const { d } = decisionOf(module), v = c.versions.find(x => x.id === d?.activeVersionId);
    return {
      module, label: DECISION_LABELS[module], number: String(DECISION_ORDER.indexOf(module) + 1).padStart(2, '0'),
      option: v ? str(v.selectedOption) : null, rationale: v ? str(v.rationale) : null, sequence: v ? Number(v.sequence) : null, approvedAt: v ? str(v.approvedAt) : null,
      versions: c.versions.filter(x => x.decisionId === d?.id).length, review: !!d && (d.reviewStatus === 'NEEDS_REVIEW' || openReview(d.id)),
      dependsOn: c.dependencies.filter(e => e.downstreamDecisionId === d?.id).map(e => ({ label: DECISION_LABELS[moduleOfDecision(e.upstreamDecisionId)] ?? 'Decisión', kind: str(e.kind) })),
      affects: c.dependencies.filter(e => e.upstreamDecisionId === d?.id).map(e => ({ label: DECISION_LABELS[moduleOfDecision(e.downstreamDecisionId)] ?? 'Decisión', kind: str(e.kind) }))
    };
  });
  const byModule = (m: string) => decisions.find(d => d.module === m);
  const declared: Partial<Record<'building' | 'goal' | 'stage' | 'references', string>> = {};
  for (const input of c.userInputs) { const s = str(input.statement); for (const o of ONBOARDING) if (s.startsWith(o.prefix) && !declared[o.key]) declared[o.key] = s.slice(o.prefix.length).trim(); }
  const otherInputs = c.userInputs.map(i => str(i.statement)).filter(s => s && !ONBOARDING.some(o => s.startsWith(o.prefix)));
  const isCompetitive = (e: Row) => str(e.provenance).toLowerCase().includes(COMPETITIVE) || str(e.claim).startsWith('Entorno competitivo —');
  const evidence = c.evidence.map(e => ({ claim: str(e.claim).replace(/^Entorno competitivo — /, ''), source: str(e.source), date: str(e.sourceDate), provenance: str(e.provenance), limitations: Array.isArray(e.limitations) ? e.limitations.map(String) : [], competitive: isCompetitive(e) }));
  const hypotheses = c.hypotheses.map(h => ({ statement: str(h.statement), status: str(h.status), state: HYPOTHESIS_STATE[str(h.status)] ?? 'Por validar' }));
  const learnings = c.learnings.filter(l => l.status === 'ACCEPTED').map(l => ({ interpretation: str(l.interpretation), limitations: Array.isArray(l.limitations) ? l.limitations.map(String) : [], supports: str(l.supports), doesNotSupport: str(l.doesNotSupport) }));
  const experiments = (c.experiments ?? []).filter(e => e.status === 'RUNNING' || e.status === 'COMPLETED' || e.status === 'INCONCLUSIVE').map(e => ({ signal: str(e.intendedSignal), status: str(e.status) }));
  const issues = (c.intelligence?.issues ?? []).filter(i => i.kind !== 'PENDING_REVIEW').map(i => ({ severity: i.severity, text: issueText(i) }));
  const reviewing = decisions.filter(d => d.review);
  const defined = decisions.filter(d => d.option);
  const snapshot = createHash('sha256').update(JSON.stringify([c.contextVersion ?? '', c.brandoContextVersion ?? '', decisions.map(d => [d.module, d.sequence])])).digest('hex').slice(0, 10).toUpperCase();
  const undocumented = [
    ['Identidad visual (logotipo, paleta, tipografías)', 'Brandopolis no tiene activos de identidad visual registrados para esta marca.'],
    ['Propósito, misión, visión y valores', 'No se han registrado como decisiones ni como fuentes autorizadas.'],
    ['Personalidad, voz y tono', 'No existen lineamientos aprobados.'],
    ...(byModule('Primary Customer')?.option ? [] : [['Cliente principal', 'La decisión aún no está definida.']]),
    ...(evidence.some(e => !e.competitive) ? [] : [['Evidencia de mercado', 'No hay evidencia con fuente registrada.']])
  ];
  return {
    brand: input.brand, generatedAt: input.generatedAt, snapshot, competitiveStatus: input.competitiveStatus,
    geography: input.brand.geographicInfluence ? GEOGRAPHY[input.brand.geographicInfluence] ?? input.brand.geographicInfluence : null,
    primaryMarket: input.brand.primaryMarket ?? null,
    decisions, defined, reviewing, byModule, declared, otherInputs,
    evidence: evidence.filter(e => !e.competitive), competitive: evidence.filter(e => e.competitive),
    hypotheses, learnings, experiments, issues, verdict: c.intelligence?.evaluatorResult ?? null,
    undocumented, next: decisions.filter(d => !d.option)
  };
}
export const VERDICT: Record<string, string> = { PASS: 'No se detectan contradicciones relevantes entre las decisiones actuales', PASS_WITH_CAUTION: 'Hay puntos entre las decisiones que conviene revisar', REVIEW_REQUIRED: 'Hay contradicciones entre las decisiones que conviene revisar' };
/** Coherence reading for documents: with fewer than two decisions there is nothing to compare yet. */
export const verdictText = (verdict: string | null, defined: number) => !verdict ? null : defined < 2 && verdict === 'PASS' ? 'Aún hay pocas decisiones definidas para evaluarla' : VERDICT[verdict] ?? null;
export const kindLabel = (kind: string) => kind === 'HARD' ? 'dependencia estricta' : kind === 'SOFT' ? 'dependencia sugerida' : 'conexión informativa';
function issueText(issue: { kind: string; severity: string; modules: string[] }): string {
  const [a, b] = issue.modules.map(m => DECISION_LABELS[m] ?? m);
  return ({
    MISSING_BASIS: `${a} se decidió antes que ${b}, que es su base.`,
    INVALIDATED_UPSTREAM: `${a} depende de ${b}, que fue invalidada.`,
    RELIES_ON_REJECTED_HYPOTHESIS: `${a} se apoya en una hipótesis rechazada.`,
    RELIES_ON_WEAKENED_HYPOTHESIS: `${a} se apoya en una hipótesis debilitada.`,
    CONTEXT_CHANGED_AFTER_DECISION: 'El ámbito geográfico declarado cambió después de decidir el Mercado objetivo.',
    EXPERIMENT_NOT_PLANNED: 'El experimento prioritario está elegido pero aún no tiene plan.',
    VALIDATION_CHALLENGES_DECISION: `Una hipótesis que ${a} puso a prueba cambió después de su versión vigente.`
  } as Record<string, string>)[issue.kind] ?? `${a}: revisar la coherencia.`;
}
export const longDate = (date: Date) => new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date);
export const shortDate = (iso: string | null) => iso ? new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(iso)) : '';
export function documentSlug(name: string): string {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48).toLowerCase() || 'marca';
}
