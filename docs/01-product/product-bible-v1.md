Status: canonical
Owner: Product / Engineering
Canonical: yes
Last reviewed: 2026-09-24
Related: docs/00-index/source-of-truth.md
Depends on: Master Context v1.0 + hardening brief 2026-09-24

# Product Bible v1.0 · síntesis operativa reconciliada · Master Context v1.0 y correcciones explícitas del hardening brief

**Naturaleza:** transposición estructurada, no reproducción del archivo original de Product Bible. [Fuente íntegra](../00-index/BRANDOPOLIS_MASTER_CONTEXT_FOR_WORK.md); prevalecen sus secciones si esta síntesis omite detalle.

## Contrato de producto

Brandopolis es SaaS B2B AI-native de decisiones estratégicas conectadas para construir, gestionar y evolucionar una Brand; asiste el razonamiento, conserva autoridad humana y desarrolla capacidades en trabajo real. Categoría aspiracional The Brand Operating System; descriptor AI-native strategic decision system for brands; tagline «De la idea a la marca. De la marca al mercado». Unidad: Strategic Decision; valor: Connected Strategic Decision Made and Remembered. Tesis: Production is abundant. Strategy is scarce.

## Flujo y límites

IDEA → MARCA → MERCADO → APRENDIZAJE. Crear Brand → contexto estructurado → pregunta → evidencia e hipótesis → opciones/recomendación → aprobar/modificar/rechazar humano → Decision versionada → dependencias → cambio upstream → impacto determinista → revisión guiada → estrategia vigente → experimento/señal/aprendizaje. Brand Context es estado actual más historial; Strategy Graph son decisiones vigentes y dependencias. Research no bloquea primera decisión. IA no comitea. Chat no escribe estrategia. Capability Context pertenece a User, Brand Context a Brand. Blueprint es proyección, no fuente.

## Personas y negocio

Beachhead comercial: agencias pequeñas y consultores; beachhead de impacto: founders/PYMEs LATAM. Un producto, dos propuestas de valor. SaaS por continuidad de inteligencia estratégica; Active Brand es métrica primaria. Planes conceptuales Solo, Professional, Agency/Team; precio abierto. One-and-done y pago son hipótesis de piloto.

## Alcance y evidencia

P0/P1/P2: [scope-mvp](scope-mvp.md). M1: Customer/Positioning, versionado e impacto. Piloto: 12–20 usuarios, cohortes separadas, actividad real, intervención product-only/assisted/concierge; targets experimentales, no claims. Declaraciones públicas según [claims policy](../13-competition/claims-policy.md). Estado: conceptualmente congelado, pre-MVP, Engineering Foundation. Secuencia: Foundation → M1 → MVP → Pilot → Evidence.

## Principios

Los diez [principios](product-principles.md) son restricciones de diseño. Implementaciones en [dominio](../04-domain-model/README.md), [IA](../05-ai/brand-intelligence-engine.md), [UX](../07-ux/ux-principles.md), [seguridad](../12-security/authorization.md), [matriz](../00-index/traceability-matrix.md). Ningún apartado autoriza un generador de contenido, CRM, LMS, graph DB o swarm para MVP.


## Correcciones finales de contrato

Strategic Question: OPEN, IN_ANALYSIS, READY_FOR_DECISION, DECIDED, REOPENED. Hypothesis: UNTESTED, TESTING, SUPPORTED, WEAKENED, REJECTED; Assumption in Use es relación. Experiment conserva INCONCLUSIVE. Dependency incorpora INFORMATIVE. Evidence tiene calidad, relevancia y vigencia. EvaluatorResult y ConsistencySeverity son conceptos separados. Telemetría permite workspaceId=null antes de crear Workspace. Fuente canónica detallada: [state machines](../04-domain-model/state-machines.md).


## Correcciones finales de contrato

Strategic Question: OPEN, IN_ANALYSIS, READY_FOR_DECISION, DECIDED, REOPENED. Hypothesis: UNTESTED, TESTING, SUPPORTED, WEAKENED, REJECTED; Assumption in Use es relación. Experiment conserva INCONCLUSIVE. Dependency incorpora INFORMATIVE. Evidence tiene calidad, relevancia y vigencia. EvaluatorResult y ConsistencySeverity son conceptos separados. Telemetría permite workspaceId=null antes de crear Workspace. Fuente canónica detallada: [state machines](../04-domain-model/state-machines.md).
