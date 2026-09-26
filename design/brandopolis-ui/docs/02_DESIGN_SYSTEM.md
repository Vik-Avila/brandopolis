Status: CANONICAL
Owner: Brandopolis
Canonical: YES
Last Reviewed: 2026-09-24
Related: Main Engineering Repository
Depends On: Engineering Foundation

---
# Design System

## Foundation
Brandopolis must feel senior, calm, precise, premium and international. Warm Ivory provides atmosphere, Charcoal provides authority, Emerald carries brand/action, and Champagne is a restrained structural accent.

## Strategic Glassmorphism
Glass is an **interaction/surface layer**, not the identity itself. Use translucent surfaces, controlled blur, fine borders, soft depth and clean atmospheric backgrounds. Avoid ornamental blur, visual noise, reflections and low-contrast content.

### Public web
Glass can be visible on navigation, hero panels, product-preview frames, login/request-access shells and highlighted CTA surfaces.

### Product shell
Use glass subtly on top header, sidebar/context surfaces, workspace frame and overlays.

### Core strategic content
Decision Cards, Evidence, Hypothesis, History and Review Items prioritize legibility. Use near-opaque glass or solid surfaces when content density requires it.

## Color
Use semantic tokens. Emerald is not a universal status color. Status, evidence, warning, error and success remain separate.

## Typography
Primary: Inter. Display: Inter Display when available. Do not ship font files from this kit.

## Grid / spacing
12-column conceptual desktop grid, 8 tablet, 4 mobile. Use the 4/8 spacing scale. Product content max width favors reading and decision quality.

## Surfaces
Use `--surface-glass-*` semantic tokens rather than arbitrary rgba values. The most translucent surfaces belong to low-density areas; dense strategy content uses higher opacity.

## Borders / radius
Fine glass borders, 12–30px radius according to hierarchy, pills only for compact status.

## Buttons
Primary = Emerald solid + white. Secondary = high-opacity glass/white with readable border. Destructive actions use semantic error, never Emerald.

## Forms
Visible labels, 44px+ targets, explicit errors, visible focus. Form fields use high-opacity surfaces.

## Decision Card
Central product object. Present strategic question/decision, state, rationale, evidence and human actions using progressive disclosure. Recommendation must never look committed.

## Status
Label + semantic tone (+ icon where useful). Never color-only.

## Brandopolis Flow
Atmospheric background/transition layer. Never obscure content and never become decoration on every card.

## Motion
120–420ms. Calm, purposeful. Honor `prefers-reduced-motion`.

## Icons
Restrained rounded-stroke direction; no dependency on a specific icon library.

## Data / strategy visualization
Show dependency direction, evidence vs hypothesis, version relation and review state. Clarity first.
