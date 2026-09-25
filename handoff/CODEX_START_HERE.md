Status: canonical
Owner: Product / Engineering
Canonical: yes
Last reviewed: 2026-09-24
Related: docs/00-index/source-of-truth.md
Depends on: Master Context v1.0 + hardening brief 2026-09-24

# IMPLEMENT M1 — CONNECTED DECISION PROOF

## Mission

Implementar corte vertical M1 sobre esta Foundation, no el MVP completo. **Antes de código**, leer bloqueo de Patch independiente en source-of-truth/QA; integrar si se proporciona.

## Mandatory Reading (orden)

README → SESSION_STATE → Product Bible → source-of-truth → `docs/04-domain-model/{decision-model,state-machines,invariants,strategy-graph,change-impact}.md` → `docs/10-architecture/{tenancy,security-boundaries}.md` → `docs/14-decisions/` → `config/dependencies/v1.json` → `schemas/` → `evals/fixtures/m1-change.json` → telemetry catalog.

## Do Not Touch

No reabrir producto, no P1/P2, chat, research live obligatorio, PDF, billing, graph DB ni SDK IA en dominio.

## Required Domain Objects and files likely involved

User, Workspace/Membership, Brand, StrategicQuestion, Recommendation opcional en M1, Decision, DecisionVersion, Dependency, ReviewItem, AuditEvent, IdempotencyRecord; `domain/`, `schemas/`, `config/dependencies/`, nuevo `src/` modular, migraciones, integración y E2E. Resolver Drizzle/Prisma y auth mediante ADR antes de migración. Primer modelo AI provider puede esperar si M1 usa User Context Only/decisión manual; respetar Gateway como puerto.

## API/use cases and transactions

Crear Brand autorizado; crear/mostrar Customer/Positioning Questions; human commit con `expectedActiveVersion`, `idempotencyKey`, actor de sesión; leer current/history; aprobar Customer v2; motor HARD crea ReviewItem y Positioning NEEDS_REVIEW; leer explicación; resolver revisión humana, con opción de Positioning v2. Transacción con audit e impacto idempotente; fallos visibles.

## Required Tests

INV-001..010 y ENG-011..013 pertinentes; tenant A/B, Brand A/B, stale client 409, dos requests mismo key → una versión/ReviewItem/audit, vieja versión SUPERSEDED, Positioning intacto, HARD no suprimido por Evaluator, review humano persistente tras reload, sin live Research. Fixtures de `evals/` y E2E mínimo.

## Completion Criteria

20 criterios M1 en `docs/15-handoff/m1-acceptance.md`; screenshot/CLI evidencia y tests pasados; cambio documentado. Actualizar ADRs técnicos, schema/config si cambiaron, CHANGELOG y SESSION_STATE. Si Patch nuevo contradice contrato, detener implementación afectada y registrar diff.


## Resolución humana · 2026-09-24 · Sprint 01
El usuario autoriza implementar M1 sobre los contratos canónicos presentes y corregir drift documental inequívoco. ASSUMPTION_IN_USE es relación/flag de dependencia de una Decision vigente sobre una Hypothesis no validada, nunca status. Las referencias anteriores al Patch independiente describen la limitación histórica de cotejo, no un gate de entrada a M1. No se ha localizado ni se afirma haber cotejado ese archivo. Esta resolución sustituye instrucciones anteriores de esperar ese cotejo para iniciar M1; no cambia Bible, invariantes ni alcance.

## Continuación tras Sprint 01
Antes de nuevas features, revisar SESSION_STATE.md, docs/15-handoff/m1-implementation.md y LOCAL_HANDOFF.md. M1 y shell P0 cuentan con implementación y pruebas; no repetir bootstrap. Mantener secuencia de review de contrato antes del siguiente bloque de producto.
