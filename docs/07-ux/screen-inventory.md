Status: derived
Owner: Product / Engineering
Canonical: no
Last reviewed: 2026-09-23
Related: docs/00-index/BRANDOPOLIS_MASTER_CONTEXT_FOR_WORK.md
Depends on: Master Context v1.0

# Inventario de pantallas P0

Cada ruta exige `workspaceId/brandId` autorizado, salvo pública/auth. Tabla: dato principal, acción, evento y vacío/error; estados comunes en [states](states-and-empty-states.md).

| Pantalla | Dato / acción / evento |
|---|---|
| Landing, Login, Signup | propuesta y acceso / signup / account_created |
| Workspace Home | atención por Brand / abrir / high_value_return_event al trabajo real |
| Brands, Create Brand | lista autorizada / crear / brand_created |
| Initial Discovery | inputs / continuar / strategic_question_started |
| Strategy Workspace | journey y tarjeta / decidir / recommendation_* |
| Brand Context | estado e historia / inspeccionar / evidence_opened |
| Decisions, Decision Detail | versión y rationale / comparar, revisar / rationale_opened |
| Change Impact | relaciones y orden / review / change_impact_* |
| Blueprint | vista derivada / consultar / evento de vista separado de HVSE |
| Experiments | hipótesis/señal / registrar / experiment_created, signal_added |
| Strategic Practice | User capability / evaluar / assessment_* |
| Settings | membresía/privacidad / actualizar / audit event |
| Pilot Assessment/Feedback | cohorte/intervención / responder / pre/post_assessment_completed |

Principal user: Strategic Operator; Settings sólo administrador. Denegar acceso de Brand ajena. No tomar mera visita como evento de valor.
