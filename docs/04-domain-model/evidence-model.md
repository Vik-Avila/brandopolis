Status: canonical
Owner: Product / Engineering
Canonical: yes
Last reviewed: 2026-09-24
Related: docs/00-index/source-of-truth.md
Depends on: Master Context v1.0 + hardening brief 2026-09-24

# Evidence Model

`Evidence(id,brandId,claim,source,sourceDate,provenance,sourceQuality,relevance,freshness,limitations,external)`; `sourceQuality=HIGH|MEDIUM|LOW`, `relevance=DIRECT|INDIRECT`, `freshness=CURRENT|AGING|HISTORICAL`. Son etiquetas de evaluación, no probabilidades. Toda Evidence externa exige source, date y provenance; sin ello tratar como User Input/Inference/Hypothesis. Cada clasificación mantiene evaluador, fecha y criterio en audit. Evidence Guard valida ids y Brand antes de construir supportLevel. UI muestra procedencia y vigencia. No cambiar Support Level automáticamente por un único enum sin examinar conjunto/contradicciones.
