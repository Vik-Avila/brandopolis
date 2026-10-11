Status: derived
Owner: Engineering
Canonical: no
Last reviewed: 2026-10-11
Related: docs/14-decisions/ADR-0030.md, docs/15-handoff/PHASE4_SPEC.md, docs/15-handoff/PHASE4_ACCEPTANCE_MATRIX.md, docs/15-handoff/PHASE4_EXTERNAL_REQUIREMENTS.md
Depends on: ADR-0030 «Exportaciones» (técnica elegida después de comprobar); bloque 6 de PHASE4_SPEC §7

# Fase 4 · bloque 6 · evaluación del generador PDF propio y de jszip (2026-10-11)

Evaluación técnica previa a implementar exportaciones. No cambia el runtime. ADR-0030 exige elegir la técnica después
de comprobar estos criterios: PPTX que abre sin reparación y con texto editable, PDF fiel al kit con dos marcas
distintas, español sin pérdida y fuentes con alternativa revisada y aviso (EXP-001…005). Una dependencia nueva
exigiría ADR propio y aprobación humana.

## 1. Lo que existe

| Pieza | Qué hace hoy | Límites frente a EXP-001…005 |
|---|---|---|
| `src/application/pdf-writer.ts` (224 líneas) | PDF 1.4 determinista, A4, paginación, ajuste de líneas con métricas de Helvetica | Sólo fuentes estándar (Helvetica) con codificación WinAnsi |
| `src/application/pdf-editorial.ts` (206) | Superconjunto editorial (ADR-0028): serif y sans estándar, reglas y rellenos vectoriales, PNG con alfa, índice con páginas reales, marcadores, pies paginados; texto seleccionable | Times se mide con 0,93 × Helvetica (aproximación); sólo PNG (no JPEG/WebP); sin fuentes incrustadas |
| `editorial-kit.ts`, `brandbook-pdf.ts`, `blueprint-pdf.ts` | Mapa estratégico y Brand Book integral (sin identidad visual de la marca) | No leen el kit publicado |
| `jszip` 3.10.2 (dependencia de producción; licencia MIT o GPL-3.0) | Sólo lectura de DOCX/PPTX en el extractor de documentos | Puede escribir ZIP con DEFLATE: suficiente para OOXML |
| Kit (ADR-0034) | Acepta archivos TTF, OTF, WOFF y WOFF2 validados por firma; tipografías con permisos web/documentos y alternativas por canal revisadas | La interfaz ya registra permisos y alternativas: es la entrada que necesita EXP-004 |

**Español (EXP-003):** WinAnsi cubre acentos, ñ, ü, ¿ ¡ « » “ ” ‘ ’, – —, …, € y $; los símbolos fuera de WinAnsi se
sustituyen por `?` o se transliteran (✓ → «-», → → «->»). Con fuentes estándar no se cumple «sin pérdida» para
cualquier texto, y la tipografía nunca es la del kit (EXP-005).

## 2. Comprobación técnica (spike en el scratchpad, sin cambios en el repositorio)

- **PPTX con jszip:** un paquete OOXML mínimo (`[Content_Types].xml`, relaciones, diapositiva con un cuadro de texto
  nativo `p:sp`/`txBody`) se genera con DEFLATE y se vuelve a leer con el texto intacto (acentos, ñ, comillas tipográficas,
  guiones, € y $). Faltan en el spike las partes obligatorias de maestro, diseño, tema y presentación. No se ha
  abierto en una aplicación: la aceptación EXP-001 exige la aplicación de destino (EXT-REQ-12); en el equipo hay
  PowerPoint instalado, pero el propietario no ha confirmado cuál es el destino real de sus clientes.
- **TrueType sin dependencias:** lectura del directorio de tablas de `C:\Windows\Fonts\arial.ttf`: `glyf`/`loca`,
  `hmtx`, `cmap` (formatos 4 y 12, Unicode BMP y completo), `OS/2.fsType` = 8 (editable: se permite incrustar). Es la
  información necesaria para incrustar un subconjunto y para rechazar fuentes con incrustación restringida.

## 3. Brechas y técnica propuesta

