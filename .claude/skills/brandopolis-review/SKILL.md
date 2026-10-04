---
name: brandopolis-review
description: "Brandopolis gate before any commit, handoff or release step, and the procedure for independent review of another agent's work (Codex or Claude). Owns the single matrix of required checks by touched path (typecheck, lint, test, e2e, visual, pilot e2e, Foundation, validators) and the closing gate for commit, push, tag, merge and deploy. Use it whenever a task says revisa, review, listo para commit, cierra, prepara release, push, tag or merge, and at the end of every brandopolis-feature, ui, brando or security task."
---

# Brandopolis · review and closing gate

Evidence before claims: report real command output, never a remembered or expected result. Generic bug hunting belongs to the agent's built-in code review (Claude Code: `/code-review`; Codex: `/review`); this skill adds the Brandopolis-specific gates.

## Read first

[AGENTS.md](../../../AGENTS.md) rules 5–7, [CLAUDE.md § Pilot freeze](../../../CLAUDE.md#pilot-freeze), [CLAUDE.md](../../../CLAUDE.md) «Required before any commit touching behaviour», [invariants](../../../docs/04-domain-model/invariants.md). [CLAUDE_START_HERE](../../../handoff/CLAUDE_START_HERE.md) is a historical RC review brief: reuse its review method, not its RC/M1 scope limits.

## Procedure

1. Pin the exact SHA (`git rev-parse HEAD`) and branch; never review a moving target.
2. Collect everything under review; plain `git diff` sees neither commits nor untracked files, and a branch with local changes needs every scope: commits `git diff main...HEAD`, staged `git diff --cached`, unstaged `git diff`, untracked `git status --short`. Run `--check` on each scope that has changes.
3. Read the whole diff before judging it: the stat first, then every file, untracked files included.
4. Gate the diff: does it pass the [freeze gate](../../../CLAUDE.md#pilot-freeze)? inside the requested scope? any contract change without docs, schema/config, test, ADR, `CHANGELOG.md` and `SESSION_STATE.md`?
5. Confirm the invariant suites stay green and meaningful: INV-001..010, tenancy, concurrency 409, idempotency, old versions readable, HARD → review, no automatic cascade, fallbacks without research. A test changed to pass is a finding.
6. Run the baseline and every added check below. Report each finding with path, reproducible condition, severity and the test that would catch it.

## Single check matrix

**Baseline, every change** except purely historical records (new `SESSION_STATE.md`/`CHANGELOG.md` entries, dated handoff notes): `pnpm typecheck`, `pnpm lint`, `pnpm test`, plus `git diff --check` on each scope. This covers `config/`, `schemas/`, `prompts/`, `evals/`, `tsconfig.json`, `pnpm-lock.yaml`, `.gitattributes`, `.env.example` and the docs the tests read. The rows below only add checks.

| Touched paths | Added checks |
|---|---|
| `config/**`, `schemas/**`, `prompts/**`, `evals/**`, `telemetry/**`, canonical `*.md`, `scripts/foundation_check.py` | `scripts/foundation_check.py` |
| `public/brand/**`, `design/brandopolis-ui/**` | `pnpm test` is mandatory here (it holds the byte lock `tests/brand-runtime.test.ts`), `design/brandopolis-ui/validation/validate.py --integrated` and `validate_brand.py` in the Brand Master folder |
| `src/transport/public/**`, `src/transport/assets.ts`, `src/transport/analytics.ts`, `src/transport/http.ts`, `src/transport/server.ts`, `src/application/engine.ts`, `tests/browser/**`, `playwright.config.ts` | `pnpm test:e2e` |
| presentation (`src/transport/public/**`), `tests/visual/**`, `playwright.visual.config.ts` | `pnpm test:visual` and the UI validator |
| `src/transport/public/**` when the change can reach a PILOT flow (sign-in entry, intake, AI notice, feedback, logout), `src/transport/pilot-auth.ts`, `src/transport/http.ts`, `src/transport/analytics.ts`, `src/application/pilot-*.ts`, `src/application/engine.ts`, `scripts/pilot-*`, `tests/pilot-browser/**`, `tests/pilot-browser-server.ts`, `playwright.pilot.config.ts` | `pnpm test:pilot:e2e` |
| auth, sessions, admin, tenancy, permissions, sensitive or new endpoints (`src/transport/pilot-auth.ts`, `src/application/pilot-access.ts`, `src/application/pilot-admin.ts`, `src/transport/http.ts`, engine guards) | the agent's built-in security review (Claude Code: `/security-review`; Codex: `/review` with a security focus) |
| `tests/boot/**`, `playwright.boot.config.ts`, `scripts/competition-*` | `pnpm competition:test-boot` (after `pnpm competition:start --isolated`) |
| `src/persistence/**`, `drizzle/**` | gate of brandopolis-feature §5 first, then `pnpm test:pilot:e2e` |
| `.agents/skills/**`, `.claude/skills/**` | `pnpm skills:check` first (read-only); `pnpm skills:sync` only after reviewing the reported drift, then `pnpm skills:check` again and Foundation |

Browser suites `test:e2e` and `test:visual` need `pnpm competition:start` running (see [NEXT_DEVELOPER_START_HERE](../../../docs/15-handoff/NEXT_DEVELOPER_START_HERE.md)). Every browser suite needs an executable `pnpm` on PATH, because the web servers spawn `pnpm` themselves; `corepack pnpm` alone is not enough. A check that cannot run is reported as not run, with the reason, never as passed.

## Closing and release gate

- Prepend a new entry to [SESSION_STATE](../../../SESSION_STATE.md) and [CHANGELOG](../../../CHANGELOG.md) with the real results; never rewrite earlier entries.
- Never stage `.local/`, `.venv/`, tokens, real `.env` files or screenshots outside the curated reference folders; the versioned `.env.example` is fine. Stage files by name.
- Commit only when the human asks. Push, tag, merge to `main` and deploy each need their own explicit human authorization.
- Commit and push are not deployment. Production migrations, DNS, hosting and secret-manager changes are human operations ([LIVE_PILOT_LAUNCH_CHECKLIST](../../../docs/15-handoff/LIVE_PILOT_LAUNCH_CHECKLIST.md), [PILOT_RUNBOOK](../../../docs/15-handoff/PILOT_RUNBOOK.md)).

## Escalate to a human

A failing invariant suite, a contradiction between sources, a diff outside the requested scope or the freeze gate, any release step.

## Never

Weaken, skip or delete a test to make it pass; claim a check passed without running it; claim to have checked the independent Final Contract Patch (it was never received).
