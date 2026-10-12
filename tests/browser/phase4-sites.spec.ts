import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import JSZip from 'jszip';

// ADR-0032 · Sitio web in DEMO: create from the goal → Brando's proposal (incorporated by the person) → edit by sections
// → testimonials and figures with their source (a DEMO sample is labelled) → save and resume → authenticated preview on
// its own origin (browser-bound exchange) with the desktop/phone size view → review and approve → ZIP of the approved
// version opened from disk → publish to the isolated public server → contact form → opportunity in Clientes → second
// version → restore the first.
// Needs the isolated app (3001) plus `pnpm sites:public --isolated` (3101) and `pnpm sites:preview --isolated` (3201).
async function signIn(page: Page, token: string) {
  await page.getByLabel('Token de sesión local').fill(token);
  await page.getByRole('button', { name: 'Entrar al espacio estratégico' }).click();
  await page.locator('#workspace').waitFor();
}
const openFirstPage = async (page: Page) => { const d = page.locator('#decision .site-page').first(); if (!(await d.evaluate(el => (el as HTMLDetailsElement).open))) await d.locator('summary').click(); };
const openNav = async (page: Page) => { if (await page.locator('#menu').isVisible()) await page.locator('#menu').click(); };
async function siteTab(page: Page) {
  await openNav(page); await page.locator('#marketing').click();
  const tab = page.getByRole('tab', { name: 'Sitio web' });
  // Wait until the Marketing area has rendered its tabs (wide screens) or its selector (narrow screens).
  await page.waitForFunction(() => [...document.querySelectorAll('[role=tab]')].some(t => t.textContent === 'Sitio web' && (t as HTMLElement).offsetParent) || (document.querySelector('#area-select') as HTMLElement | null)?.offsetParent);
  if (await tab.isVisible()) await tab.click(); else await page.locator('#area-select').selectOption('site');
  await expect(page.locator('#decision h2').first()).toHaveText('Sitio web');
}

