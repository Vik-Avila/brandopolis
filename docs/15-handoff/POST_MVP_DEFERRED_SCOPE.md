Status: derived
Owner: Product / Engineering
Canonical: no
Last reviewed: 2026-09-25
Related: docs/15-handoff/MVP_PHASES_1_TO_9_CLOSURE.md
Depends on: MVP phases 1–9 closure 2026-09-25

# Post-MVP deferred scope register

Work below is **not** required to start Phase 10 (real testers). Listing it here closes the question for phases 1–9; reopening any item needs a new, explicit decision.

| Area | Deferred item | Why it does not block the pilot |
|---|---|---|
| Learning | Automatic learning synthesis; hypothesis status updated from accepted learnings; external/generalized signal ingestion; cross-brand learning; experiment analytics | Experiment → Signal → Learning works with human review; the team learns via telemetry and feedback. |
| Capabilities | Advanced capability model, scoring or certification | Strategic Practice records behavior without score (intentional). |
| Blueprint | Deeper Blueprint (narrative synthesis, export, sharing, visual graph) | Current Blueprint is derived from persistent state and shows strategic coherence. |
| Evidence | Rich evidence ingestion (documents, URLs, research provider), live research | Evidence is captured by people with provenance and limitations; no unsupported evidence is invented. |
| AI | Multi-provider support, evaluation beyond deterministic checks, cost reporting in currency, refusal fallbacks | One provider behind a neutral gateway, caps, notice and safe failure. |
| Idempotency | Universal idempotency for non-strategic creates (context, experiment, signal, learning, brand) | Strategic Decision commits are idempotent; duplicates of other creates are visible and harmless. |
| Auth | Production account recovery, MFA inside Brandopolis, SSO/SCIM, self-service sign-up | OIDC provider handles credentials and recovery; testers are provisioned by the operator. |
| Scale | Distributed rate limiting, horizontal scaling | PILOT runs one instance, enforced by an advisory lock. |
| Security | Enterprise hardening, external pentest, certification | Launch review has no open blocker. |
| Operations | Hosted `pg_dump`/`pg_restore` rehearsal on the chosen host | Must be rehearsed once at deployment (external step); local recovery is tested. |
| Product surfaces | Search, notifications, profile menu, «Nueva decisión» beyond the four canonical questions, landing pages «Producto / Para quién / Recursos», decision tabs | Visual mockup elements without an approved MVP capability. |
| Collaboration | Real-time collaboration, comments, team analytics, exports, public API | Not part of MVP scope. |
| Commercial | Billing, subscriptions, CRM | Not needed for testers. |
| Quality | Formal WCAG audit, browsers beyond Chrome | Keyboard, focus, contrast and reduced motion verified by automated checks. |
