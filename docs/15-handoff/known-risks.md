Status: canonical
Owner: Product / Engineering
Canonical: yes
Last reviewed: 2026-09-24
Related: docs/00-index/source-of-truth.md
Depends on: Master Context v1.0 + hardening brief 2026-09-24

# Risk Register v2

Escala estimada probabilidad/impacto (alto/medio/bajo); no datos empíricos.

| Riesgo | P/I | Detección | Mitigación / Validación | Fase |
|---|---|---|---|---|
| One-and-done | alto/alto | Return after Blueprint | What changed?; segundo evento piloto | Pilot |
| General AI substitution | medio/alto | preferencia/comparación | probar valor de versiones/Impact | Pilot |
| Overbuilding | alto/alto | P1 durante M1 | scope gate y AGENTS | M1 |
| UX complexity | medio/alto | TTF y abandono | card progresiva, pruebas de usuario | MVP |
| Low WTP | alto/alto | oferta/pago | experimento real | Pilot |
| Consultant dependency | medio/alto | assisted vs product-only | clasificar intervención | Pilot |
| Hallucinations/trust | medio/alto | referencias falsas | Evidence Guard y evals | M1/MVP |
| Weak capability evidence | alto/medio | pre/post inconsistente | behavior y claims prudentes | Pilot |
| AI cost | medio/medio | coste/Decision | budget y gateway | MVP |
| Agency/founder divergence | medio/medio | cohortes | reportar por cohorte | Pilot |
| Prompt injection | medio/alto | fixture malicioso | aislamiento de fuentes/herramientas | M1/MVP |
| Tenant leakage | bajo/crítico | tests intertenant | fail closed y scope | M1 |
| Documentation drift | medio/alto | QA y schema drift | canónicos, foundation:check | continuo |
| Stale Decision overwrite | medio/alto | 409 conflicto | expectedVersion + tests | M1 |
| Metrics definition drift | medio/alto | fórmulas divergentes | metrics canónico versionado | Pilot |
