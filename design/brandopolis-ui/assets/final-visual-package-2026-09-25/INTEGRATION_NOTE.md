# Brandopolis Final Visual Package — Integration Note

## Status

FINAL / APPROVED FOR FRONTEND INTEGRATION

## Canonical visual package

Path:

design/brandopolis-ui/assets/final-visual-package-2026-09-25/

## Canonical domain

- Public: https://brandopolis.ai
- Pilot: https://pilot.brandopolis.ai
- OIDC callback: https://pilot.brandopolis.ai/auth/callback

## Visual authority

The package's:

12_canonical_reference/brandopolis-canonical-product-vision-v1.png

is the visual North Star for:

- Public Gateway
- Strategic Workspace
- Decision Card
- Change Impact
- Guided Review
- Decision History
- Blueprint visual language
- desktop/mobile continuity
- Strategic Glassmorphism

The canonical mockup governs visual direction, not product scope.

Product Bible, Engineering Foundation, domain contracts, state machines,
schemas, invariants and ADRs remain authoritative for product behavior.

## Runtime integration rule

DO NOT copy this complete folder into public runtime.

Frontend engineering must select only the runtime assets actually used.

Prefer:

- original SVG logos for navigation and interface;
- responsive WEBP assets for atmospheric imagery;
- WebM as primary motion format;
- MP4 as fallback;
- poster WEBP for reduced-motion / preload fallback.

## Glassmorphism

Strategic Glassmorphism must primarily be implemented with:

- CSS semantic tokens
- backdrop-filter
- alpha surfaces
- borders
- internal highlights
- restrained shadows

Do not rasterize the product UI.

## PWA / favicon warning

Do NOT automatically replace the repository's existing favicon,
app-icon or site.webmanifest implementation with files from:

01_brand_core/originals/

without explicitly reconciling paths and runtime behavior.

The existing Engineering UI Kit runtime icon system remains authoritative
until frontend integration deliberately replaces it.

## Logo protection

The supplied original Brandopolis SVG logo and Ribbon B symbol are canonical.

Do not redraw, regenerate, approximate or replace them.

## Motion

Motion assets must respect prefers-reduced-motion.

Use the matching poster WEBP when motion is disabled.

## Product scope

Assets depicting future concepts do NOT authorize implementation of
features outside the currently approved product scope.
