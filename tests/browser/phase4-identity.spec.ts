import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

// ADR-0034 · Marca y recursos → Identidad visual: files validated by content (PNG preview with real transparency, SVG
// never shown), ingest a draft, explicit adoption, contrast per pair, review, approval and separate publication.
const PNG_1PX = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
const SVG_WITH_SCRIPT = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><rect width="10" height="10"/></svg>');

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

test('identity: upload files, ingest, adopt, contrast, approve and publish the kit', async ({ page }, info) => {
  test.slow();
  const dialogs: string[] = []; page.on('dialog', d => { dialogs.push(d.message()); void d.dismiss(); });
  await signIn(page, `Identidad ${info.project.name} ${Date.now()}`);
  if (await page.locator('#menu').isVisible()) await page.locator('#menu').click();
  await page.locator('#brand-resources').click();
  const view = page.locator('#decision');
  await expect(view.locator('h2').first()).toHaveText('Identidad visual');
  await expect(view).toContainText('Guía de marca, Biblioteca y Plantillas llegarán más adelante.');
  await expect(view.getByRole('heading', { name: 'Ya tengo identidad' })).toBeVisible();
  await expect(view.locator('.kit-entry').nth(1)).toContainText('Disponible cuando tengas un kit aprobado.');

  // Files: a real PNG (previewed, transparency read from the file) and an SVG with a script (stored, never shown).
  await view.getByLabel('¿Qué archivo es?').selectOption('LOGO');
  await view.locator('#kit-file').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: PNG_1PX });
  await view.getByRole('button', { name: 'Subir archivo' }).click();
  await expect(view.locator('.kit-asset').first()).toContainText('PNG · 1 KB · 1×1 px · Transparencia real');
  await expect(view.locator('.kit-asset img').first()).toHaveJSProperty('naturalWidth', 1);
  await view.getByLabel('¿Qué archivo es?').selectOption('LOGO');
  await view.locator('#kit-file').setInputFiles({ name: 'logo.svg', mimeType: 'image/svg+xml', buffer: SVG_WITH_SCRIPT });
  await view.getByRole('button', { name: 'Subir archivo' }).click();
  await expect(view.locator('.kit-asset').nth(1)).toContainText('Un SVG no se muestra hasta sanearlo');
  await expect(view.locator('.kit-asset').nth(1).locator('img')).toHaveCount(0);

  await view.getByRole('button', { name: 'Incorporar mi identidad' }).click();
  await expect(view).toContainText('Incorporando tu identidad');
  await view.getByRole('button', { name: 'Editar valores' }).click();
  const form = view.locator('#kit-form');
  await form.getByRole('button', { name: 'Añadir color' }).click();
  await form.locator('.kit-row[data-kind="color"]').nth(0).getByLabel('Nombre').fill('Tinta');
  await form.locator('.kit-row[data-kind="color"]').nth(0).getByLabel('Hex').fill('#111111');
  await form.locator('.kit-row[data-kind="color"]').nth(0).getByLabel('Función').selectOption('TEXT');
  await form.getByRole('button', { name: 'Añadir color' }).click();
  await form.locator('.kit-row[data-kind="color"]').nth(1).getByLabel('Nombre').fill('Papel');
  await form.locator('.kit-row[data-kind="color"]').nth(1).getByLabel('Hex').fill('#FFFFFF');
  await form.locator('.kit-row[data-kind="color"]').nth(1).getByLabel('Función').selectOption('BACKGROUND');
  await form.getByLabel('Redes sociales').check();
  await form.getByLabel('Tono de la marca').fill('Cercano y claro');
  await form.getByRole('button', { name: 'Guardar borrador' }).click();
  await expect(view.locator('.kit-value').filter({ hasText: 'Tinta' })).toContainText('Propuesto, sin adoptar');

  // Contrast pairs need saved colors: add the pair in a second edit.
  await view.getByRole('button', { name: 'Editar valores' }).click();
  await view.locator('#kit-form').getByRole('button', { name: 'Añadir combinación' }).click();
  await view.locator('#kit-form .kit-pair select[name="pair-background"]').selectOption({ label: 'Papel' });
  await view.locator('#kit-form').getByRole('button', { name: 'Guardar borrador' }).click();
  await expect(view.locator('.kit-contrast')).toContainText('Tinta sobre Papel');
  await expect(view.locator('.kit-contrast')).toContainText('texto normal cumple AA');

  await view.locator('.kit-value').filter({ hasText: 'Tinta' }).getByLabel('Adoptar').check();
  await view.getByRole('button', { name: 'Adoptar los seleccionados' }).click();
  await expect(view.locator('.kit-value').filter({ hasText: 'Tinta' })).toContainText('Confirmado por una persona');
  await expect(view.locator('.kit-value').filter({ hasText: 'Papel' })).toContainText('Propuesto, sin adoptar');

  await view.getByRole('button', { name: 'Enviar a revisión' }).click();
  await view.getByLabel('¿Por qué apruebas o pides cambios?').fill('Kit revisado con el equipo de diseño');
  await view.getByRole('button', { name: 'Aprobar esta versión' }).click();
  await expect(view).toContainText('Kit aprobado · versión 1');
  await expect(view).toContainText('Aún no publicado. Publicar es un paso aparte de aprobar.');
  await view.getByRole('button', { name: 'Publicar esta versión' }).click();
  await expect(view).toContainText('Publicado: versión 1 (la misma).');
  expect(dialogs, 'no script from an uploaded SVG ever runs').toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test('«Quiero crearla»: Brando directions (DEMO labelled) enter the draft as proposed values; nothing is adopted or published', async ({ page }, info) => {
  test.slow();
  await signIn(page, `Crear identidad ${info.project.name} ${Date.now()}`);
  if (await page.locator('#menu').isVisible()) await page.locator('#menu').click();
  await page.locator('#brand-resources').click();
  const view = page.locator('#decision');
  await view.getByRole('button', { name: 'Crear mi identidad' }).click();
  await expect(view).toContainText('Creando tu identidad');
  await expect(view.locator('#kit-brando-title')).toHaveText('Pide direcciones visuales a Brando');
  await view.getByLabel('¿Qué buscas?').fill('cercana y profesional');
  await view.getByRole('button', { name: 'Pedir direcciones a Brando' }).click();
  const result = view.locator('#kit-brando-result');
  await expect(result).toContainText('Direcciones de ejemplo (modo DEMO, no generadas por IA)');
  await expect(result.locator('.kit-direction')).toHaveCount(3);
  await expect(result.locator('.kit-direction').first()).toContainText('Antes de adoptar, confirma');
  await expect(view.locator('.kit-value')).toHaveCount(0); // asking adds nothing
  await result.locator('.kit-direction').first().getByRole('button', { name: 'Usar esta dirección en el borrador' }).click();
  const values = view.locator('.kit-value');
  await expect(values.first()).toContainText('Propuesto, sin adoptar');
  await expect(values.first()).toContainText('Propuesta de Brando');
  await expect(view.locator('.kit-value').filter({ hasText: 'Confirmado por una persona' })).toHaveCount(0);
  await expect(view).not.toContainText('Kit aprobado');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});
