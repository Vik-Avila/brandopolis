Status: canonical
Owner: Product / Engineering
Canonical: yes
Last reviewed: 2026-09-24
Related: docs/00-index/source-of-truth.md
Depends on: Master Context v1.0 + hardening brief 2026-09-24

# Contratos de objetos de soporte

| Objeto | Mínimos propuestos | Owner y ciclo |
|---|---|---|
| Account | id, billingContact?, createdAt | Account; vínculo a Workspace según auth/billing |
| Workspace | id, name, createdBy, createdAt | tenant; Membership por User/role |
| Brand | id, workspaceId, name, dataClass | Workspace; separación de clientes |
| OpenQuestion | id,brandId,text,status,relatedHypothesisId? | Brand; investigación, no commit |
| UserInput | id,brandId,statement,createdBy/At | Brand; declaración no verificada |
| Inference | id,brandId,statement,basisRefs,limitations | Brand; interpretación trazable |
| ReviewItem | id,triggerVersionId,downstreamDecisionId,type,status,reason,reviewedBy | Brand; revisión humana |
| Assessment | id,userId,phase,instrumentVersion,answers,completedAt | User; pre/post y privacidad personal |
| AI Run | id,workspaceId,brandId,task,model,promptVersion,contextVersion,cost,latency,result | operación; no texto estratégico en log general |
| Product Event | eventId,name,occurredAtUtc,scope nullable,class/cohort/intervention/actor | telemetría; idempotente y minimizada |

Strategic Question y Decision se especifican en `docs/04-domain-model/decision-model.md`; Contracts versionados para payloads en `schemas/`.
