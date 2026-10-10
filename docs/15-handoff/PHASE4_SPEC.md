Status: accepted
Owner: Product / Engineering
Canonical: no
Last reviewed: 2026-10-10
Related: docs/14-decisions/ADR-0030.md, docs/14-decisions/ADR-0031.md, docs/14-decisions/ADR-0032.md, docs/14-decisions/ADR-0033.md, docs/14-decisions/ADR-0034.md, docs/15-handoff/PHASE4_ACCEPTANCE_MATRIX.md, docs/15-handoff/PHASE4_EXTERNAL_REQUIREMENTS.md, docs/15-handoff/PHASE4_HANDOFF.md
Depends on: owner brief 2026-10-10 (decisiones 1A, 2C, 3C) y su actualización del mismo día (identidad visual, revisión R01–R10); Fases 1–3 integradas en `main`

# Fase 4 · Marketing, sitios web y colaboración · especificación (v5 · aprobada)

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

## 11. Aprobación del propietario · 2026-10-10 14:49 (America/Mexico_City)

Paquete BP-P4-V4-APROBADA-20261010 (sobre el candidato v4 `c211b914…d8f9e124`): «Estado vigente: alcance aprobado
y desarrollo autorizado fuera de producción». Autoriza implementación, pruebas, DEMO y migraciones aditivas sólo en
bases aisladas de desarrollo o ensayo, siguiendo los bloques de §7 sin pedir aceptación general por bloque. No
autoriza producción, publicación pública, campañas reales, gasto, compras ni DNS; commit, push y merge siguen las
reglas del repositorio. Referencia de planificación con ambas ampliaciones: **50–74 sesiones pendientes** (150–296 h
equivalentes) y **52–76 totales**; se recalibra con el trabajo real. La prueba del contrato C1 (EXT-015…021) es
condición para habilitar reintentos y operaciones reales.

## Historial de revisiones

| Versión | Fecha | Cambio |
|---|---|---|
| v1 | 2026-10-10 | Candidato del ZIP de revisión de las 12:42 (SHA-256 `4de4fecb…ffe14`) |
| v2 | 2026-10-10 | Identidad visual, correcciones R01–R10, nueva estimación con unidad definida, tabla de resolución y decisiones abiertas |
| v3 | 2026-10-10 | Dictamen v2: C1–C4 resueltos (tabla en §9), estados de paso remoto y de medición, suma de sesiones corregida, inicio guiado con la pregunta «¿Qué quieres lograr?» como propuesta pendiente (§4.9) y su estimación separada |
| v4 | 2026-10-10 | Dictamen v3: precisiones C1 (envío tardío tras `DISPATCHING`) y C3 (compatibilidad de publicación); la pregunta de prioridad pasa a requisito confirmado de alcance base (§4.9) separada del inicio guiado completo propuesto (§4.10); escenarios de estimación y asignación al bloque 3 sin doble cómputo |
| v5 · aprobada | 2026-10-10 | Aprobación del propietario (14:49): ADR aceptados con C1; inicio guiado completo, dominio propio, invitaciones y controles de consentimiento incluidos; §10 actualizado y §11 nuevo; desarrollo autorizado fuera de producción |
