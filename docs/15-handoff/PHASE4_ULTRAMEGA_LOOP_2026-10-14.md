Status: owner-instructed execution brief; implementation, acceptance and deployment NOT accomplished by this document
Owner: Product / Engineering / Security
Date: 2026-10-14
Target: Macrofase 4 · Activation & Orchestration + UX Reinvention + Live AI
Read with: UXR_START_HERE_2026-10-14.md, UXR_PRODUCT_STRATEGY_2026-10-14.md, UXR_EXPERIENCE_ARCHITECTURE_2026-10-14.md, UXR_CURRENT_SCREEN_REDESIGN_2026-10-14.md, UXR_DECISION_2026-10-14.md, PHASE4_UXR_ACCEPTANCE_2026-10-14.md, PHASE4_SPEC.md, PHASE4_ACCEPTANCE_MATRIX.md

# BRANDOPOLIS · ULTRAMEGA LOOP — MACROFASE 4

## 0. Mission and authority

**Deliver an actual locally running Phase 4 Brandopolis application, with the founder-approved Brando-first UX visibly close to the second selected mockup direction, real AI responses from the existing authorized provider, and all existing F1–F4 professional functionality preserved.** The output is not a slide, static mockup, only docs, or a plan. It is a working DEMO on localhost, tested and ready for founder walkthrough.

This is **one macro-phase iteration**. Workstreams UXR-0..5 are internal engineering checkpoints, not phases 4.1–4.6 requiring a separate strategic cycle. F5 and F6 remain future. Keep delivering until each technically achievable local gate is exercised; clearly state dependencies that need owner/provider action.

New owner direction supersedes October 12 "Brando as discreet secondary helper" **for default home/entry UX**, not the authority and domain invariants.

**One sentence:** The user talks to Brando to begin; Brandopolis turns suggestions into explicit, human-reviewed structured decisions and opens real specialist workspaces to execute; the system remembers.

## 1. Mandatory non-destructive preflight

Execute in the owner's LOCAL working repo:
`C:\Users\HP\Documents\Codex\Brandopolis\brandopolis-phase4`.
Expected branch: `feat/phase4-marketing-web-collaboration`. Last owner-reported local SHA: `fef386a` (informative, verify actual now). The GitHub documentation PR #11 was created from remote `a6d8e8a` and its head may differ. **Never check out main, reset to an older SHA, force-push, discard uncommitted work, rewrite migration or overwrite recent files.**

Record:
`git status --short`, `git branch --show-current`, `git rev-parse HEAD`, `git remote -v`, `git log -8 --oneline`,
`git merge-base --is-ancestor a6d8e8a HEAD` (interpret exit status; if not ancestor, report divergence).
Compare `origin/feat/phase4-marketing-web-collaboration` and `origin/docs/phase4-uxr-brando-first-2026-10-14`; `git diff --stat` and read relevant docs.
If the tree is dirty, inspect and preserve user changes. If documentation is already integrated, skip duplicate additions. If a conflict exists, reconcile the newest local implemented reality with the explicit October 14 owner-approved product direction.

Read actual `AGENTS.md`, `CLAUDE.md`, `SESSION_STATE.md`, `docs/00-index/source-of-truth.md`, `docs/01-product/product-bible-v1.md`, source invariants, `docs/07-ux`, `docs/15-handoff/PHASE4_SPEC.md`, `PHASE4_ACCEPTANCE_MATRIX.md`, `PHASE4_EXTERNAL_REQUIREMENTS.md`, 2026-10-12 R12B/R12C, ADRs 25–36 and latest. Do not suppose GitHub remote equals local code. The repo is the project source of truth, and this PR carries NEW doc proposals waiting for reconciliation.

## 2. Incorporate approved October 14 documentation into local authoritative context

Bring the seven documentation files from PR #11 into the correct local feature branch **without reverting later work** (use path-based comparison or safe targeted cherry-pick only after preflight). Include this runbook as an eighth document. Reconcile canonical UX principles, information architecture, product journeys, Product Bible addenda, roadmap, accepted ADR number inventory, traceability, PHASE4_SPEC, matrix, SESSION_STATE and CHANGELOG.

The founder APPROVES visual direction with slight preference for the SECOND UX mockup; this does NOT authorize replacing the official Brandopolis logo, palette, typography or Brando geometry. The images created by mockup software containing a human avatar or blue/purple palette are explicitly NON-canonical. Preserve official B logo and the **single emerald, gold-accented geometric gem Brando** from existing runtime assets. Review actual user-provided screenshot and the written analysis in `docs/07-ux/UXR_CURRENT_SCREEN_REDESIGN_2026-10-14.md`. If the image mockups are not in the local repo, do not claim pixel-identical visual approval; ask for them only if exact pixel matching is blocked and implement the text contract otherwise.

