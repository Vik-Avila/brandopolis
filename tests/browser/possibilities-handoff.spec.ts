import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

// Production regressions this file exists for:
//
// 1. "Ayúdame a generar posibilidades" was a no-op. The button is rendered only inside the draft
//    branch of render(), while its listener lived in mountRecommendation(), which starts with
//    `if(draft)return;`. Button and handler were mutually exclusive, so clicking did nothing at all:
//    no request, no error, no loading state. The shipped test only asserted the markup existed, so
//    every assertion here is behavioural — a real click, a real request, real rendered candidates.
//
// 2. Completing the Entorno competitivo review produced no hand-off, leaving the participant with no
//    next action, because showPhaseHandoff() was only ever called from the decision-form submit.

// Every journey section of a new brand: Objetivo and Arena first (ADR-0021), Promesa before Mensaje (ADR-0022).
const PHASES = ['01 Objetivo estratégico', '02 Arena de mercado', '03 Cliente principal', '04 Modelo de valor', '05 Posicionamiento', '06 Promesa de marca', '07 Mensaje principal'];

async function navigate(page: Page, name: string) {
  await page.locator('#workspace').waitFor();
  const menu = page.getByRole('button', { name: 'Abrir navegación', exact: true });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole('button', { name, exact: true }).click();
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

test('possibilities generate, render and stay decidable in every strategic phase', async ({ page }, testInfo) => {
  // Seven phases end to end (ADR-0022): the mobile project needed ~58s for six, so it gets the standard
  // slow budget instead of the 60s default. No assertion or wait inside the test is relaxed.
  test.slow();
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  const generated: string[] = [];
  page.on('request', r => { if (r.url().includes('/api/recommendations/generate')) generated.push(r.method()); });

  await signIn(page, `Possibilities ${testInfo.project.name} ${Date.now()}`);

  for (const phase of PHASES) {
    await navigate(page, phase);
    await page.getByRole('button', { name: 'Preparar decisión', exact: true }).click();
    const typed = `Mi propia respuesta para ${phase}`;
    await page.getByLabel('Tu decisión', { exact: true }).fill(typed);

    // The click must reach the engine. Before the fix this button was inert.
    const before = generated.length;
    await page.locator('#possibilities').click();
    await expect(page.locator('.recommendation .option').first()).toBeVisible({ timeout: 60000 });
    expect(generated.length, `${phase}: generation must be requested`).toBe(before + 1);

    // The response has to become visible UI, not markup inside a hidden tab panel.
    const options = await page.locator('.recommendation .option').count();
    expect(options, `${phase}: candidates must render`).toBeGreaterThan(0);
    await expect(page.locator('[data-option-take]')).toHaveCount(options);
    await expect(page.locator('[data-option-edit]')).toHaveCount(options);
    await expect(page.locator('[data-option-drop]')).toHaveCount(options);

    // Human authority: asking for possibilities approves nothing and keeps what was typed.
    await expect(page.locator('#decision .current')).toHaveCount(0);
    await expect(page.locator('#restore-draft')).toHaveCount(1);
    expect(await page.evaluate(() => Object.keys(sessionStorage)
      .filter(k => k.startsWith('draft:')).map(k => sessionStorage.getItem(k)).join('|'))).toContain(typed);

    // Incorporar carries a candidate into the decision without committing a version.
    await page.locator('[data-option-take]').first().click();
    await expect(page.getByLabel('Tu decisión', { exact: true })).not.toHaveValue('');
    await expect(page.locator('#decision .current')).toHaveCount(0);
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();

    // Descartar is per option and reversible. Option ids repeat across proposals ("option-1"), so a
    // discard here must not follow the participant into the next phase.
    await page.locator('[data-tab="recommendation"]').click();
    await page.locator('[data-option-drop]').first().click();
    await expect(page.locator('[data-option-restore]')).toHaveCount(1);
    await expect(page.locator('[data-option-take]')).toHaveCount(options - 1);

    // Approve in the participant's own words, which is what unlocks the next phase.
    await page.locator('[data-tab="overview"]').click();
    await page.getByRole('button', { name: 'Preparar decisión', exact: true }).click();
    await page.getByLabel('Tu decisión', { exact: true }).fill(`Decisión propia ${phase}`);
    await page.getByLabel('¿Por qué eliges esta opción?').fill('Mi criterio, no la propuesta.');
    await page.getByRole('button', { name: 'Aprobar decisión', exact: true }).click();
    await expect(page.locator('#decision .current').first()).toBeVisible();
    await expect(page.locator('.phase-handoff')).toHaveCount(1);
  }

  // Journey complete: the hand-off must say so rather than point at a phase that does not exist.
  await expect(page.locator('#phase-next')).toHaveCount(0);
  await expect(page.locator('#phase-review')).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('possibilities failure is visible, safe and never loses typed input', async ({ page }, testInfo) => {
  await signIn(page, `Failure ${testInfo.project.name} ${Date.now()}`);
  await navigate(page, PHASES[0]);
  await page.getByRole('button', { name: 'Preparar decisión', exact: true }).click();
  const typed = 'Mi respuesta que debe sobrevivir al fallo';
  await page.getByLabel('Tu decisión', { exact: true }).fill(typed);

  // A provider failure carrying detail a participant must never see.
  await page.route('**/api/recommendations/generate', route => route.fulfill({
    status: 500, contentType: 'application/json',
    body: JSON.stringify({ code: 'AI_PROVIDER_ERROR', message: 'anthropic: upstream 529 overloaded_error' })
  }));
  await page.locator('#possibilities').click();

  const notice = page.locator('#notice');
  await expect(notice).toHaveText('No pudimos generar posibilidades en este momento. Puedes continuar con tu propia respuesta o intentarlo nuevamente.');
  await expect(notice).toHaveClass('error');
  await expect(notice).not.toContainText('anthropic');
  await expect(notice).not.toContainText('529');
  // The loading state must clear, the input must survive, and retrying must still be possible.
  await expect(page.locator('#ai-activity')).toBeHidden();
  await expect(page.getByLabel('Tu decisión', { exact: true })).toHaveValue(typed);
  await expect(page.locator('#possibilities')).toBeVisible();
  await expect(page.locator('#decision .current')).toHaveCount(0);
});

test('an expired session during possibilities returns the participant to sign-in', async ({ page }, testInfo) => {
  // api() writes participant-safe messages and performs the sign-out transition itself, so those
  // failures must keep propagating out of the shared generation path. An early version of this fix
  // caught every error, which left an expired session stranded on a dead screen with a retry hint.
  await signIn(page, `Session ${testInfo.project.name} ${Date.now()}`);
  await navigate(page, PHASES[0]);
  await page.getByRole('button', { name: 'Preparar decisión', exact: true }).click();
  await page.getByLabel('Tu decisión', { exact: true }).fill('Texto que debe conservarse');

  await page.route('**/api/recommendations/generate', route => route.fulfill({
    status: 401, contentType: 'application/json',
    body: JSON.stringify({ code: 'UNAUTHORIZED', message: 'technical private details' })
  }));
  await page.locator('#possibilities').click();

  await expect(page.getByLabel('Token de sesión local')).toBeVisible();
  await expect(page.getByRole('status')).toContainText('Tu sesión DEMO');
  await expect(page.locator('body')).not.toContainText('technical private details');
  await expect(page.locator('body')).not.toContainText('No pudimos generar posibilidades');
});

test('competitive review hands off only once the human has resolved every finding', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await signIn(page, `Competitive ${testInfo.project.name} ${Date.now()}`);

  await navigate(page, 'Entorno competitivo');
  await page.locator('#run-competitive-research').click();
  await page.locator('#competitive-candidates').waitFor({ timeout: 120000 });
  expect(await page.locator('.competitive-finding').count()).toBeGreaterThan(0);

  // "The AI finished generating" is NOT completion: candidates are still awaiting a human.
  await expect(page.locator('.phase-handoff')).toHaveCount(0);

  // Resolve all but the last, and confirm the hand-off stays withheld while one is unresolved.
  // An accepted finding loses both of its buttons, so the pending count is the settle condition:
  // waiting on it lets the re-render finish instead of clicking into a disabled, detaching node.
  let pending = await page.locator('[data-competitive-accept]').count();
  while (pending > 1) {
    await page.locator('[data-competitive-accept]').first().click();
    await expect(page.locator('[data-competitive-accept]')).toHaveCount(--pending);
  }
  await expect(page.locator('.phase-handoff')).toHaveCount(0);

  // Resolving the last one completes the canonical reviewed state.
  await expect(page.locator('[data-competitive-reject]').first()).toBeEnabled();
  await page.locator('[data-competitive-reject]').first().click();
  await expect(page.locator('.phase-handoff')).toHaveCount(1);
  // The hand-off speaks this workflow's language (the eyebrow is uppercased by CSS only).
  await expect(page.locator('.phase-handoff')).toContainText(/contexto competitivo revisado/i);
  await expect(page.locator('.phase-handoff')).toBeVisible();

  // The destination comes from the canonical journey: no decision is approved on this brand yet, so
  // the next phase is the first one in the nav, never a locally invented order.
  const firstModule = await page.locator('#journey [data-module]').first().getAttribute('data-module');
  await expect(page.locator('#phase-next')).toHaveAttribute('data-next', firstModule!);
  await page.locator('#phase-next').click();
  await expect(page.locator('#decision')).toContainText('Por decidir');

  // The secondary action works from this surface too, with no dependency on the drawer. For the
  // competitive review it is «Revisar contexto», which opens the Brand Context it just fed.
  await navigate(page, 'Entorno competitivo');
  await expect(page.locator('#phase-review')).toHaveText('Revisar contexto');
  await page.locator('#phase-review').click();
  await expect(page.locator('#decision')).toHaveAttribute('data-view', 'brand-context');
  expect(errors).toEqual([]);
});
