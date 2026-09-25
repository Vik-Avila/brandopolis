# Brandopolis Canonical Brand Master — Repository Integration

## Status

CANONICAL / APPROVED / READY FOR FRONTEND RECONCILIATION

## Canonical source

design/brandopolis-ui/brand-master/final-canonical-2026-09-25/

## Authority

The following files now define the official Brandopolis brand geometry:

- 01_master/brandopolis-symbol-master.svg
- 01_master/brandopolis-logo-horizontal-master.svg
- 01_master/brandopolis-wordmark.svg

The previous simplified/polygonal Brandopolis SVG assets are deprecated.

The canonical vector master defines geometry.

Premium raster assets define material appearance only.

## Runtime reconciliation

DO NOT blindly copy the entire package into public/.

Frontend engineering must reconcile existing runtime assets using:

- BRAND_ASSET_REPLACEMENT_MAP.json
- BRAND_ASSET_DEPRECATION_MAP.md
- BRAND_ASSET_USAGE_MATRIX.md
- FRONTEND_BRAND_INTEGRATION.md
- REPOSITORY_BRAND_RECONCILIATION.md

## Canonical runtime intent

Public navbar:
canonical horizontal SVG

Product header:
canonical horizontal SVG

Mobile / compact UI:
canonical symbol SVG

Favicon:
canonical favicon.ico / favicon sizes

Apple Touch:
canonical 180px icon

PWA:
canonical 192px and 512px icons

Hero / marketing:
approved premium derivatives where appropriate

## Important

Do not delete historical legacy assets until repository reconciliation has verified that no runtime reference depends on them.

Do not regenerate the Ribbon B.

Do not reinterpret the wordmark.

Do not substitute another geometry.

## Canonical domain

Public:
https://brandopolis.ai

Pilot:
https://pilot.brandopolis.ai
