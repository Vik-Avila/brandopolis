Status: CANONICAL
Owner: Brandopolis
Canonical: YES
Last Reviewed: 2026-09-25
Related: design/brandopolis-ui/docs/02_DESIGN_SYSTEM.md, design/brandopolis-ui/tokens/brandopolis.tokens.css, design/brandopolis-ui/FRONTEND_ASSET_MAPPING.md, src/transport/public/
Depends On: Brand Master final-canonical-2026-09-25; Final visual package 2026-09-25

---
# Product design system — as implemented (Phase 10B)

This describes the **runtime** product in `src/transport/public/`. Kit-level principles live in `docs/02_DESIGN_SYSTEM.md` and `docs/07_STRATEGIC_GLASSMORPHISM.md`; this file records the decisions the code actually applies, so a developer can extend the UI without re-deriving them.

## Feel

Premium, editorial, calm, warm, precise B2B strategy software. Never an admin panel, CRUD template, chatbot wrapper, neon/purple "AI" or decorative glass overload.

## Layers and files

| Layer | File | Glass intensity |
|---|---|---|
| Tokens | `tokens.css` (from `design/brandopolis-ui/tokens/`) | — |
| Base | `base.css` | — |
| Public (gateway, login, request access) | `public.css` | Expressive (hero pillars) → moderate (access) |
| Product shell | `product-shell.css` | Subtle (header, sidebar) |
| Decision, context, views | `product-decision.css`, `product-context.css`, `product-views.css` | Solid / near-solid for dense content |
| Responsive + motion | `product-responsive.css` | — |
| Strategic Workspace (ADR-0027) | `product-workspace.css` (loaded last) | Subtle (header, rail) / solid (content) |

One responsive block per breakpoint (≥1500, ≤1500, ≤1400, ≤1279 drawer navigation, ≤1000 single column, portrait tablet 768–1023, ≤767 phone), then a single `prefers-reduced-motion` block.

## Typography

- `--font-display` (Iowan Old Style → Palatino Linotype → Georgia): strategic questions, decision text, section titles, numerals.
- `--font-ui` (Inter → system UI): interface text. Inter is not self-hosted (the CSP allows only same-origin fonts and the kit ships no font files); the system UI font is the fallback.
- Eyebrows: uppercase, tracked, ≥ 10px, emerald (gold in memory/attention contexts). Interface metadata ≥ 11px; tabs 13px (12px on phones).

## Colour roles (never colour alone — every state also has a word or marker)

| Meaning | Treatment |
|---|---|
| Human decision (vigente) | Green tint, 3px deep-emerald left rule, serif decision text, «Decisión humana · vigente» |
| Human decision under review | Same structure, warm attention tint, gold rule, «· en revisión» |
| Requiere revisión (strategic attention, not an error) | `.badge.warn` — gold, «!» marker |
| Evidence | Evidence tint, solid border |
| Hypothesis | Gold, dashed border, «Por validar» |
| AI / DEMO proposal | Dashed container, «Asistencia estratégica», «Sin validar · revisión humana necesaria» |
| Technical error | Rejected tint in the notice (`#notice.error`) |
| Validation / session | Review tint in the notice (`data-kind`) |

## Status vocabulary

Single source: `stateBadge()` in `product-views.js`.

- «Vigente · vN»: display relation over the active version (never a `Decision.status`).
- «Requiere revisión», «Por decidir», and in history «Vigente» / «Sustituida».
- Dependency types are edges, not statuses: «estricta», «sugerida», «informativa» (outline chips; dashed when suggested).

## Actions

- **Primary (solid emerald)**: human commitment and the next strategic step only: Aprobar decisión, Confirmar revisión, Iniciar revisión humana, Preparar decisión, Solicitar acceso.
- **Secondary (outline)**: review, modify, compare, open.
- **Tertiary (underlined text)**: reference and history («Revisar versión más reciente»).
- States: hover, `:focus-visible` (3px emerald ring, offset 3px), pressed (inset shadow), disabled (55% opacity, not-allowed), busy (`aria-busy` + global progress rule).
- Guided Review: «Confirmar revisión» stays disabled until «Mantener sin cambios» or «Modificar» is chosen; editing the decision text counts as «Modificar».

## Connected decisions and Change Impact

- Decision card footer: «Depende de» / «Afecta a» chips; a connected decision that needs review is tinted and says so.
- Change Impact: «Decisión que cambió» card (Antes/Ahora) → champagne connector with the dependency label (horizontal on desktop, downward on phones) → «Decisión afectada» card (gold emphasis) → human actions. The text path above it is hidden once the diagram is open. Normal UI never says upstream/downstream.
- Contexto vigente rail: persistent memory; numbered lineage, version and authorship; the Decision in view is marked (`aria-current="step"`); collapsed to a one-line summary on phones and on Home.

