Status: canonical
Owner: Product / Engineering
Canonical: yes
Last reviewed: 2026-09-29
Related: docs/15-handoff/CURRENT_IMPLEMENTATION_STATE_2026-09-28.md, docs/04-domain-model/invariants.md
Depends on: Pre-tester UX micro-hotfix (2026-09-29)

# Mapa estratégico · exportación en PDF

## Terminología (decisión, 2026-09-29)

El nombre **visible para participantes es «Mapa estratégico»**. «Blueprint» es jerga del oficio y un
emprendedor no debería necesitar que se le explique. Una sola terminología, en todas partes donde se
lee: navegación izquierda, encabezado de la vista, avisos y **el documento exportado**
(«Mapa estratégico de la marca»).

**Los nombres técnicos no cambian** y ninguna URL se rompe: la ruta y el id siguen siendo
`#blueprint`, los endpoints `GET /api/blueprint` y `GET /api/blueprint/pdf`, el
método `engine.blueprint()` y el nombre de archivo
`Brandopolis-Blueprint-<slug>-YYYY-MM-DD.pdf` —
deliberadamente estable para no invalidar archivos ya descargados ni enlaces guardados.

El Estratega de Marca puede llevarse su mapa estratégico como documento. **No es una captura de pantalla**:
es un documento estratégico generado en el servidor desde el **estado canónico vigente** de la marca.

Acción: **Descargar PDF**, junto al encabezado de *Mapa estratégico*.

## Qué contiene

| Sección | Contenido |
|---|---|
| Portada | Brandopolis · nombre de la marca · «Mapa estratégico de la marca» · fecha de generación · «Marca demo» cuando aplica |
| Estado estratégico | Decisiones aprobadas (X de N, N = secciones de la marca: 7 desde [ADR-0022](../14-decisions/ADR-0022.md), 6 con [ADR-0021](../14-decisions/ADR-0021.md), 4 en marcas anteriores) · influencia geográfica · mercado principal · estado del contexto competitivo |
| Decisiones estratégicas | Las decisiones del recorrido de la marca (incluye Objetivo estratégico y Arena de mercado desde ADR-0021 y Promesa de marca desde ADR-0022): opción vigente, «Por qué», versión vigente y fecha de aprobación |
| Cómo se conectan | Dependencias entre decisiones (estricta / sugerida / informativa) |
| Contexto competitivo | Estado, y **sólo** los hallazgos incorporados, con fuente, fecha y límites |
| Contexto estratégico | Aportaciones del Estratega de Marca · evidencia registrada · hipótesis · aprendizajes aceptados |
| Pie de cada página | Brandopolis · fecha · «Este documento refleja el estado estratégico vigente al momento de su generación.» |

## Reglas de veracidad

Se cumplen en `src/application/blueprint-pdf.ts`, no en quien lo llama:

- **Sólo la versión vigente** de cada decisión. Una versión superseded nunca se exporta como actual.
- **Una propuesta de IA no es una decisión** y nunca aparece como tal. Sólo hay versiones aprobadas por
  una persona.
- **Las hipótesis se imprimen bajo un encabezado que dice que no son hechos**: «HIPÓTESIS · SIN VALIDAR,
  NO SON HECHOS».
- **Los hallazgos descartados no aparecen.** Descartar uno significa que no forma parte del contexto.
- Una sección sin datos aprobados dice **«Aún no definido»** en lugar de inventar contenido.
- La Marca demo se identifica como tal en la portada y en el pie de cada página. **No afecta métricas**:
  la exportación reutiliza `engine.blueprint()` y su evento existente `blueprint_viewed`, y las
  exclusiones de métricas demo siguen aplicándose sin cambios.

## Autorización y aislamiento

`GET /api/blueprint/pdf?brandId=…`, con la sesión del participante.

- Las tres lecturas que alimentan el PDF (`engine.blueprint`, `engine.brandDossier`,
  `engine.competitiveRejections`) pasan por **`scope()`, sin cambios**: la marca debe pertenecer al
  workspace de quien llama y, salvo que sea ADMIN del workspace, estarle asignada.
- **No se añadió ninguna regla nueva de autorización.** Un ADMIN de workspace ya podía leer
  `/api/blueprint` y `/api/context`; la exportación no amplía ese alcance ni concede acceso a otro.
- El aislamiento entre inquilinos no depende de un filtro posterior: `workspaceId` forma parte de la
  búsqueda, así que una marca de otro workspace responde `404` y una no asignada `403`, sin cuerpo.
- **No existe URL pública ni temporal.** El documento se entrega en la respuesta autenticada, con
  `Cache-Control: no-store` y `Content-Disposition: attachment`.

Nombre de archivo: `Brandopolis-Blueprint-<brand-slug>-YYYY-MM-DD.pdf`. El slug se normaliza sin
acentos, se reduce a `[a-z0-9-]`, se recorta a 48 caracteres y cae en `marca` si queda vacío, de modo
que separadores de ruta, comillas y caracteres de control no pueden llegar al encabezado.

## Arquitectura

**Sin dependencia nueva.** `src/application/pdf-writer.ts` es un escritor de PDF mínimo escrito aquí:

- El documento es texto estructurado —encabezados, párrafos y filas etiquetadas—, así que sólo hacen
  falta objetos de página, dos fuentes y salto de línea medido. No hay imágenes ni maquetación HTML.
- Usa **Helvetica y Helvetica-Bold**, dos de las 14 fuentes estándar que todo lector de PDF provee: no
  se incrusta ninguna fuente ni viaja una licencia con el archivo.
- Codificación **WinAnsi**, que cubre el rango Latin-1 que el español necesita.
- **No se usó un navegador headless** para imprimir HTML: sería órdenes de magnitud más pesado para
  imprimir texto que ya tenemos como datos, y añadiría una superficie de ejecución innecesaria.
- La salida es **determinista**: la misma entrada y la misma marca de tiempo producen bytes idénticos,
  que es lo que hace comprobable la exportación.

Verificación: `tests/blueprint-cases.ts` genera el PDF por HTTP y **lo vuelve a leer con `pdfjs-dist`**
(ya presente en el proyecto) para comprobar el texto extraído, además del aislamiento entre inquilinos
y la sanitización del nombre de archivo.
