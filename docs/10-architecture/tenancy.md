Status: canonical
Owner: Product / Engineering
Canonical: yes
Last reviewed: 2026-09-23
Related: docs/00-index/BRANDOPOLIS_MASTER_CONTEXT_FOR_WORK.md
Depends on: Master Context v1.0

# Tenancy

Account comercial → Workspace de aislamiento → Brand con estado propio. User puede pertenecer a varios Workspaces mediante Membership(role,status); asignación a Brand puede restringir más. Capability Context pertenece a User, con acceso privado; Brand Context a Brand bajo Workspace. Resolver scopes desde sesión server-side, nunca confiar en `workspaceId` enviado solo por cliente. Query y transacción deben incluir Workspace/Brand; jobs IA llevan scope firmado y expiran; Evidence y prompts no cruzan Brands. Pruebas: A no lee B, mismo consultor sin permiso a Brand vecina no lee datos, export/borrado no afecta otra Brand.
