Status: derived
Owner: Product / Engineering
Canonical: no
Last reviewed: 2026-10-04
Related: docs/15-handoff/NEXT_DEVELOPER_START_HERE.md, docs/15-handoff/ROOT_DOMAIN_403_REMEDIATION.md, docs/15-handoff/POST_MVP_DEFERRED_SCOPE.md
Depends on: Landing commit d43fd4d (2026-09-28); §4, §5, §5.bis, §6, §7 and §11 reconciled against `main` 4329292 (2026-10-04)

# Estado de implementación · 2026-09-28

Punto de entrada operativo para cualquier persona o agente (Codex, Claude Code, ingeniería futura)
que retome Brandopolis **sin acceso a conversaciones previas**. Las conversaciones no son fuente de
verdad; este repositorio sí.

Para arranque, comandos y arquitectura: [NEXT_DEVELOPER_START_HERE](NEXT_DEVELOPER_START_HERE.md).
Para fases y puertas: [SESSION_STATE](../../SESSION_STATE.md).

## 1. Qué es Brandopolis

El Sistema Operativo de Marca: decisiones estratégicas conectadas con evidencia, hipótesis, criterio
humano, versiones, dependencias e impacto del cambio. **La IA propone. El humano decide. Brandopolis
recuerda.** La IA nunca crea una decisión aprobada; sólo un commit humano crea una versión. No hay
cascada automática.

## 2. Estado por superficie

| Superficie | Estado | Nota |
|---|---|---|
| Fases 1–9 (dominio, decisiones, impacto, versiones) | CERRADO para MVP | semántica congelada |
| Workspace PILOT | **CONGELADO FUNCIONALMENTE** | ver §7 |
| Landing pública | **APROBADA (2026-09-28)**, en `origin/main` `d43fd4d` | **desplegada** (SESSION_STATE 2026-09-29) |
| Corpus documental de origen | implementado | `source_documents`, `document_extractions`, `document_claims` |
| Investigación competitiva | implementada, con revisión humana | hallazgos requieren aceptación explícita |
| Autenticación | **autoservicio OIDC verificado + intake obligatorio** | ver §4 |
| Administración | **V1 implementada** en `/admin` | ver §5.bis |
| Telemetría / evidencia | parcial | ver §6 |
| Defecto de cabecera móvil | **CORREGIDO 2026-09-28** | ver §8 |
| `brandopolis.ai` (raíz) | redirige al piloto (SESSION_STATE 2026-09-29); el 403 es histórico | ver §9 |
| Despliegue de producción | **en producción** desde `2f84d29` (landing, auth, admin), con hotfixes posteriores | commit exacto: SESSION_STATE |

## 3. Landing pública aprobada (`d43fd4d`)

Hero concreto, cinta de cinco capacidades con iconos de línea, cuatro pasos reales de «Cómo
funciona», sección «Qué incluye» con seis capacidades numeradas y progresión animada, bloque de
diferenciación, y tarjeta de acceso orientada a cuenta. La cabecera pública se reduce a logo,
«Cómo funciona» y «Entrar al piloto»; «Nueva marca», insignia de modo y selector de marca activa
pertenecen al shell autenticado. Terminología: **Estratega de Marca / Estrategas de Marca**, nunca
«tester» en texto visible.

La landing **vive dentro de la app Node** (`src/transport/public/`, servida por
`src/transport/assets.ts`). No es un sitio estático: `app.js` llama a `/api/mode` y
`/api/session-state` al arrancar. Esto condiciona cómo puede publicarse en el dominio raíz (§9).

## 4. Autenticación — estado en `main`

Implementación en `src/transport/pilot-auth.ts` y `src/application/pilot-access.ts`. La rama
`feat/pilot-auth-admin` está integrada en `main`; lo que sigue describe `main` (4329292).

