import { it,expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { randomUUID } from 'node:crypto';
import { and,eq } from 'drizzle-orm';
import { Engine } from '../src/application/engine.js';
import { rules } from '../src/domain/contracts.js';
import { journey,learningMoments } from '../src/domain/modules.js';
import { seedIdentity } from '../scripts/seed.js';
import type { connect } from '../src/persistence/database.js';
import * as t from '../src/persistence/schema.js';

// Pure presentation projections, loaded like tests/brando-sections.test.ts does.
const views=runInNewContext(readFileSync('src/transport/public/product-views.js','utf8').replace(/export (?=const |function )/g,'')+'\n({brandoSectionOrientation});');

/** ADR-0023: Prioridad de lanzamiento (GTM Priority) as the last journey section, inside the existing engine. */
export function gtmCases(connection:()=>ReturnType<typeof connect>){
 const setup=async(withoutGtm=false)=>{
  const db=connection().db,engine=new Engine(db),who=await seedIdentity(db),brand=await engine.createBrand(who.token,'Prioridad de lanzamiento');
  // A brand created under ADR-0022 (seven sections, no GTM yet).
  if(withoutGtm)await db.delete(t.questions).where(and(eq(t.questions.brandId,brand.id),eq(t.questions.module,'GTM Priority')));
  const ctx=()=>engine.context(who.token,brand.id);
  const decisionOf=async(module:string)=>{const c=await ctx(),q=c.questions.find(q=>q.module===module)!;return {c,q,d:c.decisions.find(d=>d.questionId===q.id)};};
  const commit=async(module:string,text:string,reviewToken?:string)=>{
   const {q,d}=await decisionOf(module);
   await engine.prepareQuestion(who.token,brand.id,q.id,d?.activeVersionId??null);
   return engine.commitDecision(who.token,{brandId:brand.id,questionId:q.id,selectedOption:text,rationale:'Criterio humano registrado',expectedActiveVersion:d?.activeVersionId??null,sourceRecommendationId:null,idempotencyKey:randomUUID(),actorUserId:who.userId},reviewToken);
  };
  const openFor=async(module:string)=>{const {c,d}=await decisionOf(module);return c.reviews.filter(r=>r.downstreamDecisionId===d!.id&&r.status!=='COMPLETED');};
  const active=async(module:string)=>{const {c,d}=await decisionOf(module);const v=c.versions.find(v=>v.id===d!.activeVersionId)!;return {id:v.id,sequence:v.sequence,selectedOption:v.selectedOption,rationale:v.rationale};};
  const strategy=async()=>{
   const read=async(table:typeof t.decisions|typeof t.versions|typeof t.reviews|typeof t.dependencies|typeof t.impacts)=>JSON.stringify((await db.select().from(table).where(eq(table.brandId,brand.id))).map(row=>JSON.stringify(row)).sort());
   return [await read(t.decisions),await read(t.versions),await read(t.reviews),await read(t.dependencies),await read(t.impacts)];
  };
  return {db,engine,who,brand,ctx,decisionOf,commit,openFor,active,strategy};
 };

 it('ADR-0023: GTM precedes Priority Experiment, with SOFT edges from Positioning and Core Message',()=>{
  expect(journey.map(m=>m.primaryDecision).slice(-2)).toEqual(['GTM Priority','Priority Experiment']);
  expect(rules.rules.filter(r=>r.downstream==='GTM Priority').map(r=>[r.upstream,r.kind,r.ruleVersion])).toEqual([['Positioning','SOFT','v1'],['Core Message','SOFT','v4']]);
  expect(rules.rules.filter(r=>r.upstream==='GTM Priority').map(r=>[r.downstream,r.kind]),'only the approved SOFT edge to Priority Experiment (ADR-0024)').toEqual([['Priority Experiment','SOFT']]);
  expect(learningMoments['GTM Priority'].capability).toBe('GTM Prioritization');
 });

 it('ADR-0023: a new brand has GTM after Core Message; an existing brand adds it only explicitly',async()=>{
  expect((await (await setup()).ctx()).questions.map(q=>q.module).slice(-3)).toEqual(['Core Message','GTM Priority','Priority Experiment']);
  const {engine,who,brand,ctx,commit,strategy}=await setup(true);
  await commit('Primary Customer','Agencias pequeñas');
  await commit('Positioning','Continuidad estratégica');
  const before=await strategy();
  await ctx();
  expect((await ctx()).questions.some(q=>q.module==='GTM Priority'),'reading context never adds sections').toBe(false);
  expect(await engine.addStrategicSections(who.token,brand.id)).toEqual({brandId:brand.id,added:['GTM Priority']});
  const modules=(await ctx()).questions.map(q=>q.module);
  expect(modules.indexOf('GTM Priority')).toBe(modules.indexOf('Core Message')+1);
  expect(await strategy(),'adding the section changes no strategy').toEqual(before);
 });

 it('ADR-0023: a first GTM version creates no impact; a Positioning change suggests a GTM review without rewriting it',async()=>{
  const {engine,who,brand,ctx,decisionOf,commit,openFor,active}=await setup();
  await commit('Primary Customer','Agencias pequeñas');
  await commit('Positioning','Continuidad estratégica');
  const gtm=await commit('GTM Priority','Alianzas con dos asociaciones de agencias');
  const c=await ctx();
  expect(c.impacts.some(i=>i.triggerVersionId===gtm.versionId)).toBe(false);
  expect(c.reviews).toHaveLength(0);
  const before=await active('GTM Priority');
  const positioning=await commit('Positioning','Continuidad para equipos internos');
  expect((await openFor('GTM Priority')).map(r=>[r.triggerVersionId,r.dependencyType,r.status])).toEqual([[positioning.versionId,'SOFT','REVIEW_SUGGESTED']]);
  expect((await decisionOf('GTM Priority')).d!.reviewStatus,'SOFT never forces NEEDS_REVIEW').toBe('APPROVED');
  expect(await active('GTM Priority'),'GTM is never rewritten').toEqual(before);
  // Only a human commit with a receipt closes the suggested review.
  const receipt=await engine.beginReview(who.token,brand.id,(await decisionOf('GTM Priority')).d!.id);
  await commit('GTM Priority','Alianzas con dos asociaciones de agencias',receipt.reviewToken);
  expect(await openFor('GTM Priority')).toHaveLength(0);
 });

 it('ADR-0023: GTM orientation warns that proposals may be provisional while an upstream input awaits review',async()=>{
  const {ctx,commit}=await setup();
  await commit('Primary Customer','Agencias pequeñas');
  await commit('Positioning','Continuidad estratégica');
  await commit('Core Message','Decisiones conectadas');
  await commit('GTM Priority','Alianzas con dos asociaciones de agencias');
  let c=await ctx();
  const gtmId=c.questions.find(q=>q.module==='GTM Priority')!.id;
  expect(views.brandoSectionOrientation(c,gtmId).message).not.toContain('provisional');
  await commit('Primary Customer','Equipos internos de marketing');
  c=await ctx();
  const orientation=views.brandoSectionOrientation(c,gtmId);
  expect(orientation.message).toContain('Posicionamiento');
  expect(orientation.message).toContain('puede ser provisional');
 });

 it('ADR-0023: asking Brando about GTM never writes strategy',async()=>{
  const {engine,who,brand,ctx,commit}=await setup();
  await commit('Primary Customer','Agencias pequeñas');
  await commit('Positioning','Continuidad estratégica');
  const before=await ctx();
  const gtmId=before.questions.find(q=>q.module==='GTM Priority')!.id;
  const answer=await engine.askBrando(who.token,brand.id,'Ayúdame a explorar propuestas para Prioridad de lanzamiento.',gtmId);
  expect(answer.error).toBeNull();
  const after=await ctx();
  expect([after.decisions,after.versions,after.reviews,after.dependencies]).toEqual([before.decisions,before.versions,before.reviews,before.dependencies]);
 });

 it('ADR-0023: a Core Message change suggests a GTM review; the Positioning diamond never duplicates it',async()=>{
  const {engine,who,brand,decisionOf,commit,openFor,active}=await setup();
  await commit('Primary Customer','Agencias pequeñas');
  await commit('Positioning','Continuidad estratégica');
  await commit('Core Message','Decisiones conectadas');
  await commit('GTM Priority','Alianzas con dos asociaciones de agencias');
  const gtm=await active('GTM Priority');
  const message=await commit('Core Message','Decisiones conectadas para agencias');
  expect((await openFor('GTM Priority')).map(r=>[r.triggerVersionId,r.dependencyType,r.status])).toEqual([[message.versionId,'SOFT','REVIEW_SUGGESTED']]);
  expect((await decisionOf('GTM Priority')).d!.reviewStatus,'a suggestion never forces NEEDS_REVIEW').toBe('APPROVED');
  expect(await active('GTM Priority'),'a suggested review never rewrites GTM').toEqual(gtm);
  let receipt=await engine.beginReview(who.token,brand.id,(await decisionOf('GTM Priority')).d!.id);
  await commit('GTM Priority','Alianzas con dos asociaciones de agencias',receipt.reviewToken);
  // Positioning → Message (HARD) and Positioning → GTM (SOFT): reviewing Message folds into the pending GTM suggestion.
  const positioning=await commit('Positioning','Continuidad para equipos internos');
  expect((await openFor('GTM Priority')).map(r=>r.triggerVersionId)).toEqual([positioning.versionId]);
  receipt=await engine.beginReview(who.token,brand.id,(await decisionOf('Core Message')).d!.id);
  await commit('Core Message','Decisiones conectadas',receipt.reviewToken);
  expect((await openFor('GTM Priority')).map(r=>r.triggerVersionId),'no duplicate GTM review').toEqual([positioning.versionId]);
 });

 it('ADR-0023: a first Core Message version after GTM suggests a GTM review without rewriting it',async()=>{
  const {commit,openFor,active}=await setup();
  await commit('Primary Customer','Agencias pequeñas');
  await commit('Positioning','Continuidad estratégica');
  await commit('GTM Priority','Alianzas con dos asociaciones de agencias');
  const gtm=await active('GTM Priority');
  const message=await commit('Core Message','Decisiones conectadas');
  expect((await openFor('GTM Priority')).map(r=>[r.triggerVersionId,r.dependencyType,r.status])).toEqual([[message.versionId,'SOFT','REVIEW_SUGGESTED']]);
  expect(await active('GTM Priority')).toEqual(gtm);
 });
}
