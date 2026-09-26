Status: canonical
Owner: Engineering
Canonical: yes
Last reviewed: 2026-09-25
Related: README.md, docs/15-handoff/FINAL_MVP_HANDOFF_2026-09-25.md, LOCAL_HANDOFF.md, CLAUDE.md, AGENTS.md
Depends on: docs/00-index/source-of-truth.md

# BRANDOPOLIS — NEXT DEVELOPER START HERE

This file plus the repository is everything you need. No chat history, founder machine or undocumented secret is required to build, run and test the local DEMO. Real external services (hosting, OIDC, AI provider) are configured separately and are listed under [External dependencies](#external-dependencies).

## Product summary

Brandopolis is **the Brand Operating System**: a B2B web product where a brand's strategy is a set of **connected Strategic Decisions** (Cliente principal → Modelo de valor → Posicionamiento → Mensaje principal) with evidence, hypotheses, human rationale, versions and dependencies. When a decision changes, connected decisions enter **Requiere revisión** and a person performs a **Guided Review**. Experiments, Signals and Learnings feed persistent **Brand Context**. The UI is Spanish (es-MX).

## Product principles

- **AI proposes. Humans decide. Brandopolis remembers.**
- Connected Decisions before generated content; persistent strategic state before conversation; evidence before claims; human judgment before autonomy.
- Brand Context is structured persistent state — not a mega prompt, not a chat transcript.
- Canonical sources: [Source of Truth](../00-index/source-of-truth.md), [Product Bible](../01-product/product-bible-v1.md), [principles](../01-product/product-principles.md).

## Current MVP state

- Engineering foundation and MVP phases 1–9: **closed** ([closure](MVP_PHASES_1_TO_9_CLOSURE.md)).
- Local DEMO: complete and deterministic (no external services).
- PILOT mode (HTTPS, OIDC, per-tester workspaces, optional AI with notice and caps, feedback, telemetry): engineering-ready, **external configuration not performed** ([checklist](LIVE_PILOT_LAUNCH_CHECKLIST.md)).
- Frontend: final polish (Phase 10A + 10B) complete; **founder visual acceptance pending**.
- Not in production. No real testers, customers or revenue yet.

## Final handoff branch

`handoff/phase10b-final-2026-09-25` on `origin` (https://github.com/Vik-Avila/brandopolis).

> **Important:** GitHub's default branch `main` still contains only the original Engineering Foundation docs. Always clone this branch (or the tag below). Merging into `main` is a human decision and has not been done.

## Final handoff tag

`brandopolis-mvp-handoff-ready-2026-09-25` (annotated). Meaning: engineering + product handoff candidate ready. It does **not** mean production deployed, OIDC/AI configured or founder visual acceptance done.

## Final handoff SHA

The commit the tag points to:

```bash
git rev-parse "brandopolis-mvp-handoff-ready-2026-09-25^{commit}"
```

The exact SHA is also recorded in [FINAL_MVP_HANDOFF_2026-09-25.md](FINAL_MVP_HANDOFF_2026-09-25.md) (a file cannot contain its own commit hash; that document names the SHA of the verified code and the tag resolves to the final docs commit on top of it).

## Architecture overview

TypeScript **modular monolith** + **PostgreSQL 17**, no frontend build step.

- `src/domain/` — contracts, module definitions, analysis and the Context Assembler (no I/O, no provider SDK).
- `src/application/engine.ts` — use cases: decisions, versions, dependencies, Change Impact, reviews, recommendations, learning loop, practice. Human Authority, tenancy, optimistic concurrency and idempotency are enforced here and in DB guards.
- `src/persistence/` — Drizzle schema (`schema.ts`), connection, migration readiness (forward-only, hash-checked).
- `src/transport/` — HTTP (`http.ts`: CSP, Host/Origin checks, cookies, static allowlist with ETag and byte ranges), DEMO server (`server.ts`), PILOT OIDC boundary (`pilot-auth.ts`), provider-neutral AI adapter (`anthropic-provider.ts`), runtime asset allowlist (`assets.ts`).
- `src/transport/public/` — the single-page frontend (native HTML/CSS/JS modules).
- Decisions: [ADRs](../14-decisions/README.md) (Drizzle ADR-0011, OIDC ADR-0013, optional AI adapter ADR-0014).

## Repository map

| Path | Contents |
|---|---|
| `src/` | Application code (above) |
| `drizzle/` | SQL migrations 0000–0008 + journal. **Never edit an applied migration** (readiness compares hashes). |
| `scripts/` | DEMO/PILOT tooling (`competition-*`, `db:*`, `pilot:*`), Foundation check, encoding diagnosis |
| `tests/` | Vitest (`*.test.ts`), Playwright: `browser/` (DEMO E2E), `pilot-browser/`, `visual/`, `boot/` |
| `config/`, `schemas/`, `prompts/`, `evals/`, `telemetry/` | Versioned rules, JSON Schemas v1, prompt functions, golden cases, telemetry events |
| `docs/00–15`, `domain/` | Product, domain, architecture, security, decisions, handoff |
| `design/brandopolis-ui/` | Brand Master, visual package, tokens, UI validator, design docs, reference screenshots |
| `public/brand/` | Runtime copies of brand assets (byte-identical to the Brand Master) |
| `.local/` | **Ignored.** Local DB clusters, DEMO session file, backups. Never commit. |

## Frontend structure

No framework, no bundler. The server serves an exact allowlist (`src/transport/assets.ts`); nothing else under the repo is public.

| File | Role |
|---|---|
| `index.html` | Single document for `/`, `/login`, `/request-access`, workspace; links stylesheets in cascade order |
| `app.js` | Operations: API calls, rendering of views, event binding (`openModule`, `enterView`, `run`) |
| `product-views.js` | Pure presentation projections (no requests/writes): status vocabulary (`stateBadge`), home, history, impact pair, practice |
| `product-interactions.js` | Keyboard/focus behaviour: `trapFocus` (dialog, drawer), accessible decision tabs |
| `tokens.css` (served from `design/brandopolis-ui/tokens/`) | Design tokens |
| `base.css` | Reset, typography (`--font-display`, `--font-ui`), controls, badges, notices, chrome |
| `public.css` | Gateway, hero, «Cómo funciona», access views |
| `product-shell.css` | Header, authenticated shell, navigation, brand selector, dialogs, busy/booting, motion |
| `product-decision.css` | Decision card, tabs, evidence/hypothesis, options, review, Change Impact, history |
| `product-context.css` | «Contexto vigente» rail |
| `product-views.css` | Home, Blueprint, context capture, learning, practice |
| `product-responsive.css` | One block per breakpoint (widest → narrowest), then reduced motion |

Assets are cached in memory per server process: **restart the server after editing frontend files.** Design documentation: [PRODUCT_DESIGN_SYSTEM](../../design/brandopolis-ui/PRODUCT_DESIGN_SYSTEM.md), [asset mapping](../../design/brandopolis-ui/FRONTEND_ASSET_MAPPING.md).

## Domain invariants

Frozen. Full table: [invariants](../04-domain-model/invariants.md); state machines: [state-machines](../04-domain-model/state-machines.md).

- INV-001 AI never creates an approved Decision. INV-002 an approved Decision changes only through a new human version. INV-003 superseding preserves history.
- INV-004 tenant isolation. INV-005 external evidence requires provenance. INV-006 conversation never writes strategy.
- INV-007 a Signal is not a Learning. INV-008 Change Impact never rewrites downstream decisions. INV-009 stale clients get 409 (optimistic concurrency). INV-010 commits are auditable and idempotent.
- Canonical statuses: `APPROVED, MODIFIED, REJECTED, SUPERSEDED, NEEDS_REVIEW, INVALIDATED`. «Vigente»/Current is a display relation, **never** a `Decision.status`.

## Brand Master

`design/brandopolis-ui/brand-master/final-canonical-2026-09-25/` — canonical and immutable (validated by SHA-256). Never redraw, trace or re-synthesize the Ribbon B or wordmark. Runtime copies live in `public/brand/` and `tests/brand-runtime.test.ts` fails on any byte drift. Usage: `FRONTEND_BRAND_INTEGRATION.md` and `BRAND_ASSET_USAGE_MATRIX.md` in that folder.

## Visual package

`design/brandopolis-ui/assets/final-visual-package-2026-09-25/` — visual North Star (concept boards, approved imagery). Only the files mapped in [FRONTEND_ASSET_MAPPING](../../design/brandopolis-ui/FRONTEND_ASSET_MAPPING.md) are served. Do not fake capabilities to match mockups.

## Prerequisites

Verified on the handoff machine (Windows 11): Node **24.19.0**, pnpm **12.4.2**, Python **3.12**, Git 2.55, Google Chrome stable.

- **Node 24.x** (required; `engines` and the DEMO tooling reject other majors). `.nvmrc` = 24.
- **pnpm 12.4.2** exactly (`packageManager`; the DEMO tooling rejects other versions). Easiest: `corepack enable` (ships with Node).
- **Python ≥ 3.10** for the Foundation validator (`jsonschema` from `requirements-foundation.txt`).
- **Google Chrome** (stable) for every Playwright suite (`channel: 'chrome'`).
- **OpenSSL** only for `pnpm test:pilot:e2e` (on PATH; on Windows the Git for Windows copy is used, or set `OPENSSL_BIN`).
- **No Docker and no system PostgreSQL**: PostgreSQL 17 runs as a local process from the `embedded-postgres` dev dependency (Windows/Linux/macOS, x64/arm64 builds allowed in `pnpm-workspace.yaml`; Windows x64 is the verified platform).

## Clone procedure

**Windows:** clone into a short path (for example `C:\dev\brandopolis`). Some design files have ~127-character repository paths and the classic 260-character path limit applies; alternatively enable `git config --global core.longpaths true` before cloning. Line endings are handled by `.gitattributes` (hashed brand and kit files are checked out byte-exact).

```bash
git clone --branch handoff/phase10b-final-2026-09-25 https://github.com/Vik-Avila/brandopolis.git
```

```bash
cd brandopolis
```

To pin the exact handoff state instead: `git checkout brandopolis-mvp-handoff-ready-2026-09-25`.

## Package installation

```bash
corepack enable
```

On Windows `corepack enable` writes to `C:\Program Files\nodejs` and needs an elevated terminal. Without admin rights use `npm install -g pnpm@12.4.2` instead. Check with `pnpm --version` (must print `12.4.2`).

```bash
pnpm install --frozen-lockfile
```

Foundation validator environment (Windows paths shown; on macOS/Linux use `.venv/bin/python`):

```bash
python -m venv .venv
```

```bash
.venv/Scripts/python.exe -m pip install -r requirements-foundation.txt
```

## Environment variables

**The local DEMO needs no environment variables and no `.env` file.** `DATABASE_URL` must stay empty for the DEMO tooling; `NODE_ENV=production` is rejected.

`.env.example` documents every variable, grouped as:

- **DEMO** (optional): `DATABASE_URL` (empty → local embedded PostgreSQL), `NODE_ENV=development`.
- **PILOT** (secret manager of the host, never in Git): `PILOT_DATA_CLASS`, `DATABASE_URL`, `PILOT_ORIGIN`, `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET` or `OIDC_PUBLIC_CLIENT=true`, `OIDC_REDIRECT_URI`; optional `PORT`, `BIND_HOST`, `TRUST_PROXY`, `PILOT_REQUEST_ACCESS_URL`, `ANTHROPIC_API_KEY` + `ANTHROPIC_MODEL` (both or neither), AI timeout/caps/notice, `PG_BIN`, backup/restore operation flags. Contract: [PILOT_DEPLOYMENT_CONTRACT](PILOT_DEPLOYMENT_CONTRACT.md); validate with `pnpm pilot:validate-config`.
- **Tests/tooling only**: `BRANDOPOLIS_BASE_URL`, `BRANDOPOLIS_SESSION_FILE`, `EVIDENCE_DIR`, `UPDATE_CANONICAL_SCREENSHOTS`, `OPENSSL_BIN`, `CI`.

## Local database

`pnpm competition:start` (below) creates and starts a private PostgreSQL 17 cluster in `.local/postgres/` on `127.0.0.1:55432` with a random password stored in `.local/postgres/connection.json` (UTF-8, locale C). Data persists across restarts. Tests use a separate cluster (`.local/test-postgres/`, port 55433) and a fresh database per run. The isolated profile (`--isolated`) uses `.local/rc1-smoke/` on port 55434 and serves on 3001.

Manual alternative (keep terminal 1 open): `pnpm db:start`.

## Migrations

Applied automatically by `pnpm competition:start` (forward-only, never destructive). Manual: `pnpm db:migrate`. New migrations: change `src/persistence/schema.ts`, then `pnpm db:generate`; custom guards go in versioned SQL. Never edit an applied migration and never use `drizzle-kit push`.

Known historical data note: migration `0003_strategic_vertical.sql` backfills two questions with mis-encoded Spanish for brands that already existed when it ran. Fresh databases (and every PILOT database) are unaffected. Upgraded local DEMO databases can be repaired with `node scripts/demo-encoding.mjs` (inspect) / `--apply` (with backup). See [PHASE10A_ENCODING_FINDINGS](PHASE10A_ENCODING_FINDINGS.md).

## DEMO bootstrap/seed

`pnpm competition:start` also creates the DEMO identity (user, workspace, session) and one fully walked DEMO brand. Another fictional brand: `pnpm demo:competition`. Manual alternative: `pnpm db:seed` (identity + session only).

## Local session creation

The session token is written to the private, git-ignored file `.local/demo-session.json` (field `token`, valid 24 h; `competition:start` renews it). Never paste it into issues, commits or chats. To print it in your own terminal:

```bash
node -e "console.log(JSON.parse(require('fs').readFileSync('.local/demo-session.json','utf8')).token)"
```

## Start application

```bash
pnpm competition:start
```

Keep that terminal open (Ctrl+C stops only what it started and keeps data). In a second terminal:

```bash
pnpm competition:check
```

Manual alternative: `pnpm db:start` (terminal 1), then `pnpm db:migrate`, `pnpm db:seed`, `pnpm dev` (terminal 2).

## Expected URLs

- Public gateway: http://127.0.0.1:3000/ (use `127.0.0.1`; the server rejects non-loopback Host headers, and `localhost` may resolve to IPv6)
- Access: http://127.0.0.1:3000/login — paste the token.
- Workspace: printed by `competition:start` as `DEMO lista: http://127.0.0.1:3000/?brand=<id>&module=Primary%20Customer`.
- Health: http://127.0.0.1:3000/health
- Isolated profile: same paths on port 3001.

## Test commands

```bash
pnpm typecheck
```

```bash
pnpm lint
```

```bash
pnpm test
```

```bash
.venv/Scripts/python.exe scripts/foundation_check.py
```

Browser suites (Chrome; with `pnpm competition:start` running, which also provides `.local/demo-session.json`):

```bash
pnpm test:e2e
```

```bash
pnpm test:visual
```

```bash
pnpm test:pilot:e2e
```

`test:pilot:e2e` creates a throwaway database inside the default local cluster (`.local/postgres`, created by `pnpm competition:start` or `pnpm db:start`) and refuses `DATABASE_URL`. `test:e2e`/`test:visual` reuse the server on 3000 (or start `pnpm dev`). To target the isolated profile set `BRANDOPOLIS_BASE_URL=http://127.0.0.1:3001` and `BRANDOPOLIS_SESSION_FILE=.local/rc1-smoke/demo-session.json`. Boot smoke: `pnpm competition:start --isolated` then `pnpm competition:test-boot`. Browser tests create DEMO brands; that is expected.

## Browser QA

- Viewports exercised by the suites: 1600×1000, 1440×900, 1280×800, 768×1024, 390×844 (+360×800 in the evidence spec).
- Evidence capture (no repo writes by default): `pnpm exec playwright test --config playwright.phase10a.config.ts` → `test-results/phase10a/final/`.
- Committed reference screenshots: `design/brandopolis-ui/reference/screenshots/` (rewritten only with `UPDATE_CANONICAL_SCREENSHOTS=1`) and the curated final set in `design/brandopolis-ui/reference/phase10b/`.
- Checks built into the suites: UTF-8 (no mojibake), horizontal overflow, broken images, console errors, contrast (incl. pixel-measured hero), keyboard tabs, dialog/drawer focus trap and return, reduced motion.

## Brand validation

```bash
.venv/Scripts/python.exe design/brandopolis-ui/validation/validate.py --integrated
```

```bash
.venv/Scripts/python.exe design/brandopolis-ui/brand-master/final-canonical-2026-09-25/validate_brand.py
```

`pnpm test` includes `tests/brand-runtime.test.ts` (byte identity of runtime brand assets, no design masters served).

## AI architecture

Provider-neutral: the domain never imports a provider SDK. `src/transport/anthropic-provider.ts` implements the optional adapter (ADR-0014). DEMO uses fixed didactic options (never presented as live AI). AI output is always a proposal: it is validated against schemas, shown as «propuesta», and only a human commit creates a version.

## AI external configuration

Not configured. PILOT enables AI only when `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL` are both set in the host secret manager, with daily caps and a one-time data notice. Verify with `pnpm pilot:ai-smoke`. Details: [AI_PROVIDER_LAUNCH](AI_PROVIDER_LAUNCH.md).

## OIDC external configuration

Not configured. PILOT authenticates through any standards-compliant OIDC provider (ADR-0013): issuer, client id, secret or public client, redirect `https://pilot.brandopolis.ai/auth/callback`. Details: [OIDC_PROVIDER_DECISION](OIDC_PROVIDER_DECISION.md), [PILOT_RUNBOOK](PILOT_RUNBOOK.md).

## Deployment state

Nothing is deployed. Hosting, production PostgreSQL, DNS/TLS for `pilot.brandopolis.ai` and backups are external decisions: [LIVE_HOSTING_DECISION](LIVE_HOSTING_DECISION.md), [DOMAIN_DNS_LAUNCH](DOMAIN_DNS_LAUNCH.md), [LIVE_PILOT_LAUNCH_CHECKLIST](LIVE_PILOT_LAUNCH_CHECKLIST.md). The DEMO server refuses `NODE_ENV=production` by design.

## Known limitations

See the list in [FINAL_MVP_HANDOFF_2026-09-25.md](FINAL_MVP_HANDOFF_2026-09-25.md#known-mvp-limitations). Highlights: Inter is named by the design system but not self-hosted (system UI font is used when Inter is absent); frontend assets require a server restart after edits; no compression in the Node server (expected at the proxy); Blueprint is a structured view, not a graph.

## Deferred scope

[POST_MVP_DEFERRED_SCOPE](POST_MVP_DEFERRED_SCOPE.md). Do not add billing, teams, global search, notifications, graph engine, RAG, autonomous agents, analytics or content generation without a product decision.

## External dependencies

Supplied separately, never committed: hosting account, PILOT `DATABASE_URL`, OIDC client, DNS, Anthropic key/model/budget (optional), request-access destination, tester identities. GitHub access to `Vik-Avila/brandopolis`.

## First recommended next task

Run the founder visual acceptance on the local DEMO (the only pending gate that is not external), record the verdict in `SESSION_STATE.md`, and then execute [LIVE_PILOT_LAUNCH_CHECKLIST](LIVE_PILOT_LAUNCH_CHECKLIST.md) step 1 (choose hosting + OIDC provider) — no feature work until real pilot evidence exists.
