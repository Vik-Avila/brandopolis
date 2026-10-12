# Brandopolis — Actualización del plan de desarrollo
Fecha: 11 de octubre de 2026 · Zona: America/Mexico_City
Versión: 1

## Alcance de esta actualización

El propietario solicita incorporar al plan las exploraciones sobre Integraciones/Administración, modelos LLM, usuarios, facturación y créditos, y un asistente inteligente público por marca con conocimiento, flujos y automatizaciones.

La incorporación al plan está solicitada. La distribución siguiente constituye la propuesta concreta de ejecución. No inicia implementación, no habilita proveedores, no autoriza campañas ni gasto y no altera el cierre técnico actualmente encargado a Claude.

Este documento actualiza la planificación disponible en esta conversación. Su conciliación con el roadmap, especificaciones y matriz vigentes del repositorio queda pendiente de incorporación por el equipo de desarrollo. No se ha modificado el repositorio ni se declara aceptado un ADR nuevo.

## 1. Ubicación dentro de las seis fases

| Fase | Alcance del roadmap | Incorporación |
|---|---|---|
| 1 | Strategic Core + Brando Foundation | Conservar las bases existentes; sin trabajo nuevo asignado por esta actualización. |
| 2 | Strategic Intelligence | Reutilizar fuentes, contexto y procedencia; sin reabrir la fase por esta actualización. |
| 3 | Validation & Learning Engine | Reutilizar experimentos y revisión humana para aprender de resultados y conversaciones; sin aprendizaje automático de hechos. |
| 4 | Activation & Orchestration | Concluir el alcance vigente; revisar y documentar las bases necesarias para administración SaaS y bot público. La comprobación real de las integraciones previstas permanece en esta fase. |
| 5 | Measurement & Intelligence | Incorporar administración comercial básica, consumo, conocimiento publicable por marca y primer asistente web con RAG, captación y atención humana. Constituye una ampliación planificada de la fase. |
| 6 | Agentic Scale | Ampliar automatizaciones, editor visual de flujos, canales, herramientas operativas y administración avanzada de IA y consumo. |

La finalización local, la aceptación humana y la verificación con proveedores son hitos distintos. No se trasladan automáticamente las comprobaciones reales de Fase 4 a otra fase para declarar su cierre.

## 2. Fase 4 — Bases y continuidad del alcance vigente

### Trabajo ya previsto que se conserva

- Conexiones y permisos por marca y usuario, versiones aprobadas, auditoría y cola de operaciones.
- Canva, Google Ads y Meta Ads dentro de su alcance definido.
- Creación de campañas en pausa, segunda autorización de activación y pausa; primero con simuladores.
- Validación real escalonada: entorno de prueba admitido por el proveedor, cuenta real con campaña de prueba en pausa y piloto activo específicamente autorizado.
- La prueba con cuentas propias y la habilitación para cuentas de terceros se registran por separado.
- Ninguna conexión, activación o inversión real queda autorizada por este documento.

### Bases a revisar y documentar antes de diseñar las ampliaciones

- Relación entre cuenta u organización, marca, sitio, usuario y conexión; un tenant de agencia puede contener varias marcas.
- Diferencia entre contenido interno, aprobado editorialmente y autorizado para uso público por el asistente. Aprobar un documento no lo hace público.
- Identidad de fuentes y versiones, vigencia, retirada y eventos de actualización.
- Contratos de oportunidades, conversaciones, origen y campaña; aprovechar la idempotencia y los permisos existentes.
- Registro del proveedor/modelo de IA, operación y consumo cuando existan; identificar las carencias para completarlas en Fase 5.
- Separación entre futuros conectores de mensajería y el motor de conocimiento/respuesta.

Esta revisión es de arquitectura y planificación. Una base ausente se registra como dependencia futura. Solo una deficiencia que afecte al alcance o seguridad actuales exige corrección dentro de Fase 4; no se agrega silenciosamente el bot, billing o un nuevo constructor visual a su cierre.

## 3. Fase 5 — Administración comercial y primer asistente público

### 3.1 Configuración de cuenta y marca

