# Phase10A · Evidencia Chromium

`encoding-proof/`: capturas de la prueba UTF-8 de Phase10A (`tests/visual/encoding-proof.spec.ts`).

Las series completas de iteración de Phase10A (baseline, iteration-1, final; ~32 MB) no se versionan: se
sustituyen por el conjunto curado final de Phase10B en `design/brandopolis-ui/reference/phase10b/`.

Reproducción de la evidencia contra cualquier instancia DEMO local:

```sh
# Instancia por defecto (pnpm competition:start, puerto 3000)
pnpm exec playwright test --config playwright.phase10a.config.ts
# Instancia aislada (pnpm competition:start --isolated, puerto 3001)
BRANDOPOLIS_BASE_URL=http://127.0.0.1:3001 BRANDOPOLIS_SESSION_FILE=.local/rc1-smoke/demo-session.json \
  EVIDENCE_DIR=test-results/phase10a pnpm exec playwright test --config playwright.phase10a.config.ts
```

La suite verifica UTF-8, desbordamiento horizontal, imágenes, errores JavaScript, pestañas por teclado y
contención/retorno de foco del diálogo de nueva marca en seis anchos. No se guardan tokens en capturas ni reportes.
