Status: derived
Owner: Product / Engineering
Canonical: no
Last reviewed: 2026-09-23
Related: docs/00-index/BRANDOPOLIS_MASTER_CONTEXT_FOR_WORK.md
Depends on: Master Context v1.0

# Principios de código

TypeScript estricto, modular monolith, reglas de dominio fuera de UI/SDK; input/output validados, fail closed en autorización, transacciones para versión+auditoría+impacto, idempotencia en operaciones importantes. `DecisionVersion` es append-only. Contexto de IA se arma tras permiso. Errores tipados (unauthorized, conflict, unavailable, schema_invalid, impact_pending). Identificadores en inglés; docs en español. No inventar funcionalidades P1/P2 ni promesas de resultados. Un cambio de contrato requiere schema version, ADR si arquitectura cambia, test y actualización de doc canónico.
