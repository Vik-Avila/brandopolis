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

test('PLN-001…003 and calendar: shared version is fixed, progress is shared apart, calendar shows the same actions', async ({ page }, info) => {
  test.slow();
  await signIn(page, `Plan compartido ${info.project.name} ${Date.now()}`);
  if (await page.locator('#menu').isVisible()) await page.locator('#menu').click();
  await page.locator('#marketing').click();
  const view = page.locator('#decision');
  const year = new Date().getFullYear();
  await view.getByRole('button', { name: `Empezar el plan de ${year}` }).click();
  await view.getByRole('button', { name: 'Añadir acción' }).click();
  const form = view.locator('#action-form');
  await form.getByLabel('¿Qué vas a hacer?').fill('Boletín mensual');
  await form.getByLabel('Responsable').fill('Ana');
  await form.getByLabel('Empieza').fill(`${year}-03-10`);
  await form.getByLabel('Termina').fill(`${year}-03-12`);
  await form.getByRole('button', { name: 'Guardar acción' }).click();
  await expect(view.locator('.plan-action').first()).toContainText('Boletín mensual');

  // Calendar: the same record, on its dates; grid on wide screens, agenda on small ones.
  await view.getByRole('button', { name: 'Calendario' }).click();
  await expect(view.getByRole('button', { name: 'Calendario' })).toHaveAttribute('aria-pressed', 'true');
  // Without a 90-day start, the calendar opens on the month of the first dated action.
  await expect(view.locator('#plan-calendar-title')).toHaveText(`marzo ${year}`);
  const narrow = (page.viewportSize()?.width ?? 1000) <= 760;
  const visibleChips = view.locator(narrow ? '.plan-agenda .plan-chip' : '.plan-calendar-grid .plan-chip');
  await expect(visibleChips).toHaveCount(3); // 10, 11 and 12 March
  await expect(visibleChips.first()).toContainText('Planeada · Ana');
  await expect(view.locator(narrow ? '.plan-calendar-grid' : '.plan-agenda')).toBeHidden();
  await view.getByRole('button', { name: 'Mes siguiente' }).click();
  await expect(view.locator('#plan-calendar-title')).toHaveText(`abril ${year}`);
  await expect(view.getByRole('button', { name: 'Mes siguiente' })).toBeFocused();
  await view.getByRole('button', { name: 'Mes anterior' }).click();

  // Share: prepare a fixed version, approve it on its exact content.
  await view.getByRole('button', { name: 'Preparar versión para revisión' }).click();
  await expect(view.locator('.plan-review')).toContainText('Versión 1 en revisión.');
  await view.getByLabel('¿Por qué apruebas o pides cambios?').fill('Plan revisado con la dirección');
  await view.getByRole('button', { name: 'Aprobar y compartir esta versión' }).click();
  await expect(view.locator('.plan-sharing')).toContainText('El cliente ve la versión 1');

  // An internal edit does not change what the client received.
  await view.getByRole('button', { name: 'Por prioridad' }).click();
  await view.locator('.plan-action').first().getByRole('button', { name: 'Editar' }).click();
  await view.locator('#action-form').getByLabel('Responsable').fill('Luis');
  await view.locator('#action-form').getByRole('button', { name: 'Guardar acción' }).click();
  await expect(view.locator('.plan-pending')).toContainText('Hay cambios en el plan que el cliente aún no ve.');

  // Progress is shared without approving again.
  await view.locator('.plan-action').first().getByLabel('Nota de avance para el cliente').fill('Primer envío listo');
  await view.locator('.plan-action').first().getByRole('button', { name: 'Empezar' }).click();
  await expect(view.locator('.plan-action').first().locator('.badge')).toHaveText('En curso');
  await view.getByRole('button', { name: 'Ver lo que recibe el cliente' }).click();
  await expect(view.locator('h2').first()).toHaveText('Lo que recibe el cliente');
  const shared = view.locator('.plan-action').first();
  await expect(shared).toContainText('Ana');
  await expect(shared).not.toContainText('Luis');
  await expect(shared.locator('.badge')).toHaveText('En curso');
  await expect(shared).toContainText('Primer envío listo');
  await expect(view.getByRole('button', { name: 'Editar' })).toHaveCount(0);
  await view.getByRole('button', { name: 'Volver al plan' }).click();
  await expect(view.locator('h2').first()).toHaveText('Plan de Marketing');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});
