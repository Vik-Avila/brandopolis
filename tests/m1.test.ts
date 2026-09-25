import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { readFileSync, mkdirSync, writeFileSync, copyFileSync } from 'node:fs';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { eq } from 'drizzle-orm';
import { startLocalDb,stopLocalDb } from '../scripts/local-db.js';
import { migrateDatabase } from '../scripts/migrate.js';
import { seedIdentity } from '../scripts/seed.js';
import { connect } from '../src/persistence/database.js';
import { Engine, hash } from '../src/application/engine.js';
import { schema,validate,transition,reviewOrder, type CommitCommand } from '../src/domain/contracts.js';
import { createApp,cookieMaxAge } from '../src/transport/http.js';
import type { AddressInfo } from 'node:net';
import * as t from '../src/persistence/schema.js';
import { ModelGateway, DemoProvider } from '../src/domain/analysis.js';
import { assemble } from '../src/domain/context-assembler.js';
import { readiness,migrationsReadyMessage } from '../src/persistence/readiness.js';
import { competitionProfile,ensureDemoSession } from '../scripts/competition-environment.js';
import { pilotCases } from './pilot-cases.js';
let local:Awaited<ReturnType<typeof startLocalDb>>,connection:ReturnType<typeof connect>,engine:Engine;
pilotCases(()=>connection);
beforeAll(async()=>{
  local=await startLocalDb(true);
  const name=`m1_${randomUUID().replaceAll('-','')}`;
  await local.db.createDatabase(name);
  connection=connect(local.url.replace(/\/postgres$/,`/${name}`));
  await migrateDatabase(connection.db);
  await migrateDatabase(connection.db); // replay must be harmless
  engine=new Engine(connection.db);
});
afterAll(async()=>{await connection?.pool.end();if(local)await stopLocalDb(local);});
async function setup(target=engine) {
  const who=await seedIdentity(connection.db),brand=await target.createBrand(who.token,'M1 DEMO');
  const ctx=await target.context(who.token,brand.id);
  const customer=ctx.questions.find(q=>q.module==='Primary Customer')!,position=ctx.questions.find(q=>q.module==='Positioning')!;
  async function ready(questionId:string) {
    const q=(await target.context(who.token,brand.id)).questions.find(q=>q.id===questionId)!;
    if(q.status==='DECIDED') await target.transitionQuestion(who.token,brand.id,questionId,'REOPENED');
    if(q.status==='OPEN'||q.status==='DECIDED'||q.status==='REOPENED') await target.transitionQuestion(who.token,brand.id,questionId,'IN_ANALYSIS');
    if(q.status!=='READY_FOR_DECISION') await target.transitionQuestion(who.token,brand.id,questionId,'READY_FOR_DECISION');
  }
  function command(questionId:string,selectedOption:string,expectedActiveVersion:string|null):CommitCommand {return {brandId:brand.id,questionId,selectedOption,rationale:'Human DEMO rationale',expectedActiveVersion,sourceRecommendationId:null,actorUserId:who.userId,idempotencyKey:randomUUID()};}
  async function commit(questionId:string,text:string,expected:string|null,reviewToken?:string) {await ready(questionId);return target.commitDecision(who.token,command(questionId,text,expected),reviewToken);}
  return {who,brand,customer,position,ready,command,commit,context:()=>target.context(who.token,brand.id)};
}
describe('PostgreSQL M1',()=>{
  it('F-1: readiness PASS message derives the migration count from the journal',()=>{
    const journal=JSON.parse(readFileSync('drizzle/meta/_journal.json','utf8')).entries.length;
    expect(journal).toBeGreaterThan(0);
    expect(migrationsReadyMessage()).toBe(`PASS PostgreSQL reachable y ${journal} migraciones coincidentes.`);
  });
  it('F-2: session cookie Max-Age follows the remaining server-side session and never outlives it',async()=>{
    const now=Date.now();
    expect(cookieMaxAge(new Date(now+86400000),now)).toBe(86400);
    expect(cookieMaxAge(new Date(now+90500),now)).toBe(90);
    expect(cookieMaxAge(new Date(now+400),now)).toBe(0);
    expect(cookieMaxAge(new Date(now-5000),now)).toBe(0);
    const active=await seedIdentity(connection.db),short=await seedIdentity(connection.db),expired=await seedIdentity(connection.db);
    await connection.db.update(t.sessions).set({expiresAt:new Date(Date.now()+120000)}).where(eq(t.sessions.tokenHash,hash(short.token)));
    await connection.db.update(t.sessions).set({expiresAt:new Date(Date.now()-1000)}).where(eq(t.sessions.tokenHash,hash(expired.token)));
    const server=createApp(engine);await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
    const base=`http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const login=(token:string)=>fetch(base+'/api/session',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({token})});
    const maxAge=(r:Response)=>Number(/Max-Age=(\d+)/.exec(r.headers.get('set-cookie')??'')?.[1]);
    try {
      const a=await login(active.token);expect(a.status).toBe(200);
      expect(a.headers.get('set-cookie')).toMatch(/^brandopolis_session=[^;]+; HttpOnly; SameSite=Strict; Path=\/; Max-Age=\d+$/);
      expect(maxAge(a)).toBeGreaterThan(86000);expect(maxAge(a)).toBeLessThanOrEqual(86400);
      const b=await login(short.token);expect(b.status).toBe(200);expect(maxAge(b)).toBeGreaterThan(100);expect(maxAge(b)).toBeLessThanOrEqual(120);
      const c=await login(expired.token);expect(c.status).toBe(401);expect(c.headers.get('set-cookie')).toBeNull();
      const foreign=await fetch(base+'/api/session',{method:'POST',headers:{Origin:'https://untrusted.example','Content-Type':'application/json'},body:JSON.stringify({token:active.token})});
      expect(foreign.status).toBe(403);expect(foreign.headers.get('set-cookie')).toBeNull();
    } finally {await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));}
  });
  it('F-4: lost response on a review commit replays the same result without new side effects',async()=>{
    const s=await setup(),c1=await s.commit(s.customer.id,'Agencies',null),p1=await s.commit(s.position.id,'Strategic OS for Agencies',null);
    const c2=await s.commit(s.customer.id,'Internal Marketing Teams',c1.versionId);
    const receipt=await engine.beginReview(s.who.token,s.brand.id,p1.decisionId);await s.ready(s.position.id);
    const command=s.command(s.position.id,'Strategic OS for Internal Marketing Teams',p1.versionId);
    const first=await engine.commitDecision(s.who.token,command,receipt.reviewToken);
    const before=await s.context(),telemetryBefore=(await connection.db.select().from(t.telemetry).where(eq(t.telemetry.brandId,s.brand.id))).length;
    const retry=await engine.commitDecision(s.who.token,command,receipt.reviewToken);
    expect(retry).toEqual(first);
    const after=await s.context();
    expect(after.versions).toEqual(before.versions);expect(after.versions).toHaveLength(4);
    expect(after.versions.filter(v=>v.decisionId===p1.decisionId).map(v=>[v.id,v.versionStatus])).toEqual([[p1.versionId,'SUPERSEDED'],[first.versionId,'APPROVED']]);
    expect(after.decisions.find(d=>d.id===p1.decisionId)).toMatchObject({activeVersionId:first.versionId,reviewStatus:'APPROVED'});
    expect(after.audit.filter(a=>a.idempotencyKey===command.idempotencyKey)).toHaveLength(1);
    expect(after.audit).toHaveLength(before.audit.length);
    expect(after.reviews).toEqual(before.reviews);expect(after.reviews).toMatchObject([{triggerVersionId:c2.versionId,status:'COMPLETED',reviewedBy:s.who.userId}]);
    expect(after.impacts).toEqual(before.impacts);
    expect((await connection.db.select().from(t.telemetry).where(eq(t.telemetry.brandId,s.brand.id))).length).toBe(telemetryBefore);
  });
  it('RC readiness is minimal and expired local demo sessions retain their identity without escalation',async()=>{
    expect(await readiness(connection.pool)).toBe('READY');
    const server=createApp(engine,undefined,()=>readiness(connection.pool));await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
    try {const response=await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/health`);expect(response.status).toBe(200);expect(await response.json()).toEqual({application:'brandopolis-competition',protocol:'rc1',status:'ready'});}finally{await new Promise<void>(r=>server.close(()=>r()));}
    const folder=`.local/session-fixtures/${randomUUID()}`,profile={...competitionProfile(),root:folder,sessionFile:`${folder}/session.json`};
    const first=await ensureDemoSession(connection.db,profile);await connection.db.update(t.sessions).set({expiresAt:new Date(0)}).where(eq(t.sessions.tokenHash,hash(first.token)));
    const renewed=await ensureDemoSession(connection.db,profile);expect(renewed.userId).toBe(first.userId);expect(renewed.workspaceId).toBe(first.workspaceId);expect(renewed.token).not.toBe(first.token);expect((await engine.me(renewed.token)).userId).toBe(first.userId);
    await connection.db.update(t.memberships).set({active:false}).where(eq(t.memberships.userId,first.userId));await expect(ensureDemoSession(connection.db,profile)).rejects.toThrow('No se elevarán privilegios');
    const unavailable=createApp(engine,undefined,async()=>{return 'DATABASE_UNAVAILABLE';});await new Promise<void>(r=>unavailable.listen(0,'127.0.0.1',r));
    try {const response=await fetch(`http://127.0.0.1:${(unavailable.address() as AddressInfo).port}/health`);expect(response.status).toBe(503);expect(await response.json()).toEqual({application:'brandopolis-competition',protocol:'rc1',status:'unavailable'});}finally{await new Promise<void>(r=>unavailable.close(()=>r()));}
  });
  it('context budgets reserve accepted learning before optional facts',()=>{
    const required={id:'accepted',type:'Learning',critical:true,data:{interpretation:'Human accepted'},trust:'HUMAN_ACCEPTED'};
    const optional={id:'optional',type:'Evidence',critical:false,data:'x'.repeat(300),trust:'UNTRUSTED_EXTERNAL'};
    const packet=assemble('v1',{},[],[],[optional,required],300);
    expect(packet.includedIds).toEqual(['accepted']);expect(packet.omitted).toEqual([{id:'optional',reason:'CHARACTER_BUDGET'}]);
    expect(()=>assemble('v1',{},[],[],[{...required,data:'x'.repeat(500)}],300)).toThrow();
  });
  it('0006 upgrades a real 0005 database, preserves Decision history and replays once',async()=>{
    const name=`upgrade_${randomUUID().replaceAll('-','')}`,folder=`.local/migration-fixtures/${name}`;
    await local.db.createDatabase(name);const previous=connect(local.url.replace(/\/postgres$/,`/${name}`));
    const journal=JSON.parse(readFileSync('drizzle/meta/_journal.json','utf8'));journal.entries=journal.entries.filter((e:{idx:number})=>e.idx<=5);
    mkdirSync(`${folder}/meta`,{recursive:true});writeFileSync(`${folder}/meta/_journal.json`,JSON.stringify(journal));
    for(const e of journal.entries)copyFileSync(`drizzle/${e.tag}.sql`,`${folder}/${e.tag}.sql`);
    try {
      await migrate(previous.db,{migrationsFolder:folder});const who=await seedIdentity(previous.db),brandId=randomUUID(),questionId=randomUUID(),decisionId=randomUUID(),versionId=randomUUID();
      expect(await readiness(previous.pool)).toBe('MIGRATIONS_REQUIRED');
      await previous.db.transaction(async tx=>{
        await tx.insert(t.brands).values({id:brandId,workspaceId:who.workspaceId,name:'Upgrade DEMO'});
        await tx.insert(t.questions).values({id:questionId,workspaceId:who.workspaceId,brandId,module:'Primary Customer',text:'Cliente',status:'DECIDED'});
        await tx.insert(t.decisions).values({id:decisionId,workspaceId:who.workspaceId,brandId,questionId,activeVersionId:versionId,reviewStatus:'APPROVED'});
        await tx.insert(t.versions).values({id:versionId,workspaceId:who.workspaceId,brandId,decisionId,sequence:1,selectedOption:'Historial previo',rationale:'No debe cambiar durante upgrade',actorUserId:who.userId,approvedAt:new Date(),versionStatus:'APPROVED'});
      });
      const before=(await previous.pool.query('select * from decision_versions')).rows;
      expect((await previous.pool.query('select count(*)::int n from drizzle.__drizzle_migrations')).rows[0].n).toBe(6);
      await migrateDatabase(previous.db);await migrateDatabase(previous.db);
      expect((await previous.pool.query('select * from decision_versions')).rows).toEqual(before);
      expect((await previous.pool.query('select count(*)::int n from drizzle.__drizzle_migrations')).rows[0].n).toBe(JSON.parse(readFileSync('drizzle/meta/_journal.json','utf8')).entries.length);
      for(const table of ['experiments','signals','learnings','learning_signals','capability_events'])expect((await previous.pool.query('select to_regclass($1) as name',[table])).rows[0].name).toBe(table);
      expect((await new Engine(previous.db).blueprint(who.token,brandId)).decisions[0].activeVersionId).toBe(versionId);
    } finally {await previous.pool.end();}
  });
  it('Experiment -> Signal -> Learning requires human transitions and personal practice remains isolated',async()=>{
    const s=await setup(),other=await setup(),decision=await s.commit(s.customer.id,'Agencias',null);
    const hypothesis=await engine.captureContext(s.who.token,s.brand.id,'hypothesis',{statement:'Volverán a revisar su estrategia'});
    const experiment=await engine.createLearningObject(s.who.token,s.brand.id,'experiment',{hypothesisId:hypothesis.id,intendedSignal:'Una segunda sesión voluntaria'},decision.decisionId);
    await expect(engine.transitionLearningObject(s.who.token,s.brand.id,'experiment',String(experiment.id),'PLANNED','COMPLETED')).rejects.toMatchObject({code:'CONFLICT'});
    await engine.transitionLearningObject(s.who.token,s.brand.id,'experiment',String(experiment.id),'PLANNED','RUNNING');
    await expect(engine.transitionLearningObject(s.who.token,s.brand.id,'experiment',String(experiment.id),'RUNNING','COMPLETED')).rejects.toMatchObject({code:'CONFLICT'});
    const signal=await engine.createLearningObject(s.who.token,s.brand.id,'signal',{experimentId:experiment.id,observation:'Regresó una persona',source:'Entrevista consentida',observedAt:new Date().toISOString()});
    expect((await s.context()).learnings).toEqual([]);
    await engine.transitionLearningObject(s.who.token,s.brand.id,'experiment',String(experiment.id),'RUNNING','COMPLETED');
    const plan=(await s.context()).experimentPlans[0];expect(plan.startedAt).not.toBeNull();expect(plan.completedAt).not.toBeNull();expect(plan.objective).toBe('Volverán a revisar su estrategia');
    const cancelled=await engine.createLearningObject(s.who.token,s.brand.id,'experiment',{hypothesisId:hypothesis.id,intendedSignal:'Otra prueba'},decision.decisionId);
    expect((await engine.transitionLearningObject(s.who.token,s.brand.id,'experiment',String(cancelled.id),'PLANNED','CANCELLED')).status).toBe('CANCELLED');
    const learning=await engine.createLearningObject(s.who.token,s.brand.id,'learning',{signalIds:[signal.id],interpretation:'Posible interés recurrente',limitations:['Un solo caso'],status:'ACCEPTED',reviewedBy:other.who.userId});expect(learning.status).toBe('CANDIDATE');expect(learning.reviewedBy).toBeNull();
    await expect(engine.transitionLearningObject(s.who.token,s.brand.id,'learning',String(learning.id),'CANDIDATE','ACCEPTED')).rejects.toMatchObject({code:'CONFLICT'});
    await expect(engine.createLearningObject(other.who.token,other.brand.id,'learning',{signalIds:[signal.id],interpretation:'Cruce',limitations:[]})).rejects.toMatchObject({code:'NOT_FOUND'});
    expect((await engine.assembleContext(s.who.token,s.brand.id,s.customer.id)).items.some(i=>i.type==='Learning')).toBe(false);
    await engine.transitionLearningObject(s.who.token,s.brand.id,'learning',String(learning.id),'CANDIDATE','REVIEWED');await engine.transitionLearningObject(s.who.token,s.brand.id,'learning',String(learning.id),'REVIEWED','ACCEPTED');
    const auditCount=(await s.context()).audit.length;
    await engine.transitionLearningObject(s.who.token,s.brand.id,'learning',String(learning.id),'REVIEWED','ACCEPTED');expect((await s.context()).audit).toHaveLength(auditCount);
    const events=await connection.db.select().from(t.telemetry).where(eq(t.telemetry.brandId,s.brand.id));
    expect(events.filter(e=>(e.payload as {name:string}).name==='learning_created')).toHaveLength(1);
    expect(events.filter(e=>(e.payload as {name:string}).name==='learning_candidate_created')).toHaveLength(1);
    expect(events.filter(e=>(e.payload as {name:string}).name==='signal_added')).toHaveLength(1);
    await expect(engine.blueprint(other.who.token,s.brand.id)).rejects.toMatchObject({code:'NOT_FOUND'});
    expect((await engine.blueprint(s.who.token,s.brand.id)).learnings).toMatchObject([{status:'ACCEPTED',reviewedBy:s.who.userId}]);
    expect((await engine.assembleContext(s.who.token,s.brand.id,s.customer.id)).items.find(i=>i.type==='Learning')?.trust).toBe('HUMAN_ACCEPTED');
    expect((await s.context()).versions).toHaveLength(1);expect((await s.context()).decisions[0].activeVersionId).toBe(decision.versionId);
    expect(await engine.practice(s.who.token)).toHaveLength(1);expect(await engine.practice(other.who.token)).toEqual([]);expect(await s.context()).not.toHaveProperty('capabilityEvents');
  });
  it('DEMO recommendation preserves human authority, rejection, modification and stale context',async()=>{
    const s=await setup();
    const first=await engine.analyze(s.who.token,s.brand.id,s.customer.id);expect(first.provider).toBe('DEMO_FIXTURE');expect(first.recommendation?.supportLevel).toBe('UNVALIDATED');expect((await s.context()).decisions).toHaveLength(0);
    await engine.rejectRecommendation(s.who.token,s.brand.id,first.recommendation!.id,'No corresponde a mi marca');expect((await s.context()).decisions).toHaveLength(0);
    const next=await engine.analyze(s.who.token,s.brand.id,s.customer.id);await s.ready(s.customer.id);
    const command={...s.command(s.customer.id,'Mi opción adaptada',null),sourceRecommendationId:next.recommendation!.id};await engine.commitDecision(s.who.token,command);
    expect((await s.context()).recommendations.find(r=>r.id===next.recommendation!.id)?.resolution).toBe('MODIFIED');
    const stale=await engine.analyze(s.who.token,s.brand.id,s.position.id);await engine.captureContext(s.who.token,s.brand.id,'user-input',{statement:'Nuevo contexto'});await s.ready(s.position.id);
    await expect(engine.commitDecision(s.who.token,{...s.command(s.position.id,'Propuesta',null),sourceRecommendationId:stale.recommendation!.id})).rejects.toMatchObject({code:'CONFLICT'});
    const failing=new Engine(connection.db,undefined,new ModelGateway({name:'FAILURE_TEST',model:'none',async generate(){return {invalid:true};}}));
    expect((await failing.analyze(s.who.token,s.brand.id,s.position.id)).error).toBe('INVALID_OUTPUT');expect((await s.context()).decisions).toHaveLength(1);
    const spoofed=new Engine(connection.db,undefined,new ModelGateway({name:'SPOOF_TEST',model:'none',async generate(r){return {...await new DemoProvider().generate(r),evidenceReferences:['foreign-evidence'],supportLevel:'STRONG_SUPPORT'};}}));
    expect((await spoofed.analyze(s.who.token,s.brand.id,s.position.id)).error).toBe('INVALID_OUTPUT');
  });
  it('Brand Context isolates facts, invalidates stale context and preserves critical decisions',async()=>{
    const s=await setup(),other=await setup(),before=(await s.context()).contextVersion;
    const input=await engine.captureContext(s.who.token,s.brand.id,'user-input',{statement:'Vendemos servicios a agencias'});
    const hypothesis=await engine.captureContext(s.who.token,s.brand.id,'hypothesis',{statement:'Las agencias necesitan continuidad',status:'SUPPORTED'});
    expect(hypothesis.status).toBe('UNTESTED');expect(input.createdBy).toBe(s.who.userId);
    expect((await s.context()).contextVersion).not.toBe(before);
    await expect(engine.captureContext(other.who.token,s.brand.id,'user-input',{statement:'Intrusión'})).rejects.toMatchObject({code:'NOT_FOUND'});
    await expect(engine.captureContext(s.who.token,other.brand.id,'open-question',{text:'Referencia cruzada',relatedHypothesisId:hypothesis.id})).rejects.toMatchObject({code:'NOT_FOUND'});
    await expect(engine.captureContext(s.who.token,s.brand.id,'evidence',{claim:'Sin procedencia'})).rejects.toMatchObject({code:'INVALID'});
    await s.commit(s.customer.id,'Agencias',null);
    const packet=await engine.assembleContext(s.who.token,s.brand.id,s.customer.id);
    expect(packet.items.map(i=>i.type)).toEqual(['Decision','UserInput','Hypothesis']);
    expect(packet.items.find(i=>i.type==='Hypothesis')?.trust).toBe('UNVALIDATED');
    expect(packet.includedIds).toContain(input.id);expect(packet.exhaustive).toBe(true);
    await expect(engine.assembleContext(s.who.token,s.brand.id,s.customer.id,100)).rejects.toMatchObject({code:'INVALID'});
    const reloaded=new Engine(connection.db);expect((await reloaded.context(s.who.token,s.brand.id)).userInputs).toHaveLength(1);
  });
  it('full vertical: Business impacts Positioning; Message follows its canonical HARD dependency',async()=>{
    const s=await setup(),qs=(await s.context()).questions;
    const business=qs.find(q=>q.module==='Value Mechanism')!,message=qs.find(q=>q.module==='Core Message')!;
    await s.commit(s.customer.id,'Agencias',null);
    const b=await s.commit(business.id,'Suscripción por marca activa',null),p=await s.commit(s.position.id,'Continuidad estratégica',null),m=await s.commit(message.id,'Decisiones conectadas',null);
    expect((await s.context()).dependencies).toHaveLength(4);
    await s.commit(business.id,'Servicio y suscripción',b.versionId);
    let ctx=await s.context();expect(ctx.decisions.find(d=>d.id===p.decisionId)?.reviewStatus).toBe('NEEDS_REVIEW');expect(ctx.decisions.find(d=>d.id===m.decisionId)?.reviewStatus).toBe('APPROVED');
    const receipt=await engine.beginReview(s.who.token,s.brand.id,p.decisionId);
    await s.commit(s.position.id,'Continuidad estratégica con acompañamiento',p.versionId,receipt.reviewToken);
    ctx=await s.context();expect(ctx.decisions.find(d=>d.id===m.decisionId)?.reviewStatus).toBe('NEEDS_REVIEW');expect(ctx.versions.find(v=>v.id===m.versionId)?.selectedOption).toBe('Decisiones conectadas');
  });
  it('INV-002/003/008/010: complete connected proof, real reload, human review and history',async()=>{
    const s=await setup();
    const c1=await s.commit(s.customer.id,'Agencies',null),p1=await s.commit(s.position.id,'Strategic OS for Agencies',null);
    const before=await s.context();
    expect(before.dependencies).toMatchObject([{upstreamDecisionId:c1.decisionId,downstreamDecisionId:p1.decisionId,kind:'HARD'}]);
    const c2=await s.commit(s.customer.id,'Internal Marketing Teams',c1.versionId);
    const changed=await s.context();
    expect(changed.versions.find(v=>v.id===c1.versionId)).toMatchObject({versionStatus:'SUPERSEDED',selectedOption:'Agencies'});
    expect(changed.decisions.find(d=>d.id===c1.decisionId)?.activeVersionId).toBe(c2.versionId);
    expect(changed.decisions.find(d=>d.id===p1.decisionId)?.reviewStatus).toBe('NEEDS_REVIEW');
    expect(changed.versions.find(v=>v.id===p1.versionId)).toEqual(before.versions.find(v=>v.id===p1.versionId));
    expect(changed.reviews).toMatchObject([{triggerVersionId:c2.versionId,downstreamDecisionId:p1.decisionId,status:'OPEN',dependencyType:'HARD',reviewedBy:null}]);
    expect(changed.reviews[0].reason).toContain('versión 1 → 2');
    await engine.showImpact(s.who.token,s.brand.id);
    const receipt=await engine.beginReview(s.who.token,s.brand.id,p1.decisionId);
    const p2=await s.commit(s.position.id,'Strategic OS for Internal Marketing Teams',p1.versionId,receipt.reviewToken);
    const reloaded=connect(connection.pool.options.connectionString!);
    try {
      const final=await new Engine(reloaded.db).context(s.who.token,s.brand.id);
      expect(final.versions).toHaveLength(4);
      expect(final.decisions.find(d=>d.id===p1.decisionId)).toMatchObject({activeVersionId:p2.versionId,reviewStatus:'APPROVED'});
      expect(final.reviews[0]).toMatchObject({status:'COMPLETED',reviewedBy:s.who.userId});
      expect(final.audit.filter(a=>a.operation==='COMMIT_DECISION')).toHaveLength(4);
      expect(final.audit.find(a=>a.newVersion===c2.versionId&&a.operation==='COMMIT_DECISION')).toMatchObject({actorUserId:s.who.userId,workspaceId:s.who.workspaceId,brandId:s.brand.id,previousVersion:c1.versionId,rationale:'Human DEMO rationale'});
    } finally {await reloaded.pool.end();}
    const events=await connection.db.select().from(t.telemetry).where(eq(t.telemetry.brandId,s.brand.id));
    const names=events.map(e=>(e.payload as {name:string}).name);
    for(const name of ['brand_created','decision_created','decision_superseded','dependency_triggered','change_impact_shown','change_impact_review_started','change_impact_review_completed']) expect(names).toContain(name);
    for(const event of events) {validate('telemetry-event',event.payload);expect(JSON.stringify(event.payload)).not.toContain('Strategic OS');}
  });
  it('canonical M1 fixture is reproduced without research or evaluator',async()=>{
    const fixture=JSON.parse(readFileSync('evals/fixtures/m1-change.json','utf8')),s=await setup();
    const c=await s.commit(s.customer.id,fixture.customerV1,null),p=await s.commit(s.position.id,fixture.positioningV1,null);
    await s.commit(s.customer.id,fixture.customerV2,c.versionId);
    const ctx=await s.context();
    expect(ctx.versions.find(v=>v.id===c.versionId)?.versionStatus).toBe(fixture.expected.customerV1);
    expect(ctx.versions.find(v=>v.id===p.versionId)?.selectedOption).toBe(fixture.positioningV1);
    expect(ctx.decisions.find(d=>d.id===p.decisionId)?.reviewStatus).toBe(fixture.expected.positioningDecision);
    expect(ctx.reviews).toHaveLength(fixture.expected.reviewItemCount);
  });
  it('INV-009: concurrent competing first commits and stale writes cannot overwrite',async()=>{
    const s=await setup();await s.ready(s.customer.id);
    const results=await Promise.allSettled([engine.commitDecision(s.who.token,s.command(s.customer.id,'A',null)),engine.commitDecision(s.who.token,s.command(s.customer.id,'B',null))]);
    expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
    expect(results.filter(r=>r.status==='rejected')).toHaveLength(1);
    const ctx=await s.context();expect(ctx.versions).toHaveLength(1);
    await s.ready(s.customer.id);const before=await s.context();
    await expect(engine.commitDecision(s.who.token,s.command(s.customer.id,'Stale',null))).rejects.toMatchObject({code:'CONFLICT'});
    expect(await s.context()).toEqual(before);
  });
  it('INV-010: simultaneous retries produce one version, audit and review; key collision conflicts',async()=>{
    const s=await setup(),c=await s.commit(s.customer.id,'A',null);await s.commit(s.position.id,'P',null);await s.ready(s.customer.id);
    const command=s.command(s.customer.id,'B',c.versionId);
    const results=await Promise.all([engine.commitDecision(s.who.token,command),engine.commitDecision(s.who.token,command)]);
    expect(results[0]).toEqual(results[1]);
    const ctx=await s.context();expect(ctx.versions).toHaveLength(3);expect(ctx.reviews).toHaveLength(1);
    expect(ctx.audit.filter(a=>a.idempotencyKey===command.idempotencyKey)).toHaveLength(1);
    await expect(engine.commitDecision(s.who.token,{...command,selectedOption:'changed'})).rejects.toMatchObject({code:'CONFLICT'});
  });
  it('INV-001/004/006: AI, unauthenticated, spoofed actor, foreign tenant and unassigned Brand fail closed',async()=>{
    const s=await setup(),other=await seedIdentity(connection.db),ai=await seedIdentity(connection.db,'AI'),member=await seedIdentity(connection.db,'MEMBER',s.who.workspaceId);
    await s.ready(s.customer.id);const cmd=s.command(s.customer.id,'A',null),before=await s.context();
    for(const token of ['', 'AI', ai.token]) await expect(engine.commitDecision(token,cmd)).rejects.toBeDefined();
    await expect(engine.commitDecision(s.who.token,{...cmd,actorUserId:other.userId})).rejects.toMatchObject({code:'FORBIDDEN'});
    await expect(engine.context(other.token,s.brand.id)).rejects.toMatchObject({code:'NOT_FOUND'});
    await expect(engine.commitDecision(other.token,{...cmd,actorUserId:other.userId})).rejects.toMatchObject({code:'NOT_FOUND'});
    await expect(engine.context(member.token,s.brand.id)).rejects.toMatchObject({code:'FORBIDDEN'});
    await expect(engine.commitDecision(member.token,{...cmd,actorUserId:member.userId})).rejects.toMatchObject({code:'FORBIDDEN'});
    expect(await s.context()).toEqual(before);
  });
  it('inactive membership and expired sessions revoke access',async()=>{
    const s=await setup();await connection.db.update(t.memberships).set({active:false}).where(eq(t.memberships.userId,s.who.userId));
    await expect(s.context()).rejects.toMatchObject({code:'FORBIDDEN'});
    const exp=await seedIdentity(connection.db);await connection.db.update(t.sessions).set({expiresAt:new Date(0)}).where(eq(t.sessions.tokenHash,hash(exp.token)));
    await expect(engine.listBrands(exp.token)).rejects.toMatchObject({code:'UNAUTHORIZED'});
  });
  it('invalid transitions, premature commit and Positioning before Customer are rejected',async()=>{
    const s=await setup();
    await expect(engine.commitDecision(s.who.token,s.command(s.customer.id,'A',null))).rejects.toMatchObject({code:'CONFLICT'});
    await expect(engine.transitionQuestion(s.who.token,s.brand.id,s.customer.id,'DECIDED')).rejects.toBeDefined();
    await expect(s.commit(s.position.id,'P',null)).rejects.toMatchObject({code:'CONFLICT'});
    expect(()=>transition('DECIDED','OPEN')).toThrow();
  });
  it('impact failure preserves committed version, displays pending and retries idempotently',async()=>{
    let fail=true;const failing=new Engine(connection.db,()=>{if(fail) throw new Error('Injected failure');});
    const s=await setup(failing),c=await s.commit(s.customer.id,'A',null);await s.commit(s.position.id,'P',null);
    const changed=await s.commit(s.customer.id,'B',c.versionId);expect(changed.impactPending).toBe(true);
    let ctx=await s.context();expect(ctx.versions).toHaveLength(3);expect(ctx.impacts[0].status).toBe('IMPACT_PENDING');expect(ctx.reviews).toHaveLength(0);
    await s.ready(s.position.id);await expect(failing.commitDecision(s.who.token,s.command(s.position.id,'P2',ctx.decisions.find(d=>d.questionId===s.position.id)!.activeVersionId))).rejects.toMatchObject({code:'UNAVAILABLE'});
    fail=false;await failing.retryImpact(s.who.token,s.brand.id);await failing.retryImpact(s.who.token,s.brand.id);
    ctx=await s.context();expect(ctx.reviews).toHaveLength(1);expect(ctx.impacts[0].status).toBe('COMPLETED');
  });
  it('a newer upstream change invalidates an earlier human review receipt',async()=>{
    const s=await setup(),c1=await s.commit(s.customer.id,'A',null),p=await s.commit(s.position.id,'P',null),c2=await s.commit(s.customer.id,'B',c1.versionId);
    const receipt=await engine.beginReview(s.who.token,s.brand.id,p.decisionId);
    await s.commit(s.customer.id,'C',c2.versionId);
    await expect(s.commit(s.position.id,'P2',p.versionId,receipt.reviewToken)).rejects.toMatchObject({code:'CONFLICT'});
    expect((await s.context()).reviews.every(r=>r.status==='OPEN')).toBe(true);
  });
  it('database rejects historical edits, audit deletion, dependency cycles and cross-Brand edges',async()=>{
    const s=await setup(),c=await s.commit(s.customer.id,'A',null),p=await s.commit(s.position.id,'P',null);
    await expect(connection.db.update(t.versions).set({selectedOption:'overwrite'}).where(eq(t.versions.id,c.versionId))).rejects.toBeDefined();
    await expect(connection.db.delete(t.versions).where(eq(t.versions.id,c.versionId))).rejects.toBeDefined();
    await expect(connection.db.delete(t.audits).where(eq(t.audits.brandId,s.brand.id))).rejects.toBeDefined();
    const edge={id:randomUUID(),workspaceId:s.who.workspaceId,brandId:s.brand.id,upstreamDecisionId:p.decisionId,downstreamDecisionId:c.decisionId,kind:'HARD',reason:'cycle',ruleVersion:'v1'};
    await expect(connection.db.insert(t.dependencies).values(edge)).rejects.toBeDefined();
    const other=await setup(),cOther=await other.commit(other.customer.id,'Other',null);
    await expect(connection.db.insert(t.dependencies).values({...edge,id:randomUUID(),upstreamDecisionId:c.decisionId,downstreamDecisionId:cOther.decisionId})).rejects.toBeDefined();
  });
  it('schema validation rejects missing provenance, injected command fields and hypothesis status drift',()=>{
    const evidence={...schema('evidence').examples[0],external:true};delete evidence.provenance;
    expect(()=>validate('evidence',evidence)).toThrow();
    expect(()=>validate('decision-commit',{...schema('decision-commit').examples[0],actor:'AI'})).toThrow();
    expect(()=>validate('hypothesis',{...schema('hypothesis').examples[0],status:'ASSUMPTION_IN_USE'})).toThrow();
  });
  it('source Recommendation must belong to the same question and Brand',async()=>{
    const s=await setup();await s.ready(s.customer.id);
    await expect(engine.commitDecision(s.who.token,{...s.command(s.customer.id,'A',null),sourceRecommendationId:'untrusted'})).rejects.toMatchObject({code:'CONFLICT'});
    expect((await s.context()).versions).toHaveLength(0);
  });
  it('human review is required before downstream commit',async()=>{
    const s=await setup(),c=await s.commit(s.customer.id,'A',null),p=await s.commit(s.position.id,'P',null);await s.commit(s.customer.id,'B',c.versionId);
    await expect(s.commit(s.position.id,'P2',p.versionId)).rejects.toMatchObject({code:'CONFLICT'});
    const ctx=await s.context();expect(ctx.versions).toHaveLength(3);expect(ctx.reviews[0].status).toBe('OPEN');
  });
  it('M1 migrations have applied exactly once',async()=>{
    const result=await connection.pool.query('select count(*)::int as n from drizzle.__drizzle_migrations');expect(result.rows[0].n).toBe(9);
    const server=await connection.pool.query('show server_version');expect(server.rows[0].server_version).toMatch(/^17\./);
  });
  it('superseding without a new current version is rejected by PostgreSQL',async()=>{
    const s=await setup(),c=await s.commit(s.customer.id,'A',null);
    await expect(connection.db.update(t.versions).set({versionStatus:'SUPERSEDED'}).where(eq(t.versions.id,c.versionId))).rejects.toBeDefined();
    expect((await s.context()).versions[0].versionStatus).toBe('APPROVED');
  });
  it('a recommendation is context-bound; human divergence is recorded as MODIFIED',async()=>{
    const s=await setup();await s.ready(s.customer.id);const contextVersion=(await s.context()).contextVersion;
    const rec={...schema('recommendation').examples[0],id:randomUUID(),brandId:s.brand.id,questionId:s.customer.id,contextVersion,hypothesesUsed:[]};
    await connection.db.insert(t.recommendations).values({id:rec.id,workspaceId:s.who.workspaceId,brandId:s.brand.id,questionId:s.customer.id,contextVersion,payload:rec});
    const result=await engine.commitDecision(s.who.token,{...s.command(s.customer.id,'A different human choice',null),sourceRecommendationId:rec.id});
    const [stored]=await connection.db.select().from(t.recommendations).where(eq(t.recommendations.id,rec.id));expect(stored.resolution).toBe('MODIFIED');
    expect((await s.context()).audit.find(a=>a.newVersion===result.versionId)?.sourceRecommendationId).toBe(rec.id);
    const next=await setup();await next.ready(next.customer.id);
    const stale={...rec,id:randomUUID(),brandId:next.brand.id,questionId:next.customer.id,contextVersion:'stale-context'};
    await connection.db.insert(t.recommendations).values({id:stale.id,workspaceId:next.who.workspaceId,brandId:next.brand.id,questionId:next.customer.id,contextVersion:stale.contextVersion,payload:stale});
    await expect(engine.commitDecision(next.who.token,{...next.command(next.customer.id,'Agencies',null),sourceRecommendationId:stale.id})).rejects.toMatchObject({code:'CONFLICT'});
  });
  it('audit failure rolls back version, supersede, question state and idempotency together',async()=>{
    const s=await setup(),c=await s.commit(s.customer.id,'A',null);await s.ready(s.customer.id);const before=await s.context();
    await connection.pool.query(`CREATE FUNCTION test_audit_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.rationale='ROLLBACK_TEST' THEN RAISE EXCEPTION 'injected audit failure'; END IF; RETURN NEW; END $$; CREATE TRIGGER test_audit_failure BEFORE INSERT ON strategic_audit FOR EACH ROW EXECUTE FUNCTION test_audit_failure();`);
    try {
      const cmd={...s.command(s.customer.id,'B',c.versionId),rationale:'ROLLBACK_TEST'};
      await expect(engine.commitDecision(s.who.token,cmd)).rejects.toBeDefined();
      expect(await s.context()).toEqual(before);
      expect(await connection.db.select().from(t.idempotency).where(eq(t.idempotency.key,cmd.idempotencyKey))).toHaveLength(0);
    } finally {await connection.pool.query('DROP TRIGGER test_audit_failure ON strategic_audit; DROP FUNCTION test_audit_failure();');}
  });
  it('SOFT suggests, INFORMATIVE explains and HARD does not cascade downstream',async()=>{
    const s=await setup(),c=await s.commit(s.customer.id,'A',null),p=await s.commit(s.position.id,'P',null);
    const q=(await s.context()).questions.find(q=>q.module==='Core Message')!.id,info=randomUUID();
    await connection.db.insert(t.questions).values([{id:info,workspaceId:s.who.workspaceId,brandId:s.brand.id,module:'Context note',text:'Context?',status:'OPEN'}]);
    const message=await s.commit(q,'Unchanged message',null),note=await s.commit(info,'Unchanged context',null);
    await connection.db.insert(t.dependencies).values({id:randomUUID(),workspaceId:s.who.workspaceId,brandId:s.brand.id,upstreamDecisionId:c.decisionId,downstreamDecisionId:note.decisionId,kind:'INFORMATIVE',reason:'Context only',ruleVersion:'v1'});
    await s.commit(s.customer.id,'B',c.versionId);
    const ctx=await s.context();
    expect(ctx.decisions.find(d=>d.id===p.decisionId)?.reviewStatus).toBe('NEEDS_REVIEW');
    expect(ctx.decisions.find(d=>d.id===message.decisionId)?.reviewStatus).toBe('APPROVED');
    expect(ctx.reviews.find(r=>r.downstreamDecisionId===message.decisionId)?.status).toBe('REVIEW_SUGGESTED');
    expect(ctx.reviews.some(r=>r.downstreamDecisionId===note.decisionId)).toBe(false);
    expect(ctx.versions.find(v=>v.id===message.versionId)?.selectedOption).toBe('Unchanged message');
    const impact=ctx.impacts[0].result as {reviewOrder:string[];affected:{impactStatus:string}[]};
    expect(impact.reviewOrder).toEqual([p.decisionId,message.decisionId]);expect(impact.affected.some(a=>a.impactStatus==='INFORMATION_ONLY')).toBe(true);
  });
  it('review ordering follows graph, rejects cycles; Signal is not accepted Learning',()=>{
    const affected=[{downstreamDecisionId:'a',dependencyType:'HARD'},{downstreamDecisionId:'z',dependencyType:'HARD'}];
    expect(reviewOrder(affected,[{upstreamDecisionId:'z',downstreamDecisionId:'a'}])).toEqual(['z','a']);
    expect(()=>reviewOrder(affected,[{upstreamDecisionId:'z',downstreamDecisionId:'a'},{upstreamDecisionId:'a',downstreamDecisionId:'z'}])).toThrow();
    expect(()=>validate('learning',schema('signal').examples[0])).toThrow();
    expect(()=>validate('learning',{...schema('learning').examples[0],status:'ACCEPTED',reviewedBy:null})).toThrow();
  });
  it('HTTP E2E: authenticated connected proof, 409, CSRF rejection, reload and unsupported chat/AI writes',async()=>{
    const who=await seedIdentity(connection.db),server=createApp(engine);
    await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
    const base=`http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    async function request(path:string,input?:unknown,auth=true) {
      const response=await fetch(base+path,{method:input?'POST':'GET',headers:{...(auth?{Authorization:`Bearer ${who.token}`} : {}),'Content-Type':'application/json'},body:input?JSON.stringify(input):undefined});
      return {status:response.status,data:await response.json()};
    }
    try {
      expect((await request('/api/brands',undefined,false)).status).toBe(401);
      const brand=(await request('/api/brands',{name:'HTTP DEMO'})).data;
      const initial=(await request(`/api/context?brandId=${brand.id}`)).data;
      const customer=initial.questions.find((q:{module:string})=>q.module==='Primary Customer'),position=initial.questions.find((q:{module:string})=>q.module==='Positioning');
      async function commit(questionId:string,selectedOption:string,expectedActiveVersion:string|null,reviewToken?:string) {
        if(expectedActiveVersion) expect((await request('/api/questions/transition',{brandId:brand.id,questionId,status:'REOPENED'})).status).toBe(200);
        for(const status of ['IN_ANALYSIS','READY_FOR_DECISION']) expect((await request('/api/questions/transition',{brandId:brand.id,questionId,status})).status).toBe(200);
        return request('/api/decisions/commit',{command:{brandId:brand.id,questionId,selectedOption,rationale:'HTTP human rationale',expectedActiveVersion,actorUserId:who.userId,sourceRecommendationId:null,idempotencyKey:randomUUID()},reviewToken});
      }
      const c=await commit(customer.id,'Agencies',null),p=await commit(position.id,'Strategic OS for Agencies',null);expect(c.status).toBe(200);expect(p.status).toBe(200);
      const c2=await commit(customer.id,'Internal Marketing Teams',c.data.versionId);expect(c2.status).toBe(200);
      const impact=(await request(`/api/context?brandId=${brand.id}`)).data;expect(impact.reviews[0].status).toBe('OPEN');
      const review=await request('/api/reviews/start',{brandId:brand.id,decisionId:p.data.decisionId});expect(review.status).toBe(200);
      const p2=await commit(position.id,'Strategic OS for Internal Marketing Teams',p.data.versionId,review.data.reviewToken);expect(p2.status).toBe(200);
      const final=(await request(`/api/context?brandId=${brand.id}`)).data;expect(final.versions).toHaveLength(4);expect(final.reviews[0].status).toBe('COMPLETED');
      expect((await request('/api/decisions/commit',{command:{brandId:brand.id,questionId:customer.id,selectedOption:'Stale',rationale:'Stale attempt',expectedActiveVersion:c.data.versionId,actorUserId:who.userId,sourceRecommendationId:null,idempotencyKey:randomUUID()}})).status).toBe(409);
      const csrf=await fetch(base+'/api/brands',{method:'POST',headers:{Origin:'https://untrusted.example','Content-Type':'application/json',Cookie:`brandopolis_session=${who.token}`},body:JSON.stringify({name:'Attack'})});expect(csrf.status).toBe(403);
      for(const route of ['/api/chat','/api/ai/commit','/api/signals/accept-learning']) expect((await request(route,{text:'silently change strategy'})).status).toBe(404);
      expect((await request(`/api/context?brandId=${brand.id}`)).data.versions).toHaveLength(4);
    } finally {await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));}
  });
});
