# Claude Code · Brandopolis

Brandopolis is **the Brand Operating System**: connected Strategic Decisions with evidence, hypotheses, human rationale, versions, dependencies and Change Impact. **AI proposes. Humans decide. Brandopolis remembers.**

@AGENTS.md

## Pilot freeze

Single canonical definition (frozen 2026-09-29; hardening exception and security-defect rule added by
human decisions on 2026-10-04). It supersedes the 2026-09-28 list of permitted change categories.
Other documents link here instead of restating it.

> The current PILOT workspace is functionally frozen for external validation.
> Do not continue opportunistic UI or strategic-workflow polishing.

1. **Frozen:** features, product improvements and functional strategic changes, including runtime UI.
2. **Runtime exceptions** (the only reasons to change PILOT runtime behaviour):
   - a defect discovered by regression or external testing;
   - a confirmed security, authentication, authorization, tenant-isolation or data-exposure defect,
     even if found by code review. It needs reproducible evidence and explicit human authorization
     before implementation, and never carries product improvements.
3. **Allowed during this hardening (2026-10-04):** documentation reconciliation, engineering tooling,
   agent skills, and validators/checks without runtime effect.
4. **Not authorized without a new human decision:** migrations, product schema changes, deploy and
   production operations.

### Jury production freeze · 2026-10-04

Human decision: for the next jury-review window (approximately 15 days), production is **jury-critical**
and must remain stable. This rule does **not** expire automatically on a date; only an explicit human
decision lifts it.

1. **Default outcome of the next development phase:** release-ready code outside production. Finishing a
   phase, passing review, committing, pushing, opening/merging a PR, or updating `main` never authorizes
   a production deployment.
2. **Development may continue** on dedicated branches and non-production environments. Keep jury-facing
   production behaviour, data, auth, configuration and infrastructure unchanged unless the exception
   below is explicitly authorized.
3. **Production changes are frozen:** no deploy, production migration/schema change, production config,
   OIDC, secrets, DNS, hosting, runtime asset or behaviour change without a separate explicit human
   authorization naming the exact release/change.
4. **Only emergency exceptions:** a reproducible defect that threatens jury access/availability, or a
   confirmed security, authentication, authorization, tenant-isolation or data-exposure defect. The fix
   must contain only the defect correction, never opportunistic product improvements.
5. **Any authorized production exception during this window requires before deployment:** a pinned
   release SHA, all applicable typecheck/lint/unit/browser/security/Foundation gates green, reviewed
   diff, backup/rollback plan where state or infrastructure can change, production smoke plan and
   post-deploy verification. A failed gate means no deploy.
6. **At phase close:** report the candidate as `release-ready` or `not release-ready`; do not describe
   it as deployed unless production was separately authorized and verified.

INV-006 stays absolute: no conversation or AI modifies strategy silently, whatever is requested.
Deferred product improvements go to the backlog, never straight into the code. Do not redesign approved
UI without an explicit instruction. Repository docs are authoritative; chat history is not a source of
truth.

Pre-tester UX is complete: participant intake, CoffeePolis demo sandbox, brand geography, optional AI
possibilities, per-option Incorporar/Modificar/Descartar, and the phase-completion hand-off. See
[CURRENT_IMPLEMENTATION_STATE_2026-09-28](docs/15-handoff/CURRENT_IMPLEMENTATION_STATE_2026-09-28.md)
and [GOOGLE_AUTH_PRODUCTION](docs/15-handoff/GOOGLE_AUTH_PRODUCTION.md).

Operational entry point, including what is implemented vs deferred:
[CURRENT_IMPLEMENTATION_STATE_2026-09-28](docs/15-handoff/CURRENT_IMPLEMENTATION_STATE_2026-09-28.md).
Production PILOT is live: per [SESSION_STATE](SESSION_STATE.md) (2026-09-29) the approved landing is
deployed, `brandopolis.ai` redirects to the pilot and production ran `2f84d29` (landing, auth and
admin), with later hotfix deployments recorded there; the 403 diagnosis in
[ROOT_DOMAIN_403_REMEDIATION](docs/15-handoff/ROOT_DOMAIN_403_REMEDIATION.md) is historical. The exact
deployed commit is recorded only in SESSION_STATE. Commit and push are not deployment.

