Status: proposed
Owner: Product owner / Engineering
Canonical: no
Last reviewed: 2026-10-10
Related: docs/14-decisions/ADR-0031.md, docs/14-decisions/ADR-0032.md, docs/14-decisions/ADR-0034.md, docs/15-handoff/PHASE4_SPEC.md
Depends on: owner decisions 2C and 3C (2026-10-10); revisión R09 del 2026-10-10

# Fase 4 · registro de requisitos externos (v3)

Pasos que sólo puede dar el propietario ante terceros. **Nunca se piden claves, tokens ni secretos por chat**: un
valor necesario se introduce en el gestor de secretos del entorno o, en local, en la memoria del proceso (como la
prueba Live AI). Las páginas citadas no prueban que Brandopolis tenga permisos ni que una cuenta concreta pueda
usar una capacidad: cada fila se verifica en la consola del proveedor el día que se configura, y se registra la
evidencia. **Durante esta preparación no se ha hecho ningún registro, solicitud, envío ni cambio de DNS.**

**Integración del producto ≠ conector del asistente.** Que Claude Code o Codex lean Canva, Drive o Figma no
significa que Brandopolis tenga una integración para sus clientes. Las herramientas de desarrollo (por ejemplo,
el MCP de desarrollo de Canva o el MCP de Google Ads de solo lectura) ayudan a programar; tampoco son la
integración.

## Etapas por proveedor

Cada proveedor avanza por etapas separadas; preparar requisitos pronto no implica que las revisiones dependan o
no del código, ni que tengan una duración conocida:

1. **Registro** de cuentas, proyecto o app.
2. **Definición de permisos** mínimos según las operaciones de ADR-0031.
3. **Desarrollo** con simulador y, después, con cuentas de prueba propias.
4. **Preparación de demostración** (vídeo, instrucciones, cuenta de prueba) si el proveedor la pide.
5. **Solicitud de revisión o de nivel de acceso** cuando corresponda.

La prueba con cuentas propias y la habilitación para cuentas de clientes son aceptaciones distintas.

## Google Ads

