## 2026-10-12 · PHASE 4 · revisión de la DEMO del propietario implementada en local (sin aceptación)

- **Candidato:** `c660124`. Commits de la iteración, en local y sin push: `0776a8c` (especificación, matriz y ADR-0036 antes de implementar), `6951684` (parte 1: controles, área central, menú, circuito de aprobación, comentarios, notificaciones, planes de precio, migración 0033), `c349d76` (parte 2: archivos, correo simulado, compartir varios, variantes por red, Performance Max y mensajes, periodos), `df13e86` (parte 3: interfaz y 18 pruebas unitarias nuevas), `6969b29` (pruebas de navegador y ajustes de interfaz), `c660124` (panel de herramientas bajo la cabecera en pantallas estrechas) y el commit de documentación de este cierre. El candidato anterior era
  `0c356ca` (código) con `5a76d0f` (documentación). Aquel informe anunció «cinco commits» y enumeró cuatro sobre
  `d955645`; eran cuatro.
- **Alcance:** los 24 criterios R12 de PHASE4_SPEC §13, en la matriz v25:
  - circuito de aprobación con responsable, comentarios por versión y notificaciones;
  - correo con proveedor simulado;
  - planes de precio y crear a partir de una oferta;
  - Brando como primer paso y decisiones de origen preseleccionadas;
  - arte final, referencias y plantillas;
  - variantes por red y compartir varios elementos;
  - periodos en Resultados;
  - controles alineados, área central, orden del menú, iconos, indicador de Estrategia y textos conciliados.
- **Ampliaciones expresas (ADR-0036):** Performance Max y campañas de mensajes en Meta, sólo con simuladores.
- **Migración aditiva 0033:** aplicada sólo en las bases aisladas (55434 y 55432).
- **Seguridad:** dos avisos de la revisión automática en segundo plano, corregidos con pruebas:
  - la prohibición de aprobación individual también cubre a quien creó el borrador;
  - las descargas se nombran por el formato detectado y se rechazan los documentos de Office con macros.
- **Defecto previo corregido:** el panel de herramientas en pantallas estrechas quedaba bajo la cabecera.
- **Resultados:** `pnpm test` 544 PASS (18 nuevas) sobre `c660124`; typecheck y lint sin errores; Foundation 0 errores; validador de UI PASS; `pnpm test:pilot:e2e` 10/10. Regresión completa de navegador sobre `6969b29` con `pnpm demo:phase4` (20 archivos en tres tramos, inventario sin duplicados ni reintentos): 330 ejecuciones, 316 PASS, 13 SKIP por diseño según el ancho y 1 FAIL (`micro-hotfix.spec.ts:166` en móvil: el ajuste de capas del panel tapaba la cabecera). `c660124` lo corrige y cambia sólo esa regla (≤1000 px); sobre él se repitieron `micro-hotfix`, `workspace` y `phase4-review` en compact, tablet y móvil: 50 PASS, 7 SKIP, 0 FAIL. `test:visual` 10 PASS · 1 SKIP. Comparación al píxel de las 17 canónicas: 6 pantallas públicas sin diferencias; 11 del espacio de trabajo difieren por los cambios aprobados (área central contenida, orden del menú, icono de notificaciones y «Para ti» en Inicio). No se actualizó ninguna referencia. El 503 de `phase3.spec.ts:58` no apareció
- **Estados:** implementado y probado en local; ningún criterio probado con proveedor.
- **Pendiente de acceso:** proveedor de correo, dominio remitente y bandeja autorizada; cuentas de Google, Meta y
  Canva; HTTPS y dominio.
- **Pendiente de decisión:** aceptación de esta DEMO y ADR-0035 (sigue propuesto; Atomic y Chatwoot no adoptados).
- **Pendientes anteriores:** se conservan.
- **En observación:** el 503 de `phase3.spec.ts:58`.
- **Release:** **not release-ready**; producción congelada.

## 2026-10-11 · PHASE 4 · bloque 8 completado en local con simuladores y bloque 9 (revisión integral)

**Punto de partida:** HEAD `d955645`, árbol limpio. **Commits locales (sin push ni despliegue):** `6e3da74` (bloque 8 completado en local, migración aditiva 0032), `16cc068` (correcciones de la revisión de seguridad independiente y lanzador de la DEMO), `0c356ca` (cabecera de las tarjetas de campaña, hallada en la revisión de las pantallas nuevas) y el commit de documentación. Las
migraciones 0028 a 0032 sólo se aplicaron en las bases aisladas (55434 y 55432).

**Alcance:** PHASE4_SPEC §4.6 y ADR-0031 incluyen activar con una segunda autorización y pausar. La limitación
anterior a «sólo en pausa» venía de una instrucción del propietario en el bloque previo, sin cambio de alcance. Se
completó **sólo con simuladores**, sin campañas reales ni gasto.

**Qué se completó:**
- Google y Meta: crear en pausa, segunda autorización, activar, consultar y pausar (simulados).
- Captación con medición verificada simulada, comprobada antes del envío.
- EXT-008 y EXT-017 (cancelar y revocar durante el intento, respuesta tardía, sin acceso no se infiere nada).
- EXT-014 con prueba propia; EXT-003 cubierto por la prueba existente.
- Canva: vincular un diseño existente; aislamiento y acceso retirado.
- RES-002 con datos sintéticos.
- Revisión del ciclo → Validación (propuesta revisable, acción humana, una vez).
- Recorrido integrado ACC-01.
- Lanzador de la DEMO: `pnpm demo:phase4`.

**Incidencia de Clientes:** cerrada (causa, prueba antes y después, resultado original y regresiones posteriores en la
matriz v23).

**Revisión de seguridad:** revisión independiente de solo lectura del comportamiento de `b9d1bd2` al árbol de trabajo. No hubo hallazgos altos ni medios; cuatro bajos y uno plausible, todos corregidos con pruebas en `16cc068`: nombre de la oferta resuelto en el servidor (F1); destino sin dirección bloqueado (F2); la pausa no depende del estado editorial (F3); Canva actúa con la credencial propia de la persona (F4); un solo experimento por propuesta aunque dos personas actúen a la vez (P1). Se comprobaron sin hallazgos: referencias a versiones aprobadas, conexiones personales y por marca, operaciones directas por API, permisos retirados, aislamiento de invitados, cola, cancelación, revocación y resultados tardíos

**Resultados sobre el candidato `0c356ca`:** `pnpm test` 526 PASS sobre `16cc068`, con typecheck y lint en 0 errores, Foundation en 0 errores y el validador de UI en PASS. Regresión completa de navegador sobre `16cc068`, con los cuatro servicios levantados por `pnpm demo:phase4` (19 archivos en tres tramos A: 6, B: 10 y C: 3, inventario sin duplicados ni reintentos): 320 ejecuciones (64 pruebas × 5 proyectos), 307 PASS, 13 SKIP por diseño según el ancho y 0 FAIL; el 503 de `phase3.spec.ts:58` no apareció. `0c356ca` sólo cambia CSS acotado a `.campaign-card`; sobre él se repitieron las tres pruebas afectadas (`phase4-campaigns`, `phase4-campaigns-meta` y `phase4-launch`) en los cinco proyectos, todas PASS. `pnpm test:pilot:e2e` dio 10/10 sobre `16cc068`. `test:visual` dio 10 PASS · 1 SKIP, y las 17 canónicas, comparadas al píxel sobre `16cc068` y de nuevo sobre `0c356ca`, tienen 0 % de diferencia; no se cambió ninguna referencia

**Tres estados:**
- Implementación local: completa en su alcance.
- Aceptación de la DEMO por el propietario: pendiente ([PHASE4_DEMO_ACCEPTANCE](docs/15-handoff/PHASE4_DEMO_ACCEPTANCE.md)).
- Verificación real: pendiente. Los adaptadores reales de Google, Meta y Canva no existen todavía (código pendiente,
  no sólo credenciales).

**Pendientes, separados:**
- **Código pendiente:** adaptadores reales y OAuth, recorrido `BrandClosure` (DEL-002/004/005), versión del kit en el
  manifiesto del anuncio (IDN-004), OTF/WOFF2, PDF y búsqueda en el portal, Biblioteca y Plantillas, cambio de
  workspace, correo.
- **Pendiente de acceso o evidencia real:** cuentas de prueba, medición real, HTTPS y DNS, OIDC de invitado.
- **Pendiente de decisión:** aceptación de la DEMO, registro de integraciones, entorno de ensayo, dominio, privacidad
  y consentimiento, correo, clave de IA, aplicaciones de destino de exportación, gasto real.

ADR-0035 sigue propuesto; Atomic y Chatwoot no están adoptados. El 503 de `phase3.spec.ts:58` sigue en observación.
**Not release-ready**; la Fase 4 no está cerrada.

## 2026-10-11 · PHASE 4 · incidencia de Clientes corregida y bloque 8 local con simuladores

**Punto de partida:** HEAD `b9d1bd2` (después de `28bb7d0`), árbol limpio. **Commits locales (sin push ni
despliegue):**
- `5356f57`: corrección de la navegación y ampliación de la prueba de idempotencia.
- `9e373b4`: bloque 8, con la migración aditiva 0031.
- `4c692df`: corrección de autorización hallada por la revisión automática de seguridad.
- El commit de documentación de este cierre.

Las migraciones 0028 a 0031 sólo se aplicaron en las bases aisladas de desarrollo (55434) y pruebas (55432).

**Sitios:** alcance local implementado y validado en DEMO. Tenía una incidencia abierta en la regresión general, ya
diagnosticada y corregida (abajo).

**Incidencia de Clientes:**
- Resultado original conservado: 300 ejecuciones, 286 PASS, 13 SKIP y 1 FAIL (`phase4-clients.spec.ts:16`,
  compact).
- Aparte, tres repeticiones aisladas PASS.
- Diagnóstico: defecto del producto. Un clic durante la carga inicial se perdía sin aviso, y una respuesta tardía
  volvía a dibujar la vista inicial.
- Corregido en `5356f57`, con una prueba que reproduce las dos ventanas: fallaba antes, pasa después.

**Idempotencia del formulario:** cobertura completa en `tests/site-cases.ts` (tabla en la matriz v22), PASS.

**Bloque 8 (alcance local con simuladores):**
- Campañas de Google (Búsqueda) y Meta (tráfico) con versiones, revisión y aprobación.
- Pantalla de confirmación exacta y autorización con reserva (`AUTHORIZE_SPEND`).
- Creación **sólo en pausa** mediante la cola existente y un worker supervisado.
- Escenarios: respuesta perdida, visibilidad con retraso, límite del proveedor, acceso insuficiente y acceso vencido.
- Conciliación sin reenvío y `CONTENT_CHANGED` activo.
- Canva simulado: el diseño recuperado crea una versión nueva.
- Resultados por fuente, sin ROAS.
- Revisión del ciclo con decisión humana.
- Todo es sólo DEMO; nada llega a Google, Meta ni Canva.

**Resultados:**
- `pnpm test`: 517 PASS. Typecheck y lint, 0 errores. Foundation, 0 errores. Validador de UI: PASS.
- `phase4-campaigns`: PASS en los cinco proyectos sobre `9e373b4` y de nuevo sobre `4c692df`.
- Regresión completa sobre `9e373b4`: 310 ejecuciones (62 pruebas × 5 proyectos): 297 PASS, 13 SKIP por diseño según el ancho, 0 FAIL.
- Corrección `4c692df`: `pnpm test` 517 PASS (con las nuevas aserciones de autorización), `phase4-campaigns` PASS en los cinco proyectos y `pnpm test:pilot:e2e` 10/10, todo sobre `4c692df`. El cambio sólo afecta a `campaigns.ts`; la regresión completa se ejecutó sobre `9e373b4`.
- `test:visual` y comparación al píxel: `test:visual` 10 PASS · 1 SKIP (sólo estructura); las 17 canónicas, comparadas al píxel (umbral: suma RGB > 48 de 765) con las capturas generadas sobre `4c692df`: 0 % de diferencia en las 17. No se cambió ninguna referencia
- `pnpm test:pilot:e2e`: 10/10 sobre `4c692df`.

**Estado por tipo (matriz v22):**
- **Implementado y validado en DEMO:** CNV-001/002 con simulador; creación en pausa en Google con simulador;
  EXT-006, 010, 011, 012; RES-001 y RES-003; ACC-06.
- **Implementado, validado en unitarias:** Meta (tráfico).
- **Parcial:** EXT-008, EXT-017, revisión del ciclo sin enlace con Validación, ACC-01.
- **Incidencia abierta:** el 503 de `phase3.spec.ts:58`, en observación.
- **Pendiente de decisión:** activación y gasto, medición verificada para captación, correo.
- **Pendiente de proveedor o evidencia real:** cuentas y API de Google, Meta y Canva, métricas y rechazos reales.

**Sin cambios:** producción, DNS, proveedores reales, correo, IA real. ADR-0035 sigue propuesto; Atomic y Chatwoot no
están adoptados. **Not release-ready**; la Fase 4 no está cerrada.

## 2026-10-11 · PHASE 4 · sitios en DEMO completos en su alcance local (bloque 7, cierre)

**Punto de partida:** rama `feat/phase4-marketing-web-collaboration`, HEAD `ab95faa` (después de `8d00287`,
`562e32a` y `897e61a`), árbol limpio. **Commits locales (sin push ni despliegue):** `28bb7d0` (implementación y
migración aditiva 0030) y el commit de documentación de este cierre. Las migraciones 0028, 0029 y 0030 se aplicaron
sólo en las bases aisladas de desarrollo (55434) y pruebas (55432).

**Qué cambió:**
- **Formulario:** los duplicados se detienen en el servidor. Un identificador de página reutilizado con otro
  contenido se guarda como oportunidad propia, sin mezclarse ni bloquearse.
- **DOM-004:** nueva verificación diaria de dominios propios. Una consulta fallida nunca confirma ni transfiere; la
  pérdida se confirma dos veces; «Comprobación pendiente» no se sirve, pero conserva la reserva. Las verificaciones
  concurrentes se serializan; corregido un posible interbloqueo entre dos verificaciones simultáneas (hallado al
  diseñar la prueba).
- **SITE-004:** testimonios y cifras con fuente; los ejemplos DEMO se marcan.
- **Vista previa:** vista por tamaño (escritorio y móvil).
- **ZIP:** exportación de una versión aprobada, con `LEEME.txt` y manifiesto.

**Resultados en `28bb7d0`:**
- `pnpm test`: 508 PASS. Typecheck y lint, 0 errores. Foundation, 0 errores. Validador de UI: PASS.
- Recorrido `phase4-sites`: PASS en los cinco proyectos.
- Regresión completa de navegador (16 archivos, 5 proyectos, en tramos secuenciales con un worker): 300 ejecuciones (60 pruebas × 5 proyectos): 286 PASS, 13 omitidas por diseño según el ancho (pruebas sólo de escritorio o sólo de móvil) y 1 fallo: `phase4-clients.spec.ts:16` en compact (tras recargar, el clic en Clientes mostró «Objetivo estratégico»; posible carrera con la carga inicial, causa no confirmada). Esa prueba pasó 3 de 3 al repetirla aislada como diagnóstico, sin sustituir el resultado. La traza está conservada y la prueba queda en observación, no corregida. El 503 de `phase3.spec.ts:58` no apareció (PASS en los cinco proyectos) y sigue en observación.
- `test:visual` y comparación al píxel: `test:visual` 10 PASS · 1 SKIP (sólo estructura); comparación al píxel (umbral: suma RGB > 48 de 765) de las 17 canónicas contra las capturas de `test-results/visual/` generadas sobre `28bb7d0`: 17 de 17 con 0 % de píxeles cambiados y los mismos tamaños. Ninguna referencia se actualizó y no hay cambios visuales previstos en esas pantallas
- `pnpm test:pilot:e2e`: 10/10

**Corrección del registro:** la entrada anterior decía «36 capturas canónicas». El conjunto canónico es de 17
archivos (`design/brandopolis-ui/reference/screenshots/`), sin canónicas nuevas en la Fase 4. Inventario y origen de
las aprobaciones en la matriz v21.

**Estado por tipo (matriz v21):**
- **Implementado y validado en DEMO:** SITE-001…010, DOM-001/002/004/005/006, vista por tamaño, ZIP, y CNS-004 y
  MEA-006/007/008/012/013 como reglas.
- **Parcial:** nada en el alcance local de sitios.
- **Pendiente de decisión:** dominio de publicación, privacidad y consentimiento definitivos, correo para avisos.
- **Pendiente de proveedor o evidencia real:** HTTPS y dirección DNS por dominio (DOM-003), comprobaciones DNS reales,
  medición real (MEA-001…005, 009…011), CNS-001…003 con etiquetas reales, publicación real.

**Sin cambios:** producción, DNS, proveedores, correo e IA real. ADR-0035 sigue propuesto; Atomic y Chatwoot no
están adoptados. El 503 de `phase3.spec.ts:58` sigue en observación, sin causa confirmada. Cerrar Sitios en DEMO no
cierra la Fase 4 ni autoriza publicar de verdad. **Not release-ready.**

## 2026-10-11 · PHASE 4 · sitios web (bloque 7) y corrección de seguridad de dominios

**Commits locales (sin push ni despliegue):** `8d00287` (sitios, migración aditiva 0028), `562e32a` (corrección de
seguridad: reserva del dominio al verificarlo, migración aditiva 0029; caché del HTML público), `897e61a` (E2E del
recorrido) y el commit de documentación de este bloque. Las migraciones 0028 y 0029 sólo se aplicaron en bases
aisladas (pruebas 55432 y app aislada 55434).

**Qué hay:** Marketing › Sitio web (sin entrada nueva en el lateral; «Mi sitio web» en Inicio lleva a la pestaña). El
recorrido va así: objetivo y nombre, «lo que ya tenemos», propuesta determinista de Brando (`DETERMINISTIC_DEMO`, con
procedencia por sección; no escribe hasta que la persona la incorpora, y entonces el borrador queda `AI_ASSISTED`), y
edición por páginas y secciones del catálogo cerrado (subir, bajar, quitar, añadir). Siguen el guardado con revisión
(409) para salir y retomar, las comprobaciones previas y la vista previa autenticada en otro origen. Después vienen
revisión con criterio, publicación de la versión exacta con `PUBLISH_SITE` y confirmación, restauración como
publicación nueva, y dominios (dirección de Brandopolis verificada y dominio propio con TXT; nada se compra ni se
cambia en DNS). El formulario del sitio guarda la solicitud con la captura de Clientes (origen, UTM, identificadores
de clic; éxito sólo después de guardar). Kit según ADR-0034 (colores con contraste comprobado; fuentes web sólo con
permiso de incrustación web; imágenes validadas con los límites de las exportaciones). Las versiones de sitio se
pueden compartir con el invitado (lee y comenta; no aprueba sitios ni publica). Servidores de desarrollo:
`pnpm sites:public --isolated` (3101) y `pnpm sites:preview --isolated` (`127.0.0.2:3201`).

**Corrección de seguridad (`562e32a`):** la revisión automática del commit `8d00287` señaló que un dominio añadido
sin verificar quedaba reservado y otra marca podía bloquear el dominio real de un cliente. Causa confirmada: el índice
único parcial cubría también `PENDING_VERIFICATION`. Ahora sólo `VERIFIED` reserva, cada intento tiene su token, y
quien lo tiene verificado lo conserva mientras su registro siga publicado. Prueba nueva en `tests/site-cases.ts`. No
hubo exposición: este código no está desplegado.

**Defecto propio hallado en navegador y corregido:** volver atrás en el formulario público y enviarlo otra vez creaba
una segunda oportunidad (el HTML `no-store` se volvía a pedir con otro identificador). Ahora es `private, no-cache`.

**Resultados:** `pnpm test` **503 PASS**; typecheck y lint 0 errores; E2E nueva `phase4-sites` PASS en escritorio,
tableta y móvil; afectadas `phase4-deliverables`, `phase4-collaboration`, `phase4-priority` y `phase4-clients` en
escritorio 7/7; `test:visual` 10 PASS · 1 SKIP; 36 capturas canónicas idénticas al píxel (ninguna canónica cambiada);
`pnpm test:pilot:e2e` 10/10; Foundation 0 errores; validador de UI PASS.

**Estado por tipo (matriz v20):** implementado y validado en DEMO: SITE-001…003, SITE-005…010, DOM-001/002/005/006,
reglas CNS-004 y MEA-006/007/008/012/013. Parcial: SITE-004 (sin testimonios ni cifras en el catálogo), DOM-004 (sin
comprobación periódica automática), conmutador escritorio/móvil en la vista previa. Pendiente de decisión o
proveedor: HTTPS por dominio (DOM-003), medición real y etiquetas (MEA-001…005, 009…011), aviso de consentimiento
con etiquetas reales (CNS-001…003), publicación en un dominio real. Pendiente: ZIP del sitio y regresión E2E completa
de cinco proyectos con este bloque (la lista de specs ya incluye `phase4-sites` y necesita los dos servidores de
sitios levantados).

**Sin cambios:** producción, DNS, proveedores, correo y privacidad definitiva. ADR-0035 sigue propuesto. El 503 de
`phase3.spec.ts:58` sigue en observación, sin causa confirmada. **Not release-ready.**

## 2026-10-11 · PHASE 4 · corrección de seguridad en exportaciones (imágenes subidas)

La revisión automática de seguridad del commit `d806ae2` señaló un riesgo de denegación de servicio en
`pdf-brand.ts`. Causa confirmada: `decodePng` (`pdf-editorial.ts`) descomprimía los datos PNG sin límite; antes sólo
recibía imágenes propias del producto, pero las exportaciones le pasan logotipos que los usuarios suben al kit (hasta
15 MB comprimidos), así que un PNG manipulado podía inflarse a gigabytes y agotar la memoria del servidor. Corrección:
la descompresión se limita al tamaño exacto que exigen las dimensiones declaradas; las exportaciones rechazan imágenes
de más de 12 Mpx (PNG y JPEG) y un archivo dañado se omite con aviso en vez de fallar la descarga. Prueba nueva: PNG
«bomba» (declara 10×10 y se infla a 40 MB), PNG y JPEG gigantes y JPEG inválido → aviso, PDF válido, memoria acotada.
`pnpm test` **494 PASS** (incluye los PDF del Mapa estratégico y del Brand Book que usan el mismo decodificador).
No hubo exposición en producción: este código no está desplegado.

## 2026-10-11 · PHASE 4 · permiso para compartir (opción A) y exportaciones PDF, PPTX y DOCX

**Permiso para compartir (`8288310`):** decisión del propietario, opción A de PHASE4_SPEC §12.5. `shareToPortal` y
`withdrawShare` exigen `MANAGE_GUESTS` en la marca, también al repetir con la misma clave; comentar sigue abierto al
equipo; lo que aprueba el invitado no cambia (ADR-0033 v5). Pruebas: miembro sin permiso, otra marca, invitado (404) y
permiso retirado. Unitarias 485/485 en ese commit.

**Exportaciones (bloque 6):**
- Código nuevo: lectura defensiva de TrueType/WOFF con permisos por uso y subconjunto (`src/domain/ttf.ts`); elección
  de tipografía con avisos (`src/domain/export-fonts.ts`); constructor PDF con fuentes incrustadas y `ToUnicode`
  (`src/application/pdf-brand.ts`); guía de marca PDF (versión publicada del kit), material en PDF, presentación comercial
  en PPTX y textos en DOCX (`src/application/export-documents.ts`); orígenes de sólo lectura en el ámbito de la marca
  (`src/application/exports.ts`); rutas `/api/exports/{guide,deliverable}` (sólo equipo; avisos en
  `X-Brandopolis-Notices`); botones en el material aprobado y en Guía de marca. Sin dependencia nueva (jszip ya estaba).
- Verificación de archivos de prueba en aplicaciones reales: PowerPoint 16.0.16026.20200 (PPTX: abre sin reparación,
  4 diapositivas, cuadros de texto nativos editables, texto con acentos y símbolos intacto, logotipo con su proporción
  tras corregir un defecto propio que lo deformaba; si la fuente del kit no está instalada, PowerPoint la sustituye y el
  aviso lo dice), Word 16.0.16026.20200 (DOCX: abre sin reparación, estilos, tabla, edición) y pdf.js 6.3.289 en Chrome
  (PDF: render, texto seleccionable e idéntico, saltos de página, imagen con alfa). Acrobat no está instalado; PDFium no
  se verificó. Las instancias ocultas de PowerPoint y Word que abrieron los scripts se cerraron al terminar.
- Defectos propios corregidos durante la prueba: logotipo deformado en PPTX; etiquetas sin negrita cuando la fuente del
  kit está incrustada (ahora se usa el archivo negrita del kit si existe y lo permite).
- Pruebas: `tests/export-cases.ts` (8; fuentes como entrada no confiable, permisos, subconjunto, PDF/PPTX/DOCX, ámbito,
  invitado, otra marca, HTTP con fuente desde almacenamiento privado, la exportación no cambia el origen ni incluye
  comentarios internos); E2E: PDF y Word de un material aprobado y guía en PDF.

**Resultados sobre el árbol de este commit:** `pnpm test` **493 PASS**; typecheck y lint 0 errores; E2E afectadas
(`phase4-deliverables`, `phase4-identity`, `phase4-collaboration`) **35/35** (7 × 5 proyectos); `test:visual` 10 PASS · 1
SKIP y **las 17 capturas idénticas** a las canónicas aprobadas; Foundation 0; validador de UI PASS. No se repitió la
regresión E2E completa: los cambios tocan exportaciones (rutas nuevas), Colaboración (compartir) y botones de dos vistas,
cubiertos por las suites afectadas.

**Pendiente:** aplicación de destino de los clientes (EXT-REQ-12), comparación renderizada de dos marcas (EXP-002/005),
OTF/CFF y WOFF2, ZIP del sitio, PDF de la guía en el portal (sin ampliar facultades del invitado). Decisiones abiertas:
correo, privacidad definitiva, dominios, proveedores, IA real; ADR-0035 propuesto; Atomic y Chatwoot sin adoptar; el 503
de Validación sigue en observación. Siguiente: sitios (bloque 7) o, si el propietario lo prioriza, la comparación de dos
marcas para cerrar EXP-002/005.

## 2026-10-11 · PHASE 4 · capturas aprobadas (revisión única) aplicadas

Decisión del propietario: aplicar nueve `-current.png` del ZIP `Brandopolis_Fase4_capturas_revision_unica_2026-10-11.zip`
(SHA-256 `c32b8e581708a972ef9d70a58ad203e58c81d514097bf2a9e34dfb274ed3c970`, verificado), capturadas sobre `5cf0618`:
blueprint-desktop, blueprint-mobile, decision-card-desktop, history-desktop, m1-guided-review-desktop,
m1-guided-review-mobile, m1-needs-review-desktop, m1-needs-review-mobile y m1-workspace-desktop. Antes de copiar: hashes
de imágenes iguales al inventario y cada canónica local igual a la «canónica» del paquete (ninguna ya aplicada ni con
cambios posteriores). Copiados los archivos exactos sin regenerar; las otras ocho canónicas intactas. Registro
`brand-assets.json`: sólo esas nueve y el README de capturas. Verificación: las nueve idénticas byte a byte a las
aprobadas; validador de UI PASS; validador de marca PASS; `brand-runtime.test.ts` 5/5. La aprobación cubre esas
imágenes (menú de ocho áreas y navegación interior de Estrategia), no diferencias futuras.