## Motion

Short, deliberate, no overshoot: view entry (6px rise + fade, `--bp-motion-slow`), dialog entry, navigation and tab indicator transitions, option-card marker. Brandopolis Flow appears only as the public «Cómo funciona» video (poster first, plays when visible, pause control). Everything nonessential is removed under `prefers-reduced-motion`.

## Accessibility contract

WCAG 2.2 AA target: text contrast ≥ 4.5:1 (checked in `tests/visual/canonical.spec.ts`, including pixel-measured hero text), focus visible on every control, tabs with arrow/Home/End, dialog and drawer focus trap and return, h1 present at every width, 44px targets for primary mobile controls, `lang` on English brand phrases.

## Brando B1 · contextual drawer and motion revision · 2026-10-05

Human-authorized nonproduction UI: right-anchored native dialog drawer (620px maximum,
full viewport on phones), own scrolling body, fixed composer and accessible focus return.
Context is displayed before inference from the existing authorized snapshot: active decision
and recorded rationale, attention, evidence/hypothesis counts and short previews. Navigation
opens existing human workflows. No automatic inference or strategic write. A compact Brando
portrait shares the Qué necesita atención entry in the left navigation, opening the existing
attention summary. The right card remains the query drawer entry.

Live portraits use the original 160px alpha poses: idle/attention/error use idle.webp,
consulting uses consultando.webp and ready uses respuesta.webp. No new imagery is generated.
A 120ms fade-out and 180ms fade-in replace morphing; fixed image bounds retain layout.
Rigid translation/rotation plus subtle light never scale, skew or distort the gemstone.
A running gesture returns to neutral before the next pose. Finite ambient gestures last 1.6s;
resting gestures start every 4–5.5s, consulting every 2.2s with 1.8s gestures. Error has one
entry gesture. Idle's first
visible gesture may start at 1.8s. Offscreen/hidden-tab/modal guards, explicit pause and live
reduced-motion preference remain. Drawer enters at 320ms and closes at 220ms; reduced motion
removes both. Native dialog inertness remains; the lighter backdrop keeps context recognizable.

Reference: reference/brando-b1/drawer-source.png (layout only; humanized gemstone explicitly
excluded). Existing gemstone/Brand Master identity is preserved. Browser regression and human
motion acceptance are required; no asset-hash or canonical screenshot baseline refresh.


Suggestion actions: Accept/Modify require a criterion, target section and the existing final
human decision confirmation. Reject requires a criterion and records practice only. Never
claim strategic acceptance from a model response or a click that only prepares a draft.
Pensando… plus a static/reduced-motion-aware activity mark communicates the pending query;
a grey disabled control alone is insufficient. Ordinary copy is plain es-MX without enums.

## Brando · orientación por sección · 2026-10-05

Tarjeta compacta bajo el encabezado de cada una de las cuatro secciones, con gema original
Idle de 32px (24px en móvil). Texto breve basado en estado registrado; detalle desplegable
para el cambio de una decisión conectada. Etiqueta «Orientación del sistema · sin consulta a la IA».
Acción secundaria de 44px abre el drawer existente y solicita propuestas sólo por clic humano.
La tarjeta no duplica Aceptar/Modificar/Rechazar ni desplaza el borrador. Se conserva el ciclo
visual y la pausa de los retratos existentes. Al cerrar el drawer el foco vuelve al disparador
de la tarjeta aunque ésta se haya vuelto a renderizar; entrada derecha y atención izquierda
mantienen su comportamiento. Sin cambios de assets, animaciones ni hashes canónicos.

## Objetivo estratégico y Arena de mercado · 2026-10-06

El grupo «Estrategia» numera seis secciones: 01 Objetivo estratégico, 02 Arena de mercado, 03 Cliente
principal, 04 Modelo de valor, 05 Posicionamiento, 06 Mensaje principal; «Entorno competitivo» sigue
en «Preparación estratégica» y no es decisión. Una marca anterior sin esas secciones ve una tarjeta
`empty-state` con la acción primaria «Agregar estas secciones»; nada se crea al navegar. El editor de
ambas secciones muestra una guía `.hint` enlazada con `aria-describedby`. El impacto de una primera
versión muestra «Antes · Sin decisión registrada». Sin nuevos assets, tokens, animaciones ni CSS.

## Promesa de marca · 2026-10-06

El grupo «Estrategia» numera siete secciones: 06 Promesa de marca y 07 Mensaje principal
([ADR-0022](../../docs/14-decisions/ADR-0022.md)). La tarjeta «Agregar estas secciones» enumera las
secciones que faltan a la marca. La tarjeta de revisión muestra, cuando aplica, «También cambió mientras
esta revisión estaba pendiente» (`.review-updates`, texto y criterio con palabras, sin color como único
significado). Promesa reutiliza la guía `.hint` del editor y la orientación de Brando. Para que la columna completa,
incluido el principio, quepa sin scroll en portátiles de 900px de alto, la densidad compacta existente
(puntero fino) y el principio compacto se aplican hasta 940px de alto en lugar de 860px. Sin nuevos
assets, tokens, animaciones ni reglas visuales distintas de las ya aprobadas.

