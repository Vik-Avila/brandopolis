import { test,expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

/**
 * ADR-0026/0027 · in-app live AI smoke THROUGH THE REDESIGNED UI. Runs only against a local DEMO started with
 * `pnpm competition:start --isolated --live-ai` (never in the normal suites). Two real provider calls:
 *   A · Mercado objetivo → «Ayúdame a generar posibilidades» (Strategic Analysis)
 *   B · Validación → mixed signals → «Ayúdame a interpretar» (Brando B3)
 * plus C (assisted candidate learning with the server proof), D (rail tools keep Brando's answer, no re-ask) and
 * E (no strategy changed by AI). Synthetic data only. Never reads or prints a key or the session token.
 */
test.describe.configure({mode:'serial'});
test('live AI through the Strategic Workspace: A–E',async({page})=>{
 test.setTimeout(300000);
 const {token}=JSON.parse(readFileSync(process.env.BRANDOPOLIS_SESSION_FILE??'.local/rc1-smoke/demo-session.json','utf8')) as {token:string};
 const calls:{path:string;provider?:string;error?:string|null;model?:string}[]=[];
 page.on('response',async r=>{const path=new URL(r.url()).pathname;if(path==='/api/brando/ask'||path==='/api/recommendations/generate'){const body=await r.json().catch(()=>({}));calls.push({path,provider:body.provider,error:body.error,model:body.trace?.model});}});
 await page.goto('/login');await page.getByLabel('Token de sesión local').fill(token);await page.getByRole('button',{name:'Entrar al espacio estratégico'}).click();
 await page.locator('#workspace').waitFor();
 await expect(page.locator('#mode-badge')).toHaveText('DEMO LOCAL · IA EN VIVO');
 // Synthetic brand prepared through the same API a person uses (no AI involved).
 const api=async(path:string,data?:unknown)=>{const r=data===undefined?await page.request.get(path):await page.request.post(path,{data,headers:{Origin:new URL(page.url()).origin}});expect(r.ok(),path).toBe(true);return r.json();};
 const me=await api('/api/me');
 const brand=await api('/api/brands',{name:`Smoke IA en vivo · UI · sintética ${Date.now()}`});
 await api('/api/brands/geography',{brandId:brand.id,geographicInfluence:'NATIONAL',primaryMarket:'México (ficticio)'});
 const ctx=()=>api(`/api/context?brandId=${brand.id}`);
 const decide=async(module:string,text:string)=>{const c=await ctx(),q=c.questions.find((x:{module:string})=>x.module===module);await api('/api/questions/prepare',{brandId:brand.id,questionId:q.id,expectedActiveVersion:null});return api('/api/decisions/commit',{command:{brandId:brand.id,questionId:q.id,selectedOption:text,rationale:'Criterio humano sintético',expectedActiveVersion:null,sourceRecommendationId:null,idempotencyKey:randomUUID(),actorUserId:me.userId}});};
 await decide('Strategic Objective','Ser la referencia de consultoría de marca para pequeñas empresas (ficticio)');
 const hypothesis=await api('/api/context/capture',{brandId:brand.id,kind:'hypothesis',entity:{statement:'Las pequeñas empresas ficticias solicitarían un diagnóstico de marca'}});
 const priority=await decide('Priority Experiment','Validar primero la demanda del diagnóstico (ficticio)');
 const experiment=await api('/api/learning/create',{brandId:brand.id,kind:'experiment',decisionId:priority.decisionId,plan:{objective:'Medir solicitudes del diagnóstico',successCriteria:'Tres solicitudes de diez empresas'},entity:{hypothesisId:hypothesis.id,intendedSignal:'Empresas ficticias que solicitan el diagnóstico',disconfirmingCriteria:'Menos de dos solicitudes',method:'Presentar la oferta a diez empresas ficticias'}});
 await api('/api/learning/transition',{brandId:brand.id,kind:'experiment',objectId:experiment.id,expectedStatus:'PLANNED',status:'RUNNING'});
 for(const [observation,direction] of [['Dos empresas ficticias solicitaron el diagnóstico','EXPECTED'],['Cinco empresas ficticias dijeron que no tienen presupuesto','CONTRARY']])
  await api('/api/learning/create',{brandId:brand.id,kind:'signal',entity:{experimentId:experiment.id,observation,source:'Registro ficticio',observedAt:new Date().toISOString(),direction}});
 await page.goto(`/?brand=${brand.id}&module=Market%20Arena`);await page.locator('#workspace').waitFor();
 const strategy=async()=>{const c=await ctx();return JSON.stringify([c.decisions,c.versions,c.reviews,c.hypotheses.map((h:{status:string})=>h.status),c.learnings.map((l:{status:string})=>l.status)]);};
 const before=await strategy();

 // A · Mercado objetivo: real possibilities, labelled as live AI, nothing approved.
 await expect(page.locator('#decision .decision-title')).toHaveText('Mercado objetivo');
 await page.getByRole('button',{name:'Preparar decisión',exact:true}).click();
 await page.getByRole('button',{name:'Ayúdame a generar posibilidades',exact:true}).click();
 await expect.poll(()=>calls.filter(c=>c.path==='/api/recommendations/generate').length,{timeout:90000}).toBe(1);
 const a=calls.find(c=>c.path==='/api/recommendations/generate')!;
 expect(a,'A · provider').toMatchObject({provider:'ANTHROPIC',error:null});
 await expect(page.getByRole('heading',{name:'Compara antes de decidir'})).toBeVisible({timeout:30000});
 await expect(page.locator('#decision')).not.toContainText('Opciones fijas de demostración');
 expect(await strategy(),'A · possibilities never approve').toBe(before);

 // B · Validación: Brando B3 interprets mixed signals on an explicit click.
 await page.locator('#journey').getByRole('button',{name:'Validación',exact:true}).click();
 await page.getByRole('tab',{name:/^Aprendizajes/}).click();
 await page.getByText('Proponer un aprendizaje',{exact:true}).click();
 await page.getByRole('button',{name:'Ayúdame a interpretar',exact:true}).click();
 await expect(page.locator('#brando-conversation .brando-turn')).toHaveCount(1,{timeout:90000});
 const b=calls.find(c=>c.path==='/api/brando/ask')!;
 expect(b,'B · provider').toMatchObject({provider:'ANTHROPIC',error:null});
 expect(b.model,'B · configured model reported').toBeTruthy();
 await expect(page.locator('#brando-status')).toContainText('asistido por Brando');

 // D · switching rail tools keeps the answer and never re-asks.
 const tool=(name:string)=>page.locator(`.rail-tools [data-rail-tool="${name}"]`);
 if(await tool('context').isVisible()){
  for(const name of ['context','attention','history','brando'])await tool(name).click();
  await expect(page.locator('#brando-conversation .brando-turn')).toHaveCount(1);
  await page.keyboard.press('Escape');
 }else await page.keyboard.press('Escape');
 expect(calls,'exactly two real provider calls').toHaveLength(2);

 // C · candidate learning from the B3 answer: provenance decided by the server proof.
 if(!(await page.getByLabel('Interpretación',{exact:true}).isVisible()))await page.getByText('Proponer un aprendizaje',{exact:true}).click();
 await page.getByLabel('Interpretación',{exact:true}).fill('Señales mixtas: interés de algunas empresas y falta de presupuesto en otras (sintético)');
 await page.getByLabel('Límites de esta interpretación').fill('Datos ficticios');
 await page.getByRole('button',{name:'Crear aprendizaje candidato',exact:true}).click();
 await expect(page.locator('#decision')).toContainText('Interpretación asistida por Brando, revisada por ti');
 const learnings=(await ctx()).learnings as {origin:string;status:string}[];
 expect(learnings.filter(l=>l.origin==='BRANDO_ASSISTED'&&l.status==='CANDIDATE')).toHaveLength(1);

 // E · no AI query changed strategy (the new candidate is the person's own action, still a candidate).
 const after=await ctx();
 expect(JSON.stringify([after.decisions,after.versions,after.reviews,after.hypotheses.map((h:{status:string})=>h.status)])).toBe(JSON.stringify(JSON.parse(before).slice(0,4)));
 console.log(JSON.stringify({realProviderCalls:calls.length,calls:calls.map(c=>({path:c.path,provider:c.provider,error:c.error,model:c.model}))}));
});
