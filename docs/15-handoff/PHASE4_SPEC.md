Status: accepted
Owner: Product / Engineering
Canonical: no
Last reviewed: 2026-10-11
Related: docs/14-decisions/ADR-0030.md, docs/14-decisions/ADR-0031.md, docs/14-decisions/ADR-0032.md, docs/14-decisions/ADR-0033.md, docs/14-decisions/ADR-0034.md, docs/14-decisions/ADR-0035.md, docs/15-handoff/PHASE4_ACCEPTANCE_MATRIX.md, docs/15-handoff/PHASE4_EXTERNAL_REQUIREMENTS.md, docs/15-handoff/PHASE4_HANDOFF.md
Depends on: owner brief 2026-10-10 (decisiones 1A, 2C, 3C) y su actualización del mismo día (identidad visual, revisión R01–R10); Fases 1–3 integradas en `main`

# Fase 4 · Marketing, sitios web y colaboración · especificación (v6 · aprobada, con Clientes del issue #10)

Especificación previa al código de producto. No describe nada implementado. Decisiones de arquitectura:
[ADR-0030](../14-decisions/ADR-0030.md) (alcance, dominio, versiones, autoridad, exportaciones),
[ADR-0031](../14-decisions/ADR-0031.md) (conexiones, operaciones externas, cierre de marca),
[ADR-0032](../14-decisions/ADR-0032.md) (sitios, vista previa, medición),
[ADR-0033](../14-decisions/ADR-0033.md) (permisos, contexto activo, portal) y
[ADR-0034](../14-decisions/ADR-0034.md) (identidad visual y kit). Todos **aceptados** por el propietario el 2026-10-10 14:49 (§11). Criterios y pruebas:
[PHASE4_ACCEPTANCE_MATRIX](PHASE4_ACCEPTANCE_MATRIX.md). Requisitos ante terceros:
[PHASE4_EXTERNAL_REQUIREMENTS](PHASE4_EXTERNAL_REQUIREMENTS.md). Resolución de la revisión: §9.

## 0. Punto de partida y procedencia de la evidencia

Comprobado por el agente en esta sesión (2026-10-10):

