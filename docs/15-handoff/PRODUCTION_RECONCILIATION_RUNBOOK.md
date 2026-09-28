Status: derived
Owner: Engineering
Canonical: no
Last reviewed: 2026-09-28
Related: docs/15-handoff/ROOT_DOMAIN_403_REMEDIATION.md, docs/15-handoff/PILOT_DEPLOYMENT_CONTRACT.md, docs/15-handoff/CURRENT_IMPLEMENTATION_STATE_2026-09-28.md
Depends on: Approved landing commit d43fd4d (2026-09-28)

# Producción · reconciliación del PILOT con la landing aprobada

**`origin/main` estar en el commit aprobado NO significa que producción esté actualizada.**
Evidencia observada: `https://pilot.brandopolis.ai` sigue mostrando el hero anterior
(«Estrategia que evoluciona con claridad»), que fue reemplazado en `d43fd4d`.

| Hecho | Valor |
|---|---|
| Commit aprobado | `d43fd4d7db36205f4d870b94fcce325202064cf1` |
| `origin/main` | en ese commit (confirmado) |
| Repositorio de producción | `/home/wwwbrando/apps/brandopolis` |
| Servicio | `brandopolis-pilot.service` |
| Rama esperada | `main` |
| Estado actual de producción | **desincronizado — sirve código anterior** |

Nada de este documento se ejecutó desde la tarea local.

## 1. Por qué producción puede estar obsoleta

Tres causas posibles, que el diagnóstico de §2 distingue:

1. **El repositorio de producción no se ha actualizado** — `HEAD` sigue en un commit anterior.
   Es lo más probable dado el hero antiguo.
2. **El repositorio se actualizó pero el servicio no se reinició.** Es una causa real y específica de
   esta aplicación: `src/transport/assets.ts` mantiene una **caché en memoria por proceso**
   (`const cache=new Map()`), y `loadAsset` sólo lee cada archivo del disco la primera vez:

   ```ts
   let entry=cache.get(key);
   if(!entry){const [file,type]=runtimeAssets[key],content=readFileSync(file);…cache.set(key,entry);}
   ```

   El proceso conserva el HTML, CSS y JS que leyó al arrancar. **`git pull` por sí solo no cambia
   nada de cara al público.** Esto ya se observó de forma reproducible en local durante el trabajo de
   la landing: cada edición exigió reiniciar el servidor para verla.
3. **El servicio ejecuta desde otra ruta** distinta de `/home/wwwbrando/apps/brandopolis`.

## 2. Diagnóstico de sólo lectura (WHM → Terminal como root)

Ejecuta bloque a bloque y guarda la salida antes de cambiar nada.

```bash
APP=/home/wwwbrando/apps/brandopolis
OWNER=wwwbrando
TARGET=d43fd4d7db36205f4d870b94fcce325202064cf1
```

### 2.1 Estado del repositorio de producción

Git rechaza operar en repositorios de otro propietario, así que ejecuta como el usuario dueño:

```bash
runuser -u $OWNER -- git -C $APP rev-parse HEAD
runuser -u $OWNER -- git -C $APP rev-parse --abbrev-ref HEAD
runuser -u $OWNER -- git -C $APP status --short --branch
runuser -u $OWNER -- git -C $APP log --oneline -5
runuser -u $OWNER -- git -C $APP rev-parse origin/main
```

Interpretación:

- `HEAD` ≠ `$TARGET` → causa 1 (repositorio obsoleto). Es lo esperado.
- `HEAD` == `$TARGET` pero el sitio público muestra el hero antiguo → **causa 2** (falta reinicio).
- Cualquier salida de `status --short` distinta de vacío → hay cambios locales en producción:
  **detente y revísalos con una persona antes de continuar.**

### 2.2 Proceso en ejecución

