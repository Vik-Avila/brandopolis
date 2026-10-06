import { test,expect } from '@playwright/test';
import type { AddressInfo } from 'node:net';
import { createApp } from '../../src/transport/http.js';
import { loadAsset } from '../../src/transport/assets.js';
import type { Engine } from '../../src/application/engine.js';
import { attentionFor,brandoPacket,demoBrando } from '../../src/domain/brando.js';
let server:ReturnType<typeof createApp>,base:string;
const context={contextVersion:'v1',questions:['Primary Customer','Value Mechanism','Positioning','Core Message'].map((module,i)=>({id:`q${i}`,module,text:'¿Qué eliges?',status:'OPEN'})),decisions:[],versions:[],reviews:[],dependencies:[],evidence:[],learnings:[],hypotheses:[],userInputs:[],openQuestions:[],experiments:[],signals:[],impacts:[],recommendations:[],analyses:[],experimentPlans:[],audit:[],attention:[]};
const c={...context,attention:attentionFor(context)};
test.beforeAll(async()=>{
 const fixture={me:async()=>({userId:'fixture',workspaceId:'w',expiresAt:new Date(Date.now()+60000),learningMoments:[]}),listBrands:async()=>[{id:'a',name:'Marca A'},{id:'b',name:'Marca B'}],context:async()=>c,competitiveRejections:async()=>({claims:[]}),listSourceDocuments:async()=>[],listDocumentClaims:async()=>[],reviewBrandoSuggestion:async()=>({action:'REJECT',strategyChanged:false}),prepareQuestion:async()=>({status:'READY_FOR_DECISION'}),commitDecision:async()=>({decisionId:'new',versionId:'v2',impactPending:false}),askBrando:async(_token:string,brandId:string,message:string,questionId:string|null)=>{
  const p=brandoPacket(c,{id:brandId,name:`Marca ${brandId}`},'v1',message,questionId,[]);
  return {suggestionTickets:[{ticketId:'11111111-1111-4111-8111-111111111111',kind:'STRATEGY',proposedDecision:'Primera alternativa'},{ticketId:'22222222-2222-4222-8222-222222222222',kind:'STRATEGY',proposedDecision:'Segunda alternativa elegida'},{ticketId:'33333333-3333-4333-8333-333333333333',kind:'EVIDENCE',proposedDecision:null}],answer:{...demoBrando(p),answer:'<img src=x onerror=alert(1)> Respuesta segura para '+brandId,suggestions:['<script>alert(1)</script> Propuesta tentativa para '+brandId,'Segunda propuesta para '+brandId,'Revisa las fuentes antes de cambiar una decisión.']},provider:'DEMO_FIXTURE',error:null,brandId,questionId,contextVersion:'v1',sourceVersion:'v1',attention:c.attention,omitted:[],sources:[],trace:{}};
 }} as unknown as Engine;
 server=createApp(fixture,loadAsset);await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));base=`http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
test.afterAll(async()=>{await new Promise<void>(r=>server.close(()=>r()));});
test('B1 panel: query, safe text, navigation, focus, brand reset and no strategic writes',async({page},info)=>{
 const errors:string[]=[],writes:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.method()==='POST')writes.push(new URL(r.url()).pathname);});
 await page.goto(base+'/?brand=a&module=Primary%20Customer');await expect(page.locator('#workspace')).toBeVisible();
 await expect.poll(()=>page.locator('#brando-card img').evaluate(el=>(el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
 const placement=await page.locator('#brando-card').evaluate(el=>{const memory=document.querySelector('#context')!,card=el.getBoundingClientRect(),gem=el.querySelector('img')!;return{inRail:el.parentElement?.classList.contains('intelligence-rail'),aboveMemory:card.top<memory.getBoundingClientRect().top,gemSize:gem.getBoundingClientRect().width,loaded:gem.naturalWidth>0};});
 expect(placement.aboveMemory).toBe(true);expect(placement.gemSize).toBeLessThanOrEqual(48);expect(placement.loaded).toBe(true);if(info.project.name==='desktop')expect(placement.inRail).toBe(true);else await expect(page.locator('#brando-mobile-slot #brando-card')).toBeVisible();
 await page.locator('#open-brando').click();await expect(page.locator('#brando-message')).toBeFocused();
 await page.getByRole('button',{name:'Decisiones y razones',exact:true}).click();
 await page.locator('#brando-form button[type=submit]').click();
 await expect(page.locator('#brando-conversation')).toContainText('Respuesta segura para a');
 await expect(page.locator('#brando-conversation img')).toHaveCount(0);await expect(page.locator('#brando-conversation')).toContainText('DEMO determinista');
 await expect(page.locator('#brando-conversation')).toContainText('Qué necesita atención');
 expect(await page.locator('#brando-dialog').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
 await page.screenshot({path:`test-results/brando-${info.project.name}.png`});
 await expect(page.locator('#brando-card')).toHaveAttribute('data-state','ready');
 await page.getByRole('button',{name:'Pausar animación',exact:true}).click();await expect(page.locator('#brando-motion-toggle')).toHaveAttribute('aria-pressed','true');
 await page.keyboard.press('Escape');await expect(page.locator('#open-brando')).toBeFocused();
 await expect(page.locator('#brando-suggestion')).toBeHidden();await expect(page.locator('#brando-section-actions')).toHaveCount(0);
 await page.locator('#brands').selectOption('b');await expect(page.locator('#notice')).toContainText('Marca activa actualizada');
 await page.locator('#open-brando').click();await expect(page.locator('#brando-conversation')).toBeEmpty();await expect(page.locator('#brando-scope')).toContainText('Marca B');
 await page.locator('#brando-message').fill('¿Qué falta?');await page.locator('#brando-form button[type=submit]').click();await expect(page.locator('#brando-conversation')).toContainText('Respuesta segura para b');
 await page.locator('#clear-brando').click();await expect(page.locator('#brando-conversation')).toBeEmpty();
 expect(errors).toEqual([]);expect(writes).toEqual(['/api/brando/ask','/api/brando/ask']);
});
test('B1 discards a late response after switching brands',async({page})=>{
 let release:()=>void=()=>{};const hold=new Promise<void>(r=>{release=r;});
 await page.route('**/api/brando/ask',async route=>{await hold;await route.continue();});
 await page.goto(base+'/?brand=a&module=Primary%20Customer');await page.locator('#open-brando').click();
 await page.locator('#brando-message').fill('¿Por qué?');await page.locator('#brando-form button[type=submit]').click();
 await expect(page.locator('#brando-status')).toContainText('Consultando');await expect(page.locator('#brando-card')).toHaveAttribute('data-state','consulting');
 await page.keyboard.press('Escape');await page.locator('#brands').selectOption('b');await expect(page.locator('#notice')).toContainText('Marca activa actualizada');
 const response=page.waitForResponse('**/api/brando/ask');release();await response;await page.locator('#open-brando').click();await expect(page.locator('#brando-conversation')).toBeEmpty();await expect(page.locator('#brando-scope')).toContainText('Marca B');
});

test('B1 visual error and reduced motion never claim a response or expose an old suggestion',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto(base+'/?brand=a&module=Primary%20Customer');await page.locator('#open-brando').click();
 await page.locator('#brando-message').fill('Primera consulta');await page.locator('#brando-form button[type=submit]').click();
 await expect(page.locator('#brando-card')).toHaveAttribute('data-state','ready');
 await page.keyboard.press('Escape');await expect(page.locator('#brando-suggestion')).toBeHidden();await page.locator('#open-brando').click();
 await page.route('**/api/brando/ask',route=>route.fulfill({status:502,contentType:'application/json',body:JSON.stringify({code:'UNAVAILABLE',error:'No disponible.'})}));
 await page.locator('#brando-message').fill('Segunda consulta');await page.locator('#brando-form button[type=submit]').click();
 await expect(page.locator('#brando-card')).toHaveAttribute('data-state','unavailable');await expect(page.locator('#brando-conversation .brando-turn')).toHaveCount(1);await expect(page.locator('#brando-suggestion')).toBeHidden();
 expect(await page.locator('[data-brando-portrait]').evaluateAll(images=>images.every(image=>image.getAnimations().length===0))).toBe(true);
 await page.locator('#clear-brando').click();await expect(page.locator('#brando-card')).toHaveAttribute('data-state','attention');
});

test('Brando attention entry opens the summary; the right entry opens the contextual drawer',async({page},info)=>{
 const writes:string[]=[];page.on('request',request=>{if(request.method()==='POST')writes.push(request.url());});
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto(base+'/?brand=a&module=Primary%20Customer');
 if(info.project.name==='mobile')await page.locator('#menu').click();
 await page.getByRole('button',{name:'Qué necesita atención',exact:true}).click();
 await expect(page.locator('#decision .home-heading')).toContainText('Claridad para tu siguiente decisión.');
 await expect(page.locator('#brando-dialog')).not.toBeVisible();
 await expect(page.locator('#journey [data-brando-portrait]')).toHaveCount(1);
 expect(writes).toEqual([]);
 await page.locator('#open-brando').click();
 await expect(page.locator('#brando-dialog')).toBeVisible();await expect(page.locator('#brando-message')).toBeFocused();
 await expect(page.locator('#brando-context-overview')).toContainText('Tu estrategia hoy');await expect(page.locator('#brando-context-overview')).toContainText('Decisiones vigentes');
 expect(await page.locator('#brando-dialog').evaluate(el=>{const r=el.getBoundingClientRect(),input=document.querySelector('#brando-message')!.getBoundingClientRect();return Math.abs(r.right-document.documentElement.clientWidth)<2&&r.height>=innerHeight-2&&input.bottom<=innerHeight&&input.top>r.top&&el.scrollWidth<=el.clientWidth;})).toBe(true);
 expect(writes).toEqual([]);
 await page.screenshot({path:`test-results/brando-drawer-${info.project.name}.png`});
 await page.keyboard.press('Escape');await expect(page.locator('#brando-dialog')).not.toBeVisible();await expect(page.locator('#open-brando')).toBeFocused();
});

test('pending query says Pensando and uses the investigating pose',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto(base+'/?brand=a&module=Primary%20Customer');await page.locator('#open-brando').click();
 let waiting=false;let release:()=>void=()=>{};await page.route('**/api/brando/ask',async route=>{await new Promise<void>(r=>{release=r;waiting=true;});await route.continue();});
 await page.locator('#brando-message').fill('Propón un siguiente paso.');await page.locator('#brando-submit').click();
 await expect(page.locator('#brando-submit')).toHaveText('Pensando…');await expect(page.locator('#brando-submit')).toHaveAttribute('aria-busy','true');await expect(page.locator('#brando-dialog [data-brando-portrait]')).toHaveAttribute('src','/brando/consultando.webp');
 await expect.poll(()=>waiting).toBe(true);release();await expect(page.locator('#brando-submit')).toHaveText('Consultar');await expect(page.locator('#brando-dialog [data-brando-portrait]')).toHaveAttribute('src','/brando/respuesta.webp');
});
test('human rejection requires a criterion and performs no strategic commit',async({page})=>{
 const writes:string[]=[];page.on('request',r=>{if(r.method()==='POST')writes.push(new URL(r.url()).pathname);});
 await page.goto(base+'/?brand=a&module=Primary%20Customer');await page.locator('#open-brando').click();await page.locator('#brando-message').fill('Una sugerencia.');await page.locator('#brando-submit').click();await expect(page.locator('#brando-conversation .brando-turn')).toHaveCount(1);
 await page.locator('#brando-conversation [data-brando-action="REJECT"]').nth(1).click();await expect(page.locator('#brando-feedback-dialog')).toBeVisible();
 await page.locator('#brando-feedback-rationale').fill('No coincide con lo que hemos observado.');await page.locator('#brando-feedback-save').click();await expect(page.locator('#brando-feedback-dialog')).not.toBeVisible();expect(writes).toEqual(['/api/brando/ask','/api/brando/suggestions/review']);
});
for(const action of ['ACCEPT','MODIFY'])test(`human ${action} prepares an editable decision; only final confirmation commits`,async({page})=>{
 const commits:Record<string,unknown>[]=[];page.on('request',r=>{if(new URL(r.url()).pathname==='/api/decisions/commit')commits.push(r.postDataJSON());});
 await page.goto(base+'/?brand=a&module=Primary%20Customer');await page.locator('#open-brando').click();await page.locator('#brando-message').fill('Una sugerencia.');await page.locator('#brando-submit').click();await expect(page.locator('#brando-conversation .brando-turn')).toHaveCount(1);
 await page.locator(`#brando-conversation [data-brando-action="${action}"]`).nth(1).click();await expect(page.locator('#option')).toHaveValue('Segunda alternativa elegida');await expect(page.locator('#brando-dialog')).not.toBeVisible();await expect(page.locator('#brando-suggestion')).toContainText('Segunda propuesta para a');await expect(page.locator('#brando-suggestion [data-brando-action]')).toHaveCount(0);expect(commits).toEqual([]);await page.locator('#rationale').fill('Este foco responde mejor al problema observado.');
 await page.locator('#option').fill('Agencias pequeñas con varias marcas.');await page.locator('#submit-decision').click();await expect.poll(()=>commits.length).toBe(1);expect(commits[0]).toMatchObject({brandoReview:{action,ticketId:'22222222-2222-4222-8222-222222222222'},command:{selectedOption:'Agencias pequeñas con varias marcas.',rationale:'Este foco responde mejor al problema observado.'}});
});

