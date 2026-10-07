## 2026-10-07 · PHASE 2 — STRATEGIC INTELLIGENCE · candidato

PHASE 2 — STRATEGIC INTELLIGENCE · IMPLEMENTATION COMPLETE · AUTOMATED VALIDATION COMPLETE ·
HUMAN REVIEW PENDING · BLOCKED FOR HUMAN SMOKE (contrato de IA v5 cambiado; smoke en vivo NOT RUN, sin
credencial en el entorno del agente). Rama feat/phase2-strategic-intelligence desde main dbce050. Sin merge.

Implementado ([ADR-0025](docs/14-decisions/ADR-0025.md)): proyección determinista de Strategic Intelligence
(coherencia con evaluador separado de severidad, tensiones auditables, Change Impact 2.0 explicativo, memoria
estratégica 2.0, soporte de evidencia sin probabilidades); geografía declarada en DEMO y PILOT vía motor con
scope y auditoría; contexto de onboarding visible en Objetivo/Arena/Posicionamiento sin prellenar decisiones;
Brando copiloto estratégico (prompt v5, paquete con contexto declarado e issues etiquetados); superficie
«Inteligencia estratégica» en «Qué necesita atención» que sustituye la lista duplicada de revisiones; Mapa y
PDF con coherencia; patrón global de disclosures; paneles colapsables y Modo enfoque; token
--bp-brando-emerald. Sin migración ni cambios de proveedor/modelo; Phase 3 no iniciada.

Gates (salida real, servidor DEMO aislado en 3001): typecheck PASS; lint PASS; pnpm test 14 archivos /
301 PASS; skills:check PASS; Brando browser 42/42 PASS; test:e2e 108 PASS + 2 SKIP intencionales (paneles en
tablet/móvil usan drawer) tras corregir una duplicación de botones detectada en la primera pasada (103 PASS,
5 FAIL); test:visual 10 PASS + 1 SKIP preexistente; test:pilot:e2e 10/10 PASS; Foundation 251 / 73 / 24 /
15 / 13 / 0 errores PASS; UI validator PASS; brand validator PASS; git diff --check PASS. Evals
strategic-intelligence A–H PASS (deterministas). Revisión de seguridad: sin BLOCKER/HIGH/MEDIUM.
11 capturas del espacio de trabajo y hashes actualizados (superficie de inteligencia, controles de panel,
disclosures y Brando). Smoke Anthropic: NOT RUN. Producción sin cambios; Jury Production Freeze vigente.

## 2026-10-07 · PHASE 1 COMPLETE — Strategic Core + Brando Foundation

PHASE 1 — STRATEGIC CORE + BRANDO FOUNDATION · STATUS: COMPLETE ·
RELEASE STATE: RELEASE-READY OUTSIDE PRODUCTION. Aprobada funcionalmente por el propietario.

- 9/9 decisiones implementadas: Strategic Objective, Market Arena, Primary Customer, Value Mechanism,
  Positioning, Brand Promise, Core Message, GTM Priority, Priority Experiment (ADR-0021..ADR-0024).
- Brando B1 completo para el alcance de Phase 1; autoridad humana, versiones, historial, dependencias
  (config v5), Change Impact, Strategy Graph base, Mapa estratégico y PDF.
- Historia: 5927a26 (Objective + Arena) → a2f5d9b (Brand Promise) → b461cf5 (GTM Priority) → commit
  `feat: complete Strategic Core phase 1` que contiene este registro (Priority Experiment + cierre).
  Integrado a `main` mediante PR con merge commit; los SHA finales están en `git log` y en el PR.
- Auditoría de cierre: sin defectos funcionales nuevos; se añadió `tests/phase1-closure-cases.ts`
  (versionado de las cinco decisiones nuevas, 409 sin efectos, idempotencia y reintento, criterio
  obligatorio, aislamiento entre tenants/marcas/no asignados, INV-001 y mapa/PDF de nueve decisiones).
- Gates sobre el estado exacto confirmado (salida real): typecheck PASS; lint PASS; pnpm test 13 archivos /
  283 pruebas PASS; skills:check PASS; Brando browser 42/42 PASS; test:e2e 85/85 PASS; test:visual 10 PASS
  + 1 SKIP preexistente (encoding-proof histórico, requiere base reparada: NOT APPLICABLE); test:pilot:e2e
  10/10 PASS; Foundation 249 Markdown / 72 JSON / 24 schemas / 15 requirements / 13 golden cases / 0 errores
  PASS; UI validator PASS; brand validator PASS; git diff --check PASS (sólo avisos de fin de línea).
- Producción sin cambios; sin deploy, tag, migración ni cambios de configuración. Jury Production Freeze
  vigente. Las entradas anteriores que dicen «sin commit/push/merge» describen su momento: los commits de
  cada tramo existen y Phase 1 se integra a `main` con este cierre.
- NEXT PHASE: PHASE 2 — STRATEGIC INTELLIGENCE · STATUS: NOT STARTED / AWAITING NEXT ITERATION. Fuentes:
  [brand-intelligence-engine](docs/05-ai/brand-intelligence-engine.md), Master Context y ADR vigentes.
  La próxima iteración empieza con una auditoría de Phase 2 y la ejecuta como un solo loop.

## 2026-10-07 · Experimento prioritario: dependencia GTM aprobada

Estado: RELEASE-READY FUERA DE PRODUCCIÓN en lo técnico; aceptación humana en la DEMO pendiente.
Rama: feat/strategic-experiment-priority, HEAD b461cf5 (commit local de GTM). Cambios sin commit.
El director aprobó la opción A: `config/dependencies/v5.json` añade GTM Priority → Priority Experiment
(SOFT, primera versión revisable); v1–v4 intactas. ADR-0024, change-impact, strategy-graph y config/README
actualizados.

Resultados del agente (salida real): typecheck y lint PASS; pnpm test 279/279 (tres casos nuevos: un
cambio de GTM sugiere revisar Experimento prioritario; la sugerencia conserva decisión, versión activa,
historial y estado APPROVED; el impacto por varias conexiones no duplica revisiones y reintentar no añade
filas; más primera versión de GTM); E2E m1.spec 35/35; test:pilot:e2e 10/10; Foundation 249 Markdown /
72 JSON / 24 schemas / 15 requirements / 13 golden cases / 0 errores; UI y brand validators PASS;
skills:check idéntico; git diff --check OK. Sin cambios de interfaz ni capturas en este ajuste.
Jury Production Freeze vigente. Sin commit, push, PR, merge, tag, migración ni deploy.

## 2026-10-06 · Experimento prioritario · candidato fuera de producción

Estado: RELEASE-READY FUERA DE PRODUCCIÓN en lo técnico; aceptación humana en la DEMO pendiente.
Rama: feat/strategic-experiment-priority (local), desde el commit local de GTM
b461cf5c297cc284a2cb71e765e88ecf071eec3a (sobre a2f5d9b, 5927a26 y 77e7a71). Cambios sin commit. Sin push.

Implementado ([ADR-0024](docs/14-decisions/ADR-0024.md)): modules/learning-moments v5 (Priority Experiment como
novena sección, capacidad Experimentation & Learning); decisión versionada que elige qué supuesto validar
primero, ejecutada con el ciclo Experiment → Signal → Learning existente (enlace mediante «Decisión
relacionada»), sin duplicarlo; orientación local con hipótesis sin validar y supuestos en uso; guía del
editor; ejemplo DEMO y CoffeePolis sólo en sandboxes nuevos; activación explícita para marcas existentes;
densidad compacta del menú hasta 1040px y filas de 28px para nueve fases. Sin migración ni cambios de IA,
configuración o producción. dependencies v4 sin cambios. Decisión pendiente: dependencias de Priority
Experiment (recomendado GTM Priority → Priority Experiment SOFT).

Resultados del agente (salida real): typecheck y lint PASS; pnpm test 13 archivos / 276 pruebas (271 + 5);
Brando browser 42/42; test:e2e 85/85 (una medición previa detectó 32px de desborde del menú a 1366×768
con nueve fases, corregido antes de esta pasada); test:visual 10/10; test:pilot:e2e 10/10; Foundation 249
Markdown / 71 JSON / 24 schemas / 15 requirements / 13 golden cases / 0 errores; UI y brand validators
PASS; skills:check idéntico; git diff --check OK. 11 capturas del espacio de trabajo y sus hashes
actualizados por cambio real del menú. Smoke Anthropic no requerido (sin cambio de comportamiento de IA).
/security-review requiere commit: no se creó; revisión manual sin hallazgos (sin endpoint nuevo).
Jury Production Freeze vigente. Sin push, PR, merge, tag, migración ni deploy.

## 2026-10-06 · Prioridad de lanzamiento (GTM): cierre

Estado: RELEASE-READY FUERA DE PRODUCCIÓN. El director de producto aceptó GTM y aprobó Core Message →
GTM Priority (SOFT), incorporada como `config/dependencies/v4.json` (Positioning → GTM SOFT conservada).
Pruebas tras la incorporación (salida real): typecheck y lint PASS; pnpm test 271/271 (dos casos nuevos:
revisión sugerida sin reescritura ni duplicado en Positioning → Message → GTM, y primera versión de
Mensaje después de GTM); Foundation 0 errores; git diff --check OK. Las suites de navegador, visual y
PILOT del registro anterior no se repitieron: el cambio es de configuración y pruebas de motor.
Commit local autorizado de GTM en feat/strategic-gtm-priority. Sin push, PR, merge, tag ni deploy.
Jury Production Freeze vigente.

## 2026-10-06 · Prioridad de lanzamiento (GTM) y línea del recorrido · candidato

Estado: RELEASE-READY FUERA DE PRODUCCIÓN en lo técnico; aceptación humana en la DEMO pendiente.
Rama: feat/strategic-gtm-priority (local), desde el commit local a2f5d9bd749f91106ee7beff99da4569862e7f50
(Promesa de marca, ADR-0022), sobre 5927a26 y 77e7a71. Cambios de GTM sin commit. Sin push.
El commit local de Promesa se creó por autorización expresa del propietario; la aceptación de la DEMO
de Promesa y el smoke real de Anthropic no fueron confirmados al agente y no se registran como hechos.

Implementado ([ADR-0023](docs/14-decisions/ADR-0023.md)): modules/learning-moments v4 (GTM Priority como
octava sección, capacidad GTM Prioritization); se conserva la única dependencia aprobada Positioning →
GTM (SOFT) con dependencies v3 sin cambios; activación explícita para marcas existentes; orientación GTM
que advierte propuesta provisional si Cliente, Valor, Posicionamiento o Mensaje están en revisión; guía
del editor; ejemplo DEMO y CoffeePolis sólo en sandboxes nuevos; línea del recorrido con nodos, fase
siguiente con doble anillo, pulso finito y texto accesible, sin pulso con prefers-reduced-motion.
Sin migración ni cambios de IA, configuración o producción. Decisión pendiente: aristas adicionales
hacia GTM (recomendado Core Message → GTM SOFT).

Resultados del agente (salida real): typecheck y lint PASS; pnpm test 13 archivos / 269 pruebas (264 + 5
de GTM); Brando browser 42/42 (incluye línea del recorrido y movimiento reducido); test:e2e 85/85;
test:visual 10/10; test:pilot:e2e 10/10; Foundation 248 Markdown / 68 JSON / 24 schemas / 15
requirements / 13 golden cases / 0 errores; UI y brand validators PASS; skills:check idéntico;
git diff --check OK. 11 capturas del espacio de trabajo y sus hashes actualizados por cambio real del
menú. Smoke Anthropic no requerido (sin cambio de comportamiento de IA). /security-review requiere
commit: no se creó; revisión manual sin hallazgos (sin endpoint nuevo). Jury Production Freeze vigente.
Sin push, PR, merge, tag, migración ni deploy.

## 2026-10-06 · Promesa de marca: contexto de revisión de Mensaje y validación completa

Estado: listo técnicamente fuera de producción; pendiente aceptación del propietario en la DEMO local
y smoke real de Anthropic (la clave no está disponible en el entorno del agente; procedimiento humano).
Rama: feat/brand-promise. HEAD: 5927a262e5f2827d4c0936fb62ea13082ea63f58. Cambios de Promesa sin commit.

Corrección: cuando un cambio de Promesa se integra en la revisión pendiente de Mensaje (sin duplicarla),
la revisión muestra «También cambió mientras esta revisión estaba pendiente» con la versión vigente de
Promesa, su texto, criterio y tipo de dependencia, junto al cambio de Posicionamiento que la originó; la
orientación de Brando incluye ambos. Proyección de lectura, sin estados ni filas nuevas. El comprobante
de revisión liga además las versiones vigentes de las decisiones conectadas: un comprobante abierto antes
del cambio de Promesa se rechaza (409) y la persona reabre la revisión. Historial y razones intactos;
Mensaje no se reescribe ni se aprueba solo. ADR-0022 y change-impact actualizados.

Resultados del agente (salida real): typecheck y lint PASS; pnpm test 264/264 (incluye regresión de
contexto completo y no duplicación); Brando browser 40/40; test:e2e 84/85 en la pasada completa: la
prueba «DEMO recommendation can be rejected» falló en tablet por clic inestable con 16,6 min de reloj
(posible suspensión del entorno) y pasó 10/10 al repetirla dos veces en los cinco proyectos; la E2E nueva
de contexto de Mensaje pasó 5/5. test:visual 10/10 sin cambio visual real (no se actualizaron capturas
ni hashes); test:pilot:e2e 10/10; Foundation 247 Markdown / 66 JSON / 24 schemas / 15 requirements /
13 golden cases / 0 errores; UI y brand validators PASS; skills:check idéntico; git diff --check OK.
/security-review requiere commit: no se creó; revisión manual sin hallazgos (consultas limitadas por
workspace y marca, sin endpoint nuevo). Sin push, PR, merge, tag, migración ni deploy.
Jury Production Freeze vigente.

