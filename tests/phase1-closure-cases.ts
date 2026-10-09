import { it,expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { Engine } from '../src/application/engine.js';
import { buildBlueprintPdf } from '../src/application/blueprint-pdf.js';
import { seedIdentity } from '../scripts/seed.js';
import type { connect } from '../src/persistence/database.js';
import type { CommitCommand } from '../src/domain/contracts.js';

const SPINE=['Strategic Objective','Market Arena','Primary Customer','Value Mechanism','Positioning','Brand Promise','Core Message','GTM Priority','Priority Experiment'];
const LABELS=['Objetivo estratégico','Mercado objetivo','Cliente principal','Modelo de valor','Posicionamiento','Promesa de marca','Mensaje principal','Prioridad de lanzamiento','Experimento prioritario'];
// The decisions added by this expansion (ADR-0021..ADR-0024); the original four keep their own M1 suites.
const NEW=['Strategic Objective','Market Arena','Brand Promise','GTM Priority','Priority Experiment'];

/** Phase 1 closure: the 9-decision Strategic Core keeps every M1 contract (INV-001..010, tenancy). */
export function phase1ClosureCases(connection:()=>ReturnType<typeof connect>){
 const setup=async()=>{
  const db=connection().db,engine=new Engine(db),who=await seedIdentity(db),brand=await engine.createBrand(who.token,'Cierre Fase 1');
  const ctx=()=>engine.context(who.token,brand.id);
  const question=async(module:string)=>(await ctx()).questions.find(q=>q.module===module)!;
  const command=(questionId:string,selectedOption:string,expectedActiveVersion:string|null,idempotencyKey=randomUUID(),rationale='Criterio humano registrado'):CommitCommand=>({brandId:brand.id,questionId,selectedOption,rationale,expectedActiveVersion,sourceRecommendationId:null,idempotencyKey,actorUserId:who.userId});
  return {db,engine,who,brand,ctx,question,command};
 };

 it('Phase 1: each new decision versions, keeps history, refuses stale clients and replays idempotently',async()=>{
  const {engine,who,brand,ctx,question,command}=await setup();
  for(const module of NEW){
   const q=await question(module);
   await engine.prepareQuestion(who.token,brand.id,q.id,null);
   await expect(engine.commitDecision(who.token,command(q.id,'Sin criterio',null,randomUUID(),'   ')),`${module}: criterion mandatory`).rejects.toMatchObject({code:'INVALID'});
   const v1key=randomUUID();
   const v1=await engine.commitDecision(who.token,command(q.id,`${module} v1`,null,v1key));
   // Lost response: the same key and command return the same version and write nothing new.
   const versionsAfterV1=(await ctx()).versions.length;
   expect(await engine.commitDecision(who.token,command(q.id,`${module} v1`,null,v1key))).toMatchObject({decisionId:v1.decisionId,versionId:v1.versionId});
   expect((await ctx()).versions,`${module}: replay is idempotent`).toHaveLength(versionsAfterV1);
   await expect(engine.commitDecision(who.token,command(q.id,`${module} otro`,null,v1key)),`${module}: key reuse with other content`).rejects.toMatchObject({code:'CONFLICT'});
   await engine.prepareQuestion(who.token,brand.id,q.id,v1.versionId);
   const v2=await engine.commitDecision(who.token,command(q.id,`${module} v2`,v1.versionId));
   // INV-009: a stale client (still on v1) gets 409 and changes nothing.
   const before=await ctx();
   await engine.prepareQuestion(who.token,brand.id,q.id,v2.versionId);
   await expect(engine.commitDecision(who.token,command(q.id,`${module} obsoleta`,v1.versionId)),`${module}: stale client`).rejects.toMatchObject({code:'CONFLICT'});
   const after=await ctx();
   expect(after.versions,`${module}: no side effects on 409`).toEqual(before.versions);
   // INV-002/003: the old version stays readable as SUPERSEDED, the new one is the active APPROVED version.
   const decision=after.decisions.find(d=>d.id===v1.decisionId)!;
   expect(decision.activeVersionId).toBe(v2.versionId);
   expect(after.versions.find(v=>v.id===v1.versionId)).toMatchObject({selectedOption:`${module} v1`,versionStatus:'SUPERSEDED',sequence:1});
   expect(after.versions.find(v=>v.id===v2.versionId)).toMatchObject({selectedOption:`${module} v2`,versionStatus:'APPROVED',sequence:2,previousVersionId:v1.versionId});
  }
 });

 it('Phase 1: new decisions are denied across tenants, across brands and to unassigned members',async()=>{
  const {db,engine,who,brand,question,command}=await setup();
  const foreign=await seedIdentity(db),member=await seedIdentity(db,'MEMBER',who.workspaceId);
  const otherBrand=await engine.createBrand(who.token,'Otra marca');
  for(const module of NEW){
   const q=await question(module);
   await expect(engine.prepareQuestion(foreign.token,brand.id,q.id,null),`${module}: cross-tenant`).rejects.toMatchObject({code:'NOT_FOUND'});
   await expect(engine.prepareQuestion(member.token,brand.id,q.id,null),`${module}: unassigned`).rejects.toMatchObject({code:'FORBIDDEN'});
   // A question id of this brand used against another brand of the same workspace is not available there.
   await expect(engine.prepareQuestion(who.token,otherBrand.id,q.id,null),`${module}: cross-brand`).rejects.toMatchObject({code:'NOT_FOUND'});
   await expect(engine.commitDecision(foreign.token,{...command(q.id,'Ajena',null),actorUserId:foreign.userId}),`${module}: cross-tenant commit`).rejects.toMatchObject({code:'NOT_FOUND'});
  }
 });

 it('Phase 1: AI proposals for the new decisions never create a decision or a version (INV-001)',async()=>{
  const {engine,who,brand,ctx,question}=await setup();
  for(const module of NEW){
   const q=await question(module);
   const result=await engine.analyze(who.token,brand.id,q.id);
   expect(result.error,`${module}: DEMO analysis available`).toBeNull();
   expect(result.recommendation?.options.length).toBeGreaterThanOrEqual(2);
  }
  const c=await ctx();
  expect(c.decisions).toHaveLength(0);
  expect(c.versions).toHaveLength(0);
 });

 it('Phase 1: the strategic map and its PDF show all nine decisions, current versions only',async()=>{
  const {engine,who,brand,question,command}=await setup();
  for(const module of SPINE.slice(0,8)){
   const q=await question(module);
   await engine.prepareQuestion(who.token,brand.id,q.id,null);
   await engine.commitDecision(who.token,command(q.id,`DECISION-${module.replaceAll(' ','-').toUpperCase()}`,null));
  }
  const projection=await engine.blueprint(who.token,brand.id) as unknown as {questions:{module:string}[];decisions:unknown[]};
  expect(projection.questions.map(q=>q.module)).toEqual(SPINE);
  expect(projection.decisions).toHaveLength(8);
  const bytes=await buildBlueprintPdf({brand:{name:'Cierre Fase 1',isDemo:false,geographicInfluence:null,primaryMarket:null},context:projection as never,competitiveStatus:'Sin investigar',generatedAt:new Date()});
  const doc=await getDocument({data:bytes,useSystemFonts:true}).promise;let text='';
  for(let page=1;page<=doc.numPages;page++){const content=await (await doc.getPage(page)).getTextContent();text+=content.items.map(item=>('str' in item?item.str:'')).join(' ')+'\n';}
  for(const label of LABELS)expect(text,label).toContain(label);
  expect(text).toMatch(/8 de 9/);
  expect(text,'the undecided Priority Experiment is shown as not defined').toContain('Aún no definido');
  expect(text).toContain('DECISION-GTM-PRIORITY');
 });
}
