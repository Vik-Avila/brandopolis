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
