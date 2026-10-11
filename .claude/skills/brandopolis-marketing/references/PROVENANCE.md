# Provenance and licences

Reviewed 2026-10-11. Only instruction text was adapted (rewritten for Brandopolis, Spanish examples, brand rules
added). No upstream script, hook, installer, dependency, connector, evaluation or binary is vendored or executed.
Selection rationale and rejected components: `docs/15-handoff/PHASE4_AGENT_TOOLING_REVIEW_2026-10-11.md`.

| Source | Version · commit | Licence | Adapted from | Used in |
|---|---|---|---|---|
| github.com/coreyhaines31/marketingskills | 2.11.26 · `1efedbc5148b54b2f0f6c6c9fe0be62e151c7fff` | MIT | `skills/copywriting`, `skills/copy-editing`, `skills/social`, `skills/ad-creative`, `skills/ads` (incl. `references/audit-guardrails.md`), `skills/cro`, `skills/site-architecture`, `skills/seo-audit`, `skills/schema`, `skills/ai-seo` | copy.md, social-and-ads.md, campaigns.md, site-and-seo.md |
| github.com/AgriciDaniel/claude-seo | 2.4.2 · `4b99de2f7de7e7d5247042e5fb5b4ea9368ef734` | MIT | `skills/seo-sitemap`, `skills/seo-schema`, `skills/seo-local` (distinct checks only) | site-and-seo.md |
| github.com/AgriciDaniel/claude-ads | 2.0.2 · `ac21644933910419529bcf81efb95a9ca71edf81` | MIT | `skills/ads-plan`, `skills/ads-landing`, `skills/ads-launch` (draft-first and approval contract only) | campaigns.md |
| github.com/Hainrixz/claude-seo-ai | 0.2.0 (plugin.json) · `cabd6079dc1ae74682083ad3caf4e09bb1964404` | MIT | `references/ai-crawlers.md`, `skills/seo-ai-crawlers`, `skills/seo-geo-answerblocks`, `skills/geo`, `skills/seo-entity-linking`, `skills/seo-freshness`, README honesty guardrails (evidence-bounded AI-visibility checks only). Rejected: plugin, PreToolUse hooks, scripts and CMS write-back adapters, GitHub Action, MCP example, token configuration, scores | site-and-seo.md |
| github.com/Hainrixz/claude-webkit | 1.0.0 (package.json) · `1bd88c31e1ce8d1a5f5e4d9b0ae264176bf2507e` | MIT | `docs/questionnaire-es.md`, `docs/system-prompt-es.md`, `docs/landing-page-patterns.md`, `docs/accessibility-checklist.md`, `CLAUDE.md` phase 5 (discovery rounds and review order only; none of its vendored third-party skills). Rejected: Next.js/shadcn/Vercel stack, permission allowlist, third-party deploy script, footer credit, autopilot/role lock, placeholder testimonials | site-and-seo.md |
| github.com/Hainrixz/whatsapp-agentkit | `ad278b7d6f4bdc51b869fefbe42a7bfffc2b6324` | MIT | Reference only, nothing adapted (it asks for API keys in chat and builds a second autonomous bot) | — |
| github.com/Hainrixz/auto-crm | `0aef51a9aef0487c59b964b4eea9d964a2321f0c` | MIT | Reference only, nothing adapted (single-user local app, unauthenticated API) | — |

Updating: re-read the upstream text at a new pinned commit, re-check the licence, adapt by hand, update this table.
Never copy upstream files wholesale.

## Licence notices

MIT License

Copyright (c) 2025 Corey Haines

Copyright (c) 2026 agricidaniel (claude-seo and claude-ads)

Copyright (c) 2026 claude-seo-ai contributors (claude-seo-ai)

Copyright (c) 2026 Enrique Rocha (@Soyenriquerocha) / Tododeia (claude-webkit)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
