Status: canonical
Owner: Product / Engineering
Canonical: yes
Last reviewed: 2026-09-24
Related: docs/00-index/source-of-truth.md
Depends on: Master Context v1.0 + hardening brief 2026-09-24

# Strategic Analysis

Funciones por módulo reciben Question y ContextPacket autorizado; emiten `Recommendation` con questionId, options, recommendedOptionId opcional, rationale resumido, evidenceReferences, hypothesesUsed, tradeoffs, openQuestions, supportLevel, affectedDomains y failureConditions cuando aplique. No conservar chain-of-thought privada. `recommendedOptionId` debe referir una opción; ausencia de soporte permite null y UNVALIDATED. Evidence Guard comprueba ids/provenance; falla IA → análisis manual sin falsas citas. Prompt `prompts/strategic-analysis/customer-v1.md` y schema `schemas/recommendation.schema.json`.
