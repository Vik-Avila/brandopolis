import { readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { connect } from '../src/persistence/database.js';
import { Engine } from '../src/application/engine.js';
import { databaseUrl } from './local-db.js';

// Explicitly invoked demonstration of human actions; no background strategic automation.
const {db,pool}=connect(databaseUrl());
try {
  const {token,userId}=JSON.parse(readFileSync('.local/demo-session.json','utf8'));
  const engine=new Engine(db),brand=await engine.createBrand(token,'Competition MVP · DEMO','Sistema de decisiones conectadas para equipos que gestionan marcas.');
  const initial=await engine.context(token,brand.id),question=(module:string)=>initial.questions.find(q=>q.module===module)!.id;
  async function commit(module:string,choice:string,expected:string|null,reviewToken?:string,sourceRecommendationId:string|null=null) {
    const questionId=question(module);await engine.prepareQuestion(token,brand.id,questionId,expected);
    return engine.commitDecision(token,{brandId:brand.id,questionId,selectedOption:choice,rationale:'Acto humano simulado y autorizado para esta demostración; no evidencia de negocio.',expectedActiveVersion:expected,sourceRecommendationId,actorUserId:userId,idempotencyKey:randomUUID()},reviewToken);
  }
  const rec=await engine.analyze(token,brand.id,question('Primary Customer'));assert(rec.recommendation);
  const customer=await commit('Primary Customer',rec.recommendation.options[0].label,null,undefined,rec.recommendation.id);
  await commit('Value Mechanism','Suscripción por marca activa',null);
  const position=await commit('Positioning','Continuidad estratégica para agencias',null);
  const message=await commit('Core Message','Decisiones conectadas, criterio compartido',null);
  await commit('Primary Customer','Equipos internos de marketing',customer.versionId);
  const impacted=await engine.blueprint(token,brand.id);assert.equal(impacted.decisions.find(d=>d.id===position.decisionId)?.reviewStatus,'NEEDS_REVIEW');
  assert.equal(impacted.versions.find(v=>v.id===position.versionId)?.selectedOption,'Continuidad estratégica para agencias');
  await engine.showImpact(token,brand.id);const review=await engine.beginReview(token,brand.id,position.decisionId);
  await commit('Positioning','Continuidad estratégica para equipos internos',position.versionId,review.reviewToken);
  const messageReview=await engine.beginReview(token,brand.id,message.decisionId);
  await commit('Core Message','Decisiones conectadas para tu equipo',message.versionId,messageReview.reviewToken);
  const h=await engine.captureContext(token,brand.id,'hypothesis',{statement:'El equipo volverá voluntariamente para revisar una decisión.'});
  const experiment=await engine.createLearningObject(token,brand.id,'experiment',{hypothesisId:h.id,intendedSignal:'Segunda revisión en siete días'},customer.decisionId,{objective:'Explorar recurrencia de uso',successCriteria:'Una segunda revisión voluntaria, documentando límites'});
  await engine.transitionLearningObject(token,brand.id,'experiment',String(experiment.id),'PLANNED','RUNNING');
  const signal=await engine.createLearningObject(token,brand.id,'signal',{experimentId:experiment.id,observation:'Un equipo ficticio volvió a revisar su decisión.',source:'Fixture DEMO; no observación de cliente real',observedAt:new Date().toISOString()});
  assert.equal((await engine.context(token,brand.id)).learnings.length,0);
  await engine.transitionLearningObject(token,brand.id,'experiment',String(experiment.id),'RUNNING','COMPLETED');
  const learning=await engine.createLearningObject(token,brand.id,'learning',{signalIds:[signal.id],interpretation:'La recurrencia es una hipótesis que merece validación con usuarios reales.',limitations:['Datos ficticios; no valida adopción, retención ni disposición a pagar.']});
  await engine.transitionLearningObject(token,brand.id,'learning',String(learning.id),'CANDIDATE','REVIEWED');
  await engine.transitionLearningObject(token,brand.id,'learning',String(learning.id),'REVIEWED','ACCEPTED');
  const final=await engine.blueprint(token,brand.id),packet=await engine.assembleContext(token,brand.id,question('Primary Customer'));
  assert.equal(final.decisions.length,4);assert.equal(final.versions.length,7);assert.equal(final.learnings[0].status,'ACCEPTED');assert(packet.items.some(i=>i.type==='Learning'));assert(final.reviews.every(r=>r.status==='COMPLETED'));
  const result={dataClass:'DEMO',brandId:brand.id,decisions:4,versions:7,acceptedLearnings:1,reviewStatus:'COMPLETED',url:`http://127.0.0.1:3000/?brand=${brand.id}&module=Primary%20Customer`};
  writeFileSync('.local/competition-demo.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
} finally {await pool.end();}
