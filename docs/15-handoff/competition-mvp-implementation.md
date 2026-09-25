Status: derived
Owner: Engineering
Canonical: no
Last reviewed: 2026-09-24
Related: docs/15-handoff/m1-implementation.md
Depends on: Competition MVP continuation authorized 2026-09-24

# Competition MVP · continuidad de implementación

M1 es la base conservada. Los checkpoints dd0afdc y 8e1b621 se inspeccionaron directamente; no se reescribieron ni se trataron como evidencia de validación. La rama de trabajo y publicación es codex/ui-kit-integration. No hay merge ni despliegue.

## Persistencia y migraciones

0006 añade experiments, signals, learnings, learning_signals y capability_events. No elimina tablas ni modifica DecisionVersion. FKs compuestas mantienen la pertenencia de Experimento a Hypothesis/Decision y de Signal a Experiment; Learning tiene enlaces relacionales a sus Signals. CapabilityEvent pertenece sólo a User. Índice personal por userId; índices de scope mediante unique/PK.

0007 añade objetivo, criterio de éxito, inicio/cierre de Experiment e índices de consultas por decisión, hipótesis, experimento y señal. El contrato v1 de Experiment permanece intacto: el plan y fechas de ejecución son metadatos persistentes separados. El backfill usa la declaración de Hypothesis e intendedSignal existentes; no inventa fechas de ejecución. Los timestamps desconocidos anteriores permanecen null.

Prueba PostgreSQL real: base limpia, base separada hasta 0005 con DecisionVersion existente, upgrade completo, replay y comparación exacta de historia. Journal secuencial 0000–0007. Las migraciones publicadas 0000–0006 permanecen intactas.

## Autoridad humana y aprendizaje

Experiment nace PLANNED, admite RUNNING o cancelación antes de iniciar. Desde RUNNING pasa a COMPLETED, INCONCLUSIVE o CANCELLED. Completar exige al menos una Signal; la conclusión la decide la persona, no el sistema. Las transiciones registran actor y fecha en auditoría; inicio/cierre tienen columnas propias.

Signal requiere Experiment RUNNING, observación, fuente y fecha no futura. No crea Learning. Una interpretación se guarda CANDIDATE aun si el cliente intenta enviarla como ACCEPTED. La persona recorre CANDIDATE → REVIEWED → ACCEPTED/REJECTED. Repetir la aceptación del mismo actor es idempotente. El snapshot de fuentes, límites y reviewedBy permanece disponible. Aceptar no cambia decisiones, versiones ni preguntas estratégicas.

Context Assembler distingue Decision, Evidence, Learning aceptado, UserInput, Hypothesis, OpenQuestion e historia pertinente. Reserva presupuesto para decisiones, dependencias, evidencia referenciada y aprendizajes aceptados. Fallar por presupuesto insuficiente es preferible a ocultar contenido crítico. El presupuesto mide caracteres, no tokens. Capability Context jamás se incluye en Brand Context ni en solicitudes del modelo.

Blueprint consulta persistencia: versiones vigentes, Needs Review, conexiones, hipótesis activas y aprendizajes aceptados. No tiene endpoint de escritura estratégica ni almacenamiento duplicado.

## Práctica y asistencia

Cada commit humano emite una conducta descriptiva personal con la capacidad del módulo. No mide competencia, no emite score ni implica mejora demostrada. Learning Moments discretos usan el formato Por qué importa / Qué observar / En tu negocio / Cuidado con. El usuario sólo consulta sus propios eventos.

DEMO_FIXTURE presenta alternativas fijas explícitas, no IA en vivo. ModelGateway valida estructura y límites; Evidence Guard rechaza referencias ausentes; contexto obsoleto impide aprobar recomendaciones. Evaluador conservador exige juicio humano en las seis dimensiones; no certifica calidad estratégica. Detalle en [ADR-0012](../14-decisions/ADR-0012.md).

## Límites reales

Auth y despliegue de producción pendientes; sólo demostración local loopback. Proveedor real OPEN, investigación externa no implementada. No se valida causalidad ni significancia de las señales; la persona declara límites. Las hipótesis no cambian automáticamente al aceptar Learning. Retención/borrado personal, backup/restore y auditoría exhaustiva WCAG no completados. No hay componentes P1/P2.
