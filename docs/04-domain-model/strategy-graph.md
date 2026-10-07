Status: canonical
Owner: Product / Engineering
Canonical: yes
Last reviewed: 2026-09-24
Related: docs/00-index/source-of-truth.md
Depends on: Master Context v1.0 + hardening brief 2026-09-24

# Strategy Graph v1

Decisions vigentes + Dependencies tipadas HARD, SOFT e INFORMATIVE bajo una Brand; Brand Context contiene además inputs, Evidence, Hypotheses, Signals y Learnings. Relacional PostgreSQL, sin Graph DB para MVP. HARD obliga NEEDS_REVIEW; SOFT puede recomendar review/evaluación semántica; INFORMATIVE es contexto y no obliga review. Validar no ciclos, no aristas entre Brands, existencia de ambos nodos y versión de regla. Fuente de reglas concreta `config/dependencies/v5.json` (versiones anteriores conservadas como historial; [ADR-0024](../14-decisions/ADR-0024.md); [ADR-0023](../14-decisions/ADR-0023.md); [ADR-0021](../14-decisions/ADR-0021.md), [ADR-0022](../14-decisions/ADR-0022.md)). No atribuir inferencia de grafo al producto antes de implementarla.

## Inteligencia sobre el grafo · 2026-10-07

[ADR-0025](../14-decisions/ADR-0025.md): `src/domain/intelligence.ts` deriva issues, orden de revisión y memoria a
partir de las aristas canónicas y del estado de la marca. Es de sólo lectura: ninguna inferencia (ni de la
IA) crea una arista canónica; una relación sugerida por Brando es sólo una sugerencia explícita.
