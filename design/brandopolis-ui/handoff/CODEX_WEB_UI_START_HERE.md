Status: CANONICAL
Owner: Brandopolis
Canonical: YES
Last Reviewed: 2026-09-24
Related: Main Engineering Repository
Depends On: Engineering Foundation

---
# CODEX — WEB / PRODUCT UI INTEGRATION

## Mission
**Integrate the approved Brandopolis design system and Strategic Glassmorphism into the existing green M1 implementation.**

Do not rebuild M1. Do not replatform. Do not rewrite domain/persistence semantics.

## Mandatory reading order
1. Main repo `AGENTS.md`.
2. Main repo `SESSION_STATE.md`.
3. Existing M1 implementation docs/tests.
4. `design/brandopolis-ui/README.md`.
5. `tokens/brandopolis.tokens.json`.
6. `docs/05_DOMAIN_UI_MAPPING.md`.
7. `docs/07_STRATEGIC_GLASSMORPHISM.md`.
8. `specs/screens.json`.
9. `specs/components.json`.
10. `reference/screenshots/README.md`.

## Do not
- rebuild M1;
- migrate framework;
- rewrite backend;
- modify DB semantics/invariants;
- add domain states;
- infer `CURRENT` as a Decision status;
- introduce P1/P2 functionality;
- replace existing tests;
- weaken conflict handling, Human Authority or accessibility.

## Integration order
1. Import/copy runtime brand assets from `public/brand/` without changing application architecture.
2. Map tokens into the host styling mechanism. Semantic tokens are the contract; implementation technology is host-owned.
3. Apply shell/header/navigation surfaces.
4. Apply Decision/Review/History components without changing behavior.
5. Implement mobile navigation behavior consistent with the host app.
6. Verify against canonical screenshots at representative desktop/mobile widths.
7. Run existing M1 tests.
8. Run UI-kit validator.

## Visual principle
Public/auth may use more visible glass. Product shell uses subtle glass. Core strategic content is high-opacity and clarity-first.
