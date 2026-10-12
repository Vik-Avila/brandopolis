# Brandopolis — Revisión de la DEMO de Fase 4 e instrucciones para Claude
Fecha: 12 de octubre de 2026
Estado: revisión del usuario con cambios solicitados; aceptación pendiente. Candidato **not release-ready**.

## Cómo utilizar este documento

Este documento consolida las observaciones del usuario para la próxima iteración local de Claude. Implementar y documentar los cambios solicitados, conservando los pendientes anteriores. No constituye aceptación de la DEMO ni autorización para publicar, desplegar, activar campañas reales o generar gasto.

La revisión se basa en el relato del usuario, 17 capturas y copias disponibles de la especificación y ADR. No se ha inspeccionado aquí el código actual ni ejecutado la aplicación de Windows. Las capturas permiten confirmar problemas visibles; los permisos, correos y procesos requieren comprobación funcional.

## 1. Orden de trabajo y alcance

1. Comprobar qué commit y configuración está ejecutando la DEMO; conciliar código, pantallas y documentación.
2. Resolver aprobaciones, responsabilidades, comentarios y notificaciones. Completar el envío de correo y distinguir pruebas locales de entrega real.
3. Corregir los componentes visuales comunes, la navegación y la entrada de Brando.
4. Completar precios, duplicación de ofertas, archivos, plantillas, selección múltiple y filtros de resultados.
5. Incorporar Performance Max y campañas de mensajes como ampliaciones expresas del alcance solicitado, con funcionamiento local verificable.
6. Validar el candidato final y entregar un recorrido de aceptación actualizado.

Los arreglos y mejoras solicitados se incorporan a la revisión de la Fase 4. Las ampliaciones deben figurar como tales en la especificación y la matriz: no estaban todas incluidas en el candidato anterior. No esconderlas como un ajuste de CSS ni declararlas resueltas con opciones de menú sin funcionamiento.

Se mantiene el plan posterior: administración SaaS e integraciones, usuarios, configuración de modelos y bases de consumo/billing en Fase 5; primer asistente público de marca con conocimiento aprobado y RAG en Fase 5; automatizaciones visuales avanzadas y capacidades adicionales en Fase 6. Las bases de permisos, conocimiento versionado, eventos y notificaciones deben ser reutilizables desde ahora. El cobro requiere sus bases antes del primer lanzamiento de pago, aunque ese hito se adelante.

## 2. Matriz de observaciones y aceptación

| Referencia del usuario | Incorporación | Cómo se acepta |
| --- | --- | --- |
| General / 15 | Área central más pálida que los laterales y claramente contenida. | Diferencia visible y consistente en todas las secciones, sin perder legibilidad; revisión en los cinco tamaños existentes. |
| General | Envío de correo. | Flujo completo implementado; estado y errores visibles. Entrega real acreditada por separado, con proveedor y destinatario de prueba autorizados. |
| General | Marca y Recursos antes de Productos y Servicios. | Orden coherente en escritorio y navegación móvil. |
| 1 | Decisiones de origen: alineación, selección conjunta automática y Brando al inicio. | Cada control corresponde visual y semánticamente a su concepto; todas las decisiones elegibles se preseleccionan al crear, se pueden desmarcar y la elección se conserva. |
| 2 | Periodicidad y varios planes de precios. | Una oferta admite distintos planes con importe, moneda, periodicidad y condiciones; se conservan por versión. |
| 3 | Aprobación de productos/servicios con destinatario y proceso claros. | Antes de enviar se ve quién revisa; después se ve responsable, estado, comentarios y resolución de esa versión. |
| 4 | Nueva oferta a partir de una aprobada. | Copia autorizada de la misma marca crea un borrador independiente, con origen trazable y sin aprobación heredada. |
| 5 | Materiales: controles alineados, selección conjunta y carga de arte. | Mismo comportamiento de selección; archivo final adjuntable durante la elaboración o después de Canva, conservando versiones. |
| 6 | Brando antes de llenar formularios. | Entrada inicial útil en los formularios pertinentes; las propuestas no borran datos del usuario sin una acción expresa. |
| 7 | Jerarquía y responsabilidades de aprobación. | Política sencilla por marca/tipo de entrega, asignación visible y permisos validados en servidor. |
| 8 | Referencias para brief de Canva/diseñador. | Carga, consulta y descarga de referencias separadas del arte final, con acceso controlado. |
| 9 | Varias redes sociales. | Selección múltiple, pieza base y variantes revisables por red; formatos y estado claros. |
| 10 | Campañas: controles alineados, Performance Max y mensajes en Meta. | Corrección visual común; cada nuevo tipo dispone de configuración, validaciones y recorrido local propios, claramente simulados. |
| 11 | Compartir varias fases/opciones y localizar comentarios. | Selección múltiple explícita de recursos autorizados; comentarios junto a la entrega/version y separados entre internos y compartidos. |
| 12 | Resultados: periodos, fechas y comparativos. | Filtros visibles y aplicados a los datos; comparación compatible, sin convertir ausencia de conexión en cero. |
| 13 | Resultados: alineación de controles. | Radios y etiquetas forman una única opción comprensible y operable. |
| 14 | Formulario web: alineación de controles. | Etiquetas próximas a sus casillas; consentimientos voluntarios conservan su elección independiente. |
| 15 | Opciones de Marketing con iconos. | Icono y texto, estado activo y foco distinguibles; área central claramente delimitada. |
| 16 | Estrategia: estado activo coherente. | Misma indicación de sección elegida que el resto, incluso al recargar y durante la carga inicial. |
| 17 | Plantillas en Marca y Recursos. | Subir, listar, clasificar y descargar archivos de plantilla autorizados; versiones y aislamiento por marca. |
| 18 | Pendientes y resoluciones de aprobación. | Centro de notificaciones persistente y resumen de acciones en Inicio, específicos de cada usuario. |

