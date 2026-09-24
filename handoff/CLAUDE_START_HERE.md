Status: canonical
Owner: Product / Engineering
Canonical: yes
Last reviewed: 2026-09-24
Related: docs/00-index/source-of-truth.md
Depends on: Master Context v1.0 + hardening brief 2026-09-24

# REVIEW M1 FOR CONTRACT COMPLIANCE

## Role A — Implementation

Si no hay código de Codex y se solicita implementar, seguir la tarea M1 idéntica de `CODEX_START_HERE.md` en una rama aislada, nunca editar en paralelo la misma rama.

## Role B — Independent Review (preferido)

Leer Master/Bible operativa, source-of-truth, state-machines, decision-model, invariants, schemas, config y `m1-acceptance.md`; revisar diff y ejecutar Foundation QA, tests dominio/integración/E2E. Confirmar: IA sin commit; vieja versión preservada; dependencia HARD y Needs Review; no cascade; audit/tenant; optimistic concurrency 409; idempotencia; schemas y telemetría alineados; tests que fallen ante regresión. Reportar hallazgos con ruta, condición reproducible, severidad y test; corregir sólo dentro del alcance M1 si está autorizado. Dejar SESSION_STATE actualizado. No afirmar haber leído Final Contract Patch independiente si falta.
