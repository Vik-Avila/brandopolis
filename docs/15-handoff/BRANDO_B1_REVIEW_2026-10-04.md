Status: implementation candidate, not release-ready
Owner: Engineering
Canonical: no
Last reviewed: 2026-10-04
Related: docs/05-ai/brando-b1.md, docs/14-decisions/ADR-0017.md, SESSION_STATE.md
Depends on: main 03dbd212e20e65ba0a575143d12fa8a6048b52c8; approved B1 plan

# Brando B1 · implementation and verification handoff

Branch: `feat/brandopolis-intelligence-brando-b1`, local, uncommitted. No push, PR, merge, tag,
deploy, production configuration, infrastructure or production database access. No migration files,
DB schema, dependency, lockfile or Brand Master changes. Production remains jury-critical.

## Delivered

- Contextual query path through existing Gateway with separate answer schema/prompt.
- Authorized Brand/decision/history/reasons/evidence context; explicit omissions and source references.
- Deterministic attention and independent source fingerprint; authority rechecked after inference.
- Temporary contextual dialog: four turns, quick questions, clear, safe prose, recorded sources,
  navigation to human workflows, stale-result/brand-change handling and AI notice flow.
- Separate operational query telemetry included in existing caps without recommendation metric drift.
- Contract, ADR, malicious fixtures, unit/HTTP/provider tests, database cases, quota regression case,
  desktop/mobile browser fixture and one-command Windows local verification script.

## Actual checks in this environment

| Gate | Result |
|---|---|
| pnpm typecheck | PASS |
| pnpm lint | PASS |
| Full pnpm test | NOT PASS: 136 passed; 87 database-dependent tests skipped after suite setup failed |
| Non-database subset | PASS: 136/136, including 9 B1 unit/provider/HTTP tests |
| pnpm skills:check | CLI blocked by Unix IPC permissions; same check via node --import tsx scripts/sync-skills.ts --check PASS (byte-identical mirrors) |
| Foundation | PASS, zero errors |
| Integrated UI validator | PASS; static validation is not a fresh browser inspection |
| Brando browser fixture | BLOCKED: Chrome could not start; socket() Operation not permitted; 4 tests did not execute |
| Existing E2E / visual / PILOT E2E | NOT RUN: PostgreSQL and Chrome prerequisites blocked |
| git diff --check | PASS |
| Live provider semantic quality | NOT RUN; no real credentials used; human-only smoke remains separate |

Database blocker: the container maps only UID/GID 0; embedded PostgreSQL rejects root. No database
harness was weakened or changed. Chrome blocker: official Chrome 154 executable rejected by the
container's Unix socket permissions. The suite was not redirected to production or a substitute
browser. These are environmental blockers, not passing tests.

## Source-level security review

Reviewed new and modified source, untracked files and transport paths. Query inputs are bounded;
scope is resolved server-side; selected question belongs to the brand; source refs are checked against
the included packet; output is escaped; no model tool or strategic mutation path exists. Existing
PILOT Origin, authorization, intake, notice and rate/cap checks include the new route. Core scope is
rechecked after inference, followed by a live PILOT authorization check before returning the result.
Operational telemetry is the only query write. No strategic text is logged or sent to GA4.

Corrections during review: placed Brando entry outside the existing hidden workspace heading;
removed provider-unsupported maxLength/maxItems only from transmitted schema while retaining local
validation; added review/question/history-aware fingerprint without changing recommendation semantics;
removed personal author IDs from provider packet; maintained independent operational metric naming.

Residual limits: valid source IDs do not prove semantic entailment; no live quality eval yet. Existing
caps use check-and-count rather than atomic monetary reservation, so concurrent legacy requests can
overshoot a daily count. Historical handoff-document drift and decompression risks remain separately
registered; no document parsing change is included. Windows verification script is prepared but was
not executed in this Linux environment. Visual acceptance and DB-backed invariants remain mandatory.

## Next action

Apply the supplied patch in a clean, dedicated local worktree pinned to the base SHA, then run
`scripts/verify-brando-b1.ps1`. It runs all required local checks and opens the DEMO in a separate
terminal for inspection. It refuses production environment variables or a local .env file, and
refuses occupied standard DEMO ports. It applies only existing migrations to that checkout's local
DEMO/test databases; no new migration or production operation is present. Stop DEMO with Ctrl+C in
its terminal after review. No commit/push/merge is performed. Record real results before closing.

Closing verdict: **not release-ready** until mandatory database/browser gates and visual review pass.
Even a later release-ready verdict does not authorize deployment.

## Windows follow-up evidence · 2026-10-04

The human ran the initial patch in `C:\Proyectos\brandopolis-brando-b1`, an isolated worktree.
Typecheck, lint, Skill Pack, Foundation and whitespace checks passed. Full unit/database suite
223/223 and Brando browser fixture 4/4 passed. Existing browser suite returned 78/80: compact
progress status at y=823.36 with an 800px viewport; mobile hover read the resting transparent
colour. A focused four-case rerun returned 3/4; compact placement failed at the same coordinate,
while hover passed. Visual/PILOT browser suites had not started because the block stopped.

Follow-up diff: after activity panels appear, an off-screen adjacent status is scrolled into view
instantly (the page uses smooth scrolling globally). Hover measurement retains its original
assertions and now polls for the CSS colour transition instead of sampling the initiating frame.
The compact browser case remains unchanged and is the regression gate. No baseline update.
The follow-up requires local browser validation and the remaining mandatory gates; earlier passing
counts do not cover the new diff. Live-provider smoke and human visual acceptance remain pending.