User-facing term for pilot participants is **Estratega de Marca / Estrategas de Marca**, never
"tester". Internal identifiers (schema, telemetry, tests, env vars) keep `tester` where renaming
would add risk.

## Start

1. [docs/15-handoff/NEXT_DEVELOPER_START_HERE.md](docs/15-handoff/NEXT_DEVELOPER_START_HERE.md) — setup, commands, architecture, current state.
2. [SESSION_STATE.md](SESSION_STATE.md) — latest phase and gates. Then the canonical sources: [source of truth](docs/00-index/source-of-truth.md), [Product Bible](docs/01-product/product-bible-v1.md), [invariants](docs/04-domain-model/invariants.md), [state machines](docs/04-domain-model/state-machines.md), [change impact](docs/04-domain-model/change-impact.md), [ADRs](docs/14-decisions/README.md).
3. Role history (independent review of Codex work): [handoff/CLAUDE_START_HERE.md](handoff/CLAUDE_START_HERE.md).

## Frozen — do not change without an explicit human product decision

- Phases 1–9 semantics: Strategic Decision, Brand Context, Primary Customer, Positioning, dependencies (HARD/SOFT/INFORMATIVE), Change Impact, Human Authority, versioning, audit, optimistic concurrency, idempotency, tenancy, OIDC architecture, DEMO/PILOT separation, provider-neutral AI, Experiment/Signal/Learning.
- Canonical statuses `APPROVED, MODIFIED, REJECTED, SUPERSEDED, NEEDS_REVIEW, INVALIDATED`. «Vigente»/Current is display-only, never a status.
- AI never commits strategy; only a human commit creates a version. No automatic cascade.
- Applied migrations in `drizzle/` are immutable (hash-checked). No schema change for visual work.
- Brand Master (`design/brandopolis-ui/brand-master/final-canonical-2026-09-25/`) is immutable; never redraw the Ribbon B or wordmark.
- No feature creep: see [POST_MVP_DEFERRED_SCOPE](docs/15-handoff/POST_MVP_DEFERRED_SCOPE.md).

## Frontend authority

`src/transport/public/` (no framework/bundler). Status vocabulary only via `stateBadge()` in `product-views.js`; presentation-only code in `product-views.js`/`product-interactions.js`; operations in `app.js`. CSS layers and design rules: [PRODUCT_DESIGN_SYSTEM](design/brandopolis-ui/PRODUCT_DESIGN_SYSTEM.md). New runtime files must be added to the allowlist in `src/transport/assets.ts`. Restart the server after frontend edits.

## Commands (all real)

`pnpm install --frozen-lockfile` · `pnpm competition:start` (DB + migrations + DEMO + server on 127.0.0.1:3000) · `pnpm typecheck` · `pnpm lint` · `pnpm test` · `pnpm test:e2e` · `pnpm test:visual` · `pnpm test:pilot:e2e` · Foundation `python scripts/foundation_check.py` · UI validator `python design/brandopolis-ui/validation/validate.py --integrated` · Brand validator `python design/brandopolis-ui/brand-master/final-canonical-2026-09-25/validate_brand.py`.

## Required before any commit touching behaviour

Run typecheck, lint, `pnpm test`, the affected browser suite, and Foundation when contracts/docs change. Keep tests for INV-001..010, tenancy, concurrency (409), idempotency, old versions, HARD Needs Review and no auto-cascade green. Never weaken a test to pass. Never commit `.local/`, tokens, `.env` or screenshots outside the curated reference folders. Update `SESSION_STATE.md` and `CHANGELOG.md` with real results. The independent Final Contract Patch was never received; do not claim to have checked it.
