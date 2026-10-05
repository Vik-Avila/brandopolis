Status: follow-up candidate, not release-ready
Owner: Engineering / Product
Canonical: no
Last reviewed: 2026-10-05

# Brando selection-first review

Authorized adjustment: select a specific strategic proposal inside Brando, then edit that exact
choice and record human rationale in the workspace. No duplicated action set or implicit first
suggestion selection. Generic evidence advice opens evidence; it cannot use a strategic ticket.
See [ADR-0019](../14-decisions/ADR-0019.md).

Agent checks: typecheck/lint PASS; 148 non-database tests PASS; Foundation zero errors; integrated
UI validator PASS. The expanded 18-case browser suite is listed, not run in this environment.
Database coverage includes rejecting forged strategic actions on evidence advice. Windows
full unit/integration/browser/visual/PILOT gates remain pending for this new change.

[Visual evidence](../../design/brandopolis-ui/reference/brando-b1/selection-actions.jpg) uses
current frontend code and explicitly synthetic transport. It confirms separate option buttons
and evidence navigation labels. The remote HTTP preview cannot complete draft preparation:
crypto.randomUUID requires the secure context available on localhost or HTTPS. No product
security workaround was added; localhost browser tests must verify the exact selected draft.
No actual AI request, production change, new commit, push or deploy occurred.