## 3. Reglas de implementación

### 3.1 Interfaz, controles y navegación

Investigar la causa común de la desalineación en casillas y radios. Corregir los componentes compartidos y las reglas de distribución, evitando arreglos distintos mediante espacios o márgenes para cada pantalla. Verificar etiquetas multilínea, área de clic, teclado, foco y asociación entre control y texto.

Usar una superficie central más clara que ambos laterales. Conservar contraste suficiente en texto, bordes y estados. No fijar colores definitivos a partir de estas capturas: aplicar los tokens del sistema y presentar el resultado para revisión.

Orden recomendado del menú principal: Inicio → Estrategia → Marca y Recursos → Productos y Servicios → Marketing → Clientes → Colaboración → Resultados. Conservar las utilidades existentes.

Marketing necesita iconos acompañados de texto. Estrategia debe compartir el patrón activo de las demás secciones y el indicador accesible de página actual. Mantener la corrección de navegación durante la carga inicial: una elección del usuario no puede perderse ni ser reemplazada por una respuesta tardía.

### 3.2 Qué significa «check-all automático»

En un formulario nuevo, preseleccionar las decisiones de origen aprobadas y elegibles de la marca, mostrar cuántas están seleccionadas y permitir «Seleccionar todas» / «Quitar selección». El control conjunto debe representar también una selección parcial.

No volver a seleccionar automáticamente lo que la persona desmarcó al reabrir el borrador o recibir datos tardíos. No incluir decisiones no aprobadas o de otra marca. La selección indica fuentes disponibles; no afirmar que Brando utilizó una fuente si no la utilizó.

Esta regla se aplica a los grupos de fuentes señalados por el usuario. **No** se extiende a consentimientos del formulario web, permisos de invitados, aprobaciones, redes de publicación ni autorizaciones de gasto.

### 3.3 Brando como guía inicial

Ofrecer desde el inicio acciones como «Construir con Brando», «Completar manualmente» y, donde corresponda, «Partir de una oferta aprobada».

En productos y servicios, Brando debe aprovechar el contexto aprobado de marca y estrategia, pedir los datos que faltan y proponer una estructura revisable: descripción, público, beneficios, alcance y opciones comerciales. No inventar precios, evidencias o condiciones como hechos.

Aplicar el mismo principio en materiales, briefs y redes sociales. Las propuestas pueden incorporarse total o parcialmente. Respetar los cambios ya escritos y mantener la aprobación humana separada. Si funciona con simulador, indicarlo; no presentar el recorrido como IA real verificada.

### 3.4 Planes de precio y copia de ofertas

Separar periodicidad de cobro de vigencia comercial. Una fecha «válido hasta» no expresa un precio mensual.