test('ADR-0032: site from goal to publication, form to Clientes, preview and restore', async ({ page, context }, info) => {
  test.slow();
  const team = JSON.parse(readFileSync(process.env.BRANDOPOLIS_SESSION_FILE ?? '.local/demo-session.json', 'utf8'));
  const brand = `Sitio ${info.project.name} ${Date.now()}`;
  await page.goto('/'); await signIn(page, team.token);
  await page.locator('#new-brand').click();
  await page.getByLabel('Nueva marca', { exact: true }).fill(brand); await page.locator('#brand-ficha summary').click();
  await page.getByRole('button', { name: 'Crear marca', exact: true }).click();
  await expect(page.locator('#decision')).toContainText('Por decidir');
  const view = page.locator('#decision');
  page.on('dialog', d => d.accept());

  // 1 · Goal and name: no strategy needed to start.
  await siteTab(page);
  await view.getByLabel('Conseguir contactos y solicitudes').check();
  await view.getByLabel('Nombre del sitio').fill('Sitio de prueba');
  await view.getByRole('button', { name: 'Empezar el sitio' }).click();
  await expect(page.locator('#notice')).toContainText('Sitio creado');
  await expect(view).toContainText('Lo que ya tenemos');
  await expect(view).toContainText('sin kit aprobado');

  // 2–3 · Brando proposes from what exists; nothing is saved until the person incorporates it.
  await view.getByRole('button', { name: 'Pedir propuesta a Brando' }).click();
  await expect(view.locator('.site-proposal')).toContainText('sin aprobar');
  await view.getByRole('button', { name: 'Incorporar la propuesta al borrador' }).click();
  await expect(page.locator('#notice')).toContainText('Propuesta incorporada');
  await expect(view.locator('.site-page')).toHaveCount(2); // Inicio + Contacto

  // 4 · Edit by sections and save; then resume after a reload.
  const home = view.locator('.site-page').first();
  await openFirstPage(page);
  await home.locator('.site-section').first().getByLabel('Título').fill('Café de origen para tu negocio');
  await home.getByLabel('Tipo de sección').selectOption('FAQ');
  await home.getByRole('button', { name: 'Añadir sección' }).click();
  const faq = view.locator('.site-page').first().locator('.site-section').last();
  await faq.getByLabel('Pregunta 1').fill('¿Hacen envíos?');
  await faq.getByLabel('Respuesta').fill('Sí, a todo el país.');
  // Testimonials and figures exist only with a source; the source stays in the version, never on the page.
  await home.getByLabel('Tipo de sección').selectOption('TESTIMONIALS');
  await home.getByRole('button', { name: 'Añadir sección' }).click();
  const quotes = view.locator('.site-page').first().locator('.site-section').last();
  await expect(quotes).toContainText('Brando no los escribe');
  await quotes.getByLabel('Testimonio 1').fill('El mejor café para nuestra barra.');
  await quotes.getByLabel('Quién lo dice').fill('Cliente de ejemplo');
  await quotes.getByLabel('Fuente del elemento 1').selectOption('PERSON');
  await quotes.getByLabel(/^Fuente \(por ejemplo/).fill('Ejemplo DEMO preparado por el equipo');
  await quotes.getByLabel(/Es un ejemplo de demostración/).check();
  await view.locator('.site-page').first().getByLabel('Tipo de sección').selectOption('FIGURES');
  await view.locator('.site-page').first().getByRole('button', { name: 'Añadir sección' }).click();
  const figures = view.locator('.site-page').first().locator('.site-section').last();
  await figures.getByLabel('Cifra 1').fill('120');
  await figures.getByLabel('Qué mide').fill('cafeterías atendidas');
  await figures.getByLabel('Fuente del elemento 1').selectOption('PERSON');
  await figures.getByLabel(/^Fuente \(por ejemplo/).fill('Registro interno de ventas 2025');
  await view.getByRole('button', { name: 'Guardar borrador' }).click();
  await expect(page.locator('#notice')).toContainText('Borrador guardado');
  await page.reload(); await page.locator('#workspace').waitFor();
  await siteTab(page);
  await openFirstPage(page);
  await expect(view.locator('.site-page').first().locator('.site-section').first().getByLabel('Título')).toHaveValue('Café de origen para tu negocio');
  await expect(view).toContainText('Lista para publicar');

  // Preview on its own origin: the person confirms with their own app session; the page is the exact draft.
  const [preview] = await Promise.all([context.waitForEvent('page'), view.locator('#site-preview').click()]);
  await preview.waitForLoadState();
  await expect(preview).toHaveURL(/127\.0\.0\.1:3001\/preview\/confirm/);
  await preview.getByRole('button', { name: 'Abrir vista previa' }).click();
  await expect(preview).toHaveURL(/127\.0\.0\.2:3201\/b\/.+\/v\/.+\/$/);
  await expect(preview.locator('body')).toContainText('Vista previa · versión interna');
  await expect(preview.locator('h1')).toHaveText('Café de origen para tu negocio');
  await expect(preview.locator('.quote')).toContainText('Ejemplo de demostración: no es un dato real.');
  await expect(preview.locator('body')).not.toContainText('Registro interno de ventas 2025');
  expect(await preview.evaluate(() => document.cookie)).toBe(''); // HttpOnly session, nothing readable by scripts
  // Size view: the same version in a phone or desktop width; switching never changes the content.
  await preview.getByRole('link', { name: 'móvil', exact: true }).click();
  await expect(preview).toHaveURL(/__vista\?ancho=movil/);
  await expect(preview.locator('iframe')).toHaveAttribute('width', '390');
  await expect(preview.frameLocator('iframe').locator('h1')).toHaveText('Café de origen para tu negocio');
  await preview.getByRole('link', { name: 'Escritorio (1280 px)' }).click();
  await expect(preview.locator('iframe')).toHaveAttribute('width', '1280');
  await expect(preview.frameLocator('iframe').locator('h1')).toHaveText('Café de origen para tu negocio');
  await preview.close();

  // 5 · Review, approve and publish the exact version (explicit confirmation names site, version and address).
  await view.getByRole('button', { name: 'Enviar a revisión' }).click();
  await expect(page.locator('#notice')).toContainText('Versión enviada a revisión');
  await view.getByLabel('¿Por qué apruebas o pides cambios?').fill('Revisado con el equipo comercial');
  await view.getByRole('button', { name: 'Aprobar esta versión' }).click();
  await expect(page.locator('#notice')).toContainText('Versión aprobada');
  // ZIP of the exact approved version: it opens from a folder, keeps its styles and says the form does not send.
  const [download] = await Promise.all([page.waitForEvent('download'), view.getByRole('button', { name: 'Descargar ZIP de la versión 1' }).click()]);
  expect(download.suggestedFilename()).toBe('sitio-de-prueba-v1.zip');
  const zip = await JSZip.loadAsync(readFileSync(await download.path()));
  const out = mkdtempSync(join(tmpdir(), 'bp-site-zip-'));
  for (const [name, entry] of Object.entries(zip.files)) if (!entry.dir) { mkdirSync(dirname(join(out, name)), { recursive: true }); writeFileSync(join(out, name), await entry.async('nodebuffer')); }
  expect(JSON.parse(readFileSync(join(out, 'sitio-de-prueba-v1', 'manifest.json'), 'utf8'))).toMatchObject({ site: 'Sitio de prueba', version: 1 });
  const copy = await context.newPage();
  await copy.goto(pathToFileURL(join(out, 'sitio-de-prueba-v1', 'index.html')).href);
  await expect(copy.locator('h1')).toHaveText('Café de origen para tu negocio');
  expect(await copy.locator('h1').evaluate(el => getComputedStyle(el).color)).toBe('rgb(29, 42, 38)'); // the theme stylesheet loaded
  await copy.getByRole('link', { name: 'Contacto' }).first().click();
  await expect(copy).toHaveURL(/contacto\/index\.html$/);
  await expect(copy.locator('.form-off')).toContainText('no está conectado en esta copia');
  await expect(copy.locator('form')).toHaveCount(0);
  await copy.close();
  await view.getByRole('button', { name: 'Publicar esta versión' }).click();
  await expect(page.locator('#notice')).toContainText('Publicada la versión 1');
  const live = await view.locator('#site-live-link').getAttribute('href');
  await expect(view.locator('.site-domains')).toContainText('servidor de desarrollo, sin HTTPS'); // never shown as ready for real publication
  expect(live).toMatch(/^http:\/\/sitio-de-prueba-[a-z0-9]+\.localhost:3101\/$/);

  // The public site: no app cookie goes there; the form stores an opportunity before showing success.
  const visitor = await context.browser()!.newContext({ baseURL: live! });
  const pub = await visitor.newPage();
  await pub.goto(`${live}contacto/?utm_source=facebook&utm_campaign=otono&fbclid=IwAR0abc`);
  await expect(pub.locator('h2').first()).toHaveText('Escríbenos');
  await pub.getByLabel('Nombre').fill('Ana Visitante');
  await pub.getByLabel('Correo').fill('ana@example.com');
  await pub.getByLabel('¿En qué te podemos ayudar?').fill('Quiero precios para mi cafetería');
  await pub.getByLabel('Acepto que me contacten sobre esta solicitud.').check();
  await pub.getByRole('button', { name: 'Enviar' }).click();
  await expect(pub.locator('h1')).toHaveText('Recibimos tu solicitud');
  await expect(pub.locator('body')).toContainText(/Referencia: OP-[0-9A-F]{8}/);
  // Going back and sending the same page again does not duplicate it.
  await pub.goBack(); await pub.getByRole('button', { name: 'Enviar' }).click();
  await expect(pub.locator('h1')).toHaveText('Recibimos tu solicitud');
  await pub.goto(live!);
  await expect(pub.locator('h1')).toHaveText('Café de origen para tu negocio');
  expect(await pub.evaluate(() => document.scripts.length)).toBe(0);
  await visitor.close();

  await openNav(page); await page.locator('#clients').click();
  const card = view.locator('.client-card', { hasText: 'Ana Visitante' });
  await expect(card).toHaveCount(1);
  await expect(card).toContainText('Formulario web · Meta · Campaña capturada sin verificar: otono');

  // A second version goes live; restoring the first is a new publication.
  await siteTab(page);
  await view.getByRole('button', { name: 'Crear una versión nueva' }).click();
  await expect(page.locator('#notice')).toContainText('Nueva versión en borrador');
  await openFirstPage(page);
  await view.locator('.site-page').first().locator('.site-section').first().getByLabel('Título').fill('Versión dos del sitio');
  await view.getByRole('button', { name: 'Guardar borrador' }).click();
  await expect(page.locator('#notice')).toContainText('Borrador guardado');
  await view.getByRole('button', { name: 'Enviar a revisión' }).click();
  await view.getByLabel('¿Por qué apruebas o pides cambios?').fill('Segunda versión revisada');
  await view.getByRole('button', { name: 'Aprobar esta versión' }).click();
  await view.getByRole('button', { name: 'Publicar esta versión' }).click();
  await expect(page.locator('#notice')).toContainText('Publicada la versión 2');
  const check = await context.browser()!.newContext();
  const p2 = await check.newPage();
  await p2.goto(live!); await expect(p2.locator('h1')).toHaveText('Versión dos del sitio');
  await view.getByRole('button', { name: 'Restaurar esta versión' }).click();
  await expect(page.locator('#notice')).toContainText('Restaurada la versión 1');
  await p2.reload(); await expect(p2.locator('h1')).toHaveText('Café de origen para tu negocio');
  await check.close();
  await expect(view.locator('.collab-list').first()).toContainText('Reemplazada');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});
