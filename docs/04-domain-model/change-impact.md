Status: canonical
Owner: Product / Engineering
Canonical: yes
Last reviewed: 2026-09-24
Related: docs/00-index/source-of-truth.md
Depends on: Master Context v1.0 + hardening brief 2026-09-24

# Change Impact v1

Input: upstream DecisionVersion nueva **aprobada por humano** y previa activa. Validar actor, tenant, `expectedActiveVersion` e idempotencia; transacción guarda nueva versión y anterior SUPERSEDED; cargar aristas versionadas del mismo Brand; HARD marca downstream NEEDS_REVIEW y ReviewItem OPEN; SOFT evalúa regla o semántica y puede crear ReviewItem REVIEW_SUGGESTED; INFORMATIVE sólo aparece en explicación contextual, sin review obligado. Evaluator opcional no suprime HARD. Dedupe por triggerVersion/downstream/ruleVersion; ordenar topológicamente los obligatorios antes de sugeridos. Output `affectedDecisionIds`, `dependencyType`, `impactStatus`, `reason`, `reviewOrder`. Fallo persistido como IMPACT_PENDING visible, reintento idempotente. Nunca reescribe downstream ni borra historial. Config `config/dependencies/v1.json`; ejemplo `evals/fixtures/m1-change.json`.
