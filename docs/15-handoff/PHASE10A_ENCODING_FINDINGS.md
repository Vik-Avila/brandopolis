# Phase 10A — diagnóstico UTF-8

## Causa comprobada

La inspección de la base local DEMO (127.0.0.1:55432) encontró 62 preguntas persistidas con mojibake: 31 de Core Message y 31 de Value Mechanism. Su texto coincide exactamente con la pregunta canónica codificada como UTF-8 y reinterpretada como Latin-1. Son datos antiguos conservados al reutilizar las marcas, no una conversión actual de las respuestas HTTP. No se identificó el comando histórico que produjo esos datos.

Las fuentes actuales de producto, seed, configuración y prompts no contienen las secuencias comunes revisadas. PostgreSQL reportó `server_encoding=UTF8` y `client_encoding=UTF8`. El bootstrap usa `--encoding=UTF8`; configuración y archivos se leen como UTF-8; HTML, JS y JSON se sirven con charset UTF-8. Una prueba real de escritura/lectura en tabla temporal, seguida de rollback, conservó exactamente texto y bytes de `¿ ¡ á é í ó ú ü ñ Á É Í Ó Ú Ü Ñ`.

## Reparación acotada

`node scripts/demo-encoding.mjs` inspecciona sin escribir datos. `--apply` repara únicamente `questions.text` cuando el texto coincide exactamente con la corrupción reversible de la pregunta canónica del mismo módulo. `--isolated` selecciona el perfil DEMO aislado. No se modifica ninguna versión, decisión, auditoría, schema ni contrato.

El script admite sólo el host local y los puertos DEMO documentados, rechaza producción y DATABASE_URL externo, rechaza una base con pilot_workspaces y selecciona exclusivamente marcas DEMO en Workspace DEMO. Antes de escribir guarda un respaldo privado de las filas exactas en `.local/encoding-backup-*.json`. La actualización transaccional exige identidad, alcance y texto anterior coincidentes. Repetirla sobre texto ya correcto no cambia filas. No intenta normalizar texto humano ni adivinar reparaciones generales.

## Evidencia y cobertura

- Inspección inicial: 3144 preguntas DEMO, 62 coincidencias reparables, 0 escrituras.
- `node --test tests/demo-encoding.node.mjs`: 1/1 PASS; corrupción exacta reconocida, texto correcto, personalizado y módulo desconocido preservados.
- `node node_modules/vitest/vitest.mjs run tests/encoding.test.ts`: 3/3 PASS; fuentes UTF-8 válidas, ausencia de secuencias comunes, caracteres españoles y contrato actual de charset. Incluye la prueba anterior.
- Lint de los tres archivos dedicados: PASS.
- Prueba PostgreSQL de texto y bytes UTF-8: PASS, transacción temporal revertida.

## Reparación y verificación real de navegador

Después de preservar el baseline se aplicaron las 62 reparaciones. Respaldo privado: `.local/encoding-backup-1790381449696.json` (no se publica). La inspección posterior encontró 0 reparaciones pendientes; una repetición posterior a crear más fixtures inspeccionó 3172 preguntas con el mismo resultado. El escaneo de secuencias comunes en todas las tablas públicas con brandId, limitado a marcas DEMO, no encontró coincidencias después de reparar.

`node node_modules/@playwright/test/cli.js test --config playwright.visual.config.ts tests/visual/encoding-proof.spec.ts`: **1/1 PASS**, Chrome real, viewport 1440×1000. La prueba selecciona una marca histórica del respaldo; comprueba por API los IDs originales y textos reparados de Core Message y Value Mechanism, así como el charset JSON. Abre ambos módulos en el producto autenticado, recarga cada página, verifica texto canónico persistente y 0 secuencias mojibake en body visible. Registra 0 errores JavaScript. No genera una nueva marca para simular la reparación y no expone el token.

Capturas inspeccionadas visualmente: `design/brandopolis-ui/reference/phase10a/encoding-proof/core-message-1440.png` y `value-mechanism-1440.png`. Ambas muestran correctamente las preguntas «¿Qué idea principal queremos que comprenda y recuerde el cliente?» y «¿Cómo creamos y capturamos valor para ese cliente?». Esta evidencia corresponde al frontend de esta iteración; la matriz visual final del rediseño se reporta por separado.

El test histórico se omite explícitamente en un checkout sin respaldo local de reparación. La protección de fuentes UTF-8 se ejecuta normalmente sin depender de ese respaldo.
