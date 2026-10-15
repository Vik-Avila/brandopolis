Status: UX audit of owner-provided screenshot; design direction approved; implementation not yet started/accepted
Owner: Product / UX / Engineering
Date: 2026-10-14
Related: UXR_EXPERIENCE_ARCHITECTURE_2026-10-14.md; PHASE4_UXR_MACROPHASE_EXECUTION_2026-10-14.md
Source: screenshot of live local Club de baile Strategy workspace shared by founder. Visual observations only, not code/runtime test evidence.

# UXR · Transformación de la pantalla real de Estrategia

## Evidencia visual AS-IS

La pantalla local observada muestra:
- Header: Brandopolis original, selector **Club de baile**, «Nueva marca», indicador **DEMO LOCAL · IA EN VIVO**, botón Salir y un bloque destacado **Brando / Consultar** con la gema canónica.
- Izquierda: navegación Inicio, Estrategia, Marca y recursos, Productos y servicios, Marketing, Clientes, Colaboración, Resultados, Mi aprendizaje, Configuración de marca y Ayuda.
- Centro: tres pestañas generales («Decisiones», «Validación», «Mapa estratégico»); recorrido de **nueve decisiones** desplegado horizontalmente.
- Dentro de la decisión: título «Objetivo estratégico» con pregunta, estado vigente/versión/fecha/autor, subpestañas («Decisión», «Evidencia e hipótesis», «Opciones», «Historial»), bloque «Lo que ya sabemos de tu marca» y la decisión vigente.
- Derecha: dock compacto con entrada adicional a Brando, contexto, alertas, historia/notificaciones y contadores.

No se ha medido dificultad de uso ni se ha inspeccionado toda la página; la evidencia es la densidad visible en la captura. La duplicación de accesos a Brando y la concentración de jerarquías son problemas de **presentación**, no evidencia de que sus motores deban descartarse.

## Decisión TO-BE

**Una sola superficie de Brando como entrada, workspaces especializados completos como destinos.** La primera pantalla del usuario presenta una intención libre y un siguiente resultado útil. No muestra simultáneamente los nueve pasos, todas las pestañas y todos los paneles.

### Inicio conversacional (pantalla por defecto)
- Cabecera ligera: logotipo canónico, marca activa (selector seguro), modo real/simulado informado por el servidor, usuario.
- Centro: gema canónica de Brando en escala moderada, «¿Qué vamos a construir hoy?», campo de intención libre, adjuntar documentos solo con flujo seguro; atajos Crear mi marca / Mejorar mi estrategia / Conseguir clientes / Planear una campaña.
- Debajo, si existe actividad: **Continuar donde lo dejaste** y máximo una o dos acciones significativas (no lista completa de estados).
- Navegación profesional disponible, pero no imprescindible para comenzar; paneles y herramientas contextuales bajo demanda.

### Estrategia (destino especializado, no onboarding obligatorio)
Jerarquía inicial:
1. **Tu objetivo vigente** — formulación real ya aprobada, sin reescribirla.
2. **Qué quieres mejorar** — Brando puede trabajar con la intención del usuario y el contexto aprobado.
3. **Propuesta de Brando** — candidato separado claramente del estado vigente; opciones Revisar/Ajustar/Descartar; decisión humana con razón cuando el contrato lo exige.
4. **Qué sigue** — abrir Marketing, Validación o la decisión relacionada según necesidades.
5. «Ver Mapa estratégico / Explorar las 9 dimensiones / Historial y fuentes», accesibles sin pasar forzosamente por chat.

No modificar la decisión vigente «reclutamiento efectivo...» por estética o redacción sin una nueva versión aprobada; una redacción alternativa es propuesta, no hecho.

### Validación
No eliminar hipótesis, experimentos, señales ni aprendizajes, pues sustentan el aprendizaje del sistema. Presentar opciones simples como «Comprobar una idea» y «Qué descubrimos» cuando tengan sentido. Mantener la vista profunda de Validación, estados, evidencias y aprobaciones para expertos. El usuario no debe aprender el vocabulario metodológico antes de conseguir su primer resultado.

### Brando: presencia y identidad
- Imagen canónica: gema geométrica esmeralda con oro, nunca persona/mascota humana. No regenerar ni modificar geometría, ni logo Brandopolis.
- Brando protagonista en Inicio; compacto en tareas especializadas; un solo hilo lógico, sin dos asistentes competidores.
- Estados visuales (en reposo, escuchando, consultando, proponiendo) solo con variaciones cuidadosas de pose/orientación, luz y microanimación; reducción de movimiento.
- El texto «IA real» solo si el servidor confirma proveedor/modelo en esa DEMO. Simuladores de plataformas externos se rotulan por separado.

