import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { demoIdentity } from './demo-identity.js';

// ADR-0035 · Clientes (issue #10): manual capture persists across reload and a new session, follow-up with pending
// filters, the brand's web form keeps one opportunity when the response is lost and retried, campaign evidence is
// shown as captured-unverified, a client guest is refused by the server, and Resultados shows real counts next to
// «Sin conectar». Deterministic DEMO; no AI, no Chatwoot, no provider.
async function signIn(page: Page, token: string) {
  await page.getByLabel('Token de sesión local').fill(token);
  await page.getByRole('button', { name: 'Entrar al espacio estratégico' }).click();
  await page.locator('#workspace').waitFor();
}
const openNav = async (page: Page) => { if (await page.locator('#menu').isVisible()) await page.locator('#menu').click(); };

test('ADR-0035: manual and web capture persist, retries keep one opportunity, follow-up, guest refused, results', async ({ page, browser, baseURL }, info) => {
  test.slow();
  const team = JSON.parse(readFileSync(process.env.BRANDOPOLIS_SESSION_FILE ?? '.local/demo-session.json', 'utf8'));
  const brand = `Clientes ${info.project.name} ${Date.now()}`;
  await page.goto('/'); await signIn(page, team.token);
  await page.locator('#new-brand').click();
  await page.getByLabel('Nueva marca', { exact: true }).fill(brand); await page.locator('#brand-ficha summary').click();
  await page.getByRole('button', { name: 'Crear marca', exact: true }).click();
  await expect(page.locator('#decision')).toContainText('Por decidir');
  const view = page.locator('#decision');
  const brandId = await page.locator('#brands').inputValue();

  // The sidebar holds the eight areas without scrolling at the checked laptop sizes (I10-UI-02).
  if (!(await page.locator('#menu').isVisible())) {
    for (const size of [{ width: 1366, height: 768 }, { width: 1280, height: 800 }, { width: 1440, height: 900 }]) {
      await page.setViewportSize(size);
      expect(await page.locator('#journey').evaluate(n => n.scrollHeight <= n.clientHeight + 1), `no sidebar scroll at ${size.width}×${size.height}`).toBe(true);
      await expect(page.locator('#clients')).toBeInViewport();
      await expect(page.locator('#results')).toBeInViewport();
    }
    await page.setViewportSize(info.project.use.viewport!);
  }

  // Manual entry: queue «Por asignar» and «Sin seguimiento» until someone takes it (I10-CLI-01/03/08).
  await openNav(page); await page.locator('#clients').click();
  await expect(view.locator('h2').first()).toHaveText('Oportunidades de tu marca');
  if (await page.locator('#menu').isVisible()) await expect(page.locator('#nav-backdrop')).toBeHidden(); // changing area closes the mobile menu (I10-UI-03)
  await view.getByLabel('Nombre o referencia').fill('Luis Gómez');
  await view.getByLabel('¿Qué necesita?').fill('Precios para su cafetería');
  await view.getByLabel('Teléfono opcional').fill('+52 55 1234 5678');
  await view.getByLabel('¿Por dónde llegó?').selectOption('PHONE');
  await view.getByLabel(/¿Cómo dice que te conoció\?/).fill('Vio un anuncio en Instagram');
  await view.getByRole('button', { name: 'Guardar oportunidad' }).click();
  await expect(page.locator('#notice')).toContainText(/Oportunidad guardada \(OP-[0-9A-F]{8}\)/);
  const card = view.locator('.client-card', { hasText: 'Luis Gómez' });
  await expect(card).toContainText('Nueva');
  await expect(card.locator('.client-head')).toContainText('Por asignar');
  await expect(card.locator('.client-head')).toContainText('Sin seguimiento');
  await expect(card).toContainText('Campaña no identificada (sólo hay origen declarado)');
  await expect(card).toContainText('«Vio un anuncio en Instagram»');

  // It survives a reload and a brand-new session (another browser context signing in again).
  await page.reload(); await page.locator('#workspace').waitFor();
  await openNav(page); await page.locator('#clients').click();
  await expect(view.locator('.client-card', { hasText: 'Luis Gómez' })).toHaveCount(1);
  const { defaultBrowserType: _ignored, ...device } = info.project.use as Record<string, unknown>;
  const second = await browser.newContext({ ...device, baseURL });
  const other = await second.newPage();
  await other.goto('/'); await signIn(other, team.token);
  await other.locator('#brands').selectOption(brandId);
  await openNav(other); await other.locator('#clients').click();
  await expect(other.locator('#decision .client-card', { hasText: 'Luis Gómez' })).toHaveCount(1);
  await second.close();

  // Follow-up with the revision seen; the pending filters open the right record (I10-CLI-07/08).
  await view.locator('.client-card', { hasText: 'Luis Gómez' }).locator('summary', { hasText: 'Dar seguimiento' }).click();
  const edit = view.locator('.client-card', { hasText: 'Luis Gómez' }).locator('.client-update');
  await edit.getByLabel('Responsable').selectOption({ index: 1 });
  await edit.getByLabel('Siguiente seguimiento').fill('Llamar con precios');
  await edit.getByLabel('Fecha').fill('2099-01-15');
  await edit.getByRole('button', { name: 'Guardar seguimiento' }).click();
  await expect(page.locator('#notice')).toContainText('Seguimiento guardado');
  await expect(view.locator('.client-card', { hasText: 'Luis Gómez' }).locator('.client-head')).not.toContainText('Por asignar');
  await expect(view.locator('.client-card', { hasText: 'Luis Gómez' })).toContainText('Llamar con precios');

  // A web form of the brand (the DEMO admin holds the publish permission).
  await view.getByRole('button', { name: 'Crear formulario' }).click();
  await expect(page.locator('#notice')).toContainText('Formulario creado');
  const href = await view.locator('[data-form-link]').first().getAttribute('href');
  expect(href).toMatch(/^\/formulario\?f=[A-Za-z0-9_-]{22}$/);
  const visitorContext = await browser.newContext({ ...device, baseURL });
  const visitor = await visitorContext.newPage();
  await visitor.goto(`${href}&utm_source=facebook&utm_medium=cpc&utm_campaign=otono-2026&fbclid=IwAR0abc`);
  await expect(visitor.locator('h1')).toHaveText('Contacto del sitio');
  await visitor.getByLabel('Nombre').fill('Ana Pérez');
  await visitor.getByLabel('Correo').fill('ana@example.com');
  await visitor.getByLabel('¿En qué te podemos ayudar?').fill('Cotización de 50 cajas');
  await visitor.getByLabel('Acepto que me contacten sobre esta solicitud.').check();
  // The server stores the submission but the response is lost: the page says it could not confirm and keeps the data.
  let lost = true;
  await visitor.route('**/api/forms/submit', async route => { if (lost) { lost = false; await route.fetch(); await route.abort('connectionreset'); } else await route.continue(); });
  await visitor.getByRole('button', { name: 'Enviar solicitud' }).click();
  await expect(visitor.locator('#lead-status')).toContainText('No pudimos confirmar tu envío');
  await expect(visitor.getByLabel('Nombre')).toHaveValue('Ana Pérez');
  await visitor.getByRole('button', { name: 'Enviar solicitud' }).click();
  await expect(visitor.locator('h1')).toHaveText('Recibimos tu solicitud');
  await expect(visitor.locator('#lead-reference')).toHaveText(/^OP-[0-9A-F]{8}$/);
  expect(await visitor.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await visitorContext.close();

  // Exactly one opportunity for that submission, with captured (unverified) campaign evidence (I10-CLI-02/06, I10-ATR-01).
  await openNav(page); await page.locator('#clients').click();
  const web = view.locator('.client-card', { hasText: 'Ana Pérez' });
  await expect(web).toHaveCount(1);
  await expect(web).toContainText('Formulario web · Meta · Campaña capturada sin verificar: otono-2026');
  await expect(web.locator('.client-head')).toContainText('Por asignar');
  await view.getByRole('button', { name: /^Por asignar/ }).click();
  await expect(view.locator('.client-card')).toHaveCount(1);
  await expect(view.locator('.client-card')).toContainText('Ana Pérez');

  // A client guest of this brand is not a seller: the server refuses Clientes and Resultados (I10-SEC-02).
  await openNav(page); await page.locator('#collaboration').click();
  await view.getByLabel('Correo de tu cliente').fill('cliente@empresa.com');
  await view.getByRole('button', { name: 'Crear invitación' }).click();
  const link = await view.locator('#invite-link-value').inputValue();
  const guestIdentity = await demoIdentity();
  const guestContext = await browser.newContext({ ...device, baseURL });
  const guest = await guestContext.newPage();
  await guest.goto(link.replace(/^https?:\/\/[^/]+/, ''));
  await signIn(guest, guestIdentity.token);
  await expect(guest.locator('#decision')).toContainText('Portal del cliente');
  const status = await guest.evaluate(async id => [(await fetch(`/api/clients?brandId=${id}`)).status, (await fetch(`/api/results?brandId=${id}`)).status], brandId);
  expect(status).toEqual([404, 404]);
  await guestContext.close();

  // Resultados: real counts from the brand's opportunities; missing sources say so (I10-RES-01/03).
  await openNav(page); await page.locator('#results').click();
  await expect(view.locator('h2').first()).toHaveText('Lo que está pasando con tu marca');
  await expect(view.locator('[data-metric="new_opportunities"] .result-value')).toHaveText('2');
  await expect(view.locator('[data-metric="unassigned"] .result-value')).toHaveText('1');
  await expect(view.locator('[data-metric="web_requests"] .result-value')).toHaveText('1');
  await expect(view.locator('[data-metric="campaign_captured"] .result-value')).toHaveText('1');
  await expect(view.locator('[data-metric="site_campaigns_spend"]')).toContainText('Sin conectar');
  await expect(view.locator('[data-metric="won_lost"]')).toContainText('Sin datos');
  await expect(view).toContainText('America/Mexico_City');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});
