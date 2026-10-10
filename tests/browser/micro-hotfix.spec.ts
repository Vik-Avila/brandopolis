import { test, expect, type Page } from '@playwright/test';
import { navigate, openTool } from '../workspace-nav.js';
import { readFileSync } from 'node:fs';

// Production findings behind this file:
//
// 1. Asking for possibilities worked, but the only feedback was the global panel at the top of the
//    workspace. From a decision further down the page the click looked like a freeze.
// 2. Entorno competitivo sat under «Contexto y aprendizaje», reading as post-decision work even
//    though it informs the four decisions.
// 3. A fourth navigation group pushed «Mi aprendizaje» and «Mapa estratégico» below the fold.
// 4. The Mapa estratégico could be read but not taken away.


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
  await navigate(page, '03 Cliente principal');
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
  await navigate(page, '03 Cliente principal');
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

test('navigation keeps every destination reachable at laptop height; preparation stays outside the decisions', async ({ page }, testInfo) => {
  // ADR-0027 (owner decision 2026-10-08): Inicio · Estrategia (nine decisions) · Validación · three «Próximamente» ·
  // Mi aprendizaje · Mapa estratégico · Configuración de marca (ADR-0029) · Ayuda. Entorno competitivo and Contexto estratégico live in the rail's
  // Contexto tool: preparation and context, never decisions.
  await page.setViewportSize({ width: 1366, height: 768 });
  await signIn(page, `Nav density ${testInfo.project.name} ${Date.now()}`);
  const menu = page.getByRole('button', { name: 'Abrir navegación', exact: true });
  if (await menu.isVisible()) await menu.click();
  const labels = await page.locator('#journey .nav-label').evaluateAll(nodes => nodes.map(n => (n.firstChild?.textContent ?? '').trim()));
  expect(labels).toEqual(['Inicio', 'Estrategia', 'Productos y servicios', 'Validación', 'Plan de marketing', 'Resultados', 'Mi aprendizaje', 'Mapa estratégico', 'Configuración de marca', 'Ayuda']);
  await expect(page.locator('#journey [data-module]')).toHaveCount(9);
  await expect(page.locator('#journey #competitive-context')).toHaveCount(0);
  await expect(page.locator('#rail-panel #competitive-context')).not.toHaveAttribute('data-module');
  // Every destination is reachable: when the nine decisions do not fit, the column scrolls instead of clipping.
  for (const id of ['#home', '#strategy-toggle', '#learning-loop', '#practice', '#blueprint', '#brand-settings', '#help']) {
    await page.locator(id).scrollIntoViewIfNeeded();
    await expect(page.locator(id)).toBeVisible();
    expect((await page.locator(id).boundingBox())!.height, `${id} target`).toBeGreaterThanOrEqual(36);
  }
  const column = await page.locator('#journey').evaluate(nav => ({ overflowY: getComputedStyle(nav).overflowY, clips: nav.scrollHeight > nav.clientHeight + 1 }));
  if (column.clips) expect(['auto', 'scroll']).toContain(column.overflowY);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});

test('market context carries its own status and never joins the decision count', async ({ page }, testInfo) => {
  await signIn(page, `Market status ${testInfo.project.name} ${Date.now()}`);

  const market = page.locator('.context-market');
  await expect(market).toHaveCount(1);
  await expect(market).toContainText('Contexto del mercado');
  await expect(market).toContainText('Sin investigar');
  await expect(market).toContainText('No cuenta como decisión');
  await expect(page.locator('.context-count')).toContainText('0 de 9');

  await navigate(page, 'Entorno competitivo');
  await page.locator('#run-competitive-research').click();
  await page.locator('#competitive-candidates').waitFor({ timeout: 120000 });
  // Research done, review outstanding.
  await expect(market).toContainText('Pendiente de revisión');
  await expect(page.locator('.phase-handoff')).toHaveCount(0);
  await expect(page.locator('.context-count')).toContainText('0 de 9');

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
  await expect(page.locator('.context-count')).toContainText('0 de 9');

  // The hand-off speaks the language of the workflow and points at the canonical next decision.
  await expect(page.locator('.phase-handoff')).toContainText(/contexto competitivo revisado/i);
  await expect(page.locator('#phase-review')).toHaveText('Revisar contexto');
  const firstModule = await page.locator('#journey [data-module]').first().getAttribute('data-module');
  await expect(page.locator('#phase-next')).toHaveAttribute('data-next', firstModule!);
});

