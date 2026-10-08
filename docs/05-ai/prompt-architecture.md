Status: canonical
Owner: Product / Engineering
Canonical: yes
Last reviewed: 2026-09-24
Related: docs/00-index/source-of-truth.md
Depends on: Master Context v1.0 + hardening brief 2026-09-24

# Prompt Architecture v1

Global Principles + Specialized Function + Module Method (`config/strategic-method/modules.v5.json`; versiones anteriores conservadas). Brando usa `prompts/brando-contextual-v6.md` desde [ADR-0026](../14-decisions/ADR-0026.md) (v5: [ADR-0025](../14-decisions/ADR-0025.md)) + authorized Task Packet + Output Contract (`schemas/recommendation.schema.json` o evaluator). El prompt no define estados, tenant scopes, reglas de dependencias ni commit; estos viven en dominio/config y se prueban determinísticamente. Versionar pieza y hash en AI Run. Respuesta contiene rationale estratégico breve auditable, nunca private chain-of-thought. Sin keys, credenciales ni contenido cross-brand. Ejemplos versionados en `prompts/`; fixtures en `evals/`.
