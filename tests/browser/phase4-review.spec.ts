import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { reviewShot } from './review-shots.js';

// PHASE4_SPEC §13 · owner review of 2026-10-12 in the DEMO (one person, simulators only): origin decisions preselected
// with select all / none (R12-05), comments per version (R12-22), final art after an approval as a new version
// (R12-10), brief references kept internal (R12-11), Plantillas (R12-12), Results periods with comparison (R12-17),
// the notification centre in the right panel (R12-21), the approval circuit in Configuración de marca (R12-08) and the
// Performance Max and Meta messaging editors (R12-14/15, ADR-0036). Setup goes through the same API as the interface.
async function signIn(page: Page, token: string) {
  await page.getByLabel('Token de sesión local').fill(token);
  await page.getByRole('button', { name: 'Entrar al espacio estratégico' }).click();
  await page.locator('#workspace').waitFor();
}
const openNav = async (page: Page) => { if (await page.locator('#menu').isVisible()) await page.locator('#menu').click(); };
const api = (page: Page, path: string, body?: Record<string, unknown>) => page.evaluate(async ([p, b]) => { const r = await fetch(p as string, b ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) } : undefined); return { status: r.status, body: await r.json() }; }, [path, body ?? null] as const);
const ok = async (page: Page, path: string, body?: Record<string, unknown>) => { const r = await api(page, path, body); expect(r.status, `${path} ${JSON.stringify(r.body)}`).toBeLessThan(300); return r.body; };
const key = () => crypto.randomUUID();
async function tab(page: Page, key: string, name: string) {
  await page.waitForFunction(n => [...document.querySelectorAll('[role=tab]')].some(t => t.textContent === n && (t as HTMLElement).offsetParent) || (document.querySelector('#area-select') as HTMLElement | null)?.offsetParent, name);
  const t = page.getByRole('tab', { name });
  if (await t.isVisible()) await t.click(); else await page.locator('#area-select').selectOption(key);
}
/** A 1×1 PNG and a minimal Word document (ZIP with its main part), built here: no fixture files. */
const pngBytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
function docx() {
  const names = ['[Content_Types].xml', 'word/document.xml'], parts: Buffer[] = [], central: Buffer[] = []; let offset = 0;
  for (const name of names) { const n = Buffer.from(name), l = Buffer.alloc(30), c = Buffer.alloc(46); l.writeUInt32LE(0x04034b50, 0); l.writeUInt16LE(20, 4); l.writeUInt16LE(n.length, 26); c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(n.length, 28); c.writeUInt32LE(offset, 42); parts.push(l, n); central.push(c, n); offset += 30 + n.length; }
  const cd = Buffer.concat(central), end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(2, 8); end.writeUInt16LE(2, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, cd, end]);
}