| Campo | Contenido |
|---|---|
| Operaciones (ADR-0031) | crear campaña de Búsqueda con presupuesto, grupo, palabras clave, RSA, segmentación (en pausa); activar; pausar; leer estado, revisión y métricas |
| Permiso mínimo | alcance OAuth de Google Ads para la cuenta del cliente (vinculada a la cuenta de administrador de la agencia o autorizada por el cliente) |
| Tipo de cuenta | cuenta de administrador (MCC) del propietario; cuentas de prueba para desarrollo; cuentas reales de clientes para la aceptación comercial |
| Modalidad de acceso | **Cambio de plataforma documentado (fuente primaria):** la [guía oficial de developer tokens](https://developers.google.com/google-ads/api/docs/api-policy/developer-token) indica que los developer tokens se retiraron el 9 de septiembre de 2026, que los niveles de acceso se trasladaron a los proyectos de Google Cloud y que el nivel lo determina el proyecto con el que se generan las credenciales OAuth; también pide revisar los responsables del proyecto y dejar de enviar el token en las llamadas. La [página de niveles](https://developers.google.com/google-ads/api/docs/api-policy/access-levels) describe Test (sólo cuentas de prueba), Explorer (producción con límite diario; bloquea creación de cuentas, gestión de usuarios, planificación y facturación), Basic (requiere verificación de marca previa) y Standard (auditoría manual, unos 10 días hábiles); su resumen introductorio no coincide con el cuerpo actualizado. **Pendiente:** el acceso efectivo del proyecto de Brandopolis no se ha verificado en su consola |
| Pasos ejecutables | (1) crear o elegir el proyecto Cloud y habilitar la API; (2) cliente OAuth y pantalla de consentimiento en ese proyecto; (3) comprobar en la página de resumen de Google Ads API el nivel asignado y si basta para crear campañas en cuentas de clientes; (4) revisar que los responsables del proyecto tengan rol de propietario o editor; (5) verificación de la pantalla de consentimiento si el alcance es sensible para usuarios externos |
| Evidencia a registrar | captura o texto de la consola con el nivel de acceso del proyecto y la fecha; cuenta de prueba usada |
| Responsable | propietario |
| Aceptación | crear en pausa, activar y pausar en una cuenta de prueba desde Brandopolis (verificado con proveedor); para clientes, el nivel que permita esas operaciones en sus cuentas |
| Fuentes | [developer tokens y migración](https://developers.google.com/google-ads/api/docs/api-policy/developer-token) (primaria), [niveles de acceso](https://developers.google.com/google-ads/api/docs/api-policy/access-levels), [introducción](https://developers.google.com/google-ads/api/docs/get-started/introduction), [conversiones](https://developers.google.com/google-ads/api/docs/conversions/overview) (consultadas 2026-10-10) |

## Meta Ads

| Campo | Contenido |
|---|---|
| Operaciones (ADR-0031) | crear campaña de tráfico (y de captación con medición verificada), conjunto, creatividad y anuncio en pausa; activar; pausar; leer estado, revisión y métricas |
| Permiso mínimo | sólo los que justifiquen esos endpoints: gestión de anuncios y lectura de anuncios; acceso a la Página que firma el anuncio (Meta exige una Página en la creatividad). Permisos de gestión de negocio sólo si el acceso a las cuentas de clientes lo requiere de verdad; no agruparlos por defecto. Nombres exactos según la documentación vigente |
| Tipo de cuenta | app de Meta para desarrolladores del propietario, negocio verificado, cuenta publicitaria de prueba; cuentas de clientes para la aceptación comercial |
| Modalidad de acceso | gestionar cuentas de terceros exige **acceso avanzado** a esos permisos tras la revisión de la app; no confundir niveles de permiso con niveles de servicio de la API |
| Pasos ejecutables | (1) crear la app y añadir Marketing API; (2) verificar el negocio; (3) probar con la cuenta propia en modo desarrollo; (4) preparar la demostración que pida la revisión; (5) solicitar acceso avanzado sólo para los permisos usados |
| Evidencia a registrar | permisos concedidos y su nivel, fecha, estado de la verificación del negocio |
| Responsable | propietario |
| Aceptación | operaciones en pausa/activar/pausar con cuenta propia (verificado con proveedor); acceso avanzado concedido para la cuenta de un cliente real |
| Fuente | [colección oficial de Marketing API](https://www.postman.com/meta/facebook-marketing-api/collection/0zr4mes/facebook-marketing-api-mapi) (consultada 2026-10-10) |

## Canva (integración del producto)

| Campo | Contenido |
|---|---|
| Operaciones (ADR-0031, ADR-0034) | autorización por usuario; subir recursos permitidos del kit; crear o vincular diseño; abrir edición; recuperar o exportar el resultado |
| Permiso mínimo | alcances de la Connect API estrictamente necesarios para esas operaciones (diseños, recursos, exportación) |
| Tipo de cuenta | integración registrada en el portal de desarrolladores de Canva; cuentas de prueba con distintos planes, porque algunas funciones dependen del plan |
| Modalidad y distribución | Brandopolis necesita que los usuarios de **otras organizaciones** (clientes de agencias) autoricen la integración. Contrastar en el portal vigente qué distribución lo permite y qué revisión exige; la página consultada indica que las apps públicas que usan APIs en vista previa no pasan la revisión, así que sólo se usan APIs estables. Planes: el informe del propietario detectó un desfase entre fuentes sobre autocompletado (Pro/Teams/Enterprise frente a Enterprise); comprobar la operación concreta con la cuenta elegida antes de prometerla o recomendar una compra |
| Pasos ejecutables | (1) registrar la integración y sus URLs de redirección por entorno; (2) elegir alcances mínimos; (3) probar cada operación con una cuenta propia y anotar cuáles funcionan en qué plan; (4) solicitar la revisión de distribución que corresponda |
| Evidencia a registrar | operaciones verificadas por plan y fecha; estado de la revisión |
| Responsable | propietario |
| Aceptación | crear diseño desde un brief del kit, editar y recuperar una versión dentro de Brandopolis con una cuenta autorizada |
| Fuentes | [REST APIs](https://www.canva.dev/docs/apps/rest-apis/), [Canva con agentes de código](https://www.canva.dev/blog/developers/canva-and-coding-agents-platforms/) (consultadas 2026-10-10) |

## Otros requisitos

| ID | Requisito | Responsable | Bloquea | Próximo paso ejecutable | Aceptación |
|---|---|---|---|---|---|
| EXT-REQ-05 | Medición en el destino: evento de conversión del cliente **recibido desde el sitio de destino** (ADR-0032) | cliente / agencia | captación medida | configurar el evento en la cuenta y activar la medición del sitio en Brandopolis | MeasurementBinding `VERIFIED` para ese destino |
| EXT-REQ-07 | Dominio para sitios publicados, distinto del de la app, con DNS comodín y HTTPS | propietario | publicación real de sitios | decidir dominio y alojamiento; nada se compra ni cambia automáticamente | un sitio de prueba publicado en el entorno autorizado |
| EXT-REQ-08 | Proveedor de correo para invitaciones y avisos (diseño en brandopolis-security), o invitación por enlace de un solo uso | propietario | aviso por email | elegir modalidad | invitación aceptada en DEMO por la vía elegida |
| EXT-REQ-09 | Entorno de ensayo aislado (no producción) para publicación, vista previa y callbacks OAuth con HTTPS | propietario | verificación fuera de local | autorizar entorno y su alcance | callback OAuth y vista previa funcionando con HTTPS |
| EXT-REQ-10 | Clave Anthropic para Live AI de las nuevas superficies, introducida por el propietario | propietario | gate Live AI | sesión Live AI según el procedimiento existente | flujos de propuesta en vivo PASS sin escrituras |
| EXT-REQ-11 | Fuentes y recursos del kit con licencia conocida (los aporta cada marca o se eligen con licencia abierta) | agencia / cliente | uso de esas fuentes en web y documentos | registrar origen y permiso de cada fuente en el kit | permisos visibles; alternativas revisadas cuando falte permiso |
| EXT-REQ-12 | Aplicación de destino para verificar exportaciones (PowerPoint y/o LibreOffice) en el equipo de pruebas | propietario | EXP-001 verificado | indicar qué aplicaciones son el destino real de los clientes | PPTX abre sin reparación y es editable en esa aplicación |
| EXT-REQ-13 | Política y texto de consentimiento para etiquetas de medición (alcance por país) | propietario (asesoría legal si procede) | captación medida por etiquetas | decidir la política | aviso de consentimiento aprobado |
| EXT-REQ-14 | (Sólo si se acepta la recomendación de dominio propio) alojamiento con certificados por dominio verificado | propietario | dominio propio del cliente | decidir si se incluye | dominio de prueba verificado y servido con HTTPS |

## Orden recomendado

Registrar ya Google, Meta y Canva (etapas 1–2), porque sus revisiones pueden tardar y no conviene descubrir
bloqueos tarde. El desarrollo avanza con simuladores etiquetados. Una conexión que funcione sólo con las cuentas
del propietario no acredita el uso comercial multicliente; esa aceptación queda bloqueada hasta obtener el acceso
correspondiente.

## Historial de revisiones

| Versión | Fecha | Cambio |
|---|---|---|
| v1 | 2026-10-10 | Candidato del ZIP de revisión de las 12:42 (SHA-256 `4de4fecb…ffe14`) |
| v2 | 2026-10-10 | R09: etapas por proveedor, operación y permiso mínimo, modalidad, evidencia y aceptación por fila; integración ≠ conector del asistente; Meta sin permisos de negocio por defecto; Canva por distribución y plan; medición en destino, fuentes, aplicación de verificación de exportaciones, consentimiento y dominio propio |
| v3 | 2026-10-10 | Dictamen v2 §4: guía oficial de developer tokens como fuente primaria de Google; cambio de plataforma documentado frente a acceso del proyecto de Brandopolis pendiente de verificar; paso de revisión de responsables del proyecto |
