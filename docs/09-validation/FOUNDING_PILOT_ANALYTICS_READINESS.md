Status: canonical
Owner: Product / Engineering
Canonical: yes
Last reviewed: 2026-09-29
Related: docs/09-validation/metrics.md, docs/15-handoff/GA4_PILOT_ANALYTICS.md, docs/15-handoff/CURRENT_IMPLEMENTATION_STATE_2026-09-28.md
Depends on: Founding Pilot analytics pass (2026-09-29)

# Founding Pilot · preparación analítica

Puede el operador responder, con 12–20 Estrategas de Marca, quién entró, quién activó, cuánto tardó en
llegar al valor, hasta dónde llegó, cómo usó la IA y quién volvió. **Las definiciones canónicas viven en
[docs/09-validation/metrics.md](metrics.md) y no se redefinen aquí.**

## Fuentes de verdad

| Capa | Rol |
|---|---|
| **Telemetría de producto de primera parte** (`pilot_events`, `telemetry`, estado persistente) | **verdad canónica** operativa y de producto |
| **GA4** (`G-NTSD86N2LT`, por entorno) | señal agregada de comportamiento, adquisición y embudo |
| **`/admin/`** | presentación para el operador, derivada de la primera parte |

GA4 **nunca** es fuente canónica de Decisiones, activación, retención, economía de IA ni estado por
inquilino. Ningún contenido estratégico, identificador ni texto de participante sale hacia GA4.

## Estado por métrica

| Métrica | Señal | Verdad | Estado |
|---|---|---|---|
| Participante registrado | `account_created`, `pilot_identities` | 1ª parte | **READY** |
| Login correcto | `session_started` | 1ª parte | **READY** |
| Intake completo | fila en `participant_profiles` | 1ª parte | **READY** |
| Primera marca real | `brand_created` (demo excluido) | 1ª parte | **READY** |
| Activación / tasa | primera `decision_created` aprobada | 1ª parte | **READY** |
| TTFI | `brand_created` → `recommendation_generated` | 1ª parte | **READY** |
| TTFD | `brand_created` → primera Decisión | 1ª parte | **READY** |
| Sesiones · último acceso · recurrente | `session_started`, `user_accounts.lastLoginAt` | 1ª parte | **READY** |
| Mapa estratégico visto | `blueprint_viewed` | 1ª parte | **READY** |
| Mapa estratégico descargado | `blueprint_pdf_exported` | 1ª parte | **READY** |
| Propuestas IA · fallos | `recommendation_requested`, `analysis_failed` | 1ª parte | **READY** |
| Segunda marca real | marcas reales distintas > 1 | 1ª parte | **READY** |
| Evidence Engagement | `evidence_panel_opened` / expuestos a propuesta | 1ª parte | **READY** |
| phaseCompletionCounts | versión activa por módulo (estado) | 1ª parte | **READY** |
| Strategy Ready | preguntas decididas y sin revisión HARD abierta | 1ª parte | **READY** |
| Human Override | auditoría estratégica × propuesta × versión | 1ª parte | **READY** |
| Decisiones aceptadas / modificadas / rechazadas | misma derivación | 1ª parte | **READY** |
| optionActionCounts | incorporadas/modificadas y rechazadas | 1ª parte | **PARTIAL** |
| D7 / D14 / D30 | ventanas sobre marcas de tiempo | 1ª parte | **PARTIAL** |
| AI Cost per Decision / per Active Brand | — | — | **DEFERRED** |
| WTP · conversión de pago | — | — | **DEFERRED** |

### PARTIAL, con motivo

- **optionActionCounts.** «Incorporar» y «Modificar» quedan registradas porque terminan en una versión
  con procedencia auditada. **«Descartar» es estado de sesión en el cliente y no se persiste**, así que
  se reporta `null` en lugar de cero: un cero afirmaría que nadie descartó nada, y eso no se sabe.
- **D7 / D14 / D30.** La derivación existe y es canónica (activados con un High-Value Strategic Event en
  la ventana día ±1). Devuelve `null` mientras la ventana no ha cerrado, de modo que una ausencia por
  falta de tiempo transcurrido **nunca se lee como abandono**. Con el piloto empezando, lo esperable es
  `null`. No bloquea el arranque: sólo necesita que pase el tiempo.

### DEFERRED, con motivo

- **Economía de IA.** No se captura coste ni consumo por petición. Calcularlo exigiría **capturar coste
  por llamada**, es decir columnas nuevas: se reporta ausente en lugar de aproximarse.
- **WTP y conversión de pago.** No existe superficie de oferta ni de pago. Es validación comercial
  posterior, no medición de producto.

Ninguno de los cuatro impide empezar a probar con 12–20 personas.

## Señales añadidas en esta fase

Dos nombres nuevos dentro del sobre existente `pilot_events`/`telemetry`. **Sin tabla, sin columna, sin
migración.**

- **`blueprint_pdf_exported`** — la exportación reutiliza `engine.blueprint()`, así que una descarga era
  indistinguible de una vista. Se registra **después** de construir el documento: un fallo no cuenta.
- **`evidence_panel_opened`** — Evidence Engagement canónico es «expuestos que **abren** Evidence». El
  panel se renderiza abierto pero vive detrás de la pestaña «Evidencia e hipótesis», así que elegir esa
  pestaña es el acto real de ir a mirar la evidencia. Se registra **una vez por marca y carga de página**:
  la métrica cuenta personas, no miradas.

No se añadió ningún evento de GA4: ninguno habría mejorado el embudo agregado sin duplicar verdad de
primera parte.

## Corrección de anclaje en TTFI y TTFD

`metrics.md` define TTF Insight «desde primer Brand/Question» y TTF Decision «desde comienzo de Brand».
Ambos se medían desde `session_started`, lo que arranca el reloj antes de que exista una marca e **infla
las dos cifras**. Corregido al ancla canónica, con la sesión como respaldo documentado para eventos
anteriores a cualquier marca. No es una redefinición: es alinearse con la definición que ya existía. Se
corrige ahora porque todavía no hay testers reales y no se pierde comparabilidad.

## Privacidad

Las exclusiones de marcas demo siguen aplicándose en cada métrica de participante. `/admin/` muestra
sólo datos ya autorizados al operador; la exportación agregada sigue siendo recuentos y tasas, sin
identificadores ni texto estratégico. No se añadió `user_id` a GA4.