Cada plan debe permitir nombre, importe, moneda, periodicidad —único, mensual, trimestral, anual o personalizada— y, cuando proceda, unidad —por persona, por servicio u otra— y condiciones. Mantenerlos ligados a la versión de la oferta. Aclarar si un material o sitio presenta todos los planes o uno concreto.

Conservar los precios existentes sin inventarles periodicidad durante la migración. Un plan comercial no implica implementar suscripciones ni facturación SaaS.

«Crear a partir de esta oferta» debe copiar contenido y planes hacia un borrador nuevo de la misma marca. Mantener vínculo al origen, pero no heredar aprobación, historial de revisores, invitaciones, publicación o autorización de campañas.

### 3.5 Responsabilidades y circuito de aprobación

Implantar un esquema mínimo configurable por marca y tipo de entrega. Puede empezar con autor → responsable interno → revisión del cliente cuando esté permitida. No hace falta un constructor general de procesos para resolver esta necesidad.

Antes de enviar, mostrar nombre/rol del responsable, versión que se revisará y siguiente paso. Si falta responsable, resolver la asignación en la interfaz; no enviar silenciosamente al propio autor. Mostrar quién puede aprobar y quién solamente puede comentar.

Contemplar uso individual: una política explícita puede permitir autoaprobación al responsable autorizado, con una acción identificada como tal y registro de auditoría. No simular que intervino una segunda persona.

Los estados deben distinguir borrador, pendiente de revisión, cambios solicitados y aprobado. Devolver con cambios requiere comentarios; la nueva versión conserva el historial y exige la revisión correspondiente. Registrar actor, versión, fecha y resolución. Una aprobación anterior no aprueba una versión posterior.

Validar en servidor permisos, marca y asignación. Un puesto en un organigrama no concede por sí mismo todos los permisos. Si alguien pierde acceso o deja de ser responsable, resolver la reasignación sin otorgar capacidades nuevas de forma implícita.

Conservar la separación entre aprobación editorial, publicación y gasto. Conforme al ADR-0033 disponible, el invitado puede aprobar determinados materiales e identidad compartidos, pero no ofertas ni estrategia; ampliar esos derechos exigiría registrar otro cambio de alcance.

### 3.6 Comentarios, notificaciones y correo

Los comentarios deben encontrarse en la propia entrega y su versión, con autor y fecha. Separar conversaciones internas de las compartidas con el cliente. El invitado no puede leer notas internas ni versiones que no se le compartieron.

Usar el panel derecho como centro de notificaciones con contador y enlaces al contexto; en Inicio, mostrar un resumen de tareas que requieren acción. Son dos accesos a los mismos eventos, no dos sistemas independientes.

Notificar al responsable una revisión pendiente y al autor la aprobación o devolución con comentarios. Considerar también menciones y respuestas. Marcar una notificación como leída no resuelve una aprobación. Cada enlace debe revalidar acceso.

Para correo, inspeccionar primero si ya existe proveedor y configuración. Implementar la integración pendiente, plantillas, cola y manejo de errores reutilizando las bases existentes. Evitar duplicados al reintentar, respetar revocación/caducidad de invitaciones y mostrar fallos operativos.

Distinguir en el informe:
- Pruebas locales del flujo y del proveedor simulado.
- Aceptación del mensaje por el proveedor real.
- Evidencia de entrega a una bandeja de prueba autorizada.

Un log de «enviado» no demuestra recepción. Si falta proveedor, dominio de envío o destinatario autorizado, documentar ese bloqueo preciso y dejar listo el código verificable localmente. No enviar mensajes a terceros durante esta iteración sin autorización expresa.

### 3.7 Archivos, Canva, referencias y plantillas

Separar tres usos: referencia para el brief, arte final de un material y plantilla reutilizable. Permitir carga y descarga según permisos y mostrar nombre, tipo, tamaño, versión y procedencia.

El arte puede incorporarse durante la elaboración o después del retorno de Canva. Un archivo recuperado o cargado después de una aprobación genera una nueva versión revisable; no sustituye silenciosamente el archivo aprobado.

Las referencias internas no se comparten automáticamente con invitados ni se envían a Canva sin corresponder al envío solicitado. Aplicar los controles existentes de tipo, tamaño, almacenamiento y acceso; servir los archivos de forma segura.

Completar Biblioteca/Plantillas en Marca y Recursos para cargar y descargar formatos diversos que el producto admita. No prometer edición en línea de todos ellos. La descarga debe devolver el archivo correcto de la versión elegida y respetar el aislamiento de la marca.

