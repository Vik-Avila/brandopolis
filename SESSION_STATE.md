# Session State

Current Phase: LIVE PILOT LAUNCH GATE — closed by Claude Code.

Gate state: **EXTERNAL-CONFIG READY**. The repository, launch tooling, runbooks and tests are ready; nothing is deployed. No real hosting, OIDC provider or Anthropic API was used. Production: NOT CLAIMED.

Frozen Pilot engineering SHA: af73d0306e6fa0ba99462370a7ab5c1ba0c59f12 (tag brandopolis-pilot-engineering-ready-2026-09-25, branch release/pilot-engineering-ready-2026-09-25; untouched).
Live launch branch: pilot/live-launch-2026-09-25. Commits: b4f5091 (deployment prep), 9469ec2 (docs), b006b91 (launch validation), plus the closing commit that last modifies this file (`git log -1 --format=%H -- SESSION_STATE.md`; full SHA in the gate report).
Frozen RC1: f4946683c8767aedc6c2fc7403d03beb3ab61e04 (untouched).

Delivered in this gate: runtime free of dev-only imports (`pnpm install --frozen-lockfile --prod` + `pnpm pilot:start`, import graph verified); `pilot:validate-config` (offline), `pilot:preflight` (read-only), `pilot:smoke` (post-deploy); single-instance advisory lock; operator bound to the OIDC-discovered issuer; operator `report`; AI data notice with per-tester versioned acknowledgement and daily caps (no schema change); forward-only migration plan with divergence detection; DEMO tools refuse PILOT data; testable hosted backup wrapper; auth/AI/readiness logs without secrets; canonical second High-Value Event metric. Docs: PILOT_RUNBOOK, PILOT_DEPLOYMENT_CONTRACT (environment matrix), LIVE_HOSTING_DECISION, OIDC_PROVIDER_DECISION, AI_PROVIDER_LAUNCH, FIRST_TESTER_COHORT, DOMAIN_DNS_LAUNCH, LIVE_PILOT_LAUNCH_CHECKLIST, launch security review.

Final gate (2026-09-25): typecheck/lint PASS; pnpm test 52/52; test:integration 52/52 (same suite); test:e2e 25/25 (5 viewports); test:pilot:e2e 10/10 over HTTPS; competition:start/check --isolated PASS (9 migrations) and competition:test-boot 1/1; Foundation PASS (errors 0); UI validator --integrated PASS; pnpm audit --prod: No known vulnerabilities found; git diff --check clean. Real-process rehearsal on a scratch PILOT database (local HTTPS discovery endpoint, then dropped): validate-config VALID, pilot:migrate 9 applied then up to date, preflight PASS (backup tools WARN), pilot:start started, launch smoke 8/8 PASS, second instance refused, db:migrate/db:seed refused.

Schema/rollback: no migration added in this gate (still 0000–0008, 9 entries). The frozen build and this build read and write the same database both ways (automated test), so application rollback to af73d030 is supported; database changes are forward-only.

Known deferred risks: in-memory rate limiter (one instance, enforced); pg_dump/pg_restore execution not rehearsed (client tools absent locally); real OIDC provider and real Anthropic API not exercised; non-strategic creates not universally idempotent; no full WCAG audit; Chrome only.

Remaining human decisions: hosting provider and region; dedicated PostgreSQL 17 (DATABASE_URL); OIDC provider (issuer, client ID, secret or public client); PILOT_ORIGIN domain and DNS; Anthropic key, model and spend limit (or AI disabled); request-access destination; approval of the AI data notice text; first testers' OIDC subjects and cohorts.

Next: follow docs/15-handoff/LIVE_PILOT_LAUNCH_CHECKLIST.md. Do not begin a new product phase automatically.

---

## Previous phase (MVP / Pilot engineering)

Current Phase: MVP / PILOT RELEASE — Claude continuation of the Codex Pilot handoff.

Current Status: PILOT READY FOR CONFIGURATION AND FIRST TESTERS once external decisions are supplied (hosting, OIDC provider, domain, Anthropic account). Local DEMO remains ready. Production: NOT claimed.

