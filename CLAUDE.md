# Claude Code · Brandopolis

Brandopolis is **the Brand Operating System**: connected Strategic Decisions with evidence, hypotheses, human rationale, versions, dependencies and Change Impact. **AI proposes. Humans decide. Brandopolis remembers.**

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
