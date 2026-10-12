Status: derived
Owner: Product / Engineering
Canonical: no
Last reviewed: 2026-10-11
Related: docs/15-handoff/PHASE3_LOCAL_CANDIDATE_2026-10-08.md, docs/14-decisions/ADR-0026.md, docs/14-decisions/ADR-0027.md, docs/14-decisions/ADR-0028.md, docs/14-decisions/ADR-0029.md, SESSION_STATE.md
Depends on: Fase 3 integrada en `main` (ver SESSION_STATE para el SHA exacto y el estado de los gates)

# Handoff a Fase 4 · Activation & Orchestration

> **Nota de conciliación · 2026-10-10.** Este documento describe el estado del 2026-10-09 y se conserva como
> registro histórico. Fuente del propietario (2026-10-10, no verificada por el agente): la Fase 3 se desplegó en
> PILOT en una conversación anterior y el propietario aceptó su resultado visual y funcional; el registro del
> despliegue no está en el repositorio. La Fase 4 empezó el 2026-10-10 con alcance confirmado (1A, 2C, 3C) más
> la identidad visual: [PHASE4_SPEC](PHASE4_SPEC.md) v2, [ADR-0030](../14-decisions/ADR-0030.md) a
> [ADR-0034](../14-decisions/ADR-0034.md) (proposed, corregidos tras la revisión R01–R10). Estado vigente:
> [SESSION_STATE](../../SESSION_STATE.md).

Fase 4 está **preparada para comenzar y NO iniciada**. Este documento describe el punto de partida; no autoriza
implementar nada. Producción no cambia con este cierre (Jury Production Freeze vigente; producción sigue en la
versión registrada en SESSION_STATE y no incluye las Fases 1–3).

## Estado del roadmap

| Fase | Estado |
|---|---|
| 1 · Strategic Core + Brando Foundation | COMPLETE |
| 2 · Strategic Intelligence | COMPLETE |
| 3 · Validation & Learning Engine | COMPLETE (integrada en `main`, no desplegada) |
| 4 · Activation & Orchestration | READY TO START · NOT STARTED |
| 5 · Measurement & Intelligence | NOT STARTED |
| 6 · Agentic Scale | NOT STARTED |

## Qué existe hoy (capacidades disponibles)

- **Decision Spine de nueve decisiones** con autoridad humana, versiones inmutables, historial, auditoría,
  dependencias HARD/SOFT/INFORMATIVE, Change Impact sin cascada automática y revisión guiada (causa, decisión
  vigente y origen antes de elegir).
- **Strategic Intelligence** determinista (coherencia, tensiones, orden de revisión, memoria y soporte).
- **Validation & Learning Engine** (ADR-0026): ciclo de hipótesis con autoridad humana y ciclos de re-prueba,
  experimentos con calidad de plan, señales con dirección, aprendizajes candidatos → revisados → aceptados o
  rechazados, procedencia asistida por prueba de un solo uso, impacto de validación como atención.
- **Strategic Workspace** (ADR-0027/0028): Inicio con progreso clicable, laterales plegables, rail Brando /
  Contexto / Atención / Historial, Modo enfoque, Validación como camino opcional, Mi aprendizaje (práctica y
  reflexiones privadas), Mapa estratégico con tarjetas blancas.
- **Brando B3** (prompt v6) con Anthropic real validado en la interfaz local (flujos A–E); propuestas siempre
  «Sin aprobar»; ninguna consulta escribe estrategia.
- **Documentos**: Mapa estratégico ejecutivo y Brand Book integral (PDF A4 editoriales, deterministas, sin IA).
- **Eliminación segura de marcas** (ADR-0029): ADMIN, nombre exacto, idempotente, purga de archivos con
  reintento, reflexiones y analítica conservadas y desvinculadas.

## Contratos y migraciones

- Esquemas JSON v1 en `schemas/` (incluye `personal-reflection`, `signal` con `capturedAt`).
- Configuración versionada: módulos v5, dependencias v5, prompt Brando v6.
- Migraciones nuevas de Fase 3: `0014` (reflexiones personales) y `0015` (registro `brand_deletions`, funciones
  que sólo permiten borrar versiones y auditoría dentro de una eliminación de marca registrada en la misma
  transacción, `pilot_feedback.brandId` anulable). Son aditivas; en un despliegue futuro se aplican con
  `pnpm pilot:migrate` **antes** de iniciar la versión (la app nunca migra al arrancar). Ninguna se ha aplicado en
  producción.

