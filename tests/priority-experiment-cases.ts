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

/** ADR-0024: Experimento prioritario as the last journey decision, executed through the existing learning loop. */
export function priorityExperimentCases(connection:()=>ReturnType<typeof connect>){
 const setup=async(withoutExperiment=false)=>{
  const db=connection().db,engine=new Engine(db),who=await seedIdentity(db),brand=await engine.createBrand(who.token,'Experimento prioritario');
  // A brand created under ADR-0023 (eight sections, no Priority Experiment yet).
  if(withoutExperiment)await db.delete(t.questions).where(and(eq(t.questions.brandId,brand.id),eq(t.questions.module,'Priority Experiment')));
  const ctx=()=>engine.context(who.token,brand.id);
  const decisionOf=async(module:string)=>{const c=await ctx(),q=c.questions.find(q=>q.module===module)!;return {c,q,d:c.decisions.find(d=>d.questionId===q.id)};};
  const commit=async(module:string,text:string,reviewToken?:string)=>{
   const {q,d}=await decisionOf(module);
   await engine.prepareQuestion(who.token,brand.id,q.id,d?.activeVersionId??null);
   return engine.commitDecision(who.token,{brandId:brand.id,questionId:q.id,selectedOption:text,rationale:'Criterio humano registrado',expectedActiveVersion:d?.activeVersionId??null,sourceRecommendationId:null,idempotencyKey:randomUUID(),actorUserId:who.userId},reviewToken);
  };
  const review=async(module:string,text:string)=>{const {d}=await decisionOf(module);const receipt=await engine.beginReview(who.token,brand.id,d!.id);return commit(module,text,receipt.reviewToken);};
  const openFor=async(module:string)=>{const {c,d}=await decisionOf(module);return c.reviews.filter(r=>r.downstreamDecisionId===d!.id&&r.status!=='COMPLETED');};
  const active=async(module:string)=>{const {c,d}=await decisionOf(module);const v=c.versions.find(v=>v.id===d!.activeVersionId)!;return {id:v.id,sequence:v.sequence,selectedOption:v.selectedOption,rationale:v.rationale};};
  const strategy=async()=>{
   const read=async(table:typeof t.decisions|typeof t.versions|typeof t.reviews|typeof t.dependencies|typeof t.impacts)=>JSON.stringify((await db.select().from(table).where(eq(table.brandId,brand.id))).map(row=>JSON.stringify(row)).sort());
   return [await read(t.decisions),await read(t.versions),await read(t.reviews),await read(t.dependencies),await read(t.impacts)];
  };
  return {db,engine,who,brand,ctx,decisionOf,commit,review,openFor,active,strategy};
 };

 it('ADR-0024: Priority Experiment closes the journey with the approved SOFT edge from GTM',()=>{
  expect(journey.map(m=>m.primaryDecision).at(-1)).toBe('Priority Experiment');
  expect(journey).toHaveLength(9);
  expect(rules.rules.filter(r=>r.upstream==='Priority Experiment'||r.downstream==='Priority Experiment').map(r=>[r.upstream,r.downstream,r.kind,r.ruleVersion])).toEqual([['GTM Priority','Priority Experiment','SOFT','v5']]);
  expect(learningMoments['Priority Experiment'].capability).toBe('Experimentation & Learning');
 });

 it('ADR-0024: a new brand has nine sections; an existing brand adds Priority Experiment only explicitly',async()=>{
  expect((await (await setup()).ctx()).questions.map(q=>q.module).at(-1)).toBe('Priority Experiment');
  const {engine,who,brand,ctx,commit,strategy}=await setup(true);
  await commit('Primary Customer','Agencias pequeñas');
  const before=await strategy();
  await ctx();
  expect((await ctx()).questions.some(q=>q.module==='Priority Experiment'),'reading context never adds sections').toBe(false);
  expect(await engine.addStrategicSections(who.token,brand.id)).toEqual({brandId:brand.id,added:['Priority Experiment']});
  expect((await ctx()).questions.at(-1)!.module).toBe('Priority Experiment');
  expect(await strategy(),'adding the section changes no strategy').toEqual(before);
 });

 it('ADR-0024: the decision is executed through the existing loop; signals never become learning or change strategy on their own',async()=>{
  const {engine,who,brand,ctx,decisionOf,commit,active}=await setup();
  await commit('Primary Customer','Agencias pequeñas');
  const hypothesis=await engine.captureContext(who.token,brand.id,'hypothesis',{statement:'Las agencias volverán a consultar el porqué de sus decisiones'});
  const priority=await commit('Priority Experiment','Validar primero si las agencias vuelven cada semana a consultar sus decisiones');
  let c=await ctx();
  expect(c.impacts.some(i=>i.triggerVersionId===priority.versionId),'no dependency, no impact').toBe(false);
  expect(c.reviews).toHaveLength(0);
  const decision=(await decisionOf('Priority Experiment')).d!;
  const before=await active('Priority Experiment');
  // The operational experiment links to the Priority Experiment decision through the existing loop.
  const experiment=await engine.createLearningObject(who.token,brand.id,'experiment',{hypothesisId:hypothesis.id,intendedSignal:'Consultas semanales al historial'},decision.id,{objective:'Comprobar el regreso semanal',successCriteria:'Tres de cinco agencias regresan'});
  await engine.transitionLearningObject(who.token,brand.id,'experiment',String(experiment.id),'PLANNED','RUNNING');
  const signal=await engine.createLearningObject(who.token,brand.id,'signal',{experimentId:experiment.id,observation:'Dos agencias regresaron',source:'Registro de uso consentido',observedAt:new Date().toISOString()});
  const learning=await engine.createLearningObject(who.token,brand.id,'learning',{signalIds:[signal.id],interpretation:'Interés recurrente parcial',limitations:['Muestra pequeña']});
  c=await ctx();
  expect(c.experimentPlans.find(p=>p.experimentId===experiment.id)!.decisionId).toBe(decision.id);
  expect(learning.status,'learning starts as a candidate that needs human review').toBe('CANDIDATE');
  expect(c.learnings.every(l=>l.status!=='ACCEPTED')).toBe(true);
  expect(c.hypotheses.find(h=>h.id===hypothesis.id)!.status,'no automatic hypothesis update').toBe('UNTESTED');
  expect(await active('Priority Experiment'),'the strategic decision is never rewritten by the loop').toEqual(before);
  expect(c.reviews).toHaveLength(0);
 });

 it('ADR-0024: orientation names unvalidated hypotheses and points execution to the human-reviewed loop',async()=>{
  const {engine,who,brand,ctx,commit}=await setup();
  let c=await ctx();
  const qid=c.questions.find(q=>q.module==='Priority Experiment')!.id;
  expect(views.brandoSectionOrientation(c,qid).message).toContain('Aún no hay hipótesis registradas');
  await engine.captureContext(who.token,brand.id,'hypothesis',{statement:'Las agencias pagarían por conservar el porqué'});
  await engine.captureContext(who.token,brand.id,'hypothesis',{statement:'Los equipos vuelven cada semana'});
  c=await ctx();
  expect(views.brandoSectionOrientation(c,qid).message).toContain('Hay 2 hipótesis sin validar');
  expect(views.brandoSectionOrientation(c,qid).message).not.toContain('Experimentos y aprendizajes');
  await commit('Priority Experiment','Validar primero si los equipos vuelven cada semana');
  c=await ctx();
  const orientation=views.brandoSectionOrientation(c,qid);
  expect(orientation.message).toContain('Experimentos y aprendizajes');
  expect(orientation.message).toContain('una señal no es aprendizaje hasta que la revises');
 });

 it('ADR-0024: asking Brando about Priority Experiment never writes strategy or learning',async()=>{
  const {engine,who,brand,ctx,commit}=await setup();
  await commit('Primary Customer','Agencias pequeñas');
  const before=await ctx();
  const qid=before.questions.find(q=>q.module==='Priority Experiment')!.id;
  const answer=await engine.askBrando(who.token,brand.id,'Ayúdame a explorar propuestas para Experimento prioritario.',qid);
  expect(answer.error).toBeNull();
  const after=await ctx();
  expect([after.decisions,after.versions,after.reviews,after.learnings,after.experiments,after.hypotheses]).toEqual([before.decisions,before.versions,before.reviews,before.learnings,before.experiments,before.hypotheses]);
 });

 it('ADR-0024: a GTM change suggests reviewing Priority Experiment and keeps its decision and history intact',async()=>{
  const {ctx,decisionOf,commit,review,openFor,active}=await setup();
  await commit('Primary Customer','Agencias pequeñas');
  await commit('Positioning','Continuidad estratégica');
  await commit('GTM Priority','Alianzas con asociaciones de agencias');
  const first=await commit('Priority Experiment','Validar primero si las agencias regresan cada semana');
  const second=await commit('Priority Experiment','Validar primero si las agencias pagarían por conservar el porqué');
  const experimentId=(await decisionOf('Priority Experiment')).d!.id;
  const before=await active('Priority Experiment'),history=(await ctx()).versions.filter(v=>v.decisionId===experimentId);
  const gtm=await commit('GTM Priority','Contenido educativo para estrategas de agencias');
  // 1. The GTM change suggests a review of Priority Experiment.
  expect((await openFor('Priority Experiment')).map(r=>[r.triggerVersionId,r.dependencyType,r.status])).toEqual([[gtm.versionId,'SOFT','REVIEW_SUGGESTED']]);
  // 2. The suggestion neither rewrites nor approves anything: same active version, same history, still APPROVED.
  const c=await ctx(),decision=(await decisionOf('Priority Experiment')).d!;
  expect(decision.reviewStatus,'a suggestion never forces NEEDS_REVIEW').toBe('APPROVED');
  expect(await active('Priority Experiment')).toEqual(before);
  expect(c.versions.filter(v=>v.decisionId===decision.id)).toEqual(history);
  expect(c.versions.find(v=>v.id===first.versionId)).toMatchObject({versionStatus:'SUPERSEDED',selectedOption:'Validar primero si las agencias regresan cada semana'});
  expect(decision.activeVersionId).toBe(second.versionId);
  // Only a human commit with a receipt completes it.
  await expect(commit('Priority Experiment','Validar primero si las agencias pagarían por conservar el porqué')).rejects.toMatchObject({code:'CONFLICT'});
  await review('Priority Experiment','Validar primero si las agencias pagarían por conservar el porqué');
  expect(await openFor('Priority Experiment')).toHaveLength(0);
 });

 it('ADR-0024: impact arriving through more than one connection never duplicates reviews',async()=>{
  const {engine,who,brand,ctx,commit,review,openFor}=await setup();
  await commit('Primary Customer','Agencias pequeñas');
  await commit('Positioning','Continuidad estratégica');
  await commit('Core Message','Decisiones conectadas');
  await commit('GTM Priority','Alianzas con asociaciones de agencias');
  await commit('Priority Experiment','Validar primero si las agencias regresan cada semana');
  // Positioning reaches GTM directly (SOFT) and through Core Message (HARD then SOFT).
  const positioning=await commit('Positioning','Continuidad para equipos internos');
  expect((await openFor('GTM Priority')).map(r=>r.triggerVersionId)).toEqual([positioning.versionId]);
  expect(await openFor('Priority Experiment'),'impact never jumps an edge').toHaveLength(0);
  await review('Core Message','Decisiones conectadas');
  expect((await openFor('GTM Priority')).map(r=>r.triggerVersionId),'no duplicate GTM review via Core Message').toEqual([positioning.versionId]);
  // The human review of GTM creates exactly one Priority Experiment suggestion; retrying impact adds nothing.
  const gtm=await review('GTM Priority','Alianzas con asociaciones de agencias');
  expect((await openFor('Priority Experiment')).map(r=>[r.triggerVersionId,r.dependencyType,r.status])).toEqual([[gtm.versionId,'SOFT','REVIEW_SUGGESTED']]);
  const count=(await ctx()).reviews.length;
  await engine.retryImpact(who.token,brand.id);
  expect((await ctx()).reviews).toHaveLength(count);
  expect(await openFor('Priority Experiment')).toHaveLength(1);
 });

 it('ADR-0024: a first GTM version after Priority Experiment suggests a review without rewriting it',async()=>{
  const {commit,openFor,active}=await setup();
  await commit('Primary Customer','Agencias pequeñas');
  await commit('Priority Experiment','Validar primero si las agencias regresan cada semana');
  const before=await active('Priority Experiment');
  const gtm=await commit('GTM Priority','Alianzas con asociaciones de agencias');
  expect((await openFor('Priority Experiment')).map(r=>[r.triggerVersionId,r.dependencyType,r.status])).toEqual([[gtm.versionId,'SOFT','REVIEW_SUGGESTED']]);
  expect(await active('Priority Experiment')).toEqual(before);
 });
}
