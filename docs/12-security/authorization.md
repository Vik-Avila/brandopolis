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
| Eliminar Brand completa ([ADR-0029](../14-decisions/ADR-0029.md)) | sí, con confirmación por nombre exacto | **no** (403) | **no** | no |
| Leer Capability Context | propio | propio | sólo si tarea consentida | no |

Agregar secciones del recorrido a una Brand existente (`POST /api/brands/strategic-sections`, [ADR-0021](../14-decisions/ADR-0021.md)) sigue la fila «Ver/editar Context»: sólo crea preguntas OPEN faltantes, sin permisos sobre decisiones. Declarar la geografía de una Brand (`POST /api/brands/geography`, DEMO y PILOT; [ADR-0025](../14-decisions/ADR-0025.md)) exige el mismo `scope` con asignación, audita `BRAND_CONTEXT_UPDATED` y nunca modifica una decisión; PILOT añade su gate de sesión viva. Cada operación verifica sesión, membership activo, Brand bajo Workspace, scope de actor y `expectedActiveVersion`; la URL o id no concede permiso. Eliminar una Brand (`POST /api/brands/delete`, [ADR-0029](../14-decisions/ADR-0029.md)) exige el mismo `scope` más rol ADMIN y el nombre exacto; otra organización recibe 404, es idempotente por actor y clave, desvincula (nunca borra) reflexiones privadas y analítica del piloto, y no alcanza las copias de seguridad externas. Permisos más finos de colaboración P1. Guardar audit actor/fecha/versión por commit.

Fase 4 · bloque 2 (2026-10-10, [ADR-0033](../14-decisions/ADR-0033.md), [ADR-0031](../14-decisions/ADR-0031.md)):

| Acción | Workspace Admin | Member con Brand asignada | Invitado | IA / Brando |
|---|---|---|---|---|
| Leer o fijar la prioridad de trabajo de la Brand (`/api/brands/work-priority`) | sí | sí | no | no |
| Inicio guiado: iniciar, guardar, crear la marca desde el borrador, confirmar o descartar (`/api/brand-setup`, `/api/brand-setup/{start,save,create-brand,confirm,abandon}`); sólo el autor ve y edita su borrador; iniciar sin marca exige permiso de alta | sí | sí (sólo su borrador; sin marca, con permiso de alta) | no | no |
| Leer y editar ofertas (`/api/offers`, `/api/offers/{create,draft,submit,new-draft,retire}`) | sí | sí | no | no |
| Aprobar o pedir cambios sobre una versión de oferta (`/api/offers/decide`: versión + huella exactas, criterio, clave de idempotencia; registro `offer_approvals` append-only) | sí | sí | no (hasta el portal de ADR-0033, y nunca para ofertas) | **no** |
| Leer y editar el Plan de Marketing (`/api/plan`, `/api/plan/{create,update,add-objective,update-objective,add-action,update-action,action-status}`; revisión obligatoria, 409 si está desactualizada) | sí | sí | no | no |
| Leer, crear y editar entregables; aprobar o pedir cambios (versión + huella, criterio, clave); registrar manualmente una publicación social (`/api/deliverables`, `/api/deliverables/{create,draft,submit,decide,new-draft,retire,publication}`) | sí | sí | no (revisión de entregables compartidos llegará con el portal de ADR-0033) | **no** |
| Leer y editar el kit de marca, subir archivos, adoptar valores, aprobar o pedir cambios (`/api/brand-kit`, `/api/brand-kit/{start,draft,adopt,submit,decide,extract}`, `/api/brand-kit/assets`) | sí | sí | no | no |
| Usar como manual del kit un PDF que la marca ya cargó (`/api/brand-kit/reuse-document`): sólo documentos PDF de la misma marca, comprobados por firma y huella, copiados como archivo privado del kit | sí | sí | no | no |
| Publicar el kit (`/api/brand-kit/publish`) | sí | sólo con `PUBLISH_BRAND_KIT` | no | **no** |
| Ver la vista previa de un archivo del kit (`/api/brand-kit/assets/preview`): sólo PNG, JPEG o WebP, autorizado en cada petición, `nosniff` y CSP `sandbox`; nunca SVG, PDF ni fuentes | sí | sí | no | no |
| Pedir a Brando una propuesta de material (`/api/brando/marketing`): sólo lectura del contexto mínimo autorizado; sin escrituras; procedencia `AI_ASSISTED` sólo con prueba de un solo uso de esa persona, marca y tipo | sí | sí | no | propone, nunca escribe |
| Preparar y decidir la versión compartida del plan (`/api/plan/share`, `/api/plan/decide-share`: versión + huella, criterio, clave) y leer lo que recibe el cliente (`/api/plan/shared`) | sí | sí | no hasta el portal de ADR-0033; entonces sólo lectura de la versión aprobada y su avance, sin editar estrategia, plan ni acciones | **no** |
| Conceder o retirar capacidades por Brand (`/api/brands/capabilities`) | sí, sólo a un MEMBER asignado | no (403) | no | no |
| Gestionar conexiones de proveedor y vincular cuentas | sí | sólo con `MANAGE_CONNECTIONS` | no | no |
| Autorizar, encolar o reintentar una operación con gasto | sí | sólo con `AUTHORIZE_SPEND` | no | **no** |
| Invitar a un cliente a una Brand, retirar una invitación o retirar el acceso de un invitado (`/api/collaboration/{invite,revoke-invitation,revoke-guest}`); el token de un solo uso sólo se muestra al crearla y se guarda como hash | sí | sólo con `MANAGE_GUESTS` | no | no |
| Leer Colaboración, compartir una versión exacta (estrategia congelada, copia aprobada del plan, versión de material o de kit en revisión o aprobada; nunca un borrador), dejar de compartir y comentar interno o compartido (`/api/collaboration`, `/api/collaboration/{share,withdraw,comment}`) | sí | sí | no | no |
| Leer la guía viva del kit publicado (`/api/brand-guide`) | sí | sí | en su portal | no |
| Aceptar una invitación (`/api/invitations/accept`): sesión válida; email verificado igual al invitado (una identidad DEMO sin cuenta sólo en marcas DEMO); un miembro del workspace no pasa a invitado | — | — | sí | no |
| Portal (`/api/portal/brands`, `/api/portal`): sólo con un `BrandGuest` ACTIVE de esa marca exacta; lee lo compartido activo, la guía publicada y comentarios compartidos; nunca comentarios internos, borradores, plan vivo, ofertas, Brando ni conexiones | no (su vista es la de equipo) | no | sí | no |
| Comentar en lo compartido y aprobar o pedir cambios sobre la versión exacta compartida (`/api/portal/{comment,decide}`: huella exacta, 409 si cambió; clave de idempotencia; materiales y kit, no estrategia ni plan); nunca concede publicar ni gastar | — | — | sí | no |
| Vista previa de un archivo para el invitado (`/api/portal/asset`): sólo PNG, JPEG o WebP citados por la guía publicada o por una versión de kit compartida activa; autorizado en cada petición | — | — | sí | no |
| Clientes ([ADR-0035](../14-decisions/ADR-0035.md)): leer, registrar y dar seguimiento a oportunidades, crear segmentos (`/api/clients`, `/api/clients/{create,update,segment}`); responsable sólo un miembro activo con acceso a la marca; revisión antigua → 409 | sí | sí | **no** (404: no tiene membresía) | no |
| Abrir o desactivar un formulario web de la marca (`/api/clients/{form,disable-form}`) | sí | sólo con `PUBLISH_SITE` | no | no |
| Leer Resultados de la marca (`/api/results`): cifras calculadas en servidor con el ámbito del usuario | sí | sí | **no** | no |
| Formulario web público (`GET /api/forms/public`, `POST /api/forms/submit`): sin sesión, mismo origen, cuerpo limitado, límites por cliente y por formulario; la marca sale del formulario activo, nunca del navegador; el contenido no va a logs ni telemetría | — | — | — | — (visitante anónimo: sólo enviar) |

