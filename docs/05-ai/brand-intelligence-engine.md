Status: canonical
Owner: Product / Engineering
Canonical: yes
Last reviewed: 2026-10-04
Related: docs/00-index/BRANDOPOLIS_MASTER_CONTEXT_FOR_WORK.md, docs/14-decisions/ADR-0015.md, docs/14-decisions/ADR-0010.md, docs/01-product/scope-mvp.md
Depends on: Master Context v1.0; human product decision 2026-10-04 (Brandopolis Intelligence / Brando)

# Brand Intelligence Engine

Capa lógica dentro del monolito: Model Gateway, Context Assembler, Research Layer, Strategic Analysis, Activation Analysis, Strategic Evaluator, Evidence Guard, Decision Engine, Change Impact, Applied Capability y Evaluation Harness. Roles Research Analyst, Strategic Analyst, Activation Strategist y Strategic Evaluator son funciones especializadas, no agentes autónomos. Cada función opera sobre contexto autorizado de una Brand y entrega contrato estructurado; ninguna puede mutar Decision aprobada. Flujo: pregunta → snapshot contexto → análisis → validación de schema/provenance → Recommendation → acción humana → servicio de dominio → reglas de impacto. Falla de proveedor: retorno manejado, operación manual disponible. Coste/latencia/eval bajo observabilidad.

## Brandopolis Intelligence y Brando · decisión humana 2026-10-04

Este documento es el hogar canónico de Brandopolis Intelligence y de Brando. La decisión arquitectónica se registra en [ADR-0015](../14-decisions/ADR-0015.md); la relación con el alcance, en [scope-mvp](../01-product/scope-mvp.md).

**Brandopolis Intelligence** es una capacidad horizontal: la inteligencia que el Brand Intelligence Engine descrito arriba aporta a todo el producto. No sustituye ni reorganiza esa arquitectura; la nombra como capacidad transversal.

**Brando** es la presencia visible de Brandopolis Intelligence: su interfaz para el usuario. No es un chatbot autónomo ni una autoridad estratégica.

### Límites de autoridad

AI proposes. Humans decide. Brandopolis remembers.

- Brando no crea, modifica ni aprueba una Strategic Decision por sí mismo. Toda modificación estratégica requiere acción humana explícita.
- Aplican sin excepción [INV-001 e INV-006](../04-domain-model/invariants.md) y [ADR-0010](../14-decisions/ADR-0010.md) (Human Commit). Lo que Brando produce es propuesta, nunca versión.
- Las funciones especializadas del Engine siguen sin ser agentes autónomos; Brando no cambia esa regla.

### Niveles de evolución

| Nivel | Nombre | Estado |
|---|---|---|
| B1 | Contextual | Autorizado para la siguiente etapa de desarrollo, posterior al PILOT congelado |
| B2 | Strategic Copilot | Evolución prevista; requiere decisión humana propia |
| B3 | Learning Copilot | Evolución prevista; requiere decisión humana propia |
| B4 | Orchestrator | Evolución prevista; requiere decisión humana propia |
| B5 | Agentic Intelligence | Evolución prevista; requiere decisión humana propia |

**Brando B1** puede: comprender la marca activa y la decisión actual; responder preguntas sobre contexto, decisiones, razones y evidencia; explicar Brandopolis; plantear preguntas e hipótesis; hacer sugerencias; señalar contradicciones o elementos que requieren atención; y alimentar «Qué necesita atención».

B1 no modifica el workspace PILOT congelado ni su runtime actual ([CLAUDE.md § Pilot freeze](../../CLAUDE.md#pilot-freeze)). Los niveles B2–B5 sólo se nombran aquí como dirección; su alcance y sus límites se definirán cuando se aprueben.

### Contrato de implementación B1 · 2026-10-04

La etapa B1 se desarrolla fuera de producción por aprobación humana del plan. Contrato de consulta,
selección de datos, autoridad, memoria temporal y validación: [Brando B1](brando-b1.md).
La extensión compatible del Gateway se registra en [ADR-0017](../14-decisions/ADR-0017.md).
La Jury Production Freeze sigue vigente; este trabajo no autoriza despliegue.
