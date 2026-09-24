Status: derived
Owner: Product / Engineering
Canonical: no
Last reviewed: 2026-09-23
Related: docs/00-index/BRANDOPOLIS_MASTER_CONTEXT_FOR_WORK.md
Depends on: Master Context v1.0

# Estrategia de migraciones

Esquemas relacionales versionados con herramienta ORM por elegir; primera migración tras ADR ORM/auth. Expand → deploy compatible → backfill idempotente → verificar → contract después de ventana de rollback. No reescribir ni purgar versiones de Decision en migración ordinaria. Incluir workspaceId/brandId y constraints desde inicio; indexes en `(workspace_id, brand_id)` y `(decision_id, sequence)`, unique idempotency key por scope. Test migración en datos demo y restauración de snapshot, con estrategia de rollback por release. Separar datos DEMO/PILOT/PRODUCTION y evaluar políticas de retención antes de MVP piloto.
