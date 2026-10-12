import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { demoIdentity } from './demo-identity.js';

// ACC-01 · local launch in DEMO with a fictional brand, an agency person and an invited client:
// offer → plan → kit → material → client review (comments and approval of the shared version; the agency still
// approves it) → site → public form → opportunity → simulated campaigns (creation in pause, second authorization,
// activation) → results by source → cycle review → experiment in Validation.
// Simulated steps (labelled in the interface): the Google Ads account and every provider answer; the site runs on the
// isolated development servers. Real dependencies pending: provider accounts, publication domain, HTTPS, mail, final
// privacy and consent, real AI. Setup goes through the same API the interface uses; the boundaries between commenting,
// approving, sharing, publishing and authorizing spend are checked in the interface and on the server.
// Needs the isolated app (3001), `pnpm sites:public --isolated` (3101) and `pnpm external:worker --isolated`.
async function signIn(page: Page, token: string) {
  await page.getByLabel('Token de sesión local').fill(token);
  await page.getByRole('button', { name: 'Entrar al espacio estratégico' }).click();
  await page.locator('#workspace').waitFor();
}
const openNav = async (page: Page) => { if (await page.locator('#menu').isVisible()) await page.locator('#menu').click(); };
const api = (page: Page, path: string, body?: Record<string, unknown>) => page.evaluate(async ([p, b]) => { const r = await fetch(p as string, b ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) } : undefined); return { status: r.status, body: await r.json() }; }, [path, body ?? null] as const);
const ok = async (page: Page, path: string, body?: Record<string, unknown>) => { const r = await api(page, path, body); expect(r.status, `${path} ${JSON.stringify(r.body)}`).toBeLessThan(300); return r.body; };
const day = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const key = () => crypto.randomUUID();

