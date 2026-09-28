# Brandopolis — Technical Debt Register

Última actualización: 2026-09-28

Este documento es un registro vivo de deuda técnica, decisiones temporales y evolución arquitectónica.

> Cada workaround del MVP debe tener identificada su evolución hacia el modelo definitivo.

## Registro de deuda

| ID | Área | Deuda actual | Evolución objetivo | Prioridad |
|---|---|---|---|---|
| TD-001 | Competitive Context | Los descartes usan `idempotency` como almacenamiento temporal de estado. | Entidad explícita de competitive findings/dispositions con `CANDIDATE / ACCEPTED / REJECTED`. | Alta |
| TD-002 | Competitive Research | Los research results no aceptados viven en memoria frontend. | Persistir research runs, findings, fuentes, proveedor, fechas y estado de revisión. | Alta |
| TD-003 | Deduplicación | La identidad semántica usa SHA-256 del `claim`. | Identidad canónica basada en tema, fuentes, entidades y contexto. | Media |
| TD-004 | Strategic Evolution | La evidencia competitiva entra al Brand Context, pero aún no genera impacto sobre premisas. | `evidence -> domains affected -> review suggestion -> human decision`. | Alta |
| TD-005 | Capability Events | Los eventos son user-level y no incluyen `brandId`. | Conservar aprendizaje longitudinal incluyendo origen por marca/contexto. | Alta |
| TD-006 | Capability Assessment | Se cuenta frecuencia de prácticas. | Separar cantidad de práctica de nivel real de competencia. | Alta |
| TD-007 | Competitive Learning | Incorporar/descartar alimentan `Strategic Differentiation`, pero falta evaluación rica. | Evolucionar hacia Market Reasoning y calidad de razonamiento. | Media |
| TD-008 | Open Questions | `OPEN -> ANSWERED` no registra qué investigación respondió la pregunta. | Vincular open question con research run/findings/evidence. | Media |
| TD-009 | Onboarding | La marca se crea antes de finalizar todas las capturas iniciales. | Workflow transaccional o reanudable e idempotente. | Media |
| TD-010 | Competitive Audit | Aceptación/rechazo usan auditoría genérica. | Historial de dominio con actor, disposición, rationale, fuentes y momento. | Media |
| TD-011 | Reject UX | Los descartes persisten pero no existe historial/reconsideración. | Vista de descartados con reconsideración conservando historial. | Baja |
| TD-012 | Automated Tests | RESUELTA 2026-09-27: integración + Playwright cubren onboarding, investigación DEMO, OPEN→ANSWERED, aceptar, descartar, reload, reconciliación, idempotencia, Evidence y capability events. | Mantener cobertura como regression suite al evolucionar el modelo competitivo. | Cerrada |
| TD-013 | Playwright Runtime | E2E depende de `channel: chrome`. | Configuración portable usando Chromium/config por entorno. | Media |
| TD-014 | AI Architecture | Competitive Research usa servicio separado del strategic gateway. | Unificar governance, telemetry, consent y resiliencia manteniendo responsabilidades separadas. | Media |
| TD-015 | Research Provider | RESUELTA 2026-09-27: proveedor Anthropic validado en PILOT con investigación real y web search/fetch. | Mantener smoke controlado y observabilidad sin introducir retries pagados innecesarios. | Cerrada |
| TD-016 | Provenance | Parte de la semántica competitiva se codifica en prefijos textuales. | Metadata estructurada y versionada en Brand Context. | Media |
| TD-017 | Source Grounding | Las URLs de findings se validan sintácticamente, pero aún no se vinculan programáticamente con páginas realmente recuperadas por search/fetch. | Conservar tool-use y vincular cada finding sólo con fuentes efectivamente observadas. | Alta |
| TD-018 | Document Corpus Provenance | Los claims documentales aceptados conservan trazabilidad mediante `document_claims.contextEntityId`, pero las entidades canónicas `user-input`, `hypothesis` y `open-question` no transportan provenance documental directamente. | Incorporar una relación de provenance estructurada y consultable por Context Assembler/UI sin romper los contratos canónicos. | Alta |
| TD-019 | Cross-document Synthesis | La extracción y generación de claims opera por documento para evitar reconciliaciones prematuras. Todavía no existe síntesis explícita de coincidencias, contradicciones y vacíos entre fuentes. | Capa posterior a revisión humana que compare documentos aceptados y genere candidatos de síntesis, nunca cambios automáticos de Brand Context. | Alta |
| TD-020 | Document Validation | El upload aplica whitelist de tipos y límites, pero la validación profunda de contenido/formato debe endurecerse antes de ampliar el piloto. | Verificación por firma/magic bytes, consistencia extensión-MIME y manejo seguro de archivos malformados. | Media |
| TD-021 | Claim Review History | La primera disposición humana de un document claim es inmutable; aún no existe reconsideración/versionado formal de una revisión aceptada o descartada. | Historial explícito de revisiones humanas con versiones, rationale y eventual reconsideración sin reescribir eventos previos. | Media |

## Principios arquitectónicos

1. La IA propone; el humano decide.
2. La evidencia competitiva aceptada forma parte del Brand Context.
3. Nueva evidencia puede reforzar, tensionar o cuestionar premisas existentes.
4. Brandopolis puede sugerir revisión estratégica, pero nunca modificar automáticamente una decisión.
5. Aceptar y descartar son decisiones humanas distintas y ambas deben conservar trazabilidad.
6. Frecuencia de práctica no equivale a dominio de una competencia.
7. Brandopolis debe poder explicar por qué una premisa evolucionó y qué evidencia intervino.
8. Workspaces, testers, usuarios y marcas deben permanecer aislados.

## Flujo objetivo

Investigación
→ hallazgos candidatos
→ evaluación humana

Incorporar
→ Evidence
→ Brand Context
→ análisis de impacto
→ sugerencia de revisión
→ decisión humana

Descartar
→ historial de criterio
→ aprendizaje

Ambos caminos
→ Capability Events
→ Mi aprendizaje

## Deuda cerrada reciente

### TD-015 — Research Provider — RESUELTA 2026-09-27

Anthropic fue validado en PILOT con ejecución real del flujo de investigación competitiva,
incluyendo web search/fetch y respuesta estructurada. La operación real confirmó el contrato
de proveedor y permitió retirar la deuda de validación inicial.

### TD-012 — Automated Tests — RESUELTA 2026-09-27

Cobertura incorporada antes del merge:

- onboarding competitivo;
- investigación DEMO;
- `OPEN -> ANSWERED`;
- incorporar;
- descartar;
- persistencia tras reload;
- nueva investigación con findings previamente revisados;
- idempotencia de aceptación;
- idempotencia de rechazo;
- ningún Evidence para findings rechazados;
- capability events de `Strategic Differentiation`;
- separación entre Brand Context y aprendizaje.

La suite debe mantenerse como regresión durante la evolución del modelo competitivo.

## Próxima deuda prioritaria

### TD-002 — Persistencia de Competitive Research

Persistir research runs, findings, fuentes, proveedor, fecha y disposición humana
para que el estado completo de una investigación sobreviva reload y pueda
explicarse históricamente.

### TD-017 — Source grounding de investigación competitiva

La respuesta estructurada valida formato y URLs, pero todavía no demuestra
programáticamente que cada fuente declarada por el modelo corresponda a una
página realmente recuperada/revisada mediante web search/fetch.

Evolución objetivo:

- conservar referencias de tool-use por research run;
- vincular cada finding con fuentes realmente recuperadas;
- rechazar fuentes no presentes en el conjunto observado;
- conservar provenance verificable para auditoría.
