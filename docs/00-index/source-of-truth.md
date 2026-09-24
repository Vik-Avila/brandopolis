Status: canonical
Owner: Product / Engineering
Canonical: yes
Last reviewed: 2026-09-24
Related: docs/00-index/source-of-truth.md
Depends on: Master Context v1.0 + hardening brief 2026-09-24

# Fuentes y precedencia

## Canonical product source

[`docs/01-product/product-bible-v1.md`](../01-product/product-bible-v1.md) es la síntesis operativa reconciliada del producto para coding agents. **No es copia autenticada del documento original** de Product Bible, que no está en el repo.

## Consolidated approved context

[`BRANDOPOLIS_MASTER_CONTEXT_FOR_WORK.md`](BRANDOPOLIS_MASTER_CONTEXT_FOR_WORK.md) contiene consolidación final aprobada de Gates. Si aparecen originales formalmente posteriores, reconciliar antes de alterar contrato.

## Final contract corrections

El hardening brief entregado el 2026-09-24 especifica las correcciones de estados, dependencias, Evidence, Recommendation, telemetría y handoff implementadas aquí. Menciona `BRANDOPOLIS_FINAL_CONTRACT_PATCH_BEFORE_CODEX.md`, **pero ese archivo independiente no estaba disponible** al cerrar esta edición. Por tanto, no se afirma que dicho Patch haya sido leído o aplicado íntegramente; ver [QA](../15-handoff/qa-report.md). Cualquier decisión explícita del Patch, cuando se aporte, prevalecerá sobre derivaciones técnicas y obligará nueva reconciliación.

## Technical derivations

Dominio `docs/04`, schemas, config, AI, seguridad y ADR concretan lo anterior. ADRs de ORM/auth/provider/deployment no son decisiones de producto. Datos de concurso IEBS/TecPrize antiguos son **historical material** y no gobiernan secuencia ni estado actual.

Jerarquía operativa al disponer del Patch: Master + Patch aprobados → Bible reconciliada → Gates originales aportados → Red Team → documentos técnicos → ADR → narrativa histórica → nuevas recomendaciones. Contradicción real se registra y resuelve con fuente/versión, no por preferencia del agente.
