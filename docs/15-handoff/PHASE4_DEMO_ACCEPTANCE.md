Status: derived
Owner: Product / Engineering
Canonical: no
Last reviewed: 2026-10-12
Related: docs/15-handoff/PHASE4_SPEC.md, docs/15-handoff/PHASE4_ACCEPTANCE_MATRIX.md, docs/15-handoff/PHASE4_EXTERNAL_REQUIREMENTS.md, docs/14-decisions/ADR-0031.md, docs/14-decisions/ADR-0032.md, docs/14-decisions/ADR-0036.md, SESSION_STATE.md
Depends on: candidato local c660124 (resultados exactos en SESSION_STATE)

# Fase 4 · DEMO integral para la aceptación del propietario (iteración del 2026-10-12)

Esta guía prepara la **revisión local** de la iteración que incorpora tu revisión del 2026-10-12 (PHASE4_SPEC §13,
criterios R12-01…R12-24 de la matriz). Los tres estados se mantienen separados y no se deducen unos de otros:

| Estado | Situación a la fecha de esta guía |
|---|---|
| Implementación local | Completa en el alcance local acordado, con simuladores para Google Ads, Meta Ads, Canva y correo |
| Aceptación de la DEMO por el propietario | **Pendiente**: requiere tu revisión de este recorrido |
| Verificación real y preparación para producción | **Pendiente**: requiere accesos y decisiones (abajo). El candidato es **not release-ready** |

Aceptar esta DEMO no equivale a cerrar la Fase 4 ni autoriza campañas reales, gasto, correo real, dominios ni
despliegues.

## Iniciar, entrar y detener en Windows

Requisitos: Node 24, pnpm 12.4.2, el repositorio en la rama `feat/phase4-marketing-web-collaboration` en el commit
del candidato, y los puertos 3001, 3101, 3201 (en 127.0.0.2) y 55434 libres.

1. **Iniciar todo.** En PowerShell, desde la carpeta del repositorio:

   ```powershell
   pnpm.cmd demo:phase4
   ```

   Arranca, como procesos hijos y en este orden: la aplicación aislada (3001, con su PostgreSQL 55434; aplica las
   migraciones pendientes, incluida la 0033, sin borrar datos), el sitio público (3101), la vista previa autenticada
   (127.0.0.2:3201) y el worker supervisado con los simuladores (también envía el correo simulado). Cuando todo
   responde, imprime las direcciones. En PowerShell se usa `pnpm.cmd` porque la directiva de ejecución puede
   bloquear el script `pnpm.ps1`.
2. **Entrar.** Abre `http://127.0.0.1:3001` y pega el valor del campo `token` del archivo
   `.local\rc1-smoke\demo-session.json`. Es privado: no lo compartas.
3. **Detener.** `Ctrl+C` en esa terminal detiene los cuatro procesos y conserva los datos. Desde la sesión del agente
   no se pudo probar `Ctrl+C` (no tiene consola interactiva). La parada siguiente sí se comprobó en esta iteración,
   seguida de la comprobación de puertos:

   ```powershell
   Get-CimInstance Win32_Process -Filter "Name='node.exe'" | ? { $_.CommandLine -match 'phase4-demo.ts|competition-start.ts|sites-server.ts|external-worker.ts|local-db.ts' } | % { Stop-Process -Id $_.ProcessId -Force }
   foreach ($p in 3001,3101,3201,55434) { if (Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue) { "Sigue escuchando: $p" } else { "Libre: $p" } }
   ```

   El PostgreSQL aislado termina con su proceso y los datos se conservan. Sólo se detienen procesos de esta DEMO
   (no cierra otras aplicaciones de Node).

Alternativa en cuatro terminales: `pnpm.cmd competition:start --isolated`, `pnpm.cmd sites:public --isolated`,
`pnpm.cmd sites:preview --isolated` y `pnpm.cmd external:worker --isolated`. Cada una se detiene con `Ctrl+C`.

Capturas de las pantallas nuevas y comparación con las referencias canónicas (locales, no canónicas):
`.local/acceptance/review-2026-10-12/index.html`. Referencias canónicas que necesitan tu revisión por los cambios
aprobados (no se actualizó ninguna): `blueprint` (escritorio y móvil), `decision-card` (escritorio), `history`
(escritorio y móvil), `m1-guided-review` (escritorio y móvil), `m1-needs-review` (escritorio y móvil) y `m1-workspace`
(escritorio y móvil). Las 6 públicas (`login`, `public-gateway`, `request-access`) no cambian.

## Recorrido de revisión de esta iteración (unos 30 minutos)

Lo simulado está rotulado en la pantalla («Simulador», «simulado», «modo DEMO»). Cada paso indica el criterio de la
matriz que permite revisar.

