Status: accepted
Owner: Product / Engineering
Canonical: no
Last reviewed: 2026-10-10
Related: docs/15-handoff/PHASE4_SPEC.md, docs/14-decisions/ADR-0030.md, docs/14-decisions/ADR-0031.md, docs/14-decisions/ADR-0032.md, docs/14-decisions/ADR-0033.md, docs/14-decisions/ADR-0034.md, docs/04-domain-model/invariants.md
Depends on: PHASE4_SPEC v5 (aprobada el 2026-10-10)

# Fase 4 · matriz alcance → criterio → prueba (v5 · alcance aprobado)

**Todas las pruebas de esta matriz están pendientes**: nada de la Fase 4 está implementado. Una especificación no
cuenta como prueba superada. Los archivos son los previstos y se confirman al implementar. Tipos: U = `pnpm test`
(motor/DB), E = `pnpm test:e2e`, V = `pnpm test:visual`, P = `pnpm test:pilot:e2e`, S = revisión de seguridad,
X = verificación con proveedor o aplicación real (requiere acceso externo), H = aceptación del propietario.

Estado de entrega por fila: implementado · verificado en DEMO · verificado con proveedor · pendiente de acceso
externo · aceptado por propietario.

## Recorridos de aceptación

| ID | Recorrido | Criterio | Prueba |
|---|---|---|---|
| ACC-01 | Lanzamiento | oferta → objetivo anual y 90 días → identidad importada/completada/creada y kit aprobado → cinco entregables → sitio multipágina → revisión del cliente → publicación autorizada → campañas conectadas → resultados → revisión humana, sin pasos simulados ocultos | E `tests/browser/phase4-launch.spec.ts` (simuladores etiquetados) + X por proveedor + H |
| ACC-02 | Organización mensual | calendario y lista muestran los mismos registros; responsables, fechas y presupuesto; un cambio conserva el historial | U `tests/phase4-plan-cases.ts`, E |
| ACC-03 | Aprobación | compartir versión, comentar, corregir, aprobar; la aprobación anterior no vale para la pieza modificada | U `tests/phase4-approval-cases.ts`, E |
| ACC-04 | Permisos | acceso cruzado entre marcas denegado en UI, API, descarga, búsqueda, Brando, cola, vista previa y callback OAuth; cliente sin editar estrategia/plan ni publicar ni gastar | U `tests/phase4-permission-cases.ts`, E, P, S |
| ACC-05 | Publicación | un borrador nunca cambia el sitio vivo; restaurar versión anterior; dominios y archivos de otra marca fuera de alcance | U `tests/phase4-site-cases.ts`, E, S |
| ACC-06 | Operaciones externas | reintento, caída o timeout no duplican gasto ni recursos; revocación y sesión vencida dan explicación accionable; estado remoto comprobado | U `tests/phase4-external-cases.ts` con simulador, X |
| ACC-07 | Fuentes | propuestas y supuestos separados de evidencia; decisiones y aprobaciones humanas; ningún aprendizaje aceptado automáticamente | U, evals |
| ACC-08 | UX | navegación compacta, paneles plegables, teclado/foco/zoom, móvil, sin controles de capacidades inexistentes | E `tests/browser/phase4-navigation.spec.ts`, V |
| ACC-09 | Regresión | recorridos de Fases 1–3, historia y separación de Mi aprendizaje intactos | suites existentes completas |

## Identidad visual (ADR-0034)

| ID | Criterio | Prueba |
|---|---|---|
| IDN-001 | Importar un kit existente: candidatos con archivo/página de origen, corrección humana, aprobación de una versión; originales sin alterar; otra marca intacta | U `tests/phase4-identity-cases.ts`, E |
| IDN-002 | Crear desde la estrategia: direcciones con razones y versiones citadas, recursos utilizables (diseñador, Canva o carga) y guía coherente; todo sin aprobar hasta la acción humana; un moodboard no cierra el recorrido | U, E, X (Canva) |
| IDN-003 | Completar una identidad parcial sin rediseño forzado; ningún valor `ESTIMATED` pasa a `CONFIRMED` sin acción humana; derechos desconocidos visibles | U, E |
| IDN-004 | La misma versión del kit en una pieza social, un sitio, un anuncio visual y una presentación, con recursos exactos (id + huella) en cada manifiesto | U, E |
| IDN-005 | Aprobar otra versión: vista de impacto y revisión; sitios, anuncios y presentaciones publicados no cambian ni heredan aprobación; se puede mantener la versión anterior de forma explícita | U, E |
| IDN-006 | Invitado de una marca, permisos de archivos, búsqueda, Brando y contexto enviado a Canva: ninguna exposición entre marcas ni de borradores no compartidos | U, S |
| IDN-007 | Archivo no admitido, SVG con script o referencia externa, fuente ausente o sin permiso, logotipo de resolución insuficiente, formato no disponible: explicación y alternativa real | U, S |
| IDN-008 | Contraste medido en las parejas usadas, legibilidad a tamaño pequeño, transparencia real, vista móvil y exportaciones | U, E, V |

