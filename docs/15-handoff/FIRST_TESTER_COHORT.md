Status: derived
Owner: Product
Canonical: no
Last reviewed: 2026-09-25
Related: docs/00-index/BRANDOPOLIS_MASTER_CONTEXT_FOR_WORK.md, docs/15-handoff/TESTER_GUIDE.md
Depends on: Live Pilot Launch Gate 2026-09-25

# Primera cohorte de testers

Estructura recomendada; no incluye personas reales.

## Composición (6–10 personas)

| Perfil | Cuántos | Qué aporta |
|---|---|---|
| Fundador/a o dueño/a de negocio | 2–3 | Decide sobre su propia marca; prueba el valor sin conocimiento de marketing. |
| Profesional de marketing | 1–2 | Contrasta con su método actual. |
| Agencia o consultor | 1–2 | Varias marcas: prueba multi-marca y continuidad. |
| Brand manager | 1 | Rigor de posicionamiento y revisión tras cambios. |
| Operador/a con experiencia estratégica | 1 | Crítica de la calidad de las propuestas. |

Cohortes técnicas `A` y `B` sirven para comparar condiciones (p. ej. con/sin IA o distinta guía); asignar mitad y mitad dentro de cada perfil.

## Modos de intervención (por sesión)

- **PRODUCT_ONLY**: el tester usa el producto solo. Por defecto.
- **ASSISTED**: el organizador responde dudas puntuales, sin sugerir decisiones.
- **CONCIERGE**: el organizador guía la sesión.

Clasificar con `pnpm pilot:operator classify-session`. La meta es que ≥ 60 % llegue a la primera decisión sin intervención sustancial (hipótesis del Master Context).

## Qué observar

Dónde duda antes de la primera decisión; si entiende que la propuesta no es una decisión; si vuelve a revisar tras un cambio; qué contexto aporta y cuál omite; si usa una segunda marca.

## Qué no hacer

No sugerir respuestas estratégicas, no explicar la interfaz antes de que la use, no elogiar ni corregir sus decisiones, no prometer funciones futuras.

## Métricas (según la telemetría disponible)

`pnpm pilot:operator report` (agregado) y `metrics` (por tester, sin contenido):

| Métrica | Definición en datos | Target experimental (hipótesis, no resultado) |
|---|---|---|
| Activación | primera `decision_created` | ≥ 70 % |
| Time to First Insight | `session_started` → primera `recommendation_generated` | mediana ≤ 10 min |
| Time to First Strategic Decision | `session_started` → primera `decision_created` | mediana ≤ 25 min |
| Segundo High-Value Event | otro evento estratégico ≤ 14 días tras la activación | ≥ 50 % de activados |
| Retorno | testers con más de una sesión | sin target |
| Utilidad / claridad / confianza | distribución 1–5 del feedback | sin target |

Targets del Master Context §44–45; son hipótesis de piloto, no afirmaciones públicas. No hay resultados todavía.

## Preguntas de feedback (al final de la sesión)

¿Qué decisión tomaste y qué tan seguro/a estás? ¿La propuesta te ayudó o estorbó? ¿Qué no entendiste? ¿Volverías a usarlo la próxima vez que cambie algo de tu marca? ¿Qué te faltó?

## Éxito del piloto

Evidencia suficiente para aceptar o rechazar las hipótesis H1–H4 con datos de testers reales: activación, tiempo a decisión, retorno y valoración, más observaciones cualitativas.
