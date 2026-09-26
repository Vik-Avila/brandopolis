# Asset QA

- Approved premium vs hand-authored vector silhouette intersection-over-union at native 1334×1315: **0.9696**. This historical raster comparison is retained for traceability; the current vector geometry is now visually approved and authoritative.
- Vector: four intentional paths, cubic Bézier segments, no embedded bitmap, no `<text>` or font dependency.
- Wordmark: 12 outlined paths copied from the approved supplied horizontal SVG, Emerald A accent retained.
- Premium: canonical vector alpha, supplied metallic material, fringe below alpha 8 removed via vector silhouette.
- Micro: `micro-size-board.png` checks 16, 24, 32, 48, 64, 128 and 256px; the master geometry is unchanged and recognizable. No separate optical redraw is required.
- Premium contexts: white, ivory, charcoal, emerald and black board.
- Safe area: 67% in app tiles, 79% in favicon tiles.
- 4096 transparent raster is upsampled from supplied 1334 source; it is not a native 4K material render. Use vector SVG for unlimited scaling; use premium rasters for screen/presentation/marketing.