### 3.8 Redes sociales y colaboración con selección múltiple

En redes sociales, seleccionar varias plataformas y partir de una pieza común. Permitir variantes de texto, formato y recursos por red, con validación de cada variante. La selección múltiple no autoriza publicación externa.

En Colaboración, seleccionar varios recursos o fases autorizables. Mostrar un resumen concreto de qué verá la persona invitada. Compartir una fase no debe conceder acceso indiscriminado a borradores, notas internas o futuras versiones.

Conservar los permisos por marca, recurso y versión. Mantener diferenciados comentar, revisar y aprobar. Mostrar desde la entrega y desde Colaboración dónde están las conversaciones del cliente y del equipo.

### 3.9 Resultados: filtros y comparación

Añadir periodos predefinidos, fechas personalizadas y comparación con el periodo anterior de igual duración o con el mismo periodo del año previo. Mostrar claramente ambos rangos y la zona horaria aplicable.

Los filtros deben afectar los datos, no solo cambiar un rótulo. Distinguir métricas de actividad durante el intervalo de valores que representan un estado actual.

Conservar separados presupuesto planificado, gasto real, datos simulados y oportunidades. «Sin conectar» o sin datos no equivale a cero. No sumar conversiones atribuidas por diferentes plataformas como si fueran personas únicas. Evitar porcentajes engañosos cuando la base sea cero o desconocida.

El filtro y la comparación básica entran en esta revisión. Atribución avanzada, cohortes y previsiones mantienen su lugar en el plan posterior.

### 3.10 Google Performance Max y campañas de mensajes en Meta

El ADR-0031 disponible los excluía. La petición actual exige registrar una ampliación expresa de alcance y actualizar especificación, matriz y decisión de arquitectura según las convenciones del repositorio.

No basta añadir dos opciones al selector. Cada tipo necesita campos pertinentes, validaciones, propuesta revisable, aprobación, creación en pausa, segunda autorización cuando corresponda, consulta, pausa y gestión de errores en simulador. Reutilizar idempotencia, conciliación y revocación.

Performance Max requiere su propia configuración y recursos; revisar la documentación oficial vigente de Google antes de definir el contrato del adaptador. No tratarlo como un cambio de nombre de Search.

Para mensajes en Meta, verificar qué destinos y operaciones admite la versión de API elegida, y definir los que se soportarán. No asumir que todos los destinos conversacionales ni las reglas de medición web son equivalentes. No depende de adoptar Chatwoot.

Mostrar con precisión qué tipos funcionan localmente, cuáles son simulados y cuáles tienen adaptador real pendiente. No conectar cuentas, publicar ni gastar en esta iteración. Las pruebas con proveedores siguen un paso posterior autorizado.

