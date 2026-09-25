Status: derived
Owner: Product / Engineering
Canonical: no
Last reviewed: 2026-09-23
Related: —
Depends on: —

# Registro

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
