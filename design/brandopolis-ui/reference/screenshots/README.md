Status: CANONICAL
Owner: Brandopolis
Canonical: YES
Last Reviewed: 2026-09-25
Related: design/brandopolis-ui/FINAL_VISUAL_GAP_AUDIT.md, tests/visual/canonical.spec.ts
Depends On: Final visual package 2026-09-25

---
# Canonical Browser Screenshots

Since 2026-09-25 these are captures of the **real integrated application** (not the static prototype), taken in real Chromium against the DEMO server (`pnpm dev`) with state created through the real API (Customer → Positioning → Customer change → Needs Review). Reduced motion is enabled so the Flow section shows its poster. They are regenerated only on purpose:

```
UPDATE_CANONICAL_SCREENSHOTS=1 pnpm test:visual
pnpm exec tsx scripts/refresh-brand-asset-hashes.ts
```

A normal `pnpm test:visual` writes to `test-results/visual/` and leaves this folder untouched.

## Viewports
- Desktop captures: 1440 × 900 (full page)
- Mobile captures: 390 × 844 (full page; sticky header can appear mid-page in full-page captures)
- Integrity checks (overflow, images, console, contrast): 1600 × 1000, 1440 × 900, 1280 × 800, 768 × 1024, 390 × 844

## Public
- `public-gateway-desktop.png`, `public-gateway-mobile.png`
- `login-desktop.png`, `login-mobile.png`
- `request-access-desktop.png`, `request-access-mobile.png`

## Product (M1 and journey)
- `m1-workspace-desktop.png`, `m1-workspace-mobile.png` — «Tu estrategia hoy»
- `decision-card-desktop.png` — Cliente principal
- `m1-needs-review-desktop.png`, `m1-needs-review-mobile.png` — Posicionamiento with Change Impact
- `m1-guided-review-desktop.png`, `m1-guided-review-mobile.png` — human review form
- `history-desktop.png`, `history-mobile.png` — version timeline
- `blueprint-desktop.png`, `blueprint-mobile.png`

These screenshots define presentation only. Domain behavior remains owned by the Engineering Repository.
