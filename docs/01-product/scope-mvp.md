Status: canonical
Owner: Product / Engineering
Canonical: yes
Last reviewed: 2026-10-04
Related: docs/00-index/BRANDOPOLIS_MASTER_CONTEXT_FOR_WORK.md
Depends on: Master Context v1.0

# Scope freeze

**P0 Product:** auth, Workspace, Multi-Brand, Create Brand, Progressive Intake, Strategy Journey, Decision Card, Approve/Modify/Reject, Brand Context current/history, dependency data, Change Impact/Guided Review, Blueprint, Experiment/Signal/Learning, Strategic Practice. **P0 AI:** Gateway, Context Assembler, limited optional Research, Strategic/Activation Analysis, Evaluator, Evidence Guard, structured outputs, prompt version y telemetry. **P0 Capability:** Experience Level, pre, learning moments, mapping/evidence, post, summary. **P0 Validation:** telemetry, cohort/intervention, WTP/payment, ledger. **P0 Security:** authz, tenant isolation, audit, validation, secrets server-side, prompt injection, deletion. P0 describe MVP completo; M1 es corte vertical anterior a MVP.

**P1:** PDF, Ask Brandopolis, chat→candidate question, segundo modelo, invitación/evaluación cliente, búsqueda, dashboard, visualización graph, Challenge Mode, notificaciones, upload documentos, UI inglés, billing. **P2:** SSO, API, Ads/CRM/Canva, automatización, marketplace/white label, credenciales, capability analytics equipos, móvil, graph avanzado, RAG avanzado, foundation model propio. Excluido ahora: generadores gráficos/posts, scheduler, Ads Manager, CRM, web builder, LMS/cursos, agent swarm, enterprise suite, app nativa.

## Resolución humana · 2026-10-04 · Ask Brandopolis → Brando

«Ask Brandopolis» evoluciona conceptualmente a Brandopolis Intelligence / Brando ([brand-intelligence-engine](../05-ai/brand-intelligence-engine.md), [ADR-0015](../14-decisions/ADR-0015.md)). Brando B1 queda autorizado para la siguiente etapa, posterior al PILOT congelado. Esta resolución no reclasifica Ask Brandopolis (sigue en P1 para el MVP), no modifica retrospectivamente el scope del MVP y no habilita cambios en el runtime actual.

## Resolución humana · 2026-10-06 · Objetivo estratégico y Arena de mercado

El propietario reabre el alcance diferido de nuevas decisiones **exclusivamente** para Strategic
Objective y Market Arena (Master Context §14–§15), desarrolladas **fuera de producción**
([ADR-0021](../14-decisions/ADR-0021.md)). No incluye Brand Promise, GTM Priority, Priority
Experiment ni niveles B2–B5, no cambia proveedor, modelo, prompts ni datos enviados a la IA, y no
autoriza migraciones ni operaciones de producción. La Jury Production Freeze sigue vigente.

## Resolución humana · 2026-10-06 · Promesa de marca

El propietario incorpora Brand Promise, **sólo fuera de producción** ([ADR-0022](../14-decisions/ADR-0022.md)):
dependencia estricta Posicionamiento → Promesa → Mensaje, conservando Posicionamiento → Mensaje, sin
revisiones duplicadas. GTM Priority y Priority Experiment siguen diferidos. Sin cambios de IA,
migraciones ni operaciones de producción; la Jury Production Freeze sigue vigente.

## Resolución · 2026-10-06 · Prioridad de lanzamiento

Por instrucción del propietario, GTM Priority se incorpora como siguiente fase del roadmap, **sólo fuera de
producción** ([ADR-0023](../14-decisions/ADR-0023.md)), con la línea del recorrido en la navegación.
Priority Experiment sigue diferido. Sin cambios de IA, migraciones ni operaciones de producción.

## Resolución · 2026-10-06 · Experimento prioritario

