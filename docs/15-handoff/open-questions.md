Status: canonical
Owner: Product / Engineering
Canonical: yes
Last reviewed: 2026-09-24
Related: docs/00-index/source-of-truth.md
Depends on: Master Context v1.0 + hardening brief 2026-09-24

# Preguntas abiertas

**Contrato externo por cotejar:** el hardening brief menciona `BRANDOPOLIS_FINAL_CONTRACT_PATCH_BEFORE_CODEX.md`, no adjuntado/localizado. Las correcciones explícitas del brief sí están implementadas; el contenido adicional del Patch es desconocido y debe revisarse antes de afirmar Foundation plenamente aprobada. **Técnicas:** auth final (Drizzle y sesión M1 resueltos en ADR-0011), proveedor inicial IA, research provider, deployment real, retención/borrado conforme infraestructura. **Piloto:** pricing, WTP, recurrencia, impacto de aprendizaje. No están abiertas la tesis, módulos, autoridad humana, Decision/Context, P0 ni secuencia.


## Resolución humana · 2026-09-24 · Sprint 01
El usuario autoriza implementar M1 sobre los contratos canónicos presentes y corregir drift documental inequívoco. ASSUMPTION_IN_USE es relación/flag de dependencia de una Decision vigente sobre una Hypothesis no validada, nunca status. Las referencias anteriores al Patch independiente describen la limitación histórica de cotejo, no un gate de entrada a M1. No se ha localizado ni se afirma haber cotejado ese archivo. Esta resolución sustituye instrucciones anteriores de esperar ese cotejo para iniciar M1; no cambia Bible, invariantes ni alcance.
