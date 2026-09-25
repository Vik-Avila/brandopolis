Status: derived
Owner: Engineering
Canonical: no
Last reviewed: 2026-09-24
Related: docs/15-handoff/competition-mvp-rc1.md
Depends on: Competition MVP RC1

# Competition MVP RC1 · guía de demostración local

## Preparación y apertura

Desde la raíz del checkout: Node 24.x, pnpm 12.4.2; Chrome para las pruebas. Python 3.10+ sólo para Foundation. La instalación inicial requiere acceso al registro de dependencias; la demo preparada usa fixtures sin proveedor IA ni red externa.

```sh
pnpm install --frozen-lockfile
pnpm competition:start
```

No requiere variables secretas: DATABASE_URL debe estar ausente o vacía y NODE_ENV ausente o development, también en `.env`. Competition tooling rechaza producción y DB externa. PostgreSQL 17 local se prepara automáticamente, aplica 0000–0007, conserva o renueva la sesión DEMO, crea una demo si falta e inicia HTTP. No borra datos. Mantener la terminal abierta.

Salida esperada: «DEMO lista: http://127.0.0.1:3000/?brand=…» y ruta del archivo privado. Abrir esa URL y copiar sólo el campo token de `.local/demo-session.json` en «Token de sesión local». No proyectar, publicar ni compartir ese archivo. La URL no contiene credenciales. Cada perfil tiene su propia sesión.

En otra terminal:

```sh
pnpm competition:check
```

