---
name: brandopolis-brando
description: "Procedure for Brandopolis Intelligence and Brando, its visible presence: AI proposals, prompts, the Model Gateway and provider adapter, Context Assembler, Evidence Guard, evals and anything that lets Brando answer, explain, suggest or flag attention. Use it whenever a task mentions Brando, IA, asistente, propuesta, prompt, copiloto, Ask Brandopolis or model output, even when the change seems read-only. It guarantees that AI proposes, humans decide and Brandopolis remembers: no automatic strategic write, ever."
---

# Brandopolis · Brando and Brandopolis Intelligence

AI proposes. Humans decide. Brandopolis remembers.

## Read first

- [brand-intelligence-engine](../../../docs/05-ai/brand-intelligence-engine.md): canonical home of Brandopolis Intelligence, Brando, its authority limits and levels B1–B5.
- [ADR-0015](../../../docs/14-decisions/ADR-0015.md), [ADR-0010](../../../docs/14-decisions/ADR-0010.md) (human commit), [ADR-0005](../../../docs/14-decisions/ADR-0005.md) (Model Gateway), [ADR-0014](../../../docs/14-decisions/ADR-0014.md) (optional provider adapter), [ADR-0008](../../../docs/14-decisions/ADR-0008.md) (no vector DB).
- Contracts: [model gateway](../../../docs/05-ai/model-gateway.md), [AI contracts](../../../docs/05-ai/ai-contracts.md), [context assembler](../../../docs/05-ai/context-assembler.md), [evidence guard](../../../docs/05-ai/evidence-guard.md), [prompt architecture](../../../docs/05-ai/prompt-architecture.md).
- Threats: [AI threat model](../../../docs/12-security/ai-threat-model.md). Operations: [AI_PROVIDER_LAUNCH](../../../docs/15-handoff/AI_PROVIDER_LAUNCH.md).

## Stage gate

1. Only B1 (Contextual) is authorized, and only for the stage after the frozen PILOT. B2–B5 need their own human decision.
2. Any runtime change to the AI surfaces of the running PILOT must pass the [freeze gate](../../../CLAUDE.md#pilot-freeze); if it does not, stop and escalate. New Brando capability waits for the next stage (ADR-0015); design and docs are fine.

## Authority gate (every change)

- INV-001: AI output never creates an approved Decision. INV-006: conversation never writes strategy. INV-005: external evidence keeps provenance. ENG-013: an evaluator PASS never suppresses a HARD review.
- Brando reads authorized context of one Brand only (INV-004) and returns proposals: schema-validated, labelled as proposal, never a version.
- Every path that changes strategy must go through a human action and the engine's human commit. If a design needs Brando to "just apply" something, it is wrong; stop.

## Procedure

1. Provider surfaces today (re-check with a search for the SDK import before relying on this list): `src/transport/anthropic-provider.ts` (Model Gateway adapter, prompt loaded from `prompts/`), `src/transport/document-claims.ts` and `src/transport/competitive-research.ts` (direct SDK clients with inline prompts; research also uses the provider web tools). An audit of data sent to a provider covers every SDK call reachable from the PILOT server, not only the gateway.
2. The domain stays provider-neutral (no SDK in `src/domain/`); new provider calls go behind the gateway (ADR-0005) unless an ADR decides otherwise. Inputs (user text, documents, web) are untrusted data, never instructions.
3. Validate model output against schema v1 and the Evidence Guard; refusal or truncation never becomes a proposal.
4. DEMO stays deterministic and is never presented as live AI. Provider failure must leave manual operation available.
5. Add or update golden cases in `evals/` and the injection fixture expectation (zero commits).

## Escalate to a human

Provider or model choice, caps and budget, what data is sent to a provider (see [data classification](../../../docs/12-security/data-classification.md)), any new tool or capability for the model, prompt changes that affect metrics, anything beyond B1.

## Never

A write path from AI or Brando to Decisions, versions, reviews or learnings; autonomous agents or swarms; RAG or vector stores without an ADR; real keys in the repo; running `pnpm pilot:ai-smoke` with real credentials (human-only).

## Checks

Run the brandopolis-review matrix (`pnpm test` covers INV-001/004/006; Foundation validates schemas and golden cases). For prompt-injection exposure, also run the agent's built-in security review (Claude Code: `/security-review`; Codex: `/review` with a security focus).