## Versiones y plan compartido

| ID | Criterio | Prueba |
|---|---|---|
| VER-001 | Crear un borrador nuevo deja intactas la versión aprobada y la publicada (y el sitio vivo) | U |
| VER-002 | `SUPERSEDED` sólo cuando otra versión posterior es aprobada; la aprobación histórica sigue ligada a su versión | U |
| VER-003 | Volver a elegir una versión anterior es explícito y no aprueba una modificación | U |
| VER-004 | Guía web, PDF y recursos publicados corresponden a la misma versión publicada del kit | U, E |
| PLN-001 | Editar el plan no modifica la `PlanSnapshot` compartida | U |
| PLN-002 | Aprobar una instantánea o revisión distinta → 409 sin efectos | U |
| PLN-003 | El avance de acciones se comparte sin nueva aprobación; acciones posteriores no se ven hasta otra instantánea | U, E |

## Invariantes de dominio propuestos

Se incorporan a [invariants](../04-domain-model/invariants.md) cuando exista su prueba.

| ID | Criterio | Prueba |
|---|---|---|
| MKT-001 | Toda tabla nueva filtra por workspace y marca; otra organización → 404, marca no asignada → denegado | U |
| MKT-002 | Cambiar una decisión, oferta o kit marca «Origen actualizado» como proyección; no reescribe, no crea revisión ni versión (INV-008) | U `tests/phase4-source-cases.ts` |
| MKT-003 | Ofertas, entregables, kit, sitio y campaña cambian sólo con versión nueva; la anterior sigue legible | U |
| MKT-004 | Revisión o versión esperada desactualizada → 409 sin efectos | U |
| MKT-005 | Misma clave → mismo resultado; otra huella → 409 | U |
| MKT-006 | Una estimación de precio nunca se muestra como dato confirmado; moneda y vigencia obligatorias si hay precio | U, E |
| MKT-007 | Acción comercial exige oferta de la misma marca; institucional se vincula a la marca | U |
| APR-001 | Aprobación ligada a versión, huella y actor; otra versión o huella no la hereda | U |
| APR-002 | Aprobar con huella obsoleta → 409 | U |
| APR-003 | Aprobar (también una identidad) no concede publicar ni gastar | U, E |

## Permisos y portal (ADR-0033)

| ID | Criterio | Prueba |
|---|---|---|
| PRT-001 | Un invitado accede sólo a su marca; los endpoints de equipo lo rechazan; una invitación nunca abre otras marcas de la agencia | U, P |
| PRT-002 | El invitado lee sólo versiones compartidas (instantáneas de estrategia y plan, guía publicada, entregables) y sus recursos necesarios; nunca comentarios internos, plan vivo, ofertas internas, Brando ni conexiones | U, E |
| PRT-003 | El invitado no puede editar estrategia, plan, ofertas, kit ni sitio (API directa incluida) | U, S |
| PRT-004 | Retirar el acceso deniega la siguiente petición: página, descarga, vista previa y enlace directo | U, S |
| PRT-005 | Publicar, gastar, conexiones e invitaciones exigen su capacidad por marca en servidor | U |
| PRT-006 | Una persona ADMIN de A e invitada de B conserva su trabajo en A y sólo capacidades de invitado en B; cambiar de workspace sólo entre membresías propias | U, P |
| PRT-007 | Mi aprendizaje de una persona no es visible para un ADMIN ni aparece en búsqueda, exportaciones, portal o contexto de Brando de otros | U |

## Operaciones externas (ADR-0031)