**Clientes y Resultados (Fase 4, DEMO):** queda satisfecha la aceptación visual pendiente de este bloque. No es cierre de
la Fase 4 ni validación con proveedores, IA o invitados PILOT reales. Evidencia separada: regresión completa sobre
`ec31409` con registro temporal (295: 282 PASS · 13 SKIP · 0 FAIL) y pruebas de los cambios posteriores sobre el código
final (`5cf0618`: unitarias 484, PILOT 10/10, Clientes E2E 5/5, visual estructural). El 503 de Validación
(`phase3.spec.ts:58`) sigue en observación, con causa sin confirmar.

## 2026-10-11 · PHASE 4 · bloque 6 (exportaciones): evaluación del generador PDF propio y jszip

Evaluación técnica sin cambios de runtime: `docs/15-handoff/PHASE4_EXPORTS_EVALUATION_2026-10-11.md`. El generador
propio sólo usa fuentes estándar con WinAnsi (no cumple EXP-004/005 ni «sin pérdida» de EXP-003 para cualquier texto);
`jszip` 3.10.2 ya instalado escribe OOXML (spike: PPTX mínimo con texto en español intacto al releerlo) y una fuente
TrueType se puede leer sin dependencias (tablas, `cmap` 4/12, `OS/2.fsType`). Recomendación: ampliar el generador con
fuentes TrueType incrustadas (subconjunto, `ToUnicode`, comprobación de permiso) y generar PPTX/DOCX con jszip; sin
dependencia nueva. Pendiente del propietario: aplicación de destino para EXP-001 (EXT-REQ-12). Siguiente: PDF con
fuentes incrustadas.

## 2026-10-11 · PHASE 4 · Clientes y Resultados: verificación completa y estabilización

Punto de partida comprobado: rama `feat/phase4-marketing-web-collaboration`, HEAD `ec31409` (después de `6d1e55c`),
árbol limpio. Antes de arrancar servicios: 764 MB libres de 7,86 GB y 15,2 GB comprometidos de 32,4 GB; Chrome del
propietario ~1,6 GB (no se tocó). Se detuvieron seis procesos huérfanos propios `scripts/local-db.ts` (sin base
escuchando). Una suite y un worker a la vez; sólo la base aislada de la DEMO (55434) y la de pruebas (55432).

**Diagnóstico de `phase3.spec.ts:58` (fallo de `wide-a` sobre `ec31409`).** La traza muestra que `.plan-quality` no
apareció porque `POST /api/learning/create` (crear el experimento) respondió **503** a los 9 s y la página avisó «La
demo local no está disponible…»: el servidor capturó una excepción que no es de dominio. La DEMO no registra esas
excepciones, así que se añadió un registro temporal en el `catch` de `http.ts` (nunca commiteado; retirado antes de
las ejecuciones finales). Con ese registro: el caso pasó 3/3 aislado y toda la regresión E2E (10 tramos) terminó sin
ninguna excepción registrada. **Causa no confirmada:** no se reprodujo; el 503 coincidió en el tiempo con la presión de
memoria y con dos fallos 0xC0000142 (fallo de inicialización de procesos durante esa presión), coincidencia que no
demuestra la causa. No hay relación de código con Clientes (la ruta es de Validación). Se conserva como fallo
observado sin diagnóstico; no se cambió la prueba ni se añadieron esperas.

**Cambios de código de esta entrada (tras la regresión):**
- Resultados: cada indicador declara tipo de fuente (registro interno, presupuesto planificado o dato de proveedor) y
  limitaciones; nuevo indicador de presupuesto planificado del Plan por moneda (nunca gasto); «Gasto real en anuncios»
  y «Visitas al sitio y resultados de campañas» siguen «Sin conectar»; ventas «Sin datos». Tabla de indicadores en
  PHASE4_SPEC §12.4.
- El formulario de desarrollo (página y endpoints) sólo se sirve en DEMO; en PILOT responde 404 hasta que exista el
  aviso de privacidad definitivo.
- Pruebas nuevas: base caída sin confirmación falsa y reintento con la misma referencia, mismo origen, cuerpo
  malformado, límite de solicitudes (429 sin guardar), texto con instrucciones que no cambia estrategia ni contexto,
  formulario sólo en DEMO, presupuesto frente a gasto; E2E con texto ampliado al 200 % y teclado.

**Evidencia y árbol al que pertenece:**

| Comprobación | Árbol | Resultado |
|---|---|---|
| `test:e2e` completo, 15/15 archivos, 10 tramos (5 proyectos × 2) | `ec31409` + registro temporal de errores (sólo logging) | **295 pruebas: 282 PASS · 13 SKIP · 0 FAIL**, sin reintentos (la configuración no reintenta) y sin excepciones del servidor. wide 31+27 (1 SKIP), desktop 31+27 (1), compact 31+27 (1), tablet 29+25 (5), mobile 29+25 (5) |
| `phase3.spec.ts:58` aislado | ídem | 3/3 PASS |
| `phase4-clients.spec.ts` | árbol final salvo el cierre del formulario en PILOT (que no afecta a DEMO) | 5/5 proyectos |
| `pnpm test` | árbol final | **484 PASS** (21 archivos; Clientes 9) |
| `test:pilot:e2e` | árbol final | **10/10** (también 10/10 sobre `ec31409`) |
| `test:visual` estructural | árbol final salvo el cierre PILOT | 10 PASS · 1 SKIP |
| Píxeles (umbral RGB > 48/765) | ídem | 8 idénticas; 9 distintas (ver revisión de capturas) |
| typecheck, lint, Foundation, validador de UI, validador de marca | árbol final | 0 errores · PASS · PASS |

Lo que sigue valiendo de la regresión: todos los recorridos salvo Resultados (repetido en `phase4-clients` tras el
cambio) y el formulario en PILOT (cubierto por la prueba unitaria y por PILOT 10/10). No se repitió la regresión
completa tras estos cambios, que sólo tocan Resultados, el formulario en PILOT y pruebas.

**Capturas:** paquete único `Brandopolis_Fase4_capturas_revision_unica_2026-10-11.zip` (Descargas; SHA-256
`c32b8e581708a972ef9d70a58ad203e58c81d514097bf2a9e34dfb274ed3c970`), generado con `test:visual` sobre el árbol limpio de
`5cf0618` (repetido porque la ejecución PILOT vacía `test-results/`; mismos resultados). 17 canónicas: 8 idénticas y 9
distintas, todas cambios previstos: 4 pendientes de v5 (las tres móviles idénticas a la «actual» del ZIP v5;
blueprint-desktop añade el menú, 0,42 %) y 5 de escritorio sólo por el menú de ocho áreas (0,29–0,53 %, diferencias
confinadas a x 24–242, y 367–708). Sin variaciones de datos ni defectos. Ninguna canónica sustituida: aprobar exige
nombrar los `-current.png`.

**Estado:** Clientes y Resultados de Fase 4 verificados en DEMO; pendiente sólo la aprobación visual del propietario y
las decisiones abiertas (compartir, proveedor de correo, aviso definitivo). Chatwoot sin prueba (sin entorno); ADR-0035
propuesto; Atomic y Chatwoot no adoptados. Siguiente: exportaciones (generador PDF propio y `jszip`).

## 2026-10-11 · PHASE 4 · Clientes: captura persistente manual/web y Resultados ampliados (issue #10)

- **Datos (migración aditiva `0027_client_capture`, ADR-0035 propuesto):** `client_segments` (id estable por marca;
  sólo se desactiva), `lead_forms` (id público aleatorio de 22 caracteres; ACTIVE → DISABLED una vez),
  `client_opportunities` (persona, contacto opcional, necesidad, origen MANUAL/WEB_FORM, responsable o cola, segmento,
  oferta, siguiente seguimiento, NEW/IN_PROGRESS, revisión; clave de captura única por espacio, marca, ámbito y clave,
  con huella), `client_interactions` (evidencia por interacción: canal de atención, plataforma, origen declarado, UTM,
  identificadores de clic, ruta y dominio de referencia depurados, estado de campaña con causa, consentimiento) y
  `client_opportunity_events` (append-only). Triggers: identidad de captura, origen y recepción inmutables; revisión
  +1 por cambio; borrado sólo en el borrado registrado de marca (añadidas a `deleteBrand`). Sólo se aplicó en la base
  aislada de la DEMO (55434) y en la de pruebas (55432).
- **Motor:** `src/domain/clients.ts` (validación, lista de campos de evidencia, estado de campaña, huella estable,
  pendientes) y `src/application/clients.ts`. Equipo por `withBrandActor` (el invitado no tiene membresía → 404);
  responsable sólo miembro activo con acceso; formularios con `PUBLISH_SITE`; auditoría `CLIENTS_*` sólo con ids.
  Formulario público sin sesión: la marca sale del formulario activo; confirmación tras el commit; reintento con el
  mismo envío → misma oportunidad; misma clave con otro contenido → 409; dos envíos simultáneos → una fila.
- **Rutas:** `/api/clients`, `/api/clients/{create,update,segment,form,disable-form}`, `/api/results`,
  `GET /api/forms/public`, `POST /api/forms/submit` (mismo origen, 40 KB, límites por cliente y por formulario).
  Página de desarrollo `/formulario?f=…` (`lead-form.html/js/css`, `noindex`).
- **Interfaz:** ocho áreas (Clientes entre Marketing y Marca y recursos; Resultados deja «Próximamente»); filas del
  lateral de 42 px sólo con altura ≤ 820 px para que no haya desplazamiento a 1366×768; Ayuda actualizada.
- **Herramientas, prueba técnica y pendientes:** ver la entrada documental anterior; la prueba acotada de Chatwoot no
  se ejecutó (sin entorno aislado ni versión elegida).
- **Resultados (árbol de este commit, DEMO aislada):** typecheck y lint 0 errores; Foundation 0; validador de UI PASS.
  `pnpm test`: 480 PASS y 2 FAIL antes de actualizar las dos pruebas de navegación que esperaban siete áreas
  (`pre-tester.test.ts`); tras actualizarlas, ese archivo 29/29 y los 7 casos de Clientes 7/7. **La suite completa no
  se repitió después de esa corrección.** E2E nueva `phase4-clients.spec.ts`: PASS en wide, desktop, compact, tablet y
  móvil (con un invitado real de la DEMO y la respuesta perdida tras el commit). Defecto propio corregido: la octava
  área desplazaba el lateral a 1366×768 (32 px); ahora las filas miden 42 px sólo con altura ≤ 820 px.
- **Regresión E2E completa: NO terminada** (sobre `ec31409`). Claude Code detuvo por falta de memoria del equipo la
  ejecución secuencial, el servidor aislado y la base de pruebas.
  - Sólo terminó la mitad `wide-a`: **24 PASS · 3 FAIL**. Dos fallos son «worker process exited unexpectedly» con
    código 0xC0000142 (fallo de inicialización de proceso ocurrido durante la presión de memoria; la coincidencia no
    demuestra la causa). El tercero es `phase3.spec.ts:58` (Validación: `.plan-quality` no apareció).
  - Los procesos que quedaron (servidor 3001 y PostgreSQL 55434, propios del repositorio) se detuvieron después, sin
    reiniciar nada.
  - Corrección de esta redacción (2026-10-11): la versión anterior unía en un solo paréntesis el recuento de `wide-a`
    y la lista de procesos detenidos; el contenido no cambia. La verificación se completó en la entrada siguiente.
  - Estado en ese momento: **not release-ready**.

## 2026-10-11 · PHASE 4 · reconciliación del issue #10 (Clientes y Resultados, plan v5) · documental

- **Fuentes verificadas:** paquete `Brandopolis_Fase4_Issue10_Clientes_Resultados_2026-10-11 (1).zip` (en la carpeta
  Fase 4 del propietario; no estaba en Descargas) con `INVENTORY.json` `package_revision` 3 y `source_plan_version` 5;
  el ZIP sin sufijo es la revisión anterior y no se aplicó. Issue #10 leído por la API pública: actualizado
  2026-10-11T17:16:28Z, 0 comentarios, cuerpo idéntico a la copia del paquete salvo líneas en blanco. Plan v5 leído
  íntegro (525 líneas, §§11–13). Checkout: rama `feat/phase4-marketing-web-collaboration`, `1ef95bd`, árbol limpio.
  Siguiente ADR libre 0035 y migración libre 0027 comprobados.
- **Documentos actualizados (sin efecto en runtime):** PHASE4_SPEC v6 (§1 resolución, §3 ocho áreas propuestas, §10,
  §12 nuevo); PHASE4_ACCEPTANCE_MATRIX v15 (94 criterios I10 sin renumerar —48 + 46—, todos pendientes, y tabla de
  trazabilidad requisito → fase → contrato → aceptación → estado real); PHASE4_EXTERNAL_REQUIREMENTS v5 (Atomic/
  Chatwoot, canales, coste total, I10-EXT-01…14); scope-mvp (resolución y roadmap de seis macrofases), non-goals,
  POST_MVP_DEFERRED_SCOPE; ADR-0030 v5 y ADR-0033 v4 (notas fechadas); **ADR-0035 propuesto** (modelo de captura,
  formulario, permisos, contratos F5/F6); PHASE4_HANDOFF y NEXT_DEVELOPER_START_HERE.
- **Herramientas (archivo 07):** evaluadas con commit fijo y sin ejecutar nada claude-seo-ai `cabd607`,
  claude-webkit `1bd88c3`, whatsapp-agentkit `ad278b7` y auto-crm `0aef51a` (todas MIT). Se adaptan criterios
  puntuales de las dos primeras en `brandopolis-marketing/references/site-and-seo.md` con procedencia y aviso MIT;
  las otras dos quedan como referencia (whatsapp-agentkit pide claves por chat; auto-crm expone una API sin
  autenticación). `PHASE4_AGENT_TOOLING_REVIEW_2026-10-11.md` §6. Se conserva todo lo adaptado en `acc9f19`.
- **Decisiones que no se atribuyen al propietario:** permiso propio para compartir con cliente y recursos
  aprobables por un invitado siguen pendientes; ocho áreas, Chatwoot desacoplado, cuenta por marca y Atomic son
  recomendaciones por validar. Ninguna dependencia adoptada; ningún mensaje, compra, push ni despliegue.
- **Pendientes conservados:** capturas v5 (4) y del menú (5), correo, PRT-006, búsqueda/PDF del portal, ONB-009,
  IA y proveedores reales, dominios y consentimiento, cuatro intermitencias sin diagnóstico.

## 2026-10-11 · PHASE 4 · bloque 5: colaboración, portal del invitado y guía viva

- **Datos (migración aditiva `0026_brand_collaboration`):** `brand_invitations` (email normalizado, hash del token de un
  solo uso, caducidad 7 días, entrega `LINK`/`EMAIL`), `brand_guests` (una marca), `portal_shares` (versión exacta y
  huella; la estrategia se congela en la fila), `portal_comments` (`SHARED`/`INTERNAL`; el invitado sólo `SHARED`) y
  `portal_approvals` (append-only, contexto `GUEST`). Triggers: invitación PENDING → ACCEPTED/REVOKED una vez, invitado
  ACTIVE → REVOKED, share sólo se retira, comentarios y aprobaciones append-only; borrado sólo en el borrado registrado
  de la marca (añadidas a la lista de `deleteBrand`).
- **Motor:** `src/domain/collaboration.ts` (normalización, token, caducidad derivada) y
  `src/application/collaboration.ts`. Equipo por `withBrandActor` (invitar/retirar con `MANAGE_GUESTS`); portal por
  `withGuest` (sesión válida + `BrandGuest` ACTIVE de esa marca; 404 si no). Destinatario: email verificado igual al
  invitado; identidad DEMO sin cuenta sólo en marcas DEMO; un miembro del workspace no pasa a invitado. Las acciones
  del invitado quedan en sus filas (la auditoría estratégica exige membresía).
- **Rutas:** `/api/collaboration`, `/api/collaboration/{invite,revoke-invitation,revoke-guest,share,withdraw,comment}`,
  `/api/brand-guide`, `/api/invitations/accept`, `/api/portal/brands`, `/api/portal`, `/api/portal/{comment,decide}`,
  `/api/portal/asset`. El portal y la aceptación no exigen el perfil de Estratega de Marca del PILOT.
- **Interfaz:** Colaboración es destino real (deja «Próximamente»); Guía de marca en Marca y recursos; el enlace
  `/#invitacion=…` se guarda hasta iniciar sesión y se acepta una vez; botón «Compartido contigo» / «Portal» en el
  encabezado sólo para quien es invitado; portal con Resumen, Guía de marca, Marca, Marketing y Entregables.
- **Pruebas:** `tests/collaboration-cases.ts` (8), `tests/browser/phase4-collaboration.spec.ts` (dos identidades reales;
  `tests/browser/demo-identity.ts` crea la segunda en la base DEMO local), guía viva añadida a
  `tests/browser/phase4-identity.spec.ts`; `workspace.spec` y `pre-tester.test.ts` esperan un solo «Próximamente»
  (Resultados); recuentos de migraciones a 27.
- **Resultados:** typecheck, lint, Foundation 0; validador de UI PASS; `pnpm test` 475 PASS; test:e2e 290 pruebas, 277
  PASS · 13 SKIP al cierre. Primera pasada: 5 fallos. Uno era un defecto de este cambio: desbordamiento horizontal del
  portal a 1280 px, porque el botón nuevo empujaba la tarjeta de Brando; ahora la etiqueta corta se usa por debajo de
  1600 px y la prueba pasa en wide, desktop y compact. Los otros 4 son intermitentes y pasaron al repetirlos solos:
  `phase3.spec.ts:110` en wide y tablet, `micro-hotfix.spec.ts:27` en tablet y `phase4-plan.spec.ts:77` en compact;
  sus trazas están en `test-results/e2e-*`. test:pilot:e2e 10/10. test:visual: estructura 10 PASS · 1 SKIP. Píxeles:
  las 4 de v5 siguen pendientes con el mismo tamaño, y 5 capturas de escritorio (decision-card, history,
  m1-guided-review, m1-needs-review, m1-workspace) cambian 0,24–0,44 % sólo en el menú. Las canónicas no se tocaron.
- **Pendiente:** email de invitaciones (proveedor), prueba con identidad PILOT/OIDC real, cambio de workspace activo
  (PRT-006), búsqueda del portal, PDF de la guía, Biblioteca y Plantillas; decidir si compartir requiere capacidad propia.

## 2026-10-11 · PHASE 4 · inicio guiado: ONB-006 y ONB-007

- **ONB-006:** `readKit` devuelve `reusable` (PDF de la marca que aún no son archivos del kit, por huella);
  `Engine.kitReusableDocument` y la ruta `/api/brand-kit/reuse-document` copian el PDF como manual privado del kit
  tras comprobar firma y SHA-256 (reintento = mismo archivo). El paso 3 del inicio guiado nombra los PDF que se podrán
  usar. Sin migración.
- **ONB-007:** la tarjeta «Quiero completarla» sin kit aprobado inicia un borrador con lo que existe («Empezar con lo
  que tengo») y muestra lo que falta por canal. `attributeCorrections` (dominio) decide la procedencia en el servidor:
  valor cambiado → persona, con archivo y página de referencia; valor nuevo → persona; la certeza no cambia, así que
  corregir nunca confirma. Etiqueta «Declarado, sin adoptar».
- **Defecto hallado por la nueva regresión y corregido:** `assertNoSilentConfirmation` comparaba con `JSON.stringify`
  dependiente del orden de claves; jsonb las reordena, así que tras adoptar un valor el editor no podía guardar el
  borrador. Ahora compara con claves ordenadas (prueba U y E).
- **Pruebas:** dos casos U nuevos en `tests/brand-kit-cases.ts`; E nueva en `tests/browser/phase4-identity.spec.ts`
  (PDF de texto generado en la prueba; extracción determinista, sin IA); la E existente de identidad ahora espera
  «Empezar con lo que tengo» en lugar de «Disponible cuando tengas un kit aprobado».
- **Resultados:** typecheck y lint 0; Foundation 0 errores; validador de UI PASS; `pnpm test` 467 PASS; E2E
  `phase4-identity` + `phase4-setup` 6/6 en cada uno de los 5 proyectos; test:pilot:e2e 10/10. La E2E completa no se
  repitió en este commit (cambios aditivos); queda para el cierre del bloque de colaboración.
- **Pendiente del inicio guiado:** ONB-009 con un proveedor real que falle; ONB-011 (portal del invitado).

## 2026-10-11 · PHASE 4 · herramientas para agentes: criterios de marketing

- El análisis adjunto con los enlaces no llegó a la sesión; los repositorios se identificaron por nombre público
  («Claude SEO AI», «Web Builder», WhatsApp y Auto-CRM sin identificar con certeza). Detalle, selección y backlog:
  `docs/15-handoff/PHASE4_AGENT_TOOLING_REVIEW_2026-10-11.md`.
- Nueva skill `brandopolis-marketing` (instrucciones adaptadas de marketingskills 2.11.26 `1efedbc`, claude-seo 2.4.2
  `4b99de2` y claude-ads 2.0.2 `ac21644`, MIT). No se instaló ningún plugin ni se ejecutó código de terceros.
- Resultados: Foundation 0 errores, typecheck y lint 0, `pnpm test` 465 PASS (458 + 7 casos de la sexta skill),
  `pnpm skills:check` idéntico. Sin efecto en runtime.

## 2026-10-11 · PHASE 4 · inicio guiado (2/2): borrador, guía de cuatro etapas y ficha

- **Datos:** `brand_setup_drafts` (migración aditiva `0025`), schema `brand-setup-draft` v1. Borrador de su autor en
  su workspace; uno abierto sin marca por persona y uno abierto por marca; ligado a la marca una vez al crearla.
  Trigger: IN_PROGRESS → CONFIRMED / ABANDONED, cerrado inmutable, autor/marca inmutables, versión +1, borrado sólo
  dentro del borrado registrado de su marca (incluido en ADR-0029).
- **Motor:** `setupDraft`, `startSetupDraft`, `saveSetupDraft` (409), `createBrandFromDraft` (marca y prioridad en la
  misma transacción, reintento sin duplicado), `confirmSetupDraft` (sólo registra lo que difiere del contexto
  declarado vigente y la geografía; sin versiones), `abandonSetupDraft`. Documentos: mismo SHA-256 en la misma marca
  devuelve el existente y la ruta borra la copia nueva. La proyección de Strategic Intelligence toma el último valor
  declarado por prefijo (antes el primero según un id aleatorio).
- **Interfaz:** diálogo como paso 1 (ficha completa en «Completar ficha»); vista «Preparar tu marca» con etapas reales,
  una pregunta a la vez y «No lo sé todavía», propuestas con origen y conflictos, identidad (posponible salvo
  prioridad de identidad), resumen y confirmación; Inicio ofrece retomar; Configuración de marca abre la ficha.
  Revisión visual de la guía en escritorio y móvil (sonda de capturas en el scratchpad; un título corregido).
- **Pruebas:** `tests/brand-setup-cases.ts` (7) y `tests/browser/phase4-setup.spec.ts` (3 × 5 proyectos); 13 suites
  E2E abren «Completar ficha» antes de crear; `m1.spec` intercepta la creación nueva; la prueba de teclado del
  PILOT entra por «Empezar con preguntas»; `pre-tester.test.ts` comprueba la geografía por la confirmación.
- **Resultados:** typecheck, lint, Foundation 0 errores, validador de UI PASS; `pnpm test` 458 PASS; test:e2e 280
  pruebas, 267 PASS · 13 SKIP · 0 FAIL (desktop, wide y compact 55/1; tablet y mobile 51/5); test:visual
  estructura PASS y píxeles: 13 idénticas, 4 = comparación v5 pendiente; test:pilot:e2e 10/10.
- **Pendiente del inicio guiado:** reutilizar en Identidad visual los archivos ya cargados (ONB-006), identidad
  parcial (ONB-007), fallo real de proveedor (ONB-009), portal del invitado (ONB-011). Brando no hace las preguntas
  con IA: son preguntas deterministas por prioridad; la IA real sigue sin verificar.

## 2026-10-11 · PHASE 4 · inicio guiado (1/2): once prioridades de trabajo

Migración aditiva `0024` (amplía la restricción de valores; el historial append-only no se toca): STRATEGY_FULL,
STRATEGY_POINT, SELL_OFFER, VISUAL_IDENTITY, MARKETING_PLAN, SOCIAL_MEDIA, WEBSITE, CAMPAIGN, SALES_MATERIALS, OTHER,
HELP_ME_CHOOSE; CONTENT (valor anterior) sigue válido y se muestra con su nombre. Interfaz: once opciones con
nombres comprensibles, «Otro» con nota opcional (mostrada en Inicio), «No lo sé todavía»; ordena sugerencias, no
oculta áreas ni cambia permisos; distinta del Objetivo estratégico. Inicio enlaza las áreas existentes (Redes
sociales, Materiales de venta, Identidad visual) y nombra Sitio web como no disponible todavía.
Comprobado: typecheck, lint, Foundation 0 errores; pnpm test 451 PASS (incluye historial con CONTENT y valores nuevos,
auditoría por elección); E2E `phase4-priority` 10/10 en los 5 proyectos.

## 2026-10-11 · PHASE 4 · cuatro capturas pendientes: diagnóstico y comparación corregida

- **Mapa estratégico (blueprint-desktop/mobile):** defecto de navegación confirmado con sonda de navegador: al pasar
  a Mapa estratégico o Validación, la última decisión visitada conservaba `aria-current`. Corregido en `b2122ca`
  (fuera de una decisión ningún paso es la página actual; indicadores de estado conservados) con regresión E2E en los
  5 proyectos.
- **Móviles (m1-guided-review / m1-needs-review):** en el instante de la captura el DOM sólo marca Posicionamiento
  (sin `:hover`, `:focus` ni `:active` en otros pasos; `elementsFromPoint` sin fondo en esa zona; también aparece en
  captura de pantalla visible y con animaciones desactivadas; el resaltado de toque no influye). Al mover el puntero a
  una esquina antes de capturar desaparece: efecto de la posición del puntero durante la captura, no del producto. Se
  estabiliza en `tests/visual/canonical.spec.ts` (puntero aparcado); estilos, foco y estados de interacción sin cambio
  (se descartó un cambio de CSS probado durante el diagnóstico).
- Comparación de píxeles: las otras 13 idénticas; las cuatro corregidas en
  `Brandopolis_Fase4_capturas_canonicas_comparacion_v5_2026-10-11.zip` (SHA-256
  `11f4a250f39e6a2593f7dfb0627583b3199191637cf4b7a43098293d03e2096a`), pendientes de revisión; canónicas sin cambiar.

## 2026-10-11 · PHASE 4 · capturas v4 (seis aplicadas) y corrección del recuento E2E

**Capturas:** decisión de Codex sobre el ZIP v4 (SHA-256 `ce4683d7…7d48c5`, verificado): aplicados los `-current.png`
exactos de decision-card-desktop, history-desktop, history-mobile, m1-guided-review-desktop, m1-needs-review-desktop
y m1-workspace-desktop. Pendientes de una comparación corregida: blueprint-desktop/mobile (Posicionamiento aparece
resaltado estando en Mapa estratégico) y m1-guided-review-mobile / m1-needs-review-mobile (otra decisión con fondo
resaltado). Registro de hashes: sólo esas seis y el README de capturas.

**Corrección del recuento** (no reescribe la entrada anterior): la E2E completa sobre `cb8d59a` fue **265 pruebas:
252 PASS · 13 SKIP · 0 FAIL** (wide 52/1, desktop 52/1, compact 52/1, tablet 48/5, mobile 48/5), según las salidas
originales; se transcribió 51 por proyecto. Cambios de `cb8d59a` a `556a535`: producto sólo CSS (`7f73461`), prueba
`tests/visual/phase10a.spec.ts` (helper de navegación) y documentación. Evidencia diferenciada: regresión completa
sobre `cb8d59a`; menú (76 PASS · 9 SKIP), unitarias 451 y PILOT 10/10 sobre `7f73461`; identidad 10/10 sobre `0a92d68`.

