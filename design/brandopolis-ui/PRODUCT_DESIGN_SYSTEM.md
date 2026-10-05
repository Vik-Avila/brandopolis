Status: CANONICAL
Owner: Brandopolis
Canonical: YES
Last Reviewed: 2026-09-25
Related: design/brandopolis-ui/docs/02_DESIGN_SYSTEM.md, design/brandopolis-ui/tokens/brandopolis.tokens.css, design/brandopolis-ui/FRONTEND_ASSET_MAPPING.md, src/transport/public/
Depends On: Brand Master final-canonical-2026-09-25; Final visual package 2026-09-25

---
# Product design system — as implemented (Phase 10B)

This describes the **runtime** product in `src/transport/public/`. Kit-level principles live in `docs/02_DESIGN_SYSTEM.md` and `docs/07_STRATEGIC_GLASSMORPHISM.md`; this file records the decisions the code actually applies, so a developer can extend the UI without re-deriving them.

## Feel

Premium, editorial, calm, warm, precise B2B strategy software. Never an admin panel, CRUD template, chatbot wrapper, neon/purple "AI" or decorative glass overload.

## Layers and files

| Layer | File | Glass intensity |
|---|---|---|
| Tokens | `tokens.css` (from `design/brandopolis-ui/tokens/`) | — |
| Base | `base.css` | — |
| Public (gateway, login, request access) | `public.css` | Expressive (hero pillars) → moderate (access) |
| Product shell | `product-shell.css` | Subtle (header, sidebar) |
| Decision, context, views | `product-decision.css`, `product-context.css`, `product-views.css` | Solid / near-solid for dense content |
| Responsive + motion | `product-responsive.css` | — |

One responsive block per breakpoint (≥1500, ≤1500, ≤1400, ≤1279 drawer navigation, ≤1000 single column, portrait tablet 768–1023, ≤767 phone), then a single `prefers-reduced-motion` block.

## Typography

- `--font-display` (Iowan Old Style → Palatino Linotype → Georgia): strategic questions, decision text, section titles, numerals.
- `--font-ui` (Inter → system UI): interface text. Inter is not self-hosted (the CSP allows only same-origin fonts and the kit ships no font files); the system UI font is the fallback.
- Eyebrows: uppercase, tracked, ≥ 10px, emerald (gold in memory/attention contexts). Interface metadata ≥ 11px; tabs 13px (12px on phones).

## Colour roles (never colour alone — every state also has a word or marker)

| Meaning | Treatment |
|---|---|
| Human decision (vigente) | Green tint, 3px deep-emerald left rule, serif decision text, «Decisión humana · vigente» |
| Human decision under review | Same structure, warm attention tint, gold rule, «· en revisión» |
| Requiere revisión (strategic attention, not an error) | `.badge.warn` — gold, «!» marker |
| Evidence | Evidence tint, solid border |
| Hypothesis | Gold, dashed border, «Por validar» |
| AI / DEMO proposal | Dashed container, «Asistencia estratégica», «Sin validar · revisión humana necesaria» |
| Technical error | Rejected tint in the notice (`#notice.error`) |
| Validation / session | Review tint in the notice (`data-kind`) |

## Status vocabulary

Single source: `stateBadge()` in `product-views.js`.

- «Vigente · vN»: display relation over the active version (never a `Decision.status`).
- «Requiere revisión», «Por decidir», and in history «Vigente» / «Sustituida».
- Dependency types are edges, not statuses: «estricta», «sugerida», «informativa» (outline chips; dashed when suggested).

## Actions

- **Primary (solid emerald)**: human commitment and the next strategic step only: Aprobar decisión, Confirmar revisión, Iniciar revisión humana, Preparar decisión, Solicitar acceso.
- **Secondary (outline)**: review, modify, compare, open.
- **Tertiary (underlined text)**: reference and history («Revisar versión más reciente»).
- States: hover, `:focus-visible` (3px emerald ring, offset 3px), pressed (inset shadow), disabled (55% opacity, not-allowed), busy (`aria-busy` + global progress rule).
- Guided Review: «Confirmar revisión» stays disabled until «Mantener sin cambios» or «Modificar» is chosen; editing the decision text counts as «Modificar».

## Connected decisions and Change Impact

- Decision card footer: «Depende de» / «Afecta a» chips; a connected decision that needs review is tinted and says so.
- Change Impact: «Decisión que cambió» card (Antes/Ahora) → champagne connector with the dependency label (horizontal on desktop, downward on phones) → «Decisión afectada» card (gold emphasis) → human actions. The text path above it is hidden once the diagram is open. Normal UI never says upstream/downstream.
- Contexto vigente rail: persistent memory; numbered lineage, version and authorship; the Decision in view is marked (`aria-current="step"`); collapsed to a one-line summary on phones and on Home.

## Motion

Short, deliberate, no overshoot: view entry (6px rise + fade, `--bp-motion-slow`), dialog entry, navigation and tab indicator transitions, option-card marker. Brandopolis Flow appears only as the public «Cómo funciona» video (poster first, plays when visible, pause control). Everything nonessential is removed under `prefers-reduced-motion`.

## Accessibility contract

WCAG 2.2 AA target: text contrast ≥ 4.5:1 (checked in `tests/visual/canonical.spec.ts`, including pixel-measured hero text), focus visible on every control, tabs with arrow/Home/End, dialog and drawer focus trap and return, h1 present at every width, 44px targets for primary mobile controls, `lang` on English brand phrases.

## Brando B1 · contextual drawer and motion revision · 2026-10-05

Human-authorized nonproduction UI: right-anchored native dialog drawer (620px maximum,
full viewport on phones), own scrolling body, fixed composer and accessible focus return.
Context is displayed before inference from the existing authorized snapshot: active decision
and recorded rationale, attention, evidence/hypothesis counts and short previews. Navigation
opens existing human workflows. No automatic inference or strategic write. A compact Brando
portrait shares the Qué necesita atención entry in the left navigation, opening the existing
attention summary. The right card remains the query drawer entry.

All live portraits use the SAME 160px alpha `/brando/idle.webp` (4550 bytes), displayed at 44px
(32px in a suggestion). The previous consulting/ready derivatives remain available for the
preceding candidate but are no longer referenced by this frontend. No new imagery is generated;
no geometry, scale, skew or perspective morph is used. Rigid translation/rotation plus subtle
illumination distinguish idle, consulting, ready, attention and unavailable. A running gesture
finishes at neutral before a changed state begins. Finite gestures last 2.0–2.6s; resting motion
starts every 8–12s, consulting every 3s; unavailable has a single entry gesture. Idle's first
visible gesture may start at 1.8s. Offscreen/hidden-tab/modal guards, explicit pause and live
reduced-motion preference remain. Drawer enters at 320ms and closes at 220ms; reduced motion
removes both. Native dialog inertness remains; the lighter backdrop keeps context recognizable.

Reference: reference/brando-b1/drawer-source.png (layout only; humanized gemstone explicitly
excluded). Existing gemstone/Brand Master identity is preserved. Browser regression and human
motion acceptance are required; no asset-hash or canonical screenshot baseline refresh.
