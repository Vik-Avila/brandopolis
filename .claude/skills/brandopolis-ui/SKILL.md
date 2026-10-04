---
name: brandopolis-ui
description: "Procedure for any Brandopolis presentation change under src/transport/public/: CSS, layout, responsive breakpoints, accessibility, visible Spanish copy, status badges, icons and brand assets. Use it whenever a task mentions pantalla, estilo, diseño, móvil, botón, texto visible, logo or the design system, even for a one-line CSS fix. It enforces PRODUCT_DESIGN_SYSTEM, the immutable Brand Master and the no-framework, no-bundler frontend."
---

# Brandopolis · UI

Presentation work only. Behaviour changes start in brandopolis-feature; the PILOT runtime UI is frozen ([CLAUDE.md § Pilot freeze](../../../CLAUDE.md#pilot-freeze)), so a change here needs a regression/external-testing defect or an explicit human instruction.

## Read first

- [PRODUCT_DESIGN_SYSTEM](../../../design/brandopolis-ui/PRODUCT_DESIGN_SYSTEM.md): layers, typography, colour roles, status vocabulary, actions, motion, accessibility contract. It is the rulebook; do not re-derive it.
- [FRONTEND_ASSET_MAPPING](../../../design/brandopolis-ui/FRONTEND_ASSET_MAPPING.md): the only visual-package files that may be served.
- Brand Master: [FRONTEND_BRAND_INTEGRATION](../../../design/brandopolis-ui/brand-master/final-canonical-2026-09-25/FRONTEND_BRAND_INTEGRATION.md) and [BRAND_ASSET_USAGE_MATRIX](../../../design/brandopolis-ui/brand-master/final-canonical-2026-09-25/BRAND_ASSET_USAGE_MATRIX.md).
- Frontend structure table in [NEXT_DEVELOPER_START_HERE](../../../docs/15-handoff/NEXT_DEVELOPER_START_HERE.md); [UX principles](../../../docs/07-ux/ux-principles.md).

## Procedure

1. Locate the layer before editing:
   - `product-views.js`: pure presentation projections, no requests or writes.
   - `product-interactions.js`: keyboard and focus behaviour.
   - `app.js`: operations only (API calls, view entry, event binding).
   - CSS: `base.css`, `public.css`, `product-shell.css`, `product-decision.css`, `product-context.css`, `product-views.css`, `product-responsive.css` (one block per breakpoint, widest to narrowest, then a single reduced-motion block). Tokens come from `design/brandopolis-ui/tokens/`.
2. Status words come only from `stateBadge()` in `product-views.js`. «Vigente» is a display relation over the active version, never a status. Dependency kinds are edges, not statuses.
3. Every state needs a word or marker, never colour alone. Keep focus-visible, 44px primary mobile targets and the dialog/drawer focus trap.
4. Visible copy is Spanish (es-MX). Participants are «Estratega de Marca / Estrategas de Marca», never «tester». Normal UI never says upstream/downstream.
5. A new served file must be added to the allowlist in `src/transport/assets.ts`. Nothing else under the repo is public.
6. Restart the server after editing frontend files (assets are cached per process).

## Gates

- No schema, migration or engine change for visual work.
- Brand Master files and their runtime copies in `public/brand/` are byte-locked (SHA-256, `tests/brand-runtime.test.ts`). Never redraw, trace or re-synthesize the Ribbon B or the wordmark.
- Canonical screenshots change only with `UPDATE_CANONICAL_SCREENSHOTS=1` and human approval.

## Escalate to a human

Redesigning approved UI; any runtime UI change while the PILOT is frozen; new imagery or brand usage; screenshot baseline updates.

## Never

Introduce a framework, bundler or build step; fake capabilities to match a mockup; invent status words; serve design masters; compile secrets or analytics IDs into the frontend.

## Checks

Run the brandopolis-review matrix for `src/transport/public/` (adds `pnpm test:e2e`, `pnpm test:visual` and the UI validator; brand validator when brand assets change).
