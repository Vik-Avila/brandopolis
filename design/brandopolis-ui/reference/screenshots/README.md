Status: CANONICAL
Owner: Brandopolis
Canonical: YES
Last Reviewed: 2026-10-10
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

## How differences are checked (2026-10-10)

`pnpm test:visual` **does not compare pixels**: it captures the screens and checks structure (no horizontal
overflow, images decoded, primary actions visible). Passing it never means «no differences». A real comparison is
done separately in real Chromium: both images are drawn on canvases padded with white to the larger size; a pixel
counts as changed when the sum of absolute R, G and B differences is greater than 48 (of 765); the result is the
percentage of changed pixels plus both sizes, with a red overlay of the changed pixels. Test data is fixed in
`tests/visual/canonical.spec.ts` (brand name «Marca Demo 2026»; dates shown at 2026-10-09 14:49 America/Mexico_City).

## Updates

- 2026-10-10 · human decision (owner, after visual review of
  `Brandopolis_Fase4_capturas_canonicas_comparacion_v2_2026-10-10.zip`, SHA-256
  `334d8df3366bb6389f86a18c76a5d372059ceb45caca227ca126e182db6ed98f`): seven files replaced by the exact
  `-current.png` images of that ZIP — m1-workspace-desktop, m1-workspace-mobile, blueprint-desktop,
  decision-card-desktop, history-desktop, m1-guided-review-desktop, m1-needs-review-desktop (Phase 4 seven-entry
  navigation and the «Tu prioridad» card). The other ten are unchanged. Hashes updated only for those seven in
  `specs/brand-assets.json`. The approval does not cover images regenerated after later visual changes.

These screenshots define presentation only. Domain behavior remains owned by the Engineering Repository.
