Status: derived
Owner: Product / Engineering
Canonical: no
Last reviewed: 2026-09-23
Related: docs/00-index/BRANDOPOLIS_MASTER_CONTEXT_FOR_WORK.md
Depends on: Master Context v1.0

# Feature flags

| Flag | Local | Pilot/production inicial | Razón |
|---|---|---|---|
| research | off/opt-in | off hasta proveedor y provenance | core funciona sin web |
| capability_layer | on | on con consentimiento, guía adaptable | P0 fundamental |
| experimental_evaluator | on en fixtures | off hasta evals | semántica no bloquea reglas |
| pilot_instrumentation | off | on sólo PILOT | cohortes y WTP |
| demo_mode | opt-in | off | nunca mezclar datos |
| challenge_mode | off | off | P1 |
| second_provider | off | off | P1 |

Evaluación server-side por Workspace/contexto; cambios auditados y versión de configuración. `research=false` no invalida flujo de decisión.
