# Guía visual transversal — Brandopolis

Fecha: 12-10-2026 · Dirección solicitada por el propietario · R12C.

## 1. Objetivo

Una experiencia **clara, compacta, amable y centrada en el trabajo del usuario**. La persona entiende qué está construyendo, encuentra la siguiente acción y recibe ayuda cuando la necesita. La complejidad del sistema permanece disponible, presentada en el momento pertinente.

Esto alcanza Estrategia, Inteligencia, Validación, Identidad, Productos y servicios, Marketing, Colaboración y Resultados existentes. Se convierte también en la norma de diseño para las futuras superficies de Fases 5 y 6. No agrega sus funcionalidades a la implementación actual.

El cambio abarca jerarquía, componentes y comportamiento; no se resuelve solo reduciendo fuentes, paddings o textarea. Se conserva la identidad gráfica propia de Brandopolis y se reutilizan sus componentes y tecnología.

## 2. Referencia observada y límite de la evidencia

La captura aportada `image(20261012-184105).png` muestra la sección Target de Media Planning Canvas: recorrido superior, dos grupos de campos relacionados, botón global de ayuda en la esquina del encabezado y acciones «Mejorar» junto a campos. Es la referencia del equilibrio entre trabajo y asistencia.

La imagen sirve para definir jerarquía visual. No permite certificar su accesibilidad, comportamiento móvil, calidad de IA ni controles de autorización. Sus contadores pertenecen a ese momento de la cuenta; no sustituyen el registro de la sesión anterior.

Adoptar la ayuda contextual y la agrupación. No reproducir su marca, sus textos, sus grandes zonas vacías, sus rótulos excesivamente tenues o el reemplazo directo de texto observado en la prueba anterior. Brandopolis necesita conservar una aplicación explícita de propuestas.

## 3. Jerarquía de una pantalla

| Nivel | Qué se ve | Qué se abre a demanda |
| --- | --- | --- |
| Orientación | Nombre de la tarea, una frase útil si hace falta, pestañas con icono y texto. | Ayuda ampliada y explicación metodológica. |
| Trabajo | Campos agrupados, contenido, vista o calendario. | Campos avanzados y secciones opcionales. |
| Asistencia | «Trabajar con Brando» arriba; «Sugerir» o «Mejorar» junto a campos pertinentes. | Preguntas, propuesta, comparación y conversación. |
| Estado | Un estado comprensible por entidad y la siguiente acción relevante. | Historial, versiones, fuentes, autor, fecha y registro de decisiones. |

En la vista inicial del editor, el título, el primer campo y la ayuda compacta deben entrar sin una gran introducción de Brando. Un formulario puede usarse completamente a mano desde el primer momento.

No colocar a la vez una tarjeta introductoria, un chat lateral abierto, un bloque «Cómo puede ayudarte Brando» y botones equivalentes. Elegir un punto principal de entrada y ayudas locales útiles.

## 4. Composición y densidad

- Centro blanco o casi blanco, claramente más claro que los laterales. Separación por superficie y borde sutil; evitar marcos anidados y sombras repetidas.
- Un encabezado breve. El acceso al estado y a revisión ocupa una zona común por documento o entidad.
- Columna editorial de aproximadamente 720–960 px; tablas y calendarios pueden aprovechar 1120–1280 px. Son límites de referencia, no anchos fijos que produzcan desbordamiento.
- En escritorio, dos columnas solo para grupos que se entienden juntos y siguen siendo legibles. Texto narrativo largo en una columna. En móvil, una columna con el mismo orden semántico.
- Separación de 8–12 px entre etiqueta y controles relacionados; 16–24 px entre campos/grupos; 24–32 px entre secciones principales. Evitar grandes áreas vacías entre bloques cortos.
- Controles de una línea para nombres, importes y fechas; textarea de 2–3 líneas para respuestas breves, 4–6 para narrativa. Crecer con el contenido y permitir edición ampliada; no convertir todos los campos en cajas gigantes ni truncar contenido guardado.
- Anchos acordes al dato: un importe o fecha no ocupa por defecto toda la página. Etiquetas persistentes; el placeholder no sustituye al título del campo.
- Ayuda de una frase cuando evita un error. Ejemplos y teoría en «Ver ejemplo» o «Ayuda». No repetir «versión», «fuente», «aprobación» bajo cada campo si ya se explican a nivel del documento.
- Listas de entidades con encabezado compacto y detalle desplegable. No abrir todos los productos, campañas o decisiones al entrar. Mantener búsqueda, filtros y orden disponibles.
- Preferir separadores a cajas dentro de cajas. Un grupo no necesita una tarjeta por cada dato.

