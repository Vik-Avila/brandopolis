Status: canonical
Owner: Product / Engineering
Canonical: yes
Last reviewed: 2026-09-24
Related: docs/00-index/source-of-truth.md
Depends on: Master Context v1.0 + hardening brief 2026-09-24

# JSON Schema contracts v1

Cada `*.schema.json` incorpora `$id`, `x-version`, ejemplo válido y `additionalProperties:false`; semántica de autorización no se delega a JSON Schema. M1: strategic-question, recommendation, decision, decision-version, dependency, review-item, decision-commit, impact-result, evidence, hypothesis, telemetry-event. P0 siguiente: experiment, signal, learning, capability-evidence, assessment, user-input, open-question, inference. Extras: evaluator-result y capability-event. `scripts/foundation_check.py` comprueba sintaxis de Draft 2020-12, ejemplos, contratos cruzados de enums y enlaces. Al implementar, traducir a Zod/validación server-side sin redefinir estados.