| Capacidad | Entrega básica |
|---|---|
| Integraciones | Centro unificado para conectar, elegir activos por marca, consultar permisos/estado/última sincronización, reconectar y desconectar. Respeta conexiones personales como Canva. |
| Cuenta y equipo | Organización o agencia, miembros, invitaciones, roles, asignación a marcas y límites del plan. Reutiliza las facultades existentes. |
| IA y Brando | Modo automático recomendado y opciones administrativas entre modelos previamente validados; trazabilidad de modelo y versión. No cambia decisiones aprobadas al cambiar de modelo. |
| Plan y facturación | Plan contratado, marcas y usuarios incluidos, límites, suscripción, pagos y comprobantes mediante el proveedor que se seleccione. |
| Uso y créditos | Consumo por cuenta, marca y función, cuota/saldo e historial, alertas y comportamiento al alcanzar límites. Recargas y equivalencias solo si se adopta el modelo comercial de créditos. |
| Administración interna | Acceso separado para operación de Brandopolis, con permisos y auditoría propios. |

Ubicación de producto: Configuración de la cuenta y Conexiones de la marca. El asistente tendrá su propia configuración por marca.

La contabilidad de uso debe distinguir costes operativos de unidades cobrables. Fallos, reintentos y devoluciones necesitan reglas para evitar cargos duplicados. Suscripción de Brandopolis, consumo de IA e inversión publicitaria se presentan como conceptos independientes.

**Condición comercial transversal:** los controles básicos de plan, permisos, consumo y cobro deben estar listos antes del lanzamiento de pago que los utilice. Si se decide comercializar antes de terminar Fase 5, habrá que adelantar expresamente ese mínimo; no se espera a Fase 6.

### 3.2 Conocimiento para atención pública

- Reutilizar fichas y contenidos aprobados de Brandopolis; admitir después documentos, FAQ, páginas autorizadas y conectores.
- Extraer texto, tablas y OCR cuando se requiera; señalar incertidumbres y conflictos.
- Asociar cada fuente a cuenta, marca, audiencia, responsable, versión, vigencia y autorización de publicación.
- Preparar fragmentos que conserven contexto y búsqueda híbrida por significado y términos exactos.
- Publicar versiones revisadas de la base de conocimiento; mostrar fuente y versión al administrador en el simulador.
- Actualizar por cambios autorizados y retirar fuentes vencidas o eliminadas de índices y cachés.
- Mantener datos variables, como precios y disponibilidad, en consultas al sistema vigente; no confiar en copias documentales antiguas.

No se prevé entrenar un modelo independiente por tenant como requisito inicial. RAG, datos estructurados e instrucciones por marca constituyen la base propuesta.

### 3.3 Primer asistente web por marca

- Nombre, apariencia, tono y objetivos configurables; identidad clara como asistente automatizado.
- Conocimiento público autorizado y aislamiento por cuenta y marca antes de recuperar datos.
- Explicar ofertas, responder FAQ, comparar características confirmadas y orientar al visitante.
- Memoria de sesión; acceso a información privada del cliente solo con autenticación adecuada.
- Pedir aclaraciones y reconocer ausencia de información; ofrecer transferencia humana.
- Crear una oportunidad o solicitud confirmada por el visitante mediante el mecanismo existente, sin duplicados.
- Conservar conversación, origen, campaña e identificadores permitidos cuando estén disponibles.
- Transferir al asesor con resumen y contexto; suspender respuestas automáticas mientras la persona atiende.
- Límites de uso y comportamiento alternativo ante fallos del proveedor o agotamiento de cuota.

La primera versión usa plantillas configurables de orientación, cotización, calificación y transferencia. No requiere todavía un editor visual general.

Las acciones iniciales se limitan a consultas y captura/derivación de solicitudes. Reservas confirmadas, pagos, descuentos y otras operaciones con efectos adicionales requieren integración y alcance específicos posteriores.

### 3.4 Medición y aceptación

Medir respuestas respaldadas, preguntas no resueltas, transferencias, oportunidades calificadas, latencia y coste por conversación. Relacionar campañas y resultados sin equiparar conversación, lead, venta e ingreso.

Comprobar al menos:
- Ausencia de filtraciones entre marcas y de contenido interno.
- Respuesta correcta tras actualizar o retirar una fuente.
- Tratamiento de conflictos, datos faltantes y documentos con instrucciones maliciosas.
- Creación sin duplicados y transferencia humana sin respuestas simultáneas.
- Consumo trazable, límites efectivos y recuperación ante indisponibilidad.
- Revisión humana de sugerencias de mejora antes de convertirlas en conocimiento.

## 4. Fase 6 — Flujos, automatización y escala

### 4.1 Editor visual de flujos

