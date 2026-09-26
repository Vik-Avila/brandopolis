# M1 · implementación y evidencia Sprint 01

Este documento conserva la evidencia histórica del Sprint 01. El alcance actual posterior a M1 se describe en [Competition MVP](competition-mvp-implementation.md) y [SESSION_STATE](../../SESSION_STATE.md); las limitaciones de generación, tablas y viewports indicadas abajo corresponden a aquel cierre.

Motor M1 y shell P0 local implementados. Monolito modular TypeScript, PostgreSQL 17 real, Drizzle, Ajv sobre schemas v1, HTTP nativo, HTML/CSS/JS. Sin llamadas IA, research, chat, billing, PDF ni módulos extra. [Ejecución local](../../LOCAL_HANDOFF.md), [ADR-0011](../14-decisions/ADR-0011.md).

## Persistencia y autoridad

17 tablas: users, workspaces, memberships, sessions, brands, brand_assignments, questions, recommendations, decisions, decision_versions, dependencies, review_items, review_receipts, impacts, strategic_audit, idempotency y telemetry.

Tres migraciones: esquema; guards de historial/graph; integridad referencial/autoridad humana. FKs compuestas evitan referencias intertenant/interbrand; active/previous pertenecen a la misma decisión; secuencias únicas/positivas; una versión APPROVED; historial/audit protegidos contra sobrescritura/borrado; ciclos rechazados. Pointer vigente verificado al commit. Enums DB derivados de schemas; JSON v1 sin cambios.

Aplicación resuelve usuario/workspace desde sesión opaca, membership activo y asignación Brand. Sin endpoint de commit IA/chat. Lock por Brand serializa comandos; expectedActiveVersion rechaza stale; fingerprint detecta reutilización distinta de key. Idempotencia se verifica antes de estado/concurrencia para repetir éxitos. Preparación de pregunta recorre estados canónicos bajo lock; dos pestañas pueden preparar la misma versión sin transiciones duplicadas.

Versión+supersede+audit+outbox atómicos. Impacto posterior en otra transacción idempotente: fallo deja IMPACT_PENDING visible, bloquea nuevos commits estratégicos y permite reintento. HARD no depende de evaluator; SOFT sugiere; INFORMATIVE explica. Sin cascade de contenido ni propagación HARD indirecta. Receipt liga revisión humana a actor, versión y triggers vistos; nuevo cambio upstream exige otra revisión.

Recommendation opcional: referencia validada en Brand/Question y contextVersion (hash determinista de IDs de decisiones/versiones vigentes). Divergencia humana se guarda MODIFIED y audit conserva referencia. No se implementó generación de recomendaciones ni journey IA.

## Criterios e invariantes

| Criterios M1 | Evidencia |
|---|---|
| 1–3 User, Workspace, Brand | Seed autorizado, createBrand, memberships y aislamiento |
| 4–6 Customer, Positioning, HARD | Commits y dependencia desde config v1 |
| 7–10 cambio, concurrencia, v1/v2 | Requests simultáneos, stale, SUPERSEDED y pointer vigente |
| 11–14 impacto, Needs Review, ReviewItem, razón | Fixture canónico, PostgreSQL, HTTP y browser |
| 15–17 revisión, Positioning v2, historia | Receipt humano, versión nueva y reload/conexión nueva |
| 18–20 audit, tenancy, pruebas | Audit/rollback, intertenant/interbrand y suites automatizadas |

- INV-001/006: AI/sin sesión/actor falsificado denegados; rutas de escritura chat/IA ausentes.
- INV-002/003: nuevas versiones humanas; historial protegido incluso en DB.
- INV-004: lectura/escritura tenant y asignación Brand; FKs compuestas.
- INV-005: schema guard rechaza Evidence sin provenance.
- INV-007: Signal no valida como Learning; Learning revisado/aceptado exige reviewedBy y no existe ruta automática. Esto no implementa el journey completo Evidence/Signal/Learning.
- INV-008: contenido downstream intacto; sin cascade.
- INV-009: conflicto real de requests y pestañas sin sobrescritura.
- INV-010: retries simultáneos, una versión/audit/review y rollback completo.
- ENG-011: M1 no incorpora Capability Context a Brand ni expone acceso a ese contexto personal.
- ENG-012/013: sin research; HARD determinista sin evaluator en la ruta.

## QA y P0 contiguo

Resultados finales en [SESSION_STATE](../../SESSION_STATE.md). Vitest: tests/m1.test.ts sobre PostgreSQL nativo 17 y HTTP real, migración repetida sin duplicados. Playwright: tests/browser/m1.spec.ts, Chrome 1440×1000 y 390×844. Capturas de Needs Review y estado final inspeccionadas; sin overflow horizontal. No se ejecutó despliegue, otros browsers ni auditoría exhaustiva de accesibilidad.

NEXT-A ejecución documentada; NEXT-B shell journey/decisión/contexto; NEXT-C Customer; NEXT-D Positioning; NEXT-E impacto/revisión humana; NEXT-F estado vigente e historial. Sin polish expansivo.

## Límites y próximo gate

- Sesiones DEMO CLI; auth/provisioning/recuperación de cuenta y despliegue de producción pendientes antes de piloto.
- Wrapper embedded-postgres beta fijado, sólo dev; producción requerirá PostgreSQL externo y decisión de despliegue.
- Locks por Brand conservadores; evaluar contención antes de optimizar.
- IMPACT_PENDING se reintenta explícitamente; sin scheduler distribuido. Bases de test se conservan localmente para diagnóstico.
- Patch independiente ausente/no cotejado. Bible intacta. Resolución humana habilita M1 sobre fuentes presentes.

Siguiente tarea: review independiente por Claude Code, con énfasis en autoridad, transacciones y sesión. Corregir hallazgos verificados antes de habilitar piloto o ampliar módulos. Sin merge/deploy automático.
