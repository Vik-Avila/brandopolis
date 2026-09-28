Status: derived
Owner: Engineering
Canonical: no
Last reviewed: 2026-09-28
Related: docs/15-handoff/DOMAIN_DNS_LAUNCH.md, docs/15-handoff/PILOT_DEPLOYMENT_CONTRACT.md, docs/15-handoff/LIVE_HOSTING_DECISION.md
Depends on: Landing commit d43fd4d (2026-09-28)

# brandopolis.ai · 403 en el dominio raíz · diagnóstico y runbook

`https://brandopolis.ai` devuelve **403 Forbidden** de Apache/cPanel desde dispositivos externos.
`https://pilot.brandopolis.ai` sirve la aplicación PILOT.

Este documento separa lo que el repositorio demuestra de lo que sólo puede confirmarse en el
servidor, y entrega un runbook de sólo lectura primero. **Nada de esto se ejecutó desde la tarea
local.** No se tocó WHM, Apache, DNS ni producción.

## 1. Estado real del despliegue

**LA LANDING APROBADA NO ESTÁ DESPLEGADA.** El commit `d43fd4d` está en `origin/main`; eso es
control de versiones, no despliegue. Ningún proceso de producción sirve ese código todavía.

| Superficie | Estado |
|---|---|
| Landing pública aprobada | en `origin/main`, **no desplegada** |
| `brandopolis.ai` | 403 de Apache/cPanel — **BLOQUEADO** |
| `pilot.brandopolis.ai` | aplicación PILOT en ejecución (versión anterior a `d43fd4d`) |

## 2. Qué arquitectura define el repositorio

Topología canónica ([DOMAIN_DNS_LAUNCH](DOMAIN_DNS_LAUNCH.md)):

```
brandopolis.ai            → sitio público
pilot.brandopolis.ai      → aplicación PILOT (Node)
```

Requisitos de la app ([PILOT_DEPLOYMENT_CONTRACT](PILOT_DEPLOYMENT_CONTRACT.md)): un único proceso
Node escuchando en `BIND_HOST:PORT`, detrás de un proxy TLS que **conserva el `Host`**, una sola
réplica, migración explícita antes del arranque.

**El repositorio no documenta Apache, cPanel, WHM, Passenger, `.htaccess`, DocumentRoot ni vhosts
en ningún archivo.** La única mención de proxy es una categoría de hosting considerada y no elegida
(«VM pequeña + proxy (Caddy/Nginx)», [LIVE_HOSTING_DECISION](LIVE_HOSTING_DECISION.md)). El 403 por
tanto proviene de infraestructura **fuera del modelo de despliegue documentado**: un vhost de cPanel
que el panel creó por defecto para el dominio raíz.

## 3. Causa más probable del 403

Evidencia del repositorio + comportamiento estándar de Apache/cPanel:

1. **DocumentRoot vacío o sin índice.** cPanel crea `/home/<usuario>/public_html` para el dominio
   principal. Sin `index.html`/`index.php`, y con el listado de directorios desactivado
   (`Options -Indexes`, el valor por defecto en cPanel), Apache responde **403**, no 404. Ésta es la
   causa más probable, y es exactamente compatible con «la landing nunca se desplegó ahí».
2. **DocumentRoot equivocado** — el vhost del apex apunta a un directorio distinto del que se cree.
3. **Permisos** — el directorio no es `0755`, o no pertenece al usuario de cPanel, o el propietario
   es `root` tras una copia hecha como root.
4. **Regla de denegación** — un `Require all denied` o un `.htaccess` heredado.
5. **El apex no está proxyado al Node** — plausible, pero nótese que proxyarlo tampoco funcionaría
   hoy sin un cambio de código (§4).

Todas requieren confirmación en el servidor. El runbook de §6 las distingue.

## 4. Dos restricciones de código que condicionan la solución

Ambas son hechos verificables del código actual, no opiniones.

**(a) La app rechaza cualquier `Host` que no sea `PILOT_ORIGIN`.**

`src/transport/http.ts:140`

```ts
if(req.headers.host!==new URL(pilot.origin).host)throw new AppError('FORBIDDEN','Host not allowed');
```

