Status: derived
Owner: Product / Engineering
Canonical: no
Last reviewed: 2026-09-23
Related: —
Depends on: —

# Registro

## MVP FASES 1–9 · cierre final · 2026-09-25

- Frontend canónico integrado: gateway público (hero, pilares, «Cómo funciona» con Flow), acceso y solicitud de acceso, workspace con KPIs reales, tarjeta de decisión, impacto, revisión guiada, historial en línea de tiempo y Blueprint; Strategic Glassmorphism por tokens.
- Sólo 10 assets de runtime seleccionados; favicon y manifest conectados (rutas corregidas); CSP sin cambios.
- Sonda `/api/session-state` sin errores de consola para visitantes; `pnpm pilot:ai-smoke` para el primer smoke con proveedor real.
- Suite visual (`pnpm test:visual`) y capturas canónicas reales; corrección de una carrera en el helper de navegación de pruebas.
- Documentos: cierre de fases 1–9, alcance diferido post-MVP, bucles de aprendizaje, mapeo de assets y auditoría visual; dominio canónico brandopolis.ai.

## LIVE PILOT LAUNCH GATE · 2026-09-25 · EXTERNAL-CONFIG READY

- Runtime PILOT sin dependencias de desarrollo; `tsx` como dependencia de runtime.
- Nuevos comandos: `pilot:validate-config`, `pilot:preflight`, `pilot:smoke`; `pilot:operator report`.
- Instancia única garantizada por lock de PostgreSQL; operador vinculado al issuer de discovery.
- Aviso de datos IA con aceptación versionada y topes diarios; logs de auth, IA y readiness sin secretos.
- Plan de migraciones forward-only con detección de divergencia; herramientas DEMO rechazan bases PILOT.
- Pruebas: 52 de motor/contrato, 10 de navegador PILOT, ensayo real de procesos PILOT.
- Documentos de lanzamiento: hosting, OIDC, IA, cohorte, DNS y checklist; runbook y contrato de despliegue actualizados.

## MVP / PILOT · continuación de Claude · 2026-09-25

- Se conserva el checkpoint de Codex (acceso OIDC, sesiones, CLI, migración 0008, feedback, telemetría, adaptador IA).
- Corregida la carrera de apagado de PostgreSQL: `stopLocalDb` usa `pg_ctl stop -w` sobre su propio clúster y espera el cierre real antes de copiar.
- OIDC neutral: cliente público PKCE opcional, redirect configurable, fallos redirigen con motivo y nunca emiten sesión.
- Límite de solicitudes por cliente y por sesión (antes global); logout siempre limpia la cookie; errores de configuración legibles sin secretos.
- Adaptador Anthropic sobre el SDK oficial con errores tipados; telemetría `recommendation_requested`.
- CLI: `inspect`, `revoke-sessions`, `metrics` (activación, tiempo a primera propuesta y decisión). Onboarding breve y enlace de solicitud de acceso.
- DEMO y PILOT rechazan bases con datos de la otra clase.
- Pruebas: 42 de motor/contrato, 10 de navegador PILOT por HTTPS con login OIDC real, preservación de datos RC1 creada por el motor RC1 congelado y respaldo → cambio → restauración.
- Documentación: PILOT_RUNBOOK, PILOT_DEPLOYMENT_CONTRACT, TESTER_GUIDE, COMPETITION_DEMO_GUIDE y revisión de seguridad PILOT.

## RC1 · cierre de revisión independiente de Claude · 2026-09-24

- `competition:check` deriva el número de migraciones del journal (F-1).
- La cookie de sesión expira con la sesión real; nunca la extiende (F-2).
- Pruebas nuevas: mensaje de migraciones, Max-Age de cookie y reintento de commit de revisión tras respuesta perdida (F-4). Motor 30/30.
- Idempotencia de creaciones no estratégicas diferida y documentada (F-3). Sin cambios de dominio, migraciones, dependencias ni marca.

## Competition MVP RC1 · 2026-09-24

- Arranque de concurso en un comando, perfil aislado, readiness de DB/migraciones y recuperación local de sesión DEMO sin elevar permisos.
- Feedback de acciones, bloqueo de doble envío y mensajes seguros ante desconexión, conflicto o sesión vencida; borrador de Decision preservado.
- Pruebas de resiliencia y smoke de boot; runbook, manifiesto RC y revisión acotada de seguridad. Sin cambios de dominio, Bible, migraciones ni dependencias.

## 2026-09-23
- Fundación documental provisional, contratos de dominio, IA, seguridad, validación y handoff.
- Registrado bloqueo de reconciliación con Product Bible y Gates no localizados.

