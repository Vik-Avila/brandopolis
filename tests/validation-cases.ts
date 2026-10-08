import { it,expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { and,eq } from 'drizzle-orm';
import { Engine } from '../src/application/engine.js';
import { seedIdentity } from '../scripts/seed.js';
import type { connect } from '../src/persistence/database.js';
import * as t from '../src/persistence/schema.js';

/** ADR-0026: Validation & Learning Engine over the persisted Hypothesis → Experiment → Signal → Learning loop. */
export function validationCases(connection:()=>ReturnType<typeof connect>){
 const setup=async()=>{
  const db=connection().db,engine=new Engine(db),who=await seedIdentity(db),brand=await engine.createBrand(who.token,'Validación');
  const ctx=()=>engine.context(who.token,brand.id);
  const decisionOf=async(module:string)=>{const c=await ctx(),q=c.questions.find(q=>q.module===module)!;return {c,q,d:c.decisions.find(d=>d.questionId===q.id)};};
  const commit=async(module:string,text:string)=>{
   const {q,d}=await decisionOf(module);
   await engine.prepareQuestion(who.token,brand.id,q.id,d?.activeVersionId??null);
   return engine.commitDecision(who.token,{brandId:brand.id,questionId:q.id,selectedOption:text,rationale:'Criterio humano registrado',expectedActiveVersion:d?.activeVersionId??null,sourceRecommendationId:null,idempotencyKey:randomUUID(),actorUserId:who.userId});
  };
  const strategy=async()=>{
   const read=async(table:typeof t.decisions|typeof t.versions|typeof t.reviews|typeof t.dependencies)=>JSON.stringify((await db.select().from(table).where(eq(table.brandId,brand.id))).map(row=>JSON.stringify(row)).sort());
   return [await read(t.decisions),await read(t.versions),await read(t.reviews),await read(t.dependencies)];
  };
  const events=async(name:string)=>(await db.select().from(t.telemetry).where(eq(t.telemetry.brandId,brand.id))).filter(e=>(e.payload as {name:string}).name===name).length;
  // A full loop up to an ACCEPTED learning about the hypothesis behind the Priority Experiment.
  const loop=async(statement='Las agencias vuelven cada semana')=>{
   const hypothesis=await engine.captureContext(who.token,brand.id,'hypothesis',{statement});
   const priority=await commit('Priority Experiment','Validar primero el regreso semanal');
   const experiment=await engine.createLearningObject(who.token,brand.id,'experiment',{hypothesisId:hypothesis.id,intendedSignal:'Agencias que consultan su historial cada semana',method:'Seguimiento de uso consentido',disconfirmingCriteria:'Menos de dos agencias regresan en tres semanas'},priority.decisionId,{objective:'Comprobar el regreso semanal',successCriteria:'Tres de cinco agencias regresan'});
   await engine.transitionLearningObject(who.token,brand.id,'experiment',String(experiment.id),'PLANNED','RUNNING');
   const signal=await engine.createLearningObject(who.token,brand.id,'signal',{experimentId:experiment.id,observation:'Una agencia regresó',source:'Registro de uso consentido',observedAt:new Date().toISOString(),direction:'CONTRARY'});
   const learning=await engine.createLearningObject(who.token,brand.id,'learning',{signalIds:[signal.id],hypothesisId:hypothesis.id,interpretation:'El regreso semanal no se sostiene todavía',limitations:['Muestra pequeña'],supports:'Una agencia regresó',doesNotSupport:'Cuatro agencias no regresaron',alternativeExplanations:['Semana de vacaciones']});
   await engine.transitionLearningObject(who.token,brand.id,'learning',String(learning.id),'CANDIDATE','REVIEWED');
   await engine.transitionLearningObject(who.token,brand.id,'learning',String(learning.id),'REVIEWED','ACCEPTED','Coincide con lo observado');
   return {hypothesis,priority,experiment,signal,learning};
  };
  const review=(hypothesisId:unknown,expectedStatus:string,status:string,learningId:unknown=null,key=randomUUID(),rationale='Mi criterio')=>engine.reviewHypothesis(who.token,brand.id,{hypothesisId:String(hypothesisId),expectedStatus,status,rationale,learningId:learningId==null?null:String(learningId),idempotencyKey:key});
  return {db,engine,who,brand,ctx,decisionOf,commit,strategy,events,loop,review};
 };

 it('VAL-001/002/003: hypothesis transitions are human, audited, concurrency-safe, idempotent and require an accepted learning',async()=>{
  const {db,engine,who,brand,ctx,loop,review,events}=await setup();
  const {hypothesis,learning}=await loop();
  expect((await ctx()).hypotheses.find(h=>h.id===hypothesis.id)!.status,'starting an experiment never moves the hypothesis').toBe('UNTESTED');
  await expect(review(hypothesis.id,'UNTESTED','SUPPORTED',learning.id),'no skipping TESTING').rejects.toMatchObject({code:'CONFLICT'});
  await expect(review(hypothesis.id,'TESTING','TESTING'),'stale expected status').rejects.toMatchObject({code:'CONFLICT'});
  await expect(review(hypothesis.id,'UNTESTED','TESTING',null,randomUUID(),'   '),'rationale required').rejects.toMatchObject({code:'INVALID'});
  const key=randomUUID();
  const first=await review(hypothesis.id,'UNTESTED','TESTING',null,key);
  expect(await review(hypothesis.id,'UNTESTED','TESTING',null,key),'exact replay returns the same result').toEqual(first);
  await expect(review(hypothesis.id,'UNTESTED','TESTING',null,key,'Otro criterio'),'same key, different content').rejects.toMatchObject({code:'CONFLICT'});
  await expect(review(hypothesis.id,'TESTING','WEAKENED'),'an accepted learning is required').rejects.toMatchObject({code:'INVALID'});
  // A learning still pending human review can never resolve a hypothesis.
  const other=await engine.captureContext(who.token,brand.id,'hypothesis',{statement:'Otra hipótesis'});
  await review(other.id,'UNTESTED','TESTING');
  await expect(review(other.id,'TESTING','SUPPORTED',learning.id),'learning about another hypothesis').rejects.toMatchObject({code:'CONFLICT'});
  const foreign=await seedIdentity(db);
  await expect(engine.reviewHypothesis(foreign.token,brand.id,{hypothesisId:String(hypothesis.id),expectedStatus:'TESTING',status:'SUPPORTED',rationale:'x',learningId:String(learning.id),idempotencyKey:randomUUID()})).rejects.toMatchObject({code:'NOT_FOUND'});
  const result=await review(hypothesis.id,'TESTING','SUPPORTED',learning.id);
  expect(result).toMatchObject({hypothesis:{status:'SUPPORTED'},affectedDecisions:[],strategyChanged:false});
  await expect(review(hypothesis.id,'SUPPORTED','REJECTED',learning.id),'resolved states are final').rejects.toMatchObject({code:'CONFLICT'});
  const audits=(await db.select().from(t.audits).where(eq(t.audits.brandId,brand.id))).filter(a=>a.operation.startsWith('HYPOTHESIS_'));
  expect(audits.map(a=>a.operation).sort()).toEqual(['HYPOTHESIS_SUPPORTED','HYPOTHESIS_TESTING','HYPOTHESIS_TESTING']);
  expect(audits.every(a=>a.actorUserId===who.userId)).toBe(true);
  expect(await events('hypothesis_reviewed')).toBe(3);
  const view=(await ctx()).validation.hypotheses.find(h=>h.id===hypothesis.id)!;
  expect(view).toMatchObject({status:'SUPPORTED',acceptedLearningIds:[learning.id],lastReview:{status:'SUPPORTED',actorUserId:who.userId}});
  expect((await engine.practice(who.token)).some(p=>p.capability==='Experimentation & Learning')).toBe(true);
 });

 it('VAL-004/005: experiment plans carry disconfirming criteria, idempotent creation and deterministic plan quality',async()=>{
  const {engine,who,brand,ctx,commit,events}=await setup();
  const hypothesis=await engine.captureContext(who.token,brand.id,'hypothesis',{statement:'Las agencias pagan por continuidad'});
  const priority=await commit('Priority Experiment','Validar disposición a pagar');
  const key=randomUUID();
  const weak={hypothesisId:hypothesis.id,intendedSignal:'Creemos que les gusta'};
  const a=await engine.createLearningObject(who.token,brand.id,'experiment',weak,priority.decisionId,{objective:'Probar pago',successCriteria:'Probar pago'},key);
  const b=await engine.createLearningObject(who.token,brand.id,'experiment',weak,priority.decisionId,{objective:'Probar pago',successCriteria:'Probar pago'},key);
  expect(b.id,'same key returns the same experiment').toBe(a.id);
  await expect(engine.createLearningObject(who.token,brand.id,'experiment',{...weak,intendedSignal:'Otra'},priority.decisionId,{objective:'Probar pago',successCriteria:'Probar pago'},key)).rejects.toMatchObject({code:'CONFLICT'});
  const good=await engine.createLearningObject(who.token,brand.id,'experiment',{hypothesisId:hypothesis.id,intendedSignal:'Agencias que firman una carta de intención',method:'Entrevistas con propuesta de precio',disconfirmingCriteria:'Ninguna agencia acepta pagar',plannedPeriod:'Dos semanas',limitations:['Solo Xalapa']},priority.decisionId,{objective:'Comprobar disposición a pagar',successCriteria:'Dos cartas firmadas'});
  const c=await ctx();
  expect(c.experiments.filter(e=>e.hypothesisId===hypothesis.id)).toHaveLength(2);
  expect(c.validation.planQuality[String(a.id)]).toEqual({result:'REWORK',findings:['SIGNAL_NOT_OBSERVABLE','CIRCULAR_CRITERIA','NO_DISCONFIRMING_CRITERIA','NO_METHOD']});
  expect(c.validation.planQuality[String(good.id)]).toEqual({result:'READY',findings:[]});
  expect(await events('experiment_planned')).toBe(2);
  // A plan quality result is guidance: an imperfect plan can still be started by the person.
  await engine.transitionLearningObject(who.token,brand.id,'experiment',String(a.id),'PLANNED','RUNNING');
  expect(await events('experiment_started')).toBe(1);
  // INCONCLUSIVE is a legitimate outcome, also without signals.
  expect((await engine.transitionLearningObject(who.token,brand.id,'experiment',String(a.id),'RUNNING','INCONCLUSIVE')).status).toBe('INCONCLUSIVE');
  expect((await ctx()).validation.inconclusive).toEqual([a.id]);
  await expect(engine.createLearningObject(who.token,brand.id,'signal',{experimentId:good.id,observation:'x',source:'y',observedAt:new Date().toISOString(),direction:'SIDEWAYS'})).rejects.toMatchObject({code:'INVALID'});
 });

 it('VAL-006/007: learnings are editable only while pending, rejection needs a reason and next validation reviews learning first',async()=>{
  const {engine,who,brand,ctx,commit,events}=await setup();
  const hypothesis=await engine.captureContext(who.token,brand.id,'hypothesis',{statement:'Clientes recomiendan el servicio'});
  const priority=await commit('Priority Experiment','Validar recomendación');
  const experiment=await engine.createLearningObject(who.token,brand.id,'experiment',{hypothesisId:hypothesis.id,intendedSignal:'Clientes que refieren a otro cliente'},priority.decisionId,{objective:'Medir referidos',successCriteria:'Un referido por mes'});
  await engine.transitionLearningObject(who.token,brand.id,'experiment',String(experiment.id),'PLANNED','RUNNING');
  const signal=await engine.createLearningObject(who.token,brand.id,'signal',{experimentId:experiment.id,observation:'Un cliente refirió a otro',source:'Entrevista',observedAt:new Date().toISOString(),direction:'EXPECTED'});
  let c=await ctx();
  expect(c.validation.uninterpretedSignals).toEqual([signal.id]);
  expect(c.validation.signalBalance[String(experiment.id)]).toEqual({expected:1,contrary:0,ambiguous:0,unclassified:0});
  const learning=await engine.createLearningObject(who.token,brand.id,'learning',{signalIds:[signal.id],interpretation:'Hay recomendación',limitations:['Un caso']});
  expect(learning.origin).toBe('MANUAL');
  // Provenance is server-authoritative: a client-declared origin is ignored, assistance needs a real consult.
  const forged=await engine.createLearningObject(who.token,brand.id,'learning',{signalIds:[signal.id],interpretation:'Forjado',limitations:['x'],origin:'BRANDO_ASSISTED'});
  expect(forged.origin).toBe('MANUAL');
  const claimed=await engine.createLearningObject(who.token,brand.id,'learning',{signalIds:[signal.id],interpretation:'Sin consulta',limitations:['x'],brandoAssisted:true});
  expect(claimed.origin,'no Brando consult was recorded').toBe('MANUAL');
  await engine.askBrando(who.token,brand.id,'Ayúdame a interpretar',null);
  const assisted=await engine.createLearningObject(who.token,brand.id,'learning',{signalIds:[signal.id],interpretation:'Con consulta',limitations:['x'],brandoAssisted:true});
  expect(assisted.origin).toBe('BRANDO_ASSISTED');
  for(const id of [forged.id,claimed.id,assisted.id]){await engine.transitionLearningObject(who.token,brand.id,'learning',String(id),'CANDIDATE','REVIEWED');await engine.transitionLearningObject(who.token,brand.id,'learning',String(id),'REVIEWED','REJECTED','Prueba de procedencia');}
  c=await ctx();
  expect(c.validation.nextValidation[0],'review what you already learned first').toEqual({kind:'REVIEW_LEARNING',ref:learning.id,module:null});
  const revised=await engine.reviseLearning(who.token,brand.id,String(learning.id),'CANDIDATE',{interpretation:'Hay una recomendación aislada',alternativeExplanations:['Amistad previa']});
  expect(revised).toMatchObject({status:'CANDIDATE',interpretation:'Hay una recomendación aislada'});
  await expect(engine.reviseLearning(who.token,brand.id,String(learning.id),'CANDIDATE',{status:'ACCEPTED'}),'status is never edited').rejects.toMatchObject({code:'INVALID'});
  await expect(engine.reviseLearning(who.token,brand.id,String(learning.id),'REVIEWED',{interpretation:'x'})).rejects.toMatchObject({code:'CONFLICT'});
  await engine.transitionLearningObject(who.token,brand.id,'learning',String(learning.id),'CANDIDATE','REVIEWED');
  await expect(engine.transitionLearningObject(who.token,brand.id,'learning',String(learning.id),'REVIEWED','REJECTED'),'rejection needs a reason').rejects.toMatchObject({code:'INVALID'});
  await engine.transitionLearningObject(who.token,brand.id,'learning',String(learning.id),'REVIEWED','REJECTED','Es un caso de amistad');
  await expect(engine.reviseLearning(who.token,brand.id,String(learning.id),'REJECTED',{interpretation:'x'}),'decided learnings are history').rejects.toMatchObject({code:'CONFLICT'});
  expect([await events('learning_reviewed'),await events('learning_rejected'),await events('learning_accepted')]).toEqual([4,4,0]);
  c=await ctx();
  expect(c.validation.learningsAwaitingReview).toEqual([]);
 });

 it('VAL-008/009/010: weakened or rejected hypotheses raise deduplicated attention and never rewrite the decision',async()=>{
  const {ctx,decisionOf,commit,strategy,loop,review,events}=await setup();
  const {hypothesis,learning,priority}=await loop();
  await review(hypothesis.id,'UNTESTED','TESTING');
  let c=await ctx();
  expect(c.validation.nextValidation.map(n=>n.kind)).toContain('RESOLVE_HYPOTHESIS');
  const before=await strategy();
  const result=await review(hypothesis.id,'TESTING','WEAKENED',learning.id);
  expect(result.affectedDecisions).toEqual([{decisionId:priority.decisionId,module:'Priority Experiment'}]);
  expect(await strategy(),'no version, review, dependency or status is written').toEqual(before);
  c=await ctx();
  const issues=c.intelligence.issues.filter(i=>i.hypothesisRefs.includes(String(hypothesis.id)));
  expect(issues,'one attention item, not a second review engine').toHaveLength(1);
  expect(issues[0]).toMatchObject({kind:'VALIDATION_CHALLENGES_DECISION',severity:'REVIEW',modules:['Priority Experiment'],reviewFirst:'Priority Experiment'});
  expect(c.decisions.find(d=>d.id===priority.decisionId)!.reviewStatus).toBe('APPROVED');
  expect(c.validation.nextValidation).toContainEqual({kind:'REVIEW_AFFECTED_DECISION',ref:hypothesis.id,module:'Priority Experiment'});
  await ctx();
  expect((await ctx()).intelligence.issues.filter(i=>i.kind==='VALIDATION_CHALLENGES_DECISION'),'reading twice does not duplicate').toHaveLength(1);
  // The human reviews the decision: a new version clears the attention and records validation_impact_reviewed.
  await commit('Priority Experiment','Validar primero el valor del historial, no el regreso semanal');
  c=await ctx();
  expect(c.intelligence.issues.filter(i=>i.kind==='VALIDATION_CHALLENGES_DECISION')).toEqual([]);
  expect(await events('validation_impact_reviewed')).toBe(1);
  expect((await decisionOf('Priority Experiment')).c.versions.filter(v=>v.decisionId===priority.decisionId)).toHaveLength(2);
 });

 it('VAL-008: a rejected hypothesis is a conflict; a supported one creates no attention',async()=>{
  const {ctx,loop,review}=await setup();
  const {hypothesis,learning}=await loop();
  await review(hypothesis.id,'UNTESTED','TESTING');
  await review(hypothesis.id,'TESTING','REJECTED',learning.id);
  expect((await ctx()).intelligence.issues.find(i=>i.kind==='VALIDATION_CHALLENGES_DECISION')).toMatchObject({severity:'CONFLICT'});
  expect((await ctx()).intelligence.evaluatorResult).toBe('REVIEW_REQUIRED');
  const second=await setup();
  const loop2=await second.loop();
  await second.review(loop2.hypothesis.id,'UNTESTED','TESTING');
  await second.review(loop2.hypothesis.id,'TESTING','SUPPORTED',loop2.learning.id);
  expect((await second.ctx()).intelligence.issues.filter(i=>i.kind==='VALIDATION_CHALLENGES_DECISION')).toEqual([]);
 });

 it('VAL tenancy: another brand of the workspace never sees or resolves this validation loop',async()=>{
  const {db,engine,who,brand,loop}=await setup();
  const {hypothesis,learning}=await loop();
  const other=await engine.createBrand(who.token,'Otra marca');
  await expect(engine.reviewHypothesis(who.token,other.id,{hypothesisId:String(hypothesis.id),expectedStatus:'UNTESTED',status:'TESTING',rationale:'x',idempotencyKey:randomUUID()})).rejects.toMatchObject({code:'NOT_FOUND'});
  await expect(engine.reviseLearning(who.token,other.id,String(learning.id),'CANDIDATE',{interpretation:'x'})).rejects.toMatchObject({code:'NOT_FOUND'});
  expect((await engine.context(who.token,other.id)).validation.hypotheses).toEqual([]);
  const member=await seedIdentity(db,'MEMBER',who.workspaceId);
  await expect(engine.reviewHypothesis(member.token,brand.id,{hypothesisId:String(hypothesis.id),expectedStatus:'UNTESTED',status:'TESTING',rationale:'x',idempotencyKey:randomUUID()})).rejects.toMatchObject({code:'FORBIDDEN'});
  const rows=await db.select().from(t.hypotheses).where(and(eq(t.hypotheses.brandId,brand.id),eq(t.hypotheses.id,String(hypothesis.id))));
  expect(rows[0].payload.status).toBe('UNTESTED');
 });
}