Frozen RC1 SHA: f4946683c8767aedc6c2fc7403d03beb3ab61e04 (tag brandopolis-rc1-demo-ready-2026-09-24, branch release/rc1-frozen-2026-09-24; untouched).
Codex Pilot handoff: tag pilot-codex-handoff-2026-09-25 → 3ad7cff30be8bab567ff25f71be7f9d91fdd7484 (kept in history, not amended).
Claude Pilot final SHA: commit that adds docs/15-handoff/pilot-security-review.md, resolvable with `git log -1 --format=%H -- docs/15-handoff/pilot-security-review.md`; the full SHA is in the continuation report. Branch: pilot/mvp-release-2026-09-25.

Pilot scope delivered: provider-neutral OIDC login (confidential or public PKCE client, configurable redirect), explicit issuer+subject tester mapping, 8 h revocable sessions, operator CLI (create, assign, inspect, revoke-sessions, disable, classify-session, metrics), per-tester workspaces, multi-brand, DEMO/PILOT database separation enforced at startup, Anthropic adapter on the official SDK behind ModelGateway with safe failure, Pilot telemetry (activation = first approved Decision; Time to First Insight / First Decision via metrics), feedback and issue report, concise onboarding, request-access link, per-client in-memory rate limiting, clean PostgreSQL shutdown for backups, backup/restore and migration-preservation tests. Docs: PILOT_RUNBOOK, PILOT_DEPLOYMENT_CONTRACT, TESTER_GUIDE, COMPETITION_DEMO_GUIDE, pilot-security-review; ADR-0013/0014 updated.

Final gate (2026-09-25): typecheck/lint PASS; pnpm test 42/42 (27 RC1 contract + 3 RC1 review + 12 Pilot); test:integration 42/42 (same suite); test:e2e 25/25 (5 viewports); test:pilot:e2e 10/10 over HTTPS (2 tests × 5 viewports, including real browser OIDC login); competition:start/check --isolated PASS (9 migrations); competition:test-boot 1/1; Foundation PASS (errors 0); UI validator --integrated PASS; pnpm audit --prod: No known vulnerabilities found; git diff --check clean. The developer's local DEMO DB (55432) was forward-migrated to 0008 with pnpm db:migrate (additive).

Known deferred risks: in-memory rate limiting (single instance); pg_dump/pg_restore path not executed locally (no client tools) — rehearse on the chosen host; real OIDC provider and real Anthropic API not exercised (signed fixtures and simulated responses); non-strategic create operations are not universally idempotent (strategic Decision commits are); tester consent for sending Brand context to the AI provider must be collected; no full WCAG audit; Chrome only.

External human decisions required: hosting provider; OIDC provider and its issuer/client credentials; PILOT_ORIGIN domain; Anthropic account, model and budget (suggested model claude-opus-5); request-access destination; tester list (OIDC subjects) and cohorts; data-processing consent text.

Next engineering phase: do not begin automatically. Claude Code: CLOSED after this continuation pass.

---

## Previous phase (RC1)

Current Phase: RC1 Engineering Review Complete — engineering phase CLOSED.

Current Status: READY FOR LOCAL DEMO / TECHNICAL DELIVERY. Production: NOT claimed.

Codex baseline SHA: 538e8af1e84e6145477d4efb7fd2fadfcb856b48 (handoff reviewed independently; not amended).

Claude final closure SHA: commit that adds docs/15-handoff/claude-rc1-independent-review.md, resolvable with `git log -1 --format=%H -- docs/15-handoff/claude-rc1-independent-review.md`; the full SHA is recorded in the closure report (a commit cannot contain its own hash). Branch: codex/ui-kit-integration.

Independent review: Claude Code Pass 1 ACCEPT WITH NON-BLOCKING FINDINGS (0 P0, 0 P1, 4 P2). F-1 fixed (migration count derived from the journal), F-2 fixed (cookie Max-Age = remaining session lifetime, never extended), F-4 covered by test (lost-response retry of a review commit replays without side effects; no implementation change), F-3 deferred. Record: docs/15-handoff/claude-rc1-independent-review.md.

Final gate (2026-09-24, Claude): typecheck/lint PASS; pnpm test 30/30; test:integration 30/30 (same suite); test:e2e 25/25 at 1600×1000, 1440×900, 1280×800, 768×1024, 390×844; competition:start + competition:check PASS on the normal profile (reusing the existing local DB on 55432) and the isolated profile; competition:test-boot 1/1; Foundation PASS; UI validator --integrated PASS; pnpm audit --prod: No known vulnerabilities found; git diff --check clean. Accessibility measured in Chrome (1440×900, 390×844): min text contrast 4.68:1, focus ring 6.15:1, full keyboard-only M1 route with visible focus and no trap, reduced motion leaves no animated element. Not a WCAG or security certification.

