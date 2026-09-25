# Session State

Current Phase: Competition / MVP Release Candidate Hardening Complete

Current Status: READY FOR DELIVERY — demostración local DEMO y revisión técnica; no producción.

Delivery SHA: commit que incorpora docs/15-handoff/competition-mvp-rc1.md, resoluble con `git log -1 --format=%H -- docs/15-handoff/competition-mvp-rc1.md`. El SHA completo se captura después del commit en el informe final; no se reescribe el commit para incluir su propio hash. Branch: codex/ui-kit-integration.

RC closure: arranque en un comando, perfil aislado, readiness de DB/migraciones, sesión DEMO renovable sin elevar permisos, feedback/bloqueo de acciones y errores legibles. Runbook y revisión de seguridad en docs/15-handoff. Contratos, Bible, schema/config y migraciones preservados.

M1: GREEN. Se conserva el motor transaccional, historial, HARD Needs Review, revisión humana, idempotencia, aislamiento y conflicto entre pestañas.

Visual System: INTEGRATED. Assets y tokens canónicos; glass legible, navegación responsive y foco de drawer. Sin rediseño.

Strategic Vertical Slice: Customer → Business → Position → Message implementado y conectado por las reglas v1. Cuatro decisiones persistentes y versionadas.

Brand Context: UserInput, Evidence, Hypothesis, OpenQuestion, Experiment, Signal y Learning explícitos. Aprendizajes ACCEPTED disponibles en vista de contexto y Context Assembler. Categorías separadas; hipótesis nunca se presentan como evidencia. Presupuesto de caracteres con reserva para información crítica y omisiones declaradas.

Recommendations: DEMO_FIXTURE, alternativas didácticas fijas explícitas. ModelGateway, validación estructurada, guard de referencias, evaluación conservadora y trazas. Usar/modificar exige criterio y commit humano; rechazar no crea decisión. Cambio de contexto invalida propuestas. Sin IA en vivo ni research externo.

Experiment: PLANNED → RUNNING → COMPLETED / INCONCLUSIVE / CANCELLED; PLANNED → CANCELLED autorizado por continuación. Objetivo, criterio de éxito, responsable, relación con Decision/Hypothesis, creación/inicio/cierre persistentes. Completar exige señal. Fechas históricas desconocidas permanecen null.

Signal: observación con fuente, fecha no futura, autor y Experiment en curso. No crea Learning automáticamente.

Learning: CANDIDATE → REVIEWED → ACCEPTED / REJECTED mediante actor humano autorizado. Fuentes y límites conservados. Aceptación repetida del mismo actor idempotente. No cambia decisiones, versiones ni preguntas estratégicas.

Strategic Practice: eventos descriptivos ligados a User, privados y separados de Brand Context. Learning Moments de cuatro módulos con Por qué importa / Qué observar / En tu negocio / Cuidado con. Sin score, gamificación ni LMS.

Blueprint: proyección desde persistencia de decisiones vigentes, Needs Review, dependencias, hipótesis abiertas y aprendizajes aceptados. Sin almacenamiento duplicado ni ruta de escritura estratégica.

Multi-Brand: crear/listar/seleccionar según membership y asignación; etiqueta DEMO. Contexto aislado; borrador de decisión conservado por User/Brand/módulo en sessionStorage al cambiar marca o sección.

Progressive Intake: pregunta opcional «¿Qué estás construyendo?»; UserInput guardado atómicamente al crear Brand. Se puede iniciar incompleta.

Strategic Home: «Tu estrategia hoy» prioriza revisiones, preguntas abiertas, experimentos activos, señales sin interpretación y aprendizajes por revisar. Sin KPIs ficticios.

Competition Demo: pnpm demo:competition crea datos ficticios mediante casos de uso reales; cuatro decisiones, siete versiones, revisiones completadas y un aprendizaje aceptado. Resultado sin credenciales en .local/competition-demo.json. No acredita clientes ni resultados de negocio.

Browser QA: 25/25 Chrome PASS en 1600×1000, 1440×900, 1280×800, 768×1024 y 390×844. M1, stale conflict, contexto, aprobar/modificar/rechazar Recommendation DEMO, cuatro módulos, experimento/señal/aprendizaje, Blueprint, práctica, intake y cambio de marca. Cinco casos adicionales verifican doble submit, pérdida de conexión al guardar y respuesta 401 de sesión vencida sin mensaje crudo. Teclado/Tab/Escape/backdrop/focus return y reduced motion verificados. Capturas inspeccionadas en escritorio y móvil; sin overflow en recorridos comprobados. No se afirma certificación WCAG completa.

