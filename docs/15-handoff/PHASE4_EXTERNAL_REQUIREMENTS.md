Status: accepted
Owner: Product owner / Engineering
Canonical: no
Last reviewed: 2026-10-11
Related: docs/14-decisions/ADR-0031.md, docs/14-decisions/ADR-0032.md, docs/14-decisions/ADR-0034.md, docs/15-handoff/PHASE4_SPEC.md
Depends on: owner decisions 2C and 3C (2026-10-10); revisión R09 del 2026-10-10

# Fase 4 · registro de requisitos externos (v5)

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
| EXT-REQ-08 | Proveedor de correo para invitaciones y avisos, con dominio remitente verificado (SPF/DKIM) y una bandeja de prueba autorizada. El flujo local (cola, plantillas, reintentos, revalidación y errores) ya existe con un proveedor simulado (PHASE4_SPEC §13) | propietario | aceptación por el proveedor real y entrega verificable | elegir el proveedor, verificar el dominio y autorizar la bandeja de prueba; nada se envía a terceros sin esa autorización | un mensaje aceptado por el proveedor y recibido en la bandeja autorizada |
| EXT-REQ-09 | Entorno de ensayo aislado (no producción) para publicación, vista previa y callbacks OAuth con HTTPS | propietario | verificación fuera de local | autorizar entorno y su alcance | callback OAuth y vista previa funcionando con HTTPS |
| EXT-REQ-10 | Clave Anthropic para Live AI de las nuevas superficies, introducida por el propietario | propietario | gate Live AI | sesión Live AI según el procedimiento existente | flujos de propuesta en vivo PASS sin escrituras |
| EXT-REQ-11 | Fuentes y recursos del kit con licencia conocida (los aporta cada marca o se eligen con licencia abierta) | agencia / cliente | uso de esas fuentes en web y documentos | registrar origen y permiso de cada fuente en el kit | permisos visibles; alternativas revisadas cuando falte permiso |
| EXT-REQ-12 | Aplicación de destino para verificar exportaciones (PowerPoint y/o LibreOffice) en el equipo de pruebas | propietario | EXP-001 verificado | indicar qué aplicaciones son el destino real de los clientes | PPTX abre sin reparación y es editable en esa aplicación |
| EXT-REQ-13 | Política y texto de consentimiento para etiquetas de medición (alcance por país) | propietario (asesoría legal si procede) | captación medida por etiquetas | decidir la política | aviso de consentimiento aprobado |
| EXT-REQ-14 | Alojamiento con certificados por dominio verificado (dominio propio del cliente, incluido el 2026-10-10) | propietario | servir dominios propios con HTTPS fuera de local | elegir alojamiento compatible antes del despliegue público | dominio de prueba verificado y servido con HTTPS |

## Clientes, conversaciones y canales · issue #10 (2026-10-11)

Evaluación documental del paquete de reconciliación (revisión 3, fuentes oficiales consultadas el 2026-10-11 por
el revisor del propietario; no repetida ni probada por el agente). **Ningún candidato queda instalado, seleccionado
ni probado.** La captura nativa de Clientes (PHASE4_SPEC §12.2) no depende de ninguno de estos requisitos.

**Dictamen de uso.** Atomic CRM (`marmelab/atomic-crm`, React + shadcn-admin-kit + Supabase, licencia MIT):
patrones y, si compensa, código seleccionado conservando avisos; también evaluable como núcleo adaptado mediante
ADR. No se importa su aplicación, autenticación ni backend; su demo usa una API simulada que reinicia datos.
Chatwoot: candidato a servicio de conversaciones desacoplado detrás de un adaptador de Brandopolis; Clientes
conserva el expediente comercial. Un fork o iframe exige justificación y pruebas propias.

