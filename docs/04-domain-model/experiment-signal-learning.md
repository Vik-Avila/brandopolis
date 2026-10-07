Status: derived
Owner: Product / Engineering
Canonical: no
Last reviewed: 2026-09-23
Related: docs/00-index/BRANDOPOLIS_MASTER_CONTEXT_FOR_WORK.md
Depends on: Master Context v1.0

# Experiment → Signal → Learning

Experiment prueba una Hypothesis con intendedSignal y responsable; Signal es observación de lo ocurrido, con source/date; Learning es interpretación revisada con límites y actor. Una Signal puede proponer Learning CANDIDATE, jamás ACCEPTED automáticamente. Conclusiones actualizan Brand Context sólo mediante flujo humano autorizado y conservan vínculos a señales. Hypothesis con assumptionInUse=true puede pasar de UNTESTED a TESTING/SUPPORTED/WEAKENED/REJECTED por revisión; Decisions dependientes pueden requerir revisión, sin editar versiones. Contratos en `schemas/experiment.schema.json`.

Priority Experiment ([ADR-0024](../14-decisions/ADR-0024.md)) es la Strategic Decision que elige qué supuesto validar
primero; su ejecución usa estas entidades, enlazando el Experiment a esa decisión. Nada del ciclo modifica
la decisión, una Hypothesis ni un Learning sin revisión humana.

La memoria estratégica de [ADR-0025](../14-decisions/ADR-0025.md) distingue aprendizajes aceptados de los que
esperan revisión humana; una señal o un aprendizaje pendiente nunca cuenta como soporte de una decisión.