## Deuda técnica y limitaciones aceptadas

- `reviewHypothesis` filtra señales en memoria y la procedencia asistida lee la telemetría de la marca (volúmenes
  de piloto pequeños; diferido por el propietario).
- Reintento de purga de archivos: resuelve rutas contra el `BRANDOPOLIS_DOCUMENT_ROOT` vigente; cambiar esa
  variable entre ejecuciones dejaría archivos huérfanos en la ubicación anterior.
- Las copias de seguridad externas pueden conservar datos de una marca eliminada hasta que caduquen.
- Brand Book sin identidad visual de la marca: no existe todavía almacenamiento de logotipos, paleta ni
  tipografías de marcas.
- Fuentes PDF estándar (Helvetica/Times, WinAnsi): caracteres fuera de WinAnsi se sustituyen por `?`.

## Costos y seguridad de IA

- Anthropic sólo se llama por acción explícita (generar posibilidades, consultar a Brando, interpretar señales).
  La prueba en vivo de Fase 3 usó dos llamadas reales. Topes por participante y diarios configurables en PILOT.
- La clave nunca se guarda en el repositorio, logs, base de datos ni capturas; en local vive sólo en la memoria
  del proceso del servidor.

## Reservado para Fase 4 (no implementado)

- Activación: Productos y servicios, Plan de marketing y Resultados siguen «Próximamente» en la navegación.
- Orquestación de acciones a partir de decisiones aprobadas (campañas, calendarios, automatizaciones,
  conectores): nada de esto existe ni debe crearse sin una decisión de planificación de Fase 4.
- Dependencia a decidir en la planificación: si «Productos y servicios» es un prerrequisito de Activación.

## Punto de partida recomendado

1. Sesión de planificación de Fase 4 con el propietario: alcance de Activación y orden (Productos y servicios →
   Plan de marketing → Resultados) y criterios de aceptación.
2. ADR de Activación antes de cualquier código; contratos v1 nuevos en `schemas/` y pruebas de autoridad humana
   (ninguna activación sin decisión aprobada; sin cascada automática).
3. Mantener la Jury Production Freeze: cualquier despliegue requiere autorización explícita separada.

## Iteración Clientes · issue #10 (2026-10-11)

Registro vigente del traspaso; lo anterior se conserva como historia.

**Roadmap de seis macrofases (actualizado).** 1–3 completas. **4 · Activation & Orchestration**: en curso en
`feat/phase4-marketing-web-collaboration` (marketing, identidad, inicio guiado, colaboración y portal
implementados y validados en DEMO; ver SESSION_STATE), más el adelanto aprobado de **Clientes** y **Resultados**
ampliados. **5 · Measurement & Intelligence**: medición prevista + núcleo comercial, mensajería inicial, Brando
asistente interno, cierre humano, atribución/ROAS, asesores/partidas, metas, históricos y forecast de ganados.
**6 · Agentic Scale**: conectores ampliados, atención automática de Brando por marca/canal con traspaso humano.

**Fuentes.** Issue #10 (2026-10-11T17:16:28Z, sin comentarios) y plan v5 (§§11–13), paquete de reconciliación
revisión 3. GitHub `main` sigue en `1f1cece` (Fase 3) y no contiene la Fase 4 local; no se usa para sobrescribirla.

**Evidencia previa, sin trasladarla a código nuevo.** Sobre `1ef95bd`: 475 unitarias, PILOT 10/10, E2E 277 PASS +
13 SKIP con cuatro intermitencias sin diagnóstico (`phase3.spec.ts:110`, `micro-hotfix.spec.ts:27`,
`phase4-plan.spec.ts:77`, `m1.spec`): una repetición verde no las diagnostica. Cuatro capturas v5 y cinco nuevas
del menú siguen pendientes de decisión del propietario.

**Orden del bloque.** 1) Reconciliación documental (PHASE4_SPEC §12, matriz I10 con trazabilidad, requisitos
I10-EXT, alcance, ADR-0030/0033 v-notas, ADR-0035 propuesto). 2) Captura nativa con migración aditiva `0027`
(ADR-0035). 3) Formulario de desarrollo, evidencia de origen, segmentos, aislamiento y fallos. 4) Navegación de
ocho áreas y Resultados con resúmenes reales. 5) Prueba acotada de Chatwoot sólo con entorno aislado y accesos (no
junto a las E2E en el equipo de 8 GB). 6) Exportaciones y el resto de bloques.