Con `PILOT_ORIGIN=https://pilot.brandopolis.ai`, una petición proxyada con
`Host: brandopolis.ai` recibe **403 de la propia app**. Es decir: **hacer proxy del apex hacia el
Node sin tocar el código sustituye un 403 de Apache por un 403 de Brandopolis.** La opción «(A) un
solo Node con enrutado por hostname» y la opción «(B) proxy inverso del apex» requieren, ambas,
ampliar esa comprobación a una allowlist explícita de hosts (y revisar `url.origin` en la línea 148).

**(b) La landing no es estática hoy.**

`src/transport/public/app.js` llama a `/api/mode` y `/api/session-state` al arrancar. Servida desde
un DocumentRoot sin backend, `response.json()` falla y el usuario ve un aviso rojo de error —
además redactado para DEMO, porque `pilotMode` aún es `false` en ese punto. La CSP del documento
(`connect-src 'self'`) también impediría llamar a la API de otro origen. Publicar los archivos tal
cual en `public_html` **rendería la página pero con un error visible**.

## 5. Topología recomendada

Para desbloquear ya, con cero cambios de código y riesgo mínimo:

> **`brandopolis.ai` y `www.brandopolis.ai` → redirección 301 a `https://pilot.brandopolis.ai/`.**

La landing aprobada vive dentro de la app PILOT y ya es su página pública (`/`), así que el visitante
aterriza en el contenido correcto con «Entrar al piloto» a la vista. Elimina el 403 sin tocar la
arquitectura ni el código.

Cuando el apex deba ser el sitio público por derecho propio, la opción limpia es **(B′) proxy inverso
del apex hacia el mismo proceso Node, con allowlist de hosts explícita** en `http.ts` y
`PILOT_ORIGIN` ampliado a un conjunto de orígenes permitidos. Eso es trabajo de código con sus
propias pruebas: no lo hagas desde el panel.

La opción (C) «estático en DocumentRoot» sólo es válida tras hacer que la landing degrade en silencio
sin API (§4b), y duplicaría los assets de marca. No recomendada mientras la landing sea la portada
de la propia app.

## 6. Runbook de servidor (WHM → Terminal como root)

**Sólo lectura primero. No edites nada hasta terminar §6.1 y haber interpretado la salida.**

Sustituye `<cpuser>` por el usuario de cPanel del dominio.

### 6.1 Diagnóstico de sólo lectura

```bash
# 1. ¿Qué vhost atiende el apex y cuál es su DocumentRoot?
httpd -S 2>&1 | grep -i -A2 brandopolis.ai
grep -R "brandopolis.ai" /etc/apache2/conf/httpd.conf | head -20
# Espera: dos vhosts (80 y 443) para brandopolis.ai con una línea DocumentRoot.

# 2. ¿Existe el DocumentRoot y tiene índice?
ls -la /home/<cpuser>/public_html/
# 403 típico = directorio vacío, o sin index.html, o sin permiso de recorrido.

# 3. Permisos y propietario de toda la cadena
namei -l /home/<cpuser>/public_html/
stat -c '%A %U:%G %n' /home/<cpuser> /home/<cpuser>/public_html
# Espera: /home/<cpuser> 0711 o 0750 <cpuser>:<cpuser>; public_html 0755 <cpuser>:<cpuser>.

# 4. Reglas de denegación heredadas
find /home/<cpuser>/public_html -maxdepth 2 -name .htaccess -exec echo '--- {}' \; -exec cat {} \;
grep -RIn "Require all denied\|Deny from all\|Options -Indexes" /etc/apache2/conf.d/ 2>/dev/null | head

# 5. El error exacto, con su motivo
tail -50 /etc/apache2/logs/error_log | grep -i brandopolis
tail -20 /home/<cpuser>/logs/brandopolis.ai.error.log 2>/dev/null
# "Directory index forbidden by Options directive" => causa 1 (sin índice).
# "client denied by server configuration"          => causa 4 (regla de denegación).

# 6. ¿Está el apex proxyado a algún backend?
grep -RIn "ProxyPass\|ProxyPreserveHost" /etc/apache2/conf.d/userdata/ 2>/dev/null | head

# 7. ¿Qué escucha el Node y en qué puerto? (no lo reinicies)
ss -ltnp | grep -E ':(3000|80|443)'
systemctl status brandopolis 2>/dev/null | head -15

# 8. Estado del propio PILOT, desde el servidor
curl -sS -o /dev/null -w '%{http_code}\n' https://pilot.brandopolis.ai/health
curl -sS https://pilot.brandopolis.ai/health
# Espera: 200 {"application":"brandopolis-pilot","protocol":"pilot-v1","status":"ready"}
```

