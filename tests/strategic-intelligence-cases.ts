import { it,expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { and,eq } from 'drizzle-orm';
import type { AddressInfo } from 'node:net';
import { Engine } from '../src/application/engine.js';
import { ModelGateway,type GatewayRequest } from '../src/domain/analysis.js';
import { demoBrando } from '../src/domain/brando.js';
import { seedIdentity } from '../scripts/seed.js';
import { createApp } from '../src/transport/http.js';
import type { connect } from '../src/persistence/database.js';
import * as t from '../src/persistence/schema.js';

/** ADR-0025: Strategic Intelligence over persisted state, declared context and Brando's authorized packet. */
export function strategicIntelligenceCases(connection:()=>ReturnType<typeof connect>){
 const setup=async(engine?:Engine)=>{
  const db=connection().db,e=engine??new Engine(db),who=await seedIdentity(db),brand=await e.createBrand(who.token,'Inteligencia');
  const ctx=()=>e.context(who.token,brand.id);
  const decisionOf=async(module:string)=>{const c=await ctx(),q=c.questions.find(q=>q.module===module)!;return {c,q,d:c.decisions.find(d=>d.questionId===q.id)};};
  const commit=async(module:string,text:string,reviewToken?:string)=>{
   const {q,d}=await decisionOf(module);
   await e.prepareQuestion(who.token,brand.id,q.id,d?.activeVersionId??null);
   return e.commitDecision(who.token,{brandId:brand.id,questionId:q.id,selectedOption:text,rationale:'Criterio humano registrado',expectedActiveVersion:d?.activeVersionId??null,sourceRecommendationId:null,idempotencyKey:randomUUID(),actorUserId:who.userId},reviewToken);
  };
  return {db,engine:e,who,brand,ctx,decisionOf,commit};
 };

 it('ADR-0025: declared geography is scoped, audited, shown as context and never rewrites Market Arena',async()=>{
  const {db,engine,who,brand,ctx,decisionOf,commit}=await setup();
  const foreign=await seedIdentity(db),member=await seedIdentity(db,'MEMBER',who.workspaceId);
  await expect(engine.setBrandGeography(foreign.token,brand.id,'LOCAL','Xalapa')).rejects.toMatchObject({code:'NOT_FOUND'});
  await expect(engine.setBrandGeography(member.token,brand.id,'LOCAL','Xalapa')).rejects.toMatchObject({code:'FORBIDDEN'});
  await expect(engine.setBrandGeography(who.token,brand.id,'MOON' as never,'Xalapa')).rejects.toMatchObject({code:'INVALID'});
  expect(await engine.setBrandGeography(who.token,brand.id,'LOCAL','  Xalapa, Veracruz ')).toEqual({brandId:brand.id,geographicInfluence:'LOCAL',primaryMarket:'Xalapa, Veracruz'});
  let c=await ctx();
  expect(c.brandContext).toEqual({geographicInfluence:'LOCAL',primaryMarket:'Xalapa, Veracruz'});
  expect(c.intelligence.declaredContext['Market Arena']).toEqual([{kind:'GEOGRAPHY',text:'LOCAL · Xalapa, Veracruz',sourceId:null}]);
  expect((await decisionOf('Market Arena')).d,'context is never a decision').toBeUndefined();
  // Same values again: no new audit entry.
  await engine.setBrandGeography(who.token,brand.id,'LOCAL','Xalapa, Veracruz');
  const audits=async()=>(await db.select().from(t.audits).where(and(eq(t.audits.brandId,brand.id),eq(t.audits.operation,'BRAND_CONTEXT_UPDATED')))).length;
  expect(await audits()).toBe(1);
  await commit('Strategic Objective','Ser el punto de encuentro cultural');
  const arena=await commit('Market Arena','Experiencias de café y cultura en Xalapa frente a espacios culturales');
  const before=(await decisionOf('Market Arena')).c.versions.filter(v=>v.decisionId===arena.decisionId);
  await new Promise(r=>setTimeout(r,5));
  await engine.setBrandGeography(who.token,brand.id,'REGIONAL','Veracruz');
  c=await ctx();
  expect(await audits()).toBe(2);
  expect(c.versions.filter(v=>v.decisionId===arena.decisionId),'Market Arena is never rewritten').toEqual(before);
  expect(c.decisions.find(d=>d.id===arena.decisionId)!.reviewStatus).toBe('APPROVED');
  expect(c.intelligence.issues.find(i=>i.kind==='CONTEXT_CHANGED_AFTER_DECISION')).toMatchObject({severity:'REVIEW',modules:['Market Arena'],versionIds:[arena.versionId],reviewFirst:'Market Arena'});
  expect(c.intelligence.evaluatorResult).toBe('PASS_WITH_CAUTION');
  // Another brand of the same workspace never sees this context.
  const other=await engine.createBrand(who.token,'Otra');
  const otherContext=await engine.context(who.token,other.id);
  expect(otherContext.brandContext).toEqual({geographicInfluence:null,primaryMarket:null});
  expect(otherContext.intelligence.declaredContext['Market Arena']).toBeUndefined();
 });

 it('ADR-0025: the projection follows real Change Impact and reading it writes nothing',async()=>{
  const {db,brand,ctx,commit}=await setup();
  for(const [m,text] of [['Strategic Objective','Objetivo'],['Market Arena','Arena'],['Primary Customer','Agencias'],['Value Mechanism','Suscripción'],['Positioning','Continuidad'],['Brand Promise','Promesa'],['Core Message','Mensaje']])await commit(m,text);
  let c=await ctx();
  expect(c.intelligence.evaluatorResult).toBe('PASS');
  expect(c.intelligence.issues).toEqual([]);
  const customer=await commit('Primary Customer','Equipos internos');
  const counts=async()=>Promise.all([t.decisions,t.versions,t.reviews,t.dependencies,t.audits].map(async table=>(await db.select().from(table).where(eq(table.brandId,brand.id))).length));
  const before=await counts();
  c=await ctx();await ctx();
  expect(await counts(),'reading intelligence never writes').toEqual(before);
  const plan=c.intelligence.reviewPlan;
  expect(plan.map(p=>[p.module,p.mandatory])).toEqual([['Positioning',true],['Core Message',false]]);
  expect(plan[0].triggers).toEqual([expect.objectContaining({module:'Primary Customer',versionId:customer.versionId,sequence:2,kind:'HARD'})]);
  expect(c.intelligence.issues.filter(i=>i.kind==='PENDING_REVIEW').map(i=>[i.modules[0],i.severity])).toEqual([['Positioning','REVIEW'],['Core Message','INFO']]);
  expect(c.intelligence.recentChanges[0]).toMatchObject({module:'Primary Customer',sequence:2});
  const memory=c.intelligence.memory.find(m=>m.module==='Positioning')!;
  expect(memory.upstream.map(u=>u.module).sort()).toEqual(['Market Arena','Primary Customer','Value Mechanism']);
  expect(memory.downstream.map(u=>u.module).sort()).toEqual(['Brand Promise','Core Message']);
  expect(memory.support).toBe('UNVALIDATED');
 });

 it('ADR-0025: Brando receives declared context and issues of this brand only, and never writes',async()=>{
  const requests:GatewayRequest[]=[];
  const gateway=new ModelGateway({name:'test',model:'test',generate:async r=>{requests.push(r);return demoBrando(r.input);}},'brando-contextual-v5');
  const db=connection().db,engine=new Engine(db,undefined,gateway);
  const {who,brand,ctx,commit}=await setup(engine);
  await engine.setBrandGeography(who.token,brand.id,'LOCAL','Xalapa, Veracruz');
  await commit('Primary Customer','Agencias');
  await commit('Positioning','Continuidad');
  const other=await engine.createBrand(who.token,'Marca ajena');
  await engine.setBrandGeography(who.token,other.id,'GLOBAL','MERCADO-AJENO');
  const before=await ctx();
  const answer=await engine.askBrando(who.token,brand.id,'¿Qué no está alineado y qué reviso primero?',null);
  expect(answer.error).toBeNull();
  expect(requests[requests.length-1].promptVersion).toBe('brando-contextual-v6');
  const packet=JSON.stringify(requests[requests.length-1].input);
  expect(packet).toContain('DECLARED_CONTEXT_NOT_DECISION');
  expect(packet).toContain('Xalapa, Veracruz');
  expect(packet).toContain('SYSTEM_DERIVED_NOT_EVIDENCE');
  expect(packet).toContain('MISSING_BASIS');
  expect(packet,'no other brand reaches the provider').not.toContain('MERCADO-AJENO');
  expect(packet,'no personal identifiers').not.toContain(who.userId);
  const after=await ctx();
  expect([after.decisions,after.versions,after.reviews,after.dependencies]).toEqual([before.decisions,before.versions,before.reviews,before.dependencies]);
 });

 it('ADR-0025: the geography endpoint shares the same-origin and session gates in DEMO mode',async()=>{
  const {engine,who,brand,ctx}=await setup();
  const server=createApp(engine);await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try{
   const login=await fetch(base+'/api/session',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({token:who.token})});
   const cookie=(login.headers.get('set-cookie')??'').split(';')[0];
   const post=(headers:Record<string,string>)=>fetch(base+'/api/brands/geography',{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify({brandId:brand.id,geographicInfluence:'NATIONAL',primaryMarket:'México'})});
   expect((await post({Origin:'https://untrusted.example',Cookie:cookie})).status).toBe(403);
   expect((await post({Origin:base})).status).toBe(401);
   expect((await post({Origin:base,Cookie:cookie})).status).toBe(200);
   expect((await ctx()).brandContext).toEqual({geographicInfluence:'NATIONAL',primaryMarket:'México'});
  }finally{await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));}
 });
}
