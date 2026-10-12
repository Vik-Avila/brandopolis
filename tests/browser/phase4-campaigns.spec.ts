import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

// Block 8 (ADR-0031) in DEMO with the simulator: connect a simulated Google Ads account → create a campaign → Brando
// proposes (incorporated by the person) → complete and save → review and approve → confirm the exact screen and
// request creation in pause with a «lost response» scenario → pending verification → check with the provider →
// created in pause → read status (simulated) → Resultados keeps planned budget, spend, simulator and ROAS apart →
// second authorization → simulated activation → pause → cycle review saved → Canva: approved brief sent, design
// retrieved into a new draft. Needs the isolated app (3001)
// and `pnpm external:worker --isolated`. Nothing reaches Google, Meta or Canva.
async function signIn(page: Page, token: string) {
  await page.getByLabel('Token de sesión local').fill(token);
  await page.getByRole('button', { name: 'Entrar al espacio estratégico' }).click();
  await page.locator('#workspace').waitFor();
}
const openNav = async (page: Page) => { if (await page.locator('#menu').isVisible()) await page.locator('#menu').click(); };
async function marketingTab(page: Page, key: string, name: string) {
  await openNav(page); await page.locator('#marketing').click();
  await page.waitForFunction(n => [...document.querySelectorAll('[role=tab]')].some(t => t.textContent === n && (t as HTMLElement).offsetParent) || (document.querySelector('#area-select') as HTMLElement | null)?.offsetParent, name);
  const tab = page.getByRole('tab', { name });
  if (await tab.isVisible()) await tab.click(); else await page.locator('#area-select').selectOption(key);
}
/** Setup through the same API the interface uses (same-origin, the person's session): an approved offer and brief. */
const post = (page: Page, path: string, body: Record<string, unknown>) => page.evaluate(async ([p, b]) => { const r = await fetch(p as string, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }); return r.json(); }, [path, body] as const);
const day = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