| ID | Criterio | Prueba |
|---|---|---|
| EXT-001 | Encolar reserva la autorización en la misma transacción; una autorización sólo puede reservarse para un trabajo | U |
| EXT-002 | Dos workers concurrentes y relevo: un solo intento enviado por paso; si A pierde su concesión, B reclama y A vuelve, el `UPDATE` condicionado de A no afecta filas y A no envía nada | U |
| EXT-003 | Caída antes de registrar el intento `DISPATCHING` → otro worker puede reclamar; nada se envió | U (simulador) |
| EXT-004 | Caída después del intento o respuesta perdida → `NEEDS_CHECK`, sin reenvío automático | U (simulador) |
| EXT-005 | Recurso visible con retraso: la conciliación lo encuentra; no encontrarlo no se trata como «no creado» | U (simulador) |
| EXT-006 | Éxito parcial (campaña creada, grupo incierto): el grupo queda en `NEEDS_CHECK` y no se repite por no encontrarlo; los pasos que dependen de él no se envían; activar exige otra autorización | U (simulador) |
| EXT-007 | Autorización vigente al encolar y vencida al enviar; cancelada, consumida o con huella distinta; permiso o conexión revocados antes del envío → el paso no se envía; `RESERVED → EXPIRED` | U |
| EXT-008 | Cancelar un trabajo ya enviado se muestra «en curso/pendiente de comprobación», nunca «cancelado» sin confirmación remota | U, E |
| EXT-009 | Credenciales nunca en respuestas, logs, telemetría, prompts ni exportaciones; cifradas en reposo; `state` OAuth ajeno, vencido, reutilizado o de otra marca → rechazado | U, S |
| EXT-010 | Estados editorial, publicación y proveedor separados; rechazos sincronizados; presupuesto diario no presentado como tope total | U, E, X |
| EXT-011 | Caída entre pasos de creación: los pasos correctos conservan sus ids; el siguiente paso sólo se envía tras revalidar caducidad, concesión y huella | U (simulador) |
| EXT-012 | Grupo rechazado definitivamente sin efecto remoto: puede reenviarse o corregirse sólo bajo autorización vigente que lo cubra; si cambia el contenido, autorización nueva | U (simulador) |
| EXT-013 | Respuesta perdida de un paso: `NEEDS_CHECK`, sin reenvío; el resultado que llega tarde se registra por id de intento aunque la concesión haya vencido, sin habilitar más envíos de ese worker | U (simulador) |
| EXT-014 | Autorización que vence con pasos hechos y otros pendientes: trabajo `PARTIAL`, autorización `EXPIRED`, continuación sólo con autorización nueva sobre lo que falta | U |
| EXT-015 | A se detiene justo después de confirmar `DISPATCHING` y antes de la llamada; vence su concesión; B recupera; A se reanuda: B no envía ese paso, no se habilita repetición humana mientras A pueda enviar (ventana de cierre abierta), no se comunica cancelación confirmada y el resultado tardío de A se conserva | U (simulador con suspensión controlada) |
| EXT-016 | A se reanuda después de `dispatchBy`: comprueba el plazo antes de abrir la conexión, no envía y el intento queda registrado como no enviado | U (simulador) |
| EXT-017 | Revocación o caducidad de la autorización **antes** del inicio del intento → no se envía; **después** → se registra, bloquea los pasos siguientes y se muestra «En curso / Pendiente de comprobación», nunca «cancelado» | U |
| EXT-018 | Repetición humana (ajuste C1): con «no lo veo», búsqueda vacía, concesión perdida, suspensión o plazo vencido → denegada; sólo con evidencia verificable de que el intento no puede emitir (proceso terminado observado por el supervisor, o credencial del intento caducada/revocada), resultado remoto resuelto después de esa evidencia y autorización vigente → permitida como intento nuevo, conservando los anteriores; si el proveedor confirma éxito, se vincula y no se repite | U (simulador) |
| EXT-019 | Resultado tardío que contradice un `NOT_CREATED` → evidencia conservada sin sobrescribir, incidencia «posible duplicado» y pasos siguientes detenidos | U (simulador) |
| EXT-020 | A se suspende **después de la última comprobación del plazo y antes de escribir en la red**, y se reanuda: sin evidencia de proceso terminado o credencial inutilizable el paso sigue «Pendiente de comprobación» aunque haya pasado la ventana de cierre; terminar A localmente no se presenta como cancelación de una petición que el proveedor pudo recibir | U (simulador con suspensión controlada) |
| EXT-021 | Con un paso incierto sin resolver, crear otro trabajo de creación o activación para la misma campaña (cualquier versión) o duplicar la campaña → 409 sin efectos | U |
| EXT-022 | Confirmar la ausencia remota nunca vuelve ejecutable un paso: sin liberación humana persistida para ese intento no se reclama ni se envía | U |
| EXT-023 | Un «posible duplicado» no lo borra la conciliación ni el recálculo y bloquea la repetición | U |
| EXT-024 | Un solo trabajo abierto por campaña (índice único); continuar exige la misma cuenta vinculada y proveedor | U |
| EXT-025 | Un worker registrado como terminado no reclama ni inicia intentos; el supervisor registra la salida real del proceso hijo | U |
| EXT-026 | Sólo se vincula una cuenta accesible con la credencial, por quien la conectó o un ADMIN; cada paso remoto lleva esa cuenta | U, S |

