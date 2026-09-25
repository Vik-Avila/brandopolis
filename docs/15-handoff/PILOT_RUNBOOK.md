Status: derived
Owner: Engineering
Canonical: no
Last reviewed: 2026-09-25
Related: docs/15-handoff/PILOT_DEPLOYMENT_CONTRACT.md, docs/14-decisions/ADR-0013.md, docs/14-decisions/ADR-0014.md
Depends on: MVP / Pilot release 2026-09-25

# PILOT · runbook de operación

PILOT es un entorno de prueba con testers invitados por Internet. **No es producción.** DEMO (concurso, loopback) y PILOT usan bases distintas y cada servidor rechaza datos de la otra clase al arrancar.

## 1. Variables de entorno

Se definen en el entorno del proceso o en el gestor de secretos del hosting, nunca en el repositorio. Plantilla sin valores: `.env.example`.

| Variable | Requerida | Uso |
|---|---|---|
| `PILOT_DATA_CLASS` | sí | Debe ser `PILOT`. Evita arrancar sobre una base DEMO por error. |
| `DATABASE_URL` | sí | PostgreSQL 17 dedicado a PILOT. Con TLS (`sslmode=verify-full` recomendado). |
| `PILOT_ORIGIN` | sí | Origen HTTPS público exacto, p. ej. `https://pilot.example.com` (sin ruta). |
| `OIDC_ISSUER` | sí | Issuer HTTPS del proveedor de identidad (se usa discovery `/.well-known/openid-configuration`). |
| `OIDC_CLIENT_ID` | sí | Client ID registrado. |
| `OIDC_CLIENT_SECRET` | sí, salvo cliente público | Cliente confidencial. Para cliente público PKCE: omitir y `OIDC_PUBLIC_CLIENT=true`. |
| `OIDC_REDIRECT_URI` | no | Si se define, debe ser `PILOT_ORIGIN/auth/callback`. |
| `PORT`, `BIND_HOST` | no | Por defecto `3000` y `127.0.0.1` (detrás del proxy). |
| `TRUST_PROXY` | no | `true` sólo si un proxy propio fija `X-Forwarded-For`; habilita límites por IP real. |
| `PILOT_REQUEST_ACCESS_URL` | no | Enlace `https:` o `mailto:` para «Solicitar acceso». Sin él, se indica contactar al organizador. |
| `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` | no | Activan propuestas IA. Sin ambos, PILOT informa que la IA no está disponible y permite decidir. Modelo sugerido: `claude-opus-5`. |
| `AI_TIMEOUT_MS` | no | Límite por propuesta; por defecto 30000. |
| `PG_BIN` | backup | Carpeta de `pg_dump`/`pg_restore`/`psql` si no están en PATH. |

## 2. Proveedor OIDC (genérico)

1. Crear una aplicación web OIDC (Authorization Code con PKCE) en el proveedor elegido.
2. Redirect URI permitido: `https://<PILOT_ORIGIN>/auth/callback`. Scope: `openid`.
3. Copiar issuer, client ID y, si es confidencial, el secret al gestor de secretos.
4. Brandopolis vincula a cada tester por **issuer + subject (`sub`)**; el email no es identidad. Obtén el `sub` del tester desde la consola del proveedor.

Validaciones que realiza `openid-client`: firma por JWKS, issuer, audience, expiración, nonce, state y PKCE. Un callback fallido, expirado, repetido o de una identidad no provisionada vuelve a la entrada con un aviso genérico y no crea sesión.

## 3. Base de datos y migraciones

La aplicación nunca crea, borra ni recrea la base. Las migraciones sólo se aplican con el comando explícito:

```sh
pnpm pilot:migrate
```

- Base vacía: aplica todas las migraciones.
- Base con datos: exige `PILOT_BACKUP_FILE` (respaldo no vacío) y `PILOT_RECOVERY_VERIFIED=yes`, es decir, un respaldo cuya restauración ya se probó (§6). Toma un advisory lock para evitar migraciones concurrentes.

## 4. Arranque, salud y apagado

```sh
pnpm pilot:start
```

Rechaza arrancar si falta configuración, si la base no está `READY` (migraciones exactas) o si contiene datos DEMO. Mensajes de configuración legibles, sin secretos.