| Brecha | Propuesta sin dependencia nueva | Coste estimado |
|---|---|---|
| Fuentes del kit en PDF (EXP-004/005) | Ampliar `pdf-editorial.ts` con fuentes TrueType incrustadas como `CIDFontType2` + `Identity-H`, subconjunto de glifos usados (`glyf`/`loca` reescritos), anchos `W`, `CIDToGIDMap` y `ToUnicode` (texto seleccionable y buscable); comprobar `OS/2.fsType` antes de incrustar | 1,5–2,5 sesiones |
| OTF (CFF) | Incrustar el programa CFF completo como `FontFile3`/`OpenType` (PDF 1.6) sin subconjunto; si el tamaño es excesivo, usar la alternativa revisada | 0,5 sesiones |
| WOFF / WOFF2 | WOFF: descomprimir tablas con `node:zlib` y tratarlo como SFNT. WOFF2 exige reconstruir `glyf` transformada (Brotli está en `node:zlib`, la reconstrucción no): **no soportado al principio**, se usa la alternativa revisada con aviso | 0,5 sesiones (WOFF) |
| Fuente sin permiso o ausente | Alternativa por canal revisada del kit y aviso visible en la descarga; nunca sustitución silenciosa (EXP-004) | incluido |
| Imágenes JPEG/WebP del kit | JPEG directo con `DCTDecode`; WebP se convierte o se omite con aviso (no hay decodificador WebP en el código) | 0,5 sesiones |
| PPTX editable (EXP-001) | Generador OOXML propio con jszip: maestro, diseño, tema con la paleta del kit, diapositivas con cuadros de texto nativos, imágenes en `ppt/media`; fuentes declaradas por nombre (PPTX no incrusta por defecto) con la alternativa del canal cuando falte permiso | 2–3 sesiones |
| DOCX y TXT (textos reutilizables) | OOXML de Word con jszip (párrafos y estilos); TXT ya existe | 1 sesión |
| ZIP del sitio | jszip; depende del bloque de sitios | con el bloque 7 |
| Comparación renderizada (EXP-005) | Reutilizar `pdfjs-dist` (ya instalado) para rasterizar y comparar con dos marcas | 0,5–1 sesión |

**Recomendación:** ampliar el generador propio y usar `jszip` para OOXML. No hace falta una dependencia nueva ni, por
tanto, un ADR de dependencia; la implementación sigue ADR-0030. Los riesgos son la complejidad del subconjunto de
fuentes y la compatibilidad OOXML, que sólo se acredita abriendo los archivos en la aplicación de destino.

## 4. Orden propuesto y evidencia

1. PDF con fuentes TrueType incrustadas y `ToUnicode`, con pruebas U de bytes (glifos, anchos, `fsType`) y de texto
   extraído con `pdfjs-dist` (EXP-003/004).
2. Guía de marca en PDF desde la versión publicada del kit (pendiente del portal y de PHASE4_SPEC), con comparación
   renderizada de dos marcas (EXP-002/005).
3. PPTX de la presentación comercial y DOCX de textos, con prueba U de estructura OOXML; verificación X en la
   aplicación que confirme el propietario (EXT-REQ-12).

Decisión pendiente del propietario: aplicación de destino para verificar exportaciones (PowerPoint, LibreOffice o
ambas). No bloquea los pasos 1 y 2.

## 5. Resultado de la implementación (2026-10-11)

La solución propia cumple los criterios comprobables en este equipo, así que no se propone ninguna dependencia nueva.

- **PDF:** fuentes TrueType y WOFF del kit incrustadas como `CIDFontType2` con subconjunto (los glifos no usados se vacían
  y se conservan los componentes compuestos) y `ToUnicode`; texto seleccionable y copiable, idéntico al extraerlo.
  Carácter ausente en la fuente: se dibuja con Helvetica o «?» y se informa. Imágenes PNG (con alfa) y JPEG; WebP se
  informa. Lectura defensiva: tamaño máximo de 10 MB, límites en cada tabla y error controlado.
- **Permisos:** consulta e impresión (PDF) frente a documentos editables: «sólo vista previa e impresión» permite el PDF
  y no el editable; «restringida» o «sólo mapa de bits» impiden incrustar; además manda la licencia declarada en el
  kit (`NOT_ALLOWED` nunca se incrusta; `UNKNOWN` se incrusta si el archivo lo permite, con aviso).
- **PPTX/DOCX:** paquetes OOXML completos con jszip; cuadros de texto y párrafos nativos, tema con la paleta y las
  tipografías del kit por nombre (sin incrustar; si no está instalada, la aplicación la sustituye y se avisa con la
  alternativa revisada), logotipo con su proporción.
- **Verificado en:** PowerPoint 16.0.16026.20200 (abre sin reparación, texto editable, edición en memoria con ñ, € y «»),
  Word 16.0.16026.20200 (abre sin reparación, estilos Título/Título 1, tabla, edición) y pdf.js 6.3.289 en Chrome
  (render y texto). Acrobat no disponible.
- **Límites:** OTF/CFF y WOFF2 no se incrustan (alternativa con aviso); falta confirmar la aplicación de destino de los
  clientes (EXT-REQ-12); la comparación renderizada de dos marcas no está automatizada; el PPTX sólo se ofrece para la
  presentación comercial.
