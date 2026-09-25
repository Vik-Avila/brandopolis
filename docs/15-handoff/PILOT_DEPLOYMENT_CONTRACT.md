Status: derived
Owner: Engineering
Canonical: no
Last reviewed: 2026-09-25
Related: docs/15-handoff/PILOT_RUNBOOK.md, docs/14-decisions/ADR-0013.md
Depends on: MVP / Pilot release 2026-09-25

# PILOT · contrato de despliegue (neutral al proveedor)

Este contrato define lo que cualquier hosting debe ofrecer. No elige proveedor. PILOT no es producción.

## Implementado en el repositorio

- Servidor Node HTTP (`pnpm pilot:start`) detrás de un proxy HTTPS; valida Host y Origin exactos contra `PILOT_ORIGIN`, envía HSTS, CSP estricta y cookies `__Host-` seguras.
- OIDC estándar configurable (discovery, PKCE, state, nonce, validación de ID token).
- Migraciones explícitas con compuerta de respaldo (`pnpm pilot:migrate`) y readiness exacto (`GET /health`).
- Respaldo/restauración con `pnpm pilot:backup`; operación de testers por CLI.
- Límite de solicitudes en memoria por instancia; logs JSON sin datos estratégicos ni secretos.

## Requiere configuración del proveedor final

| Capacidad | Requisito mínimo |
|---|---|
| Runtime | Node.js 24.x, `pnpm install --frozen-lockfile`, proceso con reinicio automático y `SIGTERM` para apagado. Una sola instancia (el limitador es en memoria). |
| PostgreSQL | Versión 17, persistente, dedicada a PILOT, TLS, respaldo automático diario con retención ≥ 7 días y posibilidad de restaurar en una base aislada. |
| HTTPS | Certificado gestionado; el proxy reenvía `Host` sin cambios. Con `TRUST_PROXY=true`, el proxy debe fijar `X-Forwarded-For`. |
| OIDC | Aplicación registrada con redirect `PILOT_ORIGIN/auth/callback`; issuer HTTPS. |
| Secretos | Variables de entorno cifradas (DB, OIDC, Anthropic). Nunca en imagen, repo ni logs. |
| Logs | stdout/stderr persistentes y consultables ≥ 14 días. |
| Health | Readiness HTTP en `/health` (200 listo, 503 no listo). |

## Contrato de seguridad de datos

**Publicar una versión de la aplicación ≠ recrear la base de datos.**

Cada release sigue: respaldo → restauración verificada → migración forward (`pnpm pilot:migrate`) → `/health` 200 → despliegue de la app. Nunca se ejecuta `drop`, `truncate`, reset ni seed sobre la base PILOT; ningún arranque ejecuta migraciones o seed. Los usuarios, workspaces, marcas, decisiones, versiones, auditoría y revisiones existentes deben sobrevivir. Las migraciones son aditivas; la prueba automática «RC1 data written by the frozen RC1 engine survives the Pilot migration» compara fila por fila todas las tablas RC1 antes y después de 0008.

Rollback: sólo de la aplicación a una versión compatible con el esquema vigente. Una migración defectuosa se corrige con otra migración forward.

## Garantías de persistencia

Toda decisión estratégica, versión, dependencia, revisión y auditoría se escribe en PostgreSQL en una transacción; si falla cualquier parte, nada se escribe. Las sesiones son server-side, revocables y de 8 horas. Feedback y telemetría PILOT se guardan por tester, workspace y marca sin texto estratégico.

## Decisiones externas pendientes

Proveedor de hosting, proveedor OIDC, dominio de `PILOT_ORIGIN`, cuenta/modelo/presupuesto de Anthropic y consentimiento de testers para procesar su contexto con el proveedor IA.