### 6.2 Respaldo antes de cualquier edición

```bash
ts=$(date +%F-%H%M)
mkdir -p /root/brandopolis-backup-$ts
cp -a /etc/apache2/conf/httpd.conf /root/brandopolis-backup-$ts/
cp -a /etc/apache2/conf.d/userdata /root/brandopolis-backup-$ts/ 2>/dev/null
cp -a /home/<cpuser>/public_html/.htaccess /root/brandopolis-backup-$ts/ 2>/dev/null
ls -la /root/brandopolis-backup-$ts/
```

### 6.3 Remediación — redirección del apex (recomendada)

Hazlo por **cPanel → Domains → Redirects** si está disponible (el panel regenera la configuración
correctamente). Sólo si no lo está, mediante `.htaccess` en el DocumentRoot del apex:

```apache
# /home/<cpuser>/public_html/.htaccess
RewriteEngine On
RewriteCond %{HTTPS} off [OR]
RewriteCond %{HTTP_HOST} ^(www\.)?brandopolis\.ai$ [NC]
RewriteRule ^(.*)$ https://pilot.brandopolis.ai/$1 [R=301,L]
```

No edites a mano los vhosts de cPanel: se regeneran y perderías el cambio. Si hiciera falta
configuración a nivel de vhost, va en `/etc/apache2/conf.d/userdata/std/2_4/<cpuser>/brandopolis.ai/`
seguido de `/scripts/ensure_vhost_includes --user=<cpuser>`.

### 6.4 Validar y aplicar

```bash
apachectl configtest          # debe imprimir: Syntax OK
```

**Recarga, no reinicies** — `graceful` no corta conexiones en curso:

```bash
apachectl -k graceful
```

Reinicio completo (`systemctl restart httpd`) sólo si `graceful` no toma el cambio.

### 6.5 Comprobaciones posteriores

```bash
curl -sSI https://brandopolis.ai        | head -5   # espera 301 → https://pilot.brandopolis.ai/
curl -sSI https://www.brandopolis.ai    | head -5   # espera 301
curl -sSI http://brandopolis.ai         | head -5   # espera 301 a HTTPS
curl -sSI https://pilot.brandopolis.ai  | head -5   # espera 200, sin tocar
curl -sS   https://pilot.brandopolis.ai/health

# Sigue la cadena completa y confirma dónde acaba
curl -sSIL https://brandopolis.ai | grep -Ei '^(HTTP|location)'
```

Rollback: restaurar desde `/root/brandopolis-backup-$ts/`, `apachectl configtest`, `apachectl -k graceful`.

### 6.6 Validación en navegador

Una redirección 301 **se cachea de forma persistente**. Valida siempre en ventana de incógnito
primero; si el navegador normal se queda con una versión antigua, limpia la caché de ese host.

1. Incógnito, escritorio → `https://brandopolis.ai`
2. Un segundo navegador de escritorio (perfil distinto)
3. Móvil con datos móviles, **no** por la misma Wi-Fi (descarta DNS/caché local)
4. En los tres: la landing aprobada carga, «Entrar al piloto» es visible, sin aviso rojo de error
5. `https://pilot.brandopolis.ai` sigue funcionando y la sesión sigue activa

## 7. Comportamiento canónico de URL

| Asunto | Decisión | Fundamento |
|---|---|---|
| HTTP → HTTPS | siempre 301 a HTTPS | la app envía HSTS y exige `PILOT_ORIGIN` https |
| `www` vs apex | `www` redirige al apex (301) | un único nombre canónico; el apex es el dominio documentado |
| URL pública canónica | `https://brandopolis.ai/` | [DOMAIN_DNS_LAUNCH](DOMAIN_DNS_LAUNCH.md) |
| URL canónica del PILOT | `https://pilot.brandopolis.ai/` | `PILOT_ORIGIN`, callback OIDC |
| Cookies | **host-only, no compartidas** | ver abajo |

**Aislamiento de cookies (ya garantizado por el código).** En PILOT la sesión usa el prefijo
`__Host-brandopolis_session` (`src/transport/http.ts:173`). Ese prefijo **obliga** por especificación
a `Secure`, `Path=/` y **ausencia de atributo `Domain`**: la cookie es host-only y el navegador
rechazaría cualquier intento de ampliarla al dominio padre. `tests/pilot-browser/pilot.spec.ts`
lo verifica (`secure`, `httpOnly`, `sameSite: 'Strict'`).

