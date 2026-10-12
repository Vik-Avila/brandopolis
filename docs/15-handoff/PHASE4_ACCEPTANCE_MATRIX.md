validado en DEMO en su parte F4: presupuesto planificado separado del gasto real (sin conectar) y referencias de campaña «sin verificar»; no hay conversiones de proveedores (U)
Owner: Product / Engineering
Canonical: no
Last reviewed: 2026-10-11
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
| Parcial | Exportaciones: sólo copiar/descargar texto; EXP-001…005 pendientes para el bloque 6, empezando por comprobar el generador PDF propio y `jszip` (ADR-0030); revisión de entregables por invitado (ADR-0033) hasta Colaboración |
| Pendiente | CNV-001/002 (Canva), marca y recursos, colaboración, resultados |

## Estado de implementación · bloque 4 (identidad visual, base, 2026-10-10)

Evidencia sobre `eca854f`: pnpm test 450 PASS, test:e2e 247 PASS · 13 SKIP · 0 FAIL, PILOT 10/10.

| Estado | Criterios |
|---|---|
| Implementado · verificado en DEMO | IDN-001 (incorporar con candidatos del manual y corrección humana), IDN-003 (sin confirmación silenciosa), IDN-005 (otra versión aprobada: impacto y revisión, publicadas intactas), IDN-006 (alcance por marca), IDN-007 en su parte de archivos (firma, SVG nunca servido, formato no admitido), IDN-008 en su parte de contraste por pareja; DEL-005 para archivos del kit (U `tests/brand-kit-cases.ts`, `tests/brand-deletion-cases.ts`, `tests/kit-assets.test.ts`, `tests/brand-kit-domain.test.ts`; E `tests/browser/phase4-identity.spec.ts`) |
| Parcial | IDN-002 (crear desde la estrategia: borrador manual; direcciones de Brando pendientes), IDN-004 (manifiesto con la versión del kit en materiales; sitio, anuncio visual y presentación pendientes), IDN-007/008 (fuentes sin permiso, resolución por uso real, exportaciones) |

## Gates por bloque

Matriz de brandopolis-review según archivos tocados: typecheck, lint, `pnpm test` (incluye INV-001..010, VAL, WS,
BRD y los nuevos), E2E, visual, PILOT E2E, Foundation antes y después de contratos, validadores de UI y Brand
Master, `/security-review` para endpoints, permisos, OAuth, sitio público, vista previa, archivos, inyección, cola
y acciones externas; Live AI según el procedimiento existente con la clave introducida por el propietario.
Ninguna prueba se debilita para pasar.

## Estado de implementación · inicio guiado (2026-10-11)

Regresión sobre el árbol de este cambio: `pnpm test` 458 PASS; test:e2e 280 pruebas, 267 PASS · 13 SKIP · 0 FAIL
(5 proyectos); test:visual estructura PASS (las 4 diferencias de píxeles son las de la comparación v5 pendiente);
test:pilot:e2e 10/10. Todo en DEMO aislada; ninguna IA real interviene.

| Estado | Criterios |
|---|---|
| Implementado · verificado en DEMO | ONB-005 (U `tests/brand-setup-cases.ts`, E `tests/browser/phase4-setup.spec.ts`: sólo se pregunta lo que falta para la prioridad, una pregunta a la vez, «No lo sé todavía»), ONB-008 (U: inicio idempotente, una sola marca al reintentar, prioridad una vez, 409, mismo archivo guardado una vez por marca; E: guardar y salir, retomar desde Inicio, guía ↔ ficha sin pérdida, archivo reutilizado), ONB-010 (U: confirmar sólo registra contexto declarado distinto del vigente; sin versiones, kit, plan ni aprobaciones; E: resumen confirmado / propuesto / pendiente), ONB-012 (E: cuatro etapas con palabra Hecho / Ahora / Pendiente, sin porcentajes), ONB-006 (U `tests/brand-kit-cases.ts`: los PDF ya cargados se ofrecen al kit una sola vez, nunca de otra marca ni en otro formato; E `tests/browser/phase4-identity.spec.ts`: el manual subido en el inicio guiado se usa en Identidad visual sin volver a subirlo y se extraen candidatos con archivo y página; extracción determinista sin IA), ONB-007 (U/E: identidad parcial empieza con lo que existe y muestra lo que falta por canal; una inferencia corregida pasa a constar como de la persona, conserva la página de referencia y sigue sin confirmar hasta adoptarla; un valor nuevo no puede atribuirse a un documento) |
| Parcial | ONB-009 (E: sin extractor o IA la ficha y las preguntas siguen y el archivo se conserva; sin prueba con un proveedor real que falle), ONB-011 (U: borrador privado de su autor, aislado por workspace y marca, sin permiso de alta no se inicia; el portal del invitado no existe todavía) |

## Estado de implementación · colaboración y guía viva (2026-10-11)

Todo en DEMO aislada con dos identidades reales distintas (agencia e invitado, cada una con su sesión); ninguna IA
ni proveedor externo interviene. Sin proveedor de email: la invitación se entrega por enlace de un solo uso.

| Estado | Criterios |
|---|---|
| Implementado · verificado en DEMO | IVT-002 (U `tests/collaboration-cases.ts`: enlace de un solo uso, reutilizarlo con otra identidad falla), IVT-003 (U: vencida o retirada no se acepta; retirar el acceso deniega la siguiente petición), IVT-004 (U: sólo su marca, nunca otra de la agencia), IVT-005 (E `tests/browser/phase4-collaboration.spec.ts`: la interfaz dice que el correo no está configurado y entrega el enlace; nunca simula un envío), PRT-001 (U: los endpoints de equipo responden 404 al invitado; E), PRT-002 (U/E: sólo lo compartido, la guía publicada y comentarios compartidos; nunca internos ni borradores), PRT-003 (U: sin rutas de edición para el invitado; E: el portal no ofrece editar), PRT-004 (U: página y vista previa denegadas tras retirar; E: «Ya no tienes acceso»), PRT-005 (U: invitar y retirar exigen `MANAGE_GUESTS` a un MEMBER), APR-001/002 en el portal (U: aprobación ligada a share, versión, huella y actor; huella obsoleta → 409 sin efectos; clave de idempotencia), APR-003 en el portal (U/E: aprobar no cambia el estado editorial ni publica), guía viva desde el kit publicado (E en `tests/browser/phase4-identity.spec.ts`), ONB-011 (el invitado ve su portal y no entra en el inicio guiado) |
| Parcial | IVT-001 (U: comprobación del destinatario con email verificado y negativa en marcas PILOT sin cuenta; falta la prueba con OIDC real y el envío por email, que necesita proveedor), PRT-006 (U: el invitado conserva su propio workspace y la agencia no ve sus marcas; no existe todavía el cambio de workspace activo entre membresías), ACC-03 (compartir, comentar y aprobar la versión exacta; una versión nueva necesita compartirse y aprobarse de nuevo; falta el recorrido «corregir» completo con materiales en el portal), PRT-007 (sin cambios: Mi aprendizaje no se expone en el portal; sin prueba nueva), comentarios en materiales y ofertas fuera del portal |
| Pendiente | Envío de invitaciones por email (proveedor por decidir), prueba con identidad PILOT/OIDC real de invitado, búsqueda del portal, PDF de la guía, Biblioteca y Plantillas |

## Clientes y Resultados ampliados · issue #10 (adenda del 2026-10-11, paquete revisión 3 · plan v5)

Criterios del paquete de reconciliación (archivo 02), copiados sin renumerar: **48 de la revisión 2 y 46 del plan v5,
94 en total**. «F4» es el adelanto aprobado; «Prueba técnica» condiciona una posible adopción; «F5/F6» preserva el
alcance posterior; «Contrato F4; F5» significa documentar o preparar el contrato ahora y probar el recorrido completo
en la Fase 5. La columna **Estado** distingue: pendiente · documentado · implementado · validado en DEMO · validado
con proveedor o identidad real. Cada avance añade fecha, árbol/commit, comando, entorno y resultado en la sección
«Estado de implementación · Clientes». Un proveedor simulado se etiqueta SIMULADO. Una prueba negativa que sólo
comprueba un botón oculto no demuestra autorización del servidor.

### Captura y documentación (F4)

