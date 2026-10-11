Status: canonical
Owner: Product / Engineering
Canonical: yes
Last reviewed: 2026-10-04
Related: docs/00-index/BRANDOPOLIS_MASTER_CONTEXT_FOR_WORK.md, docs/14-decisions/ADR-0015.md, docs/14-decisions/ADR-0010.md, docs/01-product/scope-mvp.md
Depends on: Master Context v1.0; human product decision 2026-10-04 (Brandopolis Intelligence / Brando)

# Brand Intelligence Engine

Capa lógica dentro del monolito: Model Gateway, Context Assembler, Research Layer, Strategic Analysis, Activation Analysis, Strategic Evaluator, Evidence Guard, Decision Engine, Change Impact, Applied Capability y Evaluation Harness. Roles Research Analyst, Strategic Analyst, Activation Strategist y Strategic Evaluator son funciones especializadas, no agentes autónomos. Cada función opera sobre contexto autorizado de una Brand y entrega contrato estructurado; ninguna puede mutar Decision aprobada. Flujo: pregunta → snapshot contexto → análisis → validación de schema/provenance → Recommendation → acción humana → servicio de dominio → reglas de impacto. Falla de proveedor: retorno manejado, operación manual disponible. Coste/latencia/eval bajo observabilidad.

## Brandopolis Intelligence y Brando · decisión humana 2026-10-04

Este documento es el hogar canónico de Brandopolis Intelligence y de Brando. La decisión arquitectónica se registra en [ADR-0015](../14-decisions/ADR-0015.md); la relación con el alcance, en [scope-mvp](../01-product/scope-mvp.md).

**Brandopolis Intelligence** es una capacidad horizontal: la inteligencia que el Brand Intelligence Engine descrito arriba aporta a todo el producto. No sustituye ni reorganiza esa arquitectura; la nombra como capacidad transversal.

**Brando** es la presencia visible de Brandopolis Intelligence: su interfaz para el usuario. No es un chatbot autónomo ni una autoridad estratégica.

### Límites de autoridad

AI proposes. Humans decide. Brandopolis remembers.

- Brando no crea, modifica ni aprueba una Strategic Decision por sí mismo. Toda modificación estratégica requiere acción humana explícita.
- Aplican sin excepción [INV-001 e INV-006](../04-domain-model/invariants.md) y [ADR-0010](../14-decisions/ADR-0010.md) (Human Commit). Lo que Brando produce es propuesta, nunca versión.
- Las funciones especializadas del Engine siguen sin ser agentes autónomos; Brando no cambia esa regla.

### Niveles de evolución

| Nivel | Nombre | Estado |
|---|---|---|
| B1 | Contextual | Autorizado para la siguiente etapa de desarrollo, posterior al PILOT congelado |
| B2 | Strategic Copilot | Autorizado fuera de producción por el propietario el 2026-10-07 ([ADR-0025](../14-decisions/ADR-0025.md)) |
| B3 | Learning Copilot | Autorizado fuera de producción por el propietario el 2026-10-07 ([ADR-0026](../14-decisions/ADR-0026.md)) |
| B4 | Orchestrator | Evolución prevista; requiere decisión humana propia |
| B5 | Agentic Intelligence | Evolución prevista; requiere decisión humana propia |

**Brando B1** puede: comprender la marca activa y la decisión actual; responder preguntas sobre contexto, decisiones, razones y evidencia; explicar Brandopolis; plantear preguntas e hipótesis; hacer sugerencias; señalar contradicciones o elementos que requieren atención; y alimentar «Qué necesita atención».

