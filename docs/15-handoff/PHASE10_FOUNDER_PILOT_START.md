Status: derived
Owner: Product / Engineering
Canonical: no
Last reviewed: 2026-09-25
Related: docs/15-handoff/LIVE_PILOT_LAUNCH_CHECKLIST.md, docs/15-handoff/FIRST_TESTER_COHORT.md, docs/15-handoff/PILOT_LEARNING_LOOP.md
Depends on: tag brandopolis-mvp-phases-1-9-final-2026-09-25

# Phase 10 — Real testers / Founder Pilot

Status: **STARTED — EXTERNAL CONFIGURATION PENDING.** No tester is live, nothing is deployed, OIDC and the AI provider are not connected, production is not claimed.

Base: `brandopolis-mvp-phases-1-9-final-2026-09-25`. Rule: **no feature development** until real pilot evidence exists or a deployment blocker requires code.

Sequence: external configuration → real deployment → Tester 0 → first external cohort → evidence → iteration.

## External inputs required (none provided yet)

1. Hosting provider
2. Region
3. Dedicated PostgreSQL 17 `DATABASE_URL`
4. OIDC issuer
5. OIDC client ID
6. OIDC secret **or** public-client configuration
7. DNS/TLS for `pilot.brandopolis.ai` (callback `https://pilot.brandopolis.ai/auth/callback`)
8. Anthropic API key
9. AI model (suggested `claude-opus-5`)
10. AI budget / caps
11. Request Access destination (`PILOT_REQUEST_ACCESS_URL`)
12. Approval of the AI data notice (`config/pilot/ai-notice.v1.md`)
13. First tester OIDC identities (subjects)
14. Cohorts (A/B)
15. Hosted backup/restore rehearsal

Configuration and launch steps: [LIVE_PILOT_LAUNCH_CHECKLIST](LIVE_PILOT_LAUNCH_CHECKLIST.md). After the key exists: `pnpm pilot:ai-smoke`.

## Tester 0 acceptance path (the founder, before any external tester)

Real OIDC login → workspace → create/select Brand → structured Brand Context → first strategic question → real AI recommendation (accept the data notice) → human approve/modify → second connected decision (Positioning) → change Customer → Change Impact → Needs Review → Guided Review → History → Blueprint → Experiment / Signal / Learning where appropriate → feedback → logout → login again → state preserved. Evidence: `pnpm pilot:operator report` shows activation, times, AI outcomes and feedback for Tester 0.

## Metrics (from existing telemetry; no results yet)

Activation = first strategic Decision approved. Time to First Insight, Time to First Strategic Decision, second High-Value Strategic Event (≤ 14 days), return behavior, usefulness / clarity / confidence, AI request success/failure, issue reports. Targets in the Master Context are experiment hypotheses.

## First cohort

3–5 testers with varied strategic backgrounds (see `FIRST_TESTER_COHORT.md`); keep the cohort small until evidence is collected. No fake or fixture users are provisioned in the pilot database.
