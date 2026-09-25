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
