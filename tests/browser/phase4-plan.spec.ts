import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

// PHASE4_SPEC §4.2 · Marketing → Plan de Marketing: start the plan, annual objective, 90-day priority, an action with
// owner, dates, estimated budget and indicator, status change and month view. Deterministic DEMO; no AI request.
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

test('plan: start, objective, 90-day priority, action with owner/dates/budget/indicator, status and month view', async ({ page }, info) => {
  test.slow();
  const calls: string[] = []; page.on('request', r => { const p = new URL(r.url()).pathname; if (p === '/api/brando/ask' || p === '/api/recommendations/generate') calls.push(p); });
  await signIn(page, `Plan ${info.project.name} ${Date.now()}`);
  if (await page.locator('#menu').isVisible()) await page.locator('#menu').click();
  await page.locator('#marketing').click();
  await expect(page.locator('#marketing')).toHaveAttribute('aria-current', 'page');
  const view = page.locator('#decision');
  await expect(view.locator('h2').first()).toHaveText('Plan de Marketing');
  const year = new Date().getFullYear();

  await view.getByLabel('¿Desde qué día cuentan tus próximos 90 días?').fill(`${year}-11-02`);
  await view.getByRole('button', { name: `Empezar el plan de ${year}` }).click();
  await expect(view.locator('.plan-gaps')).toContainText('un objetivo para el año');
  await expect(view.locator('.plan-focus')).toContainText(`Del 2 de noviembre de ${year}`);

  await view.getByRole('button', { name: 'Añadir objetivo del año' }).click();
  await view.locator('#objective-form').getByLabel('¿Qué quieres lograr este año?').fill('Duplicar clientes recurrentes');
  await view.locator('#objective-form').getByLabel('¿Cómo sabrás que lo lograste?').fill('Clientes recurrentes al cierre');
  await view.locator('#objective-form').getByRole('button', { name: 'Guardar' }).click();
  await expect(view.locator('.plan-objective').first()).toContainText('Duplicar clientes recurrentes');

  await view.getByRole('button', { name: 'Añadir prioridad de 90 días' }).click();
  await view.locator('#objective-form').getByLabel('¿Qué es lo más importante en estos 90 días?').fill('Primeros diez clientes');
  await view.locator('#objective-form').getByRole('button', { name: 'Guardar' }).click();
  await expect(view.locator('.plan-priority h4').first()).toHaveText('Primeros diez clientes');

  await view.getByRole('button', { name: 'Añadir acción' }).click();
  const form = view.locator('#action-form');
  await form.getByLabel('¿Qué vas a hacer?').fill('Webinar para agencias');
  // A commercial action needs an offer: with none yet, the form says where to create one.
  await form.getByLabel('Para vender una oferta').check();
  await expect(form).toContainText('Aún no hay ofertas. Créalas en Productos y servicios.');
  await form.getByLabel('Sobre la marca en general').check();
  await form.getByLabel('¿A qué objetivo o prioridad ayuda?').selectOption({ label: '90 días · Primeros diez clientes' });
  await form.getByLabel('Responsable').fill('Ana');
  await form.getByLabel('Empieza').fill(`${year}-11-09`);
  await form.getByLabel('Termina').fill(`${year}-11-27`);
  await form.getByLabel('Registrar un presupuesto').check();
  await form.getByLabel('Monto').fill('5000');
  await form.getByLabel('¿Cómo sabrás si funcionó?').fill('Registros al webinar');
  await form.getByRole('button', { name: 'Guardar acción' }).click();

  const card = view.locator('.plan-action').first();
  await expect(card).toContainText('Webinar para agencias');
  await expect(card).toContainText('Ana');
  await expect(card).toContainText('estimado');
  await expect(card).toContainText('Registros al webinar');
  await expect(card.locator('.badge')).toHaveText('Planeada');
  await card.getByRole('button', { name: 'Empezar' }).click();
  await expect(view.locator('.plan-action').first().locator('.badge')).toHaveText('En curso');

  await view.getByRole('button', { name: 'Por mes' }).click();
  await expect(view.locator('.plan-month h4').first()).toHaveText(`noviembre ${year}`);
  await view.locator('.plan-changes summary').click();
  await expect(view.locator('.plan-changes')).toContainText('Cambio de estado');
  expect(calls, 'the plan never asks the AI').toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});
