import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

// PHASE4_SPEC §3/§4.4 · area tabs and deliverables: social post (review, approval, manual publication record, text
// download), offer copy in Productos y servicios → Materiales de venta. Deterministic DEMO; no AI, no publication.
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
async function open(page: Page, id: '#marketing' | '#offers') {
  if (await page.locator('#menu').isVisible()) await page.locator('#menu').click();
  await page.locator(id).click();
}
/** Wide screens use the tabs; narrow screens the selector that mirrors them. */
async function section(page: Page, key: string, label: string) {
  const narrow = (page.viewportSize()?.width ?? 1000) <= 640;
  if (narrow) await page.locator('#area-select').selectOption(key);
  else await page.getByRole('tab', { name: label }).click();
  await expect(page.locator('#decision h2').first()).toHaveText(label === 'Materiales de venta' ? 'Materiales de venta' : label);
}

test('social post: tabs, review, approval, manual publication record and text download; never publishes', async ({ page }, info) => {
  test.slow();
  const calls: string[] = []; page.on('request', r => { const p = new URL(r.url()).pathname; if (p === '/api/brando/ask' || p === '/api/recommendations/generate') calls.push(p); });
  await signIn(page, `Redes ${info.project.name} ${Date.now()}`);
  await open(page, '#marketing');
  const view = page.locator('#decision');
  await expect(view.locator('h2').first()).toHaveText('Plan de Marketing');
  const narrow = (page.viewportSize()?.width ?? 1000) <= 640;
  if (!narrow) {
    // Keyboard: arrows move between sections and keep focus on the selected tab.
    await page.getByRole('tab', { name: 'Plan de Marketing' }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(view.locator('h2').first()).toHaveText('Redes sociales');
    await expect(page.getByRole('tab', { name: 'Redes sociales' })).toBeFocused();
    await expect(page.getByRole('tab', { name: 'Redes sociales' })).toHaveAttribute('aria-selected', 'true');
  } else {
    await expect(page.getByRole('tab', { name: 'Redes sociales' })).toBeHidden();
    await section(page, 'social', 'Redes sociales');
  }
  await expect(view).toContainText('Sitio web llegará más adelante.');

  await view.getByRole('button', { name: 'Nuevo: Publicación para redes' }).click();
  const form = view.locator('#deliverable-form');
  await form.getByLabel('Nombre').fill('Lanzamiento del diagnóstico');
  await form.getByLabel('Red').selectOption('LINKEDIN');
  await form.getByLabel('¿Para qué sirve esta publicación?').fill('Dar a conocer el diagnóstico');
  await form.getByLabel('Fecha prevista').fill('2026-11-03');
  await form.getByLabel('Texto', { exact: true }).fill('Ordena tu estrategia antes de producir materiales.');
  await form.getByLabel('Etiquetas (separadas por espacios)').fill('marca #estrategia');
  await form.getByRole('button', { name: 'Crear borrador' }).click();

  const card = view.locator('.deliverable-card').first();
  await expect(card).toContainText('Borrador · v1');
  await expect(card).toContainText('#marca #estrategia');
  await expect(view.locator('.plan-month h4').first()).toHaveText('noviembre 2026');
  await card.getByRole('button', { name: 'Enviar a revisión' }).click();
  await view.locator('.deliverable-card').first().getByLabel('¿Por qué apruebas o pides cambios?').fill('Revisada con el equipo comercial');
  await view.locator('.deliverable-card').first().getByRole('button', { name: 'Aprobar esta versión' }).click();
  const approved = view.locator('.deliverable-card').first();
  await expect(approved).toContainText('Aprobada · v1');
  await expect(approved).toContainText('Brandopolis no publica por ti');

  const download = page.waitForEvent('download');
  await approved.getByRole('button', { name: 'Descargar .txt' }).click();
  expect((await download).suggestedFilename()).toBe('lanzamiento-del-diagnostico-v1.txt');

  await approved.getByLabel('Fecha de publicación').fill('2026-11-04');
  await approved.getByLabel('Enlace').fill('https://www.linkedin.com/posts/ejemplo');
  await approved.getByRole('button', { name: 'Registrar publicación' }).click();
  await expect(view.locator('.deliverable-card').first()).toContainText('Publicada el 4 de noviembre de 2026');
  expect(calls, 'deliverables never ask the AI here').toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test('offer copy lives in Productos y servicios → Materiales de venta and needs an offer', async ({ page }, info) => {
  test.slow();
  await signIn(page, `Materiales ${info.project.name} ${Date.now()}`);
  await open(page, '#offers');
  const view = page.locator('#decision');
  await view.getByRole('button', { name: 'Nueva oferta' }).click();
  await view.locator('#offer-form').getByLabel('Nombre', { exact: true }).fill('Diagnóstico de marca');
  await view.locator('#offer-form').getByRole('button', { name: 'Crear borrador' }).click();
  await expect(view.locator('.offer-card').first()).toContainText('Borrador · v1');
  await section(page, 'materials', 'Materiales de venta');
  await view.getByRole('button', { name: 'Nuevo: Textos de producto o servicio' }).click();
  const form = view.locator('#deliverable-form');
  await form.getByLabel('Nombre').fill('Textos del diagnóstico');
  await form.getByRole('button', { name: 'Crear borrador' }).click();
  await expect(form.locator('#deliverable-form-status')).toHaveText('Elige la oferta de estos textos.');
  await form.getByLabel('Oferta', { exact: true }).selectOption({ label: 'Diagnóstico de marca (sin aprobar)' });
  await form.getByLabel('Título').fill('Ordena tu marca en 30 días');
  await form.getByRole('button', { name: 'Crear borrador' }).click();
  const card = view.locator('.deliverable-card').first();
  await expect(card).toContainText('Textos de producto o servicio');
  await expect(card).toContainText('Oferta');
  await expect(card).toContainText('Diagnóstico de marca');
  await expect(card).toContainText('Ordena tu marca en 30 días');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test('Brando proposes a social post from approved information (DEMO labelled); using it fills the form; provenance is server-decided', async ({ page }, info) => {
  test.slow();
  const marketing: string[] = []; page.on('request', r => { if (new URL(r.url()).pathname === '/api/brando/marketing') marketing.push(r.method()); });
  await signIn(page, `Brando marketing ${info.project.name} ${Date.now()}`);
  await open(page, '#marketing');
  await section(page, 'social', 'Redes sociales');
  const view = page.locator('#decision');
  await view.getByRole('button', { name: 'Nuevo: Publicación para redes' }).click();
  const form = view.locator('#deliverable-form');
  await expect(form).toContainText('Tú lo editas y decides; nada se aprueba ni se publica solo.');
  await form.getByLabel('¿Qué necesitas?').fill('Anunciar el lanzamiento con un tono cercano');
  await form.getByRole('button', { name: 'Pedir una propuesta a Brando' }).click();
  const proposal = form.locator('.brando-proposal');
  await expect(proposal).toContainText('Propuesta de ejemplo (modo DEMO, no generada por IA)');
  await expect(proposal).toContainText('Preguntas para ti');
  expect(marketing).toEqual(['POST']);
  await expect(view.locator('.deliverable-card')).toHaveCount(0); // asking writes nothing
  await proposal.getByRole('button', { name: 'Usar esta propuesta en el formulario' }).click();
  await expect(form.getByLabel('Nombre')).toHaveValue(/Propuesta de ejemplo/);
  await form.getByLabel('Nombre').fill('Lanzamiento con Brando');
  await form.getByRole('button', { name: 'Crear borrador' }).click();
  const card = view.locator('.deliverable-card').first();
  await expect(card).toContainText('Lanzamiento con Brando');
  await expect(card).toContainText('Propuesta de Brando editada por una persona');
  await expect(card).toContainText('Borrador · v1');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});
