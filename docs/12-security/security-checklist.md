Status: derived
Owner: Product / Engineering
Canonical: no
Last reviewed: 2026-09-23
Related: docs/00-index/BRANDOPOLIS_MASTER_CONTEXT_FOR_WORK.md
Depends on: Master Context v1.0

# Gate de seguridad M1/MVP

- Sesiones seguras de proveedor auth maduro; autorización de todas las rutas y jobs.
- Tests de acceso entre Workspaces y Brands; workers sin permiso commit.
- Validación de input/output y escaping de UI; secrets sólo server-side.
- Evidencia externa con provenance y tratamiento como datos no confiables.
- Optimistic concurrency, idempotencia, auditoría de cambios humanos.
- Cambio upstream no sobrescribe downstream; error impact_pending visible.
- Logs minimizados; DEMO/PILOT/PRODUCTION separados; backups y restauración probados.
- Borrado/export/retención y consentimiento definidos antes de Founding Pilot.

No habilitar piloto real si falla cualquiera de los controles aplicables.