## 2026-10-06 · Promesa de marca · candidato fuera de producción

Estado: listo técnicamente fuera de producción; cierre RELEASE-READY pendiente de la aceptación del
propietario en la DEMO local. Rama: feat/brand-promise (local), creada desde el commit local
5927a262e5f2827d4c0936fb62ea13082ea63f58 (Objetivo y Arena, ADR-0021) sobre 77e7a71. Sin push.
Decisiones aprobadas 1–6 y [ADR-0022](docs/14-decisions/ADR-0022.md).

Implementado: config v3 (journey con Brand Promise entre Posicionamiento y Mensaje; Brand Thinking;
Brand Promise → Core Message HARD revisable en primera versión; Posicionamiento → Promesa y
Posicionamiento → Mensaje sin cambios); regla que evita revisiones duplicadas cuando una revisión
pendiente igual o más fuerte ya cubre un cambio propagado; activación explícita reutilizada (lista
dinámica de secciones faltantes); menú 06 Promesa / 07 Mensaje; guía del editor y orientación Brando;
Promesa demo en sandboxes CoffeePolis nuevos; densidad compacta del menú hasta 940px de alto para
conservar la columna completa en 1440×900. Sin migración ni cambios de IA, configuración de despliegue
o producción. La revisión de Mensaje se crea en la primera versión de la Promesa, no al agregar la
sección (un ReviewItem exige versión que lo origine).

Resultados del agente (salida real): typecheck y lint PASS; pnpm test 13 archivos / 263 pruebas
(257 + 6 de Promesa); Brando browser 40/40; test:e2e 80/80 tras el ajuste de CSS (una pasada previa
79/80: la prueba de siete fases superó 60s en móvil sin fallar aserciones; se le asignó test.slow()
y su spec pasó 20/20); test:visual 10/10; test:pilot:e2e 10/10; Foundation 247 Markdown / 66 JSON /
24 schemas / 15 requirements / 13 golden cases / 0 errores; UI y brand validators PASS; skills:check
idéntico; git diff --check OK. Capturas: se actualizaron las mismas 11 del espacio de trabajo y sus
hashes. /security-review requiere commits: no se creó ninguno; revisión manual sin hallazgos de
seguridad. Límite funcional registrado: mientras la revisión de Mensaje siga pendiente, un cambio de
la Promesa se integra en ella sin abrir otra. Sin prueba con IA real.
Aceptación del propietario en la DEMO: pendiente. Jury Production Freeze vigente.
Sin push, PR, merge, tag, migración ni deploy; cambios de Promesa sin commit.

## 2026-10-06 · Objetivo estratégico y Arena de mercado: cierre

Estado: RELEASE-READY FUERA DE PRODUCCIÓN.
Rama: feat/strategic-objective-market-arena. Base y HEAD: 77e7a71a909f4b59cea491590a4a09161855b2fd.
Este registro supera el único pendiente del registro anterior (aceptación funcional).

El propietario confirmó la aceptación funcional en la DEMO local. Este registro no detalla qué
recorridos recorrió: sólo consta su aceptación. Los resultados de pruebas son los ya registrados
abajo con salida real (pnpm test 257/257, test:e2e 80/80, Brando browser 38/38, test:visual 10/10,
test:pilot:e2e 10/10, Foundation 0 errores, UI y brand validators PASS) y las comprobaciones
documentales de este cierre. Alcance, decisiones D1–D9 y limitaciones sin cambios: sin prueba con
IA real; /security-review no ejecutable sin commits (revisión manual registrada); «Agregar estas
secciones» verificado sólo por pruebas automáticas; posibles revisiones encadenadas en marcas
existentes (D3). Sin cambios de código ni capturas en este cierre.

AI proposes. Humans decide. Brandopolis remembers.
Jury Production Freeze vigente. Release-ready no autoriza deploy.
Sin commit, push, PR, merge, tag, migración ni deploy.

## 2026-10-06 · Objetivo y Arena: capturas y gates de cierre

Estado: NOT RELEASE-READY; único criterio pendiente: aceptación funcional humana en la DEMO local.
Rama: feat/strategic-objective-market-arena. Base y HEAD: 77e7a71a909f4b59cea491590a4a09161855b2fd.
Este registro supera los pendientes técnicos del candidato anterior del mismo día.

Por autorización explícita del propietario se actualizaron sólo estas 11 capturas automáticas y sus
hashes/bytes en design/brandopolis-ui/specs/brand-assets.json: m1-workspace, m1-needs-review,
m1-guided-review, blueprint e history (desktop y mobile) y decision-card-desktop. Login, acceso y
portada no se tocaron. Generadas por pnpm test:visual (10/10) contra la DEMO local.

Gates del agente tras la actualización (salida real): typecheck y lint PASS; pnpm test 257/257;
Foundation 246 Markdown / 63 JSON / 24 schemas / 15 requirements / 13 golden cases / 0 errores;
UI validator PASS; brand validator PASS; skills:check idéntico; git diff --check OK. Sin cambios de
código desde la ejecución anterior de test:e2e 80/80, Brando browser 38/38 y test:pilot:e2e 10/10.
Diff completo revisado: index.html sólo cambia el menú; ningún archivo de despliegue o producción.
/security-review sigue requiriendo commits; no se creó ninguno. Revisión manual registrada arriba.
Aceptación funcional del propietario en la DEMO: pendiente. Sin prueba con IA real.
Jury Production Freeze vigente. Sin commit, push, PR, merge, tag, migración ni deploy.

## 2026-10-06 · Objetivo estratégico y Arena de mercado · candidato fuera de producción

Estado: NOT RELEASE-READY; implementación y gates técnicos completos, pendiente aceptación humana.
Rama: feat/strategic-objective-market-arena. Base: 77e7a71a909f4b59cea491590a4a09161855b2fd.
Alcance aprobado por el propietario (D1–D9; D3 opción B; D4 acción explícita): ADR-0021.

Implementado: config v2 (modules/journey, learning-moments, dependencies con ruleVersion por regla);
seis secciones en marcas nuevas, entrada por Objetivo; acción explícita «Agregar estas secciones»
(POST /api/brands/strategic-sections, idempotente, sin escrituras al leer contexto); impacto de
primera versión sólo para las cuatro reglas nuevas, con dependencias sincronizadas antes del cálculo
y sin aristas duplicadas; orientación Brando y guía del editor; DEMO y sandbox nuevo en orden canónico.
Sin migración, sin cambios de proveedor, modelo, prompts, schemas ni datos enviados a la IA.

Resultados del agente en Windows (salida real): typecheck y lint PASS; pnpm test 13 archivos /
257 pruebas PASS (base previa 247; +10 casos ADR-0021); Brando browser 38/38; test:e2e 80/80
(primera pasada 60/80 antes de actualizar pruebas al contrato de seis secciones); test:visual 10/10;
test:pilot:e2e 10/10; Foundation 246 Markdown / 63 JSON / 24 schemas / 15 requirements / 13 golden
cases / 0 errores; UI validator PASS; brand validator PASS; skills:check idéntico; git diff --check OK.
/security-review no pudo ejecutarse (requiere origin/HEAD y commits); revisión manual de seguridad
del endpoint sin hallazgos. Capturas canónicas: las 11 del espacio de trabajo cambian con el menú,
pero sus hashes están en specs/brand-assets.json; se restauraron y queda pendiente decisión humana
que nombre esos archivos. Sin prueba con IA real. Jury Production Freeze vigente.
Sin commit, push, PR, merge, tag ni deploy.

## 2026-10-05 · Brando review choice: cierre validado en Windows

Estado: RELEASE-READY FUERA DE PRODUCCIÓN.
Rama: fix/brando-review-choice.
Base: fe5b4a64a904b8bda989220e51014adff1c15670.
Este registro supera los pendientes del candidato anterior.

El operador confirmó el bloque inicial completo: typecheck, lint, pruebas
unitarias/integración, Brando browser, Foundation, validador UI y formato.
Confirmó posteriormente E2E general, visual y PILOT local.
Foundation: 245 Markdown, 60 JSON, 24 schemas, 15 requirements,
13 golden cases y 0 errores. UI validator: PASS.
No se inventan totales de pruebas no compartidos.

La corrección está presente en el archivo y en el código servido localmente.
El operador aceptó el recorrido con IA real: elegir una propuesta prepara
Modificar en la revisión sin requerir otra edición del texto.
El criterio mínimo y la confirmación humana siguen siendo obligatorios.
Se conserva la selección del mismo borrador durante el repintado.
No se afirma validación universal de respuestas futuras de IA.

Sin cambios de proveedor/modelo, esquemas, migraciones ni assets.
AI proposes. Humans decide. Brandopolis remembers.
Jury Production Freeze vigente. Sin commit, push, merge ni deploy.

## 2026-10-05 · Brando: selección de Modificar al preparar revisión

Base: fe5b4a64a904b8bda989220e51014adff1c15670. Rama: fix/brando-review-choice.
Corrección solicitada por el propietario tras recorrido local con IA real.
Estado: NOT RELEASE-READY; pendientes regresiones Windows y aceptación local.

Aceptar o Modificar una alternativa estratégica de Brando selecciona Modificar en el
formulario cuando existe revisión pendiente. La selección se conserva durante el repintado
del mismo borrador, incluida una elección humana posterior de Mantener sin cambios.
No hay commit automático; siguen requeridos criterio de al menos diez caracteres,
confirmación humana, revisión autorizada, concurrencia y versión nueva en el motor.
No se cambian proveedor, presupuesto, esquemas, migraciones ni assets.

Agente: typecheck, lint y sintaxis JS PASS; 12 pruebas de proyección/presencia/encoding PASS.
Foundation: 245 Markdown / 60 JSON / 24 schemas / 15 requirements / 13 golden cases / 0 errores.
UI validator y formato PASS.
Cuatro nuevos casos browser (Aceptar/Modificar, desktop/mobile) preparados; intento bloqueado
por Chrome ausente. No se afirma ejecución aprobada ni nueva inferencia del agente.
Pendientes: pnpm test, Brando browser, E2E general, visual, PILOT y aceptación local.
Jury Production Freeze vigente. Sin commit, push, merge, deploy ni cambios de producción.

## 2026-10-05 · Brando por sección: cierre técnico validado en Windows

Estado: RELEASE-READY FUERA DE PRODUCCIÓN.
Rama: feat/brando-contextual-sections.
Base: b6d2ca1f652e6880e14912436816634ec7422700.
Este registro supera los pendientes del candidato anterior.

El operador confirmó el bloque inicial completo: typecheck, lint, skills:check,
pruebas unitarias e integración, Brando browser, Foundation y formato.
Confirmó el recorrido DEMO y compartió capturas de tarjeta y panel.
Las regresiones generales y visuales completaron antes del fallo de arranque PILOT.
PILOT pasó posteriormente usando la base local del perfil aislado.
Foundation: 245 Markdown, 60 JSON, 24 schemas, 15 requirements,
13 golden cases y 0 errores. UI validator: PASS.
No se inventan totales de pruebas no incluidos en la salida compartida.

La revisión de esta fase utiliza respuestas DEMO. No se afirma una nueva
prueba con IA real ni validación semántica de todas las respuestas futuras.
Proveedor, modelo y controles existentes de B1 permanecen sin cambios.

AI proposes. Humans decide. Brandopolis remembers.
Jury Production Freeze vigente. Sin commit, push, tag, merge ni deploy.
Este cierre no autoriza cambios de producción.

## 2026-10-05 · Brando contextual por sección · candidato fuera de producción

Base canónica verificada por fetch: b6d2ca1f652e6880e14912436816634ec7422700.
Rama: feat/brando-contextual-sections. Alcance aprobado por el propietario.
Estado: NOT RELEASE-READY; pendientes pruebas Windows y aceptación visual.

Orientación compacta en las cuatro secciones actuales, desde el estado registrado y sin inferencia
por navegación. Prioriza impacto, invalidación y revisión; muestra versión/criterio del cambio
conectado cuando están disponibles. Consulta explícita mediante askBrando existente, respuesta
reutilizable sólo en el mismo contexto y con tickets vigentes. Sin cache persistente, consultas
automáticas ni reintentos. Borrador humano preservado. Acciones vencidas deshabilitadas; servidor
mantiene autoridad. Rechazo no reaparece como propuesta accionable al repintar la conversación.
ADR-0020 registra el contrato. Sin cambios de proveedor/modelo, presupuesto, datos enviados,
esquemas, migraciones, endpoints, motor estratégico ni assets canónicos.

Agente: typecheck y lint PASS; 153 pruebas sin DB PASS en 12 archivos (incluyen cinco casos nuevos
de orientación/expiración). Suite completa intentada: esas 153 PASS, 94 casos DB no ejecutados porque
embedded-postgres rechaza usuario raíz. Intento de usuario no privilegiado bloqueado por el entorno.
Brando browser intentado: Chrome ausente; descarga de Chromium no disponible. No se afirma PASS
ni inspección visual. Nuevos casos de navegador cubren navegación sin consultas, ámbito correcto,
reutilización, borrador, expiración, respuesta tardía y contexto cambiado.
Foundation: 245 Markdown / 60 JSON / 24 schemas / 15 requirements / 13 golden cases / 0 errores.
UI validator PASS; Brand Master validator PASS (58 assets / 19 mappings); skills:check PASS;
formato del diff PASS. Estos validadores no sustituyen las regresiones ni la aceptación visual.
Pendientes: suite DB, Brando browser, E2E general, visual, PILOT browser y revisión humana local.

