Status: canonical
Owner: Product / Engineering
Canonical: yes
Last reviewed: 2026-09-24
Related: docs/00-index/source-of-truth.md
Depends on: Master Context v1.0 + hardening brief 2026-09-24

# Invariantes y prueba de aceptación

| ID | Invariante | Prueba |
|---|---|---|
| INV-001 | AI Recommendation no crea Approved Decision | endpoint IA no tiene commit ni versión |
| INV-002 | Decision aprobada cambia sólo con versión nueva humana | actor/versión previas intactas |
| INV-003 | Superseding conserva History | v1 consultable tras v2 |
| INV-004 | Tenant A no lee B | lectura, escritura, export y jobs intertenant denegados |
| INV-005 | Evidence externa exige provenance | schema/guard impiden falsa fuente |
| INV-006 | Conversation no modifica Strategy silenciosamente | chat sin writes ni versión |
| INV-007 | Signal no equivale a Learning | sin Learning ACCEPTED sin revisión |
| INV-008 | Change Impact no reescribe downstream | version/hash Positioning igual tras Customer v2 |
| INV-009 | Stale client no pisa nueva versión | expectedActiveVersion produce 409 sin side effects |
| INV-010 | Commits auditables e idempotentes | mismo key → una versión/audit/ReviewItem |
| ENG-011 | Capability Context es de User | ninguna pertenencia a Brand |
| ENG-012 | Research live opcional | M1 completo con research apagado |
| ENG-013 | HARD no se suprime por Evaluator PASS | review persiste |
