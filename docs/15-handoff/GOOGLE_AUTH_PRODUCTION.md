Status: derived
Owner: Engineering
Canonical: no
Last reviewed: 2026-09-28
Related: docs/15-handoff/PILOT_DEPLOYMENT_CONTRACT.md, docs/15-handoff/OIDC_PROVIDER_DECISION.md, docs/15-handoff/CURRENT_IMPLEMENTATION_STATE_2026-09-28.md
Depends on: feat/pilot-auth-admin (OIDC self-provisioning)

# Acceso con Google · certificación multiusuario y configuración de producción

Certifica, con pruebas, que la autenticación **no está atada a un usuario, un correo, un workspace ni
una identidad pre-aprovisionada**, y fija la configuración exacta que producción necesita.

## 1. Identidad canónica

```
identidad = (issuer, subject)
```

`issuer` es el valor que el documento de discovery del proveedor declara, no la cadena del entorno.
`subject` es el `sub` del ID token. **El correo nunca es la identidad**: se guarda en `user_accounts`
como metadato de perfil para reconocimiento, administración y futura recuperación.

## 2. Qué exige cada vía

| | Primer acceso (auto-aprovisionamiento) | Identidad ya aprovisionada |
|---|---|---|
| Authorization Code + PKCE + `state` + `nonce` | obligatorio | obligatorio |
| Firma (JWKS), issuer, audiencia, expiración | obligatorio | obligatorio |
| `sub` presente | obligatorio | obligatorio |
| `email` presente | **obligatorio** | no exigido |
| `email_verified === true` | **obligatorio** | no exigido |

**Esta asimetría es deliberada.** Crear una cuenta a partir de una afirmación externa exige un buzón
verificado. Pero una identidad que un operador ya aprovisionó sigue entrando con `(issuer, subject)`:
si el proveedor dejara de enviar claims opcionales de perfil, ningún Estratega de Marca queda fuera de
su workspace. El perfil sólo se refresca cuando los claims vienen verificados.

## 3. Puerta de autoservicio

| `PILOT_AUTO_PROVISION` | Identidad Google válida y verificada, desconocida | Identidad conocida | Cuenta deshabilitada |
|---|---|---|---|
| `false` (por defecto, o sin definir) | **denegada**, no se crea nada | reutilizada | **denegada** |
| `true` | aprovisionada en una transacción | reutilizada, nunca recreada | **denegada** |

Deshabilitar una cuenta gana siempre: `disable()` desactiva identidad y membresía y borra sus sesiones,
y `issueSession` la rechaza aunque el autoservicio esté encendido.

## 4. Qué crea un primer acceso

En una sola transacción: usuario canónico, workspace PILOT privado, membresía activa con
`canCreateBrand`, mapeo de identidad `(issuer, subject)`, perfil de cuenta con `emailVerifiedAt`,
cohorte determinista y evento `account_created`. Después, `session_started`.

Cohorte = SHA-256 de `issuer + "\n" + subject`, primer byte par → `A`, impar → `B`. Sin
`Math.random()`. Sólo se consulta al aprovisionar, así que **ninguna cuenta existente se reasigna**.

## 5. Certificación (pruebas reales, `tests/pilot-cases.ts`)

Cuatro pruebas de certificación multiusuario, sobre PostgreSQL real:

1. **Identidades Google arbitrarias.** A y B se auto-aprovisionan: usuarios distintos, workspaces
   privados distintos, membresía activa con `canCreateBrand` cada uno. Accesos repetidos reutilizan su
   usuario. Aislamiento comprobado sobre la superficie real de producto: marcas, contexto estratégico,
   documentos de origen, blueprint, ámbito de subida de documentos, captura de evidencia, asignación
   cruzada y sesiones. Ninguna fuga entre inquilinos.
2. **El correo no es la identidad.** La misma identidad con el mismo correo devuelve el mismo usuario;
   el perfil se refresca sin mover la identidad. Un `subject` distinto que presenta **el mismo correo
   verificado** no se convierte en la primera cuenta: se rechaza, la cuenta original queda intacta y no
   se crea identidad alguna para el impostor, que tampoco obtiene sesión. Cambiar el correo de una
   identidad existente no repunta la cuenta de nadie más.
3. **Puerta y claims.** Apagado deniega y no crea nada; encendido aprovisiona; conocida se reutiliza
   con la puerta apagada; faltan `sub`, `email` o `email_verified` → denegado; cuenta deshabilitada →
   denegada con la puerta encendida; un `subject` idéntico bajo **otro issuer** es otro principal.
4. **Concurrencia.** Tres personas, tres intentos simultáneos cada una: cada `subject` resuelve a un
   único usuario canónico, una única fila de identidad, tres usuarios y tres workspaces distintos.

## 5.bis Política de acceso de participantes

**POLÍTICA ACTUAL DEL PILOTO: todo participante autenticado con éxito queda aprobado automáticamente.**
No hay paso de aprobación manual en esta fase de validación.

**POLÍTICA FUTURA:** Brandopolis puede pasar a una puerta de aprobación manual con el mismo modelo de
estados, cambiando una variable de entorno. No requiere rediseño de esquema.