**No compartas estado de sesión entre `brandopolis.ai` y `pilot.brandopolis.ai`.** No hay razón de
arquitectura que lo justifique y hacerlo exigiría abandonar `__Host-`, degradando la postura de
seguridad. La landing pública no necesita sesión.

**HSTS:** la app envía `Strict-Transport-Security: max-age=31536000` **sin `includeSubDomains`**
(`http.ts:141`). Por tanto el HSTS del piloto no fuerza HTTPS en el apex y **no** es causa del 403.
Si algún día se añade `includeSubDomains` en el apex, todos los subdominios quedarán obligados a
HTTPS válido para siempre: no lo actives sin certificado en todos ellos.

## 8. Hechos confirmados en el servidor (2026-09-28)

| Hecho | Valor |
|---|---|
| Vhost del apex | existe para `brandopolis.ai` |
| DocumentRoot del apex | `/home/wwwbrando/public_html` |
| Vhost del piloto | separado, sirve la aplicación Node |
| Resolución DNS | ambos dominios al mismo servidor |
| Repositorio de producción | `/home/wwwbrando/apps/brandopolis` |
| Servicio | `brandopolis-pilot.service` |

Con el DocumentRoot confirmado, la causa 1 (**directorio sin índice**) pasa a ser la hipótesis
principal: la landing aprobada nunca se copió a `/home/wwwbrando/public_html` y Apache, con el
listado de directorios desactivado, responde 403. El bloque §6.1 lo confirma en dos comandos
(`ls -la` del DocumentRoot y la línea del `error_log`).

Queda por confirmar en el servidor: permisos exactos de la cadena de directorios, existencia de
`.htaccess` heredado y la línea literal del `error_log`.

### 8.1 Redirección 301 persistente en cPanel

Editar el `httpd.conf` generado no sirve: cPanel lo regenera. Para que la redirección sobreviva,
usa el include de `userdata` (ruta exacta) o la interfaz **cPanel → Domains → Redirects**.

```bash
CPUSER=wwwbrando
DIR=/etc/apache2/conf.d/userdata/ssl/2_4/$CPUSER/brandopolis.ai
mkdir -p $DIR
ts=$(date +%F-%H%M); cp -a $DIR /root/brandopolis-backup-$ts-userdata 2>/dev/null

cat > $DIR/redirect.conf <<'CONF'
RewriteEngine On
RewriteCond %{HTTP_HOST} ^(www.)?brandopolis.ai$ [NC]
RewriteRule ^/?(.*)$ https://pilot.brandopolis.ai/$1 [R=301,L]
CONF

# Repite para el vhost no-SSL si el apex también escucha en :80
mkdir -p /etc/apache2/conf.d/userdata/std/2_4/$CPUSER/brandopolis.ai
cp $DIR/redirect.conf /etc/apache2/conf.d/userdata/std/2_4/$CPUSER/brandopolis.ai/redirect.conf

/scripts/ensure_vhost_includes --user=$CPUSER
apachectl configtest        # Syntax OK
apachectl -k graceful
```

Verificación: los curl de §6.5. Para revertir, borra los dos `redirect.conf`, repite
`ensure_vhost_includes`, `configtest` y `graceful`.

## 9. Secuencia de despliegue recomendada

**Antes que nada**, reconcilia el PILOT con la landing aprobada:
[PRODUCTION_RECONCILIATION_RUNBOOK](PRODUCTION_RECONCILIATION_RUNBOOK.md). `pilot.brandopolis.ai`
sirve código anterior a `d43fd4d`, y redirigir el apex hacia un piloto obsoleto sólo publicaría la
landing antigua.

1. Ejecutar §6.1 y registrar la salida.
2. Aplicar §6.3, validar con §6.4–6.6 → **el 403 desaparece**.
3. Desplegar `d43fd4d` en `pilot.brandopolis.ai` (`pnpm install --frozen-lockfile --prod`,
   `pnpm pilot:migrate`, stop-then-start, `pnpm pilot:smoke`) → la landing aprobada queda publicada.
4. Sólo después, considerar (B′) si el apex debe servir el sitio público por sí mismo.
