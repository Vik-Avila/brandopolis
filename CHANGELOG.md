Status: derived

Owner: Product / Engineering

Canonical: no

Last reviewed: 2026-09-23

Related: —

Depends on: —



# Registro

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