- OIDC **neutral al proveedor** mediante `openid-client`: discovery sobre `OIDC_ISSUER`.
- Authorization Code + PKCE (S256) + `state` + `nonce` + `prompt=login`.
- Validación de firma (JWKS), issuer, audiencia, expiración y nonce.
- **Identidad canónica = `(issuer, subject)`. Nunca el email.**
- `scope` solicitado: `openid email profile`; los claims se toman sólo del ID token validado.
- **Fail-closed por defecto**: una identidad desconocida es rechazada salvo que `PILOT_AUTO_PROVISION=true`.
  El autoservicio crea cuenta sólo con `email_verified === true`, sin duplicados bajo concurrencia, y
  asigna cohorte determinista por hash de `issuer+subject`. Una identidad ya aprovisionada sigue
  entrando por `(issuer, subject)` aunque el proveedor deje de enviar el email.
- Existen `user_accounts` y `participant_profiles`; el **intake del participante es obligatorio tras
  autenticarse** y se aplica en el servidor.
- Sesión en cookie `__Host-brandopolis_session` (Secure, HttpOnly, SameSite=Strict, host-only).
- DEMO LOCAL usa un token de sesión local, sólo para ingeniería.

Evidencia: `tests/pilot-cases.ts` (identidad verificada, autoservicio sólo si está habilitado, sin
duplicados, cohorte estable). Detalle y certificación multiusuario:
[GOOGLE_AUTH_PRODUCTION](GOOGLE_AUTH_PRODUCTION.md). **Siguen sin implementarse**: contraseña propia,
recuperación y SMTP — ver §11.

## 5. Administración

Implementada en `main` (`src/application/pilot-admin.ts`, `tests/admin.test.ts`) — ver **§5.bis**. La regla que la gobierna sigue siendo
la de siempre: las métricas de adopción viven en `src/application/pilot-access.ts` y la administración
**reutiliza esas definiciones**, nunca crea otras que compitan.

## 5.bis Administración (V1)

Superficie de operador en `/admin`, **separada del workspace del participante** (no comparte el shell
del producto: usarlo hacía que su cabecera heredara la regla global `header{position:sticky}` y tapara
su propia navegación en teléfono).

**Autorización**: tres condiciones, todas obligatorias — sesión PILOT viva, cuenta con correo verificado
por el proveedor, y pertenencia a `BRANDOPOLIS_ADMIN_EMAILS`. Se comprueba **en cada endpoint por
separado**, nunca una vez en el borde. Los rechazos son indistinguibles entre sí: la superficie no
revela por qué dijo que no. Ninguna dirección está compilada en el código.

| Endpoint | Devuelve |
|---|---|
| `GET /api/admin/session` | si esta sesión puede ver administración |
| `GET /api/admin/summary` | resumen del piloto |
| `GET /api/admin/users` | padrón operativo de Estrategas de Marca |
| `GET /api/admin/evidence` | evidencia agregada (acepta `from`/`to`) |
| `GET /api/admin/evidence.csv` | la misma evidencia como CSV |
| `GET /api/admin/feedback` | comentarios e incidencias |
| `POST /api/admin/access-status` | suspender o reactivar |

**Definiciones de métricas**: las cifras canónicas vienen de `report()`/`metrics()` en
`pilot-access.ts`, que **ya excluyen la actividad de marcas demo en el servidor**. La administración no
recalcula evidencia: si lo hiciera, las exclusiones de CoffeePolis podrían divergir entre superficies.
Lo que esta capa añade es operativo (intake completo, marcas reales por participante) y se calcula
desde registros clasificados, nunca inferido de un nombre.

- **Marcas reales** y **marcas demo** se reportan por separado, siempre.
- Métricas que la arquitectura **no puede derivar hoy** se devuelven en `unavailable` y se muestran como
  tales: `aiCostPerDecision`, `aiCostPerActiveBrand`, `willingnessToPay`, `pilotPaidConversion`. No se
  inventan. `documentEngagement`, `phaseCompletionCounts` y `optionActionCounts` se derivan desde
  2026-09-29 (ver §6.ter; `optionActionCounts.discarded` sigue en `null`). Evidencia:
  `src/application/pilot-admin.ts`, `tests/admin.test.ts`.
