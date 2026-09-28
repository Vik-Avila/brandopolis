Status: derived
Owner: Product / Engineering
Canonical: no
Last reviewed: 2026-09-28
Related: docs/15-handoff/PILOT_DEPLOYMENT_CONTRACT.md, docs/15-handoff/CURRENT_IMPLEMENTATION_STATE_2026-09-28.md, docs/15-handoff/PILOT_LEARNING_LOOP.md
Depends on: Pilot landing deployed (d43fd4d)

# GA4 · analítica del piloto

## 1. Para qué sirve, y para qué no

| | GA4 | Telemetría interna de Brandopolis |
|---|---|---|
| Naturaleza | analítica de comportamiento y navegación | **evidencia canónica** operativa y estratégica |
| Responde | cuánta gente llega, desde dónde, qué recorre, si vuelve | activación, tiempo a la primera decisión, uso de IA, aprendizaje |
| Fuente | navegador, con bloqueadores y consentimiento de por medio | base de datos PILOT, escrita por el servidor |
| Fiabilidad | aproximada; se pierde tráfico | exacta |
| Sirve para decidir producto | orientación | **sí, es la fuente de verdad** |

**GA4 nunca es la capa de evidencia canónica.** Las métricas que sostienen cualquier afirmación sobre
el piloto —`account_created`, `session_started`, activación, tiempo a primera decisión, tiempo a primer
insight, segunda marca, usuario que vuelve, peticiones y fallos de IA, interacción con documentos y
evidencia— provienen de `pilot_events`, `capability_events` y el informe del piloto
(`src/application/pilot-access.ts`). Si GA4 y la telemetría interna discrepan, **manda la interna**.

## 2. Configuración

Una sola variable, neutral al proveedor:

```
GA4_MEASUREMENT_ID=G-XXXXXXXXXX
```

- **Sin definir o vacía → GA4 queda completamente desactivado**: no se pide ningún script, no se
  inyecta nada, no se define ningún global y la CSP no se toca.
- **Mal formada → el proceso falla al arrancar** (`src/transport/analytics.ts`). Un error tipográfico
  se ve de inmediato en lugar de perder silenciosamente toda la medición.
- No hay ningún Measurement ID escrito en el código.

El servidor publica el valor en `GET /api/mode` (`ga4MeasurementId`), junto a `mode`,
`requestAccessUrl` y `aiNotice`. El cliente no lo adivina ni lo lleva embebido.

## 3. Content-Security-Policy

La aplicación envía una CSP estricta. GA4 **no puede funcionar** bajo `script-src 'self'`, así que la
política se amplía **sólo mientras hay un Measurement ID configurado**, y sólo con los orígenes de
Google:

```
script-src  'self' https://www.googletagmanager.com
connect-src 'self' https://www.google-analytics.com https://analytics.google.com https://region1.google-analytics.com
img-src     'self' data: <los mismos orígenes de transporte>
```

Con GA4 apagado la cabecera es **byte a byte la de siempre**; hay una prueba que lo fija. Nunca se
introduce `unsafe-inline` ni `unsafe-eval`: el arranque de gtag vive en `/analytics.js`, un módulo del
mismo origen, precisamente para no necesitar un `<script>` en línea.

## 4. Reglas de privacidad

**Nunca** salen del navegador: email, nombre visible, identificador de usuario, workspace, marca,
contenido de documentos o decisiones, texto estratégico, tokens de sesión o recuperación, ni
identificadores OIDC.

