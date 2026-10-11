import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { navigate } from '../workspace-nav.js';

// PHASE4_SPEC §4.10 · guided start (ONB-005, 008, 009, 010, 012): new brand through the guide, save and resume, guide ↔
// ficha without loss, documents stored once, existing brand ficha. Deterministic DEMO; strategy AI calls must stay zero.
async function openSession(page: Page) {
  const session = JSON.parse(readFileSync(process.env.BRANDOPOLIS_SESSION_FILE ?? '.local/demo-session.json', 'utf8'));
  await page.goto('/'); await page.getByLabel('Token de sesión local').fill(session.token);
  await page.getByRole('button', { name: 'Entrar al espacio estratégico' }).click();
  await page.locator('#workspace').waitFor();
}
const strategyAi = (page: Page) => { const calls: string[] = []; page.on('request', r => { const p = new URL(r.url()).pathname; if (p === '/api/brando/ask' || p === '/api/recommendations/generate') calls.push(p); }); return calls; };
const TXT = (text: string) => ({ name: 'catalogo.txt', mimeType: 'text/plain', buffer: Buffer.from(text) });

test('ONB-005/010/012: a new brand through the guide asks only what its priority needs and confirms nothing beyond context', async ({ page }, info) => {
  test.slow();
  const calls = strategyAi(page);
  await openSession(page);
  await page.locator('#new-brand').click();
  const dialog = page.locator('#brand-dialog');
  await expect(dialog.locator('.eyebrow').first()).toHaveText('Paso 1 de 4 · Tu marca');
  await expect(dialog).toContainText('Trae los materiales que ya tienes o responde algunas preguntas. Brando te ayudará a completar lo que falte.');
  await expect(page.locator('#brand-ficha')).not.toHaveAttribute('open', '');
  await page.getByLabel('Nueva marca', { exact: true }).fill(`Guía ${info.project.name} ${Date.now()}`);
  await dialog.getByLabel('Es la marca de un cliente').check();
  await dialog.getByLabel('Mis productos y servicios').check();
  await dialog.getByRole('button', { name: 'Empezar con preguntas' }).click();

  const view = page.locator('#decision');
  await expect(view.locator('.eyebrow').first()).toHaveText('Preparar tu marca');
  const stages = view.locator('.setup-stage');
  await expect(stages).toHaveText([/Tu marca\s*Hecho/, /Lo que ya sabemos\s*Ahora/, /Tu identidad\s*Pendiente/, /Revisa y comienza\s*Pendiente/]);
  await expect(view).not.toContainText('%'); // real stages, never a percentage
  // «Mis productos y servicios» asks what, to whom and where — one question at a time.
  await expect(view.locator('#setup-question-title')).toHaveText('¿Qué ofreces?');
  await view.locator('#setup-answer').fill('Café de especialidad por suscripción');
  await view.getByRole('button', { name: 'Guardar y seguir' }).click();
  await expect(view.locator('#setup-question-title')).toHaveText('¿A quién atiendes?');
  await view.getByRole('button', { name: 'No lo sé todavía' }).click();
  await expect(view.locator('#setup-question-title')).toHaveText('¿Dónde compite tu marca?');
  await view.locator('#setup-answer').selectOption('NATIONAL');
  await view.locator('#setup-answer-market').fill('México');
  await view.getByRole('button', { name: 'Guardar y seguir' }).click();
  await expect(view.locator('#setup-question-title')).toHaveText('Ya tenemos lo que tu prioridad necesita.');
  await view.getByRole('button', { name: 'Continuar a Tu identidad' }).click();

  await expect(view.locator('.setup-stage[aria-current="step"]')).toContainText('Tu identidad');
  await expect(view.getByRole('button', { name: /Más adelante/ })).toBeVisible(); // postponable: priority does not need it
  await view.getByRole('button', { name: /Quiero crearla/ }).click();
  await expect(view.getByRole('button', { name: /Quiero crearla/ })).toHaveAttribute('aria-pressed', 'true');
  await view.getByRole('button', { name: 'Continuar', exact: true }).click();

  const summary = view.locator('.setup-summary');
  await expect(summary.locator('.is-confirmed')).toContainText('Qué ofreces: Café de especialidad por suscripción');
  await expect(summary.locator('.is-confirmed')).toContainText('De quién es la marca: Es la marca de un cliente');
  await expect(summary.locator('.is-pending')).toContainText('A quién atiendes');
  await expect(summary).toContainText('No aprueba estrategia, kit ni plan');
  // Guide ↔ ficha without loss: a value typed in the ficha survives the switch back.
  await view.getByRole('button', { name: 'Ficha completa' }).click();
  await view.locator('#ficha-goal').fill('Conseguir los primeros 100 suscriptores');
  await view.getByRole('button', { name: 'Guía' }).click();
  await expect(view.locator('.setup-summary .is-confirmed')).toContainText('Qué buscas primero: Conseguir los primeros 100 suscriptores');
  await view.getByRole('button', { name: 'Confirmar ficha y comenzar' }).click();
  await expect(page.locator('#notice')).toContainText('Ficha confirmada. Tu prioridad empieza en Productos y servicios');
  await expect(page.locator('#notice')).toContainText('Confirmarla no aprobó estrategia, kit ni plan.');
  await expect(page.locator('.setup-resume')).toHaveCount(0);
  await navigate(page, '01 Objetivo estratégico');
  await expect(page.locator('#decision')).toContainText('Por decidir'); // no decision was approved by confirming
  expect(calls, 'the guided start never asks the strategy AI').toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test('ONB-008/009: materials are stored once, the draft is saved and resumed, and extraction failures keep the manual path', async ({ page }, info) => {
  test.slow();
  await openSession(page);
  await page.locator('#new-brand').click();
  const name = `Materiales ${info.project.name} ${Date.now()}`;
  await page.getByLabel('Nueva marca', { exact: true }).fill(name);
  await page.locator('#brand-dialog').getByRole('button', { name: 'Tengo materiales' }).click();
  const view = page.locator('#decision');
  await expect(view.locator('#setup-documents-title')).toHaveText('Tus materiales');
  await view.locator('#setup-files').setInputFiles(TXT('Ofrecemos talleres de cerámica para adultos.'));
  await view.getByRole('button', { name: 'Subir documentos' }).click();
  await expect(view.locator('#setup-status')).toHaveText('1 documento guardado.');
  await view.locator('#setup-files').setInputFiles(TXT('Ofrecemos talleres de cerámica para adultos.'));
  await view.getByRole('button', { name: 'Subir documentos' }).click();
  await expect(view.locator('#setup-status')).toContainText('ya estaba guardado y se reutilizó');
  await expect(view.locator('.setup-document-list li')).toHaveCount(1);
  // Without a configured extractor or AI, the files stay and the questions keep working (never a dead end).
  await view.getByRole('button', { name: 'Buscar propuestas en mis documentos' }).click();
  await expect(view.locator('#setup-status')).toHaveText(/No pudimos buscar propuestas en tus documentos ahora|No encontramos propuestas|Revisa las propuestas/);
  await expect(view.locator('#setup-question')).toBeVisible();
  await view.locator('#setup-answer').fill('Talleres de cerámica');
  // «Guardar y salir» keeps the typed answer; Inicio offers to resume.
  await view.getByRole('button', { name: 'Guardar y salir' }).click();
  await expect(page.locator('#notice')).toContainText('Tu borrador quedó guardado');
  const resume = page.locator('.setup-resume');
  await expect(resume).toContainText('Vas en la etapa 2 de 4: Lo que ya sabemos');
  await resume.getByRole('button', { name: 'Continuar' }).click();
  await view.getByRole('button', { name: 'Ficha completa' }).click();
  await expect(view.locator('#ficha-offer')).toHaveValue('Talleres de cerámica');
  await expect(view.locator('#ficha-name')).toHaveText(name); // the name belongs to the brand once created
  // Discarding needs a second, explicit click; the brand and what was confirmed stay.
  await view.getByRole('button', { name: 'Descartar borrador' }).click();
  await expect(view.locator('#setup-status')).toContainText('Se perderán las respuestas sin confirmar');
  await view.getByRole('button', { name: 'Sí, descartar el borrador' }).click();
  await expect(page.locator('#notice')).toContainText('Borrador descartado');
  await expect(page.locator('.setup-resume')).toHaveCount(0);
  await expect(page.locator('#brands option:checked')).toHaveText(name);
});

test('existing brand: the ficha opens from Configuración de marca with what was declared, and a correction is confirmed', async ({ page }, info) => {
  test.slow();
  await openSession(page);
  await page.locator('#new-brand').click();
  await page.getByLabel('Nueva marca', { exact: true }).fill(`Existente ${info.project.name} ${Date.now()}`);
  await page.locator('#brand-ficha summary').click();
  await page.locator('#initial-context').fill('Panadería de barrio');
  await page.locator('#brand-geography').selectOption('LOCAL');
  await page.getByRole('button', { name: 'Crear marca', exact: true }).click();
  await expect(page.locator('#decision')).toContainText('Por decidir');
  await navigate(page, 'Configuración de marca');
  await page.getByRole('button', { name: 'Editar ficha de marca' }).click();
  const view = page.locator('#decision');
  await expect(view.locator('#ficha-offer')).toHaveValue('Panadería de barrio');
  await expect(view.locator('#ficha-geography')).toHaveValue('LOCAL');
  await expect(view.locator('#ficha-stage')).toHaveValue('IDEA');
  await view.locator('#ficha-offer').fill('Panadería y cafetería de barrio');
  await view.getByRole('button', { name: 'Confirmar ficha y comenzar' }).click(); // unsaved ficha edits are kept
  await expect(page.locator('#notice')).toContainText('Ficha confirmada');
  await navigate(page, 'Configuración de marca');
  await page.getByRole('button', { name: 'Editar ficha de marca' }).click();
  await expect(view.locator('#ficha-offer')).toHaveValue('Panadería y cafetería de barrio');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});