## Cierre y eliminación de marca

| ID | Criterio | Prueba |
|---|---|---|
| DEL-001 | Marca con campaña activa: el cierre la muestra, ofrece pausa verificada o entrega explícita; la eliminación responde 409 mientras siga sin resolver | U `tests/brand-deletion-cases.ts` ampliado |
| DEL-002 | Proveedor inaccesible: el asunto queda abierto hasta conciliar o registrar la entrega; nunca se afirma gasto detenido | U (simulador) |
| DEL-003 | Trabajo ya enviado → se concilia antes de cerrar; trabajo en cola → cancelado con su autorización | U |
| DEL-004 | Credencial usada por otra marca sigue activa; conexiones personales de Canva intactas | U |
| DEL-005 | Sitio, vistas previas, comparticiones y recursos privados dejan de servirse; otras marcas sin cambios; después la eliminación de ADR-0029 borra las filas nuevas | U, S |
| DEL-006 | Una campaña activada (o con presupuesto cambiado) sin pausa posterior verificada bloquea la eliminación de la marca | U |

## Sitios y medición (ADR-0032)

| ID | Criterio | Prueba |
|---|---|---|
| SITE-001 | Vista previa sin sesión, URL limpia abierta con otra identidad sin permiso, sesión de otra marca o permiso retirado antes de vencer → denegado | U, S |
| SITE-002 | Publicar cambia el puntero de forma atómica; restaurar crea publicación nueva; historial intacto | U |
| SITE-003 | Servidor público y de vista previa en orígenes distintos de la app; el público no lee, fija ni registra cookies; host de otra marca → 404 | U, S |
| SITE-004 | Sólo secciones del catálogo; contenido malicioso escapado; testimonios/cifras sólo con fuente | U (instantáneas del renderizador) |
| SITE-005 | Preflight: sin alternativa de imagen, enlace roto, destino de formulario, contraste insuficiente o requisito del kit → no publica | U |
| SITE-006 | Formulario: campo trampa, tamaño y frecuencia limitados; solicitud guardada en su marca | U, S |
| SITE-007 | Peticiones directas a imágenes, fuentes o CSS de un borrador sin autorización → denegadas | U, S |
| SITE-008 | El código de vista previa es de un solo uso (reutilizarlo falla), no queda en la URL final ni en registros, `Referer` ni cachés | U, S |
| SITE-009 | Código válido y sin usar copiado a otro navegador, o canjeado en una transacción distinta (otro `state` o verificador): no crea sesión, aunque ese navegador lo use primero | U, S |
| SITE-010 | Miembro con lectura revisa un borrador interno sin `Share`; invitado sin la versión compartida → denegado | U, E |
| MEA-001 | Cuenta con evento pero destino sin instrumentar → captación no disponible, «Falta conectar la medición» | U, E |
| MEA-002 | Destino correcto con evento recibido → `VERIFIED`; un evento de otro sitio de la cuenta no cuenta | U, X |
| MEA-003 | Evento duplicado deduplicado; solicitud del formulario propio contada aparte, sin presentarse como conversión atribuida | U |
| MEA-004 | Etiquetas sólo tras consentimiento y sólo con identificadores validados; ningún JavaScript del usuario | U, S |
| MEA-005 | Pérdida de la conexión de medición → `LOST`; datos pendientes o sin datos, nunca cero | U, E |
| MEA-006 | Restaurar una versión sin medición → `NOT_CONNECTED` para esa publicación; captación no activable | U |
| MEA-007 | Cambiar el evento conservando la URL, sustituir el formulario medido o retirar la etiqueta → `NEEDS_REVERIFICATION` | U |
| MEA-008 | Cambio visual que conserva la huella de medición → sigue `VERIFIED` sin repetir la verificación | U |
| MEA-009 | Medición que deja de ser vigente después de autorizar y antes de enviar la activación → el paso de activación no se envía y se explica qué falta | U (simulador) |
| MEA-010 | Identificador de etiqueta válido pero de una cuenta no conectada a la marca → rechazado | U, S |
| MEA-011 | Campaña activa cuya medición deja de ser vigente → incidencia visible con acciones posibles; ninguna pausa automática ni afirmación de gasto detenido | U, E |
| MEA-012 | Publicar V1 y verificar; publicar V2 con cambios sólo visuales → registro de compatibilidad V2↔evidencia de V1; activar captación con V2 es posible y la evidencia de V1 queda intacta | U |
| MEA-013 | Desde V2 compatible, cambiar evento, formulario medido o consentimiento → la compatibilidad no se aplica y la activación exige nueva verificación | U |

