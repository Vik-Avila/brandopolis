Status: CANONICAL
Owner: Brandopolis
Canonical: YES
Last Reviewed: 2026-09-25
Related: design/brandopolis-ui/assets/final-visual-package-2026-09-25/12_canonical_reference/brandopolis-canonical-product-vision-v1.png, design/brandopolis-ui/reference/screenshots/README.md
Depends On: Final visual package 2026-09-25; Brand Master final-canonical-2026-09-25

---
# Final visual gap audit — real frontend vs. canonical mockup

Final pass after the Brand Master reconciliation. Evidence: real Chromium screenshots in `reference/screenshots/`. Categories: **MATCH**, **ACCEPTED MVP VARIATION**, **OUT OF MVP / POST-MVP**, **EXTERNAL CONFIGURATION**.

| Area (mockup screen) | Status | Notes |
|---|---|---|
| Identity — horizontal logo, Ribbon B, favicon, PWA, apple-touch | **MATCH** | Byte-identical Brand Master copies; legacy polygonal B removed from runtime (test-enforced). Mobile header uses the canonical symbol. |
| 1 · Landing hero — eyebrow, serif headline with italic accent, lead, «Solicitar acceso →» + «Ver cómo funciona» | **MATCH** | Real HTML over responsive WebP; ivory veil keeps text ≥ 4.5:1 at 1440/1024/768/390 (pixel-measured). |
| 1 · Landing — four principles in a glass band | **MATCH** | Near-opaque glass for legibility over photography. Circular pictograms: **ACCEPTED MVP VARIATION** (no approved icon set). |
| 1 · Landing — nav «Producto / Para quién / Recursos» | **OUT OF MVP / POST-MVP** | Pages do not exist; nav shows only real destinations. |
| Login / Request access | **MATCH** | Access art + glass form; DEMO token or PILOT OIDC entry. Request destination: **EXTERNAL CONFIGURATION** (`PILOT_REQUEST_ACCESS_URL`). |
| 2 · Workspace — «Tu estrategia hoy», KPI tiles, attention cards, summary grid | **MATCH** | Real persisted data only. |
| 2 · Workspace — grouped sidebar | **MATCH** | Every item opens an implemented view; desktop no longer shows the drawer close control. |
| 2 · Workspace — search, notifications, avatar menu, «Nueva decisión», decorative «Tu marca» card | **OUT OF MVP / POST-MVP** | No such capabilities. Brand selector + context aside cover brand switching. |
| 3 · Decision card — question → why it matters → review state → committed decision with rationale → evidence and hypotheses → AI proposal → learning moment → history | **MATCH** | History last; «Por qué es importante» visible. Recommendation is a dashed secondary panel with secondary buttons; only human commits use solid primary buttons and the solid emerald rule. |
| 3 · Decision card — tabs | **ACCEPTED MVP VARIATION** | Same information as ordered sections and disclosures (keyboard/screen-reader simple). |
| 4 · Change Impact — Decisión que cambió → Dependencia estricta → Decisión afectada → Requiere revisión → Revisión humana | **MATCH** | Flow chips + impact pair with the dependency connector; review card with tinted header; no upstream/downstream wording; no automatic rewrite implied. |
| 4 · Guided Review — Mantener sin cambios / Modificar / Confirmar revisión | **MATCH** | Selectable option cards (`aria-pressed`), single lock note, confirm right-aligned. |
| 5 · History — vertical timeline | **MATCH** | Version, date, actor (never raw IDs), «Por qué», Actual/Sustituida, «Sustituida por vN», review note on the decision (review is not a version status). |
| 6/7 · Mobile workspace and navigation | **MATCH** | Canonical symbol header, ghost menu, drawer with focus trap/return; bottom tab bar: **ACCEPTED MVP VARIATION** (drawer). |
| Blueprint | **MATCH** | Decisions grid, connections as chips with one vocabulary, open hypotheses, accepted learnings — from persistent state. Visual graph, export, synthesis: **OUT OF MVP / POST-MVP**. |
| Experiments / Signals / Learning | **MATCH** | Numbered steps, status-toned badges, compact dates; no autonomous-learning claims. |
| Motion | **MATCH** | Single Flow loop, visible-only, pause control, poster for reduced motion. |
| Strategic Glassmorphism intensity | **MATCH** | Public expressive → access moderate → shell subtle → decision near-solid. |
| Live AI proposals, real OIDC login, hosting | **EXTERNAL CONFIGURATION** | See `docs/15-handoff/LIVE_PILOT_LAUNCH_CHECKLIST.md`. |
