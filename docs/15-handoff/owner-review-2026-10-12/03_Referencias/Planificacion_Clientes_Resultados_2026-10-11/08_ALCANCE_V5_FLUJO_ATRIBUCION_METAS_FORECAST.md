# Ampliación vigente · plan de Clientes y Resultados, versión 5
Fecha: 2026-10-11 · Paquete revisión 3
Fuente: issue #10 actualizado a 2026-10-11T17:16:28Z y plan versión 5, secciones 11–13.
Estado: alcance funcional aprobado; código, pruebas e integraciones pendientes.

Este documento amplía 01_ESPECIFICACION_CLIENTES_RESULTADOS.md. Ambos se fusionan en la especificación vigente; no crear dos contratos incompatibles. La trazabilidad está en 09_TRAZABILIDAD_PLAN_V5.md y los criterios nuevos se añaden a 02_MATRIZ_ACEPTACION_ISSUE10.md.

## 1. Flujo comercial completo y multicanal

El recorrido objetivo aprobado es: canal habilitado → prospecto/contacto → oportunidad → seguimiento y negociación → cierre ganado o perdido → Resultados → propuesta de aprendizaje → revisión humana en Validación.

WhatsApp es un ejemplo. El mismo contrato debe admitir canales Chatwoot efectivamente habilitados para la marca, formularios de campañas o web, registro manual e importaciones mediante conectores propios. Diseñar una entrada normalizada y conservar evidencia específica de cada fuente; no declarar todos los canales conectados.

Separar contacto, conversación, interacción y oportunidad. Una consulta de soporte no crea una oportunidad comercial por defecto. Un contacto puede tener varias oportunidades y varias conversaciones. No crear un contacto por mensaje ni fusionar identidades no verificadas. Un prospecto sin calificar o sin respuesta conserva seguimiento; el silencio no confirma una pérdida.

La confirmación de oportunidad se rige por el flujo comercial autorizado. Ganada exige importe, moneda, fecha y actor; perdida conserva motivo declarado o desconocido. Una sugerencia de Brando no se transforma en motivo confirmado.

## 2. Brando interno y externo

| Modo | Alcance y fase | Autoridad |
|---|---|---|
| Asistente del vendedor | Fase 5: interpretar intención, proponer calificación, resumir, redactar respuestas, sugerir preguntas/tareas y ayudar al cierre | El vendedor revisa y actúa; usa solo información permitida para su rol y marca |
| Agente externo de atención | Fase 6: preguntas permitidas y recopilación comercial en marcas/canales habilitados | Política explícita por marca/canal, contexto publicable, límites y traspaso humano |
| Análisis y aprendizaje | Fase 5: patrones de ganadas/perdidas, objeciones y brechas; ampliaciones Fase 6 | Evidencia y cobertura visibles; equipo revisa en Validación; no reescribe estrategia |

Conservar el gateway de modelos vigente. No incorporar otro proveedor de IA, Captain AI o infraestructura duplicada por instalar Chatwoot. Las autorizaciones actuales de Brando no activan por sí solas un agente externo: adaptar los contratos de autoridad y probarlos antes de habilitar ese modo.

El asistente interno puede consultar datos autorizados de su ámbito; esos datos no pasan automáticamente al contexto publicable del agente externo. Notas privadas, estrategia interna, borradores e información de otras marcas quedan fuera de respuestas a clientes.

La toma humana suspende nuevas respuestas automáticas y descarta envíos pendientes no iniciados; devolver al bot exige una transición explícita y auditada. Comprobar la autoridad de nuevo justo antes de enviar. Un intento ya iniciado se concilia bajo las reglas vigentes: no prometer que un mensaje emitido se puede retirar ni reiniciarlo a ciegas.

Evitar bucles por mensajes salientes del bot, reintentos y cambios de sincronización. Si canal o IA fallan, conservar el expediente, indicar el estado real y dejar atención humana visible. Medir coste/consumo por marca y límites, también durante la prueba técnica.

## 3. Origen y trazabilidad campaña–venta

### 3.1 Capturar evidencia desde Fase 4

