Status: visual implementation candidate; Windows validation pending
Owner: Engineering / Product
Canonical: no
Last reviewed: 2026-10-05
Related: docs/05-ai/brando-b1.md, design-qa.md, SESSION_STATE.md
Depends on: contextual B1 candidate and human-supplied gemstone/mockup

# Brando B1 visual follow-up

The human authorized this nonproduction visual implementation. Jury Production Freeze remains
active. No commit, push, PR, merge, tag, deploy, production configuration, infrastructure,
secret, model, schema, migration or provider-call change is part of this follow-up.

## Implemented behavior

Small 44px gemstone portrait in a compact card above Contexto vigente. One card moves above
the decision at <=1000px; no duplicate accessible control. Existing contextual dialog retains
its keyboard focus/escape behavior and gains a small portrait and explicit animation pause.
States are presentation-only: idle, consulting, response available, attention from existing
context, unavailable. None means approved or autonomously learned. Motion ends after 1.8–2.2s;
resting idle/attention moves once every 35–65s. Reduced motion, explicit pause, hidden tab,
offscreen and background-behind-modal prevent animation; no missed animations accumulate.

A tentative strip uses the first suggestion from the last successful authorized contextual
response. It is scoped to the existing user/brand/question/context fingerprint, rendered as
text, dismissible, and offers Ver análisis. Query pending/failure hides the strip; brand/context
changes clear it. No automatic query or strategic write was introduced.

## Assets and provenance

Only three 160px alpha WebP derivatives are served: 4550 + 7188 + 6100 = 17838 bytes.
Human source images/mockup are preserved in design/brandopolis-ui/reference/brando-b1 and
never served. Background extraction used the built-in image editor with original-gem-preserving
instructions, followed by trim/resize/WebP conversion. Generated extraction is not a guarantee
of identical source pixels: human acceptance of the faithful appearance remains pending.
Other supplied attitudes and the dark-backed learning movie are not shipped. Existing Brand
Master and runtime wordmark/Ribbon B remain byte-identical.

## Evidence and limits

Agent checks: typecheck, lint, non-database suite 141/141, Foundation, Skill Pack mirror,
integrated UI validator, locked brand validator and whitespace. New clock tests cover occasional
idle, finite iterations, pause/reduced motion, visibility, modal suspension and unavailable pose.

Desktop cloud-browser inspection used the real frontend assets and a disposable synthetic
API preview, not the database engine or a live provider. Card 81.5px high; portrait 44px; no
horizontal overflow. Query, response, pause, dialog focus, suggested strip and brand reset
were observed. Brand B reset removed the previous conversation/strip. Captured browser errors
were extension metadata errors; no application error was observed in the inspected log window.
Desktop screenshot: design/brandopolis-ui/reference/brando-b1/desktop-preview.jpg.

The reference and implementation were compared in one normalized side-by-side input.
Their viewport sizes and synthetic content differ; full-screen pixel equality is not claimed.
A first card at 48px with wider letter spacing was too tall; revised 44px/spacing was recaptured.
The new rail/strip composition matches the selected relationship, while existing page layout
and fixture-dependent learning content were preserved. Mobile capture and human animated
acceptance remain pending, so design QA and release closure are blocked on those checks.

## Operator continuation

Apply only brandopolis-brando-b1-visual.patch on the already-patched isolated Windows worktree.
Stop the existing local DEMO with Ctrl+C before restarting: static assets are cached by process.
Run typecheck, lint, skills:check, full pnpm test, expanded Brando browser suite (six cases),
Foundation, UI/brand validators and git diff --check. Restart only the local DEMO; run existing
E2E, visual and PILOT suites without changing screenshot baselines. Review gemstone identity,
right-rail placement, mobile entry, occasional idle and pause with the human.
No new Anthropic call or key is needed for these visual checks. Only after gates and human
acceptance can the expanded candidate receive RELEASE-READY OUTSIDE PRODUCTION.
