Status: canonical
Owner: Product / Engineering
Canonical: yes
Last reviewed: 2026-09-24
Related: docs/00-index/source-of-truth.md
Depends on: Master Context v1.0 + hardening brief 2026-09-24

# Invariantes y prueba de aceptación

| ID | Invariante | Prueba |
|---|---|---|
| INV-001 | AI Recommendation no crea Approved Decision | endpoint IA no tiene commit ni versión |
| INV-002 | Decision aprobada cambia sólo con versión nueva humana | actor/versión previas intactas |
| INV-003 | Superseding conserva History | v1 consultable tras v2 |
| INV-004 | Tenant A no lee B | lectura, escritura, export y jobs intertenant denegados |
| INV-005 | Evidence externa exige provenance | schema/guard impiden falsa fuente |
| INV-006 | Conversation no modifica Strategy silenciosamente | chat sin writes ni versión |
| INV-007 | Signal no equivale a Learning | sin Learning ACCEPTED sin revisión |
| INV-008 | Change Impact no reescribe downstream | version/hash Positioning igual tras Customer v2 |
| INV-009 | Stale client no pisa nueva versión | expectedActiveVersion produce 409 sin side effects |
| INV-010 | Commits auditables e idempotentes | mismo key → una versión/audit/ReviewItem |
| ENG-011 | Capability Context es de User | ninguna pertenencia a Brand |
| ENG-012 | Research live opcional | M1 completo con research apagado |
| ENG-013 | HARD no se suprime por Evaluator PASS | review persiste |

## Validation & Learning · ADR-0026 (2026-10-07)

| ID | Invariante | Prueba |
|---|---|---|
| VAL-001 | Sólo una persona cambia el estado de una hipótesis | `reviewHypothesis` con criterio; iniciar un experimento no la mueve |
| VAL-002 | SUPPORTED/WEAKENED/REJECTED exigen un aprendizaje ACCEPTED sobre esa hipótesis | candidato o de otra hipótesis → 409 |
| VAL-003 | Revisión de hipótesis con concurrencia e idempotencia | expectedStatus → 409; misma clave → mismo resultado; otra huella → 409 |
| VAL-004 | El plan de un experimento se evalúa sin bloquear | READY / READY_WITH_CAUTION / REWORK sólo como guía |
| VAL-005 | INCONCLUSIVE es un resultado legítimo | transición sin señales, visible como pendiente de decisión |
| VAL-006 | Un aprendizaje se edita sólo antes de aceptarse o rechazarse | REJECTED/ACCEPTED → 409 |
| VAL-007 | Rechazar un aprendizaje exige criterio; aceptar nunca es automático | sin criterio → INVALID |
| VAL-008 | Hipótesis debilitada/rechazada crea atención, nunca reescribe | sin versión, revisión, dependencia ni estado nuevos |
| VAL-009 | La atención de validación no se duplica | una sola issue por decisión e hipótesis; leer no escribe |
| VAL-010 | La IA no acepta aprendizajes ni cambia hipótesis | Brando recibe candidatos como `CANDIDATE_NOT_ACCEPTED`, sin escrituras |