Jury Production Freeze vigente. Sin commit, push, tag, merge, deploy ni operaciones de producción.

## 2026-10-05 · Brando B1: cierre revisado fuera de producción

Estado: RELEASE-READY FUERA DE PRODUCCIÓN.
Rama: feat/brandopolis-intelligence-brando-b1.
Base local revisada: 83ed1ecb8f63374713ee4759cbcbab32bf4a97f7.

Se revisó el paquete exacto enviado por el operador. Los archivos de código
coincidieron con la copia del agente. Se corrigió la clasificación del registro:
aceptar y después editar la propuesta se registra como modificación al confirmar.
La elección explícita de Modificar conserva esa clasificación. El criterio,
la nueva versión y el impacto continúan sujetos a confirmación humana.

El operador confirmó el bloque posterior a la corrección: typecheck, lint,
pruebas unitarias e integración, test:e2e, test:pilot:e2e, Foundation y formato.
Foundation: 244 Markdown, 60 JSON, 24 schemas, 15 requirements,
13 golden cases y 0 errores. Los totales de las demás pruebas no se inventan.
Las regresiones visuales anteriores permanecen aplicables: esta corrección
modificó el registro del servidor, sus pruebas y documentación.

La prueba local con IA real fue confirmada por el operador. Las claves,
sesiones, datos DEMO y lanzadores temporales permanecen fuera del commit.
Las referencias válidas no certifican por sí solas la calidad de cada respuesta.

El propietario autorizó únicamente el commit local de estos cambios.
Jury Production Freeze vigente. Este cierre no autoriza push, merge, tag,
deploy, migraciones ni cambios de producción.

## 2026-10-05 · Final review: classify edited Brando proposals correctly

Reviewed operator archive based on 83ed1ecb8f63374713ee4759cbcbab32bf4a97f7.
Finding: choosing Accept and then editing the draft incorrectly recorded ACCEPT in
practice and audit. The server now compares the confirmed choice with the issued
proposal and records MODIFY when they differ (ignoring outer whitespace).
Explicit Modify remains MODIFY. Human confirmation, stored choice, dependency impact
and the original idempotency fingerprint stay unchanged. No migration or production action.
Three regression cases cover unchanged acceptance, edited acceptance and explicit modification,
including successful replay without duplicate practice. Windows integration/E2E/PILOT gates
for this correction are pending; this follow-up is not yet release-ready.
Agent: typecheck, targeted lint, 19 non-DB Brando tests and Foundation PASS.
The three new database cases have not run in the agent environment.

## 2026-10-05 · Brando: validación funcional local confirmada

El operador confirmó pruebas exitosas de consultas contextuales, generación de
posibilidades y revisión de decisiones afectadas por cambios en dependencias,
en la marca DEMO local con proveedor Anthropic.

Dos consultas anteriores registraron outcome OK, schemaValid true y
referencesValid true. El lanzador temporal corregido pasó 10 pruebas del agente:
rutas permitidas, aislamiento de marca, límite compartido, concurrencia,
confirmación humana y diagnósticos diferenciados.

El bloqueo de generación de posibilidades provenía de la lista de rutas del
lanzador temporal. Su corrección permanece en .local, fuera del producto versionado.
El operador confirmó que las pruebas posteriores fueron exitosas. Esta confirmación
funcional no sustituye las regresiones automáticas previamente documentadas.

Rama: feat/brandopolis-intelligence-brando-b1.
Último commit local comunicado por el operador: 83ed1ec.
Las extensiones posteriores siguen pendientes de revisión final y nuevo commit.
La inspección del operador reportó 25 archivos modificados, 12 nuevos y comprobación
de formato sin errores. No se observaron archivos temporales en esa lista.

AI proposes. Humans decide. Brandopolis remembers.
Aceptar o modificar exige confirmación humana y criterio; el sistema conserva
versiones y calcula impacto, sin aprobar automáticamente las decisiones dependientes.

Jury Production Freeze vigente. Sin nuevo commit, push, tag, deploy, migraciones
ni cambios de configuración o infraestructura de producción.

## 2026-10-05 · Brando exact source citations

Operator live diagnosis: two HTTP 200/end_turn outputs passed schema but failed reference
validation. Add per-request source-ID enum for Brando v2 structured output and prompt v4.
Local reference guard remains unchanged; no extra inference, migration or production action.
Agent: typecheck/lint, 148 non-DB tests and Foundation PASS. Candidate remains not release-ready
until bounded live verification and required Windows gates pass.

## 2026-10-05 · Brando selection-first candidate

Authorized non-production follow-up to human-review patch. Panel-only per-proposal actions;
selected draft and human criterion in workspace; evidence advice navigates to sources. New
answer schema v2 and prompt v3 preserve prior versions. No migration or production operation.
Agent: typecheck/lint, 148 non-DB tests, Foundation and UI validator PASS. Windows full gates
remain pending; previous 16-case Windows PASS applies only to its baseline.
No new commit/push/deploy. Candidate is not release-ready.

# Brando B1 · human proposal review and expressive states candidate (2026-10-05)

Previous B1 candidate was committed locally by the Windows operator; SHA not yet pasted.
Agent checkout remains based on main 03dbd212e20e65ba0a575143d12fa8a6048b52c8 with prior
changes uncommitted. This follow-up patch is relative to the final-record candidate files.
Human confirmed the scoped suggestion stripe in a local real-provider test screenshot; the
provider outcome log was not pasted, so no additional live semantic PASS is claimed.

Authorized corrections: visible Pensando control, original consulting/ready poses, more
frequent finite Idle motion and simple Spanish without technical enums. Human clarified
Accept must change strategy: Accept/Modify therefore use existing final human commit, new
version and normal dependency impact; Reject records practice/criterion only. Criterion for
Accept/Modify is recorded once inside successful commit. No automatic Learning or score.
Opaque suggestion proof is bounded, expires and is actor/brand/workspace scoped. Existing
tables are reused, no migration. Prompt v2, new input schema and ADR-0018 document contracts.

Candidate requires new full Windows database/invariant, Brando browser, E2E, visual and PILOT
gates plus human UX review. Previous release-ready status does not cover this new extension.
No new commit, push, PR, merge, tag, deploy or production access. Jury freeze unchanged.

---

# Brando B1 · final Windows validation and human navigation acceptance (2026-10-05)

State: RELEASE-READY OUTSIDE PRODUCTION. Branch: feat/brandopolis-intelligence-brando-b1.
Base HEAD: 03dbd212e20e65ba0a575143d12fa8a6048b52c8. Candidate remains uncommitted.
This entry supersedes pending-validation statements in earlier dated candidate records.

Operator confirmed the attention patch block completed: typecheck, lint, eight Brando
browser cases and whitespace validation. Human then confirmed the three local DEMO checks:
one left gem/attention entry, central attention summary, and separate right query drawer.
Earlier human feedback accepted drawer opening, Idle behavior and predefined-query answers.
No broader subjective acceptance of every operational animation is inferred.

Operator subsequently reported the final stop-on-failure block completed successfully:
typecheck, lint, skills:check, full unit/integration suite, test:e2e, test:visual,
test:pilot:e2e, Foundation, integrated UI validator and git diff --check. The pasted final
output explicitly reports Foundation 237 Markdown / 58 JSON / 22 schemas / 15 requirements /
13 golden cases / 0 errors, UI VALIDATION: PASS, and final-block success. Exact browser and
unit totals for this final run were not pasted and are not invented here.

AI proposes. Humans decide. Brandopolis remembers. Section suggestion stripes reuse an
explicitly requested scoped answer; navigation never requests inference. Proactive section
suggestions remain outside B1 and require a separately agreed phase.

Jury Production Freeze remains active until explicit human authorization. No production
access, deploy, tag, infrastructure/configuration change or production migration. No commit,
push, PR or merge performed. Each release operation requires its own human authorization.

---

# Brando B1 · unified attention entry (2026-10-05)

Operator reported the five navigation regression cases and remaining automatic validation
passed after nav-fit. Human accepted drawer opening, Idle motion and predefined-question
answers in the local DEMO. This does not imply acceptance of every animation or new live AI
semantic evaluation.

Human requested one left entry: Brando portrait + Qué necesita atención opens the existing
attention summary. Removed the duplicate left drawer trigger; the right card retains query
drawer behavior. No motion, engine, provider, schema, migration or production change.
Updated browser flow asserts distinct destinations and no automatic POST on navigation.
B1 section suggestions reuse explicitly requested scoped answers; proactive suggestions
on section entry remain a separately agreed future phase.

This follow-up awaits Windows browser regression and human verification of the left entry.
No commit, push, merge, tag, deploy or production access.

---

# Brando B1 · laptop navigation regression correction (2026-10-05)

Operator reported the drawer candidate initial block passed. Full E2E then had 76 PASS and
4 FAIL: existing navigation reachability test at 1366x768 with fine pointer requires no sidebar
scroll. Adding the Brando entry exceeded that height. Visual/PILOT commands after E2E did not
run because the operator block stopped at the failure.

Correction changes only product-responsive.css: <=860px height and fine pointer use denser
navigation spacing, >=32px ordinary targets, 44px Brando entry with 32px image, and 36px
learning entry. All labels, groups, links and principle remain. Touch targets/rules are unchanged.
Existing failing tests were not edited, skipped or weakened.

Reproduced in a same-origin 1366x768 preview frame using actual assets and synthetic data:
before nav clientHeight=684/scrollHeight=795; after 684/684. Mapa estratégico bottom=579.75,
height=32; full principle bottom=655.28125, within panel bottom=768. Browser preview evidence
does not replace Windows real-server regression gates. Targeted five-project navigation rerun
comes first; release remains blocked until required gates and human motion/layout acceptance.
No production access, commit, push, merge, tag, deploy or baseline refresh.

---

# Brando B1 · drawer/motion correction awaiting Windows review (2026-10-05)

The operator reported prior visual candidate full tests 228/228, Brando browsers 6/6,
Foundation/UI/brand validators PASS, followed by PRUEBAS RESTANTES DE BRANDO VISUAL APROBADAS.
Human visual review then REJECTED its long/subtle idle, unnatural attitude image swaps and
poor central modal. Those test results do not approve the visual design or this correction.

Authorized correction: contextual right slide drawer, small nonhumanized stable gemstone,
more expressive finite motion and an additional left navigation presence above attention.
Implemented drawer with current decision/rationale, counts, existing attention navigation,
evidence/hypothesis previews, and persistent composer; same scoped transient conversation.
One image across states prevents shape changes; gestures finish naturally at neutral, rest
interval 8–12s. No provider query on opening, no strategic mutations or backend/config changes.

See docs/15-handoff/BRANDO_B1_DRAWER_REVIEW_2026-10-05.md for actual checks and limits.
NOT RELEASE-READY: new Windows gates and human animation/layout acceptance remain pending.
No commit/push/PR/merge/tag/deploy. Jury Production Freeze remains active.

---

# Brando B1 · visual integration awaiting Windows gates (2026-10-05)

The human authorized the supplied emerald/gold gem and right-rail mockup: small transparent
portraits, expressive finite state animations, occasional idle motion, no intrusion or redesign.
The previous RELEASE-READY verdict below applies to the contextual core before this visual
follow-up; the expanded visual candidate is **NOT YET RELEASE-READY**.

Implemented a compact rail card above Contexto vigente, the same accessible entry relocated
above the decision on narrow screens, original-source-derived alpha WebP portraits, finite
state motion and a 35–65 second resting interval. Reduced motion, explicit pause, offscreen,
inactive-tab and modal guards apply. A removable tentative suggestion appears only after an
authorized contextual response; pending/failed queries hide that strip. No automatic model
query, strategic write, model/configuration change, database/schema/migration or deployment.

Agent checks: typecheck/lint, 141 non-database tests, Foundation, Skill Pack mirror,
UI validator and whitespace. Desktop browser inspection used actual frontend assets with
synthetic preview API fixtures; it does NOT substitute for real-server/browser/database gates.
Operator Windows full tests, E2E/visual/PILOT and expanded Brando browser suite plus human
portrait/motion acceptance remain pending. See docs/15-handoff/BRANDO_B1_VISUAL_REVIEW_2026-10-05.md.
All work remains uncommitted; Jury Production Freeze remains fully active.

---

# Brando B1 · RELEASE-READY outside production (2026-10-04)

Human Windows execution completed the live-smoke block, including typecheck, lint, full
unit/database tests, Foundation and whitespace checks after adding the harness tests.
Earlier runtime/browser gates: E2E 80/80, PILOT 10/10, Brando 4/4, visual 10 PASS / one
existing historical encoding-backup SKIP, integrated UI validator PASS, Skill Pack mirror PASS.
Desktop DEMO screenshots and conversation clearing were reviewed with the operator.

Human-only synthetic-context Gateway smoke: ANTHROPIC / claude-opus-5-5,
brando-contextual-v1, outcome OK, schemaValid=true, referencesValid=true;
19,185 ms, 3,195 input tokens and 1,786 output tokens. The supplied answer was compared
with its synthetic sources: current versus superseded decision and rationale are accurate;
fictitious evidence/limits are disclosed; Positioning and willingness-to-pay attention are
identified; new hypotheses/questions/suggestions are tentative and require human decisions.
No invented market/revenue numbers or autonomous approval appeared. The operator procedure
reported temporary credential cleanup. No credential was shared with the agent.

Verdict: **RELEASE-READY OUTSIDE PRODUCTION** for the scoped contextual B1 candidate.
This single live sample does not establish quality across all brands, semantic entailment
for every generated claim, or live server end-to-end behavior. Existing automated boundary
coverage and documented residual limitations remain applicable. No zero-risk certification.
All changes remain uncommitted on feat/brandopolis-intelligence-brando-b1 based on
03dbd212e20e65ba0a575143d12fa8a6048b52c8. Commit/push/PR/merge/tag/deploy are not performed.
Jury Production Freeze remains active; this verdict authorizes no production operation.

