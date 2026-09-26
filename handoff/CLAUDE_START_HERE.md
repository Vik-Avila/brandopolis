Status: canonical
Owner: Product / Engineering
Canonical: yes
Last reviewed: 2026-09-24
Related: docs/00-index/source-of-truth.md
Depends on: Master Context v1.0 + hardening brief 2026-09-24

# REVIEW COMPETITION MVP RC1 FOR CONTRACT COMPLIANCE

## Revisión actual · alcance congelado

Revisar el SHA exacto del informe final de entrega y cotejarlo con `git rev-parse HEAD`; ver [manifiesto RC1](../docs/15-handoff/competition-mvp-rc1.md), [seguridad](../docs/15-handoff/competition-rc1-security-review.md) y [runbook](../docs/15-handoff/competition-demo-runbook.md). No revisar una rama móvil sin fijar SHA. M1 es la base histórica; no reconstruir ni rediseñar el producto.

Prioridades: Human Authority bypass; aislamiento Workspace/Brand; migraciones 0006/0007; Recommendation → Decision; Learning → Decision; separación Signal/Learning; presupuesto Context Assembler; stale context; idempotencia; concurrencia; Blueprint sin escritura estratégica; seguridad; confiabilidad de boot/browser; accesibilidad con impacto real. Reportar evidencia reproducible y severidad. No introducir auth/proveedor real, dominios nuevos, branding o arquitectura. El brief RC autoriza sólo correcciones acotadas a confiabilidad; una contradicción conceptual real requiere resolución humana.

## Role A — Implementation

Si no hay código de Codex y se solicita implementar, seguir la tarea M1 idéntica de `CODEX_START_HERE.md` en una rama aislada, nunca editar en paralelo la misma rama.

## Role B — Independent Review (preferido)

Leer Master/Bible operativa, source-of-truth, state-machines, decision-model, invariants, schemas, config y `m1-acceptance.md`; revisar diff y ejecutar Foundation QA, tests dominio/integración/E2E. Confirmar: IA sin commit; vieja versión preservada; dependencia HARD y Needs Review; no cascade; audit/tenant; optimistic concurrency 409; idempotencia; schemas y telemetría alineados; tests que fallen ante regresión. Reportar hallazgos con ruta, condición reproducible, severidad y test; corregir sólo dentro del alcance M1 si está autorizado. Dejar SESSION_STATE actualizado. No afirmar haber leído Final Contract Patch independiente si falta.