| ID | Momento | Criterio observable y evidencia esperada | Estado |
|---|---|---|---|
| I10-DOC-01 | F4 | Especificación, aceptación, requisitos, alcance, roadmap, handoff, SESSION_STATE y CHANGELOG concuerdan con el issue; diff revisado y enlaces válidos. | documentado (`6d1e55c`) |
| I10-CLI-01 | F4 | Registrar manualmente una oportunidad y recuperarla tras recarga y nueva sesión; comprobar la fila persistida y su ámbito. | validado en DEMO: U `tests/client-cases.ts` (nueva sesión) + E `tests/browser/phase4-clients.spec.ts` (5 proyectos) (recarga y otro contexto) |
| I10-CLI-02 | F4 | Enviar el formulario web realmente habilitado en desarrollo; comprobar oportunidad y respuesta después de guardar, no solo una llamada simulada. | validado en DEMO: página de desarrollo `/formulario` real, no simulada (E `tests/browser/phase4-clients.spec.ts` (5 proyectos)) |
| I10-CLI-03 | F4 | Origen, fecha de recepción, estado inicial, responsable o cola quedan guardados; relaciones a oferta/público/campaña, si existen, pertenecen a la marca. | validado en DEMO: U `tests/client-cases.ts`; ofertas/segmentos de otra marca rechazados |
| I10-CLI-04 | F4 | Repetir el mismo envío, incluso simultáneamente, produce una sola oportunidad; clave repetida con contenido distinto devuelve conflicto. | validado en DEMO: U `tests/client-cases.ts` (reintento, simultáneos, clave con otro contenido → 409) |
| I10-CLI-05 | F4 | Dos solicitudes legítimas con distintos identificadores y el mismo correo/teléfono se conservan; no hay fusión automática de identidades. | validado en DEMO: U `tests/client-cases.ts` |
| I10-CLI-06 | F4 | Interrumpir antes del commit y después del commit antes de responder: el reintento recupera exactamente un registro por envío. | validado en DEMO: U `tests/client-cases.ts` (fallo antes del commit) + E `tests/browser/phase4-clients.spec.ts` (5 proyectos) (respuesta perdida tras el commit) |
| I10-CLI-07 | F4 | Guardar, modificar y recuperar el siguiente seguimiento; una revisión antigua se rechaza sin perder el cambio vigente. | validado en DEMO: U `tests/client-cases.ts` (409 sin pérdida) + E `tests/browser/phase4-clients.spec.ts` (5 proyectos) |
| I10-CLI-08 | F4 | Sin responsable o seguimiento, la oportunidad aparece en pendientes accionables; los filtros abren el expediente correcto. | validado en DEMO: U `tests/client-cases.ts` + E `tests/browser/phase4-clients.spec.ts` (5 proyectos) (filtro «Por asignar») |
| I10-CLI-09 | F4 | Con Chatwoot y la IA desconectados, registro manual/web y seguimiento nativos siguen funcionando. | validado en DEMO: la DEMO no tiene Chatwoot ni IA y la captura funciona |
| I10-CLI-10 | F4 | Una base no disponible no produce confirmación falsa ni pérdida silenciosa; se permite reintentar con la misma referencia. | parcial: la página no confirma sin respuesta y conserva la referencia (E); el servidor responde 503 sin detalle; sin prueba con la base caída |

### Seguridad y aislamiento

| ID | Momento | Criterio observable y evidencia esperada | Estado |
|---|---|---|---|
| I10-SEC-01 | F4 | Dos espacios y dos marcas del mismo espacio: IDs manipulados no permiten leer, crear, editar, relacionar o agregar datos ajenos. | validado en DEMO: U `tests/client-cases.ts` (otro espacio 404, otra marca, ids manipulados) |
| I10-SEC-02 | F4 | Invitado de marketing sin capacidad comercial no accede a Clientes ni a sus endpoints; ser invitado en otra marca no amplía su acceso. | validado en DEMO: U `tests/client-cases.ts` + E `tests/browser/phase4-clients.spec.ts` (5 proyectos) (invitado real recibe 404 en Clientes y Resultados) |
| I10-SEC-03 | F4 | La asignación admite solo miembros autorizados; revocación y baja surten efecto en la siguiente operación y en trabajos pendientes. | validado en DEMO: U `tests/client-cases.ts` (responsable sin acceso rechazado; baja aplica en la siguiente operación) |
| I10-SEC-04 | F4 | El formulario no acepta un espacio/marca arbitrarios ni relaciones de otra marca; validar también el identificador de formulario. | validado en DEMO: U `tests/client-cases.ts` (marca/espacio del navegador ignorados; formulario desactivado o inexistente → 404) |
| I10-SEC-05 | F4 | Límites, campos malformados y exceso de solicitudes se manejan de forma controlada; no se filtran secretos ni datos personales a logs/telemetría. | parcial: límites y campos malformados probados (U); límite de solicitudes implementado sin prueba de carga; logs sin contenido por revisión de código |
| I10-SEC-06 | F4 y cada ampliación | Borrado/cierre/exportación/retención cubren los datos nuevos; borrar una marca no elimina ni conserva indebidamente datos de otra. | parcial: borrado de marca validado en DEMO (U `tests/client-cases.ts`); exportación y retención aún no existen |
| I10-SEC-07 | F4 y cada ampliación | Búsquedas, agregados, archivos, trabajos y exportaciones habilitados validan el ámbito en servidor; lo no construido se marca pendiente, no “validado”. | parcial: agregados de Resultados calculados en servidor con el ámbito (U); búsquedas y exportaciones de Clientes no construidas |
| I10-SEC-08 | F4 y F6 | Datos comerciales o instrucciones de un formulario no cambian decisiones estratégicas ni permisos; IA solo ve el ámbito autorizado cuando se habilite. | implementado por construcción (ninguna ruta de Clientes escribe estrategia ni permisos; Brando no lee Clientes); sin prueba específica |

### Resultados

| ID | Momento | Criterio observable y evidencia esperada | Estado |
|---|---|---|---|
| I10-RES-01 | F4 | Resultados presenta marketing, operación comercial y ventas con su disponibilidad real; recuentos iniciales usan oportunidades persistidas. | validado en DEMO: U `tests/client-cases.ts` + E `tests/browser/phase4-clients.spec.ts` (5 proyectos) |
| I10-RES-02 | F4 | Cada cifra identifica definición, ámbito, fuente, periodo, zona horaria y actualización; moneda cuando aplica. | validado en DEMO: U `tests/client-cases.ts` (definición, fuente, ámbito, periodo, zona horaria, cálculo) |
| I10-RES-03 | F4 | Periodo medido sin registros muestra cero; fuente ausente/incompleta muestra sin datos/sin conectar; prueba con ambos casos. | validado en DEMO: U `tests/client-cases.ts` + E `tests/browser/phase4-clients.spec.ts` (5 proyectos) (cero medido frente a «Sin conectar»/«Sin datos») |
| I10-RES-04 | F4 y F5 | No se suman conversiones de proveedores como ventas únicas; separar atribución conocida, estimada y desconocida. | parcial: no hay conversiones de proveedores que sumar; la referencia de campaña se muestra como capturada sin verificar |
| I10-RES-05 | F5 | Venta ganada, facturación, cobro y previsión se muestran por separado, con fuentes y permisos; no convertir conversación resuelta en venta. | pendiente |
| I10-RES-06 | F5 | No mezclar monedas sin conversión explícita y trazable; preservar el valor original y la fecha/tasa utilizada. | pendiente |

### Interfaz

| ID | Momento | Criterio observable y evidencia esperada | Estado |
|---|---|---|---|
| I10-UI-01 | F4 | Clientes ofrece registro y seguimiento reales; su apertura conserva selector de marca y contexto; ninguna maqueta acredita el criterio. | validado en DEMO: E `tests/browser/phase4-clients.spec.ts` (5 proyectos) |
| I10-UI-02 | F4 | Propuesta de navegación probada a 1366×768, 1280×800 y 1440×900 sin scroll lateral a escala normal; zoom mantiene todos los controles accesibles. | parcial: sin desplazamiento del lateral a 1366×768, 1280×800 y 1440×900 (E `tests/browser/phase4-clients.spec.ts` (5 proyectos) y `micro-hotfix.spec.ts`); zoom sin prueba nueva |
| I10-UI-03 | F4 | Teclado, foco, tablet y móvil funcionan; cambio de área cierra el menú móvil; revisar diferencias visuales de los archivos afectados. | validado en DEMO: tablet, móvil, cierre del menú móvil y teclado (E `tests/browser/phase4-clients.spec.ts`, 5 proyectos); capturas del menú de ocho áreas aprobadas por el propietario y aplicadas (revisión única, SHA-256 c32b8e58…c970) |

### Prueba técnica Chatwoot