## Exportaciones (ADR-0030)

| ID | Criterio | Prueba |
|---|---|---|
| EXP-001 | PPTX abre sin reparación en la aplicación de destino; títulos y textos son cuadros de texto editables; imágenes correctas | X (EXT-REQ-12), U (estructura OOXML) |
| EXP-002 | Presentación y guía de dos marcas visualmente distintas corresponden a sus kits | U, V, H |
| EXP-003 | Español con acentos, ñ, comillas, guiones y símbolos de moneda sin pérdida en PPTX, DOCX y PDF | U |
| EXP-004 | Fuente ausente o sin permiso de incrustación → alternativa revisada del kit y aviso; nunca sustitución silenciosa | U, E |
| EXP-005 | El PDF corresponde visualmente con la versión publicada del kit (comparación renderizada) | U, V |

## Pregunta inicial de prioridad · requisito confirmado (PHASE4_SPEC §4.9)

**Alcance base:** cuentan para declarar la fase completa, con el formulario actual de alta, se incluya o no el
inicio guiado completo.

| ID | Criterio | Prueba |
|---|---|---|
| INT-001 | Tras los datos básicos se pregunta «¿Qué te gustaría trabajar primero con tu marca?»; «Desarrollar mi estrategia completa» lleva al recorrido de las nueve decisiones y «Definir o mejorar un punto» permite elegir el punto (o recibir ayuda) sin forzar las nueve | E |
| INT-002 | La prioridad se guarda con su marca y permisos (`BrandWorkPriority`); al volver a entrar se recupera; cambiarla añade un registro, conserva la historia y Brando deja de usar la anterior como vigente | U, E |
| INT-003 | Elegir o cambiar la prioridad no duplica datos ni archivos, no reescribe decisiones, planes ni contexto, y no crea ni aprueba una versión de Strategic Objective | U |
| INT-004 | «Preparar una campaña» con objetivo de tráfico no exige medición verificada; con objetivo de captación la exige; «Organizar mi marketing» abre el plan anual con prioridades de 90 días | U, E |
| INT-005 | «Incorporar, completar o crear mi identidad visual» con una identidad parcial abre Identidad visual en «Quiero completarla», sin forzar rediseño | E |
| INT-006 | Sin IA: la pregunta, la persistencia y la adaptación funcionan; «No estoy seguro» ofrece una orientación determinista | U, E |
| INT-007 | Teclado y móvil: tarjetas seleccionables con foco visible y etiquetas accesibles; ninguna entrada nueva en el lateral | E, V |
| INT-008 | Elegir una tarjeta no modifica permisos ni aprueba nada; un invitado no ve ni cambia la prioridad; telemetría sólo con la intención elegida, nunca el texto libre | U, S |

## Inicio guiado completo · incluido (PHASE4_SPEC §4.10)

**Obligatorios desde la aprobación del propietario del 2026-10-10:** cuentan para declarar la fase completa. ONB-001…ONB-004 de la v3 (pregunta de objetivo) se trasladaron a
INT-001…INT-008 y sus identificadores no se reutilizan.

