# AGENTS.md · Brandopolis coding agents

1. Read [NEXT_DEVELOPER_START_HERE](docs/15-handoff/NEXT_DEVELOPER_START_HERE.md), [SESSION_STATE](SESSION_STATE.md), [source of truth](docs/00-index/source-of-truth.md), [Product Bible](docs/01-product/product-bible-v1.md), the relevant subsystem docs and ADRs. Claude Code specifics: [CLAUDE.md](CLAUDE.md).
2. Preserve the contract: no approved decision changes without a human commit and a new version; AI and chat have no strategic write permission; isolate Workspace/Brand and the Capability Context User.
3. MVP phases 1–9 are closed and Phase 10A/10B frontend polish is done. Do not add P1/P2 features, chat, PDF, decorative dashboards, graph engines or integrations on your own initiative; see [POST_MVP_DEFERRED_SCOPE](docs/15-handoff/POST_MVP_DEFERRED_SCOPE.md).
4. Follow schemas v1 and versioned config; do not couple the domain to an AI SDK; do not introduce a framework or infrastructure without a documented need (ADR). Never edit an applied migration.
5. Mandatory tests: INV-001..010, tenancy, optimistic concurrency, idempotency, old version, HARD Needs Review, no auto cascade, fallbacks without research, plus the browser suites for UI changes. Run `python scripts/foundation_check.py` before/after editing contracts.
6. Contract changes require canonical docs, schema/config, test, ADR if architecture changes, CHANGELOG and SESSION_STATE. Do not alter historical metrics without versioning.
7. If a requirement truly contradicts an approved source, stop that change, document the evidence and ask for resolution. The independent Final Contract Patch was never received; do not claim to have checked it.
