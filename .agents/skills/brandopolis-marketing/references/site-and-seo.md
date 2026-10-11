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