Do not change user-facing information without resolving conflicting business-domain invariants. No strategic auto-writing.

## 3. High-level architecture — reuse, don't rebuild

Existing modular TypeScript monolith, Drizzle/PostgreSQL and native HTML/CSS/JS front end remain. Use current service APIs, approved actions, asset allowlist, schemas and versioned prompts. No frontend framework migration to obtain a redesign; no parallel unauthorized databases/chat memory.

A single **intent-to-proposal-to-structured-workflow coordinator**:
1. Route user intention by category and active brand; must not accidentally execute actions.
2. Assemble current authorized context: what is confirmed, candidate, missing, older/active and cross-module dependencies. Server enforces brand/user permissions before source retrieval.
3. Produce short context-grounded recommendation with provenance and uncertainty via existing `ModelGateway` and guarded prompt versions; ask at most one truly material follow-up at a time, allow "No lo sé".
4. Show human-review card with **Propuesta · Por qué · Qué sabemos · Supuestos · Aprobar/Modificar/Descartar** when approval is available and appropriate. No fake approval from chat.
5. Explicit human action invokes existing domain operations with idempotency/concurrency, audit and versioning.
6. Deep-link to the correct existing workspace (Strategy/Identity/Products/Marketing/Clients/Results etc.), retaining draft/history and brand context.

Chat transcript is a UX session aid, never a single source of strategy. AI suggestions are not persisted as approved facts. No automatic calls to AI when opening a screen.

## 4. UI target — premium, calm, intuitive, real

### Institutional design contract
- Existing **Brandopolis official logo** stays top left, original marfil/emerald/gold palette, editorial type and design tokens. Do not introduce generic logos, purple SaaS templates or a human Brando.
- Brando is the ORIGINAL geometric emerald gemstone with gold facets; visual size larger on Home, compact inside specialist views, subtle state/orientation/lighting for idle/thinking/responding, accessible reduced-motion alternative. One unified conversation surface, no redundant assistants competing.
- Maintain active brand selector, obvious account, true server-derived `IA real · model` vs `DEMO sin IA` badges, and professional direct tool access.
- Desktop broad center, compact left navigation, no permanent mandatory right rail; only meaningful notifications. Mobile single-column, clear labels, keyboard and screen-reader navigability.
- Avoid multiple simultaneous hierarchy levels, repeated metadata cards and mandatory nine-step strip as first experience.

### Screen A · Conversational Home (landing inside authenticated app)
Top: Brandopolis, active brand dropdown, real/simulated status, current user.
Center: emerald-gem Brando, **¿Qué vamos a construir hoy?**, one free-form composer, optional secure document attach, four quick starters **Crear mi marca / Mejorar mi estrategia / Conseguir clientes / Planear una campaña**. Below: at most two meaningful "Continuar donde lo dejaste" actions. Professional nav visible/accessibly expandable: Inicio, Estrategia, Marca/Identidad, Productos, Marketing, Clientes, Colaboración, Resultados, Aprendizaje, Configuración; grouping may be improved but no disappeared feature or deep maze.

### Screen B · Brando proposal
Example: "Tengo un club de baile con salsa, cumbia y bachata. Quiero más alumnos y que no abandonen después del primer mes". Brando retrieves existing context, shows a concrete proposed 90-day objective and clear rationale, distinguishing declared facts, unvalidated assumptions and unsupported numbers. Approval or modification is explicitly human. The proposal opens the existing decision/editor; no ghost writes or automatic version changes.

### Screen C · Strategy workspace
Show **Objetivo vigente**, short summary, "Mejorar con Brando" + "Ver Mapa estratégico" + "Explorar las 9 dimensiones" + "Ver historial y evidencia"; do NOT make the 9-decision horizontal carousel mandatory. Exact previously approved decision stays unchanged until new human version. Hypothesis/experiment/signal/learning engines stay FULLY intact and direct expert-accessible; simplify default surface to "**Comprobar una idea**" and "**Qué descubrimos**" when relevant, without mixing hypothesis with confirmed fact.

### Screen D · Marketing
Contextual Plan de Marketing with approved strategic objective, offers, channels, actions, owners, budget and calendar. Brando prepares editable proposals, campaign plans, content and materials; actual editor/reviewer remains source of truth. Keep Google Search/PMax and Meta traffic/messages *simulated or verified by provider based on actual adapter*, version-specific approvals, and no spend without distinct authorization. Preserve R12B/R12C calendar, visual compactness and field-focus fixes.