Distinguir plataforma/cuenta de adquisición del canal/inbox de atención. Una persona puede llegar por anuncio de Meta y conversar por WhatsApp: “WhatsApp” por sí solo no identifica campaña.

En la captura inicial persistir, cuando existan:
- Espacio, marca, tipo de fuente y cuenta/plataforma de adquisición.
- Canal de atención y formulario/inbox.
- Identificadores estables de campaña, conjunto/grupo y anuncio, junto con nombres observados.
- UTM de fuente, medio, campaña, ID y contenido; página/referrer depurados.
- Referencia publicitaria o identificador de clic entregado por la fuente.
- Identificador del envío/evento/mensaje, fecha de interacción y recepción, procedencia y estado de verificación.
- Responsable o cola y segmento comercial conocido. El segmento es opcional y pertenece a la marca; no inventar una clasificación.

Aplicar lista de campos permitidos, límites y depuración de datos personales/secretos de URL antes de persistir. No guardar URLs completas sin criterio ni enviar estos datos a telemetría indiscriminadamente.

Un identificador de campaña proporcionado por el navegador es un dato capturado; su asociación a una cuenta/marca requiere validación. Si solo existe un ID de anuncio, resolver campaña mediante API o catálogo importado verificable. Si falta evidencia o permiso, mostrar “Campaña no identificada” y causa. El origen declarado por una persona se conserva como declarado. Brando no inventa atribución.

Los parámetros deben persistir en el punto de entrada y llegar al formulario/chat autorizado. Que aparezcan en Analytics no los vincula automáticamente con Clientes. Un flujo con datos faltantes sigue guardando la consulta.

### 3.2 Historia y atribución en Fase 5

Conservar primer origen conocido y añadir interacciones posteriores sin sobrescribirlo. Una relación externa verificada reutiliza el contacto; una nueva intención comercial puede crear otra oportunidad. Mantener atribución por oportunidad/venta, además de la historia del contacto.

Cada informe declara modelo y versión, ventana temporal, base de ingreso, ámbito y cobertura. Distinguir primer contacto, último contacto y crédito elegido para ese informe. Dentro de una vista aditiva una venta no se imputa íntegra a varias campañas; un reparto de crédito no supera el ingreso elegible.

Fusiones, correcciones, reintentos y cambios de nombres mantienen referencias e historial auditado. No prometer cobertura perfecta entre dispositivos o plataformas. Reportar proporción atribuida, declarada y sin atribución.

## 4. Resultados y ROAS

ROAS = ingreso elegible atribuido / gasto publicitario real, para la misma marca/cuenta, moneda y definición temporal.

Caso de aceptación: MXN 5,000 atribuidos y MXN 1,000 de gasto real → 5x. No usar presupuesto planificado ni valor esperado de oportunidades abiertas como sustitutos.

Mostrar modelo/ventana, base de ingreso —venta confirmada, facturado o cobrado—, periodo/zona horaria, fuente, actualización y cobertura. Separar resultados por fecha de venta de cohortes por captación.

Importar o sincronizar gasto, impresiones y clics con identificadores y granularidad; una importación seguida de API no duplica el gasto. Conservar ajustes y valor/moneda originales; cualquier conversión declara tasa, fecha y criterio.

Falta de gasto: no calculable. Gasto cero: no aplicable. Fuente orgánica: no inventar un gasto. Diferenciar completo, provisional y pendiente. ROAS no es margen de utilidad ni demuestra causalidad incremental.

Con datos suficientes, reportar leads, calificados, oportunidades, conversión a venta, ingreso, gasto, CPL, coste por lead calificado, coste por cliente/venta, ROAS y motivos de pérdida. Devolver detalles autorizados para reconciliar cada cifra. Cancelaciones, reembolsos y correcciones ajustan ingresos con trazabilidad. Brando propone mejoras; no modifica campañas o presupuestos automáticamente.

## 5. Asesores, equipos, segmentos y partidas

Fase 4 prepara contratos y registra responsable/cola y segmento conocido. Fase 5 implementa el trabajo comercial completo:

- Varios asesores por marca/equipo; responsable principal, colaboradores y cambios con fecha/actor.
- Crédito comercial explícito por participante: una venta MXN 100,000 al 60/40 produce 60,000/40,000 por asesor y 100,000 globales. El crédito suma 100%; no duplicar por participante.
- Separar responsable operativo actual del crédito histórico al cierre. Reasignar no cambia retrospectivamente una venta.
- Segmentos con IDs estables, un segmento principal para informes aditivos y etiquetas adicionales como filtros. No duplicar una venta por pertenecer a varias etiquetas.
- Reutilizar el catálogo/ofertas existente cuando sea compatible; una oportunidad/venta admite partidas de productos y servicios con cantidad, importe y moneda. Un negocio de producto 60,000 y servicio 40,000 conserva global 100,000.
- Conservar nombres, segmentos, partidas y crédito al cierre/corte; renombrar o desactivar catálogos/asesores mantiene la consulta histórica.
- Permisos por espacio/marca/equipo y capacidades específicas para metas, crédito y ajustes históricos. Liderar un equipo no concede acceso a todas las marcas.

Los porcentajes de atribución publicitaria y el crédito por asesor son ejes distintos. No multiplicar o sumar totales de vistas diferentes como si fueran ventas adicionales.

## 6. Metas y periodos

Fase 5 incluye metas globales por marca, segmento, producto, servicio, asesor y equipo, mensuales, trimestrales y anuales. Consolidar marcas solo con autorización y definiciones/monedas compatibles.

Cada versión de meta registra ámbito, dimensión/IDs, inicio/fin, calendario/zona horaria, moneda, objetivo, base de medición, autor y fecha. Por defecto meses/trimestres naturales; contemplar calendario comercial por marca. No confundir este calendario de resultados con las prioridades del Plan de Marketing anual/90 días, que conserva su contrato.

Mostrar meta, resultado real, cumplimiento y brecha. Caso: resultado MXN 80,000 / meta MXN 100,000 → 80% y faltante 20,000. Con meta cero, porcentaje no aplicable; sin meta, indicar ausencia.

Venta confirmada, facturación y cobro son bases diferentes: comparar una meta solo con resultados de la misma base. Una previsión de cobro no es cumplimiento real.

La persona puede distribuir el año entre meses/trimestres y una meta global entre componentes de la misma jerarquía; no imponer reparto uniforme. Detectar desajustes. Las dimensiones global, segmento, producto y asesor representan vistas de las mismas ventas y no se suman entre sí. Brando puede proponer; las metas requieren revisión humana.

## 7. Históricos y comparación

Conservar versiones de metas, resultados y cortes publicados. Un periodo nuevo no borra el anterior. Distinguir fecha comercial, facturación, cobro, corte y momento de conocimiento; correcciones posteriores son trazables y no reescriben silenciosamente un corte.

Comparar mes/mes, trimestre/trimestre, año/año, mismo mes o trimestre del año anterior y acumulado anual, manteniendo ámbito, moneda y base. En periodos en curso, ofrecer comparación al mismo avance temporal e indicar que son parciales.

Mostrar valores anterior/actual, diferencia absoluta y variación porcentual. Base anterior cero: porcentaje no aplicable. Datos ausentes: sin datos, con cobertura; no cero ficticio.

Exportar únicamente detalle autorizado: negocios, partidas, fuentes y crédito por asesor. Los catálogos/asesores inactivos siguen siendo consultables en históricos. Comparar después lo previsto al corte frente a lo realizado.

## 8. Forecast de negocios ganados

El forecast básico solicitado pertenece a Fase 5 y parte solo de negocios confirmados como ganados. Un embudo abierto ponderado por probabilidad sería otro informe, separado.

Vistas:
1. Valor comercial ganado: cierre, segmento, partidas, asesores y origen/campaña.
2. Programación comercial: entrega o ejecución prevista registrada.
3. Facturación prevista: calendario y saldo pendiente frente a facturas efectivas.
4. Cobros previstos: calendario y saldo pendiente frente a pagos confirmados.

