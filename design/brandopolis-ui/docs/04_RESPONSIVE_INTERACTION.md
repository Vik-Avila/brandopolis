Status: CANONICAL
Owner: Brandopolis
Canonical: YES
Last Reviewed: 2026-09-24
Related: Main Engineering Repository
Depends On: Engineering Foundation

---
# Responsive & Interaction Contract

## Viewports
- Desktop: 1280px+
- Tablet: 768–1279px
- Mobile: <768px

## Public gateway
Desktop hero = glass copy panel + product preview. Tablet/mobile = one column; navigation changes to an accessible menu trigger.

## Product shell
Desktop = persistent sidebar. Tablet/mobile = sidebar becomes an off-canvas drawer triggered by an explicit 44×44 menu button. Drawer supports Escape and backdrop click, preserves focus entry, and never leaves navigation unreachable.

## Mobile information priority
1. Decision question/statement.
2. Current/review state.
3. Recommendation/context.
4. Human action.
5. Evidence/details/history.

## Decision connector
The horizontal strict dependency stacks vertically on narrow screens while preserving causal order.

## Controls
44px minimum primary targets, visible focus, logical tab order, no hover-only meaning.

## Motion
Honor `prefers-reduced-motion`; state must remain understandable without animation.
