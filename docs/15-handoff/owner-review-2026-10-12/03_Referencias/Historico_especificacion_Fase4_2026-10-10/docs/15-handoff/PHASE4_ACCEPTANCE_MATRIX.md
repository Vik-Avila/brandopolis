Status: proposed
Owner: Product / Engineering
Canonical: no
Last reviewed: 2026-10-10
Related: docs/15-handoff/PHASE4_SPEC.md, docs/14-decisions/ADR-0030.md, docs/14-decisions/ADR-0031.md, docs/14-decisions/ADR-0032.md, docs/14-decisions/ADR-0033.md, docs/14-decisions/ADR-0034.md, docs/04-domain-model/invariants.md
Depends on: PHASE4_SPEC v4 (2026-10-10)

# Fase 4 · matriz alcance → criterio → prueba (v4)

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
| EXT-018 | Repetición humana: con «no lo veo» o una búsqueda vacía → denegada; con ventana de cierre pasada, evidencia del registro de cambios del proveedor y autorización vigente → permitida como intento nuevo, conservando los anteriores | U (simulador) |
| EXT-019 | Resultado tardío que contradice un `NOT_CREATED` → evidencia conservada sin sobrescribir, incidencia «posible duplicado» y pasos siguientes detenidos | U (simulador) |

## Cierre y eliminación de marca

| ID | Criterio | Prueba |
|---|---|---|
| DEL-001 | Marca con campaña activa: el cierre la muestra, ofrece pausa verificada o entrega explícita; la eliminación responde 409 mientras siga sin resolver | U `tests/brand-deletion-cases.ts` ampliado |
| DEL-002 | Proveedor inaccesible: el asunto queda abierto hasta conciliar o registrar la entrega; nunca se afirma gasto detenido | U (simulador) |
| DEL-003 | Trabajo ya enviado → se concilia antes de cerrar; trabajo en cola → cancelado con su autorización | U |
| DEL-004 | Credencial usada por otra marca sigue activa; conexiones personales de Canva intactas | U |
| DEL-005 | Sitio, vistas previas, comparticiones y recursos privados dejan de servirse; otras marcas sin cambios; después la eliminación de ADR-0029 borra las filas nuevas | U, S |

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

## Inicio guiado completo · propuesta (PHASE4_SPEC §4.10)

**Sólo aplica si el propietario incluye el inicio guiado completo en el alcance aceptado.** Hasta entonces estas
filas no cuentan para declarar la fase completa. ONB-001…ONB-004 de la v3 (pregunta de objetivo) se trasladaron a
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
