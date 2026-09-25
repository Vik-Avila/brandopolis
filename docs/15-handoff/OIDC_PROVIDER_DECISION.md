Status: derived
Owner: Engineering
Canonical: no
Last reviewed: 2026-09-25
Related: docs/14-decisions/ADR-0013.md, docs/15-handoff/PILOT_RUNBOOK.md
Depends on: Live Pilot Launch Gate 2026-09-25

# Decisión del proveedor de identidad (OIDC)

Brandopolis usa OpenID Connect estándar mediante `openid-client`. No hay lógica específica de ningún proveedor: cualquier proveedor OIDC conforme sirve.

## Requisitos

- **Discovery** en `<OIDC_ISSUER>/.well-known/openid-configuration` por HTTPS.
- Flujo **Authorization Code** con **PKCE S256**, `state` y `nonce`; scope `openid`.
- ID token firmado (JWKS) con `iss`, `aud` = client ID, `exp`, `nonce` y un **`sub` estable** por persona.
- Cliente **confidencial** (`OIDC_CLIENT_SECRET`) o **público** (`OIDC_PUBLIC_CLIENT=true`, sólo PKCE).

Validado por pruebas con tokens firmados: identidad válida entra; audiencia incorrecta, token expirado, issuer incorrecto, nonce falsificado, callback repetido, subject no provisionado y tester desactivado se rechazan sin crear sesión; sesión revocada deja de funcionar.

## Qué configurar en el proveedor

1. Crear una aplicación de tipo *web* (o *SPA/public* si se usa cliente público).
2. **Redirect / callback URI permitido** (ruta real verificada en `src/transport/pilot-auth.ts`):

   ```
   <PILOT_ORIGIN>/auth/callback
   ```

   p. ej. `https://pilot.brandopolis.ai/auth/callback`. Coincidencia exacta; sin comodines.
3. Grant type: Authorization Code (PKCE habilitado). No se necesitan refresh tokens.
4. Scopes: `openid` (email/perfil no son necesarios; el email no es identidad en Brandopolis).
5. Copiar al gestor de secretos: issuer (`OIDC_ISSUER`), client ID y, si aplica, secret.
6. Registrar o invitar en el proveedor a las personas del piloto (el acceso real lo concede Brandopolis por CLI, no el proveedor).

## Cómo obtener issuer + subject de un tester

- **Issuer**: `pnpm pilot:preflight` muestra `testers are bound to issuer <valor>`. Es el valor que el proveedor publica en discovery (puede diferir de `OIDC_ISSUER` en la barra final; Brandopolis usa siempre el publicado).
- **Subject (`sub`)**: el identificador inmutable de la persona en el proveedor (a menudo llamado *user ID* u *object ID* en la consola). No usar el email: puede cambiar y no es la identidad.
- Provisionar: `pnpm pilot:operator create <archivo.json>` con `{"subject":"<sub>","cohort":"A"}`.

Si el sub no se conoce por adelantado, el tester puede intentar entrar: verá «Tu identidad no tiene acceso» y el operador ve `auth_failure denied` en logs (sin el subject). Obtenerlo desde la consola del proveedor.

## Qué se necesita de ti

Proveedor elegido, `OIDC_ISSUER`, `OIDC_CLIENT_ID`, secret (o decisión de cliente público) y la lista de subjects de los testers iniciales con su cohorte.