test('owner review 2026-10-12: preselected origin decisions, comments, final art, references, templates, periods, notifications and approval circuit', async ({ page }, info) => {
  test.slow();
  const team = JSON.parse(readFileSync(process.env.BRANDOPOLIS_SESSION_FILE ?? '.local/demo-session.json', 'utf8'));
  await page.goto('/'); await signIn(page, team.token);
  await page.locator('#new-brand').click();
  await page.getByLabel('Nueva marca', { exact: true }).fill(`Revisión ${info.project.name} ${Date.now()}`); await page.locator('#brand-ficha summary').click();
  await page.getByRole('button', { name: 'Crear marca', exact: true }).click();
  await expect(page.locator('#decision')).toContainText('Por decidir');
  const brandId = await page.locator('#brands').inputValue(), view = page.locator('#decision');
  const me = await ok(page, '/api/me');
  // Two approved decisions: the origin group starts with both checked.
  for (const [module, option] of [['Primary Customer', 'Cafeterías de especialidad'], ['Positioning', 'El café más constante de la ciudad']]) {
    const ctx = await ok(page, `/api/context?brandId=${brandId}`), q = ctx.questions.find((x: { module: string }) => x.module === module);
    await ok(page, '/api/questions/prepare', { brandId, questionId: q.id, expectedActiveVersion: null });
    await ok(page, '/api/decisions/commit', { command: { brandId, questionId: q.id, selectedOption: option, rationale: 'Criterio de la agencia', expectedActiveVersion: null, sourceRecommendationId: null, idempotencyKey: key(), actorUserId: me.userId } });
  }

  // R12-05 · Materiales de venta → a new presentation: approved decisions preselected; what is unchecked stays unchecked.
  await openNav(page); await page.locator('#offers').click();
  await tab(page, 'materials', 'Materiales de venta');
  await view.getByRole('button', { name: 'Nuevo: Presentación comercial' }).click();
  const form = view.locator('#deliverable-form');
  await form.getByRole('button', { name: 'Completar manualmente' }).click();
  const group = form.locator('[data-source-group="dl-source"]');
  await expect(group.locator('[data-source-count]')).toHaveText('2 de 2');
  await expect(group.locator('[data-source-all]')).toBeChecked();
  await reviewShot(page, info, 'r12-origen-preseleccionado');
  await group.getByRole('checkbox', { name: /Posicionamiento/ }).uncheck();
  await expect(group.locator('[data-source-count]')).toHaveText('1 de 2');
  expect(await group.locator('[data-source-all]').evaluate(el => (el as HTMLInputElement).indeterminate)).toBe(true);
  await group.getByRole('button', { name: 'Quitar selección' }).click();
  await expect(group.locator('[data-source-count]')).toHaveText('0 de 2');
  await group.getByRole('button', { name: 'Seleccionar todas' }).click();
  await expect(group.locator('[data-source-count]')).toHaveText('2 de 2');
  await group.getByRole('checkbox', { name: /Posicionamiento/ }).uncheck();
  await form.getByLabel('Nombre').fill('Presentación para cafeterías');
  await form.getByLabel(/^Diapositivas/).fill('Quiénes somos\nCafé de origen\n\nQué ofrecemos\nEntrega semanal\n\nCómo empezar\nPrueba sin costo');
  await form.getByRole('button', { name: 'Crear borrador' }).click();
  let card = view.locator('.deliverable-card').first();
  await expect(card).toContainText('Borrador · v1');
  await card.getByRole('button', { name: 'Editar borrador' }).click();
  await expect(view.locator('#deliverable-form [data-source-count]')).toHaveText('1 de 2'); // the person's choice was kept
  await view.locator('#deliverable-form').getByRole('button', { name: 'Cancelar' }).click();

  // R12-22 · comments next to the version: internal by default; the comment says who sees it.
  card = view.locator('.deliverable-card').first();
  await card.locator('.version-comments summary').first().click();
  await card.getByLabel('Nuevo comentario').first().fill('Revisar la diapositiva de precios con ventas');
  await card.getByRole('button', { name: 'Comentar' }).first().click();
  await expect(view.locator('.deliverable-card').first().locator('.comment').first()).toContainText('Interno');

  // Approve alone (recorded), then attach final art: a new version that needs review; the approved one stays.
  card = view.locator('.deliverable-card').first();
  await card.getByRole('button', { name: 'Enviar a revisión' }).click();
  await card.locator('.review-submit').getByLabel('Yo: aprobación individual').check();
  await reviewShot(page, info, 'r12-enviar-a-revision');
  await card.locator('.review-submit').getByRole('button', { name: 'Enviar a revisión' }).click();
  card = view.locator('.deliverable-card').first();
  await reviewShot(page, info, 'r12-pendiente-de-revision');
  await card.getByLabel('Tu comentario: por qué apruebas o qué hay que cambiar').fill('Lista para usarla con clientes');
  await card.getByRole('button', { name: 'Aprobar (aprobación individual)' }).click();
  await expect(view.locator('.deliverable-card').first()).toContainText('Aprobada · v1');
  await view.locator('.deliverable-card').first().locator('[data-final-art]').setInputFiles({ name: 'arte-final.png', mimeType: 'image/png', buffer: pngBytes });
  await expect(page.locator('#notice')).toContainText('Arte final adjunto en una versión nueva que necesita revisión');
  card = view.locator('.deliverable-card').first();
  await expect(card).toContainText('Aprobada · v1');
  await expect(card).toContainText('Borrador · v2');
  await expect(card.locator('.final-art')).toContainText('arte-final.png');
  await expect(card.locator('.final-art')).toContainText('Imagen PNG');
  await reviewShot(page, info, 'r12-arte-final-version-nueva');

  // R12-11 · a brief's references: internal, never to the guest nor to Canva by themselves.
  await view.getByRole('button', { name: 'Nuevo: Brief para diseñador o Canva' }).click();
  await view.locator('#deliverable-form').getByRole('button', { name: 'Completar manualmente' }).click();
  await view.locator('#deliverable-form').getByLabel('Nombre').fill('Brief de portada');
  await view.locator('#deliverable-form').getByLabel('¿Qué pieza necesitas?').fill('Portada para Instagram');
  await view.locator('#deliverable-form').getByRole('button', { name: 'Crear borrador' }).click();
  const brief = view.locator('.deliverable-card', { hasText: 'Brief de portada' });
  await brief.locator('[data-reference]').setInputFiles({ name: 'referencia.png', mimeType: 'image/png', buffer: pngBytes });
  await expect(page.locator('#notice')).toContainText('Es interna: no se comparte con tu cliente ni se envía a Canva');
  await expect(view.locator('.deliverable-card', { hasText: 'Brief de portada' }).locator('.brief-references')).toContainText('referencia.png');

  // R12-12 · Plantillas in Marca y recursos: upload, classify, new version, download name by format, retire.
  await openNav(page); await page.locator('#brand-resources').click();
  await tab(page, 'templates', 'Plantillas');
  await expect(view.locator('h2').first()).toHaveText('Plantillas');
  await view.getByLabel('Categoría', { exact: true }).selectOption('DOCUMENT');
  await view.locator('#template-file').setInputFiles({ name: 'propuesta.docx', mimeType: 'application/octet-stream', buffer: docx() });
  await view.getByRole('button', { name: 'Subir plantilla' }).click();
  await expect(view.locator('.template-card')).toContainText('propuesta.docx');
  await expect(view.locator('.template-card')).toContainText('Word · ');
  await view.locator('[data-template-version]').setInputFiles({ name: 'propuesta-v2.docx', mimeType: 'application/octet-stream', buffer: docx() });
  await expect(view.locator('.template-card')).toContainText('versión 2');
  await reviewShot(page, info, 'r12-plantillas');
  const download = page.waitForEvent('download');
  await view.locator('.template-card').getByRole('link', { name: 'Descargar' }).first().click();
  expect((await download).suggestedFilename()).toBe('propuesta-v2.docx');
  await view.locator('#template-file').setInputFiles({ name: 'falsa.docx', mimeType: 'application/octet-stream', buffer: Buffer.from('no soy un documento') });
  await view.getByRole('button', { name: 'Subir plantilla' }).click();
  await expect(page.locator('#notice')).toContainText('Ese tipo de archivo no se acepta');
  await view.locator('.template-card').getByRole('button', { name: 'Retirar' }).click();
  await expect(view).toContainText('Aún no hay plantillas');

  // R12-17 · Resultados: period, comparison, both ranges and the time zone written out.
  await openNav(page); await page.locator('#results').click();
  await view.locator('#rp-preset').selectOption('LAST_7');
  await view.getByLabel('Periodo anterior de igual duración').check();
  await view.locator('#results-period').getByRole('button', { name: 'Aplicar' }).click();
  await expect(view.locator('.results-range')).toContainText('(7 días) · comparado con:');
  await expect(view.locator('.results-range')).toContainText('Zona horaria: America/Mexico_City');
  await expect(view.locator('[data-metric="unassigned"]')).toContainText('Estado actual');
  await reviewShot(page, info, 'r12-resultados-periodo');
  await view.locator('#rp-preset').selectOption('CUSTOM');
  await view.locator('#rp-from').fill('2026-10-10'); await view.locator('#rp-to').fill('2026-10-01');
  await view.locator('#results-period').getByRole('button', { name: 'Aplicar' }).click();
  await expect(view.locator('#rp-status')).toHaveText('La fecha inicial es posterior a la final.');

  // R12-21 · the notification centre in the right panel. Notifications are per person across their brands (earlier
  // runs may have left client comments): opening one goes to its brand and view after checking access; reading all
  // empties the counter and resolves nothing.
  const notifications = page.locator('[data-rail-tool="notifications"]').locator('visible=true').first();
  await notifications.click();
  const panel = page.locator('#rail-notifications');
  await expect(panel).toContainText(/No tienes notificaciones|sin leer|Todo leído/);
  await reviewShot(page, info, 'r12-notificaciones');
  if (await panel.locator('[data-notification]').count()) {
    await expect(panel).toContainText('Marcar como leída no aprueba ni resuelve nada');
    await panel.locator('[data-notification]').first().click();
    await expect(view.locator('h2').first()).toHaveText('Trabaja con tu cliente'); // client comments live in Colaboración
    if (!(await panel.isVisible())) await notifications.click(); // the rail button toggles: open it only when closed
    if (await panel.getByRole('button', { name: 'Marcar todo como leído' }).count()) await panel.getByRole('button', { name: 'Marcar todo como leído' }).click();
    await expect(panel).toContainText('Todo leído');
    await expect(page.locator('.notification-count').first()).toBeHidden();
    if (await page.locator('#close-rail-panel').isVisible()) await page.locator('#close-rail-panel').click();
    await page.locator('#brands').selectOption(brandId);
    await expect(page.locator('#notice')).toContainText('Marca activa actualizada');
  }
  if (await page.locator('#close-rail-panel').isVisible()) await page.locator('#close-rail-panel').click();

  // R12-08 · the approval circuit in Configuración de marca (an administrator edits it).
  await openNav(page); await page.locator('#brand-settings').click();
  await expect(view.locator('#policies-title')).toHaveText('Circuito de aprobación');
  await reviewShot(page, info, 'r12-circuito-aprobacion');
  const policy = view.locator('.policy-form[data-subject="AD"]');
  await policy.getByLabel('Después, aprobación del cliente desde Colaboración').check();
  await policy.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.locator('#notice')).toContainText('Circuito de aprobación guardado');
  await expect(view.locator('.policy-form[data-subject="OFFER"]')).toContainText('El cliente no aprueba ofertas.');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test('ADR-0036 · Performance Max and Meta messaging editors in the simulator: own fields, no web destination for messages', async ({ page }, info) => {
  test.slow();
  const team = JSON.parse(readFileSync(process.env.BRANDOPOLIS_SESSION_FILE ?? '.local/demo-session.json', 'utf8'));
  await page.goto('/'); await signIn(page, team.token);
  await page.locator('#new-brand').click();
  await page.getByLabel('Nueva marca', { exact: true }).fill(`Tipos ${info.project.name} ${Date.now()}`); await page.locator('#brand-ficha summary').click();
  await page.getByRole('button', { name: 'Crear marca', exact: true }).click();
  await expect(page.locator('#decision')).toContainText('Por decidir');
  const view = page.locator('#decision');
  await openNav(page); await page.locator('#marketing').click();
  await tab(page, 'ads', 'Campañas digitales');
  const area = view.locator('.campaigns-area');
  await expect(area).toContainText('Performance Max y Mensajes son ampliaciones de esta fase (ADR-0036)');
  await area.getByRole('radio', { name: /^Google Ads · Performance Max/ }).check();
  await area.getByLabel('Nombre de la campaña').fill('Performance Max café');
  await area.getByRole('button', { name: 'Crear campaña' }).click();
  let card = area.locator('.campaign-card').first();
  await expect(card.locator('header')).toContainText('Google Ads · Performance Max');
  await expect(card.getByLabel(/^Títulos largos/)).toBeVisible();
  await expect(card.getByLabel(/^Nombre de la empresa/)).toBeVisible();
  await expect(card.getByLabel(/^Imagen horizontal/)).toBeVisible();
  await expect(card.getByLabel(/^Palabras clave/)).toHaveCount(0);
  await expect(card).toContainText('Performance Max pide entre 3 y 15 títulos.');
  await reviewShot(page, info, 'r12-performance-max');
  await area.getByRole('radio', { name: /^Meta Ads · Mensajes/ }).check();
  await area.getByLabel('Nombre de la campaña').fill('Mensajes café');
  await area.getByRole('button', { name: 'Crear campaña' }).click();
  card = area.locator('.campaign-card', { hasText: 'Mensajes café' });
  await expect(card.locator('header')).toContainText('Meta Ads · Mensajes');
  await expect(card.getByRole('radio', { name: 'WhatsApp con el número vinculado a la página (simulado en la DEMO)' })).toBeChecked();
  await expect(card.getByLabel('¿A dónde llega quien hace clic?')).toHaveCount(0);
  await expect(card).toContainText('Brandopolis no las recibe ni las responde');
  await card.getByRole('radio', { name: 'Messenger' }).check();
  await card.getByLabel(/^Mensaje de bienvenida/).fill('Hola, ¿qué café buscas?');
  await card.getByLabel(/^Preguntas de inicio/).fill('¿Hacen envíos?');
  await card.getByRole('button', { name: 'Guardar borrador' }).click();
  await expect(page.locator('#notice')).toContainText('Borrador guardado');
  card = area.locator('.campaign-card', { hasText: 'Mensajes café' });
  await expect(card.getByRole('radio', { name: 'Messenger' })).toBeChecked();
  await reviewShot(page, info, 'r12-mensajes-meta');
  await expect(card).not.toContainText('Escribe el mensaje de bienvenida');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});