## 5. Base visual propuesta

Mapear estos valores a los tokens existentes y mostrar el resultado en las pantallas reales. Son una propuesta concreta para esta iteración, no colores ya aprobados como referencia canónica.

| Token / uso | Propuesta |
| --- | --- |
| Superficie de trabajo | #FFFFFF |
| Fondo general | #F7F8FA |
| Laterales y superficie auxiliar | #EEF1F5 |
| Texto principal | #243247 |
| Texto secundario | #566176 |
| Acento de acción | #334F88; conservar el acento actual si cumple la misma jerarquía y legibilidad. |
| Borde decorativo | #D9DEE7 |
| Límite de un control interactivo | #7B879A cuando el borde sea necesario para identificarlo. |
| Radio | 8 px en controles; 12 px en paneles. |
| Texto de edición | 16 px; altura de línea próxima a 1,5. |
| Etiquetas / texto auxiliar | 14 px; evitar textos funcionales diminutos. |
| Título de pantalla | 24–28 px; subtítulo de sección 18–20 px. |
| Iconos | Un sistema coherente, 16–20 px y texto en navegación. |

No introducir una fuente web nueva solo para esta revisión. Usar la familia existente y reservas del sistema. Reservar color intenso para acción, selección, foco y avisos pertinentes; no usar cada bloque de un color diferente.

Objetivos de verificación del proyecto: texto normal con contraste mínimo 4,5:1; indicadores y límites interactivos necesarios, 3:1 respecto al fondo adyacente; foco visible, zoom al 200 % y operación por teclado. Verificar los estados reales, no declarar cumplimiento únicamente por los hexadecimales. Mantener área táctil cómoda, como objetivo 44×44 px, aunque el icono visible sea pequeño.

## 6. Brando: presente y discreto

### Entrada superior

Botón secundario compacto «Trabajar con Brando», con icono y texto, en la cabecera del bloque o editor. No es obligatorio pulsarlo para empezar. Ofrece acciones pertinentes: «Ayudarme a empezar», «Completar faltantes», «Revisar este bloque».

Si hay suficiente contexto, puede proponer; si no, pide el dato mínimo o señala lo que falta. No exigir un interrogatorio antes de escribir manualmente. No generar llamadas al modelo ni consumo solo por abrir una pantalla.

### Ayuda por campo

«Sugerir» en un campo vacío y «Mejorar» en uno escrito, cuando aporte valor. Acción discreta junto a la etiqueta, accesible siempre con teclado y en móvil, no solo al pasar el puntero. No rellenar de destellos todos los inputs, especialmente precios, permisos o fechas que exigen decisión humana.

Tips de una línea junto al problema, sin invadir el formulario. Las fuentes necesarias para la propuesta pueden mostrarse como resumen «Usará 3 decisiones de tu marca», con detalle desplegable.

### Propuesta y conversación

Para una mejora breve, expandir una región contigua con el resultado, «Aplicar» y «Descartar». Para una tarea extensa, abrir un panel a petición del usuario. Nunca dejar un chat dominante abierto por defecto en todos los módulos.

En escritorio amplio, el panel puede ocupar aproximadamente 320–360 px, procurando no superar un tercio del espacio útil. Si comprime demasiado el editor, usar diálogo o vista dedicada. En móvil, panel superpuesto solo tras solicitarlo, con cierre claro, foco contenido y retorno al disparador. No cubrir permanentemente el formulario ni su acción principal.

Antes de aplicar, mostrar qué campos se cambiarán; permitir selección parcial cuando afecte a varios. Conservar lo escrito y evitar sobrescrituras por respuestas tardías. Si el campo cambió mientras Brando trabajaba, pedir resolver la diferencia. Aplicar no aprueba, publica ni autoriza gasto.

Un retorno o deshacer debe seguir la política de versiones del producto, sin borrar auditoría. Lo simulado y el dato sin evidencia conservan su indicación, presentada una vez en el contexto adecuado.

## 7. Edición, revisión y trazabilidad

Usar una cabecera o franja breve por entidad: estado, responsable si hay revisión y acción siguiente. Ejemplos: «Borrador · Guardar»; «En revisión · Con Ana · Ver comentarios»; «Cambios solicitados · Revisar 2 comentarios»; «Aprobado · Crear cambios».