## Prioridad de lanzamiento y línea del recorrido · 2026-10-06

[ADR-0023](../../docs/14-decisions/ADR-0023.md): «Estrategia» numera ocho secciones (08 Prioridad de lanzamiento).
Los números son nodos de 22px unidos por una línea vertical champán de 2px. Fase decidida: nodo con
borde y número esmeralda. Fase actual: tarjeta elevada existente y nodo esmeralda sólido. Siguiente
fase sugerida: nodo champán con doble anillo, pulso finito de 3 ciclos (2,4s) y el texto «Siguiente
decisión sugerida» en `title`/`aria-description`; `prefers-reduced-motion` elimina el pulso. Los estados
de revisión conservan su marca «!». Tokens existentes; sin nuevos assets.

## Experimento prioritario · 2026-10-06

[ADR-0024](../../docs/14-decisions/ADR-0024.md): «Estrategia» numera nueve secciones (09 Experimento prioritario).
Para conservar la columna completa sin scroll, la densidad compacta (puntero fino) y el principio compacto
se aplican hasta 1040px de alto y las filas del recorrido miden 28px (mínimo WCAG 2.2 de 24px); táctil
conserva 44px. Sin nuevos assets, tokens ni animaciones.

## Focusable Intelligent Strategic Workspace · 2026-10-07

[ADR-0025](../../docs/14-decisions/ADR-0025.md). Cuatro JTBD que no deben perderse:
- **A · Disclosures:** todo `<summary>` es la fila clicable; píldora «Mostrar ▾ / Ocultar ▴» junto al título
  (no un «+» aislado al borde), hover y foco visibles, texto de la píldora oculto a lectores de pantalla.
- **B · Contexto de onboarding:** «Lo que ya sabemos de tu marca» (borde punteado champán) en Objetivo,
  Arena y Posicionamiento cuando hay contexto declarado; siempre rotulado como punto de partida, no decisión.
- **C · Paneles colapsables:** controles «Ocultar recorrido» (≥1280px) y «Ocultar Brando y memoria» (≥1001px)
  al inicio de la columna central; ambos ocultos = «Modo enfoque»; señal «N por atender»; 44px en táctil.
