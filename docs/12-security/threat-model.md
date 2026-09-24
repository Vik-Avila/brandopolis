Status: derived
Owner: Product / Engineering
Canonical: no
Last reviewed: 2026-09-23
Related: docs/00-index/BRANDOPOLIS_MASTER_CONTEXT_FOR_WORK.md
Depends on: Master Context v1.0

# Threat model general

Activos: Brand Context confidencial, Decision audit, Capability Context personal, secrets, métricas piloto. Ataques: enumerar Brand ID, acceso cross-tenant, escalación de membership, session theft, CSRF/input, race/duplicados, copia de prompt, fuga en logs/backups; controles: autorización por scope, auth madura, cookies seguras, validación, concurrency/idempotency, minimización y cifrado, auditoría, backup/restore. Amenazas de IA en [AI threat model](ai-threat-model.md). Tests intertenant y adversarial son gates de M1/piloto. Riesgo residual se documenta, no prometer seguridad absoluta.