## 2026-10-11 · PHASE 4 · menú compacto: Estrategia con navegación interior

**Problema medido** (Chrome, sesión DEMO): con Estrategia desplegada el lateral tenía 1110 px de contenido; en
1366×768 quedaban ocultas siete entradas (Marketing… Ayuda) y en 1440×900 cuatro.
**Solución** (PHASE4_SPEC §3, opción indicada por el propietario): el lateral muestra sólo las siete áreas y el pie
(Mi aprendizaje, Configuración, Ayuda); los nueve pasos, Validación y Mapa estratégico pasan a una navegación interior
de Estrategia, visible sólo dentro del área (pestañas Decisiones · Validación · Mapa estratégico y los nueve pasos
unidos por una línea fina horizontal; cuadrícula 3×3 en móvil). Mismos elementos e ids; Estrategia en el cajón móvil
lo cierra al abrir el área (defecto hallado por la E2E de tablet y corregido). Medición tras el cambio: sin
desplazamiento vertical del lateral en 1366×768, 1280×800 y 1440×900, dentro y fuera de Estrategia.

**Evidencia:**
- `cb8d59a` (código del menú): **test:e2e 260: 249 PASS · 13 SKIP · 0 FAIL**, ejecutada por proyecto y en dos mitades
  de archivos en primer plano (wide 51/1, desktop 51/1, compact 51/1, tablet 48/5, mobile 48/5).
- `7f73461` (sólo CSS posterior: alineación de los pasos y pestañas en móvil): `workspace.spec` + `micro-hotfix` en
  los 5 proyectos 76 PASS · 9 SKIP · 0 FAIL; test:visual 10 PASS · 1 SKIP (estructura); UI validator PASS;
  pnpm test 451 PASS; test:pilot:e2e 10/10.
- Comparación de píxeles (umbral 48/765): 7 idénticas y 10 distintas por el menú compacto (blueprint, decision-card,
  history, m1-guided-review, m1-needs-review en escritorio y móvil cuando aplica, y m1-workspace-desktop 0,02 %).
  No se actualizan: `Brandopolis_Fase4_capturas_canonicas_comparacion_v4_2026-10-11.zip` (SHA-256
  `ce4683d7fab4eb402f8ee2bd9c3ce76f1d9273f348feb9db87e023afe67d48c5`), pendiente de decisión.
- Recursos: el sistema detuvo por memoria, con la sesión inactiva, la base de pruebas, el servidor aislado y una
  ejecución de tablet; terminadas antes wide/desktop/compact; método ajustado (tramos en primer plano < 10 min, sin
  dejar servicios vivos al quedar inactiva) y repetida la regresión completa sobre `cb8d59a`.
- Intermitencia de `m1.spec`: no apareció; sigue pendiente de diagnóstico.

## 2026-10-11 · PHASE 4 · direcciones visuales de Brando (registro en la entrada siguiente, `0a92d68`)

## 2026-10-10 · PHASE 4 · bloque 4 · direcciones visuales de Brando («Quiero crearla»)

Sobre `3d35bcf`. Brando propone 2–3 direcciones (intención, colores con función, tipografías con licencia por
confirmar, imágenes, ejemplos, qué confirmar) con contexto mínimo y sin escrituras; «Usar esta dirección» añade sus
valores al borrador como PROPOSED con origen Brando (un solo uso, por persona y marca); nada se adopta, aprueba ni
publica solo; sin logotipos. Comprobado: typecheck, lint, pruebas del kit (6) incluidas las de evals con inyección y
E2E `phase4-identity` 10/10 (5 proyectos). DEMO etiquetado; IA real sin verificar.

## 2026-10-10 · PHASE 4 · capturas v3 aplicadas

Decisión (revisión de Codex del ZIP v3, SHA-256 `17b1587c…873347`, verificado antes de copiar): seis capturas de
escritorio reemplazadas por los `-current.png` exactos del ZIP (m1-workspace, blueprint, decision-card, history,
m1-guided-review, m1-needs-review); las otras once sin cambios. Registro de hashes: sólo esas seis entradas y la del
README de capturas (que documenta la decisión). UI validator PASS. Recordatorio de método: `test:visual` comprueba
estructura y genera capturas; la comparación de píxeles es aparte (suma de diferencias RGB > 48 de 765 por píxel).

## 2026-10-10 · PHASE 4 · regresión completa sobre `eca854f`

**Estado probado:** commit `eca854f` (árbol limpio). Secuencial, un worker, trazas retenidas en caso de fallo.
- pnpm test 21 archivos / **450 PASS** (incluye las pruebas en disco de `85ec322`).
- **test:e2e 260 pruebas: 247 PASS · 13 SKIP intencionales por tamaño de pantalla · 0 FAIL** (wide 51/1, desktop 51/1,
  compact 51/1, tablet 47/5, mobile 47/5). `m1.spec` pasó en esta ejecución; la intermitencia sigue **pendiente de
  diagnóstico** (no reproducida, causa no identificada).
- test:visual PASS (estructura). Comparación real de píxeles contra las canónicas recién aprobadas: **11 idénticas y
  6 de escritorio distintas** (blueprint 0,09 %, decision-card 0,11 %, history 0,11 %, m1-guided-review 0,06 %,
  m1-needs-review 0,07 %, m1-workspace 0,51 %) sólo porque «Marca y recursos» dejó de ser «Próximamente» en
  `71fb8a4`, después del ZIP revisado; m1-workspace-mobile coincide (menú en cajón cerrado). Esa aprobación no cubre
  el cambio posterior: no se actualizan. Nueva comparación en
  `Brandopolis_Fase4_capturas_canonicas_comparacion_v3_2026-10-10.zip` (SHA-256
  `17b1587c597779881f82cf018258bcb53155d9f869a8a3896be4d4bf2c873347`), pendiente de decisión. (Corrige el recuento
  «12 y 5» y el SHA anterior de este mismo registro, escritos antes de revisarlo.)
- **test:pilot:e2e 10/10.**
- UI validator: en `eca854f` **fallaba** por el hash del README de capturas (editado para documentar el método después
  de validar). Corregido en el commit siguiente actualizando sólo esa entrada del registro; después PASS.


## 2026-10-10 · PHASE 4 · verificación de `85ec322` y capturas canónicas aprobadas

**Correcciones de seguridad de `85ec322` verificadas** (rutas HTTP reales, raíz de documentos temporal):
- `DEL-005: deleting a brand that only has kit files purges them from disk…`: dos marcas sólo con archivos del kit
  subidos por `/api/brand-kit/assets`; al borrar una, su carpeta desaparece del disco y el archivo de la otra sigue
  intacto (y su registro en `kit_assets`).
- `a refused kit upload leaves no file on disk…`: PNG declarado como fuente y PDF declarado como logotipo (rechazados
  tras guardarse) y firma desconocida (rechazada antes): ninguna carpeta nueva; el archivo previo intacto.
- Mutación comprobada: al deshacer temporalmente cada corrección, las tres pruebas afectadas fallan; restauradas, el
  código coincide con el commit.

**Capturas canónicas (decisión del propietario tras revisar el ZIP v2, SHA-256 `334d8df3…6ed98f`):** reemplazadas
con los `-current.png` exactos del ZIP las siete aprobadas (m1-workspace-desktop/mobile, blueprint-desktop,
decision-card-desktop, history-desktop, m1-guided-review-desktop, m1-needs-review-desktop); las otras diez sin
cambios. En `design/brandopolis-ui/specs/brand-assets.json` sólo se actualizaron esas siete entradas: el script de
refresco intentó además registrar `public/brand/web/workspace-atmosphere-clean.webp` (recurso sin registrar previo),
fuera de la decisión, y se descartó. UI validator PASS. Método de comparación y umbrales documentados en el README de
las capturas: `test:visual` no compara píxeles; la comparación real usa umbral de 48/765 por píxel y porcentaje de
píxeles cambiados.

## 2026-10-10 · PHASE 4 · bloque 4 · revisión automática de seguridad del commit `71fb8a4`

Dos hallazgos verificados en el código y corregidos:
- **Retención de datos (DEL-005):** `deleteBrand` sólo programaba la purga de archivos si la marca tenía documentos
  fuente; una marca con archivos del kit y sin documentos los dejaba en disco. Ahora también cuenta `kit_assets`.
  Regresión añadida en `tests/brand-kit-cases.ts`.
- **Archivos huérfanos:** si el registro de un archivo del kit falla después de escribirlo (rol y formato
  incompatibles, acceso perdido), ahora se borra su carpeta.
Comprobado: typecheck y lint PASS. **No ejecutado:** `pnpm test` (la base local de desarrollo fue detenida por
memoria baja del equipo y no se relanza sin indicación); queda pendiente junto con la regresión completa.

## 2026-10-10 · PHASE 4 · bloque 4 (identidad visual) en curso · base del kit de marca

Sin commit todavía sobre `05cc07f`; sin push ni deploy; producción sin cambios. Migración aditiva `0023` sólo en la
base de pruebas efímera y en el perfil aislado `rc1-smoke`.

**Hecho (ADR-0034):**
- Kit de marca, modelo único: `brand_kits` (punteros borrador / aprobada / publicada), `brand_kit_versions`
  (contenido `brand-kit-version` v1, huella, adopciones registradas), `brand_kit_approvals` y
  `brand_kit_publications` append-only, `kit_assets` (originales privados, append-only). Triggers: versiones sólo
  hacia delante e inmutables fuera de DRAFT.
- Certeza por valor (DECLARED, ESTIMATED, PROPOSED, CONFIRMED) con origen; **IDN-003**: guardar nunca confirma, sólo
  la adopción explícita, con quién y cuándo. Contraste WCAG por cada pareja usada; faltantes según los canales que usa
  la marca; diferencias valor a valor al completar; aviso de resolución insuficiente del logotipo.
- Tres entradas: incorporar (archivos + candidatos del manual PDF con su página, extraídos con el extractor existente
  `pdfjs-dist`, sin dependencias nuevas), completar (desde la aprobada, que sigue vigente) y crear (borrador manual;
  las direcciones visuales de Brando quedan pendientes en este bloque).
- Archivos: formato por firma (PNG, JPEG, WebP con dimensiones y transparencia real; SVG guardado pero nunca servido;
  PDF sólo para extraer; fuentes), SHA-256, almacenamiento confinado en `<raíz>/<workspace>/<marca>/kit-<id>` (purga
  de ADR-0029), vista previa sólo raster con `nosniff` y CSP `sandbox`.
- Aprobación por huella con criterio e idempotencia; aprobar no publica; publicar exige `PUBLISH_BRAND_KIT`.
  Materiales: el manifiesto de origen registra la versión aprobada del kit y «Origen actualizado» (`KIT`) cuando se
  aprueba otra; vista de impacto en el kit. Nada cambia en cascada.
- Interfaz: «Marca y recursos» pasa a destino real con la pestaña Identidad visual (Guía de marca, Biblioteca y
  Plantillas «llegarán más adelante»). Pruebas de navegación actualizadas (Colaboración y Resultados siguen
  «Próximamente»).
- Defecto corregido por las pruebas: una referencia Pantone se asignaba a dos colores vecinos.

**Comprobado (salida real, secuencial):** typecheck PASS; lint PASS; Foundation 0 errores (38 schemas); pnpm test 21
archivos / 447 PASS; E2E en los 5 proyectos con trazas retenidas: `phase4-identity` 5/5, navegación de
`workspace.spec` 5/5 y de `micro-hotfix` 5/5, `phase4-deliverables` 15/15.

**Pendiente:** test:e2e completa, visual y PILOT sobre este código (la E2E completa anterior se detuvo en la prueba
138/255, todas en verde hasta ahí, al caer la base aislada por memoria baja del equipo); direcciones visuales de
Brando para «Quiero crearla»; canales consumidores del kit en sitio y campañas (bloques 7–8); intermitencia de
`m1.spec` pendiente de diagnóstico; decisión sobre las 7 capturas canónicas.

## 2026-10-10 · PHASE 4 · correcciones del propietario: exportaciones, intermitencia y datos de prueba visuales

**Exportaciones (corrige «requieren ADR para una librería nueva» de la entrada anterior y del commit `214f884`):**
ADR-0030 ya decide el camino: primero comprobar el generador PDF propio (hoy fuentes estándar WinAnsi, que no
respetan tipografías ni todos los caracteres; ampliarlo con TrueType incrustadas y Unicode) y `jszip` (ya instalado)
para el empaquetado OOXML/ZIP, con los criterios EXP-001…005. No está demostrado que haga falta una librería nueva;
sólo si la comprobación lo exige se presentará su ADR para aprobación. Las exportaciones siguen comprometidas para
el bloque 6; copiar o descargar texto no completa ese alcance.

**Intermitencia `m1.spec.ts` «human connected proof…»:** abierta. Estado correcto: **última ejecución aprobada,
intermitencia pendiente de diagnóstico**. Haber pasado después no identifica su causa. Evidencia conservada (salida
del fallo en `wide`: tras «Guardar contexto», `#decision` mostraba la decisión 01 en lugar de Contexto estratégico).
Se investiga sin esperas arbitrarias ni debilitar la prueba.
Diagnóstico hasta ahora: 3/3 aislada y 20/20 con `--repeat-each=10` en wide y desktop con trazas retenidas; no se
reproduce fuera de la suite completa (posible dependencia de carga/tiempos). Lectura de código: (1) `run()` descarta
en silencio una acción si otra sigue en curso, y los botones pintados durante esa acción no quedan deshabilitados;
(2) `refresh()`/`render()` pintan la decisión al resolver sin comprobar si la vista activa cambió. Ambas pueden dar
el síntoma observado, pero ninguna está confirmada como causa, por eso no se cambian a ciegas. A partir de ahora
las E2E completas se ejecutan con `--trace=retain-on-failure` para capturar la próxima aparición.

**Datos de prueba de las capturas (`tests/visual/canonical.spec.ts`):** nombre de marca fijo («Marca Demo 2026»);
sólo en esa prueba, las fechas se muestran en America/Mexico_City con el instante de la evidencia canónica (9 oct
2026, 2:49 p. m.) sin tocar la aplicación. Además, la lista «Depende de / Afecta a» se ordenaba por identificadores
aleatorios: ahora sigue el orden del recorrido (01–09), cambio sólo de presentación en `app.js`. Resultado en dos
ejecuciones consecutivas: 10 capturas idénticas píxel a píxel (las 7 que ya coincidían y las 3 móviles que sólo
diferían por datos) y 7 candidatas a revisión (m1-workspace-desktop/mobile, blueprint-desktop,
decision-card-desktop, history-desktop, m1-guided-review-desktop, m1-needs-review-desktop). Comparación entregada
en `Brandopolis_Fase4_capturas_canonicas_comparacion_v2_2026-10-10.zip` (SHA-256
`334d8df3366bb6389f86a18c76a5d372059ceb45caca227ca126e182db6ed98f`). Ningún archivo canónico modificado.

## 2026-10-10 · PHASE 4 · bloque 3 · entregables, Brando para marketing y regresión completa

Sobre `214f884` más cambios del árbol probado `1f374eb2ddb99d061e1a77aba148dc19a2e1f08a` (`git write-tree` sobre
índice temporal, archivos nuevos incluidos). Sin push ni deploy; producción sin cambios. Migración aditiva `0022`
sólo en la base de pruebas efímera y en el perfil aislado `rc1-smoke`.

**Hecho:**
- Entregables (PHASE4_SPEC §4.4): cinco tipos con contenido tipado (`deliverable-version` v1), versiones
  editoriales con aprobación humana por huella y criterio, decisión idempotente (`deliverable_approvals` append-only),
  manifiesto de origen (versiones de decisión, versión aprobada de la oferta; kit pendiente), procedencia decidida
  por el servidor y «Origen actualizado» como proyección. Publicaciones agrupadas por mes con **registro manual** de
  publicación (sólo versión aprobada, enlace https, append-only); Brandopolis nunca publica. Anuncios: sólo textos;
  publicación y gasto llegan con las conexiones. Exportación: copiar o descargar texto; PPTX, DOCX y PDF pendientes
  (requieren ADR para una librería nueva).
- Pestañas de área (flechas, Inicio/Fin, foco; selector en pantallas estrechas): Marketing = Plan de Marketing ·
  Redes sociales · Campañas digitales (Sitio web «llegará más adelante»); Productos y servicios = Ofertas ·
  Materiales de venta. Inicio enlaza las prioridades de contenidos y campaña a sus secciones.
- Brando para marketing (ADR-0030, B2 sólo propuesta): `POST /api/brando/marketing`, tarea `BRANDO_MARKETING` en el
  mismo gateway, prompt `brando-marketing-v1`, schema `marketing-proposal-v1`, contexto mínimo autorizado (nombre,
  decisiones vigentes, ofertas aprobadas, prioridades de 90 días), petición como texto no confiable, reautorización y
  comparación de contexto tras la respuesta, salida validada (ids del paquete, cuerpo válido del tipo), cero
  escrituras (evals `evals/brando-marketing.json` con inyección), procedencia `AI_ASSISTED` sólo con prueba de un solo
  uso ligada a persona, marca, tipo, oferta y contexto sin cambios. Panel en el editor: ayuda contextual, propuesta con
  por qué, fuentes, lo que falta y preguntas; «Usar esta propuesta» rellena el formulario, nunca guarda ni aprueba.
  DEMO etiquetado; Live AI no ejecutado para esta superficie.
- Revisión de seguridad independiente (sólo lectura; sin BLOCKER ni HIGH): MEDIUM prueba no ligada a contexto/oferta
  (corregido), LOW clave de publicación reutilizada con otro enlace (409), LOW expulsión de pruebas de otras personas
  (tope por persona), LOW publicación en material retirado (bloqueada); regresiones añadidas.

**Comprobado sobre ese mismo árbol (salida real, secuencial, un worker):** typecheck PASS; lint PASS; Foundation 0
errores (37 schemas); `git diff --check` limpio; pnpm test 19 archivos / 432 PASS; **test:e2e 255 pruebas: 242 PASS
· 13 SKIP intencionales por tamaño de pantalla · 0 FAIL** en la ejecución final (wide 50/1, desktop 50/1, compact
50/1, tablet 46/5, mobile 46/5). **Intermitencia registrada:** en una primera pasada de `wide`, `m1.spec.ts` «human
connected proof…» falló una vez (tras «Guardar contexto» se mostraba la decisión); repetido 3/3 aislado y `wide`
completo repetido 50/1 sin fallos; causa no determinada, queda en observación. test:visual PASS (estructura; no
compara píxeles); comparación real de píxeles: las mismas 10 capturas canónicas difieren por el menú de Fase 4, «Tu
prioridad» y datos de demo, 7 idénticas; archivos canónicos sin modificar, pendientes de decisión humana. UI
validator PASS; **test:pilot:e2e 10/10**.

**Parcial / pendiente:** aceptación con invitado real (portal, comentarios, revisión compartida) hasta implementar y
probar Colaboración; la vista «Lo que recibe el cliente» es revisión interna, no un portal operativo. Exportación
PPTX/DOCX/PDF y Canva (bloque de integraciones).

## 2026-10-10 · PHASE 4 · bloque 3 · navegación de siete entradas · corrección sobre la evidencia visual

**Vínculo de evidencia:** el commit `0fd3e6f` contiene exactamente el código del árbol probado
`217ac4d7ada20ad662372f428507d299a6a20b32`; `git diff 217ac4d7 0fd3e6f^{tree}` sólo muestra los tres registros de
evidencia (SESSION_STATE, CHANGELOG, matriz).

**Corrección (no reescribe las entradas anteriores):** las entradas de bloque 3 que dicen «test:visual … sin
diferencias» no están acreditadas. `tests/visual/canonical.spec.ts` no compara píxeles: escribe las capturas en
`test-results/visual` (o en la carpeta canónica sólo con `UPDATE_CANONICAL_SCREENSHOTS=1`) y comprueba desbordes,
imágenes decodificadas y acciones visibles. Lo acreditado es «test:visual PASS (estructura) y archivos canónicos sin
modificar». Comparación real de píxeles (Chrome de Playwright, sin dependencias nuevas) tras la navegación nueva:
7 capturas idénticas (blueprint-mobile, login ×2, public-gateway ×2, request-access ×2) y 10 distintas
(blueprint-desktop, decision-card-desktop, history-desktop, history-mobile, m1-guided-review-desktop/mobile,
m1-needs-review-desktop/mobile, m1-workspace-desktop/mobile) por el menú aprobado de Fase 4, la tarjeta «Tu
prioridad» de Inicio y datos variables de la demo (fecha, nombre de marca). Capturas canónicas sin actualizar,
pendientes de decisión humana que nombre los archivos.

**Navegación (PHASE4_SPEC §3):** siete entradas (Inicio, Estrategia, Productos y servicios, Marketing, Marca y
recursos, Colaboración, Resultados); Validación y Mapa estratégico pasan a subapartados de Estrategia, plegados con
las nueve decisiones; el grupo sigue al área actual (abierto dentro de Estrategia, plegado fuera) y se alterna a mano;
Marca y recursos, Colaboración y Resultados como «Próximamente» sin destino; pie: Mi aprendizaje, Configuración de
marca, Ayuda. Iconos de línea nuevos para Marca y recursos y Colaboración (sprite de la app; Brand Master intacto).
En 1366×768 el menú cabe sin desplazamiento con el grupo plegado (prueba nueva).

## 2026-10-10 · PHASE 4 · bloque 3 · PLN-001…003, calendario y regresión completa

Sobre `e33b343` más cambios sin commit (árbol de trabajo exacto `217ac4d7ada20ad662372f428507d299a6a20b32`, calculado
con `git write-tree` sobre un índice temporal, archivos nuevos incluidos). Sin push ni deploy; producción sin cambios.
Migración aditiva `0021` aplicada sólo a la base de pruebas efímera y al perfil aislado `rc1-smoke`.

**Hecho:**
- Versión compartida del plan (`PlanSnapshot`, schema `plan-snapshot` v1): copia fija con objetivos activos y acciones
  no canceladas (revisión de cada una), huella; una en revisión a la vez; aprobación o cambios sobre versión + huella
  exactas, con criterio y clave idempotente (`plan_snapshot_approvals` append-only); aprobar una nueva reemplaza la
  anterior; nunca una más antigua. Editar el plan no cambia lo compartido y se muestra «Hay cambios que el cliente aún
  no ve». Base de datos: copia inmutable, transiciones sólo hacia delante, decisión inmutable.
- Avance (`plan_progress_updates`, append-only): cambiar el estado de una acción incluida en la versión aprobada
  comparte el avance (fecha y nota opcional de 280 caracteres) sin nueva aprobación; acciones añadidas después no se
  ven hasta otra versión. «Lo que recibe el cliente»: vista de sólo lectura de la versión aprobada y su avance.
- Calendario con los mismos registros de acción (sin copias): cuadrícula mensual en pantallas amplias y agenda en
  móvil, navegación por mes con foco conservado; responsables, estados y fechas iguales en las vistas por prioridad,
  por mes y calendario.
- Invitados: aún no existen (portal, invitaciones y comentarios llegan con ADR-0033 en Colaboración). La lectura del
  cliente está separada para que el portal la use; hoy sólo ADMIN o MEMBER asignado la leen (otro workspace → 404,
  miembro no asignado → 403, otra marca → sin datos). Comentarios: no existen todavía.

**Comprobado sobre ese mismo árbol (salida real, secuencial, un worker):** typecheck PASS; lint PASS; Foundation 0
errores (35 schemas); `git diff --check` limpio; pnpm test 19 archivos / 415 PASS; **test:e2e 240 pruebas: 227 PASS ·
13 SKIP intencionales · 0 FAIL** (wide 47/1, desktop 47/1, compact 47/1, tablet 43/5, mobile 43/5; los mismos 13
omitidos por tamaño de pantalla ya documentados); test:visual 10 PASS · 1 SKIP sin diferencias (capturas canónicas
intactas); UI validator PASS; **test:pilot:e2e 10/10**.

**Pendiente del bloque 3:** entregables, navegación a siete entradas, Brando marketing; portal de invitado y
comentarios en el bloque de Colaboración.

## 2026-10-10 · PHASE 4 · bloque 3 · revisión de seguridad de ofertas y Plan de Marketing

Sin commit todavía sobre `a34e950`; sin push ni deploy; producción sin cambios. Migraciones aditivas `0019` (plan) y
`0020` (endurecimiento de ofertas) aplicadas sólo a la base de pruebas efímera y al perfil aislado `rc1-smoke`.

**Revisión de seguridad de ofertas** (propia + revisión independiente de sólo lectura; sin BLOCKER ni HIGH). Corregido,
con regresiones en `tests/offers-cases.ts`:
- Revisión obligatoria en borrador, envío, nueva versión y retiro: omitirla ya no salta el 409 (INV-009).
- Una oferta retirada no admite envío ni decisión; aprobar una versión anterior a la aprobada vigente → 409 (nunca dos
  APPROVED ni retroceso del puntero).
- Decisión idempotente (INV-010): clave obligatoria, registro append-only `offer_approvals` (versión, huella, actor,
  resultado); un reintento devuelve lo registrado en lugar de 409. El frontend reutiliza la clave al reintentar.
- Auditoría con la versión afectada y la reemplazada o de origen; `OFFER_APPROVE` / `OFFER_REQUEST_CHANGES`; el criterio
  sólo se registra en una decisión y ya validado (antes cualquier operación copiaba texto del cliente).
- Base de datos (`0020`): sólo transiciones hacia delante, decisión y envío registrados inmutables, identidad de la
  versión inmutable. Creación concurrente con la misma clave → repetición, no error.
- Comprobado sin cambios: alcance por workspace y marca, miembro no asignado o inactivo → 403, ids de otra marca → 404,
  invitados sin acceso (no tienen membresía), escape de todo el contenido mostrado, límites de entrada.

**Plan de Marketing** (Marketing → Plan de Marketing; PHASE4_SPEC §4.2): plan por marca y año con periodo de 90 días,
objetivos del año y prioridades de 90 días (con cómo se miden), acciones con tipo comercial (exige una oferta activa de
la marca) o institucional, responsable, fechas, presupuesto con moneda y certeza («estimado» visible), indicador y
estados PLANNED → IN_PROGRESS → DONE / CANCELLED. Revisión numerada por registro (409), creación idempotente, registro
de cambios append-only, auditoría `PLAN_*`, guía de «lo que falta» sin exigir la estrategia completa, vista por
prioridad y por mes. La entrada lateral «Plan de marketing · Próximamente» pasa a «Marketing» (destino real); Redes
sociales, Sitio web y Campañas digitales se nombran como próximos, sin botones. Inicio enlaza la prioridad «Organizar
mi marketing». Pruebas de navegación unitarias y de navegador actualizadas a este estado aprobado.

**Comprobado (salida real, ejecución secuencial con un worker):** typecheck PASS; lint PASS; Foundation 0 errores (34
schemas); pnpm test 19 archivos / 407 PASS; E2E afectadas en los 5 proyectos: `phase4-plan` 5/5, `phase4-offers` +
`phase4-priority` + `micro-hotfix` 45/45, navegación de `workspace.spec` 5/5; test:visual 10 PASS · 1 SKIP sin
diferencias; UI validator PASS.

**Pendiente:** instantánea compartida del plan y avance (`PlanSnapshot`, `PlanProgressUpdate`; PLN-001…003); vista de
calendario; test:e2e completa y test:pilot:e2e sobre este código; entregables, navegación a siete entradas y Brando
marketing.

