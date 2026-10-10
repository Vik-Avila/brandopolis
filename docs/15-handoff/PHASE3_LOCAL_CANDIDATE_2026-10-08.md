Status: historical (superseded by the Phase 3 closure of 2026-10-09; see PHASE4_HANDOFF)
Owner: Product / Engineering
Canonical: no
Last reviewed: 2026-10-08
Related: docs/14-decisions/ADR-0026.md, docs/14-decisions/ADR-0027.md, docs/14-decisions/ADR-0028.md, docs/15-handoff/BLUEPRINT_PDF_EXPORT.md, SESSION_STATE.md
Depends on: rama feat/phase3-validation-learning-engine (base 9b656af); decisiones del propietario del 2026-10-08

# Fase 3 · candidata local (2026-10-08)

Estado: **candidata local, sin commit nuevo, sin push, sin merge, sin deploy**. Producción no se toca (Jury
Production Freeze vigente). Fase 4 no iniciada. El estado verificable y los resultados reales de los gates están
en [SESSION_STATE](../../SESSION_STATE.md); este documento resume qué hay y cómo revisarlo.

## Qué contiene

1. **Validation & Learning Engine** ([ADR-0026](../14-decisions/ADR-0026.md)): ciclo continuo de hipótesis
   (un re-test exige un aprendizaje nuevo aceptado), procedencia asistida por prueba de un solo uso, revisión de
   aprendizajes con concurrencia optimista, reflexiones personales privadas (migración 0014), modo local de IA en
   vivo `pnpm competition:start --isolated --live-ai` (falla cerrado sin `ANTHROPIC_API_KEY` y `ANTHROPIC_MODEL`).
2. **Strategic Workspace** ([ADR-0027](../14-decisions/ADR-0027.md)): Inicio, Estrategia (9 decisiones),
   «Próximamente», Validación, Mi aprendizaje, Mapa estratégico, Ayuda; rail derecho unificado; Modo enfoque.
3. **Refinamiento editorial y dos documentos** ([ADR-0028](../14-decisions/ADR-0028.md)): escala tipográfica y
   espaciado como tokens, paleta cálida, símbolo premium canónico, línea vertical del recorrido, Brando como
   tarjeta auxiliar después de la tarjeta principal, y los PDF **Mapa estratégico ejecutivo** y **Brand Book
   integral** elegibles en «Documentos para compartir».

## Cómo revisarlo

- DEMO aislada: `pnpm competition:start --isolated` (127.0.0.1:3001). Marca sintética de revisión:
  `pnpm exec tsx scripts/validation-demo-seed.ts` («Lumbre Café · Revisión Fase 3 (sintética)»).
- IA real: el propietario arranca `--live-ai` con su clave en su propia sesión de PowerShell (nunca en el chat,
  en Git, logs, base de datos ni capturas) y luego se ejecuta `pnpm demo:live-ai-ui`. `ANTHROPIC_MODEL` debe ser
  un id de API válido (por ejemplo `claude-opus-5-5`), no un nombre comercial.
- Evidencia local (no versionada): `.local/phase3-ux-review/final/` (todas las pantallas y las nueve decisiones
  en 1366×768, 1586×992, 1280×800, 768×1024 y 390×844) y `.local/phase3-brandbook-review/` (PDF y páginas
  renderizadas con pdf.js).

## Pendiente para cerrar la fase

- Gate de IA en vivo (requiere la clave del propietario). Hasta entonces: LIVE AI · NOT RUN.
- Aprobación humana del propietario; sólo después, commit local.
