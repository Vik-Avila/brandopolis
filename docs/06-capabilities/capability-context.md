Status: canonical
Owner: Product / Engineering
Canonical: yes
Last reviewed: 2026-09-23
Related: docs/00-index/BRANDOPOLIS_MASTER_CONTEXT_FOR_WORK.md
Depends on: Master Context v1.0

# Capability Context

`CapabilityContext(user_id, experience_level, assessment_state, created_at)` y eventos pertenecen a **User**, nunca a Brand. Un User puede practicar en varias Brands, pero una vista o AI request de Brand A no debe revelar datos estratégicos de Brand B. Evento: `user_id, capability_id, behavior, decision_id?, observed_at, evidence_ref?, intervention_label, cohort_tag`. Describir conducta, no calificar competencia definitiva. Retención y borrado personales independientes de confidencialidad empresarial.