```bash
systemctl status brandopolis-pilot.service --no-pager | head -20
systemctl show brandopolis-pilot.service -p WorkingDirectory -p ExecStart -p ActiveEnterTimestamp
ps -o pid,lstart,cmd -p "$(systemctl show -p MainPID --value brandopolis-pilot.service)"
```

- `WorkingDirectory` debe ser `$APP`. Si no, el servicio corre desde otra copia → causa 3.
- `ActiveEnterTimestamp` anterior al último `git pull` confirma la causa 2.

### 2.3 Salud

```bash
curl -sS http://127.0.0.1:3000/health            # local, directo al proceso
curl -sS https://pilot.brandopolis.ai/health     # público, a través del proxy
```

Ambos deben devolver `{"application":"brandopolis-pilot","protocol":"pilot-v1","status":"ready"}`.

### 2.4 Huella de los assets servidos (no confíes sólo en el SHA)

El SHA dice qué hay en disco; esto dice **qué está sirviendo el proceso**.

```bash
# Debe devolver 4 si sirve la landing aprobada, 0 si sirve la anterior.
curl -sS https://pilot.brandopolis.ai/ | grep -c -E "De la idea a la marca|De la marca al mercado|Aprendes estrategia|Defines tu cliente"

# Debe devolver 0 con la landing aprobada.
curl -sS https://pilot.brandopolis.ai/ | grep -c -E "Estrategia que evoluciona|Solicitar acceso"

# Cinta de cinco capacidades: 5 con la aprobada, 4 con la anterior.
curl -sS https://pilot.brandopolis.ai/ | grep -o "pillar-icon" | wc -l

# Línea a línea, para dejar constancia
for s in "De la idea a la marca" "De la marca al mercado" "Defines tu cliente" \
         "Construyes tu posicionamiento" "Incorporas evidencia" "Mantienes el historial" \
         "Aprendes estrategia"; do
  printf '%-32s %s\n' "$s" "$(curl -sS https://pilot.brandopolis.ai/ | grep -c "$s")"
done
# Todas deben ser 1. Cualquier 0 = assets obsoletos.
```

## 3. Runbook de despliegue

Conservador y ejecutable bloque a bloque. **No fuerces nada.**

### 3.1 Captura de estado y respaldo

```bash
ts=$(date +%F-%H%M); mkdir -p /root/brandopolis-deploy-$ts
runuser -u $OWNER -- git -C $APP rev-parse HEAD > /root/brandopolis-deploy-$ts/HEAD.before
runuser -u $OWNER -- git -C $APP status --short --branch > /root/brandopolis-deploy-$ts/status.before
systemctl show brandopolis-pilot.service -p WorkingDirectory -p ExecStart > /root/brandopolis-deploy-$ts/service.before
curl -sS https://pilot.brandopolis.ai/ > /root/brandopolis-deploy-$ts/landing.before.html
cat /root/brandopolis-deploy-$ts/HEAD.before
```

Respalda además la base **antes** de cualquier migración (`pnpm pilot:backup`, ver
[PILOT_RUNBOOK](PILOT_RUNBOOK.md)). Este despliegue no cambia el esquema, pero la disciplina se
mantiene.

### 3.2 Traer el commit aprobado (sólo fast-forward)

```bash
runuser -u $OWNER -- git -C $APP fetch origin --prune
runuser -u $OWNER -- git -C $APP status --short            # debe salir vacío
runuser -u $OWNER -- git -C $APP merge --ff-only origin/main
runuser -u $OWNER -- git -C $APP rev-parse HEAD            # debe imprimir $TARGET
```

`--ff-only` falla si hay divergencia en lugar de reescribir historia. **Si falla, detente.**
No uses `git reset --hard` sin aprobación humana explícita: destruiría cambios hechos en el servidor
que nadie ha revisado.

### 3.3 Dependencias

```bash
runuser -u $OWNER -- bash -lc "cd $APP && pnpm install --frozen-lockfile --prod"
```

