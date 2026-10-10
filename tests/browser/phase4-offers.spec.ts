import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

// PHASE4_SPEC §4.1 · Productos y servicios: create, edit, review, approve, new version (VER-001), estimated price
// (MKT-006). Deterministic DEMO; no AI request.
async function signIn(page: Page, brand: string) {
  const session = JSON.parse(readFileSync(process.env.BRANDOPOLIS_SESSION_FILE ?? '.local/demo-session.json', 'utf8'));
  await page.goto('/'); await page.getByLabel('Token de sesión local').fill(session.token);
  await page.getByRole('button', { name: 'Entrar al espacio estratégico' }).click();
  await page.locator('#workspace').waitFor(); await page.locator('#new-brand').click();
  await page.getByLabel('Nueva marca', { exact: true }).fill(brand);
  await page.locator('#brand-geography').selectOption('NATIONAL'); await page.locator('#brand-market').fill('México');
  await page.getByRole('button', { name: 'Crear marca', exact: true }).click();
  await expect(page.locator('#decision')).toContainText('Por decidir');
}
async function openOffers(page: Page) {
  if (await page.locator('#menu').isVisible()) await page.locator('#menu').click();
  await page.locator('#offers').click();
  await expect(page.locator('#decision h2').first()).toHaveText('Qué ofreces y por qué te elegirían');
}

test('offers: draft with estimated price → review → approval; a new version keeps the approved one', async ({ page }, info) => {
  test.slow();
  const calls: string[] = []; page.on('request', r => { const p = new URL(r.url()).pathname; if (p === '/api/brando/ask' || p === '/api/recommendations/generate') calls.push(p); });
  await signIn(page, `Ofertas ${info.project.name} ${Date.now()}`);
  await openOffers(page);
  await expect(page.locator('#offers')).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('.offer-empty')).toBeVisible();

  await page.getByRole('button', { name: 'Nueva oferta' }).click();
  const form = page.locator('#offer-form');
  await form.getByLabel('Nombre', { exact: true }).fill('Diagnóstico de marca');
  await form.getByLabel('Segmento o público').fill('Agencias pequeñas');
  await form.getByLabel('¿Qué necesidad resuelve?').fill('Ordenar la estrategia antes de producir');
  await form.getByLabel('Registrar un precio').check();
  await form.getByLabel('Monto').fill('15000');
  await form.getByRole('button', { name: 'Crear borrador' }).click();

  const card = page.locator('.offer-card').first();
  await expect(card.locator('h3')).toHaveText('Diagnóstico de marca');
  await expect(card).toContainText('Borrador · v1');
  await expect(card).toContainText('Estimado, no confirmado');
  await expect(card).toContainText('Pruebas que la respalden');

  await card.getByRole('button', { name: 'Enviar a revisión' }).click();
  await expect(page.locator('.offer-card').first()).toContainText('En revisión · v1');
  const review = page.locator('.offer-card').first();
  await review.getByLabel('¿Por qué apruebas o pides cambios?').fill('Revisada con el equipo comercial');
  await review.getByRole('button', { name: 'Aprobar esta versión' }).click();
  await expect(page.locator('.offer-card').first()).toContainText('Aprobada · v1');

  await page.locator('.offer-card').first().getByRole('button', { name: 'Crear una nueva versión' }).click();
  const after = page.locator('.offer-card').first();
  await expect(after).toContainText('Aprobada · v1');
  await expect(after).toContainText('Borrador · v2');
  expect(calls, 'offers never ask the AI').toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});
