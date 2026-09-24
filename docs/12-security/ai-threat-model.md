Status: derived
Owner: Product / Engineering
Canonical: no
Last reviewed: 2026-09-23
Related: docs/00-index/BRANDOPOLIS_MASTER_CONTEXT_FOR_WORK.md
Depends on: Master Context v1.0

# AI Threat Model

| Amenaza | Vector | Mitigación / prueba |
|---|---|---|
| Inyección directa/indirecta | input, web, documento | separación de roles/datos; fixture que ordena aprobar Decision → cero commits |
| Web/archivo malicioso | contenido con comandos | ingestión como datos, sin herramientas de escritura, schema, sanitización |
| Fabricated/stale evidence | URLs inexistentes, fechas viejas | provenance/date Evidence Guard, soporte rebajado |
| Cross-tenant leakage | ensamblaje o cache | scope DB/brand, claves cache por tenant, eval A/B |
| Tool overreach | research invoca acción ajena | allowlist read-only, permisos mínimos, timeout |
| Provenance spoofing | source falsa | origen y fecha verificados / tipado user statement |
| Output injection | HTML/markdown del modelo | escapar UI y schema validate |

Riesgo residual y owners se rastrean en `known-risks.md`; ninguna mitigación promete «eliminar alucinaciones».