Known deferred risks: Non-strategic create operations are not yet universally idempotent. Strategic Decision commits are idempotent. Broader create-operation idempotency is deferred beyond RC1. Plus the production items listed under Known Debt.

Next engineering phase: do not begin automatically. Codex: CLOSED for this phase. Claude Code: CLOSED after this pass.

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

Tests (cierre Codex, antes de la revisión; ver Final gate arriba para el resultado vigente): pnpm typecheck y pnpm lint PASS. pnpm test 27/27 (13.31 s). pnpm test:integration 27/27 (18.94 s; misma suite, no cobertura adicional). pnpm test:e2e 25/25 (1.7 min). pnpm db:migrate, pnpm demo y pnpm demo:competition PASS. pnpm audit --prod: No known vulnerabilities found. git diff --check verificado antes del commit.

Boot/readiness: competition:start y competition:check PASS normal/aislado. competition:test-boot 1/1 (3.7 s) tras reinicio del perfil aislado; misma marca persistente, Blueprint y recarga en Chrome 390×844. Ctrl+C dejó 3001/55434 sin listener y postmaster.pid ausente, sin borrar datos. /health 200/503 y migraciones incompletas cubiertos; sondeo HTTP real confirmó cinco rutas privadas 404, visitante 401, input inválido 400, CSRF 403 y marca inexistente 404.

Validation environment/time: Windows x64; Node v24.19.0, pnpm 12.4.2, Python 3.12.14, PostgreSQL 17 local. Suite final del 2026-09-24 22:57–23:00 America/Guatemala (2026-09-25 04:57–05:00 UTC); cierre documental posterior. Seguridad acotada PASS, sin HIGH pendiente identificado; riesgos residuales documentados, sin certificación ni afirmación de cero vulnerabilidades.

Database: PostgreSQL 17, 27 tablas, migraciones 0000–0007. 0006 preservada: Experiment/Signal/Learning/enlaces/CapabilityEvent. 0007 aditiva: plan, fechas e índices. Prueba de base limpia, upgrade desde 0005 con DecisionVersion existente y replay sin duplicación; historia comparada exactamente.

Domain Changes: se documenta PLANNED → CANCELLED por instrucción explícita de continuación. No se cambió Product Bible, enums ni schemas v1. Metadatos de plan separados del payload canónico. Telemetría nueva alineada con recommendation_approved/signal_added; learning_created sólo tras aceptación. Historia DEMO anterior conservada sin recalcular métricas.

Known Debt: autenticación/provisioning/recuperación de producción; proveedor IA real y evaluación semántica de calidad; política operativa de retención/borrado personal; backup/restore; auditoría WCAG completa y navegadores distintos de Chrome. Hypothesis no cambia automáticamente tras Learning; revisión de soporte de hipótesis aún pendiente. No hay research en vivo. Gateway mide caracteres y no simula tokens/costo; futuro proveedor requiere cancelación real de red. Datos DEMO locales no son evidencia de piloto.

Blockers: NONE para demostración local y revisión técnica. Producción depende de decisiones técnicas abiertas sobre auth/proveedor/despliegue. Patch independiente no localizado ni cotejado; limitación histórica, no bloqueo administrativo de M1/MVP.

Next Highest Value Task: decisión humana sobre la siguiente fase; revisión independiente de Claude completada. Auth de piloto sobre ADR-0004 se mantiene como decisión posterior; no continuar nuevas features en este RC.

Claude Code Review: COMPLETE (ver registro de revisión independiente). Revisar prioridades de handoff/CLAUDE_START_HERE.md y manifiesto docs/15-handoff/competition-mvp-rc1.md sobre el SHA exacto de entrega, sin rediseño.

Git: codex/ui-kit-integration. Checkpoints dd0afdc y 8e1b621 preservados. Correcciones en commits posteriores, sin amend, reset, squash, merge ni force push. 690d1a3 recupera el ciclo; 12103ef registra home/contexto/demo y QA P0. RC1 agrega sólo confiabilidad, validación y handoff. Sin tag, release GitHub ni despliegue.

Historial M1: docs/15-handoff/m1-implementation.md. Evidencia y alcance actual: docs/15-handoff/competition-mvp-implementation.md. Ejecución: LOCAL_HANDOFF.md.
