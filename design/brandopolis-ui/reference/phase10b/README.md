# Phase 10B · final evidence (curated)

Real Chromium captures of the final handoff build (`handoff/phase10b-final-2026-09-25`), DEMO data created through the real API by `tests/visual/phase10a.spec.ts`. Desktop 1440×900, mobile 390×844 (touch), full page, reduced motion. The left navigation and ambient background are `position: fixed`, so in full-page captures they end at the first viewport height — a capture artifact, not a layout defect.

| File | Shows |
|---|---|
| `public-desktop.png`, `public-mobile.png` | Public gateway |
| `workspace-desktop.png`, `workspace-mobile.png` | «Tu estrategia hoy»: attention, connected structure, learning |
| `primary-customer-desktop.png` | Strategic Decision with human decision first, tabs, directional connections |
| `needs-review-desktop.png` | Decision under review («· en revisión»), rail marking the Decision in view |
| `impact-desktop.png`, `impact-mobile.png` | Change Impact: changed → relationship → affected |
| `guided-review-desktop.png`, `guided-review-mobile.png` | Guided Review: what changed, explicit choice, human confirmation |
| `history-desktop.png` | Strategic evolution |
| `options-generated-desktop.png` | DEMO proposal (dashed) vs the human choice (solid) |
| `context-desktop.png`, `blueprint-desktop.png` | Brand Context and Blueprint from persisted state |

Regenerate (writes to `test-results/` unless `EVIDENCE_DIR` is set): `pnpm exec playwright test --config playwright.phase10a.config.ts`. These images are evidence for review; they are not founder visual acceptance.
