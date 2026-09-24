Status: canonical
Owner: Product / Engineering
Canonical: yes
Last reviewed: 2026-09-24
Related: docs/00-index/source-of-truth.md
Depends on: Master Context v1.0 + hardening brief 2026-09-24

# Traceability Matrix v2

| Principle | Requirement | Canonical doc | Domain | UX | AI | Telemetry | Test/Eval |
|---|---|---|---|---|---|---|---|
| P-001 | DEC-001 | decision-model | DecisionCommit/Version | Approve | no commit | decision_created | INV-001/002, G08 |
| P-002 | CTX-001 | brand-context | ContextFact/History | Context view | Assembler | evidence_added | INV-006 |
| P-003 | EVD-001 | evidence-model | Evidence | source/support | Evidence Guard | evidence_opened | INV-005, G05/G06 |
| P-004 | DEC-002 | decision-model | Version | history/What changed? | contextVersion | decision_superseded | INV-003 |
| P-005 | CI-001 | change-impact | Dependency/ReviewItem | Impact panel | optional evaluator | dependency_triggered | INV-008, G07 |
| P-006 | HYP-001 | hypothesis-model | Hypothesis/Usage | What we assume | supportLevel | evidence_opened | G09, schema |
| P-007 | LRN-001 | experiment-signal-learning | Signal/Learning | review | recommendation only | signal_added, learning_created | INV-007 |
| P-008 | DEP-001 | strategy-graph | HARD/SOFT/INFORMATIVE | rule reason | never suppress HARD | dependency_triggered | ENG-013 |
| P-009 | AI-001 | evaluator | Issue | caution | Evaluator | recommendation_generated | G04/G07 |
| P-010 | PROD-001 | modules | 9 primary Questions | Journey | module task | strategic_question_started | M1/G01 |
| P-011 | UX-001 | ux-principles | Decision | progressive card | concise output | rationale_opened | usability/TTF |
| P-001 | SEC-001 | tenancy | Workspace/Brand | access gating | scoped packet | audit | INV-004, G11 |
| P-008 | AI-002 | research-layer | User Input | manual fallback | Research optional | task result | ENG-012 |
| P-007 | CAP-001 | capability-context | CapabilityContext(User) | learning moment | optional prompt | capability_evidence_created | ENG-011 |
| P-004 | VAL-001 | metrics | ProductEvent | What changed? | none | high_value_return_event | pilot metric |

IDs de pruebas G01..G13 se definen en evals/golden-cases/cases.json; INV-001..010 y ENG-011..013 en `docs/04-domain-model/invariants.md`. Una nueva fila requiere prueba, y una prueba nueva debe citar requisito.
