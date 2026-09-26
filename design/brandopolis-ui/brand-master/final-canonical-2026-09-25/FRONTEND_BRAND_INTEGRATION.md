# Frontend brand integration — canonical / approved

| Surface | Canonical asset |
|---|---|
| Public navbar | `01_master/brandopolis-logo-horizontal-master.svg` |
| Product header | `01_master/brandopolis-logo-horizontal-master.svg` |
| Mobile header | `01_master/brandopolis-symbol-master.svg` |
| Sidebar / compact UI | `02_runtime/symbol/brandopolis-symbol-flat-color.svg` |
| Public hero | `03_premium/brandopolis-logo-horizontal-premium.webp` or symbol premium where appropriate |
| Login | Canonical horizontal SVG or approved premium derivative |
| Favicon | `02_runtime/favicon/favicon.ico` and size-specific PNGs |
| Apple touch | `02_runtime/app-icons/app-icon-180.png` |
| PWA | `02_runtime/app-icons/app-icon-192.png` and `app-icon-512.png` |
| Social / presentation | `03_premium/` render derivatives |

Copy the chosen files into the repository's public `/brand/` URL path. The included `site.webmanifest` expects `/brand/app-icon-192.png` and `/brand/app-icon-512.png`; publish those precise names together and link to the deployed manifest. Preserve aspect ratio and clear space. The icons use an Emerald `#073D2D` tile, with 67% app-mark and 79% favicon-mark safe areas. Use the runtime light lockup on dark surfaces. Do not recolor the SVG with CSS filters or use the deprecated polygonal symbols.

The master SVG defines geometry; premium renders define material. The 4096 premium raster is upscaled from the approved raster source and intended for screen, presentation and marketing use. Brand integration affects static files and references only; retain tenant/user data and avoid database operations.
