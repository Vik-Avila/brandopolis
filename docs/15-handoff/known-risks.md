Status: canonical
Owner: Product / Engineering
Canonical: yes
Last reviewed: 2026-10-04
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
| Skill Pack routing gaps (diferido 2026-10-04) | bajo/medio | revisión de diffs y evals de activación | Routing en un solo sentido: brandopolis-security y brandopolis-brando no remiten de vuelta a brandopolis-feature (clasificación, gate de base de datos), brandopolis-brando no remite a brandopolis-security, y ningún skill ni la tabla de `AGENTS.md` cubre la subida y el parseo de documentos (`src/documents/`). Diferido para no ampliar el Skill Pack en su primera versión; no lo bloquea, porque feature es el punto de entrada y review exige los checks por ruta | Hardening |
| Handoff docs before production (deuda documental 2026-10-04) | medio/medio | lectura de arranque | `NEXT_DEVELOPER_START_HERE` (líneas sobre configuración externa pendiente, rama de handoff y OIDC no configurado), `GOOGLE_AUTH_PRODUCTION` (veredicto «falta configuración») y `README.md` aún describen el estado previo a producción. Corregir con evidencia en una reconciliación dedicada; SESSION_STATE es la fuente del estado desplegado | Pilot |
| Document decompression (zip bomb) | bajo/alto | memoria y latencia al extraer documentos subidos | deuda técnica registrada 2026-10-04, sin corregir: `src/documents/extractor.ts` comprueba `MAX_XML_BYTES` de PPTX sólo después de descomprimir y DOCX (mammoth) no tiene tope de descompresión; acotar antes de inflar | Pilot |
