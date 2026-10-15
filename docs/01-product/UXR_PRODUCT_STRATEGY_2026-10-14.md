Status: owner-approved product direction, integration pending
Owner: Product
Date: 2026-10-14

# Brandopolis · Nueva estrategia de producto — UX Reinvention

## Product position

Brandopolis is an AI-native strategic decision system and evolving Brand Operating System, not a generic chatbot, an autonomous strategist or just a content generator. It transforms brand intent into connected, versioned human-approved strategic decisions and into authorized actions and measurable learning.

Canonical descriptor: **AI-native Strategic Decision System for Brands**.
Tagline: **De la idea a la marca. De la marca al mercado.**
Product unit: **Strategic Decision**.
Core contract: **La IA propone. Tú decides. Brandopolis recuerda.**
North-star experience: **Simple para comenzar. Poderoso para crecer.**
New operational interaction rule: **Chat-first in experience. Decision-first in the engine**.

## Why the change

The October 14 owner review of nine current product screens identified excessive navigation, a four-stage intake, nine exposed decision stages, numerous panels and repeated information requests. These are UX friction observations, not measured abandonment findings. Users can leave before experiencing the strategy engine.

Change how people access the capabilities, not the capabilities' strategic integrity. Keep structured brand context and strategy graph as the single source of truth, independent of conversation history. Brando has one visible identity and routes to specialized workspaces.

## Audience and depth

- Small agencies and consultants: multi-brand work, exact permissions, direct expert navigation, advanced editing and auditability.
- Founders / SME teams: ask for their goal in natural language, get one useful proposal promptly and choose what to do.
- Experienced users: never forced to converse; keyboard/navigation/search and direct editor access must remain.
- Guest/client: only approved/shared material, no implicit privileged AI or editing access.

One product with **progressive disclosure**, not distinct basic/pro tiers or disguised feature removal:
1. **Conversar:** interpret intent, retrieve authorized brand context, suggest next useful action.
2. **Trabajar:** contextual workspace for structured decisions, campaigns, calendar, CRM, identity, websites, review and results.
3. **Profundizar:** evidence, assumptions, source provenance, dependencies, versions, budget, tenant controls, exports, analysis.

## Product design method — five checks in order

Question each requirement; delete steps with no proven purpose; simplify what remains; shorten path to useful work; automate only stable and safe actions. The default must ask **only for missing information material to the next action**. If information already exists and is allowed, reuse it with a provenance cue. Do not call AI to ask information already present.

## Fundamental experience

FIRST VISIT: open accessible Brando-first home → user says what they seek or picks one of four concise intentions → reuse current context/documents → at most one relevant clarification at a time → short reasoned proposal and source/uncertainty → explicit human accept/adjust/discard → saved structured decision/plan/offer where permitted → next action opens professional workspace.

RETURN VISIT: Brando summarizes what has changed, pending meaningful decisions and latest activity; one prominent next useful step; direct access to any workspace; do not mark visit alone as high value.

AGENCY: brand selector and visible active brand; no cross-brand context; direct access to advanced tools; organization/team roles preserved.

NO AI: manual initiation and editing remain usable; degraded mode clearly labeled; draft preserved on errors.

## Non-negotiable boundaries

- No strategic write via chat or model. Human commit creates a new version; AI candidates never silently become approved.
- Evidence > certainty: mark confirmed facts vs inferred hypotheses, provenance, confidence and limitations.
- No automatic cascade upon upstream change; deterministic Change Impact and human guided review.
- State/history separated; client/shared/internal scopes separated.
- Multi-tenant permission checks before context assembly, retrieval and every API operation. User capability reflections private.
- Publish, spend, send, connect and external actions require explicit, specific, current human authorization as defined in existing ADRs; approval of copy is not an ad-spend authorization.
- Idempotency, optimistic concurrency, immutable history, accessibility and keyboard interaction must survive redesign.
- Image generation, public branded agent, full CRM/forecast, billing and autonomous workflows only according to explicit current/future scope; no feature creep merely because conversation could suggest it.

## Feature preservation matrix

| Feature / asset | Current or planned place | UXR treatment |
| --- | --- | --- |
| Nine strategic dimensions and dependencies | F1–F3 | Keep as underlying model, allow direct access, remove mandatory visible nine-step initial journey |
| Brando, Model Gateway, prompt and source guards | F2–F4 | One primary entry, contextual assistance, real-AI isolated DEMO |
| Experiments, signals, learning, validation | F3 | Keep full lifecycle; expose as guided "Comprobar una idea" when relevant |
| Mapa estratégico and approved PDF/Brand Book | F1–F3 | Keep projection and exports, simple entry from home/brand |
| Identity/brand kit/resources/templates | F4 | Keep versions and approvals; open editor for visual work |
| Products, offers, prices and sales assets | F4 | Keep professional editor, offer from approved strategy, no invented prices |
| Plan, social calendar, variants, websites and ads | F4 | Keep full specialized workspaces and review; conversation can prepare drafts |
| Clientes opportunities/forms/owners/source | F4 | Keep basic commercial actions and provenance; F5 CRM depth not silently advanced |
| Collaboration, reviewers, client portal | F4 | Simplify presentation without weakening approvals, access boundaries |
| Results and period comparisons | F4 | Surface interpretable signals, distinguish real, estimated and simulated |
| Forecast, attribution, multi-channel CRM | F5 | Preserve on roadmap; not a fake F4 accomplishment |
| Public brand bot and advanced agentic orchestration | F5–F6 proposals | Preserve later gates, no unapproved unattended automation |

## UX outcomes to test, not marketing claims

Measure time to first useful proposal, first approved decision, start-to-completion of onboarding, unanswered questions, dead ends, drop-off, direct vs conversation access, successful return, comprehension of AI vs human role and latency/cost per meaningful outcome. Candidate target <3 minutes to first useful proposal, hypothesis only until experimentally validated. Retain original pilot ~21-minute time-to-first-decision as historical small-sample baseline, not a performance guarantee.

## Success definition

A novice completes a useful strategy-to-action flow with little navigation, an agency performs the same work directly at professional depth, and both result in the **same auditable structured domain state**. Every feature remains findable; none requires chat exclusively. 
