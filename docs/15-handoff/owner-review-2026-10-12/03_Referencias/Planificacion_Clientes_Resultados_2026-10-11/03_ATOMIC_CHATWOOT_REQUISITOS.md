# Atomic y Chatwoot · evaluación y requisitos externos
Fecha de consulta de fuentes oficiales: 2026-10-11.
Estado: candidatos evaluados documentalmente; ninguna versión instalada, seleccionada ni probada por este revisor.

## 1. Dictamen de uso

**Atomic: aprovechar patrones y, solo cuando compense, código seleccionado.** Su repositorio combina React, shadcn-admin-kit y Supabase; la licencia principal es MIT. Ofrece contactos, tareas y oportunidades como referencias útiles. El uso selectivo exige conservar avisos y revisar las dependencias del código copiado. No importar su aplicación, autenticación ni backend: no se ha demostrado que su modelo cubra el espacio de trabajo y la marca de Brandopolis. La demo revisada en el issue utiliza una API simulada y reinicia datos; no es prueba de persistencia productiva.

El checkout documentado de Brandopolis usa su propia base técnica. Adoptar React/Supabase u otro framework exigiría una decisión de arquitectura, migración y coste justificados. Primero comparar la utilidad del patrón con implementarlo en el sistema actual. [S1–S2]

**Chatwoot: candidato a servicio de conversaciones desacoplado.** Clientes nativo conserva el registro comercial. Un adaptador controla acceso y referencias a conversaciones externas. Favorecer APIs y pocos cambios sobre Chatwoot; un fork o iframe requiere una justificación y pruebas propias. Su adopción depende de la prueba acotada, no bloquea el formulario o registro manual nativos.

Precisión del plan v5: Atomic también puede evaluarse como núcleo adaptado mediante ADR. La recomendación de reutilización selectiva no cierra esa alternativa; cualquier adopción debe mantener Clientes como experiencia propia y resolver una autoridad comercial única, sin migraciones automáticas de stack o identidad.

## 2. Licencias y coste de licencia

| Componente | Hallazgo | Condición para incorporarlo |
|---|---|---|
| Atomic | Licencia principal MIT | Fijar commit/tag, conservar avisos y revisar terceros; no atribuir aislamiento a la licencia |
| Chatwoot Community | MIT fuera del código Enterprise y de excepciones de terceros | Inventario de archivos utilizados y avisos; revisar términos de servicios conectados y marcas |
| Chatwoot Enterprise | Licencia separada | Validar contrato, uso productivo, usuarios y derechos necesarios de integración/distribución |
| Código visible públicamente | Su publicación no cambia su licencia | No copiar capacidades Enterprise como si fueran MIT |

No se ha verificado una licencia contractual para reventa, marca blanca comercial ni redistribución Enterprise. Una licencia de uso por agente no demuestra por sí sola esos derechos. [S2–S4]

Tabla self-hosted publicada al consultar: Community, $0 por agente/mes; Premium Support, $19; Enterprise, $99. Reconfirmar moneda, facturación, impuestos y condiciones al cotizar. La tabla ubica Captain AI, voz, configuración de marca, capacidad de agentes y permisos avanzados en planes de pago; SAML y SLA en Enterprise. No confundir estos permisos avanzados con las comprobaciones que Brandopolis debe hacer siempre. [S5]

La FAQ permite personalizar Community modificando su código y crear interfaces conversacionales sobre las APIs. Esto no equivale a la configuración comercial lista para usar, ni cubre código Enterprise. Brando propio no concede derecho a Captain AI. [S6]

## 3. Matriz de capacidades y trabajo necesario

