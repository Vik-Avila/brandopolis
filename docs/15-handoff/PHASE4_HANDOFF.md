Status: derived
Owner: Product / Engineering
Canonical: no
Last reviewed: 2026-10-09
Related: docs/15-handoff/PHASE3_LOCAL_CANDIDATE_2026-10-08.md, docs/14-decisions/ADR-0026.md, docs/14-decisions/ADR-0027.md, docs/14-decisions/ADR-0028.md, docs/14-decisions/ADR-0029.md, SESSION_STATE.md
Depends on: Fase 3 integrada en `main` (ver SESSION_STATE para el SHA exacto y el estado de los gates)

# Handoff a Fase 4 · Activation & Orchestration

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
