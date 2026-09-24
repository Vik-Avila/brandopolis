Status: canonical
Owner: Product / Engineering
Canonical: yes
Last reviewed: 2026-09-24
Related: docs/00-index/source-of-truth.md
Depends on: Master Context v1.0 + hardening brief 2026-09-24

# Telemetry Event Catalog v1

**Envelope canónico:** `eventId, name, occurredAtUtc, schemaVersion, workspaceId|null, brandId|null, userId|null, dataClass(DEMO|PILOT|PRODUCTION), cohort(A|B|NONE), intervention(PRODUCT_ONLY|ASSISTED|CONCIERGE|NONE), actor(USER|SYSTEM|AI)`. Account events anteriores a Workspace usan `workspaceId=null`. Consentimiento y tenant scope se verifican antes de persistir; no enviar texto estratégico/PII en payload. `eventId` idempotente. Fuente ejecutable: `schemas/telemetry-event.schema.json`. Trigger confirmado, no mera intención.

| Evento | Trigger / actor / entidad | Clase de privacidad |
|---|---|---|
| account_created | User creado / USER / User | PERSONAL |
| workspace_created | Workspace creado / USER / Workspace | INTERNAL |
| brand_created, second_brand_created | Brand creada; segunda Brand real del User / USER / Brand | CONFIDENTIAL |
| strategic_question_started, evidence_added | Question inicia; Evidence persistida / USER / Brand | CONFIDENTIAL |
| recommendation_generated | salida validada / AI / Recommendation | CONFIDENTIAL |
| evidence_opened, rationale_opened | vista realmente abierta / USER / evidencia/rationale | INTERNAL |
| recommendation_approved, recommendation_modified, recommendation_rejected | acción humana confirmada / USER / Recommendation | CONFIDENTIAL |
| decision_created, decision_superseded | commit humano/transición de versión / USER / DecisionVersion | CONFIDENTIAL |
| dependency_triggered | impacto calculado / SYSTEM / Dependency | INTERNAL |
| change_impact_shown, change_impact_review_started, change_impact_review_completed | panel visible y revisión humana / USER / ReviewItem | INTERNAL |
| experiment_created, signal_added, learning_created | persistencia y revisión / USER / Brand | CONFIDENTIAL |
| capability_evidence_created, pre_assessment_completed, post_assessment_completed | práctica y evaluación / USER / User | PERSONAL |
| high_value_return_event | segundo evento en sesión posterior / SYSTEM / User | INTERNAL |
| offer_shown, payment_recorded | oferta visible/pago confirmado / SYSTEM / Account | CONFIDENTIAL |

No usar views como High-Value Events; no mezclar DEMO, PILOT y PRODUCTION. Fórmulas únicas en `docs/09-validation/metrics.md`.