| Capacidad | Base/coste a comprobar | Integración y validación requerida |
|---|---|---|
| Contactos, oportunidades y seguimiento de Clientes | Desarrollo y operación nativos; Atomic solo referencia | Persistencia, permisos y modelo propios |
| Conversaciones y mensajes | Núcleo Chatwoot; disponibilidad según versión/canal | Application API, estados, paginación, errores y sincronización |
| Notas privadas y asignación | Verificar edición y API elegidas | No filtrar al cliente; autorizar actor y destinatario |
| Adjuntos | Almacenamiento y transferencia | URLs, permisos, retención, exportación y borrado |
| Bandeja nativa en Brandopolis | Trabajo de UI e integración propio | No aparece automáticamente al instalar Chatwoot |
| Aprovisionamiento | Platform API en self-hosted/managed | Recursos creados por el token o permitidos expresamente |
| Permisos avanzados, capacidad de agentes y marca configurable | Funciones comerciales según tabla actual | Necesidad real y contrato; no copiar implementación Enterprise |
| SAML y SLA | Enterprise según tabla actual | No confundir SAML con tokens o aprovisionamiento |
| Brando sobre conversaciones | IA y trabajo propios, pendiente de fase/contrato | Contexto autorizado; no adoptar Captain AI implícitamente |
| Agent Bots con Brando | Ruta técnica por validar | Asistente interno F5; agente externo por marca/canal F6; contratos/prueba acotada F4 |
| Canales externos | Cuentas, aprobaciones y costes de cada proveedor | Alcance distinto para formularios, anuncios y mensajes |

La versión concreta, los endpoints usados y sus pruebas deben completar esta tabla. La mera existencia de una API no acredita todas las funciones de la interfaz de Chatwoot.

## 4. Autoridad de datos y límites de la API

| Dato | Sistema que gobierna | Relación/sincronización |
|---|---|---|
| Espacio, marca, permisos comerciales, oportunidad y seguimiento | Brandopolis | Se autorizan antes de consultar o modificar recursos externos |
| Conversación, mensaje, entrega y adjunto del canal | Chatwoot, si se adopta | Brandopolis conserva referencias verificables y el mínimo necesario |
| Identidad externa de contacto/cuenta/inbox/usuario | Correspondencia mantenida por el adaptador | No fusionar por similitud ni coincidencia aislada de teléfono/correo |
| Nombre o dato compartido entre sistemas | Decisión por campo pendiente del diseño | Elegir autoridad y política de conflicto; evitar dos maestros editables |
| Indicadores | Resultados | Mantener fuente, periodo y definición; no convertir estados de atención en ventas |

Application APIs sirven a operaciones de agentes. Client APIs sirven a experiencias del cliente final; no sustituyen la bandeja de un vendedor. Platform APIs administran recursos en self-hosted/managed con las restricciones de acceso del token. Mantener tokens en servidor y autorizar cada operación con el actor de Brandopolis; nunca confiar solo en un account_id o inbox_id recibido del navegador. [S7]

Comparar cuenta por marca frente a cuenta por espacio con inboxes. **Cuenta por marca es una hipótesis**, y **un inbox no demuestra aislamiento**. Probar contactos, búsquedas, informes, notas, exportación y adjuntos, incluyendo acceso directo al sistema externo. Si sus permisos no permiten la separación requerida, no dar a usuarios acceso a una cuenta compartida como sustituto del control nativo.

## 5. Eventos y fiabilidad

La documentación actual describe un secreto de webhook y firma con X-Chatwoot-Timestamp y X-Chatwoot-Signature; el cálculo utiliza HMAC-SHA256 sobre el timestamp, un punto y el cuerpo original. También documenta X-Chatwoot-Delivery cuando está disponible. Confirmar este contrato sobre la versión desplegada; no suponer que cualquier versión anterior lo ofrece. [S8]

Validar firma sin reconstruir el JSON, vigencia según la política definida, cuenta asociada y ámbito del evento. Mantener registro durable de recepción/deduplicación; usar identificadores del proveedor y alcance adecuados, con una estrategia documentada si no existe delivery ID.

Probar duplicados, eventos fuera de orden, huecos y conciliación. Separar mensajes entrantes/salientes, notas privadas y estados de entrega/fallo. Una respuesta HTTP o encolado no acredita entrega al destinatario. Los envíos inciertos no se repiten ciegamente; conservar las reglas aplicables de operaciones externas de Brandopolis.

