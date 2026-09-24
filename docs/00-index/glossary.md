Status: canonical
Owner: Product / Engineering
Canonical: yes
Last reviewed: 2026-09-24
Related: docs/00-index/source-of-truth.md
Depends on: Master Context v1.0 + hardening brief 2026-09-24

# Glosario canónico

| Término | Significado |
|---|---|
| Account | entidad comercial vinculada a uno o más Workspaces según modelo de tenancy |
| Workspace | límite principal de tenant y membresía |
| Brand | ámbito de estado estratégico dentro de Workspace |
| Brand Context | estado estratégico estructurado actual + historia |
| Strategic Operator | User autorizado que formula/revisa Decisions |
| Strategic Question | pregunta que requiere elección estratégica |
| Open Question | incertidumbre que requiere comprender/investigar; no conduce automáticamente a Decision |
| User Input | declaración del usuario, sin validación implícita |
| Evidence | claim con fuente, fecha, provenance y clasificaciones de calidad/relevancia/vigencia |
| Inference | conclusión razonada derivada, con límites |
| Hypothesis | creencia comprobable con status UNTESTED/TESTING/SUPPORTED/WEAKENED/REJECTED |
| Assumption in Use | relación/flag entre Hypothesis y Decision vigente, no status de Hypothesis |
| Recommendation | propuesta IA estructurada, sin autoridad |
| Decision | elección humana con puntero a versión activa y condición de revisión |
| Decision Version | registro de elección aprobado y conservado; previo puede quedar SUPERSEDED |
| Dependency | arista HARD, SOFT o INFORMATIVE entre Decisions |
| Review Item | obligación/sugerencia de revisión causada por cambio |
| Strategy Graph | Decisions vigentes y Dependencies de una Brand |
| Change Impact | cálculo de revisión tras versión upstream |
| Guided Cascade | orden de revisión humana, sin reescritura automática |
| Experiment | prueba PLANNED/RUNNING/COMPLETED/INCONCLUSIVE/CANCELLED |
| Signal | observación de realidad, aún sin interpretación aprobada |
| Learning | interpretación revisada y limitada de Signals |
| Blueprint | proyección/snapshot de Brand Context, no source of truth |
| Capability Context | historial de práctica de User, separado de Brand |
| Capability Evidence | conducta descriptiva, sin declaración de mastery |
| Support Level | STRONG_SUPPORT, MODERATE_SUPPORT, LIMITED_SUPPORT, UNVALIDATED; no probabilidad |
| Active Brand | Brand con High-Value Event en ventana definida en metrics |
| High-Value Strategic Event | Question, Decision, Review, Change Impact revisado, Experiment, Signal o Learning, según catálogo de métricas |

Estados exactos y asignación por entidad: [state machines](../04-domain-model/state-machines.md).
