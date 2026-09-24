Status: derived
Owner: Product / Engineering
Canonical: no
Last reviewed: 2026-09-23
Related: docs/00-index/BRANDOPOLIS_MASTER_CONTEXT_FOR_WORK.md
Depends on: Master Context v1.0

# Observabilidad del sistema

Trace id une petición, comando, transacción, job de impacto y telemetría. Métricas operativas: errores de autorización/tenancy, conflictos de versión, reintentos idempotentes, `impact_pending` y retraso de cola, DB p95, uptime, jobs fallidos. IA específica en [ai-observability](../05-ai/ai-observability.md), validación de producto en [metrics](../09-validation/metrics.md). Logs minimizan datos; nunca incluir prompts íntegros o secretos. Alerta si commit humano no produce auditoría o if HARD dependency no genera ReviewItem.