B1 no modifica el workspace PILOT congelado ni su runtime actual ([CLAUDE.md § Pilot freeze](../../CLAUDE.md#pilot-freeze)).

*Texto histórico (2026-10-04), superado para B2 y B3:* «Los niveles B2–B5 sólo se nombran aquí como dirección; su
alcance y sus límites se definirán cuando se aprueben.»

**Instrucción vigente (conciliación 2026-10-10):** la tabla refleja el estado actual. B1, B2 (ADR-0025) y B3
(ADR-0026) están autorizados **fuera de producción**; ninguna autorización de desarrollo es una autorización de
producción (Jury Production Freeze). B4 y B5 siguen sin autorizar. La Fase 4 ([ADR-0030](../14-decisions/ADR-0030.md)
y [ADR-0034](../14-decisions/ADR-0034.md), propuestos) amplía sólo superficies de propuesta dentro de B2/B3:
Brando no ejecuta, no encola operaciones externas, no publica, no gasta ni cambia permisos.

### Contrato de implementación B1 · 2026-10-04

La etapa B1 se desarrolla fuera de producción por aprobación humana del plan. Contrato de consulta,
selección de datos, autoridad, memoria temporal y validación: [Brando B1](brando-b1.md).
La extensión compatible del Gateway se registra en [ADR-0017](../14-decisions/ADR-0017.md).
La Jury Production Freeze sigue vigente; este trabajo no autoriza despliegue.

## Brando B1 · human proposal review extension

See [ADR-0018](../14-decisions/ADR-0018.md). Human acceptance/modification routes into the
existing human commit of a new Decision version and normal dependency impact. Human rejection
records criterion in Capability Context only. This adds no model authority, automatic cascade,
automatic Learning acceptance or autonomous suggestion generation. Prompt v2 is plain es-MX.

## Phase 2 · Strategic Intelligence · 2026-10-07

Por decisión del propietario (brief de la Iteración 2), Brando evoluciona a copiloto estratégico (nivel B2)
dentro de los mismos límites de autoridad: [ADR-0025](../14-decisions/ADR-0025.md). La inteligencia
transversal (coherencia, tensiones, orden de revisión, memoria y soporte de evidencia) es una proyección
determinista del estado de la marca; Brando la explica sólo a petición explícita. B3–B5 siguen sin autorizar.

## Validación · ADR-0026 (2026-10-07)

`context.validation` (`src/domain/validation.ts`) proyecta hipótesis con uso y pruebas, experimentos en
curso, estancados y no concluyentes, señales sin interpretar, aprendizajes pendientes, balance de señales,
calidad de plan y la siguiente validación recomendada. Strategic Intelligence añade
`VALIDATION_CHALLENGES_DECISION`. Ambas son puras: leer no escribe. Brando B3 (`brando-contextual-v6`)
recibe aprendizajes candidatos como `CANDIDATE_NOT_ACCEPTED`.

## Fase 4 · Brando para marketing · ADR-0030 (2026-10-10)

Superficie de **propuesta** dentro de B2 (sin B4): borradores de los cinco tipos de entregable. Implementación:
`POST /api/brando/marketing` → `Engine.proposeDeliverable` → mismo Model Gateway (tarea `BRANDO_MARKETING`,
prompt versionado `prompts/brando-marketing-v1.md`, schema de salida `marketing-proposal-v1`, método opcional
`propose` del proveedor; uno sin él responde `UNAVAILABLE` y la edición manual sigue).

- **Contexto mínimo autorizado** (una marca, ADMIN o MEMBER asignado): nombre de la marca, versiones vigentes de
  las decisiones, ofertas activas **aprobadas** (versión aprobada) y prioridades de 90 días activas del año en
  curso. Nunca borradores, otras marcas, Mi aprendizaje, comentarios, credenciales ni datos de invitados. El texto
  de la persona viaja como `UNTRUSTED_USER_TEXT` (máx. 1000 caracteres).
- **Controles:** la llamada al proveedor ocurre fuera de transacción; tras la respuesta se vuelve a autorizar y se
  compara la huella del contexto (cambio → 409, nada se devuelve). La salida se valida contra el schema, sólo puede
  citar ids del paquete y su cuerpo debe ser un borrador válido del tipo pedido (`deliverable-version` v1); si no,
  `INVALID_OUTPUT`. Misma ruta que las demás llamadas de IA: limitador, aviso de datos de IA y tope diario.
- **Sin escrituras:** pedir una propuesta no crea entregables, versiones, aprobaciones, publicaciones ni auditoría
  (evals `evals/brando-marketing.json`, casos de inyección incluidos, con cero escrituras).
- **Procedencia decidida por el servidor:** sólo una prueba en memoria, de un solo uso, emitida a esa persona para
  esa marca y ese tipo, marca el borrador creado como `AI_ASSISTED`; cualquier otro caso es `MANUAL`. La prueba nunca
  se envía al proveedor ni concede autoridad.
- **DEMO:** propuesta determinista construida sólo con el paquete, etiquetada «Propuesta de ejemplo (modo DEMO, no
  generada por IA)». Live AI no se ha ejecutado para esta superficie.
