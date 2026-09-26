Status: derived
Owner: Engineering
Canonical: no
Last reviewed: 2026-09-25
Related: docs/15-handoff/PILOT_RUNBOOK.md, docs/15-handoff/competition-rc1-security-review.md
Depends on: MVP / Pilot release 2026-09-25

# PILOT · revisión de seguridad acotada

Revisión de código y pruebas del 25 de septiembre de 2026. No es pentest, certificación ni garantía de ausencia de vulnerabilidades. PILOT no es producción.

## Verificado (código + pruebas automáticas)

| Área | Evidencia |
|---|---|
| OIDC | `openid-client` valida firma JWKS, issuer, audience, expiración, nonce, state y PKCE. Pruebas: issuer falso, state incorrecto, callback repetido, identidad no provisionada y tester desactivado → redirección con motivo genérico y **sin** cookie de sesión. Login real en navegador sobre HTTPS con proveedor fixture en 5 viewports. |
| Identidad | Vínculo explícito issuer + subject por CLI; sin auto-registro ni enlace por email. El mismo subject con otro issuer no autoriza (prueba). |
| Sesión | Token opaco aleatorio de 32 bytes, sólo su hash en DB, 8 h, revocable (`logout`, `revoke-sessions`, `disable`). Cookie `__Host-`, `Secure`, `HttpOnly`, `SameSite=Strict`, Max-Age ≤ vida real. Logout limpia la cookie aun con sesión vencida. Bearer y `/api/session` DEMO deshabilitados en PILOT. |
| CSRF / Host | Host y Origin exactos contra `PILOT_ORIGIN`; POST sin Origin idéntico → 403. HSTS, CSP `self`, `frame-ancestors 'none'`, `nosniff`, `no-referrer`, `no-store`. |
| Tenencia | Prueba HTTP: tester B recibe 404 en contexto, blueprint, prepare, IA, feedback y commit sobre la marca de A; IDs cruzados rechazados; sesión aleatoria, DEMO, vencida y revocada → 401/403. Consultas del Engine filtran workspace + brand y FKs compuestas impiden referencias cruzadas. |
| Clase de datos | `pilot:start` rechaza bases con marcas no PILOT; el servidor DEMO rechaza bases con datos PILOT (prueba). |
| Límites | En memoria por cliente: 600 req/min, 20 login/min por IP; 20 propuestas IA y 20 feedback por sesión cada 10 min (prueba de 429 y aislamiento entre clientes). |
| IA | SDK oficial sólo en transporte; clave sólo server-side y fuera de logs. Salida validada contra schema v1 y Evidence Guard; `refusal`/`max_tokens`/JSON inválido/429 → error tipado sin propuesta. Fallo sin versión, auditoría, revisión ni impacto nuevos (prueba). Nunca auto-commit. |
| Logs | Una línea JSON por petición sin ruta, query, cookie ni cuerpo; errores inesperados sólo con tipo. Telemetría sin texto estratégico ni tokens (prueba). |
| Migración | 0008 aditiva; datos creados por el motor RC1 congelado sobreviven fila por fila (prueba). `pilot:migrate` exige respaldo verificado con datos existentes y advisory lock. |
| Respaldo | Copia en frío local sólo tras apagado limpio (`pg_ctl -w`); restauración en clúster separado reproduce exactamente el estado previo al respaldo (prueba). Nunca restaura sobre una base con tablas. |
| Dependencias | `pnpm audit --prod`: No known vulnerabilities found (2026-09-25). |

## Riesgo residual

- Limitador en memoria: se reinicia con el proceso y no se comparte entre instancias; operar una sola instancia o limitar en el proxy.
- Detrás de proxy sin `TRUST_PROXY=true`, todos los clientes comparten la IP del proxy para el límite por IP.
- `login_flows` guarda el verifier PKCE en claro durante ≤ 10 min (necesario para el canje; no es credencial de usuario).
- El contexto de marca se envía al proveedor IA al pedir propuesta: requiere consentimiento de testers y revisión de la política de datos de la cuenta.
- Sin MFA propia: depende de la política del proveedor OIDC.
- Mensajes de error internos (inglés breve) se devuelven al cliente; no contienen datos sensibles pero no están localizados.

## No probado

- `pg_dump`/`pg_restore` (herramientas cliente ausentes en este entorno): ensayar en el hosting antes del primer tester.
- Proveedor OIDC real y API real de Anthropic (se usaron fixtures firmados y respuestas simuladas).
- Despliegue detrás de un proxy real, TLS del hosting, carga, navegadores distintos de Chrome, auditoría WCAG completa.