## 2026-10-10 · PHASE 4 · bloque 3 · regresión completa sobre `25a763c`

Ejecutada por separado y con un solo worker, sin otras comprobaciones pesadas simultáneas, contra el perfil aislado
`rc1-smoke` (3001), sobre el código del commit de resguardo `25a763c` (sin push ni deploy):

- **test:e2e 230 pruebas: 217 PASS · 13 SKIP intencionales · 0 FAIL**, proyecto a proyecto: wide 45/1, desktop 45/1,
  compact 45/1, tablet 41/5, mobile 41/5. En `wide` falló al principio «Navigation: Estrategia group…» porque
  `tests/browser/workspace.spec.ts` seguía exigiendo «Productos y servicios» como «Próximamente». Se actualizó al
  estado aprobado (ADR-0030; Marketing y Resultados siguen anunciados y no navegables; Productos abre su pantalla), sólo
  en la prueba, y se repitió en los 5 proyectos: 5/5. Cambio de prueba posterior al commit, aún sin commit.
- **test:visual 10 PASS · 1 SKIP**, sin diferencias; capturas canónicas sin tocar.
- UI validator PASS; **test:pilot:e2e 10/10**.
- Memoria: el corte del sistema había detenido el PostgreSQL del perfil aislado y el de la base local por defecto
  (ambos iniciados por esta sesión); se detuvieron sólo esos procesos huérfanos y se relanzaron. Ningún proceso ajeno
  se tocó.

**Alcance de la evidencia:** código de `25a763c` más el ajuste posterior de `tests/browser/workspace.spec.ts` (sólo
prueba). **13 SKIP intencionales, todos por tamaño de pantalla** (`test.skip` declarado en la prueba): wide, desktop y
compact omiten «Mobile: navigation and tools are drawers…» (sólo por debajo de 1001 px), 3 en total; tablet y mobile
omiten, cada uno, «Right rail: one tool at a time…», «Left navigation collapses to icons…», «The nine strategy nodes
are joined by one fine vertical line…» (`workspace.spec.ts`), «C · panels collapse independently into Focus Mode…»
(`phase2.spec.ts`) y «E · Brando shows the proposed alternative first…» (`phase3-closure.spec.ts`), porque por debajo
de 1001 px esos paneles son cajones cubiertos por las pruebas móviles; 10 en total.

Pendiente antes de cerrar el bloque 3: revisión de seguridad de los endpoints de ofertas; plan anual, entregables,
navegación a siete entradas y Brando marketing.

## 2026-10-10 · PHASE 4 · bloque 3 en curso (prioridad y ofertas) · regresión completa pendiente

PHASE 4 · BLOCK 3 IN PROGRESS · NOT RELEASE-READY. Rama `feat/phase4-marketing-web-collaboration` sobre `f3e370e`.
Sin push, PR ni deploy; producción sin cambios. Migración aditiva `0018` aplicada sólo a la base de pruebas efímera y
al perfil aislado `rc1-smoke`.

**Hecho en el bloque 3:**
- Pregunta «¿Qué te gustaría trabajar primero con tu marca?» en el alta (opcional) y en Inicio («Tu prioridad»,
  cambio append-only), con orientación determinista y áreas aún inexistentes nombradas sin botón falso.
- Productos y servicios (ADR-0030, PHASE4_SPEC §4.1): migración `0018` (`offers`, `offer_versions`; CHECK de estados
  y huella; trigger que congela contenido y huella fuera de DRAFT e impide borrar versiones salvo cierre de marca),
  schema `offer-version` v1, dominio `src/domain/offers.ts`, aplicación `src/application/offers.ts`, endpoints
  GET `/api/offers` y POST `/api/offers/{create,draft,submit,decide,new-draft,retire}` bajo `withBrandActor`
  (alcance, revisión 409, idempotencia, auditoría). Vista con borrador → revisión → aprobación con criterio, nueva
  versión sin tocar la aprobada, precio opcional («Estimado, no confirmado»), huecos y «Origen actualizado» como
  proyección. La entrada del menú deja de ser «Próximamente»; `tests/pre-tester.test.ts` se actualiza a ese estado
  aprobado (Marketing y Resultados siguen «Próximamente»; se añade que Productos es destino real).

**Comprobado (salida real, código de este punto):** typecheck PASS; lint PASS; Foundation 0 errores (32 schemas);
`git diff --check` limpio; UI validator PASS (antes de ofertas); pnpm test 18 archivos / 396 PASS; E2E nuevas en los 5
proyectos: `phase4-priority` 10/10 y `phase4-offers` 5/5. Regresión visual 10 PASS · 1 SKIP con la pregunta de
prioridad, antes de habilitar Productos.

**Pendiente:** test:e2e completa y test:visual sobre este código (la ejecución anterior se detuvo por memoria baja del
equipo tras 7 pruebas en verde; se repite por separado con un worker). Capturas canónicas conservadas: cualquier
diferencia se presentará con comparación y nombres de archivo antes de pedir actualización. test:pilot:e2e, UI
validator y revisión de seguridad de los endpoints de ofertas por repetir antes del cierre del bloque. Siguiente:
plan anual con instantánea y avance, entregables, navegación a siete entradas y Brando marketing.

## 2026-10-10 · PHASE 4 · bloque 2 cerrado con E2E completa

Commit local de resguardo `f3e370e` (sobre `1f1cece`; sin push ni deploy) con la aprobación y el bloque 2, que dejó
constancia de E2E pendiente. Después, por precisión del propietario sobre C1: una credencial sólo es evidencia si el
**proveedor** confirma que ya no la acepta para ese intento; se eliminó la rama que aceptaba una caducidad registrada
sólo en Brandopolis y se añadió una prueba (registro local ignorado; confirmación del proveedor + ventana → ausencia
confirmada → liberación humana → un solo envío). ADR-0031 (nota de implementación), schema y dominio alineados.

Comprobaciones sobre el código definitivo (salida real): typecheck PASS; lint PASS; Foundation 0 errores;
`skills:check` idéntico; `git diff --check` limpio; pnpm test 17 archivos / 387 PASS; **test:e2e 215 pruebas
completas: 202 PASS · 13 SKIP intencionales · 0 FAIL** (mismo resultado que la base de Fase 3), ejecutadas proyecto a
proyecto con un solo worker contra el perfil aislado `rc1-smoke` (3001) para limitar memoria: wide 42/1, desktop
42/1, compact 42/1, tablet 38/5, mobile 38/5. test:pilot:e2e 10/10 sobre el código del commit (la precisión C1 posterior
no toca flujos PILOT). Ningún proceso ajeno se detuvo. Operaciones reales con proveedores: pendientes de acceso y de
la comprobación contra la versión exacta de campaña (bloque 8). Siguiente: bloque 3.

## 2026-10-10 · PHASE 4 · APROBADA · bloque 2 (datos, autoridad, conexiones, ejecución externa) en curso

PHASE 4 · SCOPE APPROVED · BLOCK 2 IN PROGRESS · NOT RELEASE-READY. Rama `feat/phase4-marketing-web-collaboration`,
base `1f1cece05b168b00e43ea62c6f9a2581039ad02f`, sin commits. Sin commit, push, PR, deploy ni operaciones con
proveedores; migraciones sólo en bases de desarrollo/prueba locales. Producción sin cambios.

**Aprobación del propietario (2026-10-10 14:49, America/Mexico_City; paquete BP-P4-V4-APROBADA-20261010 sobre el
candidato v4 `c211b914…d8f9e124`):** ADR-0030…0034 aceptados (ADR-0031 con el ajuste C1 final incorporado: la
repetición exige evidencia verificable de que el intento no puede emitir, resultado remoto resuelto después y
autorización vigente; ningún trabajo nuevo la elude). Incluidos: inicio guiado completo, dominio propio del cliente,
invitaciones por email con enlace alternativo y controles de consentimiento. Desarrollo, DEMO y migraciones aditivas
autorizados sólo en desarrollo/ensayo (decisión humana nueva exigida por CLAUDE.md § Pilot freeze, punto 4).
Registrada en scope-mvp, ADR (Status accepted + historial), PHASE4_SPEC v5 §10–§11, matriz y requisitos externos.

**Bloque 2 implementado (evidencia: pruebas automáticas con simulador; ninguna verificación con proveedor):**
- Migraciones aditivas `0016` (capacidades por marca, prioridad de trabajo, conexiones, vínculos de cuenta,
  autorizaciones, trabajos, pasos, intentos y evidencias, instancias de worker; CHECK y triggers append-only con la
  relajación acotada de `0015`) y `0017` (liberaciones humanas por intento; un trabajo abierto por campaña). Ninguna
  tabla existente se modifica. Aplicadas sólo a la base de pruebas efímera y al perfil aislado `rc1-smoke`.
- Schemas v1 nuevos (fuente de estados): work-priority, brand-capability, editorial-version,
  operation-authorization, external-job, external-attempt-outcome.
- Dominio puro: versiones editoriales con tres punteros, capacidades por marca, prioridad de trabajo, máquinas de
  estado y regla C1 de operaciones externas. Aplicación: `Engine.withBrandActor`, prioridad de trabajo y capacidades
  (endpoints GET/POST `/api/brands/work-priority` y `/api/brands/capabilities`), almacén de credenciales AES-256-GCM,
  adaptador de proveedor con simulador, cola con concesión, intentos por paso, conciliación fuera de transacción,
  liberación humana, supervisor de procesos y guarda de eliminación de marca.
- Revisión de seguridad independiente del diff: 1 BLOCKER, 3 HIGH, 4 MEDIUM y varios LOW, **todos corregidos** con
  pruebas de regresión (EXT-022…026, DEL-006); pendientes declarados: huella de contenido contra la versión de
  campaña (bloque 8), entrega a terceros y recorrido `BrandClosure` completo.
- Las pruebas que fijaban el número de migraciones se actualizaron de 16 a 18, como hizo la Fase 3 con 14 → 16.

**Comprobaciones ejecutadas (salida real, código definitivo):** typecheck PASS; lint PASS; Foundation 267
Markdown / 85 JSON / 31 schemas / 15 requirements / 13 golden cases / 0 errores; `skills:check` idéntico;
`git diff --check` limpio; pnpm test 17 archivos / 386 PASS; test:pilot:e2e 10/10 PASS. **test:e2e: NO COMPLETADO**
sobre el código definitivo: Claude Code detuvo las tareas en segundo plano por falta de memoria del sistema
(≈0,6 GB libres de 7,8 GB) antes de ejecutar sus 215 pruebas; una pasada anterior, con código previo a las
correcciones de seguridad, se detuvo a propósito a mitad y no cuenta como evidencia. test:visual y validadores de
UI no aplican (sin cambios de presentación). Pendiente: repetir test:e2e cuando haya memoria disponible.

## 2026-10-10 · PHASE 4 · especificación v4 tras el dictamen v3 (precisiones C1, C3 y pregunta inicial)

PHASE 4 · SPECIFICATION v4 PROPOSED · NO PRODUCT CODE · NOT RELEASE-READY. Misma rama y base
(`1f1cece05b168b00e43ea62c6f9a2581039ad02f`), sin commits; antes de editar el árbol contenía los 21 archivos del
candidato v3 (ZIP `2170d436…eed6f8d1`, el revisado). Sin commit, push, PR, migración, dependencia ni deploy;
ningún registro, solicitud o envío a proveedores. ADR-0030…0034 siguen `proposed`.

Entrada: dictamen v3 del revisor (C2 y C4 resueltos; precisiones en C1 y C3) e instrucciones actualizadas.
Cambios: ADR-0031 v4 (inicio lógico del intento en `DISPATCHING`, plazo de envío y ventana de cierre con riesgo
residual declarado, repetición humana sólo con evidencia remota), ADR-0032 v4 (`MeasurementCompatibility` para
publicaciones compatibles), ADR-0030 v3 (única dependencia nueva: `BrandWorkPriority`), PHASE4_SPEC v4, matriz v4.

**Corrección fechada de la entrada v3 de hoy:** allí la pregunta inicial figuraba como parte de una propuesta
pendiente. Es un **requisito confirmado** por el propietario: preguntar qué quiere trabajar primero la persona,
guardar la prioridad con su marca, adaptar preguntas y siguiente acción y permitir cambiarla, con el formulario
actual de alta (PHASE4_SPEC §4.9; INT-001…008, alcance base; esfuerzo dentro del bloque 3 sin cifra nueva). Sigue
**propuesto** el inicio guiado completo (§4.10). La entrada v3 no se reescribe.

Comprobaciones ejecutadas ahora sobre el candidato v4 (salida real): Foundation 267 Markdown / 77 JSON / 25
schemas / 15 requirements / 13 golden cases / 0 errores; `skills:check` idéntico (skills sin cambios en v4);
typecheck PASS; lint PASS; pnpm test 16 archivos / 346 PASS; git diff --check limpio. Matriz v4: 9 recorridos y
109 criterios (118 identificadores únicos), todas las pruebas pendientes; suites de navegador no aplicables.

## 2026-10-10 · PHASE 4 · especificación v3 tras el dictamen v2 (C1–C4) e inicio guiado propuesto

PHASE 4 · SPECIFICATION v3 PROPOSED · NO PRODUCT CODE · NOT RELEASE-READY. Misma rama y base
(`1f1cece05b168b00e43ea62c6f9a2581039ad02f`), sin commits; antes de editar el árbol contenía los 21 archivos del
candidato v2. Sin commit, push, PR, migración, dependencia ni deploy; ningún registro, solicitud o envío a
proveedores. ADR-0030…0034 siguen `proposed`.

Entrada: dictamen v2 del revisor sobre el ZIP `86a2b5e5…7ea8c8` (diseño favorable de ADR-0030, ADR-0033 y
ADR-0034; ajustes C1–C3 en ADR-0031/0032 y C4 en la estimación) y petición del propietario del 2026-10-10 de
incorporar una pregunta inicial sobre qué quiere lograr el usuario. Cambios sólo en ADR-0031, ADR-0032,
PHASE4_SPEC, PHASE4_ACCEPTANCE_MATRIX y PHASE4_EXTERNAL_REQUIREMENTS (tabla C1–C4 en PHASE4_SPEC §9). El inicio
guiado (con «¿Qué quieres lograr?» como paso 0, reutilizando el alta actual y el contexto declarado de ADR-0025)
queda como **propuesta pendiente** de inclusión; también siguen pendientes dominio propio, modalidad de
invitación, política de consentimiento y dominio de sitios. Estimación corregida: pendiente 43–63 sesiones; total
45–65 con el bloque 1; propuestas aparte (dominio propio 3–5, inicio guiado 4–6).

Comprobaciones ejecutadas ahora sobre el candidato v3 (salida real): Foundation 267 Markdown / 77 JSON / 25
schemas / 15 requirements / 13 golden cases / 0 errores; `skills:check` idéntico (skills sin cambios en v3);
typecheck PASS; lint PASS; pnpm test 16 archivos / 346 PASS; git diff --check limpio. Pruebas nuevas de la matriz:
todas pendientes; suites de navegador no aplicables (sin runtime).

## 2026-10-10 · PHASE 4 · especificación v2 tras la revisión R01–R10

PHASE 4 · SPECIFICATION v2 PROPOSED · NO PRODUCT CODE · NOT RELEASE-READY. Misma rama
`feat/phase4-marketing-web-collaboration`, base `1f1cece05b168b00e43ea62c6f9a2581039ad02f`, sin commits; antes de
editar se comprobó que el árbol contenía exactamente los 18 archivos del candidato v1 y que el ZIP revisado tenía
el SHA-256 citado por el informe (`4de4fecb…ffe14`). Sin commit, push, PR, migración, dependencia ni deploy;
ningún registro, solicitud o envío a proveedores. ADR-0030…0034 siguen `proposed`.

Entrada: informe del propietario «Brandopolis_Fase4_Revision_ADR_2026-10-10» (dictamen: correcciones antes de
aceptar), instrucciones actualizadas y documento de decisiones del mismo día, que añaden la identidad visual de
cada marca a esta fase. Resolución por punto en [PHASE4_SPEC §9](docs/15-handoff/PHASE4_SPEC.md). Nuevo
[ADR-0034](docs/14-decisions/ADR-0034.md) (identidad visual y kit, siguiente número libre comprobado). El dominio
propio del cliente queda como recomendación pendiente de revisión, no como decisión del propietario.

Procedencia (R10): la Fase 3 desplegada en PILOT, las 43 marcas y la aceptación del propietario proceden del
handoff externo del propietario (2026-10-09, no incluido en el repositorio) y de su confirmación del 2026-10-10;
no son verificaciones de esta sesión.

Comprobaciones ejecutadas ahora sobre el candidato v2 (salida real): Foundation 267 Markdown / 77 JSON / 25
schemas / 15 requirements / 13 golden cases / 0 errores; `skills:check` idéntico tras `skills:sync`; typecheck
PASS; lint PASS; pnpm test 16 archivos / 346 PASS (incluye skill-pack); git diff --check limpio. Las pruebas
nuevas de la matriz de Fase 4 siguen **todas pendientes**; las suites de navegador no aplican (sin runtime).

## 2026-10-10 · PHASE 4 — MARKETING, SITIOS WEB Y COLABORACIÓN · STARTED · especificación (iteración 4 de 6)

PHASE 4 · SPECIFICATION PROPOSED · NO PRODUCT CODE · NOT RELEASE-READY. Rama
`feat/phase4-marketing-web-collaboration` creada desde `main` = `origin/main` =
`1f1cece05b168b00e43ea62c6f9a2581039ad02f` (árbol limpio al empezar). Sin commit, push, PR, migración, dependencia
ni deploy. Producción sin cambios por parte de esta sesión; Jury Production Freeze vigente.

Fuente del propietario (2026-10-10, no verificada por el agente): la Fase 3 se desplegó en PILOT en una
conversación anterior y el propietario confirmó su aceptación visual y funcional integral. Este archivo no
contiene el registro de ese despliegue (SHA, migraciones aplicadas, verificación posterior): **pendiente de
evidencia**. La entrada del 2026-10-09 («Producción sin cambios») describe su momento y no se reescribe. Los
conteos históricos (16 migraciones, 43 marcas) se contrastarán al preparar un despliegue futuro.

Alcance confirmado: 1A (agencias y consultores), 2C (sitios multipágina con IA, editables y publicables), 3C
(Google Ads y Meta Ads por API con confirmación humana por operación de publicación o gasto). Documentos:
[PHASE4_SPEC](docs/15-handoff/PHASE4_SPEC.md), [matriz](docs/15-handoff/PHASE4_ACCEPTANCE_MATRIX.md),
[requisitos externos](docs/15-handoff/PHASE4_EXTERNAL_REQUIREMENTS.md), [ADR-0030](docs/14-decisions/ADR-0030.md)–
[ADR-0033](docs/14-decisions/ADR-0033.md) (proposed). Contradicción con non-goals/scope-mvp resuelta por la
decisión del propietario y registrada como Resolución 2026-10-10. Skill brandopolis-brando conciliada con
ADR-0025/0026 (B2/B3; B4/B5 sin autorizar).

Comprobaciones de esta sesión: Foundation antes de los cambios 259 Markdown / 77 JSON / 25 schemas / 15
requirements / 13 golden cases / 0 errores; `skills:check` idéntico antes y después de `skills:sync`. Después de
los cambios (salida real): Foundation 266 Markdown / 77 JSON / 25 schemas / 15 requirements / 13 golden cases /
0 errores; typecheck PASS; lint PASS; pnpm test 16 archivos / 346 PASS (incluye skill-pack); git diff --check
limpio. Suites de navegador no aplicables (sin cambios de runtime).

## 2026-10-09 · PHASE 3 — VALIDATION & LEARNING ENGINE · COMPLETE (iteración 3 de 6)

PHASE 3 COMPLETE · todos los gates en verde, incluido Live AI sobre el código final · integrada en `main` mediante
el PR #9 (el SHA exacto del merge queda en GitHub). Producción sin cambios; Jury Production Freeze vigente.
Roadmap: Fase 1 COMPLETE · Fase 2 COMPLETE · Fase 3 COMPLETE · Fase 4 READY TO START — NOT STARTED · Fases 5 y 6
NOT STARTED.

Implementado en este cierre (adenda de [ADR-0028](docs/14-decisions/ADR-0028.md) y
[ADR-0029](docs/14-decisions/ADR-0029.md)): fondos más claros; progreso de Inicio clicable (nueve segmentos,
mouse/teclado/touch); Inicio prioriza la estrategia sobre la validación opcional; coherencia con frase respaldada
por el motor; revisión de decisiones afectadas con causa, decisión vigente y origen antes de las opciones; Brando
con la alternativa primero, en negritas y «Sin aprobar»; Validación como camino opcional en cuatro pasos;
**defecto del selector de aprendizaje corregido** (sin aprendizaje elegible ya no se muestra un selector vacío y
deshabilitado: mensaje, causa y acción; con elegibles, elección explícita y detalle); Mapa con tarjetas blancas;
**Configuración de marca → Zona de peligro → Eliminar marca** (ADMIN, nombre exacto, idempotente, transaccional,
purga de archivos con FILES_PENDING y reintento; reflexiones y analítica conservadas y desvinculadas; migración
0015 con relajación acotada de los triggers de historia sólo dentro de una eliminación registrada).
Handoff: [PHASE4_HANDOFF](docs/15-handoff/PHASE4_HANDOFF.md).

Gates sobre el código final (servidor de desarrollo 127.0.0.1:3007, base aislada propia 55438): typecheck PASS;
lint PASS; pnpm test 16 archivos / 346 PASS; skills:check PASS; Brando browser 42/42; test:e2e completa
202 PASS · 0 FAIL · 13 SKIP intencionales (repetida completa tras el último cambio, que fue sólo de prueba:
navegación con «Configuración de marca»); test:visual 10 PASS + 1 SKIP preexistente (11 capturas canónicas
regeneradas a propósito y sus hashes actualizados); test:pilot:e2e 10/10; Foundation 0 errores; validador UI PASS;
validador de marca PASS; git diff --check limpio; escaneo de secretos limpio. Revisión de seguridad independiente
del diff completo: 0 BLOCKER/HIGH/MEDIUM; LOW documentados en ADR-0029.
LIVE AI sobre el código final: PASS. DEMO 127.0.0.1:3005 (`--live-ai`, base y sesión propias; clave introducida
por el propietario en una ventana oculta, sólo en memoria del proceso), modelo `claude-opus-5-5` confirmado por la
API de modelos de Anthropic; `pnpm demo:live-ai-ui` A–E PASS con 2 llamadas reales (generación de posibilidades y
Brando B3), proveedor ANTHROPIC sin error, propuestas sin aprobar y ninguna estrategia modificada.
Preflight GitHub: el repositorio no tiene workflows de Actions ni rulesets; producción no contiene las Fases 1 y 2
aunque ya están en `main`, por lo que integrar en `main` no despliega automáticamente.

## 2026-10-08 · PHASE 3 — REFINAMIENTO UX/UI + BRAND BOOK · candidata local

PHASE 3 · LOCAL CANDIDATE · NOT RELEASE-READY (live AI gate y aprobación humana pendientes). Rama
feat/phase3-validation-learning-engine sobre 9b656af, cambios sin commit. Sin push, sin merge, sin deploy, PR #9
sin actualizar, Phase 4 no iniciada. Producción sin cambios; Jury Production Freeze vigente.

Implementado: ADR-0026 (continuación: ciclo continuo de hipótesis, procedencia por prueba de un solo uso,
revisión de aprendizajes con 409, reflexiones personales privadas · migración 0014, modo local `--live-ai`),
[ADR-0027](docs/14-decisions/ADR-0027.md) (Strategic Workspace) y [ADR-0028](docs/14-decisions/ADR-0028.md)
(tokens de tipografía/espaciado/paleta, símbolo premium canónico, línea vertical del recorrido, Brando como tarjeta
auxiliar después de la tarjeta principal, Mapa estratégico ejecutivo rediseñado y Brand Book integral nuevo en
`GET /api/brandbook/pdf`). Traspaso: [PHASE3_LOCAL_CANDIDATE_2026-10-08](docs/15-handoff/PHASE3_LOCAL_CANDIDATE_2026-10-08.md).

Gates (salida real, servidor de desarrollo del agente en 127.0.0.1:3005 sobre la DB DEMO aislada; el 3001 del
propietario no se tocó): typecheck PASS; lint PASS; pnpm test 16 archivos / 340 PASS (código final);
skills:check PASS; Brando browser 32/42 en la pasada completa → causa: la tarjeta auxiliar dejó de nombrar su
sección; corregido (la orientación vuelve a nombrarla) → 42/42 PASS sin tocar las pruebas; test:e2e completa
174 PASS + 11 SKIP intencionales (antes de esa corrección de una línea de presentación) y re-ejecución de
workspace/micro-hotfix/phase3 en los 5 viewports con el código final 96 PASS + 9 SKIP intencionales;
test:visual 10 PASS + 1 SKIP preexistente (capturas canónicas regeneradas a propósito: 17 archivos, hashes
actualizados en `specs/brand-assets.json`); test:pilot:e2e 10/10 PASS; Foundation 0 errores; validador UI PASS;
validador de marca PASS; git diff --check limpio. QA de PDF: texto extraído y páginas renderizadas con pdf.js
(escenarios A/B/C, índice con páginas reales, marcadores). Revisión de seguridad independiente de los
documentos: sin hallazgos HIGH/MEDIUM; tres LOW corregidos (el Brand Book no registra `blueprint_viewed`,
límites en el decodificador PNG, hipótesis rechazadas en apartado propio).
LIVE AI: NOT RUN (no hay `ANTHROPIC_API_KEY` ni `ANTHROPIC_MODEL` en el entorno del agente; requiere que el
propietario arranque `--live-ai`). Commit local pendiente de ese gate y de la aprobación humana.

## 2026-10-07 · PHASE 3 — VALIDATION & LEARNING ENGINE · candidato

PHASE 3 — VALIDATION & LEARNING ENGINE · IMPLEMENTATION COMPLETE · AUTOMATED VALIDATION COMPLETE ·
HUMAN REVIEW PENDING · RELEASE CANDIDATE OUTSIDE PRODUCTION. Rama feat/phase3-validation-learning-engine desde
main 32f98d2. Sin merge, sin deploy, sin tag, sin migración. Phase 4 no iniciada.

Implementado ([ADR-0026](docs/14-decisions/ADR-0026.md)): ciclo de vida de hipótesis 2.0 sólo humano
(criterio, aprendizaje aceptado para estados resueltos, 409, idempotencia, auditoría); diseño de experimento
(método, criterio que refuta, periodo, límites) con calidad de plan determinista; señales con dirección;
aprendizaje editable mientras está pendiente, rechazo con criterio, qué apoya / qué no / alternativas;
procedencia manual/asistida determinada por el servidor; impacto de validación como atención de Strategic
Intelligence (`VALIDATION_CHALLENGES_DECISION`, sin reescritura ni segundo motor); siguiente validación
recomendada; Brando B3 (prompt v6, aprendizajes candidatos `CANDIDATE_NOT_ACCEPTED`); Validation Workspace;
Mapa/PDF con estado de hipótesis; telemetría nueva; invariantes VAL-001..010. Defecto corregido: `ownerUserId`
ya no llega al proveedor de IA.

