# BRANDOPOLIS — MASTER CONTEXT FOR CHATGPT WORK

## Documento maestro de contexto previo al Engineering Foundation Repository

**Versión:** 1.0  
**Fecha:** 23 de septiembre de 2026  
**Estado:** Producto conceptualmente congelado — listo para Engineering Foundation  
**Uso previsto:** ChatGPT Work → Engineering Foundation Repository → Codex / Claude Code  
**Idioma principal:** Español  
**Dominio oficial:** brandopolis.ai

---

# 1. PROPÓSITO DE ESTE DOCUMENTO

Este archivo existe para proporcionar a ChatGPT Work una visión completa, coherente y autosuficiente de Brandopolis antes de preparar el repositorio maestro de ingeniería.

Debe permitir que Work comprenda el proyecto sin depender de reconstruir toda la historia de conversaciones.

Este documento NO sustituye la Product Bible ni los Gates originales cuando estén disponibles, pero resume y consolida sus decisiones esenciales.

La jerarquía de autoridad es:

1. Product Bible v1.0
2. Gates aprobados y sus correcciones posteriores
3. Gate 11 / Red Team
4. Este Master Context
5. Material de concursos y documentos históricos
6. Conversaciones antiguas
7. Nuevas recomendaciones técnicas

Si existe una contradicción, debe prevalecer la decisión más reciente y formalmente aprobada.

---

# 2. DEFINICIÓN CENTRAL DE BRANDOPOLIS

Brandopolis es una plataforma SaaS B2B AI-native que convierte información, evidencia y criterio humano en un sistema persistente de decisiones estratégicas conectadas para construir, gestionar y hacer evolucionar una marca, mientras ayuda a las personas a desarrollar capacidades estratégicas mediante la aplicación directa sobre su propio negocio.

En términos simples:

> Brandopolis ayuda a una persona a entender mejor su negocio, identificar qué necesita decidir, recibir apoyo de IA para analizar alternativas, tomar una decisión humana explícita, conservarla, conectarla con otras decisiones y saber qué debe revisar cuando cambian las condiciones.

---

# 3. CATEGORÍA, TAGLINE Y TESIS

## Categoría aspiracional

**The Brand Operating System**

Esta expresión debe tratarse como visión/categoría propietaria, no como una categoría universal ya establecida.

## Descriptor funcional

**AI-native strategic decision system for brands**

En español:

**Sistema AI-native de decisiones estratégicas para marcas.**

## Tagline

**De la idea a la marca. De la marca al mercado.**

## Tesis

**Production is abundant. Strategy is scarce.**

Y:

**AI made execution cheap. Brandopolis makes strategic thinking scalable.**

La tesis de fondo es que la IA ha hecho más abundante la producción, pero el criterio estratégico sigue siendo escaso.

---

# 4. EL PROBLEMA QUE RESUELVE

Las organizaciones producen cada vez más:

- contenido;
- análisis;
- documentos;
- campañas;
- recomendaciones de IA;
- presentaciones;
- outputs aislados.

Sin embargo, el razonamiento estratégico sigue fragmentado entre:

- personas;
- chats;
- documentos;
- presentaciones;
- herramientas;
- memoria individual.

Los problemas derivados son:

- reconstrucción repetitiva de contexto;
- pérdida del porqué de decisiones anteriores;
- contradicciones entre decisiones;
- dependencia de personas senior;
- falta de continuidad cuando cambia el equipo;
- IA que produce respuestas sin conocer el estado estratégico real;
- cambios upstream que no se reflejan downstream.

Brandopolis busca convertir esa fragmentación en un sistema estratégico persistente.

---

# 5. LO QUE BRANDOPOLIS NO ES

Brandopolis NO es principalmente:

- generador de logos;
- generador de imágenes;
- generador de posts;
- social media scheduler;
- CRM;
- Ads Manager;
- website builder;
- plataforma de email marketing;
- Canva competitor;
- LMS;
- academia;
- marketplace de cursos;
- chatbot generalista;
- consultoría automática;
- sustituto autónomo de un estratega;
- generador de brand books.

Estas capacidades podrían integrarse en el futuro, pero no definen el MVP ni el producto central.

---

# 6. PRINCIPIO HUMANO + IA

Filosofía central:

**AI proposes. Humans decide. Brandopolis remembers.**