Evolucionar las plantillas probadas hacia bloques de preguntar, consultar, evaluar condición, mostrar opciones, ejecutar acción permitida y transferir. La IA comprende lenguaje natural dentro de recorridos con reglas comprobables.

Incluir borrador, simulación, aprobación, publicación, versiones y restauración. Las conversaciones activas conservan una versión identificable y una política explícita de transición.

Priorizar bloques controlados. Código arbitrario, conectores genéricos y webhooks libres no se presuponen incluidos; requieren evaluación de alcance y seguridad.

### 4.2 Canales y operaciones

- Reutilizar conocimiento y lógica en el sitio y los canales admitidos por el proveedor elegido, respetando restricciones de cada canal.
- Integrar bandeja humana, asignación y transferencia con Chatwoot si se adopta, u otro adaptador.
- Conectar al sistema comercial seleccionado sin duplicar contactos u oportunidades.
- Incorporar agendas, cotizaciones operativas, disponibilidad y otras acciones según integraciones aprobadas.
- Automatizaciones por eventos con permisos, confirmaciones cuando correspondan, reintentos, conciliación y trazabilidad.
- Mantener origen, campaña y contexto al cambiar de canal cuando exista una vinculación autorizada y verificable; no inferir identidad entre canales de forma silenciosa.

### 4.3 Administración avanzada

- Selección de modelos por tarea, rutas alternativas ante fallos, evaluaciones y límites por marca/equipo.
- Distribución de cuotas y consumo para agencias con múltiples marcas.
- Opciones comerciales avanzadas, paquetes y recargas, según modelo de monetización aprobado.
- Optimización de coste y tiempo mediante recuperación selectiva y caché compatible con versiones y permisos.

La elección de un modelo no basta para certificarlo: cada cambio relevante debe conservar pruebas sobre tareas y herramientas utilizadas.

## 5. Decisiones que permanecen abiertas

| Decisión | Cuándo debe resolverse |
|---|---|
| Chatwoot y CRM concreto | Antes de la implementación del conector correspondiente. ADR-0035 sigue propuesto; Atomic y Chatwoot no están adoptados por esta actualización. |
| Proveedor de pagos, planes, precios y unidad de crédito | Antes del cobro real y de prometer límites comerciales. |
| Modelos LLM y política de alternativas | Antes del piloto del asistente; elegir mediante calidad, coste y comportamiento medidos. |
| Motor de recuperación y almacenamiento vectorial | Durante el diseño de Fase 5, evaluando volumen y arquitectura existentes. No se selecciona Azure ni otro proveedor por haberlo citado en la exploración. |
| Fuentes públicas, datos personales y conservación | Antes de habilitar conversaciones públicas y conexiones a datos de clientes. |
| Acciones transaccionales del bot | Antes de habilitar cada integración y facultad. |
| Comercialización anterior a Fase 5 | Requiere adelantar expresamente la base SaaS necesaria y actualizar estimaciones. |

## 6. Incorporación al trabajo del equipo

1. Conciliar este documento con el roadmap y la especificación vigentes sin sobrescribir decisiones posteriores.
2. Registrar las ampliaciones de Fases 5 y 6 y las dependencias de arquitectura de Fase 4.
3. Mantener el bloque actual de Fase 4; no comenzar runtime de las ampliaciones por esta instrucción de planificación.
4. Descomponer las capacidades en criterios y estimar antes de iniciar cada fase. Las nuevas capacidades no están absorbidas en estimaciones históricas.
5. Actualizar las decisiones técnicas por el procedimiento del repositorio antes de adoptar proveedores o herramientas.
6. Conservar el criterio de una fase completa por iteración y aceptación del propietario, separando siempre implementación, DEMO y evidencia real.

## 7. Procedencia

- Solicitud del propietario y exploraciones de esta conversación del 11 de octubre de 2026.
- Roadmap de seis fases del paquete Brandopolis_Estado_Completo_y_Continuidad_2026-10-10.zip, leído en esta conversación. Su estado de ejecución es histórico; los informes posteriores prevalecen.
- PHASE4_SPEC §4.6–4.8 y §7 y ADR-0031 del paquete brandopolis-phase4-spec-review-v4-2026-10-10.zip, leídos en esta conversación; contrastar con sus versiones actuales del repositorio.
- Último estado de desarrollo comunicado: Fase 4, bloque 8 con simuladores y pendientes locales; bloque 9 a continuación. No se ha inspeccionado aquí el código de los commits locales reportados.
