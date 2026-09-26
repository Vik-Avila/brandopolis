Status: derived
Owner: Product / Engineering
Canonical: no
Last reviewed: 2026-09-25
Related: design/brandopolis-ui/FRONTEND_ASSET_MAPPING.md, design/brandopolis-ui/FINAL_VISUAL_GAP_AUDIT.md, docs/15-handoff/MVP_PHASES_1_TO_9_CLOSURE.md
Depends on: Brand Master final-canonical-2026-09-25; Final visual package 2026-09-25

# Final frontend canonical closure

Frontend: **CANONICAL MVP**. Brand Master: **CANONICAL / APPROVED**. Visual assets: **CANONICAL**. Production: not claimed.

## Sources of authority

- Brand Master `design/brandopolis-ui/brand-master/final-canonical-2026-09-25/` — geometry (vector masters) and material (premium renders). Immutable; validated by `validate_brand.py` (PASS, also from a clean Git worktree).
- Visual package `design/brandopolis-ui/assets/final-visual-package-2026-09-25/` — North Star mockup governs direction, not scope.

## Runtime identity

Logo, Ribbon B symbol, favicon system, apple-touch 180, PWA 192/512 and manifest are byte-identical Brand Master copies (`tests/brand-runtime.test.ts`). The legacy polygonal B is no longer served anywhere; verified by hash and visually in Chromium (header, mobile header, footer, favicon). `.gitattributes` (`-text`) protects the Brand Master and `public/brand/**` from line-ending conversion. Mapping: `design/brandopolis-ui/FRONTEND_ASSET_MAPPING.md`.

## Surfaces completed

Public gateway (hero, principles, «Cómo funciona» with Flow), login, request access, workspace («Tu estrategia hoy»), decision card, Change Impact / Needs Review, Guided Review, history timeline, Blueprint, Brand Context, Experiments / Signals / Learning, practice, feedback (PILOT), mobile drawer. Gap audit: `design/brandopolis-ui/FINAL_VISUAL_GAP_AUDIT.md` (no open in-scope gap).

## Quality evidence

| Area | Result |
|---|---|
| Responsive | 1600×1000, 1440×900, 1280×800, 768×1024, 390×844: no overflow, no broken images/video, 0 console errors (`pnpm test:visual`). |
| Accessibility | Focus restoration after re-renders, visible focus, skip link, single h1 per view, per-view titles, labelled controls and hints, status text (not color-only), 3:1 form borders, drawer dialog with trap/return, motion pause control, reduced motion. Text contrast ≥ 4.5:1 on public and product surfaces; hero text pixel-measured at 1440/1024/768/390. No certification claimed. |
| Performance | One LCP hero per breakpoint with matching preload; hidden art not fetched via CSS; single motion loop (`preload=none`, visible-only); memory-cached assets, ETag/304 for scripts and styles, 1-day cache for brand media. |
| Motion | Brandopolis Flow only; poster on reduced motion or failure; user pause. |
| Favicon / PWA / metadata | Canonical favicon, apple-touch, manifest and icons served; canonical URL and OG `https://brandopolis.ai/`. |
| Security | CSP, Host/Origin checks, cookies, OIDC, limiter and tenancy unchanged; only allowlisted files served. |
| Browser stability | RC browser suite: 3 consecutive clean full runs after the final change (25/25 each). The single historical failure did not recur; recorded as unreproduced. |

Canonical screenshots (real Chromium, `design/brandopolis-ui/reference/screenshots/`): public-gateway, login, request-access, m1-workspace (workspace), m1-needs-review (needs review), m1-guided-review (guided review), history, blueprint — desktop and mobile — plus decision-card-desktop.

## Known limitations

Mockup elements without an approved capability (search, notifications, profile menu, extra landing pages, decision tabs, bottom tab bar) are post-MVP. Only Chrome tested. Mobile hero is ~200 KB (unchanged canonical asset). MP4 range requests are not implemented (WebM is served first).
