# Bloque consolidado para Claude — próxima iteración local

Fecha: 12-10-2026. Leer junto con la guía visual y la matriz R12C de esta carpeta.

## Encargo

La revisión de aceptación sigue abierta. Implementa una simplificación transversal de la experiencia de Brandopolis: formularios proporcionados al dato, jerarquía clara, listas compactas y Brando como ayuda discreta desde el principio. La pantalla de trabajo del usuario debe ocupar el protagonismo.

La nueva instrucción precisa las anteriores: «Brando al inicio» significa un acceso compacto en la cabecera y ayudas por campo. Elimina los bloques grandes permanentes que desplazan los campos. Reduce la exposición repetida de «versión», «aprobar», fuentes y otros metadatos; conserva su funcionalidad en estados comunes, revisión e historial.

Este bloque también conserva las observaciones R12B, las plantillas de planificación y calendario, el análisis de Media Planning Canvas y el roadmap futuro. No se sustituye todo Marketing sin conciliar primero el alcance y los límites del análisis.

## 1. Recuperar el estado real antes de implementar

El último reporte de desarrollo indica código c660124, documentación 6c4756b, rama feat/phase4-marketing-web-collaboration; siete commits sobre 5a76d0f. No se ha inspeccionado ese repositorio desde este traspaso. Comprueba HEAD, rama, árbol y cambios posteriores. No hagas reset, checkout destructivo ni sustituyas trabajo más reciente por documentos históricos.

Si estás en un nuevo equipo, usa el traslado del repositorio de 04_Migracion. El ZIP documental no contiene esos commits. No empieces desde main suponiendo que incluye el trabajo local. Si no está disponible el código del candidato, termina lo que sea posible de conciliación documental e informa de ese bloqueo concreto.

Lee AGENTS.md y las instrucciones vigentes del repositorio. Conciliar PHASE4_SPEC, matriz de aceptación, ADR, SESSION_STATE, CHANGELOG y guía de DEMO. Las migraciones 0028–0032 se reportaron aplicadas solo a bases aisladas; verifica el journal real antes de iniciar y no migres una base compartida.

## 2. Registrar la modificación de alcance

Antes del código, registrar R12C como revisión transversal de experiencia y anexar los criterios R12B todavía abiertos. Usa la numeración de ADR libre en el repositorio; no presuponer que ADR-0037 está disponible.

La simplificación se aplica ahora a las superficies existentes de Fases 1–4 y constituye la norma de las futuras 5–6. No reabre por sí misma sus reglas de negocio ni permite recortar funcionalidad validada. No implementar bot público, editor de flujos, billing o administración SaaS por esta iteración.

Distingue cambios visuales, defectos de interacción, compromisos pendientes de Fase 4 y ampliaciones de Marketing. No describas el conjunto como «solo CSS»: foco, paneles, revisión y preservación de entradas pueden necesitar cambios de lógica.

## 3. Implementar la guía transversal

Aplicar `01_ESTILO_VISUAL_TRANSVERSAL.md` en componentes/tokens compartidos. No introducir un framework frontend nuevo para hacer el rediseño.

1. Cabecera compacta, navegación con icono y texto, estado activo inequívoco y área central clara.
2. Campos de tamaño adecuado y ayuda breve. Usar desplegables de detalle, no pantallas llenas de cajas y rótulos auxiliares.
3. Acceso superior «Trabajar con Brando» y ayudas «Sugerir/Mejorar». Panel solo a petición, propuestas revisables, aplicación parcial, entradas manuales preservadas y sin llamadas automáticas al modelo al abrir pantallas.
4. Un estado y circuito de revisión por entidad. Historial/versiones/fuentes accesibles en un lugar común. Antes de enviar, seguir mostrando responsable y alcance. En revisión, decisión y comentarios claros.
5. Lista compacta de productos, posibilidad de tarjetas, expansión por entidad, filtros y orden automático o manual persistente con alternativa de teclado.
6. Misma interacción y semántica en desktop y móvil, sin ocultar funciones vitales tras hover, iconos incomprensibles o texto demasiado tenue.

Trabaja primero en patrones comunes y comprueba Estrategia, Identidad y Productos; después extiéndelos al resto de superficies existentes. No entregar una pantalla bonita dejando las otras con dos estilos incompatibles.

## 4. Corregir la pérdida de contexto

Reproduce en todas las operaciones relevantes: guardar, aplicar/adoptar propuesta, aprobar, pedir cambios, cargar archivo, modificar periodo, expandir detalles y volver de completar un faltante.

Preserva foco y posición de trabajo en la misma entidad. Mantén filtros, pestaña, expansiones y borrador. Cubre respuestas tardías y cambios de altura del contenido. Si el control desaparece, enfoca el resultado o la siguiente acción lógica. Respeta navegación intencional y foco de errores.

Conserva la corrección previa de Clientes: una acción durante la carga inicial no puede perderse ni ser reemplazada por una respuesta atrasada. No cambies pruebas para tolerar una navegación errónea ni añadas esperas arbitrarias.

## 5. Completar las observaciones R12B