test('evidence advice navigates to context without preparing or committing a decision',async({page})=>{
 const writes:string[]=[];page.on('request',r=>{if(r.method()==='POST')writes.push(new URL(r.url()).pathname);});
 await page.goto(base+'/?brand=a&module=Primary%20Customer');await page.locator('#open-brando').click();await page.locator('#brando-message').fill('Qué fuentes revisar');await page.locator('#brando-submit').click();
 const button=page.getByRole('button',{name:'Revisar fuentes',exact:true});await expect(button).toBeVisible();await expect(button.locator('..').locator('[data-brando-action="ACCEPT"]')).toHaveCount(0);
 await button.click();await expect(page.locator('#brando-dialog')).not.toBeVisible();await expect(page.locator('#option')).toHaveCount(0);expect(writes).toEqual(['/api/brando/ask']);
});

for(const action of ['ACCEPT','MODIFY'])test(`Brando ${action} selects Modificar for a pending review without requiring a text edit`,async({page})=>{
 const reviewing={...c,decisions:[{id:'down',questionId:'q3',activeVersionId:'old',reviewStatus:'NEEDS_REVIEW'}],versions:[{id:'old',decisionId:'down',sequence:1,versionStatus:'APPROVED',selectedOption:'Mensaje anterior',rationale:'Criterio anterior',approvedAt:new Date().toISOString(),actorUserId:'fixture'}],reviews:[{id:'review',downstreamDecisionId:'down',status:'OPEN',dependencyType:'HARD'}]};
 await page.route('**/api/context?*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(reviewing)}));
 await page.route('**/api/reviews/start',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({reviewToken:'human-review-token'})}));
 const commits:Record<string,unknown>[]=[];await page.route('**/api/decisions/commit',route=>{commits.push(route.request().postDataJSON());return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({decisionId:'down',versionId:'new',impactPending:false})});});
 await page.goto(base+'/?brand=a&module=Core%20Message');await page.locator('#brando-section-explore').click();
 await expect(page.locator('#brando-conversation .brando-turn')).toHaveCount(1);
 await page.locator(`#brando-conversation [data-brando-action="${action}"]`).nth(1).click();
 await expect(page.locator('#modify')).toHaveAttribute('aria-pressed','true');await expect(page.locator('#keep')).toHaveAttribute('aria-pressed','false');
 await expect(page.locator('#option')).toHaveValue('Segunda alternativa elegida');await expect(page.locator('#submit-decision')).toBeEnabled();expect(commits).toEqual([]);
 await page.locator('#rationale').fill('contexto');await page.locator('#submit-decision').click();expect(commits).toEqual([]);expect(await page.locator('#rationale').evaluate(el=>(el as HTMLTextAreaElement).validity.tooShort)).toBe(true);
 await page.locator('#rationale').fill('Alinea el mensaje con el posicionamiento que decidimos.');await page.locator('#submit-decision').click();
 await expect.poll(()=>commits.length).toBe(1);expect(commits[0]).toMatchObject({reviewToken:'human-review-token',brandoReview:{action},command:{selectedOption:'Segunda alternativa elegida',expectedActiveVersion:'old',rationale:'Alinea el mensaje con el posicionamiento que decidimos.'}});
});

