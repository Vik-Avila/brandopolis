Status: canonical
Owner: Product / Engineering
Canonical: yes
Last reviewed: 2026-09-23
Related: docs/00-index/BRANDOPOLIS_MASTER_CONTEXT_FOR_WORK.md
Depends on: Master Context v1.0

# Catálogo de métricas v1

Todas con UTC, denominadores de usuarios piloto elegibles y negocios reales, segmentadas A/B y Product-only/Assisted/Concierge; excluir DEMO. Activation = First Strategic Decision Approved; Activation Rate = usuarios con primera Decision / usuarios piloto elegibles; target ≥70%, e ideal ≥60% total sin ayuda sustancial. TTF Insight = mediana desde primer Brand/Question hasta primer insight mostrado (evento y definición instrumentados antes de piloto), target ≤10 min; TTF Decision = mediana desde comienzo de Brand hasta primera Decision aprobada, target ≤25 min; reportar censura de quienes no concluyen. High-Value Event = Strategic Question iniciada, Decision, Review, Change Impact revisado, Experiment, Signal o Learning; segundo evento **en sesión posterior** dentro de 14 días / activados con observación completa; target ≥50%. D7/D14/D30 retention = activados con HVSE en ventana día ±1 / activados con periodo observado. Second Brand Rate A = usuarios A activados que crean segunda Brand real / A activados, target ≥40%. Human Override Rate = Recommendations Modified/Rejected / Recommendations resueltas; Evidence Engagement = expuestos que abren Evidence / expuestos a Recommendation. AI Cost per Decision = coste atribuido al flujo / Decisions aprobadas; per Active Brand = coste periodo / Brands con HVSE periodo (ventana 30 días). Strategy Ready Rate = Brands con preguntas P0 requeridas completas y sin HARD Needs Review / Brands elegibles; fase exacta por módulo. Pilot conversion = pagos reales / usuarios con oferta real; WTP reportar aceptación inequívoca aparte, target orientativo ≥30% de activados avanza hacia compra. No inferir PMF con 12–20 usuarios.

## Comparabilidad · 2026-10-06

Con [ADR-0021](../14-decisions/ADR-0021.md) las marcas nuevas tienen seis secciones (antes cuatro). Las
fórmulas no cambian, pero a partir de este cambio la primera Decision aprobada puede ser Objetivo o
Arena (Activation, TTF Decision), las decisiones y revisiones de esas secciones cuentan como High-Value
Events y Strategy Ready Rate exige más preguntas y puede incluir revisiones HARD de primera versión. Los
periodos anteriores no son directamente comparables; los datos históricos no se recalculan.

Con [ADR-0022](../14-decisions/ADR-0022.md) las marcas nuevas tienen siete secciones. Misma regla: fórmulas sin
cambio, periodos anteriores no directamente comparables y sin recálculo histórico.