test('block 8: campaign created in pause through the simulator, uncertain step checked, results apart, cycle review, Canva', async ({ page }, info) => {
  test.slow();
  const team = JSON.parse(readFileSync(process.env.BRANDOPOLIS_SESSION_FILE ?? '.local/demo-session.json', 'utf8'));
  const brand = `Campañas ${info.project.name} ${Date.now()}`;
  await page.goto('/'); await signIn(page, team.token);
  await page.locator('#new-brand').click();
  await page.getByLabel('Nueva marca', { exact: true }).fill(brand); await page.locator('#brand-ficha summary').click();
  await page.getByRole('button', { name: 'Crear marca', exact: true }).click();
  await expect(page.locator('#decision')).toContainText('Por decidir');
  const brandId = await page.locator('#brands').inputValue();
  page.on('dialog', d => d.accept());
  const offer = { name: 'Café para cafeterías', kind: 'SERVICE', audience: { customerDecisionVersionId: null, segment: 'Cafeterías' }, need: 'Café de especialidad constante', outcome: 'Barra siempre surtida', benefits: ['Entrega semanal'], differentiators: [], conditions: '', proofIds: [], sourceDecisionVersionIds: [], hypothesisIds: [], price: null };
  const o = await post(page, '/api/offers/create', { brandId, content: offer, idempotencyKey: crypto.randomUUID() });
  const ov = await post(page, '/api/offers/submit', { brandId, offerId: o.offerId, expectedRevision: 0 });
  await post(page, '/api/offers/decide', { brandId, offerId: o.offerId, versionId: ov.versionId, fingerprint: ov.fingerprint, decision: 'APPROVE', criterion: 'Oferta revisada', idempotencyKey: crypto.randomUUID() });
  const view = page.locator('#decision');

  // Connections: a simulated account, labelled; the area says nothing real is created or spent.
  await marketingTab(page, 'ads', 'Campañas digitales');
  const area = view.locator('.campaigns-area');
  await expect(area.locator('.campaign-sim').first()).toContainText('nada de lo que hagas aquí crea anuncios reales ni gasta dinero');
  await area.getByRole('button', { name: 'Conectar cuenta simulada de Google Ads' }).click();
  await expect(page.locator('#notice')).toContainText('Cuenta simulada conectada');
  await expect(area).toContainText('Cuenta simulada (sin conexión real)');

  // Create, ask Brando (nothing saved until incorporated), complete and save.
  await area.getByLabel('Nombre de la campaña').fill('Búsqueda café');
  await area.getByRole('button', { name: 'Crear campaña' }).click();
  await expect(page.locator('#notice')).toContainText('Campaña creada en borrador');
  const card = area.locator('.campaign-card').first();
  await card.getByRole('button', { name: 'Pedir propuesta a Brando' }).click();
  await expect(card.locator('.site-proposal')).toContainText('no se ha guardado');
  await card.getByRole('button', { name: 'Incorporar al borrador' }).click();
  await expect(page.locator('#notice')).toContainText('Propuesta incorporada');
  await card.getByLabel('¿A dónde llega quien hace clic?').selectOption('URL');
  await card.getByLabel('Dirección https de destino').fill('https://cafe-nandu.mx/cafeterias');
  await card.getByLabel(/^Palabras clave/).fill('café para cafeterías\ncafé de especialidad');
  await card.getByLabel(/^Títulos/).fill('Café de origen\nEntrega semanal\nPrueba sin costo');
  await card.getByLabel(/^Descripciones/).fill('Café de especialidad para tu barra.\nPedidos fijos cada semana.');
  await card.getByLabel(/^Presupuesto diario/).fill('150');
  await card.getByLabel('Inicio', { exact: true }).fill(day(2));
  await card.getByLabel(/^Fin/).fill(day(31));
  await card.getByRole('button', { name: 'Guardar borrador' }).click();
  await expect(page.locator('#notice')).toContainText('Borrador guardado');
  await expect(area.locator('.campaign-card').first()).toContainText('Lista para solicitar');

  // Review and approve: approving creates nothing in the provider.
  await area.locator('.campaign-card').first().getByRole('button', { name: 'Enviar a revisión' }).click();
  await expect(page.locator('#notice')).toContainText('Versión enviada a revisión');
  await area.getByLabel('¿Por qué apruebas o pides cambios?').fill('Revisado con el equipo comercial');
  await area.getByRole('button', { name: 'Aprobar esta versión' }).click();
  await expect(page.locator('#notice')).toContainText('Solicitar su creación es otro paso');

  // The exact confirmation screen; a simulator scenario: the response is lost after the campaign is created.
  await area.getByRole('button', { name: 'Solicitar la creación en pausa' }).click();
  const screen = area.locator('.campaign-screen');
  await expect(screen).toContainText('Operación'); await expect(screen).toContainText('Crear en pausa');
  await expect(screen).toContainText('Cuenta simulada (sin conexión real)');
  await expect(screen).toContainText('no es un tope total');
  await expect(screen).toContainText('No se activa ni gasta');
  await screen.getByLabel('Escenario del simulador').selectOption('LOST_RESPONSE');
  await screen.getByRole('button', { name: 'Autorizar y solicitar la creación en pausa' }).click();
  await expect(page.locator('#notice')).toContainText('La creación en pausa está en la cola del simulador');
  const operation = area.locator('.campaign-operation').first();
  await expect(operation).toContainText('Pendiente de comprobación', { timeout: 30000 });
  await expect(operation).toContainText('Se perdió la respuesta: pudo haberse creado.');
  await operation.getByRole('button', { name: 'Comprobar en el proveedor' }).click();
  await expect(page.locator('#notice')).toContainText('se vinculó y no se repite');
  await expect(area.locator('.campaign-operation').first()).toContainText('Creada en pausa', { timeout: 30000 });
  await area.locator('.campaign-operation').first().getByRole('button', { name: 'Leer estado en el proveedor' }).click();
  await expect(page.locator('#notice')).toContainText('en pausa, sin gasto');
  await expect(area.locator('.campaign-states').last()).toContainText('proveedor (simulado): en pausa');
  // Second, independent authorization: simulated activation; then a pause (no amount to confirm).
  await expect(area.locator('.campaign-card').first()).toContainText('En pausa en la cuenta');
  await area.getByRole('button', { name: 'Solicitar la activación (segunda autorización)' }).click();
  const activation = area.locator('.campaign-screen');
  await expect(activation).toContainText('Activar (segunda autorización)');
  await expect(activation).toContainText('puede empezar a gastar');
  await activation.getByRole('button', { name: 'Autorizar y solicitar la activación' }).click();
  await expect(page.locator('#notice')).toContainText('La activación está en la cola del simulador');
  await expect(area.locator('.campaign-card').first()).toContainText('Activa en la cuenta', { timeout: 30000 });
  await area.locator('.campaign-operation').first().getByRole('button', { name: 'Leer estado en el proveedor' }).click();
  await expect(page.locator('#notice')).toContainText('activa, con cifras simuladas');
  await area.getByRole('button', { name: 'Solicitar la pausa' }).click();
  await expect(area.locator('.campaign-screen')).toContainText('Pausar no confirma importes');
  await area.locator('.campaign-screen').getByRole('button', { name: 'Autorizar y solicitar la pausa' }).click();
  await expect(area.locator('.campaign-card').first()).toContainText('En pausa en la cuenta', { timeout: 30000 });
  await expect(area).toContainText('En esta DEMO todo ocurre en el simulador');

  // Resultados: sources apart, no ROAS; cycle review saved without changing anything else.
  await openNav(page); await page.locator('#results').click();
  const campaigns = view.locator('.result-campaign').first();
  await expect(campaigns).toContainText('Presupuesto planificado (MXN)');
  await expect(campaigns.locator('[data-kind="PROVIDER"]').first()).toContainText('Sin conectar');
  await expect(campaigns).toContainText('Simulado (no es dato real)');
  await expect(campaigns).toContainText('Retorno de la inversión publicitaria (ROAS)');
  const review = view.locator('#cycle-review');
  await expect(review).toContainText('No hay cuentas reales de Google o Meta conectadas');
  await review.getByLabel('¿Qué aprendiste en este periodo?').fill('Todavía no hay datos reales de campañas.');
  await review.getByLabel('Volver a probar').check();
  await review.getByLabel(/^¿Por qué\?/).fill('Repetimos con una cuenta real cuando haya acceso');
  await review.getByRole('button', { name: 'Guardar la revisión' }).click();
  await expect(page.locator('#notice')).toContainText('No cambia la estrategia, el plan ni las campañas');
  await expect(view.locator('#cycle-review')).toContainText('Volver a probar: Repetimos con una cuenta real');

  // Canva: the approved brief goes to a simulated Canva; retrieving creates a new draft; the approved one stays.
  const brief = { type: 'DESIGN_BRIEF', name: 'Carrusel de lanzamiento', offerId: o.offerId, sourceDecisionVersionIds: [], body: { for: 'CANVA', piece: 'Carrusel', format: '1080×1350', audience: 'Cafeterías', message: 'Café de origen', mustInclude: '', avoid: '', dueDate: null } };
  const d = await post(page, '/api/deliverables/create', { brandId, content: brief, idempotencyKey: crypto.randomUUID() });
  const dv = await post(page, '/api/deliverables/submit', { brandId, deliverableId: d.deliverableId, expectedRevision: 0 });
  await post(page, '/api/deliverables/decide', { brandId, deliverableId: d.deliverableId, versionId: dv.versionId, fingerprint: dv.fingerprint, decision: 'APPROVE', criterion: 'Brief revisado', idempotencyKey: crypto.randomUUID() });
  await openNav(page); await page.locator('#offers').click();
  const tab = page.getByRole('tab', { name: 'Materiales de venta' });
  await page.waitForFunction(() => [...document.querySelectorAll('[role=tab]')].some(t => t.textContent === 'Materiales de venta' && (t as HTMLElement).offsetParent) || (document.querySelector('#area-select') as HTMLElement | null)?.offsetParent);
  if (await tab.isVisible()) await tab.click(); else await page.locator('#area-select').selectOption('materials');
  const panel = view.locator('.deliverable-card', { hasText: 'Carrusel de lanzamiento' }).locator('.canva-panel');
  await expect(panel).toContainText('Autocompletar plantillas (no disponible en el plan)');
  // The Canva connection belongs to the person (not the brand): connect it only if this DEMO user has none yet.
  const connectCanva = panel.getByRole('button', { name: 'Conectar Canva (simulado)' });
  if (await connectCanva.count()) { await connectCanva.click(); await expect(page.locator('#notice')).toContainText('Canva simulado conectado'); }
  await view.locator('.deliverable-card', { hasText: 'Carrusel de lanzamiento' }).locator('.canva-panel').getByRole('button', { name: 'Enviar el brief aprobado a Canva' }).click();
  await expect(page.locator('#notice')).toContainText('Brief enviado a Canva (simulado)');
  await view.locator('.deliverable-card', { hasText: 'Carrusel de lanzamiento' }).locator('.canva-panel').getByRole('button', { name: 'Recuperar el diseño' }).click();
  await expect(page.locator('#notice')).toContainText('la aprobada no cambia');
  const briefCard = view.locator('.deliverable-card', { hasText: 'Carrusel de lanzamiento' });
  await expect(briefCard).toContainText('Aprobada · v1');
  await expect(briefCard).toContainText('Borrador · v2');
  await expect(briefCard.locator('.canva-panel')).toContainText('Recuperado en una versión nueva');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});
