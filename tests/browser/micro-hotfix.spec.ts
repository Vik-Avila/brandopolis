import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

// Production findings behind this file:
//
// 1. Asking for possibilities worked, but the only feedback was the global panel at the top of the
//    workspace. From a decision further down the page the click looked like a freeze.
// 2. Entorno competitivo sat under «Contexto y aprendizaje», reading as post-decision work even
//    though it informs the four decisions.
// 3. A fourth navigation group pushed «Mi aprendizaje» and «Blueprint estratégico» below the fold.
// 4. The Blueprint could be read but not taken away.

async function navigate(page: Page, name: string) {
  await page.locator('#workspace').waitFor();
  const menu = page.getByRole('button', { name: 'Abrir navegación', exact: true });
  if (await menu.isVisible()) await menu.click();
  // The context rail links to Entorno competitivo too, so the drawer is addressed explicitly.
  await page.locator('#journey').getByRole('button', { name, exact: true }).click();
}

async function signIn(page: Page, brand: string) {
  const session = JSON.parse(readFileSync(process.env.BRANDOPOLIS_SESSION_FILE ?? '.local/demo-session.json', 'utf8'));
  await page.goto('/');
  await page.getByLabel('Token de sesión local').fill(session.token);
  await page.getByRole('button', { name: 'Entrar al espacio estratégico' }).click();
  await page.locator('#workspace').waitFor();
  await page.locator('#new-brand').click();
  await page.getByLabel('Nueva marca', { exact: true }).fill(brand);
  await page.getByRole('button', { name: 'Crear marca', exact: true }).click();
  await expect(page.locator('#decision')).toContainText('Por decidir');
}

test('possibilities report progress beside the control that started them', async ({ page }, testInfo) => {
  await signIn(page, `Local activity ${testInfo.project.name} ${Date.now()}`);
  await navigate(page, '01 Cliente principal');
  await page.getByRole('button', { name: 'Preparar decisión', exact: true }).click();
  await page.getByLabel('Tu decisión', { exact: true }).fill('Mi propia respuesta');

  const local = page.locator('#possibilities-activity');
  await expect(local).toHaveCount(1);
  await expect(local).toBeHidden();
  // Status is announced, not communicated by a spinner alone.
  await expect(local).toHaveAttribute('aria-live', 'polite');
  await expect(local).toHaveAttribute('role', 'status');

  // DEMO answers almost instantly, so the running state would be a race to observe. Delay the real
  // response — the request still goes through — to make the loading state deterministically visible.
  await page.route('**/api/recommendations/generate', async route => {
    await new Promise(resolve => setTimeout(resolve, 2000));
    await route.continue();
  });
  await page.locator('#possibilities').click();

  // The running state is visible immediately, next to the button, and the button says what it is doing.
  await expect(local).toBeVisible();
  await expect(page.locator('#possibilities')).toHaveText('Generando posibilidades…');
  await expect(page.locator('#possibilities')).toBeDisabled();
  const placement = await page.evaluate(() => {
    const cta = document.querySelector('#possibilities'), block = document.querySelector('#possibilities-activity');
    if (!cta || !block) return null;
    const c = cta.getBoundingClientRect(), b = block.getBoundingClientRect();
    return { gap: b.top - c.bottom, top: b.top, viewport: window.innerHeight, adjacent: block.previousElementSibling === cta.parentElement };
  });
  expect(placement, 'the running state must still be on screen while generation is in flight').not.toBeNull();
  expect(placement!.adjacent).toBe(true);
  expect(placement!.gap).toBeGreaterThanOrEqual(0);
  expect(placement!.top).toBeLessThan(placement!.viewport);

  // On completion the block resolves away and the options are the thing in view.
  await expect(page.locator('.recommendation .option').first()).toBeVisible({ timeout: 60000 });
  await expect(page.locator('#possibilities-activity')).toHaveCount(0);
  await expect(page.locator('[data-option-take]').first()).toBeVisible();
});

test('a failed generation clears the local state, keeps the draft and allows a retry', async ({ page }, testInfo) => {
  await signIn(page, `Local failure ${testInfo.project.name} ${Date.now()}`);
  await navigate(page, '01 Cliente principal');
  await page.getByRole('button', { name: 'Preparar decisión', exact: true }).click();
  const typed = 'Texto que debe sobrevivir';
  await page.getByLabel('Tu decisión', { exact: true }).fill(typed);

  await page.route('**/api/recommendations/generate', route => route.fulfill({
    status: 500, contentType: 'application/json',
    body: JSON.stringify({ code: 'AI_PROVIDER_ERROR', message: 'upstream 529 overloaded' })
  }));
  await page.locator('#possibilities').click();

  await expect(page.locator('#notice')).toHaveText('No pudimos generar posibilidades en este momento. Puedes continuar con tu propia respuesta o intentarlo nuevamente.');
  await expect(page.locator('#possibilities-activity')).toBeHidden();
  await expect(page.locator('#ai-activity')).toBeHidden();
  // The button returns to its own name so the retry is obvious, and the draft is untouched.
  await expect(page.locator('#possibilities')).toHaveText('Ayúdame a generar posibilidades');
  await expect(page.locator('#possibilities')).toBeEnabled();
  await expect(page.getByLabel('Tu decisión', { exact: true })).toHaveValue(typed);
  await expect(page.locator('#notice')).not.toContainText('529');
});

