Status: derived
Owner: Product / Engineering
Canonical: no
Last reviewed: 2026-09-23
Related: docs/00-index/BRANDOPOLIS_MASTER_CONTEXT_FOR_WORK.md
Depends on: Master Context v1.0

# Entidades M1 · propuesta implementable

`StrategicQuestion {id,workspaceId,brandId,module,text,status}`; `Recommendation {id,questionId,brandId,contextVersion,options[],recommendedOptionId?,supportLevel,status}`; `Decision {id,brandId,questionId,activeVersionId?,reviewStatus}`; `DecisionVersion {id,decisionId,sequence,selectedOption,rationale,actorUserId,approvedAt,previousVersionId?,sourceRecommendationId?,hypothesisRefs[]}`; `Dependency {id,brandId,upstreamDecisionId,downstreamDecisionId,kind,ruleVersion,reason}`; `ReviewItem {id,triggerVersionId,downstreamDecisionId,status,reason,createdAt,reviewedBy?}`. Ownership Workspace/Brand explícito; version/actor append-only; `needs_review` en Decision y ReviewItem, no en DecisionVersion. IDs de implementación y SQL definitivos después del ADR ORM. Fuente [modelo canónico](../../docs/04-domain-model/decision-model.md).
