# Continuar en otro equipo sin perder commits locales

**Para el respaldo ya preparado, seguir primero `04_RESPALDO_REAL_Y_RESTAURACION.md`.** Los pasos de exportación siguientes quedan como alternativa genérica; no volver a ejecutarlos sobre el respaldo actual. Se han conservado los datos de la DEMO, por lo que hay que recuperarlos antes de lanzar cualquier script que los recree.

## 1. Dos partes del traspaso

Este ZIP conserva contexto y referencias. El código reciente está en la PC original: los commits reportados no se han subido. **Antes de dejar esa PC, generar y copiar también el paquete Git descrito abajo.** No basta con clonar GitHub.

Se incluyen dos utilidades Node.js sin dependencias de terceros. Requieren Git y Node disponibles en PATH; no usan pnpm.ps1 ni requieren cambiar la política de PowerShell. No suben nada y no modifican el checkout original. Rechazan árbol con cambios, repositorio incompleto, submódulos o Git LFS para evitar un traspaso que parezca completo sin serlo.

## 2. En la PC original

Detén los servicios y confirma con Claude el estado real. Si hay cambios sin commit, pide a Claude que los preserve por el procedimiento del proyecto; la herramienta no hace commits ni los descarta por ti.

Extrae este ZIP y abre PowerShell en su carpeta `04_Migracion`. Ejemplo con un destino nuevo fuera del repositorio:

```powershell
node .\02_exportar_codigo.mjs 'C:\Proyectos\brandopolis' 'C:\Traspasos\Brandopolis_codigo_2026-10-12'
```

El comando genera:

- `brandopolis.bundle`: historial y referencias locales de Git, incluidos los commits del candidato que pertenezcan a esas referencias.
- `TRASPASO_CODIGO.json`: rama, HEAD, hash del bundle y estado observado, sin URL remota ni credenciales.

Comprueba que el proceso termina con «Exportación verificada». Copia esa carpeta y este ZIP al nuevo equipo. Conserva el original hasta haber arrancado y revisado la copia.

La herramienta exige una rama activa y árbol limpio. Si detecta Git LFS, submódulos o un repositorio shallow/partial, pide a Claude que prepare su exportación específica. No ignora esos componentes. Un bundle conserva los archivos ya seguidos por Git; no limpia secretos históricos que pudieran haber sido versionados.

## 3. En el equipo nuevo

Instala Git y la versión de Node/pnpm que indiquen package.json, el lockfile y las instrucciones vigentes del repositorio. Las notas antiguas mencionan Node 24 y pnpm 12.4.2, pero hay que confirmarlo en el candidato, no instalar versiones por memoria.

Extrae este ZIP, abre PowerShell en `04_Migracion` y restaura a una carpeta inexistente:

```powershell
node .\03_restaurar_codigo.mjs 'D:\Traspasos\Brandopolis_codigo_2026-10-12' 'C:\Proyectos\brandopolis'
```

El comando verifica la huella del bundle, clona la rama registrada y confirma HEAD y árbol limpio. No sobrescribe una carpeta existente y no hace push. `origin` queda apuntando al bundle local; Claude puede configurar más adelante la URL oficial verificada si hace falta, sin hacer push por ello.

El archivo `brandopolis.bundle` conserva todas las referencias exportadas. La restauración deja preparada la rama activa; otras ramas pueden figurar como referencias remotas del clon. Conservar el bundle por si se necesitan después.

## 4. Lo que Git no transporta

| Elemento | Cómo continuar |
| --- | --- |
| node_modules / herramientas | Reinstalar mediante el lockfile y las instrucciones del candidato. |
| Variables locales, claves y credenciales | Configurar de nuevo por canal seguro; nunca pegarlas en el prompt ni añadirlas a este ZIP. |
| Bases aisladas de DEMO | Preferir recrearlas con scripts vigentes. Si se necesitan los datos exactos, preparar un backup consistente y probar restauración en aislado. No copiar carpetas de PostgreSQL en caliente. |
| Logos, artes y otros archivos locales fuera de Git | Si se conserva la DEMO existente, trasladar también su almacenamiento y relaciones con la base. Inventariar desde la configuración actual. |
| Capturas de aceptación, trazas y mensajes simulados no versionados | Exportar del entorno original solo los necesarios. Este ZIP incluye referencias aportadas a la conversación, no esa galería actual. |
| Sesiones de navegador, OAuth y token DEMO | Autenticar o regenerar en el nuevo entorno. Un token viejo no sustituye una sesión nueva. |

No aplicar migraciones a producción ni a bases compartidas. El propietario autorizó después un respaldo privado completo de archivos locales; su ubicación y tratamiento están en `04_RESPALDO_REAL_Y_RESTAURACION.md`. Mantener ese respaldo separado de este ZIP documental y revisar sus rutas y secretos en el equipo nuevo.

## 5. Preparar y revisar la DEMO

En la raíz del repositorio restaurado, Claude debe leer las instrucciones reales, instalar dependencias y preparar PostgreSQL y las bases aisladas. Verificar los comandos existentes antes de ejecutar los antiguos.

Cuando el entorno esté listo, el inicio reportado para Windows es:

```powershell
pnpm.cmd demo:phase4
```

En otra ventana de PowerShell, en esa misma raíz:

```powershell
(Get-Content -Raw '.\.local\rc1-smoke\demo-session.json' | ConvertFrom-Json).token | Set-Clipboard
```

Abrir http://127.0.0.1:3001 y pegar el token. No enviarlo al chat. La guía del candidato es `docs/15-handoff/PHASE4_DEMO_ACCEPTANCE.md`. Usar el procedimiento de parada que allí conste y comprobar que los servicios queden detenidos al terminar.

## 6. Estado de comprobación de las utilidades

Las utilidades se validan en este paquete con un repositorio temporal y una restauración local; consultar 05_Verificacion/VERIFICACION_DEL_PAQUETE.md. Eso comprueba el mecanismo de transporte, no el repositorio de Brandopolis ni la instalación en Windows. No se tuvo acceso a la PC original.
