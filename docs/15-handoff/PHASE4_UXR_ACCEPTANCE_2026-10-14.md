Status: proposed additive acceptance tests for owner-approved new UX. Not yet executed.
Owner: QA / Product / Security
Date: 2026-10-14

# F4 UXR · Acceptance matrix

All rows **PENDING** until run on the actual local target SHA. A passing deterministic unit test does not prove an integrated runtime or provider availability.

| ID | Flow | Acceptance | Evidence / gate |
| --- | --- | --- | --- |
| UXR-001 | New user | Start with natural intent without four mandatory setup stages | Playwright desktop/mobile |
| UXR-002 | Context reuse | Existing brand facts used once; unknowns labeled; one relevant clarification, no unneeded re-entry | Unit + E2E |
| UXR-003 | Human authority | AI candidate cannot write/approve decision until explicit human action; invalid/stale version 409 no side effect | Unit + API + E2E |
| UXR-004 | Structured memory | Approved decision survives reload and updates projected Mapa; chat transcript not authoritative | Integration + E2E |
| UXR-005 | Strategy depth | All nine dimensions reachable directly despite simplified initial path | E2E / founder |
| UXR-006 | Agency | Direct workspaces, search/navigation and multi-brand switching work without chat; no tenant leak | Security + E2E |
| UXR-007 | Marketing | Bachata campaign draft uses approved strategy/offer and links to editor, not automatic publish/spend | E2E |
| UXR-008 | Identity | Direction depends on brand context, no unapproved kit auto-published | Unit + E2E |
| UXR-009 | Clientes | Opportunity with owner, source and campaign refs not lost; attribution unverified stays unverified | E2E |
| UXR-010 | Collaboration | Guest sees only explicitly shared approved snapshots; private learning inaccessible | Security + E2E |
| UXR-011 | Results | Planned vs real vs simulator, periods, time zone, missing data (not zero) visible | E2E |
| UXR-012 | Live AI | Local isolated F4 with explicit live mode; server confirms actual provider/model; at least 3 contextual AI flows | Live smoke + trace without secrets |
| UXR-013 | Fallback | Provider unavailable/timeouts/rate limit keeps manual editing, drafts and no fake AI mode | Unit + E2E |
| UXR-014 | Side effects | No real external campaigns, publication, send or money without separate authorization | Security + contract tests |
| UXR-015 | Interaction | No lost focus, draft, filters, panel, scroll on partial refresh; keyboard and mobile viable | Playwright + visual |
| UXR-016 | Performance/cost | Count inference per user action, latency, token/usage reporting without sensitive data, bounded budget | AI smoke + telemetry review |
| UXR-017 | R12B/R12C | All earlier open UX/marketing/calendar/approval observations reconciled to new F4 surface | PHASE4_ACCEPTANCE_MATRIX + founder |
| UXR-018 | Regression | F1–F3 core and F4 editor/permissions/migrations unchanged semantically | Unit, typecheck, lint, pilot, E2E |
| UXR-019 | Version/history | Approval tied to immutable version; source changes yield Needs Review, no auto-cascade | Integration + E2E |
| UXR-020 | Production protection | No production artifacts/config/schema/secret/push/merge/deploy without separately authorized gate | Release audit |
| UXR-021 | Mobile usability | 390–430 px experience no overlap, clear focus and AA contrast; dialogs and drawers navigable | Visual + a11y review |
| UXR-022 | Founder acceptance | Four user journeys demonstrated on live localhost and defects resolved | Human acceptance notes |

## Experiment / product hypotheses

Baseline: historical ~21 minutes first decision (small sample n=6 in prior pilot; do not generalize). Target candidate: first helpful proposal in <3 minutes; first decision, dropoff, task success, question count, direct-workspace discovery and trust comprehension measured in a new real-user test. Metrics are aspirations until measured.

## Required reporting

For every row record target SHA, date, mode (mock/DEMO/live AI/real provider), test command, PASS/FAIL/BLOCKED with evidence and owner acceptance. Do not report 'ready' when critical rows or external-provider requirements remain pending.

## Standard checks on actual repository (verify available commands first)

pnpm typecheck; pnpm lint; pnpm test; pnpm test:e2e; pnpm test:pilot:e2e; pnpm test:visual; pnpm skills:check; python scripts/foundation_check.py; design/brandopolis-ui validation; relevant actual Anthropic smoke under explicit budget. Keep provider-dependent tests separate from deterministic CI.