Referencia técnica consultada: [Google Ads API — Performance Max](https://developers.google.com/google-ads/api/performance-max), consultada el 12-10-2026.

## 4. Conciliar lo que se ve con lo informado

En las capturas aparecen dos textos que deben revisarse:
- Marketing dice que en esta fase solo se crea en pausa, mientras el último informe describe activación y pausa simuladas.
- Materiales anuncia PowerPoint/PDF/Word «más adelante», aunque se han tratado capacidades de exportación en entregas previas.

Comprobar primero commit, proceso servido, configuración y alcance exacto de cada exportación. Puede ser texto desactualizado o una limitación concreta; las capturas por sí solas no resuelven cuál. Corregir mensajes y matriz para describir lo que realmente funciona.

También conciliar el inventario de commits: el informe anuncia cinco pero enumera cuatro sobre d955645. No tratar esta diferencia de recuento como un defecto funcional, pero entregar una referencia inequívoca del candidato.

## 5. Pendientes anteriores que se conservan

No sustituir el backlog previo por esta revisión. Conciliar con el repositorio actual y conservar, mientras no haya evidencia de cierre:
- Adaptadores reales y OAuth de Google Ads, Meta y Canva.
- Cierre de marca DEL-002/004/005.
- Versión del kit en el anuncio de Meta, IDN-004.
- Fuentes OTF/WOFF2 incrustadas.
- PDF y búsqueda en el portal del cliente.
- Biblioteca/Plantillas, reforzada por esta revisión.
- Cambio de espacio de trabajo.
- Correo, reforzado por esta revisión.
- HTTPS, dominio, DNS y medición reales; privacidad/consentimiento definitivo e inicio de sesión real del invitado.

ADR-0035 sigue propuesto; Atomic y Chatwoot no están adoptados. No convertir estas observaciones en autorización para adoptarlos.

## 6. Validación y entrega de la siguiente iteración

Verificar sobre un candidato identificable:
- Controles y navegación en los cinco tamaños existentes, incluyendo textos largos, teclado, carga inicial y recarga.
- Creación y edición con decisiones preseleccionadas sin perder elecciones posteriores.
- Brando al inicio y actualización de una propuesta sin borrar cambios del usuario.
- Varios planes de precios y copia de oferta aprobada sin heredar autorizaciones.
- Recorrido con autor y responsable distintos: enviar, comentar, devolver, corregir y aprobar; comprobar además el caso individual explícito.
- Invitado con varios recursos compartidos y notas internas inaccesibles; aislamiento entre marcas.
- Notificaciones por destinatario, vínculos a la versión correcta y correo con sus niveles de evidencia separados.
- Carga/descarga de referencias, arte y plantillas; retorno de Canva sin modificar la versión aprobada.
- Variantes por red y filtros de resultados con datos, datos simulados y ausencia de conexión.
- Cada nuevo tipo de campaña con su recorrido simulado completo y fallos pertinentes.

Reutilizar las pruebas existentes y añadir las necesarias para cambios de comportamiento. Por afectar componentes comunes y permisos, ejecutar la regresión requerida sobre el candidato final o justificar de forma concreta cualquier cobertura que no corresponda a ese código. Mantener las ejecuciones ajustadas a los recursos del equipo.

Las capturas canónicas anteriores no prueban por sí solas los cambios nuevos. Entregar comparativas de las pantallas afectadas y una lista exacta de referencias que necesitan revisión. No actualizar baselines para ocultar diferencias.

Actualizar especificación, matriz, guía de DEMO, riesgos y handoff. Cada criterio debe distinguir implementado, probado localmente, probado con proveedor y pendiente. No llamar «cerrado» a algo que solo tiene controles visibles.

Incluir los pasos de Windows con **pnpm.cmd demo:phase4**, acceso, recorrido de revisión y parada comprobada. No imprimir tokens ni credenciales en el informe. Detener solo los servicios iniciados para la tarea.

Entregar commits locales ordenados, migraciones nuevas solo en las bases aisladas y resultados trazables. No hacer push ni despliegue. Dejar explícito qué puede revisar el usuario y qué sigue impidiendo declarar el candidato release-ready.

## 7. Inventario de evidencia visual

Se pudieron recuperar y revisar las 17 imágenes pese a los avisos iniciales de ruta. La numeración del relato contiene 18 observaciones; la vista específica de periodos/comparativos de Resultados no tiene una captura inequívoca en este conjunto. Su requisito se conserva por la descripción del usuario.

| Captura indicada por el usuario | Archivo recibido |
| --- | --- |
| 1 | image(20261012-060100).png |
| 2 | image(20261012-060312).png |
| 3 | image(20261012-060525).png |
| 4 | image(20261012-061223).png |
| 5 | image(20261012-061826).png |
| 6 | image(20261012-062148).png |
| 7 | image(20261012-062248).png |
| 8 | image(20261012-062459).png |
| 9 | image(20261012-063049).png |
| 10 | image(20261012-063616).png |
| 11 | image(20261012-064502).png |
| 12 | Requisito descrito por el usuario; sin captura específica identificada. |
| 13 | image(20261012-065054).png |
| 14 | image(20261012-065522).png |
| 15 | image(20261012-065846).png |
| 16 | image(20261012-070354).png |
| 17 | image(20261012-070727).png |
| 18 | image(20261012-070854).png |

## Instrucción breve para acompañar el archivo

> Toma este documento como la consolidación de mi revisión de la DEMO y como instrucciones para la siguiente iteración local. Incorpora sus requisitos y criterios a la especificación y matriz antes de implementar. Completa los cambios, conserva los pendientes previos y documenta las ampliaciones de alcance. No interpretes esta revisión como aceptación de la DEMO ni autorización para push, despliegue, conexión real o gasto. Entrega una nueva DEMO verificable, con responsables y aprobaciones comprensibles, evidencia de pruebas y limitaciones reales claramente separadas.
