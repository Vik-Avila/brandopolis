# Brandopolis · definitive visual asset kit

Public domain: **brandopolis.ai**. Intended Pilot: **https://pilot.brandopolis.ai**.
The supplied seven-screen mockup is the visual North Star. This ZIP enriches the approved earlier kit without redefining the product or its logo.

## Quick integration map

- Landing: `02_public_landing/hero-a_signature@desktop-xl.webp`. Alternative B conveys connected strategic structure; C conveys evolution. Use the `@mobile` compositions in `05_product_mobile/` on phones.
- Login / first brand: `04_product_desktop/request-access-panel.webp`, `onboarding-first-brand.webp`; intentional portrait equivalents in `05_product_mobile/login-brand@mobile.webp` and `first-brand-onboarding@mobile.webp`.
- Workspace: `04_product_desktop/workspace-strategic-depth.webp` as outer atmosphere.
- Decision: `decision-card-ambient.webp` and `ai-recommendation-ambient.webp` outside dense text.
- Change Impact and Guided Review: `change-impact-evolution-depth.webp`, `guided-review-ambient.webp`; History: `decision-history-ambient.webp`; Context / Blueprint: `brand-context-system-depth.webp`, `blueprint-system-depth.webp`.
- Social: `08_social_support/master-open-graph.webp` and the request-access, Pilot and product cards.
- Motion: four loops in `09_motion/`, each as silent WebM, MP4 and still WebP poster. `11_manifest/motion-poster-map.json` lists exact mappings; show the poster for `prefers-reduced-motion: reduce` and failed video loads.

## Boundaries

Raster assets give atmospheric identity. Actual navigation, cards, statuses, timelines, forms, text, buttons and decisions remain real HTML/CSS and application data. Strategic Glassmorphism is implemented primarily with existing semantic tokens, CSS `backdrop-filter`, borders, shadows and accessible fallbacks. Use the original approved SVG artwork in `01_brand_core/originals/` for navigation. The premium B visible in scenes was composited from the approved original, not regenerated. Do not create new visual directions without design review.

All still runtime visuals are WebP. `12_canonical_reference/` holds the source mockup and official identity artworks; its assembled brand board uses these unmodified sources. Six preview boards aid review and are not runtime assets. The JSON and Markdown manifests provide dimensions, bytes, SHA-256, alpha, breakpoint, text-safe zone and poster mappings. XL image sizes are resampled from smaller generated masters, so review them at intended browser scale.

The file `03_public_sections/connected-decisions-system.webp` was identical to `02_public_landing/hero-b_system@desktop.webp` and removed; reuse the retained file when that section needs the same visual.