- Ruta `C:\proyectos\brandopolis`; `main` local = `origin/main` =
  `1f1cece05b168b00e43ea62c6f9a2581039ad02f` (merge del PR #9). Rama `feat/phase4-marketing-web-collaboration`
  creada desde ese SHA; antes de esta revisión contenía exactamente los 18 archivos del candidato v1, sin commits.
- 16 migraciones (`0000`–`0015`); ADR-0030 y ADR-0034 eran los siguientes números libres en todas las ramas.
- Foundation antes de cambiar contratos: 259 Markdown / 77 JSON / 25 schemas / 15 requirements / 13 golden cases
  / 0 errores.

Aportado por el propietario, **no verificado** por el agente:

- Documento externo «Brandopolis_Handoff_Nuevo_Chat_2026-10-09.md» (v1, no incluido en el repositorio): describe
  la Fase 3 desplegada técnicamente en PILOT, 43 marcas en ese momento y la aceptación humana integral pendiente
  al redactarlo.
- 2026-10-10: el propietario confirmó que la revisión visual y funcional de la Fase 3 está completada y aprobada.
- El registro técnico del despliegue (SHA, migraciones aplicadas, verificación posterior) no está en el
  repositorio. Los conteos (16 migraciones, 43 marcas) son históricos y se contrastarán con el inventario vigente
  al preparar un despliegue futuro. Completar esta documentación no exige un nuevo despliegue.

## 1. Alcance

Decisiones confirmadas por el propietario (no se vuelven a preguntar): **1A** agencias pequeñas y consultores,
comprensible para empresas que gestionan su marca; **2C** sitios completos multipágina con IA, editables y
publicables; **3C** campañas Google Ads y Meta Ads creadas y publicadas por API oficial con confirmación humana
específica por operación de publicación o gasto. **Ampliación del 2026-10-10:** ingesta o desarrollo de la
identidad visual de cada marca, conectada con todos los canales. **Petición del mismo día:** preguntar qué quiere
trabajar primero la persona, guardar esa prioridad y adaptar el recorrido (§4.9).

Dentro: siete entradas de navegación; pregunta inicial de prioridad con el formulario actual de alta; ofertas; plan anual con foco en 90 días; identidad visual (importar,
completar, crear) y kit aprobado; cinco tipos de entregable; redes sociales con calendario y registro manual de
publicación; sitios multipágina con publicación, restauración y vista previa autenticada; Google Ads
(Búsqueda/RSA) y Meta Ads (tráfico; captación sólo con medición verificada); guía viva, biblioteca, portal del
cliente y aprobación por versión; Canva por API del producto; Brando con nuevas superficies de propuesta;
resultados esenciales con revisión humana conectada al motor de Validación.

Fuera: CRM general, ecommerce, reservas, membresías, constructor de apps, email marketing, publicación orgánica
automática por red, cambios de facturación, generación de imágenes con un proveedor nuevo sin decisión humana,
generador propio de logotipos, analítica avanzada de la Fase 5, vistas de portafolio/negocio de marcos de
terceros.

Incluidos por la aprobación del 2026-10-10 (§11): dominio propio del cliente con configuración asistida
([ADR-0032](../14-decisions/ADR-0032.md)), inicio guiado completo con Brando y ficha editable (§4.10), invitaciones
por email con enlace de un solo uso como alternativa y controles de consentimiento. La pregunta de prioridad (§4.9)
funciona también con el formulario actual.

Una aprobación de alcance no autoriza campañas reales, gasto, compras, DNS ni despliegues. Cada operación externa
concreta se presenta (destino, contenido, efecto) para su autorización.

**Resolución del 2026-10-11 · [issue #10](https://github.com/Vik-Avila/brandopolis/issues/10) (plan de Clientes y
Resultados, versión 5).** La exclusión «CRM general» de la lista anterior se conserva como registro histórico, pero
ya no excluye la **captura inicial de oportunidades**: el propietario aprueba **Clientes** como área propia, con
registro manual y formulario web persistentes, y **Resultados** ampliado a marketing, operación comercial y ventas.
Es un adelanto acotado dentro de esta fase; el núcleo comercial completo y la mensajería inicial son Fase 5 y la
atención automática y los conectores ampliados, Fase 6. Detalle, reparto y trazabilidad: §12. La aprobación no
selecciona Chatwoot, Atomic, un proveedor, un framework ni precios, y no autoriza mensajes a clientes, compras ni
producción.

## 2. Reutilización (auditoría del código real)

| Necesidad | Se reutiliza | Se crea |
|---|---|---|
| Aislamiento | `Engine.identity()`, `scope()`, `inScope()`, FK compuestas `(workspaceId, brandId)` | contexto de actor por marca, capacidades por marca |
| Idempotencia / concurrencia / auditoría | tabla `idempotency` con huella, patrón `expected*` → 409, `strategic_audit`, eventos de telemetría validados | registro de cambios de marketing con el mismo patrón |
| Versiones | patrón `decision_versions` (`sequence`, `previousVersionId`, inmutables, triggers de historia de `0015`) | versiones de oferta, entregable, kit, sitio, campaña; punteros borrador/aprobada/publicada |
| Origen y cambios | proyección de atención de Strategic Intelligence (leer no escribe) | manifiesto de origen + «Origen actualizado» |
| Públicos, pruebas, supuestos | decisión Cliente principal, `evidence` con procedencia, `hypotheses` y motor de Validación (ADR-0026) | referencias desde ofertas, kit y resultados; sin segundo sistema estratégico |
| Archivos | subida con SHA-256, confinamiento `<raíz>/<workspaceId>/<brandId>`, purga (ADR-0029), extractor de documentos con `pdfjs-dist` | recursos del kit, saneado de SVG, validación de fuentes, descarga autorizada |
| Documentos | generador PDF propio (`pdf-writer.ts`, `pdf-editorial.ts`, `editorial-kit.ts`), Brand Book (ADR-0028), `jszip` | PDF desde el kit publicado (fuentes según la comprobación de ADR-0030), `.pptx`/`.docx`/ZIP |
| IA | Model Gateway, adaptador Anthropic, topes y aviso PILOT, tickets de un solo uso (VAL-011), Evidence Guard | prompt y schemas de salida de marketing e identidad, evals |
| Trabajos | patrón «fila pendiente + reintento» de `impacts` y purga | cola `ExternalJob` con concesiones e intentos + worker (ADR-0031) |
| Interfaz | shell, laterales plegables en `sessionStorage`, rail Brando/Contexto/Atención/Historial, `enterView`, `stateBadge()`, mapas de etiquetas en español | navegación de siete entradas, subnavegación interna, búsqueda en el encabezado, vistas nuevas |

No existe hoy: ofertas, plan, identidad visual de marcas, entregables, comentarios, invitados, OAuth de terceros,
credenciales, cola, servidores público y de vista previa, exportación PPTX/ZIP, PDF con fuentes incrustadas,
descarga de archivos subidos.

## 3. Experiencia y navegación

- **Lateral principal (siete filas):** Inicio · Estrategia · Productos y servicios · Marketing · Marca y recursos ·
  Colaboración · Resultados. Filas orientativas de 44–48 px, sin huecos decorativos. Al pie, compactos: Mi
  aprendizaje, Configuración, Ayuda.
  **Reconciliación del 2026-10-11 (issue #10):** Clientes es un destino aprobado; la regla de siete filas no puede
  ocultarlo. Propuesta en validación visual (no aprobada como diseño exacto): **ocho áreas compactas** — Inicio ·
  Estrategia · Productos y servicios · Marketing · Clientes · Marca y recursos · Colaboración · Resultados —, sin
  desplazamiento del lateral en 1366×768, 1280×800 y 1440×900 a escala normal (§12.3).
- **Encabezado:** selector de marca y búsqueda compacta (sólo información permitida de la marca activa, agrupada
  por estrategia, oferta, recurso o entregable). **Panel derecho:** Brando más visible y contextual; Contexto,
  Atención e Historial se conservan.
- **Estrategia:** subnavegación con el recorrido vertical de las nueve decisiones, Investigación y fuentes,
  Validación, Mapa estratégico, Impacto y coherencia.
- **Marketing:** Plan de Marketing · Redes sociales · Sitio web · Campañas digitales. «Activación» no sustituye
  ningún nombre.
- **Marca y recursos:** Identidad visual · Guía de marca · Biblioteca · Plantillas.
- Subnavegación con pestañas accesibles (flechas, foco visible) que pasa a selector en pantallas estrechas.
  Laterales plegables con iconos y control de expansión visibles.
- Sin desplazamiento innecesario del menú en 1366×768, 1440×900 y 1920×1080 al 100 %; con zoom alto o poca altura
  todo sigue alcanzable (el menú puede desplazarse; nada se oculta para esconder una barra).
- Lenguaje cotidiano, ayudas breves con ejemplos; términos técnicos sólo en documentación técnica. Estados
  canónicos en código; etiquetas visibles por el mecanismo de presentación existente.
- Sin controles que anuncien una capacidad inexistente: si falta una conexión, un permiso del proveedor, una
  medición o un plan de Canva, se dice qué falta y qué sí puede hacerse.
- Look minimalista aprobado y Brand Master inmutable.

## 4. Capacidades

### 4.1 Productos y servicios (ofertas)

Oferta = público (versión de Cliente principal + segmento), necesidad, resultado buscado, beneficios,
diferencias, condiciones, pruebas (Evidence con procedencia), decisiones de origen y supuestos (hipótesis del
motor de Validación). Precio opcional con moneda, vigencia y certeza; una estimación se muestra como estimación.
Punteros borrador/aprobada; una versión aprobada es la que usan entregables, sitio y campañas. Conexión
cliente–necesidad–valor–prueba sin reproducir plantillas de terceros ni cuestionarios obligatorios.

### 4.2 Plan anual con foco en 90 días

Objetivos anuales, prioridades de 90 días, acciones con responsable, fechas, presupuesto (moneda, certeza) e
indicador. Acción comercial → oferta; acción institucional → marca. Lista, vista mensual y calendario son vistas
de los mismos registros. Cambios con revisión numerada (409 ante cliente desactualizado) y registro de cambios.
Un borrador útil se crea sin estrategia completa: la interfaz señala la información que falta. Para usarlo con el
cliente se aprueba y comparte una **instantánea** (`PlanSnapshot`); editar el plan no cambia la copia compartida.
El **avance** de las acciones se comparte aparte sin nueva aprobación editorial.

### 4.3 Identidad visual y kit de marca (ADR-0034)

Tres entradas: **Ya tengo identidad** (ingesta con extracción de candidatos y su origen), **Quiero completarla**
(faltantes respecto de los canales usados, nueva versión con diferencias visibles) y **Quiero crearla**
(direcciones desde la estrategia; recursos por diseñador, Canva del producto o carga). Kit: logotipo y variantes,
paleta con funciones, tipografías con permisos y alternativas por canal, estilo, plantillas o especificaciones,
identidad verbal. Certeza por valor (declarado, estimado, propuesto, confirmado). Borrador, aprobada y publicada
separadas. Requisitos por canal; dependencias explícitas desde cada pieza; aprobar otra versión abre impacto y
revisión sin cambiar lo publicado.

### 4.4 Cinco tipos de entregable

Presentación comercial; textos de productos/servicios; publicaciones para redes; anuncios; instrucciones para
diseñador/Canva. Brando propone con contexto aprobado, mensajes, pruebas y kit; la persona edita. Cada versión
muestra fuente, versión del kit, procedencia (decidida por el servidor) y estado editorial. Exportaciones con la
calidad definida en ADR-0030 (PPTX editable, PDF fiel, textos reutilizables, brief descargable, diseño Canva
vinculado cuando la integración lo permita). Redes sociales: calendario, objetivo, red y formato, textos,
materiales, revisión y **registro manual** de publicación.

### 4.5 Sitios multipágina (ADR-0032)

Mapa de páginas revisable; edición de textos, imágenes, llamadas a la acción, orden de secciones y navegación;
vista previa autenticada escritorio/móvil; borradores, versiones y revisión; publicar y restaurar; SEO básico,
sitemap, alternativas de imagen, contraste de parejas usadas, enlaces y formulario con destino comprobado;
medición por destino. Exportar ZIP como portabilidad.

**Estado (2026-10-11, bloque 7):** implementado y validado en DEMO, dentro de Marketing › Sitio web y sin entrada
nueva en el lateral. Recorrido: objetivo → lo que ya existe → propuesta determinista de Brando con procedencia
(sólo cambia el borrador si la persona la incorpora) → edición por secciones del catálogo cerrado → comprobaciones
→ vista previa autenticada → revisión con criterio → publicación de la versión exacta con `PUBLISH_SITE` y
confirmación → restauración como publicación nueva. El formulario guarda la solicitud en Clientes. Dominio propio
verificado por TXT, sin compra ni cambio de DNS, y vuelto a comprobar cada día (DOM-004). Testimonios y cifras sólo con
fuente, vista previa por tamaño y ZIP de una versión aprobada. Pendiente de proveedor o decisión: HTTPS por dominio,
dominio de publicación, medición y consentimiento con etiquetas reales, comprobaciones DNS reales y publicación real.
Estado por criterio en la matriz (v21).

### 4.6 Google Ads y Meta Ads (ADR-0031)

Objetivo → oferta/página de destino → audiencia o palabras clave → piezas (con el kit cuando el formato lo usa) →
presupuesto, moneda y fechas → revisión → creación en pausa (autorización 1) → activación (autorización 2) →
estado real del proveedor → resultados. Captación sólo con medición verificada del destino. Consultar estado,
pausar y comprobar; sincronizar rechazos y cambios externos. Estados editorial, de publicación y de proveedor
separados. Trabajos inciertos en «Pendiente de comprobación», nunca reenviados automáticamente.

### 4.7 Colaboración y portal (ADR-0033)

Entregables con responsable, fechas, comentarios, solicitud de revisión y aprobación por versión. Invitado de una
marca: lee instantáneas compartidas de estrategia y plan, guía publicada y materiales compartidos; comenta y
aprueba lo compartido; nunca edita ni publica ni gasta. Personas con varios roles mediante contexto de actor por
marca. Mi aprendizaje privado para todos.

### 4.8 Canva, Brando y resultados

- Canva (integración del producto, no el conector del asistente): autorización por usuario; enviar recursos
  permitidos y brief; crear o vincular diseño; abrir edición; recuperar o exportar. Cada capacidad se marca
  verificada sólo tras probarla. Recuperar un diseño crea una versión nueva que necesita revisión.
- Brando: consulta, propone y revisa; explica por qué, qué fuentes y versiones usa y qué falta. Mismo Gateway,
  contexto mínimo autorizado, uso y coste registrados sin secretos, entrada externa como dato no confiable.
- Resultados: objetivo, indicador, período, fuente, moneda y zona horaria, última sincronización y revisión
  humana. Manual/importado/sincronizado etiquetado; sin conexión = «dato pendiente», nunca cero. Solicitudes del
  formulario propio separadas de conversiones atribuidas. Conversiones de proveedores no se suman como personas.
  La revisión humana elige mantener, ajustar o volver a probar, enlazando con el motor de Validación.

### 4.9 Pregunta inicial de prioridad · **requisito confirmado**

Origen: petición expresa del propietario (2026-10-10) de preguntar qué quiere lograr el usuario; el dictamen v3
(§3.3) lo clasifica como requisito confirmado, independiente del rediseño completo del alta (§4.10, propuesto).
Funciona **con el formulario actual de alta**, que sigue siendo una ruta válida aunque no se acepte el rediseño.

**Qué se confirma:** preguntar qué quiere trabajar primero la persona, **guardar esa prioridad con su marca**,
adaptar a ella las preguntas y la siguiente acción, y permitir cambiarla después sin perder información.

Después de los datos básicos de identificación de la marca:

> **«¿Qué te gustaría trabajar primero con tu marca?»** — «Elige por dónde empezar. Podrás cambiarlo después.»

| Intención | Entrada y adaptación |
|---|---|
| Desarrollar mi estrategia completa | Estrategia; recorrido progresivo por las nueve decisiones |
| Definir o mejorar un punto de mi estrategia | Estrategia; elegir el punto o recibir ayuda para identificarlo; no se obliga a recorrer las nueve decisiones |
| Organizar mi marketing | Marketing → Plan de Marketing, con horizonte anual y prioridades de 90 días |
| Preparar una campaña | Marketing → Campañas digitales; objetivo y canal pertinentes; la medición verificada se exige para captación, no para tráfico |
| Crear contenidos o materiales | elegir la pieza: redes en Marketing, recursos reutilizables en Marca y recursos, revisión compartida en Colaboración |
| Crear o mejorar mi sitio web | Marketing → Sitio web |
| Incorporar, completar o crear mi identidad visual | Marca y recursos → Identidad visual; tres entradas y un solo modelo de kit (ADR-0034) |
| Vender un producto o servicio | Productos y servicios; reutilizar o concretar la oferta y proponer el siguiente trabajo comercial |
| No estoy seguro; ayúdame a elegir | orientación breve, propuesta comprensible y elección humana del punto de partida |

**Presentación recomendada (recomendación de UX del revisor, no decisión del propietario):** una prioridad única
al inicio, con seis opciones visibles — estrategia completa, punto concreto, organizar marketing, preparar
campaña, otras necesidades y ayuda para elegir —; «otras necesidades» despliega materiales, sitio, identidad y
oferta, con texto libre adicional. Se pueden añadir prioridades después. Sin entradas nuevas en el lateral.

**Comportamiento:**

- **Ordena, no limita:** adapta las preguntas, la siguiente acción y el «próximo paso» de Inicio; nunca oculta
  entradas, bloquea acciones, cambia permisos ni aprueba nada. Identidad y otras dependencias se piden cuando la
  tarea las necesita.
- **Persistencia:** `BrandWorkPriority` append-only, con su marca y sus permisos (ADR-0030); la vigente es la última.
  Cambiarla añade un registro, conserva la historia, no reescribe decisiones, planes ni contexto, y Brando deja de
  usar la anterior como vigente.
- **Contexto declarado:** el texto libre de negocio sigue entrando por el campo existente «Objetivo inmediato»
  (contexto declarado de ADR-0025). Elegir una prioridad no crea ni aprueba una versión de Strategic Objective.
- **Marcas existentes:** pueden elegir o cambiar su prioridad desde Inicio; no repiten el alta.
- **Sin IA:** la pregunta, la persistencia y la adaptación funcionan sin Brando; la ayuda de «No estoy seguro»
  degrada a una orientación determinista si la IA falla.
- **Invitados:** mantienen su portal; no ven ni cambian la prioridad.
- Telemetría: sólo la intención elegida (nunca el texto libre), con el catálogo de eventos actualizado al
  implementar.

**Aceptación:** INT-001…INT-008 en la matriz (alcance base).

### 4.10 Inicio guiado completo · **incluido por la aprobación del 2026-10-10**

Recomendación del revisor (dictamen v2 §5 y v3 §5): recorrido progresivo con Brando y una ficha siempre editable,
ambos sobre los mismos datos. Incluye la pregunta de §4.9 y añade el rediseño del alta. El propietario lo incluyó
en la Fase 4 el 2026-10-10; no añade entradas al lateral ni un segundo chat.

**Base que se reutiliza.** El alta actual recoge nombre, «qué está construyendo», «objetivo inmediato», punto de
partida, referencias competitivas y geografía como contexto declarado (`user-input` con prefijo) que Strategic
Intelligence proyecta sin prellenar decisiones (ADR-0025). Ese formulario evoluciona a la **ficha**; guía y ficha
leen y escriben la misma información. No se crea un perfil de marca paralelo.

Bienvenida propuesta: «Vamos a preparar tu marca. Trae los materiales que ya tienes o responde algunas preguntas.
Brando te ayudará a completar lo que falte.»

| Paso | Experiencia propuesta | Resultado |
|---|---|---|
| 1 · Tu marca | Mínimos para identificarla o crearla; indicar si es tu marca o la de un cliente; a continuación la pregunta de prioridad de §4.9; «Tengo materiales», «Empezar con preguntas» y acceso discreto a «Completar ficha» | Espacio de marca claro y prioridad guardada; desde aquí los archivos se cargan en su alcance |
| 2 · Lo que ya sabemos | Aportar documentos o sitio web; revisar lo extraído con su origen; Brando pregunta **sólo lo que falta para la prioridad elegida** | Qué ofrece, a quién atiende, dónde opera y qué busca primero, con origen y pendientes |
| 3 · Tu identidad | «Ya tengo identidad», «Quiero completarla», «Quiero crearla» (ADR-0034), reutilizando archivos ya cargados; posponible si la prioridad no la necesita | Kit en preparación o materiales incorporados; el desarrollo completo sigue en Marca y recursos |
| 4 · Revisa y comienza | Ficha editable con confirmados, propuestas y pendientes; siguiente paso útil según la prioridad | Entrada con una base revisada; confirmar la ficha no aprueba estrategia, kit ni plan |

**Condiciones:** preguntas breves, una intención por paso; respuestas seleccionables cuando ayuden; no volver a
preguntar lo confirmado ni pedir dos veces un archivo; conflictos entre documentos visibles para que la persona
elija; «No lo sé todavía», volver, guardar y retomar; cambiar entre guía y ficha sin pérdida; progreso por etapas
reales; mínimos de entrada pequeños (no exigir las nueve decisiones ni el kit para entrar); si falla la IA o la
extracción, la ficha manual sigue disponible y el archivo se conserva; reintentar no crea marcas ni archivos
duplicados; aislamiento por marca y autorización de creación actuales; el invitado ve su portal.

**Datos:** `BrandSetupDraft` del usuario que crea la marca, dentro de su workspace; al crear la marca (de forma
idempotente) queda ligado a ella. Estados: `IN_PROGRESS → CONFIRMED / ABANDONED`. Confirmar registra el contexto
declarado; no crea versiones de decisiones. La prioridad no vive en el borrador: se guarda en `BrandWorkPriority`
(§4.9).

**Aceptación:** ONB-005…ONB-012 en la matriz, obligatorios desde la aprobación (ONB-001…004 se trasladaron a INT).

## 5. Datos y contratos

- Agregados: ADR-0030 §agregados y ADR-0034. Migraciones nuevas aditivas desde `0016`; ninguna tabla existente se
  modifica; triggers de historia con el patrón de `0015`.
- Schemas JSON v1 nuevos en `schemas/` (con ejemplos): offer-version, plan-action, plan-snapshot,
  strategy-snapshot, deliverable-version, comment, approval, brand-kit-version, kit-asset, site-version (con la
  configuración de medición y consentimiento), measurement-binding, connection (sin secretos),
  operation-authorization, external-job, external-step, external-attempt, measurement-compatibility,
  brand-work-priority, brand-setup-draft (sólo si se incluye el inicio guiado completo),
  campaign-version, brand-closure, result-observation, result-review, salidas de Brando para marketing e identidad.
- Estados propuestos (se añaden a state-machines al implementar):

| Objeto | Estados |
|---|---|
| Versión editorial (oferta, entregable, kit, sitio, campaña) | DRAFT → IN_REVIEW → CHANGES_REQUESTED / APPROVED; APPROVED → SUPERSEDED sólo cuando otra versión posterior es APPROVED |
| Punteros del agregado | borrador en trabajo · aprobada vigente · publicada (kit, sitio) — relaciones, no estados |
| PlanAction | PLANNED → IN_PROGRESS → DONE; PLANNED/IN_PROGRESS → CANCELLED |
| SitePublication | PENDING → PUBLISHED / FAILED; PUBLISHED → REPLACED |
| OperationAuthorization | PENDING → AUTHORIZED → RESERVED → CONSUMED; PENDING/AUTHORIZED → CANCELLED / EXPIRED; RESERVED → CANCELLED / EXPIRED mientras queden pasos sin enviar (la reserva no amplía el plazo) |
| ExternalJob | QUEUED → CLAIMED → RUNNING → SUCCEEDED / FAILED / NEEDS_CHECK / PARTIAL / EXPIRED; QUEUED/CLAIMED → CANCELLED; NEEDS_CHECK/PARTIAL → RUNNING / SUCCEEDED / FAILED |
| ExternalStep (paso remoto) | PENDING → DISPATCHING → SUCCEEDED / REJECTED / NEEDS_CHECK; DISPATCHING → PENDING sólo si consta que no se abrió la conexión por plazo vencido; REJECTED → DISPATCHING (intento nuevo con autorización vigente); NEEDS_CHECK → SUCCEEDED (encontrado) / NOT_CREATED (evidencia remota tras la ventana de cierre); NOT_CREATED → DISPATCHING (repetición humana con sus condiciones) |
| BrandClosure | OPEN → RESOLVING → READY → COMPLETED |
| MeasurementBinding | NOT_CONNECTED → PENDING_VERIFICATION → VERIFIED; VERIFIED → NEEDS_REVERIFICATION (cambia la huella de medición) / NOT_CONNECTED (la versión viva no la contiene) / LOST (conexión perdida) |
| BrandWorkPriority | sin estados: registros append-only; la vigente es la última |
| BrandSetupDraft (sólo si se incluye el inicio guiado completo) | IN_PROGRESS → CONFIRMED; IN_PROGRESS → ABANDONED |
| Connection | ACTIVE / EXPIRED / REVOKED / ERROR |
| Invitation · BrandGuest | PENDING → ACCEPTED / EXPIRED / REVOKED · ACTIVE → REVOKED |
| Certeza de un valor del kit | DECLARED / ESTIMATED / PROPOSED / CONFIRMED |
| ResultReview (resultado) | MAINTAIN / ADJUST / RETEST |

  El estado del proveedor se guarda tal como lo informa y se muestra traducido. Hipótesis/evidencia, estado
  editorial y publicación son dimensiones distintas: nunca se fusionan en un «validado».

## 6. Prueba de migración

Base de ensayo con datos de Fases 1–3 (copia de una DEMO aislada con varias marcas, versiones, revisiones,
hipótesis, aprendizajes, reflexiones y archivos) y base limpia. Tras migrar: conteos y además contenido y
relaciones históricas (versión activa, historial, dependencias, auditoría, revisiones, procedencia), permisos por
marca, cierre y eliminación de marca que alcanzan las tablas nuevas, INV-008/009/010 en base nueva. Los registros
heredados no se convierten en publicaciones ni reciben aprobaciones nuevas. Nunca migraciones de producción.

## 7. Secuencia, estimación y esperas

**Unidad:** una *sesión* = un bloque de trabajo del agente de unas 3–4 horas de trabajo efectivo, que incluye
implementar, ejecutar las pruebas pertinentes y registrar resultados. No incluye la revisión del propietario ni
las esperas externas, que se listan aparte. Son supuestos, no compromisos; no extrapolan la rapidez del piloto a
integraciones. La estimación v1 (23–35) no incluía identidad visual ni las correcciones R01–R10.

**Orden funcional:** estrategia/oferta → importar, completar o desarrollar identidad → revisión y versión del kit →
materiales/sitio/campañas → publicación autorizada → resultados. Plan e identidad avanzan en paralelo cuando no
comparten una dependencia bloqueante.

| Bloque | Contenido | Sesiones | Revisión del propietario | Espera externa (independiente) |
|---|---|---|---|---|
| 1 | Auditoría, especificación, ADR, matriz, requisitos, corrección R01–R10 | 2 (hecho, pendiente de aceptación) | aceptar ADR-0030…0034 | — |
| 2 | Datos y autoridad: versiones y punteros, capacidades por marca, contexto de actor, conexiones, credenciales, cola con concesiones/intentos/conciliación, cierre de marca, simuladores | 6–9 | 1 ronda | iniciar ya los registros de Google, Meta y Canva |
| 3 | Navegación de siete entradas y búsqueda, Inicio con próximo paso, pregunta de prioridad sobre el formulario actual (§4.9), ofertas, plan con instantánea y avance, entregables, Brando de marketing | 6–9 | 1 ronda (UX) | — |
| 4 | Identidad visual: ingesta y extracción con certeza, completar, crear (direcciones, brief, carga), kit y requisitos por canal, contraste, seguridad de archivos, dependencias e impacto | 7–10 | 1 ronda | Canva del producto para el recorrido de creación con Canva |
| 5 | Guía viva y PDF desde el kit, biblioteca, portal, invitados, comentarios, aprobaciones | 4–6 | 1 ronda | proveedor de email o invitación por enlace |
| 6 | Exportaciones: comprobación técnica (PPTX editable, PDF con fuentes y Unicode) e implementación elegida | 3–5 | revisión de fidelidad | aplicación de destino para verificar apertura (EXT-REQ-12) |
| 7 | Sitios: renderizador, publicador, servidor público, vista previa autenticada, formularios, medición por destino | 6–9 | 1 ronda | dominio de sitios, entorno de ensayo |
| 8 | Canva, Google Ads, Meta Ads en el alcance definido; resultados y revisión del ciclo | 7–10 | 1 ronda | accesos de Google y Meta, integración Canva |
| 9 | Revisión integral, seguridad, pruebas completas, DEMO de aceptación, informe de riesgos | 4–5 | aceptación final | — |
| **Pendiente (bloques 2–9)** | | **43–63** | 8–9 rondas | semanas, no estimables por el agente |
| **Total de la fase (incluye el bloque 1 realizado)** | | **45–65** | | |

Conversión con la unidad declarada (3–4 h por sesión): pendiente **129–252 h**; total **135–260 h**
equivalentes. Es una conversión de la estimación, no horas registradas ni un plazo garantizado. El bloque 1 no se
suma dos veces: las 45–65 ya lo incluyen.

Propuestas pendientes, **no incluidas** en esos totales:

| Propuesta | Se reutiliza (ya estimado en otros bloques o existente) | Trabajo nuevo | Sesiones nuevas | Horas equivalentes |
|---|---|---|---|---|
| Dominio propio asistido (ADR-0032) | publicador, servidor público y aislamiento (bloque 7) | verificación de control del dominio, unicidad entre marcas, emisión de certificado, retirada y nueva verificación periódica | 3–5 | 9–20 |
| Inicio guiado completo (§4.10) | campos y captura del alta actual y su proyección ADR-0025; pregunta de prioridad y su adaptación (§4.9, bloque 3); subida y extracción de documentos existentes; ingesta y tres entradas de identidad (bloque 4); Gateway de Brando | `BrandSetupDraft` con guardar/retomar idempotente; cambio guía ↔ ficha sin pérdida; preguntas de Brando sólo sobre lo que falta (prompt y schema nuevos, evals); resumen de revisión; pruebas E2E, teclado y móvil | 4–6 | 12–24 |

**Asignación de la pregunta de prioridad (corrección del dictamen v3, sin cifra nueva):** la parte confirmada
(§4.9: pregunta, `BrandWorkPriority`, adaptación de preguntas y próximo paso) se asigna al **bloque 3 dentro de su
rango actual (6–9)**, porque reutiliza el formulario de alta y la lógica de próximo paso de Inicio que ese bloque
ya construye. El rango 4–6 del inicio guiado completo se mantiene como estimación del rediseño restante y **ya no
incluye la pregunta**: no se cuenta dos veces. Si al implementar el bloque 3 la pregunta excede su rango, se
recalibra y se informa en SESSION_STATE.

Escenarios (sesiones de 3–4 h; las horas son conversión de la estimación, no horas medidas ni plazo garantizado):

| Escenario | Total, con las 2 realizadas | Pendientes | Horas pendientes equivalentes |
|---|---:|---:|---:|
| Alcance base (incluye la pregunta de prioridad) | 45–65 | 43–63 | 129–252 |
| Base + inicio guiado completo | 49–71 | 47–69 | 141–276 |
| Base + dominio propio del cliente | 48–70 | 46–68 | 138–272 |
| Base + ambas ampliaciones | 52–76 | 50–74 | 150–296 (156–304 totales) |

Antes de fijar un calendario, cada bloque declarará su entregable comprobable, trabajo activo estimado,
dependencia externa y tiempo real observado; la estimación se recalibra tras los primeros bloques implementados.

La fase no se declara completa al terminar la navegación ni ningún bloque aislado. Las aceptaciones con proveedor
real quedan bloqueadas hasta obtener el acceso correspondiente y se informan como tales.

## 8. Riesgos principales

- Permisos de proveedor: un acceso que sólo funciona con cuentas propias no acredita uso multicliente.
- Gasto real: todo defecto en reserva, revalidación o conciliación tiene coste; lo incierto se detiene.
- Superficies públicas nuevas (sitios, vista previa, formularios, etiquetas de medición): XSS, abuso de
  formularios, acceso a borradores, privacidad y consentimiento.
- Archivos de identidad importados (SVG, PDF, fuentes) como vector de ataque y de derechos desconocidos.
- Fidelidad de exportación: fuentes sin permiso de incrustación; posible necesidad de una dependencia nueva.
- Tamaño de la fase: riesgo de terminar la navegación y aplazar lo difícil; la matriz impide declarar «completa»
  sin el recorrido de lanzamiento.
- Deuda conocida de Fase 3 (filtrado en memoria de señales) puede crecer con resultados importados.

## 9. Resolución de la revisión R01–R10 (2026-10-10)

| Punto | Resolución | Documento / sección | Pruebas futuras (pendientes) |
|---|---|---|---|
| R01 Identidad visual | modelo único de kit con tres entradas, certeza por valor, requisitos por canal, dependencias e impacto sin cambios silenciosos | ADR-0034 (nuevo); ADR-0030 agregados y manifiesto; ADR-0032 tema y fuentes; ADR-0033 aprobación de propuestas; §4.3; non-goals y scope-mvp (adenda) | IDN-001…IDN-008 |
| R02 Invitado, privacidad y varios roles | capacidades separadas; lectura de instantáneas compartidas; Mi aprendizaje privado también frente a ADMIN; contexto de actor por marca | ADR-0033 «Capacidades», «Contexto activo»; ADR-0030 StrategySnapshot | PRT-001…PRT-007 |
| R03 Versiones y plan compartido | punteros borrador/aprobada/publicada; `SUPERSEDED` sólo al aprobar otra; PlanSnapshot y avance aparte | ADR-0030 «Versiones»; ADR-0034 «Versiones»; §5 | VER-001…VER-004, PLN-001…PLN-003 |
| R04 Autorización y recuperación | reserva persistida, concesión, intento `DISPATCHING`, recuperación sin reenvío, conciliación, éxito parcial | ADR-0031 «Ciclo del trabajo externo», «Cola» | EXT-001…EXT-010 |
| R05 Cierre de marca | `BrandClosure` antes de eliminar: bloquear, cancelar, conciliar, pausar o entregar, retirar sitios, retirar vínculos sin revocar credenciales compartidas | ADR-0031 «Cierre de marca»; ADR-0032 «Retirada» | DEL-001…DEL-005 |
| R06 Vista previa | origen propio, canje de código por sesión, autorización por petición incluida cada imagen o archivo | ADR-0032 «Vista previa autenticada» | SITE-001, SITE-007, SITE-008 |
| R07 Medición | MeasurementBinding por destino, proveedor y evento; captación sólo con `VERIFIED`; formulario propio separado | ADR-0032 «Medición»; ADR-0031 cobertura Meta; EXT-REQ-05/13 | MEA-001…MEA-005 |
| R08 Exportaciones | definición de editable, fuentes y alternativas revisadas, criterios de fidelidad; técnica elegida tras comprobar | ADR-0030 «Exportaciones»; bloque 6 | EXP-001…EXP-005 |
| R09 Proveedores | requisitos por operación, permiso mínimo, cuenta, modalidad, evidencia y aceptación; integración ≠ conector del asistente | PHASE4_EXTERNAL_REQUIREMENTS (v2); ADR-0031 contexto y cobertura | aceptación documental por fila |
| R10 Estado y estimación | B2/B3 vigentes frente a texto histórico; procedencia de la evidencia de Fase 3; estimación con unidad definida e identidad | brand-intelligence-engine; §0; §7; SESSION_STATE | — |

### Ajustes del dictamen v2 · C1–C4 (2026-10-10)

Dictamen sobre el ZIP v2 (`86a2b5e5…7ea8c8`): R01–R03, R05 y R08 resueltos; R09 resuelto en estructura; C1–C4
pendientes. Resolución:

| Punto | Resolución | Documento / sección | Pruebas futuras (pendientes) |
|---|---|---|---|
| C1 Envío de operaciones externas | `expiresAt` revalidado antes de cada envío; `RESERVED → EXPIRED`; concesión con número de relevo y `UPDATE` condicionado (un worker sin concesión no envía); unidad de operación = paso remoto con intentos e ids propios; paso incierto nunca se repite por una búsqueda vacía; continuación sólo con autorización vigente («en pausa» no exime) | ADR-0031 «Autorización de operación», «Ciclo del trabajo externo», «Cola y worker», «Cierre» punto 3; §5 | EXT-002, EXT-006, EXT-007, EXT-011…EXT-014 |
| C2 Vista previa | canje ligado a una transacción de navegador (`state` + verificador en cookie de transacción) e identidad; página de confirmación por `SameSite=Strict`; código copiado a otro navegador no crea sesión; miembro sin `Share` frente a invitado con `Share` | ADR-0032 «Vista previa autenticada» | SITE-001, SITE-008, SITE-009, SITE-010 |
| C3 Vigencia de la medición | configuración de medición y consentimiento versionada en la `SiteVersion`; huella de medición; invalidación (`NEEDS_REVERIFICATION`, `NOT_CONNECTED`, `LOST`); destino de datos autorizado; revalidación antes de activar captación; campañas activas como incidencia sin pausa inventada | ADR-0032 «Medición», «Vigencia de la medición»; ADR-0031 punto 3; §5 | MEA-006…MEA-011 |
| C4 Estimación | pendiente 43–63 sesiones (129–252 h); total 45–65 (135–260 h) que ya incluye el bloque 1; propuestas separadas con reutilización frente a trabajo nuevo | §7 | — |
| Fuente Google | guía oficial de developer tokens como fuente primaria (retirada el 2026-09-09 y acceso por proyecto Cloud); el acceso efectivo del proyecto de Brandopolis sigue sin verificar | PHASE4_EXTERNAL_REQUIREMENTS «Google Ads» | aceptación documental |
| Inicio guiado + pregunta de objetivo | documentado como **propuesta pendiente**, con la pregunta «¿Qué quieres lograr?» pedida por el propietario; reutiliza el alta y el contexto declarado existentes | §4.9, §7, matriz ONB | ONB-001…ONB-012 (sólo si se incluye) |

### Precisiones del dictamen v3 (2026-10-10)

Dictamen sobre el ZIP v3 (`2170d436…eed6f8d1`): C2 y C4 resueltos; ADR-0030, 0033 y 0034 con revisión favorable;
tres precisiones. La fila «Inicio guiado + pregunta de objetivo» de la tabla anterior queda corregida por la
tercera.

| Precisión | Resolución | Documento / sección | Pruebas futuras (pendientes) |
|---|---|---|---|
| §3.1 C1 · suspensión después de `DISPATCHING` | `DISPATCHING` confirmado = inicio lógico del intento; límite exacto de la concesión (no inicia otro intento; no impide por sí sola un envío tardío); `dispatchBy` y ventana de cierre con riesgo residual declarado; vencer la concesión no libera el paso; repetición humana sólo con ventana cerrada, evidencia remota del proveedor y autorización vigente («no lo veo» no basta); resultados tardíos añadidos sin sobrescribir; incidencia «posible duplicado»; estados de paso `REJECTED`/`NOT_CREATED` alineados con los intentos nuevos | ADR-0031 v4 «Ciclo del trabajo externo» puntos 3–5, «Recuperación», «Intento iniciado y envío tardío», «Repetición humana», «Cola y worker»; §5 | EXT-015…EXT-019 |
| §3.2 C3 · publicación compatible | registro append-only `MeasurementCompatibility` que enlaza la publicación nueva con la evidencia original sin reescribirla; activación con la publicación viva y la cadena de compatibilidad; cambios relevantes exigen nueva verificación | ADR-0032 v4 «Vigencia de la medición» puntos 3–4; §5 | MEA-012, MEA-013 |
| §3.3 Requisito inicial confirmado | pregunta «¿Qué te gustaría trabajar primero con tu marca?», prioridad guardada en `BrandWorkPriority`, adaptación y cambio sin pérdida como **alcance base** con el formulario actual; estrategia completa distinta de punto concreto; plan anual con 90 días; captación ≠ tráfico; inicio guiado completo sigue propuesto; esfuerzo asignado al bloque 3 sin cifra nueva ni doble cómputo | §1, §4.9, §4.10, §5, §7; ADR-0030 v3 (dependencia `BrandWorkPriority`); matriz INT/ONB | INT-001…INT-008 |

## 10. Decisiones de producto (estado tras la aprobación del 2026-10-10)

Texto anterior conservado en el historial (v4). Estado vigente:

| Decisión | Estado |
|---|---|
| ADR-0030…ADR-0034 | **Aceptados**; ADR-0031 con el ajuste C1 obligatorio |
| Inicio guiado completo | **Incluido** (§4.10; ONB-005…012 obligatorios) |
| Dominio propio del cliente | **Incluido** (ADR-0032; DOM-001…) |
| Invitaciones | **Aprobado:** email como vía principal y enlace de un solo uso como alternativa, misma comprobación de destinatario; proveedor de email pendiente en su bloque |
| Consentimiento | **Controles aprobados:** etiquetas opcionales desactivadas hasta aceptar, aceptar/rechazar claramente, cambiar la elección; texto final y configuración por mercado pendientes antes de medición real |
| Dominio de sitios publicados | Separado del de la app; nombre, contratación y DNS pendientes antes del despliegue público (no bloquean trabajo local) |
| Clientes y Resultados ampliados (issue #10, 2026-10-11) | **Aprobado:** área Clientes, captura manual/web persistente como prioridad de la iteración, Resultados con marketing, operación comercial y ventas, aislamiento por espacio/marca y reparto F4/F5/F6 (§12) |
| Ocho áreas compactas, Clientes nativo + Chatwoot desacoplado, cuenta Chatwoot por marca, componentes de Atomic, vista conversacional nativa, permiso propio para compartir con clientes | **Recomendaciones por validar** (§12.9); ninguna dependencia queda adoptada |

## 11. Aprobación del propietario · 2026-10-10 14:49 (America/Mexico_City)

Paquete BP-P4-V4-APROBADA-20261010 (sobre el candidato v4 `c211b914…d8f9e124`): «Estado vigente: alcance aprobado
y desarrollo autorizado fuera de producción». Autoriza implementación, pruebas, DEMO y migraciones aditivas sólo en
bases aisladas de desarrollo o ensayo, siguiendo los bloques de §7 sin pedir aceptación general por bloque. No
autoriza producción, publicación pública, campañas reales, gasto, compras ni DNS; commit, push y merge siguen las
reglas del repositorio. Referencia de planificación con ambas ampliaciones: **50–74 sesiones pendientes** (150–296 h
equivalentes) y **52–76 totales**; se recalibra con el trabajo real. La prueba del contrato C1 (EXT-015…021) es
condición para habilitar reintentos y operaciones reales.

## 12. Clientes y Resultados ampliados · issue #10 (2026-10-11)

Fuentes: [issue #10](https://github.com/Vik-Avila/brandopolis/issues/10) (actualizado 2026-10-11T17:16:28Z, sin
comentarios) y el plan «Brandopolis · Clientes y Resultados comerciales», **versión 5** (525 líneas; §§11–13:
flujo comercial inteligente, trazabilidad campaña–venta, asesores, metas, históricos y forecast), recibidos en el
paquete de reconciliación revisión 3 (`INVENTORY.json`: `package_revision` 3, `source_plan_version` 5; el plan
tiene SHA-256 `3bfd61c1…593216ce`). La copia del issue del paquete coincide con el issue publicado salvo líneas en
blanco. Esta sección fusiona la adenda de especificación y su ampliación v5; los criterios están en la matriz
(I10-…) y los requisitos externos en [PHASE4_EXTERNAL_REQUIREMENTS](PHASE4_EXTERNAL_REQUIREMENTS.md) (I10-EXT-…).
Arquitectura de la captura: [ADR-0035](../14-decisions/ADR-0035.md) (propuesto).

Cuatro estados distintos para cada requisito: **documentado**, **implementado**, **validado en DEMO** y
**validado con proveedor o identidad real** (más «desplegado», que exige su autorización propia).

### 12.1 Objetivo y encaje

Brandopolis conserva las oportunidades que llegan a cada marca y permite atenderlas. El adelanto se añade a la Fase
4 sin cancelar identidad, colaboración, exportaciones, sitios, dominios, consentimiento, Canva ni Ads. No convierte
la Fase 4 en un CRM. El recorrido objetivo aprobado (Fases 4–6) es: canal habilitado → contacto/prospecto →
oportunidad → seguimiento y negociación → cierre humano ganado o perdido → Resultados → propuesta de aprendizaje →
revisión humana en Validación. WhatsApp es un ejemplo del flujo multicanal, no la única fuente.

### 12.2 Captura inicial · alcance de Fase 4 (prioridad de la iteración)

1. Clientes se abre dentro de una marca autorizada y conserva el selector de marca y la navegación.
2. Registro manual de una oportunidad: nombre o referencia, necesidad breve y un medio de contacto cuando se
   conoce. No se exige ficha comercial completa.
3. Se guardan origen y fecha de recepción; empieza como **Nueva**; se asigna a una persona autorizada o queda
   explícitamente **Por asignar**.
4. Siguiente seguimiento (acción y fecha). Si falta: **Sin seguimiento**, pendiente accionable. Si su fecha pasó:
   **Seguimiento vencido**.
5. Persistencia tras recargar o con una sesión nueva; filtros de pendientes que abren el expediente correcto (sin
   Kanban completo).
6. Un formulario web habilitado en desarrollo crea el mismo registro; reintentar el mismo envío devuelve la
   referencia original.
7. Clientes no se muestra activo con datos de ejemplo ni «Próximamente». La DEMO se identifica como tal; una prueba
   de formulario en entorno aislado no acredita un sitio público conectado ni un proveedor real.

**Datos mínimos y procedencia** (contrato en ADR-0035):

| Dato | Regla |
|---|---|
| Espacio y marca | Obligatorios; resueltos y autorizados en servidor (nunca desde el navegador) |
| Identificador y revisión | Persistentes; una revisión antigua se rechaza con 409 sin perder el cambio vigente |
| Persona y contacto | Referencia mínima; correo/teléfono opcionales en registro manual; el formulario exige al menos uno |
| Necesidad | Texto declarado, con límites |
| Origen | Manual o formulario (con el formulario concreto); fecha de recepción del servidor y, aparte, fecha declarada del evento externo si existe |
| Estado | Nueva / En seguimiento; no implica venta, conversión de un proveedor ni aprobación estratégica |
| Responsable | Miembro activo con acceso a esa marca, o cola «Por asignar» |
| Segmento conocido | Opcional; identificador estable de un segmento **de esa marca**, con procedencia; nunca inventado |
| Evidencia de adquisición | Por interacción: canal de atención, plataforma/cuenta declarada o capturada, UTM (fuente, medio, campaña, id, contenido, término), identificadores de clic, página de entrada y dominio de referencia depurados, identificador del envío y fechas. Estado de campaña **Campaña no identificada** (con causa) o **Capturada sin verificar**; «verificada» sólo existirá con un conector o catálogo de la cuenta (Fase 5) |
| Origen declarado | Lo que dice la persona se guarda como declarado, separado de la evidencia técnica |
| Oferta relacionada | Opcional; sólo ofertas de esa marca. Público y campaña estructurados quedan para cuando existan sus entidades (no se usa texto libre como identificador de confianza) |
| Consentimiento del formulario | Finalidad del contacto aceptada y versión del aviso; publicidad o etiquetas de seguimiento **opcionales y separadas**, desactivadas por defecto |
| Evidencia de captura | Identificador del envío/evento, huella del contenido y procedencia para reintentar y conciliar |

No son obligatorios en el adelanto: empresas, etapas configurables, probabilidad, importes, metas, cotizaciones,
facturas, cobros, Kanban, mensajería ni automatizaciones.

**Persistencia, reintentos y fallos.** Confirmar la recepción sólo después de que el registro y su deduplicación
estén guardados en la misma transacción. La clave de reintento queda ligada a espacio, marca, origen (persona o
formulario) y envío; reutilizarla con contenido distinto es un conflicto, nunca una actualización silenciosa. Dos
consultas con distinto envío y el mismo correo/teléfono se conservan; no se fusionan identidades. Una caída antes
del commit o después del commit pero antes de responder deja exactamente un registro por envío al reintentar. Si la
base falla, se dice que no se pudo confirmar y se permite reintentar con la misma referencia; un correo o registro
temporal no sustituye el expediente. La ruta manual/web no depende de Chatwoot, de la IA ni de cuentas
publicitarias. Reasignar exige pertenencia vigente; los cambios simultáneos no pisan un seguimiento. Borrado y
cierre de marca alcanzan estos datos.

**Formulario web.** El servidor resuelve la marca a partir del identificador público del formulario, nunca de un
dato del navegador. Sólo los campos necesarios, con límites de tamaño, límite de solicitudes y validación; sin
adjuntos en este mínimo. Crear o desactivar un formulario (abrir una entrada pública) exige la capacidad
`PUBLISH_SITE` de la marca. La entrega inicial se verifica en una página de formulario de desarrollo servida por
Brandopolis; la publicación en un sitio real depende del bloque de sitios, dominio y consentimiento. El contenido
del formulario no va a telemetría ni a logs y no es una instrucción para Brando.

### 12.3 Navegación y lenguaje

Clientes es destino propio; dentro de Clientes sólo se muestran funciones disponibles (conversaciones, empresas o
Kanban no añaden entradas al lateral). Colaboración sigue siendo compartir y aprobar con clientes invitados; un
invitado no se convierte en vendedor. Conservar selector de marca, navegación contextual, Brando visible y lenguaje
cotidiano. Validar el lateral sin desplazamiento en 1366×768, 1280×800 y 1440×900; con zoom o poca altura todo
sigue accesible; cambiar de área cierra el menú móvil. Las capturas canónicas sólo cambian con la autorización
específica del propietario.

### 12.4 Resultados ampliados

| Dimensión | Lectura | Momento y límites |
|---|---|---|
| Marketing | Lo que llega desde sitio, campañas y otros canales; gasto y conversiones cuando estén conectados y comprobados | En F4: solicitudes del formulario propio y cobertura de campaña (capturada / no identificada) con datos reales; sitio, campañas y gasto «Sin conectar» |
| Operación comercial | Nuevas, por asignar, sin seguimiento, seguimientos vencidos | F4 con los datos nativos; primera respuesta, carga por responsable y tiempo entre etapas cuando existan sus eventos (F5) |
| Ventas | Ganadas/perdidas, importe, ciclo, motivos, metas, forecast | Contrato F5; en F4 «Sin datos» con explicación, nunca un embudo inventado |

**Indicadores implementados en Fase 4** (ADR-0035; `readResults`). Tipo de fuente: **registro interno** (lo que
el equipo o el formulario guardan en Brandopolis), **presupuesto planificado** (Plan de Marketing; nunca gasto) o
**dato de proveedor** (Google, Meta, analítica del sitio; hoy ninguno conectado). Zona horaria `America/Mexico_City`
hasta que las marcas tengan la suya.

| Indicador | Tipo | Definición | Fuente | Periodo | Limitaciones |
|---|---|---|---|---|---|
| Solicitudes del formulario web | registro interno | Oportunidades recibidas por un formulario web de la marca | Clientes | Últimos 30 días | Son solicitudes, no conversiones de proveedores; hoy sólo la página de desarrollo. «Sin conectar» si la marca no tiene formulario |
| Con referencia de campaña (sin verificar) | registro interno | Oportunidades cuyo primer origen trae UTM o identificador de clic | Clientes (interacciones) | Últimos 30 días | La referencia no se ha comprobado contra la cuenta; no es atribución ni causalidad |
| Campaña no identificada | registro interno | Oportunidades sin referencia de campaña | Clientes (interacciones) | Últimos 30 días | Incluye registros manuales; el origen declarado no se convierte en campaña |
| Presupuesto planificado (por moneda) | presupuesto | Suma de presupuestos de acciones no canceladas del Plan del año | Plan de Marketing | Año del plan | No es gasto real ni inversión ejecutada; monedas separadas sin conversión; «Sin datos» si no hay presupuestos |
| Gasto real en anuncios | proveedor | Gasto informado por las cuentas publicitarias | Google Ads / Meta Ads | — | **Sin conectar**; el presupuesto no lo sustituye |
| Visitas al sitio y resultados de campañas | proveedor | Medición del sitio y de las campañas | Analítica / cuentas | — | **Sin conectar** |
| Oportunidades nuevas | registro interno | Oportunidades registradas en el periodo | Clientes | Últimos 30 días | Cuenta registros, no personas |
| Por asignar · Sin seguimiento · Seguimiento vencido | registro interno | Oportunidades sin responsable, sin fecha de seguimiento o con fecha anterior a hoy | Clientes | Estado actual | Foto del momento; sin cortes históricos hasta F5 |
| Primera respuesta y carga por responsable | registro interno | — | — | — | **Sin datos** hasta conversaciones y tareas (F5) |
| Ganadas, perdidas e importes · Metas y forecast | registro interno | — | — | — | **Sin datos** hasta el núcleo comercial (F5); nada previsto se muestra como venta |

Cada cifra declara definición, fuente, ámbito, periodo, zona horaria y actualización (moneda cuando haya importes).
Cero = medición disponible sin eventos; «Sin datos» o «Sin conectar» = falta la fuente o la capacidad. No se suman
conversiones de proveedores como personas o ventas; una conversación resuelta no cierra una oportunidad; ganada no
prueba facturación ni cobro; una previsión es estimación. Los agregados se calculan en servidor con el ámbito del
usuario (nunca se filtra un total global en el navegador).

### 12.5 Permisos y autoridad

Capturar, leer y dar seguimiento en Clientes: el equipo de la marca según la regla vigente de membresía y
asignación (ADMIN del espacio o MEMBER asignado). El invitado de marketing (ADR-0033) no accede a Clientes ni a sus
endpoints, tampoco por ser invitado en otra marca. Responsable: sólo miembros activos con acceso a la marca; una
baja o revocación se comprueba en la siguiente operación. Abrir un formulario público: capacidad `PUBLISH_SITE`.
Los roles comerciales finos (asesor, líder de equipo, capacidades de metas, crédito y ajustes históricos) son
contrato de Fase 5 (§12.7); el adelanto no crea capacidades nuevas ni amplía las existentes. Notas internas
internas; Mi aprendizaje privado. Brando no lee datos de Clientes en Fase 4 y no cambia estrategia, identidad,
plan, oportunidades, permisos ni acciones externas por inferencia.

Pendiente de resolver por el propietario (sin atribuirle una política): la **capacidad propia para compartir con
cliente** (hoy comparte cualquier miembro con acceso a la marca; invitar exige `MANAGE_GUESTS`) y la revisión de
qué recursos aprueba un invitado: la implementación vigente sólo admite aprobar materiales y versiones del kit;
estrategia y plan compartidos se leen y comentan.

**Decisión del propietario (2026-10-11): opción A adoptada** — compartir y dejar de compartir exigen `MANAGE_GUESTS` en
esa marca (comprobado en servidor, también al repetir con la misma clave); lo que aprueba el invitado se mantiene. Tabla
de la propuesta, conservada como registro:

| Tema | Hoy (implementado) | Contraste con ADR aceptados | Propuesta |
|---|---|---|---|
| Quién comparte con el cliente | Cualquier miembro con acceso a la marca; invitar y retirar exige `MANAGE_GUESTS` | ADR-0033 no define capacidad para compartir; separa leer, editar, comentar, aprobar, publicar y gastar | **Opción A (recomendada):** compartir y dejar de compartir exigen `MANAGE_GUESTS`, la misma capacidad que decide quién es el cliente; sin migración (la capacidad existe), un ADMIN la tiene siempre. **Opción B:** capacidad nueva `SHARE_WITH_CLIENT` separada de invitar (requiere ampliar el contrato de capacidades y una migración aditiva). **Opción C:** mantener lo actual |
| Qué aprueba el invitado | Versiones exactas de entregables y del kit (propuestas de identidad); estrategia y plan compartidos sólo lectura y comentarios | Coincide con la tabla de capacidades de ADR-0033 («entregables y propuestas de identidad compartidas») | **Mantener** lo actual. Aprobar sigue sin conceder publicar ni gastar (ADR-0030/0031); aprobar la estrategia o el plan seguiría siendo decisión del equipo (autoridad humana del dueño de la marca) |
| Clientes y Resultados | El invitado no accede (404) | ADR-0035 (propuesto) y nota v4 de ADR-0033 | **Mantener**: un invitado de marketing no es vendedor |

Implementado tras la decisión: `shareToPortal` y `withdrawShare` exigen la capacidad; la vista de Colaboración no ofrece compartir ni dejar de compartir sin ella.

### 12.6 Flujo comercial y Brando (plan v5 §11)

Contacto, conversación, interacción y oportunidad son entidades separadas: una consulta de soporte no crea una
oportunidad por defecto, un contacto puede tener varias oportunidades y conversaciones, no se crea un contacto por
mensaje ni se fusionan identidades no verificadas, y el silencio no confirma una pérdida. Ganada exige importe,
moneda, fecha y actor; perdida conserva motivo declarado o desconocido (una sugerencia de Brando no es un motivo
confirmado).

| Modo de Brando | Fase | Autoridad |
|---|---|---|
| Asistente interno del vendedor (calificación propuesta, resúmenes, borradores de respuesta, preguntas, tareas, ayuda al cierre) | F5 | El vendedor revisa y actúa; contexto autorizado de su rol y marca; un borrador no se envía al generarlo |
| Agente externo de atención (preguntas permitidas, recopilación comercial) | F6 | Política explícita por marca/canal, contexto publicable, límites, traspaso humano; nunca habilitado globalmente por esta aprobación |
| Análisis y aprendizaje (patrones de ganadas/perdidas, objeciones) | F5 (ampliación F6) | Evidencia y cobertura visibles; revisión humana en Validación; no reescribe estrategia |

Mismo gateway de modelos; ni Captain AI ni otro proveedor por inferencia. La toma humana suspende respuestas
automáticas y descarta envíos no iniciados; volver al bot exige una transición auditada; la autoridad se comprueba
justo antes de enviar y un envío ya iniciado se concilia sin repetición ciega (regla de ADR-0031). Se evitan bucles
por mensajes salientes del bot, reintentos o sincronización. Si canal o IA fallan, el expediente se conserva y la
atención humana queda visible. Consumo y límites por marca.

### 12.7 Atribución, ROAS, asesores, metas, históricos y forecast (plan v5 §§12–13)

- **Evidencia de origen desde F4** (§12.2): plataforma/cuenta separada del canal de atención («WhatsApp» no
  identifica campaña); UTM e identificadores depurados con lista de campos permitidos; un id de campaña del
  navegador es dato capturado, no verificado; sin evidencia, «Campaña no identificada» con causa; Brando no
  inventa atribución.
- **Historia y atribución (F5):** primer origen conservado e interacciones posteriores añadidas; atribución por
  oportunidad/venta además del contacto; modelo, versión y ventana declarados; una venta no se imputa íntegra a
  varias campañas en una vista aditiva; cobertura atribuida/declarada/sin atribución.
- **ROAS (F5):** ingreso elegible atribuido / gasto publicitario real de la misma marca, cuenta, moneda y periodo.
  MXN 5,000 / MXN 1,000 = 5x. Sin gasto: no calculable; gasto cero: no aplicable; presupuesto u oportunidades
  abiertas no sustituyen datos reales; importación y sincronización superpuestas no duplican costes; base de
  ingreso explícita (confirmado, facturado o cobrado).
- **Asesores, equipos, segmentos y partidas (contrato F4; F5):** responsable principal, colaboradores y cambios
  con actor y fecha; crédito explícito que suma 100 % (MXN 100,000 al 60/40 → 60,000 y 40,000 por asesor, 100,000
  global); responsable actual distinto del crédito histórico al cierre; segmento principal con id estable y
  etiquetas como filtros; partidas de productos y servicios desde el catálogo de ofertas (MXN 60,000 + 40,000 =
  100,000); renombrar o desactivar no reescribe históricos; liderar un equipo no da acceso a todas las marcas.
- **Metas (F5):** global, segmento, producto, servicio, asesor y equipo; mensual, trimestral y anual; calendario
  natural por defecto y calendario comercial por marca; versión, autor, base y moneda; meta, real, cumplimiento y
  brecha (80,000 / 100,000 → 80 %, brecha 20,000); dimensiones de las mismas ventas no se suman entre sí; Brando
  propone, la persona decide. Este calendario no sustituye el del Plan de Marketing.
- **Históricos (F5):** cortes y versiones conservados; mes, trimestre, año, mismo periodo del año anterior y
  acumulado; periodos parciales al mismo avance; base anterior cero → porcentaje no aplicable; ausencia de datos
  ≠ cero; catálogos y asesores inactivos consultables.
- **Forecast de ganados (F5):** sólo negocios ganados; programación comercial, facturación prevista y cobros
  previstos separados de lo realizado (ganado 100,000, cobrado 20,000, previstos 40,000 + 40,000 → 80,000 por
  cobrar); sin calendario → «Pendiente de programación»; abiertos fuera; anticipos, parciales, etapas y
  recurrencias con compromiso explícito; cortes conservados.

Preparar estos contratos en F4 no obliga a crear sus tablas ni habilita funciones sin construir, y no permite
diferir metas, históricos, forecast básico ni el asistente interno a la Fase 6. El modelo de captura de F4 ya separa
oportunidad, interacción (evidencia por interacción) y eventos auditados, y referencia segmentos y ofertas por id
estable, para que F5 añada contactos, conversaciones, partidas, crédito y cortes con migraciones aditivas.

### 12.8 Reparto obligatorio

| Fase | Incorporación |
|---|---|
| 4 · este bloque | Documentación y contratos; captura manual/web persistente con origen/UTM/evidencia o estado desconocido, responsable/cola, segmento conocido y seguimiento; resúmenes operativos reales en Resultados; navegación de Clientes; prueba acotada Chatwoot/Brando independiente |
| 5 · Measurement & Intelligence | Núcleo comercial y Kanban, mensajería inicial con el canal real que se habilite, Brando asistente interno, cierre humano, atribución y gasto verificable, asesores/partidas, metas, históricos, forecast de ganados y aprendizaje revisado en Validación |
| 6 · Agentic Scale | Ampliación de canales y conciliación, agente externo de Brando por marca/canal, seguimiento automatizado autorizado, traspaso, observabilidad y límites de consumo |

Se conserva el resto del alcance original de cada macrofase; no hay séptima fase.

### 12.9 Atomic, Chatwoot y prueba acotada

Dirección recomendada por validar: Clientes nativo + Chatwoot desacoplado para conversaciones (Application APIs,
eventos firmados, toma humana; Agent Bots como ruta para Brando con su gateway) + patrones o código seleccionado de
Atomic (también evaluable como núcleo adaptado mediante ADR). **Nada queda adoptado.** La prueba acotada (mensaje
web → contacto → oportunidad/seguimiento persistentes, deduplicación, dos marcas y dos espacios, roles, toma
humana, firma de webhooks, fallo y recuperación, costes) se hace en un entorno aislado apropiado, nunca instalando
la pila completa de Chatwoot junto a las E2E en el equipo de 8 GB; un simulador no acredita la integración.
Licencias (Community MIT frente a Enterprise), costes totales, aislamiento por cuenta/marca y canales:
PHASE4_EXTERNAL_REQUIREMENTS «Clientes, conversaciones y canales».

### 12.10 Orden de trabajo y estimación

1. Reconciliación documental (este cambio). 2. Modelo mínimo, permisos, reintentos y registro manual. 3. Formulario
web de desarrollo, asignación/seguimiento, segmento conocido, evidencia de origen, fallos y aislamiento. 4.
Navegación de Clientes y Resultados con resúmenes reales; diferencias visuales registradas sin autoaprobarlas. 5.
Prueba acotada de Chatwoot cuando haya entorno y accesos. 6. Exportaciones (primero el generador PDF propio y
`jszip`) y el resto de bloques. Las estimaciones históricas (45–65 / 52–76 sesiones) describían otro alcance y no
se reutilizan como plazo: el bloque Clientes se estima por tareas (captura y resúmenes F4: 2–3 sesiones de 3–4 h,
supuesto a recalibrar con el tiempo real informado en SESSION_STATE).

## Historial de revisiones

| Versión | Fecha | Cambio |
|---|---|---|
| v1 | 2026-10-10 | Candidato del ZIP de revisión de las 12:42 (SHA-256 `4de4fecb…ffe14`) |
| v2 | 2026-10-10 | Identidad visual, correcciones R01–R10, nueva estimación con unidad definida, tabla de resolución y decisiones abiertas |
| v3 | 2026-10-10 | Dictamen v2: C1–C4 resueltos (tabla en §9), estados de paso remoto y de medición, suma de sesiones corregida, inicio guiado con la pregunta «¿Qué quieres lograr?» como propuesta pendiente (§4.9) y su estimación separada |
| v4 | 2026-10-10 | Dictamen v3: precisiones C1 (envío tardío tras `DISPATCHING`) y C3 (compatibilidad de publicación); la pregunta de prioridad pasa a requisito confirmado de alcance base (§4.9) separada del inicio guiado completo propuesto (§4.10); escenarios de estimación y asignación al bloque 3 sin doble cómputo |
| v5 · aprobada | 2026-10-10 | Aprobación del propietario (14:49): ADR aceptados con C1; inicio guiado completo, dominio propio, invitaciones y controles de consentimiento incluidos; §10 actualizado y §11 nuevo; desarrollo autorizado fuera de producción |
| v6 | 2026-10-11 | Issue #10 y plan de Clientes/Resultados v5 (paquete de reconciliación revisión 3): resolución en §1, ocho áreas propuestas en §3, filas nuevas en §10 y §12 nuevo (captura F4, Resultados ampliados, permisos, flujo y Brando, atribución/ROAS/asesores/metas/históricos/forecast, reparto F4/F5/F6, Atomic/Chatwoot, orden de trabajo). El resto de la especificación no cambia |
| v7 | 2026-10-11 | §4.5: estado de implementación de sitios (bloque 7); sin cambio de alcance |
| v8 | 2026-10-11 | §4.5: sitios en DEMO completos en su alcance local (DOM-004, SITE-004, ZIP, vista por tamaño); sin cambio de alcance |