### Screen E · Clientes
Compact opportunities, follow-up, owners, source/attribution, segments and capture. Clear direct operator entry, no pointless wizard. Source-reported ≠ campaign-verified. Full F5 CRM/forecast out of current macro-phase unless already built and approved.

### Screen F · Identity, results, collaboration, agency, mobile
- Identity: official assets and kit roles, draft vs approved versions, previews/exports and assisted creative directions. Brando can suggest, not publish.
- Results: separate true provider data, planned budgets and simulations; current vs comparative period, missing not zero.
- Collaboration: reviewer selection, internal/shared comments, portal, authorization and notifications, preserving R12B/R12C.
- Agency: switch brands safely; advanced direct navigation and tenant isolation, proper permissions.
- Mobile: 390–430 px, keyboard/focus/drawers/dialogs, no overlays, all important actions reachable.

## 5. Functionality inventory and anti-regression

Before refactoring, list EVERY actual route/feature/permission/interaction in F1–F4 with implementation/test state. Map from current to new entry in code and E2E. Include: nine dimensions, rationale, versions, impact/review, evidence, experiments, learning, Strategy Map/Brand Book exports, brand context/documents, kit/identity, product offerings/prices, sales materials, social content, calendars, sites/preview, external campaigns, Clientes, multi-brand, collaboration, notifications, Results, work priority and the local demo flow.

No feature removal merely due to UI simplification. Keep direct advanced access when novice surface collapses. Remove only redundant **visible** steps/components with evidence and comparison.

## 6. Local Phase 4 with REAL AI — non-negotiable demo gate

Current remote evidence contains `demo:phase4` deterministic with simulated Google/Meta/Canva/email, and `competition:start --isolated --live-ai`, `demo:live-ai-smoke` and `demo:live-ai-ui` as separate legacy modes. New local commits may have changed this. **Inspect first.**

Make Phase4 isolated demo start in two explicit modes:
- Default, deterministic, with no provider key needed.
- `--live-ai` or an equivalent explicit verified command, reusing the existing server-side Anthropic provider, secure local env policy and isolated PostgreSQL. Never expose secrets. Show provider/model reported from server and separate tags for third-party provider simulations.

Explicit user-triggered AI must provide at least:
1. Real Brando strategy explanation/recommendation based on Club de baile.
2. Real marketing plan/campaign draft for bachata rooted in approved strategy.
3. Real identity/material creative direction rooted in confirmed brand context.

At least one real external-model response confirmed in each of these flows with schema/source/tenant guards. The UI must provide a manual fallback on timeout/rate limit. Demonstrate no automatic strategy commit from AI requests. Model selected by VERIFIED local config (do not hard-code `claude-opus-5-5` unless available). Bounded timeouts, caps on message length/tokens, retries/calls, a human-confirmed small smoke budget, and record nonsecret inference metadata. On startup, opening the page must not incur AI charges.

The demo must run on localhost with a clear PowerShell command to start/stop all F4 services without killing other unrelated processes, a session setup that does not print auth tokens into shared logs, and an owner walkthrough. A static mockup or screenshot is not "live IA".

Production/PILOT remain frozen, including migrations, secrets, DNS, OIDC, publication and service accounts. Real Google/Meta/Canva/email acceptance is a SEPARATE GATE requiring accounts, provider-review, HTTPS/callbacks, contracts and distinct authorized operations. Never relabel simulated ads data as real; do not claim full external acceptance without proof.

## 7. Elon five-step loop per feature / experience

For each of the major user journeys (new brand; strategy decision; Marketing plan/campaign; Clientes; agency return):
1. **QUESTION**: Which screens/fields exist only because the implementation wants them?
2. **DELETE**: What visible prompts, repeated tabs, badges or navigation can be removed without losing required state?
3. **SIMPLIFY**: What can be progressively disclosed / reused / written in plain Spanish?
4. **ACCELERATE**: How can one meaningful proposal or next action be reached quickly without unnecessary AI roundtrips?
5. **AUTOMATE**: Only safe drafts/context assembly/preparation, never approvals and external side effects.

For each outcome capture BEFORE → AFTER steps and count clicks/questions/screens (measured, not guessed). Keep an advanced direct-action path. If a flow feels like a long chat interview, it fails: change it before proceeding.

## 8. Technical work loop (not extra macro-phases)

A. **Reconcile + acceptance baseline**: local SHA/remote/docs, F4/R12B/R12C gaps, interface inventory, ADR/canonical updates.
B. **Ship conversational Home** with intent input, gem, return states, honest mode, direct nav.
C. **Ship safe conversation coordinator and reviewer**: context, budget, uncertainty, draft/proposal card, human commits through existing service.
D. **Simplify onboarding/Strategy and validation surface** with full advanced availability.
E. **Integrate F4 workspaces**: identity/offers/plan/calendar/campaigns/Clientes/collab/results, without forking business state.
F. **Integrate isolated F4 Live AI launch** + real provider smoke (after explicit bounded consumption approval) and schema/security evals.
G. **Regression / visual QA / defects loop** until all achievable gates PASS; meaningful blockers differentiated.
H. **Owner acceptance DEMO** with exact URLs, startup/stop instructions, test summary and unverified external dependencies.

