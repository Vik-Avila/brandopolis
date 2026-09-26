Status: DERIVED
Owner: Brandopolis
Canonical: NO
Last Reviewed: 2026-09-24
Related: Main Engineering Repository
Depends On: Engineering Foundation + UI Kit

---
# Accessibility QA

Target: **WCAG 2.2 AA**. This is a target, not a blanket compliance claim.

## Programmatic contrast checks

| Pair | Foreground | Background | Ratio | Small-text target |
|---|---|---|---:|---|
| Primary text / Warm Ivory | `#161B19` | `#F7F3EA` | 15.74:1 | PASS |
| Muted text / Warm Ivory | `#666A65` | `#F7F3EA` | 4.97:1 | PASS |
| White / Emerald | `#FFFFFF` | `#0B6847` | 6.81:1 | PASS |
| Review text / Review bg | `#7A5A20` | `#F7EEDB` | 5.50:1 | PASS |
| Approved text / Approved bg | `#073D2D` | `#EAF3EF` | 10.83:1 | PASS |
| Error text / Error bg | `#8E3434` | `#F9EAEA` | 6.68:1 | PASS |

## Strategic Glassmorphism safeguards
- Critical text sits on high-opacity glass or solid-equivalent support.
- Decision Cards use `surface-glass-elevated`, not low-opacity hero glass.
- Focus remains explicit and is not replaced by glow.
- Status uses text + semantic tone; transparency is never the only signal.
- `prefers-reduced-motion` is implemented in the prototype.
- Busy/atmospheric backgrounds are kept outside dense strategic content.

## Browser QA
Real Chromium checks passed at 1600×1000, 1440×900, 1280×800, 768×1024 and 390×844 for the canonical prototype pages: no horizontal overflow, no browser console errors, and mobile navigation triggers open/close correctly with Escape. Details: `browser-qa.json`.

## Still implementation-dependent
Screen-reader live regions, auth error announcements, real modal focus management and integrated application/device audits must be verified after Codex applies the design to the host application.