test('ACC-01 · local launch: offer, plan, kit, client review, site, form, opportunity, simulated campaigns, results, cycle review and Validation', async ({ page, browser, baseURL }, info) => {
  test.slow();
  const team = JSON.parse(readFileSync(process.env.BRANDOPOLIS_SESSION_FILE ?? '.local/demo-session.json', 'utf8'));
  const brand = `Lanzamiento ${info.project.name} ${Date.now()}`;
  await page.goto('/'); await signIn(page, team.token);
  await page.locator('#new-brand').click();
  await page.getByLabel('Nueva marca', { exact: true }).fill(brand); await page.locator('#brand-ficha summary').click();
  await page.getByRole('button', { name: 'Crear marca', exact: true }).click();
  await expect(page.locator('#decision')).toContainText('Por decidir');
  const brandId = await page.locator('#brands').inputValue();
  const view = page.locator('#decision');
  page.on('dialog', d => d.accept());

  // 1 · Offer (approved), 2 · annual plan with a budgeted action, 3 · kit approved and published.
  const o = await ok(page, '/api/offers/create', { brandId, content: { name: 'Café para cafeterías', kind: 'SERVICE', audience: { customerDecisionVersionId: null, segment: 'Cafeterías' }, need: 'Café constante', outcome: 'Barra surtida', benefits: ['Entrega semanal'], differentiators: [], conditions: '', proofIds: [], sourceDecisionVersionIds: [], hypothesisIds: [], price: null }, idempotencyKey: key() });
  const ov = await ok(page, '/api/offers/submit', { brandId, offerId: o.offerId, expectedRevision: 0 });
  await ok(page, '/api/offers/decide', { brandId, offerId: o.offerId, versionId: ov.versionId, fingerprint: ov.fingerprint, decision: 'APPROVE', criterion: 'Oferta revisada', idempotencyKey: key() });
  const year = Number(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City', year: 'numeric' }).format(new Date()));
  const plan = await ok(page, '/api/plan/create', { brandId, year });
  await ok(page, '/api/plan/add-action', { brandId, planId: plan.planId, content: { title: 'Campaña de lanzamiento', kind: 'INSTITUTIONAL', offerId: o.offerId, objectiveId: null, owner: '', startDate: null, dueDate: null, budget: { amountMinor: 450000, currency: 'MXN', certainty: 'ESTIMATED' }, indicator: '' }, idempotencyKey: key() });
  await ok(page, '/api/brand-kit/start', { brandId, entry: 'INGEST', expectedRevision: 0 });
  let kit = (await ok(page, `/api/brand-kit?brandId=${brandId}`)).kit;
  const color = (id: string, name: string, hex: string, role: string) => ({ id, name, hex, role, reference: '', certainty: 'PROPOSED', origin: { kind: 'PERSON', assetId: null, page: null, note: '' } });
  await ok(page, '/api/brand-kit/draft', { brandId, expectedRevision: kit.revision, content: { channels: [], logos: [], palette: [color('c-1', 'Rojo', '#8B2E1F', 'PRIMARY'), color('c-2', 'Texto', '#222222', 'TEXT'), color('c-3', 'Fondo', '#FFFFFF', 'BACKGROUND')], typography: [], pairs: [], style: { photography: '', illustration: '', icons: '', composition: '', do: [], dont: [] }, verbal: { tone: 'Cercano', messages: [], examples: [] }, rights: 'UNKNOWN' } });
  kit = (await ok(page, `/api/brand-kit?brandId=${brandId}`)).kit;
  const kv = await ok(page, '/api/brand-kit/submit', { brandId, expectedRevision: kit.revision });
  await ok(page, '/api/brand-kit/decide', { brandId, versionId: kv.versionId, fingerprint: kv.fingerprint, decision: 'APPROVE', criterion: 'Kit revisado', idempotencyKey: key() });
  await ok(page, '/api/brand-kit/publish', { brandId, versionId: kv.versionId, fingerprint: kv.fingerprint, idempotencyKey: key() });

  // 4 · A material in review, shared with the client; 5 · the client comments and approves the shared version.
  const d = await ok(page, '/api/deliverables/create', { brandId, content: { type: 'OFFER_COPY', name: 'Texto de la oferta', offerId: o.offerId, sourceDecisionVersionIds: [], body: { headline: 'Café de origen para tu barra', short: 'Entrega semanal', long: '', callToAction: 'Escríbenos' } }, idempotencyKey: key() });
  const dv = await ok(page, '/api/deliverables/submit', { brandId, deliverableId: d.deliverableId, expectedRevision: 0 });
  const invitation = await ok(page, '/api/collaboration/invite', { brandId, email: 'cliente@cafeteria.mx', idempotencyKey: key() });
  await ok(page, '/api/collaboration/share', { brandId, targetType: 'DELIVERABLE_VERSION', targetId: dv.versionId, idempotencyKey: key() });
  const guestIdentity = await demoIdentity();
  const { defaultBrowserType: _ignored, ...device } = info.project.use as Record<string, unknown>;
  const guestContext = await browser.newContext({ ...device, baseURL });
  const guest = await guestContext.newPage();
  await guest.goto(`/#invitacion=${invitation.token}`);
  await signIn(guest, guestIdentity.token);
  const portal = guest.locator('#decision');
  await expect(portal).toContainText('Portal del cliente');
  await expect(portal.locator('.share-card')).toContainText('Texto de la oferta · versión 1');
  await portal.getByLabel('Tu comentario').fill('Nos gusta el titular.');
  await portal.getByRole('button', { name: 'Comentar' }).click();
  await portal.getByRole('button', { name: 'Aprobar esta versión' }).click();
  await expect(portal.locator('.share-approvals')).toContainText('Aprobó esta versión');
  // The client never publishes, authorizes spend or reads team areas (server, not just the interface).
  // Complete, well-formed requests, so the refusal comes from the brand scope (404, indistinguishable), not validation.
  const attempts: [string, Record<string, unknown>][] = [
    ['/api/sites/publish', { brandId, siteId: key(), versionId: key(), confirm: { siteName: 'x', sequence: 1, host: 'x.localhost' }, idempotencyKey: key() }],
    ['/api/campaigns/request', { brandId, campaignId: key(), linkId: key(), operation: 'ACTIVATE', screenFingerprint: 'x', idempotencyKey: key() }],
    ['/api/deliverables/decide', { brandId, deliverableId: d.deliverableId, versionId: dv.versionId, fingerprint: dv.fingerprint, decision: 'APPROVE', criterion: 'Aprobación del cliente', idempotencyKey: key() }],
  ];
  for (const [path, body] of attempts) expect((await api(guest, path, body)).status, path).toBe(404);
  expect((await api(guest, `/api/campaigns?brandId=${brandId}`)).status).toBe(404);
  // The client's approval is not the agency's: the material is still in review until a team member approves it.
  expect((await ok(page, `/api/deliverables?brandId=${brandId}&types=OFFER_COPY`))[0].inReview).toHaveLength(1);
  await ok(page, '/api/deliverables/decide', { brandId, deliverableId: d.deliverableId, versionId: dv.versionId, fingerprint: dv.fingerprint, decision: 'APPROVE', criterion: 'El cliente lo aprobó y el equipo también', idempotencyKey: key() });
  await guestContext.close();

  // 6 · Site published on the isolated development server.
  const site = await ok(page, '/api/sites/create', { brandId, name: 'Sitio de lanzamiento', goal: 'LEADS', idempotencyKey: key() });
  const s0 = (await ok(page, `/api/sites?brandId=${brandId}`)).sites[0];
  await ok(page, '/api/sites/draft', { brandId, siteId: site.siteId, expectedRevision: s0.revision, content: { goal: 'LEADS', name: 'Sitio de lanzamiento', pages: [{ id: 'p-home', title: 'Inicio', description: 'Café para cafeterías', sections: [{ id: 's-h', type: 'HERO', title: 'Café de origen para tu barra', subtitle: '', ctaLabel: 'Escríbenos', ctaTarget: '#contacto', imageAssetId: null, imageAlt: '' }] }, { id: 'p-c', slug: 'contacto', title: 'Contacto', description: 'Escríbenos', sections: [{ id: 's-c', type: 'CONTACT', heading: 'Escríbenos', text: '' }] }] } });
  const s1 = (await ok(page, `/api/sites?brandId=${brandId}`)).sites[0];
  const sv = await ok(page, '/api/sites/submit', { brandId, siteId: site.siteId, expectedRevision: s1.revision });
  await ok(page, '/api/sites/decide', { brandId, siteId: site.siteId, versionId: sv.versionId, fingerprint: sv.fingerprint, decision: 'APPROVE', criterion: 'Sitio revisado', idempotencyKey: key() });
  const host = s0.domains[0].hostname;
  expect((await ok(page, '/api/sites/publish', { brandId, siteId: site.siteId, versionId: sv.versionId, confirm: { siteName: 'Sitio de lanzamiento', sequence: 1, host }, idempotencyKey: key() })).status).toBe('PUBLISHED');

  // 7 · Campaign (simulated Google Ads): approved version → creation in pause → second authorization → activation.
  await ok(page, '/api/connections/simulated', { brandId, provider: 'GOOGLE_ADS' });
  const c = await ok(page, '/api/campaigns/create', { brandId, provider: 'GOOGLE_ADS', name: 'Lanzamiento búsqueda', idempotencyKey: key() });
  let data = await ok(page, `/api/campaigns?brandId=${brandId}`);
  let camp = data.campaigns[0];
  await ok(page, '/api/campaigns/draft', { brandId, campaignId: c.campaignId, expectedRevision: camp.revision, content: { name: 'Lanzamiento búsqueda', offer: { offerId: o.offerId, offerVersionId: ov.versionId, name: 'Café para cafeterías' }, destination: { kind: 'SITE', siteId: site.siteId }, search: { keywords: [{ text: 'café para cafeterías', match: 'PHRASE' }], headlines: ['Café de origen', 'Entrega semanal', 'Prueba sin costo'], descriptions: ['Café de especialidad para tu barra.', 'Pedidos fijos cada semana.'] }, audience: { geo: ['Ciudad de México'] }, budget: { type: 'DAILY', amount: '150', currency: 'MXN' }, schedule: { startDate: day(2), endDate: day(31) } } });
  camp = (await ok(page, `/api/campaigns?brandId=${brandId}`)).campaigns[0];
  const cv = await ok(page, '/api/campaigns/submit', { brandId, campaignId: c.campaignId, expectedRevision: camp.revision });
  await ok(page, '/api/campaigns/decide', { brandId, campaignId: c.campaignId, versionId: cv.versionId, fingerprint: cv.fingerprint, decision: 'APPROVE', criterion: 'Campaña revisada', idempotencyKey: key() });
  const linkId = (await ok(page, `/api/campaigns?brandId=${brandId}`)).connections.ads[0].linkId;
  const requestOp = async (operation: string) => { const screen = await ok(page, '/api/campaigns/screen', { brandId, campaignId: c.campaignId, linkId, operation }); return ok(page, '/api/campaigns/request', { brandId, campaignId: c.campaignId, linkId, operation, screenFingerprint: screen.screenFingerprint, idempotencyKey: key() }); };
  const settled = async (jobId: string) => expect.poll(async () => (await ok(page, `/api/campaigns?brandId=${brandId}`)).campaigns[0].operations.find((x: { jobId: string }) => x.jobId === jobId).status, { timeout: 30000 }).toBe('SUCCEEDED');
  await settled((await requestOp('CREATE_PAUSED')).jobId);
  await settled((await requestOp('ACTIVATE')).jobId);
  data = await ok(page, `/api/campaigns?brandId=${brandId}`);
  expect(data.campaigns[0].delivery).toBe('ACTIVE');
  await ok(page, '/api/campaigns/status', { brandId, campaignId: c.campaignId });

  // 8 · A visitor arrives from the campaign and sends the site's form → an opportunity in Clientes with its reference.
  const visitor = await browser.newContext();
  const pub = await visitor.newPage();
  await pub.goto(`http://${host}/contacto/?utm_source=google&utm_medium=cpc&utm_campaign=${data.campaigns[0].utmCampaign}`);
  await pub.getByLabel('Nombre').fill('Rosa Cafetera');
  await pub.getByLabel('Correo').fill('rosa@cafeteria.mx');
  await pub.getByLabel('¿En qué te podemos ayudar?').fill('Quiero café para mi barra');
  await pub.getByLabel('Acepto que me contacten sobre esta solicitud.').check();
  await pub.getByRole('button', { name: 'Enviar' }).click();
  await expect(pub.locator('h1')).toHaveText('Recibimos tu solicitud');
  await visitor.close();
  await openNav(page); await page.locator('#clients').click();
  await expect(view.locator('.client-card', { hasText: 'Rosa Cafetera' })).toContainText('Formulario web');

  // 9 · Results keep budget, spend, simulated readings, attributed conversions, opportunities and revenue apart.
  await openNav(page); await page.locator('#results').click();
  const result = view.locator('.result-campaign').first();
  await expect(result.locator('[data-metric^="planned_"]')).toContainText('Presupuesto planificado (no es gasto)');
  await expect(result.locator('[data-metric^="spend_"]')).toContainText('Sin conectar');
  await expect(result.locator('[data-metric^="simulated_"]')).toContainText('Simulado (no es dato real)');
  await expect(result.locator('[data-metric^="arrived_"] .result-value')).toHaveText('1');
  await expect(result.locator('[data-metric^="sales_"]')).toContainText('Sin datos');
  await expect(result.locator('[data-metric^="roas_"]')).toContainText('Sin datos');

  // 10 · Cycle review (human decision) → 11 · the proposal becomes an experiment in Validation by an explicit action.
  const hypothesis = await ok(page, '/api/context/capture', { brandId, kind: 'hypothesis', entity: { statement: 'Las cafeterías responden a la búsqueda de café de origen' } });
  const ctx = await ok(page, `/api/context?brandId=${brandId}`), me = await ok(page, '/api/me');
  const q = ctx.questions.find((x: { module: string }) => x.module === 'Priority Experiment');
  await ok(page, '/api/questions/prepare', { brandId, questionId: q.id, expectedActiveVersion: null });
  await ok(page, '/api/decisions/commit', { command: { brandId, questionId: q.id, selectedOption: 'Probar la búsqueda de café de origen', rationale: 'Criterio de la agencia', expectedActiveVersion: null, sourceRecommendationId: null, idempotencyKey: key(), actorUserId: me.userId } });
  await openNav(page); await page.locator('#results').click();
  const review = view.locator('#cycle-review');
  await expect(review).toContainText('Sugerencias de Brando');
  await review.locator('[data-suggestion]').last().check();
  await review.getByLabel('¿Qué aprendiste en este periodo?').fill('Llegó una solicitud con la referencia de la campaña (datos simulados).');
  await review.getByLabel('Volver a probar').check();
  await review.getByLabel(/^¿Por qué\?/).fill('Repetimos con una cuenta real cuando haya acceso');
  await review.getByRole('button', { name: 'Guardar la revisión' }).click();
  await expect(page.locator('#notice')).toContainText('Revisión guardada');
  await view.locator('#cycle-review').getByRole('button', { name: 'Llevar a Validación' }).first().click();
  const proposal = view.locator('#cycle-experiment');
  await expect(proposal).toContainText('Propuesta revisable: nada se crea hasta que lo confirmes');
  await expect(proposal.getByLabel('Señal que se observará')).toHaveValue(/utm_campaign=/);
  await proposal.getByRole('button', { name: 'Crear el experimento en Validación' }).click();
  await expect(page.locator('#notice')).toContainText('Experimento creado en Validación como planificado');
  await expect(view.locator('#cycle-review')).toContainText('Experimento creado en Validación');
  const experiments = (await ok(page, `/api/context?brandId=${brandId}`)).experiments as { status: string; hypothesisId: string; limitations?: string[] }[];
  const created = experiments.find(e => e.hypothesisId === hypothesis.id)!;
  expect(created.status).toBe('PLANNED');
  expect(created.limitations!.join(' ')).toContain('Campaña «Lanzamiento búsqueda», versión 1');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});
