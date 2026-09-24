Status: derived
Owner: Product / Engineering
Canonical: no
Last reviewed: 2026-09-23
Related: docs/00-index/BRANDOPOLIS_MASTER_CONTEXT_FOR_WORK.md
Depends on: Master Context v1.0

# Límites de seguridad

Browser no contiene secretos ni acceso directo a DB/model SDK. API autentica, autoriza Workspace/Brand y valida input. Domain Decision Engine acepta sólo actor humano autorizado; workers IA crean Recommendation y telemetry, jamás DecisionVersion. Research/web/uploads son datos no confiables. Storage conserva columnas de tenant y audit; logs generales excluyen textos confidenciales. Demo/Pilot/Production se segregan por flag y dataset, con procesos de borrado y backup. Threat models en `docs/12-security/`.
