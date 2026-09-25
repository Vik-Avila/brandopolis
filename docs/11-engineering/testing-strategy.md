Status: derived
Owner: Product / Engineering
Canonical: no
Last reviewed: 2026-09-23
Related: docs/00-index/BRANDOPOLIS_MASTER_CONTEXT_FOR_WORK.md
Depends on: Master Context v1.0

# Estrategia de pruebas

Unit: reglas HARD/SOFT, ordering, estados, soporte. Domain/integration: transacción DecisionVersion, auditoría, impacto, version conflict, idempotency, permisos Workspace/Brand, Signal/Learning. Contract: JSON schemas, source refs, prompt versioning, fallo gateway. Evals: `evals/golden-cases` G01–G10 y adversarial; G05–G08 críticos. E2E: M1 crear Brand→Customer→Positioning→Customer v2→Needs Review→review→recargar. DB: migración y restauración. Telemetry: nombres, cohort/intervention, deduplicación, DEMO/PILOT/PRODUCTION. M1 verifica INV-001–010 y ENG-011–013 dentro del alcance: tests/m1.test.ts y tests/browser/m1.spec.ts. Evidence/Learning se verifican en guards de contrato y rutas excluidas; no se afirma haber implementado sus journeys completos. Ver docs/15-handoff/m1-implementation.md.
