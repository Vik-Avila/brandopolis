Status: CANONICAL
Owner: Brandopolis
Canonical: YES
Last Reviewed: 2026-09-24
Related: Main Engineering Repository
Depends On: Engineering Foundation

---
# Domain ↔ UI Mapping

This document prevents friendly display language from becoming accidental domain enums.

| Domain state | Version relation | UI label (ES) | Meaning |
|---|---|---|---|
| `APPROVED` / `MODIFIED` | current version | `Actual` | “Actual” is display/version relation, **not** `Decision.status`. |
| `NEEDS_REVIEW` | current version | `Requiere revisión` | Human review is required after impact. |
| `SUPERSEDED` | prior version/relation | `Sustituida` | Previous version remains in history. |
| `REJECTED` | domain-owned | `Rechazada` | Human rejection per domain contract. |
| `INVALIDATED` | domain-owned | `Invalidada` | Explain reason without inventing semantics. |

**Never add `CURRENT` as a Decision status.**

## Recommendation vs Decision
- Recommendation / Recomendación: AI-proposed, non-committed.
- Decision / Decisión: human-committed with actor + timestamp + version semantics.

## M1 canonical visual flow
User → Workspace → Brand → Primary Customer → Positioning → HARD Dependency → Customer Change → Change Impact → Positioning Needs Review → Why → Guided Review → Human Commit → History preserved.

UI copy may use Spanish labels such as Cliente principal, Posicionamiento, Impacto del cambio and Revisión guiada. Internal identifiers remain owned by the main Engineering Repository.