## Mapeo AS-IS → TO-BE (sin pérdida de capacidades)

| AS-IS visible | TO-BE contextual | Capacidad preservada |
| --- | --- | --- |
| Brando grande arriba y otro acceso lateral | Entrada Brando-first en Inicio y acceso contextual único | Gateway y permisos de conversación |
| 11 destinos siempre desplegados | Navegación compacta con accesos directos profesionales | Todas las rutas de F1-F4, marca activa, accesibilidad |
| 9 etapas horizontales permanentes | Resumen y «Explorar las 9 dimensiones» | Todas las Strategic Decisions y dependencias |
| Pestañas de Decisión/Evidencia/Opciones/Historial visibles | Resumen primero, profundidad cuando se solicita | Calidad de evidencia, alternativas, historial/autoridad |
| Bloque extenso «Lo que ya sabemos» antes de la acción | Síntesis contextual con fuente y «ver detalle» | Contexto confirmado vs declaración vs hipótesis |
| Validación como término metodológico de primer nivel | «Comprobar una idea»/«Qué descubrimos», expert mode directo | Hipótesis, experimentos, señales, aprendizajes |
| Rail con varias herramientas/iconos y badges | Detalles, alertas e historial solo cuando relevante | Review, notificaciones, permisos |
| «Vigente · v1», fecha y autor junto al título | «Objetivo vigente» prominente, metadata en «Detalles» | Versionado, responsable, auditoría |

## Navegación y wireframe textual orientativo

INICIO
[Logo Brandopolis]  [Club de baile ▼]   [IA real / DEMO, verificado]   [Perfil]
[Inicio] [Estrategia] [Marca] [Marketing] [Clientes] [Resultados] [Trabajo/Todas las herramientas]
                            [Gema Brando ORIGINAL]
                       ¿Qué vamos a construir hoy?
       [Tengo un club de baile y quiero más alumnos y retenerlos...]
       [Crear marca] [Mejorar estrategia] [Conseguir clientes] [Planear campaña]
       Continuar: Objetivo aprobado  · Campaña por revisar

ESTRATEGIA
Estrategia de Club de baile
Tu objetivo vigente: [síntesis legible, acceso al texto exacto aprobado]
[Mejorar con Brando]  [Ver Mapa estratégico] [Explorar 9 dimensiones]
Si hay propuesta: [Recomendación / fundamento / supuestos]
                 [Revisar y decidir] [Modificar] [Descartar]
Avanzado (a demanda): [Evidencia] [Historial] [Hipótesis] [Dependencias] [Validación]

## Reglas de implementación

1. Reusar estructuras, contratos, permisos y editores existentes; no introducir un segundo estado estratégico desde el chat.
2. Mantener inputs y drafts, foco, pestañas, scroll, navegación móvil y protección ante respuestas tardías (R12B/R12C).
3. Una aprobación humana explícita escribe/versión a través del dominio existente; Brando solo prepara. No usar aprobación automática al aceptar un mensaje.
4. No borrar las nueve decisiones; el Mapa estratégico sigue siendo derivado, no un editor maestro.
5. No reformar producción ni el PILOT congelado. Trabajar en rama local F4 después de reconciliar con HEAD más reciente.
6. Mockups aprobados como **dirección con preferencia ligera por la segunda propuesta**, no contrato pixel-perfect. Corregir cualquier deriva visual de diseños generados: logo y gema originales son obligatorios.
7. En el demo local con IA real: verificar proveedor/modelo desde servidor, límites de coste y tres flujos reales, sin llamar automáticamente al modelo solo por abrir una vista.

## Pruebas de aceptación de esta pantalla

- Usuario novato: desde Inicio redacta objetivo de Club de baile; recibe propuesta útil con contexto y una sola pregunta relevante cuando falte información.
- No hay obligación de completar nueve etapas para empezar.
- Usuario experto: abre cualquier etapa, historial y evidencia sin conversar; los datos no desaparecieron.
- Brando no cambia el objetivo ya vigente en ausencia de commit humano.
- La gema visible coincide con el recurso canónico, sin rostro, geometría nueva ni pérdida de branding.
- Ningún panel tapa cabeceras/acciones en móvil; teclado y screen reader alcanzan navegación y propuesta.
- Multi-brand switch conserva separación tenant/brand; badges «IA real» nunca se derivan únicamente del frontend.
- Los tests de regresión de F1-F4 y de seguridad/versionado se ejecutan sobre el SHA local real.
