# Entrega local

1. Descomprime el ZIP: debe resultar una sola carpeta `brandopolis/`; ubícala donde quieras en tu computadora.
2. Abre una terminal **dentro de `brandopolis/`**. Ejecuta `python3 scripts/foundation_check.py`; comprueba que termine sin errores. En Windows usa `py -3 scripts/foundation_check.py` si corresponde.
3. Inicializa Git si aún no existe: `git init`; luego `git add .` y `git commit -m "chore: import Brandopolis engineering foundation v1"`. `.env` queda ignorado; nunca subas secrets.
4. Revisa `docs/15-handoff/qa-report.md`: el Final Contract Patch independiente no se incluyó en los materiales disponibles; si lo tienes, intégralo y reconcilia antes de tratar esta entrega como aprobación definitiva.
5. Abre la misma carpeta raíz en Codex y pide: «Lee `handoff/CODEX_START_HERE.md`, ejecuta Foundation check y comienza únicamente M1».
6. Abre esa carpeta en Claude Code para lectura/revisión y pide: «Lee `handoff/CLAUDE_START_HERE.md` y revisa M1 contra contrato». Evita que ambos editen la misma rama simultáneamente.
7. Flujo recomendado: `main` → rama `codex/m1`; revisión humana del diff; rama `claude/m1-review` o turno secuencial; Codex corrige hallazgos verificados. Commit de M1 sugerido: `feat: implement M1 connected decision proof`.
8. Sólo al iniciar implementación: instalar Node LTS activo y pnpm vía Corepack, Docker y PostgreSQL según ADR; copiar `.env.example` a `.env` y poner credenciales reales localmente. No hay `pnpm install`, `pnpm test` ni build hasta crear la aplicación: Codex definirá y documentará esos comandos en M1.

Rollback local: `git restore` de cambios no committeados o volver al commit Foundation; no borrar el ZIP de respaldo hasta verificar extracción.


## Resolución humana · 2026-09-24 · Sprint 01
El usuario autoriza implementar M1 sobre los contratos canónicos presentes y corregir drift documental inequívoco. ASSUMPTION_IN_USE es relación/flag de dependencia de una Decision vigente sobre una Hypothesis no validada, nunca status. Las referencias anteriores al Patch independiente describen la limitación histórica de cotejo, no un gate de entrada a M1. No se ha localizado ni se afirma haber cotejado ese archivo. Esta resolución sustituye instrucciones anteriores de esperar ese cotejo para iniciar M1; no cambia Bible, invariantes ni alcance.
