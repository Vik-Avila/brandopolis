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
| VAL-011 | La procedencia BRANDO_ASSISTED sólo la decide el servidor con una prueba vigente, de un solo uso, del mismo actor, marca, señales e hipótesis | forjada, vencida, ajena, otra marca, otras señales, otra hipótesis, contexto cambiado o reutilizada → MANUAL |
| VAL-012 | Volver a probar abre un ciclo nuevo; un aprendizaje anterior no lo resuelve; REJECTED es final | SUPPORTED/WEAKENED → TESTING; aprendizaje previo → 409; REJECTED → TESTING → 409 |

## Strategic Workspace · ADR-0027 (2026-10-08)

| ID | Invariante | Prueba |
|---|---|---|
| WS-001 | `Market Arena` se muestra como «Mercado objetivo»; clave interna, API y datos no cambian | URL `module=Market%20Arena`, `data-module`, PDF y navegación |
| WS-002 | «Próximamente» nunca es un destino | `aria-disabled`, sin pantalla ni petición |
| WS-003 | Una sola herramienta del rail visible; alternarlas no consulta a la IA ni pierde la respuesta de Brando | `workspace.spec.ts` |
| WS-004 | Una reflexión personal es privada y no escribe Brand Context | `reflection-cases.ts` |
| WS-005 | Inicio deriva su siguiente paso y su progreso del estado real; definida ≠ validada | `workspace.spec.ts`, `workspace-views.test.ts` |

## Eliminar marca · ADR-0029 (2026-10-09)

| ID | Invariante | Prueba |
|---|---|---|
| BRD-001 | Sólo un ADMIN del workspace elimina una marca, tras confirmar su nombre exacto | MEMBER → 403; otro tenant → 404; sin sesión → 401; nombre distinto → 400; sin Origin → 403; nada se borra |
| BRD-002 | Eliminar una marca borra todas sus filas y no toca otra marca del mismo workspace | conteo 0 por tabla; la otra marca idéntica |
| BRD-003 | Las reflexiones personales nunca se borran: se desvinculan conservando autor | `brandId`/`decisionId` a NULL, propias y de colegas |
| BRD-004 | La analítica del piloto se conserva desvinculada; el registro de eliminación no guarda nombre ni contenido | `pilot_events`/`pilot_feedback` con `brandId` NULL |
| BRD-005 | Eliminación idempotente y segura ante concurrencia | misma clave → mismo resultado sin efectos; otra clave → 404; misma clave y otra marca → 409 |
| BRD-006 | La historia y la auditoría sólo se borran dentro de una eliminación autorizada de su marca | `DELETE` directo de versiones/auditoría sigue fallando |
| BRD-007 | Nunca se afirma eliminación completa si los archivos no se purgaron | fallo de purga → `FILES_PENDING`; reintento → `DELETED` |
| BRD-008 | La purga de archivos queda confinada a `<root>/<workspaceId>/<brandId>` | prefijos fuera de la raíz o de otra profundidad → INVALID |
