Status: canonical
Owner: Product / Engineering
Canonical: yes
Last reviewed: 2026-09-24
Related: docs/00-index/source-of-truth.md
Depends on: Master Context v1.0 + hardening brief 2026-09-24

# Change Impact v1

Input: upstream DecisionVersion nueva **aprobada por humano** y previa activa. Validar actor, tenant, `expectedActiveVersion` e idempotencia; transacción guarda nueva versión y anterior SUPERSEDED; cargar aristas versionadas del mismo Brand; HARD marca downstream NEEDS_REVIEW y ReviewItem OPEN; SOFT evalúa regla o semántica y puede crear ReviewItem REVIEW_SUGGESTED; INFORMATIVE sólo aparece en explicación contextual, sin review obligado. Evaluator opcional no suprime HARD. Dedupe por triggerVersion/downstream/ruleVersion; ordenar topológicamente los obligatorios antes de sugeridos. Output `affectedDecisionIds`, `dependencyType`, `impactStatus`, `reason`, `reviewOrder`. Fallo persistido como IMPACT_PENDING visible, reintento idempotente. Nunca reescribe downstream ni borra historial. Config `config/dependencies/v1.json`; ejemplo `evals/fixtures/m1-change.json`.

## Primera versión de Objetivo y Arena · 2026-10-06

Extensión aprobada ([ADR-0021](../14-decisions/ADR-0021.md)): `config/dependencies/v2.json` sustituye a
v1 como configuración activa y conserva sus seis reglas con `ruleVersion: v1`. Las cuatro reglas nuevas
(Objetivo → Arena HARD, Objetivo → Modelo de valor SOFT, Arena → Cliente principal HARD, Arena →
Posicionamiento SOFT) declaran `reviewOnFirstUpstreamVersion`: además del caso anterior (versión nueva
con previa activa), la **primera** versión humana de esa decisión upstream es input de impacto para las
decisiones downstream que ya existían. Las dependencias se sincronizan en la transacción del commit,
antes de calcular el impacto; nunca se duplica una arista para el mismo par de decisiones. Se aplican
las mismas reglas: HARD → NEEDS_REVIEW y ReviewItem OPEN; SOFT → REVIEW_SUGGESTED; sólo aristas
directas; dedupe por triggerVersion/downstream/ruleVersion; nunca reescribe downstream. Las reglas v1
no cambian: su primera versión upstream sigue sin generar impacto.

## Promesa de marca y revisiones sin duplicar · 2026-10-06

[ADR-0022](../14-decisions/ADR-0022.md): `config/dependencies/v3.json` es la configuración activa (v1 y v2
conservados). Añade Brand Promise → Core Message (HARD, primera versión revisable). Dedupe adicional:
al procesar el impacto de una versión de U sobre D no se crea un ReviewItem nuevo si D ya tiene uno no
completado, igual o más fuerte (OPEN cubre todo; REVIEW_SUGGESTED sólo cubre SOFT), cuyo trigger es una
versión de una decisión upstream directa de U. D sigue en el resultado del impacto con su motivo. Nunca
se suprime una revisión HARD por una sugerencia ni se reescribe downstream.

El comprobante de revisión liga también las versiones vigentes de las decisiones upstream directas del
downstream revisado; un cambio integrado en una revisión pendiente invalida comprobantes anteriores y
exige reabrir la revisión con el contexto vigente ([ADR-0022](../14-decisions/ADR-0022.md)).