Y:

**People learn by building.**

La IA puede:

- investigar;
- organizar;
- sintetizar;
- comparar;
- proponer;
- explicar;
- cuestionar;
- evaluar coherencia.

La persona:

- establece intención;
- prioriza;
- decide;
- acepta trade-offs;
- modifica;
- rechaza;
- aprueba.

Regla no negociable:

> Ninguna decisión estratégica aprobada puede ser modificada silenciosamente por IA.

---

# 7. UNIDAD FUNDAMENTAL DEL PRODUCTO

La unidad fundamental es:

## STRATEGIC DECISION

No es:

- prompt;
- chat;
- documento;
- contenido;
- agente.

Una Strategic Decision debe poder contener:

- Strategic Question;
- contexto;
- Evidence;
- Hypotheses;
- Options;
- Recommendation;
- Rationale;
- Trade-offs;
- Human Decision;
- Dependencies;
- Version;
- Author;
- Date.

La principal unidad de valor del producto es:

**Connected Strategic Decision Made and Remembered**

En español:

**Decisión estratégica conectada, tomada y recordada.**

---

# 8. BRAND CONTEXT

Brand Context es el estado estratégico vivo y estructurado de una Brand.

Debe contener lo que la organización:

- sabe;
- declara;
- infiere;
- supone;
- decide;
- ejecuta;
- observa;
- aprende.

No es:

- chat history;
- mega prompt;
- brand book;
- archivo único;
- texto gigante.

Es:

**Structured Strategic State**

Debe distinguir:

- Current State
- History

---

# 9. OBJETOS DEL BRAND CONTEXT

Los objetos conceptuales aprobados son:

## Strategic Question
¿Qué necesitamos decidir?

## User Input
¿Qué declaró el usuario/organización?

## Evidence
¿Qué información sustentada tenemos?

## Inference
¿Qué podemos deducir razonablemente?

## Hypothesis
¿Qué creemos pero aún no sabemos?

## Recommendation
¿Qué propone Brandopolis?

## Decision
¿Qué aprobó la persona?

## Dependency
¿Qué depende de qué?

## Open Question
¿Qué falta comprender?

## Experiment
¿Cómo reducimos incertidumbre?

## Signal
¿Qué ocurrió realmente?

## Learning
¿Qué concluimos de lo ocurrido?

---

# 10. ASSUMPTION

Assumption no es una entidad base separada.

Una Hypothesis se marca como:

**ASSUMPTION_IN_USE**

cuando una Decision depende temporalmente de esa hipótesis antes de ser validada.

---

# 11. STRATEGY GRAPH

Strategy Graph representa:

**Decisions + Dependencies**

Brand Context contiene todo el estado estratégico.

Strategy Graph contiene las decisiones vigentes y cómo se relacionan.

Para MVP:

- no usar Graph Database;
- implementar relaciones mediante estructura relacional;
- priorizar reglas explícitas;
- usar IA sólo donde la semántica sea realmente necesaria.

Principio:

**Rules first + AI where semantics matter.**

---

# 12. CHANGE IMPACT

Change Impact es la principal prueba tecnológica del producto.

Ejemplo:

Primary Customer cambia de:

Small Agencies

a:

Internal Marketing Teams.

Brandopolis debe:

1. conservar la versión anterior;
2. crear la nueva versión;
3. actualizar Current State;
4. recorrer Dependencies;
5. marcar Positioning como Needs Review;
6. evaluar Core Message;
7. evaluar GTM;
8. explicar por qué;
9. proponer Review in Order.

Importante:

**Guided Cascade = sí.**

**Automatic Cascade = no.**

El sistema nunca debe reescribir automáticamente decisiones downstream aprobadas.

---

# 13. METODOLOGÍA ESTRATÉGICA

Macro journey:

**IDEA → MARCA → MERCADO → APRENDIZAJE**

Módulos:

1. Understand
2. Market
3. Customer
4. Business
5. Position
6. Brand
7. Message
8. Go-to-Market
9. Experiment & Learn

Cada módulo debe resolver al menos una Strategic Question principal y producir una Decision principal.

---

# 14. DECISION SPINE V1

Secuencia principal:

Strategic Objective  
↓  
Market Arena  
↓  
Primary Customer  
↓  
Value Mechanism  
↓  
Positioning  
↓  
Brand Promise  
↓  
Core Message  
↓  
GTM Priority  
↓  
Priority Experiment  
↓  
Signals  
↓  
Learning

Prioridad máxima de profundidad para el MVP:

**Customer → Business → Position → Message**

Éste es el vertical slice crítico.

---

# 15. LAS NUEVE DECISIONES PRINCIPALES

## Understand
Pregunta: ¿Qué estamos intentando construir o cambiar?  
Decision: Strategic Objective.

## Market
Pregunta: ¿En qué arena debemos competir inicialmente?  
Decision: Market Arena.

## Customer
Pregunta: ¿Quién debe ser nuestro cliente prioritario?  
Decision: Primary Customer.

## Business
Pregunta: ¿Cómo creamos y capturamos valor para ese cliente?  
Decision: Value Mechanism.

## Position
Pregunta: ¿Qué posición estratégica queremos ocupar frente a las alternativas?  
Decision: Positioning.

## Brand
Pregunta: ¿Qué debe significar nuestra marca para ese cliente?  
Decision: Brand Promise.

## Message
Pregunta: ¿Qué idea principal queremos que comprenda y recuerde el cliente?  
Decision: Core Message.

## GTM
Pregunta: ¿Dónde y cómo debemos concentrar inicialmente nuestros recursos?  
Decision: GTM Priority.

## Experiment
Pregunta: ¿Qué supuesto crítico debemos validar primero?  
Decision: Priority Experiment.

---

# 16. DECISION QUALITY

Brandopolis no pretende saber automáticamente cuál es “la estrategia correcta”.

Busca mejorar las condiciones del proceso de decisión.

Una Decision bien estructurada debe intentar contener:

- contexto;
- Evidence;
- Alternatives;
- Hypotheses;
- Trade-offs;
- Rationale;
- coherence with previous Decisions;
- traceability.

Nunca presentar una Recommendation como verdad objetiva.

---

# 17. SUPPORT LEVEL

No usar porcentajes falsos.

Usar:

- Strong Support
- Moderate Support
- Limited Support
- Unvalidated

Support describe la fuerza del soporte disponible, no la probabilidad matemática de que una estrategia “funcione”.

---

# 18. AI SYSTEM

La capa se llama:

## BRAND INTELLIGENCE ENGINE

Componentes conceptuales:

1. Model Gateway
2. Context Assembler
3. Research Layer
4. Strategic Analysis
5. Activation Analysis
6. Strategic Evaluator
7. Evidence Guard
8. Decision Engine
9. Change Impact Engine
10. Applied Capability Layer
11. AI Evaluation Harness

No convertirlos necesariamente en microservicios.

---

# 19. AI ROLES

Conceptualmente:

- Research Analyst
- Strategic Analyst
- Activation Strategist
- Strategic Evaluator

En ingeniería deben tratarse preferentemente como funciones/servicios especializados.

Evitar:

- agent swarm;
- agentes teatrales;
- muchos agentes conversando entre sí;
- autonomía innecesaria.

---

# 20. CONTEXT ASSEMBLER

No enviar todo el Brand Context a cada llamada de IA.

Prioridad de contexto:

1. Current Approved Decisions
2. Relevant Evidence
3. Relevant Learnings
4. User Inputs
5. Active Hypotheses
6. Historical Context relevante

La IA debe recibir sólo el contexto necesario para la Strategic Question actual.

---

# 21. RESEARCH

Research es importante pero NO puede ser una hard dependency.

Regla:

**Core Product Must Work With User Context Only.**

Research mejora:

- Market;
- Competition;
- Alternatives;
- Evidence.

Pero First Decision y Decision Loop no deben depender de live web search.

---

# 22. EVIDENCE

Evidence externo requiere:

- source;
- date;
- claim;
- provenance.

Si no existe provenance, no debe presentarse como Evidence.

Puede clasificarse como:

- Inference;
- Hypothesis.

---

# 23. AI OUTPUT CONTRACT

Toda operación estratégica importante debe producir Structured Output.

Ejemplo de campos:

- Strategic Question;
- options;
- recommendedOption;
- rationale;
- evidenceReferences;
- hypothesesUsed;
- tradeoffs;
- supportLevel;
- affectedDomains.