test('the right panel ranks its sections and no static label reacts to hover', async ({ page }, testInfo) => {
  // Production defect: «Entorno competitivo» in the rail was a bare <button>, so base.css gave it
  // background:var(--action-primary) and, on hover, var(--action-primary-hover). The local rule reset
  // the resting state but not :hover, and the element was display:block;width:100%, so hovering
  // painted a dark band across the panel. A dark band is measured here, not inferred from a selector.
  const darkness = (colour: string) => {
    const m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/.exec(colour);
    if (!m) return { alpha: 0, luminance: 1 };
    const [r, g, b] = [m[1], m[2], m[3]].map(Number);
    return { alpha: m[4] === undefined ? 1 : Number(m[4]), luminance: (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 };
  };

  await signIn(page, `Panel hierarchy ${testInfo.project.name} ${Date.now()}`);
  await openTool(page, 'context');

  const rail = page.locator('#context');
  const railText = (await rail.innerText()).toLowerCase();
  for (const label of ['contexto del mercado', 'entorno competitivo', 'lo que ya decidiste'])
    expect(railText, label).toContain(label);
  await expect(page.locator('.context-count')).toContainText('0 de 9');

  // Hierarchy: panel heading > section item > section label, with the status badge secondary and both
  // section labels sharing one treatment so they read as siblings.
  const ranks = await page.evaluate(() => {
    const size = (s: string) => parseFloat(getComputedStyle(document.querySelector(s)!).fontSize);
    return {
      heading: size('.context-cover h3'),
      marketLabel: size('.context-market .context-section'),
      marketTitle: size('.context-market-title'),
      badge: size('.context-market-status .badge'),
      decisionsLabel: size('.context-details .context-section'),
      separator: parseFloat(getComputedStyle(document.querySelector('.context-details')!).borderTopWidth)
    };
  });
  expect(ranks.heading).toBeGreaterThan(ranks.marketTitle);
  expect(ranks.marketTitle).toBeGreaterThan(ranks.marketLabel);
  expect(ranks.badge).toBeLessThanOrEqual(ranks.marketTitle);
  expect(ranks.marketLabel).toBe(ranks.decisionsLabel);
  expect(ranks.separator).toBeGreaterThanOrEqual(1);

  // The market title is a static heading: no dark background, no shadow, no pointer, not focusable.
  const title = page.locator('.context-market-title');
  expect(await title.evaluate(el => el.tagName)).not.toBe('BUTTON');
  expect(await title.evaluate(el => el.matches('a,button,input,select,textarea,[tabindex]'))).toBe(false);
  await title.hover();
  const painted = await title.evaluate(el => [
    getComputedStyle(el).backgroundColor,
    getComputedStyle(el, ':before').backgroundColor,
    getComputedStyle(el, ':after').backgroundColor
  ]);
  for (const colour of painted) {
    const { alpha, luminance } = darkness(colour);
    expect(alpha > 0.05 && luminance < 0.5, `hover painted ${colour}`).toBe(false);
  }
  expect(await title.evaluate(el => getComputedStyle(el).boxShadow)).toBe('none');
  expect(['auto', 'default']).toContain(await title.evaluate(el => getComputedStyle(el).cursor));

  // The same holds for every other static label in the panel.
  const labels = await page.evaluate(() => [...document.querySelectorAll('#context .context-section, #context .context-market-title, #context .hint')]
    .map(el => ({
      focusable: el.matches('a,button,input,select,textarea,[tabindex]'),
      pointer: getComputedStyle(el).cursor === 'pointer' && !el.closest('a,button,summary,[tabindex]')
    })));
  expect(labels.some(l => l.focusable)).toBe(false);
  expect(labels.some(l => l.pointer)).toBe(false);

  // Interactive controls elsewhere keep their intended hover, and it is not a dark block either.
  const menu = page.getByRole('button', { name: 'Abrir navegación', exact: true });
  if (await menu.isVisible()) await menu.click();
  const navItem = page.locator('#blueprint');
  const resting = await navItem.evaluate(el => getComputedStyle(el).backgroundColor);
  await navItem.hover();
  // Hover starts a CSS colour transition; reading in the same frame can still see the resting
  // colour, especially in mobile emulation. Keep the assertion, wait for the observable change.
  await expect.poll(() => navItem.evaluate(el => getComputedStyle(el).backgroundColor),
    { message: 'navigation must still respond to hover' }).not.toBe(resting);
  const hovered = await navItem.evaluate(el => getComputedStyle(el).backgroundColor);
  expect(hovered, 'navigation must still respond to hover').not.toBe(resting);
  const navHover = darkness(hovered);
  expect(navHover.alpha > 0.05 && navHover.luminance < 0.5, `nav hover painted ${hovered}`).toBe(false);
});

test('the Mapa estratégico can be taken away as a PDF of the current strategy', async ({ page }, testInfo) => {
  await signIn(page, `Mapa export ${testInfo.project.name} ${Date.now()}`);
  await navigate(page, 'Mapa estratégico');

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

  // The participant is never navigated away, and the action returns to its own name. The view speaks
  // the participant-facing vocabulary; only the endpoint keeps the technical name.
  expect(page.url()).not.toContain('/api/blueprint');
  await expect(page.locator('#decision')).toContainText(/mapa estratégico/i);
  await expect(page.locator('#decision')).not.toContainText('Blueprint');
  await expect(action).toHaveText('Descargar PDF');
});
