---
name: brandopolis-review
description: "Brandopolis gate before any commit, handoff or release step, and the procedure for independent review of another agent's work (Codex or Claude). Owns the single matrix of required checks by touched path (typecheck, lint, test, e2e, visual, pilot e2e, Foundation, validators) and the closing gate for commit, push, tag, merge and deploy. Use it whenever a task says revisa, review, listo para commit, cierra, prepara release, push, tag or merge, and at the end of every brandopolis-feature, ui, brando or security task."
---

# Brandopolis · review and closing gate

Evidence before claims: report real command output, never a remembered or expected result. Generic bug hunting belongs to `/code-review` (and `/security-review` for security paths); this skill adds the Brandopolis-specific gates.

## Read first

[AGENTS.md](../../../AGENTS.md) rules 5–7, [CLAUDE.md](../../../CLAUDE.md) «Required before any commit touching behaviour», [invariants](../../../docs/04-domain-model/invariants.md), [CLAUDE_START_HERE](../../../handoff/CLAUDE_START_HERE.md) (independent review role), [CLAUDE.md § Pilot freeze](../../../CLAUDE.md#pilot-freeze).

## Procedure

1. Pin the exact SHA (`git rev-parse HEAD`) and branch; never review a moving target.
2. Read the whole diff (`git diff --stat`, then per file). Classify each path with the matrix below.
3. Gate the diff: inside the freeze? inside the requested scope? any contract change without docs, schema/config, test, ADR, CHANGELOG and SESSION_STATE?
4. Confirm the invariant suites stay green and meaningful: INV-001..010, tenancy, concurrency 409, idempotency, old versions readable, HARD → review, no automatic cascade. A test changed to pass is a finding.
5. Run every required check. Report each finding with path, reproducible condition, severity and the test that would catch it.

## Single check matrix

Commands are package scripts (`corepack pnpm <script>` if `pnpm` is not on PATH). Foundation and validators use the repo venv: `.venv/Scripts/python.exe` on Windows.

| Touched paths | Required checks (cumulative) |
|---|---|
| anything | `git diff --check` |
| `src/**`, `scripts/**`, `tests/**`, root `*.ts`/`*.js` config, `package.json` | `pnpm typecheck`, `pnpm lint`, `pnpm test` |
| `src/transport/public/**` | + `pnpm test:e2e`, `pnpm test:visual`, `design/brandopolis-ui/validation/validate.py --integrated` |
| `public/brand/**`, `design/brandopolis-ui/**` | + `pnpm test`, the UI validator and `validate_brand.py` in the Brand Master folder |
| `src/transport/pilot-auth.ts`, `src/transport/http.ts`, `src/application/pilot-*.ts`, `scripts/pilot-*` | + `pnpm test:pilot:e2e` |
| `src/persistence/**`, `drizzle/**` | gate of brandopolis-feature §5 first, then `pnpm test` and `pnpm test:pilot:e2e` |
| `schemas/**`, `config/**`, `evals/**`, `prompts/**`, `telemetry/**`, any `*.md` | + `scripts/foundation_check.py` |
| `.agents/skills/**`, `.claude/skills/**` | + `pnpm skills:sync`, `pnpm skills:check`, `pnpm test`, Foundation |

Browser suites need `pnpm competition:start` running (see [NEXT_DEVELOPER_START_HERE](../../../docs/15-handoff/NEXT_DEVELOPER_START_HERE.md)). A check that cannot run is reported as not run, with the reason, never as passed.

## Closing and release gate

- Update [SESSION_STATE](../../../SESSION_STATE.md) and [CHANGELOG](../../../CHANGELOG.md) with the real results; append, never rewrite history.
- Never stage `.local/`, `.env*`, tokens, `.venv/` or screenshots outside the curated reference folders. Stage files by name.
- Commit only when the human asks. Push, tag, merge to `main` and deploy each need their own explicit human authorization.
- Commit and push are not deployment. Production migrations, DNS, hosting and secret-manager changes are human operations ([LIVE_PILOT_LAUNCH_CHECKLIST](../../../docs/15-handoff/LIVE_PILOT_LAUNCH_CHECKLIST.md), [PILOT_RUNBOOK](../../../docs/15-handoff/PILOT_RUNBOOK.md)).

## Escalate to a human

A failing invariant suite, a contradiction between sources, a diff outside the requested scope or the freeze, any release step.

## Never

Weaken, skip or delete a test to make it pass; claim a check passed without running it; claim to have checked the independent Final Contract Patch (it was never received).