Esperado: PASS runtime/assets, PostgreSQL con el número de migraciones del journal (hoy 8: 0000–0007), sesión y servidor listo. GET [health local](http://127.0.0.1:3000/health) devuelve 200 y `{"application":"brandopolis-competition","protocol":"rc1","status":"ready"}`. No es una prueba funcional completa. Si aparece INFO servidor sin respuesta, sólo pasaron prerrequisitos; no iniciar presentación hasta comprobar HTTP.

Alternativa de desarrollo existente: `pnpm db:start` en una terminal; `pnpm db:migrate`, `pnpm db:seed` y `pnpm dev` en otra. El seed crea otra identidad: para una presentación repetible preferir competition:start, que conserva la identidad autorizada.

## Historia y ruta rápida · estimación de 3 minutos

Tiempo orientativo, no ensayo humano cronometrado. La marca precargada contiene cuatro decisiones, siete versiones y un aprendizaje ficticio aceptado. El generador simula actos humanos explícitos; no representa clientes reales.

1. «Tu estrategia hoy»: explicar que prioriza trabajo pendiente, sin métricas ficticias.
2. Abrir Cliente principal, Modelo de valor, Posicionamiento y Mensaje principal. Mostrar decisión, criterio e historial: las cuatro están conectadas.
3. En Cliente principal, «Preparar nueva versión»; proponer «Agencias especializadas» y escribir un criterio. «Aprobar decisión». **Autoridad humana:** una propuesta no cambia estrategia hasta esta aprobación.
4. Abrir Posicionamiento, «Ver impacto» y mostrar texto anterior conservado. «Iniciar revisión humana», escribir una formulación coherente con el nuevo cliente y «Confirmar revisión». **Change Impact:** el sistema pide revisión; no reescribe las decisiones dependientes. Mensaje puede seguir pendiente: mostrarlo, no ocultarlo.
5. Abrir «Blueprint estratégico»: proyección de decisiones y revisiones vigentes. Frase de cierre: «La persona decide; Brandopolis conserva el porqué y muestra qué revisar».

## Ruta completa · estimación de 5–7 minutos

Añadir a la ruta rápida; para respetar el tiempo usar registros precargados y ejecutar sólo los pasos clave en vivo. Un recorrido íntegro desde una marca vacía tomará más tiempo.

1. Mostrar «Nueva marca» y la pregunta opcional «¿Qué estás construyendo?». Puede crearse una marca aparte para demostrar intake; regresar a la marca precargada con «Marca activa».
2. «Contexto estratégico»: aportaciones, hipótesis, evidencia y aprendizaje están separados. Las hipótesis son supuestos.
3. En una decisión, «Comparar opciones DEMO». Mostrar etiqueta de fixture; usar/modificar exige criterio y aprobación, rechazar exige motivo y no crea versión. Si se aprueba un cambio, atender su revisión antes de continuar.
4. «Experimentos y aprendizajes»: enseñar objetivo, criterio de éxito y señal del experimento preparado. Para demostrar el ciclo en vivo: seleccionar decisión/hipótesis, completar objetivo/criterio/señal esperada, crear e iniciar experimento; abrir «Registrar una señal», registrar observación ficticia, fuente DEMO y fecha no futura.
5. «Proponer un aprendizaje»: elegir señal, interpretación y límites; crear candidato → «Confirmar revisión» → «Aceptar aprendizaje». **Learning Loop:** la señal no se convierte sola en aprendizaje y aceptar no cambia una Decision.
6. Volver a Contexto y Blueprint para mostrar aprendizaje aceptado. «Mi práctica estratégica» muestra conductas personales, sin score ni certificación.

Con poco tiempo omitir creación de marca, experimento y señal; mostrar los existentes. Nunca presentar las fixtures como IA en vivo, adopción, validación o resultado comercial.

## Recuperación, nueva demo y cierre

| Situación | Acción segura |
|---|---|
| Browser cerrado o URL perdida | Reabrir la URL de `.local/competition-demo.json`; volver a entrar si hace falta. Datos aprobados permanecen en PostgreSQL. |
| Sesión vencida | Ejecutar competition:start otra vez; copiar la sesión local vigente. Renueva identidad DEMO autorizada sin elevar permisos. |
| Mensaje de permiso o perfil inválido | No editar memberships ni borrar archivos; revisar perfil. Para una demo separada usar --isolated. |
| DB/servidor sin respuesta | Comprobar terminal y competition:check; volver a arrancar. /health 503 indica indisponibilidad o incompatibilidad, no error estratégico. |
| Puerto ocupado | Cerrar únicamente la instancia propia conocida o usar --isolated. El script no mata procesos ajenos. |
| Falta asset o runtime incorrecto | Recuperar checkout completo/versión indicada; es fallo de entorno. No modificar dominio para resolverlo. |
| Conflicto o recomendación obsoleta | Revisar versión actual, regenerar propuesta si corresponde; no forzar escritura. Es una protección esperada. |
| Confirmación perdida al guardar | Conservar borrador; revisar historial/estado antes de repetir. El commit de Decision conserva idempotencia; otras creaciones no prometen replay idempotente. |
| Error reproducible con health listo y sesión vigente | Registrar ruta, paso y mensaje sin secretos; puede ser fallo de producto. Usar una nueva DEMO para diagnóstico sin borrar la anterior. |

`pnpm demo:competition` con DB activa crea otra marca DEMO identificada por fecha y sufijo. Actualiza el enlace de `.local/competition-demo.json`; no elimina marcas anteriores. `competition:start` reutiliza la última marca accesible. No existe comando de cleanup destructivo.

Ctrl+C en la terminal que inició competition:start cierra su servidor y su PostgreSQL. Si la DB ya estaba iniciada por db:start, detenerla en su propia terminal. Esperar el regreso al prompt; cerrar la ventana a la fuerza no equivale a un apagado limpio.

## Perfil aislado y verificación completa

```sh
pnpm competition:start --isolated
```

Usa `.local/rc1-smoke/`, PostgreSQL 55434 y HTTP 3001. En otra terminal: `pnpm competition:check --isolated` y `pnpm competition:test-boot`. El smoke abre Chrome móvil, entra, revisa Blueprint y recarga. `pnpm demo:competition --isolated` crea otra demo en ese perfil. No toca la DB normal de 55432; tests de motor usan 55433. La primera ejecución aislada prepara una DB vacía; las siguientes verifican persistencia.

Validación completa (DB normal y sesión preparadas; suites de motor en secuencia):

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm db:migrate
pnpm demo
pnpm demo:competition
pnpm audit --prod
.venv\Scripts\python.exe scripts\foundation_check.py
.venv\Scripts\python.exe design\brandopolis-ui\validation\validate.py --root . --integrated
git diff --check
```

Crear `.venv` con `python -m venv .venv` e instalar sólo `requirements-foundation.txt` si falta. En macOS/Linux usar `.venv/bin/python`. `test:integration` repite la misma suite que test: no sumar sus conteos como cobertura distinta. E2E usa los cinco viewports existentes.

## Respaldo local

DB normal: `.local/postgres/data`; configuración privada: `.local/postgres/connection.json`; sesión y enlace: `.local/demo-session.json` y `.local/competition-demo.json`. Perfil aislado: los mismos elementos bajo `.local/rc1-smoke`. Son datos DEMO, no producción ni piloto.

Para un respaldo físico coherente, apagar limpiamente PostgreSQL, confirmar que su puerto ya no escucha y copiar el directorio completo del perfil, incluidos data y connection.json, a almacenamiento privado junto con el SHA del checkout. No copiar data con PostgreSQL activo; no versionar contraseñas ni sesiones. Windows requiere permisos de carpeta privados: mode 0600 no sustituye ACL. No se automatizó restauración ni se ensayó recuperación desde backup; conservar el original y validar cualquier restore futuro en una copia aislada con la misma versión de PostgreSQL.
