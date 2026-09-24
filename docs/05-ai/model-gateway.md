Status: canonical
Owner: Product / Engineering
Canonical: yes
Last reviewed: 2026-09-24
Related: docs/00-index/source-of-truth.md
Depends on: Master Context v1.0 + hardening brief 2026-09-24

# Model Gateway · arquitectura aprobada

Puerto interno `invoke(task,module,promptVersion,contextVersion,input,outputSchema,budget,tenantScope)`. Adaptadores ocultan SDK proveedor; proveedor inicial OPEN técnico. Response tipada con result/error, tokenIn/out, cost, latency, model/provider, trace id. Error `UNAVAILABLE|TIMEOUT|INVALID_OUTPUT|RATE_LIMIT|BUDGET_EXCEEDED|PROVIDER_ERROR`; no convertir fallo en recomendación válida. Retry formato sólo si seguro, jamás retry de human commit. Observabilidad sin datos estratégicos en logs; Research separada, opcional. ADR-0005 acepta gateway, deja proveedor abierto.