## Revisión de la puerta de lanzamiento (2026-09-25)

Revisión renovada de OIDC, sesiones, cookies, CSRF/Origin, Host, límites, rutas públicas, solicitud de acceso, endpoint IA, CLI de operador, logs, migraciones, respaldos, scripts de despliegue, cabeceras y secretos.

| Severidad | Hallazgo | Estado |
|---|---|---|
| BLOCKER | El runtime PILOT importaba el servidor DEMO y, con él, `embedded-postgres` (dependencia de desarrollo): una instalación `--prod` no arrancaba. `tsx` era dependencia de desarrollo pero es el runtime. | **Corregido**: assets en módulo propio; `tsx` en dependencias; grafo de imports PILOT verificado (sólo dependencias de runtime). |
| BLOCKER | El operador vinculaba testers con la cadena `OIDC_ISSUER` y el login con el issuer de discovery: una diferencia de formato (p. ej. barra final) dejaba a todos los testers sin acceso. | **Corregido**: el operador usa el issuer de discovery. |
| BLOCKER | El limitador en memoria no protege con varias instancias. | **Corregido**: lock de instancia única en PostgreSQL. |
| IMPORTANT | Sin aviso de datos ni topes de gasto IA antes de enviar contexto a un proveedor real. | **Corregido**: aviso versionado con aceptación por tester, topes diarios por tester y total, logs de resultado. |
| IMPORTANT | `db:migrate`/`db:seed` (DEMO) podían ejecutarse contra una base PILOT saltando la compuerta de respaldo; `pilot:migrate` no detectaba migraciones editadas o una base más nueva. | **Corregido**: rechazo por clase de datos y plan forward-only con detección de divergencia. |
| IMPORTANT | Configuración errónea sólo se detectaba al arrancar. | **Corregido**: `pilot:validate-config` (sin red) y `pilot:preflight` (sólo lectura); sin eco de secretos (prueba). |
| DEFERRED | Limitador en memoria (una instancia); sin MFA propia (depende del proveedor OIDC); verifier PKCE en claro ≤ 10 min en `login_flows`; mensajes de error internos en inglés breve; sin rotación automática de sesiones más allá de 8 h. | Documentado. |

Verificado además: logs sin rutas, queries, cookies, tokens, prompts ni contexto (revisión de todas las llamadas a `console.*` del runtime PILOT); `pilot:backup` pasa credenciales por variables `PG*`, nunca en argumentos, y nunca usa `--clean`/`--create`; la solicitud de acceso es sólo un enlace `https:`/`mailto:` validado (sin almacenamiento ni superficie de abuso); `/api/mode` expone únicamente modo, enlace de acceso y aviso público. `pnpm audit --prod`: ver SESSION_STATE (resultado del gate final).

No probado: proveedor OIDC real, API real de Anthropic, `pg_dump`/`pg_restore` reales, proxy/TLS del hosting, carga.

## Cierre MVP fases 1–9 (2026-09-25)

Revisión de las superficies nuevas de la integración visual y del cierre:

| Severidad | Hallazgo | Estado |
|---|---|---|
| — | CSP, Origin, Host, cookies `__Host-`, OIDC, limitador y aislamiento de tenant | **Sin cambios.** La integración usa sólo recursos propios (`self`); ni estilos inline ni orígenes externos. La prueba visual confirmó que la CSP bloquea `<style>` inyectado e imágenes `data:`. |
| IMPORTANT | Visitantes anónimos veían un 401 en consola (sonda `/api/me`). | **Corregido**: `GET /api/session-state` responde 200 `{authenticated}` ejecutando las mismas comprobaciones (expiración, membership, identidad PILOT) sin revelar el motivo; prueba incluye token DEMO en PILOT y sesión revocada. |
| — | Assets públicos | Allowlist explícita de 10 archivos seleccionados + iconos; el paquete de diseño, manifiestos y tableros no se sirven. Caché `public, max-age=86400` sólo para `/brand/*`; documentos y scripts siguen `no-store`. |
| — | Manifest PWA con rutas rotas | **Corregido** (sin impacto de seguridad). |
| — | Metadatos OG | URL absoluta a `https://brandopolis.ai/brand/web/og.webp`; no expone datos. |
| DEFERRED | Sin cambios respecto de la revisión de lanzamiento. | Ver arriba. |

`pnpm pilot:ai-smoke`: una sola solicitud con marca ficticia, sin base de datos ni datos de testers; la clave no se imprime ni viaja en el cuerpo (prueba).
