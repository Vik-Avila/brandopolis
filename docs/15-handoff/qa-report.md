Status: derived
Owner: Product / Engineering
Canonical: no
Last reviewed: 2026-09-24
Related: docs/00-index/source-of-truth.md
Depends on: Master Context + hardening brief

# QA de Foundation · 2026-09-24

- Resultado automatizado: `Markdown 135 JSON 27 schemas 21 requirements 15 golden cases 13 errors 0`. Se comprobaron enlaces locales, JSON parse, JSON Schema Draft 2020-12 y sus ejemplos, cobertura mínima de schemas, enums de dominio, ADR status, requisitos referidos por evals y ausencia de casos duplicados.
- Revisión semántica: estados StrategicQuestion/Hypothesis/Experiment/BrandDomain, Assumption relation, Evidence dimensions, evaluator/issues, HARD/SOFT/INFORMATIVE y Telemetry nullable concordantes. Referencias «fase idea/90 días» están explícitamente etiquetadas históricas; el Master original se conserva intacto.
- No se ejecutaron tests de producto: no existe aplicación.
- **Hallazgo abierto QG-04:** `BRANDOPOLIS_FINAL_CONTRACT_PATCH_BEFORE_CODEX.md` se menciona en el brief pero no fue adjuntado ni encontrado. No es posible validar/aplicar contenido desconocido.
- El viejo QA con cero problemas queda sustituido por este informe; no afirmar «sin blockers» hasta cotejar el Patch.


## Resolución humana · 2026-09-24 · Sprint 01
El usuario autoriza implementar M1 sobre los contratos canónicos presentes y corregir drift documental inequívoco. ASSUMPTION_IN_USE es relación/flag de dependencia de una Decision vigente sobre una Hypothesis no validada, nunca status. Las referencias anteriores al Patch independiente describen la limitación histórica de cotejo, no un gate de entrada a M1. No se ha localizado ni se afirma haber cotejado ese archivo. Esta resolución sustituye instrucciones anteriores de esperar ese cotejo para iniciar M1; no cambia Bible, invariantes ni alcance.