Por instrucción del propietario, Priority Experiment se incorpora como siguiente fase del roadmap, **sólo
fuera de producción** ([ADR-0024](../14-decisions/ADR-0024.md)), reutilizando el ciclo Experiment → Signal →
Learning existente. Sin cambios de IA, migraciones ni operaciones de producción.

## Cierre · 2026-10-07 · Phase 1 — Strategic Core + Brando Foundation

PHASE 1 — STRATEGIC CORE + BRANDO FOUNDATION · STATUS: COMPLETE · RELEASE STATE: RELEASE-READY OUTSIDE
PRODUCTION. Las nueve decisiones de la Decision Spine (Strategic Objective, Market Arena, Primary Customer,
Value Mechanism, Positioning, Brand Promise, Core Message, GTM Priority, Priority Experiment) están
implementadas con autoridad humana, versiones, historial, dependencias, Change Impact y Brando B1
([ADR-0021](../14-decisions/ADR-0021.md)–[ADR-0024](../14-decisions/ADR-0024.md)). Signals y Learning siguen como
capacidades base existentes. NEXT PHASE: PHASE 2 — STRATEGIC INTELLIGENCE · STATUS: NOT STARTED.

## Resolución · 2026-10-07 · Phase 2 — Strategic Intelligence

El propietario autoriza la macrofase 2 de 6 fuera de producción ([ADR-0025](../14-decisions/ADR-0025.md)):
coherencia estratégica, tensiones, Change Impact 2.0 explicativo, memoria estratégica 2.0, inteligencia
consciente de la evidencia, Brando como copiloto estratégico y los cuatro JTBD de experiencia (disclosures,
reutilización del contexto de onboarding, paneles colapsables/Modo enfoque y Brando más visible). Phase 3+
no iniciada; sin integración a `main` hasta la aprobación humana.

## Cierre · 2026-10-07 · Phase 2 — Strategic Intelligence

PHASE 2 — STRATEGIC INTELLIGENCE · STATUS: COMPLETE · OWNER ACCEPTED · RELEASE-READY OUTSIDE PRODUCTION
([ADR-0025](../14-decisions/ADR-0025.md)). Smoke de Brando en vivo: NOT RUN, riesgo residual aceptado por el
propietario. NEXT PHASE: PHASE 3 — VALIDATION & LEARNING ENGINE.

PHASE 3 — VALIDATION & LEARNING ENGINE · IMPLEMENTATION COMPLETE · AUTOMATED VALIDATION COMPLETE ·
HUMAN REVIEW PENDING · RELEASE CANDIDATE OUTSIDE PRODUCTION ([ADR-0026](../14-decisions/ADR-0026.md)).

## Resolución · 2026-10-10 · Fase 4 — Marketing, sitios web y colaboración

El propietario confirma 1A (agencias pequeñas y consultores), 2C (sitios completos multipágina con IA, editables
y publicables) y 3C (campañas Google Ads y Meta Ads por API oficial con confirmación humana específica de cada
operación que publique o modifique gasto). Esto reabre, **sólo fuera de producción**, elementos de P1/P2 y de
«Excluido ahora»: invitación y aprobación del cliente, comentarios, exportaciones, web builder, Ads, Canva, guía
de marca viva y calendario social con registro manual de publicación ([ADR-0030](../14-decisions/ADR-0030.md)).
Siguen excluidos CRM general, ecommerce, reservas, membresías, constructor de apps, plataforma de email, LMS,
generadores propios de logos/imágenes, publicación orgánica automática, agent swarm y cambios de facturación.
La aprobación de alcance no autoriza campañas reales, gasto, compras, DNS, migraciones de producción ni
despliegues; la Jury Production Freeze sigue vigente.

Adenda del mismo día: el propietario añade la **ingesta o el desarrollo de la identidad visual** de cada marca,
conectada con todos los canales ([ADR-0034](../14-decisions/ADR-0034.md)). Brandopolis no pasa a ser un generador
propio de logotipos: Brando propone direcciones y los recursos se obtienen por diseñador, por la integración de
Canva del producto o por carga de archivos; generar imágenes con un proveedor nuevo exige una decisión humana
propia. El dominio propio del cliente es una recomendación pendiente de revisión, no parte de esta resolución.

