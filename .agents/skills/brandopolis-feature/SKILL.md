---
name: brandopolis-feature
description: "Procedural entry point for changes to Brandopolis behaviour or contracts: features, fixes and regressions in the domain, engine, config, schemas or persistence (it holds the database gate). Use it when someone says implementa, corrige, añade or cambia el flujo, even if the change looks small. It is not the specialist: also load brandopolis-ui for presentation (CSS, layout, keyboard focus, visible copy, what a screen shows), brandopolis-brando for AI proposals, prompts or the Model Gateway, and brandopolis-security for auth, sessions, cookies, permissions, admin or any new or changed endpoint. It checks the PILOT freeze and always ends in brandopolis-review."
---

# Brandopolis · feature entry point

This skill is procedure only. The rules live in the canonical sources linked below; cite them by ID or section, never restate them.

## 1. Freeze and scope gate (always first)

1. Read [CLAUDE.md § Pilot freeze](../../../CLAUDE.md#pilot-freeze) and the current state in [CURRENT_IMPLEMENTATION_STATE](../../../docs/15-handoff/CURRENT_IMPLEMENTATION_STATE_2026-09-28.md) and [SESSION_STATE](../../../SESSION_STATE.md).
2. Classify the request: (a) defect found by regression or external testing, (b) documentation, tooling, skills or validators with no runtime effect, or (c) anything else.
3. (c) is not code work: record it for the backlog, tell the human, stop.
4. Check [POST_MVP_DEFERRED_SCOPE](../../../docs/15-handoff/POST_MVP_DEFERRED_SCOPE.md) and [scope-mvp](../../../docs/01-product/scope-mvp.md). Deferred or P1/P2 items need an explicit human decision.

## 2. Find the canonical source

Precedence: [source-of-truth](../../../docs/00-index/source-of-truth.md). Then, as relevant:

- product: [Product Bible](../../../docs/01-product/product-bible-v1.md), [principles](../../../docs/01-product/product-principles.md)
- domain: [invariants](../../../docs/04-domain-model/invariants.md) (INV-001..010, ENG-011..013), [state machines](../../../docs/04-domain-model/state-machines.md), [change impact](../../../docs/04-domain-model/change-impact.md)
- decisions: [ADR index](../../../docs/14-decisions/README.md)

If the request truly contradicts an approved source, stop and ask (AGENTS.md rule 7). Never resolve it by preference.

## 3. Route

| The change touches | Also load |
|---|---|
| `src/transport/public/`, CSS, copy, brand assets | brandopolis-ui |
| AI proposals, prompts, gateway, Brando | brandopolis-brando |
| auth, sessions, admin, tenancy, endpoints, secrets, logs | brandopolis-security |
| schema, migrations, SQL guards | section 5 below |

## 4. Implement

- Layers: domain in `src/domain/` (no I/O, no provider SDK), use cases in `src/application/engine.ts`, transport in `src/transport/`. Map in [NEXT_DEVELOPER_START_HERE](../../../docs/15-handoff/NEXT_DEVELOPER_START_HERE.md).
- Human Authority (INV-001, INV-002, INV-006), tenancy (INV-004), concurrency (INV-009) and idempotency (INV-010) are enforced in the engine and DB guards. Keep them there.
- Contract change: canonical docs + schema/config + test + ADR when architecture changes + CHANGELOG + SESSION_STATE (AGENTS.md rule 6). Run Foundation before and after.
- No new framework, dependency or infrastructure without an ADR. The domain never imports an AI SDK.

## 5. Database gate (internal)

Any edit to `src/persistence/schema.ts`, `drizzle/` or versioned SQL guards:

1. During the PILOT freeze migrations and product schema changes are **not authorized**. Stop and ask.
2. If authorized: change `schema.ts`, then `pnpm db:generate`; custom guards in versioned SQL. Forward-only.
3. Never edit an applied migration (hash-checked; `.gitattributes` pins `drizzle/**` to LF). Never `drizzle-kit push`.
4. Prefer adding tables over widening tables shared with the running PILOT build (see SESSION_STATE).
5. Never run `pnpm pilot:migrate` or any production migration from a local task.
6. Prove INV-008, INV-009 and INV-010 still hold on a fresh database.

## Escalate to a human

Anything outside the freeze categories; contradictions between sources; deferred scope; new dependencies; any migration; anything touching production.

## Never

Add P1/P2 features, chat that writes strategy, graph engines or integrations on your own initiative; weaken or skip a test to pass; edit applied migrations; commit, push or deploy without being asked.

## Checks

Finish with brandopolis-review: it owns the single path → checks matrix and the closing gate.
