Status: derived
Owner: Engineering
Canonical: no
Last reviewed: 2026-09-24
Related: handoff/CLAUDE_START_HERE.md
Depends on: Competition MVP RC1 final validation

# Competition MVP RC1 · manifiesto de entrega

Rama: `codex/ui-kit-integration`. Base heredada: `12103ef`. Scope congelado: hardening de Competition MVP local DEMO, sin cambios a Product Bible, contratos, migraciones 0000–0007 ni semántica de decisiones. M1 y la vertical Customer → Business → Position → Message permanecen como base.

## Commit fijo de revisión

El candidato es el commit que incorpora este manifiesto y su evidencia. Obtener su SHA exacto con `git log -1 --format=%H -- docs/15-handoff/competition-mvp-rc1.md`; cotejarlo con el SHA completo del informe final de entrega. El SHA se registra después del commit en ese informe: no se inserta un hash autorreferencial imposible dentro de su propio contenido. Conservar el SHA resuelto al iniciar la revisión y usarlo explícitamente; no seguir nuevos HEAD de la rama. No se creó tag ni GitHub Release.

## Alcance y operación

- `pnpm competition:start`: valida runtime, prepara/reutiliza PostgreSQL local, migra, mantiene identidad DEMO autorizada, prepara/reutiliza marca y arranca servidor. Ningún reset o borrado.
- `pnpm competition:check`: comprobación rápida de assets, entorno, DB, migraciones y sesión; HTTP se distingue de prerrequisitos. `/health` mínimo, sin secretos.
- UI conserva borrador de Decision y explica timeout, conflicto, contexto obsoleto, permisos y sesión vencida. Feedback y bloqueo durante operaciones; ninguna aprobación automática.
- DEMO_FIXTURE explícita. Cuatro decisiones, siete versiones, revisión humana y aprendizaje aceptado generados mediante casos de uso reales.
- [Runbook](competition-demo-runbook.md): preparación, acceso, recuperación, cierre, respaldo y rutas estimadas de 3 y 5–7 minutos. No son tiempos de ensayo humano.

## Evidencia de cierre

**READY FOR DELIVERY** para demo local y revisión independiente. typecheck/lint PASS; motor 27/27; integración 27/27 (misma suite); navegador 25/25 en 1600×1000, 1440×900, 1280×800, 768×1024 y 390×844; boot aislado 1/1. Migraciones y ambas demos PASS; audit --prod sin vulnerabilidades conocidas reportadas. Foundation: Markdown 161, JSON 46, schemas 21, requirements 15, golden cases 13, errors 0. Validador UI integrado PASS. Resiliencia: doble envío, desconexión y expiración de sesión cubiertos; la expiración real también se prueba en el motor.

Fecha de ejecución: 2026-09-24 por la noche, America/Guatemala (2026-09-25 UTC). Windows x64, Node v24.19.0, pnpm 12.4.2, Python 3.12.14, PostgreSQL 17 local embebido; Chrome por Playwright. Sin contenedor, proveedor IA o DB externa.

Resultados finales y hora de cierre se registran en SESSION_STATE junto con este manifiesto. Las suites de motor e integración son la misma suite y no se suman como cobertura distinta. El smoke de boot es separado de los 25 casos de navegador. Capturas locales en test-results, ignoradas por Git; no son assets de producto.

Fresh boot: perfil `.local/rc1-smoke` preparado desde DB separada, migrado, demo creada, readiness 200 y acceso Chrome móvil. Reinicio conservó la misma marca, seguido de smoke de persistencia; Ctrl+C liberó 3001/55434 y eliminó postmaster.pid. En Windows el wrapper pnpm/cmd pide confirmar fin del trabajo por lotes y puede devolver 255 tras Ctrl+C: se verificó el cierre real de procesos, no se interpretó ese código de interrupción como un test fallido. La DB normal no se borró ni se detuvo desde el perfil aislado.

## Cierre de revisión independiente de Claude

Base Codex revisada: `538e8af1e84e6145477d4efb7fd2fadfcb856b48`. Veredicto: ACCEPT WITH NON-BLOCKING FINDINGS (0 P0, 0 P1, 4 P2). Registro: [claude-rc1-independent-review.md](claude-rc1-independent-review.md). F-1 y F-2 corregidos, F-4 cubierto por test sin cambio de implementación, F-3 diferido como riesgo conocido. El commit de cierre de Claude se identifica con `git log -1 --format=%H -- docs/15-handoff/claude-rc1-independent-review.md`; el SHA completo figura en el informe final.

Gate final 2026-09-24: typecheck/lint PASS; motor 30/30; integración 30/30 (misma suite); navegador 25/25 en los cinco viewports; `competition:start` + `competition:check` PASS en perfil normal (reutilizando la DB local existente) y aislado; boot aislado 1/1; Foundation y validador UI PASS; `pnpm audit --prod`: No known vulnerabilities found; `git diff --check` limpio. Accesibilidad medida en Chrome 1440×900 y 390×844: contraste de texto mínimo 4.68:1 (objetivo 4.5:1) en acceso, workspace, Needs Review, explicación de impacto, revisión guiada, pills, botones, texto atenuado y superficies glass; anillo de foco 6.15:1 sobre marfil; recorrido M1 completo sólo con teclado (skip link primero, foco visible en cada acción, sin trampa de foco); con reduced motion no queda ningún elemento animado. No es certificación WCAG.

## Seguridad y deuda

[Revisión acotada](competition-rc1-security-review.md): controles, evidencia y riesgos residuales. No hallazgo HIGH pendiente identificado; no certificación ni promesa de cero vulnerabilidades. No dependencias nuevas.

**No listo para producción.** Pendientes: auth/provisioning/recuperación de producción, despliegue/TLS/operación, proveedor real y evaluación semántica, política de retención y backup/restore ensayado. El presupuesto del contexto mide caracteres, no tokens. No research externo, prueba de escala, auditoría WCAG completa ni validación en otros navegadores. Las fixtures no acreditan tracción, PMF ni resultados de negocio.

## Handoff de Claude

Revisar el commit fijo indicado arriba según [CLAUDE_START_HERE](../../handoff/CLAUDE_START_HERE.md). Prioridades: autoridad humana, tenant, 0006/0007, fronteras Recommendation/Learning → Decision, separación Signal/Learning, presupuesto, stale context, idempotencia, concurrencia, Blueprint, seguridad, confiabilidad de demo y accesibilidad. No rediseñar ni abrir nuevas features. Siguiente acción humana: ejecutar el runbook y realizar red-team independiente del SHA entregado antes de cualquier decisión de piloto.
