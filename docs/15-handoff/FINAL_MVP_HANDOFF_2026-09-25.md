Status: canonical
Owner: Engineering / Product
Canonical: yes
Last reviewed: 2026-09-25
Related: docs/15-handoff/NEXT_DEVELOPER_START_HERE.md, docs/15-handoff/PHASE10A_FRONTEND_EXCELLENCE.md, design/brandopolis-ui/PRODUCT_DESIGN_SYSTEM.md, design/brandopolis-ui/FINAL_VISUAL_GAP_AUDIT.md
Depends on: docs/15-handoff/MVP_PHASES_1_TO_9_CLOSURE.md

# Brandopolis — Final MVP handoff (Phase 10B) · 2026-09-25

Setup and daily commands: [NEXT_DEVELOPER_START_HERE](NEXT_DEVELOPER_START_HERE.md). This document records the final state and the evidence behind it.

## Status

| Area | Status |
|---|---|
| Engineering foundation (phases 1–9) | CLOSED — unchanged in Phase 10B (no schema, migration, domain or security-architecture change) |
| MVP product | IMPLEMENTED |
| Final product polish (10A + 10B) | COMPLETE |
| Automated QA | PASS (see [Tests](#tests)) |
| Responsive QA | PASS at 1600×1000, 1440×900, 1280×800, 768×1024, 390×844 (+360×800) |
| Accessibility QA | No WCAG 2.2 AA failure found by independent review; P2/P3 findings fixed or listed below |
| Clean-clone rehearsal | **PASS** (fresh GitHub clone, fresh dependencies/DB/session; see [record](#rehearsal-record)) |
| External production configuration | NOT PERFORMED (hosting, DB, OIDC, DNS, AI key, request-access destination) |
| Founder final visual review | **PENDING** |

## Branch, tag, SHA

- Branch: `handoff/phase10b-final-2026-09-25` (from `7be0b67`, Phase 10 start). Not merged into `main` (GitHub `main` holds only the Foundation import).
- Verified code commit: `770458fbd40074ea99c2afcd5327870f3433dd8a` (last commit that changes runtime code). Later commits are documentation only.
- Tag: `brandopolis-mvp-handoff-ready-2026-09-25` (annotated) on the final documentation commit: `git rev-parse "brandopolis-mvp-handoff-ready-2026-09-25^{commit}"`.

Commits in this handoff:

1. `1efff76` chore: preserve phase10a frontend work and prepare final polish
2. `416d38c` refactor: consolidate frontend styles and interactions without visual change
3. `c5eeca0` design: complete Brandopolis final product polish and accessibility pass
4. `61ac8b8` fix: close final design review gaps
5. `80ef75b` fix: close final accessibility review findings
6. `b089e37` docs: prepare next developer handoff
7. `e76f1db` fix: make hashed UI kit assets byte-exact on Windows checkouts (found by the rehearsal)
8. `770458f` fix: keep the human decision field's accessible name unique (found by the rehearsal)
9. docs: record the clean-clone rehearsal (tagged)

## Product design state

Direction preserved from Phase 10A (left strategic navigation, local Decision tabs, human Decision first, «Contexto vigente» rail) and completed:

- **Strategic Decision**: question → human decision (authorship explicit; under review it keeps authorship with an attention tone) → why it matters → review → directional connections («Depende de» / «Afecta a»); evidence/hypotheses, options and history in accessible tabs.
- **Change Impact**: changed decision (antes/ahora) → labelled dependency connector → affected decision → human actions; the text path hides once the diagram is open; upstream/downstream never shown.
- **Guided Review**: «what changed» line first, explicit Keep/Modify choice with selected marker, «Confirmar revisión» enabled only after a choice (editing the text counts as Modificar), focus lands on the choice.
- **Contexto vigente**: persistent memory; Decision in view marked; collapses on phones and Home.
- **History**: preserved evolution (warm, not disabled). **Blueprint**: pillars from persisted state, dependency types as edges, affected targets flagged. **Context**: records before the capture form. **Learning**: factual, duplicate step bar removed. **Practice**: Spanish capability names with a summary.
- **System**: one status vocabulary (`stateBadge`), one display serif and UI font property, restrained motion (view/dialog entry, nav/tab transitions) removed under reduced motion; primary emerald reserved for human commitment; nav current state as a raised card.
- **Public**: unchanged composition; AA contrast fixed at tablet widths (veil + copy width); Safari-capable video (byte ranges).

Independent reviews (fresh subagents on real screenshots) found the Decision pages and Change Impact "the clearest moments"; remaining opinions are listed under limitations and founder review.

## Frontend structure

See [NEXT_DEVELOPER_START_HERE › Frontend structure](NEXT_DEVELOPER_START_HERE.md#frontend-structure) and [PRODUCT_DESIGN_SYSTEM](../../design/brandopolis-ui/PRODUCT_DESIGN_SYSTEM.md). Phase 10B replaced `style.css` + `product.css` (`@import` chain) with `base.css` and `public.css`, linked every stylesheet directly, merged three stacked responsive passes into one block per breakpoint, removed dead selectors and all specificity `!important`, and centralised JS entry points (`openModule`, `enterView`, `trapFocus`). The CSS refactor was proven visually identical with a computed-style snapshot of 17 screens × 5 viewports before any design change was made.

## Brand Master integration

Unchanged and validated: runtime identity files are byte-identical to the Brand Master (`tests/brand-runtime.test.ts`); premium horizontal derivative (660×151 WebP, 17,790 bytes) for prominent headers; flat vector symbol for compact/mobile, favicon and PWA. Brand Master validator PASS (58 assets, 19 mappings). No master is served.

## UTF-8

- **Source**: all runtime, config, prompts and demo sources are valid UTF-8 without mojibake (`tests/encoding.test.ts`). One mojibake heading in `design/brandopolis-ui/README.md` was fixed.
- **Root cause found** (not identified in Phase 10A): migration `drizzle/0003_strategic_vertical.sql` backfills the Value Mechanism and Core Message questions with UTF-8-read-as-Latin-1 text **for brands that already existed when that migration ran**. Applied migrations are hash-locked, so it is documented, not edited. Fresh databases and every PILOT database have no brands at migration time and are unaffected; upgraded DEMO databases are repaired by `node scripts/demo-encoding.mjs --apply` (backup first).
- **Clean environment**: see [Clean clone](#clean-clone-rehearsal) — browser text checked for `¿ ¡ á é í ó ú ñ ü` and common corruption sequences.

## Responsive

Suites cover 1600×1000, 1440×900, 1280×800, 768×1024, 390×844 (and 360×800 in the evidence spec): no horizontal overflow, no broken images, no console errors, no clipped primary actions. Phones: icon-only «Nueva marca» (named), 44px header/select/buttons, stacked Impact with a downward connector, collapsed rail, tab scroll hint and auto-scroll of the selected tab.

## Accessibility

Final independent WCAG 2.2 AA review (Playwright + computed contrast on blended backgrounds, five viewports, reduced motion): **no P1**. Verified: single exposed h1 at every width, heading order, landmarks, tab order, visible focus never obscured, dialog and drawer focus trap/return, Guided Review focus path, tablist keyboard model, contrast ≥ 4.5:1 on all measured small text, reduced motion. Fixed from the review: tab auto-scroll on phones, 44px brand selector, decorative glyphs removed from accessible names, contrast of Blueprint arrows and rail numbers, font-size floor. Remaining P3 items are listed under limitations.

## Performance

Runtime assets are an exact allowlist; largest file 199,784 B (mobile hero); premium logo 17,790 B; no masters served. Phase 10B removed the CSS `@import` waterfall (direct links), added `modulepreload` for the view modules, removed `decoding=async` from the LCP hero image, added `Content-Length`/`Accept-Ranges`/`206` for media (Safari video), used the previously unused mobile shell atmosphere, added a 4 s reveal fallback if the session probe fails, and `-webkit-backdrop-filter` for Safari. Video: `preload=none`, poster, plays only when visible, pause control, paused under reduced motion. Measured CLS on the gateway: 0.

## Tests

Final runs on the founder working copy at `80ef75b` and again in the clean clone at `770458f` (see rehearsal), Windows 11, Node 24.19.0, pnpm 12.4.2, Chrome stable:

| Command | Result |
|---|---|
| `pnpm typecheck` | PASS |
| `pnpm lint` | PASS |
| `pnpm test` (Vitest: domain, contracts, PostgreSQL, migrations, HTTP incl. new byte-range test, brand runtime, encoding) | 63/63 PASS, 3 files |
| `node --test tests/demo-encoding.node.mjs` | 1/1 PASS |
| `pnpm test:e2e` (5 viewports) | 25/25 PASS |
| `pnpm test:visual` | 10 PASS, 1 SKIPPED (historic encoding proof needs the founder's local repair backup for the same workspace — precondition absent, by design) |
| `pnpm test:pilot:e2e` (HTTPS + OIDC fixtures, 5 viewports) | 10/10 PASS |
| Phase 10A evidence spec (`playwright.phase10a.config.ts`) | 2/2 PASS |
| Foundation check | PASS (0 errors) |
| UI validator `--integrated` | PASS |
| Brand Master validator | PASS (58 assets, 19 mappings) |
| `pnpm audit --prod` | No known vulnerabilities |
| `pnpm audit` (all) | 1 moderate, dev-only: esbuild ≤0.24.2 via `drizzle-kit` (used only for `db:generate`) |
| `git diff --check` | clean |

One evidence-spec failure occurred once immediately after a cold server start and did not reproduce in 6 later runs; recorded as unreproduced.

## Browser QA

Real Chromium through Playwright on public (gateway, login, request access) and authenticated views (home, Cliente principal, Modelo de valor, Posicionamiento, Mensaje principal, evidence, options, history, Needs Review, Change Impact, Guided Review, Contexto estratégico, Experimentos y aprendizajes, Mi práctica estratégica, Blueprint, new-brand dialog, mobile drawer): 0 mojibake, 0 broken media, 0 horizontal overflow, 0 console errors, 0 keyboard regressions, 0 legacy branding. Curated evidence: `design/brandopolis-ui/reference/phase10b/`.

## Clean clone rehearsal

**PASS** — see [Rehearsal record](#rehearsal-record).

## External configuration (remaining, not performed)

Hosting provider and region; production PostgreSQL 17 `DATABASE_URL`; OIDC provider (issuer, client id, secret or public client) and tester identities; DNS + TLS for `pilot.brandopolis.ai`; Anthropic key/model/budget (or AI disabled) and one `pnpm pilot:ai-smoke`; request-access destination (`PILOT_REQUEST_ACCESS_URL`); approval of the AI notice text; hosted backup/restore rehearsal. See [LIVE_PILOT_LAUNCH_CHECKLIST](LIVE_PILOT_LAUNCH_CHECKLIST.md).

## Known MVP limitations

- Founder visual acceptance has not happened; screenshots and tests are not acceptance.
- Inter is not self-hosted (CSP same-origin, the kit ships no font files): the system UI font renders where Inter is not installed.
- The Node server does not compress responses (expected at the hosting proxy) and caches assets in memory (restart after frontend edits); `HEAD` requests are not served for assets.
- Ambient imagery from the visual package is not used inside dense product views (deliberately near-solid); empty states are one line; selects are native with a styled chevron.
- Navigation review state is exposed through `aria-description` + `title` (ARIA 1.3; support varies by screen reader); the visible «!» is decorative.
- Status notices dismiss after 10 s (announced through a live region).
- Blueprint is a structured view of persisted state, not a graph.
- Migration `0003` historical backfill note (UTF-8 section).
- The Playwright suites require Google Chrome (`channel: 'chrome'`); `test:pilot:e2e` requires OpenSSL.
- macOS/Linux-arm installs are allowed (`pnpm-workspace.yaml`) but only Windows x64 was exercised in this handoff.

## Deferred work

[POST_MVP_DEFERRED_SCOPE](POST_MVP_DEFERRED_SCOPE.md). Design follow-ups proposed by reviewers and deliberately not done (founder decision or post-MVP): product ambient imagery, richer empty states, custom select menus, a visual Blueprint graph, collapsing the rail further on decision pages.

## Handoff readiness

The repository alone (plus separately supplied external credentials for PILOT) is sufficient to install, run the DEMO, test and continue development. Next task: founder visual review, then the live pilot checklist.

## Rehearsal record

**Method.** `git clone --branch handoff/phase10b-final-2026-09-25 https://github.com/Vik-Avila/brandopolis.git` from GitHub into a new empty directory (`C:\Users\HP\bp-rehearsal-10b`, removed afterwards); no reuse of `node_modules`, `.local`, sessions, databases or generated artifacts; only the repository docs were followed. The founder's DEMO occupied the default ports (3000/55432), so the documented isolated profile (3001/55434) was used; for `test:pilot:e2e` the clone's default connection file pointed at its own isolated cluster (on a fresh machine `competition:start` creates the default cluster).

**Commands.** `pnpm install --frozen-lockfile` · `python -m venv .venv` · `.venv/Scripts/python.exe -m pip install -r requirements-foundation.txt` · Foundation / UI / Brand validators · `pnpm competition:start --isolated` · `pnpm competition:check --isolated` · `pnpm typecheck` · `pnpm lint` · `pnpm test` · `node --test tests/demo-encoding.node.mjs` · `pnpm test:e2e` (×5) · `pnpm test:visual` · Phase10A evidence · `pnpm test:pilot:e2e` · `pnpm competition:test-boot`.

**Results (final code `770458f`).**

| Step | Result |
|---|---|
| Clone / install | PASS (pnpm 12.4.2, fresh `node_modules`) |
| Foundation / UI validator / Brand Master validator | PASS / PASS (after fix 1) / PASS |
| `competition:start --isolated` | Fresh PostgreSQL 17 cluster, 9 migrations, DEMO session and seeded brand |
| `competition:check --isolated` | PASS (runtime, DB + 9 migrations, session, server) |
| typecheck / lint | PASS / PASS |
| Vitest | 63/63; encoding node test 1/1 |
| `test:e2e` | 25/25 in 3 consecutive runs after fix 2 |
| `test:visual` | 10 passed, 1 skipped (historic backup precondition) |
| Phase10A evidence | 2/2 |
| `test:pilot:e2e` | 10/10 |
| `competition:test-boot` | 1/1 |
| Working tree after all suites | Clean (0 changes) |

**Browser (real Chrome, 1440×900 and 390×844).** Public gateway loads with 0 broken images and no overflow; token login works; the four strategic questions render exactly «¿Quién debe ser nuestro cliente prioritario?», «¿Cómo creamos y capturamos valor para ese cliente?», «¿Qué posición estratégica queremos ocupar frente a las alternativas?» and «¿Qué idea principal queremos que comprenda y recuerde el cliente?»; 0 mojibake sequences; 0 console errors. The core Decision flow (prepare, approve, change Customer, Needs Review, impact, Guided Review, history, context, learning, practice, Blueprint) is exercised by the E2E suite.

**Found and fixed by the rehearsal.**
1. With `core.autocrlf=true` (Git for Windows default), four hashed UI kit text files were checked out as CRLF and the UI validator failed → pinned `-text` in `.gitattributes`.
2. The human decision field and the Options «human choice» group shared the accessible name «Tu decisión» → intermittent E2E failure → the group is now «Decisión humana».
3. Windows notes added to the start-here doc: clone into a short path (MAX_PATH) or enable `core.longpaths`; `corepack enable` needs an elevated terminal (`npm install -g pnpm@12.4.2` otherwise); the Pilot browser suite needs the default local cluster.