No basar estado estratégico en parsing frágil de prose libre.

---

# 24. STRATEGIC EVALUATOR

Dimensiones:

- Relevance
- Evidence
- Differentiation
- Coherence
- Actionability
- Decidability

Resultados:

- PASS
- PASS WITH CAUTION
- REVIEW REQUIRED

El evaluator NO es una autoridad absoluta.

Debe complementarse con:

- deterministic validation;
- schemas;
- rules;
- golden cases;
- human authority.

---

# 25. MODEL STRATEGY

Brandopolis debe ser model-agnostic.

El MVP puede comenzar con un solo proveedor.

Pero debe existir:

**Model Gateway**

La lógica del producto no debe depender directamente de un SDK de proveedor.

Registrar:

- provider;
- model;
- module;
- task;
- prompt version;
- context version;
- tokens;
- latency;
- cost;
- result;
- evaluation.

---

# 26. APPLIED CAPABILITY LAYER

Brandopolis también busca desarrollar capacidades mientras el usuario trabaja.

No es un LMS.

No es academia.

No son cursos.

Paradigma:

**Learning in the Flow of Real Work**

Unidad de aprendizaje:

**Strategic Decision**

---

# 27. CAPACIDADES PRINCIPALES

1. Problem Framing
2. Market Reasoning
3. Customer Understanding
4. Business Model Thinking
5. Strategic Differentiation
6. Brand Thinking
7. Message Prioritization
8. GTM Prioritization
9. Experimentation & Learning
10. Strategic AI Collaboration

Metacapacidades:

- critical thinking;
- evidence-based reasoning;
- trade-off thinking;
- decision-making under uncertainty;
- adaptability.

---

# 28. BRAND CONTEXT VS CAPABILITY CONTEXT

Separación no negociable:

**Brand Context pertenece a Brand.**

**Capability Context pertenece a User.**

Un User puede trabajar con múltiples Brands y conservar su historial de práctica.

---

# 29. CAPABILITY EVIDENCE

Ejemplo:

Customer Understanding:

- comparó segmentos;
- revisó Evidence;
- distinguió Buyer/User;
- modificó Recommendation;
- aprobó ICP.

No afirmar “mastery”.

Usar evidencia descriptiva de práctica.

---

# 30. PRE / POST

Para piloto:

Pre:

- short self-assessment;
- short knowledge check;
- experience level.

Post:

- equivalent self-assessment;
- equivalent knowledge check;
- applied behavior.

No usar un score único de “emprendedor” o “Strategic IQ”.

---

# 31. UX PARADIGM

Brandopolis será:

## STRATEGIC WORKSPACE

No chat-first.

Desktop-first.

Tres zonas principales:

LEFT:
Strategy Journey.

CENTER:
Decision Workspace.

RIGHT:
Relevant Brand Context.

---

# 32. STRATEGIC DECISION CARD

Es el principal componente UX.

Debe poder mostrar:

- Strategic Question;
- Why this matters;
- What we know;
- What we assume;
- Options;
- Recommendation;
- Why;
- Trade-offs;
- Support;
- Approve;
- Modify;
- Reject.

Usar progressive disclosure.

---

# 33. CHAT

Chat es secundario.

Puede:

- explicar;
- aclarar;
- brainstorm.

Pero:

**Conversation Does Not Change Strategy.**

Una conversación puede convertirse en Candidate Strategic Question.

Sólo un flujo estructurado y human-approved puede modificar Brand Context.

---

# 34. PRIMER USO Y RECURRENCIA

Primera pregunta icónica:

**What are you building?**

Uso recurrente:

**What changed?**

Esta segunda pregunta es clave para la recurrencia del producto.

---

# 35. HOME

No dashboard de vanidad.

Debe responder:

**¿Qué necesita mi atención?**

Por Brand:

- open Strategic Question;
- Decisions Needs Review;
- active Experiment;
- new Learning;
- next action.

---

# 36. BLUEPRINT

Brand Strategy Blueprint es una vista/snapshot del Brand Context.

No es source of truth.

Debe mostrar:

- Business;
- Market;
- Customer;
- Business Model;
- Positioning;
- Brand;
- Message;
- GTM;
- Experiments;
- Assumptions;
- Open Questions.

Puede versionarse.

---

# 37. BUSINESS MODEL

