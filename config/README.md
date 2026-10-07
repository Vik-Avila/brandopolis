Status: canonical
Owner: Product / Engineering
Canonical: yes
Last reviewed: 2026-09-24
Related: docs/00-index/source-of-truth.md
Depends on: Master Context v1.0 + hardening brief 2026-09-24

# Configuración versionada

`strategic-method/modules.v1.json` contiene módulos y preguntas aprobadas (activo: `modules.v5.json`, cuyo `journey` lista las nueve secciones del recorrido, y `learning-moments.v5.json` según [ADR-0024](../docs/14-decisions/ADR-0024.md); `dependencies/v5.json` según [ADR-0021](../docs/14-decisions/ADR-0021.md), [ADR-0022](../docs/14-decisions/ADR-0022.md), ADR-0023 y ADR-0024; versiones anteriores conservadas como historial); `dependencies/v1.json` aristas HARD/SOFT/INFORMATIVE permitidas, con tipos de contrato aunque no exista arista INFORMATIVE en M1; `capabilities/v1.json` mapping, `feature-flags/defaults.json` defaults. Cambiar reglas exige nueva versión, prueba de no ciclos y Change Impact regresivo. UI/prompts consumen configuración, no redefinen negocio.
