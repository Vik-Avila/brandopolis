Status: derived
Owner: Product / Engineering
Canonical: no
Last reviewed: 2026-09-23
Related: docs/00-index/BRANDOPOLIS_MASTER_CONTEXT_FOR_WORK.md
Depends on: Master Context v1.0

# Sistema técnico

Baseline propuesto: TypeScript monolito modular, Next.js o equivalente, PostgreSQL relacional, Drizzle/Prisma tras ADR, Zod o equivalente, pnpm, Vitest, Playwright, Docker, CI GitHub Actions. Fronteras: Identity/Tenancy → Brand Context/Decisions → Dependencies → AI Gateway → Capability/Experiment → Telemetry. UI/API autentican; AI produce Recommendation y no commit; Decision Engine transaccional persiste versión humana y reglas calculan ReviewItems; Blueprint proyección del Context. [Tenancy](tenancy.md), [security boundaries](security-boundaries.md), [deployment](deployment.md), [observability](observability.md). No Graph/Vector DB, Kubernetes, microservicios o Kafka para MVP sin evidencia técnica.