La versión numérica, identificadores, fecha y fuentes van en «Detalles e historial». Cuando se compara o aprueba una versión, su identidad sí debe mostrarse en ese contexto. Una vista del cliente debe dejar claro si ve la entrega aprobada o cambios pendientes, aunque no repita el número por todos lados.

Una sola acción principal por contexto. En edición, guardar o enviar a revisión según el estado y la tarea. En revisión, aprobar o solicitar cambios son decisiones visibles. No esconder el permiso de publicar, la confirmación de activación o un error bloqueante dentro de un menú ambiguo.

No agregar guardado automático ficticio. Si el producto utiliza guardado manual, mostrarlo con claridad. Si se propone autosave, especificar persistencia, errores y conflictos antes de adoptarlo; no es requisito implícito de este rediseño.

Eliminar duplicados visuales de controles, no las reglas de negocio. La autorización se sigue comprobando en servidor. Una revisión editorial no concede permisos de gasto.

## 8. Continuidad del trabajo

Guardar, aplicar una propuesta, aprobar, pedir cambios o subir un archivo dentro de la misma vista debe conservar el punto de trabajo. Mantener ancla, foco, desplazamiento, pestaña, filtros, expansiones y borrador pertinentes. Actualizar solo lo necesario.

Si el botón deja de existir, llevar el foco al estado actualizado o siguiente acción lógica. Cerrar un panel devuelve el foco al disparador. Navegar a otra sección o a un error puede cambiarlo de forma intencional. No simular la corrección con pausas arbitrarias o una posición absoluta que falla cuando cambia la altura del contenido.

## 9. Aplicación transversal

| Superficie | Aplicación concreta |
| --- | --- |
| Inicio | Resumen breve y acciones pendientes personales. Notificaciones en el panel derecho a demanda; evitar otra columna de tarjetas de IA. |
| Estrategia / decisiones | Lista o recorrido compacto; editor enfocado en la decisión. Dependencias, fuentes e historial en detalle; acción de Brando en cabecera y por campo. |
| Inteligencia | Hallazgos resumidos; evidencia y conflictos expandibles. La conclusión no se confunde con una aprobación. |
| Validación | Pregunta, prueba, resultado y aprendizaje en grupos claros; experimentos compactos. Ayuda contextual sin reabrir automáticamente el chat. |
| Identidad / Marca y recursos | Vista previa del kit, asignación de cada archivo a su uso y enlaces para completar faltantes. Brando superior compacto. |
| Productos y servicios | Lista contraída o tarjetas; nombre, tipo, resumen de precio y estado. Planes de precio al expandir; ordenar y modo manual separados. |
| Marketing / plan | Recorrido corto conectado al contexto de la marca. Acciones, presupuesto y calendarios como vistas de los mismos registros. |
| Redes / materiales | Calendario o lista como protagonista; editor de una pieza y variantes. Revisiones y comentarios en su contexto. |
| Campañas | Datos esenciales primero; objetivos y tipos visibles. Autorizaciones y modo simulado explícitos al operar; parámetros avanzados expandibles. |
| Colaboración / portal | Entregas compartidas claras, comentarios y decisiones cerca del contenido; separar notas internas de las compartidas. |
| Resultados | Periodo, comparativo y lectura principal arriba; fuentes y detalle accesibles. Hoy parcial, Ayer completo; no ocultar la ausencia de conexión. |
| Futuras Fases 5 y 6 | La misma guía para integraciones, equipo, modelos, billing/créditos, conocimiento del bot y flujos. No implementarlos por este cambio visual. |

## 10. Entrega de diseño y aceptación

Aplicar primero los componentes comunes y comprobar tres pantallas representativas: una decisión de Estrategia, Identidad y una oferta con varios planes. Mostrar además una tarea de Marketing con tabla o calendario para comprobar que el patrón escala.

El encargo del propietario permite continuar por las superficies existentes sin pedir aprobación por cada margen. Presentar al final capturas comparables y recorrido funcional para la aceptación humana. La actualización de referencias canónicas requiere esa revisión; no convertir las capturas nuevas en aprobadas automáticamente.

La aceptación se basa en trabajo visible, ayuda accesible, menos repetición, lectura y controles comprensibles. Una reducción de altura a costa de texto ilegible no cumple el objetivo.