---

# Brando B1 · DEMO reviewed, live smoke prepared (2026-10-04)

Human desktop screenshots show the real contextual dialog, DEMO-labelled answers, recorded
reasons and expandable numbered sources. Human confirmed conversation clearing works.
This validates DEMO presentation, not live semantics. The human identified the existing model
as Opus 5.5; their credential-authenticated read-only Models API returned `claude-opus-5-5`.
No credential was supplied to the agent. No production provider/configuration was changed.

Prepared `scripts/brando-ai-smoke.ts`: one B1 Gateway invocation using a synthetic brand,
current/history distinction, fictitious interview evidence, unvalidated hypothesis and pending
questions. No DB/server access or persistence; operator-provided key/model only; existing SDK
retry/output policy reused. Full response/synthetic sources printed for human semantic review;
schema and reference validation are technical checks, not proof of strategic correctness.
Two additional fixture tests pass; local non-DB count now 138/138, typecheck/lint pass.
The human will run the live query locally. **Live result and final release verdict pending.**

---

# Brando B1 · automated gates complete, human review pending (2026-10-04)

Human-provided Windows execution evidence for the current worktree: full unit/database suite
223/223 PASS (latest unit run before the final test-only outage assertion); E2E 80/80 PASS;
visual 10 PASS / 1 historic encoding-backup SKIP; final local PILOT HTTPS/OIDC 10/10 PASS;
final Brando desktop/mobile fixture 4/4 PASS; Foundation zero errors and integrated UI validator
PASS. The final block reached its success message, including typecheck, lint and whitespace gates.
Skill Pack byte-identical mirror was verified earlier and its files were not changed.

No failing automatic gate remains. Historic encoding skip is the existing documented condition,
not a new exclusion. **Human visual acceptance remains pending; real-provider semantic smoke
has not been performed.** Current state: verified non-production candidate, not final release-ready.
No commit/push/PR/merge/tag/deploy. Jury Production Freeze remains active.

---

# Brando B1 · PILOT outage proof follow-up (2026-10-04)

New Windows log: unit/database suite **223/223 PASS**; scoped PILOT selectors allow all five
OIDC keyboard/revocation cases to pass. Remaining five HTTPS cases reach the real unavailable
fixture provider and stop at a stale expected notice string. The current notice explicitly
allows a human response/retry. Test now asserts that exact safe notice, the actual unavailable
provider result, and unchanged decisions/versions across the failed generation. Human commit,
brand isolation, feedback and logout checks remain. No runtime change.

Updated HTTPS/PILOT verification and final checks remain pending; **not release-ready**.
Production remains frozen. No commit/push/merge/deploy authorization inferred.

---

# Brando B1 · browser gates follow-up (2026-10-04)

Windows evidence after UI fix: focused compact/mobile regression **4/4 PASS**; full existing
E2E **80/80 PASS**; visual **10 PASS, 1 SKIP** (historic encoding repair has no local backup;
its test explicitly requires that pre-existing artifact). PILOT local HTTPS/OIDC browser suite
**10 FAIL** at initial ambiguous access-link selectors; none reached its protected-flow checks.
The same unscoped selectors exist at the pinned main SHA; this is not a new production fault.
The latest uploaded log starts at the E2E summary, so it does not independently show the
preceding typecheck/lint/unit outputs. Earlier initial-patch evidence remains recorded below.

Test-only follow-up scopes OIDC access to #pilot-entry, navigates the keyboard login proof to
/login and scopes feedback assertions to #notice, preserving authentication, tenant isolation,
provider outage, keyboard, revocation and logout assertions. No runtime or config modification.
Updated PILOT checks, final Foundation/UI validation and human visual review remain pending.
**Not release-ready. No deployment authorization.**

---

# Brando B1 · local verification follow-up (2026-10-04)

User-reported Windows evidence on the dedicated worktree: typecheck, lint, Skill Pack,
Foundation (zero errors) and diff checks PASS; full unit/DB suite **223/223 PASS**;
Brando desktop/mobile fixture **4/4 PASS**. Existing E2E **78/80 PASS**, then focused rerun
**3/4 PASS**: compact progress status reproducibly starts at y=823.36 in an 800px viewport.
Mobile hover failed once and passed the focused rerun. Visual/PILOT browser checks did not run
because the command block stopped at the E2E failure.

Follow-up: activity start now brings the adjacent local status into view after revealing the
panels; hover assertion waits for the observable CSS colour transition without weakening its
contrast or interactivity checks. These updated browser paths **await Windows verification**.
All counts above describe the initial patch, not proof that this follow-up passes.
No screenshots/baselines, database schema, migration, production or deployment changes.
Verdict remains **not release-ready**. Jury Production Freeze remains active.

---

# Brando B1 contextual · implementation candidate (2026-10-04)

Human-approved plan implemented on local branch `feat/brandopolis-intelligence-brando-b1`, based on
`main` `03dbd212e20e65ba0a575143d12fa8a6048b52c8`. **Uncommitted; not release-ready; outside production.**
Jury Production Freeze remains active. No commit, push, PR, merge, tag, deploy, production operation,
new migration, database schema or dependency change.

B1 adds a scoped contextual read path through the Gateway, structured answers and source guards,
read-derived attention, context freshness checks, a temporary dialog and separate query telemetry.
No conversation writes strategy or invalidates recommendations. Contracts and data boundaries:
[Brando B1](docs/05-ai/brando-b1.md), [ADR-0017](docs/14-decisions/ADR-0017.md).

Validation: typecheck/lint PASS; 136 non-DB tests PASS. Full suite NOT PASS: 87 DB-dependent tests
blocked by PostgreSQL refusing root in this UID-0-only container. Chrome launch blocked by Unix socket
permissions; new fixture's 4 browser tests did not execute; existing E2E/visual/PILOT suites not run.
Foundation zero errors; UI static validator PASS; Skill Pack mirror check PASS via node --import tsx
(the pnpm wrapper itself is blocked by Unix IPC); diff whitespace clean. No real-provider smoke.
Full findings and local completion procedure: [B1 review](docs/15-handoff/BRANDO_B1_REVIEW_2026-10-04.md).

---

# Session State

Current phase: **JURY PRODUCTION FREEZE / NEXT-PHASE PREPARATION** (2026-10-04).