**Pendientes conservados.** Invitado PILOT real con correo verificado y envío por correo; PRT-006; búsqueda del
portal y PDF de la guía; ONB-009 con proveedor real; IA real; permiso propio para compartir y recursos aprobables por
un invitado (decisión del propietario); dominios, consentimiento y medición; integraciones Canva/Google/Meta;
Atomic/Chatwoot sin seleccionar. Distinguir siempre documentado, implementado, validado en DEMO, validado con
proveedor o identidad real y desplegado. No se autoriza push, despliegue, compras ni mensajes a clientes.

**Actualización · verificación (2026-10-11).** Clientes y Resultados de Fase 4 verificados en DEMO sobre el árbol del
commit de verificación (detalle y árbol de cada prueba en SESSION_STATE): E2E 295 (282 PASS · 13 SKIP · 0 FAIL),
unitarias 484, PILOT 10/10. Queda la aprobación visual del paquete único de capturas, la propuesta de permisos
(PHASE4_SPEC §12.5: opción A recomendada, compartir con `MANAGE_GUESTS`), proveedor de correo y aviso definitivo.
`phase3.spec.ts:58` queda como fallo observado una vez (503 durante presión de memoria), no reproducido. Siguiente
trabajo: exportaciones.

**Actualización · capturas, permiso y exportaciones (2026-10-11).** Capturas del menú de ocho áreas aprobadas y aplicadas
(`597ad70`); compartir exige `MANAGE_GUESTS` (`8288310`); exportaciones PDF/PPTX/DOCX implementadas y verificadas en
PowerPoint/Word 16.0.16026 y pdf.js (ver SESSION_STATE y PHASE4_EXPORTS_EVALUATION §5). Siguiente bloque de la Fase 4:
sitios (renderizador, vista previa autenticada, formularios con el formulario nativo de Clientes, medición), sin
publicación real ni dominio hasta su decisión.

**Actualización · sitios web (2026-10-11, bloque 7).** Marketing › Sitio web implementado y validado en DEMO
(`8d00287`, `562e32a`, `897e61a`): crear, propuesta de Brando, edición por secciones, vista previa autenticada,
publicación y restauración en el servidor aislado, formulario hacia Clientes y dominio propio por TXT. Para probarlo:
`pnpm competition:start --isolated`, `pnpm sites:public --isolated` y `pnpm sites:preview --isolated`. Estado por
criterio en la matriz (v20) y en SESSION_STATE. Pendiente de decisión: dominio de publicación, HTTPS por dominio,
medición y consentimiento con etiquetas reales; pendiente técnico: ZIP del sitio y regresión completa.

**Actualización · sitios en DEMO, cierre local (2026-10-11).** `28bb7d0` completa el alcance local de Sitios:
duplicados del formulario detenidos en el servidor, nueva verificación diaria de dominios (migración aditiva 0030,
`pnpm sites:public --isolated --domain-checks`), testimonios y cifras con fuente, vista previa por tamaño y ZIP de una
versión aprobada. Estado por criterio y evidencia por prueba en la matriz (v21). Siguen pendientes de decisión o
proveedor el dominio de publicación, HTTPS y DNS por dominio, las comprobaciones DNS reales, la medición y el
consentimiento con etiquetas reales y la publicación real. Siguiente bloque según PHASE4_SPEC §7: bloque 8 (Canva,
Google Ads y Meta Ads en el alcance definido; resultados y revisión del ciclo).

**Actualización · bloque 8 local (2026-10-11).** `5356f57` corrige la navegación de Clientes (sección elegida
durante la carga). `9e373b4` y `4c692df` implementan el bloque 8 con simuladores: campañas creadas en
pausa, Canva, resultados por fuente y revisión del ciclo. Para revisarlo en local:
1. `pnpm competition:start --isolated`.
2. `pnpm external:worker --isolated`.
3. Marketing › Campañas digitales: conectar la cuenta simulada, crear la campaña, aprobarla, solicitar la creación en
   pausa (con escenario) y comprobar.
4. Materiales de venta: el brief con Canva.
5. Resultados: campañas y revisión del ciclo.

Estado por criterio en la matriz (v22). Pendiente de decisión: activación y gasto, medición para captación, correo.
Pendiente de proveedor: cuentas reales de Google, Meta y Canva. Siguiente según PHASE4_SPEC §7: bloque 9 (revisión
integral, seguridad, pruebas completas, DEMO de aceptación, informe de riesgos), cuando el propietario decida qué
queda dentro de la Fase 4 sin proveedores.
