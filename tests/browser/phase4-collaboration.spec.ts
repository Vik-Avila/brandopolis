import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { reviewShot } from './review-shots.js';
import { demoIdentity } from './demo-identity.js';

// ADR-0033 · Colaboración with two real identities: the agency invites by single-use link and, in the DEMO, also by
// email through the SIMULATED provider (stored in a local folder, sent to no one; PHASE4_SPEC §13), shares an identity
// proposal by multiple selection with a summary, comments internally and for the client; the guest
// accepts in their own session, sees only what was shared, comments and approves the exact version; withdrawing the
// access applies on the guest's next action. Deterministic DEMO; no AI.
async function signIn(page: Page, token: string) {
  await page.getByLabel('Token de sesión local').fill(token);
  await page.getByRole('button', { name: 'Entrar al espacio estratégico' }).click();
  await page.locator('#workspace').waitFor();
}
const openNav = async (page: Page) => { if (await page.locator('#menu').isVisible()) await page.locator('#menu').click(); };

test('ADR-0033: invite by link, share the exact version, guest portal with comments and approval, and revocation', async ({ page, browser, baseURL }, info) => {
  test.slow();
  const team = JSON.parse(readFileSync(process.env.BRANDOPOLIS_SESSION_FILE ?? '.local/demo-session.json', 'utf8'));
  const brand = `Cliente ${info.project.name} ${Date.now()}`;
  await page.goto('/'); await signIn(page, team.token);
  await page.locator('#new-brand').click();
  await page.getByLabel('Nueva marca', { exact: true }).fill(brand); await page.locator('#brand-ficha summary').click();
  await page.getByRole('button', { name: 'Crear marca', exact: true }).click();
  await expect(page.locator('#decision')).toContainText('Por decidir');
  const view = page.locator('#decision');

  // An identity proposal in review: the approvable item shared below.
  await openNav(page); await page.locator('#brand-resources').click();
  await view.getByRole('button', { name: 'Incorporar mi identidad' }).click();
  await view.getByRole('button', { name: 'Editar valores' }).click();
  await view.locator('#kit-form').getByRole('button', { name: 'Añadir color' }).click();
  await view.locator('#kit-form .kit-row[data-kind="color"]').first().getByLabel('Nombre').fill('Rojo');
  await view.locator('#kit-form .kit-row[data-kind="color"]').first().getByLabel('Hex').fill('#C8102E');
  await view.locator('#kit-form').getByRole('button', { name: 'Guardar borrador' }).click();
  await expect(page.locator('#notice')).toContainText('Borrador del kit guardado');
  await view.getByRole('button', { name: 'Enviar a revisión' }).click();
  await expect(page.locator('#notice')).toContainText('Versión enviada a revisión');

  // Colaboración: the single-use link, plus the email through the simulated provider (labelled as such).
  await openNav(page); await page.locator('#collaboration').click();
  await expect(view.locator('h2').first()).toHaveText('Trabaja con tu cliente');
  await expect(view).toContainText('simulado: se guarda en la bandeja local de la DEMO y no sale a ningún buzón');
  await view.getByLabel('Correo de tu cliente').fill('cliente@empresa.com');
  await view.getByLabel(/Enviar también la invitación por correo/).check();
  await view.getByRole('button', { name: 'Crear invitación' }).click();
  await expect(page.locator('#notice')).toContainText('correo en cola (simulado');
  const linkField = view.locator('#invite-link-value');
  await expect(linkField).toHaveValue(/\/#invitacion=[A-Za-z0-9_-]{43}$/);
  const link = await linkField.inputValue();
  await expect(view.locator('.collab-list').first()).toContainText('cliente@empresa.com');
  await expect(view.locator('.collab-list').first()).toContainText('Pendiente');
  // The worker (or the server right after queuing) sends it to the simulated provider; the status is visible.
  await expect(view.locator('.collab-list').first()).toContainText('Correo enviado · simulado', { timeout: 20000 });
  await expect(view.locator('.collab-list').first()).toContainText('no salió a ningún buzón');
  // PHASE4_SPEC §13 · R12-16: multiple selection (nothing preselected) and a summary of what the guest will see.
  const share = view.locator('#share-many-form');
  await expect(share.getByRole('button', { name: 'Compartir lo seleccionado' })).toBeDisabled();
  await share.getByRole('checkbox', { name: /Identidad visual · versión 1/ }).check();
  await expect(share.locator('#share-summary')).toContainText('Tu cliente verá (1)');
  await reviewShot(page, info, 'r12-colaboracion-compartir-varios');
  await share.getByRole('button', { name: 'Compartir lo seleccionado' }).click();
  await expect(page.locator('#notice')).toContainText('Tu cliente verá esas versiones exactas');
  const card = view.locator('.share-card').first();
  await card.getByLabel('Comentario').fill('Nota interna: revisar el rojo con imprenta');
  await card.getByLabel('¿Quién lo ve?').selectOption('INTERNAL');
  await card.getByRole('button', { name: 'Comentar' }).click();
  await expect(view.locator('.share-card').first()).toContainText('Interno');
  await view.locator('.share-card').first().getByLabel('Comentario').fill('Esta es la propuesta de color principal.');
  await view.locator('.share-card').first().getByRole('button', { name: 'Comentar' }).click();
  await expect(view.locator('.share-card').first()).toContainText('Esta es la propuesta de color principal.');

  // The guest: another identity, its own browser session.
  const guestIdentity = await demoIdentity();
  const { defaultBrowserType: _ignored, ...device } = info.project.use as Record<string, unknown>;
  const guestContext = await browser.newContext({ ...device, baseURL });
  const guest = await guestContext.newPage();
  await guest.goto(link.replace(/^https?:\/\/[^/]+/, ''));
  await signIn(guest, guestIdentity.token);
  const portal = guest.locator('#decision');
  await expect(portal.locator('.ws-hero h2')).toHaveText(brand);
  await expect(portal).toContainText('Portal del cliente');
  await expect(guest.locator('#portal-entry')).toBeVisible();
  await expect(portal.locator('.share-card')).toHaveCount(1);
  await expect(portal.locator('.share-card')).toContainText('Identidad visual · versión 1');
  await expect(portal.locator('.share-card')).toContainText('#C8102E');
  await expect(portal.locator('.share-card')).toContainText('Esta es la propuesta de color principal.');
  await expect(portal).not.toContainText('Nota interna'); // internal comments never reach the guest
  await expect(portal.getByRole('button', { name: 'Editar valores' })).toHaveCount(0); // no editing in the portal
  await portal.getByLabel('Tu comentario').fill('Nos gusta, ¿se puede ver en fondo oscuro?');
  await portal.getByRole('button', { name: 'Comentar' }).click();
  await expect(portal.locator('.share-card')).toContainText('Nos gusta, ¿se puede ver en fondo oscuro?');
  await portal.getByRole('button', { name: 'Pedir cambios' }).click();
  await expect(guest.locator('#notice')).toContainText('Cuéntale al equipo qué debería cambiar');
  await portal.getByRole('button', { name: 'Aprobar esta versión' }).click();
  await expect(portal.locator('.share-approvals')).toContainText('Aprobó esta versión');
  await expect(portal.locator('.share-approvals')).toContainText('Tú');
  expect(await guest.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);

  // The team is notified (same records in Inicio and in the right panel) and sees the comment and decision.
  await openNav(page); await page.locator('#home').click();
  await expect(view.locator('.home-actions')).toContainText('Comentario del cliente en', { timeout: 15000 });
  await expect(view.locator('.home-actions')).toContainText('El cliente aprobó');
  await openNav(page); await page.locator('#collaboration').click();
  await expect(view.locator('.share-card').first()).toContainText('Nos gusta, ¿se puede ver en fondo oscuro?');
  await expect(view.locator('.share-card').first()).toContainText('Aprobó esta versión');
  await expect(view.locator('.collab-list').nth(1)).toContainText('Con acceso');
  await openNav(page); await page.locator('#brand-resources').click();
  await expect(view).not.toContainText('Kit aprobado');

  // Withdrawing the access applies on the guest's next action.
  await openNav(page); await page.locator('#collaboration').click();
  await view.getByRole('button', { name: 'Retirar acceso' }).click();
  await expect(page.locator('#notice')).toContainText('Acceso retirado');
  await guest.locator('#portal-entry').click();
  await expect(portal.locator('h2').first()).toHaveText('Ya no tienes acceso');
  await expect(guest.locator('#portal-entry')).toBeHidden();
  await guestContext.close();
});
