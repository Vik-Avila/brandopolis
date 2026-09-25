Status: derived
Owner: Engineering
Canonical: no
Last reviewed: 2026-09-25
Related: docs/15-handoff/PILOT_DEPLOYMENT_CONTRACT.md, docs/15-handoff/LIVE_PILOT_LAUNCH_CHECKLIST.md, docs/14-decisions/ADR-0013.md, docs/14-decisions/ADR-0014.md
Depends on: MVP / Pilot release 2026-09-25; Live Pilot Launch Gate 2026-09-25

# PILOT · runbook de operación

PILOT es un entorno de prueba con testers invitados por Internet. **No es producción.** DEMO (concurso, loopback, `pnpm competition:start`) y PILOT usan bases distintas; cada servidor y cada herramienta rechaza datos de la otra clase. Variables: [contrato de despliegue](PILOT_DEPLOYMENT_CONTRACT.md#matriz-de-entorno). Todos los comandos se ejecutan desde la raíz del repositorio.

## 1. Comandos PILOT

| Comando | Qué hace | Escribe datos |
|---|---|---|
| `pnpm pilot:validate-config` | Valida variables sin red ni base. `FAIL`/`WARN`/`PASS`, nunca imprime secretos. Exit ≠ 0 si inválido. | No |
| `pnpm pilot:preflight` | Config + PostgreSQL + plan de migraciones + clase de datos + instancia única + discovery OIDC + herramientas de backup. | No |
| `pnpm pilot:migrate` | Aplica migraciones pendientes (forward-only). Con datos existentes exige `PILOT_BACKUP_FILE` y `PILOT_RECOVERY_VERIFIED=yes`. Rechaza esquemas divergentes y datos DEMO. | Esquema |
| `pnpm pilot:start` | Inicia la app (una instancia; lock en PostgreSQL). | Sí (uso) |
| `pnpm pilot:smoke` | Smoke post-despliegue contra `PILOT_ORIGIN`: health, modo, cabeceras, redirección OIDC con PKCE, 401 sin sesión, CSRF, DEMO deshabilitado. | No |
| `pnpm pilot:operator <cmd>` | Testers y evidencia (§4). | Según cmd |
| `pnpm pilot:backup backup <archivo>` / `restore-empty <archivo>` | Respaldo lógico y restauración sólo en base vacía aislada (§5). | Sólo destino vacío |

Salida esperada de `pilot:preflight` (ejemplo con valores ficticios):

```
PASS config          origin https://pilot.<dominio>; callback https://pilot.<dominio>/auth/callback; OIDC confidential client; AI enabled (claude-opus-5, caps 30/tester, 300/day)
PASS ai-notice       version 1a2b3c4d5e6f from config/pilot/ai-notice.v1.md
PASS database        PostgreSQL reachable.
PASS migrations      9/9 migrations applied and matching.
PASS data-class      No DEMO data in the PILOT database.
PASS single-instance No other PILOT instance is running.
PASS oidc            Discovery OK; testers are bound to issuer https://<issuer>/
WARN backup-tools    pg_dump not found (set PG_BIN) ...
PRE-FLIGHT PASSED: safe to start pnpm pilot:start.
```

## 2. Secuencia de release (cada despliegue)

1. **Rama y SHA**: `git rev-parse HEAD` coincide con el SHA aprobado; `git status` limpio.
2. **Configuración**: `pnpm pilot:validate-config` → `CONFIG VALID`.
3. **Punto de recuperación**: respaldo nuevo (`pnpm pilot:backup backup ./backups/pilot-<fecha>.dump` o snapshot del proveedor) **y** restauración probada en una base vacía aislada (§5). Sin datos aún (primer despliegue): omitir.
4. **Plan de migraciones**: `pnpm pilot:preflight` — línea `migrations` muestra aplicadas/pendientes; `diverge` = detener.
5. **Migrar**: `PILOT_BACKUP_FILE=<archivo> PILOT_RECOVERY_VERIFIED=yes pnpm pilot:migrate`.
6. **Detener la versión anterior** (SIGTERM) y **arrancar** la nueva: `pnpm pilot:start`. La nueva instancia no arranca mientras la anterior tenga el lock (instancia única).
7. **Readiness**: `GET /health` → 200 `brandopolis-pilot`.
8. **Smoke**: `PILOT_ORIGIN=... pnpm pilot:smoke` → `LAUNCH SMOKE PASSED`.
9. **Auth real**: un tester de control entra por el proveedor OIDC.
10. **Acceso a marca**: el tester de control ve/crea su marca.
11. **Persistencia**: aprueba una decisión y recarga; la versión permanece.
12. **Telemetría**: `pnpm pilot:operator report` muestra la sesión y la decisión del tester de control.
13. **Declarar activa** la release y registrar SHA y hora.

## 3. Rollback

**Rollback de aplicación ≠ rollback de base de datos.**

- *Aplicación*: volver a desplegar el SHA anterior **sólo si es compatible con el esquema actual**. Verificado: la build congelada `af73d030` (tag `brandopolis-pilot-engineering-ready-2026-09-25`) y la build de esta puerta comparten esquema (9 migraciones; esta puerta no añadió migraciones) y una prueba automática demuestra que ambas leen y escriben la misma base en los dos sentidos. Nota: la build congelada no aplica el lock de instancia única ni el aviso de IA.
- *Base de datos*: **forward-only**. Nunca se revierte una migración ni se borra una base. Si una migración resulta defectuosa: se corrige con una nueva migración forward. Si hay corrupción de datos: restaurar el último respaldo verificado **en una base nueva**, apuntar `DATABASE_URL` a ella tras validarla y conservar la base dañada para análisis.
- Un código anterior contra una base con más migraciones se niega a arrancar (`readiness` exacto): es intencional.
- RC1 no es destino de rollback de PILOT (sin autenticación pública).

## 4. Operación de testers

Los datos van en un archivo JSON privado (fuera del repositorio; bórralo después). Nunca en la línea de comandos. Ejemplos con valores ficticios:

```sh
# 1. Obtener issuer + subject del tester en la consola del proveedor OIDC (ver OIDC_PROVIDER_DECISION.md).
# 2. Crear tester con workspace propio y cohorte (A o B):
echo '{"subject":"00u1abcdEXAMPLE","cohort":"A"}' > /tmp/tester.json
pnpm pilot:operator create /tmp/tester.json          # → {"userId":"…","workspaceId":"…"}
# 3. El tester entra en PILOT_ORIGIN, crea su marca y toma su primera decisión.
# 4. Verificar acceso:
pnpm pilot:operator inspect /tmp/tester.json          # identityActive, membershipActive, brands, activeSessions
# 5. Revocar si hace falta:
echo '{"userId":"<userId>"}' > /tmp/who.json
pnpm pilot:operator revoke-sessions /tmp/who.json     # fuerza nuevo login
pnpm pilot:operator disable /tmp/who.json             # retira acceso (identidad, membership, sesiones)
# Clasificar la intervención de una sesión (Product-only / Assisted / Concierge):
echo '{"sessionId":"<id>","intervention":"ASSISTED"}' > /tmp/s.json && pnpm pilot:operator classify-session /tmp/s.json
# Evidencia agregada (sin texto estratégico ni subjects):
pnpm pilot:operator report
pnpm pilot:operator metrics
rm /tmp/tester.json /tmp/who.json /tmp/s.json
```

Compartir espacio: `create` con `"workspaceId"` de un workspace PILOT existente de la misma cohorte y luego `assign` (`{"userId","brandId"}`). Las sesiones duran 8 horas y viven en PostgreSQL: **sobreviven a reinicios** de la aplicación (verificado) y se revocan con `revoke-sessions`/`disable`.

## 5. Respaldo y restauración

Hosting con herramientas cliente de PostgreSQL 17 (`PG_BIN` si no están en PATH):

```sh
pnpm pilot:backup backup ./backups/pilot-AAAAMMDD.dump
PILOT_RESTORE_CONFIRM=EMPTY_ISOLATED_DATABASE DATABASE_URL=<base nueva y vacía> pnpm pilot:backup restore-empty ./backups/pilot-AAAAMMDD.dump
DATABASE_URL=<base restaurada> pnpm pilot:preflight   # migrations 9/9, data-class PASS
```

`backup` se niega a sobrescribir un archivo. `restore-empty` se niega sin confirmación explícita, si el archivo no existe o si la base destino tiene tablas; usa `--single-transaction` y nunca `--clean`/`--create`. Las credenciales viajan en variables `PG*`, no en argumentos.

Estado de verificación: copia en frío local con apagado limpio y restauración en clúster aislado — **probado**. Construcción y rechazos del wrapper `pg_dump`/`pg_restore` — **probados**. Ejecución real de `pg_dump`/`pg_restore` — **no probada** (herramientas no instaladas en la máquina de desarrollo): ensayarla una vez en el hosting antes del primer tester.

## 6. Salud, logs y apagado

- `GET /health` → `200 {"application":"brandopolis-pilot","protocol":"pilot-v1","status":"ready"}`; `503` si la base no está lista (registra `event:readiness`).
- Logs JSON por línea: `pilot_started` (puerto, proveedor IA, modelo, versión del aviso), `http_request` (requestId, status, método), `auth_failure` (motivo: `failed|expired|denied`), `ai_request` (resultado y proveedor), `http_error` (tipo), `pilot_stopping`/`pilot_stopped`. Nunca rutas, queries, cookies, tokens, prompts, contexto de marca ni claves. `X-Request-Id` correlaciona con el usuario.
- Apagado: `SIGTERM` o Ctrl+C. Cierra el servidor, libera el lock y el pool.

## 7. Recuperación de incidentes

| Situación | Síntoma | Respuesta |
|---|---|---|
| OIDC caído | `auth_failure` `failed`; testers vuelven a la entrada | Estado del proveedor. Las sesiones existentes siguen válidas hasta expirar. `pilot:preflight` línea `oidc`. |
| OIDC mal configurado | Arranque rechazado o `failed` en todos | `pilot:validate-config`; redirect exacto `PILOT_ORIGIN/auth/callback`; client ID/secret; tipo de cliente. |
| Tester «sin acceso» | `auth_failure` `denied` | `pilot:operator inspect`; issuer + subject correctos; si estaba desactivado: `create` no reactiva — crear con un subject nuevo o reactivar manualmente sólo tras decisión explícita. |
| IA caída / sin cuota | `ai_request` con `UNAVAILABLE`, `PROVIDER_ERROR`, `RATE_LIMIT` o `TIMEOUT` | El tester puede decidir sin IA; no hay estado parcial. Revisar cuenta/cuota. Desactivar IA: quitar `ANTHROPIC_API_KEY` y `ANTHROPIC_MODEL` y reiniciar. |
| Límite diario IA | 429 `AI_CAP_REACHED` | Esperado. Ajustar `PILOT_AI_DAILY_CAP_*` y reiniciar sólo si el presupuesto lo permite. |
| DB caída | `/health` 503, `event:readiness` | Estado del proveedor de PostgreSQL; no desplegar ni migrar hasta 200. |
| Migraciones distintas | Arranque rechazado; preflight `migrations FAIL` | Pendientes: flujo §2 pasos 3–5. Divergentes: desplegar la release que corresponde a la base; nunca editar migraciones. |
| Otra instancia activa | «Another PILOT instance holds the single-instance lock» | Detener la otra instancia; PILOT es de instancia única. |
| Sesión revocada | Tester vuelve a la entrada | Esperado tras `revoke-sessions`/`disable`; volver a entrar. |
| Backup fallido | `pilot:backup` exit ≠ 0 | Herramientas cliente/PG_BIN, TLS, permisos. No migrar sin punto de recuperación. |
| `PILOT_ORIGIN` inválido | validate-config `FAIL` | Origen HTTPS público exacto, sin ruta; coincidir con el dominio del proxy y el redirect OIDC. |