Human decision: Brandopolis PILOT may be reviewed by a jury during the next approximately 15 days.
Production is therefore jury-critical and remains stable until the human explicitly lifts this gate;
there is no automatic expiration date. The canonical rule is
[CLAUDE.md § Jury production freeze](CLAUDE.md#jury-production-freeze--2026-10-04).

- Engineering Skill Pack is integrated in `main` through PR #2; merge commit
  `f36fdf85c317d26742b351689764a53a733713be`. This governance work did not deploy anything.
- The next development phase may proceed on dedicated branches/non-production environments. Its default
  finish state is **release-ready outside production**, not deployed.
- Commit, push, PR, merge or a green review never implies permission to deploy. Any production deploy,
  migration/schema change, production config/OIDC/secrets/DNS/hosting/runtime behaviour or asset change
  requires a separate explicit human authorization.
- During the jury window, a production exception is limited to a reproducible availability/access
  defect or confirmed security/auth/authz/tenant-isolation/data-exposure defect. No feature or polish may
  ride with the fix.
- Before any authorized exception reaches production: pin the SHA, run every applicable quality/security
  gate, review the exact diff, prepare rollback/backup when relevant, define production smoke checks, and
  verify immediately after deploy. Any failed gate stops the release.
- The exact production build remains whatever is recorded by the latest verified production entry below;
  do not infer deployment from `main`.

Gate for this entry: documentation/governance only. No runtime, schema, migration, configuration,
infrastructure, tag or deployment change.

---

Current phase: **SKILL PACK POST-REVIEW HARDENING** (2026-10-04). Branch
`chore/brandopolis-engineering-skills` on top of 65a6a9a. Uncommitted. Fixes from the local `/code-review`
of `main...HEAD` (findings 1–10, 12–15) plus a final controlled pass. Deferred and registered in
[known-risks](docs/15-handoff/known-risks.md): Skill Pack routing gaps (one-way routing between
feature/security/brando, no coverage for document upload and parsing) and handoff-doc debt.


- Review: typecheck, lint and test are the baseline for every change except historical records; the
  matrix only adds checks (brand assets keep `pnpm test`, PILOT-reachable frontend adds pilot e2e,
  auth/admin/tenancy/endpoints add the agent's built-in security review); read the whole diff first. Diff scope (`main...HEAD`,
  `--cached`, untracked), prepend rule, `.env.example`, historical CLAUDE_START_HERE and the `pnpm` on
  PATH precondition are explicit.
- Mirror tooling: `skills:check` is read-only and runs first; `skills:sync` refuses unknown arguments,
  links inside the repository (aliases above it are fine), overlapping roots and copy-only files, and
  swaps a verified staging copy with rollback.
- Single freeze definition in CLAUDE.md with the 2026-10-04 security-defect rule; AGENTS.md and the five
  skills only link and apply it. Brand hash refresh needs an explicit human decision. Agent-neutral review commands. Brando lists the three real provider
  surfaces.
- State guard: Unicode terms, contextual states per object and qualified noun, vigente/Current only as
  declared display vocabulary, document names only when quoted, more negative cases, anchor-only links and GitHub slugs. Foundation keeps only the light mirror gate and skips
  `.claude/worktrees/`. `.gitattributes` uses `text=auto` for skills.
- Docs reconciled with evidence: production live since 2026-09-29 (landing, auth, admin), ADR-0016
  supersedes only the provisioning part of ADR-0013 (deferred scope and authorization matrix aligned),
  extractor decompression risk registered.

Gate (2026-10-04): typecheck PASS; lint PASS; pnpm test 207/207 (72 skill pack: real junctions,
aliases above the repository, read-only check, unknown flags, copy-only refusal, backup cleanup, swap
rollback and staging verification; mutants removing backup cleanup, verification, rollback or the
copy-only refusal each fail the suite); `pnpm skills:check` PASS; Foundation 0 errors (229 Markdown);
git diff --check clean. Browser suites not run: no runtime or UI change.

---


Current phase: **ENGINEERING SKILL PACK** (2026-10-04). Branch `chore/brandopolis-engineering-skills`
from f47e4dd. Uncommitted. Engineering tooling only, authorized by the 2026-10-04 hardening exception
([CLAUDE.md § Pilot freeze](CLAUDE.md#pilot-freeze)).

- Five skills in the canonical `.agents/skills/`: brandopolis-feature (entry point, holds the database
  gate), brandopolis-ui, brandopolis-brando, brandopolis-security and brandopolis-review (single check
  matrix plus the commit/push/tag/merge/deploy gate). No database, release or router skill.
- `.claude/skills/` is a generated byte-identical copy (`pnpm skills:sync`, `pnpm skills:check`,
  `scripts/skill-pack.ts`); no symlinks; both pinned to LF in `.gitattributes`.
- Guard `tests/skill-pack.test.ts`: approved set, byte identity, frontmatter, name = directory, ≤100
  lines unless justified, links/anchors/paths exist, invariant IDs exist and their text is not copied,
  no invented upper-case states (with a negative case proving the guard fires). Foundation adds a
  read-only mirror and frontmatter check. AGENTS.md gains the change → skill routing table.
- No change to `src/`, `schemas/`, `drizzle/`, runtime assets, PILOT behaviour or deployment.
- Trigger evals (skill-creator method, `claude -p` in this repo): 31 cases (positive, negative and
  overlap) → 30/31, no forbidden activation. Known residual S2: for a new endpoint Claude loads
  brandopolis-feature as the entry skill; routing to brandopolis-security happens procedurally from
  feature. Boundary O1 (feature/ui): passed 3/5 runs. The harness was temporary (scratchpad), not part
  of the repository.

Gate (2026-10-04): typecheck PASS; lint PASS; pnpm test 168/168 (135 existing + 33 skill pack);
`pnpm skills:check` PASS; Foundation 0 errors (228 Markdown); git diff --check clean. Drift detection
proven by appending one byte to the copy (both `skills:check` and Foundation failed) and restoring with
`skills:sync`. Browser suites not run: no runtime or UI change.

---


Current phase: **CANONICAL DOCUMENTATION RECONCILIATION** (2026-10-04). Branch
`docs/canonical-reconciliation-2026-10-04` from `main` 4329292. Uncommitted, documentation only.

Human product decisions 2026-10-04, applied to the canonical docs before any agent skill is created:

- **Single PILOT freeze definition** in [CLAUDE.md § Pilot freeze](CLAUDE.md#pilot-freeze). The
  2026-09-29 criterion stays; the 2026-09-28 category list is superseded; a hardening exception now
  allows documentation reconciliation, engineering tooling, agent skills and validators without runtime
  effect. AGENTS.md and CURRENT_IMPLEMENTATION_STATE §7 link to it instead of restating it. The
  historical freeze entry of 2026-09-29 below is unchanged.
- **CURRENT_IMPLEMENTATION_STATE reconciled against `main` code and tests**, not inferred: auth (§4)
  and admin (§5) are on `main`; the admin `unavailable` list is the current one; `account_created` and
  `session_started` are instrumented in `pilot_events`; D7/D14/D30 are derived; geography is captured
  in the new-brand dialog but its propagation is not verified, so it stays partially pending; password,
  recovery, SMTP and feedback workflow states remain not implemented.
- **Product Bible**: the byte-identical duplicate of «Correcciones finales de contrato» removed; no
  semantic change.
- **Brandopolis Intelligence / Brando** registered: canonical home
  [brand-intelligence-engine](docs/05-ai/brand-intelligence-engine.md) (existing architecture kept,
  extended with Brando, authority limits and B1–B5), decision record
  [ADR-0015](docs/14-decisions/ADR-0015.md), ADR index also lists the previously omitted ADR-0012, and
  [scope-mvp](docs/01-product/scope-mvp.md) gains a dated resolution that keeps Ask Brandopolis in P1.
  B1 belongs to the next stage; no runtime change.

No change to `src/`, `schemas/`, `drizzle/`, assets, configuration, deployment or PILOT behaviour.
Python 3.12 installed on this machine so the canonical Foundation validator runs (`.venv` with
`requirements-foundation.txt` only).

Gate (2026-10-04): baseline and final both green. typecheck PASS; lint PASS; pnpm test 135/135; Foundation 0 errors (217 → 218 Markdown files, the new ADR-0015); git diff --check clean; diff limited to .md files. Browser suites not run: no runtime, UI or test file changed.

---


Current phase: **FOUNDING PILOT PRODUCT ANALYTICS** (2026-09-29). Uncommitted.

Minimum reliable analytics to operate the first 12–20 Estrategas de Marca. No new dashboard, no vendor,
no migration, no dependency. Readiness table:
[FOUNDING_PILOT_ANALYTICS_READINESS](docs/09-validation/FOUNDING_PILOT_ANALYTICS_READINESS.md).

- **Two new durable signals**, as names inside the existing `pilot_events`/`telemetry` envelope:
  `blueprint_pdf_exported` (the export reuses `engine.blueprint()`, so a download was indistinguishable
  from a view; recorded after the document is built, so a failure never counts) and
  `evidence_panel_opened` (canonical Evidence Engagement is "exposed participants who **open** Evidence",
  and opening had no signal at all). Recorded once per brand per page load: the metric counts people.
- **The three gaps the Admin itself declared underivable are closed**: `phaseCompletionCounts` from the
  active version per module, `optionActionCounts` from audited proposal provenance, and
  `documentEngagement` as canonical Evidence Engagement plus the stronger acts of supplying and curating
  evidence, reported beside the rate and never folded into it.
- **Strategy Ready and Human Override derive from durable state**, not clicks: questions decided with no
  HARD review outstanding, and strategic audit × proposal × committed version to tell a proposal taken
  as offered from one the participant rewrote.
- **D7/D14/D30 derive from timestamps** with the canonical day ±1 window, returning `null` until the
  window closes so insufficient elapsed time never reads as churn.
- **TTFI and TTFD anchors corrected.** `metrics.md` defines both from the brand; they were measured from
  `session_started`, which starts the clock before a brand exists and inflates both. Aligning with the
  canonical definition, not redefining it, and done now because there are no real testers yet.
- **`/admin/` was not redesigned.** Resumen gains evidence opened, map viewed, map downloaded, strategy
  ready and human override, each rate showing its denominator. Estrategas de Marca gains the per-tester
  journey. Aggregate detail lives in Evidencia; Configuración stays operator settings.
- **Not measurable in this build**: AI cost per decision and per active brand (no per-request cost is
  captured) and WTP / paid conversion (no offer or payment surface). None blocks starting testers.
- No new GA4 events: none would improve the aggregate funnel without duplicating first-party truth.

Gate (2026-09-29): typecheck/lint PASS; pnpm test 135/135 (3 new behavioural); focused browser
verification 12/12. No migration, no schema change, no dependency change.

---


Current phase: **PUBLIC SURVEY THANK-YOU PAGE** (2026-09-29). Uncommitted.

New public page at `/gracias-encuesta`, shown to whoever finishes the Brandopolis survey.

- **Existing routing architecture, no new framework.** The route is declared in `views`
  (`src/transport/assets.ts`) with and without a trailing slash; the server returns the single
  document and the client picks the view, exactly as the legal pages do. `/gracias` and
  `/gracias-encuesta/extra` still 404.
- **It is a public document.** `LEGAL_PATHS` generalises to `PUBLIC_DOCUMENT_PATHS`: readable with no
  session and **never intercepted by the intake gate** — the rule the legal routes needed, for the same
  reason. Verified anonymous and signed-in: neither is redirected into the pilot.
- One action only, «Volver al inicio →» to `/` (same origin, no redirect hop; it resolves to
  `https://brandopolis.ai/` when served from the root domain). The gateway hero and access card are
  hidden while the document is open.
- Editorial composition from the existing design system: inherited canonical public header, H1 in the
  sans at hero scale (44px desktop, 30px mobile), closing line in the display serif in emerald like the
  principle lines, 67-character measure on desktop and 46 on mobile at 15px/24px. No cards, no hero
  gradient, no photography. The canonical symbol is reused as a decorative mark (`alt=""`); **the
  Ribbon B is not redrawn.**
- Accessibility: single `h1`, section labelled by its title, visible keyboard focus, 48px target,
  measured contrast 7.32:1 body / 6.15:1 closing / 6.81:1 CTA / 15.74:1 H1, and the entrance animation
  exists only under `prefers-reduced-motion: no-preference`.
- Analytics: no new system and **no Product Analytics events**. A full document load produces the
  existing base `page_view` — verified as exactly one hit with zero custom events. `pilot_landing_view`
  stays scoped to `/`. No survey or participant data reaches GA4.
- Document title uses the existing `setTitle` convention. `<link rel="canonical">` and the meta
  description remain the single document's static tags: **no dynamic meta-tag architecture** was
  introduced for this page.
- **Non-indexable, per route.** The server sends `X-Robots-Tag: noindex, follow` **only** for
  `/gracias-encuesta` and `/gracias-encuesta/`, from the header block that already existed and
  conditioned on `NON_INDEXABLE_VIEWS`, declared beside the route table so paths live in one place.
  **Never global**: verified against a real server that `/`, `/login`, `/request-access`,
  `/privacidad`, `/terminos`, `/admin`, `/workspace` and static assets carry no such header. No
  `robots` meta tag was added to the document.
- Canonical survey redirect URL is `https://brandopolis.ai/gracias-encuesta`. The root-domain 302
  preserves the path, so it resolves to the page served by the pilot; **domain and proxy architecture
  were not changed** in this patch.

Gate (2026-09-29): typecheck/lint PASS; pnpm test 130/130 (3 new structural); focused browser
verification 210/210 at 390/768/1366×768/1440×900/1920×1080. No migration, no schema change, no
dependency change. Product Analytics reconciliation remains untouched and unstarted.

---


Current phase: **GA4 CANONICAL CONFIGURATION — CLOSED** (2026-09-29).

**Production is corrected and verified.** Confirmed by the operator on 2026-09-29: `pilot.env` carries
`GA4_MEASUREMENT_ID=G-NTSD86N2LT`, `brandopolis-pilot.service` restarted successfully,
`GET /api/mode` returns `G-NTSD86N2LT`, and GA4 Realtime is receiving activity. No configuration
action remains open.

**Root cause: configuration, not missing code.** Measured against `https://pilot.brandopolis.ai` in a
real browser with a clean profile: the Google tag loads (`gtag/js?id=…`), `window.gtag` is a function,
`dataLayer` fills with `js, config, event, gtm.dom, gtm.load`, the CSP is already widened for
googletagmanager, and a real `POST .../g/collect` fires on load — all against **`G-PVKQ2K90EQ`**, the
previous property, because that is what `/api/mode` publishes. The realtime report being watched is
**`G-NTSD86N2LT`**, which receives nothing. Base instrumentation was never missing.

The fix was one environment variable, now applied: `GA4_MEASUREMENT_ID=G-NTSD86N2LT` in `pilot.env`
plus a service restart (CSP and ID resolve at app construction; assets cache per process). **No
application file was changed**, then or in this commit. Should the ID ever change again, the same two
steps apply and `GET /api/mode` must return exactly the expected ID.

`G-NTSD86N2LT` is now the canonical Measurement ID, recorded with the measured production state and the
exact procedure in [GA4_PILOT_ANALYTICS §0](docs/15-handoff/GA4_PILOT_ANALYTICS.md). The ID is never
written into code: it is environment-driven and published through `/api/mode`, so no DEMO, e2e or
developer run can emit into a real property.

Scope: **base collection and automatic `page_view` only.** Product-event taxonomy is a separate later
phase; no new events were added. SPA view changes use `history.replaceState`, which GA4 history
measurement ignores, so there is nothing to de-duplicate and no manual page_view was introduced.

Gate (2026-09-29): typecheck/lint PASS; pnpm test 127/127 (5 new structural); git diff --check clean.
No migration, no schema change, no dependency change, no CSP change. Foundation, UI and Brand Master
validators NOT RUN: no Python interpreter on this machine.

---


Current phase: **FINAL QA POLISH — TERMINOLOGY + RIGHT PANEL** (2026-09-29). The previous production
hotfix is already deployed and was verified manually. This pass is uncommitted.

1. **«Blueprint estratégico» is now «Mapa estratégico»** wherever a participant reads it: navigation,
   view eyebrow, notices and the exported document («Mapa estratégico de la marca»). Technical names
   are deliberately unchanged — `#blueprint`, `/api/blueprint`, `/api/blueprint/pdf`,
   `engine.blueprint()` and the PDF filename — so no URL breaks and already-downloaded files keep
   their name. Decision recorded in [BLUEPRINT_PDF_EXPORT](docs/15-handoff/BLUEPRINT_PDF_EXPORT.md).
2. **Right-panel hierarchy restored.** «Contexto del mercado» and «Lo que ya decidiste» now share one
   section-label treatment (9.5px, 0.18em, weight 700, neutral) one level below the panel heading,
   which keeps its emerald. «Entorno competitivo» is its section's title (`<h4>`, 14px, 600) with the
   status badge clearly secondary at 10px. The market block stops being a bordered, tinted card that
   competed with the heading, and a hairline gives the decisions their own section break. Hierarchy
   comes from type and spacing, never a heavy block. The «X de 4» count is untouched.
3. **Dark hover band on «Entorno competitivo» fixed at its source.** It was a class-less `<button>`,
   so `base.css` gave it `background: var(--action-primary)` and, on hover,
   `var(--action-primary-hover)`; the local rule reset the resting state but **not `:hover`**, and
   because it was `display:block; width:100%` the primary colour painted a full-width dark band. It is
   a status title, not navigation — the left navigation already goes there — so it became static text
   (`<h4>`). No `!important`, no painting over the inherited rule: the background is gone, the cursor
   is `auto`, it is no longer focusable, and the duplicated accessible name is gone too. No static
   label in the panel reacts to the cursor; genuinely interactive controls keep their hover.

Gate (2026-09-29): typecheck/lint PASS; pnpm test 122/122 (3 new); test:e2e 80/80 (16 per
project, five projects, run one at a time for memory); test:visual 10
passed + 1 skipped; focused browser verification 168/168 at 390/768/1366×768/1440×900/1920×1080,
measuring hover background luminance rather than trusting a selector. No migration, no schema change,
no dependency change. Foundation, UI and Brand Master validators NOT RUN: no Python interpreter on
this machine.

---


Current phase: **PRE-TESTER UX MICRO-HOTFIX** (2026-09-29). The previous production hotfix is already
deployed and was verified manually. This pass is uncommitted.

DELIVERED HERE:

1. **Local inference feedback.** The global activity panel sits at the top of the workspace, so asking
   for possibilities from a decision further down the page looked like a freeze. A local mirror of the
   SAME state now renders beside the control: `activityStart/Step/Done/Fail` paint both. It is a second
   view, never a second process — no extra request, timer or generation state, and the client still has
   exactly one `/api/recommendations/generate` call site. The button disables and reads «Generando
   posibilidades…»; the block announces through `role="status"` + `aria-live="polite"` rather than a
   spinner alone; on completion the options are revealed without a jarring jump, honouring
   `prefers-reduced-motion`. Failure clears the state, keeps the draft and leaves retry available.
2. **Entorno competitivo is strategic preparation.** Moved out of «Contexto y aprendizaje» into a new
   first group, PREPARACIÓN ESTRATÉGICA, above the four decisions it informs. It is NOT a decision: no
   number, no `data-module`; the Decision Spine still has four, and neither the «X de 4» count nor the
   activation metrics changed.
3. **Market status in Contexto vigente**, in its own block and deliberately outside the decision count.
   Sin investigar / Pendiente de revisión / Revisado, derived from canonical state: incorporated
   findings are Brand Context evidence, discarded ones are recorded rejections, and both survive a
   reload. Unresolved candidates live only inside the round that produced them — they are never
   strategy — so stored state reads as Revisado or Sin investigar, never a pending review with nothing
   left to review. The server derives the same status for the PDF from stored state alone.
   Rail status loads **without blocking the workspace**: `refresh()` still issues one request and the
   rail repaints when the extra data arrives. An earlier version chained that request inside
   `refresh()` — the hottest path, run after every mutation — which delayed each subsequent render
   enough that, on a loaded machine, a click could be swallowed. `phase10a.spec.ts` caught it and the
   visual suite was not relaxed.
4. **Competitive hand-off in its own words**: «Contexto competitivo revisado», «Continuar a <next
   pending decision>» from `nextPhase()` (one journey model, no second ordering), «Revisar contexto»
   as the secondary action.
5. **Denser sidebar.** The fourth group pushed «Mi aprendizaje» and «Blueprint estratégico» below the
   fold at laptop heights. Nothing was removed or collapsed; the savings are spacing only, and the 44px
   touch target is kept wherever a coarse pointer is possible (36px only under `(pointer: fine)`).
   Measured: at 1366×768 the Blueprint now fits with no sidebar scrolling.
6. **Blueprint PDF export**, generated server-side from canonical state — see
   [BLUEPRINT_PDF_EXPORT](docs/15-handoff/BLUEPRINT_PDF_EXPORT.md). Only active versions; AI proposals
   are never exported as decisions; hypotheses are printed under an explicit «not facts» heading;
   discarded findings are absent; missing sections say «Aún no definido»; the demo brand is labelled.
   No new dependency: `pdf-writer.ts` is a minimal writer using the standard Helvetica fonts, with no
   headless browser. Authorization is `scope()` unchanged — foreign workspace 404, unassigned member
   403, no session 401 — and there is no public or temporary URL.

Gate (2026-09-29): typecheck/lint PASS; pnpm test 119/119 (9 new); test:e2e 75/75 (5 new browser
specs), run project by project because one full invocation exhausts this machine's memory;
test:visual 10 passed + 1 skipped; focused browser verification 193/193 at
390/768/1366×768/1440×900/1920×1080. No migration, no schema change. Foundation, UI and Brand Master
validators NOT RUN: no Python interpreter on this machine.

---


Current phase: **FINAL FUNCTIONAL PRE-TESTER HOTFIX** (2026-09-29). The previous production hotfix
is already deployed and was verified manually — the walkthrough showed the populated CoffeePolis, the
corrected intake layout, working legal routes and the visible possibilities CTA. No production commit
SHA is asserted here: it was not independently verified from this machine.

Second human production walkthrough. VERIFIED WORKING: populated CoffeePolis, privacy and terms
routes, intake desktop width, geography, primary market, per-option actions, core-decision phase
hand-off, admin.

FIXED HERE:

1. **"Ayúdame a generar posibilidades" was a no-op.** The button renders only inside the `draft`
   branch of `render()`, while its listener lived in `mountRecommendation()`, whose first statement
   is `if(draft)return;` — button and handler were mutually exclusive, so the listener never bound
   and the click produced no request, no error and no loading state. Its delegation target
   `#generate-recommendation` is rendered by that same function, so it did not exist either.
   `generatePossibilities()` is now the single generation path used by both surfaces, and the CTA is
   bound in `render()`.
2. **Options were generated into a hidden tab.** "Opciones" is a tab panel; generating from the
   initial input left "Decisión" active, so candidates rendered invisibly. Requesting possibilities
   now always selects the panel holding them.
3. **A discarded option leaked across phases.** Option ids are positional (`option-1`) and repeat in
   every proposal, and `discardedOptions` stored them unscoped, so discarding in Primary Customer
   made an untouched option in later phases render as already discarded, losing
   Incorporar/Modificar/Descartar. **Pre-existing defect, not introduced here** — found by verifying
   all four phases, and it blocked defect 1's stated acceptance criteria. Discards are now scoped to
   their own recommendation.
4. **The AI-notice acceptance held a third copy of generation.** It released no draft and selected
   no panel, so the first PILOT participant to ask for possibilities from the initial input and
   accept the notice would have seen nothing. It now resumes the same request through the shared
   path, leaving exactly one `/api/recommendations/generate` call site in the client.
5. **Competitive review had no hand-off.** `showPhaseHandoff()` was reachable only from the
   decision-form submit. Fixed at the shared layer: the hand-off takes its copy as a parameter and
   still derives the destination from `nextPhase()`, so there is no second phase ordering.
   Completion is the human-reviewed state — findings generated AND every one resolved by the
   participant — never "the AI finished generating".

FAILURE UX: generation failure shows one participant-facing message, leaks no provider or transport
detail, clears the loading state, keeps the typed draft and leaves retry available. Proven by
injecting a 500 carrying provider detail and the engine's `{error}` response.

DOCUMENTED GAP, NOT FIXED (scope control): document claims in Brand Context share the same resolvable
review shape (CANDIDATE/ACCEPTED/REJECTED) and also have no hand-off. Their completion is ambiguous —
processing another document reopens it — so a "phase completed" panel there is a product decision,
not a defect fix. The learning loop has no comparable canonical completed state.

Gate (2026-09-29): typecheck/lint PASS; pnpm test 110/110 (5 new, all 5 fail against the defective
code); test:e2e 50/50 (4 new browser specs); test:visual 10 passed + 1 skipped; focused browser
verification 192/192 at 390/768/1440 with a test Measurement ID so telemetry is really emitted, plus
failure UX 20/20. No migration. Foundation, UI and Brand Master validators NOT RUN:
no Python interpreter on this machine.

---


Current phase: **PRODUCTION VERIFICATION HOTFIX** (2026-09-29). Production is live on `2f84d29`; this hotfix is local and uncommitted.

First real human production walkthrough. VERIFIED WORKING: Google auth, required intake, CoffeePolis as Marca demo, Crear mi marca, geographic influence, primary market, phase hand-off, continue to next phase, revisar avance, per-option Incorporar/Modificar/Descartar, admin reachable, demo metric exclusions active.

FIXED HERE: (1) `/privacidad/` and `/terminos/` rendered the intake form for an authenticated participant who still owed intake — boot called `showIntake()` without checking the path, and `showIntake()` hides both sections; public documents now outrank the gate while the workspace stays gated. (2) Intake desktop layout — `.welcome` has three column tracks and intake overrode to two with three children, so the form wrapped under the image at 288px with 103px fields; at 1440px it is now 735px with 327px fields. (3) CoffeePolis was strategically empty (0/4 decisions, empty Blueprint); `ensureDemoContent()` seeds four approved decisions, one explicit hypothesis and a labelled demo contribution from deterministic repository fixtures, never an AI call and never invented research. (4) "Ayúdame a generar posibilidades" now appears under the initial input and delegates to the canonical generation control, so there is one engine and no automatic approval.

GA4: diagnosed before changing code and **no application defect exists**. With the ID configured, `/api/mode` returns it exactly, the CSP widens only for Google, gtag loads, dataLayer fills and a real `g/collect` POST fires with `tid=G-PVKQ2K90EQ`, with no console errors and no inline script. In production, `GA4_MEASUREMENT_ID` was already present in `pilot.env` before the restart, Brandopolis restarted successfully and health returned `ready`, yet GA4 Realtime still showed zero activity during the human walkthrough. **No root cause is assigned**: what remains is an unresolved runtime/browser/network analytics-delivery diagnosis. Manual verification must inspect `/api/mode`, `/analytics.js`, Google tag loading, the CSP, the browser console, `g/collect` network requests, browser ad-block and privacy behaviour, and the effective Measurement ID — checklist in [GA4_PILOT_ANALYTICS §7.bis](docs/15-handoff/GA4_PILOT_ANALYTICS.md).

ALSO FIXED: `core.autocrlf` rewrote `drizzle/*.sql` to CRLF on checkout, changing hashes that applied migrations are checked against, so a healthy database reported MIGRATIONS_REQUIRED and the local DEMO server refused to start. `.gitattributes` now pins `drizzle/** text eol=lf`, as it already did for brand assets and the served frontend. Production on Linux is unlikely to have hit this, but the invariant is now protected everywhere.

DEMO UPGRADE RULE: `ensureDemoContent()` only touches a brand classified `isDemo=true`, only when it has no approved decision version at all, never resets or rewrites, and is safe on every sign-in. A participant who already decided inside their sandbox keeps that work; a CoffeePolis created before this content existed is upgraded on next sign-in; real brands are never touched.

Gate (2026-09-29): typecheck/lint PASS; pnpm test 106/106; release rehearsal PASS; demo-metric regression PASS; browser verification 39/39. Foundation, UI and Brand Master validators NOT RUN: no Python interpreter on this machine.

---


Current phase: **PILOT AUTH + ANALYTICS** — branch `feat/pilot-auth-admin`, from d43fd4d. Not pushed, not deployed.

Delivered on this branch: mobile header defect closed; OIDC self-provisioning foundation (scope `openid email profile`, verified-claim enforcement on the provisioning path, `PILOT_AUTO_PROVISION` fail-closed by default, deterministic cohort, `user_accounts` + migration 0011); privacy-safe GA4 analytics behind `GA4_MEASUREMENT_ID`; production reconciliation and root-domain runbooks; consolidated handoff state.

NOT IMPLEMENTED: password credentials, email+password login, password recovery, SMTP transport, `/admin`, `/api/admin/*`, evidence view. Design recorded in [CURRENT_IMPLEMENTATION_STATE_2026-09-28](docs/15-handoff/CURRENT_IMPLEMENTATION_STATE_2026-09-28.md) §11.

Production: the approved landing (d43fd4d) is deployed and `brandopolis.ai` now redirects to the pilot. **This branch has NOT been deployed.** Migration 0011 is additive and must be applied with `pnpm pilot:migrate` before starting a version that includes it.

Google auth is CERTIFIED for arbitrary verified users: four multi-user tests prove distinct users and private workspaces per identity, tenant isolation across the real product surface, canonical identity at `(issuer, subject)` with email as metadata only, the `PILOT_AUTO_PROVISION` gate, and no duplication under concurrent first logins. No production code change was required. Known limitation: a new `subject` carrying an already-registered email is denied (safe, but blocks a Google account migration that keeps the address) — pending product decision. Config and callback: [GOOGLE_AUTH_PRODUCTION](docs/15-handoff/GOOGLE_AUTH_PRODUCTION.md).

Participant access status is configurable: `PILOT_DEFAULT_ACCESS_STATUS` defaults to APPROVED, so the current validation phase admits every authenticated participant immediately. PENDING and SUSPENDED are live in the model for a future controlled pilot and admin enforcement. Policy applies at first provisioning only; SUSPENDED revokes sessions immediately; `disable()` still outranks any status. The column lives on `user_accounts` and NOT on `pilot_identities`, because putting it there broke the frozen-build release rehearsal (bisected, then redesigned). Migration 0012 is additive; existing rows are APPROVED.

Pre-tester hardening (partial): AI inference panel overflow fixed (a no-media-query `.primary-workspace > .ai-activity {width:100%}` in product-shell.css outranked the phone rule); mobile header re-audited by measurement, with the PILOT label restored on phones because it costs 38px while only the engineering DEMO label costs 74px; Estratega de Marca terminology sweep across served copy; public `/privacidad/` and `/terminos/` routes; `contacto@brandopolis.ai` as the canonical public contact.

NOT BUILT in that pass, and still open before external testers: participant intake form and persistence, CoffeePolis demo brand with metric exclusions, geographic influence, phase-completion navigation, generate possibilities, per-option Incorporar/Modificar/Descartar, and the related telemetry. Each needs its own migration and metric-definition work; seeding demo activity without exclusions would corrupt pilot evidence. One product decision is pending: whether CoffeePolis is a read-only demonstration brand (recommended for the pilot) or a per-workspace sandbox copy.

CANONICAL DECISIONS (2026-09-28), recorded here because chats are not authoritative:

- CoffeePolis is an **editable per-workspace sandbox**, seeded through the canonical createBrand path. Never a shared mutable brand.
- CoffeePolis carries `isDemo=true` in `brand_profiles`; classification is server-side, never inferred from the brand name.
- **Demo activity is excluded from canonical pilot metrics inside the aggregation itself**, not by dashboard filtering. Demo exploration is reported separately as demoBrands/demoDecisions.
- **Participant intake will be REQUIRED before workspace access**, immediately after successful Google authentication. Decided, NOT yet implemented: the backend exists and is tested, but no screen calls it.
- Current access policy remains `PILOT_DEFAULT_ACCESS_STATUS=APPROVED`; there is no manual approval gateway in this pilot.
- Operator-provisioned and legacy/test workspaces are **never** back-filled with CoffeePolis. Seeding requires a self-service account profile.
- Geography never implies strategic market from physical location: it is declared per brand, never derived.
- Schema rule, confirmed twice by the release rehearsal: **adding tables is safe; widening a table shared with the frozen Pilot build breaks it.** `brand_profiles` and `participant_profiles` exist for that reason.

BUILT since: required participant intake (screen, authenticated API, server-side gate returning 403 INTAKE_REQUIRED, unified enterWorkspace entry after a real bypass was found in the login path), operator/legacy exemption via the account-profile signal, session-state `intakeRequired`, CoffeePolis "Marca demo" badge with its short explanation and "Crear mi marca", isDemo propagated to the interface through listBrands, and the pilot_intake_started / pilot_intake_completed / demo_brand_opened events.

BUILT: the last four pre-tester UX blockers are closed. Geography is asked in the canonical new-brand dialog and persisted through the existing endpoint; "Ayúdame a generar posibilidades" renames the existing recommendation engine as an explicitly optional path; every generated option exposes Incorporar/Modificar/Descartar (plus Reconsiderar for a discarded one) with provenance preserved and no automatic Decision; and a phase-completion hand-off panel offers "Continuar a <siguiente fase>" and "Revisar avance" inside the decision surface, with the next phase derived from canonical navigation. GOOGLE_AUTH_PRODUCTION.md carries the real publication state, and the Privacy Policy was cross-checked against the implemented intake fields (they match).

**PILOT WORKSPACE FREEZE (2026-09-29)**

> The current PILOT workspace is functionally frozen for external validation.
> Do not continue opportunistic UI or strategic-workflow polishing.
> Only defects discovered by regression or external testing may change the frozen workspace before validation.

ADMIN V1 (2026-09-29): `/admin` is a separate operator surface with Resumen, Estrategas de Marca, Evidencia and a Configuración placeholder. Authorization needs a live PILOT session, a provider-verified email and membership of `BRANDOPOLIS_ADMIN_EMAILS`, checked independently inside every endpoint; no address is compiled in. Canonical figures come from `report()`/`metrics()`, so the demo exclusions cannot drift; real and demo brands are always separate; underivable metrics are returned as `unavailable` rather than invented. Aggregate evidence is counts by bucket only, and city is omitted even in aggregate. Suspend/reactivate is audited and can never revive a `disable()`d identity. No migration.

DEFERRED, recorded so it is not mistaken for shipped: the visual feedback screen (the `/api/admin/feedback` endpoint exists and is tested, the view does not), date-filter controls in the UI (the evidence endpoint already accepts `from`/`to`), the operational participant CSV, and D7/D14/D30 retention until it is canonically derivable.

Remaining before external testers is operational, not code: deploy this branch (migrations 0011-0013 via `pnpm pilot:migrate` before the new version starts), set `PILOT_AUTO_PROVISION=true`, `GA4_MEASUREMENT_ID`, `BRANDOPOLIS_ADMIN_EMAILS` and the Google OIDC credentials, and publish the Google OAuth app to Production — the longest-lead item, since external Google sign-in does not work for arbitrary users until that review completes.

Gate (2026-09-28): typecheck/lint PASS; pnpm test 88/88; test:e2e 30/30; test:visual 10 pass + 1 skip, 0 fail; release rehearsal PASS; git diff --check clean. Foundation, UI and Brand Master validators NOT RUN: no Python interpreter on this machine.

NOT BUILT: the participant intake form itself (no fields specified). The status layer is wired so that "intake completed -> APPROVED" is already the configured default when that form lands.

---


Current phase: **PILOT LANDING — PUBLIC COPY + UX CLARITY** — COMPLETE (2026-09-28). Founder review: **APPROVED (2026-09-28)**.

Branch: `main`, from 89e2afe. Scope: public landing copy, UX clarity, public/authenticated state separation and landing-only motion. No backend, schema, migration, auth, tenancy, AI governance or Brand Context change; no new runtime asset; `src/transport/assets.ts` untouched. Production not deployed and not restarted.

Gate (2026-09-28): typecheck/lint PASS; pnpm test 64/64; test:visual 9 pass + 1 skip + 1 fail; test:e2e 24 pass + 6 fail (every failure in the `mobile` project); landing browser verification 54/54; contrast over photography PASS at 1440/1024/768/390; no horizontal overflow 1600→360; git diff --check clean.

Both browser failures PRE-DATE this work and are not caused by it. Verified by stashing all five changed files and re-running against 89e2afe on a restarted DEMO server: the same 6 mobile e2e tests and the same phase10a dialog test fail with the identical signature — `select#brands` inside `.header-brand-control` intercepts the pointer event for `#new-brand`. Contributing factor in this environment: the local DEMO database has accumulated 51 brands (names up to 45 chars) from repeated test runs, which widens the selector and worsens the overlap at 390 px; the historical 25/25 record was taken on a cleaner database. The affected tests cover concurrency, idempotency and brand isolation at the mobile viewport only — the same assertions pass in the wide, desktop, compact and tablet projects. FIX NOT ATTEMPTED HERE: it is authenticated workspace header layout, outside this landing-only task.

Foundation, UI validator and Brand Master validator NOT RUN: no Python interpreter on this machine (only the Microsoft Store alias). Required files and every relative markdown link were verified separately.

Next: pilot authentication and admin on `feat/pilot-auth-admin`. The mobile header overlap should be fixed there or in a dedicated fix before external use on phones.

---


Current phase: **PHASE 10B — FINAL PRODUCT POLISH + DEVELOPER HANDOFF** — COMPLETE (2026-09-25). Founder final visual review: **APPROVED (2026-09-26)**.

Branch: `handoff/phase10b-final-2026-09-25` (from 7be0b67). Tag: `brandopolis-mvp-handoff-ready-2026-09-25`. Verified code: 770458f. Not merged to `main` (GitHub `main` holds only the Foundation import). Start here: [NEXT_DEVELOPER_START_HERE](docs/15-handoff/NEXT_DEVELOPER_START_HERE.md); record: [FINAL_MVP_HANDOFF](docs/15-handoff/FINAL_MVP_HANDOFF_2026-09-25.md).

Engineering foundation: CLOSED (unchanged). MVP product: IMPLEMENTED. Final product polish (10A + 10B): COMPLETE. External production configuration: NOT PERFORMED.

Final gate (2026-09-25, founder copy 80ef75b + clean-clone rehearsal PASS at 770458f): typecheck/lint PASS; pnpm test 63/63; demo-encoding node test 1/1; test:e2e 25/25; test:visual 10 pass + 1 skip (historic encoding proof precondition absent); test:pilot:e2e 10/10; Phase10A evidence 2/2; Foundation, UI validator, Brand Master validator PASS; pnpm audit --prod clean (1 moderate dev-only esbuild via drizzle-kit); git diff --check clean. Independent final design and WCAG 2.2 AA reviews: no AA failure.

Findings: migration 0003 backfills mojibake questions only for brands existing when it runs (root cause of historic DEMO mojibake; fresh/PILOT DBs unaffected; repair via scripts/demo-encoding.mjs). The founder's :3000 DEMO process predates the final assets (served from memory) and must be restarted to show the final UI.

Next: founder visual review of the local DEMO, then LIVE_PILOT_LAUNCH_CHECKLIST. No feature work until real pilot evidence exists.

---

Current phase: **PHASE 10 — REAL TESTERS / FOUNDER PILOT** — STARTED, EXTERNAL CONFIGURATION PENDING ([start](docs/15-handoff/PHASE10_FOUNDER_PILOT_START.md)). Branch: pilot/phase10-real-testers-2026-09-25 from tag brandopolis-mvp-phases-1-9-final-2026-09-25 (d22e3c6).

Not live: testers, hosting, OIDC provider, Anthropic provider, production. No feature development until real pilot evidence exists or a deployment blocker requires code.

---

Current phase: **MVP PHASES 1–9 — FINAL CANONICAL CLOSURE COMPLETE** (frozen as `brandopolis-mvp-phases-1-9-final-2026-09-25` / `release/mvp-phases-1-9-final-2026-09-25`).

Brand Master: CANONICAL / APPROVED. Visual assets: CANONICAL. Frontend: CANONICAL MVP ([closure](docs/15-handoff/FINAL_FRONTEND_CANONICAL_CLOSURE.md)). Phases 1–9: CLOSED FOR MVP ([record](docs/15-handoff/MVP_PHASES_1_TO_9_CLOSURE.md)). AI: EXTERNAL CONFIG REQUIRED FOR REAL PROVIDER. Deployment: EXTERNAL CONFIG REQUIRED FOR REAL INTERNET PILOT. Production: NOT CLAIMED.

Final gate (2026-09-25): typecheck/lint PASS; pnpm test 58/58 (incl. 4 brand-runtime tests); test:e2e 25/25 in 3 consecutive full runs; test:pilot:e2e 10/10; test:visual 8/8 (5 viewports, 0 console errors, reduced motion, contrast incl. hero at 1440/1024/768/390); competition:check --isolated PASS and competition:test-boot 1/1; pilot:validate-config VALID (pilot.brandopolis.ai); Foundation PASS; UI validator PASS; Brand Master validator PASS (working tree and clean worktree); pnpm audit --prod: No known vulnerabilities found; git diff --check clean.

Historical RC browser flake: not reproduced (3/3 clean after final changes); recorded as unreproduced. Local DEMO PostgreSQL observation: start → use → clean stop (pg_ctl) → restart → data preserved, repeated this pass; no recurrence; recorded as a non-reproduced environment event. The DB now runs standalone (`pnpm db:start`) so server restarts never stop PostgreSQL uncleanly.

Next: Phase 10 — real testers / Founder Pilot (branch pilot/phase10-real-testers-2026-09-25). No feature development until real pilot evidence exists.

---

## Previous closure (MVP phases 1–9)

Current phase: **MVP PHASES 1–9 CLOSURE COMPLETE** — verdict: PHASES 1–9 CLOSED WITH EXTERNAL CONFIGURATION PENDING ([closure](docs/15-handoff/MVP_PHASES_1_TO_9_CLOSURE.md)).

Next phase: **PHASE 10 — REAL TESTERS / FOUNDER PILOT** (do not begin automatically; testers are not live).

Visual: CANONICAL MVP FRONTEND INTEGRATED. AI: EXTERNAL CONFIGURATION REQUIRED (`pnpm pilot:ai-smoke` pending a key). Deployment: EXTERNAL CONFIGURATION REQUIRED (hosting, OIDC provider, DNS for pilot.brandopolis.ai). Production: NOT CLAIMED.

Branch: frontend/final-visual-integration-2026-09-25 (from de13733, visual package). Candidate SHA: the commit that last modifies this file (`git log -1 --format=%H -- SESSION_STATE.md`); full SHA in the closure report. Frozen, untouched: live launch f552536 (tag brandopolis-live-launch-external-config-ready-2026-09-25), Pilot engineering af73d03, RC1 f494668.

Domain: public https://brandopolis.ai · pilot https://pilot.brandopolis.ai · OIDC callback https://pilot.brandopolis.ai/auth/callback.

Final gate (2026-09-25): typecheck/lint PASS; pnpm test 54/54; test:integration 54/54 (same suite); test:e2e 25/25 (6 full runs: 5 green, 1 with a single intermittent failure not reproduced in 5 later runs nor in 15 repeated mobile runs; cause not identified); test:pilot:e2e 10/10; test:visual 8/8 (5-viewport integrity with 0 console errors, canonical screenshots, reduced motion, contrast incl. pixel-measured hero); competition:start/check --isolated PASS and competition:test-boot 1/1; pilot:validate-config VALID for pilot.brandopolis.ai; preflight covered by the controlled-fixture test; Foundation PASS; UI validator PASS; pnpm audit --prod: No known vulnerabilities found; git diff --check clean.

Environment note: the developer's local DEMO PostgreSQL (55432, started by the user's `pnpm db:start`) stopped uncleanly during this pass for a reason outside the commands run here; it was restarted with `pnpm db:start` (WAL recovery, no data change) and verified (9 migrations, DEMO session valid).

Post-MVP register: [POST_MVP_DEFERRED_SCOPE](docs/15-handoff/POST_MVP_DEFERRED_SCOPE.md). Learning loops: [PILOT_LEARNING_LOOP](docs/15-handoff/PILOT_LEARNING_LOOP.md).

External inputs still required: hosting provider/region; dedicated PostgreSQL 17 `DATABASE_URL`; OIDC provider (issuer, client ID, secret or public client); DNS + TLS for pilot.brandopolis.ai; Anthropic key/model/budget (or AI disabled) and one `pnpm pilot:ai-smoke`; request-access destination; approval of the AI notice text; first testers' OIDC subjects and cohorts; hosted backup/restore rehearsal.

---

## Previous phase (Live Pilot Launch Gate)

Current Phase: LIVE PILOT LAUNCH GATE — closed by Claude Code.

Gate state: **EXTERNAL-CONFIG READY**. The repository, launch tooling, runbooks and tests are ready; nothing is deployed. No real hosting, OIDC provider or Anthropic API was used. Production: NOT CLAIMED.

Frozen Pilot engineering SHA: af73d0306e6fa0ba99462370a7ab5c1ba0c59f12 (tag brandopolis-pilot-engineering-ready-2026-09-25, branch release/pilot-engineering-ready-2026-09-25; untouched).
Live launch branch: pilot/live-launch-2026-09-25. Commits: b4f5091 (deployment prep), 9469ec2 (docs), b006b91 (launch validation), plus the closing commit that last modifies this file (`git log -1 --format=%H -- SESSION_STATE.md`; full SHA in the gate report).
Frozen RC1: f4946683c8767aedc6c2fc7403d03beb3ab61e04 (untouched).

Delivered in this gate: runtime free of dev-only imports (`pnpm install --frozen-lockfile --prod` + `pnpm pilot:start`, import graph verified); `pilot:validate-config` (offline), `pilot:preflight` (read-only), `pilot:smoke` (post-deploy); single-instance advisory lock; operator bound to the OIDC-discovered issuer; operator `report`; AI data notice with per-tester versioned acknowledgement and daily caps (no schema change); forward-only migration plan with divergence detection; DEMO tools refuse PILOT data; testable hosted backup wrapper; auth/AI/readiness logs without secrets; canonical second High-Value Event metric. Docs: PILOT_RUNBOOK, PILOT_DEPLOYMENT_CONTRACT (environment matrix), LIVE_HOSTING_DECISION, OIDC_PROVIDER_DECISION, AI_PROVIDER_LAUNCH, FIRST_TESTER_COHORT, DOMAIN_DNS_LAUNCH, LIVE_PILOT_LAUNCH_CHECKLIST, launch security review.

Final gate (2026-09-25): typecheck/lint PASS; pnpm test 52/52; test:integration 52/52 (same suite); test:e2e 25/25 (5 viewports); test:pilot:e2e 10/10 over HTTPS; competition:start/check --isolated PASS (9 migrations) and competition:test-boot 1/1; Foundation PASS (errors 0); UI validator --integrated PASS; pnpm audit --prod: No known vulnerabilities found; git diff --check clean. Real-process rehearsal on a scratch PILOT database (local HTTPS discovery endpoint, then dropped): validate-config VALID, pilot:migrate 9 applied then up to date, preflight PASS (backup tools WARN), pilot:start started, launch smoke 8/8 PASS, second instance refused, db:migrate/db:seed refused.

Schema/rollback: no migration added in this gate (still 0000–0008, 9 entries). The frozen build and this build read and write the same database both ways (automated test), so application rollback to af73d030 is supported; database changes are forward-only.

Known deferred risks: in-memory rate limiter (one instance, enforced); pg_dump/pg_restore execution not rehearsed (client tools absent locally); real OIDC provider and real Anthropic API not exercised; non-strategic creates not universally idempotent; no full WCAG audit; Chrome only.

Remaining human decisions: hosting provider and region; dedicated PostgreSQL 17 (DATABASE_URL); OIDC provider (issuer, client ID, secret or public client); PILOT_ORIGIN domain and DNS; Anthropic key, model and spend limit (or AI disabled); request-access destination; approval of the AI data notice text; first testers' OIDC subjects and cohorts.

Next: follow docs/15-handoff/LIVE_PILOT_LAUNCH_CHECKLIST.md. Do not begin a new product phase automatically.

---

## Previous phase (MVP / Pilot engineering)

Current Phase: MVP / PILOT RELEASE — Claude continuation of the Codex Pilot handoff.

Current Status: PILOT READY FOR CONFIGURATION AND FIRST TESTERS once external decisions are supplied (hosting, OIDC provider, domain, Anthropic account). Local DEMO remains ready. Production: NOT claimed.

Frozen RC1 SHA: f4946683c8767aedc6c2fc7403d03beb3ab61e04 (tag brandopolis-rc1-demo-ready-2026-09-24, branch release/rc1-frozen-2026-09-24; untouched).
Codex Pilot handoff: tag pilot-codex-handoff-2026-09-25 → 3ad7cff30be8bab567ff25f71be7f9d91fdd7484 (kept in history, not amended).
Claude Pilot final SHA: commit that adds docs/15-handoff/pilot-security-review.md, resolvable with `git log -1 --format=%H -- docs/15-handoff/pilot-security-review.md`; the full SHA is in the continuation report. Branch: pilot/mvp-release-2026-09-25.

Pilot scope delivered: provider-neutral OIDC login (confidential or public PKCE client, configurable redirect), explicit issuer+subject tester mapping, 8 h revocable sessions, operator CLI (create, assign, inspect, revoke-sessions, disable, classify-session, metrics), per-tester workspaces, multi-brand, DEMO/PILOT database separation enforced at startup, Anthropic adapter on the official SDK behind ModelGateway with safe failure, Pilot telemetry (activation = first approved Decision; Time to First Insight / First Decision via metrics), feedback and issue report, concise onboarding, request-access link, per-client in-memory rate limiting, clean PostgreSQL shutdown for backups, backup/restore and migration-preservation tests. Docs: PILOT_RUNBOOK, PILOT_DEPLOYMENT_CONTRACT, TESTER_GUIDE, COMPETITION_DEMO_GUIDE, pilot-security-review; ADR-0013/0014 updated.

Final gate (2026-09-25): typecheck/lint PASS; pnpm test 42/42 (27 RC1 contract + 3 RC1 review + 12 Pilot); test:integration 42/42 (same suite); test:e2e 25/25 (5 viewports); test:pilot:e2e 10/10 over HTTPS (2 tests × 5 viewports, including real browser OIDC login); competition:start/check --isolated PASS (9 migrations); competition:test-boot 1/1; Foundation PASS (errors 0); UI validator --integrated PASS; pnpm audit --prod: No known vulnerabilities found; git diff --check clean. The developer's local DEMO DB (55432) was forward-migrated to 0008 with pnpm db:migrate (additive).

Known deferred risks: in-memory rate limiting (single instance); pg_dump/pg_restore path not executed locally (no client tools) — rehearse on the chosen host; real OIDC provider and real Anthropic API not exercised (signed fixtures and simulated responses); non-strategic create operations are not universally idempotent (strategic Decision commits are); tester consent for sending Brand context to the AI provider must be collected; no full WCAG audit; Chrome only.

External human decisions required: hosting provider; OIDC provider and its issuer/client credentials; PILOT_ORIGIN domain; Anthropic account, model and budget (suggested model claude-opus-5); request-access destination; tester list (OIDC subjects) and cohorts; data-processing consent text.

Next engineering phase: do not begin automatically. Claude Code: CLOSED after this continuation pass.

---

## Previous phase (RC1)

Current Phase: RC1 Engineering Review Complete — engineering phase CLOSED.

Current Status: READY FOR LOCAL DEMO / TECHNICAL DELIVERY. Production: NOT claimed.

Codex baseline SHA: 538e8af1e84e6145477d4efb7fd2fadfcb856b48 (handoff reviewed independently; not amended).

Claude final closure SHA: commit that adds docs/15-handoff/claude-rc1-independent-review.md, resolvable with `git log -1 --format=%H -- docs/15-handoff/claude-rc1-independent-review.md`; the full SHA is recorded in the closure report (a commit cannot contain its own hash). Branch: codex/ui-kit-integration.

Independent review: Claude Code Pass 1 ACCEPT WITH NON-BLOCKING FINDINGS (0 P0, 0 P1, 4 P2). F-1 fixed (migration count derived from the journal), F-2 fixed (cookie Max-Age = remaining session lifetime, never extended), F-4 covered by test (lost-response retry of a review commit replays without side effects; no implementation change), F-3 deferred. Record: docs/15-handoff/claude-rc1-independent-review.md.

Final gate (2026-09-24, Claude): typecheck/lint PASS; pnpm test 30/30; test:integration 30/30 (same suite); test:e2e 25/25 at 1600×1000, 1440×900, 1280×800, 768×1024, 390×844; competition:start + competition:check PASS on the normal profile (reusing the existing local DB on 55432) and the isolated profile; competition:test-boot 1/1; Foundation PASS; UI validator --integrated PASS; pnpm audit --prod: No known vulnerabilities found; git diff --check clean. Accessibility measured in Chrome (1440×900, 390×844): min text contrast 4.68:1, focus ring 6.15:1, full keyboard-only M1 route with visible focus and no trap, reduced motion leaves no animated element. Not a WCAG or security certification.

Known deferred risks: Non-strategic create operations are not yet universally idempotent. Strategic Decision commits are idempotent. Broader create-operation idempotency is deferred beyond RC1. Plus the production items listed under Known Debt.

Next engineering phase: do not begin automatically. Codex: CLOSED for this phase. Claude Code: CLOSED after this pass.

RC closure: arranque en un comando, perfil aislado, readiness de DB/migraciones, sesión DEMO renovable sin elevar permisos, feedback/bloqueo de acciones y errores legibles. Runbook y revisión de seguridad en docs/15-handoff. Contratos, Bible, schema/config y migraciones preservados.

M1: GREEN. Se conserva el motor transaccional, historial, HARD Needs Review, revisión humana, idempotencia, aislamiento y conflicto entre pestañas.

Visual System: INTEGRATED. Assets y tokens canónicos; glass legible, navegación responsive y foco de drawer. Sin rediseño.

Strategic Vertical Slice: Customer → Business → Position → Message implementado y conectado por las reglas v1. Cuatro decisiones persistentes y versionadas.

Brand Context: UserInput, Evidence, Hypothesis, OpenQuestion, Experiment, Signal y Learning explícitos. Aprendizajes ACCEPTED disponibles en vista de contexto y Context Assembler. Categorías separadas; hipótesis nunca se presentan como evidencia. Presupuesto de caracteres con reserva para información crítica y omisiones declaradas.

Recommendations: DEMO_FIXTURE, alternativas didácticas fijas explícitas. ModelGateway, validación estructurada, guard de referencias, evaluación conservadora y trazas. Usar/modificar exige criterio y commit humano; rechazar no crea decisión. Cambio de contexto invalida propuestas. Sin IA en vivo ni research externo.

Experiment: PLANNED → RUNNING → COMPLETED / INCONCLUSIVE / CANCELLED; PLANNED → CANCELLED autorizado por continuación. Objetivo, criterio de éxito, responsable, relación con Decision/Hypothesis, creación/inicio/cierre persistentes. Completar exige señal. Fechas históricas desconocidas permanecen null.

Signal: observación con fuente, fecha no futura, autor y Experiment en curso. No crea Learning automáticamente.

Learning: CANDIDATE → REVIEWED → ACCEPTED / REJECTED mediante actor humano autorizado. Fuentes y límites conservados. Aceptación repetida del mismo actor idempotente. No cambia decisiones, versiones ni preguntas estratégicas.

Strategic Practice: eventos descriptivos ligados a User, privados y separados de Brand Context. Learning Moments de cuatro módulos con Por qué importa / Qué observar / En tu negocio / Cuidado con. Sin score, gamificación ni LMS.

Blueprint: proyección desde persistencia de decisiones vigentes, Needs Review, dependencias, hipótesis abiertas y aprendizajes aceptados. Sin almacenamiento duplicado ni ruta de escritura estratégica.

Multi-Brand: crear/listar/seleccionar según membership y asignación; etiqueta DEMO. Contexto aislado; borrador de decisión conservado por User/Brand/módulo en sessionStorage al cambiar marca o sección.

Progressive Intake: pregunta opcional «¿Qué estás construyendo?»; UserInput guardado atómicamente al crear Brand. Se puede iniciar incompleta.

Strategic Home: «Tu estrategia hoy» prioriza revisiones, preguntas abiertas, experimentos activos, señales sin interpretación y aprendizajes por revisar. Sin KPIs ficticios.

Competition Demo: pnpm demo:competition crea datos ficticios mediante casos de uso reales; cuatro decisiones, siete versiones, revisiones completadas y un aprendizaje aceptado. Resultado sin credenciales en .local/competition-demo.json. No acredita clientes ni resultados de negocio.

Browser QA: 25/25 Chrome PASS en 1600×1000, 1440×900, 1280×800, 768×1024 y 390×844. M1, stale conflict, contexto, aprobar/modificar/rechazar Recommendation DEMO, cuatro módulos, experimento/señal/aprendizaje, Blueprint, práctica, intake y cambio de marca. Cinco casos adicionales verifican doble submit, pérdida de conexión al guardar y respuesta 401 de sesión vencida sin mensaje crudo. Teclado/Tab/Escape/backdrop/focus return y reduced motion verificados. Capturas inspeccionadas en escritorio y móvil; sin overflow en recorridos comprobados. No se afirma certificación WCAG completa.

Foundation: PASS — Markdown 161 JSON 46 schemas 21 requirements 15 golden cases 13 errors 0. Validación visual integrada PASS.

Tests (cierre Codex, antes de la revisión; ver Final gate arriba para el resultado vigente): pnpm typecheck y pnpm lint PASS. pnpm test 27/27 (13.31 s). pnpm test:integration 27/27 (18.94 s; misma suite, no cobertura adicional). pnpm test:e2e 25/25 (1.7 min). pnpm db:migrate, pnpm demo y pnpm demo:competition PASS. pnpm audit --prod: No known vulnerabilities found. git diff --check verificado antes del commit.

Boot/readiness: competition:start y competition:check PASS normal/aislado. competition:test-boot 1/1 (3.7 s) tras reinicio del perfil aislado; misma marca persistente, Blueprint y recarga en Chrome 390×844. Ctrl+C dejó 3001/55434 sin listener y postmaster.pid ausente, sin borrar datos. /health 200/503 y migraciones incompletas cubiertos; sondeo HTTP real confirmó cinco rutas privadas 404, visitante 401, input inválido 400, CSRF 403 y marca inexistente 404.

Validation environment/time: Windows x64; Node v24.19.0, pnpm 12.4.2, Python 3.12.14, PostgreSQL 17 local. Suite final del 2026-09-24 22:57–23:00 America/Guatemala (2026-09-25 04:57–05:00 UTC); cierre documental posterior. Seguridad acotada PASS, sin HIGH pendiente identificado; riesgos residuales documentados, sin certificación ni afirmación de cero vulnerabilidades.

Database: PostgreSQL 17, 27 tablas, migraciones 0000–0007. 0006 preservada: Experiment/Signal/Learning/enlaces/CapabilityEvent. 0007 aditiva: plan, fechas e índices. Prueba de base limpia, upgrade desde 0005 con DecisionVersion existente y replay sin duplicación; historia comparada exactamente.

Domain Changes: se documenta PLANNED → CANCELLED por instrucción explícita de continuación. No se cambió Product Bible, enums ni schemas v1. Metadatos de plan separados del payload canónico. Telemetría nueva alineada con recommendation_approved/signal_added; learning_created sólo tras aceptación. Historia DEMO anterior conservada sin recalcular métricas.

Known Debt: autenticación/provisioning/recuperación de producción; proveedor IA real y evaluación semántica de calidad; política operativa de retención/borrado personal; backup/restore; auditoría WCAG completa y navegadores distintos de Chrome. Hypothesis no cambia automáticamente tras Learning; revisión de soporte de hipótesis aún pendiente. No hay research en vivo. Gateway mide caracteres y no simula tokens/costo; futuro proveedor requiere cancelación real de red. Datos DEMO locales no son evidencia de piloto.

Blockers: NONE para demostración local y revisión técnica. Producción depende de decisiones técnicas abiertas sobre auth/proveedor/despliegue. Patch independiente no localizado ni cotejado; limitación histórica, no bloqueo administrativo de M1/MVP.

Next Highest Value Task: decisión humana sobre la siguiente fase; revisión independiente de Claude completada. Auth de piloto sobre ADR-0004 se mantiene como decisión posterior; no continuar nuevas features en este RC.

Claude Code Review: COMPLETE (ver registro de revisión independiente). Revisar prioridades de handoff/CLAUDE_START_HERE.md y manifiesto docs/15-handoff/competition-mvp-rc1.md sobre el SHA exacto de entrega, sin rediseño.

Git: codex/ui-kit-integration. Checkpoints dd0afdc y 8e1b621 preservados. Correcciones en commits posteriores, sin amend, reset, squash, merge ni force push. 690d1a3 recupera el ciclo; 12103ef registra home/contexto/demo y QA P0. RC1 agrega sólo confiabilidad, validación y handoff. Sin tag, release GitHub ni despliegue.

Historial M1: docs/15-handoff/m1-implementation.md. Evidencia y alcance actual: docs/15-handoff/competition-mvp-implementation.md. Ejecución: LOCAL_HANDOFF.md.