Foundation: PASS — Markdown 161 JSON 46 schemas 21 requirements 15 golden cases 13 errors 0. Validación visual integrada PASS.

Tests: pnpm typecheck y pnpm lint PASS. pnpm test 27/27 (13.31 s). pnpm test:integration 27/27 (18.94 s; misma suite, no cobertura adicional). pnpm test:e2e 25/25 (1.7 min). pnpm db:migrate, pnpm demo y pnpm demo:competition PASS. pnpm audit --prod: No known vulnerabilities found. git diff --check verificado antes del commit.

Boot/readiness: competition:start y competition:check PASS normal/aislado. competition:test-boot 1/1 (3.7 s) tras reinicio del perfil aislado; misma marca persistente, Blueprint y recarga en Chrome 390×844. Ctrl+C dejó 3001/55434 sin listener y postmaster.pid ausente, sin borrar datos. /health 200/503 y migraciones incompletas cubiertos; sondeo HTTP real confirmó cinco rutas privadas 404, visitante 401, input inválido 400, CSRF 403 y marca inexistente 404.

Validation environment/time: Windows x64; Node v24.19.0, pnpm 12.4.2, Python 3.12.14, PostgreSQL 17 local. Suite final del 2026-09-24 22:57–23:00 America/Guatemala (2026-09-25 04:57–05:00 UTC); cierre documental posterior. Seguridad acotada PASS, sin HIGH pendiente identificado; riesgos residuales documentados, sin certificación ni afirmación de cero vulnerabilidades.

Database: PostgreSQL 17, 27 tablas, migraciones 0000–0007. 0006 preservada: Experiment/Signal/Learning/enlaces/CapabilityEvent. 0007 aditiva: plan, fechas e índices. Prueba de base limpia, upgrade desde 0005 con DecisionVersion existente y replay sin duplicación; historia comparada exactamente.

Domain Changes: se documenta PLANNED → CANCELLED por instrucción explícita de continuación. No se cambió Product Bible, enums ni schemas v1. Metadatos de plan separados del payload canónico. Telemetría nueva alineada con recommendation_approved/signal_added; learning_created sólo tras aceptación. Historia DEMO anterior conservada sin recalcular métricas.

Known Debt: autenticación/provisioning/recuperación de producción; proveedor IA real y evaluación semántica de calidad; política operativa de retención/borrado personal; backup/restore; auditoría WCAG completa y navegadores distintos de Chrome. Hypothesis no cambia automáticamente tras Learning; revisión de soporte de hipótesis aún pendiente. No hay research en vivo. Gateway mide caracteres y no simula tokens/costo; futuro proveedor requiere cancelación real de red. Datos DEMO locales no son evidencia de piloto.

Blockers: NONE para demostración local y revisión técnica. Producción depende de decisiones técnicas abiertas sobre auth/proveedor/despliegue. Patch independiente no localizado ni cotejado; limitación histórica, no bloqueo administrativo de M1/MVP.

Next Highest Value Task: ejecutar el runbook y pedir red-team de Claude sobre el SHA fijo entregado. Auth de piloto sobre ADR-0004 se mantiene como decisión posterior; no continuar nuevas features en este RC.

Claude Code Review Readiness: READY. Revisar prioridades de handoff/CLAUDE_START_HERE.md y manifiesto docs/15-handoff/competition-mvp-rc1.md sobre el SHA exacto de entrega, sin rediseño.

Git: codex/ui-kit-integration. Checkpoints dd0afdc y 8e1b621 preservados. Correcciones en commits posteriores, sin amend, reset, squash, merge ni force push. 690d1a3 recupera el ciclo; 12103ef registra home/contexto/demo y QA P0. RC1 agrega sólo confiabilidad, validación y handoff. Sin tag, release GitHub ni despliegue.

Historial M1: docs/15-handoff/m1-implementation.md. Evidencia y alcance actual: docs/15-handoff/competition-mvp-implementation.md. Ejecución: LOCAL_HANDOFF.md.
