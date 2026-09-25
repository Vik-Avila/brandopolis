# BRANDOPOLIS CANONICAL BRAND MASTER SYSTEM

# CANONICAL / APPROVED
# READY FOR REPOSITORY RECONCILIATION

The Ribbon B geometry has received visual approval. The scalable geometry authority is `01_master/brandopolis-symbol-master.svg` and the horizontal composition is `01_master/brandopolis-logo-horizontal-master.svg`. Future agents must not regenerate or reinterpret the Ribbon B. A future change to canonical geometry requires explicit brand-design approval. The approved wordmark (`01_master/brandopolis-wordmark.svg`) comprises vector outlines, retains its Emerald A accent and spacing, and requires no live font.

Authority hierarchy:

1. Canonical vector master geometry (`01_master/`).
2. Canonical outlined wordmark (`01_master/brandopolis-wordmark.svg`).
3. Canonical runtime derivatives (`02_runtime/`, including approved mono variants in `04_mono/`).
4. Canonical premium render derivatives (`03_premium/`).
5. Canonical micro usage (`05_micro/`).
6. Legacy and deprecated assets, documented in `07_legacy_audit/` and `BRAND_ASSET_DEPRECATION_MAP.md`.

Brand: Brandopolis. Public domain: **brandopolis.ai**. Intended pilot origin: **pilot.brandopolis.ai**.

The micro mark preserves the canonical master geometry. Small-size legibility is achieved through sizing, safe area and rasterization strategy rather than alternate geometry. The micro SVG may be byte-identical to the master. The QA board covers 16, 24, 32, 48, 64, 128 and 256 px. The geometry remains recognizable at these sizes; no alternate geometry is required at this time. Favicon raster exports are optimized for small-size use.

The canonical vector SVG is the true scalable master and defines geometry. Premium raster assets define material appearance and serve screen, presentation and marketing use. The 4096 premium raster is a high-resolution upscale of the approved 1334-pixel premium reference, not a native 4096 material render. Use vector geometry for unlimited scaling. Do not promote premium raster or old simplified SVG to geometry authority.

Review `FRONTEND_BRAND_INTEGRATION.md`, `REPOSITORY_BRAND_RECONCILIATION.md`, and run `python3 validate_brand.py` before repository reconciliation. No repository or user data is modified by this package.
