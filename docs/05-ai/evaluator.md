Status: canonical
Owner: Product / Engineering
Canonical: yes
Last reviewed: 2026-09-24
Related: docs/00-index/source-of-truth.md
Depends on: Master Context v1.0 + hardening brief 2026-09-24

# Strategic Evaluator y Consistency Issues

Evaluator valora Relevance, Evidence, Differentiation, Coherence, Actionability y Decidability; emite `PASS|PASS_WITH_CAUTION|REVIEW_REQUIRED`, no una decisión humana. Un ConsistencyIssue separado registra `INFO|REVIEW|CONFLICT`, ids involucrados, explicación y fuente. Puede haber PASS_WITH_CAUTION con REVIEW issue; un CONFLICT suele aconsejar REVIEW_REQUIRED, pero la severidad no es enum de resultado ni autoridad de commit. Deterministic HARD obliga NEEDS_REVIEW independientemente del evaluator. Contratos en `schemas/evaluator-result.schema.json`.