| ID | Momento | Criterio observable y evidencia esperada | Estado |
|---|---|---|---|
| I10-CW-01 | Prueba técnica | Fijar repositorio, versión/commit y componentes; inventariar licencias MIT, Enterprise y terceros; no copiar funciones comerciales sin autorización contractual. | pendiente: prueba técnica sin entorno aislado ni versión elegida (no se instala Chatwoot junto a las E2E) |
| I10-CW-02 | Prueba técnica | Demostrar cobertura real de APIs para lectura/respuesta, notas privadas, asignación y adjuntos; documentar operaciones ausentes y coste de construirlas. | pendiente: prueba técnica sin entorno aislado ni versión elegida (no se instala Chatwoot junto a las E2E) |
| I10-CW-03 | Prueba técnica | Comparar cuenta por marca con cuenta por espacio e inboxes; probar contactos, búsquedas, informes, exportaciones, notas y archivos entre ámbitos y roles. | pendiente: prueba técnica sin entorno aislado ni versión elegida (no se instala Chatwoot junto a las E2E) |
| I10-CW-04 | Prueba técnica | Tokens permanecen en servidor; cada operación comprueba actor, espacio, marca y correspondencia del recurso externo, también con IDs manipulados. | pendiente: prueba técnica sin entorno aislado ni versión elegida (no se instala Chatwoot junto a las E2E) |
| I10-CW-05 | Prueba técnica | Aprovisionamiento usa Platform API dentro de sus recursos permitidos; no confundirlo con SAML ni con APIs del widget. | pendiente: prueba técnica sin entorno aislado ni versión elegida (no se instala Chatwoot junto a las E2E) |
| I10-CW-06 | Prueba técnica | Rechazar webhook adulterado, firma inválida o repetición indebida según el contrato de la versión; verificar cuerpo original y asociación de cuenta. | pendiente: prueba técnica sin entorno aislado ni versión elegida (no se instala Chatwoot junto a las E2E) |
| I10-CW-07 | Prueba técnica | Reintentos y eventos fuera de orden no duplican ni hacen retroceder registros; probar evento faltante, conciliación y resultado incierto. | pendiente: prueba técnica sin entorno aislado ni versión elegida (no se instala Chatwoot junto a las E2E) |
| I10-CW-08 | Prueba técnica | Mensaje web → referencia de contacto → oportunidad y seguimiento persistentes; recargar, reintentar y comprobar dos marcas con accesos negativos. | pendiente: prueba técnica sin entorno aislado ni versión elegida (no se instala Chatwoot junto a las E2E) |
| I10-CW-09 | Prueba técnica | Baja/revocación corta acceso a conversaciones y archivos, incluidos enlaces ya emitidos según su contrato; notas privadas no llegan al invitado. | pendiente: prueba técnica sin entorno aislado ni versión elegida (no se instala Chatwoot junto a las E2E) |
| I10-CW-10 | Prueba técnica | Caída de Chatwoot conserva la oportunidad y el seguimiento; recuperación no duplica contactos/eventos ni declara mensajes entregados sin evidencia. | pendiente: prueba técnica sin entorno aislado ni versión elegida (no se instala Chatwoot junto a las E2E) |
| I10-CW-11 | Prueba técnica | Inventariar costes de licencia, agentes/cuentas, infraestructura, almacenamiento, correo, canales, IA y mantenimiento; comparar escenarios sin suponer licencia gratuita = coste cero. | pendiente: prueba técnica sin entorno aislado ni versión elegida (no se instala Chatwoot junto a las E2E) |
| I10-CW-12 | Prueba técnica | Registrar autoridad de cada campo y correspondencias externas; resolver conflicto sin mantener dos expedientes comerciales maestros editables. | pendiente: prueba técnica sin entorno aislado ni versión elegida (no se instala Chatwoot junto a las E2E) |

### Canales

| ID | Momento | Criterio observable y evidencia esperada | Estado |
|---|---|---|---|
| I10-CHN-01 | F4 y cada integración | Matriz por canal diferencia formulario, conversación, anuncios y analítica; cada capacidad informa estado, requisitos, pruebas y limitaciones. | documentado (PHASE4_EXTERNAL_REQUIREMENTS, tabla de fuentes) |
| I10-CHN-02 | Fase correspondiente | TikTok valida elegibilidad/región/aprobación; LinkedIn Lead Sync aprobado no se presenta como acceso a mensajes privados. | pendiente |
| I10-CHN-03 | F4 | Contacto comercial no activa consentimientos publicitarios ni depende de etiquetas de conversión; conservar evidencia de la finalidad y opciones elegidas. | validado en DEMO: U `tests/client-cases.ts` (finalidad del contacto obligatoria; publicidad opcional y falsa por defecto; sin etiquetas) |
| I10-CHN-04 | Fase correspondiente | Envío externo de mensajes o anuncios exige su permiso y estado real; no confundir propuesta, encolado, enviado y entregado. | pendiente |

### Continuidad y evidencia

| ID | Momento | Criterio observable y evidencia esperada | Estado |
|---|---|---|---|
| I10-CON-01 | F4 | Registrar por separado código implementado, evidencia DEMO, pruebas PILOT sintéticas, invitado PILOT real y proveedores reales. | documentado (SESSION_STATE y esta matriz distinguen código, DEMO, PILOT y proveedores) |
| I10-CON-02 | F4 | Conservar cuatro intermitencias reportadas como sin diagnóstico; una repetición verde no acredita su corrección. | documentado (intermitencias conservadas sin diagnóstico) |
| I10-CON-03 | F4 | Registrar versión/árbol de cada gate; no aprobar capturas v5 ni nuevas de Colaboración por esta adenda. | documentado (árbol de cada gate en SESSION_STATE; capturas no aprobadas) |
| I10-CON-04 | F4 | Cierre de la captura no declara completado el CRM, la mensajería, las integraciones ni toda Fase 4. | documentado (el cierre no declara CRM, mensajería ni Fase 4 completos) |

### Flujo comercial (plan v5 §11)

| ID | Momento | Criterio observable y evidencia esperada | Estado |
|---|---|---|---|
| I10-FLU-01 | F5 | Un mensaje de canal habilitado queda relacionado con espacio/marca, contacto y conversación correctos; conservar referencia externa y origen. | pendiente |
| I10-FLU-02 | F5 | Varios mensajes/reintentos del mismo contacto no crean contactos u oportunidades por mensaje; probar identidad verificada y ausencia de fusión no autorizada. | pendiente |
| I10-FLU-03 | F5 | Una consulta de soporte y un prospecto sin calificar/sin respuesta mantienen el tratamiento y seguimiento apropiados; no se marcan venta o pérdida automáticamente. | pendiente |
| I10-FLU-04 | F5 | Un contacto existente puede originar otra oportunidad con su propio origen sin duplicar el contacto ni sobrescribir la anterior. | pendiente |
| I10-FLU-05 | F5 | Ganada exige importe/moneda/fecha/actor; perdida distingue motivo declarado/desconocido/propuesto; resolver conversación no cierra la venta. | pendiente |
| I10-FLU-06 | F5 | Brando propone aprendizaje de ganadas/objeciones/pérdidas con fuentes; Validación registra revisión humana sin reescribir estrategia automáticamente. | pendiente |

### Brando interno y externo (plan v5 §11.3)

| ID | Momento | Criterio observable y evidencia esperada | Estado |
|---|---|---|---|
| I10-BRA-01 | F5 | El asistente interno redacta con contexto autorizado y vigente; el borrador no se envía al cliente al generarlo. | pendiente |
| I10-BRA-02 | F6 | El agente externo solo responde en marcas/canales con política habilitada y contexto publicable; notas internas/borradores no se filtran. | pendiente |
| I10-BRA-03 | Contrato/prueba F4; operación F6 | Toma humana durante generación o antes del envío impide nuevas respuestas del bot; devolución explícita queda auditada; un envío ya iniciado se concilia sin repetición ciega. | pendiente: prueba técnica sin entorno aislado ni versión elegida (no se instala Chatwoot junto a las E2E) |
| I10-BRA-04 | Prueba F4; F5/F6 según modo | Webhooks repetidos, mensajes del bot y cambios sincronizados no generan bucles ni duplican respuestas; probar llegada fuera de orden. | pendiente: prueba técnica sin entorno aislado ni versión elegida (no se instala Chatwoot junto a las E2E) |
| I10-BRA-05 | Prueba F4; operación F5/F6 | Ante fallo de IA/canal se conserva el expediente y se muestra atención humana y estado real; no se finge un envío. | pendiente: prueba técnica sin entorno aislado ni versión elegida (no se instala Chatwoot junto a las E2E) |
| I10-BRA-06 | Prueba F4; F5/F6 | Se reutiliza el gateway autorizado, se registra consumo por marca y límites; no se incorpora Captain AI o un proveedor nuevo implícitamente. | pendiente: prueba técnica sin entorno aislado ni versión elegida (no se instala Chatwoot junto a las E2E) |
| I10-BRA-07 | F5/F6 | Pruebas negativas cubren roles/equipos, marcas, espacios, identificadores manipulados y separación del contexto interno/publicable. | pendiente |
| I10-BRA-08 | Prueba F4 y cada habilitación | Informar por separado simulador, Chatwoot real, canal real e IA real; fijar versión/licencia/token/firma y alcance de la prueba. | pendiente: prueba técnica sin entorno aislado ni versión elegida (no se instala Chatwoot junto a las E2E) |

### Origen y atribución (plan v5 §12)

| ID | Momento | Criterio observable y evidencia esperada | Estado |
|---|---|---|---|
| I10-ATR-01 | F4; continuidad hasta venta F5 | Un formulario etiquetado persiste UTMs/IDs disponibles, cuenta/fuente, canal, evento y fechas; no depende de Analytics para vincular la captura. | validado en DEMO en su parte F4 (U `tests/client-cases.ts` + E `tests/browser/phase4-clients.spec.ts` (5 proyectos)); continuidad hasta la venta en F5 |
| I10-ATR-02 | F4 | Sin referencia o permisos se guarda el lead y se muestra Campaña no identificada con causa; origen declarado permanece distinto del verificado. | validado en DEMO: U `tests/client-cases.ts` + E `tests/browser/phase4-clients.spec.ts` (5 proyectos) |
| I10-ATR-03 | F4 | Captura manual/web guarda responsable o cola y segmento conocido opcional de esa marca; campo ausente no provoca una clasificación inventada. | validado en DEMO: U `tests/client-cases.ts` (responsable o cola; segmento de la marca, nunca inventado) |
| I10-ATR-04 | Prueba F4; canal habilitado F5/F6 | Referencia publicitaria se guarda por interacción/mensaje y se recupera vía API/evento real de la versión seleccionada; no hereda sin evidencia una campaña antigua. | pendiente |
| I10-ATR-05 | F5 | Primer origen permanece y contactos posteriores agregan historia; se pueden inspeccionar primer/último contacto y atribución elegida. | pendiente |
| I10-ATR-06 | F5 | Cada oportunidad/venta conserva su atribución, incluso al fusionar/corregir contactos; eventos repetidos no duplican ingresos. | pendiente |
| I10-ATR-07 | F4 contrato; F5 resolución | Anuncio se relaciona con grupo/campaña solo mediante API/catálogo verificable de la cuenta/marca; IDs manipulados no exponen datos ajenos. | contrato documentado (ADR-0035); resolución con catálogo verificable en F5 |
| I10-ATR-08 | F4 | URLs/UTMs/referrer se validan y depuran antes de guardar; datos personales/secretos no aparecen en telemetría o logs sin autorización. | validado en DEMO: U `tests/client-cases.ts` (lista de campos, ruta sin consulta, sólo dominio del referente); logs sin contenido por revisión |