- La evidencia agregada no contiene filas identificables: sólo conteos por categoría. **La ciudad se
  omite incluso en agregado**, porque en un piloto pequeño un conteo de uno señala a una persona.

**Control de estado**: un operador puede suspender y reactivar. `PENDING` no se asigna a mano en este
piloto. La suspensión revoca sesiones por la lógica que ya existía, y **reactivar nunca resucita una
identidad desactivada con `disable()`**: esa sigue siendo la desactivación dura. Cada cambio queda
auditado contra el operador que lo hizo.

**Nunca sale de esta capa**: texto de decisiones, contenido de documentos, contexto estratégico,
tokens de sesión, OIDC o recuperación, ni hashes.

**Pendiente para una iteración posterior**: filtros de fecha en la interfaz (el endpoint ya los acepta),
estados de flujo para comentarios (`NEW/IN_REVIEW/RESOLVED/DISMISSED`) y exportación operativa del
padrón. Las métricas de retención D7/D14/D30 ya se derivan (§6.ter) y devuelven `null` mientras la
ventana no ha transcurrido.

## 6. Telemetría y evidencia

Envelope canónico en `telemetry` (`schemas/`), `workspaceId` anulable. Existen eventos de producto y
capacidad (`capability_events`). `account_created` y `session_started` se registran en `pilot_events`
(`src/application/pilot-access.ts`) y figuran como READY en
[FOUNDING_PILOT_ANALYTICS_READINESS](../09-validation/FOUNDING_PILOT_ANALYTICS_READINESS.md).
**No instrumentado todavía**: `password_created`, `password_reset_requested`,
`password_reset_completed`, `login_failed`, `email_delivery_failed`. Cualquier métrica de evidencia que
dependa de ellos debe declararse **no disponible** hasta que existan; no se inventan cifras.

## 6.bis Entorno competitivo es preparación, no una quinta decisión · 2026-09-29

La investigación competitiva **informa** a Cliente principal, Modelo de valor y Posicionamiento, así
que vive en la navegación bajo **PREPARACIÓN ESTRATÉGICA**, por encima de «Estrategia». Esto es
arquitectura de información, no un cambio de dominio:

- **No es una decisión.** No tiene número, no tiene `data-module`, no entra en la Decision Spine y
  **no suma al conteo «X de 4»**. Las métricas de activación no cambian. (Desde el 2026-10-06 el conteo es «X de N» y las marcas nuevas tienen seis secciones: [ADR-0021](../14-decisions/ADR-0021.md).)
- En **Contexto vigente** aparece en su propio bloque, «Contexto del mercado», con estado
  **Sin investigar · Pendiente de revisión · Revisado**, separado de «Lo que ya decidiste».
- El estado se **deriva de estado canónico**, no de lo que muestre la pantalla: los hallazgos
  incorporados son evidencia del Brand Context y los descartados son rechazos registrados; ambos
  sobreviven a una recarga. Los candidatos sin resolver existen sólo dentro de la ronda que los
  produjo — nunca son estrategia — así que el estado almacenado se lee como *Revisado* o
  *Sin investigar*, jamás como una revisión pendiente sin nada que revisar.
- Al resolver **todos** los hallazgos se muestra la entrega «Contexto competitivo revisado», cuyo
  destino sale de `nextPhase()`, el recorrido canónico: no existe una segunda ordenación de fases.

La navegación se compactó para que «Mi aprendizaje» y «Mapa estratégico» no queden fuera de
vista al añadir un cuarto grupo. **No se eliminó ni se colapsó ningún elemento**: el ahorro es de
espaciado, y el objetivo táctil de 44px se conserva donde el puntero puede ser grueso (se reduce a
36px sólo bajo `(pointer: fine)`). Medido: a **1366×768 el Blueprint entra sin scroll**.

