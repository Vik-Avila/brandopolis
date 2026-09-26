Status: CANONICAL
Owner: Brandopolis
Canonical: YES
Last Reviewed: 2026-09-25
Related: design/brandopolis-ui/brand-master/final-canonical-2026-09-25/FRONTEND_BRAND_INTEGRATION.md, design/brandopolis-ui/assets/final-visual-package-2026-09-25/INTEGRATION_NOTE.md, src/transport/assets.ts
Depends On: Brand Master final-canonical-2026-09-25; Final visual package 2026-09-25

---
# Frontend runtime asset mapping

Only the files below are served; the server uses an exact allowlist (`src/transport/assets.ts`) with no directory fallback. Design sources (Brand Master masters, 4096 premium renders, QA and preview boards, the canonical mockup, manifests) stay under `design/` and are never public — enforced by `tests/brand-runtime.test.ts`.

## Identity — Brand Master (byte-identical runtime copies)

`tests/brand-runtime.test.ts` fails if any served identity file differs by one byte from its Brand Master source. `.gitattributes` keeps the Brand Master and `public/brand/**` free of line-ending conversion.

| Runtime route | Runtime file | Brand Master source | Surface | Notes |
|---|---|---|---|---|
| `/brand/logo.svg` | `public/brand/logo/brandopolis-logo-horizontal.svg` | `01_master/brandopolis-logo-horizontal-master.svg` | Reserved flat variant; not used in prominent headers | Canonical vector retained |
| `/brand/symbol.svg` | `public/brand/symbols/brandopolis-symbol.svg` | `01_master/brandopolis-symbol-master.svg` (= `02_runtime/symbol/brandopolis-symbol-flat-color.svg`) | Mobile header (< 768 px, `<picture>` source), footer mark | Vector |
| `/favicon.ico` | `public/brand/ui/favicon.ico` | `02_runtime/favicon/favicon.ico` (16–256) | Browser tab | cached 1 day |
| `/brand/favicon-32.png` | `public/brand/ui/favicon-32.png` | `02_runtime/favicon/favicon-32.png` | `<link rel=icon sizes=32x32>` | |
| `/brand/apple-touch-icon.png` | `public/brand/ui/apple-touch-icon.png` | `02_runtime/app-icons/app-icon-180.png` | Apple touch (180) | |
| `/site.webmanifest` | `public/brand/ui/site.webmanifest` | `02_runtime/manifest/site.webmanifest` (unmodified) | PWA | theme `#073D2D`, background `#F7F3EA` |
| `/brand/app-icon-192.png`, `/brand/app-icon-512.png` | `public/brand/ui/app-icon-{192,512}.png` | `02_runtime/app-icons/app-icon-{192,512}.png` | PWA icons (paths exactly as the canonical manifest requires) | |

Removed from runtime (deprecated per `BRAND_ASSET_REPLACEMENT_MAP.json`, still in Git history and design reference folders): polygonal symbol PNGs (black, emerald, flat, gold, white), legacy `ui/icon-*` set, legacy `flow/*` images and the unused `/brand/flow.webp` route. The previous logo, symbol, favicon, apple-touch, app icons and manifest files at the same paths were replaced by canonical bytes.

## Premium horizontal identity

The prominent desktop/tablet header and access views use `/brand/logo-premium.webp`, derived from the approved premium horizontal PNG without redrawing. Runtime file: `public/brand/logo/brandopolis-logo-premium-660.webp`, 660×151, 17,790 bytes. Header width 220 CSS px; access width 240 CSS px. Mobile compact header retains the approved flat symbol.

Source SHA-256: `28877e609f4e051ed4eff4906a81170b02d17cbe769efdd093d9fa5d227150ad`.
Derivative SHA-256: `0dbb6a7aac540e40ee96137bdeee13d180cde98d779cba5f1a6fccf5438653a6`.
`tests/brand-runtime.test.ts` verifies both hashes and prominent HTML usages. The immutable Brand Master files remain unchanged.

## Code assets

Served in this order from `index.html` (no `@import`, no bundler): `/tokens.css`, `/base.css`, `/public.css`, `/product-shell.css`, `/product-decision.css`, `/product-context.css`, `/product-views.css`, `/product-responsive.css`; scripts `/app.js` (module) with `modulepreload` of `/product-views.js` and `/product-interactions.js`. Responsibilities: [PRODUCT_DESIGN_SYSTEM.md](PRODUCT_DESIGN_SYSTEM.md).

## Atmosphere and motion — final visual package

| Runtime path | Source (package) | Surface | Breakpoint | Loading | Reduced motion / fallback | Why |
|---|---|---|---|---|---|---|
| `/brand/web/hero-signature-desktop.webp` | `02_public_landing/hero-a_signature@desktop.webp` | Gateway hero | ≥ 1280 px | `<picture>`, preload with matching media, `fetchpriority=high` (LCP) | Still | Canonical hero A (approved premium Ribbon B) |
| `/brand/web/hero-signature-tablet.webp` | `02_public_landing/hero-a_signature@tablet.webp` | Gateway hero | 768–1279 px | same | Still | Same composition, tablet crop |
| `/brand/web/hero-signature-mobile.webp` | `05_product_mobile/hero-a_signature@mobile.webp` | Gateway hero | < 768 px | same | Still | Portrait composition |
| `/brand/web/flow-loop.webm` / `.mp4` | `09_motion/brandopolis-flow.*` | «Cómo funciona» | all | `preload=none`; plays only while visible; user pause button | Paused (poster) with `prefers-reduced-motion: reduce`, on failure or when paused | Brandopolis Flow = connected structure; the only motion on the site |
| `/brand/web/flow-loop-poster.webp` | `09_motion/brandopolis-flow-poster.webp` | same | all | `poster` + CSS background (one download) | — | Mapping from `11_manifest/motion-poster-map.json` |
| `/brand/web/access-panel.webp` | `04_product_desktop/request-access-panel.webp` | Login, request access | ≥ 1280 px | CSS background (not fetched when hidden) | — | Moderate intensity for access |
| `/brand/web/workspace-atmosphere-desktop.webp` | `04_product_desktop/workspace-strategic-depth.webp` | Signed-in shell | ≥ 768 px | CSS background only with `body.app` | — | Subtle shell atmosphere |
| `/brand/web/workspace-atmosphere-mobile.webp` | `05_product_mobile/workspace-system@mobile.webp` | Signed-in shell | < 768 px | CSS background (`product-responsive.css`, phone block) | — | Used since Phase 10B (previously mapped but not referenced) |
| `/brand/web/og.webp` | `08_social_support/master-open-graph.webp` (1200×630) | Open Graph `https://brandopolis.ai/brand/web/og.webp` | — | Not loaded by the page | — | Approved social asset showing the premium Ribbon B; the Brand Master has no 1200×630 asset |

Caching: identity and brand media `public, max-age=86400`, `Content-Length`, `Accept-Ranges: bytes` and single-range `206` responses (Safari/iOS video); `index.html` `no-store`; scripts and styles `no-cache` with a strong ETag (304 revalidation). Files are read once per process.

## Deliberately not used at runtime

Full-resolution premium Brand Master renders (the horizontal source has the optimized derivative documented above), mono and micro variants (not needed on current surfaces), hero variants B/C and XL, `glass-ambient-hero`, `champagne-light-sweep` and `strategic-pulse` motion (one motion only; product stays calm), other product ambients (dense decision content stays near-solid), `06_glassmorphism_overlays` (glass is CSS), social cards other than OG, preview and QA boards, manifests, canonical reference images and archives.
