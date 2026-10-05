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
 const fixture={me:async()=>({userId:'fixture',workspaceId:'w',expiresAt:new Date(Date.now()+60000),learningMoments:[]}),listBrands:async()=>[{id:'a',name:'Marca A'},{id:'b',name:'Marca B'}],context:async()=>c,competitiveRejections:async()=>({claims:[]}),listSourceDocuments:async()=>[],listDocumentClaims:async()=>[],askBrando:async(_token:string,brandId:string,message:string,questionId:string|null)=>{
  const p=brandoPacket(c,{id:brandId,name:`Marca ${brandId}`},'v1',message,questionId,[]);
  return {answer:{...demoBrando(p),answer:'<img src=x onerror=alert(1)> Respuesta segura para '+brandId,suggestions:['<script>alert(1)</script> Propuesta tentativa para '+brandId]},provider:'DEMO_FIXTURE',error:null,brandId,questionId,contextVersion:'v1',sourceVersion:'v1',attention:c.attention,omitted:[],sources:[],trace:{}};
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
 await expect(page.locator('#decision #brando-suggestion')).toBeVisible();await expect(page.locator('#brando-suggestion')).toContainText('<script>alert(1)</script> Propuesta tentativa para a');await expect(page.locator('#brando-suggestion script')).toHaveCount(0);
 await page.locator('#brando-view-answer').click();await expect(page.locator('#brando-message')).toBeFocused();await page.keyboard.press('Escape');
 await page.locator('#brando-dismiss-suggestion').click();await expect(page.locator('#brando-suggestion')).toBeHidden();
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
 await page.keyboard.press('Escape');await expect(page.locator('#brando-suggestion')).toBeVisible();await page.locator('#open-brando').click();
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