| Componente | Hallazgo | Condición para incorporarlo |
|---|---|---|
| Atomic | MIT | Fijar commit, conservar avisos, revisar terceros; la licencia no aporta aislamiento |
| Chatwoot Community | MIT fuera de `enterprise/` y de excepciones de terceros | Inventario de archivos usados y avisos; términos de servicios conectados y marcas |
| Chatwoot Enterprise | Licencia separada | Contrato para uso productivo, usuarios, integración y distribución; no copiar capacidades Enterprise como MIT |
| Tabla self-hosted publicada | Community $0, Premium Support $19, Enterprise $99 por agente/mes (a reconfirmar al cotizar) | Captain AI, voz, marca configurable, capacidad de agentes y permisos avanzados en planes de pago; SAML y SLA en Enterprise |

**Autoridad de datos.** Brandopolis gobierna espacio, marca, permisos, oportunidad y seguimiento; Chatwoot, si se
adopta, conversación, mensaje, entrega y adjunto; el adaptador mantiene la correspondencia de identidades externas
(sin fusionar por similitud ni por coincidir teléfono/correo); los campos compartidos necesitan autoridad y política
de conflicto (nunca dos expedientes maestros editables); Resultados gobierna los indicadores. Application APIs para
agentes, Client APIs para el cliente final (no sustituyen una bandeja), Platform APIs para aprovisionar con las
restricciones del token. Tokens sólo en servidor; cada operación autoriza actor, espacio, marca y recurso externo.
**Una cuenta por marca es una hipótesis y un inbox no demuestra aislamiento.**

**Eventos.** La documentación vigente describe firma HMAC-SHA256 sobre timestamp, punto y cuerpo original
(`X-Chatwoot-Timestamp`, `X-Chatwoot-Signature`, `X-Chatwoot-Delivery` si existe). Confirmarlo sobre la versión
desplegada; registro durable de recepción y deduplicación; duplicados, fuera de orden, huecos y conciliación;
entrante/saliente/nota privada/entrega separados; un envío incierto nunca se repite a ciegas (ADR-0031).

**Arquitectura y coste.** Chatwoot añade aplicación web, workers, PostgreSQL, Redis, correo y almacenamiento; no
obliga a sustituir la cola PostgreSQL de Brandopolis. No se instala junto a las E2E en el equipo de 8 GB: simulador
para el contrato y entorno aislado medido para la integración. Coste total = licencias + servidores/DB/Redis +
archivos y transferencia + respaldos + correo + cargos por canal + IA + soporte/mantenimiento + amortización del
desarrollo, para una marca piloto, una agencia con varias marcas y un escenario de crecimiento.

| Fuente | Captura de oportunidad | Conversación | Estado en Brandopolis |
|---|---|---|---|
| Registro manual | Nativa | No aplica | En implementación (F4) |
| Formulario web | Nativa, persistente | No equivale a chat | En implementación con página de desarrollo; publicación real depende de sitios, dominio y consentimiento |
| Chat web Chatwoot | Por adaptador | Candidato | Prueba técnica pendiente; no conectado |
| Correo | Ingesta futura si se aprueba | Candidato | No confundir con el correo de invitaciones (EXT-REQ-08); no conectado |
| Meta | Lead Ads exige su integración | Facebook/Instagram/WhatsApp según cuenta | Ads de Fase 4 no habilita mensajería ni Lead Ads; no verificado |
| TikTok | Lead forms aparte | Business Messaging documentado por Chatwoot | Elegibilidad, región y aprobación pendientes |
| LinkedIn | Lead Sync con acceso aprobado | No acreditado | Lead Sync no da mensajes privados; Marketing API 202510 se retira el 2026-10-15, no fijarla |
| Google Ads | Fuente de campaña/atribución | No es bandeja | Pendiente de accesos y pruebas |

