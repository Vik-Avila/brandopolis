Status: canonical
Owner: Product / Engineering
Canonical: yes
Last reviewed: 2026-10-08
Related: docs/14-decisions/ADR-0027.md, schemas/personal-reflection.schema.json, docs/04-domain-model/brand-context.md
Depends on: owner decision 2026-10-08 (Mi aprendizaje within Phase 3)

# PersonalReflection

Three contexts must never be confused:

| Context | Belongs to | Contains | Changes strategy? |
|---|---|---|---|
| Brand Context | the Brand | decisions, versions, evidence, hypotheses, experiments, signals, accepted learnings | only through human commits and reviews |
| Capability Context | the user | descriptive practice events (`capability_events`) | never |
| PersonalReflection | the user | private reflections on how they reasoned and decided | never |

## Model

- Table `personal_reflections` (migration `0014`, additive): `id`, `userId`, `workspaceId`, optional `brandId`,
  optional `decisionId` (only with its brand), `idempotencyKey` (unique per author), `payload`, `createdAt`.
- Payload (`schemas/personal-reflection.schema.json`): at least one of `changedThinking` («¿Qué cambió en tu forma
  de pensar?»), `learnedFromDecision` («¿Qué aprendiste de esta decisión?»), `doDifferently` («¿Qué harías
  diferente la próxima vez?»), each ≤ 2000 characters.
- `POST /api/reflections` creates; `GET /api/reflections` lists the author's own, newest first. Same origin and
  session gates as every other endpoint. A double submit with the same key returns the same reflection; the same
  key with different content is 409.

## Rules

1. Private by default: only the author reads it. Workspace admins, colleagues and other workspaces never do.
2. A brand or decision link must be one the author can already open (brand scope, assignment, same brand); linking
   never changes ownership.
3. Saving a reflection never creates a DecisionVersion, accepts a learning, changes a hypothesis, creates evidence,
   completes an experiment, resolves a review or writes Brand Context audit or telemetry.
4. Reflections are never sent to an AI provider. Brando may help formulate reflection questions only on an explicit
   request, and never writes or saves a reflection.
5. No scores, mastery levels or claims of improvement.
6. A concurrent double submit replays the first reflection (insert `ON CONFLICT DO NOTHING`). PILOT rate limit:
   30 reflections per 10 minutes per person. Accepted LOW: the idempotency key is unique per author (not per
   workspace); keys are random UUIDs and a replay only ever returns the author's own reflection.

Tests: `tests/reflection-cases.ts` (privacy, IDOR, idempotency, XSS as text, no Brand Context writes, no provider
packet, HTTP gates) and `tests/browser/workspace.spec.ts` (Mi aprendizaje flow).
