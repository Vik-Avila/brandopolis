Status: CANONICAL
Owner: Brandopolis
Canonical: YES
Last Reviewed: 2026-09-25
Related: design/brandopolis-ui/assets/final-visual-package-2026-09-25/12_canonical_reference/brandopolis-canonical-product-vision-v1.png, design/brandopolis-ui/reference/screenshots/README.md
Depends On: Final visual package 2026-09-25; Brand Master final-canonical-2026-09-25

---
# Final visual gap audit — real frontend vs. canonical mockup

Updated in Phase 10B (final polish) against the running product. Evidence: curated real-Chromium set in `reference/phase10b/` (plus the earlier `reference/screenshots/`). Categories: **RESOLVED/MATCH**, **ACCEPTED MVP LIMITATION**, **POST-MVP**, **EXTERNAL CONFIGURATION**, **FOUNDER FINAL REVIEW REQUIRED**. The whole visual result is **FOUNDER FINAL REVIEW REQUIRED** until the founder accepts it.

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
| 3 · Decision card — question → human decision → why it matters → review state → connections; evidence/hypotheses, options and history in tabs | **RESOLVED** | Human decision first; under review it keeps authorship with an attention tone («· en revisión»). AI/DEMO proposal dashed; the human choice is a separate solid area. Connections show direction («Depende de / Afecta a»). |
| 3 · Decision card — tabs | **RESOLVED** | Local tabs «Decisión / Evidencia e hipótesis / Opciones / Historial» with ARIA tabs, arrows/Home/End, animated indicator; scroll hint on phones. |
| 4 · Change Impact — Decisión que cambió → Dependencia estricta → Decisión afectada → Requiere revisión → Revisión humana | **RESOLVED** | Impact pair with a labelled champagne connector (downward on phones), affected card emphasised; text path hidden once the diagram is open; no upstream/downstream wording; no automatic rewrite implied. |
| 4 · Guided Review — Mantener sin cambios / Modificar / Confirmar revisión | **RESOLVED** | «What changed» line first, explicit selected marker, confirm disabled until a choice (editing = Modificar), focus lands on the choice. |
| 5 · History — vertical timeline | **RESOLVED** | Version, date, actor (never raw IDs), criterion, «Vigente»/«Sustituida», continuity note; superseded versions read as memory, not disabled rows. |
| 6/7 · Mobile workspace and navigation | **MATCH** | Canonical symbol header, ghost menu, drawer with focus trap/return; bottom tab bar: **ACCEPTED MVP VARIATION** (drawer). |
| Blueprint | **RESOLVED** | Four pillars with aligned actions, connections as edges (outline chips; dashed when suggested) with the affected target flagged, open hypotheses, accepted learnings — persistent state only. Visual graph, export, synthesis: **POST-MVP**. |
| Experiments / Signals / Learning | **MATCH** | Numbered steps, status-toned badges, compact dates; no autonomous-learning claims. |
| Motion | **MATCH** | Single Flow loop, visible-only, pause control, poster for reduced motion. |
| Strategic Glassmorphism intensity | **MATCH** | Public expressive → access moderate → shell subtle → decision near-solid. |
| Live AI proposals, real OIDC login, hosting | **EXTERNAL CONFIGURATION** | See `docs/15-handoff/LIVE_PILOT_LAUNCH_CHECKLIST.md`. |
| Contexto vigente rail | **RESOLVED** | Persistent memory with the Decision in view marked; collapsed summary on phones and Home. |
| Status vocabulary | **RESOLVED** | One source (`stateBadge`); «Vigente» is display-only. |
| Ambient imagery inside the product (decision/impact/review ambients from the package) | **ACCEPTED MVP LIMITATION** | Product stays near-solid for dense strategic content; only the shell atmosphere is used. Candidate for founder review. |
| Inter / Inter Display | **ACCEPTED MVP LIMITATION** | Not self-hosted (CSP same-origin, kit ships no fonts); system UI fallback. |
| Empty states richer than one line; custom select menus | **POST-MVP** | Current: honest one-line empty states; native selects with a styled chevron. |
| Overall visual acceptance | **FOUNDER FINAL REVIEW REQUIRED** | See `docs/15-handoff/FINAL_MVP_HANDOFF_2026-09-25.md`. |
