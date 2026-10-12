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
  // PHASE4_SPEC §13 R12-12: Plantillas is a real tab now; only the resource library is announced as later.
  await expect(view).toContainText('La biblioteca de recursos llegará más adelante.');
  await expect(view).not.toContainText('Biblioteca y Plantillas');
  await expect(view.getByRole('heading', { name: 'Ya tengo identidad' })).toBeVisible();
  await expect(view.locator('.kit-entry').nth(1).getByRole('button', { name: 'Empezar con lo que tengo' })).toBeVisible(); // partial identity (ONB-007)

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
  // ADR-0033 · living guide: built from the published version only (tabs on wide screens, a selector on narrow ones).
  const guideTab = view.getByRole('tab', { name: 'Guía de marca' });
  if (await guideTab.isVisible()) await guideTab.click(); else await view.locator('#area-select').selectOption('guide');
  await expect(view.locator('h2').first()).toHaveText('Guía de marca');
  await expect(view).toContainText('Versión 1 del kit, publicada.');
  await expect(view.locator('.guide-color').filter({ hasText: 'Tinta' })).toContainText('Texto · #111111');
  await expect(view).toContainText('Cercano y claro');
  await expect(view).toContainText('normal cumple AA');
  // ADR-0030 · the guide as a PDF of the published version; the font notices travel with the download.
  const guidePdf = page.waitForEvent('download');
  await view.getByRole('button', { name: 'Descargar guía en PDF' }).click();
  const gotGuide = await guidePdf;
  expect(gotGuide.suggestedFilename()).toMatch(/^Guia-de-marca-.+-kit-v1.pdf$/);
  expect(readFileSync((await gotGuide.path())!).subarray(0, 5).toString('latin1')).toBe('%PDF-');
  await expect(page.locator('#notice')).toContainText('Documento descargado');
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