SaaS B2B recurrente.

No se monetiza únicamente la creación de estrategia.

Se monetiza:

**la continuidad de inteligencia estratégica.**

Primary value metric:

**Active Brand**

Secondary:

**Users / Collaboration**

---

# 38. PACKAGING CONCEPTUAL

## Solo
Founder / individual professional.

## Professional
Consultant / multi-brand professional.

## Agency / Team
Multiple Brands + collaboration.

Enterprise:

later.

Pricing definitivo:

NOT LOCKED.

Debe validarse.

---

# 39. BEACHHEADS

## Commercial Beachhead

Small agencies + consultants.

## Impact Beachhead

Founders + SMEs in LATAM.

No son productos distintos.

Mismo producto.

Diferente valor dominante.

---

# 40. PRINCIPAL RIESGO COMERCIAL

**One-and-done.**

El usuario podría crear su estrategia y no regresar.

Por eso debe medirse:

**Return after Blueprint**

La tesis SaaS no se considera validada hasta observar recurrencia real.

---

# 41. PILOTO

Founding Pilot:

12–20 users.

Cohort A:

6–10 agencies / consultants.

Cohort B:

6–10 founders / SMEs.

Todos deben utilizar negocios reales.

No casos ficticios como evidencia principal.

---

# 42. HUMAN INTERVENTION LABELS

Cada uso del piloto debe marcarse:

- Product-only
- Assisted
- Concierge

Objetivo:

separar valor del software de valor de intervención humana.

---

# 43. VALIDATION HYPOTHESES

H1 Problem  
H2 Product  
H3 Differentiation  
H4 Recurrence  
H5 Monetization  
H6 Capability  
H7 Technical Viability

---

# 44. ACTIVATION

Activation:

**First Strategic Decision Approved**

Targets experimentales:

Time to First Insight median ≤ 10 minutes.

Time to First Decision median ≤ 25 minutes.

Activation Rate target v1 ≥ 70%.

At least 60% total should ideally reach first decision without substantial human intervention.

Son targets de piloto, no claims públicos.

---

# 45. RETENTION

High-Value Strategic Event:

- Strategic Question;
- Decision;
- Review;
- Change Impact;
- Experiment;
- Signal;
- Learning.

Target v1:

≥50% de activados con segundo High-Value Event dentro de 14 días.

No llamar PMF.

---

# 46. SECOND BRAND RATE

Para agency/consultant cohort:

Second Brand Created.

Target experimental v1:

≥40%.

Es una señal fuerte de multi-brand value.

---

# 47. MONETIZATION

Debe existir una oferta real.

La señal más fuerte:

**Real Payment**

No usar solamente “sí pagaría”.

Target orientativo:

≥30% de activados avanzando inequívocamente hacia compra/aceptación comercial.

Interpretar con prudencia por tamaño de muestra.

---

# 48. EVIDENCE LEDGER

Toda futura afirmación relevante debe rastrearse.

Campos:

- claim ID;
- claim;
- hypothesis;
- source;
- cohort;
- N;
- period;
- result;
- limitations;
- allowed language;
- status.

Estados:

- Unvalidated
- Observed
- Directional
- Supported in Pilot

Nunca usar “Proven”.

---

# 49. DEMO / PILOT / PRODUCTION

Todo dato debe etiquetarse:

- DEMO
- PILOT
- PRODUCTION

Nunca mezclar.

---

# 50. MVP CORE LOOP

El MVP debe demostrar:

Create Brand  
↓  
Capture Context  
↓  
Strategic Question  
↓  
Evidence / Hypotheses  
↓  
Options  
↓  
AI Recommendation  
↓  
Human Approve / Modify / Reject  
↓  
Decision  
↓  
Brand Context  
↓  
Next Connected Decision  
↓  
Change Upstream Decision  
↓  
Change Impact  
↓  
Guided Review  
↓  
Updated Strategy

Si esto funciona:

Brandopolis existe.

Si sólo genera texto:

Brandopolis no existe.

---

# 51. MVP MUST / P0

## Product

- authentication;
- Workspace;
- Multi-Brand;
- Create Brand;
- Progressive Intake;
- Strategy Journey;
- Decision Card;
- Approve / Modify / Reject;
- Brand Context;
- Current State;
- Decision History;
- Dependency Graph data;
- Change Impact;
- Guided Review;
- Blueprint;
- Experiment;
- Signal;
- Learning;
- Strategic Practice.