## Reconciliación 2026-09-23
- Master Context v1.0 incorporado íntegro como consolidación aprobada; bloqueo conceptual resuelto.
- Estado y secuencia de etapas actualizados; narrativa IEBS 90 días archivada como historia.
- Contratos de dominio, UX, IA, seguridad, validación, JSON schemas, config, prompts y eval fixtures completados.
- QA transversal y handoff M1 para Codex/Claude Code.

## 2026-09-24 Foundation hardening
- Corregidos StrategicQuestion/Hypothesis/Experiment/BrandDomain estados, Assumption relationship e INFORMATIVE.
- Evidence/Recommendation/Evaluator y telemetría reconciliados con schemas y ejemplos.
- ADR status, root-level local handoff, .env.example, .gitignore y QA script.
- Final Contract Patch independiente ausente, registrado como blocker de signoff.

## 2026-09-24 Sprint 01 — preflight
- Corregido drift de Assumption in Use en Brand Context y reconciliation log según resolución humana. Bible y schemas sin cambios.
- Registrada autorización M1 sin atribuir contenido al Patch ausente.
- Foundation QA usa UTF-8 y excluye dependencias/artefactos locales; jsonschema instalado desde requirements-foundation.txt en .venv.

## 2026-09-24 Sprint 01 — núcleo M1
- Motor relacional real con versiones, human commit, concurrencia optimista, idempotencia, audit e impacto posterior recuperable.
- Migraciones PostgreSQL, sesiones DEMO, tenant/Brand, reviews ligados a impacto visto y contratos validados.
- 18 pruebas PostgreSQL/HTTP, typecheck y lint en verde; Foundation 0 errores.
- ADR-0011 decide Drizzle y boundary de sesión M1; auth final pendiente.

## 2026-09-24 Sprint 01 — cierre M1 + P0 contiguo
- Shell local con Customer, Positioning, impacto, revisión humana, contexto vigente e historial; NEXT-A–NEXT-F completados.
- Integridad referencial adicional y guards DB de autoridad humana/pointer vigente; Recommendation valida contexto y registra divergencia.
- Corregida preparación concurrente de preguntas detectada por prueba de dos pestañas, sin cambiar máquina de estados.
- 20 pruebas dominio/PostgreSQL/HTTP y 4 E2E Chrome en escritorio/móvil; typecheck/lint verdes; demo real ejecutada.
- Documentados setup, comandos, límites DEMO y handoff de revisión. No IA live, P1/P2, merge ni despliegue.

## Competition MVP · sistema visual
- Integración sobre runtime existente con tokens y assets canónicos, sin framework nuevo.
- Estados visibles en español, historial con actor y revisión explícita; drawer con foco, Escape y backdrop.
- Pruebas M1 conservadas; ampliación a cinco viewports.

## Competition MVP · vertical estratégico
- Preguntas canónicas Business/Message persistentes para marcas nuevas y existentes, sin pérdida de datos.
- Dependencias Customer/Business/Position/Message desde config v1; sin cascade.
- Blueprint de decisiones vigentes y estados de revisión; pruebas dominio y navegador ampliadas.
- Validador UI soporta --integrated: evita exigir archivos excluidos deliberadamente al copiar el kit; conserva hashes y guards visuales.

### Contexto estratégico persistente
- Añade entidades explícitas, captura humana y Context Assembler acotado, con aislamiento de Brand y trazabilidad de procedencia.
- Migra de forma aditiva sin modificar decisiones históricas; prueba límites de contexto y autorización.

### Recomendaciones DEMO trazables
- Conecta ModelGateway, evaluación y Evidence Guard con Decision Cards persistentes.
- Conserva aprobación/modificación humana y rechazo auditado; bloquea contexto obsoleto y referencias inventadas.
- Declara explícitamente alternativas fijas, soporte UNVALIDATED y proveedor real pendiente.

### Recuperación de checkpoints · aprendizaje y práctica
- Preserva dd0afdc/8e1b621 y valida instalación limpia, upgrade desde 0005 y replay sin pérdida de historial.
- Completa cancelación planeada, aceptación idempotente, presupuesto reservado y plan/fechas de Experiment mediante migración 0007 aditiva.
- Conserva Signal separado de Learning, revisión humana, práctica personal y Blueprint derivado.

### Continuación P0 · recorrido Competition MVP
- Añade home estratégica con prioridades reales y contexto que incluye aprendizajes aceptados.
- Valida intake opcional, separación multi-brand y borradores personales conservados al navegar.
- Completa Decision Card con evidencia/supuestos y refuerza foco del drawer, navegación activa y legibilidad de dependencias.
- Añade demo reproducible de cuatro decisiones, siete versiones y aprendizaje aceptado; amplía QA de navegador a 20 escenarios.
- Alinea los nuevos eventos con el catálogo y separa interpretación candidata de aceptación; conserva telemetría DEMO histórica sin reescribirla.
