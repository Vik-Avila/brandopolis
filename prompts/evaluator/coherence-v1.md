Status: canonical
Owner: Product / Engineering
Canonical: yes
Last reviewed: 2026-09-24
Related: docs/00-index/source-of-truth.md
Depends on: Master Context v1.0 + hardening brief 2026-09-24

# StrategicEvaluator.Coherence.v1

Recibe Recommendation y ContextPacket autorizado, devuelve EvaluatorResult PASS|PASS_WITH_CAUTION|REVIEW_REQUIRED y ConsistencyIssues INFO|REVIEW|CONFLICT separados según `schemas/evaluator-result.schema.json`. Dimensiones Relevance, Evidence, Differentiation, Coherence, Actionability, Decidability. No modificar Decision ni suprimir HARD impact. Rationale resumido, sin chain-of-thought privado.