Terminología (2026-09-29): la vista conectada se llama **«Mapa estratégico»** para participantes.
«Blueprint» es jerga del oficio. Los nombres técnicos no cambian: `#blueprint`, `/api/blueprint`,
`/api/blueprint/pdf`, `engine.blueprint()` y el nombre de archivo del PDF siguen igual, así que
ninguna URL se rompe. Exportación en PDF y la decisión completa:
[BLUEPRINT_PDF_EXPORT](BLUEPRINT_PDF_EXPORT.md).

## 6.ter Analítica de producto del Founding Pilot · 2026-09-29

Capa mínima fiable para operar los primeros 12-20 Estrategas de Marca. Tabla de preparación y motivos:
[FOUNDING_PILOT_ANALYTICS_READINESS](../09-validation/FOUNDING_PILOT_ANALYTICS_READINESS.md).
Definiciones canonicas: [metrics.md](../09-validation/metrics.md), que no se redefine.

- Verdad canonica: telemetria de primera parte. GA4 es senal agregada y nunca fuente de Decisiones,
  activacion, retencion ni estado por inquilino. /admin/ presenta lo derivado de la primera parte.
- READY para arrancar: registro, login, intake, primera marca real, activacion y tasa, TTFI, TTFD,
  sesiones, ultimo acceso, recurrencia, Mapa estrategico visto y descargado, propuestas y fallos de IA,
  segunda marca real, Evidence Engagement, progresion por fase, Strategy Ready y Human Override.
- PARTIAL: optionActionCounts (descartar es estado de sesion en el cliente y no se persiste) y
  D7/D14/D30 (derivadas, pero sin tiempo transcurrido todavia; devuelven null, no falso).
- DEFERRED: coste de IA por decision y por marca activa, WTP y conversion de pago. Ninguna bloquea el
  arranque de testers.
- Sin dashboard nuevo, sin proveedores, sin migracion, sin dependencias.

## 7. Congelación del producto PILOT

