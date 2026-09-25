import { describe,it,expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { generateKeyPair,exportJWK,SignJWT } from 'jose';
import * as oidc from 'openid-client';
import { eq } from 'drizzle-orm';
import type { AddressInfo } from 'node:net';
import { connect } from '../src/persistence/database.js';
import { startLocalDb,stopLocalDb } from '../scripts/local-db.js';
import { migrateDatabase } from '../scripts/migrate.js';
import { coldCopy } from '../scripts/local-recovery.js';
import { resolve,dirname } from 'node:path';
import { existsSync,mkdirSync,writeFileSync,readFileSync,copyFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { readiness,dataClassViolation } from '../src/persistence/readiness.js';
import { Engine,hash } from '../src/application/engine.js';
import { PilotAccess } from '../src/application/pilot-access.js';
import { PilotAuth,type PilotBoundary } from '../src/transport/pilot-auth.js';
import { createApp,RateLimiter } from '../src/transport/http.js';
import { AnthropicProvider,UnavailableProvider } from '../src/transport/anthropic-provider.js';
import { ModelGateway,DemoProvider,type GatewayRequest } from '../src/domain/analysis.js';
import * as t from '../src/persistence/schema.js';
import { seedIdentity } from '../scripts/seed.js';

export function pilotCases(connection:()=>ReturnType<typeof connect>){
 describe('PILOT boundaries',()=>{
  async function setup(){const {db}=connection(),access=new PilotAccess(db,'https://issuer.example'),subject=randomUUID(),who=await access.provision(subject,'A'),session=await access.issueSession(subject);return {db,access,who,session,subject,engine:new Engine(db)};}
  it('provisions unique testers, isolates workspaces and brands, and rejects manipulated IDs',async()=>{
   const a=await setup(),b=await setup(),brand=await a.engine.createBrand(a.session.token,'Tester A','Context A');
   expect(brand.dataClass).toBe('PILOT');expect(a.who.workspaceId).not.toBe(b.who.workspaceId);
   expect(await b.engine.listBrands(b.session.token)).toEqual([]);
   await expect(b.engine.context(b.session.token,brand.id)).rejects.toMatchObject({code:'NOT_FOUND'});
   await expect(b.access.assign(b.who.userId,brand.id)).rejects.toMatchObject({code:'NOT_FOUND'});
   await expect(a.access.provision(a.subject,'A')).rejects.toMatchObject({code:'CONFLICT'});
   const teammateSubject=randomUUID(),teammate=await a.access.provision(teammateSubject,'A',a.who.workspaceId),other=await a.access.issueSession(teammateSubject);
   await expect(a.engine.context(other.token,brand.id)).rejects.toMatchObject({code:'FORBIDDEN'});
   await a.access.assign(teammate.userId,brand.id);expect((await a.engine.context(other.token,brand.id)).userInputs).toHaveLength(1);
  });
  it('DEMO sessions never enter PILOT; disable and expiry revoke access',async()=>{
   const a=await setup(),demo=await seedIdentity(a.db);
   await expect(a.access.authorize(demo.token)).rejects.toMatchObject({code:'FORBIDDEN'});
   await a.db.update(t.sessions).set({expiresAt:new Date(0)}).where(eq(t.sessions.tokenHash,hash(a.session.token)));
   await expect(a.access.authorize(a.session.token)).rejects.toMatchObject({code:'UNAUTHORIZED'});
   const current=await a.access.issueSession(a.subject);await a.access.disable(a.who.userId);
   await expect(a.access.authorize(current.token)).rejects.toMatchObject({code:'UNAUTHORIZED'});
   await expect(a.access.issueSession(a.subject)).rejects.toMatchObject({code:'FORBIDDEN'});
  });
  it('persists cohort/session telemetry and scoped feedback without altering decisions',async()=>{
   const a=await setup(),b=await setup(),brand=await a.engine.createBrand(a.session.token,'Feedback','Initial context');
   const input={brandId:brand.id,usefulness:4,clarity:5,confidence:3,comment:'Useful test fixture',kind:'FEEDBACK'};
   await expect(b.access.saveFeedback(b.session.token,input)).rejects.toMatchObject({code:'NOT_FOUND'});
   await expect(a.access.saveFeedback(a.session.token,{...input,usefulness:6})).rejects.toMatchObject({code:'INVALID'});
   await a.access.saveFeedback(a.session.token,input);
   const events=await a.db.select().from(t.pilotEvents).where(eq(t.pilotEvents.userId,a.who.userId));
   expect(events.map(e=>e.name)).toEqual(expect.arrayContaining(['account_created','session_started','brand_created','meaningful_context_supplied']));
   expect(events.filter(e=>e.brandId).every(e=>e.cohort==='A'&&e.intervention==='PRODUCT_ONLY'&&e.sessionId)).toBe(true);
   expect(JSON.stringify(events)).not.toContain(a.session.token);expect(JSON.stringify(events)).not.toContain('Initial context');
   expect((await a.engine.context(a.session.token,brand.id)).versions).toHaveLength(0);
  });
  it('OIDC validates signed issuer tokens, browser state, single-use callback and secure application session',async()=>{
   const a=await setup(),issuer='https://issuer.example',clientId='test-client';
   const {privateKey,publicKey}=await generateKeyPair('RS256'),jwk={...await exportJWK(publicKey),kid:'test-key',alg:'RS256',use:'sig'};
   let nonce='',valid=true,sub=a.subject;
   const config=new oidc.Configuration({issuer,authorization_endpoint:issuer+'/authorize',token_endpoint:issuer+'/token',jwks_uri:issuer+'/jwks'},clientId,'test-fixture-secret');
   config[oidc.customFetch]=async input=>{
    if(String(input).endsWith('/jwks'))return Response.json({keys:[jwk]});
    const token=await new SignJWT({nonce,sub}).setProtectedHeader({alg:'RS256',kid:'test-key'}).setIssuer(valid?issuer:'https://attacker.example').setAudience(clientId).setIssuedAt().setExpirationTime('5m').sign(privateKey);
    return Response.json({access_token:'fixture-access',token_type:'Bearer',id_token:token});
   };
   const server=createApp(a.engine,undefined,async()=>'READY');await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const port=(server.address() as AddressInfo).port;await new Promise<void>(r=>server.close(()=>r()));
   const origin=`https://127.0.0.1:${port}`,base=`http://127.0.0.1:${port}`,app=createApp(a.engine,undefined,async()=>'READY',new PilotAuth(a.db,config,origin));await new Promise<void>(r=>app.listen(port,'127.0.0.1',r));
   try{
    async function login(){const r=await fetch(base+'/auth/login',{redirect:'manual'}),target=new URL(r.headers.get('location')!);nonce=target.searchParams.get('nonce')!;return {cookie:r.headers.getSetCookie()[0].split(';')[0],state:target.searchParams.get('state')!};}
    const refused=(r:Response,reason:string)=>{expect(r.status).toBe(302);expect(r.headers.get('location')).toBe('/?login='+reason);expect(r.headers.getSetCookie().some(c=>c.startsWith('__Host-brandopolis_session='))).toBe(false);};
    const first=await login();expect(first.cookie).toMatch(/^__Host-brandopolis_flow=/);
    refused(await fetch(base+'/auth/callback?code=fixture&state=wrong',{headers:{Cookie:first.cookie},redirect:'manual'}),'failed');
    const result=await fetch(base+`/auth/callback?code=fixture&state=${first.state}`,{headers:{Cookie:first.cookie},redirect:'manual'});expect(result.status).toBe(302);
    const sessionCookie=result.headers.getSetCookie().find(v=>v.startsWith('__Host-brandopolis_session='))!;expect(sessionCookie).toContain('Secure; HttpOnly; SameSite=Strict');const cookie=sessionCookie.split(';')[0];
    expect((await fetch(base+'/api/me',{headers:{Cookie:cookie}})).status).toBe(200);
    refused(await fetch(base+`/auth/callback?code=fixture&state=${first.state}`,{headers:{Cookie:first.cookie},redirect:'manual'}),'expired');
    expect((await fetch(base+'/api/me',{headers:{Authorization:`Bearer ${a.session.token}`}})).status).toBe(401);
    expect((await fetch(base+'/api/brands',{method:'POST',headers:{Cookie:cookie,Origin:'https://attacker.example','Content-Type':'application/json'},body:'{}'})).status).toBe(403);
    expect((await fetch(base+'/api/session',{method:'POST',headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json'},body:'{}'})).status).toBe(403);
    expect((await fetch(base+'/api/logout',{method:'POST',headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json'},body:'{}'})).status).toBe(200);
    expect((await fetch(base+'/api/me',{headers:{Cookie:cookie}})).status).toBe(401);
    valid=false;const second=await login();refused(await fetch(base+`/auth/callback?code=fixture&state=${second.state}`,{headers:{Cookie:second.cookie},redirect:'manual'}),'failed');
    // A validly signed identity that was never provisioned (or was disabled) is denied, never auto-linked.
    valid=true;sub='unprovisioned-'+randomUUID();const third=await login();refused(await fetch(base+`/auth/callback?code=fixture&state=${third.state}`,{headers:{Cookie:third.cookie},redirect:'manual'}),'denied');
    sub=a.subject;await a.access.disable(a.who.userId);const fourth=await login();refused(await fetch(base+`/auth/callback?code=fixture&state=${fourth.state}`,{headers:{Cookie:fourth.cookie},redirect:'manual'}),'denied');
   }finally{await new Promise<void>(r=>app.close(()=>r()));}
  });
  it('real-provider adapter validates output and usage; outage never falls back to a DEMO or commits',async()=>{
   const a=await setup(),brand=await a.engine.createBrand(a.session.token,'AI'),ctx=await a.engine.context(a.session.token,brand.id),q=ctx.questions[0],packet=await a.engine.assembleContext(a.session.token,brand.id,q.id);
   const message=(text:string,stop='end_turn')=>({id:'msg_fixture',type:'message',role:'assistant',model:'configured-model',content:[{type:'text',text}],stop_reason:stop,stop_sequence:null,usage:{input_tokens:50,output_tokens:60}});
   const req:GatewayRequest={task:'STRATEGIC_ANALYSIS',module:q.module,promptVersion:'pilot-strategic-v1',contextVersion:packet.contextVersion,input:packet,outputSchema:'recommendation',budget:{maxCharacters:20000,timeoutMs:1000},tenantScope:{workspaceId:a.who.workspaceId,brandId:brand.id},questionId:q.id};
   const output=await new DemoProvider().generate(req);let captured='';
   const provider=new AnthropicProvider('fixture-key','configured-model',async(_url,init)=>{captured=String(init?.body);return Response.json(message(JSON.stringify(output)));});
   const result=await new ModelGateway(provider).invoke(req);expect(result.error).toBeNull();expect(result.tokenIn).toBe(50);expect(result.tokenOut).toBe(60);expect(captured).toContain('json_schema');expect(captured).not.toContain('fixture-key');
   const unavailable=new Engine(a.db,undefined,new ModelGateway(new UnavailableProvider(),'pilot-strategic-v1'));
   expect((await unavailable.analyze(a.session.token,brand.id,q.id)).error).toBe('UNAVAILABLE');expect((await a.engine.context(a.session.token,brand.id)).versions).toHaveLength(0);
   const malformed=new AnthropicProvider('fixture-key','configured-model',async()=>Response.json(message('{}')));expect((await new ModelGateway(malformed).invoke(req)).error).toBe('INVALID_OUTPUT');
   const refusal=new AnthropicProvider('fixture-key','configured-model',async()=>Response.json(message(JSON.stringify(output),'refusal')));expect((await new ModelGateway(refusal).invoke(req)).error).toBe('INVALID_OUTPUT');
   const truncated=new AnthropicProvider('fixture-key','configured-model',async()=>Response.json(message('{"id":','max_tokens')));expect((await new ModelGateway(truncated).invoke(req)).error).toBe('INVALID_OUTPUT');
   const limited=new AnthropicProvider('fixture-key','configured-model',async()=>Response.json({type:'error',error:{type:'rate_limit_error',message:'slow down'}},{status:429,headers:{'retry-after':'0'}}));expect((await new ModelGateway(limited).invoke(req)).error).toBe('RATE_LIMIT');
  });
  it('backup, later changes and isolated restore: restored cluster holds exactly the pre-backup PILOT state',async()=>{
   const root=resolve('.local/recovery-tests',randomUUID()),source=resolve(root,'source'),backup=resolve(root,'backup'),restored=resolve(root,'restored');
   let cluster=await startLocalDb(false,{directory:source,port:55435}),db=connect(cluster.url),running=true;
   try{
    await migrateDatabase(db.db);const access=new PilotAccess(db.db,'https://recovery.example'),who=await access.provision('recovery-fixture','B'),session=await access.issueSession('recovery-fixture'),engine=new Engine(db.db),brand=await engine.createBrand(session.token,'Restore fixture','Preserved context');
    const questions=(await engine.context(session.token,brand.id)).questions,q=(m:string)=>questions.find(x=>x.module===m)!.id;
    const commit=async(module:string,option:string,expected:string|null,reviewToken?:string)=>{await engine.prepareQuestion(session.token,brand.id,q(module),expected);return engine.commitDecision(session.token,{brandId:brand.id,questionId:q(module),selectedOption:option,rationale:'Human recovery fixture',expectedActiveVersion:expected,actorUserId:who.userId,sourceRecommendationId:null,idempotencyKey:randomUUID()},reviewToken);};
    const c1=await commit('Primary Customer','Preserved customer',null);await commit('Positioning','Preserved positioning',null);await commit('Primary Customer','Changed customer',c1.versionId);
    const before=await engine.context(session.token,brand.id);expect(before.reviews).toHaveLength(1);expect(before.dependencies.length).toBeGreaterThan(0);
    expect(()=>coldCopy(source,backup)).toThrow('Stop PostgreSQL');
    await db.pool.end();await stopLocalDb(cluster);running=false;
    expect(existsSync(resolve(source,'data/postmaster.pid'))).toBe(false);coldCopy(source,backup);
    // Changes after the backup must not appear in the restore.
    cluster=await startLocalDb(false,{directory:source,port:55435});running=true;db=connect(cluster.url);
    await new Engine(db.db).createBrand(session.token,'After backup');
    await db.pool.end();await stopLocalDb(cluster);running=false;
    coldCopy(backup,restored);expect(()=>coldCopy(backup,restored)).toThrow();
    cluster=await startLocalDb(false,{directory:restored,port:55435});running=true;db=connect(cluster.url);
    expect(await readiness(db.pool)).toBe('READY');await migrateDatabase(db.db);
    const after=await new Engine(db.db).context(session.token,brand.id);
    for(const key of ['versions','decisions','dependencies','reviews','audit','userInputs','impacts'] as const)expect(after[key]).toEqual(before[key]);
    expect((await new Engine(db.db).listBrands(session.token)).map(b=>b.name)).toEqual(['Restore fixture']);
    expect((await new PilotAccess(db.db,'https://recovery.example').authorize(session.token)).userId).toBe(who.userId);
   }finally{await db.pool.end().catch(()=>{});if(running)await stopLocalDb(cluster);}
  },120000);

  it('AI failure leaves strategic state untouched, records telemetry and allows retry and human decision',async()=>{
   const a=await setup(),brand=await a.engine.createBrand(a.session.token,'AI outage'),q=(await a.engine.context(a.session.token,brand.id)).questions.find(x=>x.module==='Primary Customer')!;
   const down=new Engine(a.db,undefined,new ModelGateway(new UnavailableProvider(),'pilot-strategic-v1')),before=await a.engine.context(a.session.token,brand.id);
   const failed=await down.analyze(a.session.token,brand.id,q.id);expect(failed).toMatchObject({recommendation:null,error:'UNAVAILABLE'});
   const after=await a.engine.context(a.session.token,brand.id);
   for(const key of ['decisions','versions','reviews','impacts','audit','recommendations','questions'] as const)expect(after[key]).toEqual(before[key]);
   expect(after.analyses).toHaveLength(1);expect(after.analyses[0].recommendationId).toBeNull();
   const names=(await a.db.select().from(t.pilotEvents).where(eq(t.pilotEvents.brandId,brand.id))).map(e=>e.name);
   expect(names).toEqual(expect.arrayContaining(['recommendation_requested','analysis_failed']));expect(names).not.toContain('recommendation_generated');
   // Retry against a recovered provider succeeds; the proposal still needs a human commit.
   const up=new Engine(a.db,undefined,new ModelGateway(new DemoProvider(),'pilot-strategic-v1'));const ok=await up.analyze(a.session.token,brand.id,q.id);expect(ok.recommendation).not.toBeNull();
   expect((await a.engine.context(a.session.token,brand.id)).versions).toHaveLength(0);
   await a.engine.prepareQuestion(a.session.token,brand.id,q.id,null);
   await a.engine.commitDecision(a.session.token,{brandId:brand.id,questionId:q.id,selectedOption:'Decisión humana sin IA',rationale:'Criterio propio',expectedActiveVersion:null,actorUserId:a.who.userId,sourceRecommendationId:null,idempotencyKey:randomUUID()});
   expect((await a.engine.context(a.session.token,brand.id)).versions).toHaveLength(1);
  });
  it('HTTP tenancy: testers, workspaces, brands, forged IDs, wrong/revoked/expired sessions and DEMO tokens all fail closed',async()=>{
   const a=await setup(),b=await setup(),brandA=await a.engine.createBrand(a.session.token,'Private A','Secret context A'),brandB=await b.engine.createBrand(b.session.token,'Private B');
   const qA=(await a.engine.context(a.session.token,brandA.id)).questions[0].id,demo=await seedIdentity(a.db);
   const boundary:PilotBoundary={origin:'',handle:async()=>false,authorize:token=>a.access.authorize(token),logout:token=>a.access.logout(token),feedback:(token:string,input:Record<string,unknown>)=>a.access.saveFeedback(token,input)},app=createApp(a.engine,undefined,async()=>'READY',boundary);
   await new Promise<void>(r=>app.listen(0,'127.0.0.1',r));const port=(app.address() as AddressInfo).port,origin=boundary.origin=`https://127.0.0.1:${port}`;
   const call=(token:string,path:string,body?:unknown)=>fetch(`http://127.0.0.1:${port}${path}`,{method:body?'POST':'GET',headers:{Origin:origin,'Content-Type':'application/json',Cookie:`__Host-brandopolis_session=${token}`},body:body?JSON.stringify(body):undefined});
   try{
    expect((await call(a.session.token,`/api/context?brandId=${brandA.id}`)).status).toBe(200);
    const attempts:[string,unknown?][]=[[`/api/context?brandId=${brandA.id}`],[`/api/blueprint?brandId=${brandA.id}`],['/api/questions/prepare',{brandId:brandA.id,questionId:qA,expectedActiveVersion:null}],['/api/recommendations/generate',{brandId:brandA.id,questionId:qA}],['/api/feedback',{brandId:brandA.id,usefulness:1,clarity:1,confidence:1,comment:'',kind:'FEEDBACK'}],['/api/decisions/commit',{command:{brandId:brandA.id,questionId:qA,selectedOption:'x',rationale:'x',expectedActiveVersion:null,actorUserId:b.who.userId,sourceRecommendationId:null,idempotencyKey:randomUUID()}}]];
    for(const [path,body] of attempts)expect((await call(b.session.token,path,body)).status).toBe(404);
    const listB=await (await call(b.session.token,'/api/brands')).json();expect(listB.map((x:{id:string})=>x.id)).toEqual([brandB.id]);
    // Forged combination: own Brand, another workspace's question id.
    expect((await call(b.session.token,'/api/questions/prepare',{brandId:brandB.id,questionId:qA,expectedActiveVersion:null})).status).toBe(404);
    for(const token of ['',randomUUID(),demo.token])expect([401,403]).toContain((await call(token,`/api/context?brandId=${brandA.id}`)).status);
    await a.db.update(t.sessions).set({expiresAt:new Date(Date.now()-1)}).where(eq(t.sessions.tokenHash,hash(b.session.token)));
    expect((await call(b.session.token,'/api/brands')).status).toBe(401);
    const fresh=await a.access.issueSession(a.subject);expect((await a.access.revokeSessions(a.who.userId)).revoked).toBeGreaterThanOrEqual(2);
    expect((await call(fresh.token,'/api/brands')).status).toBe(401);expect((await call(a.session.token,'/api/brands')).status).toBe(401);
    // An identity from another issuer never authorizes, even with the same subject.
    await expect(new PilotAccess(a.db,'https://other-issuer.example').issueSession(a.subject)).rejects.toMatchObject({code:'FORBIDDEN'});
    expect(JSON.stringify(await a.db.select().from(t.telemetry).where(eq(t.telemetry.brandId,brandA.id)))).not.toContain('Secret context A');
   }finally{await new Promise<void>(r=>app.close(()=>r()));}
  });
  it('operator inspect, revoke and metrics expose access and activation without tokens',async()=>{
   const a=await setup(),brand=await a.engine.createBrand(a.session.token,'Metrics');
   const info=await a.access.inspect({subject:a.subject});expect(info).toMatchObject({userId:a.who.userId,cohort:'A',identityActive:true,membershipActive:true,activeSessions:1,brands:[{id:brand.id,name:'Metrics'}]});
   expect(JSON.stringify(info)).not.toContain(a.session.token);
   const q=(await a.engine.context(a.session.token,brand.id)).questions.find(x=>x.module==='Primary Customer')!;
   await new Engine(a.db,undefined,new ModelGateway(new DemoProvider(),'pilot-strategic-v1')).analyze(a.session.token,brand.id,q.id);
   await a.engine.prepareQuestion(a.session.token,brand.id,q.id,null);
   await a.engine.commitDecision(a.session.token,{brandId:brand.id,questionId:q.id,selectedOption:'Primera',rationale:'Humana',expectedActiveVersion:null,actorUserId:a.who.userId,sourceRecommendationId:null,idempotencyKey:randomUUID()});
   const mine=(await a.access.metrics()).find(m=>m.userId===a.who.userId)!;
   expect(mine).toMatchObject({cohort:'A',sessions:1,brands:1,recommendationsRequested:1,decisionsApproved:1,activated:true,secondStrategicEvent:false});
   expect(mine.timeToFirstInsightSeconds).toBeGreaterThanOrEqual(0);expect(mine.timeToFirstDecisionSeconds).toBeGreaterThanOrEqual(mine.timeToFirstInsightSeconds!);
   await a.access.disable(a.who.userId);expect(await a.access.inspect({userId:a.who.userId})).toMatchObject({identityActive:false,membershipActive:false,activeSessions:0});
   await expect(a.access.inspect({subject:'nobody'})).rejects.toMatchObject({code:'NOT_FOUND'});
  });
  it('per-client rate limits protect login and AI without sharing one global budget',async()=>{
   const now={t:0},limiter=new RateLimiter(()=>now.t);
   for(let i=0;i<20;i++)expect(limiter.allow('auth:1.1.1.1',20,60000)).toBe(true);
   expect(limiter.allow('auth:1.1.1.1',20,60000)).toBe(false);expect(limiter.allow('auth:2.2.2.2',20,60000)).toBe(true);
   now.t=60000;expect(limiter.allow('auth:1.1.1.1',20,60000)).toBe(true);
   const a=await setup(),boundary:PilotBoundary={origin:'',limiter:new RateLimiter(),handle:async(_req,res,url)=>{if(url.pathname!=='/auth/login')return false;res.writeHead(302,{Location:'/'});res.end();return true;},authorize:token=>a.access.authorize(token),logout:token=>a.access.logout(token),feedback:(token:string,input:Record<string,unknown>)=>a.access.saveFeedback(token,input)},app=createApp(a.engine,undefined,async()=>'READY',boundary);
   await new Promise<void>(r=>app.listen(0,'127.0.0.1',r));const port=(app.address() as AddressInfo).port;boundary.origin=`https://127.0.0.1:${port}`;
   try{
    const statuses:number[]=[];for(let i=0;i<21;i++)statuses.push((await fetch(`http://127.0.0.1:${port}/auth/login`,{redirect:'manual'})).status);
    expect(statuses.slice(0,20).every(s=>s===302)).toBe(true);expect(statuses[20]).toBe(429);
    expect((await fetch(`http://127.0.0.1:${port}/health`)).status).toBe(200);
   }finally{await new Promise<void>(r=>app.close(()=>r()));}
  });
  it('DEMO and PILOT databases refuse each other’s data',async()=>{
   const {pool}=connection(),name=`class_${randomUUID().replaceAll('-','')}`;await pool.query(`CREATE DATABASE "${name}"`);
   const db=connect(pool.options.connectionString!.replace(/\/[^/]+$/,`/${name}`));
   try{
    await migrateDatabase(db.db);expect(await dataClassViolation(db.pool,'DEMO')).toBeNull();expect(await dataClassViolation(db.pool,'PILOT')).toBeNull();
    const demo=await seedIdentity(db.db);await new Engine(db.db).createBrand(demo.token,'Demo brand');
    expect(await dataClassViolation(db.pool,'PILOT')).toMatch(/Dedicated PILOT/);expect(await dataClassViolation(db.pool,'DEMO')).toBeNull();
    await new PilotAccess(db.db,'https://issuer.example').provision('mixed','A');
    expect(await dataClassViolation(db.pool,'DEMO')).toMatch(/PILOT data/);
   }finally{await db.pool.end();}
  });
  it('RC1 data written by the frozen RC1 engine survives the Pilot migration intact and stays usable',async()=>{
   const rc1='f4946683c8767aedc6c2fc7403d03beb3ab61e04',root=resolve('.local/rc1-engine',randomUUID());
   for(const file of execFileSync('git',['ls-tree','-r','--name-only',rc1,'src','schemas','config'],{encoding:'utf8'}).split('\n').filter(Boolean)){mkdirSync(dirname(resolve(root,file)),{recursive:true});writeFileSync(resolve(root,file),execFileSync('git',['show',`${rc1}:${file}`]));}
   const {Engine:Rc1Engine}=await import(pathToFileURL(resolve(root,'src/application/engine.ts')).href) as {Engine:typeof Engine};
   const {pool}=connection(),name=`rc1_${randomUUID().replaceAll('-','')}`,folder=`.local/migration-fixtures/${name}`;await pool.query(`CREATE DATABASE "${name}"`);
   const db=connect(pool.options.connectionString!.replace(/\/[^/]+$/,`/${name}`));
   const journal=JSON.parse(readFileSync('drizzle/meta/_journal.json','utf8'));journal.entries=journal.entries.filter((e:{idx:number})=>e.idx<=7);
   mkdirSync(`${folder}/meta`,{recursive:true});writeFileSync(`${folder}/meta/_journal.json`,JSON.stringify(journal));for(const e of journal.entries)copyFileSync(`drizzle/${e.tag}.sql`,`${folder}/${e.tag}.sql`);
   try{
    await migrate(db.db,{migrationsFolder:folder});
    const who=await seedIdentity(db.db),old=new Rc1Engine(db.db),brand=await old.createBrand(who.token,'RC1 brand','Contexto RC1');
    const qs=(await old.context(who.token,brand.id)).questions,q=(m:string)=>qs.find(x=>x.module===m)!.id;
    const commit=async(e:Engine,m:string,option:string,expected:string|null,reviewToken?:string)=>{await e.prepareQuestion(who.token,brand.id,q(m),expected);return e.commitDecision(who.token,{brandId:brand.id,questionId:q(m),selectedOption:option,rationale:'RC1 human rationale',expectedActiveVersion:expected,actorUserId:who.userId,sourceRecommendationId:null,idempotencyKey:randomUUID()},reviewToken);};
    const c1=await commit(old,'Primary Customer','Agencias',null),p1=await commit(old,'Positioning','Continuidad para agencias',null);await commit(old,'Primary Customer','Equipos internos',c1.versionId);
    const rc1State=await old.context(who.token,brand.id);expect(rc1State.decisions.find(d=>d.id===p1.decisionId)?.reviewStatus).toBe('NEEDS_REVIEW');expect(rc1State.reviews).toHaveLength(1);expect(rc1State.dependencies.length).toBeGreaterThan(0);
    const tables=(await db.pool.query(`select tablename from pg_tables where schemaname='public' order by 1`)).rows.map(r=>r.tablename as string);
    const snapshot=async()=>Object.fromEntries(await Promise.all(tables.map(async table=>[table,(await db.pool.query(`select * from "${table}" order by 1`)).rows])));
    const before=await snapshot();expect(await readiness(db.pool)).toBe('MIGRATIONS_REQUIRED');
    await migrateDatabase(db.db);await migrateDatabase(db.db);
    expect(await readiness(db.pool)).toBe('READY');expect(await snapshot()).toEqual(before);
    for(const table of ['pilot_workspaces','pilot_identities','pilot_sessions','pilot_events','pilot_feedback','login_flows'])expect((await db.pool.query('select to_regclass($1) as name',[table])).rows[0].name).toBe(table);
    // The current engine completes the pending human review on RC1 history.
    const now=new Engine(db.db),review=await now.beginReview(who.token,brand.id,p1.decisionId);await commit(now,'Positioning','Continuidad para equipos internos',p1.versionId,review.reviewToken);
    const final=await now.context(who.token,brand.id);expect(final.versions).toHaveLength(4);expect(final.versions.filter(v=>v.versionStatus==='SUPERSEDED').map(v=>v.selectedOption).sort()).toEqual(['Agencias','Continuidad para agencias']);
    expect(final.reviews[0]).toMatchObject({status:'COMPLETED',reviewedBy:who.userId});expect(final.audit.length).toBeGreaterThan(rc1State.audit.length);
    expect(await dataClassViolation(db.pool,'DEMO')).toBeNull();
   }finally{await db.pool.end();}
  },120000);
 });
}