Cada hito/cuota requiere venta y, cuando corresponda, partida de origen, tipo, importe/moneda, fecha prevista, estado, fuente y confirmación. Admitir anticipos, pagos parciales, servicios por etapas y recurrencias con compromiso/calendario explícitos. No prolongar una recurrencia indefinidamente.

No sumar dos veces negocio y cuotas; facturar y cobrar no son dos ingresos distintos. Conciliar facturas con saldo por facturar y pagos con saldo por cobrar; auditar ajustes, cancelaciones, reembolsos y reprogramaciones. Fechas previstas no acreditan reconocimiento contable de ingreso.

Ejemplo: ganado 100,000, cobrado 20,000, previstos 40,000 noviembre y 40,000 diciembre → saldo por cobrar 80,000. Una oportunidad abierta queda fuera. Sin calendario, el ganado aparece “Pendiente de programación”; no asignar el importe al mes de cierre por defecto.

Cortes del forecast incluyen fecha, última actualización, cobertura y pendientes; conservan su estado publicado. Etiquetar como previsión basada en compromisos, no cobro confirmado ni ingreso garantizado. Brando señala brechas/concentración y propone seguimiento; la persona confirma metas, fechas, ajustes y acciones.

## 9. Reparto obligatorio y dependencias

| Fase | Incorporación |
|---|---|
| 4, próximo bloque | Propagar todo el alcance; contratos de flujo/roles/partidas/historia; captura manual/web persistente con origen/UTM/evidencia/estado desconocido, responsable/cola y segmento conocido; prueba acotada Chatwoot/Brando |
| 5 | Núcleo comercial y Kanban, mensajería inicial real habilitada, asistente interno Brando, cierre humano, atribución y gasto verificable, metas, históricos, forecast de ganados y aprendizaje revisado en Validación |
| 6 | Ampliación de canales, agente externo por marca/canal, seguimiento automatizado autorizado, conciliación/conectores ampliados, observabilidad y límites de consumo |

Preparar contratos en Fase 4 no obliga a crear todas las tablas futuras ni habilita funciones sin construir. Tampoco permite diferir las metas, históricos o forecast básico a Fase 6. Mantener el resto del alcance previo de cada macrofase.

Atomic puede evaluarse como reutilización selectiva o núcleo adaptado, sin decisión de adopción; Clientes sigue siendo la experiencia propia y la autoridad comercial debe quedar inequívoca. Chatwoot/Agent Bots es ruta técnica por validar; no dependencia obligatoria para guardar oportunidades.

## 10. Hallazgos técnicos verificados y límites

Chatwoot documenta Agent Bots para conectar lógica/IA externa por eventos y API, incluyendo traspaso al equipo. La guía describe estados pending/open y devolución al bot. Es una vía para Brando sin depender de Captain AI; no prueba que sus permisos, firmas, estados o formatos sean suficientes en la versión elegida. Probar evento de toma humana, secreto/token, prevención de bucles, fallo y consumo, conservando el gateway propio.

El PR oficial Chatwoot #14681 se integró en develop el 16 de junio de 2026. Guarda referencias Click-to-WhatsApp en atributos del mensaje, normalizando Meta Cloud API/Twilio. Su descripción difiere la UI y trata otros canales como trabajo posterior. No extender ese hallazgo a todos los canales ni afirmar que ya está en el despliegue que usemos. Verificar referencias en el API/webhook real seleccionado; Brandopolis realiza la relación a campaña, gasto, oportunidad y ROAS.

Fuentes oficiales consultadas de nuevo el 11 de octubre:
- https://www.chatwoot.com/features/chatbots
- https://app.chatwoot.com/hc/user-guide/articles/1677497472-how-to-use-agent-bots
- https://developers.chatwoot.com/api-reference/account-agentbots/create-an-agent-bot
- https://github.com/chatwoot/chatwoot/pull/14681
- https://support.google.com/analytics/answer/10917952
- https://support.google.com/analytics/answer/10071305

La licencia, cobertura de cada canal y costes del documento 03 continúan vigentes como evaluación pendiente de una selección concreta. Ninguna de estas fuentes autoriza mensajes a clientes, compras, cambios de permisos o publicación de producción.
