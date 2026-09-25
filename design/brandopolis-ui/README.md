Status: CANONICAL
Owner: Brandopolis
Canonical: YES
Last Reviewed: 2026-09-24
Related: Main Engineering Repository
Depends On: Engineering Foundation

---
# Brandopolis UI Kit — FINAL CANONICAL

> **THIS PACKAGE DOES NOT REDEFINE BRANDOPOLIS DOMAIN OR APPLICATION ARCHITECTURE.**  
> **DO NOT COPY ROOT FILES OVER THE MAIN REPOSITORY.**  
> **EXISTING GREEN M1 IMPLEMENTATION MUST BE PRESERVED.**

## What this is
A production-minded visual/UX contract for integrating the approved Brandopolis identity and **Strategic Glassmorphism** into the existing M1 application and public gateway.

## Authority
1. Main Engineering Repository / Product Bible / domain contracts / state machines / ADRs / invariants.
2. This UI Kit for visual identity, UX presentation, responsive behavior and display semantics.
3. Future concepts and marketing archive are reference only.

If Domain and UX disagree, **Domain wins**.

## Visual direction locked
Ribbon B + Emerald + Champagne + Warm Ivory + Charcoal + Brandopolis Flow + Inter/Inter Display. The final premium layer is **Strategic Glassmorphism**: translucent but readable surfaces, controlled blur, soft borders, restrained highlights, calm depth.

## Where glass belongs
- Public gateway, login/request-access: expressive but controlled.
- App shell, header, context surfaces: subtle.
- Decision/Evidence/History content: clarity first; glass influence must not reduce readability.

## Canonical files
- Tokens: `tokens/brandopolis.tokens.json` and `.css`
- Design system: `docs/02_DESIGN_SYSTEM.md`
- Product principles: `docs/03_PRODUCT_UI_PRINCIPLES.md`
- Domain/UI mapping: `docs/05_DOMAIN_UI_MAPPING.md`
- Strategic Glassmorphism: `docs/07_STRATEGIC_GLASSMORPHISM.md`
- Screen specs: `specs/screens.json`
- Components: `specs/components.json`
- Canonical browser screenshots: `reference/screenshots/`
- Codex handoff: `handoff/CODEX_WEB_UI_START_HERE.md`

## Copy to main repo
Copy only:
- `design/brandopolis-ui/`
- `public/brand/`

Do **not** copy `reference-only/brand-marketing/`.

## Validate
From the package root: `python design/brandopolis-ui/validation/validate.py --root .`
