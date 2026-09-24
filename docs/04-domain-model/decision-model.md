Status: canonical
Owner: Product / Engineering
Canonical: yes
Last reviewed: 2026-09-24
Related: docs/00-index/source-of-truth.md
Depends on: Master Context v1.0 + hardening brief 2026-09-24

# Decision Model · fuente canónica

OpenQuestion busca comprensión y puede generar investigación, Evidence o Hypothesis; StrategicQuestion solicita elección y conduce Options → Recommendation → Human Decision. Recommendation de IA (rationale resumido, no chain-of-thought privada) carece de autoridad. `Decision` guarda `activeVersionId` y `reviewStatus=APPROVED|NEEDS_REVIEW|INVALIDATED`; `DecisionVersion` guarda opción, rationale humano, actor, timestamp, previousVersion y `versionStatus=APPROVED|SUPERSEDED`. `MODIFIED` y `REJECTED` son resultados de acción humana sobre propuesta: Modify crea nueva versión aprobada con divergencia registrada, Reject no crea versión. `commitDecision` requiere sesión humana autorizada, workspace/brand scope, `expectedActiveVersion`, `idempotencyKey`, actor; transacción atómica crea versión, supersede anterior, audit y outbox/idempotent Impact. AI Worker no tiene permiso. Stale client devuelve conflicto sin mutación. HARD impact marca NEEDS_REVIEW y crea ReviewItem; downstream mantiene versión/elección intacta. Invariantes `INV-001..010` y schemas M1 rigen implementación.
