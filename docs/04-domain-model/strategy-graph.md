Status: canonical
Owner: Product / Engineering
Canonical: yes
Last reviewed: 2026-09-24
Related: docs/00-index/source-of-truth.md
Depends on: Master Context v1.0 + hardening brief 2026-09-24

# Strategy Graph v1

Decisions vigentes + Dependencies tipadas HARD, SOFT e INFORMATIVE bajo una Brand; Brand Context contiene además inputs, Evidence, Hypotheses, Signals y Learnings. Relacional PostgreSQL, sin Graph DB para MVP. HARD obliga NEEDS_REVIEW; SOFT puede recomendar review/evaluación semántica; INFORMATIVE es contexto y no obliga review. Validar no ciclos, no aristas entre Brands, existencia de ambos nodos y versión de regla. Fuente de reglas concreta `config/dependencies/v1.json`. No atribuir inferencia de grafo al producto antes de implementarla.