Gates (salida real, DEMO aislada en 3001 con el código final): typecheck PASS; lint PASS; pnpm test 15
archivos / 320 PASS (incluye regresión tras el cambio de procedencia); skills:check PASS; Brando browser 42/42
PASS; test:e2e 126 PASS + 2 FAIL en la pasada completa (flujo 4 de Phase 3 en desktop por espera insuficiente
en la prueba; possibilities-handoff en compact con 59 min de bloqueo del equipo) → ambos re-ejecutados en los
5 viewports 10/10 PASS tras esperar el render en la prueba; flujos Phase 3 + Phase 2 tras el último ajuste de
texto 43 PASS + 2 SKIP intencionales; test:visual 10 PASS + 1 SKIP preexistente; test:pilot:e2e 10/10 PASS;
Foundation 0 errores; validador UI PASS; validador de marca PASS; git diff --check limpio. 11 capturas de
referencia actualizadas. Revisión de seguridad independiente: sin hallazgos explotables.
LIVE BRANDO SMOKE: NOT RUN (sin clave en el entorno del agente). Producción sin cambios; Jury Production
Freeze vigente.

Deuda técnica: `reviewHypothesis` filtra las señales de la marca en memoria y la verificación de procedencia
lee la telemetría de la marca (diferido por el propietario; volúmenes de piloto pequeños).

## 2026-10-07 · PHASE 2 — STRATEGIC INTELLIGENCE · COMPLETE

