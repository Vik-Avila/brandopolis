Status: CANONICAL
Owner: Brandopolis
Canonical: YES
Last Reviewed: 2026-09-25
Related: design/brandopolis-ui/assets/final-visual-package-2026-09-25/12_canonical_reference/brandopolis-canonical-product-vision-v1.png, design/brandopolis-ui/reference/screenshots/README.md
Depends On: Final visual package 2026-09-25

---
# Final visual gap audit — real frontend vs. canonical mockup

Compared the integrated application (screenshots in `reference/screenshots/`) with the seven-screen canonical mockup. The mockup governs visual direction, not scope.

| Area (mockup screen) | Status | Notes |
|---|---|---|
| 1 · Public landing — hero, eyebrow «The Brand Operating System», serif headline with italic accent, lead, two CTAs | **MATCH** | Real HTML text over responsive WebP; ivory overlay keeps text ≥ 4.5:1 (pixel-measured test). |
| 1 · Landing — four value pillars in a glass band | **MATCH** | Same four principles, CSS glass. |
| 1 · Landing — nav items «Producto / Para quién / Recursos» | **OUT OF MVP SCOPE** | No such pages exist; nav shows only real destinations (Cómo funciona, Acceder, Solicitar acceso) — no dead links. |
| 1 · Landing — «Ver cómo funciona» | **MATCH** | Links to a real section with the connected-decision story and the Flow loop. |
| Login / Request access | **MATCH** | Access panel art + glass form; DEMO token form or PILOT OIDC entry; request access configurable, never a broken link. |
| 2 · Workspace — «Tu estrategia hoy» with 4 KPI tiles | **MATCH** | Tiles from real state (decisiones vigentes, revisión, hipótesis abiertas, experimentos activos). |
| 2 · Workspace — grouped sidebar (Estrategia / Contexto / Aprendizaje / Práctica) | **MATCH** | Grouped with labels; every item leads to an implemented view. |
| 2 · Workspace — search bar, notifications, avatar menu, «Nueva decisión» | **OUT OF MVP SCOPE** | No search/notifications/profile features exist; decisions are created from the four canonical questions. |
| 2 · Workspace — «Tu marca» card with landscape image and edit | **PARTIAL (accepted)** | Brand selector + context aside instead of a decorative brand card; brand editing is not in MVP scope. |
| 2 · Workspace — evolution alert with Customer → Positioning pair | **MATCH** | Shown in the decision view as the Change Impact pair; «Qué necesita atención» lists affected decisions. |
| 3 · Decision card — title, status pill, version/date, decided-by, main decision, why it matters, dependencies | **MATCH** | Status badge + meta line; current decision block; «Lo que sabemos y lo que suponemos»; dependency path in the aside. |
| 3 · Decision card — tabs (Resumen / Evidencia / Hipótesis / Opciones / Historial) | **PARTIAL (accepted)** | Same content as collapsible sections on one page (keyboard- and screen-reader-simple). Tabs would be presentational only. |
| 4 · Change Impact / Guided Review — changed vs impacted cards, options, lock note, continue | **MATCH** | Impact pair, «Mantener sin cambios» / «Modificar», «Confirmar revisión», «nada se reescribe sin tu confirmación». Three radio cards → two options + confirm (same domain behavior). |
| 5 · Decision history — vertical timeline with version pills | **MATCH** | Timeline with current vs superseded markers. «Necesita revisión» shown on the decision, not as a version state (domain-correct: review is not a version status). |
| 6 · Mobile workspace | **MATCH** | KPIs 2×2, review card, decisions; bottom tab bar replaced by the drawer (existing accessible pattern). |
| 7 · Mobile navigation drawer | **MATCH** | Grouped drawer, focus trap, Escape, backdrop, focus return. |
| Blueprint | **MATCH (MVP depth)** | Grid of current decisions, connections, open hypotheses and accepted learnings, derived from persistent state. |
| Motion | **MATCH** | Flow loop only where it adds meaning; poster for reduced motion and failures. |
| Strategic Glassmorphism | **MATCH** | Expressive on public surfaces, subtle shell, near-solid decision content. |
| Brand board colors (Warm Ivory, Champagne, Emerald, Charcoal) | **MATCH** | From tokens; gold text uses the accessible divider gold. |

No PARTIAL item blocks MVP: each accepted partial keeps the canonical information and hierarchy without inventing features. Out-of-scope items are listed in `docs/15-handoff/POST_MVP_DEFERRED_SCOPE.md`.
