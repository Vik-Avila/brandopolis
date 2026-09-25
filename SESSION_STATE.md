# Session State

Current Phase: Engineering — Competition MVP
Current Milestone: M1 COMPLETE; NEXT-A–NEXT-F completados como shell P0 local. Siguiente gate: review independiente de M1.

## Completed

- Corregido drift ASSUMPTION_IN_USE en Brand Context y reconciliation log. Bible, schemas v1 y config intactos.
- TypeScript modular monolith, PostgreSQL 17 real, Drizzle, 17 tablas y 3 migraciones reproducibles.
- Sesión humana server-side, memberships/asignación Brand, tenant-scoped read/write, validación de inputs.
- Commit humano con expectedActiveVersion, idempotencia/fingerprint, versionado, audit atómico y outbox.
- HARD Needs Review determinista, ReviewItem y explicación, sin edición downstream ni cascade; pending/retry visibles.
- Guided Review con receipt de impacto visto, Positioning v2 e historial persistente.
- Shell Customer/Positioning/Impact/Brand Context, demo CLI reproducible, comandos locales documentados.

## Tests

- pnpm typecheck: PASS, exit 0.
- pnpm lint: PASS, exit 0.
- pnpm test: PASS, 20/20 (dominio, contratos, PostgreSQL real, HTTP E2E).
- pnpm test:integration: misma suite explícita; resultado registrado en cierre de Sprint 01.
- pnpm test:e2e: PASS, 4/4 en Chrome, 1440×1000 y 390×844. Flujo completo y conflicto entre pestañas; reload e historial; teclado en disclosure; sin overflow ni errores JS en flujo principal.
- pnpm db:migrate: PASS, 3 migraciones aplicadas; replay de migraciones probado sin duplicación.
- pnpm demo: PASS, 4 versiones conservadas y ReviewItem COMPLETED.
- pnpm audit --prod: No known vulnerabilities found.
- Inspección visual: capturas Needs Review escritorio y historial final móvil en test-results/.
- Revisión de secretos: 0 hallazgos en 198 archivos candidatos; valores privados locales no están en archivos versionables.
- E2E detectó preparación concurrente duplicada; corregida en operación transaccional y reejecutada 4/4 en verde.

Foundation Check: PASS — Markdown 137 JSON 33 schemas 21 requirements 15 golden cases 13 errors 0.

## Technical Decisions

ADR-0003 ACCEPTED (Drizzle); ADR-0011 runtime y boundary de sesiones opacas DEMO. ADR-0004 proveedor auth final OPEN, sin bloqueo M1. Estados DB derivados de JSON schemas; restricciones SQL custom versionadas. Lecturas/commits serializados por Brand para corrección conservadora.

## Known Debt

Auth/provisioning/recuperación de cuenta y despliegue de producción pendientes. Sólo DEMO local/loopback; seed no representa onboarding público. Wrapper embedded-postgres beta fijado sólo dev. Impacto pendiente requiere reintento explícito. Bases de prueba conservadas localmente para diagnóstico. Backup/restore, otros navegadores y auditoría exhaustiva de accesibilidad no verificados. INV-005/007 probadas como guards/boundaries; sus journeys completos quedan fuera de M1.

## Blockers

Ninguno para revisión de M1. No habilitar producción/piloto con auth DEMO. Patch independiente no localizado ni cotejado; limitación histórica de signoff, no gate M1 por resolución humana 2026-09-24. No se inventa contenido del Patch.

Next Recommended Task: Claude Code review de autoridad, transacciones, tenancy, sesiones, migraciones y concurrencia según docs/15-handoff/m1-implementation.md. Corregir hallazgos antes de ampliar alcance.
Claude Review Ready: YES

Git: codex/m1-connected-decision-proof; sin merge/deploy. Ver git log para commits y remote tracking para push.

## Sprint Competition MVP · Phase A
Visual System integrado sobre M1: assets canónicos, tokens, glass legible, drawer, copy ES, revisión mantener/modificar con commit humano, historial y conflicto con borrador conservado. M1 preflight 20/20, browser inicial 4/4. Nueva autorización amplía P0 más allá de M1; no requiere reconstrucción ni revisión externa previa como gate. Rama actual codex/ui-kit-integration.

## Phase C y Blueprint
Customer → Business → Position → Message implementado sobre los mismos commits/versiones. Migración 0003 añade preguntas faltantes sin tocar decisiones existentes. Dependencias sólo de config v1. Blueprint es proyección de current state. Tests motor 21/21; browser ampliado conserva regresión.

## Phase D · Contexto explícito
UserInput, Evidence, Hypothesis y OpenQuestion persistentes por Brand; captura humana con schemas v1, fecha/actor y auditoría. Context Assembler conserva decisiones/dependencias críticas, marca fuentes externas y declara omisiones por presupuesto de caracteres. Cambios de contexto invalidan recomendaciones previas. Tests 22/22; typecheck/lint PASS. Aún pendiente Learning aceptado e historia relevante en packet.

## Phases E/F · asistencia DEMO y autoridad humana
ModelGateway, adaptador DEMO_FIXTURE explícito, validación estructurada, guard de referencias, evaluación conservadora y trazas persistentes. Decision Card permite usar/modificar y aprobar con rationale humano o rechazar sin crear DecisionVersion. Contexto obsoleto bloquea la propuesta. Proveedor real OPEN; no hay inferencia en vivo. ADR-0012 documenta límites. Tests motor 23/23; no regresión M1.
