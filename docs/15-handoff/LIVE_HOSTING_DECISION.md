Status: derived
Owner: Product / Engineering
Canonical: no
Last reviewed: 2026-09-25
Related: docs/15-handoff/PILOT_DEPLOYMENT_CONTRACT.md
Depends on: Live Pilot Launch Gate 2026-09-25

# Decisión de hosting para el piloto

Documento para decidir, no para comparar marketing. La aplicación no está atada a ningún proveedor.

## Lo que Brandopolis PILOT necesita realmente

| Recurso | Necesidad | Por qué |
|---|---|---|
| Proceso Node | Node 24.x, 1 instancia, ~0.5–1 vCPU, 512 MB–1 GB RAM | Servidor HTTP único; el limitador vive en memoria y un lock de PostgreSQL impide una segunda instancia. |
| PostgreSQL | Versión 17 gestionada, persistente, dedicada, backups diarios (≥ 7 días) y restauración a una base nueva | Todo el estado (decisiones, historial, sesiones, testers) vive allí. |
| Disco de la app | Ninguno persistente | La app no escribe archivos en runtime. |
| HTTPS entrante | Dominio propio con certificado gestionado; el proxy conserva `Host` | Cookies `__Host-`/`Secure`, HSTS y validación exacta de origen. |
| HTTPS saliente | Hacia el proveedor OIDC y `api.anthropic.com` | Discovery/JWKS/token y propuestas IA. |
| Secretos | Variables de entorno cifradas | DB, OIDC, Anthropic. |
| Logs | stdout persistente y consultable ≥ 14 días | Logs JSON por línea para diagnóstico. |
| Paso de release | Poder ejecutar un comando único (`pnpm pilot:migrate`) antes de iniciar la nueva versión | Migraciones explícitas, nunca en el arranque. |

Complejidad operativa estimada: baja — un proceso, una base, un dominio. Lo más delicado es el respaldo/restauración y el orden de release.

## Criterios de evaluación

1. PostgreSQL 17 gestionado con backups automáticos **y** restauración a base nueva documentada.
2. Node 24 soportado; comando de inicio y paso previo de release configurables.
3. Posibilidad de fijar **1 réplica** y despliegue stop-then-start.
4. Dominio propio + TLS gestionado sin configuración manual de certificados.
5. Secretos cifrados por entorno; logs persistentes.
6. Región cercana a los testers y conforme a su expectativa de datos.
7. Coste predecible para un piloto pequeño; sin compromiso anual.
8. Acceso a una shell o job one-off para `pnpm pilot:operator` y `pnpm pilot:backup` (o alternativa: ejecutarlos desde una máquina de operador con `DATABASE_URL`).

## Categorías sensatas (sin elegir por ti)

- **PaaS con PostgreSQL gestionado en la misma plataforma**: menor esfuerzo; verificar versión 17, réplicas = 1 y restauración a base nueva.
- **PaaS para la app + proveedor PostgreSQL gestionado separado**: más control del backup; requiere red saliente con TLS entre ambos.
- **VM pequeña + proxy (Caddy/Nginx) + PostgreSQL gestionado**: máximo control, más operación (parches, reinicios, logs).

No se creó ninguna cuenta ni se incurrió en gastos.

## Qué se necesita de ti

Proveedor elegido, región, `DATABASE_URL` de la base PILOT dedicada y el dominio para `PILOT_ORIGIN`.