| Estado | Significado | Acceso |
|---|---|---|
| `PENDING` | cuenta creada, acceso reservado | denegado hasta que algo la apruebe |
| `APPROVED` | admitido | acceso completo a su workspace privado |
| `SUSPENDED` | acceso retirado por un operador | denegado; la cuenta se conserva |

```
PILOT_DEFAULT_ACCESS_STATUS=APPROVED    # fase actual; ausente equivale a APPROVED
PILOT_DEFAULT_ACCESS_STATUS=PENDING     # piloto controlado futuro
```

`SUSPENDED` se rechaza como valor por defecto: crearía cuentas que nunca podrían entrar.

Reglas que las pruebas fijan:

- La política se aplica **sólo al primer aprovisionamiento**. Un participante que vuelve conserva su
  estado, así que cambiar el valor por defecto **no aprueba ni reserva retroactivamente** a nadie.
- `SUSPENDED` retira el acceso de inmediato: revoca las sesiones vivas, y el guardia de `authorize`
  rechaza igualmente una sesión que sobreviviera. Defensa en profundidad.
- `disable()` sigue siendo la desactivación dura y **gana sobre cualquier estado**: volver a `APPROVED`
  no reactiva una identidad desactivada.
- El estado vive en `user_accounts` (el perfil del participante de autoservicio), **no** en
  `pilot_identities`. Esa tabla la comparte el build congelado del ensayo de release y ampliarla rompe
  esa prueba de compatibilidad: se comprobó y se rediseñó por ello. Una identidad aprovisionada por un
  operador no tiene perfil y se trata como `APPROVED`, que es exactamente el comportamiento actual;
  para esas, el control sigue siendo `disable()`.
- Un participante recién auto-aprobado sigue aislado por usuario y workspace, como cualquier otro.

## 6. Hallazgos de la auditoría de usuario fijo

Se buscaron correos, `subject` de Google, IDs de workspace o usuario fijos y supuestos de usuario único
en la ruta de producción (`src/`).

- **Ningún correo en `src/`.** Ninguno.
- **Ningún `subject` de Google fijo.** Las tres coincidencias de `subject:` en
  `src/transport/competitive-research.ts` son rótulos de tema de hallazgos competitivos, no identidades.
- **Ningún ID de workspace o usuario fijo.** Cada aprovisionamiento usa `randomUUID()`.
- **Toda lectura de identidad, sesión y membresía está acotada** por `(issuer, subject)` o por `userId`.
  La única lectura sin filtro es el agregado del informe de piloto, que es su propósito.
- **Observación, no defecto:** todo workspace auto-aprovisionado recibe el mismo *nombre* visible,
  `Workspace PILOT` (`pilot-access.ts`). El identificador es único; sólo el rótulo se repite. Con
  varios Estrategas de Marca, un operador que liste workspaces verá nombres idénticos. Conviene
  personalizarlo cuando exista administración.

## 7. Limitación conocida · colisión de correo

`user_accounts.normalizedEmail` es único. Si un `subject` nuevo se auto-aprovisiona con un correo que
ya pertenece a otra cuenta, la transacción falla y **el acceso se deniega**: no hay apropiación ni
cuenta duplicada, pero esa persona tampoco puede entrar.

Es el comportamiento seguro y está cubierto por prueba. Importa en un caso real: alguien que cambie de
cuenta de Google conservando la dirección (por ejemplo al migrar a Workspace) obtiene un `subject`
nuevo y quedará bloqueado. Hasta que exista administración, la salida es que un operador libere o
reasigne la cuenta anterior. **Decisión de producto pendiente**, no un fallo del código.

## 8. Configuración de producción

Para abrir el piloto a cualquier Estratega de Marca con cuenta de Google verificada:

```
PILOT_AUTO_PROVISION=true

OIDC_ISSUER=https://accounts.google.com
OIDC_CLIENT_ID=<client id de Google Cloud>
OIDC_CLIENT_SECRET=<secreto de Google Cloud>      # o OIDC_PUBLIC_CLIENT=true, exactamente uno
PILOT_ORIGIN=https://pilot.brandopolis.ai
```

Ningún valor secreto se escribe aquí ni en el repositorio: se configuran en el gestor de secretos del
hosting.

**Callback exacto que debe registrarse en Google Cloud:**

```
https://pilot.brandopolis.ai/auth/callback
```

Debe coincidir carácter a carácter. Si se define `OIDC_REDIRECT_URI`, tiene que ser exactamente ese
valor: el constructor rechaza cualquier otro origen o ruta.

**La configuración de Google Cloud es externa al repositorio** y se valida por separado: pantalla de
consentimiento OAuth, tipo de aplicación «Web», URI de redirección autorizada, y el `client_id` que
llegará como `aud` en el ID token. El repositorio no puede comprobar nada de eso; `pnpm
pilot:validate-config` y `pnpm pilot:preflight` verifican el lado de Brandopolis.

Orden de despliegue: `pnpm pilot:migrate` (aplica 0011, aditiva) → arrancar la nueva versión →
`pnpm pilot:smoke` → un acceso de control con una cuenta real.

## 9. Veredicto

**El código está listo para cuentas de Google verificadas arbitrarias.** Lo que falta para abrir el
piloto no es código, sino configuración: `PILOT_AUTO_PROVISION=true`, las credenciales OIDC de Google y
el callback registrado. Contraseña propia, recuperación y administración siguen sin implementarse y no
bloquean el acceso con Google.
