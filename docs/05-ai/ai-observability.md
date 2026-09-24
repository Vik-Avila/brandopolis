Status: canonical
Owner: Product / Engineering
Canonical: yes
Last reviewed: 2026-09-23
Related: docs/00-index/BRANDOPOLIS_MASTER_CONTEXT_FOR_WORK.md
Depends on: Master Context v1.0

# AI Observability

Para cada `ai_request_id`: workspace/brand pseudonimizados, task, module, provider/model, promptVersion, contextVersion, input/output schema version, token in/out, latency, estimated cost, retry count, status, parse errors, guard/evaluator outcome; sin prompt completo ni contenido estratégico en logs generales. Correlacionar Recommendation con request y DecisionVersion sólo tras commit humano. Dashboard operativo: fallos, p95 latencia, coste por Decision/Active Brand, schema failure, fabricated citation rate, research unavailable. Alertas ante fugas/inconsistencias, budget excedido y dependencia pendiente. Evaluación offline antes de cambiar modelo/prompt.