## Resolución · 2026-10-10 14:49 · Aprobación de la Fase 4 y desarrollo autorizado fuera de producción

El propietario respondió «si continuar» a la propuesta de aprobar la fase (paquete BP-P4-V4-APROBADA-20261010,
sobre el candidato v4 `c211b914…d8f9e124`). Quedan **aceptados** [ADR-0030](../14-decisions/ADR-0030.md) a
[ADR-0034](../14-decisions/ADR-0034.md), ADR-0031 con el ajuste C1 obligatorio. Se **incluyen** en la Fase 4: la
pregunta inicial de prioridad, el inicio guiado completo, el dominio propio del cliente con configuración asistida,
las invitaciones por email con enlace de un solo uso como alternativa y los controles de consentimiento (etiquetas
opcionales desactivadas hasta aceptar). Se autorizan implementación, pruebas, DEMO y **migraciones aditivas sólo
en bases aisladas de desarrollo o ensayo**: es la decisión humana nueva que exige
[CLAUDE.md § Pilot freeze](../../CLAUDE.md#pilot-freeze) punto 4, limitada a esos entornos. No autoriza producción,
publicación pública, campañas reales, gasto, compras ni DNS; commit, push y merge siguen las reglas del repositorio.
Pendientes que no bloquean: nombre del dominio de publicación, proveedor de email, textos finales de consentimiento
y accesos de Google, Meta y Canva.

## Resolución · 2026-10-11 · Clientes y Resultados ampliados (issue #10)

Por el [issue #10](https://github.com/Vik-Avila/brandopolis/issues/10) y el plan de Clientes y Resultados
(versión 5), la exclusión histórica de «CRM general» **deja de excluir la captura inicial de oportunidades**. El
propietario aprueba en la Fase 4 **Clientes** como área propia, con registro manual y formulario web persistentes
(origen, fecha, responsable o cola, siguiente seguimiento, segmento conocido y evidencia de campaña disponible), y
**Resultados** con marketing, operación comercial y ventas. El núcleo comercial completo, la mensajería inicial,
Brando como asistente interno del vendedor, atribución/ROAS, asesores y partidas, metas mensuales/trimestrales/
anuales, históricos y forecast de ganados son **Fase 5**; conectores ampliados y la atención automática de Brando
por marca/canal, **Fase 6**. Las frases anteriores que excluían el CRM se conservan como registro de su momento.
Esta resolución no autoriza desplegar, contratar proveedores, adoptar código de terceros (Atomic, Chatwoot), enviar
mensajes a clientes ni gastar. Detalle: [PHASE4_SPEC §12](../15-handoff/PHASE4_SPEC.md).

Precisión sobre el informe de herramientas del 2026-10-11 («WhatsApp y Auto-CRM quedan fuera de Fase 4»): sus
integraciones completas no se añaden por instalar una skill, pero Clientes y la captura inicial **sí** están en la
Fase 4 por decisión del issue #10.

### Roadmap de seis macrofases (sin séptima fase)

| Macrofase | Tratamiento tras el issue #10 |
|---|---|
| 1–3 | Alcance, decisiones e historial vigentes (no se reabren) |
| 4 · Activation & Orchestration | Alcance aprobado el 2026-10-10 + captura inicial de Clientes, Resultados ampliados y prueba acotada de Chatwoot. En la interfaz el área sigue llamándose Marketing |
| 5 · Measurement & Intelligence | Medición prevista + núcleo comercial/Kanban, mensajería inicial, Brando asistente interno, cierre humano, aprendizaje en Validación, atribución/gasto/ROAS, asesores/segmentos/partidas, metas, históricos y forecast de ganados |
| 6 · Agentic Scale | Alcance previo + conectores y conciliación ampliados, atención automática de Brando por marca/canal, seguimiento autorizado, traspaso humano, observabilidad y límites |