## 6. Arquitectura y coste total

Chatwoot añade aplicación web, workers, PostgreSQL, Redis, correo y almacenamiento. Sus datos y operación deben quedar separados por responsabilidades del núcleo de Brandopolis. Que Chatwoot necesite Redis no obliga a sustituir la cola PostgreSQL ya aprobada de Brandopolis. Revisar despliegue, respaldo/restauración, actualizaciones y observabilidad en un ADR. [S9–S10]

El equipo local reportado tiene 8 GB de RAM. No instalar ni ejecutar toda esa pila junto con navegador, E2E y las bases actuales. Diseñar el adaptador con simuladores primero; validar la integración real en un entorno aislado con recursos medidos. Un simulador no cierra la adopción ni acredita un proveedor.

**Modelo de coste mensual a completar:**

Coste total = licencias facturables + servidores/DB/Redis + archivos y transferencia + respaldos + correo + cargos por canal + IA + soporte/mantenimiento + amortización del desarrollo.

Recoger cotizaciones/mediciones para una marca piloto, una agencia con varias marcas y un escenario de crecimiento. Medir agentes únicos frente a membresías repetidas por cuenta; no asumir que un mismo agente en diez cuentas se factura una sola vez. Registrar almacenamiento, retención, volumen de mensajes, disponibilidad requerida y horas de mantenimiento. No hay presupuesto ni precio de venta aprobado en el issue.

## 7. Fuentes/canales y estado real

| Fuente | Captura de oportunidad | Conversación | Estado en Brandopolis / condición |
|---|---|---|---|
| Registro manual | Nativa | No aplica | A implementar en próxima iteración |
| Formulario web | Nativa, persistente | No equivale a chat | A implementar y probar; publicación real depende del bloque de sitios |
| Chat web Chatwoot | Relación por adaptador | Candidato | Prueba técnica pendiente; no conectado |
| Correo | Ingesta comercial futura si se aprueba | Candidato | No confundir correo de invitaciones con bandeja comercial; proveedor pendiente |
| Meta | Lead forms requieren su integración | Facebook/Instagram/WhatsApp según cuenta/canal | Ads de Fase 4 no habilita automáticamente mensajería o Lead Ads; no verificado |
| TikTok | Lead forms son integración separada | Chatwoot documenta Business Messaging | Elegibilidad, región y aprobación pendientes; no conectado |
| LinkedIn | Lead Sync con acceso aprobado | No acreditado | Lead Sync no concede mensajes privados; no conectado |
| Google Ads | Fuente de campaña/atribución cuando exista | No es bandeja de mensajes | Integración publicitaria Fase 4 pendiente de accesos y pruebas |

Chatwoot documenta varios canales; cada uno mantiene limitaciones de cuenta, ventana de respuesta y operaciones. TikTok exige requisitos Business y configuración/aprobaciones, con restricciones regionales. LinkedIn Lead Sync tiene acceso controlado. Elegir una versión soportada al implementar: la documentación consultada avisa que Marketing API 202510 se retira el 15 de octubre de 2026; no fijarla por defecto en un conector nuevo. [S11–S13]

## 8. Prueba acotada y salida de decisión

1. Fijar versiones y licencias; definir autoridad de campos, APIs y alternativas de aislamiento.
2. Crear fixtures sin datos de clientes y probar el adaptador nativo.
3. Con entorno real autorizado: mensaje web → contacto relacionado → oportunidad → seguimiento persistente.
4. Repetir el evento; probar dos marcas, al menos dos espacios y roles diferentes, revocación y adjuntos.
5. Interrumpir Chatwoot: la captura nativa sigue operativa; recuperar sin duplicar.
6. Medir recursos y completar costes/API/licencias. Conservar resultados y límites.
7. Emitir decisión: adoptar con alcance exacto, adaptar, posponer o descartar. Registrar el ADR antes de incorporar infraestructura/frameworks. Venta ganada y resultados de ventas se prueban al existir el núcleo Fase 5.

