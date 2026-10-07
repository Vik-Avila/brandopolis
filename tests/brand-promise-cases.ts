import { it,expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { randomUUID } from 'node:crypto';
import { and,eq } from 'drizzle-orm';
import { Engine } from '../src/application/engine.js';
import { rules } from '../src/domain/contracts.js';
import { journey } from '../src/domain/modules.js';
import { seedIdentity } from '../scripts/seed.js';
import type { connect } from '../src/persistence/database.js';
import * as t from '../src/persistence/schema.js';

// Pure presentation projections, loaded like tests/brando-sections.test.ts does.
const views=runInNewContext(readFileSync('src/transport/public/product-views.js','utf8').replace(/export (?=const |function )/g,'')+'\n({reviewUpdates,reviewUpdatesHtml,brandoSectionOrientation});');

/** ADR-0022: Promesa de marca between Positioning and Core Message, inside the existing engine. */
export function brandPromiseCases(connection:()=>ReturnType<typeof connect>){
 const setup=async(withoutPromise=false)=>{
  const db=connection().db,engine=new Engine(db),who=await seedIdentity(db),brand=await engine.createBrand(who.token,'Promesa de marca');
  // A brand created under ADR-0021 (six sections, no Promise yet).
  if(withoutPromise)await db.delete(t.questions).where(and(eq(t.questions.brandId,brand.id),eq(t.questions.module,'Brand Promise')));
  const ctx=()=>engine.context(who.token,brand.id);
  const decisionOf=async(module:string)=>{const c=await ctx(),q=c.questions.find(q=>q.module===module)!;return {c,q,d:c.decisions.find(d=>d.questionId===q.id)};};
  const commit=async(module:string,text:string,reviewToken?:string)=>{
   const {q,d}=await decisionOf(module);
   await engine.prepareQuestion(who.token,brand.id,q.id,d?.activeVersionId??null);
   return engine.commitDecision(who.token,{brandId:brand.id,questionId:q.id,selectedOption:text,rationale:'Criterio humano registrado',expectedActiveVersion:d?.activeVersionId??null,sourceRecommendationId:null,idempotencyKey:randomUUID(),actorUserId:who.userId},reviewToken);
  };
  // Human review: a receipt for the pending reviews, then a human commit (here: keep the same text).
  const review=async(module:string,text:string)=>{const {d}=await decisionOf(module);const receipt=await engine.beginReview(who.token,brand.id,d!.id);return commit(module,text,receipt.reviewToken);};
  const id=async(module:string)=>(await decisionOf(module)).d!.id;
  const openFor=async(module:string)=>{const decisionId=await id(module);return (await ctx()).reviews.filter(r=>r.downstreamDecisionId===decisionId&&r.status!=='COMPLETED');};
  const active=async(module:string)=>{const {c,d}=await decisionOf(module);const v=c.versions.find(v=>v.id===d!.activeVersionId)!;return {id:v.id,sequence:v.sequence,selectedOption:v.selectedOption,rationale:v.rationale};};
  const strategy=async()=>{
   const read=async(table:typeof t.decisions|typeof t.versions|typeof t.reviews|typeof t.dependencies|typeof t.impacts)=>JSON.stringify((await db.select().from(table).where(eq(table.brandId,brand.id))).map(row=>JSON.stringify(row)).sort());
   return [await read(t.decisions),await read(t.versions),await read(t.reviews),await read(t.dependencies),await read(t.impacts)];
  };
  return {db,engine,who,brand,ctx,decisionOf,commit,review,id,openFor,active,strategy};
 };

 it('ADR-0022: Promise sits between Positioning and Message with the approved HARD edges',()=>{
  const order=journey.map(m=>m.primaryDecision);
  expect(order.indexOf('Brand Promise')).toBe(order.indexOf('Positioning')+1);
  expect(order.indexOf('Core Message')).toBe(order.indexOf('Brand Promise')+1);
  const edge=(up:string,down:string)=>rules.rules.filter(r=>r.upstream===up&&r.downstream===down).map(r=>[r.kind,r.ruleVersion,!!r.reviewOnFirstUpstreamVersion]);
  expect(edge('Positioning','Brand Promise')).toEqual([['HARD','v1',false]]);
  expect(edge('Brand Promise','Core Message')).toEqual([['HARD','v3',true]]);
  expect(edge('Positioning','Core Message'),'the direct Positioning → Message edge is kept').toEqual([['HARD','v1',false]]);
 });

 it('ADR-0022: an existing brand adds Promise only explicitly; its first version asks for review of the earlier Message',async()=>{
  const {engine,who,brand,ctx,commit,openFor,active,strategy}=await setup(true);
  await commit('Primary Customer','Agencias pequeñas');
  await commit('Positioning','Continuidad estratégica');
  await commit('Core Message','Decisiones conectadas');
  const before=await strategy();
  await ctx();
  expect((await ctx()).questions.some(q=>q.module==='Brand Promise'),'reading context never adds sections').toBe(false);
  expect(await engine.addStrategicSections(who.token,brand.id)).toEqual({brandId:brand.id,added:['Brand Promise']});
  expect((await ctx()).questions.map(q=>q.module).slice(-2)).toEqual(['Brand Promise','Core Message']);
  expect(await strategy(),'adding the section changes no decision, version, review, dependency or impact').toEqual(before);
  const message=await active('Core Message');
  const promise=await commit('Brand Promise','Tu estrategia recuerda por qué decidiste');
  const open=await openFor('Core Message');
  expect(open.map(r=>[r.triggerVersionId,r.dependencyType,r.status])).toEqual([[promise.versionId,'HARD','OPEN']]);
  expect(open[0].reason).toContain('Primera decisión humana');
  const c=await ctx();
  expect(c.decisions.find(d=>d.id===open[0].downstreamDecisionId)!.reviewStatus).toBe('NEEDS_REVIEW');
  expect(await active('Core Message'),'Message text and version are preserved').toEqual(message);
  expect(await openFor('Positioning')).toHaveLength(0);
 });

 it('ADR-0022: a first Promise version without a Message creates no impact',async()=>{
  const {ctx,commit}=await setup();
  await commit('Primary Customer','Agencias pequeñas');
  await commit('Positioning','Continuidad estratégica');
  const promise=await commit('Brand Promise','Tu estrategia recuerda por qué decidiste');
  const c=await ctx();
  expect(c.impacts.some(i=>i.triggerVersionId===promise.versionId)).toBe(false);
  expect(c.reviews).toHaveLength(0);
 });

 it('ADR-0022: Positioning → Promise → Message never duplicates Message reviews and never rewrites them',async()=>{
  const {ctx,commit,review,id,openFor,active}=await setup();
  await commit('Primary Customer','Agencias pequeñas');
  await commit('Positioning','Continuidad estratégica');
  await commit('Brand Promise','Tu estrategia recuerda por qué decidiste');
  await commit('Core Message','Decisiones conectadas');
  expect((await ctx()).reviews,'decided in order: nothing to review').toHaveLength(0);
  const message=await active('Core Message'),promise=await active('Brand Promise');
  const positioning=await commit('Positioning','Continuidad estratégica para equipos internos');
  expect((await openFor('Brand Promise')).map(r=>[r.triggerVersionId,r.dependencyType,r.status])).toEqual([[positioning.versionId,'HARD','OPEN']]);
  expect((await openFor('Core Message')).map(r=>[r.triggerVersionId,r.dependencyType,r.status])).toEqual([[positioning.versionId,'HARD','OPEN']]);
  expect(await active('Brand Promise')).toEqual(promise);
  // The human keeps the Promise: the change reaching Message through Promise is already pending there.
  const kept=await review('Brand Promise','Tu estrategia recuerda por qué decidiste');
  const c=await ctx();
  expect((await openFor('Core Message')).map(r=>r.triggerVersionId),'no duplicate Message review').toEqual([positioning.versionId]);
  const impact=c.impacts.find(i=>i.triggerVersionId===kept.versionId)!;
  expect(impact.status).toBe('COMPLETED');
  const affected=(impact.result as {affected:{downstreamDecisionId:string;reason:string}[]}).affected;
  expect(affected.find(a=>a.downstreamDecisionId===c.decisions.find(d=>d.questionId===c.questions.find(q=>q.module==='Core Message')!.id)!.id)!.reason).toContain('no se duplica');
  expect(c.decisions.find(d=>d.id===affected[0].downstreamDecisionId)!.reviewStatus).toBe('NEEDS_REVIEW');
  expect(await active('Core Message'),'Message is never rewritten').toEqual(message);
  // One human review of Message closes it; nothing stays pending.
  await review('Core Message','Decisiones conectadas para equipos internos');
  expect(await openFor('Core Message')).toHaveLength(0);
  const messageId=await id('Core Message');
  expect((await ctx()).decisions.find(d=>d.id===messageId)!.reviewStatus).toBe('APPROVED');
 });

 it('ADR-0022: once Message was reviewed, a later Promise change asks for a new Message review',async()=>{
  const {commit,review,openFor}=await setup();
  await commit('Primary Customer','Agencias pequeñas');
  await commit('Positioning','Continuidad estratégica');
  await commit('Brand Promise','Promesa inicial');
  await commit('Core Message','Mensaje inicial');
  await commit('Positioning','Posición nueva');
  await review('Core Message','Mensaje inicial');
  expect(await openFor('Core Message')).toHaveLength(0);
  const promise=await review('Brand Promise','Promesa ajustada a la posición nueva');
  expect((await openFor('Core Message')).map(r=>[r.triggerVersionId,r.dependencyType,r.status])).toEqual([[promise.versionId,'HARD','OPEN']]);
 });

 it('ADR-0022: a pending suggestion never hides a HARD review (frozen v1 flow unchanged)',async()=>{
  const {commit,review,openFor}=await setup();
  await commit('Primary Customer','Agencias pequeñas');
  await commit('Positioning','Continuidad estratégica');
  await commit('Core Message','Decisiones conectadas');
  const customer=await commit('Primary Customer','Equipos internos de marketing');
  expect((await openFor('Core Message')).map(r=>[r.triggerVersionId,r.dependencyType,r.status])).toEqual([[customer.versionId,'SOFT','REVIEW_SUGGESTED']]);
  const positioning=await review('Positioning','Continuidad estratégica para equipos internos');
  expect((await openFor('Core Message')).map(r=>[r.triggerVersionId,r.dependencyType,r.status]).sort()).toEqual([[customer.versionId,'SOFT','REVIEW_SUGGESTED'],[positioning.versionId,'HARD','OPEN']].sort());
 });

 it('ADR-0022: a Promise change folded into the pending Message review is shown with full context and forces a fresh human review',async()=>{
  const {engine,who,brand,ctx,decisionOf,commit,review,openFor,active}=await setup();
  await commit('Primary Customer','Agencias pequeñas');
  await commit('Positioning','Continuidad estratégica');
  const promiseV1=await commit('Brand Promise','Promesa inicial');
  await commit('Core Message','Mensaje inicial');
  const message=await active('Core Message');
  const positioning=await commit('Positioning','Continuidad estratégica para equipos internos');
  // The person opens the Message review before the Promise changes.
  const staleReceipt=await engine.beginReview(who.token,brand.id,(await decisionOf('Core Message')).d!.id);
  const promiseV2=await review('Brand Promise','Promesa ajustada a equipos internos');
  // Still exactly one pending Message review, originated by Positioning.
  expect((await openFor('Core Message')).map(r=>r.triggerVersionId)).toEqual([positioning.versionId]);
  const c=await ctx(),messageDecision=(await decisionOf('Core Message')).d!;
  // Full context: the projection lists the current Promise version (text, version, rationale) next to the Positioning origin.
  const updates=views.reviewUpdates(c,messageDecision);
  expect(updates.map((u:{module:string;sequence:number;choice:string;kind:string})=>[u.module,u.sequence,u.choice,u.kind])).toEqual([['Brand Promise',2,'Promesa ajustada a equipos internos','HARD']]);
  expect(views.reviewUpdatesHtml(updates)).toContain('Promesa ajustada a equipos internos');
  const orientation=views.brandoSectionOrientation(c,c.questions.find(q=>q.module==='Core Message')!.id);
  expect(orientation.changes.map((ch:{choice:string})=>ch.choice)).toEqual(['Continuidad estratégica para equipos internos','Promesa ajustada a equipos internos']);
  // Traceability: original versions and rationale stay readable; Message is not rewritten.
  expect(c.versions.find(v=>v.id===promiseV1.versionId)).toMatchObject({selectedOption:'Promesa inicial',versionStatus:'SUPERSEDED'});
  expect(c.versions.find(v=>v.id===promiseV2.versionId)).toMatchObject({previousVersionId:promiseV1.versionId,versionStatus:'APPROVED'});
  expect(await active('Core Message')).toEqual(message);
  // The receipt opened before the Promise changed no longer confirms anything: the human must reopen the review.
  await expect(commit('Core Message','Mensaje inicial',staleReceipt.reviewToken)).rejects.toMatchObject({code:'CONFLICT'});
  expect(await active('Core Message'),'a refused confirmation writes nothing').toEqual(message);
  await review('Core Message','Mensaje para equipos internos');
  expect(await openFor('Core Message')).toHaveLength(0);
  expect(views.reviewUpdates(await ctx(),(await decisionOf('Core Message')).d!)).toEqual([]);
 });
}
