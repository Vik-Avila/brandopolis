# Repository brand reconciliation — canonical / approved

Claude Code: perform the migration on a review branch. Preserve old binaries as historical evidence outside the public runtime; do not delete audit evidence. Copy each replacement file into a matching public path and update imports/HTML references in one patch. Existing deployment paths are classified below.

| Existing source path | Decision | Exact canonical replacement |
|---|---|---|
| `design/brandopolis-ui/assets/logo/README.md` | DO NOT USE until classified | `` |
| `design/brandopolis-ui/assets/logo/brandopolis-logo-horizontal-flat-outlined.svg` | DO NOT USE until classified | `` |
| `design/brandopolis-ui/assets/logo/brandopolis-logo-horizontal-premium.png` | REFERENCE ONLY; KEEP as historical visual source; DO NOT USE as geometry authority | `03_premium/brandopolis-logo-horizontal-premium.png` |
| `design/brandopolis-ui/assets/logo/brandopolis-symbol-premium.png` | REFERENCE ONLY; KEEP as historical visual source; DO NOT USE as geometry authority | `03_premium/brandopolis-symbol-premium-2048.png` |
| `design/brandopolis-ui/assets/logo/brandopolis-logo-vertical-premium.png` | REFERENCE ONLY; KEEP as historical visual source; DO NOT USE as geometry authority | `03_premium/brandopolis-logo-horizontal-premium.png` |
| `public/brand/symbols/brandopolis-symbol-black.png` | REPLACE; MOVE TO LEGACY; DO NOT USE in runtime | `02_runtime/symbol/brandopolis-symbol-flat-color.svg` |
| `public/brand/symbols/brandopolis-symbol-emerald.png` | REPLACE; MOVE TO LEGACY; DO NOT USE in runtime | `02_runtime/symbol/brandopolis-symbol-flat-color.svg` |
| `public/brand/symbols/brandopolis-symbol.svg` | REPLACE; MOVE TO LEGACY; DO NOT USE in runtime | `02_runtime/symbol/brandopolis-symbol-flat-color.svg` |
| `public/brand/symbols/brandopolis-symbol-gold.png` | REPLACE; MOVE TO LEGACY; DO NOT USE in runtime | `02_runtime/symbol/brandopolis-symbol-flat-color.svg` |
| `public/brand/symbols/brandopolis-symbol-white.png` | REPLACE; MOVE TO LEGACY; DO NOT USE in runtime | `02_runtime/symbol/brandopolis-symbol-flat-color.svg` |
| `public/brand/symbols/brandopolis-symbol-flat.png` | REPLACE; MOVE TO LEGACY; DO NOT USE in runtime | `02_runtime/symbol/brandopolis-symbol-flat-color.svg` |
| `public/brand/logo/brandopolis-logo-horizontal.svg` | REPLACE; MOVE TO LEGACY; DO NOT USE in runtime | `02_runtime/logo/brandopolis-logo-horizontal-color.svg` |
| `public/brand/ui/app-icon-512.png` | REPLACE; MOVE TO LEGACY; DO NOT USE in runtime | `02_runtime/app-icons/app-icon-512.png` |
| `public/brand/ui/icon-128.png` | REPLACE; MOVE TO LEGACY; DO NOT USE in runtime | `02_runtime/app-icons/app-icon-128.png` |
| `public/brand/ui/favicon.ico` | REPLACE; MOVE TO LEGACY; DO NOT USE in runtime | `02_runtime/favicon/favicon.ico` |
| `public/brand/ui/icon-16.png` | REPLACE; MOVE TO LEGACY; DO NOT USE in runtime | `02_runtime/favicon/favicon-16.png` |
| `public/brand/ui/icon-256.png` | REPLACE; MOVE TO LEGACY; DO NOT USE in runtime | `02_runtime/app-icons/app-icon-256.png` |
| `public/brand/ui/icon-32.png` | REPLACE; MOVE TO LEGACY; DO NOT USE in runtime | `02_runtime/favicon/favicon-32.png` |
| `public/brand/ui/app-icon-192.png` | REPLACE; MOVE TO LEGACY; DO NOT USE in runtime | `02_runtime/app-icons/app-icon-192.png` |
| `public/brand/ui/icon-48.png` | REPLACE; MOVE TO LEGACY; DO NOT USE in runtime | `02_runtime/favicon/favicon-48.png` |
| `public/brand/ui/icon-64.png` | REPLACE; MOVE TO LEGACY; DO NOT USE in runtime | `02_runtime/favicon/favicon-64.png` |
| `public/brand/ui/site.webmanifest` | REPLACE; MOVE TO LEGACY; DO NOT USE in runtime | `02_runtime/manifest/site.webmanifest` |
| `public/brand/ui/icon-512.png` | REPLACE; MOVE TO LEGACY; DO NOT USE in runtime | `02_runtime/app-icons/app-icon-512.png` |
| `public/brand/ui/apple-touch-icon.png` | REPLACE; MOVE TO LEGACY; DO NOT USE in runtime | `02_runtime/app-icons/app-icon-180.png` |

Deploy `02_runtime/app-icons/app-icon-192.png` and `app-icon-512.png` to `/brand/` together with `02_runtime/manifest/site.webmanifest`; update the manifest link and verify its two URLs. Deploy 180px Apple icon and favicon.ico. Update logo references to the master horizontal SVG and compact references to the master symbol or its identical runtime derivative. Run `python3 validate_brand.py`, build the repository, and check light/dark headers, 16–256px favicon, PWA installation, and mobile header. Roll back the static assets/references if needed; leave brand user profiles, tenants, databases and uploaded user content untouched.