PHASE 2 — STRATEGIC INTELLIGENCE · STATUS: COMPLETE · OWNER ACCEPTED · RELEASE-READY OUTSIDE PRODUCTION.
Aprobación humana del propietario (2026-10-07): «todo está validado vamos con la fase 3 completa».
Commit final de la candidata: 37723e10460a6b1c507f9d4350e27eefd6d46d2c (PR #8), integrado a `main` con merge
commit junto con este registro de cierre. Pruebas registradas en la entrada anterior (pnpm test 301/301,
E2E 108 + 2 SKIP intencionales, Brando browser 42/42, visual 10 + 1 SKIP, PILOT 10/10, Foundation 0 errores).
LIVE BRANDO SMOKE: NOT RUN · OWNER ACCEPTED RESIDUAL VALIDATION GAP. La aceptación elimina el bloqueo de
integración; no convierte la prueba no ejecutada en PASS. Producción sin cambios; Jury Production Freeze vigente.
Siguiente: PHASE 3 — VALIDATION & LEARNING ENGINE.

## 2026-10-07 · PHASE 2 — STRATEGIC INTELLIGENCE · candidato

PHASE 2 — STRATEGIC INTELLIGENCE · IMPLEMENTATION COMPLETE · AUTOMATED VALIDATION COMPLETE ·
HUMAN REVIEW PENDING · BLOCKED FOR HUMAN SMOKE (contrato de IA v5 cambiado; smoke en vivo NOT RUN, sin
credencial en el entorno del agente). Rama feat/phase2-strategic-intelligence desde main dbce050. Sin merge.

Implementado ([ADR-0025](docs/14-decisions/ADR-0025.md)): proyección determinista de Strategic Intelligence
(coherencia con evaluador separado de severidad, tensiones auditables, Change Impact 2.0 explicativo, memoria
estratégica 2.0, soporte de evidencia sin probabilidades); geografía declarada en DEMO y PILOT vía motor con
scope y auditoría; contexto de onboarding visible en Objetivo/Arena/Posicionamiento sin prellenar decisiones;
Brando copiloto estratégico (prompt v5, paquete con contexto declarado e issues etiquetados); superficie
«Inteligencia estratégica» en «Qué necesita atención» que sustituye la lista duplicada de revisiones; Mapa y
PDF con coherencia; patrón global de disclosures; paneles colapsables y Modo enfoque; token
--bp-brando-emerald. Sin migración ni cambios de proveedor/modelo; Phase 3 no iniciada.

Gates (salida real, servidor DEMO aislado en 3001): typecheck PASS; lint PASS; pnpm test 14 archivos /
301 PASS; skills:check PASS; Brando browser 42/42 PASS; test:e2e 108 PASS + 2 SKIP intencionales (paneles en
tablet/móvil usan drawer) tras corregir una duplicación de botones detectada en la primera pasada (103 PASS,
5 FAIL); test:visual 10 PASS + 1 SKIP preexistente; test:pilot:e2e 10/10 PASS; Foundation 251 / 73 / 24 /
15 / 13 / 0 errores PASS; UI validator PASS; brand validator PASS; git diff --check PASS. Evals
strategic-intelligence A–H PASS (deterministas). Revisión de seguridad: sin BLOCKER/HIGH/MEDIUM.
11 capturas del espacio de trabajo y hashes actualizados (superficie de inteligencia, controles de panel,
disclosures y Brando). Smoke Anthropic: NOT RUN. Producción sin cambios; Jury Production Freeze vigente.

## 2026-10-07 · PHASE 1 COMPLETE — Strategic Core + Brando Foundation

PHASE 1 — STRATEGIC CORE + BRANDO FOUNDATION · STATUS: COMPLETE ·
RELEASE STATE: RELEASE-READY OUTSIDE PRODUCTION. Aprobada funcionalmente por el propietario.

- 9/9 decisiones implementadas: Strategic Objective, Market Arena, Primary Customer, Value Mechanism,
  Positioning, Brand Promise, Core Message, GTM Priority, Priority Experiment (ADR-0021..ADR-0024).
- Brando B1 completo para el alcance de Phase 1; autoridad humana, versiones, historial, dependencias
  (config v5), Change Impact, Strategy Graph base, Mapa estratégico y PDF.
- Historia: 5927a26 (Objective + Arena) → a2f5d9b (Brand Promise) → b461cf5 (GTM Priority) → commit
  `feat: complete Strategic Core phase 1` que contiene este registro (Priority Experiment + cierre).
  Integrado a `main` mediante PR con merge commit; los SHA finales están en `git log` y en el PR.
- Auditoría de cierre: sin defectos funcionales nuevos; se añadió `tests/phase1-closure-cases.ts`
  (versionado de las cinco decisiones nuevas, 409 sin efectos, idempotencia y reintento, criterio
  obligatorio, aislamiento entre tenants/marcas/no asignados, INV-001 y mapa/PDF de nueve decisiones).
- Gates sobre el estado exacto confirmado (salida real): typecheck PASS; lint PASS; pnpm test 13 archivos /
  283 pruebas PASS; skills:check PASS; Brando browser 42/42 PASS; test:e2e 85/85 PASS; test:visual 10 PASS
  + 1 SKIP preexistente (encoding-proof histórico, requiere base reparada: NOT APPLICABLE); test:pilot:e2e
  10/10 PASS; Foundation 249 Markdown / 72 JSON / 24 schemas / 15 requirements / 13 golden cases / 0 errores
  PASS; UI validator PASS; brand validator PASS; git diff --check PASS (sólo avisos de fin de línea).
- Producción sin cambios; sin deploy, tag, migración ni cambios de configuración. Jury Production Freeze
  vigente. Las entradas anteriores que dicen «sin commit/push/merge» describen su momento: los commits de
  cada tramo existen y Phase 1 se integra a `main` con este cierre.
- NEXT PHASE: PHASE 2 — STRATEGIC INTELLIGENCE · STATUS: NOT STARTED / AWAITING NEXT ITERATION. Fuentes:
  [brand-intelligence-engine](docs/05-ai/brand-intelligence-engine.md), Master Context y ADR vigentes.
  La próxima iteración empieza con una auditoría de Phase 2 y la ejecuta como un solo loop.

## 2026-10-07 · Experimento prioritario: dependencia GTM aprobada

Estado: RELEASE-READY FUERA DE PRODUCCIÓN en lo técnico; aceptación humana en la DEMO pendiente.
Rama: feat/strategic-experiment-priority, HEAD b461cf5 (commit local de GTM). Cambios sin commit.
El director aprobó la opción A: `config/dependencies/v5.json` añade GTM Priority → Priority Experiment
(SOFT, primera versión revisable); v1–v4 intactas. ADR-0024, change-impact, strategy-graph y config/README
actualizados.

Resultados del agente (salida real): typecheck y lint PASS; pnpm test 279/279 (tres casos nuevos: un
cambio de GTM sugiere revisar Experimento prioritario; la sugerencia conserva decisión, versión activa,
historial y estado APPROVED; el impacto por varias conexiones no duplica revisiones y reintentar no añade
filas; más primera versión de GTM); E2E m1.spec 35/35; test:pilot:e2e 10/10; Foundation 249 Markdown /
72 JSON / 24 schemas / 15 requirements / 13 golden cases / 0 errores; UI y brand validators PASS;
skills:check idéntico; git diff --check OK. Sin cambios de interfaz ni capturas en este ajuste.
Jury Production Freeze vigente. Sin commit, push, PR, merge, tag, migración ni deploy.

## 2026-10-06 · Experimento prioritario · candidato fuera de producción

Estado: RELEASE-READY FUERA DE PRODUCCIÓN en lo técnico; aceptación humana en la DEMO pendiente.
Rama: feat/strategic-experiment-priority (local), desde el commit local de GTM
b461cf5c297cc284a2cb71e765e88ecf071eec3a (sobre a2f5d9b, 5927a26 y 77e7a71). Cambios sin commit. Sin push.

Implementado ([ADR-0024](docs/14-decisions/ADR-0024.md)): modules/learning-moments v5 (Priority Experiment como
novena sección, capacidad Experimentation & Learning); decisión versionada que elige qué supuesto validar
primero, ejecutada con el ciclo Experiment → Signal → Learning existente (enlace mediante «Decisión
relacionada»), sin duplicarlo; orientación local con hipótesis sin validar y supuestos en uso; guía del
editor; ejemplo DEMO y CoffeePolis sólo en sandboxes nuevos; activación explícita para marcas existentes;
densidad compacta del menú hasta 1040px y filas de 28px para nueve fases. Sin migración ni cambios de IA,
configuración o producción. dependencies v4 sin cambios. Decisión pendiente: dependencias de Priority
Experiment (recomendado GTM Priority → Priority Experiment SOFT).

Resultados del agente (salida real): typecheck y lint PASS; pnpm test 13 archivos / 276 pruebas (271 + 5);
Brando browser 42/42; test:e2e 85/85 (una medición previa detectó 32px de desborde del menú a 1366×768
con nueve fases, corregido antes de esta pasada); test:visual 10/10; test:pilot:e2e 10/10; Foundation 249
Markdown / 71 JSON / 24 schemas / 15 requirements / 13 golden cases / 0 errores; UI y brand validators
PASS; skills:check idéntico; git diff --check OK. 11 capturas del espacio de trabajo y sus hashes
actualizados por cambio real del menú. Smoke Anthropic no requerido (sin cambio de comportamiento de IA).
/security-review requiere commit: no se creó; revisión manual sin hallazgos (sin endpoint nuevo).
Jury Production Freeze vigente. Sin push, PR, merge, tag, migración ni deploy.

## 2026-10-06 · Prioridad de lanzamiento (GTM): cierre

Estado: RELEASE-READY FUERA DE PRODUCCIÓN. El director de producto aceptó GTM y aprobó Core Message →
GTM Priority (SOFT), incorporada como `config/dependencies/v4.json` (Positioning → GTM SOFT conservada).
Pruebas tras la incorporación (salida real): typecheck y lint PASS; pnpm test 271/271 (dos casos nuevos:
revisión sugerida sin reescritura ni duplicado en Positioning → Message → GTM, y primera versión de
Mensaje después de GTM); Foundation 0 errores; git diff --check OK. Las suites de navegador, visual y
PILOT del registro anterior no se repitieron: el cambio es de configuración y pruebas de motor.
Commit local autorizado de GTM en feat/strategic-gtm-priority. Sin push, PR, merge, tag ni deploy.
Jury Production Freeze vigente.

## 2026-10-06 · Prioridad de lanzamiento (GTM) y línea del recorrido · candidato

Estado: RELEASE-READY FUERA DE PRODUCCIÓN en lo técnico; aceptación humana en la DEMO pendiente.
Rama: feat/strategic-gtm-priority (local), desde el commit local a2f5d9bd749f91106ee7beff99da4569862e7f50
(Promesa de marca, ADR-0022), sobre 5927a26 y 77e7a71. Cambios de GTM sin commit. Sin push.
El commit local de Promesa se creó por autorización expresa del propietario; la aceptación de la DEMO
de Promesa y el smoke real de Anthropic no fueron confirmados al agente y no se registran como hechos.

Implementado ([ADR-0023](docs/14-decisions/ADR-0023.md)): modules/learning-moments v4 (GTM Priority como
octava sección, capacidad GTM Prioritization); se conserva la única dependencia aprobada Positioning →
GTM (SOFT) con dependencies v3 sin cambios; activación explícita para marcas existentes; orientación GTM
que advierte propuesta provisional si Cliente, Valor, Posicionamiento o Mensaje están en revisión; guía
del editor; ejemplo DEMO y CoffeePolis sólo en sandboxes nuevos; línea del recorrido con nodos, fase
siguiente con doble anillo, pulso finito y texto accesible, sin pulso con prefers-reduced-motion.
Sin migración ni cambios de IA, configuración o producción. Decisión pendiente: aristas adicionales
hacia GTM (recomendado Core Message → GTM SOFT).

Resultados del agente (salida real): typecheck y lint PASS; pnpm test 13 archivos / 269 pruebas (264 + 5
de GTM); Brando browser 42/42 (incluye línea del recorrido y movimiento reducido); test:e2e 85/85;
test:visual 10/10; test:pilot:e2e 10/10; Foundation 248 Markdown / 68 JSON / 24 schemas / 15
requirements / 13 golden cases / 0 errores; UI y brand validators PASS; skills:check idéntico;
git diff --check OK. 11 capturas del espacio de trabajo y sus hashes actualizados por cambio real del
menú. Smoke Anthropic no requerido (sin cambio de comportamiento de IA). /security-review requiere
commit: no se creó; revisión manual sin hallazgos (sin endpoint nuevo). Jury Production Freeze vigente.
Sin push, PR, merge, tag, migración ni deploy.

## 2026-10-06 · Promesa de marca: contexto de revisión de Mensaje y validación completa

Estado: listo técnicamente fuera de producción; pendiente aceptación del propietario en la DEMO local
y smoke real de Anthropic (la clave no está disponible en el entorno del agente; procedimiento humano).
Rama: feat/brand-promise. HEAD: 5927a262e5f2827d4c0936fb62ea13082ea63f58. Cambios de Promesa sin commit.

Corrección: cuando un cambio de Promesa se integra en la revisión pendiente de Mensaje (sin duplicarla),
la revisión muestra «También cambió mientras esta revisión estaba pendiente» con la versión vigente de
Promesa, su texto, criterio y tipo de dependencia, junto al cambio de Posicionamiento que la originó; la
orientación de Brando incluye ambos. Proyección de lectura, sin estados ni filas nuevas. El comprobante
de revisión liga además las versiones vigentes de las decisiones conectadas: un comprobante abierto antes
del cambio de Promesa se rechaza (409) y la persona reabre la revisión. Historial y razones intactos;
Mensaje no se reescribe ni se aprueba solo. ADR-0022 y change-impact actualizados.

Resultados del agente (salida real): typecheck y lint PASS; pnpm test 264/264 (incluye regresión de
contexto completo y no duplicación); Brando browser 40/40; test:e2e 84/85 en la pasada completa: la
prueba «DEMO recommendation can be rejected» falló en tablet por clic inestable con 16,6 min de reloj
(posible suspensión del entorno) y pasó 10/10 al repetirla dos veces en los cinco proyectos; la E2E nueva
de contexto de Mensaje pasó 5/5. test:visual 10/10 sin cambio visual real (no se actualizaron capturas
ni hashes); test:pilot:e2e 10/10; Foundation 247 Markdown / 66 JSON / 24 schemas / 15 requirements /
13 golden cases / 0 errores; UI y brand validators PASS; skills:check idéntico; git diff --check OK.
/security-review requiere commit: no se creó; revisión manual sin hallazgos (consultas limitadas por
workspace y marca, sin endpoint nuevo). Sin push, PR, merge, tag, migración ni deploy.
Jury Production Freeze vigente.

## 2026-10-06 · Promesa de marca · candidato fuera de producción

Estado: listo técnicamente fuera de producción; cierre RELEASE-READY pendiente de la aceptación del
propietario en la DEMO local. Rama: feat/brand-promise (local), creada desde el commit local
5927a262e5f2827d4c0936fb62ea13082ea63f58 (Objetivo y Arena, ADR-0021) sobre 77e7a71. Sin push.
Decisiones aprobadas 1–6 y [ADR-0022](docs/14-decisions/ADR-0022.md).

Implementado: config v3 (journey con Brand Promise entre Posicionamiento y Mensaje; Brand Thinking;
Brand Promise → Core Message HARD revisable en primera versión; Posicionamiento → Promesa y
Posicionamiento → Mensaje sin cambios); regla que evita revisiones duplicadas cuando una revisión
pendiente igual o más fuerte ya cubre un cambio propagado; activación explícita reutilizada (lista
dinámica de secciones faltantes); menú 06 Promesa / 07 Mensaje; guía del editor y orientación Brando;
Promesa demo en sandboxes CoffeePolis nuevos; densidad compacta del menú hasta 940px de alto para
conservar la columna completa en 1440×900. Sin migración ni cambios de IA, configuración de despliegue
o producción. La revisión de Mensaje se crea en la primera versión de la Promesa, no al agregar la
sección (un ReviewItem exige versión que lo origine).

Resultados del agente (salida real): typecheck y lint PASS; pnpm test 13 archivos / 263 pruebas
(257 + 6 de Promesa); Brando browser 40/40; test:e2e 80/80 tras el ajuste de CSS (una pasada previa
79/80: la prueba de siete fases superó 60s en móvil sin fallar aserciones; se le asignó test.slow()
y su spec pasó 20/20); test:visual 10/10; test:pilot:e2e 10/10; Foundation 247 Markdown / 66 JSON /
24 schemas / 15 requirements / 13 golden cases / 0 errores; UI y brand validators PASS; skills:check
idéntico; git diff --check OK. Capturas: se actualizaron las mismas 11 del espacio de trabajo y sus
hashes. /security-review requiere commits: no se creó ninguno; revisión manual sin hallazgos de
seguridad. Límite funcional registrado: mientras la revisión de Mensaje siga pendiente, un cambio de
la Promesa se integra en ella sin abrir otra. Sin prueba con IA real.
Aceptación del propietario en la DEMO: pendiente. Jury Production Freeze vigente.
Sin push, PR, merge, tag, migración ni deploy; cambios de Promesa sin commit.

## 2026-10-06 · Objetivo estratégico y Arena de mercado: cierre

Estado: RELEASE-READY FUERA DE PRODUCCIÓN.
Rama: feat/strategic-objective-market-arena. Base y HEAD: 77e7a71a909f4b59cea491590a4a09161855b2fd.
Este registro supera el único pendiente del registro anterior (aceptación funcional).

El propietario confirmó la aceptación funcional en la DEMO local. Este registro no detalla qué
recorridos recorrió: sólo consta su aceptación. Los resultados de pruebas son los ya registrados
abajo con salida real (pnpm test 257/257, test:e2e 80/80, Brando browser 38/38, test:visual 10/10,
test:pilot:e2e 10/10, Foundation 0 errores, UI y brand validators PASS) y las comprobaciones
documentales de este cierre. Alcance, decisiones D1–D9 y limitaciones sin cambios: sin prueba con
IA real; /security-review no ejecutable sin commits (revisión manual registrada); «Agregar estas
secciones» verificado sólo por pruebas automáticas; posibles revisiones encadenadas en marcas
existentes (D3). Sin cambios de código ni capturas en este cierre.

AI proposes. Humans decide. Brandopolis remembers.
Jury Production Freeze vigente. Release-ready no autoriza deploy.
Sin commit, push, PR, merge, tag, migración ni deploy.

## 2026-10-06 · Objetivo y Arena: capturas y gates de cierre

Estado: NOT RELEASE-READY; único criterio pendiente: aceptación funcional humana en la DEMO local.
Rama: feat/strategic-objective-market-arena. Base y HEAD: 77e7a71a909f4b59cea491590a4a09161855b2fd.
Este registro supera los pendientes técnicos del candidato anterior del mismo día.

Por autorización explícita del propietario se actualizaron sólo estas 11 capturas automáticas y sus
hashes/bytes en design/brandopolis-ui/specs/brand-assets.json: m1-workspace, m1-needs-review,
m1-guided-review, blueprint e history (desktop y mobile) y decision-card-desktop. Login, acceso y
portada no se tocaron. Generadas por pnpm test:visual (10/10) contra la DEMO local.

Gates del agente tras la actualización (salida real): typecheck y lint PASS; pnpm test 257/257;
Foundation 246 Markdown / 63 JSON / 24 schemas / 15 requirements / 13 golden cases / 0 errores;
UI validator PASS; brand validator PASS; skills:check idéntico; git diff --check OK. Sin cambios de
código desde la ejecución anterior de test:e2e 80/80, Brando browser 38/38 y test:pilot:e2e 10/10.
Diff completo revisado: index.html sólo cambia el menú; ningún archivo de despliegue o producción.
/security-review sigue requiriendo commits; no se creó ninguno. Revisión manual registrada arriba.
Aceptación funcional del propietario en la DEMO: pendiente. Sin prueba con IA real.
Jury Production Freeze vigente. Sin commit, push, PR, merge, tag, migración ni deploy.

## 2026-10-06 · Objetivo estratégico y Arena de mercado · candidato fuera de producción

Estado: NOT RELEASE-READY; implementación y gates técnicos completos, pendiente aceptación humana.
Rama: feat/strategic-objective-market-arena. Base: 77e7a71a909f4b59cea491590a4a09161855b2fd.
Alcance aprobado por el propietario (D1–D9; D3 opción B; D4 acción explícita): ADR-0021.

Implementado: config v2 (modules/journey, learning-moments, dependencies con ruleVersion por regla);
seis secciones en marcas nuevas, entrada por Objetivo; acción explícita «Agregar estas secciones»
(POST /api/brands/strategic-sections, idempotente, sin escrituras al leer contexto); impacto de
primera versión sólo para las cuatro reglas nuevas, con dependencias sincronizadas antes del cálculo
y sin aristas duplicadas; orientación Brando y guía del editor; DEMO y sandbox nuevo en orden canónico.
Sin migración, sin cambios de proveedor, modelo, prompts, schemas ni datos enviados a la IA.

Resultados del agente en Windows (salida real): typecheck y lint PASS; pnpm test 13 archivos /
257 pruebas PASS (base previa 247; +10 casos ADR-0021); Brando browser 38/38; test:e2e 80/80
(primera pasada 60/80 antes de actualizar pruebas al contrato de seis secciones); test:visual 10/10;
test:pilot:e2e 10/10; Foundation 246 Markdown / 63 JSON / 24 schemas / 15 requirements / 13 golden
cases / 0 errores; UI validator PASS; brand validator PASS; skills:check idéntico; git diff --check OK.
/security-review no pudo ejecutarse (requiere origin/HEAD y commits); revisión manual de seguridad
del endpoint sin hallazgos. Capturas canónicas: las 11 del espacio de trabajo cambian con el menú,
pero sus hashes están en specs/brand-assets.json; se restauraron y queda pendiente decisión humana
que nombre esos archivos. Sin prueba con IA real. Jury Production Freeze vigente.
Sin commit, push, PR, merge, tag ni deploy.

## 2026-10-05 · Brando review choice: cierre validado en Windows

Estado: RELEASE-READY FUERA DE PRODUCCIÓN.
Rama: fix/brando-review-choice.
Base: fe5b4a64a904b8bda989220e51014adff1c15670.
Este registro supera los pendientes del candidato anterior.

El operador confirmó el bloque inicial completo: typecheck, lint, pruebas
unitarias/integración, Brando browser, Foundation, validador UI y formato.
Confirmó posteriormente E2E general, visual y PILOT local.
Foundation: 245 Markdown, 60 JSON, 24 schemas, 15 requirements,
13 golden cases y 0 errores. UI validator: PASS.
No se inventan totales de pruebas no compartidos.

La corrección está presente en el archivo y en el código servido localmente.
El operador aceptó el recorrido con IA real: elegir una propuesta prepara
Modificar en la revisión sin requerir otra edición del texto.
El criterio mínimo y la confirmación humana siguen siendo obligatorios.
Se conserva la selección del mismo borrador durante el repintado.
No se afirma validación universal de respuestas futuras de IA.

Sin cambios de proveedor/modelo, esquemas, migraciones ni assets.
AI proposes. Humans decide. Brandopolis remembers.
Jury Production Freeze vigente. Sin commit, push, merge ni deploy.

## 2026-10-05 · Brando: selección de Modificar al preparar revisión

Base: fe5b4a64a904b8bda989220e51014adff1c15670. Rama: fix/brando-review-choice.
Corrección solicitada por el propietario tras recorrido local con IA real.
Estado: NOT RELEASE-READY; pendientes regresiones Windows y aceptación local.

Aceptar o Modificar una alternativa estratégica de Brando selecciona Modificar en el
formulario cuando existe revisión pendiente. La selección se conserva durante el repintado
del mismo borrador, incluida una elección humana posterior de Mantener sin cambios.
No hay commit automático; siguen requeridos criterio de al menos diez caracteres,
confirmación humana, revisión autorizada, concurrencia y versión nueva en el motor.
No se cambian proveedor, presupuesto, esquemas, migraciones ni assets.

Agente: typecheck, lint y sintaxis JS PASS; 12 pruebas de proyección/presencia/encoding PASS.
Foundation: 245 Markdown / 60 JSON / 24 schemas / 15 requirements / 13 golden cases / 0 errores.
UI validator y formato PASS.
Cuatro nuevos casos browser (Aceptar/Modificar, desktop/mobile) preparados; intento bloqueado
por Chrome ausente. No se afirma ejecución aprobada ni nueva inferencia del agente.
Pendientes: pnpm test, Brando browser, E2E general, visual, PILOT y aceptación local.
Jury Production Freeze vigente. Sin commit, push, merge, deploy ni cambios de producción.

## 2026-10-05 · Brando por sección: cierre técnico validado en Windows

Estado: RELEASE-READY FUERA DE PRODUCCIÓN.
Rama: feat/brando-contextual-sections.
Base: b6d2ca1f652e6880e14912436816634ec7422700.
Este registro supera los pendientes del candidato anterior.

El operador confirmó el bloque inicial completo: typecheck, lint, skills:check,
pruebas unitarias e integración, Brando browser, Foundation y formato.
Confirmó el recorrido DEMO y compartió capturas de tarjeta y panel.
Las regresiones generales y visuales completaron antes del fallo de arranque PILOT.
PILOT pasó posteriormente usando la base local del perfil aislado.
Foundation: 245 Markdown, 60 JSON, 24 schemas, 15 requirements,
13 golden cases y 0 errores. UI validator: PASS.
No se inventan totales de pruebas no incluidos en la salida compartida.

La revisión de esta fase utiliza respuestas DEMO. No se afirma una nueva
prueba con IA real ni validación semántica de todas las respuestas futuras.
Proveedor, modelo y controles existentes de B1 permanecen sin cambios.

AI proposes. Humans decide. Brandopolis remembers.
Jury Production Freeze vigente. Sin commit, push, tag, merge ni deploy.
Este cierre no autoriza cambios de producción.

## 2026-10-05 · Brando contextual por sección · candidato fuera de producción

Base canónica verificada por fetch: b6d2ca1f652e6880e14912436816634ec7422700.
Rama: feat/brando-contextual-sections. Alcance aprobado por el propietario.
Estado: NOT RELEASE-READY; pendientes pruebas Windows y aceptación visual.

Orientación compacta en las cuatro secciones actuales, desde el estado registrado y sin inferencia
por navegación. Prioriza impacto, invalidación y revisión; muestra versión/criterio del cambio
conectado cuando están disponibles. Consulta explícita mediante askBrando existente, respuesta
reutilizable sólo en el mismo contexto y con tickets vigentes. Sin cache persistente, consultas
automáticas ni reintentos. Borrador humano preservado. Acciones vencidas deshabilitadas; servidor
mantiene autoridad. Rechazo no reaparece como propuesta accionable al repintar la conversación.
ADR-0020 registra el contrato. Sin cambios de proveedor/modelo, presupuesto, datos enviados,
esquemas, migraciones, endpoints, motor estratégico ni assets canónicos.

Agente: typecheck y lint PASS; 153 pruebas sin DB PASS en 12 archivos (incluyen cinco casos nuevos
de orientación/expiración). Suite completa intentada: esas 153 PASS, 94 casos DB no ejecutados porque
embedded-postgres rechaza usuario raíz. Intento de usuario no privilegiado bloqueado por el entorno.
Brando browser intentado: Chrome ausente; descarga de Chromium no disponible. No se afirma PASS
ni inspección visual. Nuevos casos de navegador cubren navegación sin consultas, ámbito correcto,
reutilización, borrador, expiración, respuesta tardía y contexto cambiado.
Foundation: 245 Markdown / 60 JSON / 24 schemas / 15 requirements / 13 golden cases / 0 errores.
UI validator PASS; Brand Master validator PASS (58 assets / 19 mappings); skills:check PASS;
formato del diff PASS. Estos validadores no sustituyen las regresiones ni la aceptación visual.
Pendientes: suite DB, Brando browser, E2E general, visual, PILOT browser y revisión humana local.

Jury Production Freeze vigente. Sin commit, push, tag, merge, deploy ni operaciones de producción.

## 2026-10-05 · Brando B1: cierre revisado fuera de producción

Estado: RELEASE-READY FUERA DE PRODUCCIÓN.
Rama: feat/brandopolis-intelligence-brando-b1.
Base local revisada: 83ed1ecb8f63374713ee4759cbcbab32bf4a97f7.

Se revisó el paquete exacto enviado por el operador. Los archivos de código
coincidieron con la copia del agente. Se corrigió la clasificación del registro:
aceptar y después editar la propuesta se registra como modificación al confirmar.
La elección explícita de Modificar conserva esa clasificación. El criterio,
la nueva versión y el impacto continúan sujetos a confirmación humana.

El operador confirmó el bloque posterior a la corrección: typecheck, lint,
pruebas unitarias e integración, test:e2e, test:pilot:e2e, Foundation y formato.
Foundation: 244 Markdown, 60 JSON, 24 schemas, 15 requirements,
13 golden cases y 0 errores. Los totales de las demás pruebas no se inventan.
Las regresiones visuales anteriores permanecen aplicables: esta corrección
modificó el registro del servidor, sus pruebas y documentación.

La prueba local con IA real fue confirmada por el operador. Las claves,
sesiones, datos DEMO y lanzadores temporales permanecen fuera del commit.
Las referencias válidas no certifican por sí solas la calidad de cada respuesta.

El propietario autorizó únicamente el commit local de estos cambios.
Jury Production Freeze vigente. Este cierre no autoriza push, merge, tag,
deploy, migraciones ni cambios de producción.

## 2026-10-05 · Final review: classify edited Brando proposals correctly

Reviewed operator archive based on 83ed1ecb8f63374713ee4759cbcbab32bf4a97f7.
Finding: choosing Accept and then editing the draft incorrectly recorded ACCEPT in
practice and audit. The server now compares the confirmed choice with the issued
proposal and records MODIFY when they differ (ignoring outer whitespace).
Explicit Modify remains MODIFY. Human confirmation, stored choice, dependency impact
and the original idempotency fingerprint stay unchanged. No migration or production action.
Three regression cases cover unchanged acceptance, edited acceptance and explicit modification,
including successful replay without duplicate practice. Windows integration/E2E/PILOT gates
for this correction are pending; this follow-up is not yet release-ready.
Agent: typecheck, targeted lint, 19 non-DB Brando tests and Foundation PASS.
The three new database cases have not run in the agent environment.

## 2026-10-05 · Brando: validación funcional local confirmada

El operador confirmó pruebas exitosas de consultas contextuales, generación de
posibilidades y revisión de decisiones afectadas por cambios en dependencias,
en la marca DEMO local con proveedor Anthropic.

Dos consultas anteriores registraron outcome OK, schemaValid true y
referencesValid true. El lanzador temporal corregido pasó 10 pruebas del agente:
rutas permitidas, aislamiento de marca, límite compartido, concurrencia,
confirmación humana y diagnósticos diferenciados.

El bloqueo de generación de posibilidades provenía de la lista de rutas del
lanzador temporal. Su corrección permanece en .local, fuera del producto versionado.
El operador confirmó que las pruebas posteriores fueron exitosas. Esta confirmación
funcional no sustituye las regresiones automáticas previamente documentadas.

Rama: feat/brandopolis-intelligence-brando-b1.
Último commit local comunicado por el operador: 83ed1ec.
Las extensiones posteriores siguen pendientes de revisión final y nuevo commit.
La inspección del operador reportó 25 archivos modificados, 12 nuevos y comprobación
de formato sin errores. No se observaron archivos temporales en esa lista.

AI proposes. Humans decide. Brandopolis remembers.
Aceptar o modificar exige confirmación humana y criterio; el sistema conserva
versiones y calcula impacto, sin aprobar automáticamente las decisiones dependientes.

Jury Production Freeze vigente. Sin nuevo commit, push, tag, deploy, migraciones
ni cambios de configuración o infraestructura de producción.

## 2026-10-05 · Brando exact source citations

Operator live diagnosis: two HTTP 200/end_turn outputs passed schema but failed reference
validation. Add per-request source-ID enum for Brando v2 structured output and prompt v4.
Local reference guard remains unchanged; no extra inference, migration or production action.
Agent: typecheck/lint, 148 non-DB tests and Foundation PASS. Candidate remains not release-ready
until bounded live verification and required Windows gates pass.

## 2026-10-05 · Brando selection-first candidate

Authorized non-production follow-up to human-review patch. Panel-only per-proposal actions;
selected draft and human criterion in workspace; evidence advice navigates to sources. New
answer schema v2 and prompt v3 preserve prior versions. No migration or production operation.
Agent: typecheck/lint, 148 non-DB tests, Foundation and UI validator PASS. Windows full gates
remain pending; previous 16-case Windows PASS applies only to its baseline.
No new commit/push/deploy. Candidate is not release-ready.

# Brando B1 · human proposal review and expressive states candidate (2026-10-05)

Previous B1 candidate was committed locally by the Windows operator; SHA not yet pasted.
Agent checkout remains based on main 03dbd212e20e65ba0a575143d12fa8a6048b52c8 with prior
changes uncommitted. This follow-up patch is relative to the final-record candidate files.
Human confirmed the scoped suggestion stripe in a local real-provider test screenshot; the
provider outcome log was not pasted, so no additional live semantic PASS is claimed.

Authorized corrections: visible Pensando control, original consulting/ready poses, more
frequent finite Idle motion and simple Spanish without technical enums. Human clarified
Accept must change strategy: Accept/Modify therefore use existing final human commit, new
version and normal dependency impact; Reject records practice/criterion only. Criterion for
Accept/Modify is recorded once inside successful commit. No automatic Learning or score.
Opaque suggestion proof is bounded, expires and is actor/brand/workspace scoped. Existing
tables are reused, no migration. Prompt v2, new input schema and ADR-0018 document contracts.

Candidate requires new full Windows database/invariant, Brando browser, E2E, visual and PILOT
gates plus human UX review. Previous release-ready status does not cover this new extension.
No new commit, push, PR, merge, tag, deploy or production access. Jury freeze unchanged.

---

# Brando B1 · final Windows validation and human navigation acceptance (2026-10-05)

State: RELEASE-READY OUTSIDE PRODUCTION. Branch: feat/brandopolis-intelligence-brando-b1.
Base HEAD: 03dbd212e20e65ba0a575143d12fa8a6048b52c8. Candidate remains uncommitted.
This entry supersedes pending-validation statements in earlier dated candidate records.

Operator confirmed the attention patch block completed: typecheck, lint, eight Brando
browser cases and whitespace validation. Human then confirmed the three local DEMO checks:
one left gem/attention entry, central attention summary, and separate right query drawer.
Earlier human feedback accepted drawer opening, Idle behavior and predefined-query answers.
No broader subjective acceptance of every operational animation is inferred.

Operator subsequently reported the final stop-on-failure block completed successfully:
typecheck, lint, skills:check, full unit/integration suite, test:e2e, test:visual,
test:pilot:e2e, Foundation, integrated UI validator and git diff --check. The pasted final
output explicitly reports Foundation 237 Markdown / 58 JSON / 22 schemas / 15 requirements /
13 golden cases / 0 errors, UI VALIDATION: PASS, and final-block success. Exact browser and
unit totals for this final run were not pasted and are not invented here.

AI proposes. Humans decide. Brandopolis remembers. Section suggestion stripes reuse an
explicitly requested scoped answer; navigation never requests inference. Proactive section
suggestions remain outside B1 and require a separately agreed phase.

Jury Production Freeze remains active until explicit human authorization. No production
access, deploy, tag, infrastructure/configuration change or production migration. No commit,
push, PR or merge performed. Each release operation requires its own human authorization.

---

# Brando B1 · unified attention entry (2026-10-05)

Operator reported the five navigation regression cases and remaining automatic validation
passed after nav-fit. Human accepted drawer opening, Idle motion and predefined-question
answers in the local DEMO. This does not imply acceptance of every animation or new live AI
semantic evaluation.

Human requested one left entry: Brando portrait + Qué necesita atención opens the existing
attention summary. Removed the duplicate left drawer trigger; the right card retains query
drawer behavior. No motion, engine, provider, schema, migration or production change.
Updated browser flow asserts distinct destinations and no automatic POST on navigation.
B1 section suggestions reuse explicitly requested scoped answers; proactive suggestions
on section entry remain a separately agreed future phase.

This follow-up awaits Windows browser regression and human verification of the left entry.
No commit, push, merge, tag, deploy or production access.

---

# Brando B1 · laptop navigation regression correction (2026-10-05)

Operator reported the drawer candidate initial block passed. Full E2E then had 76 PASS and
4 FAIL: existing navigation reachability test at 1366x768 with fine pointer requires no sidebar
scroll. Adding the Brando entry exceeded that height. Visual/PILOT commands after E2E did not
run because the operator block stopped at the failure.

Correction changes only product-responsive.css: <=860px height and fine pointer use denser
navigation spacing, >=32px ordinary targets, 44px Brando entry with 32px image, and 36px
learning entry. All labels, groups, links and principle remain. Touch targets/rules are unchanged.
Existing failing tests were not edited, skipped or weakened.

Reproduced in a same-origin 1366x768 preview frame using actual assets and synthetic data:
before nav clientHeight=684/scrollHeight=795; after 684/684. Mapa estratégico bottom=579.75,
height=32; full principle bottom=655.28125, within panel bottom=768. Browser preview evidence
does not replace Windows real-server regression gates. Targeted five-project navigation rerun
comes first; release remains blocked until required gates and human motion/layout acceptance.
No production access, commit, push, merge, tag, deploy or baseline refresh.

---

# Brando B1 · drawer/motion correction awaiting Windows review (2026-10-05)

The operator reported prior visual candidate full tests 228/228, Brando browsers 6/6,
Foundation/UI/brand validators PASS, followed by PRUEBAS RESTANTES DE BRANDO VISUAL APROBADAS.
Human visual review then REJECTED its long/subtle idle, unnatural attitude image swaps and
poor central modal. Those test results do not approve the visual design or this correction.

Authorized correction: contextual right slide drawer, small nonhumanized stable gemstone,
more expressive finite motion and an additional left navigation presence above attention.
Implemented drawer with current decision/rationale, counts, existing attention navigation,
evidence/hypothesis previews, and persistent composer; same scoped transient conversation.
One image across states prevents shape changes; gestures finish naturally at neutral, rest
interval 8–12s. No provider query on opening, no strategic mutations or backend/config changes.

See docs/15-handoff/BRANDO_B1_DRAWER_REVIEW_2026-10-05.md for actual checks and limits.
NOT RELEASE-READY: new Windows gates and human animation/layout acceptance remain pending.
No commit/push/PR/merge/tag/deploy. Jury Production Freeze remains active.

---

# Brando B1 · visual integration awaiting Windows gates (2026-10-05)

The human authorized the supplied emerald/gold gem and right-rail mockup: small transparent
portraits, expressive finite state animations, occasional idle motion, no intrusion or redesign.
The previous RELEASE-READY verdict below applies to the contextual core before this visual
follow-up; the expanded visual candidate is **NOT YET RELEASE-READY**.

Implemented a compact rail card above Contexto vigente, the same accessible entry relocated
above the decision on narrow screens, original-source-derived alpha WebP portraits, finite
state motion and a 35–65 second resting interval. Reduced motion, explicit pause, offscreen,
inactive-tab and modal guards apply. A removable tentative suggestion appears only after an
authorized contextual response; pending/failed queries hide that strip. No automatic model
query, strategic write, model/configuration change, database/schema/migration or deployment.

Agent checks: typecheck/lint, 141 non-database tests, Foundation, Skill Pack mirror,
UI validator and whitespace. Desktop browser inspection used actual frontend assets with
synthetic preview API fixtures; it does NOT substitute for real-server/browser/database gates.
Operator Windows full tests, E2E/visual/PILOT and expanded Brando browser suite plus human
portrait/motion acceptance remain pending. See docs/15-handoff/BRANDO_B1_VISUAL_REVIEW_2026-10-05.md.
All work remains uncommitted; Jury Production Freeze remains fully active.

---

# Brando B1 · RELEASE-READY outside production (2026-10-04)

Human Windows execution completed the live-smoke block, including typecheck, lint, full
unit/database tests, Foundation and whitespace checks after adding the harness tests.
Earlier runtime/browser gates: E2E 80/80, PILOT 10/10, Brando 4/4, visual 10 PASS / one
existing historical encoding-backup SKIP, integrated UI validator PASS, Skill Pack mirror PASS.
Desktop DEMO screenshots and conversation clearing were reviewed with the operator.

Human-only synthetic-context Gateway smoke: ANTHROPIC / claude-opus-5-5,
brando-contextual-v1, outcome OK, schemaValid=true, referencesValid=true;
19,185 ms, 3,195 input tokens and 1,786 output tokens. The supplied answer was compared
with its synthetic sources: current versus superseded decision and rationale are accurate;
fictitious evidence/limits are disclosed; Positioning and willingness-to-pay attention are
identified; new hypotheses/questions/suggestions are tentative and require human decisions.
No invented market/revenue numbers or autonomous approval appeared. The operator procedure
reported temporary credential cleanup. No credential was shared with the agent.

Verdict: **RELEASE-READY OUTSIDE PRODUCTION** for the scoped contextual B1 candidate.
This single live sample does not establish quality across all brands, semantic entailment
for every generated claim, or live server end-to-end behavior. Existing automated boundary
coverage and documented residual limitations remain applicable. No zero-risk certification.
All changes remain uncommitted on feat/brandopolis-intelligence-brando-b1 based on
03dbd212e20e65ba0a575143d12fa8a6048b52c8. Commit/push/PR/merge/tag/deploy are not performed.
Jury Production Freeze remains active; this verdict authorizes no production operation.

---

# Brando B1 · DEMO reviewed, live smoke prepared (2026-10-04)

Human desktop screenshots show the real contextual dialog, DEMO-labelled answers, recorded
reasons and expandable numbered sources. Human confirmed conversation clearing works.
This validates DEMO presentation, not live semantics. The human identified the existing model
as Opus 5.5; their credential-authenticated read-only Models API returned `claude-opus-5-5`.
No credential was supplied to the agent. No production provider/configuration was changed.

Prepared `scripts/brando-ai-smoke.ts`: one B1 Gateway invocation using a synthetic brand,
current/history distinction, fictitious interview evidence, unvalidated hypothesis and pending
questions. No DB/server access or persistence; operator-provided key/model only; existing SDK
retry/output policy reused. Full response/synthetic sources printed for human semantic review;
schema and reference validation are technical checks, not proof of strategic correctness.
Two additional fixture tests pass; local non-DB count now 138/138, typecheck/lint pass.
The human will run the live query locally. **Live result and final release verdict pending.**

---

# Brando B1 · automated gates complete, human review pending (2026-10-04)

Human-provided Windows execution evidence for the current worktree: full unit/database suite
223/223 PASS (latest unit run before the final test-only outage assertion); E2E 80/80 PASS;
visual 10 PASS / 1 historic encoding-backup SKIP; final local PILOT HTTPS/OIDC 10/10 PASS;
final Brando desktop/mobile fixture 4/4 PASS; Foundation zero errors and integrated UI validator
PASS. The final block reached its success message, including typecheck, lint and whitespace gates.
Skill Pack byte-identical mirror was verified earlier and its files were not changed.

No failing automatic gate remains. Historic encoding skip is the existing documented condition,
not a new exclusion. **Human visual acceptance remains pending; real-provider semantic smoke
has not been performed.** Current state: verified non-production candidate, not final release-ready.
No commit/push/PR/merge/tag/deploy. Jury Production Freeze remains active.

---

# Brando B1 · PILOT outage proof follow-up (2026-10-04)

New Windows log: unit/database suite **223/223 PASS**; scoped PILOT selectors allow all five
OIDC keyboard/revocation cases to pass. Remaining five HTTPS cases reach the real unavailable
fixture provider and stop at a stale expected notice string. The current notice explicitly
allows a human response/retry. Test now asserts that exact safe notice, the actual unavailable
provider result, and unchanged decisions/versions across the failed generation. Human commit,
brand isolation, feedback and logout checks remain. No runtime change.

Updated HTTPS/PILOT verification and final checks remain pending; **not release-ready**.
Production remains frozen. No commit/push/merge/deploy authorization inferred.

---

# Brando B1 · browser gates follow-up (2026-10-04)

Windows evidence after UI fix: focused compact/mobile regression **4/4 PASS**; full existing
E2E **80/80 PASS**; visual **10 PASS, 1 SKIP** (historic encoding repair has no local backup;
its test explicitly requires that pre-existing artifact). PILOT local HTTPS/OIDC browser suite
**10 FAIL** at initial ambiguous access-link selectors; none reached its protected-flow checks.
The same unscoped selectors exist at the pinned main SHA; this is not a new production fault.
The latest uploaded log starts at the E2E summary, so it does not independently show the
preceding typecheck/lint/unit outputs. Earlier initial-patch evidence remains recorded below.

Test-only follow-up scopes OIDC access to #pilot-entry, navigates the keyboard login proof to
/login and scopes feedback assertions to #notice, preserving authentication, tenant isolation,
provider outage, keyboard, revocation and logout assertions. No runtime or config modification.
Updated PILOT checks, final Foundation/UI validation and human visual review remain pending.
**Not release-ready. No deployment authorization.**

---

# Brando B1 · local verification follow-up (2026-10-04)

User-reported Windows evidence on the dedicated worktree: typecheck, lint, Skill Pack,
Foundation (zero errors) and diff checks PASS; full unit/DB suite **223/223 PASS**;
Brando desktop/mobile fixture **4/4 PASS**. Existing E2E **78/80 PASS**, then focused rerun
**3/4 PASS**: compact progress status reproducibly starts at y=823.36 in an 800px viewport.
Mobile hover failed once and passed the focused rerun. Visual/PILOT browser checks did not run
because the command block stopped at the E2E failure.

Follow-up: activity start now brings the adjacent local status into view after revealing the
panels; hover assertion waits for the observable CSS colour transition without weakening its
contrast or interactivity checks. These updated browser paths **await Windows verification**.
All counts above describe the initial patch, not proof that this follow-up passes.
No screenshots/baselines, database schema, migration, production or deployment changes.
Verdict remains **not release-ready**. Jury Production Freeze remains active.

---

# Brando B1 contextual · implementation candidate (2026-10-04)

Human-approved plan implemented on local branch `feat/brandopolis-intelligence-brando-b1`, based on
`main` `03dbd212e20e65ba0a575143d12fa8a6048b52c8`. **Uncommitted; not release-ready; outside production.**
Jury Production Freeze remains active. No commit, push, PR, merge, tag, deploy, production operation,
new migration, database schema or dependency change.

B1 adds a scoped contextual read path through the Gateway, structured answers and source guards,
read-derived attention, context freshness checks, a temporary dialog and separate query telemetry.
No conversation writes strategy or invalidates recommendations. Contracts and data boundaries:
[Brando B1](docs/05-ai/brando-b1.md), [ADR-0017](docs/14-decisions/ADR-0017.md).

Validation: typecheck/lint PASS; 136 non-DB tests PASS. Full suite NOT PASS: 87 DB-dependent tests
blocked by PostgreSQL refusing root in this UID-0-only container. Chrome launch blocked by Unix socket
permissions; new fixture's 4 browser tests did not execute; existing E2E/visual/PILOT suites not run.
Foundation zero errors; UI static validator PASS; Skill Pack mirror check PASS via node --import tsx
(the pnpm wrapper itself is blocked by Unix IPC); diff whitespace clean. No real-provider smoke.
Full findings and local completion procedure: [B1 review](docs/15-handoff/BRANDO_B1_REVIEW_2026-10-04.md).

---

# Session State

Current phase: **JURY PRODUCTION FREEZE / NEXT-PHASE PREPARATION** (2026-10-04).

Human decision: Brandopolis PILOT may be reviewed by a jury during the next approximately 15 days.
Production is therefore jury-critical and remains stable until the human explicitly lifts this gate;
there is no automatic expiration date. The canonical rule is
[CLAUDE.md § Jury production freeze](CLAUDE.md#jury-production-freeze--2026-10-04).

- Engineering Skill Pack is integrated in `main` through PR #2; merge commit
  `f36fdf85c317d26742b351689764a53a733713be`. This governance work did not deploy anything.
- The next development phase may proceed on dedicated branches/non-production environments. Its default
  finish state is **release-ready outside production**, not deployed.
- Commit, push, PR, merge or a green review never implies permission to deploy. Any production deploy,
  migration/schema change, production config/OIDC/secrets/DNS/hosting/runtime behaviour or asset change
  requires a separate explicit human authorization.
- During the jury window, a production exception is limited to a reproducible availability/access
  defect or confirmed security/auth/authz/tenant-isolation/data-exposure defect. No feature or polish may
  ride with the fix.
- Before any authorized exception reaches production: pin the SHA, run every applicable quality/security
  gate, review the exact diff, prepare rollback/backup when relevant, define production smoke checks, and
  verify immediately after deploy. Any failed gate stops the release.
- The exact production build remains whatever is recorded by the latest verified production entry below;
  do not infer deployment from `main`.

Gate for this entry: documentation/governance only. No runtime, schema, migration, configuration,
infrastructure, tag or deployment change.

---

Current phase: **SKILL PACK POST-REVIEW HARDENING** (2026-10-04). Branch
`chore/brandopolis-engineering-skills` on top of 65a6a9a. Uncommitted. Fixes from the local `/code-review`
of `main...HEAD` (findings 1–10, 12–15) plus a final controlled pass. Deferred and registered in
[known-risks](docs/15-handoff/known-risks.md): Skill Pack routing gaps (one-way routing between
feature/security/brando, no coverage for document upload and parsing) and handoff-doc debt.


- Review: typecheck, lint and test are the baseline for every change except historical records; the
  matrix only adds checks (brand assets keep `pnpm test`, PILOT-reachable frontend adds pilot e2e,
  auth/admin/tenancy/endpoints add the agent's built-in security review); read the whole diff first. Diff scope (`main...HEAD`,
  `--cached`, untracked), prepend rule, `.env.example`, historical CLAUDE_START_HERE and the `pnpm` on
  PATH precondition are explicit.
- Mirror tooling: `skills:check` is read-only and runs first; `skills:sync` refuses unknown arguments,
  links inside the repository (aliases above it are fine), overlapping roots and copy-only files, and
  swaps a verified staging copy with rollback.
- Single freeze definition in CLAUDE.md with the 2026-10-04 security-defect rule; AGENTS.md and the five
  skills only link and apply it. Brand hash refresh needs an explicit human decision. Agent-neutral review commands. Brando lists the three real provider
  surfaces.
- State guard: Unicode terms, contextual states per object and qualified noun, vigente/Current only as
  declared display vocabulary, document names only when quoted, more negative cases, anchor-only links and GitHub slugs. Foundation keeps only the light mirror gate and skips
  `.claude/worktrees/`. `.gitattributes` uses `text=auto` for skills.
- Docs reconciled with evidence: production live since 2026-09-29 (landing, auth, admin), ADR-0016
  supersedes only the provisioning part of ADR-0013 (deferred scope and authorization matrix aligned),
  extractor decompression risk registered.

Gate (2026-10-04): typecheck PASS; lint PASS; pnpm test 207/207 (72 skill pack: real junctions,
aliases above the repository, read-only check, unknown flags, copy-only refusal, backup cleanup, swap
rollback and staging verification; mutants removing backup cleanup, verification, rollback or the
copy-only refusal each fail the suite); `pnpm skills:check` PASS; Foundation 0 errors (229 Markdown);
git diff --check clean. Browser suites not run: no runtime or UI change.

---


Current phase: **ENGINEERING SKILL PACK** (2026-10-04). Branch `chore/brandopolis-engineering-skills`
from f47e4dd. Uncommitted. Engineering tooling only, authorized by the 2026-10-04 hardening exception
([CLAUDE.md § Pilot freeze](CLAUDE.md#pilot-freeze)).

- Five skills in the canonical `.agents/skills/`: brandopolis-feature (entry point, holds the database
  gate), brandopolis-ui, brandopolis-brando, brandopolis-security and brandopolis-review (single check
  matrix plus the commit/push/tag/merge/deploy gate). No database, release or router skill.
- `.claude/skills/` is a generated byte-identical copy (`pnpm skills:sync`, `pnpm skills:check`,
  `scripts/skill-pack.ts`); no symlinks; both pinned to LF in `.gitattributes`.
- Guard `tests/skill-pack.test.ts`: approved set, byte identity, frontmatter, name = directory, ≤100
  lines unless justified, links/anchors/paths exist, invariant IDs exist and their text is not copied,
  no invented upper-case states (with a negative case proving the guard fires). Foundation adds a
  read-only mirror and frontmatter check. AGENTS.md gains the change → skill routing table.
- No change to `src/`, `schemas/`, `drizzle/`, runtime assets, PILOT behaviour or deployment.
- Trigger evals (skill-creator method, `claude -p` in this repo): 31 cases (positive, negative and
  overlap) → 30/31, no forbidden activation. Known residual S2: for a new endpoint Claude loads
  brandopolis-feature as the entry skill; routing to brandopolis-security happens procedurally from
  feature. Boundary O1 (feature/ui): passed 3/5 runs. The harness was temporary (scratchpad), not part
  of the repository.

Gate (2026-10-04): typecheck PASS; lint PASS; pnpm test 168/168 (135 existing + 33 skill pack);
`pnpm skills:check` PASS; Foundation 0 errors (228 Markdown); git diff --check clean. Drift detection
proven by appending one byte to the copy (both `skills:check` and Foundation failed) and restoring with
`skills:sync`. Browser suites not run: no runtime or UI change.

---


Current phase: **CANONICAL DOCUMENTATION RECONCILIATION** (2026-10-04). Branch
`docs/canonical-reconciliation-2026-10-04` from `main` 4329292. Uncommitted, documentation only.

Human product decisions 2026-10-04, applied to the canonical docs before any agent skill is created:

- **Single PILOT freeze definition** in [CLAUDE.md § Pilot freeze](CLAUDE.md#pilot-freeze). The
  2026-09-29 criterion stays; the 2026-09-28 category list is superseded; a hardening exception now
  allows documentation reconciliation, engineering tooling, agent skills and validators without runtime
  effect. AGENTS.md and CURRENT_IMPLEMENTATION_STATE §7 link to it instead of restating it. The
  historical freeze entry of 2026-09-29 below is unchanged.
- **CURRENT_IMPLEMENTATION_STATE reconciled against `main` code and tests**, not inferred: auth (§4)
  and admin (§5) are on `main`; the admin `unavailable` list is the current one; `account_created` and
  `session_started` are instrumented in `pilot_events`; D7/D14/D30 are derived; geography is captured
  in the new-brand dialog but its propagation is not verified, so it stays partially pending; password,
  recovery, SMTP and feedback workflow states remain not implemented.
- **Product Bible**: the byte-identical duplicate of «Correcciones finales de contrato» removed; no
  semantic change.
- **Brandopolis Intelligence / Brando** registered: canonical home
  [brand-intelligence-engine](docs/05-ai/brand-intelligence-engine.md) (existing architecture kept,
  extended with Brando, authority limits and B1–B5), decision record
  [ADR-0015](docs/14-decisions/ADR-0015.md), ADR index also lists the previously omitted ADR-0012, and
  [scope-mvp](docs/01-product/scope-mvp.md) gains a dated resolution that keeps Ask Brandopolis in P1.
  B1 belongs to the next stage; no runtime change.

No change to `src/`, `schemas/`, `drizzle/`, assets, configuration, deployment or PILOT behaviour.
Python 3.12 installed on this machine so the canonical Foundation validator runs (`.venv` with
`requirements-foundation.txt` only).

Gate (2026-10-04): baseline and final both green. typecheck PASS; lint PASS; pnpm test 135/135; Foundation 0 errors (217 → 218 Markdown files, the new ADR-0015); git diff --check clean; diff limited to .md files. Browser suites not run: no runtime, UI or test file changed.

---


Current phase: **FOUNDING PILOT PRODUCT ANALYTICS** (2026-09-29). Uncommitted.

Minimum reliable analytics to operate the first 12–20 Estrategas de Marca. No new dashboard, no vendor,
no migration, no dependency. Readiness table:
[FOUNDING_PILOT_ANALYTICS_READINESS](docs/09-validation/FOUNDING_PILOT_ANALYTICS_READINESS.md).

- **Two new durable signals**, as names inside the existing `pilot_events`/`telemetry` envelope:
  `blueprint_pdf_exported` (the export reuses `engine.blueprint()`, so a download was indistinguishable
  from a view; recorded after the document is built, so a failure never counts) and
  `evidence_panel_opened` (canonical Evidence Engagement is "exposed participants who **open** Evidence",
  and opening had no signal at all). Recorded once per brand per page load: the metric counts people.
- **The three gaps the Admin itself declared underivable are closed**: `phaseCompletionCounts` from the
  active version per module, `optionActionCounts` from audited proposal provenance, and
  `documentEngagement` as canonical Evidence Engagement plus the stronger acts of supplying and curating
  evidence, reported beside the rate and never folded into it.
- **Strategy Ready and Human Override derive from durable state**, not clicks: questions decided with no
  HARD review outstanding, and strategic audit × proposal × committed version to tell a proposal taken
  as offered from one the participant rewrote.
- **D7/D14/D30 derive from timestamps** with the canonical day ±1 window, returning `null` until the
  window closes so insufficient elapsed time never reads as churn.
- **TTFI and TTFD anchors corrected.** `metrics.md` defines both from the brand; they were measured from
  `session_started`, which starts the clock before a brand exists and inflates both. Aligning with the
  canonical definition, not redefining it, and done now because there are no real testers yet.
- **`/admin/` was not redesigned.** Resumen gains evidence opened, map viewed, map downloaded, strategy
  ready and human override, each rate showing its denominator. Estrategas de Marca gains the per-tester
  journey. Aggregate detail lives in Evidencia; Configuración stays operator settings.
- **Not measurable in this build**: AI cost per decision and per active brand (no per-request cost is
  captured) and WTP / paid conversion (no offer or payment surface). None blocks starting testers.
- No new GA4 events: none would improve the aggregate funnel without duplicating first-party truth.

Gate (2026-09-29): typecheck/lint PASS; pnpm test 135/135 (3 new behavioural); focused browser
verification 12/12. No migration, no schema change, no dependency change.

---


Current phase: **PUBLIC SURVEY THANK-YOU PAGE** (2026-09-29). Uncommitted.

New public page at `/gracias-encuesta`, shown to whoever finishes the Brandopolis survey.

- **Existing routing architecture, no new framework.** The route is declared in `views`
  (`src/transport/assets.ts`) with and without a trailing slash; the server returns the single
  document and the client picks the view, exactly as the legal pages do. `/gracias` and
  `/gracias-encuesta/extra` still 404.
- **It is a public document.** `LEGAL_PATHS` generalises to `PUBLIC_DOCUMENT_PATHS`: readable with no
  session and **never intercepted by the intake gate** — the rule the legal routes needed, for the same
  reason. Verified anonymous and signed-in: neither is redirected into the pilot.
- One action only, «Volver al inicio →» to `/` (same origin, no redirect hop; it resolves to
  `https://brandopolis.ai/` when served from the root domain). The gateway hero and access card are
  hidden while the document is open.
- Editorial composition from the existing design system: inherited canonical public header, H1 in the
  sans at hero scale (44px desktop, 30px mobile), closing line in the display serif in emerald like the
  principle lines, 67-character measure on desktop and 46 on mobile at 15px/24px. No cards, no hero
  gradient, no photography. The canonical symbol is reused as a decorative mark (`alt=""`); **the
  Ribbon B is not redrawn.**
- Accessibility: single `h1`, section labelled by its title, visible keyboard focus, 48px target,
  measured contrast 7.32:1 body / 6.15:1 closing / 6.81:1 CTA / 15.74:1 H1, and the entrance animation
  exists only under `prefers-reduced-motion: no-preference`.
- Analytics: no new system and **no Product Analytics events**. A full document load produces the
  existing base `page_view` — verified as exactly one hit with zero custom events. `pilot_landing_view`
  stays scoped to `/`. No survey or participant data reaches GA4.
- Document title uses the existing `setTitle` convention. `<link rel="canonical">` and the meta
  description remain the single document's static tags: **no dynamic meta-tag architecture** was
  introduced for this page.
- **Non-indexable, per route.** The server sends `X-Robots-Tag: noindex, follow` **only** for
  `/gracias-encuesta` and `/gracias-encuesta/`, from the header block that already existed and
  conditioned on `NON_INDEXABLE_VIEWS`, declared beside the route table so paths live in one place.
  **Never global**: verified against a real server that `/`, `/login`, `/request-access`,
  `/privacidad`, `/terminos`, `/admin`, `/workspace` and static assets carry no such header. No
  `robots` meta tag was added to the document.
- Canonical survey redirect URL is `https://brandopolis.ai/gracias-encuesta`. The root-domain 302
  preserves the path, so it resolves to the page served by the pilot; **domain and proxy architecture
  were not changed** in this patch.

Gate (2026-09-29): typecheck/lint PASS; pnpm test 130/130 (3 new structural); focused browser
verification 210/210 at 390/768/1366×768/1440×900/1920×1080. No migration, no schema change, no
dependency change. Product Analytics reconciliation remains untouched and unstarted.

---


Current phase: **GA4 CANONICAL CONFIGURATION — CLOSED** (2026-09-29).

**Production is corrected and verified.** Confirmed by the operator on 2026-09-29: `pilot.env` carries
`GA4_MEASUREMENT_ID=G-NTSD86N2LT`, `brandopolis-pilot.service` restarted successfully,
`GET /api/mode` returns `G-NTSD86N2LT`, and GA4 Realtime is receiving activity. No configuration
action remains open.

**Root cause: configuration, not missing code.** Measured against `https://pilot.brandopolis.ai` in a
real browser with a clean profile: the Google tag loads (`gtag/js?id=…`), `window.gtag` is a function,
`dataLayer` fills with `js, config, event, gtm.dom, gtm.load`, the CSP is already widened for
googletagmanager, and a real `POST .../g/collect` fires on load — all against **`G-PVKQ2K90EQ`**, the
previous property, because that is what `/api/mode` publishes. The realtime report being watched is
**`G-NTSD86N2LT`**, which receives nothing. Base instrumentation was never missing.

The fix was one environment variable, now applied: `GA4_MEASUREMENT_ID=G-NTSD86N2LT` in `pilot.env`
plus a service restart (CSP and ID resolve at app construction; assets cache per process). **No
application file was changed**, then or in this commit. Should the ID ever change again, the same two
steps apply and `GET /api/mode` must return exactly the expected ID.

`G-NTSD86N2LT` is now the canonical Measurement ID, recorded with the measured production state and the
exact procedure in [GA4_PILOT_ANALYTICS §0](docs/15-handoff/GA4_PILOT_ANALYTICS.md). The ID is never
written into code: it is environment-driven and published through `/api/mode`, so no DEMO, e2e or
developer run can emit into a real property.

Scope: **base collection and automatic `page_view` only.** Product-event taxonomy is a separate later
phase; no new events were added. SPA view changes use `history.replaceState`, which GA4 history
measurement ignores, so there is nothing to de-duplicate and no manual page_view was introduced.

Gate (2026-09-29): typecheck/lint PASS; pnpm test 127/127 (5 new structural); git diff --check clean.
No migration, no schema change, no dependency change, no CSP change. Foundation, UI and Brand Master
validators NOT RUN: no Python interpreter on this machine.

---


Current phase: **FINAL QA POLISH — TERMINOLOGY + RIGHT PANEL** (2026-09-29). The previous production
hotfix is already deployed and was verified manually. This pass is uncommitted.

1. **«Blueprint estratégico» is now «Mapa estratégico»** wherever a participant reads it: navigation,
   view eyebrow, notices and the exported document («Mapa estratégico de la marca»). Technical names
   are deliberately unchanged — `#blueprint`, `/api/blueprint`, `/api/blueprint/pdf`,
   `engine.blueprint()` and the PDF filename — so no URL breaks and already-downloaded files keep
   their name. Decision recorded in [BLUEPRINT_PDF_EXPORT](docs/15-handoff/BLUEPRINT_PDF_EXPORT.md).
2. **Right-panel hierarchy restored.** «Contexto del mercado» and «Lo que ya decidiste» now share one
   section-label treatment (9.5px, 0.18em, weight 700, neutral) one level below the panel heading,
   which keeps its emerald. «Entorno competitivo» is its section's title (`<h4>`, 14px, 600) with the
   status badge clearly secondary at 10px. The market block stops being a bordered, tinted card that
   competed with the heading, and a hairline gives the decisions their own section break. Hierarchy
   comes from type and spacing, never a heavy block. The «X de 4» count is untouched.
3. **Dark hover band on «Entorno competitivo» fixed at its source.** It was a class-less `<button>`,
   so `base.css` gave it `background: var(--action-primary)` and, on hover,
   `var(--action-primary-hover)`; the local rule reset the resting state but **not `:hover`**, and
   because it was `display:block; width:100%` the primary colour painted a full-width dark band. It is
   a status title, not navigation — the left navigation already goes there — so it became static text
   (`<h4>`). No `!important`, no painting over the inherited rule: the background is gone, the cursor
   is `auto`, it is no longer focusable, and the duplicated accessible name is gone too. No static
   label in the panel reacts to the cursor; genuinely interactive controls keep their hover.

Gate (2026-09-29): typecheck/lint PASS; pnpm test 122/122 (3 new); test:e2e 80/80 (16 per
project, five projects, run one at a time for memory); test:visual 10
passed + 1 skipped; focused browser verification 168/168 at 390/768/1366×768/1440×900/1920×1080,
measuring hover background luminance rather than trusting a selector. No migration, no schema change,
no dependency change. Foundation, UI and Brand Master validators NOT RUN: no Python interpreter on
this machine.

---


Current phase: **PRE-TESTER UX MICRO-HOTFIX** (2026-09-29). The previous production hotfix is already
deployed and was verified manually. This pass is uncommitted.

DELIVERED HERE:

1. **Local inference feedback.** The global activity panel sits at the top of the workspace, so asking
   for possibilities from a decision further down the page looked like a freeze. A local mirror of the
   SAME state now renders beside the control: `activityStart/Step/Done/Fail` paint both. It is a second
   view, never a second process — no extra request, timer or generation state, and the client still has
   exactly one `/api/recommendations/generate` call site. The button disables and reads «Generando
   posibilidades…»; the block announces through `role="status"` + `aria-live="polite"` rather than a
   spinner alone; on completion the options are revealed without a jarring jump, honouring
   `prefers-reduced-motion`. Failure clears the state, keeps the draft and leaves retry available.
2. **Entorno competitivo is strategic preparation.** Moved out of «Contexto y aprendizaje» into a new
   first group, PREPARACIÓN ESTRATÉGICA, above the four decisions it informs. It is NOT a decision: no
   number, no `data-module`; the Decision Spine still has four, and neither the «X de 4» count nor the
   activation metrics changed.
3. **Market status in Contexto vigente**, in its own block and deliberately outside the decision count.
   Sin investigar / Pendiente de revisión / Revisado, derived from canonical state: incorporated
   findings are Brand Context evidence, discarded ones are recorded rejections, and both survive a
   reload. Unresolved candidates live only inside the round that produced them — they are never
   strategy — so stored state reads as Revisado or Sin investigar, never a pending review with nothing
   left to review. The server derives the same status for the PDF from stored state alone.
   Rail status loads **without blocking the workspace**: `refresh()` still issues one request and the
   rail repaints when the extra data arrives. An earlier version chained that request inside
   `refresh()` — the hottest path, run after every mutation — which delayed each subsequent render
   enough that, on a loaded machine, a click could be swallowed. `phase10a.spec.ts` caught it and the
   visual suite was not relaxed.
4. **Competitive hand-off in its own words**: «Contexto competitivo revisado», «Continuar a <next
   pending decision>» from `nextPhase()` (one journey model, no second ordering), «Revisar contexto»
   as the secondary action.
5. **Denser sidebar.** The fourth group pushed «Mi aprendizaje» and «Blueprint estratégico» below the
   fold at laptop heights. Nothing was removed or collapsed; the savings are spacing only, and the 44px
   touch target is kept wherever a coarse pointer is possible (36px only under `(pointer: fine)`).
   Measured: at 1366×768 the Blueprint now fits with no sidebar scrolling.
6. **Blueprint PDF export**, generated server-side from canonical state — see
   [BLUEPRINT_PDF_EXPORT](docs/15-handoff/BLUEPRINT_PDF_EXPORT.md). Only active versions; AI proposals
   are never exported as decisions; hypotheses are printed under an explicit «not facts» heading;
   discarded findings are absent; missing sections say «Aún no definido»; the demo brand is labelled.
   No new dependency: `pdf-writer.ts` is a minimal writer using the standard Helvetica fonts, with no
   headless browser. Authorization is `scope()` unchanged — foreign workspace 404, unassigned member
   403, no session 401 — and there is no public or temporary URL.

Gate (2026-09-29): typecheck/lint PASS; pnpm test 119/119 (9 new); test:e2e 75/75 (5 new browser
specs), run project by project because one full invocation exhausts this machine's memory;
test:visual 10 passed + 1 skipped; focused browser verification 193/193 at
390/768/1366×768/1440×900/1920×1080. No migration, no schema change. Foundation, UI and Brand Master
validators NOT RUN: no Python interpreter on this machine.

---


Current phase: **FINAL FUNCTIONAL PRE-TESTER HOTFIX** (2026-09-29). The previous production hotfix
is already deployed and was verified manually — the walkthrough showed the populated CoffeePolis, the
corrected intake layout, working legal routes and the visible possibilities CTA. No production commit
SHA is asserted here: it was not independently verified from this machine.

Second human production walkthrough. VERIFIED WORKING: populated CoffeePolis, privacy and terms
routes, intake desktop width, geography, primary market, per-option actions, core-decision phase
hand-off, admin.

FIXED HERE:

1. **"Ayúdame a generar posibilidades" was a no-op.** The button renders only inside the `draft`
   branch of `render()`, while its listener lived in `mountRecommendation()`, whose first statement
   is `if(draft)return;` — button and handler were mutually exclusive, so the listener never bound
   and the click produced no request, no error and no loading state. Its delegation target
   `#generate-recommendation` is rendered by that same function, so it did not exist either.
   `generatePossibilities()` is now the single generation path used by both surfaces, and the CTA is
   bound in `render()`.
2. **Options were generated into a hidden tab.** "Opciones" is a tab panel; generating from the
   initial input left "Decisión" active, so candidates rendered invisibly. Requesting possibilities
   now always selects the panel holding them.
3. **A discarded option leaked across phases.** Option ids are positional (`option-1`) and repeat in
   every proposal, and `discardedOptions` stored them unscoped, so discarding in Primary Customer
   made an untouched option in later phases render as already discarded, losing
   Incorporar/Modificar/Descartar. **Pre-existing defect, not introduced here** — found by verifying
   all four phases, and it blocked defect 1's stated acceptance criteria. Discards are now scoped to
   their own recommendation.
4. **The AI-notice acceptance held a third copy of generation.** It released no draft and selected
   no panel, so the first PILOT participant to ask for possibilities from the initial input and
   accept the notice would have seen nothing. It now resumes the same request through the shared
   path, leaving exactly one `/api/recommendations/generate` call site in the client.
5. **Competitive review had no hand-off.** `showPhaseHandoff()` was reachable only from the
   decision-form submit. Fixed at the shared layer: the hand-off takes its copy as a parameter and
   still derives the destination from `nextPhase()`, so there is no second phase ordering.
   Completion is the human-reviewed state — findings generated AND every one resolved by the
   participant — never "the AI finished generating".

FAILURE UX: generation failure shows one participant-facing message, leaks no provider or transport
detail, clears the loading state, keeps the typed draft and leaves retry available. Proven by
injecting a 500 carrying provider detail and the engine's `{error}` response.

DOCUMENTED GAP, NOT FIXED (scope control): document claims in Brand Context share the same resolvable
review shape (CANDIDATE/ACCEPTED/REJECTED) and also have no hand-off. Their completion is ambiguous —
processing another document reopens it — so a "phase completed" panel there is a product decision,
not a defect fix. The learning loop has no comparable canonical completed state.

Gate (2026-09-29): typecheck/lint PASS; pnpm test 110/110 (5 new, all 5 fail against the defective
code); test:e2e 50/50 (4 new browser specs); test:visual 10 passed + 1 skipped; focused browser
verification 192/192 at 390/768/1440 with a test Measurement ID so telemetry is really emitted, plus
failure UX 20/20. No migration. Foundation, UI and Brand Master validators NOT RUN:
no Python interpreter on this machine.

---


Current phase: **PRODUCTION VERIFICATION HOTFIX** (2026-09-29). Production is live on `2f84d29`; this hotfix is local and uncommitted.

First real human production walkthrough. VERIFIED WORKING: Google auth, required intake, CoffeePolis as Marca demo, Crear mi marca, geographic influence, primary market, phase hand-off, continue to next phase, revisar avance, per-option Incorporar/Modificar/Descartar, admin reachable, demo metric exclusions active.

FIXED HERE: (1) `/privacidad/` and `/terminos/` rendered the intake form for an authenticated participant who still owed intake — boot called `showIntake()` without checking the path, and `showIntake()` hides both sections; public documents now outrank the gate while the workspace stays gated. (2) Intake desktop layout — `.welcome` has three column tracks and intake overrode to two with three children, so the form wrapped under the image at 288px with 103px fields; at 1440px it is now 735px with 327px fields. (3) CoffeePolis was strategically empty (0/4 decisions, empty Blueprint); `ensureDemoContent()` seeds four approved decisions, one explicit hypothesis and a labelled demo contribution from deterministic repository fixtures, never an AI call and never invented research. (4) "Ayúdame a generar posibilidades" now appears under the initial input and delegates to the canonical generation control, so there is one engine and no automatic approval.

GA4: diagnosed before changing code and **no application defect exists**. With the ID configured, `/api/mode` returns it exactly, the CSP widens only for Google, gtag loads, dataLayer fills and a real `g/collect` POST fires with `tid=G-PVKQ2K90EQ`, with no console errors and no inline script. In production, `GA4_MEASUREMENT_ID` was already present in `pilot.env` before the restart, Brandopolis restarted successfully and health returned `ready`, yet GA4 Realtime still showed zero activity during the human walkthrough. **No root cause is assigned**: what remains is an unresolved runtime/browser/network analytics-delivery diagnosis. Manual verification must inspect `/api/mode`, `/analytics.js`, Google tag loading, the CSP, the browser console, `g/collect` network requests, browser ad-block and privacy behaviour, and the effective Measurement ID — checklist in [GA4_PILOT_ANALYTICS §7.bis](docs/15-handoff/GA4_PILOT_ANALYTICS.md).

ALSO FIXED: `core.autocrlf` rewrote `drizzle/*.sql` to CRLF on checkout, changing hashes that applied migrations are checked against, so a healthy database reported MIGRATIONS_REQUIRED and the local DEMO server refused to start. `.gitattributes` now pins `drizzle/** text eol=lf`, as it already did for brand assets and the served frontend. Production on Linux is unlikely to have hit this, but the invariant is now protected everywhere.

DEMO UPGRADE RULE: `ensureDemoContent()` only touches a brand classified `isDemo=true`, only when it has no approved decision version at all, never resets or rewrites, and is safe on every sign-in. A participant who already decided inside their sandbox keeps that work; a CoffeePolis created before this content existed is upgraded on next sign-in; real brands are never touched.

Gate (2026-09-29): typecheck/lint PASS; pnpm test 106/106; release rehearsal PASS; demo-metric regression PASS; browser verification 39/39. Foundation, UI and Brand Master validators NOT RUN: no Python interpreter on this machine.

---


Current phase: **PILOT AUTH + ANALYTICS** — branch `feat/pilot-auth-admin`, from d43fd4d. Not pushed, not deployed.

Delivered on this branch: mobile header defect closed; OIDC self-provisioning foundation (scope `openid email profile`, verified-claim enforcement on the provisioning path, `PILOT_AUTO_PROVISION` fail-closed by default, deterministic cohort, `user_accounts` + migration 0011); privacy-safe GA4 analytics behind `GA4_MEASUREMENT_ID`; production reconciliation and root-domain runbooks; consolidated handoff state.

NOT IMPLEMENTED: password credentials, email+password login, password recovery, SMTP transport, `/admin`, `/api/admin/*`, evidence view. Design recorded in [CURRENT_IMPLEMENTATION_STATE_2026-09-28](docs/15-handoff/CURRENT_IMPLEMENTATION_STATE_2026-09-28.md) §11.

Production: the approved landing (d43fd4d) is deployed and `brandopolis.ai` now redirects to the pilot. **This branch has NOT been deployed.** Migration 0011 is additive and must be applied with `pnpm pilot:migrate` before starting a version that includes it.

Google auth is CERTIFIED for arbitrary verified users: four multi-user tests prove distinct users and private workspaces per identity, tenant isolation across the real product surface, canonical identity at `(issuer, subject)` with email as metadata only, the `PILOT_AUTO_PROVISION` gate, and no duplication under concurrent first logins. No production code change was required. Known limitation: a new `subject` carrying an already-registered email is denied (safe, but blocks a Google account migration that keeps the address) — pending product decision. Config and callback: [GOOGLE_AUTH_PRODUCTION](docs/15-handoff/GOOGLE_AUTH_PRODUCTION.md).

Participant access status is configurable: `PILOT_DEFAULT_ACCESS_STATUS` defaults to APPROVED, so the current validation phase admits every authenticated participant immediately. PENDING and SUSPENDED are live in the model for a future controlled pilot and admin enforcement. Policy applies at first provisioning only; SUSPENDED revokes sessions immediately; `disable()` still outranks any status. The column lives on `user_accounts` and NOT on `pilot_identities`, because putting it there broke the frozen-build release rehearsal (bisected, then redesigned). Migration 0012 is additive; existing rows are APPROVED.

Pre-tester hardening (partial): AI inference panel overflow fixed (a no-media-query `.primary-workspace > .ai-activity {width:100%}` in product-shell.css outranked the phone rule); mobile header re-audited by measurement, with the PILOT label restored on phones because it costs 38px while only the engineering DEMO label costs 74px; Estratega de Marca terminology sweep across served copy; public `/privacidad/` and `/terminos/` routes; `contacto@brandopolis.ai` as the canonical public contact.

NOT BUILT in that pass, and still open before external testers: participant intake form and persistence, CoffeePolis demo brand with metric exclusions, geographic influence, phase-completion navigation, generate possibilities, per-option Incorporar/Modificar/Descartar, and the related telemetry. Each needs its own migration and metric-definition work; seeding demo activity without exclusions would corrupt pilot evidence. One product decision is pending: whether CoffeePolis is a read-only demonstration brand (recommended for the pilot) or a per-workspace sandbox copy.

CANONICAL DECISIONS (2026-09-28), recorded here because chats are not authoritative:

- CoffeePolis is an **editable per-workspace sandbox**, seeded through the canonical createBrand path. Never a shared mutable brand.
- CoffeePolis carries `isDemo=true` in `brand_profiles`; classification is server-side, never inferred from the brand name.
- **Demo activity is excluded from canonical pilot metrics inside the aggregation itself**, not by dashboard filtering. Demo exploration is reported separately as demoBrands/demoDecisions.
- **Participant intake will be REQUIRED before workspace access**, immediately after successful Google authentication. Decided, NOT yet implemented: the backend exists and is tested, but no screen calls it.
- Current access policy remains `PILOT_DEFAULT_ACCESS_STATUS=APPROVED`; there is no manual approval gateway in this pilot.
- Operator-provisioned and legacy/test workspaces are **never** back-filled with CoffeePolis. Seeding requires a self-service account profile.
- Geography never implies strategic market from physical location: it is declared per brand, never derived.
- Schema rule, confirmed twice by the release rehearsal: **adding tables is safe; widening a table shared with the frozen Pilot build breaks it.** `brand_profiles` and `participant_profiles` exist for that reason.

BUILT since: required participant intake (screen, authenticated API, server-side gate returning 403 INTAKE_REQUIRED, unified enterWorkspace entry after a real bypass was found in the login path), operator/legacy exemption via the account-profile signal, session-state `intakeRequired`, CoffeePolis "Marca demo" badge with its short explanation and "Crear mi marca", isDemo propagated to the interface through listBrands, and the pilot_intake_started / pilot_intake_completed / demo_brand_opened events.

BUILT: the last four pre-tester UX blockers are closed. Geography is asked in the canonical new-brand dialog and persisted through the existing endpoint; "Ayúdame a generar posibilidades" renames the existing recommendation engine as an explicitly optional path; every generated option exposes Incorporar/Modificar/Descartar (plus Reconsiderar for a discarded one) with provenance preserved and no automatic Decision; and a phase-completion hand-off panel offers "Continuar a <siguiente fase>" and "Revisar avance" inside the decision surface, with the next phase derived from canonical navigation. GOOGLE_AUTH_PRODUCTION.md carries the real publication state, and the Privacy Policy was cross-checked against the implemented intake fields (they match).

**PILOT WORKSPACE FREEZE (2026-09-29)**

> The current PILOT workspace is functionally frozen for external validation.
> Do not continue opportunistic UI or strategic-workflow polishing.
> Only defects discovered by regression or external testing may change the frozen workspace before validation.

ADMIN V1 (2026-09-29): `/admin` is a separate operator surface with Resumen, Estrategas de Marca, Evidencia and a Configuración placeholder. Authorization needs a live PILOT session, a provider-verified email and membership of `BRANDOPOLIS_ADMIN_EMAILS`, checked independently inside every endpoint; no address is compiled in. Canonical figures come from `report()`/`metrics()`, so the demo exclusions cannot drift; real and demo brands are always separate; underivable metrics are returned as `unavailable` rather than invented. Aggregate evidence is counts by bucket only, and city is omitted even in aggregate. Suspend/reactivate is audited and can never revive a `disable()`d identity. No migration.

DEFERRED, recorded so it is not mistaken for shipped: the visual feedback screen (the `/api/admin/feedback` endpoint exists and is tested, the view does not), date-filter controls in the UI (the evidence endpoint already accepts `from`/`to`), the operational participant CSV, and D7/D14/D30 retention until it is canonically derivable.

Remaining before external testers is operational, not code: deploy this branch (migrations 0011-0013 via `pnpm pilot:migrate` before the new version starts), set `PILOT_AUTO_PROVISION=true`, `GA4_MEASUREMENT_ID`, `BRANDOPOLIS_ADMIN_EMAILS` and the Google OIDC credentials, and publish the Google OAuth app to Production — the longest-lead item, since external Google sign-in does not work for arbitrary users until that review completes.

Gate (2026-09-28): typecheck/lint PASS; pnpm test 88/88; test:e2e 30/30; test:visual 10 pass + 1 skip, 0 fail; release rehearsal PASS; git diff --check clean. Foundation, UI and Brand Master validators NOT RUN: no Python interpreter on this machine.

NOT BUILT: the participant intake form itself (no fields specified). The status layer is wired so that "intake completed -> APPROVED" is already the configured default when that form lands.

---


Current phase: **PILOT LANDING — PUBLIC COPY + UX CLARITY** — COMPLETE (2026-09-28). Founder review: **APPROVED (2026-09-28)**.

Branch: `main`, from 89e2afe. Scope: public landing copy, UX clarity, public/authenticated state separation and landing-only motion. No backend, schema, migration, auth, tenancy, AI governance or Brand Context change; no new runtime asset; `src/transport/assets.ts` untouched. Production not deployed and not restarted.

Gate (2026-09-28): typecheck/lint PASS; pnpm test 64/64; test:visual 9 pass + 1 skip + 1 fail; test:e2e 24 pass + 6 fail (every failure in the `mobile` project); landing browser verification 54/54; contrast over photography PASS at 1440/1024/768/390; no horizontal overflow 1600→360; git diff --check clean.

Both browser failures PRE-DATE this work and are not caused by it. Verified by stashing all five changed files and re-running against 89e2afe on a restarted DEMO server: the same 6 mobile e2e tests and the same phase10a dialog test fail with the identical signature — `select#brands` inside `.header-brand-control` intercepts the pointer event for `#new-brand`. Contributing factor in this environment: the local DEMO database has accumulated 51 brands (names up to 45 chars) from repeated test runs, which widens the selector and worsens the overlap at 390 px; the historical 25/25 record was taken on a cleaner database. The affected tests cover concurrency, idempotency and brand isolation at the mobile viewport only — the same assertions pass in the wide, desktop, compact and tablet projects. FIX NOT ATTEMPTED HERE: it is authenticated workspace header layout, outside this landing-only task.

Foundation, UI validator and Brand Master validator NOT RUN: no Python interpreter on this machine (only the Microsoft Store alias). Required files and every relative markdown link were verified separately.

Next: pilot authentication and admin on `feat/pilot-auth-admin`. The mobile header overlap should be fixed there or in a dedicated fix before external use on phones.

---


Current phase: **PHASE 10B — FINAL PRODUCT POLISH + DEVELOPER HANDOFF** — COMPLETE (2026-09-25). Founder final visual review: **APPROVED (2026-09-26)**.

Branch: `handoff/phase10b-final-2026-09-25` (from 7be0b67). Tag: `brandopolis-mvp-handoff-ready-2026-09-25`. Verified code: 770458f. Not merged to `main` (GitHub `main` holds only the Foundation import). Start here: [NEXT_DEVELOPER_START_HERE](docs/15-handoff/NEXT_DEVELOPER_START_HERE.md); record: [FINAL_MVP_HANDOFF](docs/15-handoff/FINAL_MVP_HANDOFF_2026-09-25.md).

Engineering foundation: CLOSED (unchanged). MVP product: IMPLEMENTED. Final product polish (10A + 10B): COMPLETE. External production configuration: NOT PERFORMED.

Final gate (2026-09-25, founder copy 80ef75b + clean-clone rehearsal PASS at 770458f): typecheck/lint PASS; pnpm test 63/63; demo-encoding node test 1/1; test:e2e 25/25; test:visual 10 pass + 1 skip (historic encoding proof precondition absent); test:pilot:e2e 10/10; Phase10A evidence 2/2; Foundation, UI validator, Brand Master validator PASS; pnpm audit --prod clean (1 moderate dev-only esbuild via drizzle-kit); git diff --check clean. Independent final design and WCAG 2.2 AA reviews: no AA failure.

Findings: migration 0003 backfills mojibake questions only for brands existing when it runs (root cause of historic DEMO mojibake; fresh/PILOT DBs unaffected; repair via scripts/demo-encoding.mjs). The founder's :3000 DEMO process predates the final assets (served from memory) and must be restarted to show the final UI.

Next: founder visual review of the local DEMO, then LIVE_PILOT_LAUNCH_CHECKLIST. No feature work until real pilot evidence exists.

---

Current phase: **PHASE 10 — REAL TESTERS / FOUNDER PILOT** — STARTED, EXTERNAL CONFIGURATION PENDING ([start](docs/15-handoff/PHASE10_FOUNDER_PILOT_START.md)). Branch: pilot/phase10-real-testers-2026-09-25 from tag brandopolis-mvp-phases-1-9-final-2026-09-25 (d22e3c6).

Not live: testers, hosting, OIDC provider, Anthropic provider, production. No feature development until real pilot evidence exists or a deployment blocker requires code.

---

Current phase: **MVP PHASES 1–9 — FINAL CANONICAL CLOSURE COMPLETE** (frozen as `brandopolis-mvp-phases-1-9-final-2026-09-25` / `release/mvp-phases-1-9-final-2026-09-25`).

Brand Master: CANONICAL / APPROVED. Visual assets: CANONICAL. Frontend: CANONICAL MVP ([closure](docs/15-handoff/FINAL_FRONTEND_CANONICAL_CLOSURE.md)). Phases 1–9: CLOSED FOR MVP ([record](docs/15-handoff/MVP_PHASES_1_TO_9_CLOSURE.md)). AI: EXTERNAL CONFIG REQUIRED FOR REAL PROVIDER. Deployment: EXTERNAL CONFIG REQUIRED FOR REAL INTERNET PILOT. Production: NOT CLAIMED.

Final gate (2026-09-25): typecheck/lint PASS; pnpm test 58/58 (incl. 4 brand-runtime tests); test:e2e 25/25 in 3 consecutive full runs; test:pilot:e2e 10/10; test:visual 8/8 (5 viewports, 0 console errors, reduced motion, contrast incl. hero at 1440/1024/768/390); competition:check --isolated PASS and competition:test-boot 1/1; pilot:validate-config VALID (pilot.brandopolis.ai); Foundation PASS; UI validator PASS; Brand Master validator PASS (working tree and clean worktree); pnpm audit --prod: No known vulnerabilities found; git diff --check clean.

Historical RC browser flake: not reproduced (3/3 clean after final changes); recorded as unreproduced. Local DEMO PostgreSQL observation: start → use → clean stop (pg_ctl) → restart → data preserved, repeated this pass; no recurrence; recorded as a non-reproduced environment event. The DB now runs standalone (`pnpm db:start`) so server restarts never stop PostgreSQL uncleanly.

Next: Phase 10 — real testers / Founder Pilot (branch pilot/phase10-real-testers-2026-09-25). No feature development until real pilot evidence exists.

---

## Previous closure (MVP phases 1–9)

Current phase: **MVP PHASES 1–9 CLOSURE COMPLETE** — verdict: PHASES 1–9 CLOSED WITH EXTERNAL CONFIGURATION PENDING ([closure](docs/15-handoff/MVP_PHASES_1_TO_9_CLOSURE.md)).

Next phase: **PHASE 10 — REAL TESTERS / FOUNDER PILOT** (do not begin automatically; testers are not live).

Visual: CANONICAL MVP FRONTEND INTEGRATED. AI: EXTERNAL CONFIGURATION REQUIRED (`pnpm pilot:ai-smoke` pending a key). Deployment: EXTERNAL CONFIGURATION REQUIRED (hosting, OIDC provider, DNS for pilot.brandopolis.ai). Production: NOT CLAIMED.

Branch: frontend/final-visual-integration-2026-09-25 (from de13733, visual package). Candidate SHA: the commit that last modifies this file (`git log -1 --format=%H -- SESSION_STATE.md`); full SHA in the closure report. Frozen, untouched: live launch f552536 (tag brandopolis-live-launch-external-config-ready-2026-09-25), Pilot engineering af73d03, RC1 f494668.

Domain: public https://brandopolis.ai · pilot https://pilot.brandopolis.ai · OIDC callback https://pilot.brandopolis.ai/auth/callback.

Final gate (2026-09-25): typecheck/lint PASS; pnpm test 54/54; test:integration 54/54 (same suite); test:e2e 25/25 (6 full runs: 5 green, 1 with a single intermittent failure not reproduced in 5 later runs nor in 15 repeated mobile runs; cause not identified); test:pilot:e2e 10/10; test:visual 8/8 (5-viewport integrity with 0 console errors, canonical screenshots, reduced motion, contrast incl. pixel-measured hero); competition:start/check --isolated PASS and competition:test-boot 1/1; pilot:validate-config VALID for pilot.brandopolis.ai; preflight covered by the controlled-fixture test; Foundation PASS; UI validator PASS; pnpm audit --prod: No known vulnerabilities found; git diff --check clean.

Environment note: the developer's local DEMO PostgreSQL (55432, started by the user's `pnpm db:start`) stopped uncleanly during this pass for a reason outside the commands run here; it was restarted with `pnpm db:start` (WAL recovery, no data change) and verified (9 migrations, DEMO session valid).

Post-MVP register: [POST_MVP_DEFERRED_SCOPE](docs/15-handoff/POST_MVP_DEFERRED_SCOPE.md). Learning loops: [PILOT_LEARNING_LOOP](docs/15-handoff/PILOT_LEARNING_LOOP.md).

External inputs still required: hosting provider/region; dedicated PostgreSQL 17 `DATABASE_URL`; OIDC provider (issuer, client ID, secret or public client); DNS + TLS for pilot.brandopolis.ai; Anthropic key/model/budget (or AI disabled) and one `pnpm pilot:ai-smoke`; request-access destination; approval of the AI notice text; first testers' OIDC subjects and cohorts; hosted backup/restore rehearsal.

---

## Previous phase (Live Pilot Launch Gate)

Current Phase: LIVE PILOT LAUNCH GATE — closed by Claude Code.

Gate state: **EXTERNAL-CONFIG READY**. The repository, launch tooling, runbooks and tests are ready; nothing is deployed. No real hosting, OIDC provider or Anthropic API was used. Production: NOT CLAIMED.

Frozen Pilot engineering SHA: af73d0306e6fa0ba99462370a7ab5c1ba0c59f12 (tag brandopolis-pilot-engineering-ready-2026-09-25, branch release/pilot-engineering-ready-2026-09-25; untouched).
Live launch branch: pilot/live-launch-2026-09-25. Commits: b4f5091 (deployment prep), 9469ec2 (docs), b006b91 (launch validation), plus the closing commit that last modifies this file (`git log -1 --format=%H -- SESSION_STATE.md`; full SHA in the gate report).
Frozen RC1: f4946683c8767aedc6c2fc7403d03beb3ab61e04 (untouched).

Delivered in this gate: runtime free of dev-only imports (`pnpm install --frozen-lockfile --prod` + `pnpm pilot:start`, import graph verified); `pilot:validate-config` (offline), `pilot:preflight` (read-only), `pilot:smoke` (post-deploy); single-instance advisory lock; operator bound to the OIDC-discovered issuer; operator `report`; AI data notice with per-tester versioned acknowledgement and daily caps (no schema change); forward-only migration plan with divergence detection; DEMO tools refuse PILOT data; testable hosted backup wrapper; auth/AI/readiness logs without secrets; canonical second High-Value Event metric. Docs: PILOT_RUNBOOK, PILOT_DEPLOYMENT_CONTRACT (environment matrix), LIVE_HOSTING_DECISION, OIDC_PROVIDER_DECISION, AI_PROVIDER_LAUNCH, FIRST_TESTER_COHORT, DOMAIN_DNS_LAUNCH, LIVE_PILOT_LAUNCH_CHECKLIST, launch security review.

Final gate (2026-09-25): typecheck/lint PASS; pnpm test 52/52; test:integration 52/52 (same suite); test:e2e 25/25 (5 viewports); test:pilot:e2e 10/10 over HTTPS; competition:start/check --isolated PASS (9 migrations) and competition:test-boot 1/1; Foundation PASS (errors 0); UI validator --integrated PASS; pnpm audit --prod: No known vulnerabilities found; git diff --check clean. Real-process rehearsal on a scratch PILOT database (local HTTPS discovery endpoint, then dropped): validate-config VALID, pilot:migrate 9 applied then up to date, preflight PASS (backup tools WARN), pilot:start started, launch smoke 8/8 PASS, second instance refused, db:migrate/db:seed refused.

Schema/rollback: no migration added in this gate (still 0000–0008, 9 entries). The frozen build and this build read and write the same database both ways (automated test), so application rollback to af73d030 is supported; database changes are forward-only.

Known deferred risks: in-memory rate limiter (one instance, enforced); pg_dump/pg_restore execution not rehearsed (client tools absent locally); real OIDC provider and real Anthropic API not exercised; non-strategic creates not universally idempotent; no full WCAG audit; Chrome only.

Remaining human decisions: hosting provider and region; dedicated PostgreSQL 17 (DATABASE_URL); OIDC provider (issuer, client ID, secret or public client); PILOT_ORIGIN domain and DNS; Anthropic key, model and spend limit (or AI disabled); request-access destination; approval of the AI data notice text; first testers' OIDC subjects and cohorts.

Next: follow docs/15-handoff/LIVE_PILOT_LAUNCH_CHECKLIST.md. Do not begin a new product phase automatically.

---

## Previous phase (MVP / Pilot engineering)

Current Phase: MVP / PILOT RELEASE — Claude continuation of the Codex Pilot handoff.

Current Status: PILOT READY FOR CONFIGURATION AND FIRST TESTERS once external decisions are supplied (hosting, OIDC provider, domain, Anthropic account). Local DEMO remains ready. Production: NOT claimed.

Frozen RC1 SHA: f4946683c8767aedc6c2fc7403d03beb3ab61e04 (tag brandopolis-rc1-demo-ready-2026-09-24, branch release/rc1-frozen-2026-09-24; untouched).
Codex Pilot handoff: tag pilot-codex-handoff-2026-09-25 → 3ad7cff30be8bab567ff25f71be7f9d91fdd7484 (kept in history, not amended).
Claude Pilot final SHA: commit that adds docs/15-handoff/pilot-security-review.md, resolvable with `git log -1 --format=%H -- docs/15-handoff/pilot-security-review.md`; the full SHA is in the continuation report. Branch: pilot/mvp-release-2026-09-25.

Pilot scope delivered: provider-neutral OIDC login (confidential or public PKCE client, configurable redirect), explicit issuer+subject tester mapping, 8 h revocable sessions, operator CLI (create, assign, inspect, revoke-sessions, disable, classify-session, metrics), per-tester workspaces, multi-brand, DEMO/PILOT database separation enforced at startup, Anthropic adapter on the official SDK behind ModelGateway with safe failure, Pilot telemetry (activation = first approved Decision; Time to First Insight / First Decision via metrics), feedback and issue report, concise onboarding, request-access link, per-client in-memory rate limiting, clean PostgreSQL shutdown for backups, backup/restore and migration-preservation tests. Docs: PILOT_RUNBOOK, PILOT_DEPLOYMENT_CONTRACT, TESTER_GUIDE, COMPETITION_DEMO_GUIDE, pilot-security-review; ADR-0013/0014 updated.

Final gate (2026-09-25): typecheck/lint PASS; pnpm test 42/42 (27 RC1 contract + 3 RC1 review + 12 Pilot); test:integration 42/42 (same suite); test:e2e 25/25 (5 viewports); test:pilot:e2e 10/10 over HTTPS (2 tests × 5 viewports, including real browser OIDC login); competition:start/check --isolated PASS (9 migrations); competition:test-boot 1/1; Foundation PASS (errors 0); UI validator --integrated PASS; pnpm audit --prod: No known vulnerabilities found; git diff --check clean. The developer's local DEMO DB (55432) was forward-migrated to 0008 with pnpm db:migrate (additive).

Known deferred risks: in-memory rate limiting (single instance); pg_dump/pg_restore path not executed locally (no client tools) — rehearse on the chosen host; real OIDC provider and real Anthropic API not exercised (signed fixtures and simulated responses); non-strategic create operations are not universally idempotent (strategic Decision commits are); tester consent for sending Brand context to the AI provider must be collected; no full WCAG audit; Chrome only.

External human decisions required: hosting provider; OIDC provider and its issuer/client credentials; PILOT_ORIGIN domain; Anthropic account, model and budget (suggested model claude-opus-5); request-access destination; tester list (OIDC subjects) and cohorts; data-processing consent text.

Next engineering phase: do not begin automatically. Claude Code: CLOSED after this continuation pass.

---

## Previous phase (RC1)

Current Phase: RC1 Engineering Review Complete — engineering phase CLOSED.

Current Status: READY FOR LOCAL DEMO / TECHNICAL DELIVERY. Production: NOT claimed.

Codex baseline SHA: 538e8af1e84e6145477d4efb7fd2fadfcb856b48 (handoff reviewed independently; not amended).

Claude final closure SHA: commit that adds docs/15-handoff/claude-rc1-independent-review.md, resolvable with `git log -1 --format=%H -- docs/15-handoff/claude-rc1-independent-review.md`; the full SHA is recorded in the closure report (a commit cannot contain its own hash). Branch: codex/ui-kit-integration.

Independent review: Claude Code Pass 1 ACCEPT WITH NON-BLOCKING FINDINGS (0 P0, 0 P1, 4 P2). F-1 fixed (migration count derived from the journal), F-2 fixed (cookie Max-Age = remaining session lifetime, never extended), F-4 covered by test (lost-response retry of a review commit replays without side effects; no implementation change), F-3 deferred. Record: docs/15-handoff/claude-rc1-independent-review.md.

Final gate (2026-09-24, Claude): typecheck/lint PASS; pnpm test 30/30; test:integration 30/30 (same suite); test:e2e 25/25 at 1600×1000, 1440×900, 1280×800, 768×1024, 390×844; competition:start + competition:check PASS on the normal profile (reusing the existing local DB on 55432) and the isolated profile; competition:test-boot 1/1; Foundation PASS; UI validator --integrated PASS; pnpm audit --prod: No known vulnerabilities found; git diff --check clean. Accessibility measured in Chrome (1440×900, 390×844): min text contrast 4.68:1, focus ring 6.15:1, full keyboard-only M1 route with visible focus and no trap, reduced motion leaves no animated element. Not a WCAG or security certification.

Known deferred risks: Non-strategic create operations are not yet universally idempotent. Strategic Decision commits are idempotent. Broader create-operation idempotency is deferred beyond RC1. Plus the production items listed under Known Debt.

Next engineering phase: do not begin automatically. Codex: CLOSED for this phase. Claude Code: CLOSED after this pass.

RC closure: arranque en un comando, perfil aislado, readiness de DB/migraciones, sesión DEMO renovable sin elevar permisos, feedback/bloqueo de acciones y errores legibles. Runbook y revisión de seguridad en docs/15-handoff. Contratos, Bible, schema/config y migraciones preservados.

M1: GREEN. Se conserva el motor transaccional, historial, HARD Needs Review, revisión humana, idempotencia, aislamiento y conflicto entre pestañas.

Visual System: INTEGRATED. Assets y tokens canónicos; glass legible, navegación responsive y foco de drawer. Sin rediseño.

Strategic Vertical Slice: Customer → Business → Position → Message implementado y conectado por las reglas v1. Cuatro decisiones persistentes y versionadas.

Brand Context: UserInput, Evidence, Hypothesis, OpenQuestion, Experiment, Signal y Learning explícitos. Aprendizajes ACCEPTED disponibles en vista de contexto y Context Assembler. Categorías separadas; hipótesis nunca se presentan como evidencia. Presupuesto de caracteres con reserva para información crítica y omisiones declaradas.

Recommendations: DEMO_FIXTURE, alternativas didácticas fijas explícitas. ModelGateway, validación estructurada, guard de referencias, evaluación conservadora y trazas. Usar/modificar exige criterio y commit humano; rechazar no crea decisión. Cambio de contexto invalida propuestas. Sin IA en vivo ni research externo.

Experiment: PLANNED → RUNNING → COMPLETED / INCONCLUSIVE / CANCELLED; PLANNED → CANCELLED autorizado por continuación. Objetivo, criterio de éxito, responsable, relación con Decision/Hypothesis, creación/inicio/cierre persistentes. Completar exige señal. Fechas históricas desconocidas permanecen null.

Signal: observación con fuente, fecha no futura, autor y Experiment en curso. No crea Learning automáticamente.

Learning: CANDIDATE → REVIEWED → ACCEPTED / REJECTED mediante actor humano autorizado. Fuentes y límites conservados. Aceptación repetida del mismo actor idempotente. No cambia decisiones, versiones ni preguntas estratégicas.

Strategic Practice: eventos descriptivos ligados a User, privados y separados de Brand Context. Learning Moments de cuatro módulos con Por qué importa / Qué observar / En tu negocio / Cuidado con. Sin score, gamificación ni LMS.

Blueprint: proyección desde persistencia de decisiones vigentes, Needs Review, dependencias, hipótesis abiertas y aprendizajes aceptados. Sin almacenamiento duplicado ni ruta de escritura estratégica.

Multi-Brand: crear/listar/seleccionar según membership y asignación; etiqueta DEMO. Contexto aislado; borrador de decisión conservado por User/Brand/módulo en sessionStorage al cambiar marca o sección.

Progressive Intake: pregunta opcional «¿Qué estás construyendo?»; UserInput guardado atómicamente al crear Brand. Se puede iniciar incompleta.

Strategic Home: «Tu estrategia hoy» prioriza revisiones, preguntas abiertas, experimentos activos, señales sin interpretación y aprendizajes por revisar. Sin KPIs ficticios.

Competition Demo: pnpm demo:competition crea datos ficticios mediante casos de uso reales; cuatro decisiones, siete versiones, revisiones completadas y un aprendizaje aceptado. Resultado sin credenciales en .local/competition-demo.json. No acredita clientes ni resultados de negocio.

Browser QA: 25/25 Chrome PASS en 1600×1000, 1440×900, 1280×800, 768×1024 y 390×844. M1, stale conflict, contexto, aprobar/modificar/rechazar Recommendation DEMO, cuatro módulos, experimento/señal/aprendizaje, Blueprint, práctica, intake y cambio de marca. Cinco casos adicionales verifican doble submit, pérdida de conexión al guardar y respuesta 401 de sesión vencida sin mensaje crudo. Teclado/Tab/Escape/backdrop/focus return y reduced motion verificados. Capturas inspeccionadas en escritorio y móvil; sin overflow en recorridos comprobados. No se afirma certificación WCAG completa.

Foundation: PASS — Markdown 161 JSON 46 schemas 21 requirements 15 golden cases 13 errors 0. Validación visual integrada PASS.

Tests (cierre Codex, antes de la revisión; ver Final gate arriba para el resultado vigente): pnpm typecheck y pnpm lint PASS. pnpm test 27/27 (13.31 s). pnpm test:integration 27/27 (18.94 s; misma suite, no cobertura adicional). pnpm test:e2e 25/25 (1.7 min). pnpm db:migrate, pnpm demo y pnpm demo:competition PASS. pnpm audit --prod: No known vulnerabilities found. git diff --check verificado antes del commit.

Boot/readiness: competition:start y competition:check PASS normal/aislado. competition:test-boot 1/1 (3.7 s) tras reinicio del perfil aislado; misma marca persistente, Blueprint y recarga en Chrome 390×844. Ctrl+C dejó 3001/55434 sin listener y postmaster.pid ausente, sin borrar datos. /health 200/503 y migraciones incompletas cubiertos; sondeo HTTP real confirmó cinco rutas privadas 404, visitante 401, input inválido 400, CSRF 403 y marca inexistente 404.

Validation environment/time: Windows x64; Node v24.19.0, pnpm 12.4.2, Python 3.12.14, PostgreSQL 17 local. Suite final del 2026-09-24 22:57–23:00 America/Guatemala (2026-09-25 04:57–05:00 UTC); cierre documental posterior. Seguridad acotada PASS, sin HIGH pendiente identificado; riesgos residuales documentados, sin certificación ni afirmación de cero vulnerabilidades.

Database: PostgreSQL 17, 27 tablas, migraciones 0000–0007. 0006 preservada: Experiment/Signal/Learning/enlaces/CapabilityEvent. 0007 aditiva: plan, fechas e índices. Prueba de base limpia, upgrade desde 0005 con DecisionVersion existente y replay sin duplicación; historia comparada exactamente.

Domain Changes: se documenta PLANNED → CANCELLED por instrucción explícita de continuación. No se cambió Product Bible, enums ni schemas v1. Metadatos de plan separados del payload canónico. Telemetría nueva alineada con recommendation_approved/signal_added; learning_created sólo tras aceptación. Historia DEMO anterior conservada sin recalcular métricas.

Known Debt: autenticación/provisioning/recuperación de producción; proveedor IA real y evaluación semántica de calidad; política operativa de retención/borrado personal; backup/restore; auditoría WCAG completa y navegadores distintos de Chrome. Hypothesis no cambia automáticamente tras Learning; revisión de soporte de hipótesis aún pendiente. No hay research en vivo. Gateway mide caracteres y no simula tokens/costo; futuro proveedor requiere cancelación real de red. Datos DEMO locales no son evidencia de piloto.

Blockers: NONE para demostración local y revisión técnica. Producción depende de decisiones técnicas abiertas sobre auth/proveedor/despliegue. Patch independiente no localizado ni cotejado; limitación histórica, no bloqueo administrativo de M1/MVP.

Next Highest Value Task: decisión humana sobre la siguiente fase; revisión independiente de Claude completada. Auth de piloto sobre ADR-0004 se mantiene como decisión posterior; no continuar nuevas features en este RC.

Claude Code Review: COMPLETE (ver registro de revisión independiente). Revisar prioridades de handoff/CLAUDE_START_HERE.md y manifiesto docs/15-handoff/competition-mvp-rc1.md sobre el SHA exacto de entrega, sin rediseño.

Git: codex/ui-kit-integration. Checkpoints dd0afdc y 8e1b621 preservados. Correcciones en commits posteriores, sin amend, reset, squash, merge ni force push. 690d1a3 recupera el ciclo; 12103ef registra home/contexto/demo y QA P0. RC1 agrega sólo confiabilidad, validación y handoff. Sin tag, release GitHub ni despliegue.

Historial M1: docs/15-handoff/m1-implementation.md. Evidencia y alcance actual: docs/15-handoff/competition-mvp-implementation.md. Ejecución: LOCAL_HANDOFF.md.
