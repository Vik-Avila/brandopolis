import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { reviewShot } from './review-shots.js';

// PHASE4_SPEC §4.1 · Productos y servicios: create, edit, review, approve, new version (VER-001), estimated price
// (MKT-006). Deterministic DEMO; no AI request.
async function signIn(page: Page, brand: string) {
  const session = JSON.parse(readFileSync(process.env.BRANDOPOLIS_SESSION_FILE ?? '.local/demo-session.json', 'utf8'));
  await page.goto('/'); await page.getByLabel('Token de sesión local').fill(session.token);
  await page.getByRole('button', { name: 'Entrar al espacio estratégico' }).click();
  await page.locator('#workspace').waitFor(); await page.locator('#new-brand').click();
  await page.getByLabel('Nueva marca', { exact: true }).fill(brand); await page.locator('#brand-ficha summary').click();
  await page.locator('#brand-geography').selectOption('NATIONAL'); await page.locator('#brand-market').fill('México');
  await page.getByRole('button', { name: 'Crear marca', exact: true }).click();
  await expect(page.locator('#decision')).toContainText('Por decidir');
}
async function openOffers(page: Page) {
  if (await page.locator('#menu').isVisible()) await page.locator('#menu').click();
  await page.locator('#offers').click();
  await expect(page.locator('#decision h2').first()).toHaveText('Qué ofreces y por qué te elegirían');
}

test('offers: Brando first, manual draft with a price plan → choose who reviews → approve alone (recorded) → new version; create from an approved offer', async ({ page }, info) => {
  test.slow();
  const calls: string[] = []; page.on('request', r => { const p = new URL(r.url()).pathname; if (p === '/api/brando/ask' || p === '/api/recommendations/generate') calls.push(p); });
  await signIn(page, `Ofertas ${info.project.name} ${Date.now()}`);
  await openOffers(page);
  await expect(page.locator('#offers')).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('.offer-empty')).toBeVisible();

  // PHASE4_SPEC §13 · R12-06: Brando comes before the form; nothing is filled until the person chooses.
  await page.getByRole('button', { name: 'Nueva oferta' }).click();
  const form = page.locator('#offer-form');
  await expect(form.getByRole('button', { name: 'Construir con Brando' })).toBeVisible();
  await expect(form.getByLabel('Nombre', { exact: true })).toBeHidden();
  await reviewShot(page, info, 'r12-oferta-brando-primero');
  await form.getByRole('button', { name: 'Completar manualmente' }).click();
  await form.getByLabel('Nombre', { exact: true }).fill('Diagnóstico de marca');
  await form.getByLabel('Segmento o público').fill('Agencias pequeñas');
  await form.getByLabel('¿Qué necesidad resuelve?').fill('Ordenar la estrategia antes de producir');
  // R12-07: a price plan with its own periodicity and unit; validity apart.
  await form.getByRole('button', { name: 'Añadir un plan de precio' }).click();
  const plan = form.locator('.price-plan').first();
  await plan.getByLabel('Nombre del plan').fill('Mensual');
  await plan.getByLabel('Importe').fill('15000');
  await plan.getByLabel('Periodicidad', { exact: true }).selectOption('MONTHLY');
  await plan.getByLabel('Unidad', { exact: true }).selectOption('PER_PERSON');
  await reviewShot(page, info, 'r12-oferta-plan-de-precio');
  await form.getByRole('button', { name: 'Crear borrador' }).click();

  const card = page.locator('.offer-card').first();
  await expect(card.locator('h3')).toHaveText('Diagnóstico de marca');
  await expect(card).toContainText('Borrador · v1');
  await expect(card).toContainText('Mensual: ');
  await expect(card).toContainText('mensual · por persona · estimado, no confirmado');
  await expect(card).toContainText('Pruebas que la respalden');

  // R12-08: sending asks who reviews; without a choice it is not sent; approving alone is named as such.
  await card.getByRole('button', { name: 'Enviar a revisión' }).click();
  const dialog = card.locator('.review-submit');
  await expect(dialog).toContainText('¿Quién la revisa?');
  await expect(dialog.getByRole('button', { name: 'Enviar a revisión' })).toBeDisabled();
  await dialog.getByLabel('Yo: aprobación individual').check();
  await dialog.getByRole('button', { name: 'Enviar a revisión' }).click();
  const review = page.locator('.offer-card').first();
  await expect(review).toContainText('Pendiente de revisión · v1');
  await expect(review).toContainText('Revisa: Tú (aprobación individual)');
  await review.getByLabel('Tu comentario: por qué apruebas o qué hay que cambiar').fill('Revisada con el equipo comercial');
  await review.getByRole('button', { name: 'Aprobar (aprobación individual)' }).click();
  await expect(page.locator('.offer-card').first()).toContainText('Aprobada · v1');

  await page.locator('.offer-card').first().getByRole('button', { name: 'Crear una nueva versión' }).click();
  const after = page.locator('.offer-card').first();
  await expect(after).toContainText('Aprobada · v1');
  await expect(after).toContainText('Borrador · v2');

  // R12-09: create from the approved offer: an independent draft that says where it came from.
  await after.getByRole('button', { name: 'Crear a partir de esta oferta' }).click();
  const copy = page.locator('.offer-card', { hasText: 'Diagnóstico de marca (copia)' });
  await expect(copy).toContainText('Creada a partir de «Diagnóstico de marca»');
  await expect(copy).toContainText('Borrador · v1');
  await expect(copy).not.toContainText('Aprobada');
  await expect(copy).toContainText('mensual · por persona');
  await reviewShot(page, info, 'r12-oferta-crear-a-partir');
  expect(calls, 'offers never ask the AI').toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});