- **Archivo y kit:** cargar un PNG clasificado como logotipo no demuestra que quede asignado a un uso del kit. Muestra y permite elegir su rol y versión de destino. Vincular al borrador no modifica por sí mismo lo publicado. Reproduce el caso del usuario y explica su estado sin que tenga que adivinar qué hará la aprobación.
- **Faltantes:** cada aviso, como tono de marca, enlaza al campo concreto, abre el bloque si estaba contraído y permite volver conservando el trabajo.
- **Descubribilidad:** mantener icono y texto en pestañas importantes, orden solicitado del menú y selección visible de Estrategia.
- **Resultados:** Hoy y Ayer según la zona de la marca. Hoy parcial; comparar ventanas equivalentes o indicar la diferencia. Conservar la semántica de cada indicador.
- **Plan:** objetivos, acciones, responsables, fechas, presupuesto y calendario deben estar conectados. Contrastar PHASE4_SPEC §4.2 y §4.4 actuales para distinguir funcionalidad ausente de mala presentación.

## 6. Marketing: dirección y límite antes de ampliar

Dirección propuesta: convertir la estrategia aprobada de la marca en un plan de activación vivo, presupuestado, calendarizado y revisable.

Media Planning Canvas ya se probó funcionalmente en sus áreas gratuitas; Activación y Seguimiento quedaron bloqueados por el plan. No afirmar que fueron verificados ni deducir integraciones, publicación o medición real de sus títulos. La captura nueva es referencia de diseño, no evidencia de esas capacidades.

Puedes implementar las correcciones transversales y completar los compromisos ya vigentes de Fase 4. Prepara el diseño y la conciliación de la ampliación metodológica usando seis bloques: objetivo; público/oferta; canales; recursos; acciones/fechas; revisión. Reutiliza la información estratégica aprobada, sin pedirla de nuevo.

Presenta flujo, modelo, diferencias respecto al alcance actual, criterios y estimación. La reconstrucción metodológica completa y los modelos tácticos nuevos siguen sujetos a resolver el acceso Business o a una decisión expresa basada en la evidencia parcial. No dejar por ello detenidos los arreglos de UX autorizados.

La plantilla Excel es referencia de organización, no de exactitud matemática. No sumar CPL, NPS ni tasas trimestrales. Derivar cada agregado de los datos compatibles. Mantener objetivos, estimaciones y resultados reales separados, con moneda, periodo, fuente e incertidumbre.

## 7. Calendario editorial vivo

Conciliar e implementar lo ya comprometido en Fase 4; documentar expresamente las ampliaciones necesarias de revisión por lotes y permisos antes de codificarlas.

Una pieza base admite variantes por red, copy, formato, CTA, enlace, arte, responsable, fecha/hora y zona horaria. Vistas mes, semana y lista muestran los mismos registros. Relacionar con plan, campaña y repositorio sin duplicar presupuesto ni acciones.

El usuario revisa un periodo o lote antes de ejecutar. La aprobación se vincula a las versiones concretas de cada pieza, red, arte y programación. Admitir devoluciones con comentarios y aprobación parcial sin esconder pendientes. Aprobar un tema sin contenido final no permite publicarlo.

Conservar entrega aprobada, cambios en preparación y avance operativo. Si cambia una pieza, revisar la autorización afectada y bloquear un envío desactualizado; las demás conservan su aprobación. Vista compartida con permisos explícitos, comentarios internos separados y resumen de cambios. Una facultad de calendario para un invitado no le concede aprobación de estrategia u ofertas.

La aprobación editorial no autoriza gasto. Programación interna, publicación confirmada por proveedor y registro manual son estados distintos. Localmente continuar con simuladores y mecanismos existentes; no inventar una integración de publicación social.

## 8. Preservar las garantías y pendientes

Conservar aislamiento por marca/persona, política de autoaprobación y segunda persona, revisores, versiones, comentarios, notificaciones, archivos y fuentes. Reasignar no otorga permisos. Aprobación editorial, publicación y gasto siguen separados.

No inventar precios, fuentes, resultados ni estados externos. Canva/Google/Meta y correo siguen simulados. Reintentos y conciliación no deben crear duplicados. Una respuesta tardía no debe ejecutar una versión sustituida o revocada.

Mantener todos los pendientes del candidato, incluidos adaptadores reales/OAuth, HTTPS/DNS, medición, privacidad, invitado real, correo real, cierre de marca, exportaciones, fuentes, portal, cambio de espacio de trabajo y los que indique el repositorio. ADR-0035 sigue propuesto; Atomic y Chatwoot no están adoptados.

## 9. Verificación y entrega

- Verifica cada criterio R12B/R12C y explica pendientes; no marques «validado» por existencia de un botón.
- Prueba flujos reales de edición y revisión con permisos diferentes, entradas escritas y respuestas tardías. Usa pruebas deterministas para foco/posición y preservación de datos.
- Revisa los cinco proyectos de navegador existentes, teclado, zoom y las pantallas largas. Detecta barras que cubran campos, diálogos o acciones.
- Ejecuta las puertas de calidad exigidas por el repositorio y una regresión completa sobre el candidato final, porque esta iteración toca componentes compartidos. Si no se ejecuta, declara exactamente qué falta y sobre qué commit pasó lo demás.
- Presenta comparación antes/después del mismo contenido y tamaño, y el impacto sobre las 17 referencias canónicas. No actualizar las referencias sin aceptación visual expresa. Las 11 referencias pendientes del candidato anterior no se consideran ya aceptadas.
- Entrega un recorrido breve: entrar, construir manualmente, pedir ayuda, aplicar parcialmente, guardar sin salto, enviar al responsable, revisar, completar un faltante y volver. Añadir lista compacta, logo, Hoy/Ayer y calendario según alcance implementado.
- Reporta código y documentación, migraciones, servicios y resultados exactos; conserva fallos históricos. Detén los servicios que hayas iniciado. No push ni despliegue.

La entrega es una nueva iteración local para aceptación. No declara Fase 4 cerrada ni candidato release-ready.