El actor y sus capacidades se resuelven en servidor (`Engine.withBrandActor`: sesión, membresía activa, Brand bajo
Workspace y asignación). Otra organización → 404; un MEMBER sin asignación → 403. Ejecutar un paso externo revalida
en el worker la capacidad del actor que autorizó. Las credenciales se cifran en servidor y nunca salen en
respuestas. Los invitados (ADR-0033) se resuelven aparte (`Engine.withGuest`: sesión válida y `BrandGuest` ACTIVE de esa
marca exacta, sin depender de la membresía); un invitado nunca llega a los endpoints de equipo, porque su sesión
pertenece a su propio workspace (404). Retirar el acceso surte efecto en la siguiente petición. Las acciones del
invitado quedan en sus propias filas (aceptación de la invitación, `BrandGuest`, comentarios y aprobaciones
append-only con actor y fecha); la auditoría estratégica sólo admite miembros del workspace. El portal y la
aceptación no exigen el perfil de Estratega de Marca del PILOT. Compartir no tiene capacidad propia en ADR-0033: lo
hace cualquier miembro del equipo con la marca asignada (decisión pendiente si se quiere restringir).

Operador PILOT (2026-10-04, [ADR-0016](../14-decisions/ADR-0016.md)): la superficie `/admin` es independiente de esta matriz. Exige sesión PILOT viva, email verificado y pertenencia a `BRANDOPOLIS_ADMIN_EMAILS`, comprobados en cada endpoint; sólo ve metadatos operativos, evidencia agregada y los comentarios de feedback, puede suspender o reactivar el acceso de un participante, y no tiene ningún permiso estratégico (no lee contenido ni hace commit). El autoaprovisionamiento crea un Workspace propio por identidad y no concede permisos fuera de él.
