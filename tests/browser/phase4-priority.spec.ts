import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { navigate } from '../workspace-nav.js';

// PHASE4_SPEC §4.9 · «¿Qué te gustaría trabajar primero con tu marca?» with the current brand form (INT-001, 002, 004,
// 005, 007, 008). Deterministic DEMO; any AI request is counted and must stay at zero.
async function openSession(page: Page) {
  const session = JSON.parse(readFileSync(process.env.BRANDOPOLIS_SESSION_FILE ?? '.local/demo-session.json', 'utf8'));
  await page.goto('/'); await page.getByLabel('Token de sesión local').fill(session.token);
  await page.getByRole('button', { name: 'Entrar al espacio estratégico' }).click();
  await page.locator('#workspace').waitFor();
}
const aiCalls = (page: Page) => { const calls: string[] = []; page.on('request', r => { const p = new URL(r.url()).pathname; if (p === '/api/brando/ask' || p === '/api/recommendations/generate') calls.push(p); }); return calls; };

test('INT-001/002/005: the priority chosen at creation is saved with its brand, shown in Inicio and can be changed', async ({ page }, info) => {
  test.slow();
  const calls = aiCalls(page);
  await openSession(page);
  await page.locator('#new-brand').click();
  await page.getByLabel('Nueva marca', { exact: true }).fill(`Prioridad ${info.project.name} ${Date.now()}`); await page.locator('#brand-ficha summary').click();
  await expect(page.locator('#create-brand .work-intent legend')).toHaveText('¿Qué te gustaría trabajar primero con tu marca?');
  await expect(page.locator('#create-brand input[name="brand-intent"]')).toHaveCount(11);
  await expect(page.locator('#create-brand .work-intent-note')).toBeHidden();
  await page.locator('#create-brand').getByLabel('Un punto concreto de mi estrategia').check();
  await page.locator('#brand-geography').selectOption('NATIONAL'); await page.locator('#brand-market').fill('México');
  await page.getByRole('button', { name: 'Crear marca', exact: true }).click();
  await expect(page.locator('#decision')).toContainText('Por decidir');

  await navigate(page, 'Inicio');
  const priority = page.locator('.work-priority');
  await expect(priority.locator('.badge')).toHaveText('Un punto concreto de mi estrategia');
  await expect(priority).toContainText('No necesitas recorrer las nueve decisiones');
  await expect(priority.locator('[data-attention-module]')).toHaveCount(9);
  // The suggestion opens a real decision.
  await priority.locator('[data-attention-module="Positioning"]').click();
  await expect(page.locator('#decision .decision-title')).toHaveText('Posicionamiento');

  // Change it to an area that exists now (ADR-0032: Sitio web); the button opens it. An area that does not exist yet is
  // named honestly without a button (covered in tests/work-priority-views.test.ts).
  await navigate(page, 'Inicio');
  await page.locator('.work-priority summary').click();
  await page.locator('.work-priority').getByLabel('Mi sitio web').check();
  await page.locator('.work-priority').getByRole('button', { name: 'Guardar prioridad' }).click();
  await expect(page.locator('.work-priority .badge')).toHaveText('Mi sitio web');
  await page.locator('.work-priority [data-priority-area="WEBSITE"]').click();
  await expect(page.locator('#decision h2').first()).toHaveText('Sitio web');
  // «Otro» keeps an optional note, shown back in Inicio; history is kept (append-only).
  await navigate(page, 'Inicio');
  await page.locator('.work-priority summary').click();
  await page.locator('.work-priority').getByLabel('Otro', { exact: true }).check();
  await page.locator('.work-priority').getByLabel('Cuéntanos qué te gustaría trabajar').fill('Ordenar mi catálogo');
  await page.locator('.work-priority').getByRole('button', { name: 'Guardar prioridad' }).click();
  await expect(page.locator('.work-priority .badge')).toHaveText('Otro');
  await expect(page.locator('.work-priority')).toContainText('Nos contaste: «Ordenar mi catálogo»');
  expect(calls, 'choosing or changing a priority never asks the AI').toEqual([]);
});

test('INT-007: the radio group works with the keyboard and the brand can be created without choosing', async ({ page }, info) => {
  await openSession(page);
  await page.locator('#new-brand').click();
  await page.getByLabel('Nueva marca', { exact: true }).fill(`Sin prioridad ${info.project.name} ${Date.now()}`); await page.locator('#brand-ficha summary').click();
  const first = page.locator('#create-brand input[name="brand-intent"]').first();
  await first.focus(); await page.keyboard.press('ArrowDown');
  await expect(page.locator('#create-brand input[name="brand-intent"]:checked')).toHaveValue('STRATEGY_POINT');
  for (let i = 0; i < 8; i++) await page.keyboard.press('ArrowDown');
  await expect(page.locator('#create-brand input[name="brand-intent"]:checked')).toHaveValue('OTHER');
  await expect(page.locator('#create-brand .work-intent-note')).toBeVisible(); // «Otro» reached by keyboard reveals its note
  await page.locator('#create-brand input[name="brand-intent"]:checked').evaluate(el => { (el as HTMLInputElement).checked = false; });
  await page.locator('#brand-geography').selectOption('NATIONAL'); await page.locator('#brand-market').fill('México');
  await page.getByRole('button', { name: 'Crear marca', exact: true }).click();
  await expect(page.locator('#decision')).toContainText('Por decidir');
  await navigate(page, 'Inicio');
  await expect(page.locator('.work-priority')).toContainText('Aún no has elegido por dónde empezar');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});