### ROAS (plan v5 §12.4)

| ID | Momento | Criterio observable y evidencia esperada | Estado |
|---|---|---|---|
| I10-ROA-01 | F5 | MXN 5,000 de ingreso elegible y MXN 1,000 de gasto real producen ROAS 5x; se declara modelo/versión/ventana/base de ingreso. | pendiente |
| I10-ROA-02 | F5 | Gasto ausente → no calculable; gasto cero → no aplicable; presupuesto previsto o valor de oportunidades abiertas no sustituyen gasto/ingreso real. | pendiente |
| I10-ROA-03 | F5 | Importación y sincronización superpuestas de gasto/impresiones/clics concilian la misma cuenta/campaña/periodo sin duplicar costes. | pendiente |
| I10-ROA-04 | F5 | Reparto de atribución publicitaria no excede ingreso elegible; no sumar conversiones de proveedores ni imputar íntegra la misma venta varias veces. | pendiente |
| I10-ROA-05 | F5 | Informe conserva moneda/tasa/fecha, zona horaria y diferencias entre fecha de venta y cohorte de captación; no mezcla modelos o bases de ingreso. | pendiente |
| I10-ROA-06 | F5 | Reembolsos/cancelaciones ajustan ingreso con evidencia; métricas de embudo y costes aparecen solo con datos suficientes, cobertura y actualización. | pendiente |

### Asesores, segmentos y partidas (plan v5 §13.2)

| ID | Momento | Criterio observable y evidencia esperada | Estado |
|---|---|---|---|
| I10-EQU-01 | Contrato F4; F5 | Varios asesores participan; reasignación actual tiene actor/fecha y conserva el crédito histórico al cierre. | contrato documentado (ADR-0035); implementación F5 |
| I10-EQU-02 | F5 | Venta MXN 100,000 con crédito 60/40 muestra 60,000 y 40,000 por asesor, y 100,000 global; el crédito total suma 100%. | pendiente |
| I10-EQU-03 | Contrato F4; F5 | Segmento principal y etiquetas no multiplican una venta; renombrar/desactivar segmento o asesor mantiene la consulta histórica. | contrato documentado (ADR-0035); implementación F5 |
| I10-EQU-04 | Contrato F4; F5 | Partidas de producto MXN 60,000 y servicio MXN 40,000 suman 100,000 global; cantidades/importes/moneda y referencias son inspeccionables. | contrato documentado (ADR-0035); implementación F5 |

### Metas (plan v5 §13.3)

| ID | Momento | Criterio observable y evidencia esperada | Estado |
|---|---|---|---|
| I10-MET-01 | Contrato F4; F5 | Crear/consultar metas globales, segmento, producto, servicio, asesor y equipo, en mes/trimestre/año y calendario/zona horaria definidos. | contrato documentado (PHASE4_SPEC §12.7); implementación F5 |
| I10-MET-02 | F5 | Real 80,000 frente a meta 100,000 muestra 80% y brecha 20,000; cero/sin meta se distinguen; previsión no cumple una meta de cobro. | pendiente |
| I10-MET-03 | F5 | Metas tienen versiones/autor/base/moneda; distribuir año y jerarquía requiere revisión y detecta desajustes, sin imponer reparto uniforme. | pendiente |
| I10-MET-04 | F5 | Solo roles autorizados ajustan metas/crédito y consolidan equipos/marcas; dimensiones de las mismas ventas no se suman como ingresos independientes. | pendiente |

### Históricos (plan v5 §13.4)

| ID | Momento | Criterio observable y evidencia esperada | Estado |
|---|---|---|---|
| I10-HIS-01 | Contrato F4; F5 | Nuevo periodo conserva metas/resultados anteriores; cambios de catálogo/asesor y correcciones no destruyen ni reescriben cortes publicados. | contrato documentado (PHASE4_SPEC §12.7); implementación F5 |
| I10-HIS-02 | F5 | Comparar mes, trimestre, año, mismo mes/trimestre previo y acumulado anual manteniendo dimensión, moneda y base. | pendiente |
| I10-HIS-03 | F5 | Periodos parciales comparan el mismo avance; base anterior cero produce variación porcentual no aplicable, ausencia de datos no se vuelve cero. | pendiente |
| I10-HIS-04 | F5 | Consulta/exportación autorizada reconcilia detalle conocido al corte frente a correcciones posteriores; conserva acceso a catálogos inactivos. | pendiente |

### Forecast de ganados (plan v5 §13.5)

| ID | Momento | Criterio observable y evidencia esperada | Estado |
|---|---|---|---|
| I10-FOR-01 | F5 | Forecast de ganados excluye oportunidades abiertas ponderadas; distingue valor ganado, programación, facturación prevista y cobros previstos. | pendiente |
| I10-FOR-02 | F5 | Ganado 100,000, cobrado 20,000 y previstos 40,000 noviembre/40,000 diciembre da 80,000 pendientes por cobrar; no duplica total y cuotas. | pendiente |
| I10-FOR-03 | F5 | Ganado sin fechas aparece Pendiente de programación; no se asigna cobro al mes de cierre ni Brando inventa calendario. | pendiente |
| I10-FOR-04 | F5 | Anticipos, parciales, etapas y recurrencias usan hitos con fecha/importe/estado/fuente; recurrencia sin compromiso no se prolonga. | pendiente |
| I10-FOR-05 | F5 | Pagos/facturas repetidos, cancelaciones, reembolsos y reprogramaciones concilian saldos con auditoría; facturación y cobro no se suman como ingresos distintos. | pendiente |
| I10-FOR-06 | F5 | Cortes del forecast preservan fecha/cobertura/actualización; comparar proyectado-real y filtrar por periodo/dimensión con permisos; reprogramar no altera un corte publicado. | pendiente |

### Trazabilidad requisito → fase → documento/contrato → aceptación → estado real (plan v5)

Conforme al archivo 09 del paquete. «Estado real» se actualiza con evidencia; fusionar documentos no marca nada
como completado.

