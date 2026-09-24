Status: canonical
Owner: Product / Engineering
Canonical: yes
Last reviewed: 2026-09-23
Related: docs/00-index/BRANDOPOLIS_MASTER_CONTEXT_FOR_WORK.md
Depends on: Master Context v1.0

# Context Assembler

Entrada: sesión autorizada, workspaceId, brandId, StrategicQuestion, token budget y versión del contexto. Resolver Brand bajo Workspace; seleccionar en orden: Current Approved Decisions → Evidence relevante → Learning aceptado → User Input → Hypothesis activa → historia necesaria. Adjuntar id, tipo, fecha, soporte y provenance; marcar materiales externos como datos no confiables. Rechazar datos de Brand distinta, incluso dentro de Workspace sin permiso. Recortar por relevancia sin eliminar las dependencias críticas ni fingir exhaustividad. Salida: `ContextPacket` inmutable con `contextVersion`, ids incluidos/omitidos y razón de omisión. Contrato y evaluación en `schemas/` y `evals/`.