El workspace PILOT está congelado para comportamiento de producto. La definición única y vigente
(incluida la excepción de hardening documental y de tooling del 2026-10-04) está en
[CLAUDE.md § Pilot freeze](../../CLAUDE.md#pilot-freeze); no se repite aquí. La lista de categorías
permitidas que figuraba en esta sección (2026-09-28) quedó sustituida por esa definición.

## 8. Defecto de cabecera móvil — corregido

`.app header .header-brand-control` estaba en `position:absolute` centrado con `z-index:2`
(`product-shell.css`). Al pasar la cabecera a `display:flex` en ≤900px, su `margin-left:auto` era
inerte y el control quedaba **flotando sobre** `#new-brand`; además el `select` conservaba un suelo
de `min-width:150px` de un bloque `@media (max-width:1280px)` posterior y se desbordaba de su propio
contenedor. Resultado: el `select` interceptaba los clics de «Nueva marca» y **6 pruebas e2e móviles
fallaban**.

Corrección (sólo `product-responsive.css`): en ≤900px el control entra en el flujo
(`position:static`, `flex:1 1 auto`, `min-width:0`, `grid-template-columns:minmax(0,1fr)`) y el
`select` pierde el suelo de 150px. En ≤767px la insignia de modo se oculta: ocupaba 74px de una fila
de 358px y dejaba el selector en 49px.

Verificado en navegador real a 360/390/768/1440: sin solape geométrico, «Nueva marca» recibe sus
clics y abre el diálogo, el selector mide 100–230px y sigue cambiando de marca, sin desbordamiento
horizontal, con 54 marcas y nombres de 45 caracteres en la base.

## 9. Dominio raíz y despliegue

**Actualización 2026-10-04 (evidencia: SESSION_STATE 2026-09-29):** la landing aprobada está desplegada, `brandopolis.ai` redirige al piloto (302 que conserva la ruta) y producción corrió `2f84d29` con hotfixes posteriores. El resto de esta sección es el diagnóstico histórico.

Histórico: `https://brandopolis.ai` devolvía **403 de Apache/cPanel**. El repositorio **no documenta ninguna
arquitectura Apache/cPanel**; la topología canónica es Node detrás de un proxy que conserva el
`Host`. Diagnóstico completo, restricciones de código que lo condicionan y runbook de servidor:
[ROOT_DOMAIN_403_REMEDIATION](ROOT_DOMAIN_403_REMEDIATION.md).

**Commit y push no son despliegue.** El commit desplegado exacto sólo consta en SESSION_STATE.

## 10. Prioridades canónicas

1. ~~Remediación del dominio raíz y publicación de la landing.~~ Resuelto (SESSION_STATE 2026-09-29).
2. ~~Despliegue de Auth/Admin en producción tras revisión.~~ Resuelto: incluido en `2f84d29`.
3. Recolección de evidencia del piloto.
4. Integración de comentarios e incidencias en el admin.
5. Zona geográfica de influencia en onboarding y Brand Context (captura en nueva marca ya implementada; ver §11).
6. Controles de administración más ricos.
7. Refinamientos restantes del workspace (congelados: [CLAUDE.md § Pilot freeze](../../CLAUDE.md#pilot-freeze)).
8. Trabajo de validación y escala.

## 11. Trabajo diferido (no implementado)

Pendiente de una pasada dedicada, con su propio diseño, migraciones y pruebas:

- **Autenticación** (resto pendiente; scope ampliado, `email_verified`, `PILOT_AUTO_PROVISION`,
  aprovisionamiento sin duplicados, cohorte determinista y perfil de cuenta ya están en `main`, §4):
  contraseña propia opcional (Argon2id o scrypt, nunca texto plano, nunca contraseñas generadas por
  email); login email+contraseña resolviendo al mismo usuario canónico; recuperación con token
  aleatorio almacenado **sólo como hash**, de un solo uso, caducidad ~30 min, respuesta neutra
  siempre; SMTP neutral al proveedor.
- **Administración**: implementada en `main` (§5.bis); queda pendiente sólo lo listado allí.
- **Comentarios e incidencias** (alta prioridad, siguiente iteración de admin):
  «Compartir feedback» → «Compartir comentarios»; admin «Comentarios e incidencias» con vistas
  Comentarios / Problemas reportados; estados `NEW/IN_REVIEW/RESOLVED/DISMISSED`
  (Nuevo / En revisión / Resuelto / Descartado); métricas de comentarios recibidos, problemas
  reportados, abiertos y resueltos. **No implementar sin instrucción explícita.**
- **Zona geográfica de influencia** (onboarding y Brand Context). **Parcialmente implementada**: el
  diálogo canónico de nueva marca la pregunta de forma opcional y se persiste en `brand_profiles`
  (`geographicInfluence`, `primaryMarket`; el diálogo en `tests/pre-tester.test.ts`, la persistencia en `tests/pilot-cases.ts`). No está verificado que se
  propague a recomendaciones, investigación ni Brand Context; eso sigue pendiente. Pregunta estratégica
  *¿En qué mercado geográfico compite y quiere crecer esta marca?* con valores sugeridos
  Local/ciudad · Regional · Nacional · LATAM · Internacional/global, y «Mercados prioritarios»
  opcional. **Principio crítico: nunca asumir que el lugar donde opera una marca equivale a su
  mercado estratégico.** Impacta cliente, competencia, posicionamiento, precio, mensaje, canales,
  investigación, evidencia y recomendaciones de expansión.

## 12. Reglas para Claude Code y Codex

- El flujo del workspace PILOT está congelado (§7).
- No rediseñes UI aprobada sin instrucción explícita.
- No debilites el aislamiento por tenant.
- No saltes la aprobación humana; la IA no crea decisiones aprobadas.
- La documentación del repositorio es autoritativa; los chats no lo son.
- Registra las decisiones arquitectónicas (ADR) cuando cambien contratos.
- Actualiza `SESSION_STATE.md`, `CHANGELOG.md` y la documentación canónica afectada tras trabajo
  material.
- No ejecutes migraciones de producción ni despliegues desde una tarea local.
