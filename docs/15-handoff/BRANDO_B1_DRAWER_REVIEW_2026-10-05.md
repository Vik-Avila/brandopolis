Status: correction candidate; not release-ready
Owner: Engineering / Product
Canonical: no
Last reviewed: 2026-10-05
Related: docs/05-ai/brando-b1.md, SESSION_STATE.md, design-qa.md
Depends on: applied visual candidate and explicit human correction

# Brando contextual drawer and motion correction

The previous candidate passed Windows gates, but the human rejected motion/panel quality.
This follow-up applies only over brandopolis-brando-b1-visual.patch. Scope is frontend,
presentation tests and documentation. No backend/schema/migration, real-provider call,
credential, configuration, infrastructure, commit/push/merge/tag/deploy or production access.

## Changes

- Native dialog styled as a 620px right drawer; own scroll body and fixed composer.
- Local authorized active decision/version/rationale; evidence/hypothesis previews/counts;
  attention items open existing human workflows. No inferred or fabricated strategic insight.
- Brando entry above left attention view; existing right entry remains. Native inertness,
  escape, focus trap and return to actual entry (menu on narrow screens) retained.
- One identical alpha gem in all states; no image swap, stretch, skew, scale or geometry morph.
  Translation/rotation and light, 2–2.6s finite gestures; current gesture finishes at neutral
  before next state. Rest 8–12s; consulting every 3s; error single gesture. Pause, reduced
  motion and visibility guards retained. Drawer entry/exit also honor reduced motion.

## Verification

Agent: typecheck/lint, 144 non-database tests, Foundation, UI and Brand Master validators,
Skill Pack mirror and whitespace checks. Eight expanded desktop/mobile browser cases listed;
execution remains with the Windows operator because local PostgreSQL/Chrome cannot run in
this root/socket-restricted environment. No gate was weakened or baseline regenerated.

Cloud desktop visual check used actual runtime assets with disposable synthetic API fixtures.
Verified right drawer, contextual active v2/rationale/counts, empty evidence disclosure,
query/result, identical image sources, explicit pause and escape returning to right entry.
The composer remains inside the viewport and the underlying page has no horizontal overflow.
This is preview evidence, not database/live-provider E2E or human animation approval.

Human reference (layout only, exclude humanized gem): reference/brando-b1/drawer-source.png
under design/brandopolis-ui. Revised capture in the same folder: drawer-desktop-preview.jpg.
Design QA compared both in one input and compacted disclosure rows to keep quick questions
visible in the initial desktop state. Mobile and subjective motion acceptance remain pending.

Operator: stop old local DEMO; apply correction patch; run typecheck/lint/full tests/Brando
browser eight cases, Foundation/UI/brand validators, then restart local DEMO and rerun E2E,
visual and PILOT suites. Review new motion, both entrances and sliding panel with the human.
Final state remains NOT RELEASE-READY until those gates and acceptance are recorded.