At each internal checkpoint: read next current requirements → implement smallest verified slice → run targeted tests → fix → integrate → continue. Commit coherent local changes with reviewable messages. Do not push, merge, deploy or change external accounts without explicit authorization. Do not stop after a plan or an incomplete demo. If blocked by a new external decision, document and continue independent tasks. Do not claim "approved" from automation.

## 9. Mandatory actual E2E walkthroughs

### Flow 1: Club de baile
Intent: "Tengo un club de baile de salsa, cumbia y bachata y quiero atraer alumnos y retenerlos". Response contextual, one useful candidate <3 minutes target (hypothesis only), no forced 4 setup screens/9 decisions. Review, approve with rationale, version and Mapa estratégico update. Exact approved state persists on reload.

### Flow 2: Marketing
"Prepara una campaña de captación para bachata" after existing approved strategy. Live AI creates editable structured DRAFT; human reviewer sees source, budget as estimate only, optional Canva creative direction; no activation/send. User can directly open Plan, Ads, Social and Calendar.

### Flow 3: Validation & learning
User: "¿Cómo sabemos si una clase de prueba gratuita funciona?" Brando proposes a hypothesis/test with measurable signals, clearly **candidate**. Manual human transition to testing and learning acceptance. Advanced fields remain reachable.

### Flow 4: Agency
Two brands and separate tenant scopes; independently open workspaces, read history, brand switch with no cross-brand inference leakage; guest never sees internal documents, learning or private comments.

### Flow 5: Unavailable AI
Provider missing/rate limited: true badge, clear error, no fabricated answer, manual editor available, in-progress draft intact, idempotent retry.

### Flow 6: Full Phase4 coverage
Visual identity roles/version, new offer with plans, sales materials, client sharing/review, social calendar, site preview, Google/Meta DEMO simulations properly labeled, Clientes opportunity with source, Results truth distinctions, mobile view.

## 10. Acceptance matrix / tests

Treat `PHASE4_UXR_ACCEPTANCE_2026-10-14.md` rows UXR-001..022 as **not executed** until run on actual local commit. Reconcile them with existing PHASE4_ACCEPTANCE_MATRIX R12 and any local extensions; preserve all current release gates.

Before and after changes as relevant:
`pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm skills:check`,
`python scripts/foundation_check.py`, `pnpm test:e2e`, `pnpm test:pilot:e2e`,
`pnpm test:visual`, actual UI asset validator,
Playwright desktop / tablet / 390px mobile,
security/tenant/idempotency/concurrency/browser suites.
Never weaken tests to match failures. Deterministic suite must not depend on provider credit/availability. Live-AI checks run separately on user approval with spending cap; report actual model/provider/response vs mock. No stealth credential reads or printing.

F4 local DEMO can be **ready for founder acceptance** once deterministic and approved Live-AI checks pass; F4 macro-phase is **not closed/fully provider-verified** until agreed external acceptance gates are passed or explicitly rescheduled with owner disposition AND founder accepts the exact scope. No claim of production deployment without a separate authorized release.

## 11. Mandatory final response from Claude Code

Provide:
- Repo, branch, original/final local SHA, changed files/commits and documentation paths; distinguish docs in PR #11 vs integrated into local branch.
- Side-by-side description / screenshots of actual old/new UI using OFFICIAL assets; prove no human avatar and no purple rebrand.
- Detailed preserved-feature table; UX changes and before/after user journeys.
- Exact PowerShell commands to START and STOP a verified localhost F4 DEMO with real AI, precise app URLs and authenticated session method without revealing tokens.
- Live model identification from server, bounded inference actual traces/results for strategy/marketing/identity, no automatic strategy writes.
- Test matrix with observed PASS/FAIL/SKIP/BLOCKED and SHA, date, mode; do not recycle old counts.
- R12B/R12C pending and external-provider gates with owner decisions, status, estimates.
- Security / production-freeze assessment; rollout/rollback plan only if proposing future release.
- Founder acceptance checklist. Clearly label `CANDIDATE READY`, `BLOCKED`, or `F4 APPROVED` solely when respective gates actually hold. Founder acceptance cannot be automated.

**Do the engineering work, not just analysis. One entire Macrofase 4 integrated local candidate, then present it for founder acceptance.**
