Status: canonical
Owner: Product / Engineering
Canonical: yes
Last reviewed: 2026-10-04
Related: docs/00-index/BRANDOPOLIS_MASTER_CONTEXT_FOR_WORK.md
Depends on: Master Context v1.0

# Matriz de autorización P0

| Acción | Workspace Admin | Member con Brand asignada | AI Worker | Visitante |
|---|---|---|---|---|
| Crear Brand | sí | por permiso explícito | no | no |
| Ver/editar Context de Brand | sí | sí en Brand asignada | sólo snapshot filtrado por job | no |
| Crear Recommendation | a través de app | a través de app | sí, sin commit | no |
| Approve/Modify/Reject y commit | sí | sí, rol estratégico | **no** | no |
| Cambiar membresía/borrado | sí | no | no | no |
| Leer Capability Context | propio | propio | sólo si tarea consentida | no |

Agregar secciones del recorrido a una Brand existente (`POST /api/brands/strategic-sections`, [ADR-0021](../14-decisions/ADR-0021.md)) sigue la fila «Ver/editar Context»: sólo crea preguntas OPEN faltantes, sin permisos sobre decisiones. Cada operación verifica sesión, membership activo, Brand bajo Workspace, scope de actor y `expectedActiveVersion`; la URL o id no concede permiso. Permisos más finos de colaboración P1. Guardar audit actor/fecha/versión por commit.

Operador PILOT (2026-10-04, [ADR-0016](../14-decisions/ADR-0016.md)): la superficie `/admin` es independiente de esta matriz. Exige sesión PILOT viva, email verificado y pertenencia a `BRANDOPOLIS_ADMIN_EMAILS`, comprobados en cada endpoint; sólo ve metadatos operativos, evidencia agregada y los comentarios de feedback, puede suspender o reactivar el acceso de un participante, y no tiene ningún permiso estratégico (no lee contenido ni hace commit). El autoaprovisionamiento crea un Workspace propio por identidad y no concede permisos fuera de él.
