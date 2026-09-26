Status: derived
Owner: Engineering
Canonical: no
Last reviewed: 2026-09-25
Related: docs/15-handoff/PILOT_DEPLOYMENT_CONTRACT.md, docs/15-handoff/OIDC_PROVIDER_DECISION.md
Depends on: Live Pilot Launch Gate 2026-09-25

# Dominio y DNS para el piloto

Dominio canónico: **brandopolis.ai** (sitio público). Piloto: **https://pilot.brandopolis.ai**. Aún no se configuró DNS, certificado ni hosting; no se hizo ningún cambio de DNS.

## Patrón recomendado

Subdominio dedicado `pilot.brandopolis.ai`, separado del sitio público `brandopolis.ai`:

```
PILOT_ORIGIN=https://pilot.brandopolis.ai
Callback OIDC: https://pilot.brandopolis.ai/auth/callback
```

## Requisitos de `PILOT_ORIGIN`

HTTPS, sin ruta, puerto por defecto (443), sin `localhost`, IP ni `example.*`. Debe coincidir exactamente con el `Host` que recibe la app (el proxy no debe reescribirlo) y con el callback registrado en el proveedor OIDC. La app envía HSTS (1 año) desde el primer acceso: usa un subdominio que siempre servirá HTTPS.

## Registros DNS habituales

- `CNAME pilot → <hostname que asigna el hosting>` (lo más común en PaaS), **o**
- `A`/`AAAA pilot → <IP de la VM o balanceador>`.
- Registros de verificación (`TXT`/`CNAME`) que pida el hosting para emitir el certificado.
- CAA opcional si tu dominio restringe autoridades de certificación.

## Orden de operaciones

1. Elegir hosting y crear la app (sin tráfico).
2. Añadir el dominio personalizado en el hosting y crear los registros DNS que indique.
3. Esperar el certificado TLS válido.
4. Fijar `PILOT_ORIGIN` y registrar el callback exacto en el proveedor OIDC.
5. `pnpm pilot:validate-config` y `pnpm pilot:preflight`.
6. Desplegar, `pnpm pilot:smoke` y login de control.
7. Enviar el enlace a los testers.