- `GET /health` → `200 {"application":"brandopolis-pilot","protocol":"pilot-v1","status":"ready"}`; `503` si la base no está lista. Úsalo como readiness del hosting.
- Logs: una línea JSON por petición (`event:http_request`, `requestId`, `status`, `method`) sin rutas, cookies ni cuerpos; errores inesperados como `event:http_error` con el tipo de error. Header `X-Request-Id` para correlacionar.
- Apagado seguro: enviar `SIGTERM` (o Ctrl+C). El servidor deja de aceptar peticiones y cierra el pool.

## 5. Operación de testers

Los datos se pasan en un archivo JSON privado (no en la línea de comandos) y se borra al terminar.

```sh
pnpm pilot:operator create tester.json        # {"subject":"<sub OIDC>","cohort":"A"}  (workspaceId opcional para compartir espacio)
pnpm pilot:operator inspect tester.json       # {"subject":"..."} o {"userId":"..."}
pnpm pilot:operator assign assign.json        # {"userId":"...","brandId":"..."} marca PILOT del mismo workspace
pnpm pilot:operator revoke-sessions who.json  # {"userId":"..."} cierra todas sus sesiones
pnpm pilot:operator disable who.json          # {"userId":"..."} desactiva identidad y membership y revoca sesiones
pnpm pilot:operator classify-session s.json   # {"sessionId":"...","intervention":"PRODUCT_ONLY|ASSISTED|CONCIERGE"}
pnpm pilot:operator metrics                   # activación, tiempo a primera propuesta y a primera decisión por tester
```

`create` genera un workspace PILOT propio por tester (cohorte `A` o `B`) y la membership. El tester crea su primera marca desde la interfaz. Las sesiones duran 8 horas.

## 6. Respaldo y restauración

Hosting (PostgreSQL gestionado o propio) con herramientas cliente de PostgreSQL 17:

```sh
pnpm pilot:backup backup ./backups/pilot-AAAAMMDD.dump
PILOT_RESTORE_CONFIRM=EMPTY_ISOLATED_DATABASE DATABASE_URL=<base vacía aislada> pnpm pilot:backup restore-empty ./backups/pilot-AAAAMMDD.dump
```

`restore-empty` sólo restaura en una base **vacía** y confirmada; nunca limpia una base existente. Después: `GET /health` contra esa base, verificar marcas, decisiones e historial con un tester de prueba, y sólo entonces marcar `PILOT_RECOVERY_VERIFIED=yes`. El respaldo gestionado del proveedor (PITR) es complementario, no sustituto de una restauración probada.

Estado de verificación: el procedimiento local de copia en frío (apagado limpio con `pg_ctl -w`, copia, restauración en un clúster separado y verificación de historial) está probado automáticamente. El camino `pg_dump`/`pg_restore` **no se ejecutó** en este entorno (sin herramientas cliente instaladas) y debe ensayarse una vez en el hosting elegido antes del primer tester.

## 7. Actualización y rollback

Orden obligatorio: **respaldo → restauración probada → `pnpm pilot:migrate` → verificar `/health` → desplegar la nueva versión de la app**. Migraciones sólo aditivas. Rollback = volver a la versión anterior de la app compatible con el esquema ampliado; nunca revertir la base borrando datos. RC1 no es destino de rollback de PILOT (no tiene autenticación pública).

## 8. Incidentes

| Situación | Acción |
|---|---|
| Revocar a un tester | `disable` (permanente) o `revoke-sessions` (forzar nuevo login). |
| IA caída o sin cuota | El tester ve «No se pudo generar una propuesta válida. Puedes continuar con tu decisión humana». No hay estado estratégico parcial. Revisar cuota/clave; no hace falta reiniciar. |
| 429 frecuentes | Límites por cliente: 600 req/min, 20 login/min, 20 propuestas IA y 20 feedback por sesión cada 10 min. En memoria, por instancia. |
| `/health` 503 | Base no disponible o migraciones distintas; no arrancar otra versión hasta revisar. |
| Sospecha de sesión filtrada | `revoke-sessions`; las cookies son `__Host-`, `Secure`, `HttpOnly`, `SameSite=Strict`. |
