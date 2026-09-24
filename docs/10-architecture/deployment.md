Status: derived
Owner: Product / Engineering
Canonical: no
Last reviewed: 2026-09-23
Related: docs/00-index/BRANDOPOLIS_MASTER_CONTEXT_FOR_WORK.md
Depends on: Master Context v1.0

# Deployment propuesto

Dominio `brandopolis.ai`. Base Docker reproducible, app TS monolítica, PostgreSQL con backups y migraciones; local, development, staging, production y demo aislada/lógicamente etiquetada. CI GitHub Actions: lint, typecheck, tests, evals deterministas, migración en DB efímera, build e imagen. Release: backup verificable, migración compatible, deploy, health check, smoke de login/tenant/M1, rollback de imagen; schema rollback depende de migración compatible y snapshot, nunca asumir DOWN seguro. Definir CPU/RAM, red, TLS, backups, proveedor y acceso SSH del servidor real durante ingeniería; el entorno exacto sigue OPEN técnico. Sin Kubernetes.
