Status: derived
Owner: Product / Engineering
Canonical: no
Last reviewed: 2026-09-25
Related: docs/15-handoff/PILOT_RUNBOOK.md, docs/15-handoff/PILOT_DEPLOYMENT_CONTRACT.md
Depends on: Live Pilot Launch Gate 2026-09-25

# Checklist de lanzamiento del piloto

Estado: **EXTERNAL-CONFIG READY**. El repositorio está listo; faltan decisiones y credenciales externas. Nada está desplegado todavía.

| # | Paso | Tú decides / haces | Comando |
|---|---|---|---|
| 1 | Elegir hosting | Proveedor y región ([criterios](LIVE_HOSTING_DECISION.md)); 1 instancia | — |
| 2 | Crear base PILOT | PostgreSQL 17 dedicada con backups diarios | — |
| 3 | `DATABASE_URL` | Guardarla como secreto (con `sslmode=verify-full` si aplica) | — |
| 4 | Proveedor OIDC | Elegirlo y crear la app ([guía](OIDC_PROVIDER_DECISION.md)) | — |
| 5 | `PILOT_ORIGIN` | Dominio `https://pilot.<dominio>` ([DNS](DOMAIN_DNS_LAUNCH.md)) | — |
| 6 | Callback OIDC | Registrar `<PILOT_ORIGIN>/auth/callback`; guardar issuer, client ID, secret | — |
| 7 | IA | Clave, modelo (`claude-opus-5` sugerido), topes y límite de gasto; o dejar IA desactivada | — |
| 8 | Solicitar acceso | `PILOT_REQUEST_ACCESS_URL` (`https:` o `mailto:`) o dejarlo vacío | — |
| 9 | Aviso de datos IA | Aprobar o reemplazar `config/pilot/ai-notice.v1.md` | — |
| 10 | Validar config | En el hosting (variables cargadas) | `pnpm pilot:validate-config` |
| 11 | Instalar | Desde el SHA aprobado | `pnpm install --frozen-lockfile --prod` |
| 12 | Pre-flight | Revisar cada línea | `pnpm pilot:preflight` |
| 13 | Migrar | Base vacía: directo | `pnpm pilot:migrate` |
| 14 | Iniciar | 1 réplica | `pnpm pilot:start` |
| 15 | Smoke | Desde tu máquina con `PILOT_ORIGIN` | `pnpm pilot:smoke` |
| 16 | Tester de control | Crearte a ti como tester y entrar | `pnpm pilot:operator create tester.json` |
| 17 | Recorrido de control | Crear marca, decidir, recargar | — |
| 18 | Evidencia | Ver la sesión y la decisión | `pnpm pilot:operator report` |
| 19 | Backup de referencia | Respaldo + restauración a base vacía | `pnpm pilot:backup backup …` / `restore-empty …` |
| 20 | Provisionar testers | Subjects y cohortes ([cohorte](FIRST_TESTER_COHORT.md)) | `pnpm pilot:operator create …` |
| 21 | Go | Enviar enlace + [guía del tester](TESTER_GUIDE.md) | — |

Detalles de cada paso, rollback y respuesta a incidentes: [runbook](PILOT_RUNBOOK.md).
