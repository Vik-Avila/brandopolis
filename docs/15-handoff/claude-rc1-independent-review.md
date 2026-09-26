Status: derived
Owner: Engineering
Canonical: no
Last reviewed: 2026-09-24
Related: docs/15-handoff/competition-mvp-rc1.md
Depends on: Competition MVP RC1

# RC1 · revisión independiente de Claude Code

## Base revisada

Rama `codex/ui-kit-integration`, commit de entrega Codex `538e8af1e84e6145477d4efb7fd2fadfcb856b48`, árbol limpio. Revisión de implementación (Engine, schema/triggers, transporte HTTP, UI, scripts de concurso) y de calidad de pruebas; no sólo re-ejecución.

## Veredicto Pass 1

**ACCEPT WITH NON-BLOCKING FINDINGS.** 0 P0, 0 P1, 4 P2. Autoridad humana, versionado inmutable, dependencia HARD → NEEDS_REVIEW sin reescritura, Review Item con explicación, auditoría append-only, PostgreSQL real, aislamiento Workspace/Brand, concurrencia optimista bajo bloqueo de Brand e idempotencia de commit verificados en código y pruebas. Sin estado `CURRENT` en Decision; MODIFIED/REJECTED son resoluciones de Recommendation, no estados de Decision.

## Hallazgos y disposición

| ID | Hallazgo | Disposición |
|---|---|---|
| F-1 | `competition:check` imprimía «ocho migraciones» fijo, aunque readiness compara con el journal. | **Corregido.** `migrationsReadyMessage()` en `src/persistence/readiness.ts` deriva el conteo de `readMigrationFiles`, la misma fuente de readiness. Test F-1. |
| F-2 | Cookie de sesión con `Max-Age=86400` fijo, independiente de `expiresAt`. | **Corregido.** `cookieMaxAge()` usa el tiempo restante real (mínimo 0); `me()` expone `expiresAt`. HttpOnly, SameSite=Strict y la verificación de Origin sin cambios; la expiración del servidor sigue siendo autoritativa. Test F-2: sesión activa, vida corta, casi vencida, vencida (401 sin cookie) y Origin ajeno (403 sin cookie). |
| F-3 | Creaciones no estratégicas (contexto, experimento, señal, aprendizaje, marca) no son idempotentes. | **Diferido.** Requiere clave de cliente en API/UI y fingerprints por comando; excede una corrección mínima. Riesgo conocido: *las operaciones de creación no estratégicas aún no son universalmente idempotentes. Los commits de Decision estratégica sí lo son. La idempotencia general de creación se difiere más allá de RC1.* |
| F-4 | Sin prueba de respuesta perdida y reintento de un commit de revisión con la misma clave. | **Cubierto por test; sin cambio de implementación.** Mismo resultado y versionId, sin segunda versión, auditoría, revisión, impacto ni telemetría adicionales; historia intacta. |

## Verificación final

Registrada en [competition-mvp-rc1.md](competition-mvp-rc1.md) y SESSION_STATE: motor 30/30, navegador 25/25 en cinco viewports, boot aislado 1/1, `competition:start`/`competition:check` normal y aislado PASS, Foundation y validador UI PASS, `pnpm audit --prod` sin vulnerabilidades conocidas. Accesibilidad: contraste medido por superficie (mínimo 4.68:1 texto; foco 6.15:1), recorrido M1 completo sólo con teclado y reduced motion sin elementos animados. No es certificación WCAG ni de seguridad; no listo para producción.
