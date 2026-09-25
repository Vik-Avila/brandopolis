# Brandopolis

## What It Is

SaaS B2B AI-native de decisiones estratégicas conectadas para marcas. **AI proposes. Humans decide. Brandopolis remembers. People learn by building.** Competition MVP local DEMO; alcance congelado para RC1.

## Why It Exists

El porqué de decisiones de marca se dispersa entre chats, herramientas y personas. Brandopolis conserva contexto, decisiones, versiones y dependencias; cuando cambia una decisión, guía revisión humana.

## Core Product Loop

Context → Strategic Question → Evidence/Hypotheses → Options/Recommendation → Human Decision → Brand Context/Dependencies → Change Impact → Experiment/Signal/Learning → Updated Context. North Star: Connected Strategic Decision Made and Remembered.

## Non-Negotiable Principles

Autoridad humana, estructura, evidencia, continuidad, conexión, incertidumbre explícita, aprendizaje, reglas primero, IA semántica, profundidad y claridad de experiencia. [Principios canónicos](docs/01-product/product-principles.md).

## Core Architecture

TypeScript modular monolith + PostgreSQL; estado relacional, Gateway IA, Context Assembler y Research opcional. Sin Graph/Vector DB para MVP. [Dominio](docs/04-domain-model/README.md), [seguridad](docs/12-security/authorization.md).

## M1

User/Workspace/Brand; Customer + Positioning HARD; cambiar Customer con optimistic concurrency e idempotencia; preservar vieja versión; Needs Review/ReviewItem y explicación; revisión humana persistente; audit, tenant y tests. [Handoff Codex](handoff/CODEX_START_HERE.md).

## Repository Map

`docs/00..15` producto y arquitectura; `domain/` contratos conceptuales; `schemas/` JSON Schemas v1; `config/` reglas; `prompts/` funciones; `evals/` fixtures; `telemetry/` eventos; `handoff/` tareas; `scripts/` QA documental.

## Canonical Sources

[Source of Truth](docs/00-index/source-of-truth.md), [Product Bible operativa](docs/01-product/product-bible-v1.md), [Master Context](docs/00-index/BRANDOPOLIS_MASTER_CONTEXT_FOR_WORK.md). **Final Contract Patch independiente no disponible**; los cambios explícitos del hardening brief sí están aplicados. Su cotejo sigue sin poder afirmarse; no bloquea M1 por resolución humana del 2026-09-24.

## Current Status

Competition MVP local DEMO: M1 conservado, vertical Customer → Business → Position → Message, contexto explícito, recomendaciones DEMO con aprobación humana, Experimento → Señal → Aprendizaje revisado, práctica personal y Blueprint derivado. Ver [estado de sesión](SESSION_STATE.md), [evidencia M1 histórica](docs/15-handoff/m1-implementation.md) y [continuación Competition MVP](docs/15-handoff/competition-mvp-implementation.md). No hay clientes/ingresos validados; auth, proveedor IA y despliegue de producción quedan pendientes.

## Open Technical Decisions

Drizzle elegido en ADR-0011. Auth final, proveedor IA inicial, research y despliegue siguen abiertos; precio/WTP para piloto. [Open Questions](docs/15-handoff/open-questions.md).

## Local Setup

[LOCAL_HANDOFF.md](LOCAL_HANDOFF.md). Node 24 y pnpm 12.4.2: `pnpm install --frozen-lockfile`, después `pnpm competition:start`. Prepara PostgreSQL, migraciones, sesión y demo local; imprime URL sin credenciales. `pnpm competition:check` verifica prerrequisitos/readiness sin sustituir tests. DATABASE_URL debe estar vacía para tooling de concurso. Ver [runbook](docs/15-handoff/competition-demo-runbook.md) y [manifiesto RC1](docs/15-handoff/competition-mvp-rc1.md).

## Validation Commands

`python3 scripts/foundation_check.py` (Windows: `py -3 scripts/foundation_check.py`). Valida schemas con `jsonschema` si instalado; la distribución de Foundation incluye `requirements-foundation.txt` para instalarlo. Recomendado: `python3 -m pip install -r requirements-foundation.txt` antes de QA.

## Start Here — Codex

[AGENTS.md](AGENTS.md) → [SESSION_STATE.md](SESSION_STATE.md) → [CODEX_START_HERE](handoff/CODEX_START_HERE.md).

## Start Here — Claude Code

[CLAUDE.md](CLAUDE.md) → [CLAUDE_START_HERE](handoff/CLAUDE_START_HERE.md).


## Resolución humana · 2026-09-24 · Sprint 01
El usuario autoriza implementar M1 sobre los contratos canónicos presentes y corregir drift documental inequívoco. ASSUMPTION_IN_USE es relación/flag de dependencia de una Decision vigente sobre una Hypothesis no validada, nunca status. Las referencias anteriores al Patch independiente describen la limitación histórica de cotejo, no un gate de entrada a M1. No se ha localizado ni se afirma haber cotejado ese archivo. Esta resolución sustituye instrucciones anteriores de esperar ese cotejo para iniciar M1; no cambia Bible, invariantes ni alcance.
