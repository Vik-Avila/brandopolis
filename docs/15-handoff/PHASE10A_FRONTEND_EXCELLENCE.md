# Phase 10A — estado de entrega, 2026-09-25

IMPLEMENTATION: COMPLETA — conservada y validada en Phase 10B (commit `1efff76` en `handoff/phase10b-final-2026-09-25`).
FOUNDER VISUAL ACCEPTANCE: PENDING.

> **Estado posterior (Phase 10B, 2026-09-25):** este documento registra la intervención 10A tal como quedó en disco. Phase 10B la preservó, la validó en una instancia DEMO limpia (typecheck, lint, Vitest, E2E 25/25, evidencia 2/2) y la completó: CSS reorganizado (`base.css`, `public.css`, `product-*.css`, sin `@import`), pulido de producto, accesibilidad y handoff. Estado vigente: [FINAL_MVP_HANDOFF_2026-09-25](FINAL_MVP_HANDOFF_2026-09-25.md). Las secciones «Bloqueo de entorno» y «Próximos pasos» siguientes son históricas y quedaron resueltas.

## Estado verificable

- Rama: `codex/phase10/frontend-excellence-astra-2026-09-25`.
- Base: `pilot/phase10-real-testers-2026-09-25`.
- SHA inicial: `7be0b674aa70c7f814b12b9dd3ff7bbf4e4bb811`.
- No se ha creado commit de esta intervención ni hecho push, merge o deploy.
- `pnpm-workspace.yaml` no tiene diff; la configuración original permanece.
- Contratos, schemas, persistencia estratégica y autoridad humana permanecen sin cambios.

## Implementación conservada

Identidad premium horizontal derivada del master aprobado, topbar contextual, navegación agrupada con estados accesibles, selector de marca y creación en diálogo. Home prioriza atención y decisiones conectadas; aprendizaje aparece después. La decisión humana precede a la explicación complementaria y al historial; pestañas separan decisión, evidencia/hipótesis, opciones e historia. Guided Review mantiene el formulario delante del detalle del cambio. History representa versiones y continuidad del criterio. Contexto vigente presenta una secuencia numerada; Blueprint muestra cuatro pilares y dependencias reales. Contexto, experimentos, señales, aprendizajes y práctica usan el sistema compartido; práctica pagina 12 registros.

`product-views.js` contiene proyecciones de presentación sin peticiones ni escrituras. `product-interactions.js` contiene pestañas y contención de foco. `app.js` conserva las operaciones de producto. CSS se organiza en base, shell, decisión, contexto, vistas y responsive; `refinement.css` fue retirado. No se agregó framework.

Últimos ajustes en disco: selector móvil en una sola fila, ancho útil mayor para preguntas largas, nombres accesibles de navegación sin el signo decorativo de revisión, reinicio de pestaña al cambiar/crear marca, restauración de cuatro declaraciones de borde perdidas al serializar CSSOM. Falta acreditar estos cambios en el servidor DEMO reiniciado.

## Evidencia y pruebas reales

| Comprobación | Resultado |
|---|---|
| Vitest: contratos, runtime y encoding | 62/62 PASS, 3 archivos |
| Piloto Chromium HTTPS/OIDC de fixtures | 10/10 PASS, cinco viewports |
| Phase10A Chromium antes de los últimos ajustes de densidad | 2/2 PASS; seis anchos, texto, overflow, medios, consola, pestañas y foco |
| Reparación DEMO y reload en Chromium | PASS; 62 preguntas reparadas con backup; cero coincidencias en segundo escaneo |
| Foundation | PASS: 203 Markdown, 51 JSON, 21 schemas, 15 requirements, 13 golden cases; 0 errores |
| Frontend validator `--integrated` | PASS |
| Brand Master validator | PASS: 58 assets, 19 mappings |
| ESLint | PASS |
| `git diff --check` | PASS después de quitar líneas vacías finales |
| Typecheck final bajo sandbox | Bloqueado por resolución de `@anthropic-ai/sdk`; una corrida anterior con permisos ampliados pasó. No se acredita PASS final |
| E2E DEMO final | No completado: servidor conserva JS anterior en memoria; timeout con nombre accesible anterior `03 Posicionamiento !` |
| Suite visual completa final | Pendiente |
| Dependency audit | Pendiente |

La matriz ejercitada fue 1600×1000, 1440×900, 1280×800, 768×1024, 390×844 y 360×800. La evidencia anterior a los ajustes finales no sustituye la regresión final.

Capturas: las series `baseline/`, `iteration-1/` y `final/` (~32 MB) no se versionaron; se conserva `encoding-proof/` y el conjunto final curado vive en `design/brandopolis-ui/reference/phase10b/`. La carpeta `final/` representa la última captura realizada, anterior al último ajuste de densidad; se debe regenerar antes de entregar. Incluye workspace, cuatro decisiones, evidencia, opciones, impacto, revisión, historia, contexto, aprendizaje, práctica, blueprint y accesos.

## Bloqueo de entorno

La revisión automática de permisos rechazó la operación de identificación del proceso local por límite de uso del servicio de revisión. No se intentó eludirla. La instancia en 3000 respondía, pero `/app.js` aún no contenía `aria-description`, prueba de assets antiguos en memoria. Un intento previo de reinicio devolvió error de PowerShell al detener procesos; `competition:start` detectó la instancia existente y no la reemplazó. No detener PostgreSQL ni procesos desconocidos.

## Próximos pasos concretos

1. Identificar y reiniciar exclusivamente el servidor DEMO de esta intervención; verificar que `/app.js` contiene la corrección accesible y que CSS corresponde al disco.
2. Ejecutar `pnpm typecheck`, `pnpm test:e2e`, `pnpm test:visual`, `pnpm audit`; resolver hallazgos y repetir sólo cobertura afectada. Revisar boot/check del procedimiento local.
3. Inspeccionar nuevas capturas de la matriz, contraste, motion/reduced motion y densidad de todas las vistas; completar informe A–AL y actualizar auditoría de gaps/SESSION_STATE/CHANGELOG con resultados reales.
4. Commit y push de la rama actual; verificar árbol limpio y SHA remoto. No merge.
5. Dejar MVP intencionalmente activo mediante `pnpm competition:start`. Confirmar URL, proceso y health; mantener aceptación visual pendiente.

Nota histórica de la máquina del fundador (no necesaria en otro equipo): se usó corepack con `COREPACK_HOME` local. Procedimiento portable: [NEXT_DEVELOPER_START_HERE](NEXT_DEVELOPER_START_HERE.md).

La URL exacta de la marca DEMO es local a cada base de datos; `pnpm competition:start` la imprime.

Acceso privado local: copiar el campo `token` de `.local/demo-session.json` (ver NEXT_DEVELOPER_START_HERE). No compartir el token.

## Higiene y aceptación

Se eliminaron los scripts temporales `phase10a-*.py`, herramientas `css-*`, candidatos CSS y diagnósticos temporales de encoding. Se conservó el backup de reparación y los archivos de datos/sesión. `scripts/demo-encoding.mjs` tiene valor permanente: diagnóstico por defecto, reparación limitada y backup, con tests.

La revisión del fundador deberá cubrir identidad, Gateway, login, shell, navegación, selector, workspace, decisión, semántica Evidence/Hypothesis/AI/Human, impacto, Needs Review, Guided Review, History, contexto, Blueprint, experimentos/aprendizaje, móvil, movimiento y calidad general. Ninguna captura ni test equivale a aprobación visual del fundador.
