Status: canonical
Owner: Product / Engineering
Canonical: yes
Last reviewed: 2026-09-23
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

Cada operación verifica sesión, membership activo, Brand bajo Workspace, scope de actor y `expectedActiveVersion`; la URL o id no concede permiso. Permisos más finos de colaboración P1. Guardar audit actor/fecha/versión por commit.