| ID | Requisito | Responsable | Estado |
|---|---|---|---|
| I10-EXT-01 | Atomic: commit elegido, licencia principal y de terceros, coste de adaptación | agente + propietario | pendiente |
| I10-EXT-02 | Chatwoot: edición/versión, derechos de uso y contrato si corresponde | propietario | pendiente |
| I10-EXT-03 | Entorno aislado para la prueba, recursos medidos, respaldo y coste de operación | propietario | pendiente |
| I10-EXT-04 | Cobertura real de Application/Platform APIs y aprovisionamiento autorizado | agente (con entorno) | pendiente |
| I10-EXT-05 | Secreto y firma de webhooks, rotación, conciliación y recuperación | agente (con entorno) | pendiente |
| I10-EXT-06 | Matriz de canales y elegibilidad; permisos mínimos de cuentas reales | propietario | pendiente |
| I10-EXT-07 | Privacidad, retención, exportación y borrado de conversaciones y adjuntos | propietario (asesoría si procede) | pendiente |
| I10-EXT-08 | Cotización total y decisión de arquitectura (ADR) antes de cualquier adopción | propietario | pendiente |
| I10-EXT-09 | Agent Bots: versión, API, token/firmas y estados; traspaso humano, bucles, fallo; gateway de Brando; consumo por marca | agente (con entorno) | pendiente |
| I10-EXT-10 | Origen de campañas: UTM, identificadores de clic/anuncio y resolución anuncio → grupo → campaña por fuente; referencia por mensaje en la API/evento real (PR #14681 cubre Click-to-WhatsApp en `develop`, no otros canales) | agente + propietario (cuentas) | pendiente |
| I10-EXT-11 | Gasto, impresiones y clics por API o importación verificable, sin duplicar costes | propietario (accesos) | pendiente (F5) |
| I10-EXT-12 | Ingresos y monedas: base (confirmado, facturado, cobrado), ajustes y conversión trazable; el forecast básico no exige procesador de pagos | propietario | pendiente (F5) |
| I10-EXT-13 | Agentes comerciales externos: política por marca/canal, ventanas, información publicable, costes, traspaso; ningún envío autorizado todavía | propietario | pendiente (F6) |
| I10-EXT-14 | Históricos y forecast: calendario/zona horaria, cortes, retención/exportación, roles de equipo, fuentes de facturas y pagos | propietario | pendiente (F5) |

Fuentes del paquete (páginas vivas): [Atomic CRM](https://github.com/marmelab/atomic-crm) ·
[licencia](https://github.com/marmelab/atomic-crm/blob/main/LICENSE.md) ·
[Chatwoot LICENSE](https://github.com/chatwoot/chatwoot/blob/develop/LICENSE) ·
[Enterprise LICENSE](https://github.com/chatwoot/chatwoot/blob/develop/enterprise/LICENSE) ·
[planes self-hosted](https://www.chatwoot.com/pricing/self-hosted-plans) ·
[FAQ](https://developers.chatwoot.com/self-hosted/faq) ·
[APIs](https://developers.chatwoot.com/api-reference/introduction) ·
[webhooks](https://developers.chatwoot.com/api-reference/webhooks/add-a-webhook) ·
[arquitectura](https://developers.chatwoot.com/self-hosted/deployment/architecture) ·
[requisitos](https://developers.chatwoot.com/self-hosted/deployment/requirements) ·
[canales](https://developers.chatwoot.com/self-hosted/supported-features) ·
[TikTok](https://developers.chatwoot.com/self-hosted/configuration/features/integrations/tiktok) ·
[LinkedIn Lead Sync](https://learn.microsoft.com/en-us/linkedin/marketing/lead-sync/leadsync-overview) ·
[Agent Bots](https://www.chatwoot.com/features/chatbots) ·
[guía de Agent Bots](https://app.chatwoot.com/hc/user-guide/articles/1677497472-how-to-use-agent-bots) ·
[API de Agent Bots](https://developers.chatwoot.com/api-reference/account-agentbots/create-an-agent-bot) ·
[PR #14681](https://github.com/chatwoot/chatwoot/pull/14681) ·
[GA4 UTM](https://support.google.com/analytics/answer/10917952) ·
[GA4 importación de costes](https://support.google.com/analytics/answer/10071305).

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
| v4 | 2026-10-10 | Aprobación del propietario: dominio propio incluido (EXT-REQ-14 deja de ser condicional); invitaciones por email con enlace alternativo y controles de consentimiento aprobados (EXT-REQ-08/13: falta elegir proveedor y texto final) |
| v5 | 2026-10-11 | Issue #10: sección «Clientes, conversaciones y canales» con la evaluación documental de Atomic y Chatwoot (licencias, autoridad de datos, eventos, coste total, canales) e I10-EXT-01…14, todos pendientes |
