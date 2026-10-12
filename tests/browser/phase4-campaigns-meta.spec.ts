import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

// Block 8 · Meta Ads lead capture in DEMO with the simulator: a live site as destination → campaign created in pause →
// activation is not offered while the destination's measurement is unverified → SIMULATED verification → second
// authorization → simulated activation → status → pause. Needs the isolated app (3001) and
// `pnpm external:worker --isolated`. Nothing reaches Meta; the measurement evidence is simulated and says so.
async function signIn(page: Page, token: string) {
  await page.getByLabel('Token de sesión local').fill(token);
  await page.getByRole('button', { name: 'Entrar al espacio estratégico' }).click();
  await page.locator('#workspace').waitFor();
}
const openNav = async (page: Page) => { if (await page.locator('#menu').isVisible()) await page.locator('#menu').click(); };
const post = (page: Page, path: string, body: Record<string, unknown>) => page.evaluate(async ([p, b]) => { const r = await fetch(p as string, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }); return r.json(); }, [path, body] as const);
const day = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

test('block 8 · Meta lead capture: activation only with verified (simulated) measurement of the live destination; activate and pause in the simulator', async ({ page }, info) => {
  test.slow();
  const team = JSON.parse(readFileSync(process.env.BRANDOPOLIS_SESSION_FILE ?? '.local/demo-session.json', 'utf8'));
  await page.goto('/'); await signIn(page, team.token);
  await page.locator('#new-brand').click();
  await page.getByLabel('Nueva marca', { exact: true }).fill(`Meta ${info.project.name} ${Date.now()}`); await page.locator('#brand-ficha summary').click();
  await page.getByRole('button', { name: 'Crear marca', exact: true }).click();
  await expect(page.locator('#decision')).toContainText('Por decidir');
  const brandId = await page.locator('#brands').inputValue();
  page.on('dialog', d => d.accept());
  // Setup through the same API the interface uses: approved offer, a kit image and a published site.
  const o = await post(page, '/api/offers/create', { brandId, content: { name: 'Café para oficinas', kind: 'SERVICE', audience: { customerDecisionVersionId: null, segment: 'Oficinas' }, need: 'Café para el equipo', outcome: 'Equipo con buen café', benefits: [], differentiators: [], conditions: '', proofIds: [], sourceDecisionVersionIds: [], hypothesisIds: [], price: null }, idempotencyKey: crypto.randomUUID() });
  const ov = await post(page, '/api/offers/submit', { brandId, offerId: o.offerId, expectedRevision: 0 });
  await post(page, '/api/offers/decide', { brandId, offerId: o.offerId, versionId: ov.versionId, fingerprint: ov.fingerprint, decision: 'APPROVE', criterion: 'Oferta revisada', idempotencyKey: crypto.randomUUID() });
  await page.evaluate(async ([b, png]) => { const bytes = Uint8Array.from(atob(png as string), c => c.charCodeAt(0)); await fetch('/api/brand-kit/assets', { method: 'POST', headers: { 'x-brand-id': b as string, 'x-file-name': 'taza.png', 'x-asset-role': 'REFERENCE', 'Content-Type': 'application/octet-stream' }, body: bytes }); }, [brandId, PNG] as const);
  const site = await post(page, '/api/sites/create', { brandId, name: 'Sitio de captación', goal: 'LEADS', idempotencyKey: crypto.randomUUID() });
  const sites = await page.evaluate(async b => (await fetch(`/api/sites?brandId=${b}`)).json(), brandId);
  const s0 = sites.sites[0];
  await post(page, '/api/sites/draft', { brandId, siteId: site.siteId, expectedRevision: s0.revision, content: { goal: 'LEADS', name: 'Sitio de captación', pages: [{ id: 'p-home', title: 'Inicio', description: 'Café para oficinas', sections: [{ id: 's-h', type: 'HERO', title: 'Café para tu oficina', subtitle: '', ctaLabel: 'Cotiza', ctaTarget: '#contacto', imageAssetId: null, imageAlt: '' }] }, { id: 'p-c', slug: 'contacto', title: 'Contacto', description: 'Escríbenos', sections: [{ id: 's-c', type: 'CONTACT', heading: 'Escríbenos', text: '' }] }] } });
  const s1 = (await page.evaluate(async b => (await fetch(`/api/sites?brandId=${b}`)).json(), brandId)).sites[0];
  const sv = await post(page, '/api/sites/submit', { brandId, siteId: site.siteId, expectedRevision: s1.revision });
  await post(page, '/api/sites/decide', { brandId, siteId: site.siteId, versionId: sv.versionId, fingerprint: sv.fingerprint, decision: 'APPROVE', criterion: 'Sitio revisado', idempotencyKey: crypto.randomUUID() });
  const pub = await post(page, '/api/sites/publish', { brandId, siteId: site.siteId, versionId: sv.versionId, confirm: { siteName: 'Sitio de captación', sequence: 1, host: s0.domains[0].hostname }, idempotencyKey: crypto.randomUUID() });
  expect(pub.status).toBe('PUBLISHED');

  const view = page.locator('#decision');
  await openNav(page); await page.locator('#marketing').click();
  await page.waitForFunction(() => [...document.querySelectorAll('[role=tab]')].some(t => t.textContent === 'Campañas digitales' && (t as HTMLElement).offsetParent) || (document.querySelector('#area-select') as HTMLElement | null)?.offsetParent);
  const tab = page.getByRole('tab', { name: 'Campañas digitales' });
  if (await tab.isVisible()) await tab.click(); else await page.locator('#area-select').selectOption('ads');
  const area = view.locator('.campaigns-area');
  await area.getByRole('button', { name: 'Conectar cuenta simulada de Meta Ads' }).click();
  await expect(page.locator('#notice')).toContainText('Cuenta simulada conectada');
  await area.getByLabel('Meta Ads · Tráfico').check();
  await area.getByLabel(/captación de contactos/).check();
  await area.getByLabel('Nombre de la campaña').fill('Captación oficinas');
  await area.getByRole('button', { name: 'Crear campaña' }).click();
  const card = area.locator('.campaign-card').first();
  await expect(card.locator('header')).toContainText('Meta Ads · Captación');
  await card.getByLabel('Oferta aprobada que anuncia').selectOption({ index: 1 });
  await card.getByLabel('¿A dónde llega quien hace clic?').selectOption({ label: 'Sitio publicado: Sitio de captación' });
  await card.getByLabel('Texto principal').fill('Pide tu cotización de café para la oficina.');
  await card.getByLabel(/^Titular/).fill('Café para tu oficina');
  await card.getByLabel('Imagen del kit').selectOption({ index: 1 });
  await card.getByLabel('Describe la imagen').fill('Una taza de café en un escritorio');
  await card.getByLabel(/^Presupuesto/).last().fill('200');
  await card.getByLabel('Inicio', { exact: true }).fill(day(2));
  await card.getByLabel(/^Fin/).fill(day(20));
  await card.getByRole('button', { name: 'Guardar borrador' }).click();
  await expect(page.locator('#notice')).toContainText('Borrador guardado');
  await expect(area.locator('.campaign-card').first()).toContainText('Lista para solicitar');
  await area.locator('.campaign-card').first().getByRole('button', { name: 'Enviar a revisión' }).click();
  await area.getByLabel('¿Por qué apruebas o pides cambios?').fill('Campaña de captación revisada');
  await area.getByRole('button', { name: 'Aprobar esta versión' }).click();
  await expect(page.locator('#notice')).toContainText('Solicitar su creación es otro paso');
  await area.getByRole('button', { name: 'Solicitar la creación en pausa' }).click();
  await area.locator('.campaign-screen').getByRole('button', { name: 'Autorizar y solicitar la creación en pausa' }).click();
  await expect(area.locator('.campaign-card').first()).toContainText('En pausa en la cuenta', { timeout: 30000 });
  // Without verified measurement there is no activation; the simulated verification says it is simulated.
  await expect(area.locator('.campaign-measurement')).toContainText('Sin verificar');
  await expect(area.getByRole('button', { name: 'Solicitar la activación (segunda autorización)' })).toHaveCount(0);
  await expect(area).toContainText('primero verifica la medición del sitio de destino');
  await area.getByRole('button', { name: 'Registrar verificación simulada' }).click();
  await expect(area.locator('.campaign-measurement')).toContainText('Verificada (simulada)');
  await area.getByRole('button', { name: 'Solicitar la activación (segunda autorización)' }).click();
  await expect(area.locator('.campaign-screen')).toContainText('Verificada (simulada)');
  await area.locator('.campaign-screen').getByRole('button', { name: 'Autorizar y solicitar la activación' }).click();
  await expect(area.locator('.campaign-card').first()).toContainText('Activa en la cuenta', { timeout: 30000 });
  await area.locator('.campaign-operation').first().getByRole('button', { name: 'Leer estado en el proveedor' }).click();
  await expect(page.locator('#notice')).toContainText('activa, con cifras simuladas');
  await area.getByRole('button', { name: 'Solicitar la pausa' }).click();
  await area.locator('.campaign-screen').getByRole('button', { name: 'Autorizar y solicitar la pausa' }).click();
  await expect(area.locator('.campaign-card').first()).toContainText('En pausa en la cuenta', { timeout: 30000 });
  // Resultados: simulated conversions are labelled and never become people or opportunities.
  await openNav(page); await page.locator('#results').click();
  const result = view.locator('.result-campaign').first();
  await expect(result).toContainText('Conversiones atribuidas por Meta Ads');
  await expect(result.locator('[data-metric^="attributed_"]')).toContainText('Simulado (no es dato real)');
  await expect(result.locator('[data-metric^="roas_"]')).toContainText('Sin datos');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});
