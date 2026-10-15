Status: product design direction approved; visual/interaction specification proposed for founder review
Date: 2026-10-14
Owner: Product / UX / Engineering

# UXR · Architecture, navigation, content and wireframe contracts

## Information hierarchy

App global chrome: institutional Brandopolis logotype (immutable), one active brand selector, search/command navigation and account / notifications; Brando in a single recognizable emerald-gem identity, subordinate to corporate symbol.

Main Home:
- Clear message: **¿Qué vamos a construir hoy?**
- One large, accessible multi-line intent composer; attach documents (existing secure upload), optional microphone only if actually implemented with accessible consent.
- Four concise optional starters: Crear mi marca / Mejorar mi estrategia / Conseguir clientes / Planear una campaña. These do not supersede free text.
- Only 1–2 timely tasks or meaningful next steps, not a dashboard of metrics/tables.
- Status of AI provider explicit: "IA real · [verified model]" or "DEMO · sin inferencia real" derived from server, never just CSS.
- Conversation answer as summary + proposal card (title, recommendation, rationale, known vs assumed, one key clarification) + human actions **Aprobar / Ajustar / Descartar** with role-aware availability.

Global navigation (proposed IA, exact labels for visual approval):
**Inicio · Mi marca · Trabajo · Clientes · Resultados**.
"Trabajo" is a launcher/collection, **not a loss of routes**: Estrategia, Validación, Identidad, Productos y servicios, Plan de Marketing, Redes, Sitios, Campañas, Materiales, Colaboración remain individually reachable by labeled secondary navigation, search, shortcuts and contextual links. Do not nest functionality too deeply; test task discovery before choosing final number of menu items. Agency portfolio and Settings/History/Help visible according to actor permissions.

## Progressive depth

Level 1: say intent → one useful proposal.
Level 2: contextual workspace opens for structured operation; keep Brando available but not permanently taking half the viewport.
Level 3: source references, experiment quality, history, versions, costs, validation, integrations and full strategy map by disclosure on demand.

Avoid disabling core functionality for novice users; avoid hiding important exceptions and attention behind inaccessible drawers.

## Interaction flows

FLOW 1 / first brand:
User describes business and intended outcome (single input); create safe brand draft only on explicit user action, associate documents by existing upload; identify known fields; ask only material missing facts; give one contextual strategy candidate; show traceable approval before structured commit; offer next action. Identity and company details can be completed later, unless required by chosen operation. Preserve current form as advanced "Editar ficha".

FLOW 2 / Club de baile:
"Tengo un club de baile con salsa, cumbia y bachata. Quiero más alumnos y que continúen."
Brando distinguishes offering (declared) vs retention assumptions (untested); proposes a 90-day acquisition/retention objective **as a candidate**, not approved; asks whether acquisition or retention is most urgent; Approved action creates strategy version through the existing human decision API. Next "Preparar campaña de bachata" opens Plan/Campaign workspace with editable draft and provenance; does not activate ads.

FLOW 3 / agency:
Agency selector shows active brand and account/portfolio switch; direct "Clientes" opens filtered opportunities; direct "Campañas" opens campaign list; full review/history accessible; conversation in brand A never refers to brand B; permissions/guest only shared snapshots.

FLOW 4 / return:
State-aware greeting "Lo que cambió / lo que necesita tu decisión"; no faux urgency; if nothing important, show goal and next possible action. Existing pending drafts survive reload and conversation-to-workspace hops.

FLOW 5 / AI unavailable:
Label failed/disconnected inference, preserve text and drafts; present manual edit and a retry action that does not repeat already committed operations; do not degrade to a fake real-AI response.

## UX component rules

- One Brando, one composer. Desktop first but responsive, accessible mobile.
- Desktop: calm left primary nav, wide central task workspace, on-demand details drawer; mobile: single content column, compact top controls and accessible navigation sheets.
- No repeated card for "sin pendientes" or redundant overview. Use concise status chips with plain language and clear empty states.
- Human approval only where material to authoritative state or external side effects; do not nag for trivial navigation, reading, drafts.
- Keep unapproved vs approved vs public versions unambiguous, visually and via screen reader.
- No duplicated approval controls. Show undo/review options only when actually supported.
- Preserve focus, scroll, filters, expansion state, open draft and background-response protections as in R12C; respect prefers-reduced-motion.
- Respect design tokens, emerald-gold Brando rule, immutable Brand Master and actual site identity. No new generic stock logo, no humanized Brando.
- Contrast >= WCAG AA and visible keyboard focus, accessible labels/tooltips; avoid icon-only unknown controls.
- Avoid hard-coded "100%" strategy completion based on nine modules when user's requested outcome is a smaller scoped result; explain advanced nine dimensions separately.

## Screen list for review

01 · Conversational Home (new brand / intent starters).
02 · Brando response + structured decision candidate and evidence.
03 · Estrategia summary + optional nine-dimension map/history.
04 · Plan de Marketing with objective, calendar, budget, Brando contextual entry.
05 · Clientes / opportunities with filters, capture and owner/attribution trace.
06 · Agencia / portfolio with multi-brand safeguards.
07 · Mobile home and contextual workspace.
08 · Results + interpretation, actual vs simulated metrics.

Create acceptance mockups of at least 01, 02, 04, 05 and one mobile state before freezing exact navigation. Mockups are not evidence of runtime functionality.


## Actualización de aprobación visual del fundador · 2026-10-14

**Aprobado a nivel conceptual:** los mockups compartidos de UX Reinvention como dirección para construir la interfaz real; el fundador manifiesta una preferencia ligera por la segunda alternativa. Esto **no** constituye una aceptación al píxel, ni aprobación de avatares humanos, cambio de logo/paleta, ni validación de pantallas implementadas. Antes de fijar el diseño final, comparar con capturas del sistema actual que el propietario compartirá después, aplicar el método de cuestionar/eliminar/simplificar/acelerar/automatizar y someter a revisión los cambios materiales.

**Regla de Brando:** conservar la gema geométrica esmeralda canónica con acentos dorados; jamás sustituirla por rostro o mascota humana. Puede ganar legibilidad y presencia mediante escala moderada, iluminación, orientación o microanimaciones de estado (reposo, escuchando, consultando, respuesta), sin cambiar su geometría y siempre subordinada al logotipo institucional. Respetar preferencias de movimiento reducido, accesibilidad y densidad móvil.

**Hipótesis, experimentos, señales y aprendizajes:** su motor y contratos son estratégicamente importantes, especialmente para aprender qué funciona y revisar supuestos. No eliminar las entidades, sus estados ni sus vínculos con decisiones. En la UX inicial evitar exponer su complejidad metodológica; abrirlas **cuando la intención lo requiera**, con nombres naturales como «Comprobar una idea», «Qué descubrimos» o «Validar resultados», y permitir acceso avanzado directo. Una hipótesis no pasa a hecho por un texto generado; cualquier cambio de estado o aprendizaje aceptado requiere el proceso y la autoridad humana existentes.

**Siguiente gate:** inspección de las capturas actuales y revisión de un prototipo aplicado al código real de F4, sin empezar por reconstruir módulos. Documentar qué se conserva, qué se transforma y qué queda accesible en nivel avanzado. No describir esta preferencia visual como cierre de F4 ni como autorización de despliegue.
