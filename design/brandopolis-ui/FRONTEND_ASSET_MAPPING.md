Status: CANONICAL
Owner: Brandopolis
Canonical: YES
Last Reviewed: 2026-09-25
Related: design/brandopolis-ui/assets/final-visual-package-2026-09-25/INTEGRATION_NOTE.md, src/transport/assets.ts
Depends On: Final visual package 2026-09-25

---
# Frontend runtime asset mapping

Only the files below are served. The complete package stays in `design/brandopolis-ui/assets/final-visual-package-2026-09-25/` and is never public. The served list is enforced by `src/transport/assets.ts` (allowlist); hashes are in `design/brandopolis-ui/specs/brand-assets.json`. Runtime weight of new media: 0.87 MB total, loaded per surface as below.

| Runtime path | Source (package) | Surface | Breakpoint | Loading | Poster / reduced motion |
|---|---|---|---|---|---|
| `/brand/web/hero-signature-desktop.webp` | `02_public_landing/hero-a_signature@desktop.webp` | Gateway hero | ≥ 1280 px | `<picture>`, eager, `fetchpriority=high`, preloaded ≥ 1024 px (LCP) | Still image |
| `/brand/web/hero-signature-tablet.webp` | `02_public_landing/hero-a_signature@tablet.webp` | Gateway hero | 768–1279 px | `<picture>` source | Still image |
| `/brand/web/hero-signature-mobile.webp` | `05_product_mobile/hero-a_signature@mobile.webp` | Gateway hero | < 768 px | `<picture>` source | Still image |
| `/brand/web/flow-loop.webm` | `09_motion/brandopolis-flow.webm` | Gateway «Cómo funciona» | all | `preload=none`; plays only while visible and when motion is allowed | Poster below; paused with `prefers-reduced-motion: reduce` |
| `/brand/web/flow-loop.mp4` | `09_motion/brandopolis-flow.mp4` | same | all | fallback source | same |
| `/brand/web/flow-loop-poster.webp` | `09_motion/brandopolis-flow-poster.webp` | same | all | `poster` + CSS background | Mapping from `11_manifest/motion-poster-map.json` |
| `/brand/web/access-panel.webp` | `04_product_desktop/request-access-panel.webp` | Login and request access | ≥ 1280 px | CSS background (not downloaded when hidden) | — |
| `/brand/web/workspace-atmosphere-desktop.webp` | `04_product_desktop/workspace-strategic-depth.webp` | Signed-in shell atmosphere | ≥ 768 px | CSS background, only with `body.app` | — |
| `/brand/web/workspace-atmosphere-mobile.webp` | `05_product_mobile/workspace-system@mobile.webp` | Signed-in shell atmosphere | < 768 px | CSS background, only with `body.app` | — |
| `/brand/web/og.webp` | `08_social_support/master-open-graph.webp` | Open Graph (`https://brandopolis.ai/brand/web/og.webp`) | — | Not loaded by the page | — |

## Unchanged runtime brand files

- Logo and symbol: `/brand/logo.svg`, `/brand/symbol.svg` — byte-identical to `01_brand_core/originals/brandopolis-logo-horizontal.svg` and `brandopolis-symbol.svg` (verified with `cmp`). Not redrawn or regenerated.
- Favicon / PWA: existing Engineering UI Kit icons in `public/brand/ui/` remain authoritative. Now wired: `/favicon.ico`, `/brand/ui/icon-32.png`, `/brand/ui/apple-touch-icon.png`, `/site.webmanifest` → `/brand/ui/app-icon-192.png`, `/brand/ui/app-icon-512.png`. The previous manifest (and the package's `01_brand_core/originals/site.webmanifest`) referenced non-existent `/brand/app-icon-*.png`; the runtime manifest paths were corrected. The package favicon was not substituted.

## Deliberately not used at runtime

Hero variants B/C and XL renditions (no measurable benefit at served sizes), `glass-ambient-hero` motion (960×540 would be soft behind a full-bleed hero), other product ambients (decision, recommendation, history, blueprint — dense content stays solid for legibility), `06_glassmorphism_overlays` (glass is CSS), premium raster logos (vector marks preferred), social cards other than OG, preview boards, manifests, canonical reference boards and archive.