| ID | Criterio | Prueba |
|---|---|---|
| ONB-005 | Usuario sin documentos completa la ficha mínima con preguntas breves; Brando pregunta sólo lo que falta para la prioridad elegida | E |
| ONB-006 | Agencia con manual y catálogo: archivos cargados una sola vez, reutilizados en identidad; candidatos con origen; conflictos entre documentos visibles para que la persona elija | U, E |
| ONB-007 | Identidad parcial e inferencias incorrectas: la persona corrige; nada inferido pasa a confirmado sin su acción | U, E |
| ONB-008 | Salir y retomar; cambiar entre guía y ficha sin pérdida; reintentar no crea marcas ni archivos duplicados | U, E |
| ONB-009 | Fallo de IA o de extracción: la ficha manual sigue disponible y el archivo se conserva | U, E |
| ONB-010 | Confirmar la ficha no aprueba estrategia, kit ni plan; el resumen distingue confirmados, propuestas y pendientes | U, E |
| ONB-011 | Archivos y borrador aislados por marca y usuario; un invitado no entra en este recorrido y ve su portal | U, S |
| ONB-012 | El progreso se muestra por etapas reales, sin porcentajes ficticios | E |

## Dominio propio del cliente · incluido (ADR-0032)

| ID | Criterio | Prueba |
|---|---|---|
| DOM-001 | Asociar un dominio exige demostrar su control con el registro que añade el cliente; sin verificación no se sirve el sitio en ese dominio | U, E |
| DOM-002 | Un dominio ya asociado a otra marca (de cualquier workspace) se rechaza sin revelar a cuál | U, S |
| DOM-003 | HTTPS se prepara sólo tras la verificación; mientras tanto el sitio sigue en el subdominio de Brandopolis | U, X |
| DOM-004 | Retirar el dominio deja de servirlo y libera la asociación; la nueva verificación periódica detecta la pérdida de control y lo retira, evitando dominios colgantes o reasignaciones indebidas | U, S |
| DOM-005 | Cierre de marca retira sus dominios (ADR-0031) | U |
| DOM-006 | Ninguna compra, cambio de DNS ni sustitución de un sitio existente ocurre automáticamente | U, revisión |

## Consentimiento · controles aprobados (ADR-0032)

| ID | Criterio | Prueba |
|---|---|---|
| CNS-001 | Las etiquetas opcionales no se cargan antes de aceptar (ninguna petición a orígenes del proveedor) | E, S |
| CNS-002 | Aceptar y rechazar tienen la misma claridad y accesibilidad (teclado, foco, móvil) | E, V |
| CNS-003 | La persona puede cambiar su elección después y el cambio surte efecto | E |
| CNS-004 | El texto y la configuración de consentimiento forman parte de la versión del sitio; cambiarlos crea versión nueva e invalida la compatibilidad de medición (MEA-007/013) | U |

## Invitaciones · modalidad aprobada (ADR-0033)

| ID | Criterio | Prueba |
|---|---|---|
| IVT-001 | Invitación por email como vía principal; el destinatario debe iniciar sesión con la identidad comprobada para aceptarla | U, P |
| IVT-002 | Enlace de un solo uso como alternativa: misma invitación, misma comprobación de destinatario; reutilizarlo o usarlo con otra identidad falla | U, S |
| IVT-003 | Invitación vencida o revocada → no se acepta; retirar el acceso surte efecto en la siguiente petición | U |
| IVT-004 | Una invitación da acceso sólo a su marca, nunca a otras de la agencia | U, P |
| IVT-005 | Sin proveedor de email configurado, la interfaz lo dice y ofrece el enlace; nunca simula un envío | E |
## Otros

| ID | Criterio | Prueba |
|---|---|---|
| CNV-001 | Recuperar un diseño de Canva crea una versión nueva que exige revisión; la aprobada no cambia | U, X |
| CNV-002 | Capacidad no disponible en el plan o no verificada → se muestra y el resto sigue útil | E, X |
| RES-001 | Sin conexión = dato pendiente, nunca cero; etiqueta manual/importado/sincronizado | U, E |
| RES-002 | Conversiones de proveedores no se suman como personas únicas | U |
| RES-003 | Mantener/ajustar/volver a probar sólo por acción humana con criterio; ningún aprendizaje automático (INV-007, VAL-010) | U |
| BRN-001 | Propuestas de marketing e identidad sin escrituras, sin trabajos encolados ni credenciales; caso de inyección con cero efectos | U, evals |
| BRN-002 | Contexto filtrado por marca, rol y privacidad antes de enviarlo; fallo de IA deja la edición manual | U |
| NAV-001 | Siete entradas, filas de 44–48 px, sin desplazamiento a 1366×768, 1440×900 y 1920×1080; con zoom alto todo alcanzable | E |
| NAV-002 | Subnavegación accesible por teclado y selector en móvil; nueve decisiones dentro de Estrategia; búsqueda limitada a lo permitido | E, V |