## AI

- Model Gateway;
- Context Assembler;
- Research limited;
- Strategic Analysis;
- Activation Analysis;
- Strategic Evaluator;
- Evidence Guard;
- Structured Outputs;
- Prompt Versioning;
- AI Telemetry.

## Capability

- Experience Level;
- Pre Assessment;
- Learning Moments;
- Capability Mapping;
- Capability Evidence;
- Post Assessment;
- Capability Summary.

## Validation

- Product Telemetry;
- Cohort Tags;
- Intervention Classification;
- WTP Capture;
- Payment Outcome;
- Evidence Ledger.

## Security

- Authentication;
- Authorization;
- Tenant Isolation;
- Audit;
- Input Validation;
- Secrets Server-side;
- Prompt Injection Mitigation;
- Deletion Process.

---

# 52. SHOULD / P1

- Blueprint PDF;
- Ask Brandopolis;
- Chat → Strategic Question;
- Second AI Provider;
- Team Invite;
- Client Review;
- Internal Search;
- Pilot Dashboard;
- Strategy Graph Visualization;
- Challenge Mode;
- Notifications;
- Document Upload;
- English UI;
- Subscription Billing.

---

# 53. LATER / P2

- Enterprise SSO;
- Public API;
- Ads integrations;
- CRM integrations;
- Canva integration;
- Content automation;
- Marketplace;
- White label;
- Credentialing;
- Team capability analytics;
- Native mobile;
- Advanced Graph DB;
- Advanced RAG;
- Proprietary foundation model.

---

# 54. EXPLICITLY DO NOT BUILD NOW

Do not build:

- logo generator;
- image generator;
- social scheduler;
- Ads manager;
- CRM;
- website builder;
- LMS;
- course library;
- marketplace;
- autonomous agent swarm;
- enterprise suite;
- native app.

---

# 55. TECHNICAL BASELINE

Preferred baseline unless strong evidence dictates otherwise:

- TypeScript
- Modular Monolith
- Next.js or equivalent modern TypeScript full-stack framework
- PostgreSQL
- Drizzle OR Prisma after ADR comparison
- Zod or equivalent schema validation
- pnpm
- Vitest
- Playwright
- Docker
- GitHub Actions

Do NOT introduce without demonstrated need:

- Kubernetes
- Microservices
- Kafka
- Graph DB
- Vector DB

---

# 56. DATABASE PRINCIPLE

Relational core.

Important domain objects must be queryable.

Do not model the entire product as arbitrary JSON blobs.

JSON can be used where reasonable, but:

- Decision;
- Evidence;
- Dependency;
- Versions;

should remain explicit and structured.

---

# 57. SECURITY NON-NEGOTIABLES

- Tenant isolation.
- Workspace authorization.
- No cross-brand leakage.
- Server-side secrets.
- Secure sessions.
- Strategic audit log.
- Input validation.
- Prompt injection mitigation.
- Data deletion process.
- Capability data separated from Brand data.

Brand Context should be treated as Confidential Business Data.

---

# 58. AI SECURITY

Threats to cover:

- prompt injection;
- indirect prompt injection;
- malicious web content;
- malicious uploaded files;
- fabricated evidence;
- stale evidence;
- cross-tenant leakage;
- tool overreach;
- provenance spoofing.

External research content must always be treated as untrusted data.

---

# 59. TECHNICAL INVARIANTS

At minimum:

## INV-001
AI Recommendation cannot create Approved Decision directly.

## INV-002
Approved Decision changes only via new human-approved version.

## INV-003
Superseding never deletes history.

## INV-004
Tenant A cannot read Tenant B Brand Context.

## INV-005
External Evidence presented as Evidence requires provenance.

## INV-006
Chat content cannot silently modify Brand Context.

## INV-007
A Signal is not automatically a Learning.

## INV-008
Downstream Decisions are never auto-rewritten by Change Impact.

---

# 60. PRIMARY ENGINEERING MILESTONE

## M1 — CONNECTED DECISION PROOF

Done means:

1. user creates Brand;
2. Brand has Customer Decision;
3. Brand has Positioning Decision;
4. Positioning depends on Customer;
5. user changes Customer;
6. old Customer version remains;
7. new Customer version becomes current;
8. Positioning becomes Needs Review;
9. explanation is shown;
10. user reviews Positioning;
11. state persists.

Do not add accessory features until this milestone works.

---

# 61. DEFINITION OF DONE — MVP

A real user can:

1. create account;
2. create Workspace;
3. create Brand;
4. add context;
5. face Strategic Question;
6. inspect Evidence;
7. receive Options;
8. receive Recommendation;
9. Approve / Modify / Reject;
10. create persistent Decision;
11. complete connected Decisions;
12. return later;
13. see intact Brand Context;
14. change previous Decision;
15. see Change Impact;
16. review downstream Decision;
17. create Experiment;
18. add Signal;
19. create Learning;
20. update Blueprint;
21. see Capability Evidence;
22. complete Post Assessment;
23. do so without Brandopolis founder operating the product for them.

---

# 62. PRINCIPALES RIESGOS

1. One-and-done.
2. General AI substitution.
3. Overbuilding.
4. UX complexity.
5. Low WTP.
6. Consultant dependency.
7. AI trust / hallucinations.
8. Weak capability evidence.
9. High AI cost.
10. Agency / founder divergence.
11. Prompt injection.
12. Tenant leakage.

All should be observable or testable.

---

# 63. RED TEAM CORRECTIONS ALREADY APPROVED

Four important corrections are already part of the final design:

## A. Research
P0 limited but core must work without it.

## B. Strategy Graph
Rules-first + AI semantic evaluation where necessary.

## C. Nine modules
Nine exist architecturally; four receive maximum initial depth:
Customer → Business → Position → Message.

## D. Applied Capability
Fundamental, but visibility adapts and must not create unnecessary friction for professionals.

Do not reopen these unless new evidence requires it.

---

# 64. COMMUNICATION PRINCIPLE

Complexity belongs to the system.

Clarity belongs to the user.

**Complexity in the system. Clarity in the experience.**

---

# 65. WHY NOT CHATGPT?

The product must answer this through behavior, not marketing.

A general assistant can help answer a question.

Brandopolis:

- preserves the human Decision;
- knows the current strategic state;
- knows dependencies;
- keeps versions;
- separates Evidence from Hypothesis;
- detects Change Impact;
- guides review;
- records Learning.

This is the practical differentiation.

---

# 66. TEC PRIZE LENS

For TecPrize, Brandopolis should be framed primarily as:

**AI Strategic Work Copilot / WorkTech**

Key themes:

- Human-Centered AI;
- Future of Work;
- Learning in the Flow of Work;
- Strategic Capability;
- Adaptability;
- AI literacy;
- founders / SMEs / LATAM.

Core human thesis:

> AI can increasingly produce the work; Brandopolis helps people preserve and develop the judgment needed to direct, evaluate and adapt that work.

Do not transform product into traditional EdTech.

---

# 67. IEBS LENS

For IEBS, frame Brandopolis as:

**The Brand Operating System**

Key themes:

- SaaS B2B;
- recurring value;
- multi-brand;
- persistent context;
- scalability;
- methodology;
- differentiation;
- business model;
- founder-market fit.

Same product.

Different lens.

---

# 68. CLAIMS POLICY

## Safe now

Can claim:

- structured context;
- decision traceability;
- human approval;
- connected decisions;
- Change Impact mechanism;
- methodology;
- learning embedded in workflow;
- AI-assisted reasoning.

## Only after MVP

Can claim working functionality only when implemented.

## Only after Pilot

Can claim observed:

- activation;
- recurrence;
- WTP;
- payment;
- pre/post changes;
- capability behavior;
- cost metrics.

## Avoid without stronger evidence

Do not claim:

- guaranteed strategy;
- automatic business success;
- eliminates hallucinations;
- replaces strategists;
- turns anyone into expert;
- PMF;
- proven moat;
- causal skill improvement.

---

# 69. PRINCIPLES NON-NEGOTIABLE

1. Human Decision over AI Authority.
2. Structure over Chat History.
3. Evidence over Confidence.
4. Continuity over One-Shot Outputs.
5. Connection over Generation.
6. Explicit Uncertainty.
7. Learning over Blind Automation.
8. Rules Where Possible.
9. AI Where Semantics Matter.
10. Depth Before Breadth.