1. **Aspecto general (R12-01, R12-03, R12-04, R12-19, R12-20).** El área central es más clara que los laterales y se
   ve contenida. El menú sigue el orden Inicio, Estrategia, Marca y recursos, Productos y servicios, Marketing,
   Clientes, Colaboración y Resultados, también en móvil. Estrategia muestra el mismo indicador de sección actual que
   las demás, también al recargar. Las pestañas de Marketing llevan icono y texto. Casillas y radios quedan junto a
   su texto en todos los formularios.
2. **Productos y servicios › Nueva oferta (R12-06, R12-07, R12-09).**
   - Antes del formulario aparecen «Construir con Brando», «Completar manualmente» y, si ya hay una oferta aprobada,
     «Partir de una oferta aprobada».
   - Con Brando, la propuesta de ejemplo sólo usa decisiones aprobadas. No propone precios, condiciones ni evidencias.
     «Completar sólo lo vacío» respeta lo que ya escribiste; «Reemplazar lo que escribí» lo sustituye.
   - Añade dos planes de precio (por ejemplo, mensual por persona y anual) y sus vigencias. La vigencia no es la
     periodicidad.
   - En una oferta aprobada, «Crear a partir de esta oferta» abre un borrador independiente que dice de dónde viene.
3. **Enviar a revisión (R12-08).**
   - «Enviar a revisión» pregunta quién revisa. Hasta elegir, el botón no envía.
   - En esta DEMO hay una sola persona, así que la opción es «Yo: aprobación individual», que queda registrada como
     tal; no simula una segunda persona.
   - Después ves «Pendiente de revisión», quién revisa y el formulario de decisión. Pedir cambios exige un comentario.
   - **Configuración de marca › Circuito de aprobación:** el responsable por defecto, si se permite la aprobación
     individual y el paso del cliente, por tipo. El cliente no aprueba ofertas.
4. **Materiales de venta (R12-05, R12-10, R12-11, R12-22).**
   - Al crear un material, las decisiones aprobadas vienen marcadas, con contador y con «Seleccionar todas» y
     «Quitar selección». Desmarca una, guarda y vuelve a editar: tu elección se conserva.
   - «Comentarios de esta versión» puede ser interno o compartido con el cliente.
   - Con un material aprobado, «Subir el arte final» crea una versión nueva que hay que revisar; la aprobada no
     cambia.
   - En un brief, las referencias quedan como internas: no se comparten con el cliente ni van a Canva.
5. **Marca y recursos › Plantillas (R12-12).** Sube una plantilla (PowerPoint, Word, Excel, PDF o imagen) en una
   categoría, sube una versión nueva, descárgala y retírala. Un archivo que no es lo que dice su nombre se rechaza.
6. **Marketing › Redes sociales (R12-13).** En una publicación, elige otras redes (no viene ninguna marcada). Cada
   variante parte del texto base y se valida en vivo contra la red: por ejemplo, el límite de X. Elegir redes no
   autoriza publicar.
7. **Marketing › Campañas digitales (R12-14, R12-15, ADR-0036).**
   - En «Tipo de campaña» elige **Google Ads · Performance Max**: títulos, títulos largos, descripciones, nombre de la
     empresa e imágenes horizontal, cuadrada y logotipo del kit, con los límites de Google.
   - Elige **Meta Ads · Mensajes**: WhatsApp o Messenger en lugar de un destino web, un mensaje de bienvenida y
     preguntas de inicio (sólo Messenger).
   - Ambos tipos siguen el recorrido de siempre en el simulador: propuesta, aprobación, creación en pausa, segunda
     autorización para activar, consulta y pausa.
8. **Colaboración (R12-02, R12-16, R12-22).**
   - Invita marcando «Enviar también la invitación por correo»: el estado pasa de «Correo en cola» a «Correo
     enviado · simulado». El mensaje se guarda en `.local\rc1-smoke\external\mail` (perfil aislado) y no sale a ningún buzón.
   - Una dirección `@fallo-temporal.example` muestra los reintentos y el error, con «Reintentar el envío»; una
     `@rechazado.example` falla en el acto.
   - «¿Qué quieres compartir?» permite elegir varios elementos, sin ninguno marcado, y muestra un resumen de lo que
     verá el cliente.
   - Con el enlace, en otro navegador, el cliente ve los comentarios compartidos del equipo, nunca los internos, y
     puede descargar el arte final de lo compartido.
9. **Notificaciones (R12-21).** El icono de bandeja del panel derecho tiene contador. Cuando el cliente comenta o
   decide, aparece una notificación, también en «Para ti» de Inicio. Al abrirla se vuelve a comprobar el acceso y te
   lleva a su marca y pantalla. Marcarla como leída no aprueba nada.
