---
name: brandopolis-marketing
description: "Brandopolis criteria for writing and reviewing marketing work: copy and plain-language editing, social posts, ads for Google and Meta, landing and site pages, site structure and SEO. Use it when Claude drafts or reviews copy, prompts, golden cases, fixtures or acceptance criteria for Productos y servicios, Marketing (plan, redes, sitio, campañas), Marca y recursos or Resultados, and when a Phase 4 task mentions textos, anuncios, publicaciones, landing, sitio, SEO, campaña or revisión de textos."
---

# Brandopolis · marketing criteria

Working criteria for Claude, adapted from public skill packs (provenance in [PROVENANCE](references/PROVENANCE.md)).
They improve how Claude writes and reviews; they are not product features. Anything the product itself must do goes
through brandopolis-feature and the [freeze gate](../../../CLAUDE.md#pilot-freeze) first.

## Read first

- [PHASE4_SPEC](../../../docs/15-handoff/PHASE4_SPEC.md) §3 (seven areas, plain language), §4.1–§4.8.
- Decisions: [ADR-0030](../../../docs/14-decisions/ADR-0030.md) (marketing drafts and exports),
  [ADR-0031](../../../docs/14-decisions/ADR-0031.md) (Google Ads and Meta Ads),
  [ADR-0032](../../../docs/14-decisions/ADR-0032.md) (sites), [ADR-0034](../../../docs/14-decisions/ADR-0034.md) (identity and kit).
- Authority: [brand-intelligence-engine](../../../docs/05-ai/brand-intelligence-engine.md); INV-001, INV-004, INV-006.
- Selection and backlog split: [PHASE4_AGENT_TOOLING_REVIEW](../../../docs/15-handoff/PHASE4_AGENT_TOOLING_REVIEW_2026-10-11.md).

## Procedure

1. **Context comes from one brand.** Use only that brand's approved versions (offer, customer, positioning,
   messages, published kit). Never a global marketing-context file, another brand or the chat. A draft
   decision or a pending value is shown as pending, never written as fact.
2. **Missing proof stays missing.** Flag it as `[falta: …]`; never invent figures, testimonials, prices or
   results. A claim names its source and version.
3. **Brando proposes, the person decides.** Drafts are proposals with editorial state; approval, publishing,
   spend and permissions are human steps. An uncertain external operation is reconciled, never resent.
4. **Visual identity is the published kit.** Colours, type and logo come from the published kit version; a
   draft kit never feeds a deliverable. The Brand Master of Brandopolis itself is never touched.
5. **Speak the user's language.** es-MX, tú, short sentences, everyday words; the seven areas keep their names
   (Inicio · Estrategia · Productos y servicios · Marketing · Marca y recursos · Colaboración · Resultados).
6. Apply the matching reference:
   - copy and editing: [copy](references/copy.md);
   - social posts and ad pieces: [social-and-ads](references/social-and-ads.md);
   - campaign plans and reviews for Google and Meta: [campaigns](references/campaigns.md);
   - site structure, landing pages and SEO: [site-and-seo](references/site-and-seo.md).
7. Report each finding as seen and wrong, seen and right, not verifiable, or not applicable. What could not
   be checked lowers coverage, never the verdict.

## Escalate to a human

Final consent, legal or regulated-category copy; publishing, spend or activation; benchmark or forecast numbers
presented to a client; any rule here that would change product behaviour; new tools, connectors or scraping.

## Never

Install or run the upstream plugins, hooks, installers or scripts; send brand data to a third-party service
from a skill; mix brands; sum conversions from different providers; present DEMO or simulated output as real
provider or AI results; treat a criterion here as approved product scope.

## Checks

Copy edits run the affected browser suite and the UI validator through brandopolis-review. Changes to this skill
run `pnpm skills:check`, `pnpm skills:sync` after review, `pnpm test` and Foundation.
