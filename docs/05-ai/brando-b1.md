Status: canonical
Owner: Product / Engineering
Canonical: yes
Last reviewed: 2026-10-04
Related: docs/05-ai/brand-intelligence-engine.md, docs/14-decisions/ADR-0017.md
Depends on: approved B1 implementation plan 2026-10-04; ADR-0015

# Brando B1 · contextual query contract

B1 extends the existing Model Gateway inside the modular monolith. It is read-only with respect to
strategy. `Engine.askBrando()` never invokes `analyze()`, context capture, human commit, review or
learning mutation. `brando_requested` is an operational event, not a strategic recommendation or
human decision. Production remains subject to CLAUDE.md's Jury Production Freeze.

## Request and authorized provider data

`POST /api/brando/ask`: brandId, message (1–2000 characters), optional questionId, and at most four
previous turns. Each previous question is bounded to 2000 characters; an optional turn answer string
is accepted within the transport shape (8000 maximum) but never included in provider input. The UI
sends empty answer strings. Earlier user questions are untrusted conversational hints, not evidence.
An invalid selected question is rejected; null means general brand context.

The provider receives only the selected, authorized Brand's name, current decisions and recorded
human rationale, relevant historical versions, evidence with provenance/date/limitations, accepted
learnings, user inputs, hypotheses, open questions, experiments, signals, dependencies and reviews.
The current message and bounded previous questions are also sent. Model instructions come solely from
the versioned B1 prompt. Personal author identifiers, workspace IDs and session IDs are stripped from
packet objects. No credentials, participant profiles, Capability Context, raw documents, unreviewed
extracted claims, other brands, transcript answers, audit logs or recommendation/analysis history are
sent. User-supplied strategic text can itself contain personal data: the existing AI notice remains
applicable and users must avoid entering secrets or third-party personal data.

The packet has a 24,000-character content budget with mandatory current decisions, accepted learning,
dependencies/reviews and evidence supporting hypotheses. Optional omissions are explicit. If mandatory
context cannot fit, fail rather than silently omit it. The gateway applies a 30,000-character serialized
input ceiling. Existing provider, configured model, timeout, output-token ceiling and monetary-cost
policy are retained. No external research or model tools are enabled.

## Output and authority

`schemas/brando-answer.schema.json` v1 defines answer, facts with referenceIds, hypotheses,
suggestions, questions and limitations. Provider-side schema transformation removes unsupported
string/array bounds; the full local schema enforces them after generation. Source:
[Anthropic structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs).
Facts must reference included packet IDs. Valid IDs prove source membership, not semantic entailment;
this deterministic guard does not certify factual accuracy. UI escapes every model string and source.
No provider result determines object status, clears a HARD review, creates a version or learning,
or becomes persisted Brand Context.

Attention is a server-derived projection: pending decisions, outstanding reviews, open context
questions, planned/running experiments, uninterpreted signals, learnings awaiting review and pending
impact calculation. Home and Brando share review attention. Home's document-processing notices stay
separate; B1 does not inspect raw files or automatically process candidate document claims.

## Freshness, privacy and operational behavior

Engine authorization checks session, membership, workspace and brand assignment before assembly and
again after inference. The B1 source fingerprint includes question, history and review changes as well
as current context; the existing recommendation context version is unchanged. A changed snapshot
returns 409. The browser also checks current brand/question/context, ignores late responses after a
scope change, and clears its in-memory conversation on brand/user change, logout, reload or explicit
clear. At most four turns are visible. No conversation table, localStorage transcript or new migration.

The new route shares Origin, live PILOT auth, intake, rate limit, AI notice and daily-cap gates.
`brando_requested` is recorded before inference and counts against the existing daily caps without
changing recommendation/activation definitions. Existing caps remain a check-and-count mechanism,
not atomic spend reservation across concurrent legacy AI requests; this pre-existing limitation is
not a monetary guarantee. Logs contain request outcome, provider, latency and real token counts only;
no prompt, answer or strategic text. Cost remains null, not invented.

DEMO returns an explicitly identified deterministic extractive answer. Provider errors, refusal,
truncation, invalid references and invalid output never turn into a valid live answer. Manual work
remains available. This phase adds no persistent chat memory, new provider, vector database, autonomous
agent, model write tool or B2–B5 capability.

## Validation

`tests/brando.test.ts`: deterministic contracts, guard, provider adapter and HTTP gates.
`tests/brando-cases.ts` (registered in m1 suite): DB-backed no-write, isolation, revocation, freshness,
malicious fixture and failure cases. `tests/launch-cases.ts`: durable quota and metric separation.
`tests/brando-browser/`: isolated frontend/HTTP fixture at desktop/mobile, escaping, focus, reset and
late response handling. This fixture suite complements, never replaces, the required database-backed
E2E, visual and PILOT suites. `evals/brando-b1.json` is exercised by the DB-backed no-write test;
it is not a live semantic-quality evaluation.

## Human-only live smoke

`scripts/brando-ai-smoke.ts` supplements the existing `pilot:ai-smoke`, which exercises strategic
recommendations rather than contextual Brando. The new harness invokes the B1 Gateway once with
a synthetic brand and fixture-only sources. It imports no engine, database, production configuration
or server. It uses the operator's `ANTHROPIC_API_KEY` and existing `ANTHROPIC_MODEL` temporarily;
no default model is selected, no credential is printed or saved. Run manually from the repo root:

```powershell
pnpm.cmd exec tsx scripts/brando-ai-smoke.ts
```

A successful technical result confirms structured schema and authorized reference IDs. Human
review must still verify current versus historical decision, rationale, evidence limitations,
unvalidated hypothesis, pending attention and suggestions without approval. The fixture evidence
is explicitly invented and cannot justify market size, revenue, willingness to pay or demand.
No answer is persisted; this is not an end-to-end live server or production smoke. Existing SDK
retry policy may retry a failed provider request; the harness makes one logical Gateway query.

## Visual B1 follow-up · 2026-10-04

Human-selected original gem and mockup now drive a compact right-side presence above memory.
Responsive placement retains one accessible card; the native dialog remains the explicit query
surface. Compact alpha images and finite visibility/reduced-motion-aware pulses are presentation
only. No SDK, prompt, model, API, quota, database or strategic behavior changed.
A removable tentative suggestion stripe reuses the first suggestion of the latest valid scoped
answer, never queries on its own and resets on brand/decision/context/conversation change.
Motion preference is transient, not persisted. Operational visual states are not strategic enums.
Reference/provenance: design/brandopolis-ui/reference/brando-b1/README.md.

## Contextual drawer correction · 2026-10-05

The human rejected the first visual motion and central modal. The current query surface is a
right slide drawer with an always-accessible composer, active decision/reason, evidence and
hypothesis previews/counts and actionable attention. Existing authorized context is projected
without a provider call. The left navigation combines the Brando portrait and Qué necesita atención into one
entry, opening the existing attention summary rather than the query drawer. The right card
opens the query drawer. Humanized gem imagery is excluded. One stable portrait replaces
abrupt image swaps; finite state gestures return to neutral, with 8–12s resting intervals.
Expanded browser tests cover distinct attention/query entry behavior, geometry/composer, focus, reduced motion,
no automatic requests, stale replies and safe text. No backend, prompt/model or data contract
change is part of this correction. The prior Windows gates passed for the previous visual
candidate; this correction awaits new Windows gates and human acceptance.

## Section suggestions in B1

Suggestions are requested explicitly in the active brand/decision/context scope. The section
stripe displays the first suggestion of the latest valid scoped answer and offers Ver análisis.
Navigation alone never queries the provider. Proactive suggestions on entering each strategic
section require a separately agreed phase; they are not implemented or promised by B1.

## Human suggestion review extension · 2026-10-05

Human explicitly clarified that accepting a suggestion should change strategy and potentially
its dependencies. Accept/Modify therefore enter the existing human decision editor and require
final confirmation, a concrete selected option and rationale. Only successful commit records the
new version, practice and Brando provenance; existing Change Impact handles affected decisions.
Reject records criterion/practice only. No model or conversation writes strategy directly.
Source proof is issued only for validated authorized answers, bound to actor/workspace/brand,
short-lived and bounded; stale, foreign, forged and already-rejected proof fails closed.
No migration or new table. See ADR-0018 for idempotency, retention and authority boundaries.

Runtime uses brando-contextual-v2: concise everyday Spanish, concrete next steps and internal
code translations. Canonical source content and IDs are preserved. The query control displays
Pensando… and a reduced-motion-aware indicator. Original consulting/response gem poses use
brief opacity transitions; finite ambient gestures repeat every 4–5.5s, consulting every 2.2s.
Earlier same-portrait/8–12s descriptions refer to the preceding accepted candidate.
This extension awaits Windows full database/browser/regression gates and human acceptance.

## Selection-first follow-up · 2026-10-05

Supersedes the automatic first-suggestion stripe and criterion modal for Accept/Modify: choose
one specific proposal in Brando, review its exact editable choice in the workspace, add human
rationale, then confirm the change. Reject stays in Brando. EVIDENCE advice opens registered
sources; other generic advice opens context. Typed action metadata uses schema v2/prompt v3;
missing metadata is contextual only, never a strategic commit ticket. See [ADR-0019](../14-decisions/ADR-0019.md).

## Live citation validation fix · 2026-10-05

The operator observed HTTP 200/end_turn and valid schema but invalid source references in two
diagnostic calls. Prompt v4 makes outer source IDs explicit; the Anthropic Brando-v2 output
schema now enumerates the exact request's includedIds for every fact citation. The unchanged
local guard still rejects invented/omitted/foreign IDs. No citation is silently rewritten or
dropped to turn a failed response into a success. No extra inference or automatic retry added.
Semantic support for cited claims remains a human review responsibility. Live verification pending.

## Extensión autorizada · orientación por sección · 2026-10-05

[ADR-0020](../14-decisions/ADR-0020.md) documenta el nuevo alcance aprobado fuera de producción:
orientación local en las cuatro secciones y solicitud explícita de propuestas contextualizadas.
Las restricciones anteriores sobre sugerencias proactivas se conservan para inferencia automática:
esta extensión no llama a la IA por navegación ni genera estrategia sin solicitud humana.
La respuesta vigente de esa solicitud puede reabrirse en el mismo contexto temporal; expirar no
provoca otra consulta. Acciones vencidas se deshabilitan; servidor conserva todos sus controles.
No hay proveedor/modelo nuevo, datos adicionales, cache persistente ni cambio de autoridad.
Pruebas completas de navegador y aceptación visual pendientes para este nuevo candidato.