test('navigation presents competitive research as preparation and keeps every item reachable', async ({ page }, testInfo) => {
  // A laptop height is where the fourth group first pushed the lower items out of view.
  await page.setViewportSize({ width: 1366, height: 768 });
  await signIn(page, `Nav density ${testInfo.project.name} ${Date.now()}`);

  const groups = await page.locator('#journey .nav-group').allInnerTexts();
  expect(groups.map(g => g.toLowerCase())).toEqual(['preparación estratégica', 'estrategia', 'contexto y aprendizaje', 'práctica y visión']);

  // Preparation comes before the decisions, and is not one of them.
  const order = await page.locator('#journey .nav-group, #journey button').evaluateAll(nodes =>
    nodes.map(node => node.tagName === 'P' ? `[${node.textContent?.trim()}]` : node.textContent?.trim().replace(/\s+/g, ' ') ?? ''));
  expect(order.indexOf('[Preparación estratégica]')).toBeLessThan(order.indexOf('Entorno competitivo'));
  expect(order.indexOf('Entorno competitivo')).toBeLessThan(order.indexOf('[Estrategia]'));
  await expect(page.locator('#journey [data-module]')).toHaveCount(4);
  for (const item of ['Qué necesita atención', 'Entorno competitivo', 'Contexto estratégico', 'Experimentos y aprendizajes', 'Mi aprendizaje', 'Blueprint estratégico'])
    expect(order, item).toContain(item);

  // Nothing critical hides at the bottom. On a precise pointer the whole column fits without
  // scrolling; on a touch device the 44px target is kept on purpose, so the drawer may scroll — there
  // the requirement is that Blueprint stays reachable and the target stays big enough to hit.
  const fits = await page.locator('#journey').evaluate(nav => {
    const blueprint = document.querySelector('#blueprint')!.getBoundingClientRect();
    const box = nav.getBoundingClientRect();
    return {
      withinPanel: blueprint.bottom <= box.bottom + 1,
      scrolls: nav.scrollHeight > nav.clientHeight + 1,
      height: blueprint.height,
      finePointer: matchMedia('(pointer: fine)').matches
    };
  });
  if (fits.finePointer) {
    expect(fits.withinPanel, 'Blueprint estratégico must be visible without scrolling the sidebar').toBe(true);
    expect(fits.scrolls, 'a laptop height must not need sidebar scrolling').toBe(false);
    expect(fits.height).toBeGreaterThanOrEqual(32);
  } else {
    // Touch keeps the full target, so the drawer scrolls; it must scroll, not trap.
    expect(fits.height, 'a coarse pointer keeps the 44px target').toBeGreaterThanOrEqual(40);
    await page.locator('#blueprint').scrollIntoViewIfNeeded();
  }
  await expect(page.locator('#blueprint')).toBeVisible();
  await expect(page.locator('#practice')).toBeVisible();
  // And the page itself gains no horizontal overflow from the denser column.
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});

test('market context carries its own status and never joins the decision count', async ({ page }, testInfo) => {
  await signIn(page, `Market status ${testInfo.project.name} ${Date.now()}`);

  const market = page.locator('.context-market');
  await expect(market).toHaveCount(1);
  await expect(market).toContainText('Contexto del mercado');
  await expect(market).toContainText('Sin investigar');
  await expect(market).toContainText('No cuenta como decisión');
  await expect(page.locator('.context-count')).toContainText('0 de 4');

  await navigate(page, 'Entorno competitivo');
  await page.locator('#run-competitive-research').click();
  await page.locator('#competitive-candidates').waitFor({ timeout: 120000 });
  // Research done, review outstanding.
  await expect(market).toContainText('Pendiente de revisión');
  await expect(page.locator('.phase-handoff')).toHaveCount(0);
  await expect(page.locator('.context-count')).toContainText('0 de 4');

  // Resolve every candidate the way a participant does.
  let pending = await page.locator('[data-competitive-accept]').count();
  while (pending > 1) {
    await page.locator('[data-competitive-accept]').first().click();
    await expect(page.locator('[data-competitive-accept]')).toHaveCount(--pending);
  }
  await expect(page.locator('[data-competitive-reject]').first()).toBeEnabled();
  await page.locator('[data-competitive-reject]').first().click();

  await expect(market).toContainText('Revisado');
  // Research is preparation: incorporating findings must not decide anything.
  await expect(page.locator('.context-count')).toContainText('0 de 4');

  // The hand-off speaks the language of the workflow and points at the canonical next decision.
  await expect(page.locator('.phase-handoff')).toContainText(/contexto competitivo revisado/i);
  await expect(page.locator('#phase-review')).toHaveText('Revisar contexto');
  const firstModule = await page.locator('#journey [data-module]').first().getAttribute('data-module');
  await expect(page.locator('#phase-next')).toHaveAttribute('data-next', firstModule!);
});

test('the Blueprint can be taken away as a PDF of the current strategy', async ({ page }, testInfo) => {
  await signIn(page, `Blueprint export ${testInfo.project.name} ${Date.now()}`);
  await navigate(page, 'Blueprint estratégico');

  const action = page.locator('#blueprint-pdf');
  await expect(action).toBeVisible();
  await expect(action).toHaveText('Descargar PDF');

  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 60000 }),
    action.click()
  ]);
  expect(download.suggestedFilename()).toMatch(/^Brandopolis-Blueprint-[a-z0-9-]+-\d{4}-\d{2}-\d{2}\.pdf$/);

  const path = await download.path();
  const bytes = readFileSync(path);
  expect(bytes.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  expect(bytes.byteLength).toBeGreaterThan(1000);

  // The participant is never navigated away, and the action returns to its own name.
  expect(page.url()).not.toContain('/api/blueprint');
  await expect(page.locator('#decision')).toContainText('Blueprint');
  await expect(action).toHaveText('Descargar PDF');
});