## 9. Requisitos a añadir al registro externo

- I10-EXT-01: Atomic, commit elegido, licencia principal/terceros y coste de adaptación.
- I10-EXT-02: Chatwoot, edición/versión, derechos de uso y contrato cuando corresponda.
- I10-EXT-03: entorno aislado, recursos, respaldo y coste de operación.
- I10-EXT-04: cobertura Application/Platform APIs y aprovisionamiento autorizado.
- I10-EXT-05: secreto/firma de webhooks, rotación, conciliación y recuperación.
- I10-EXT-06: matriz de canales y elegibilidad; permisos mínimos de cuentas reales.
- I10-EXT-07: privacidad, retención, exportación y borrado de conversaciones/adjuntos.
- I10-EXT-08: cotización total y decisión de arquitectura antes de la adopción.

Todos están pendientes de validación de una versión concreta. No solicitar claves por chat; usar los mecanismos del servidor y las instrucciones del proyecto.

## Fuentes primarias

- S1: https://github.com/marmelab/atomic-crm
- S2: https://github.com/marmelab/atomic-crm/blob/main/LICENSE.md
- S3: https://github.com/chatwoot/chatwoot/blob/develop/LICENSE
- S4: https://github.com/chatwoot/chatwoot/blob/develop/enterprise/LICENSE
- S5: https://www.chatwoot.com/pricing/self-hosted-plans
- S6: https://developers.chatwoot.com/self-hosted/faq
- S7: https://developers.chatwoot.com/api-reference/introduction
- S8: https://developers.chatwoot.com/api-reference/webhooks/add-a-webhook
- S9: https://developers.chatwoot.com/self-hosted/deployment/architecture
- S10: https://developers.chatwoot.com/self-hosted/deployment/requirements
- S11: https://developers.chatwoot.com/self-hosted/supported-features
- S12: https://developers.chatwoot.com/self-hosted/configuration/features/integrations/tiktok
- S13: https://learn.microsoft.com/en-us/linkedin/marketing/lead-sync/leadsync-overview

Son páginas vivas; la consulta del 11 de octubre no sustituye revisar los archivos y contratos del commit/plan finalmente elegido.

## 10. Requisitos añadidos por el plan v5

- I10-EXT-09: Agent Bots. Fijar versión, API, token/firmas y estados; probar traspaso humano, prevención de bucles y fallo. Reutilizar gateway de Brando; registrar consumo/límites por marca. Capacidad documentada no equivale a integración aprobada o activa.
- I10-EXT-10: origen de campañas. Matriz por fuente de UTM, identificadores de clic/anuncio y resolución anuncio→grupo→campaña. Validar la referencia por mensaje y su entrega en la API/evento real; no extrapolar cobertura de WhatsApp a otros canales.
- I10-EXT-11: gasto, impresiones y clics. APIs o importaciones verificables con permisos mínimos, granularidad, fecha y conciliación sin duplicar costes.
- I10-EXT-12: ingresos/monedas. Definir fuente y base —confirmado, facturado o cobrado—, ajustes y conversión trazable; el forecast básico no exige contratar un procesador de pagos. Un registro manual/importado autorizado puede aportar evidencia, identificando su procedencia.
- I10-EXT-13: agentes comerciales externos. Política por marca/canal, ventanas/reglas de mensajes, información publicable, costes y traspaso antes de habilitar en F6. No autorizar envíos con este paquete.
- I10-EXT-14: históricos y forecast. Calendario/zona horaria, cortes, retención/exportación, roles de equipo y fuentes de facturas/pagos. El contrato de datos debe permitir evidencias futuras sin afirmar que ya existe una integración financiera.

Fuentes y hallazgos nuevos se desarrollan en 08 §10. La captura manual/web F4 no depende de conseguir todos los accesos; debe conservar la evidencia que ya tenga y declarar faltantes.
