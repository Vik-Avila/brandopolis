Status: owner decision APPROVED 2026-10-14; numbered ADR pending actual local inventory
Owner: Product / Engineering / Security
Related: ADR-0025/0026/0027; ADR-0030–0036; product-principles; existing INV-006
Applies to: Phase 4 and UX defaults in 5–6
Do not assign a numeric ADR until the newer local HEAD is reconciled.

# Owner architectural decision · Brando-first progressive workspace

## Context

Older canonical UX says "sin chat dominante"; the 2026-10-12 R12C design direction says Brando is a discreet helper and the workspace dominates. On 2026-10-14, after reviewing nine product screens, the owner explicitly directed a deeper simplification: Brando as the **main entry experience**, while keeping all useful features, professional access and decision safeguards. This is a later explicit product decision; it does not erase historical rationale nor remove core strategic contracts.

## Decision

Adopt **chat-first experience and decision-first engine**. The home entry is focused on user intention and Brando; specialized workspaces remain first-class, accessible directly and contextually. Nine strategic dimensions remain in structured domain but are not a forced visual path. Promote context reuse, concise progressive questions and short reviewable proposals.

Required invariants:
1. Brando cannot commit strategy, approve versions or publish/spend/send implicitly.
2. Context assembler enforces Brand/Workspace/User capabilities, least privilege, consent and prompt minimization.
3. Every suggestion cites available approved facts where applicable and labels hypotheses, missing data, provider mode and uncertainties.
4. Source of truth remains structured domain; conversation state is never authoritative strategy.
5. Existing concurrency, idempotency, audit and downstream review are unchanged.
6. Advanced manual navigation and editors remain complete; no feature hidden exclusively in chat.
7. Explicit remote-operation consent is action- and version-specific; revocation effective.
8. No auto AI call merely on opening a screen; budgets/quotas/latency/timeout and fallback mandated.
9. New UI must be keyboard- and mobile-accessible and pass affected regressions.
10. Production/PILOT freeze remains unchanged; local experiment and real inference are distinct from deployment.

## Consequences

- Replace old entry/navigation-only UX assumptions after careful reconciliation; do not change previously approved business-domain semantics.
- Prefer intent routing and view adapters reusing existing APIs rather than duplicating state.
- Centralize human proposal review through existing commit/review flows.
- Avoid two competing Brando instances (header/sidebar); present a single conversational surface with on-demand contextual tool access.
- Label both provider-based real inference and other providers' simulators distinctly in local DEMO.
- Track transition in acceptance matrix, ADR number allocation, tests, changelog and SESSION_STATE after merge.
- No blanket permission for live platform API/OAuth, campaigns, publication, spend or production.

## Status/merge instructions

This decision is explicit and approved by the owner as **product direction**; design and implementation are not accepted. Source branch carries documentation only. Reconcile newer local F4 code and ADR inventory before integrating this file or changing legacy canonical pages; record exact superseded sections and replacement wording. 