## Estado de implementación · bloque 2 (2026-10-10)

Implementado y verificado con pruebas automáticas en DEMO (simulador de proveedor, reloj controlado). Ninguna fila
está «verificada con proveedor»: Google, Meta y Canva siguen pendientes de acceso externo.

| Estado | Criterios |
|---|---|
| Implementado · verificado en DEMO | INT-002, INT-003, PRT-005, VER-001…003 y APR-001/002 (reglas de dominio), EXT-001, EXT-002, EXT-004, EXT-005, EXT-007, EXT-009, EXT-013, EXT-015, EXT-016 (dominio), EXT-018…026, DEL-001, DEL-003, DEL-006 |
| Parcial | EXT-006 (éxito parcial: cubierto con rechazo y continuación; el caso «grupo incierto» se apoya en EXT-004/022), EXT-010 (estados separados en datos; sin interfaz todavía), DEL-002/004/005 (bloqueo y conservación de conexiones probados; falta el recorrido `BrandClosure`) |
| Pendiente | Todo lo demás: navegación, ofertas, plan, identidad, entregables, sitios, medición, Canva, Ads reales, invitados y resultados |
## Estado de implementación · bloque 3 (avance, 2026-10-10)

Sobre el código del commit de resguardo `25a763c`. Regresión completa ejecutada: test:e2e 217 PASS · 13 SKIP · 0 FAIL (230), test:visual sin diferencias, test:pilot:e2e 10/10.

| Estado | Criterios |
|---|---|
| Implementado · verificado en DEMO | INT-001 (U `tests/work-priority-views.test.ts`, E `tests/browser/phase4-priority.spec.ts`), INT-002 (E añadida), INT-007 (E, 5 proyectos), MKT-003, MKT-004, MKT-005, MKT-006 (U, E), APR-001/002 y VER-001/002 aplicados a ofertas (U `tests/offers-cases.ts`, E `tests/browser/phase4-offers.spec.ts`), MKT-001 para ofertas (otra organización → 404, otra marca sin acceso a la oferta) |
| Parcial | MKT-002 (sólo ofertas citando decisiones; la prueba vive en `tests/offers-cases.ts`, no en el archivo previsto), INT-005 (el área de identidad aún no existe: se nombra sin botón), INT-006 (orientación determinista probada; falta el recorrido completo sin IA), INT-008 (prioridad sin efecto en permisos; invitados y telemetría aún no existen), VER-003 (sin selección explícita de versión anterior en ofertas) |
| Pendiente | INT-004, plan, entregables, navegación de siete entradas, Brando marketing y los demás bloques |

## Estado de implementación · bloque 3 (seguridad de ofertas y plan, 2026-10-10)

| Estado | Criterios |
|---|---|
| Implementado · verificado en DEMO | Ofertas reforzadas: MKT-004 sin atajo por revisión omitida, MKT-005 en la decisión, APR-001/002 con registro append-only y repetición idempotente (U `tests/offers-cases.ts`). Plan: MKT-001, MKT-004 y MKT-005 para plan, objetivos y acciones; estados de PlanAction (U `tests/plan-cases.ts`, `tests/plan-views.test.ts`; E `tests/browser/phase4-plan.spec.ts`); INT-004 en su parte «Organizar mi marketing abre el plan anual con prioridades de 90 días» (enlace desde Inicio, U) |
| Pendiente | PLN-001…003 (instantánea compartida y avance), vista de calendario, resto de INT-004 (campañas) |

## Estado de implementación · bloque 3 (plan compartido y calendario, 2026-10-10)

Evidencia sobre el árbol de trabajo `217ac4d7…` (ver SESSION_STATE): test:e2e 227 PASS · 13 SKIP · 0 FAIL, PILOT 10/10.

