Status: follow-up candidate, not release-ready
Owner: Engineering / Product
Canonical: no
Last reviewed: 2026-10-05
Related: ../05-ai/brando-b1.md, ../14-decisions/ADR-0018.md
Depends on: explicit human request and clarified acceptance semantics

# Brando · expressive states, plain Spanish and human suggestion review

The previous accepted local candidate was committed by the Windows operator. This follow-up
is not included in that commit. No new commit/push/merge/tag/deploy or production action.

## Delivered

- Pensando… activity indicator retains visible contrast while disabled. Reduced motion keeps
  a static indicator and the semantic text. Pose remains distinct without animation.
- Original consulting/response alpha poses; 120/180ms fades, finite rigid gestures, 4–5.5s
  ambient cadence and pause/visibility/reduced-motion guards. No new imagery or morph.
- Prompt v2: everyday concise es-MX; defensive display translations of specified internal
  codes. Canonical source content/IDs remain original. Semantic quality still needs a human.
- Accept/Modify: criterion + target section -> existing editable decision -> final human
  confirmation -> new version, one practice observation and provenance -> normal impact.
  Related decisions may need review; no automatic cascade or approved Learning.
- Reject: criterion and practice only, with actor isolation, source freshness and idempotency.
- Bounded ephemeral source proof (512, 15min), existing DB tables, no migration. No inference
  on navigation or new provider capability. Legacy commit fingerprint remains byte-compatible
  for ordinary commits without Brando origin; new origin uses its own extended fingerprint.

## Evidence and gates

Agent: typecheck/lint PASS; non-database 147/147 PASS; Foundation zero errors; integrated UI
validator PASS; Brand Master validator PASS (58 assets, 19 mappings); skill mirrors and diff
whitespace PASS. Expanded browser suite has 16 desktop/mobile cases (listed, not run here).
Database cases added for exact replay, foreign/stale/forged source proof, no writes on query
or invalid action, version history, dependency review and exactly-one practice observation.
They require Windows execution; no database-backed PASS is claimed in this environment.

Cloud preview used exact frontend assets with synthetic transport, not a DB or real provider.
Observed Pensando, original pose change, safe rendered suggestions, three section actions and
criterion modal. Screenshot evidence does not replace Windows functional/impact regression.
Full test, Brando browser, E2E/visual/PILOT and operator human review remain required.

## Local live test

Existing local launcher blocks strategic mutations. Replace it with the new separately
downloaded temporary launcher after stopping the old 3002 process. It only permits the
selected local DEMO brand, bounded Brando inference and explicitly requested human decision
preparation/commit/review/impact operations. Credentials stay transient, server binds loopback,
no .env/external DATABASE_URL or production mode, no migration/provisioning. Its policy checks
use stubs, not real API calls. The local DEMO on 3000 must remain running to own PostgreSQL.
