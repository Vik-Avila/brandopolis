# Fase 4 · Evaluación de herramientas para agentes (2026-10-11)

Encargo del propietario (2026-10-11): evaluar repositorios externos de skills y plugins antes de incorporarlos,
seleccionar sólo lo que aporte al trabajo pendiente de la Fase 4, registrar procedencia, versión y licencia, y
separar lo que mejora el trabajo de Claude de lo que exige implementación en Brandopolis.

**Límite de la evidencia.** El análisis adjunto que enlazaba los repositorios no llegó a la sesión (no estaba en el
mensaje, en Descargas ni en el repositorio). Los repositorios se identificaron por su nombre público. «Claude SEO
AI» y «Web Builder» no se pudieron identificar con certeza; ver §5.

## 1. Inventario actual (antes de incorporar nada)

- **Skills del proyecto** (`.agents/skills`, copia generada en `.claude/skills` por `pnpm skills:sync`):
  brandopolis-brando, -feature, -review, -security y -ui.
- **Plugins de usuario activos:** superpowers 6.4.1, frontend-design, firecrawl 1.0.9 (búsqueda, scraping,
  mapa de sitios, auditoría SEO básica), playwright, skill-creator, openai-developers, security-guidance y
  code-review. Instalados pero desactivados: searchfit-seo 1.0.0, context7, modern-web-guidance y typescript-lsp.
- **Plugins de la organización visibles en la sesión:** brand-voice y design (Figma).
- **Conectores MCP de claude.ai:** Canva, Google Drive y Claude Docs. Son conectores del asistente: no sustituyen
  la integración de Canva del producto (PHASE4_SPEC §4.8, ADR-0031).
- **MCP del proyecto:** ninguno (`.mcp.json` no existe).

## 2. Evaluación y selección

| Componente | Procedencia · versión · commit | Licencia | Revisión de instrucciones, scripts y dependencias | Decisión |
|---|---|---|---|---|
| Marketing Skills | github.com/coreyhaines31/marketingskills · 2.11.26 · `1efedbc` | MIT | 40+ skills en Markdown y 72 scripts auxiliares. Las skills piden un archivo global `product-marketing.md` como contexto, lo que choca con el contexto por marca y por versión aprobada. Se incluyen integraciones de terceros (`tools/composio`, enlaces de socios). | **Adaptar** copywriting, copy-editing, social, ad-creative, ads, cro, site-architecture, seo-audit, schema y ai-seo como criterios en `brandopolis-marketing`. No se instala el plugin ni se usan scripts o integraciones. |
| Base principal de SEO | La misma (seo-audit, schema, ai-seo, site-architecture) | MIT | Solo instrucciones, sin dependencias. | **Base principal**, en `references/site-and-seo.md`. |
| Claude SEO | github.com/AgriciDaniel/claude-seo · 2.4.2 · `4b99de2` | MIT | 26 skills, 19 subagentes y 187 scripts Python (requests, playwright, weasyprint, google-ads y otros). Un hook `PostToolUse` ejecuta Python en cada Edit/Write, y los instaladores escriben en el perfil del usuario. | **Solo comprobaciones distintas:** calidad del sitemap, tipos de datos estructurados retirados y coherencia de nombre, dirección y teléfono en negocios locales. Se rechazan el plugin, el hook y los scripts. |
| Claude Ads | github.com/AgriciDaniel/claude-ads · 2.0.2 · `ac21644` | MIT | 32 skills con un plano de control en Python, adaptadores que pueden cambiar cuentas publicitarias (`ads-launch --apply`) y generación de imágenes con proveedores externos (Gemini, OpenAI, Stability, Replicate). Su política de primero borrador, aprobación del plan exacto y verificación remota es compatible con ADR-0031. | **Adaptar** solo los criterios de planificación y revisión para Google y Meta, y la continuidad con la página de destino. Se rechazan los adaptadores, la aplicación de cambios y la generación de imágenes. Prevalecen las dos autorizaciones y C1. |
| Web Builder | No identificado (§5) | — | — | Como referencia de creación guiada se usan site-architecture y cro de Marketing Skills, en `site-and-seo.md`. |
| Scrapling | github.com/D4Vinci/Scrapling · `7a68493` | BSD-3-Clause | Framework de scraping (Python). | **No se incorpora.** No hay ninguna necesidad documentada: Firecrawl, WebFetch y Playwright cubren la lectura de sitios que necesita Claude. El producto no extrae datos de sitios en la Fase 4, y la investigación competitiva ya usa las herramientas web del proveedor detrás de sus controles. |
| WhatsApp y Auto-CRM | No identificados (§5) | — | — | **Solo propuesta** (§4). No entran en el alcance. |

