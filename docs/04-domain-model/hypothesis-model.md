Status: canonical
Owner: Product / Engineering
Canonical: yes
Last reviewed: 2026-09-24
Related: docs/00-index/source-of-truth.md
Depends on: Master Context v1.0 + hardening brief 2026-09-24

# Hypothesis Model

`Hypothesis(id,brandId,statement,status,evidenceReferences,createdBy,createdAt)` usa exclusivamente `UNTESTED|TESTING|SUPPORTED|WEAKENED|REJECTED`. Una relación `DecisionHypothesisUsage(decisionVersionId,hypothesisId,assumptionInUse:boolean)` señala dependencia temporal de una Decision vigente; no cambia status de Hypothesis ni crea entidad base Assumption. Si se debilita/rechaza, una regla puede crear ReviewItem sin reescribir Decision. Signals son hechos observados; sólo revisión humana permite Learning. Schemas y ejemplos en `schemas/hypothesis.schema.json` y `schemas/decision-version.schema.json`.