Esto no se confía a la disciplina de quien escribe el código: `sanitise()` en
`src/transport/public/analytics.js` aplica una **allowlist**. Toda clave fuera de ella se descarta, y
dentro de ella se rechaza cualquier valor que parezca un identificador (UUID), contenga `@`, `:`, `/`
o `\`, o supere 40 caracteres.

Dimensiones permitidas: `cohort` (A/B), `auth_method`, `pilot_stage`, `mode`.

Funciones de publicidad desactivadas explícitamente: `allow_google_signals: false`,
`allow_ad_personalization_signals: false`, `anonymize_ip: true`. No se usa Google Signals ni
personalización de anuncios.

## 5. Eventos

Sólo hitos reales. **Ningún evento «completado» se dispara porque una página se haya renderizado.**

| Evento | Se emite cuando | Dónde |
|---|---|---|
| `pilot_landing_view` | arranque público no autenticado en `/` | `app.js`, tras `/api/mode` |
| `pilot_login_started` | clic real en un enlace a `/auth/login` | `app.js`, delegación de clic |
| `pilot_login_completed` | el callback OIDC vuelve con `?login=ok` **y** hay sesión | `app.js`, tras `session-state` |
| `onboarding_started` | workspace autenticado sin contexto estratégico | `app.js`, estado vacío |
| `brand_created` | la API confirmó la creación de la marca | `app.js`, tras `createBrand` |
| `first_strategic_decision` | commit correcto **y** el contexto queda con exactamente una versión | `app.js`, tras `decisions/commit` |
| `pilot_feedback_opened` | se abre la vista de feedback | `app.js`, `showFeedback` |

`pilot_login_completed` fue posible añadiendo `?login=ok` a la redirección de éxito del callback
(`pilot-auth.ts`), simétrica al `?login=<motivo>` que ya existía en los fallos. El parámetro se
elimina con `history.replaceState` justo después, igual que hace la ruta de error.

Los hitos que deben contar una vez por carga usan `sendOnce`, de modo que un re-render no los infla.
GA4 sigue emitiendo `page_view` y la medición de interacción por su cuenta: no se duplican.

## 6. Consentimiento y postura legal

El repositorio **no contiene hoy ninguna arquitectura de consentimiento**: no hay banner de cookies,
política de privacidad publicada ni registro de consentimiento. El único aviso al usuario que existe
es el de uso de datos con IA (`config/pilot/ai-notice.v1.md`), con su propia aceptación.

Por tanto, **no se inventó un sistema de consentimiento**. Lo que hay que decidir antes de activar
GA4 en producción:

- GA4 con `anonymize_ip` y sin Google Signals sigue usando **cookies de origen propio** (`_ga`) y
  trata datos personales bajo el RGPD/LFPDPPP.
- Para un piloto por invitación con participantes informados, muchos equipos lo consideran interés
  legítimo/analítica esencial; **esa es una decisión de producto y legal, no de ingeniería.**
- Si se exige consentimiento previo, la vía natural es cargar `/analytics.js` sólo después de la
  aceptación: `init()` ya es perezoso e idempotente, así que basta con retrasar su llamada.

**Estado: pendiente de decisión humana.** Dejar `GA4_MEASUREMENT_ID` sin definir mantiene el piloto
exactamente como está hoy.

## 7. Despliegue

1. Crear la propiedad GA4 y obtener el Measurement ID.
2. En el entorno de `pilot.brandopolis.ai`, la propiedad de producción es:

   ```
   GA4_MEASUREMENT_ID=G-PVKQ2K90EQ
   ```

   Se configura **sólo como variable de entorno**. El Measurement ID no es un secreto (queda visible en el
   HTML servido una vez activo), pero no se escribe en el código: el servidor lo publica en `/api/mode`.
3. **Reiniciar `brandopolis-pilot.service`.** La CSP y el ID se resuelven al construir la aplicación, y
   los assets se cachean en memoria por proceso: sin reinicio no cambia nada de cara al público
   ([PRODUCTION_RECONCILIATION_RUNBOOK](PRODUCTION_RECONCILIATION_RUNBOOK.md)).

Verificación:

```bash
curl -sS https://pilot.brandopolis.ai/api/mode                      # ga4MeasurementId no nulo
curl -sSI https://pilot.brandopolis.ai/ | grep -i content-security  # googletagmanager presente
```

En GA4: **Informes → Tiempo real** debe mostrar la visita, y **Administrar → DebugView** los eventos
con detalle (activa el modo de depuración en el navegador). Comprueba en DebugView que los parámetros
de cada evento son únicamente `cohort`, `auth_method`, `pilot_stage` o `mode`.

Para desactivar: borrar la variable y reiniciar. La CSP vuelve a su valor original.

## 8. Limitaciones

- Bloqueadores de anuncios y el modo de seguimiento reducido eliminan una parte del tráfico; los
  totales de GA4 serán **inferiores** a los de la telemetría interna. Es esperado, no un fallo.
- `first_strategic_decision` se deduce en el cliente de que el contexto quede con exactamente una
  versión aprobada. Es fiable en el recorrido normal, pero la cifra canónica de activación es la
  interna, que se calcula en el servidor.
- GA4 no distingue Estrategas de Marca entre sí (por diseño: no se envían identificadores). Cualquier
  análisis por persona o por cohorte a nivel individual se hace con la telemetría interna.
- No hay consentimiento implementado (§6).