| Estado | Criterios |
|---|---|
| Implementado · verificado en DEMO | PLN-001, PLN-002, PLN-003 (U `tests/plan-cases.ts`, `tests/plan-views.test.ts`; E `tests/browser/phase4-plan.spec.ts`); calendario como vista de los mismos registros (§4.2) |
| Parcial | Lectura del cliente: separada y limitada a la versión aprobada y su avance; la verificación con identidad de invitado queda para IVT/PRT al existir el portal (ADR-0033) |

## Estado de implementación · bloque 3 (navegación, entregables y Brando, 2026-10-10)

Evidencia sobre el árbol `1f374eb2…` (ver SESSION_STATE): test:e2e 242 PASS · 13 SKIP · 0 FAIL, PILOT 10/10.

| Estado | Criterios |
|---|---|
| Implementado · verificado en DEMO | Navegación de siete entradas (§3); entregables §4.4 con MKT-001/003/004/005, VER-001/002 y APR-001/002 aplicados (U `tests/deliverables-cases.ts`, E `tests/browser/phase4-deliverables.spec.ts`); BRN-001 y BRN-002 para la superficie de marketing (U `tests/brando-marketing-cases.ts`, evals `evals/brando-marketing.json`; DEMO, sin Live AI) |
| Parcial | Exportaciones: sólo texto (EXP-001…005 pendientes); revisión de entregables por invitado (ADR-0033) hasta Colaboración |
| Pendiente | CNV-001/002 (Canva), marca y recursos, colaboración, resultados |

## Gates por bloque

Matriz de brandopolis-review según archivos tocados: typecheck, lint, `pnpm test` (incluye INV-001..010, VAL, WS,
BRD y los nuevos), E2E, visual, PILOT E2E, Foundation antes y después de contratos, validadores de UI y Brand
Master, `/security-review` para endpoints, permisos, OAuth, sitio público, vista previa, archivos, inyección, cola
y acciones externas; Live AI según el procedimiento existente con la clave introducida por el propietario.
Ninguna prueba se debilita para pasar.

## Historial de revisiones

| Versión | Fecha | Cambio |
|---|---|---|
| v1 | 2026-10-10 | Candidato del ZIP de revisión de las 12:42 (SHA-256 `4de4fecb…ffe14`) |
| v2 | 2026-10-10 | Identidad (IDN), versiones y plan (VER, PLN), PRT-001/002 corregidos y PRT-006/007 nuevos, EXT reescrito (reserva y recuperación), DEL ampliado (cierre), SITE-001/003 corregidos y SITE-007/008 nuevos, medición (MEA), exportaciones (EXP) |
| v3 | 2026-10-10 | Dictamen v2: C1 (EXT-002/006/007 precisados; EXT-011…014 nuevos), C2 (SITE-001/008 precisados; SITE-009/010 nuevos), C3 (MEA-006…011 nuevos); inicio guiado ONB-001…012 como propuesta condicionada a su inclusión |
| v4 | 2026-10-10 | Dictamen v3: EXT-015…019 (envío tardío tras `DISPATCHING`, plazo de envío, revocación a ambos lados del inicio, repetición humana con evidencia, resultado tardío contradictorio); MEA-012/013 (compatibilidad de publicación); INT-001…008 como alcance base de la pregunta de prioridad; ONB-001…004 trasladados a INT, ONB-005…012 siguen condicionados al inicio guiado completo |
| v5 | 2026-10-10 | Aprobación del propietario: ONB-005…012 obligatorios; EXT-018 ajustado al C1 final; EXT-020 (suspensión tras la última comprobación del plazo) y EXT-021 (sin atajo por otro trabajo); DOM-001…006, CNS-001…004 e IVT-001…005 nuevos; todas las pruebas siguen pendientes |
| v6 | 2026-10-10 | Bloque 2: EXT-022…026 y DEL-006 (correcciones de la revisión de seguridad) y sección «Estado de implementación»; el resto sigue pendiente |
| v7 | 2026-10-10 | Bloque 3 (avance): prioridad de trabajo y ofertas; sección «Estado de implementación · bloque 3» |
| v8 | 2026-10-10 | Bloque 3: revisión de seguridad de ofertas y Plan de Marketing; sección de estado correspondiente |
| v9 | 2026-10-10 | Bloque 3: PLN-001…003 y calendario implementados; sección de estado correspondiente |
| v10 | 2026-10-10 | Bloque 3: navegación de siete entradas, entregables y Brando para marketing; sección de estado correspondiente |