10. **Resultados (R12-17).** Elige un periodo (por ejemplo, «Últimos 7 días») y la comparación con el periodo anterior
    o con el mismo periodo del año previo. Se muestran ambos rangos y la zona horaria. Las cifras de actividad cambian
    con el periodo; las de «Estado actual» no dependen de él. Sin base no hay porcentaje, y «Sin conectar» no es cero.
11. **Formulario web (R12-18).** En el formulario de desarrollo (`/formulario`) y en el del sitio publicado, cada
    casilla queda junto a su texto y los dos consentimientos son independientes.

El recorrido del bloque 8 sigue disponible: Canva, sitio web, campañas de búsqueda, tráfico y captación, Clientes,
revisión del ciclo y Validación (ver la versión anterior de esta guía en el historial del repositorio).

## Limitaciones visibles

- Google Ads, Meta Ads, Canva y el **correo** son **simuladores**: ninguna cuenta real, ninguna campaña real, ningún
  gasto, ningún correo enviado a nadie. Las cifras de una campaña «activa» son sintéticas y se rotulan como tales.
- El número de WhatsApp vinculado a la página es simulado. Instagram Direct y el destino múltiple de Meta quedan
  pendientes de verificar con la versión de API que se fije.
- Performance Max no tiene acceso a los objetivos de conversión de una cuenta real; la pantalla lo indica.
- Brando funciona en modo determinista de DEMO (no hay IA real).
- Con una sola persona en la DEMO, el circuito sólo puede mostrar la aprobación individual. Las pruebas automáticas
  cubren el caso de dos personas: responsable distinto, reasignación y notificaciones.
- El sitio se publica en el servidor de desarrollo, con direcciones `*.localhost` y sin HTTPS.
- Lo que sigue pendiente se lista en la matriz (criterios R12 y «Estado final por criterio»).

## Decisiones necesarias del propietario y qué bloquea cada una

| Decisión | Bloquea |
|---|---|
| Aceptar o pedir cambios sobre esta DEMO | el cierre local de la Fase 4 |
| **Proveedor de correo, dominio remitente verificado (SPF/DKIM) y una bandeja de prueba autorizada** (EXT-REQ-08) | la aceptación del correo por un proveedor real y su entrega verificable (niveles 2 y 3 de evidencia) |
| Registrar las integraciones de Google Ads (incluido Performance Max), Meta (incluidos mensajes y el número de WhatsApp) y Canva | implementar y verificar los adaptadores reales |
| Entorno de ensayo con HTTPS para callbacks OAuth (EXT-REQ-09) | OAuth real de las tres integraciones |
| Dominio de publicación de sitios y alojamiento con certificados (EXT-REQ-07, EXT-REQ-14) | publicación real, HTTPS y DNS de dominios propios |
| Política y textos de consentimiento y privacidad definitivos (EXT-REQ-13) | medición real y el formulario fuera de DEMO |
| Clave de IA introducida por el propietario (EXT-REQ-10) | Brando con IA real |
| Aplicaciones de destino para verificar exportaciones (EXT-REQ-12) | cerrar EXP-001 |
| Adoptar o no ADR-0035; Atomic y Chatwoot siguen sin adoptar | el núcleo comercial de la Fase 5 |

## Informe de riesgos

| Riesgo | Situación y mitigación |
|---|---|
| Compatibilidad real con Google, Meta, Canva y el proveedor de correo | Los simuladores sólo prueban la lógica local. Los adaptadores reales **no están implementados** |
| Contratos de Performance Max y mensajes | Contrastados con la documentación oficial vigente (2026-10-12); se verificarán contra la versión de API fijada al implementar |
| Correo interrumpido tras ser aceptado por el proveedor | La reanudación usa el identificador del mensaje como clave de idempotencia; requiere un proveedor que la respete (a verificar al elegirlo) |
| Circuito de aprobación con una sola persona | La aprobación individual está permitida por defecto, es explícita y queda auditada; un administrador puede exigir una segunda persona por tipo |
| Archivos subidos | Formato decidido por su estructura; documentos con macros rechazados; descargas siempre como adjunto con la extensión del formato detectado |
| Datos de la DEMO | Bases aisladas locales; las migraciones 0028–0033 no se aplicaron fuera de ellas |
| Producción | Congelada (CLAUDE.md); este candidato no se ha desplegado ni debe desplegarse sin autorización explícita |
| Incidencia en observación | El 503 de `phase3.spec.ts:58`, sin causa confirmada |

## Siguiente paso para la verificación real

1. Tu aceptación (o cambios) sobre esta DEMO.
2. Elegir el proveedor de correo, verificar el dominio remitente y autorizar una bandeja de prueba.
3. Registrar las integraciones y autorizar un entorno de ensayo con HTTPS.
4. Implementar los adaptadores reales detrás de los contratos existentes, con OAuth y cifrado de credenciales.
5. Verificar cada operación con cuentas de prueba y sin gasto. Sólo después, con autorización concreta por operación,
   activar.