`d43fd4d` no cambia `package.json` ni el lockfile, así que esto debe ser un no-op. Ejecútalo igualmente:
es barato y protege de un despliegue futuro que sí los cambie.

### 3.4 Migraciones

```bash
runuser -u $OWNER -- bash -lc "cd $APP && pnpm pilot:migrate"
```

`d43fd4d` **no incluye migraciones** (sólo `src/transport/public/`, docs y una prueba). El comando
debe reportar que ya está al día. Nunca lo pongas en el comando de arranque.

No ejecutes `typecheck`/`lint`/`test` en el servidor: requieren dependencias de desarrollo que el
runtime de producción no instala. La validación se hace antes, en el entorno de desarrollo.

### 3.5 Reinicio — obligatorio en este despliegue

Por la caché de assets en memoria (§1.2), **cambiar archivos no cambia lo que se sirve**. Reinicia:

```bash
systemctl restart brandopolis-pilot.service
sleep 3
systemctl is-active brandopolis-pilot.service
```

Una sola instancia: `pilot:start` toma un advisory lock de PostgreSQL y una segunda se niega a
arrancar. `restart` es stop-then-start, que es justo el patrón que el contrato de despliegue exige.

### 3.6 Verificación posterior

```bash
curl -sS http://127.0.0.1:3000/health
curl -sS https://pilot.brandopolis.ai/health
runuser -u $OWNER -- git -C $APP rev-parse HEAD

curl -sS https://pilot.brandopolis.ai/ | grep -c -E "De la idea a la marca|De la marca al mercado|Aprendes estrategia|Defines tu cliente"   # 4
curl -sS https://pilot.brandopolis.ai/ | grep -c -E "Estrategia que evoluciona|Solicitar acceso"                                            # 0
curl -sS https://pilot.brandopolis.ai/ | grep -o "pillar-icon" | wc -l                                                                      # 5

journalctl -u brandopolis-pilot.service -n 40 --no-pager
```

### 3.7 Reversión

```bash
runuser -u $OWNER -- git -C $APP merge --ff-only $(cat /root/brandopolis-deploy-$ts/HEAD.before) \
  || runuser -u $OWNER -- git -C $APP checkout $(cat /root/brandopolis-deploy-$ts/HEAD.before)
systemctl restart brandopolis-pilot.service
curl -sS https://pilot.brandopolis.ai/health
```

## 4. Criterios de reconciliación

Producción está reconciliada sólo cuando **las diez** se cumplen:

1. `HEAD` del repositorio de producción == `d43fd4d7db36205f4d870b94fcce325202064cf1`
2. `origin/main` == ese mismo commit
3. `git status --short` vacío
4. `systemctl is-active brandopolis-pilot.service` → `active`
5. `http://127.0.0.1:3000/health` → `status: ready`
6. `https://pilot.brandopolis.ai/health` → `status: ready`
7. La landing pública contiene «De la idea a la marca.» y «De la marca al mercado.»
8. **Ausencia** de «Estrategia que evoluciona» y de «Solicitar acceso»
9. Las cinco capacidades presentes: Defines tu cliente · Construyes tu posicionamiento ·
   Incorporas evidencia · Mantienes el historial · Aprendes estrategia
10. Ventana de incógnito y un segundo navegador muestran la landing aprobada

Si 1–6 se cumplen pero 7–9 no, el proceso está sirviendo assets cacheados: repite §3.5.

## 5. Secuencia recomendada

1. **§2 completo** y registrar la salida.
2. **§3** → PILOT reconciliado con `d43fd4d` (criterios §4).
3. Sólo entonces, el 403 del dominio raíz:
   [ROOT_DOMAIN_403_REMEDIATION](ROOT_DOMAIN_403_REMEDIATION.md).
4. Después, revisión y despliegue de Auth/Admin cuando existan.

Primero el piloto: es el sistema en uso y su corrección no depende de Apache.
