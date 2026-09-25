Status: derived
Owner: Engineering / Product
Canonical: no
Last reviewed: 2026-09-25
Related: docs/14-decisions/ADR-0014.md, docs/14-decisions/ADR-0005.md
Depends on: Live Pilot Launch Gate 2026-09-25

# Lanzamiento del proveedor de IA (PILOT)

**La IA propone. Tú decides. Brandopolis recuerda.** Ninguna propuesta se convierte en decisión sin aprobación humana. No se ha realizado ninguna llamada real a la API: todo lo siguiente se verificó con respuestas simuladas.

## Variables

| Variable | Uso |
|---|---|
| `ANTHROPIC_API_KEY` | Clave server-side. Nunca en el navegador, logs ni trazas. |
| `ANTHROPIC_MODEL` | Modelo fijado en el servidor; el cliente no puede elegirlo. Sugerido: `claude-opus-5`. |
| `AI_TIMEOUT_MS` | Límite por propuesta (defecto 30000). |
| `PILOT_AI_DAILY_CAP_PER_TESTER` / `PILOT_AI_DAILY_CAP_TOTAL` | Topes de propuestas en 24 h (defecto 30 / 300). |
| `PILOT_AI_NOTICE_FILE` | Texto del aviso de datos (defecto `config/pilot/ai-notice.v1.md`). |

Ambas `ANTHROPIC_*` o ninguna; `pnpm pilot:validate-config` lo verifica.

## Protecciones de coste

- Contexto por solicitud limitado a 20 000 caracteres (Context Assembler con reserva de información crítica); `max_tokens` 16 000 por respuesta.
- Modelo elegido sólo en el servidor.
- Límites por sesión (20 cada 10 min) y topes diarios por tester y totales, contados desde la telemetría persistida (sobreviven reinicios). Un tope en `0` desactiva las propuestas.
- `pnpm pilot:operator report` muestra solicitudes y fallos de IA.
- Recomendación: configurar además un límite de gasto mensual en la consola del proveedor.

## Comportamiento verificado ante fallos

Salida validada contra el schema v1 y el Evidence Guard. `refusal`, `max_tokens` (truncada), JSON inválido, 429, 5xx, fallo de conexión y timeout producen un error tipado, **sin** versión de decisión, auditoría, revisión ni impacto nuevos, y con telemetría `recommendation_requested` + `analysis_failed`. El tester ve «No se pudo generar una propuesta válida. Puedes continuar con tu decisión humana» y puede reintentar. PILOT nunca sustituye la IA por la fixture DEMO.

## Aviso de datos y aceptación

Antes de la primera propuesta, cada tester ve el aviso configurado y debe pulsar «Entiendo y acepto». La aceptación se guarda como evento por tester y versión del texto (hash); cambiar el texto vuelve a pedirla. Rechazarlo no bloquea el uso: puede decidir sin IA. Con la IA desactivada no se pide aviso (no se envía nada).

Texto actual (reemplazable, **no es asesoría legal**; revísalo antes de activar la API):

> Para generar una propuesta, Brandopolis envía al proveedor de IA configurado el contexto relevante de esta marca: tus decisiones, aportaciones, hipótesis y evidencia registradas. No envía tu email ni tus credenciales. La propuesta es sólo una sugerencia: ninguna decisión cambia sin tu aprobación. No incluyas secretos ni datos personales de terceros. Puedes usar Brandopolis sin pedir propuestas de IA.

## Desactivar la IA con seguridad

Quitar `ANTHROPIC_API_KEY` y `ANTHROPIC_MODEL` y reiniciar (`pnpm pilot:start`). Alternativa sin tocar la clave: `PILOT_AI_DAILY_CAP_TOTAL=0`. El resto del producto sigue funcionando.

## DEMO

La demo del concurso usa `DemoProvider` determinista en su propia base local, sin red, sin clave y etiquetado DEMO. No depende de este proveedor.

## Qué se necesita de ti

Cuenta de Anthropic, clave, modelo, presupuesto mensual y aprobación del texto del aviso.