| Requisito / origen aprobado | Fase | Documento y contrato | Criterios | Estado real |
|---|---|---|---|---|
| Captura manual/web persistente, prioridad de F4 | F4 | PHASE4_SPEC §12.2; ADR-0035; state-machines; authorization | I10-CLI-01…10; I10-SEC-01…08 | **Implementado y validado en DEMO** (migración 0027; U `tests/client-cases.ts` 7/7; E `phase4-clients.spec.ts` en 5 proyectos); parciales: CLI-10, SEC-05/06/07/08; sin proveedor real ni sitio público |
| Flujo multicanal contacto → oportunidad → cierre → Validación (§11) | Contratos/prueba F4; operativo F5 | PHASE4_SPEC §12.6; ADR-0035 §F5 | I10-FLU-01…06 | Alcance aprobado y documentado; runtime pendiente (F5) |
| Asistente interno de Brando (§11.3) | Preparación F4; F5 | PHASE4_SPEC §12.6; brand-intelligence-engine (sin nueva autoridad) | I10-BRA-01, 05…08 | Documentado; pendiente de desarrollar y probar con IA real |
| Agente externo, política y toma humana (§11.3–4) | Prueba acotada F4; habilitación F6 | PHASE4_SPEC §12.6, §12.9; PHASE4_EXTERNAL_REQUIREMENTS I10-EXT-09/13 | I10-BRA-02…08; I10-CW-01…12 | Documentado; adopción y operación pendientes |
| Origen, UTM y segmento conocido (§12.2, §13.6) | F4 | PHASE4_SPEC §12.2; ADR-0035 (interacciones y evidencia) | I10-ATR-01…03, 07…08 | **Implementado y validado en DEMO** (UTM, identificadores de clic, ruta y referente depurados; «Campaña no identificada» con causa; responsable/cola; segmento de la marca); ATR-07 contrato documentado (F5) |
| Referencias publicitarias por mensaje (§12.5) | Prueba F4; conector F5/F6 | PHASE4_EXTERNAL_REQUIREMENTS I10-EXT-10 | I10-ATR-04, 07; I10-CW-06…08 | Fuente técnica revisada (PR Chatwoot #14681); integración sin probar |
| Historia de interacciones y atribución por oportunidad/venta (§12.3) | F5 | PHASE4_SPEC §12.7; ADR-0035 §F5 | I10-ATR-05…07; I10-ROA-04 | Pendiente (F5); el modelo F4 ya guarda evidencia por interacción |
| Gasto real, ingreso elegible, ROAS y cobertura (§12.4) | F5; ampliación F6 | PHASE4_SPEC §12.7; I10-EXT-11/12 | I10-ROA-01…06; I10-RES-01…06 | RES-01…03 **validados en DEMO** (Resultados con marketing, operación y ventas; cero frente a «Sin conectar»/«Sin datos»); ROAS y RES-05/06 pendientes (F5); no hay ROAS real acreditado |
| Asesores/equipos y crédito (§13.2) | Contratos F4; F5 | PHASE4_SPEC §12.7; ADR-0035 §F5 | I10-EQU-01…02; I10-MET-04 | Contrato documentado; implementación F5 |
| Segmentos y partidas (§13.2) | Segmento conocido y contratos F4; completo F5 | PHASE4_SPEC §12.2, §12.7; ADR-0035 | I10-ATR-03; I10-EQU-03…04 | Segmento conocido **implementado y validado en DEMO** (id estable por marca); partidas y segmento principal: contrato documentado, implementación F5 |
| Metas por seis dimensiones y tres periodos (§13.3) | Contratos F4; F5 | PHASE4_SPEC §12.7; I10-EXT-14 | I10-MET-01…04 | Contrato documentado; implementación F5 (no se difiere a F6) |
| Históricos, comparativos y exportaciones (§13.4) | Contratos F4; F5 | PHASE4_SPEC §12.7 | I10-HIS-01…04 | Contrato documentado; implementación F5 |
| Forecast de ganados y programación (§13.5) | Contratos F4; F5 | PHASE4_SPEC §12.7; I10-EXT-12/14 | I10-FOR-01…06 | Contrato documentado; implementación F5, separada de oportunidades abiertas |
| Licencia, API, aislamiento, costes y canales | Evaluación/prueba F4; cada habilitación | PHASE4_EXTERNAL_REQUIREMENTS I10-EXT-01…14; ADR previo a dependencias | I10-CW-01…12; I10-CHN-01…04; I10-BRA-08 | Sólo evaluación documental (fuentes del paquete); ninguna versión instalada |
| Navegación y continuidad | F4 | PHASE4_SPEC §3, §12.3; handoff; SESSION_STATE; CHANGELOG | I10-DOC-01; I10-UI-01…03; I10-CON-01…04 | Documentado; ocho áreas **implementadas** (Clientes y Resultados reales, sin «Próximamente»; sin desplazamiento a 1366×768, 1280×800 y 1440×900); capturas canónicas afectadas pendientes de decisión del propietario |

## Estado de implementación · exportaciones (bloque 6, 2026-10-11)

Código: `src/domain/ttf.ts`, `src/domain/export-fonts.ts`, `src/application/pdf-brand.ts`,
`src/application/export-documents.ts`, `src/application/exports.ts`; rutas `/api/exports/{guide,deliverable}` (sólo equipo).
Archivos de prueba verificados en aplicaciones reales: PowerPoint 16.0.16026.20200 (PPTX), Word 16.0.16026.20200 (DOCX) y
pdf.js 6.3.289 renderizado en Chrome con extracción de texto (PDF). Acrobat no está instalado; el visor PDFium de
Chrome/Edge no se verificó.

| Estado | Criterios |
|---|---|
| Implementado · validado en DEMO | EXP-003 (U `tests/export-cases.ts`: texto del PDF extraído idéntico con acentos, ñ, ¿¡, «», “”, – —, €, $; caracteres que la fuente no tiene se informan; PPTX y DOCX con el texto escapado; PowerPoint y Word muestran el texto intacto), EXP-004 (U: fuente incrustada si el archivo y el kit lo permiten; licencia sin confirmar avisada; «no permitida», restringida o ausente → alternativa revisada o Helvetica con aviso; WOFF leído; CFF y WOFF2 informados como no compatibles; editables nunca incrustan y lo dicen), EXP-001 en su parte técnica (U de estructura OOXML; PowerPoint abre sin reparación, cuadros de texto nativos editables, imágenes con proporción correcta). E2E: descarga de PDF y Word de un material aprobado y de la guía en PDF en los 5 proyectos |
| Parcial | EXP-001 (aplicación de destino de los clientes sin confirmar por el propietario, EXT-REQ-12; verificado en PowerPoint 16.0.16026), EXP-002 y EXP-005 (la guía y los materiales usan colores, tipografía y logotipo del kit; falta la comparación renderizada de dos marcas como prueba automática) |
| Pendiente | ZIP del sitio (bloque de sitios), PDF de la guía en el portal del invitado (no se amplían sus facultades), OTF/CFF y WOFF2 incrustados, presentación PPTX de otros tipos de material |

## Estado de implementación · sitios en DEMO (bloque 7, 2026-10-11, v21)

Código: `src/domain/site.ts` (catálogo cerrado con testimonios y cifras con fuente, normalización, enlaces, preflight,
huella de medición, reglas de nueva verificación de dominios), `src/domain/site-render.ts` (renderizador determinista
sin JavaScript), `src/application/sites.ts` y `site-config.ts`, `src/transport/{site-files,site-zip,sites-public,
sites-preview}.ts` y `scripts/sites-server.ts`. Migraciones aditivas 0028 (siete tablas de sitios), 0029 (reserva del
dominio sólo al verificarlo) y 0030 (nueva verificación periódica), aplicadas únicamente en las bases aisladas de
desarrollo (55434) y pruebas (55432).

### Evidencia por prueba, proyecto y código

| Prueba | Qué cubre | Proyectos | Código comprobado |
|---|---|---|---|
| `tests/site-cases.ts` (14 casos, dentro de `pnpm test`) | SITE-001…010, DOM-001…006, CNS-004, MEA-006/007/008/012/013, duplicados del formulario en el servidor, ZIP, vista por tamaño | unitarias (Node, base 55432) | `28bb7d0` |
| `tests/browser/phase4-sites.spec.ts` (1 recorrido) | crear → propuesta → secciones (con testimonio de ejemplo DEMO y cifra con fuente) → guardar y retomar → vista previa y vista por tamaño → revisión y aprobación → ZIP abierto desde disco → publicar → formulario (reintento al volver atrás) → Clientes → segunda versión → restaurar | wide, desktop, compact, tablet y mobile | `28bb7d0` |
| Regresión completa: 16 archivos de `tests/browser/` en dos tramos (A: 6, B: 10; inventario sin duplicados, sin reintentos automáticos) | todas las pruebas de navegador del repositorio | 300 ejecuciones (60 pruebas × 5 proyectos): 286 PASS, 13 omitidas por diseño según el ancho (pruebas sólo de escritorio o sólo de móvil) y 1 fallo: `phase4-clients.spec.ts:16` en compact (tras recargar, el clic en Clientes mostró «Objetivo estratégico»; posible carrera con la carga inicial, causa no confirmada). Esa prueba pasó 3 de 3 al repetirla aislada como diagnóstico, sin sustituir el resultado. La traza está conservada y la prueba queda en observación, no corregida. El 503 de `phase3.spec.ts:58` no apareció (PASS en los cinco proyectos) y sigue en observación | `28bb7d0` |

Evidencia anterior, sustituida por la de esta tabla y conservada como historial: en `897e61a` el recorrido de sitios
pasó en desktop, tablet y mobile, y siete pruebas pasaron **sólo en escritorio**: `phase4-deliverables` (3: publicación
social con registro manual; copia de oferta en Materiales de venta; propuesta de Brando para redes), `phase4-collaboration`
(1: invitación, portal y revocación), `phase4-priority` (2: INT-001/002/005 e INT-007) y `phase4-clients` (1: captura
manual y web). No fue una regresión completa.

| Estado | Criterios |
|---|---|
| Implementado · validado en DEMO | SITE-001…SITE-010 (SITE-004 con testimonios y cifras: cada uno cita una evidencia de la marca o un texto aportado por una persona, con permiso en los testimonios; la fuente queda en la versión y nunca se publica; los ejemplos DEMO se marcan en la página y sólo se publican en marcas DEMO; Brando propone dónde irían y qué falta, nunca su contenido); SITE-006 (duplicados detenidos en el servidor, ver nota); DOM-001, DOM-002, DOM-004 (ver nota), DOM-005, DOM-006; vista previa por tamaño (escritorio 1280 px y móvil 390 px; no sustituye las pruebas en tamaños reales); ZIP de una versión aprobada (ver nota); CNS-004 y MEA-006/007/008/012/013 como reglas, sin medición real |
| Parcial | — (en el alcance local de sitios) |
| Pendiente de decisión | dominio de publicación de los sitios; texto definitivo de privacidad y consentimiento; correo para avisos (hoy los avisos de dominio se ven en la propia pantalla) |
| Pendiente de proveedor o evidencia real | DOM-003 (HTTPS por dominio y dirección DNS hacia el alojamiento: dependen del alojamiento definitivo); comprobaciones DNS reales de un dominio de cliente (el mecanismo se probó con respuestas controladas y tiempo simulado); MEA-001…005 y MEA-009…011 (medición real y cuentas conectadas); CNS-001…003 con etiquetas reales; publicación en un dominio real (despliegue no autorizado) |

Nota sobre SITE-006 (formulario): la protección contra duplicados es del servidor, no del navegador. El identificador
de envío de cada página es la clave de captura de Clientes, única por formulario en la base de datos (I10-CLI-04).
Así, un reintento tras perder la respuesta, dos envíos simultáneos o volver atrás y reenviar devuelven el mismo
registro. El HTML es `private, no-cache`: ninguna caché compartida puede entregar la misma página, con el mismo
identificador, a varios visitantes. Si eso ocurriera, o si alguien vuelve atrás y cambia la solicitud, llegaría el
mismo identificador con otro contenido. Ese envío se guarda entonces como oportunidad propia, con una clave
derivada del identificador y su contenido; es determinista, así que sus propios reintentos también se agrupan. Nada
se mezcla, se pierde ni se bloquea. Cada marca y cada sitio tienen su formulario y su ámbito. El éxito sólo se
muestra después de guardar; si el guardado falla, la página lo dice y pide reenviar.

Nota sobre DOM-004: cada dominio propio verificado se vuelve a comprobar una vez al día. Lo hace un trabajador que
reclama cada dominio con `SKIP LOCKED` sobre su propia fila, el mismo patrón de reclamación que la cola de ADR-0031.
Una lectura DNS no necesita conexión con un proveedor ni autorización humana, así que no entra en esa cola.

- **Vigencia:** una confirmación vale 72 h. Sólo se sirve un dominio con confirmación vigente.
- **Fallo temporal de la consulta** (sin respuesta, SERVFAIL): no confirma ni retira nada; se reintenta cada hora.
  Si la última confirmación tiene más de 72 h, el dominio pasa a «Comprobación pendiente»: deja de servirse, pero
  sigue reservado para su marca. A los 30 días sin ninguna confirmación se libera.
- **Pérdida confirmada:** una respuesta DNS sin el registro (también NXDOMAIN) se confirma con una segunda respuesta
  al menos una hora después. Entonces el dominio pasa a «Perdió la verificación», deja de servirse y se libera.
- **Recuperación:** en cuanto vuelve a encontrarse el registro, el dominio queda verificado y se sirve de nuevo.
- **Transferencia:** sólo cuando otra marca demuestra control con su propio registro, en una respuesta DNS en la que
  ya no está el del titular. Nunca por una consulta fallida, y la respuesta no revela qué marca lo tiene.
- **Verificaciones concurrentes:** se bloquean todos los intentos sobre el host en un orden fijo, sin interbloqueo, y
  un índice único garantiza un solo titular.
- **Vínculo con la marca:** el registro TXT lleva un token propio de cada intento de asociación, así que nadie puede
  reutilizar una configuración genérica.
- **Requisitos por separado:** control del dominio, dirección DNS hacia el alojamiento y HTTPS se muestran aparte. Un
  dominio propio nunca aparece como listo para publicar, porque los dos últimos dependen del alojamiento definitivo.
- **Trabajador en desarrollo:** se activa con `pnpm sites:public --isolated --domain-checks` y sólo lee registros TXT
  públicos.

Nota sobre el ZIP: exporta una versión aprobada exacta con los mismos archivos del renderizador. Lleva enlaces
relativos (abre desde una carpeta), `LEEME.txt` y `manifest.json` con el SHA-256 de cada archivo. La sección de
contacto no lleva formulario: muestra que no está conectado fuera de Brandopolis. No incluye fuentes de testimonios
ni de cifras, enlaces de vista previa, identificadores de workspace o marca, credenciales ni archivos de otras marcas.
Las tipografías sólo se incluyen con el permiso web declarado en el kit. `LEEME.txt` explica qué funciones necesitan
Brandopolis (formulario, publicación, vista previa, dominio) y las limitaciones de medición y consentimiento.

Nota sobre DOM-002: un dominio pendiente de verificación no queda asociado; sólo la verificación lo reserva
(corrección `562e32a`, hallada por la revisión de seguridad del commit). Desde 0030 también lo reserva un dominio en
«Comprobación pendiente».

### Inventario de capturas (corrección del registro)

El conjunto canónico único que compara la validación es de **17 archivos** en `design/brandopolis-ui/reference/screenshots/`:
8 pantallas en escritorio y móvil, más `decision-card-desktop`. Son los mismos 17 nombres que había antes de la Fase 4;
no se incorporó ninguna canónica nueva. Su aprobación viene de las decisiones humanas registradas en el README de esa
carpeta: v2, v3, v4 y la revisión única del 2026-10-11 (SHA-256 `c32b8e58…c970`, capturada sobre `5cf0618`), que
reemplazó nueve en `597ad70`. La cifra de «36 capturas canónicas» del registro anterior fue un error de recuento: se
sumaron archivos generados o de otras carpetas de referencia que no son el conjunto canónico. Otras carpetas de
referencia (`phase10b/`, `brando-b1/`, `phase10a/encoding-proof/`, `future-concepts/`) son evidencia histórica o
conceptos, no se regeneran con `test:visual` y no entran en esa cifra. Comparación de esta entrega: `test:visual` 10 PASS · 1 SKIP (sólo estructura); comparación al píxel (umbral: suma RGB > 48 de 765) de las 17 canónicas contra las capturas de `test-results/visual/` generadas sobre `28bb7d0`: 17 de 17 con 0 % de píxeles cambiados y los mismos tamaños. Ninguna referencia se actualizó y no hay cambios visuales previstos en esas pantallas

## Incidencia de navegación en Clientes (regresión del 2026-10-11)

**Resultado original, conservado:** regresión completa sobre `28bb7d0`, con 300 ejecuciones: 286 PASS, 13 SKIP y
1 FAIL. El fallo fue `phase4-clients.spec.ts:16` en compact: tras recargar, el clic en Clientes mostró «Objetivo
estratégico». **Aparte, como diagnóstico:** tres repeticiones aisladas de esa prueba en compact, las tres PASS. No
sustituyen al resultado original.

**Diagnóstico (traza conservada): defecto del producto, no de la prueba ni del entorno.**
- Tras recargar, `#workspace` se muestra después de `/api/me` y antes de que llegue la lista de marcas.
- Un clic en ese intervalo llamaba a `enterView`, que marcaba Clientes como actual y devolvía `false` (aún no
  había marca). El clic se perdía sin aviso, y la traza confirma que no hubo ninguna petición `/api/clients`.
- Después, la carga inicial dibujaba el módulo de la URL.
- Hay una segunda ventana: con la marca ya conocida, una respuesta tardía de `/api/context` volvía a dibujar la
  vista inicial y quitaba la marca de sección actual de la que eligió la persona.

**Corrección (`5356f57`):** un contador de navegación. La sección pedida durante la carga se recuerda y se abre al
terminar, y ni el dibujo inicial ni Inicio sustituyen una elección posterior. La prueba
`phase4-clients.spec.ts` «a section chosen while the workspace is still loading…» reproduce las dos ventanas
reteniendo respuestas con `page.route`, sin esperas arbitrarias. Antes de la corrección falló en ambas ventanas
(evidencia conservada); después pasa en compact, desktop y mobile, y en la regresión completa: PASS en los cinco proyectos sobre `9e373b4` (la prueba original y la nueva).
La prueba original no cambió: esperar `#workspace` era razonable para una persona; el defecto era del producto.

**El 503 de `phase3.spec.ts:58`** sigue en observación, sin causa confirmada.

## Comprobación puntual de idempotencia del formulario (2026-10-11)

Mecanismo sin cambios (`28bb7d0`). Cobertura en `tests/site-cases.ts`, caso «SITE-006 · duplicates are stopped by
the server…», ampliado en `5356f57`:

| Caso | Resultado esperado y comprobado |
|---|---|
| Primer contenido con un identificador | una oportunidad |
| Mismo identificador con otro contenido | otra oportunidad, con sus propios datos |
| Reintento del segundo contenido | la misma referencia que su primer envío |
| Dos envíos simultáneos del segundo contenido | una sola referencia, la misma |
| Reintento del primer contenido después de lo anterior | su referencia original |
| Mismo identificador en el sitio de otra marca | se guarda sólo en esa marca |
| Solicitud nueva intencional (página recargada) | referencia nueva, registrada |

Resultado: PASS dentro de `pnpm test` (517 PASS).

## Estado de implementación · bloque 8 local con simuladores (2026-10-11, v22)

**Código:**
- Dominio: `src/domain/campaign.ts`.
- Aplicación: `src/application/{campaigns,canva-adapter,canva-designs,cycle-reviews}.ts`. Cambios en
  `external-operations.ts` (la huella actual de la campaña se comprueba antes de cada envío; lectura de estado) y en
  `provider-adapter.ts` (fallos por recurso, límite del proveedor, acceso insuficiente, estado, persistencia).
- Transporte: `src/transport/external-demo.ts`, `scripts/external-worker.ts` (supervisor + worker separado).
- Interfaz: Marketing › Campañas digitales, Materiales de venta (panel de Canva en el brief) y Resultados (campañas
  y revisión del ciclo).
- Migración aditiva 0031 (seis tablas nuevas), aplicada sólo en las bases aisladas.
- Todos los endpoints son sólo DEMO (404 en PILOT).

Commits: `9e373b4` (implementación) y `4c692df` (corrección de autorización hallada por la revisión
automática de seguridad del commit: vínculo y autoría para cambiar el estado de una conexión simulada; sólo
versiones aprobadas de ofertas y anuncios pueden citarse).

**Separación de actos:**
1. Preparar una propuesta: Brando no escribe ni autoriza.
2. Aprobar la versión: criterio y huella; no encola nada.
3. Solicitar la operación: pantalla de confirmación construida en el servidor y repetida por huella, con
   `AUTHORIZE_SPEND`. La autorización y la reserva de un trabajo se hacen en la misma transacción, y un reintento con
   la misma clave no duplica.
4. Confirmar el resultado: el worker registra cada intento. «Comprobar en el proveedor» concilia y «Leer estado»
   guarda la lectura con su fuente.
5. Activar o gastar: no existe en esta fase.

**Evidencia por prueba, proyecto y código:**

| Prueba | Qué cubre | Proyectos | Código |
|---|---|---|---|
| `tests/campaign-cases.ts` (9 casos) | dominio; separación de actos y permisos; respuesta perdida y conciliación sin reenvío; recurso con retraso («no lo veo» no es evidencia); límite del proveedor con reintento humano; acceso insuficiente; acceso vencido; versión aprobada nueva → `CONTENT_CHANGED`; cancelar antes de enviar; resultados por fuente; revisión del ciclo; Canva | unitarias | `9e373b4` + `4c692df` |
| `tests/browser/phase4-campaigns.spec.ts` (1 recorrido) | cuenta simulada → campaña Google → propuesta → edición → revisión → pantalla exacta → escenario de respuesta perdida → pendiente → comprobar → creada en pausa → estado simulado → Resultados → revisión del ciclo → Canva | wide, desktop, compact, tablet y mobile | PASS en los cinco proyectos sobre `9e373b4` y de nuevo sobre `4c692df` |
| Regresión completa (17 archivos, tramos A: 6 y B: 11, sin duplicados ni reintentos) | todas las pruebas de navegador | 310 ejecuciones (62 pruebas × 5 proyectos): 297 PASS, 13 SKIP por diseño según el ancho, 0 FAIL | `9e373b4` |

**Estado por criterio:**

| Criterio | Estado | Evidencia o motivo |
|---|---|---|
| CNV-001 (recuperar un diseño crea una versión nueva que exige revisión; la aprobada no cambia) | Validado en DEMO con simulador | unitarias y E2E; el servidor decide la referencia del diseño. La compatibilidad real con Canva está pendiente del proveedor |
| CNV-002 (capacidad no disponible o no verificada se muestra y lo demás sigue útil) | Validado en DEMO con simulador | autocompletar y plantillas de marca: «no disponible en el plan»; abrir el editor: «sin verificar». Nada se marca como verificado con el simulador |
| Google Ads · Búsqueda con anuncios adaptables, crear en pausa | Implementado y validado en DEMO (simulador) | recorrido E2E completo |
| Meta Ads · tráfico, crear en pausa | Implementado; validado en unitarias (dominio y misma cola) | el recorrido de navegador usa Google; la captación en Meta sigue sin ofrecerse (necesita medición verificada) |
| Activar, pausar, cambiar presupuesto | Pendiente de decisión y proveedor | no se ofrecen: activar es otra autorización con cuenta real |
| EXT-006 (paso incierto con pasos previos correctos; los dependientes no se envían) | Validado en DEMO (simulador) | respuesta perdida en «campaña» con «presupuesto» creado |
| EXT-008 (cancelar no se presenta como cancelado si ya se envió) | Parcial | cancelar antes de enviar, validado; el caso «ya enviado» usa la lógica del bloque 2, con mensaje en la interfaz, pero sin prueba de navegador propia |
| EXT-010 (estados editorial, de operación y de proveedor separados; presupuesto diario no es tope total) | Validado en DEMO; la sincronización de rechazos reales está pendiente del proveedor | línea de estados en la tarjeta; regla de presupuesto en la pantalla |
| EXT-011 / EXT-012 (los pasos siguientes revalidan; un paso rechazado sólo se reintenta bajo autorización vigente y con criterio) | Validado en DEMO (simulador) | `CONTENT_CHANGED`; límite del proveedor con dos intentos conservados |
| EXT-017 (pérdida de acceso antes del intento → no se envía) | Parcial | conexión vencida: nada se envía, validado; la revocación de la autorización a mitad de trabajo, sin prueba nueva |
| EXT-003, EXT-014 | Sin prueba nueva en este bloque | siguen con la cobertura del bloque 2 |
| RES-001 (sin conexión no es cero; fuente etiquetada) | Validado en DEMO | gasto «Sin conectar»; lectura «Simulado (no es dato real)»; presupuesto planificado aparte |
| RES-002 (conversiones del proveedor no se suman como personas) | Regla aplicada, sin datos reales | ningún cálculo suma conversiones a oportunidades; no hay conversiones reales |
| RES-003 (mantener, ajustar o volver a probar sólo por acción humana con criterio; nada automático) | Validado en DEMO | revisión del ciclo de solo añadir; no cambia plan, campañas ni decisiones |
| Revisión del ciclo enlazada con el motor de Validación | Parcial | las propuestas se guardan para el siguiente periodo; todavía no crean experimentos de Validación |
| ROAS | No se muestra | faltan gasto real e ingresos atribuibles (ventas en Fase 5) |
| ACC-06 (reintento, caída o timeout no duplican; acceso vencido explicado; estado remoto comprobado) | Validado en DEMO con simulador | una creación por recurso en todos los escenarios |
| ACC-01 (lanzamiento completo) | Parcial | recorrido completo con simuladores etiquetados; faltan campañas conectadas reales y publicación autorizada |

**Pendiente de proveedor o evidencia real:** cuentas de Google Ads, Meta y Canva; versiones de API; registros de
cambios del proveedor; credenciales por persona en Canva (el adaptador real deberá recibir la credencial sellada);
sincronización de rechazos y métricas reales.

**Pendiente de decisión:** autorizar la activación y el gasto en una fase posterior, la medición verificada para
captación y el proveedor de correo para avisos.

## Bloque 8 completado en local y bloque 9 · revisión integral (2026-10-11, v23)

**Alcance y trazabilidad.** PHASE4_SPEC §4.6 y ADR-0031 (paquete revisado y aceptado el 2026-10-10) incluyen la
creación en pausa, la activación con una segunda autorización y la pausa. La entrega anterior (`9e373b4`) se limitó a
crear en pausa, por una instrucción del propietario en la conversación de ese bloque («La creación de campañas llega
únicamente al estado en pausa… No actives campañas ni gasto»). Esa instrucción no cambió el alcance documentado. La
instrucción siguiente del propietario (2026-10-11) pidió completar la activación y la pausa **sólo con simuladores**,
y así se hizo. No existe ninguna decisión que retire esas capacidades de la Fase 4.

**Tres estados independientes:**
1. **Implementación local:** completa en el alcance local (abajo).
2. **Aceptación de la DEMO por el propietario:** pendiente
   ([PHASE4_DEMO_ACCEPTANCE](PHASE4_DEMO_ACCEPTANCE.md)).
3. **Verificación real y preparación para producción:** pendiente. **Not release-ready.**

**Candidato comprobado:** `0c356ca`. `pnpm test` 526 PASS sobre `16cc068`, con typecheck y lint en 0 errores, Foundation en 0 errores y el validador de UI en PASS. Regresión completa de navegador sobre `16cc068`, con los cuatro servicios levantados por `pnpm demo:phase4` (19 archivos en tres tramos A: 6, B: 10 y C: 3, inventario sin duplicados ni reintentos): 320 ejecuciones (64 pruebas × 5 proyectos), 307 PASS, 13 SKIP por diseño según el ancho y 0 FAIL; el 503 de `phase3.spec.ts:58` no apareció. `0c356ca` sólo cambia CSS acotado a `.campaign-card`; sobre él se repitieron las tres pruebas afectadas (`phase4-campaigns`, `phase4-campaigns-meta` y `phase4-launch`) en los cinco proyectos, todas PASS. `pnpm test:pilot:e2e` dio 10/10 sobre `16cc068`. `test:visual` dio 10 PASS · 1 SKIP, y las 17 canónicas, comparadas al píxel sobre `16cc068` y de nuevo sobre `0c356ca`, tienen 0 % de diferencia; no se cambió ninguna referencia

**Incidencia de Clientes (cerrada):**
- Causa confirmada: un clic durante la carga inicial se perdía, y una respuesta tardía volvía a dibujar la vista.
- Prueba que fallaba antes de la corrección y pasa después: `phase4-clients.spec.ts`, «a section chosen while the
  workspace is still loading…».
- Resultado original conservado: 300 ejecuciones sobre `28bb7d0`, 286 PASS, 13 SKIP, 1 FAIL.
- Corrección: `5356f57`.
- Regresiones posteriores: completa sobre `9e373b4` (310 · 297 PASS · 13 SKIP · 0 FAIL) y completa sobre el candidato
  `0c356ca` (abajo).
- Las comprobaciones sobre `4c692df` (unitarias, campañas en cinco proyectos, PILOT y capturas) se registran aparte.

### Estado final por criterio · bloque 8

| Criterio | Estado | Evidencia |
|---|---|---|
| Google Ads: propuesta → aprobación → crear en pausa → segunda autorización → activar → consultar → pausar | Validado en DEMO con simulador | U `tests/campaign-cases.ts`; E `phase4-campaigns.spec.ts` en cinco proyectos |
| Meta Ads (tráfico y captación): el mismo recorrido | Validado en DEMO con simulador | U; E `phase4-campaigns-meta.spec.ts` (captación) en cinco proyectos |
| Segunda autorización independiente, ligada a campaña, cuenta, marca y versión creada; revalidada en el servidor y antes del envío | Validado en DEMO | U: autorización y trabajo propios; cuenta forzada a la de la creación; versión aprobada distinta → bloqueo |
| Pausa con `AUTHORIZE_SPEND` y sin confirmación de importe | Validado en DEMO | U, E |
| Medición para captación: sin verificar → bloquea; verificada → permite; pierde vigencia antes del envío → `MEASUREMENT_NOT_VERIFIED` | Validado en DEMO con evidencia simulada | U, E; la comprobación real está pendiente (EXT-REQ-05) |
| EXT-008 (cancelar antes de enviar no ejecuta; después, pendiente de comprobación hasta conocer el resultado) | Validado en DEMO (simulador) | U «EXT-008 / EXT-017»; la interfaz distingue cancelar la solicitud de pausar o borrar un recurso |
| EXT-017 (revocar o vencer antes del intento impide enviarlo; durante el intento bloquea los siguientes y conserva lo ocurrido) | Validado en DEMO (simulador) | U; sin acceso válido no se consulta ni se infiere nada (`ACCESS_UNAVAILABLE`) |
| Respuesta tardía (se registra, no reactiva ni concede facultades) | Validado en DEMO (simulador) | U (cancelar con respuesta perdida, luego vincular sin volver a la cola); EXT-015/019 del bloque 2 |
| EXT-003 | Validado por la prueba existente | `tests/phase4-cases.ts` «EXT-002…» cubre el contrato (A reclama y no inicia; B reclama y envía una vez); ejecutada sobre el candidato |
| EXT-014 | Validado en DEMO | U nueva «EXT-014…» (la prueba anterior llegaba a `PARTIAL` por rechazo, no por vencimiento) |
| EXT-006, 010, 011, 012, ACC-06 | Validado en DEMO (simulador) | bloque 8 (v22) y candidato |
| CNV-001 (recuperar crea una versión nueva pendiente de revisión; la aprobada se conserva) | Validado en DEMO con simulador | U, E |
| CNV-002 y capacidades de Canva | Validado en DEMO con simulador | enviar recursos (simulado), crear diseño (simulado), **vincular un diseño existente** (simulado, nuevo), abrir el editor (**sin verificar**: no hay editor en el simulador), recuperar o exportar (simulado), autocompletar y plantillas de marca (no disponibles en el plan) |
| Aislamiento de Canva por persona y marca; acceso retirado | Validado en DEMO | U: la conexión de otra persona no sirve; otra marca → 404; acceso vencido bloquea enviar y recuperar |
| RES-001 | Validado en DEMO | U, E |
| RES-002 (conversiones atribuidas por proveedor, nunca sumadas ni contadas como personas) | Validado con datos sintéticos | U «RES-002…» |
| RES-003 y enlace con Validación (propuesta revisable; acción humana; ciclo y aprobaciones existentes; sin duplicar; fuentes, periodo, campaña y versión) | Validado en DEMO | U «cycle review → Validation…»; E `phase4-launch.spec.ts` |
| ACC-01 (lanzamiento local integrado) | Validado en DEMO con simuladores | E `phase4-launch.spec.ts` en cinco proyectos: oferta → plan → kit → material → revisión del cliente → sitio → formulario → oportunidad → campañas simuladas → resultados → revisión del ciclo → Validación |
| Separación de adaptadores | Validado | U «adapter separation…»: la DEMO sólo construye simuladores y no arranca en producción |

### Capacidades pendientes de proveedor, en categorías separadas

| Capacidad | Código o adaptador por implementar | Implementación existente pendiente de acceso | Comprobación real pendiente | Decisión del propietario pendiente |
|---|---|---|---|---|
| Google Ads (OAuth, crear en pausa, activar, pausar, estado, métricas, registro de cambios) | **Sí**: adaptador real y flujo OAuth (hoy sólo el contrato y el simulador) | cola, autorizaciones, conciliación, pantallas y resultados | todas las operaciones con cuentas de prueba | registrar la integración; entorno de ensayo con HTTPS; gasto real por operación |
| Meta Ads (ídem, más la medición del destino) | **Sí**: adaptador real y OAuth | ídem | ídem; evento de conversión del destino (EXT-REQ-05) | ídem; consentimiento (EXT-REQ-13) |
| Canva Connect | **Sí**: adaptador real, OAuth por persona y paso de la credencial sellada al adaptador | envío, vínculo y recuperación como versión nueva | operaciones por plan y revisión de distribución | registrar la integración |
| Medición del sitio (etiquetas y verificación real) | **Sí**: recepción real del evento y su verificación | huella de medición, evidencia y bloqueo | sí | privacidad y consentimiento definitivos |
| Publicación real de sitios, HTTPS y DNS | No (servidor y verificación por TXT existen); falta el despliegue | sí | sí | dominio y alojamiento (EXT-REQ-07, EXT-REQ-14) |
| Correo de invitaciones y avisos | **Sí**: proveedor y su diseño de seguridad | invitación por enlace | — | proveedor o mantener el enlace (EXT-REQ-08) |
| IA real en las superficies nuevas | No (Gateway existente) | Brando determinista | sesión Live AI | clave del propietario (EXT-REQ-10) |

### Criterios de bloques anteriores revisados en este cierre

| Criterio | Estado tras la revisión |
|---|---|
| IDN-002 | Validado en DEMO: Brando propone direcciones sin escribir y la elegida entra al borrador como propuesta (`tests/brand-kit-cases.ts`). La fila del bloque 4 quedó desactualizada y esta la sustituye |
| IDN-004 | Parcial: sitio y materiales citan la versión del kit; el anuncio de Meta cita la imagen del kit pero no la versión del kit en su manifiesto |
| DEL-002, DEL-004, DEL-005 | Parcial: la eliminación se bloquea y las conexiones se conservan; **falta el código** del recorrido `BrandClosure` (pausar y verificar, entrega explícita) |
| EXP-001 | Parcial: verificado en PowerPoint 16 en el bloque 6; falta la decisión sobre las aplicaciones de destino de los clientes (EXT-REQ-12). No se repite sin ese motivo |
| EXP-002, EXP-005 | Parcial: falta la comparación renderizada automática de dos marcas |
| Pendiente de código de bloques anteriores | OTF/CFF y WOFF2 incrustados; PDF de la guía en el portal; búsqueda del portal; Biblioteca y Plantillas; cambio de workspace activo (PRT-006); ONB-009 con un proveedor real que falle |
| IVT-001 | Parcial: falta OIDC real y el envío por correo |
| Pantallas nuevas | Revisadas en el paquete local de capturas (no canónicas): 8 pantallas en escritorio (1440) y móvil (390), generadas sobre `0c356ca` en `.local/acceptance/index.html`. La revisión encontró la cabecera de la tarjeta de campaña comprimida en móvil, corregida en `0c356ca` |

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
| v11 | 2026-10-10 | Bloque 4: base del kit de marca y verificación de seguridad; sección de estado correspondiente |
| v12 | 2026-10-11 | Inicio guiado: borrador `BrandSetupDraft` (migración 0025), guía de cuatro etapas y ficha; sección de estado correspondiente |
| v13 | 2026-10-11 | ONB-006 y ONB-007 implementados (reutilización del manual en Identidad visual, identidad parcial, procedencia de correcciones decidida por el servidor) |
| v14 | 2026-10-11 | Colaboración y guía viva: invitaciones por enlace, invitados, portal, comentarios y aprobación por versión (migración 0026); sección de estado correspondiente |
| v15 | 2026-10-11 | Issue #10 (paquete revisión 3, plan v5): 94 criterios I10 añadidos sin renumerar (48 + 46), todos pendientes, y tabla de trazabilidad requisito → fase → contrato → aceptación → estado real |
| v16 | 2026-10-11 | Clientes implementado (migración 0027, ADR-0035): estado por criterio I10 y trazabilidad actualizados con evidencia de DEMO; regresión completa pendiente |
| v17 | 2026-10-11 | Verificación completa de Clientes y Resultados: CLI-10, SEC-05, SEC-08, UI-02, RES-02 y RES-04 validados en DEMO; UI-03 parcial (aprobación visual) |
| v18 | 2026-10-11 | Capturas aprobadas aplicadas: I10-UI-03 validado en DEMO; aceptación visual del bloque Clientes y Resultados satisfecha (no cierra Fase 4) |
| v19 | 2026-10-11 | Exportaciones (bloque 6): estado de EXP-001…005 con aplicaciones de verificación |
| v20 | 2026-10-11 | Sitios (bloque 7): estado de SITE, DOM, MEA y CNS con evidencia de DEMO; nota de DOM-002 (reserva al verificar) |
| v23 | 2026-10-11 | Bloque 8 completado en local con simuladores (activación con segunda autorización, pausa, medición, EXT-008/017, Canva, RES-002, Validación, ACC-01) y bloque 9: estado final por criterio, categorías de lo pendiente de proveedor, criterios anteriores revisados |
| v22 | 2026-10-11 | Incidencia de Clientes diagnosticada y corregida; idempotencia del formulario comprobada; bloque 8 local con simuladores: estado por criterio (CNV, EXT, RES, ACC-01/06) |
| v21 | 2026-10-11 | Sitios en DEMO completos en su alcance local: SITE-004 (testimonios y cifras con fuente), DOM-004 (nueva verificación periódica), duplicados del formulario en el servidor, vista por tamaño, ZIP; evidencia por prueba, proyecto y código; inventario de capturas corregido (17 canónicas) |
