# Contratos, ADR y evidencia de ingeniería

## Decisiones canónicas de este cierre
- ADR-0026: ciclo de Validación y Aprendizaje.
- ADR-0027: espacio de trabajo estratégico.
- ADR-0028: refinamientos UX/UI editoriales, Mapa PDF y Brand Book.
- ADR-0029: eliminación segura de marcas.

Fuentes exactas: `docs/14-decisions/ADR-0026.md` a `ADR-0029.md` en `main` del repositorio.

## Componentes de implementación
- Monolito modular TypeScript + PostgreSQL 17 + Drizzle.
- Node.js 24.x, pnpm 12.4.2 fijados en el proyecto.
- UI nativa HTML/CSS/JS sin build frontend, servida por TypeScript; assets cacheados por proceso (requieren reinicio tras despliegue).
- Una sola instancia de PILOT, protegida mediante advisory lock.
- OIDC para autenticar participantes en el piloto; token de DEMO local NO es autenticación pública.
- Anthropic server-side con topes y aviso de datos; no conservar claves en repositorio.

## Migraciones de Fase 3
- `drizzle/0014_loose_blue_blade.sql`: reflexiones personales.
- `drizzle/0015_melted_whiplash.sql`: registro de eliminación de marcas, control acotado sobre historiales, manejo de referencias `pilot_feedback`.
- Antes de desplegar: verificar el journal real, realizar backup consistente y restore aislado; migrar con `pnpm pilot:migrate`. No ejecutar `db:seed` ni DEMO en PILOT.

## QA registrado por el equipo (no certificado de forma independiente en este ZIP)
- 346 unitarias PASS.
- 202 E2E PASS / 13 SKIP.
- 42 Brando browser PASS.
- 10 PILOT E2E PASS.
- 10 visual PASS / 1 SKIP.
- Foundation, lint, typecheck y validadores PASS.
- Real AI smoke local: A–E PASS, dos llamadas a Anthropic.
- No workflows de GitHub Actions registrados para el commit.

## Sugerencia
Al iniciar una nueva computadora, repetir al menos `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm lint`, `pnpm test`; E2E exige PostgreSQL/Chrome y configuración aislada.
