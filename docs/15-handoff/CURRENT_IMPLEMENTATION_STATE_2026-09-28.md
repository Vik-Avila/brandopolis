Status: derived
Owner: Product / Engineering
Canonical: no
Last reviewed: 2026-09-28
Related: docs/15-handoff/NEXT_DEVELOPER_START_HERE.md, docs/15-handoff/ROOT_DOMAIN_403_REMEDIATION.md, docs/15-handoff/POST_MVP_DEFERRED_SCOPE.md
Depends on: Landing commit d43fd4d (2026-09-28)

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
| Landing pública | **APROBADA (2026-09-28)**, en `origin/main` `d43fd4d` | **no desplegada** |
| Corpus documental de origen | implementado | `source_documents`, `document_extractions`, `document_claims` |
| Investigación competitiva | implementada, con revisión humana | hallazgos requieren aceptación explícita |
| Autenticación | **OIDC genérico, sin cambios** | ver §4 |
| Administración | **NO EXISTE** | ver §5 |
| Telemetría / evidencia | parcial | ver §6 |
| Defecto de cabecera móvil | **CORREGIDO 2026-09-28** | ver §8 |
| `brandopolis.ai` (raíz) | **BLOQUEADO — 403 de Apache/cPanel** | ver §9 |
| Despliegue de producción | **NO REALIZADO** para `d43fd4d` | ver §9 |

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

## 4. Autenticación — estado actual, sin cambios en esta tarea

Implementación en `src/transport/pilot-auth.ts` (102 líneas) y `src/application/pilot-access.ts`.

- OIDC **neutral al proveedor** mediante `openid-client`: discovery sobre `OIDC_ISSUER`.
- Authorization Code + PKCE (S256) + `state` + `nonce` + `prompt=login`.
- Validación de firma (JWKS), issuer, audiencia, expiración y nonce.
- **Identidad canónica = `(issuer, subject)`. Nunca el email.**
- `scope` solicitado: **`openid` únicamente** — no se piden `email` ni `profile`.
- **Fail-closed**: una identidad no aprovisionada previamente es rechazada. No hay autoservicio.
- Sesión en cookie `__Host-brandopolis_session` (Secure, HttpOnly, SameSite=Strict, host-only).
- DEMO LOCAL usa un token de sesión local, sólo para ingeniería.

**Nada de esto se modificó el 2026-09-28.** Los cambios pedidos (scope `openid email profile`,
`PILOT_AUTO_PROVISION`, perfil de cuenta, contraseña propia, recuperación por email, SMTP) están
**pendientes de implementación** — ver §11.

## 5. Administración

**No existe superficie `/admin`.** No hay endpoints `/api/admin/*`, ni allowlist
`BRANDOPOLIS_ADMIN_EMAILS`, ni vistas de Resumen / Estrategas de Marca / Configuración.
Las métricas de adopción existentes viven en `src/application/pilot-access.ts` y en el informe de
piloto; cualquier admin futuro debe **reutilizar esas definiciones**, no crear otras que compitan.

## 6. Telemetría y evidencia

Envelope canónico en `telemetry` (`schemas/`), `workspaceId` anulable. Existen eventos de producto y
capacidad (`capability_events`). **No instrumentado todavía**: `account_created`, `session_started`,
`password_created`, `password_reset_requested`, `password_reset_completed`, `login_failed`,
`email_delivery_failed`. Cualquier métrica de evidencia que dependa de ellos debe declararse
**no disponible** hasta que existan; no se inventan cifras.

## 7. Congelación del producto PILOT

> **El workspace PILOT está funcionalmente completo para esta fase de validación.**
>
> No modifiques su UI ni su flujo estratégico salvo para: desbloquear autenticación, soportar
> administración, soportar telemetría/evidencia, corregir un defecto crítico, o mantener
> seguridad/aislamiento. Toda mejora de producto va al backlog, no al código.

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

`https://brandopolis.ai` devuelve **403 de Apache/cPanel**. El repositorio **no documenta ninguna
arquitectura Apache/cPanel**; la topología canónica es Node detrás de un proxy que conserva el
`Host`. Diagnóstico completo, restricciones de código que lo condicionan y runbook de servidor:
[ROOT_DOMAIN_403_REMEDIATION](ROOT_DOMAIN_403_REMEDIATION.md).

**Commit y push no son despliegue.** `d43fd4d` está en `origin/main` y **no** en producción.

## 10. Prioridades canónicas

1. Remediación del dominio raíz y publicación de la landing.
2. Despliegue de Auth/Admin en producción tras revisión.
3. Recolección de evidencia del piloto.
4. Integración de comentarios e incidencias en el admin.
5. Zona geográfica de influencia en onboarding y Brand Context.
6. Controles de administración más ricos.
7. Refinamientos restantes del workspace.
8. Trabajo de validación y escala.

## 11. Trabajo diferido (no implementado)

Pendiente de una pasada dedicada, con su propio diseño, migraciones y pruebas:

- **Autenticación**: `scope` `openid email profile`; exigir `email_verified === true`;
  `PILOT_AUTO_PROVISION` (por defecto `false`, fail-closed cuando está apagado); aprovisionamiento
  transaccional sin duplicados bajo concurrencia; cohorte determinista por hash de `issuer+subject`
  (nunca `Math.random()`); perfil de cuenta; contraseña propia opcional (Argon2id o scrypt, nunca
  texto plano, nunca contraseñas generadas por email); login email+contraseña resolviendo al mismo
  usuario canónico; recuperación con token aleatorio almacenado **sólo como hash**, de un solo uso,
  caducidad ~30 min, respuesta neutra siempre; SMTP neutral al proveedor.
- **Administración**: `/admin` con autorización server-side por `BRANDOPOLIS_ADMIN_EMAILS`, resumen,
  lista de Estrategas de Marca (sólo metadatos operativos: nunca hashes, tokens, documentos ni
  contenido estratégico) y `GET /api/admin/summary`, `GET /api/admin/users`, cada uno validando
  autorización de forma independiente.
- **Comentarios e incidencias** (alta prioridad, siguiente iteración de admin):
  «Compartir feedback» → «Compartir comentarios»; admin «Comentarios e incidencias» con vistas
  Comentarios / Problemas reportados; estados `NEW/IN_REVIEW/RESOLVED/DISMISSED`
  (Nuevo / En revisión / Resuelto / Descartado); métricas de comentarios recibidos, problemas
  reportados, abiertos y resueltos. **No implementar sin instrucción explícita.**
- **Zona geográfica de influencia** (onboarding y Brand Context): pregunta estratégica
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