/** A one-page PDF with real text, so the existing extractor reads it (no fixture file in the repository). */
function textPdf(lines: string[]) {
  const content = `BT /F1 12 Tf 72 720 Td ${lines.map((l, i) => `${i ? '0 -18 Td ' : ''}(${l}) Tj`).join(' ')} ET`;
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', `<< /Length ${content.length} >>\nstream\n${content}\nendstream`];
  let out = '%PDF-1.4\n'; const offsets: number[] = [];
  objects.forEach((o, i) => { offsets.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map(o => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(out, 'latin1');
}

test('ONB-006/007: the manual uploaded while preparing the brand is reused, a partial identity is completed and corrections stay unconfirmed', async ({ page }, info) => {
  test.slow();
  const session = JSON.parse(readFileSync(process.env.BRANDOPOLIS_SESSION_FILE ?? '.local/demo-session.json', 'utf8'));
  await page.goto('/'); await page.getByLabel('Token de sesión local').fill(session.token);
  await page.getByRole('button', { name: 'Entrar al espacio estratégico' }).click(); await page.locator('#workspace').waitFor();
  await page.locator('#new-brand').click();
  await page.getByLabel('Nueva marca', { exact: true }).fill(`Parcial ${info.project.name} ${Date.now()}`);
  await page.locator('#brand-dialog').getByLabel('Mi identidad visual').check();
  await page.locator('#brand-dialog').getByRole('button', { name: 'Tengo materiales' }).click();
  const view = page.locator('#decision');
  // Guided start: the manual is uploaded once, here (plain ASCII text keeps the hand-made PDF simple).
  await view.locator('#setup-files').setInputFiles({ name: 'manual-de-marca.pdf', mimeType: 'application/pdf', buffer: textPdf(['Manual de marca', 'Color principal #C8102F Pantone 186 C', 'Tipografia principal Montserrat']) });
  await view.getByRole('button', { name: 'Subir documentos' }).click();
  await expect(view.locator('#setup-status')).toHaveText('1 documento guardado.');
  for (let i = 0; i < 6 && await view.locator('#setup-unknown').count(); i++) { await view.locator('#setup-unknown').click(); await page.waitForTimeout(300); }
  await view.getByRole('button', { name: 'Continuar a Tu identidad' }).click();
  await expect(view.locator('.setup-identity')).toContainText('Allí podrás usar como manual, sin volver a subirlo: manual-de-marca.pdf.');
  await expect(view.getByRole('button', { name: /Más adelante/ })).toHaveCount(0); // the priority is the identity itself
  await view.getByRole('button', { name: /Quiero completarla/ }).click();
  await view.getByRole('button', { name: 'Guardar y salir' }).click();
  await expect(page.locator('#notice')).toContainText('Tu borrador quedó guardado');

  // Identidad visual: the same file is offered without a new upload.
  if (await page.locator('#menu').isVisible()) await page.locator('#menu').click();
  await page.locator('#brand-resources').click();
  await expect(view.locator('h2').first()).toHaveText('Identidad visual');
  const reusable = view.locator('.kit-reusable');
  await expect(reusable).toContainText('manual-de-marca.pdf · PDF');
  await reusable.getByRole('button', { name: 'Usar como manual de marca' }).click();
  await expect(page.locator('#notice')).toContainText('Manual incorporado sin volver a subirlo');
  await expect(view.locator('.kit-reusable')).toHaveCount(0);
  await expect(view.locator('.kit-asset').filter({ hasText: 'manual-de-marca.pdf' })).toContainText('Manual de marca (PDF)');

  // Partial identity: start with what exists and see what is missing.
  await view.getByRole('button', { name: 'Empezar con lo que tengo' }).click();
  await expect(page.locator('#notice')).toContainText('Borrador listo con lo que ya tienes');
  await expect(view.locator('.plan-gaps')).toContainText('una paleta de colores');
  await view.getByRole('button', { name: 'Buscar colores y tipografías en el manual' }).click();
  await expect(page.locator('#notice')).toContainText('Encontramos 1 color(es) y 1 tipografía(s) en el manual');
  const inferred = view.locator('.kit-value').filter({ hasText: '#C8102F' });
  await expect(inferred).toContainText('Declarado, sin adoptar');
  await expect(inferred).toContainText('Documento, página 1');

  // The inference is wrong: the person corrects it. It is attributed to the person and is still not confirmed.
  await view.getByRole('button', { name: 'Editar valores' }).click();
  await view.locator('#kit-form .kit-row[data-kind="color"]').first().getByLabel('Hex').fill('#C8102E');
  await view.locator('#kit-form').getByRole('button', { name: 'Guardar borrador' }).click();
  const corrected = view.locator('.kit-value').filter({ hasText: '#C8102E' });
  await expect(corrected).toContainText('Corregido por una persona (antes: documento, página 1)');
  await expect(corrected).toContainText('Declarado, sin adoptar');
  await expect(view.locator('.kit-value').filter({ hasText: 'Montserrat' })).toContainText('Documento, página 1');
  await corrected.getByLabel('Adoptar').check();
  await view.getByRole('button', { name: 'Adoptar los seleccionados' }).click();
  await expect(view.locator('.kit-value').filter({ hasText: '#C8102E' })).toContainText('Confirmado por una persona');
  await expect(view.locator('.kit-value').filter({ hasText: 'Montserrat' })).toContainText('Declarado, sin adoptar');
  // Saving the draft again after adopting keeps the adopted value (regression: key order of stored values).
  await view.getByRole('button', { name: 'Editar valores' }).click();
  await view.locator('#kit-form').getByLabel('Tono de la marca').fill('Cercano y claro');
  await view.locator('#kit-form').getByRole('button', { name: 'Guardar borrador' }).click();
  await expect(page.locator('#notice')).toContainText('Borrador del kit guardado');
  await expect(view.locator('.kit-value').filter({ hasText: '#C8102E' })).toContainText('Confirmado por una persona');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});
