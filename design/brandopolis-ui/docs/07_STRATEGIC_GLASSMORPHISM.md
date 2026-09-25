Status: CANONICAL
Owner: Brandopolis
Canonical: YES
Last Reviewed: 2026-09-24
Related: Main Engineering Repository
Depends On: Engineering Foundation

---
# Strategic Glassmorphism

## Definition
Brandopolis uses glassmorphism as a controlled premium layer: translucent surfaces, contained blur, soft borders and depth, while keeping strategy content highly readable.

## Application hierarchy
1. **Public gateway / auth:** expressive.
2. **App shell / context:** subtle.
3. **Core decision content:** conservative, near-opaque.

## Canonical semantic tokens
`--surface-glass-primary`, `--surface-glass-secondary`, `--surface-glass-hero`, `--surface-glass-shell`, `--surface-glass-modal`, `--surface-glass-nav`, `--surface-glass-context`, `--surface-glass-elevated`, `--border-glass`, `--shadow-glass`, `--blur-glass`, `--highlight-glass`.

## Accessibility rules
- Critical text never depends on a busy backdrop.
- Dense cards use high-opacity glass/solid fallback.
- Focus remains visible.
- Status remains label-led, not transparency-led.
- Reduced motion is honored.
- If blur/transparency lowers readability, increase opacity before adding shadow.

## Anti-patterns
No Dribbble-only glass, giant blur blobs, ornamental reflections, glass on every object, low-contrast text, neumorphism, excessive spheres, noisy gradients or decorative particles.