test('section orientation navigates all four sections without inference or writes',async({page},info)=>{
 const posts:string[]=[];page.on('request',r=>{if(r.method()==='POST')posts.push(new URL(r.url()).pathname);});
 await page.goto(base+'/?brand=a&module=Primary%20Customer');
 for(const [module,label] of [['Primary Customer','Cliente principal'],['Value Mechanism','Modelo de valor'],['Positioning','Posicionamiento'],['Core Message','Mensaje principal']]){
  if(info.project.name==='mobile')await page.locator('#menu').click();
  await page.locator(`#journey [data-module="${module}"]`).click();
  await expect(page.locator('#brando-section')).toContainText(label);
  await expect(page.locator('#brando-section')).toContainText('sin consulta a la IA');
  expect(await page.locator('#brando-section').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
 }
 expect(posts).toEqual([]);
});

test('section exploration is explicit, scoped and reuses its current answer without duplicate calls',async({page},info)=>{
 const asks:Record<string,unknown>[]=[];page.on('request',r=>{if(new URL(r.url()).pathname==='/api/brando/ask')asks.push(r.postDataJSON());});
 await page.goto(base+'/?brand=a&module=Primary%20Customer');
 await page.locator('#brando-section-explore').click();
 await expect(page.locator('#brando-conversation')).toContainText('Respuesta segura para a');
 expect(asks).toHaveLength(1);expect(asks[0]).toMatchObject({brandId:'a',questionId:'q0'});
 await page.keyboard.press('Escape');await expect(page.locator('#brando-section-explore')).toBeFocused();
 await expect(page.locator('#brando-section-explore')).toHaveText('Ver propuestas de esta sección');
 await page.locator('#brando-section-explore').click();await expect(page.locator('#brando-dialog')).toBeVisible();expect(asks).toHaveLength(1);
 await page.keyboard.press('Escape');
 if(info.project.name==='mobile')await page.locator('#menu').click();
 await page.locator('#journey [data-module="Core Message"]').click();
 await page.locator('#brando-section-explore').click();await expect(page.locator('#brando-conversation .brando-turn')).toHaveCount(1);
 expect(asks).toHaveLength(2);expect(asks[1]).toMatchObject({brandId:'a',questionId:'q3'});
 await page.keyboard.press('Escape');await page.screenshot({path:`test-results/brando-section-${info.project.name}.png`});
});

test('exploring a section preserves the human draft and does not commit strategy',async({page})=>{
 const commits:string[]=[];page.on('request',r=>{if(new URL(r.url()).pathname==='/api/decisions/commit')commits.push(r.url());});
 await page.goto(base+'/?brand=a&module=Primary%20Customer');await page.locator('#edit').click();
 await page.locator('#option').fill('Mi decisión en preparación');await page.locator('#rationale').fill('Mi criterio aún no confirmado');
 await page.locator('#brando-section-explore').click();await expect(page.locator('#brando-conversation .brando-turn')).toHaveCount(1);
 await page.keyboard.press('Escape');await expect(page.locator('#option')).toHaveValue('Mi decisión en preparación');await expect(page.locator('#rationale')).toHaveValue('Mi criterio aún no confirmado');
 expect(commits).toEqual([]);
});

test('expired section proposals disable actions and require another explicit query',async({page})=>{
 await page.clock.install();await page.goto(base+'/?brand=a&module=Primary%20Customer');
 await page.locator('#brando-section-explore').click();await expect(page.locator('#brando-conversation .brando-turn')).toHaveCount(1);
 await page.clock.fastForward(15*60*1000);
 await expect(page.locator('#brando-conversation [data-brando-action="ACCEPT"]').first()).toBeDisabled();
 await expect(page.locator('#brando-status')).toContainText('propuestas vencidas');
 await page.keyboard.press('Escape');await expect(page.locator('#brando-section-explore')).toHaveText('Explorar propuestas con Brando');
});

test('section change discards a pending answer and makes no automatic retry',async({page},info)=>{
 let release:()=>void=()=>{};const hold=new Promise<void>(r=>{release=r;});let calls=0;
 await page.route('**/api/brando/ask',async route=>{calls++;await hold;await route.continue();});
 await page.goto(base+'/?brand=a&module=Primary%20Customer');await page.locator('#brando-section-explore').click();
 await expect(page.locator('#brando-section-explore')).toBeDisabled();await expect(page.locator('#brando-submit')).toHaveText('Pensando…');
 await page.keyboard.press('Escape');if(info.project.name==='mobile')await page.locator('#menu').click();await page.locator('#journey [data-module="Positioning"]').click();
 const response=page.waitForResponse('**/api/brando/ask');release();await response;
 await expect(page.locator('#brando-section')).toContainText('Posicionamiento');await page.locator('#open-brando').click();await expect(page.locator('#brando-conversation')).toBeEmpty();expect(calls).toBe(1);
});

test('a context change during inference discards proposals and updates section orientation',async({page})=>{
 await page.goto(base+'/?brand=a&module=Primary%20Customer');
 await page.route('**/api/context?*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({...c,contextVersion:'v2',impacts:[{status:'IMPACT_PENDING'}]})}));
 await page.locator('#brando-section-explore').click();await expect(page.locator('#brando-status')).toContainText('El contexto cambió');
 await expect(page.locator('#brando-conversation')).toBeEmpty();await page.keyboard.press('Escape');await expect(page.locator('#brando-section')).toHaveAttribute('data-orientation','impact');
});