---

# 70. ENGINEERING FOUNDATION GOAL

ChatGPT Work must now convert this frozen product into a repository that is:

- human-readable;
- agent-readable;
- versionable;
- traceable;
- coherent;
- ready for Codex;
- ready for Claude Code.

The repository should allow a new engineer or agent to understand Brandopolis without needing the original conversation.

---

# 71. REPOSITORY EXPECTATION

The Engineering Foundation should include at least:

- README
- Product Bible
- Product Summary
- Glossary
- MVP Scope
- Non-goals
- Domain Model
- State Machines
- Decision Invariants
- Strategy Graph v1
- Dependency Rules
- Change Impact Algorithm
- AI Contracts
- Prompt Architecture
- AI Evaluation Harness
- Capability Framework
- UX Architecture
- Screen Inventory
- Business Model
- Validation Plan
- Metrics Catalog
- Telemetry Catalog
- Evidence Ledger Specification
- Threat Model
- AI Threat Model
- Tenancy Model
- Security Boundaries
- ADRs
- Definition of Done
- Implementation Order
- Risk Register
- Assumptions Register
- Open Questions
- AGENTS.md
- CLAUDE.md
- CODEX_START_HERE.md
- CLAUDE_START_HERE.md
- SESSION_STATE.md
- Traceability Matrix

---

# 72. SOURCE-OF-TRUTH DISCIPLINE

Do not duplicate knowledge unnecessarily.

Every important concept needs ONE canonical source.

Other documents should link to it.

Every document should clearly identify status where appropriate:

- canonical;
- derived;
- proposed;
- hypothesis;
- deprecated.

Documentation drift is a major risk.

---

# 73. RECOMMENDED IMPLEMENTATION ORDER

Phase 0 — Repository Foundation  
Phase 1 — Platform Foundation  
Phase 2 — Strategic State  
Phase 3 — First Strategic Loop  
Phase 4 — Connected Strategy  
Phase 5 — Change Impact  
Phase 6 — Blueprint  
Phase 7 — Capability Layer  
Phase 8 — Remaining Journey Modules  
Phase 9 — Experiment / Signal / Learning  
Phase 10 — Pilot Instrumentation  
Phase 11 — Hardening / Security / Evals / Demo

Do not skip directly to broad feature development.

---

# 74. WORK SHOULD NOT CODE THE FULL PRODUCT YET

Work's mission is:

- audit;
- organize;
- reconcile;
- specify;
- document;
- create repository structure;
- create schemas/contracts/specifications;
- prepare handoffs;
- define tests/evals;
- identify blockers.

It should stop before full application development.

The next execution stage is:

**Codex / Claude Code**

---

# 75. FINAL PRODUCT ESSENCE

Brandopolis can be understood through this loop:

UNDERSTAND  
↓  
DECIDE  
↓  
REMEMBER  
↓  
CONNECT  
↓  
ACT  
↓  
OBSERVE  
↓  
LEARN  
↓  
ADAPT  
↓  
REPEAT

And through this division of responsibility:

**AI proposes.**  
**Humans decide.**  
**Brandopolis remembers.**  
**Reality responds.**  
**People learn.**

---

# 76. FINAL DEFINITION

> Brandopolis transforms strategy from a collection of documents and isolated conversations into a living system of connected decisions, where AI assists reasoning, humans retain strategic authority, the system remembers what was decided and why, and every change becomes an opportunity to review, learn and adapt.

En español:

> Brandopolis transforma la estrategia de una colección de documentos y conversaciones aisladas en un sistema vivo de decisiones conectadas, donde la inteligencia artificial ayuda a analizar y proponer, las personas conservan la autoridad estratégica, el sistema recuerda qué se decidió y por qué, y cada cambio se convierte en una oportunidad para revisar, aprender y adaptar el negocio.

---

# 77. FINAL RULE FOR WORK

If the resulting repository still requires reading the original 12-gate conversation to understand:

- what Brandopolis is;
- how it works;
- what must be built;
- what must not be built;
- why major components exist;
- how they connect;
- how to test them;

then the Engineering Foundation is incomplete.

The repository itself must become the operational source of truth for Codex, Claude Code and future engineering work.

---

# END OF MASTER CONTEXT
