---
name: brandopolis-security
description: "Procedure for Brandopolis security-sensitive changes: OIDC login, sessions and cookies, participant intake gate, /admin authorization, tenant isolation, new or changed HTTP endpoints, CSP, Host/Origin checks, secrets, logs, data export or deletion. Use it whenever a task mentions auth, login, sesión, admin, permisos, tenant, workspace isolation, token, secreto or privacidad, even if the change is small. It complements the built-in /security-review instead of replacing it."
---

# Brandopolis · security

Security and tenant isolation are allowed reasons to touch the frozen PILOT only when they fix a defect found by regression or external testing ([CLAUDE.md § Pilot freeze](../../../CLAUDE.md#pilot-freeze)).

## Read first

- [authorization](../../../docs/12-security/authorization.md) (canonical matrix), [security checklist](../../../docs/12-security/security-checklist.md), [threat model](../../../docs/12-security/threat-model.md), [AI threat model](../../../docs/12-security/ai-threat-model.md), [data classification](../../../docs/12-security/data-classification.md), [privacy model](../../../docs/12-security/privacy-model.md).
- Auth/admin contracts: [CURRENT_IMPLEMENTATION_STATE §4–§5.bis](../../../docs/15-handoff/CURRENT_IMPLEMENTATION_STATE_2026-09-28.md), [GOOGLE_AUTH_PRODUCTION](../../../docs/15-handoff/GOOGLE_AUTH_PRODUCTION.md), [PILOT_DEPLOYMENT_CONTRACT](../../../docs/15-handoff/PILOT_DEPLOYMENT_CONTRACT.md), [ADR-0013](../../../docs/14-decisions/ADR-0013.md).
- Invariants: INV-004 (tenancy), INV-001/INV-006 (no AI or chat writes), INV-009 (409 on stale client), INV-010 (auditable, idempotent commits), ENG-011 (Capability Context belongs to the User). Table: [invariants](../../../docs/04-domain-model/invariants.md).

## Code map

`src/transport/http.ts` (CSP, Host/Origin, cookies, static allowlist, intake gate), `src/transport/pilot-auth.ts` (OIDC boundary), `src/application/pilot-access.ts` (identity, sessions, access status), `src/application/pilot-admin.ts` (operator surface), engine guards in `src/application/engine.ts`.

## Procedure

1. Name the asset and the data class before editing.
2. Authorize every operation where it runs: session, active membership, Brand under Workspace, actor scope, expected active version. An id or URL never grants access.
3. Admin: each endpoint checks authorization itself, rejections stay indistinguishable, no strategic content or secrets leave the admin layer, metrics reuse the canonical definitions in `pilot-access.ts`.
4. Identity is the `(issuer, subject)` pair, never email. Keep sign-in fail-closed unless the deployment explicitly enables auto-provisioning.
5. Logs carry IDs and categories only. Secrets stay server-side and come from the host secret manager.
6. Add or extend tests in `tests/admin.test.ts`, `tests/pilot-cases.ts` or `tests/m1.test.ts` that fail if the control regresses.
7. Run `/security-review` on the diff as a complement; triage its findings here.

## Escalate to a human

Admin allowlists, identity provider choice, auto-provisioning or access-status policy, retention, export and deletion policy, any relaxation of a fail-closed rule, any production or secret-manager action.

## Never

Read `.env` files, tokens or `.local/` secrets into the conversation; commit credentials; weaken or skip a tenancy, auth or concurrency test; deploy or touch production from a local task; add a password store, SMTP or recovery flow without its own design (deferred, see CURRENT_IMPLEMENTATION_STATE §11).

## Checks

Run the brandopolis-review matrix; auth and admin paths add `pnpm test:pilot:e2e`.
