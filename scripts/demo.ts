import { readFileSync } from 'node:fs';
import { connect } from '../src/persistence/database.js';
import { Engine } from '../src/application/engine.js';
import { databaseUrl } from './local-db.js';
import { randomUUID } from 'node:crypto';
const {db,pool}=connect(databaseUrl());
try {
  const {token,userId}=JSON.parse(readFileSync('.local/demo-session.json','utf8'));
  const engine=new Engine(db),brand=await engine.createBrand(token,'Connected Decision Proof DEMO');
  let context=await engine.context(token,brand.id);
  const customer=context.questions.find(q=>q.module==='Primary Customer')!,position=context.questions.find(q=>q.module==='Positioning')!;
  async function commit(q:string,text:string,expected:string|null,reviewToken?:string) {
    const c=await engine.context(token,brand.id),current=c.questions.find(x=>x.id===q)!;
    if(current.status==='DECIDED') await engine.transitionQuestion(token,brand.id,q,'REOPENED');
    await engine.transitionQuestion(token,brand.id,q,'IN_ANALYSIS');await engine.transitionQuestion(token,brand.id,q,'READY_FOR_DECISION');
    return engine.commitDecision(token,{brandId:brand.id,questionId:q,selectedOption:text,rationale:'Revisión humana explícita de datos DEMO',expectedActiveVersion:expected,sourceRecommendationId:null,actorUserId:userId,idempotencyKey:randomUUID()},reviewToken);
  }
  const c1=await commit(customer.id,'Agencies',null);
  const p1=await commit(position.id,'Strategic OS for Agencies',null);
  await commit(customer.id,'Internal Marketing Teams',c1.versionId);
  context=await engine.context(token,brand.id);
  console.log(JSON.stringify({brandId:brand.id,history:context.versions,decisions:context.decisions,reviews:context.reviews},null,2));
  await engine.showImpact(token,brand.id);
  const review=await engine.beginReview(token,brand.id,p1.decisionId);
  await commit(position.id,'Strategic OS for Internal Marketing Teams',p1.versionId,review.reviewToken);
  const final=await new Engine(db).context(token,brand.id);
  console.log(JSON.stringify({finalDecisions:final.decisions,historyCount:final.versions.length,reviews:final.reviews},null,2));
} finally {await pool.end();}