## Subsequent browser verification · 2026-10-04

Human Windows output: compact/mobile focused regression 4/4 PASS after UI follow-up; full E2E
80/80 PASS; visual 10 PASS and 1 SKIP. The skipped historic encoding-repair case requires its
real local backup, absent in the new worktree; its skip condition was not changed. PILOT local
HTTPS/OIDC returned 10 FAIL, all at access-link selection before reaching protected flows.
The global link locator matches header, landing CTA and OIDC entry; it already exists in the
base commit. No production diagnosis is inferred from this fixture failure. The uploaded second
log begins at E2E summary; prior typecheck/lint/unit run output is not included in that attachment.

Test-only correction: scope links to #pilot-entry and retain role/name matching; keyboard login
starts at /login and checks unique OIDC href before Tab/Enter. Feedback assertions address the
#notice live region, since other independent status regions can coexist. No assertion, test,
security proof or viewport removed. Runtime, server config and public flow remain unchanged.
PILOT results for this diff and final validation/visual acceptance are still pending.

## PILOT outage assertion follow-up · 2026-10-04

User evidence: 223/223 unit/database tests PASS; local PILOT 5 PASS (all OIDC keyboard/revocation
cases), 5 FAIL at the outdated outage notice expectation. Test follows the existing unavailable
provider fixture. The next test-only change asserts the current safe human-response/retry copy,
the real UNAVAILABLE response with no recommendation, and exact equality of decisions/versions
before and after generation. Subsequent human approval, isolation, feedback and logout checks
remain unchanged. This diff still awaits browser execution; no runtime or production change.

## Final automatic-gate evidence · 2026-10-04

Human Windows reports: latest unit/database run 223/223 PASS before the last test-only outage
assertion; E2E 80/80 PASS; visual 10 PASS / 1 historical encoding-backup SKIP; final local PILOT
10/10 PASS; final Brando 4/4 PASS; Foundation zero errors; integrated UI VALIDATION PASS.
The final submitted block reached its success marker, including typecheck, lint and whitespace
checks. Skill Pack mirrors were verified earlier and were not modified. No failing automatic
gate remains; the encoding case is still governed by its existing genuine-backup prerequisite.

Remaining: human visual acceptance of the real DEMO panel and real-provider semantic smoke
(not performed, no credentials used). No final release-ready verdict yet. All work remains
uncommitted on the dedicated branch, outside production.

## Human DEMO review and live-smoke preparation · 2026-10-04

Five human screenshots confirm desktop panel presentation, answers labelled deterministic DEMO,
recorded decision/reason and expandable numbered source details. Conversation clearing was
confirmed by the human. This does not validate live inference. The operator's Models API lookup
confirmed existing Opus 5.5 as `claude-opus-5-5`; no key was shared with the agent.

A new human-only `scripts/brando-ai-smoke.ts` sends one logical B1 Gateway query with synthetic
brand, current/superseded decision, invented interview evidence and pending questions. It has no
DB/server or config-file access and persists nothing. It reuses the adapter retry/output limits
and prints JSON-escaped answer and synthetic sources for manual semantic assessment. Two harness
fixture tests validate task/data boundary and withholding fabricated references/provider errors.
Typecheck/lint and 138/138 non-DB tests pass locally. Real-provider execution remains pending.
The PowerShell operator procedure restores any previous process environment and disposes the
SecureString after execution. No production operation or model change is performed.

## Closing verdict and human-only live evidence · 2026-10-04

**RELEASE-READY OUTSIDE PRODUCTION** for this scoped B1 candidate. This entry supersedes
pending statuses above, which remain as historical execution records.

The human submitted the actual JSON output from the synthetic-context B1 Gateway smoke:
ANTHROPIC, claude-opus-5-5, prompt brando-contextual-v1, outcome OK, schemaValid=true,
referencesValid=true, latency 19,185 ms, tokenIn 3,195, tokenOut 1,786. Its completion markers
also establish success of the preceding typecheck/lint/full unit-DB/Foundation/diff commands;
a new numeric full-suite count was not supplied in this extract. Temporary key cleanup was
reported. Agent did not receive credentials or execute live inference.

Answer-versus-source review: selected agencies is the current approved version; broad small
businesses is superseded; both rationales match the fixture. Six interviews/four observations
are explicitly fictional, low-quality and insufficient for demand/market size/price. Positioning
and willingness to pay remain pending. Staff turnover/account handover is clearly labelled a
new tentative hypothesis, never a recorded fact. Interviews and paid-pilot signals are proposed
for human consideration. No market/revenue figures, automatic decision approval or strategy
write is claimed. Not seeing the full Positioning question is an accurate packet limitation.

One synthetic live sample proves neither universal semantic quality nor live HTTP/server E2E;
source-ID validation checks membership, not entailment. Existing quota-concurrency limitations,
transient conversation scope and no autonomous writes remain as documented in brando-b1.md.
No further provider calls were made to improve this sample or calculate an inferred cost.

Windows gates previously recorded and human DEMO review are complete. The visual historical
encoding-backup case remains skipped under its unchanged prerequisite. Latest follow-up is
historical documentation only. Changes remain uncommitted; no production operation, tag,
configuration change, new migration, push or merge. Jury Production Freeze stays active.
