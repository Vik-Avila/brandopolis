Status: derived

Owner: Product / Engineering

Canonical: no

Last reviewed: 2026-09-23

Related: —

Depends on: —



# Registro

## Congelación de producción por evaluación de jurado · 2026-10-04

Decisión humana de operación temporal. **Sólo documentación/gobierno; no cambia runtime ni producción.**

- Durante la ventana de revisión del jurado (aprox. 15 días), producción se considera **jury-critical**
  y permanece estable hasta que una decisión humana explícita levante la congelación; no vence
  automáticamente por fecha.
- La siguiente fase puede desarrollarse en ramas y entornos no productivos. Su resultado por defecto es
  un candidato **release-ready fuera de producción**.
- Commit, push, PR, merge o actualización de `main` no autorizan deploy.
- Cualquier excepción de producción requiere autorización humana separada y queda limitada a un defecto
  reproducible de acceso/disponibilidad o a seguridad/auth/authz/aislamiento/exposición de datos, con
  SHA fijado, checks aplicables, revisión del diff, rollback/backup cuando corresponda, smoke plan y
  verificación post-deploy.
- La regla canónica vive en [CLAUDE.md § Jury production freeze](CLAUDE.md#jury-production-freeze--2026-10-04);
  [SESSION_STATE](SESSION_STATE.md) registra el estado operativo.

## Endurecimiento del Skill Pack tras la revisión · 2026-10-04

Correcciones de la revisión local de `main...HEAD`. **Sin cambios de runtime, schema, migraciones ni
despliegue.**

- Matriz de checks sin rutas de comportamiento que pasen sólo con Foundation; suites de navegador
  ligadas a sus specs, configs y superficies servidas.
- `skills:check` no destructivo y primero; `skills:sync` rechaza argumentos desconocidos y raíces
  enlazadas o solapadas, y sustituye la copia con staging verificado y restauración.
- Una sola definición de la congelación en `CLAUDE.md`, con la regla de defectos de seguridad del
  2026-10-04; `AGENTS.md` sólo enlaza. Comandos de revisión neutrales entre agentes.
- [ADR-0016](docs/14-decisions/ADR-0016.md): autoaprovisionamiento PILOT y acceso de operador
  (supersede sólo el aprovisionamiento de ADR-0013). Estado de producción reconciliado con evidencia;
  riesgo de descompresión de documentos registrado como deuda técnica.
- Pasada final: baseline typecheck/lint/test para todo cambio salvo registros históricos; sync que se
  niega ante archivos que sólo existen en la copia y no confunde alias por encima del repo con enlaces;
  rollback y backup probados con fallos inyectados; los skills sólo enlazan la congelación; refrescar
  hashes de marca exige decisión humana. Deuda registrada en `known-risks.md`. Resultados reales en
  [SESSION_STATE](SESSION_STATE.md).

## Engineering Skill Pack · 2026-10-04

Tooling de ingeniería autorizado por la excepción de hardening del 2026-10-04. **Sin cambios en
`src/`, `schemas/`, `drizzle/`, assets de runtime, comportamiento del PILOT ni despliegue.**

- Cinco skills en `.agents/skills/` (fuente canónica): `brandopolis-feature` (punto de entrada, con
  el gate de base de datos), `brandopolis-ui`, `brandopolis-brando`, `brandopolis-security` y
  `brandopolis-review` (matriz única de checks y gate de cierre). Procedimientos que remiten a las
  fuentes canónicas por enlace e ID; no copian contratos.
- `.claude/skills/` es una copia generada byte a byte: `pnpm skills:sync` / `pnpm skills:check`
  (`scripts/skill-pack.ts`, `scripts/sync-skills.ts`). Sin symlinks; LF fijado en `.gitattributes`.
- `tests/skill-pack.test.ts` y un check de sólo lectura en Foundation protegen la copia, el frontmatter,
  las referencias y el vocabulario de estados. `AGENTS.md` incluye la tabla de enrutado.

Verificación: ver la entrada del 2026-10-04 (Engineering Skill Pack) en [SESSION_STATE](SESSION_STATE.md).

## Reconciliación documental canónica · 2026-10-04

Decisiones humanas del 2026-10-04 aplicadas a la documentación canónica antes de crear skills de
agente. **Sólo documentación: sin `src/`, `schemas/`, `drizzle/`, assets, despliegue ni cambios en el
PILOT.**

- **Congelación del PILOT con una sola definición** en [CLAUDE.md § Pilot freeze](CLAUDE.md#pilot-freeze):
  se mantiene el criterio del 2026-09-29, queda sustituida la lista de categorías del 2026-09-28 y se
  añade la excepción de hardening (documentación, tooling, skills y validadores sin efecto en runtime).
  `AGENTS.md` y `CURRENT_IMPLEMENTATION_STATE` §7 enlazan en lugar de repetirla.
- **`CURRENT_IMPLEMENTATION_STATE` contrastado con el código y los tests de `main`** (4329292): auth y
  admin ya están en `main`; lista `unavailable` actual; `account_created` y `session_started`
  instrumentados en `pilot_events`; D7/D14/D30 derivadas; geografía capturada en nueva marca, con la
  propagación sin verificar; contraseña, recuperación, SMTP y estados de comentarios siguen sin implementar.
- **Product Bible**: eliminado el duplicado byte a byte de «Correcciones finales de contrato».
- **Brandopolis Intelligence / Brando**: hogar canónico en
  [brand-intelligence-engine](docs/05-ai/brand-intelligence-engine.md) (se conserva la arquitectura y
  se amplía con Brando, límites de autoridad y B1–B5), decisión en
  [ADR-0015](docs/14-decisions/ADR-0015.md), índice de ADR con ADR-0012 (antes omitido) y ADR-0015, y
  resolución fechada en [scope-mvp](docs/01-product/scope-mvp.md) que mantiene Ask Brandopolis en P1.

Verificación: ver la entrada del 2026-10-04 en [SESSION_STATE](SESSION_STATE.md).

## Analítica de producto del Founding Pilot · 2026-09-29

Reconciliación y capa mínima fiable para operar los primeros 12–20 Estrategas de Marca. **Sin dashboard
nuevo, sin proveedores, sin migración, sin dependencias.** Ver
[FOUNDING_PILOT_ANALYTICS_READINESS](docs/09-validation/FOUNDING_PILOT_ANALYTICS_READINESS.md).

- **Dos señales duraderas nuevas**, como nombres dentro del sobre existente `pilot_events`/`telemetry`:
  `blueprint_pdf_exported` (la exportación reutilizaba `engine.blueprint()`, así que una descarga era
  indistinguible de una vista; se registra tras construir el documento, así que un fallo no cuenta) y
  `evidence_panel_opened` (Evidence Engagement canónico es «expuestos que **abren** Evidence», y abrir
  no tenía señal alguna). Una vez por marca y carga de página: la métrica cuenta personas, no miradas.
- **Cerradas las tres lagunas** que el propio Admin declaraba no derivables: `phaseCompletionCounts`
  (versión activa por módulo), `optionActionCounts` (procedencia auditada de la propuesta) y
  `documentEngagement` (ahora Evidence Engagement canónico más los actos más fuertes de aportar y curar
  evidencia, reportados aparte y nunca mezclados con la tasa).
- **Strategy Ready y Human Override derivados de estado durable**, no de clics: preguntas decididas sin
  revisión HARD abierta, y auditoría estratégica × propuesta × versión comprometida para distinguir una
  propuesta aceptada tal cual de una reescrita por la persona.
- **D7/D14/D30 derivadas de marcas de tiempo**, con la ventana día ±1 canónica. Devuelven `null`
  mientras la ventana no cierra, así que la falta de tiempo transcurrido **nunca se lee como abandono**.
- **Corregido el anclaje de TTFI y TTFD.** `metrics.md` los define desde la marca; se medían desde
  `session_started`, lo que arranca el reloj antes de que exista una marca e infla ambas cifras. No es
  una redefinición: es alinearse con la definición canónica, y se hace ahora porque aún no hay testers
  reales y no se pierde comparabilidad.
- **`/admin/` no se rediseñó.** Resumen gana evidencia abierta, mapa visto, mapa descargado, estrategia
  lista y criterio humano sobre IA, cada tasa con su denominador a la vista. Estrategas de Marca gana el
  recorrido por tester. El detalle agregado vive en Evidencia, y Configuración sigue siendo ajustes.
- **No medible en esta build, reportado como tal**: coste de IA por decisión y por marca activa (no se
  captura coste por petición) y WTP/conversión de pago (no existe superficie de oferta ni de pago).
  Ninguna de las cuatro bloquea el arranque con 12–20 personas.
- Sin eventos GA4 nuevos: ninguno mejoraría el embudo agregado sin duplicar verdad de primera parte.
- Pruebas: typecheck/lint PASS; pnpm test 135/135 (3 de comportamiento nuevas, incluidas la exclusión de
  la marca demo y las ventanas no observadas); verificación en navegador 12/12. **Sin migración, sin
  cambios de esquema, sin dependencias.**

## Página pública de agradecimiento de encuesta · 2026-09-29

Nueva página pública en `/gracias-encuesta`, mostrada a quien termina la encuesta de Brandopolis.

- **Misma arquitectura de rutas que los documentos legales**, sin framework ni enrutador paralelo: la
  ruta se declara en `views` (`src/transport/assets.ts`) con y sin barra final, el servidor devuelve
  el documento único y el cliente decide la vista. `/gracias` y `/gracias-encuesta/extra` siguen
  devolviendo 404.
- **Es un documento público.** `LEGAL_PATHS` se generaliza a `PUBLIC_DOCUMENT_PATHS`: legibles sin
  sesión y **nunca interceptados por la puerta de intake**, la misma regla que necesitaron
  `/privacidad` y `/terminos` por el mismo motivo. Verificado con visitante anónimo y con sesión
  activa: en ninguno de los dos casos se redirige al piloto ni se pierde la página.
- **No compite con nada**: abrir la página oculta el hero de la portada y la tarjeta de acceso, y hay
  **una sola acción**, «Volver al inicio →», que apunta a `/` (mismo origen, sin salto de redirección;
  resuelve a `https://brandopolis.ai/` cuando se sirve desde el dominio raíz).
- **Composición editorial con el sistema de diseño existente.** Cabecera pública canónica heredada,
  H1 en la sans a escala del hero (44px escritorio, 30px móvil) para que pertenezca a la landing, y la
  línea de cierre en la serif de display en esmeralda, la misma voz que las líneas de principio. Medida
  de lectura de **67 caracteres** en escritorio y **46** en móvil, a 15px/24px. Sin tarjetas, sin
  degradados de hero, sin fotografía, sin confeti. El símbolo canónico se reutiliza tal cual como marca
  discreta y decorativa (`alt=""`): **no se redibuja la Ribbon B**.
- **Accesibilidad**: un solo `h1`, sección etiquetada por su título, foco de teclado visible en el CTA,
  objetivo de 48px, contraste medido **7.32:1** en el cuerpo, **6.15:1** en el cierre, **6.81:1** en el
  CTA y **15.74:1** en el H1, y la entrada animada existe sólo bajo
  `prefers-reduced-motion: no-preference`.
- **Analítica**: sin sistema nuevo y **sin eventos de Product Analytics**. Una carga completa de
  `/gracias-encuesta` produce el `page_view` automático de la instrumentación base ya existente —
  verificado: un único hit, cero eventos personalizados—. El `pilot_landing_view` sigue acotado a `/`,
  así que no se dispara aquí. El Measurement ID sigue siendo de entorno y no aparece en el código.
  **Ningún dato de la encuesta ni del participante llega a GA4**; la página se sirve idéntica para todos.
- Título de documento por la convención existente `setTitle`: «Gracias por compartir tu experiencia ·
  Brandopolis». `<link rel="canonical">` y la meta description siguen siendo estáticas del documento
  único: **no se introdujo arquitectura de meta dinámica** para esta página.
- **No indexable, por ruta.** El servidor envía `X-Robots-Tag: noindex, follow` **sólo** en
  `/gracias-encuesta` y `/gracias-encuesta/`, desde el mismo bloque de cabeceras que ya existía y
  condicionado a `NON_INDEXABLE_VIEWS`, declarado junto a la tabla de rutas para que las rutas vivan en
  un solo sitio. **Nunca global**: verificado contra un servidor real que `/`, `/login`,
  `/request-access`, `/privacidad`, `/terminos`, `/admin`, `/workspace` y los assets estáticos no
  reciben la cabecera. Sin meta `robots` en el documento.
- **URL canónica de redirección de la encuesta**: `https://brandopolis.ai/gracias-encuesta`. El 302 del
  dominio raíz preserva la ruta, así que resuelve a la página servida por el piloto; **no se cambió
  dominio ni arquitectura de proxy** en este parche.
- Pruebas: 3 estructurales nuevas (ruta pública, copia exacta y acción única, estilos sólo desde el
  sistema de diseño) y la prueba de precedencia del intake generalizada a documentos públicos.
  typecheck/lint PASS; pnpm test 130/130; verificación en navegador **210/210** a
  390/768/1366×768/1440×900/1920×1080. **Sin migración, sin dependencias, sin cambios de esquema.**


## GA4 · configuración canónica cerrada · 2026-09-29

- **Causa raíz confirmada, y no es código que falte.** Medido contra producción con un navegador real:
  el Google tag **sí carga** (`gtag/js?id=…`), `window.gtag` existe, `dataLayer` se llena
  (`js, config, event, gtm.dom, gtm.load`), la CSP ya está ampliada y sale un `POST` real a
  `g/collect`. Lo que ocurre es que `/api/mode` publica **`G-PVKQ2K90EQ`**, la propiedad anterior,
  mientras el informe que se está mirando es el de **`G-NTSD86N2LT`**. Ningún hit llega a esa
  propiedad; de ahí el tiempo real vacío.
- **Corrección aplicada y verificada en producción el 2026-09-29.** `pilot.env` con
  `GA4_MEASUREMENT_ID=G-NTSD86N2LT`, `brandopolis-pilot.service` reiniciado, `GET /api/mode`
  devolviendo `G-NTSD86N2LT` y **GA4 Tiempo real recibiendo actividad**. Era configuración, no código:
  **no se modificó ningún archivo de aplicación**. La instrumentación base (gtag.js, `dataLayer`,
  `gtag('js')`, `gtag('config')`, `page_view` automático, inicialización única, sin GTM, sin
  `<script>` en línea) ya existía y quedó verificada. No hay acciones de configuración pendientes.
- **`G-NTSD86N2LT` queda como Measurement ID canónico** en
  [GA4_PILOT_ANALYTICS §0](docs/15-handoff/GA4_PILOT_ANALYTICS.md), con el estado medido en producción
  y el procedimiento exacto. El ID **no se escribe en el código**: es variable de entorno publicada por
  `/api/mode`, para que ninguna ejecución DEMO, e2e o de desarrollo emita a una propiedad real.
- Esta fase cubre **sólo recolección base y `page_view` automático**. La **taxonomía de eventos de
  producto es una fase posterior**; no se añadió ningún evento nuevo.
- Pruebas: 5 estructurales nuevas que fijan el ID canónico, prueban que ningún ID real viaja en lo que
  se sirve, que la inicialización ocurre una sola vez con `page_view` automático, que no hay
  contenedor GTM y que los contratos de producto/UX no se movieron. typecheck/lint PASS;
  pnpm test 127/127; git diff --check limpio. **Sin migración, sin dependencias, sin cambios de CSP.**


## Pulido final de QA · terminología y panel derecho · 2026-09-29

Tres correcciones estrechas sobre el PILOT ya funcional. Sin migración, sin dependencias nuevas y sin
tocar workflows estratégicos, auth, intake, legales, Admin, CoffeePolis, GA4, política de acceso,
esquema, máquina de estados, métricas demo ni la arquitectura del PDF.

- **«Blueprint estratégico» pasa a «Mapa estratégico».** Era preciso pero es jerga del oficio: un
  emprendedor no debería necesitar que se le explique. Una sola terminología donde se lee —navegación,
  encabezado de la vista, avisos y el documento exportado («Mapa estratégico de la marca»)—. **Los
  nombres técnicos no cambian**: `#blueprint`, `/api/blueprint`, `/api/blueprint/pdf`,
  `engine.blueprint()` y el nombre de archivo del PDF siguen estables, así que **ninguna URL se rompe**
  y los archivos ya descargados conservan su nombre. Decisión documentada en
  [BLUEPRINT_PDF_EXPORT](docs/15-handoff/BLUEPRINT_PDF_EXPORT.md).
- **Jerarquía restaurada en Contexto vigente.** «Contexto del mercado» y «Lo que ya decidiste» comparten
  ahora un mismo tratamiento de etiqueta de sección —9.5px, 0.18em, peso 700, neutro—, un nivel por
  debajo del encabezado del panel, que conserva su verde. «Entorno competitivo» es el **título de su
  sección** (`<h4>`, 14px, peso 600) y el estado queda claramente secundario (badge de 10px). El
  bloque de mercado deja de ser una tarjeta con borde y fondo que competía con el encabezado, y una
  hairline devuelve a «Lo que ya decidiste» su propio corte de sección. La jerarquía viene de tipo y
  espaciado, no de bloques oscuros ni chips dominantes. El conteo «X de 4» no cambia.
- **Corregida la mancha oscura al pasar el cursor sobre «Entorno competitivo».** Era un `<button>` sin
  clase, así que heredaba de `base.css` `background: var(--action-primary)` y, al hover,
  `var(--action-primary-hover)`; la regla local reseteaba el estado en reposo pero **no `:hover`**, y
  al ser `display:block; width:100%` el color pintaba una banda oscura de ancho completo. Es un título
  de estado, no navegación —la navegación izquierda ya lleva ahí—, así que **pasa a ser texto estático
  (`<h4>`)**. Se corrige en el origen, sin `!important` y sin repintar encima: desaparece el fondo, el
  cursor vuelve a `auto`, deja de ser enfocable y termina el nombre accesible duplicado. Ninguna
  etiqueta estática del panel reacciona al cursor; los controles realmente interactivos conservan su
  hover.

- Pruebas: typecheck/lint PASS; pnpm test 122/122 (3 nuevas); test:e2e 80/80 (16 por proyecto,
  en cinco proyectos, ejecutados uno a uno por memoria); test:visual 10 pass + 1
  skip; verificación en navegador **168/168** a 390/768/1366×768/1440×900/1920×1080, midiendo
  luminancia del fondo en hover en lugar de confiar en un selector. **Sin migración.**


## Micro-hotfix de UX pre-tester · 2026-09-29

Cuatro ajustes de producto sobre el PILOT ya verificado. Sin migración y sin tocar esquema, auth,
intake, legales, Admin, la estrategia demo de CoffeePolis, las exclusiones de métricas demo, la
política de acceso ni GA4.

- **La inferencia ahora se ve donde se pide.** El panel global de actividad vive arriba del workspace,
  así que pedir posibilidades desde una decisión más abajo parecía un cuelgue: clic, nada, y minutos
  después aparecían opciones. Se añade un **espejo local del MISMO estado** junto al control:
  `activityStart/Step/Done/Fail` pintan los dos. Es una segunda **vista**, nunca un segundo proceso —
  no hay petición, temporizador ni estado de generación extra, y en el cliente sigue habiendo **un
  único punto de llamada** a `/api/recommendations/generate`. El botón se deshabilita y dice
  «Generando posibilidades…»; el bloque local anuncia con `role="status"` y `aria-live="polite"`, no
  sólo con una animación. Al terminar, las opciones se traen a la vista sin saltos bruscos y
  respetando `prefers-reduced-motion`.
- **Entorno competitivo pasa a ser preparación estratégica.** Estaba bajo «Contexto y aprendizaje», lo
  que lo hacía parecer trabajo posterior a decidir, cuando en realidad informa a Cliente principal,
  Modelo de valor y Posicionamiento. Ahora encabeza la navegación bajo **PREPARACIÓN ESTRATÉGICA**.
  **No es una decisión**: no lleva número ni `data-module`, la Decision Spine sigue teniendo cuatro y
  ni el conteo «X de 4» ni las métricas de activación cambian.
- **Contexto vigente separa el mercado de las decisiones.** Un bloque propio, «Contexto del mercado»,
  con el estado del Entorno competitivo —**Sin investigar · Pendiente de revisión · Revisado**—
  derivado de estado canónico: los hallazgos incorporados son evidencia del Brand Context y los
  descartados son rechazos registrados; ambos sobreviven a una recarga. Los candidatos sin resolver
  existen sólo dentro de la ronda que los produjo, que es justamente el punto: nunca son estrategia.
  El estado del mercado se carga **sin bloquear el workspace**: `refresh()` sigue haciendo una sola
  petición y repinta sólo el rail cuando llega. Una primera versión encadenaba la petición dentro de
  `refresh()` —la ruta más caliente de la aplicación, que corre tras cada mutación— y retrasaba cada
  render posterior lo suficiente para que, con la máquina cargada, un clic quedara sin efecto; lo
  detectó `phase10a.spec.ts` y el suite visual no se relajó.
- **La entrega del Entorno competitivo habla su propio idioma**: «Contexto competitivo revisado», con
  «Continuar a <siguiente decisión pendiente>» derivado de `nextPhase()` —el recorrido canónico, sin
  una segunda ordenación— y «Revisar contexto» como acción secundaria.
- **Navegación más compacta.** El cuarto grupo dejaba «Mi aprendizaje» y «Blueprint estratégico» fuera
  de vista en pantallas de portátil. **No se quitó ni se colapsó nada**: el ahorro viene del espaciado
  (padding del panel, márgenes entre ítems, separación entre grupos) y el objetivo táctil de 44px se
  conserva donde el puntero puede ser grueso, reduciéndose a 36px sólo bajo `(pointer: fine)`. Medido:
  a **1366×768 el Blueprint entra sin scroll** (borde inferior en 664px de 768).
- **Blueprint estratégico se puede descargar en PDF.** Documento estratégico generado en el servidor
  desde el estado canónico vigente, **no una captura**. Ver
  [BLUEPRINT_PDF_EXPORT](docs/15-handoff/BLUEPRINT_PDF_EXPORT.md). Sólo la versión vigente de cada
  decisión; una propuesta de IA nunca aparece como decisión; las hipótesis se imprimen bajo «SIN
  VALIDAR, NO SON HECHOS»; los hallazgos descartados no aparecen; lo que no está definido dice «Aún no
  definido». **Sin dependencia nueva**: `src/application/pdf-writer.ts` es un escritor mínimo con las
  fuentes estándar Helvetica, sin navegador headless. Autorización: la de `scope()`, **sin cambios**.

- Pruebas: typecheck/lint PASS; pnpm test 119/119 (9 nuevas, incluida la exportación por HTTP releída
  con `pdfjs-dist`); test:e2e 75/75 (5 especificaciones nuevas de navegador), ejecutado proyecto
  por proyecto porque una sola invocación agota la memoria de esta máquina; test:visual 10 pass + 1
  skip; verificación en navegador **193/193** a 390/768/1366×768/1440×900/1920×1080. **Sin migración.**


## Hotfix funcional pre-tester · 2026-09-29

Segunda verificación humana en producción. **El hotfix de producción anterior ya está desplegado y se
verificó manualmente**: el recorrido mostró CoffeePolis con contenido, el ancho del intake corregido,
las rutas legales y el CTA de posibilidades visible. Confirmó además como correctos geografía,
mercado principal, acciones por opción, entrega de fase en las decisiones núcleo y administración.
Quedaban dos defectos funcionales; la verificación en navegador destapó otros dos, uno de ellos
impedía cumplir el criterio de aceptación del primero.

- **«Ayúdame a generar posibilidades» no hacía nada.** El botón se renderiza sólo dentro de la rama
  `draft` de `render()`, mientras su listener vivía en `mountRecommendation()`, cuya primera
  instrucción es `if(draft)return;`. Botón y manejador eran **mutuamente excluyentes**: el listener
  nunca se registraba y el clic no producía nada — ni petición, ni error, ni estado de carga. Su
  objetivo de delegación, `#generate-recommendation`, se renderiza en la misma función, así que
  tampoco existía mientras el formulario estaba abierto. Se extrae `generatePossibilities()` como
  **único camino de generación** —lo usan las dos superficies— y el CTA se registra en `render()`,
  donde el formulario existe de verdad.
- **Las opciones se generaban en un panel oculto.** «Opciones» es una pestaña. Al generar desde el
  input inicial la pestaña activa seguía siendo «Decisión», de modo que las propuestas se creaban
  correctamente pero **invisibles**. Pedir posibilidades ahora selecciona siempre su panel.
- **Una opción descartada contaminaba las demás fases.** Los identificadores de opción son
  posicionales (`option-1`, `option-2`) y se repiten en cada propuesta, y `discardedOptions` los
  guardaba sin ámbito. Descartar una opción en Cliente principal hacía que una opción intacta de
  Modelo de valor, Posicionamiento y Mensaje principal apareciera ya «Descartada», sustituyendo
  Incorporar/Modificar/Descartar por «Reconsiderar». **Defecto previo a este hotfix**, no introducido
  aquí: se detectó al verificar las cuatro fases. El descarte se acota a su propia propuesta.
- **El aviso de datos IA tenía una tercera copia de la generación.** Al aceptar «Entiendo y acepto»
  se generaba sin liberar el borrador ni seleccionar «Opciones», así que el primer participante de
  PILOT que pidiera posibilidades desde el input inicial y aceptara el aviso **no vería nada**: el
  mismo defecto en otro sitio. Ahora reanuda la misma petición por el camino compartido. En el
  cliente queda **un único punto de llamada** a `/api/recommendations/generate`.
- **Completar el Entorno competitivo no ofrecía paso siguiente.** `showPhaseHandoff()` sólo se
  invocaba desde el envío del formulario de decisión, así que ningún otro flujo podía alcanzarlo. Se
  arregla en la **capa compartida**: la entrega recibe su texto por parámetro y sigue derivando el
  destino de `nextPhase()`, el recorrido canónico — **no se introduce una segunda ordenación de
  fases**. La finalización es el **estado revisado por una persona**, no «la IA terminó»: exige
  hallazgos generados y que el Estratega de Marca haya resuelto **todos**, incorporándolos o
  descartándolos. Con uno sin resolver no se muestra nada.
- **Fallo de generación**: mensaje propio para el participante, sin filtrar texto del proveedor ni de
  transporte, con el borrador intacto y el reintento disponible. Verificado inyectando un 500 con
  detalle de proveedor y la respuesta `{error}` del motor. **Los fallos que `api()` ya resuelve
  siguen propagándose**: sus mensajes están escritos para participantes y `UNAUTHORIZED` además
  devuelve la página al acceso. Una primera versión de este arreglo los capturaba todos y dejaba una
  sesión vencida en una pantalla muerta; lo detectó el contrato de `m1.spec.ts`, que no se relajó.

**Hueco documentado, no corregido** (control de alcance): los hallazgos documentales de Contexto
estratégico tienen la misma forma de revisión resoluble (CANDIDATE/ACCEPTED/REJECTED) y tampoco
ofrecen entrega. Su finalización es ambigua —procesar un documento nuevo reabre el estado— así que
mostrar «fase completada» ahí es una decisión de producto, no la corrección de un defecto. El
recorrido de aprendizaje no tiene un estado completado canónico comparable.

- Telemetría: `possibilities_requested`, `phase_completed` y `next_phase_started` existentes, sin
  nombres nuevos y con un único punto de emisión cada uno; `phase_completed` del entorno competitivo
  se reporta una sola vez por ronda de investigación. Sin PII ni contenido estratégico.
- Pruebas: typecheck/lint PASS; pnpm test 110/110 (5 nuevas, **las 5 fallan contra el código con el
  defecto**); test:e2e 50/50 (4 especificaciones nuevas de navegador); test:visual 10 pass + 1 skip;
  verificación en navegador 192/192 a 390/768/1440 con GA4 de prueba activo para comprobar la
  telemetría real, y UX de fallo 20/20. **Sin migración.**


## Hotfix de verificación en producción · 2026-09-29

Primera verificación humana real en producción sobre `2f84d29`.

**Funcionó**: acceso con Google · intake obligatorio · CoffeePolis como Marca demo · Crear mi marca · influencia geográfica · mercado principal · entrega de fin de fase · continuar a la siguiente fase · revisar avance · Incorporar/Modificar/Descartar · administración accesible · exclusiones de métricas demo activas.

**Corregido en este hotfix**:

- **Rutas legales interceptadas por el intake.** `/privacidad/` y `/terminos/` devolvían 200 pero pintaban el formulario de intake a un participante autenticado que aún lo debía: en el arranque, `state.intakeRequired` llamaba a `showIntake()` sin mirar la ruta, y `showIntake()` oculta explícitamente ambas secciones. Ahora un documento público se decide **antes** que la puerta, en el arranque y tras iniciar sesión. El workspace sigue protegido.
- **Ancho del intake en escritorio.** `.welcome` declara tres columnas para las tarjetas de acceso; el intake las redefinía a dos teniendo también tres hijos, así que el formulario caía a la fila 2 de la **primera** columna: 288px con campos de 103px, y la mitad derecha vacía. Colocando los tres hijos explícitamente, a 1440px el formulario pasa de **288px a 735px** y los campos de **103px a 327px**.
- **CoffeePolis estratégicamente vacío.** Existía con su contexto inicial pero con 0/4 decisiones y Blueprint vacío, así que no enseñaba nada. Se añade `ensureDemoContent()`: cuatro decisiones aprobadas, una hipótesis explícita marcada «Sin validar» y una aportación claramente etiquetada como demo. **Contenido determinista escrito en el repositorio**: no se llama a ninguna IA y no se inventa investigación externa.
- **Faltaba generar posibilidades en el input inicial.** La acción existía junto a las opciones, no donde se pide escribir. Ahora aparece bajo «Tu decisión» y **delega en el control canónico de generación**, así que hay literalmente un solo motor; lo ya escrito se conserva y nada se aprueba automáticamente.
- **GA4 no observado**: diagnosticado antes de tocar código. **No hay defecto de aplicación confirmado** — ver [GA4_PILOT_ANALYTICS §7.bis](docs/15-handoff/GA4_PILOT_ANALYTICS.md). `GA4_MEASUREMENT_ID` ya estaba en `pilot.env` antes del reinicio, Brandopolis se reinició correctamente y el health devolvió `ready`; aun así Tiempo real no mostró actividad durante el recorrido humano. **Sin causa raíz asignada** en ese momento: quedaba abierta una diagnosis de entrega de analítica en runtime/navegador/red, pendiente de la verificación manual documentada. **Resuelto el 2026-09-29**: la causa era el Measurement ID obsoleto en producción —`G-PVKQ2K90EQ` en `pilot.env` frente a la propiedad canónica `G-NTSD86N2LT`—, así que los hits llegaban a otra propiedad. Nunca hubo defecto de aplicación. Ver [GA4_PILOT_ANALYTICS §0](docs/15-handoff/GA4_PILOT_ANALYTICS.md).

**Defecto adicional encontrado durante la verificación**: con `core.autocrlf` y sin regla en `.gitattributes`, un checkout reescribía `drizzle/*.sql` a CRLF, cambiando su hash. CLAUDE.md declara esas migraciones inmutables y verificadas por hash, así que una base sana informaba `MIGRATIONS_REQUIRED` y el servidor DEMO local se negaba a arrancar. Se fija `drizzle/** text eol=lf`, igual que ya se hacía con los assets de marca y el frontend servido.

- Pruebas: typecheck/lint PASS; pnpm test 106/106 (6 nuevas); **ensayo de release PASS**; **regresión de métricas demo PASS**; verificación en navegador de las rutas legales y del intake **39/39** a 390/768/1024/1440/1600/1920. Sin migración.


## Administración V1 y centro de evidencia del piloto · 2026-09-29

- Superficie de operador en `/admin`, **separada del workspace del participante**, con Resumen, Estrategas de Marca, Evidencia y un marcador de Configuración.
- **Autorización**: tres condiciones obligatorias — sesión PILOT viva, correo verificado por el proveedor y pertenencia a `BRANDOPOLIS_ADMIN_EMAILS`. Se comprueba **en cada endpoint por separado**, nunca una vez en el borde, y los dos rechazos devuelven el mismo mensaje para no revelar por qué. Ninguna dirección está escrita en el código; una prueba lo fija.
- Endpoints: `GET /api/admin/{session,summary,users,evidence,evidence.csv,feedback}` y `POST /api/admin/access-status`.
- **Integridad de métricas**: las cifras canónicas vienen de `report()`/`metrics()`, que ya excluyen la actividad demo en el servidor. **La administración no recalcula evidencia**: si lo hiciera, las exclusiones de CoffeePolis podrían divergir entre superficies. Marcas reales y demo se reportan siempre por separado, y lo que la arquitectura no puede derivar hoy se devuelve en `unavailable` y se muestra como tal, nunca inventado.
- **Nada estratégico sale de esta capa**: no se seleccionan decisiones, documentos, contexto ni material de sesión/OIDC/hashes. La evidencia agregada son conteos por categoría, nunca filas; la ciudad se omite incluso en agregado porque en un piloto pequeño un conteo de uno señala a una persona.
- Suspender y reactivar con confirmación, auditados contra el operador que actúa. `PENDING` no se asigna a mano y **reactivar nunca resucita una identidad desactivada con `disable()`**.
- **Defecto real encontrado en la verificación**: la barra de título de administración era un `<header>`, así que le aplicaba la regla global `header{position:sticky;height:var(--shell-height);z-index:30}` y tapaba su propia navegación a 390px, interceptando los clics. Corregido usando un `div` en lugar de debilitar el estilo compartido del shell. Además se dejó de añadir la clase `app` en administración, que arrastraba chrome del participante que un operador no debe ver.
- Pruebas: typecheck/lint PASS; pnpm test 100/100 (8 nuevas de seguridad y métricas de administración); test:e2e 30/30; test:visual 10 pass + 1 skip; **ensayo de release PASS**; **regresión de métricas demo PASS**; verificación de administración en navegador **42/42** a 390/768/1440. Sin migración: la administración lee tablas existentes.
- **Diferido explícitamente**: pantalla visual de comentarios e incidencias (el endpoint existe y está probado, falta la vista), controles de filtro por fecha en la interfaz (el endpoint ya acepta `from`/`to`), exportación operativa del padrón en CSV, y retención D7/D14/D30 hasta que sea derivable canónicamente.


## UX final del workspace antes de las pruebas externas · 2026-09-29

- **Geografía estratégica en el alta canónica de marca**: la pregunta, los seis valores y «Mercado principal» opcional, con la ayuda «La ubicación de tu empresa no siempre es el mercado donde compite tu marca». Persiste por el endpoint existente `/api/brands/geography`: **una sola implementación**. Es opcional por decisión: no declararla nunca impide crear la marca, y un fallo al guardarla nunca pierde la marca creada.
- **«Ayúdame a generar posibilidades»**: el mismo motor de recomendación de siempre, nombrado por lo que ofrece, con una nota de que es opcional y que la respuesta propia es el punto de partida. Sin motor paralelo ni endpoint nuevo.
- **Controles por opción**: cada opción generada expone **Incorporar · Modificar · Descartar** como botones reales, visibles sin hover. `Incorporar` y `Modificar` abren un borrador humano a través de `prepare()` conservando `sourceRecommendationId`; **ninguna crea una decisión aprobada** (verificado en navegador: el contador de versiones no cambia). `Descartar` aparta la opción con «Reconsiderar» y **nunca borra**: el rechazo auditado sigue siendo el formulario con motivo a nivel de recomendación.
- **Entrega de fin de fase**: al aprobar una decisión aparece un panel **dentro de la superficie de decisión**, nunca detrás del menú, con «Continuar a ‹siguiente fase›» y «Revisar avance». La siguiente fase se lee del recorrido canónico en la navegación, sin duplicar la secuencia, y sólo se ofrece cuando existe de verdad.
- Seis eventos nuevos sobre el envelope y la allowlist existentes: `possibilities_requested`, `ai_option_incorporated`, `ai_option_modified`, `ai_option_discarded`, `phase_completed`, `next_phase_started`. Sólo llevan `pilot_stage`.
- `GOOGLE_AUTH_PRODUCTION.md` §7.bis con el estado real de publicación: audiencia, objetivo Production, las cuatro URL, origen, redirección, scopes y la política vigente (intake obligatorio tras autenticarse, sin aprobación manual). **Cotejo de la Política de Privacidad contra los campos implementados: coinciden exactamente, no hubo discrepancia que corregir.**
- **Regresión real detectada por la suite**: la primera ejecución completa de e2e devolvió **20 pass / 10 fallos**. Seis specs fijaban la etiqueta anterior del control de generación, que esta pasada renombra. No era una rotura funcional, pero sí una señal legítima: se actualizaron esas seis aserciones a la etiqueta canónica nueva y se volvió a 30/30. Ninguna prueba se relajó.
- Verificación en navegador **38/38** a 360/390/430/768/1440. Pruebas: typecheck/lint PASS; pnpm test 92/92 (4 nuevas); test:e2e 30/30; test:visual 10 pass + 1 skip; **ensayo de release PASS**; **regresión de métricas demo PASS**. Sin migración.

### Congelación del workspace PILOT

> The current PILOT workspace is functionally frozen for external validation.
> Do not continue opportunistic UI or strategic-workflow polishing.
> Only defects discovered by regression or external testing may change the frozen workspace before validation.


## Intake obligatorio y primera experiencia con la marca demo · 2026-09-28

- **Intake requerido** en una sola pantalla: seis campos obligatorios en dos columnas que colapsan a una en teléfono, tres opcionales, y las dos aceptaciones enlazando `/privacidad/` y `/terminos/`. CTA «Continuar a Brandopolis». El correo verificado de Google se muestra en sólo lectura y **nunca se teclea**. Sin lenguaje de aprobación: una expresión regular sobre la pantalla renderizada lo comprueba en los cinco anchos.
- **API autenticada**: `GET`/`POST /api/participant`. Validación y marcas de tiempo de aceptación en el servidor; el correo nunca se toma del formulario.
- **Puerta en el servidor, no en la interfaz**: `/api/session-state` informa `intakeRequired`, y cualquier llamada PILOT autenticada fuera de una lista mínima devuelve **403 `INTAKE_REQUIRED`** hasta que exista el perfil.
- **Bypass real encontrado y corregido durante la verificación**: la puerta sólo corría en el arranque y el manejador de acceso llamaba a `authenticated()` directamente, saltándosela. Ambas vías pasan ahora por un único `enterWorkspace()`. Afectaba menos a PILOT (el callback OIDC vuelve por el arranque), pero era un agujero y sólo apareció porque falló la comprobación en navegador.
- **Exención de operador y legado**: el intake lo debe únicamente una cuenta de autoservicio, reconocida por tener perfil en `user_accounts`. Las identidades aprovisionadas por operador y los fixtures de ingeniería quedan exentos y se comportan igual que antes; no se inventa perfil para ellos. El ensayo de release pasa.
- **CoffeePolis visible como lo que es**: insignia «Marca demo», una explicación corta y el botón «Crear mi marca», sólo mientras la marca activa es el sandbox. El selector añade «· Marca demo». `isDemo` viaja desde `brand_profiles` por `listBrands`, así que la interfaz nunca lo adivina por el nombre. «Crear mi marca» abre el diálogo canónico de nueva marca: una sola vía de creación.
- **Telemetría**: `pilot_intake_started`, `pilot_intake_completed` y `demo_brand_opened`, sobre el mismo envelope y la misma allowlist. Sin PII: sólo llevan `pilot_stage`.
- Verificación en navegador **28/28** a 360/390/430/768/1440. Pruebas: typecheck/lint PASS; pnpm test 88/88; test:e2e 30/30; test:visual 10 pass + 1 skip; **ensayo de release PASS**. Dos contratos de prueba actualizados por cambios intencionales de API (sonda de sesión con `intakeRequired`, lista de eventos GA4), ninguno relajado. **Sin migración**: esta pasada va encima de 0013.
- **No incluido**: geografía en el alta de marca, navegación de fin de fase, generar posibilidades, acciones por opción de IA y el documento de preparación de Google.


## Perfiles de participante, sandbox demo y geografía de marca · 2026-09-28

- **Migración 0013**, aditiva: `participant_profiles` (intake del Estratega de Marca) y `brand_profiles` (clasificación e influencia geográfica por marca).
- **Decisión de esquema forzada por evidencia**: `isDemo`, `geographicInfluence` y `primaryMarket` iban a ser columnas de `brands`, la opción idiomática, y **rompieron el ensayo de release contra el build congelado** con la misma firma que ya rompió `pilot_identities`. Regla confirmada del repositorio: **añadir tablas es seguro; ensanchar una tabla que comparte el build congelado, no**. Se movieron a la tabla lateral `brand_profiles` y el ensayo vuelve a pasar.
- **CoffeePolis** es un **sandbox editable por workspace**, nunca una marca compartida mutable. Se siembra por la vía canónica `createBrand`, así que sus preguntas, auditoría y eventos son idénticos a los de una marca real y es explorable de verdad. Se clasifica con `isDemo=true`, influencia `LOCAL` y mercado principal `Xalapa, Veracruz`: local por decisión, no inferido.
- **Integridad de métricas (no negociable)**: `metrics()` resuelve el conjunto de marcas demo desde el servidor y **descarta todo evento con ámbito de marca demo antes de calcular cualquier métrica de participante**. No es filtrado de dashboard: es la agregación canónica. La exploración demo se reporta aparte (`demoBrands`, `demoDecisions`) para que los informes puedan distinguirla sin contarla.
- **Política de siembra**: sólo cuentas de autoservicio (las que tienen perfil en `user_accounts`). Los workspaces aprovisionados por operador y los fixtures de ingeniería **no se rellenan**. La primera versión sembraba cualquier workspace PILOT vacío y contaminó el fixture de arranque; se acotó en lugar de editar esa prueba.
- **Geografía estratégica**: seis valores canónicos (`LOCAL/REGIONAL/STATE/NATIONAL/LATAM/GLOBAL`) y mercado principal opcional, por marca, con comprobación de propiedad. **El lugar donde opera una marca nunca implica su mercado estratégico**: se declara, no se deduce.
- El correo verificado **nunca** procede del formulario: vive en `user_accounts` desde el ID token. Una prueba fija que el perfil guardado no contiene clave de correo.
- Pruebas: typecheck/lint PASS; pnpm test 88/88 (4 nuevas: integridad de métricas, aislamiento del demo, intake y geografía); test:e2e 30/30; test:visual 10 pass + 1 skip; **ensayo de release PASS**. Recuento de migraciones 13→14 (y 14→15 en divergencia), nunca relajado.
- **Pendiente, decidido pero no implementado**: el intake será **obligatorio antes de acceder al workspace**, inmediatamente después de la autenticación con Google. Hoy no existe interfaz: el backend está listo y probado, pero ninguna pantalla lo invoca.


## Endurecimiento del workspace antes de las pruebas externas · 2026-09-28

- **Panel de inferencia IA**: desbordaba el viewport 14px exactos a 360/390/430. Causa localizada consultando las reglas aplicadas en el navegador: `product-shell.css` define `.primary-workspace > .ai-activity {width:100%}` **sin media query**, y esa especificidad vence al `width:auto` del móvil; fijado a `left:14px`, el panel medía un viewport entero desde el inset. Corregido igualando la especificidad dentro del breakpoint de teléfono.
- **Cabecera móvil**: dos de los tres reportes no se confirmaron. El objetivo táctil del menú ya medía **44×44** exactos; sólo se agrandó el glifo, sin tocar la caja. La insignia de modo no estaba tapada: la ocultaba una corrección anterior propia. Remedido por modo, **PILOT cuesta 38px y cabe**, mientras que «DEMO LOCAL» cuesta 74px de una fila de 358px y ahoga el selector: ahora la etiqueta se ve en PILOT (`body[data-mode="PILOT"]`) y sigue oculta en DEMO de ingeniería. «Nueva marca» seguía siendo pulsable en todos los anchos.
- **Terminología**: 28 sustituciones en la copia servida. La prosa nombra el rol («Aportación del Estratega de Marca», «requiere la revisión del Estratega de Marca»); botones e insignias pierden el calificativo en lugar de cargar una frase larga («Iniciar revisión», «Requiere revisión»), que en un teléfono no cabría. La doctrina no se toca.
- **Rutas legales públicas** `/privacidad/` y `/terminos/`, requisito para publicar la app OAuth de Google en Producción. Cubren identidad Google, perfil de participante, GA4 y sus exclusiones explícitas, telemetría interna, documentos, procesamiento con IA, conservación, derechos, categorías de encargados y ausencia de venta de datos; y estado piloto, uso aceptable, contenido del participante, IA como asistencia con la decisión final del Estratega de Marca, suspensión, feedback y propiedad intelectual. Sin promesas legales no respaldadas.
- **contacto@brandopolis.ai** como contacto público canónico: no existía ninguna dirección en el repositorio. Enlazado desde el pie y ambos documentos; una prueba fija que es la única dirección `@brandopolis.ai` del documento público.
- Pruebas: typecheck/lint PASS; pnpm test 84/84 (5 nuevas); test:e2e 30/30; test:visual 10 pass + 1 skip. Tres specs que fijaban la etiqueta `Iniciar revisión humana` se actualizaron al cambio intencional de copia, nunca relajadas.
- **No incluido en esta pasada**: intake de participante, CoffeePolis, influencia geográfica, navegación de fin de fase, generar posibilidades, acciones por opción de IA y su telemetría.


## Estado de acceso configurable del participante · 2026-09-28

- `PILOT_DEFAULT_ACCESS_STATUS` (por defecto `APPROVED`). **Política actual del piloto: todo participante autenticado con éxito queda aprobado automáticamente**, sin paso de aprobación manual. `PENDING` habilita una puerta de aprobación para un piloto controlado futuro sin rediseñar el esquema. `SUSPENDED` se rechaza como valor por defecto: crearía cuentas que nunca podrían entrar.
- Modelo `PENDING / APPROVED / SUSPENDED` completo desde el principio, con `setAccessStatus()` para administración futura. La política se lee de configuración, nunca de lógica de negocio fija.
- La política se aplica **sólo al primer aprovisionamiento**: un participante que vuelve conserva su estado, así que cambiar el valor por defecto no aprueba ni reserva retroactivamente a nadie.
- `SUSPENDED` retira el acceso de inmediato (revoca sesiones vivas) y `authorize` rechaza además cualquier sesión que sobreviviera. `disable()` sigue ganando sobre cualquier estado.
- El estado vive en `user_accounts`, **no** en `pilot_identities`: la primera implementación lo puso allí y **rompió el ensayo de release contra el build congelado**. Se bisectó (código revertido: seguía fallando; columna revertida: pasaba) y se rediseñó. Una identidad aprovisionada por un operador no tiene perfil y se trata como `APPROVED`, exactamente el comportamiento actual.
- Migración 0012, aditiva; las filas existentes quedan en `APPROVED`. Recuento de migraciones 12→13 (y 13→14 en el caso de divergencia), nunca relajado.
- Pruebas: typecheck/lint PASS; pnpm test 79/79 (4 nuevas de política); test:e2e 30/30.


## Certificación multiusuario del acceso con Google · 2026-09-28

- Cuatro pruebas de certificación sobre PostgreSQL real: identidades Google arbitrarias con usuarios y workspaces privados distintos; el correo como metadato y no como identidad; la puerta `PILOT_AUTO_PROVISION` y los claims exigidos; y ausencia de duplicados bajo primeros accesos concurrentes. **No hizo falta cambiar código de producción**: pasaron a la primera.
- Aislamiento entre inquilinos comprobado sobre la superficie real de producto (marcas, contexto, documentos, blueprint, evidencia, asignación y sesiones), en ambos sentidos.
- Auditoría de usuario fijo en `src/`: ningún correo, ningún `subject` de Google, ningún ID de workspace o usuario fijo; toda lectura de identidad y sesión está acotada. Observación: todo workspace auto-aprovisionado comparte el nombre visible «Workspace PILOT» (el identificador sí es único).
- **Limitación documentada**: `normalizedEmail` es único, así que un `subject` nuevo con un correo ya registrado queda denegado. Es el comportamiento seguro —no hay apropiación ni duplicado— pero bloquea a quien cambie de cuenta de Google conservando la dirección. Decisión de producto pendiente.
- Configuración exacta de producción y callback de Google en [GOOGLE_AUTH_PRODUCTION](docs/15-handoff/GOOGLE_AUTH_PRODUCTION.md).


## Documentación operativa y de handoff · 2026-09-28

- Runbook de reconciliación de producción: el piloto servía código anterior a `d43fd4d`. La caché de assets en memoria de `assets.ts` hace que `git pull` sin reinicio no cambie nada de cara al público.
- Diagnóstico y runbook del 403 del dominio raíz, con los hechos de servidor confirmados y una redirección 301 persistente vía `userdata` de cPanel.
- Estado de implementación consolidado para retomar sin conversaciones previas, y congelación del workspace PILOT registrada en CLAUDE.md.
- Documentación de GA4: propósito, frontera de medición, reglas de privacidad, lista de eventos, distinción frente a la telemetría interna, variable de producción y verificación en Realtime/DebugView.
- **No implementado**: contraseña propia, recuperación, SMTP, `/admin` y `/api/admin/*`. Documentado como trabajo diferido con su diseño.

## Instrumentación GA4 del piloto · 2026-09-28

- GA4 opcional por `GA4_MEASUREMENT_ID`. Sin definir queda completamente desactivado; mal formado falla al arrancar. **Ningún Measurement ID en el código**: el valor se publica en `/api/mode` desde el entorno.
- La CSP estricta bloqueaba gtag por completo. Ahora se amplía **sólo** cuando hay ID configurado y **sólo** con orígenes de Google; apagado, la cabecera es byte a byte la de siempre (fijado por prueba). Nunca se introduce `unsafe-inline`: el arranque de gtag vive en `/analytics.js`, módulo del mismo origen.
- Privacidad aplicada por código: `sanitise()` descarta toda clave fuera de la allowlist (`cohort`, `auth_method`, `pilot_stage`, `mode`) y todo valor con forma de identificador, correo, URL o de más de 40 caracteres. Google Signals y personalización de anuncios desactivados.
- Siete hitos reales, ninguno disparado por el mero renderizado. `pilot_login_completed` exigió que la redirección de éxito del callback OIDC lleve `?login=ok`, simétrica al `?login=<motivo>` de los fallos.
- GA4 es analítica de navegación; **la telemetría interna sigue siendo la evidencia canónica**.

## Autoservicio OIDC verificado · 2026-09-28

- OIDC: `scope` pasa de `openid` a `openid email profile`. Los claims se construyen sólo desde el ID token validado (firma, issuer, audiencia, expiración, nonce); nada proviene del navegador.
- `PILOT_AUTO_PROVISION` (por defecto `false`). Apagado conserva el comportamiento fail-closed. Encendido, una identidad verificada crea en una sola transacción usuario, workspace PILOT privado, membresía con `canCreateBrand`, mapeo de identidad, perfil de cuenta y evento `account_created`.
- **El email verificado se exige sólo en la vía de aprovisionamiento.** Una identidad ya aprovisionada por un operador sigue entrando con `(issuer, subject)`: si el proveedor dejara de enviar claims de email, ningún Estratega de Marca queda fuera.
- Cohorte determinista por SHA-256 de `issuer+subject`; sin `Math.random()`. Sólo se consulta al aprovisionar, así que ninguna cuenta existente se reasigna.
- Nueva tabla `user_accounts` (migración 0011, aditiva). La identidad canónica sigue siendo `(issuer, subject)`, nunca el email.
- Concurrencia: dos callbacks simultáneos de la misma identidad no duplican cuenta ni workspace.
- Recuento de migraciones actualizado 11→12 (y 12→13 donde la prueba inyecta una fila extra), nunca relajado.

## Cabecera móvil del piloto · defecto previo corregido · 2026-09-28

- `.header-brand-control` estaba en `position:absolute` con `z-index:2`. Al pasar la cabecera a `display:flex` en ≤900px su `margin-left:auto` quedaba inerte y el control flotaba sobre `#new-brand`; además el `select` conservaba un suelo `min-width:150px` de un bloque `@media (max-width:1280px)` posterior y se desbordaba de su contenedor. El `select` interceptaba los clics de «Nueva marca».
- Corrección acotada a `product-responsive.css`: en ≤900px el control entra en el flujo y pierde el suelo; en ≤767px se oculta la insignia de modo, que ocupaba 74px de una fila de 358px y dejaba el selector en 49px.
- Resultado: **test:e2e 30/30** (antes 24 pass + 6 fallos móviles) y **test:visual 10 pass + 1 skip, 0 fallos** (antes 1 fallo persistente en phase10a por la misma causa). Verificado en navegador real a 360/390/768/1440 con 54 marcas y nombres de 45 caracteres.


## Landing pública del piloto · claridad de producto · 2026-09-28

- Landing pasa de visión a producto: hero «De la idea a la marca. De la marca al mercado.», cinta de cinco capacidades con iconos de línea, los cuatro pasos reales en «Cómo funciona», sección «Qué incluye» con seis capacidades numeradas y bloque de diferenciación.
- Entrada al piloto como acción primaria: la cabecera pública queda en logo, «Cómo funciona» y «Entrar al piloto». Sin lenguaje de token, invitación ni «Solicitar acceso» en texto público; `/request-access` se conserva (ruta y contrato de `PILOT_REQUEST_ACCESS_URL` intactos) y apunta al acceso con cuenta.
- Separación de estado público/autenticado: «Nueva marca», insignia de modo y selector de marca activa pertenecen al shell autenticado; el selector aparece sólo cuando existen marcas y se oculta si no queda ninguna.
- Terminología de producto: quien participa en el piloto es «Estratega de Marca» en todo el texto visible. Sin renombrar esquema, telemetría, contratos ni identificadores internos.
- Movimiento con significado: la lista de capacidades revela su progresión al desplazarse y «Cómo funciona» construye cinco planos estratégicos unidos por un trazo verde (ciclo de 7 s, CSS puro, sin dependencias). El control de pausa detiene ambas animaciones y `prefers-reduced-motion` muestra la estructura terminada.
- Sin cambios de backend, esquema, migraciones, autenticación, tenencia, gobierno de IA ni contratos de Brand Context; sin nuevos archivos de runtime (allowlist de `assets.ts` sin tocar).
- Puertas (2026-09-28): typecheck/lint PASS; pnpm test 64/64; test:visual 9 pass + 1 skip + 1 fallo; test:e2e 24 pass + 6 fallos, todos del proyecto `mobile`. Ambos fallos son previos a este trabajo: reproducidos de forma idéntica en 89e2afe con estos cambios en stash (el `select#brands` intercepta el clic sobre `#new-brand`). La base de datos DEMO local acumula 51 marcas de pruebas repetidas, lo que ensancha el selector y agrava el solape a 390 px.
- Verificación de navegador sobre la landing: 54/54 (estado de cabecera, terminología, cinta, animación de construcción, pausa, movimiento reducido, estados del selector de marca, PILOT simulado, `/request-access`, sin desbordamiento horizontal de 1600 a 360 px). Contraste sobre fotografía PASS en 1440/1024/768/390. git diff --check limpio.
- Foundation, validador de UI y validador de Brand Master NO EJECUTADOS: la máquina no tiene intérprete de Python (sólo el alias de Microsoft Store). Se verificó por separado que los archivos requeridos existen y que todos los enlaces relativos de markdown resuelven.


## Fase 10B · pulido final de producto + handoff · 2026-09-25

- Trabajo de Phase 10A preservado y validado; rama `handoff/phase10b-final-2026-09-25`, tag `brandopolis-mvp-handoff-ready-2026-09-25`.
- CSS reorganizado sin cambio visual (demostrado con snapshot de estilos computados): `base.css`, `public.css`, `product-*.css`, un bloque por breakpoint, sin `@import` ni `!important` de especificidad; JS con `openModule`, `enterView`, `trapFocus`.
- Producto: vocabulario de estado único, Change Impact con conector de relación, Guided Review con elección explícita, conexiones con dirección, decisión bajo revisión con tono de atención, rail que marca la decisión en vista, historia como memoria, práctica en español, Blueprint con aristas.
- Accesibilidad AA (contraste, h1 en todo ancho, foco, 44 px en móvil, tabs con autoscroll) y rendimiento (preloads, byte ranges para video en Safari, fallback de booting).
- Handoff: NEXT_DEVELOPER_START_HERE, FINAL_MVP_HANDOFF, PRODUCT_DESIGN_SYSTEM, CLAUDE.md/AGENTS.md actualizados; `.nvmrc`, `.gitignore`, builds multiplataforma de embedded-postgres; causa raíz del mojibake (migración 0003) documentada.
- Pruebas: 63 Vitest, 25 E2E, 10 visual (+1 skip), 10 PILOT, 2 evidencia.

## MVP FASES 1–9 · cierre canónico de frontend · 2026-09-25

- Identidad de runtime = Brand Master aprobado, byte a byte (logo, Ribbon B, favicon, apple-touch, PWA, manifest); B poligonal retirada; `.gitattributes` acotado; validación desde checkout limpio.
- Tarjeta de decisión con jerarquía canónica; flujo de impacto con «Dependencia estricta»; revisión guiada con tarjetas de opción; historial como evolución estratégica; Blueprint y aprendizaje con lenguaje visual Brandopolis.
- Accesibilidad (foco, títulos, h1 único, bordes 3:1, pausa de animación), rendimiento (preloads por breakpoint, ETag) y contraste del hero medido en 4 anchos.
- Pruebas: 58 motor/contrato, 25 RC ×3 ejecuciones limpias, 10 PILOT, 8 visuales, boot 1.

## MVP FASES 1–9 · cierre final · 2026-09-25

- Frontend canónico integrado: gateway público (hero, pilares, «Cómo funciona» con Flow), acceso y solicitud de acceso, workspace con KPIs reales, tarjeta de decisión, impacto, revisión guiada, historial en línea de tiempo y Blueprint; Strategic Glassmorphism por tokens.
- Sólo 10 assets de runtime seleccionados; favicon y manifest conectados (rutas corregidas); CSP sin cambios.
- Sonda `/api/session-state` sin errores de consola para visitantes; `pnpm pilot:ai-smoke` para el primer smoke con proveedor real.
- Suite visual (`pnpm test:visual`) y capturas canónicas reales; corrección de una carrera en el helper de navegación de pruebas.
- Documentos: cierre de fases 1–9, alcance diferido post-MVP, bucles de aprendizaje, mapeo de assets y auditoría visual; dominio canónico brandopolis.ai.

## LIVE PILOT LAUNCH GATE · 2026-09-25 · EXTERNAL-CONFIG READY

- Runtime PILOT sin dependencias de desarrollo; `tsx` como dependencia de runtime.
- Nuevos comandos: `pilot:validate-config`, `pilot:preflight`, `pilot:smoke`; `pilot:operator report`.
- Instancia única garantizada por lock de PostgreSQL; operador vinculado al issuer de discovery.
- Aviso de datos IA con aceptación versionada y topes diarios; logs de auth, IA y readiness sin secretos.
- Plan de migraciones forward-only con detección de divergencia; herramientas DEMO rechazan bases PILOT.
- Pruebas: 52 de motor/contrato, 10 de navegador PILOT, ensayo real de procesos PILOT.
- Documentos de lanzamiento: hosting, OIDC, IA, cohorte, DNS y checklist; runbook y contrato de despliegue actualizados.

## MVP / PILOT · continuación de Claude · 2026-09-25

- Se conserva el checkpoint de Codex (acceso OIDC, sesiones, CLI, migración 0008, feedback, telemetría, adaptador IA).
- Corregida la carrera de apagado de PostgreSQL: `stopLocalDb` usa `pg_ctl stop -w` sobre su propio clúster y espera el cierre real antes de copiar.
- OIDC neutral: cliente público PKCE opcional, redirect configurable, fallos redirigen con motivo y nunca emiten sesión.
- Límite de solicitudes por cliente y por sesión (antes global); logout siempre limpia la cookie; errores de configuración legibles sin secretos.
- Adaptador Anthropic sobre el SDK oficial con errores tipados; telemetría `recommendation_requested`.
- CLI: `inspect`, `revoke-sessions`, `metrics` (activación, tiempo a primera propuesta y decisión). Onboarding breve y enlace de solicitud de acceso.
- DEMO y PILOT rechazan bases con datos de la otra clase.
- Pruebas: 42 de motor/contrato, 10 de navegador PILOT por HTTPS con login OIDC real, preservación de datos RC1 creada por el motor RC1 congelado y respaldo → cambio → restauración.
- Documentación: PILOT_RUNBOOK, PILOT_DEPLOYMENT_CONTRACT, TESTER_GUIDE, COMPETITION_DEMO_GUIDE y revisión de seguridad PILOT.

## RC1 · cierre de revisión independiente de Claude · 2026-09-24

- `competition:check` deriva el número de migraciones del journal (F-1).
- La cookie de sesión expira con la sesión real; nunca la extiende (F-2).
- Pruebas nuevas: mensaje de migraciones, Max-Age de cookie y reintento de commit de revisión tras respuesta perdida (F-4). Motor 30/30.
- Idempotencia de creaciones no estratégicas diferida y documentada (F-3). Sin cambios de dominio, migraciones, dependencias ni marca.

## Competition MVP RC1 · 2026-09-24

- Arranque de concurso en un comando, perfil aislado, readiness de DB/migraciones y recuperación local de sesión DEMO sin elevar permisos.
- Feedback de acciones, bloqueo de doble envío y mensajes seguros ante desconexión, conflicto o sesión vencida; borrador de Decision preservado.
- Pruebas de resiliencia y smoke de boot; runbook, manifiesto RC y revisión acotada de seguridad. Sin cambios de dominio, Bible, migraciones ni dependencias.


## 2026-09-23

- Fundación documental provisional, contratos de dominio, IA, seguridad, validación y handoff.

- Registrado bloqueo de reconciliación con Product Bible y Gates no localizados.



## Reconciliación 2026-09-23

- Master Context v1.0 incorporado íntegro como consolidación aprobada; bloqueo conceptual resuelto.

- Estado y secuencia de etapas actualizados; narrativa IEBS 90 días archivada como historia.

- Contratos de dominio, UX, IA, seguridad, validación, JSON schemas, config, prompts y eval fixtures completados.

- QA transversal y handoff M1 para Codex/Claude Code.



## 2026-09-24 Foundation hardening

- Corregidos StrategicQuestion/Hypothesis/Experiment/BrandDomain estados, Assumption relationship e INFORMATIVE.

- Evidence/Recommendation/Evaluator y telemetría reconciliados con schemas y ejemplos.

- ADR status, root-level local handoff, .env.example, .gitignore y QA script.

- Final Contract Patch independiente ausente, registrado como blocker de signoff.



## 2026-09-24 Sprint 01 — preflight

- Corregido drift de Assumption in Use en Brand Context y reconciliation log según resolución humana. Bible y schemas sin cambios.

- Registrada autorización M1 sin atribuir contenido al Patch ausente.

- Foundation QA usa UTF-8 y excluye dependencias/artefactos locales; jsonschema instalado desde requirements-foundation.txt en .venv.



## 2026-09-24 Sprint 01 — núcleo M1

- Motor relacional real con versiones, human commit, concurrencia optimista, idempotencia, audit e impacto posterior recuperable.

- Migraciones PostgreSQL, sesiones DEMO, tenant/Brand, reviews ligados a impacto visto y contratos validados.

- 18 pruebas PostgreSQL/HTTP, typecheck y lint en verde; Foundation 0 errores.

- ADR-0011 decide Drizzle y boundary de sesión M1; auth final pendiente.



## 2026-09-24 Sprint 01 — cierre M1 + P0 contiguo

- Shell local con Customer, Positioning, impacto, revisión humana, contexto vigente e historial; NEXT-A–NEXT-F completados.

- Integridad referencial adicional y guards DB de autoridad humana/pointer vigente; Recommendation valida contexto y registra divergencia.

- Corregida preparación concurrente de preguntas detectada por prueba de dos pestañas, sin cambiar máquina de estados.

- 20 pruebas dominio/PostgreSQL/HTTP y 4 E2E Chrome en escritorio/móvil; typecheck/lint verdes; demo real ejecutada.

- Documentados setup, comandos, límites DEMO y handoff de revisión. No IA live, P1/P2, merge ni despliegue.



## Competition MVP · sistema visual

- Integración sobre runtime existente con tokens y assets canónicos, sin framework nuevo.

- Estados visibles en español, historial con actor y revisión explícita; drawer con foco, Escape y backdrop.

- Pruebas M1 conservadas; ampliación a cinco viewports.



## Competition MVP · vertical estratégico

- Preguntas canónicas Business/Message persistentes para marcas nuevas y existentes, sin pérdida de datos.

- Dependencias Customer/Business/Position/Message desde config v1; sin cascade.

- Blueprint de decisiones vigentes y estados de revisión; pruebas dominio y navegador ampliadas.

- Validador UI soporta --integrated: evita exigir archivos excluidos deliberadamente al copiar el kit; conserva hashes y guards visuales.



### Contexto estratégico persistente
- Añade entidades explícitas, captura humana y Context Assembler acotado, con aislamiento de Brand y trazabilidad de procedencia.

- Migra de forma aditiva sin modificar decisiones históricas; prueba límites de contexto y autorización.

### Recomendaciones DEMO trazables
- Conecta ModelGateway, evaluación y Evidence Guard con Decision Cards persistentes.
- Conserva aprobación/modificación humana y rechazo auditado; bloquea contexto obsoleto y referencias inventadas.
- Declara explícitamente alternativas fijas, soporte UNVALIDATED y proveedor real pendiente.

### Recuperación de checkpoints · aprendizaje y práctica
- Preserva dd0afdc/8e1b621 y valida instalación limpia, upgrade desde 0005 y replay sin pérdida de historial.
- Completa cancelación planeada, aceptación idempotente, presupuesto reservado y plan/fechas de Experiment mediante migración 0007 aditiva.
- Conserva Signal separado de Learning, revisión humana, práctica personal y Blueprint derivado.

### Continuación P0 · recorrido Competition MVP
- Añade home estratégica con prioridades reales y contexto que incluye aprendizajes aceptados.
- Valida intake opcional, separación multi-brand y borradores personales conservados al navegar.
- Completa Decision Card con evidencia/supuestos y refuerza foco del drawer, navegación activa y legibilidad de dependencias.
- Añade demo reproducible de cuatro decisiones, siete versiones y aprendizaje aceptado; amplía QA de navegador a 20 escenarios.
- Alinea los nuevos eventos con el catálogo y separa interpretación candidata de aceptación; conserva telemetría DEMO histórica sin reescribirla.
