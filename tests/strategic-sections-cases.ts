import { it,expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { and,eq,inArray } from 'drizzle-orm';
import type { AddressInfo } from 'node:net';
import { Engine } from '../src/application/engine.js';
import { rules,reviewsOnFirstUpstreamVersion } from '../src/domain/contracts.js';
import { journey } from '../src/domain/modules.js';
import { seedIdentity } from '../scripts/seed.js';
import { createApp } from '../src/transport/http.js';
import type { connect } from '../src/persistence/database.js';
import * as t from '../src/persistence/schema.js';

const SPINE=['Strategic Objective','Market Arena','Primary Customer','Value Mechanism','Positioning','Core Message'];
const NEW_SECTIONS=['Strategic Objective','Market Arena'];

/** ADR-0021: Objetivo estratégico y Arena de mercado as versioned decisions inside the existing engine. */
export function strategicSectionsCases(connection:()=>ReturnType<typeof connect>){
 const setup=async(legacy=false)=>{
  const db=connection().db,engine=new Engine(db),who=await seedIdentity(db),brand=await engine.createBrand(who.token,'Objetivo y Arena');
  // A brand created before ADR-0021 carries only the four original sections.
  if(legacy)await db.delete(t.questions).where(and(eq(t.questions.brandId,brand.id),inArray(t.questions.module,NEW_SECTIONS)));
  const ctx=()=>engine.context(who.token,brand.id);
  const decisionOf=async(module:string)=>{const c=await ctx(),q=c.questions.find(q=>q.module===module)!;return {c,q,d:c.decisions.find(d=>d.questionId===q.id)};};
  const commit=async(module:string,text:string,reviewToken?:string)=>{
   const {q,d}=await decisionOf(module);
   await engine.prepareQuestion(who.token,brand.id,q.id,d?.activeVersionId??null);
   return engine.commitDecision(who.token,{brandId:brand.id,questionId:q.id,selectedOption:text,rationale:'Criterio humano registrado',expectedActiveVersion:d?.activeVersionId??null,sourceRecommendationId:null,idempotencyKey:randomUUID(),actorUserId:who.userId},reviewToken);
  };
  // Every strategic table except questions: activation must leave all of it byte-identical.
  const strategy=async()=>{
   const read=async(table:typeof t.decisions|typeof t.versions|typeof t.reviews|typeof t.dependencies|typeof t.impacts|typeof t.recommendations)=>JSON.stringify((await db.select().from(table).where(eq(table.brandId,brand.id))).map(row=>JSON.stringify(row)).sort());
   return {decisions:await read(t.decisions),versions:await read(t.versions),reviews:await read(t.reviews),dependencies:await read(t.dependencies),impacts:await read(t.impacts),recommendations:await read(t.recommendations)};
  };
  const activeVersions=async()=>{const c=await ctx();return c.decisions.map(d=>c.versions.find(v=>v.id===d.activeVersionId)).map(v=>v&&{id:v.id,decisionId:v.decisionId,sequence:v.sequence,selectedOption:v.selectedOption,rationale:v.rationale,versionStatus:v.versionStatus});};
  const sectionAudits=async()=>(await db.select().from(t.audits).where(and(eq(t.audits.brandId,brand.id),eq(t.audits.operation,'STRATEGIC_SECTIONS_ADDED')))).length;
  return {db,engine,who,brand,ctx,decisionOf,commit,strategy,activeVersions,sectionAudits};
 };

 it('ADR-0021: dependency config v2 is acyclic, keeps v1 rule versions and flags only the new rules',()=>{
  const modules=[...new Set(rules.rules.flatMap(r=>[r.upstream,r.downstream]))],order:string[]=[];
  const pending=new Set(modules);
  while(pending.size){
   const ready=[...pending].filter(m=>!rules.rules.some(r=>r.downstream===m&&pending.has(r.upstream)));
   expect(ready.length,'dependency cycle').toBeGreaterThan(0);
   for(const m of ready){pending.delete(m);order.push(m);}
  }
  for(let i=1;i<SPINE.length;i++)if(rules.rules.some(r=>r.upstream===SPINE[i-1]&&r.downstream===SPINE[i]))expect(order.indexOf(SPINE[i-1])).toBeLessThan(order.indexOf(SPINE[i]));
  expect(order.indexOf('Strategic Objective')).toBeLessThan(order.indexOf('Market Arena'));
  expect(order.indexOf('Market Arena')).toBeLessThan(order.indexOf('Primary Customer'));
  const legacy=rules.rules.filter(r=>!NEW_SECTIONS.includes(r.upstream));
  expect(legacy).toHaveLength(6);
  expect(legacy.every(r=>r.ruleVersion==='v1'&&!r.reviewOnFirstUpstreamVersion)).toBe(true);
  expect(rules.rules.filter(r=>NEW_SECTIONS.includes(r.upstream)).map(r=>[r.upstream,r.downstream,r.kind,r.ruleVersion])).toEqual([
   ['Strategic Objective','Market Arena','HARD','v2'],['Strategic Objective','Value Mechanism','SOFT','v2'],
   ['Market Arena','Primary Customer','HARD','v2'],['Market Arena','Positioning','SOFT','v2']]);
  expect(reviewsOnFirstUpstreamVersion('Market Arena','Primary Customer')).toBe(true);
  expect(reviewsOnFirstUpstreamVersion('Value Mechanism','Positioning')).toBe(false);
  expect(journey.map(m=>m.primaryDecision)).toEqual(SPINE);
 });

 it('ADR-0021: a new brand has the six journey sections, open, in Decision Spine order',async()=>{
  const {ctx}=await setup();
  const c=await ctx();
  expect(c.questions.map(q=>q.module)).toEqual(SPINE);
  expect(c.questions.every(q=>q.status==='OPEN')).toBe(true);
  expect(c.decisions).toHaveLength(0);
 });

 it('ADR-0021: reading context never adds sections; the explicit action adds them once and leaves strategy untouched',async()=>{
  const {db,engine,who,brand,ctx,commit,strategy,sectionAudits}=await setup(true);
  await commit('Primary Customer','Agencias pequeñas');
  await commit('Positioning','Continuidad estratégica');
  const before=await strategy();
  await ctx();await ctx();
  expect((await ctx()).questions.map(q=>q.module),'GET context is read-only').toEqual(['Primary Customer','Value Mechanism','Positioning','Core Message']);
  const first=await engine.addStrategicSections(who.token,brand.id);
  expect(first).toEqual({brandId:brand.id,added:NEW_SECTIONS});
  const after=await ctx();
  expect(after.questions.map(q=>q.module)).toEqual(SPINE);
  expect(after.questions.filter(q=>NEW_SECTIONS.includes(q.module)).every(q=>q.status==='OPEN')).toBe(true);
  expect(await strategy(),'no decision, version, review, dependency, impact or recommendation changes').toEqual(before);
  expect(await sectionAudits()).toBe(1);
  expect(await engine.addStrategicSections(who.token,brand.id)).toEqual({brandId:brand.id,added:[]});
  expect(await sectionAudits(),'a no-op is not audited twice').toBe(1);
  expect((await db.select().from(t.questions).where(eq(t.questions.brandId,brand.id)))).toHaveLength(6);
 });

 it('ADR-0021: concurrent activation creates each section exactly once',async()=>{
  const {db,engine,who,brand,sectionAudits}=await setup(true);
  const results=await Promise.all(Array.from({length:6},()=>engine.addStrategicSections(who.token,brand.id)));
  expect(results.flatMap(r=>r.added).sort()).toEqual([...NEW_SECTIONS].sort());
  const rows=await db.select().from(t.questions).where(eq(t.questions.brandId,brand.id));
  expect(rows).toHaveLength(6);
  expect(new Set(rows.map(r=>r.module)).size).toBe(6);
  expect(await sectionAudits()).toBe(1);
 });

 it('ADR-0021: activation is authorized per workspace, brand assignment and live session',async()=>{
  const {db,engine,who,brand}=await setup(true);
  const foreign=await seedIdentity(db),member=await seedIdentity(db,'MEMBER',who.workspaceId);
  await expect(engine.addStrategicSections(foreign.token,brand.id)).rejects.toMatchObject({code:'NOT_FOUND'});
  await expect(engine.addStrategicSections('invalid',brand.id)).rejects.toMatchObject({code:'UNAUTHORIZED'});
  await expect(engine.addStrategicSections(member.token,brand.id)).rejects.toMatchObject({code:'FORBIDDEN'});
  expect((await db.select().from(t.questions).where(eq(t.questions.brandId,brand.id)))).toHaveLength(4);
 });

 it('ADR-0021: the first Arena version asks for human review of earlier connected decisions without rewriting them',async()=>{
  const {engine,who,brand,ctx,decisionOf,commit,activeVersions}=await setup();
  await commit('Primary Customer','Agencias pequeñas');
  await commit('Value Mechanism','Suscripción por marca activa');
  await commit('Positioning','Continuidad estratégica');
  await commit('Core Message','Decisiones conectadas');
  const before=await activeVersions(),versionCount=(await ctx()).versions.length;
  const arena=await commit('Market Arena','Agencias pequeñas de LATAM frente a hojas de cálculo y consultoría');
  expect(arena.impactPending).toBe(false);
  const c=await ctx();
  const id=(module:string)=>c.decisions.find(d=>d.questionId===c.questions.find(q=>q.module===module)!.id)!.id;
  // Dependencies are synced in the commit, before the impact is computed, and never duplicated.
  const pairs=c.dependencies.map(e=>`${e.upstreamDecisionId}>${e.downstreamDecisionId}`);
  expect(new Set(pairs).size).toBe(pairs.length);
  expect(c.dependencies.filter(e=>e.upstreamDecisionId===id('Market Arena')).map(e=>[e.downstreamDecisionId,e.kind,e.ruleVersion]).sort()).toEqual([[id('Primary Customer'),'HARD','v2'],[id('Positioning'),'SOFT','v2']].sort());
  const fromArena=c.reviews.filter(r=>r.triggerVersionId===arena.versionId);
  expect(fromArena.map(r=>[r.downstreamDecisionId,r.dependencyType,r.status]).sort()).toEqual([[id('Primary Customer'),'HARD','OPEN'],[id('Positioning'),'SOFT','REVIEW_SUGGESTED']].sort());
  expect(fromArena.every(r=>r.reason.includes('Primera decisión humana')&&r.reason.includes('su contenido se conserva'))).toBe(true);
  expect(c.decisions.find(d=>d.id===id('Primary Customer'))!.reviewStatus).toBe('NEEDS_REVIEW');
  expect(c.decisions.find(d=>d.id===id('Positioning'))!.reviewStatus,'SOFT never forces NEEDS_REVIEW').toBe('APPROVED');
  expect(c.reviews.some(r=>[id('Value Mechanism'),id('Core Message')].includes(r.downstreamDecisionId)),'Arena has no edge to Value or Message').toBe(false);
  // INV-008: nothing downstream is rewritten; only the Arena version is new.
  expect((await activeVersions()).filter(v=>v&&v.id!==arena.versionId)).toEqual(before);
  expect(c.versions).toHaveLength(versionCount+1);
  expect(c.impacts.find(i=>i.triggerVersionId===arena.versionId)?.status).toBe('COMPLETED');
  // Retrying impact is idempotent: no duplicate open reviews.
  await engine.retryImpact(who.token,brand.id);
  expect((await ctx()).reviews).toHaveLength(c.reviews.length);
  // Only a human commit with a review receipt closes the review; the committed text is the human's.
  const customer=await decisionOf('Primary Customer');
  await expect(commit('Primary Customer','Agencias pequeñas')).rejects.toMatchObject({code:'CONFLICT'});
  const receipt=await engine.beginReview(who.token,brand.id,customer.d!.id);
  const kept=await commit('Primary Customer','Agencias pequeñas',receipt.reviewToken);
  const done=await ctx();
  expect(done.reviews.find(r=>r.triggerVersionId===arena.versionId&&r.downstreamDecisionId===id('Primary Customer'))!.status).toBe('COMPLETED');
  expect(done.versions.find(v=>v.id===kept.versionId)).toMatchObject({selectedOption:'Agencias pequeñas',sequence:2,previousVersionId:customer.d!.activeVersionId});
  expect(done.versions.find(v=>v.id===customer.d!.activeVersionId)!.versionStatus,'old version stays readable').toBe('SUPERSEDED');
  // The existing guided cascade continues from the human commit, still without rewriting Positioning.
  expect(done.reviews.some(r=>r.triggerVersionId===kept.versionId&&r.downstreamDecisionId===id('Positioning')&&r.dependencyType==='HARD'&&r.status==='OPEN')).toBe(true);
  expect(done.versions.find(v=>v.id===done.decisions.find(d=>d.id===id('Positioning'))!.activeVersionId)!.selectedOption).toBe('Continuidad estratégica');
 });

 it('ADR-0021: the first Objective version reviews Arena and Value only and never jumps an edge',async()=>{
  const {ctx,commit}=await setup();
  await commit('Market Arena','Agencias pequeñas de LATAM');
  await commit('Primary Customer','Agencias pequeñas');
  await commit('Value Mechanism','Suscripción por marca activa');
  const objective=await commit('Strategic Objective','Convertir decisiones dispersas en estrategia recordada');
  const c=await ctx();
  const id=(module:string)=>c.decisions.find(d=>d.questionId===c.questions.find(q=>q.module===module)!.id)!.id;
  expect(c.reviews.filter(r=>r.triggerVersionId===objective.versionId).map(r=>[r.downstreamDecisionId,r.dependencyType,r.status]).sort()).toEqual([[id('Market Arena'),'HARD','OPEN'],[id('Value Mechanism'),'SOFT','REVIEW_SUGGESTED']].sort());
  expect(c.decisions.find(d=>d.id===id('Market Arena'))!.reviewStatus).toBe('NEEDS_REVIEW');
  expect(c.decisions.find(d=>d.id===id('Primary Customer'))!.reviewStatus,'no automatic cascade beyond the direct edge').toBe('APPROVED');
  expect(c.reviews.some(r=>r.downstreamDecisionId===id('Primary Customer'))).toBe(false);
 });

 it('ADR-0021: frozen v1 rules keep their first-version semantics and a new brand decided in order has no reviews',async()=>{
  const {ctx,commit}=await setup();
  await commit('Primary Customer','Agencias pequeñas');
  await commit('Positioning','Continuidad estratégica');
  const value=await commit('Value Mechanism','Suscripción por marca activa');
  const c=await ctx();
  expect(c.impacts.some(i=>i.triggerVersionId===value.versionId),'a first Value version still creates no impact').toBe(false);
  expect(c.reviews).toHaveLength(0);
  const ordered=await setup();
  for(const [module,text] of [['Strategic Objective','Objetivo'],['Market Arena','Arena'],['Primary Customer','Cliente'],['Value Mechanism','Valor'],['Positioning','Posición'],['Core Message','Mensaje']])await ordered.commit(module,text);
  const done=await ordered.ctx();
  expect(done.reviews).toHaveLength(0);
  expect(done.decisions.every(d=>d.reviewStatus==='APPROVED')).toBe(true);
  // Objective→Arena, Objective→Value, Arena→Customer, Arena→Positioning and the four v1 edges among these sections.
  expect(done.dependencies).toHaveLength(8);
 });

 it('ADR-0021: an edge created under an older rule version is never duplicated by the v2 config',async()=>{
  const {db,brand,ctx,commit}=await setup(true);
  await commit('Primary Customer','Agencias pequeñas');
  await commit('Positioning','Continuidad estratégica');
  await db.update(t.dependencies).set({ruleVersion:'v1-legacy'}).where(eq(t.dependencies.brandId,brand.id));
  const change=await commit('Primary Customer','Equipos internos de marketing');
  const c=await ctx();
  expect(c.dependencies).toHaveLength(1);
  expect(c.reviews.filter(r=>r.triggerVersionId===change.versionId)).toHaveLength(1);
 });

 it('ADR-0021: the activation endpoint shares the same-origin and session gates',async()=>{
  const {engine,who,brand}=await setup(true);
  const server=createApp(engine);await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try{
   const login=await fetch(base+'/api/session',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({token:who.token})});
   const cookie=(login.headers.get('set-cookie')??'').split(';')[0];
   const post=(headers:Record<string,string>)=>fetch(base+'/api/brands/strategic-sections',{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify({brandId:brand.id})});
   expect((await post({Origin:'https://untrusted.example',Cookie:cookie})).status).toBe(403);
   expect((await post({Origin:base})).status).toBe(401);
   const ok=await post({Origin:base,Cookie:cookie});
   expect(ok.status).toBe(200);
   expect(await ok.json()).toEqual({brandId:brand.id,added:NEW_SECTIONS});
   expect((await engine.context(who.token,brand.id)).questions).toHaveLength(6);
  }finally{await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));}
 });
}