**Forma de incorporación:** una sexta skill del proyecto, `.agents/skills/brandopolis-marketing/`, con el mismo
mecanismo de sincronización y las mismas comprobaciones (`tests/skill-pack.test.ts`, Foundation). Su procedencia,
la tabla de commits y el aviso MIT están en `references/PROVENANCE.md`. Nada se ejecuta ni se instala en el perfil
del usuario.

## 3. Qué mejora el trabajo de Claude y qué exigiría implementación en Brandopolis

**Mejora el trabajo de Claude (ya disponible en la skill):**

- Redactar y revisar textos de la interfaz, ayudas, fixtures y casos dorados con lenguaje sencillo y sin muletillas
  de texto generado.
- Revisar borradores de entregables, planes de campaña y páginas con resultados explícitos: visto y correcto, visto
  e incorrecto, no verificable o no aplica. Lo no verificable reduce la cobertura, nunca el veredicto.
- Diseñar los criterios de aceptación y las pruebas de Sitios, Campañas y Resultados sin inventar cifras ni sumar
  conversiones de proveedores distintos.

**Exigiría implementación en Brandopolis (backlog; ninguna está implementada ni aprobada como alcance nuevo):**

| Propuesta | Área | Encaje con lo aprobado |
|---|---|---|
| Comprobación de texto en los borradores de Brando (marcadores `[falta: …]`, muletillas, afirmaciones sin evidencia) como caso dorado en `evals/` | Marketing, Productos y servicios | ADR-0030 (Brando propone); necesita casos dorados y la IA real verificada |
| Reglas del sitemap y de los datos estructurados de §2 en la publicación del sitio | Marketing › Sitio web | PHASE4_SPEC §4.5 ya exige SEO básico y sitemap; las reglas concretas se fijan al implementar Sitios |
| Coherencia de nombre, dirección y teléfono entre la ficha, el sitio y los datos estructurados | Marketing › Sitio web | Usa la ficha del inicio guiado; no añade datos nuevos |
| Revisión de campaña con cobertura de evidencia separada del estado y continuidad pieza–página | Marketing › Campañas digitales | ADR-0031; se aplica en el paso «revisión», antes de la autorización 1 |
| Comparación de resultados por fuente sin sumas y con benchmarks etiquetados | Resultados | PHASE4_SPEC §4.8 ya lo exige; las reglas sirven de criterio de prueba |

Todas respetan el contexto de una sola marca, las versiones aprobadas, el kit publicado y la autoridad humana. No
añaden áreas: las siete siguen siendo Inicio, Estrategia, Productos y servicios, Marketing, Marca y recursos,
Colaboración y Resultados.

## 4. Propuesta de ampliación comercial: WhatsApp y Auto-CRM (no incorporada)

- **Valor para el cliente:** muchas marcas pequeñas en México venden por WhatsApp. Un registro de conversaciones y
  oportunidades enlazado con ofertas y campañas cerraría el ciclo entre anuncio, conversación y venta en Resultados.
- **Qué exigiría:** una decisión de producto y un ADR propio; WhatsApp Business Platform (Meta), con número
  verificado, plantillas aprobadas, consentimiento de opt-in y coste por conversación; tratamiento de datos
  personales de los clientes finales (aviso de privacidad, retención y borrado); un modelo de contactos y
  oportunidades por marca; y permisos para invitados (que no verían conversaciones).
- **Riesgos:** datos personales de terceros, mensajería automática que podría hablar por la marca (en tensión con
  INV-006 si respondiera sin persona), coste variable y dependencia de las políticas de Meta.
- **Recomendación:** dejarlo para después de la Fase 4. Como primer paso sin integración, se podría añadir un enlace
  de clic a WhatsApp con medición del destino en Sitios y Campañas.

## 5. Pendientes de esta evaluación

- Recibir el análisis adjunto para confirmar qué repositorios eran «Claude SEO AI», «Web Builder», «WhatsApp» y
  «Auto-CRM». Si alguno difiere de lo evaluado aquí, se revisa con el mismo método: commit fijo, licencia, scripts y
  dependencias, y adaptación manual.
- Las fechas de las reglas de búsqueda (por ejemplo, la retirada de resultados enriquecidos) proceden de las fuentes
  revisadas y deben verificarse con la documentación vigente del buscador antes de convertirlas en comportamiento o
  en pruebas.
