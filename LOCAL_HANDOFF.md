# Brandopolis M1 · ejecución local

Requisitos: Node **24.x**, pnpm **12.4.2**, Python **3.10+** para Foundation. Chrome para E2E. No se requiere Docker ni proveedor IA. PostgreSQL 17 se ejecuta como proceso local mediante una dependencia de desarrollo fijada; no se instala un servicio del sistema.

## Instalación

```sh
pnpm install --frozen-lockfile
python -m venv .venv
```

En Windows: `.venv/Scripts/python.exe -m pip install -r requirements-foundation.txt`, seguido de `.venv/Scripts/python.exe scripts/foundation_check.py`. En macOS/Linux usar `.venv/bin/python`. Puede usarse `python3` o `py -3` para crear el entorno, según instalación. El chequeo lee UTF-8 y excluye dependencias locales.

## DB, migraciones y sesión

Terminal 1, mantener abierta:

```sh
pnpm db:start
```

PostgreSQL escucha sólo en 127.0.0.1:55432. Datos y contraseña aleatoria en `.local/postgres/`, ignorado por Git. Ctrl+C detiene el proceso y conserva datos. Tests usan otro cluster en 55433 y una base nueva por ejecución, conservada para diagnóstico. No usar datos reales de clientes.

Terminal 2:

```sh
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Abrir [workspace local](http://127.0.0.1:3000). Copiar **sólo el valor token** de `.local/demo-session.json` al campo de sesión. El seed genera usuario/workspace/token nuevos de DEMO; no borra datos existentes. Token expira en 24h. No pegarlo en issues ni commits.

Opcional: configurar DATABASE_URL en `.env` para PostgreSQL externo; el runtime carga ese archivo. Vacío usa DB local. `.env.example` contiene sólo opciones implementadas. No apuntar la demo a producción: auth final pendiente y el servidor rechaza NODE_ENV=production.

## Demostración M1

```sh
pnpm demo
```

Crea otra Brand DEMO y ejecuta Agencies → Strategic OS for Agencies → Internal Marketing Teams → Customer v1 SUPERSEDED/v2 vigente → Positioning NEEDS_REVIEW sin cambio de texto → ReviewItem → revisión humana → Positioning v2. Imprime versiones y resultado, nunca token ni URL privada de DB.

En UI: crear Brand, preparar/aprobar Customer, preparar/aprobar Positioning, preparar nueva versión de Customer, abrir Positioning, ver impacto, iniciar revisión humana y aprobar nueva versión. Recargar conserva estado e historial; Brand/módulo viajan en URL sin secretos. Ante conflicto, revisar borrador y recargar contexto antes de editar otra vez. Reintentos sin cambios usan la misma idempotency key.

## Verificación

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm test:integration
pnpm test:e2e
```

`pnpm test` incluye dominio, contratos, PostgreSQL real y HTTP E2E. `test:integration` ejecuta la misma suite explícitamente; no suma cobertura. `test:e2e` necesita DB local iniciada, migraciones y sesión creada; Playwright arranca servidor si falta. Chrome a 1440×1000 y 390×844: recarga, historial, dos pestañas y conflicto. Capturas en `test-results/`, ignoradas por Git.

Sin build frontend: shell HTML/CSS/JS nativo y servidor TypeScript mediante tsx. Aplicación local M1, no artefacto de producción.

## Migraciones y revisión

`pnpm db:generate` genera SQL desde Drizzle. Constraints/triggers especializados en migraciones custom versionadas. `pnpm db:migrate` aplica todo en orden de forma repetible. No usar drizzle-kit push ni editar DB manualmente para demostrar comportamiento.

Trabajar en codex/m1-connected-decision-proof. Ver [evidencia M1](docs/15-handoff/m1-implementation.md) y [SESSION_STATE](SESSION_STATE.md). Sin merge ni deploy autorizado. Patch independiente no cotejado; por resolución humana 2026-09-24 esa limitación histórica no bloquea M1 ni autoriza inventar su contenido.
