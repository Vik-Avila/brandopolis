Status: derived
Owner: Engineering
Canonical: no
Last reviewed: 2026-09-25
Related: docs/15-handoff/PILOT_RUNBOOK.md, docs/15-handoff/LIVE_HOSTING_DECISION.md, docs/14-decisions/ADR-0013.md
Depends on: MVP / Pilot release 2026-09-25; Live Pilot Launch Gate 2026-09-25

# PILOT · contrato de despliegue (neutral al proveedor)

Define lo que cualquier hosting debe ofrecer. No elige proveedor. PILOT no es producción.

## Runtime

- Node.js 24.x y pnpm 12.4.2 (`packageManager` fijado).
- Instalación: `pnpm install --frozen-lockfile --prod` (el runtime PILOT no usa dependencias de desarrollo; `tsx` es dependencia de runtime).
- Directorio de trabajo: raíz del repositorio (assets, prompt, migraciones y aviso IA se resuelven relativos a ella).
- Comando de inicio: `pnpm pilot:start`. Escucha en `BIND_HOST:PORT` (por defecto `127.0.0.1:3000`; en contenedores/PaaS usar `BIND_HOST=0.0.0.0` y el `PORT` asignado).
- Migración: paso explícito `pnpm pilot:migrate` antes de iniciar la nueva versión; **nunca** en el comando de inicio.
- Health/readiness: `GET /health` (200 listo, 503 no listo).
- **Una sola instancia.** El limitador es en memoria; `pilot:start` toma un advisory lock de PostgreSQL y una segunda instancia se niega a arrancar. Configurar el hosting con 1 réplica y despliegue «stop-then-start» (o aceptar que la nueva instancia reintente hasta que la anterior termine).
- Docker: no se incluye. La app es un proceso Node estándar; se evitó añadir una imagen no probada en este entorno. Si el hosting exige contenedor, basta una imagen Node 24 con los comandos anteriores.

## Matriz de entorno

### Requeridas (PILOT)

| Variable | Formato | Notas |
|---|---|---|
| `PILOT_DATA_CLASS` | `PILOT` | Evita usar una base DEMO. |
| `DATABASE_URL` | `postgresql://…` | Base dedicada. Con `sslmode=verify-full` (o `require`) si la red no es privada. |
| `PILOT_ORIGIN` | `https://<host>` | Origen público exacto, sin ruta. No `localhost`, IP local ni `example.*`. |
| `OIDC_ISSUER` | `https://…` | Issuer del proveedor (discovery). |
| `OIDC_CLIENT_ID` | texto | |
| `OIDC_CLIENT_SECRET` **o** `OIDC_PUBLIC_CLIENT=true` | secreto / `true` | Exactamente uno. |

### IA (ambas o ninguna)

| Variable | Default | Notas |
|---|---|---|
| `ANTHROPIC_API_KEY` | — | Secreto server-side. Sin ella la IA queda desactivada y los testers deciden sin propuestas. |
| `ANTHROPIC_MODEL` | — | Elegido en el servidor; el cliente no puede elegir modelo. Sugerido: `claude-opus-5`. |
| `AI_TIMEOUT_MS` | `30000` | 1000–120000. |
| `PILOT_AI_DAILY_CAP_PER_TESTER` | `30` | Propuestas por tester en 24 h móviles. `0` desactiva. |
| `PILOT_AI_DAILY_CAP_TOTAL` | `300` | Propuestas totales en 24 h móviles. |
| `PILOT_AI_NOTICE_FILE` | `config/pilot/ai-notice.v1.md` | Texto del aviso de datos. Cambiarlo cambia su versión y vuelve a pedir aceptación. |

### Opcionales

| Variable | Default | Notas |
|---|---|---|
| `PORT` | `3000` | |
| `BIND_HOST` | `127.0.0.1` | `0.0.0.0` detrás de proxy de plataforma. |
| `TRUST_PROXY` | `false` | `true` sólo si el proxy propio fija `X-Forwarded-For` (límites por IP real). |
| `OIDC_REDIRECT_URI` | `PILOT_ORIGIN/auth/callback` | Si se define, debe ser exactamente ese valor. |
| `PILOT_REQUEST_ACCESS_URL` | — | `https:` o `mailto:`. Sin él, la entrada pide contactar al organizador (nunca un enlace roto). |
| `PG_BIN` | PATH | Herramientas cliente PostgreSQL 17 para `pilot:backup`. |
| `PILOT_LOCAL_REHEARSAL` | — | Sólo ensayos locales: permite origen loopback. Nunca en Internet. |

### Operación puntual

`PILOT_BACKUP_FILE`, `PILOT_RECOVERY_VERIFIED=yes` (migración con datos), `PILOT_RESTORE_CONFIRM=EMPTY_ISOLATED_DATABASE` (restauración).

### Prohibido en el repositorio

Secretos (DB, OIDC, Anthropic), tokens de sesión, subjects reales de testers, emails reales, volcados de base. `.env.example` contiene sólo nombres y placeholders.

## Requisitos del proveedor

| Capacidad | Mínimo |
|---|---|
| Cómputo | 1 instancia, 0.5–1 vCPU, 512 MB–1 GB RAM (piloto pequeño). Reinicio automático. |
| PostgreSQL | 17, persistente, dedicada, respaldo diario con retención ≥ 7 días y restauración a base nueva. |
| Red | HTTPS entrante con certificado gestionado; HTTPS saliente hacia el proveedor OIDC y `api.anthropic.com`. El proxy conserva el `Host`. |
| Secretos | Variables de entorno cifradas. |
| Logs | stdout/stderr persistentes ≥ 14 días. |
| Disco | Ninguno persistente para la app (todo estado en PostgreSQL). |

## Contrato de seguridad de datos

**Publicar una versión de la aplicación ≠ recrear la base de datos.** Cada release: respaldo → restauración verificada → `pilot:migrate` → `/health` 200 → despliegue. Ningún arranque ejecuta migraciones, seed, reset ni drop. `db:migrate`/`db:seed` (DEMO) se niegan sobre bases con datos PILOT; `pilot:migrate` se niega ante esquemas divergentes o datos DEMO. Migraciones aditivas; pruebas automáticas comparan fila por fila datos RC1 y de la build PILOT congelada antes y después.

## Garantías de persistencia

Decisiones, versiones, dependencias, revisiones y auditoría se escriben en una transacción PostgreSQL (todo o nada). Sesiones server-side de 8 h, revocables, que sobreviven reinicios. Feedback, telemetría y aceptaciones del aviso IA se guardan por tester sin texto estratégico.

## Decisiones externas pendientes

Ver [LIVE_PILOT_LAUNCH_CHECKLIST](LIVE_PILOT_LAUNCH_CHECKLIST.md).
