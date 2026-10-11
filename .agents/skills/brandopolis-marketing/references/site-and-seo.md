# Site structure, pages and SEO

Base: Marketing Skills `site-architecture`, `cro`, `seo-audit`, `schema` and `ai-seo`. Extra checks from Claude SEO
(`seo-sitemap`, `seo-schema`, `seo-local`) only where they add something distinct. See [PROVENANCE](PROVENANCE.md).
Search features change often: date every rule and verify it against the search engine's current documentation
before turning it into product behaviour or a test.

## Guided site creation (Marketing › Sitio web, ADR-0032)

1. Start from the brand's approved offer, customer, positioning and the published kit; the site never invents them.
2. Propose a reviewable page map by site type. Small business default: Inicio, Productos o servicios (one page per
   approved offer when there are several), Nosotros, Contacto; add more only with a reason.
3. Navigation: at most about seven top items, clear names in the customer's words, the main action visible.
4. Each page has one purpose and one primary action; sections follow the argument (problem → offer → proof →
   doubts → action).
5. Preview on desktop and mobile; publishing and restoring are human actions on an exact version.
6. Ask only what the approved versions do not already answer, in rounds of two to four questions; summarise each
   round in one line and confirm the brief before proposing pages. Never ask again for what the ficha confirmed.
7. When the person says «tú decide», choose from the section catalogue and the published kit and say what was chosen
   and why in one sentence; offer at most two options, the recommended one first. This covers presentation only,
   never strategy, offer or claims.
8. Pick the section order by business type and name the reason; a proof-first order needs real approved proof,
   otherwise show `[falta: prueba]`, never placeholder testimonials or invented slogans.
9. Review the preview in this order before asking for feedback: phone (~375 px), tablet (~768 px), desktop
   (~1024–1440 px); one H1 and ordered headings; a visible label on every form field (never placeholder only),
   errors tied to their field and a status message after sending; visible keyboard focus. Then ask one specific
   question («¿El inicio deja clara la oferta?»), not «dime qué te parece».

## Page improvement (conversion)

Check in order: is the value clear in the first screen; does the headline match the traffic source; is there one
main action; is proof close to the claim; are the main doubts answered before the form; how many fields does the
form ask and why; does it work on a phone. Separate observations from hypotheses; a hypothesis goes to Validación,
not to a silent change.

## SEO base

- One title per page (about 50–60 characters, main term first, brand at the end); one meta description per page
  that states the benefit; one H1; logical headings.
- Descriptive, short, lower-case URLs; canonical URL on each page; HTTPS only.
- Alternative text for images that carry meaning; empty alt for decoration; colour contrast for the pairs used.
- Internal links between offer pages and contact; no orphan pages; working links only.
- Structured data (JSON-LD in the server-rendered HTML): Organization or LocalBusiness, WebSite, WebPage,
  BreadcrumbList, Service or Product with Offer when an approved offer has a price. Data in the markup must match
  what the page shows.
- Content for people first: clear answers that can be quoted, the brand's real expertise and proof, dates where
  freshness matters.

## Distinct checks from Claude SEO

- **Sitemap:** valid XML; only canonical, indexable URLs returning 200; no redirected or noindexed URLs; real
  last-modified dates (not all identical); `priority` and `changefreq` are ignored, do not depend on them; sitemap
  referenced from robots.txt.
- **Structured data types:** do not propose HowTo or other retired types; FAQPage no longer gives rich results in
  Google (as checked by the source in 2026) and is only kept when useful to readers.
- **Local business consistency:** for brands with local geography, the business name, address and phone must match
  across the visible page, the structured data and the brand's declared data. A mismatch is a finding.
- **Crawlers and AI assistants:** robots rules are a brand decision; never block or allow assistant crawlers by
  default without the person choosing.

## Visibility in AI answers (from Claude SEO AI)

Search-engine rules below are as documented by the source (Google documentation it cites, checked 2026-08). Verify
them against the vendor's current documentation before turning them into product behaviour or tests.

- Google AI Overviews and AI Mode only use pages that are indexed and allowed to show a snippet. Check `noindex`,
  `nosnippet`, `max-snippet` and `data-nosnippet` on the main content (meta tag and `X-Robots-Tag` header) before any
  other AI-visibility advice; no AI-specific file, schema type or rewrite adds eligibility.
- Training and answer crawlers are separate tokens: blocking `GPTBot`, `ClaudeBot` or `Google-Extended` limits
  training and does not remove the site from assistant search or AI Overviews; blocking `OAI-SearchBot`,
  `Claude-SearchBot` or `PerplexityBot` does. Explain this when the person makes the robots decision. robots.txt
  controls crawling, not indexing: to keep a page out of the index use `noindex` and do not also disallow it.
- `llms.txt` and `Content-Signal` lines are preferences with no documented effect on search; never present them as a
  visibility win or as blocking.
- Answer-ready passages: a heading phrased as a question is followed by a direct answer in its first paragraph, and
  each passage reads on its own. Word-count windows are heuristics, never pass/fail thresholds; a missing fact
  becomes `[falta: …]`, never filler.
- AI-visibility findings are directional unless the search engine documents the rule; report them apart from
  classic SEO and never as a score or ranking promise. Presence in web results for a question is not AI citation
  data.
- Structured data: `sameAs` links only to profiles the person confirmed; `dateModified` is the real last change,
  never backdated.
