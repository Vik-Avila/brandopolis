# AGENTS.md · M1 FIRST

1. Leer README, SESSION_STATE, [source of truth](docs/00-index/source-of-truth.md), [Product Bible](docs/01-product/product-bible-v1.md), docs canónicos del subsistema y ADRs relevantes.
2. Preservar contrato: ninguna decisión aprobada cambia sin commit humano y versión nueva; IA y chat no tienen permiso de escritura estratégica; aislar Workspace/Brand y Capability Context User.
3. Implementar sólo M1 (Phases 1–5 vertical) antes del MVP. No agregar P1/P2, chat, PDF, dashboards decorativos o integraciones por iniciativa propia.
4. Seguir schemas v1 y config versionada; no acoplar dominio a SDK de IA ni introducir framework/infra sin necesidad documentada.
5. Tests obligatorios: INV-001..010, tenancy, optimistic concurrency, idempotency, old version, HARD Needs Review, no auto cascade, fallbacks sin research. Ejecutar `python3 scripts/foundation_check.py` antes/después de editar contratos.
6. Cambios de contrato requieren docs canónicos, schema/config, prueba, ADR si arquitectura cambia, CHANGELOG y SESSION_STATE. No alterar métricas históricas sin versionar.
7. Si requisito realmente contradice fuente aprobada, detener ese cambio, documentar evidencia y pedir resolución. Final Contract Patch independiente aún no recibido; no afirmar cotejo con él.
