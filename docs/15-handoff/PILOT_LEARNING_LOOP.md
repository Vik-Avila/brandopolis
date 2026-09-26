Status: derived
Owner: Product
Canonical: no
Last reviewed: 2026-09-25
Related: docs/15-handoff/FIRST_TESTER_COHORT.md, docs/15-handoff/POST_MVP_DEFERRED_SCOPE.md
Depends on: MVP phases 1–9 closure 2026-09-25

# Learning loops in the MVP

Brandopolis has two distinct learning loops. Neither is autonomous: people interpret, people decide.

## 1. Product learning (team learns from testers) — operational

```
Tester uses PILOT → pilot_events + feedback (per tester, workspace, brand, session; no strategy text)
→ pnpm pilot:operator report / metrics → product team interprets → next iteration
```

What the team can answer today, with commands that exist:

| Question | Evidence |
|---|---|
| What happened? | `metrics`: sessions, brands, AI requested/failed, decisions, reviews per tester |
| Did the tester activate? | first `decision_created` (activation = First Strategic Decision Approved) |
| How fast? | Time to First Insight, Time to First Strategic Decision (median/average in `report`) |
| Did they find value? | feedback usefulness / clarity / confidence distributions; issue reports |
| Did they return? | `returningTesters` (more than one session); second High-Value Strategic Event ≤ 14 days |
| Where did they struggle? | AI failures, issue reports, observation notes per intervention mode (Product-only / Assisted / Concierge) |
| Did Brandopolis produce a useful next step? | second High-Value Event (e.g. opening the next connected question, completing a review) |

Targets from the Master Context §44–45 are experiment hypotheses, not results.

## 2. Strategic learning inside the product (tester learns about their brand) — implemented at MVP depth

Experiment → Signal → Learning is a real, persisted, human-reviewed flow (migrations 0006/0007):

- Experiment: PLANNED → RUNNING → COMPLETED / INCONCLUSIVE / CANCELLED; linked to a Decision and a Hypothesis, with objective and success criterion; completing requires a Signal.
- Signal: observation with source and non-future date; never becomes a Learning by itself.
- Learning: CANDIDATE → REVIEWED → ACCEPTED / REJECTED by an authorized human; accepted learnings enter Brand Context and the Context Assembler; accepting never changes a Decision.
- Strategic Practice: private capability events per person (no score).

## Post-MVP (not claimed)

Automatic learning synthesis, hypothesis status updates from accepted learnings, external signal ingestion, cross-brand learning, advanced capability model, experiment analytics. See `POST_MVP_DEFERRED_SCOPE.md`.