- **D · Brando visible:** token `--bp-brando-emerald` (#0E7A52) y variantes soft/ring, sólo en superficies
  de Brando (tarjeta, entrada de atención, orientación por sección, botones de consulta). Esmeralda de marca intacto.
- **Inteligencia estratégica:** sección sobria en «Qué necesita atención» con veredicto en palabras, orden de
  revisión, tensiones con «por qué importa» y severidad con palabra (nunca sólo color).

## Validation Workspace · ADR-0026 (2026-10-07)

- «Experimentos y aprendizajes» sigue el recorrido Hipótesis → Experimento → Señales → Aprendizaje → Impacto.
- «Siguiente validación recomendada» (`.validation-next`): Ahora / Después con palabras, nunca sólo color;
  también en «Qué necesita atención».
- Calidad de plan (`.plan-quality`), estado de hipótesis (`.hypothesis-card`) y dirección de señal con
  insignia y palabra. Sin nuevos tokens, assets ni archivos de runtime.

## Strategic Workspace · ADR-0027 (2026-10-08)

Applies the owner-approved views 04–09 (`.local/phase3-ux-references/…`, not versioned). Layer: `product-workspace.css`.

- **Cabecera:** logo canónico · selector de marca · insignia de modo (DEMO LOCAL / DEMO LOCAL · IA EN VIVO / PILOT) ·
  Nueva marca · Salir · presencia de Brando (isotipo 48px, «Brando», «Tu copiloto estratégico», «Consultar»,
  borde `--bp-brando-emerald`). En < 1001px la presencia baja al inicio del contenido.
- **Navegación:** «Mi marca» + control «Contraer navegación». Iconos de trazo 24px (sprite `#i-*` en
  `index.html`, mismo estilo que los pilares públicos): casa Inicio, diana Estrategia, caja Productos y servicios,
  matraz Validación, megáfono Plan de marketing, barras Resultados, brote Mi aprendizaje, mapa Mapa estratégico,
  ayuda Ayuda. Un icono por concepto. Plegada: sólo iconos con tooltip (hover y foco) y el control de apertura;
  la decisión activa se indica en el icono de Estrategia. «Próximamente»: píldora bajo el nombre, `aria-disabled`.
- **Rail derecho:** tira de iconos (abrir/contraer, Brando con su isotipo, Contexto, Atención con punto, Historial)
  y un solo panel de 392px. Brando se acopla al panel (no modal) en escritorio. Ambos laterales plegados = «Modo
  enfoque» (indicador en palabras).
- **Titulares:** (sustituido por la escala editorial de ADR-0028, abajo) serif para el título de vista y la bajada; controles en
  sans ≥ 14px. Tarjeta principal con radio 20px, sin anidar tarjetas dentro de tarjetas.
- **Estados:** progreso de 9 segmentos (verde definida, champagne en revisión); «Requiere tu decisión» (alerta
  ámbar) frente a «Observación» (info azul) siempre con palabra, nunca sólo color; chip «Sin aprobar» para
  propuestas de IA.
- **Responsive:** sin overflow horizontal en 360–1920px (matriz verificada); en móvil la navegación y las
  herramientas son drawers con foco contenido, Escape y retorno de foco.

## Editorial refinement · ADR-0028 (2026-10-08)

Bloque final de `product-workspace.css` («Editorial refinement»). Prioridad de diseño: 1366×768.

- **Escala tipográfica (tokens):** `--ws-fs-screen` 30–42px (título de pantalla) · `--ws-fs-decision` 26–34px
  (título de decisión) · `--ws-fs-card` 18–24px (encabezado de tarjeta) · `--ws-fs-lead` 16–19px ·
  `--ws-fs-body` 15.5px (interfaz) · `--ws-fs-meta` 13.5px (ayuda y metadatos).
- **Espaciado:** `--ws-s1..s7` = 4 · 8 · 12 · 16 · 20 · 24 · 32px. Tarjetas compactas en todas las vistas.
- **Superficies:** `--ws-surface #FFFDF9`, `--ws-surface-soft #FBF8F2`, `--ws-surface-sunk #F5F1E8`,
  `--ws-select #F0ECE2`, `--ws-human-soft #F3F6F1`; líneas `--ws-line #E7E2D6` / `--ws-line-strong #D6CFBF`.
  Sin blanco puro general. El verde se reserva para acción, selección y decisión humana. Contraste WCAG AA.
- **Jerarquía de decisión:** título → pregunta → tarjeta principal → tarjeta auxiliar de Brando
  (`.brando-section.brando-aux`: isotipo 40px, una línea, un CTA «Explorar con Brando», orientación en
  desplegable, borde izquierdo `--bp-brando-emerald`) → contexto y conexiones. La vista no tiene tarjeta
  contenedora exterior.
- **Logotipo:** símbolo premium canónico (`/brand/symbol-premium.webp`) en cabecera móvil, navegación, pie e
  Inicio; nunca el vector plano `symbol.svg` en la interfaz.
- **Recorrido:** `#journey .strategy-list::before`, línea vertical de 1px que une los nueve nodos; nodo definido
  (verde suave), actual (anillo esmeralda), atención (champagne), pendiente (neutro).
- **Documentos para compartir:** en Mapa estratégico, dos tarjetas (`.map-document`) con nombre, propósito y
  «Descargar PDF»: Mapa estratégico ejecutivo y Brand Book integral. Los PDF usan el lenguaje editorial de
  `src/application/editorial-kit.ts` (serif Times para titulares, Helvetica para texto, A4).

## Phase 3 closing pass · ADR-0028 addendum and ADR-0029 (2026-10-09)

- **Superficies más claras:** `--ws-page #FCFAF6` (página), `--ws-panel #FAF8F3 → --ws-panel-end #F7F4EE` (panel
  izquierdo); rail sobre la misma base. Sin blanco puro general; el blanco `#FFFFFF` sólo en las nueve tarjetas del
  Mapa estratégico (`.map-cell`: borde `--ws-line`, sombra perimetral sutil, radio 14px).
- **Progreso de Inicio:** `.progress-segments button.segment` (área táctil ampliada con `::before`), tooltip
  `.segment-tip` fuera del flujo (`display:none`) salvo en hover y foco, para no ensanchar la página en móvil.
- **Revisión:** `.review-brief` (título con la causa, `.review-tip`, decisión vigente, por qué, `.review-origin-item`
  antes → ahora) y después «Qué puedes hacer».
- **Brando:** `.brando-proposal` (etiqueta «Alternativa propuesta» + chip «Sin aprobar», texto en negritas),
  `.brando-why`, `.brando-consider`, `.brando-more` (desplegable).
- **Validación:** `.validation-path` / `.validation-path-step` (cuatro pasos; no confundir con `.validation-steps`
  de «Siguiente validación recomendada»), `.learning-missing` para el estado sin aprendizaje elegible.
- **Configuración de marca:** `.settings-card` y `.danger-zone` (borde y fondo rojizos suaves, nunca verde);
  `button.danger` deshabilitado hasta escribir el nombre exacto.
