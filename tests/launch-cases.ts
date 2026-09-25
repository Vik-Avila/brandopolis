import { describe,it,expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { mkdirSync,writeFileSync } from 'node:fs';
import { loadAsset } from '../src/transport/assets.js';
import { resolve,dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import type { AddressInfo } from 'node:net';
import { eq } from 'drizzle-orm';
import { connect } from '../src/persistence/database.js';
import { migrateDatabase } from '../scripts/migrate.js';
import { seedIdentity } from '../scripts/seed.js';
import { Engine } from '../src/application/engine.js';
import { PilotAccess } from '../src/application/pilot-access.js';
import { PilotAuth,loadAiNotice,type PilotAiPolicy } from '../src/transport/pilot-auth.js';
import { createApp,RateLimiter } from '../src/transport/http.js';
import { AnthropicProvider,UnavailableProvider } from '../src/transport/anthropic-provider.js';
import { ModelGateway,DemoProvider,type GatewayRequest } from '../src/domain/analysis.js';
import { readiness,migrationPlan,containsPilotData,SINGLE_INSTANCE_LOCK } from '../src/persistence/readiness.js';
import * as t from '../src/persistence/schema.js';
import { validatePilotEnv } from '../scripts/pilot-config.js';
import { preflight } from '../scripts/pilot-preflight.js';
import { launchSmoke } from '../scripts/pilot-smoke.js';
import { backupPlan } from '../scripts/pilot-backup.js';
import { oidcFixture } from './oidc-fixture.js';

const SECRET='sk-very-secret-value-0123456789';
const validEnv=(over:Record<string,string|undefined>={}):NodeJS.ProcessEnv=>({PILOT_DATA_CLASS:'PILOT',DATABASE_URL:'postgresql://pilot:pw@db.internal:5432/pilot?sslmode=verify-full',PILOT_ORIGIN:'https://pilot.brandopolis.test',OIDC_ISSUER:'https://login.provider.test/',OIDC_CLIENT_ID:'client',OIDC_CLIENT_SECRET:SECRET,ANTHROPIC_API_KEY:SECRET,ANTHROPIC_MODEL:'claude-opus-5',PILOT_REQUEST_ACCESS_URL:'mailto:pilot@brandopolis.test',...over});

export function launchCases(connection:()=>ReturnType<typeof connect>){
 const scratch=async()=>{const {pool}=connection(),name=`launch_${randomUUID().replaceAll('-','')}`;await pool.query(`CREATE DATABASE "${name}"`);return {url:pool.options.connectionString!.replace(/\/[^/]+$/,`/${name}`),...connect(pool.options.connectionString!.replace(/\/[^/]+$/,`/${name}`))};};
 // A PILOT app on a random port whose configured origin is https://127.0.0.1:<port> (TLS is the proxy's job).
 async function pilotApp(db:ReturnType<typeof connect>['db'],options:{ai?:PilotAiPolicy;provider?:ConstructorParameters<typeof ModelGateway>[0]}={}) {
  const fixture=await oidcFixture(),holder:{auth?:PilotAuth}={};
  const app=createApp(new Engine(db,undefined,new ModelGateway(options.provider??new UnavailableProvider(),'pilot-strategic-v1')),loadAsset,async()=>'READY',{get origin(){return holder.auth!.origin;},get ai(){return holder.auth!.ai;},limiter:new RateLimiter(),handle:(q,r,u)=>holder.auth!.handle(q,r,u),authorize:x=>holder.auth!.authorize(x),logout:x=>holder.auth!.logout(x),feedback:(x,i)=>holder.auth!.feedback(x,i),aiGate:x=>holder.auth!.aiGate(x),acceptAiNotice:(x,v)=>holder.auth!.acceptAiNotice(x,v)});
  await new Promise<void>(r=>app.listen(0,'127.0.0.1',r));const port=(app.address() as AddressInfo).port,origin=`https://127.0.0.1:${port}`;
  holder.auth=new PilotAuth(db,fixture.config,origin,{limiter:new RateLimiter(),ai:options.ai});
  const base=`http://127.0.0.1:${port}`,access=new PilotAccess(db,'https://issuer.example');
  const call=(cookie:string|null,path:string,body?:unknown)=>fetch(base+path,{method:body?'POST':'GET',headers:{Origin:origin,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});
  return {app,base,origin,fixture,access,call,close:()=>new Promise<void>(r=>app.close(()=>r()))};
 }
 describe('LIVE PILOT launch gate',()=>{
  it('config validator: accepts a coherent Internet config and rejects every unsafe variant without echoing secrets',()=>{
   const ok=validatePilotEnv(validEnv());expect(ok.errors).toEqual([]);expect(ok.settings).toMatchObject({origin:'https://pilot.brandopolis.test',oidc:{redirectUri:'https://pilot.brandopolis.test/auth/callback',confidential:true,issuer:'https://login.provider.test/'},ai:{enabled:true,model:'claude-opus-5',dailyCapPerTester:30,dailyCapTotal:300}});
   const cases:[Record<string,string|undefined>,RegExp][]=[
    [{PILOT_DATA_CLASS:'DEMO'},/PILOT_DATA_CLASS/],[{DATABASE_URL:undefined},/DATABASE_URL is required/],[{DATABASE_URL:'mysql://x/y'},/postgres/],
    [{PILOT_ORIGIN:'http://pilot.brandopolis.test'},/https/],[{PILOT_ORIGIN:'https://pilot.brandopolis.test/app'},/bare origin/],[{PILOT_ORIGIN:'https://localhost:3000'},/not a local address/],
    [{PILOT_ORIGIN:'https://127.0.0.1'},/not a local address/],[{PILOT_ORIGIN:'https://pilot.example.com'},/placeholder/],[{OIDC_ISSUER:'http://login.provider.test'},/OIDC_ISSUER must use https/],
    [{OIDC_ISSUER:'not a url'},/not a valid URL/],[{OIDC_CLIENT_ID:''},/OIDC_CLIENT_ID/],[{OIDC_CLIENT_SECRET:undefined},/OIDC_PUBLIC_CLIENT/],[{OIDC_PUBLIC_CLIENT:'true'},/mutually exclusive/],
    [{OIDC_REDIRECT_URI:'https://evil.test/auth/callback'},/OIDC_REDIRECT_URI/],[{ANTHROPIC_MODEL:undefined},/both ANTHROPIC_API_KEY and ANTHROPIC_MODEL/],[{AI_TIMEOUT_MS:'5'},/AI_TIMEOUT_MS/],
    [{PILOT_AI_DAILY_CAP_PER_TESTER:'-1'},/PILOT_AI_DAILY_CAP_PER_TESTER/],[{PILOT_REQUEST_ACCESS_URL:'javascript:alert(1)'},/https: or mailto:/],[{PILOT_REQUEST_ACCESS_URL:'mailto:a@example.com'},/placeholder/],
    [{TRUST_PROXY:'yes'},/TRUST_PROXY/],[{PORT:'70000'},/PORT/]];
   for(const [over,message] of cases){const r=validatePilotEnv(validEnv(over));expect(r.settings,JSON.stringify(over)).toBeNull();expect(r.errors.join(' ')).toMatch(message);expect(JSON.stringify(r)).not.toContain(SECRET);}
   expect(validatePilotEnv(validEnv({PILOT_ORIGIN:'https://127.0.0.1:3002',PILOT_LOCAL_REHEARSAL:'true'})).errors).toEqual([]);
   const publicClient=validatePilotEnv(validEnv({OIDC_CLIENT_SECRET:undefined,OIDC_PUBLIC_CLIENT:'true',ANTHROPIC_API_KEY:undefined,ANTHROPIC_MODEL:undefined}));
   expect(publicClient.errors).toEqual([]);expect(publicClient.settings?.ai.enabled).toBe(false);expect(publicClient.warnings.join(' ')).toMatch(/AI disabled/);
   expect(validatePilotEnv(validEnv({DATABASE_URL:'postgresql://p:pw@db.internal/pilot'})).warnings.join(' ')).toMatch(/sslmode/);
  });
  it('OIDC rejects wrong audience, expired token, wrong issuer, replay and unprovisioned or disabled identities; valid identity succeeds',async()=>{
   const {db}=connection(),p=await pilotApp(db),subject=randomUUID(),who=await p.access.provision(subject,'A');
   try{
    const denied=async(r:Awaited<ReturnType<typeof p.fixture.login>>,reason:string)=>{expect(r.callback.status).toBe(302);expect(r.location).toBe('/?login='+reason);expect(r.cookie).toBeNull();};
    await denied(await p.fixture.login(p.base,subject,{audience:'another-client'}),'failed');
    await denied(await p.fixture.login(p.base,subject,{expires:Math.floor(Date.now()/1000)-300}),'failed');
    await denied(await p.fixture.login(p.base,subject,{issuer:'https://attacker.test'}),'failed');
    await denied(await p.fixture.login(p.base,subject,{nonce:'forged-nonce'}),'failed');
    await denied(await p.fixture.login(p.base,randomUUID()),'denied');
    const ok=await p.fixture.login(p.base,subject);expect(ok.location).toBe('/');expect(ok.cookie).toMatch(/^__Host-brandopolis_session=/);
    expect((await p.call(ok.cookie,'/api/me')).status).toBe(200);
    const replay=await fetch(p.base+`/auth/callback?code=fixture&state=${ok.state}`,{headers:{Cookie:ok.flow},redirect:'manual'});expect(replay.headers.get('location')).toBe('/?login=expired');
    await p.access.disable(who.userId);expect((await p.call(ok.cookie,'/api/me')).status).toBe(401);await denied(await p.fixture.login(p.base,subject),'denied');
   }finally{await p.close();}
  });
  it('AI provider 5xx, connection failure and timeout map to safe gateway errors without commits',async()=>{
   const req={task:'STRATEGIC_ANALYSIS',module:'Primary Customer',promptVersion:'pilot-strategic-v1',contextVersion:'v',input:{items:[]},outputSchema:'recommendation',budget:{maxCharacters:20000,timeoutMs:5000},tenantScope:{workspaceId:'w',brandId:'b'},questionId:'q'} as unknown as GatewayRequest;
   const server=new AnthropicProvider('fixture-key','m',async()=>Response.json({type:'error',error:{type:'api_error',message:'boom'}},{status:500}));expect((await new ModelGateway(server).invoke(req)).error).toBe('PROVIDER_ERROR');
   const offline=new AnthropicProvider('fixture-key','m',async()=>{throw new TypeError('fetch failed');});expect((await new ModelGateway(offline).invoke(req)).error).toBe('PROVIDER_ERROR');
   const slow=new AnthropicProvider('fixture-key','m',()=>new Promise(r=>setTimeout(()=>r(Response.json({})),2000)));expect((await new ModelGateway(slow).invoke({...req,budget:{maxCharacters:20000,timeoutMs:300}})).error).toBe('TIMEOUT');
  },20000);
  it('AI guardrails: notice acknowledgement, per-tester and total daily caps, disabled AI needs no notice',async()=>{
   const {db}=connection(),notice=loadAiNotice('config/pilot/ai-notice.v1.md');
   const p=await pilotApp(db,{ai:{notice,capPerTester:2,capTotal:1000},provider:new DemoProvider()}),subject=randomUUID();await p.access.provision(subject,'B');
   try{
    const mode=await (await p.call(null,'/api/mode')).json();expect(mode.aiNotice).toEqual(notice);expect(notice.text).toMatch(/proveedor de IA/);
    const {cookie}=await p.fixture.login(p.base,subject),brand=await (await p.call(cookie,'/api/brands',{name:'AI caps'})).json();
    const questionId=(await (await p.call(cookie,`/api/context?brandId=${brand.id}`)).json()).questions[0].id,ask=()=>p.call(cookie,'/api/recommendations/generate',{brandId:brand.id,questionId});
    const blocked=await ask();expect(blocked.status).toBe(428);expect((await blocked.json()).code).toBe('AI_CONSENT_REQUIRED');
    expect((await p.call(cookie,`/api/context?brandId=${brand.id}`).then(r=>r.json())).analyses).toHaveLength(0);
    expect((await p.call(cookie,'/api/ai-notice/accept',{version:'000000000000'})).status).toBe(409);
    expect((await p.call(cookie,'/api/ai-notice/accept',{version:notice.version})).status).toBe(200);
    expect((await ask()).status).toBe(200);expect((await ask()).status).toBe(200);
    const capped=await ask();expect(capped.status).toBe(429);expect((await capped.json()).code).toBe('AI_CAP_REACHED');
    const ctx=await (await p.call(cookie,`/api/context?brandId=${brand.id}`)).json();expect(ctx.versions).toHaveLength(0);expect(ctx.analyses).toHaveLength(2);
   }finally{await p.close();}
   const off=await pilotApp(db),other=randomUUID();await off.access.provision(other,'A');
   try{const {cookie}=await off.fixture.login(off.base,other),brand=await (await off.call(cookie,'/api/brands',{name:'No AI'})).json(),q=(await (await off.call(cookie,`/api/context?brandId=${brand.id}`)).json()).questions[0].id;
    const r=await (await off.call(cookie,'/api/recommendations/generate',{brandId:brand.id,questionId:q})).json();expect(r).toMatchObject({recommendation:null,error:'UNAVAILABLE'});
    expect((await (await off.call(null,'/api/mode')).json()).aiNotice).toBeNull();
   }finally{await off.close();}
  });
  it('launch path survives an application restart: tester mapping, session, Brand, Decision, feedback and telemetry persist',async()=>{
   const s=await scratch();await migrateDatabase(s.db);let p=await pilotApp(s.db);const subject='restart-'+randomUUID(),who=await p.access.provision(subject,'A');
   let pool2:ReturnType<typeof connect>|undefined;
   try{
    const {cookie}=await p.fixture.login(p.base,subject);
    const brand=await (await p.call(cookie,'/api/brands',{name:'Restart brand',initialContext:'Contexto inicial'})).json();
    const q=(await (await p.call(cookie,`/api/context?brandId=${brand.id}`)).json()).questions.find((x:{module:string})=>x.module==='Primary Customer');
    expect((await p.call(cookie,'/api/questions/prepare',{brandId:brand.id,questionId:q.id,expectedActiveVersion:null})).status).toBe(200);
    const commit=await p.call(cookie,'/api/decisions/commit',{command:{brandId:brand.id,questionId:q.id,selectedOption:'Primera decisión',rationale:'Criterio humano',expectedActiveVersion:null,actorUserId:who.userId,sourceRecommendationId:null,idempotencyKey:randomUUID()}});expect(commit.status).toBe(200);
    expect((await p.call(cookie,'/api/feedback',{brandId:brand.id,usefulness:5,clarity:4,confidence:4,comment:'',kind:'FEEDBACK'})).status).toBe(201);
    const before=await (await p.call(cookie,`/api/context?brandId=${brand.id}`)).json();
    await p.close();await s.pool.end();
    // Restart: new pool, new process-equivalent app. Sessions are server-side rows, so they survive by design.
    pool2=connect(s.url);expect(await readiness(pool2.pool)).toBe('READY');p=await pilotApp(pool2.db);
    const after=await (await p.call(cookie,`/api/context?brandId=${brand.id}`)).json();
    for(const key of ['decisions','versions','audit','userInputs','questions'])expect(after[key]).toEqual(before[key]);
    expect(await p.access.inspect({subject})).toMatchObject({userId:who.userId,identityActive:true,activeSessions:1,brands:[{id:brand.id}]});
    const report=await p.access.report();expect(report).toMatchObject({testers:1,activated:1,activationRate:1,feedback:{responses:1,usefulness:{5:1}}});
    expect(report.timeToFirstDecision.n).toBe(1);expect(JSON.stringify(report)).not.toContain('Primera decisión');expect(JSON.stringify(report)).not.toContain(subject);
    expect((await p.call(cookie,'/api/logout',{})).status).toBe(200);expect((await p.call(cookie,'/api/brands')).status).toBe(401);
   }finally{await p.close();await (pool2?.pool??s.pool).end().catch(()=>{});}
  });
  it('session probe answers 200 without revealing why a session is invalid; DEMO tokens never count in PILOT',async()=>{
   const {db}=connection(),p=await pilotApp(db),subject=randomUUID();await p.access.provision(subject,'A');const demo=await seedIdentity(db);
   try{
    const probe=async(cookie:string|null)=>{const r=await p.call(cookie,'/api/session-state');expect(r.status).toBe(200);return r.json();};
    expect(await probe(null)).toEqual({authenticated:false});
    expect(await probe(`__Host-brandopolis_session=${demo.token}`)).toEqual({authenticated:false});
    const {cookie}=await p.fixture.login(p.base,subject);expect(await probe(cookie)).toEqual({authenticated:true});
    await p.access.revokeSessions((await p.access.inspect({subject})).userId);expect(await probe(cookie)).toEqual({authenticated:false});
   }finally{await p.close();}
  });
  it('launch smoke passes against a PILOT server and fails against DEMO',async()=>{
   const {db}=connection(),p=await pilotApp(db);
   try{const checks=await launchSmoke(p.base,{origin:p.origin,issuerHost:'issuer.example'});expect(checks.filter(c=>c.status!=='PASS')).toEqual([]);expect(checks.map(c=>c.name)).toEqual(['health','mode','headers','oidc-login','flow-cookie','auth-required','csrf','demo-disabled']);}
   finally{await p.close();}
   const demo=createApp(new Engine(db),undefined,async()=>'READY');await new Promise<void>(r=>demo.listen(0,'127.0.0.1',r));
   try{const base=`http://127.0.0.1:${(demo.address() as AddressInfo).port}`;expect((await launchSmoke(base,{origin:base})).filter(c=>c.status==='FAIL').map(c=>c.name)).toEqual(expect.arrayContaining(['health','mode','headers','oidc-login']));}
   finally{await new Promise<void>(r=>demo.close(()=>r()));}
  });
  it('pre-flight is read-only and reports config, migrations, data class, single instance and OIDC',async()=>{
   const s=await scratch(),env=(url:string)=>validEnv({DATABASE_URL:url,PILOT_ORIGIN:'https://127.0.0.1:3443',PILOT_LOCAL_REHEARSAL:'true',PG_BIN:resolve('.local/no-pg-bin')});
   try{
    const status=(checks:Awaited<ReturnType<typeof preflight>>,name:string)=>checks.filter(c=>c.name===name).map(c=>c.status);
    let checks=await preflight(env(s.url),{discover:async()=>'https://login.provider.test/'});
    expect(status(checks,'migrations')).toEqual(['FAIL']);expect(checks.find(c=>c.name==='migrations')!.detail).toMatch(/0\/9 applied, 9 pending/);
    expect((await s.pool.query("select to_regclass('public.brands') as n")).rows[0].n).toBeNull();
    await migrateDatabase(s.db);
    checks=await preflight(env(s.url),{discover:async()=>'https://login.provider.test/'});
    for(const name of ['config','database','migrations','data-class','single-instance','oidc','ai-notice'])expect(status(checks,name),name).toContain('PASS');
    expect(status(checks,'backup-tools')).toEqual(['WARN']);expect(JSON.stringify(checks)).not.toContain(SECRET);
    const holder=await s.pool.connect();await holder.query('select pg_advisory_lock($1)',[SINGLE_INSTANCE_LOCK]);
    try{expect(status(await preflight(env(s.url),{discover:async()=>'x'}),'single-instance')).toEqual(['WARN']);}finally{holder.release(true);}
    expect(status(await preflight(env(s.url),{discover:async()=>{throw new Error('down');}}),'oidc')).toEqual(['FAIL']);
    const demo=await seedIdentity(s.db);await new Engine(s.db).createBrand(demo.token,'DEMO brand');
    expect(status(await preflight(env(s.url),{discover:async()=>'x'}),'data-class')).toEqual(['FAIL']);
   }finally{await s.pool.end();}
  });
  it('forward-only migration plan detects pending and diverged schemas; DEMO tooling detects PILOT data',async()=>{
   const s=await scratch();
   try{
    expect(await migrationPlan(s.pool)).toEqual({applied:0,expected:9,pending:9,diverged:false});
    await migrateDatabase(s.db);expect(await migrationPlan(s.pool)).toEqual({applied:9,expected:9,pending:0,diverged:false});
    expect(await containsPilotData(s.pool)).toBe(false);await new PilotAccess(s.db,'https://issuer.example').provision('p','A');expect(await containsPilotData(s.pool)).toBe(true);
    await s.pool.query("insert into drizzle.__drizzle_migrations (hash, created_at) values ('future-migration', 99999999999999)");
    expect(await migrationPlan(s.pool)).toMatchObject({applied:10,diverged:true,pending:0});
    await s.pool.query("update drizzle.__drizzle_migrations set hash='edited' where created_at=(select min(created_at) from drizzle.__drizzle_migrations)");
    expect((await migrationPlan(s.pool)).diverged).toBe(true);
   }finally{await s.pool.end();}
  });
  it('hosted backup wrapper refuses unsafe targets and keeps credentials out of argv',()=>{
   const env=validEnv(),exists=(p:string)=>p.endsWith('existing.dump');
   expect(()=>backupPlan(undefined,'x.dump',env,exists)).toThrow(/Usage/);expect(()=>backupPlan('drop','x.dump',env,exists)).toThrow(/Usage/);
   expect(()=>backupPlan('backup','existing.dump',env,exists)).toThrow(/already exists/);
   const plan=backupPlan('backup','new.dump',env,exists);expect(plan.steps).toHaveLength(1);expect(plan.steps[0].args).toEqual(['--format=custom','--no-owner','--no-acl','--file',resolve('new.dump')]);
   expect(JSON.stringify(plan.steps)).not.toContain('pw');expect(plan.pgEnv).toMatchObject({PGHOST:'db.internal',PGDATABASE:'pilot',PGSSLMODE:'verify-full',PGPASSWORD:'pw'});
   expect(()=>backupPlan('restore-empty','existing.dump',env,exists)).toThrow(/PILOT_RESTORE_CONFIRM/);
   expect(()=>backupPlan('restore-empty','missing.dump',{...env,PILOT_RESTORE_CONFIRM:'EMPTY_ISOLATED_DATABASE'},exists)).toThrow(/not found/);
   const restore=backupPlan('restore-empty','existing.dump',{...env,PILOT_RESTORE_CONFIRM:'EMPTY_ISOLATED_DATABASE'},exists);
   expect(restore.steps.map(s=>s.args[0])).toEqual(['-X','--exit-on-error']);expect(restore.steps[1].args).toContain('--single-transaction');expect(restore.steps.flatMap(s=>s.args).join(' ')).not.toMatch(/--clean|--create|drop/i);
   expect(()=>backupPlan('backup','n.dump',{...env,PILOT_DATA_CLASS:'DEMO'},exists)).toThrow(/PILOT_DATA_CLASS/);
  });
  it('release rehearsal: frozen Pilot build and this build read and write the same database both ways',async()=>{
   const frozen='af73d0306e6fa0ba99462370a7ab5c1ba0c59f12',root=resolve('.local/frozen-pilot',randomUUID());
   for(const file of execFileSync('git',['ls-tree','-r','--name-only',frozen,'src','schemas','config'],{encoding:'utf8'}).split('\n').filter(Boolean)){mkdirSync(dirname(resolve(root,file)),{recursive:true});writeFileSync(resolve(root,file),execFileSync('git',['show',`${frozen}:${file}`]));}
   const load=async<T,>(file:string)=>await import(pathToFileURL(resolve(root,file)).href) as T;
   const {Engine:OldEngine}=await load<{Engine:typeof Engine}>('src/application/engine.ts'),{PilotAccess:OldAccess}=await load<{PilotAccess:typeof PilotAccess}>('src/application/pilot-access.ts');
   const s=await scratch();await migrateDatabase(s.db);
   try{
    const old=new OldAccess(s.db,'https://issuer.example'),a=await old.provision('rehearsal-a','A'),session=await old.issueSession('rehearsal-a'),e=new OldEngine(s.db);
    const brands=[await e.createBrand(session.token,'Brand one','Contexto uno'),await e.createBrand(session.token,'Brand two')];
    for(const brand of brands){const q=(await e.context(session.token,brand.id)).questions.find(x=>x.module==='Primary Customer')!;await e.prepareQuestion(session.token,brand.id,q.id,null);
     await e.commitDecision(session.token,{brandId:brand.id,questionId:q.id,selectedOption:'Old build decision',rationale:'Human',expectedActiveVersion:null,actorUserId:a.userId,sourceRecommendationId:null,idempotencyKey:randomUUID()});}
    await old.saveFeedback(session.token,{brandId:brands[0].id,usefulness:3,clarity:3,confidence:3,comment:'',kind:'ISSUE'});
    const snapshot=async()=>Object.fromEntries(await Promise.all(['users','memberships','pilot_identities','brands','decisions','decision_versions','strategic_audit','pilot_feedback','pilot_events','telemetry','review_items'].map(async table=>[table,(await s.pool.query(`select * from "${table}" order by 1`)).rows])));
    const before=await snapshot();
    expect(await migrationPlan(s.pool)).toMatchObject({pending:0,diverged:false});await migrateDatabase(s.db);expect(await snapshot()).toEqual(before);
    // Forward: this build reads old data and records new-style events (notice acknowledgement) next to it.
    const current=new PilotAccess(s.db,'https://issuer.example');expect((await current.inspect({subject:'rehearsal-a'})).brands).toHaveLength(2);
    await current.acceptAiNotice(session.token,loadAiNotice('config/pilot/ai-notice.v1.md').version);
    const now=new Engine(s.db);for(const brand of brands)expect((await now.context(session.token,brand.id)).versions[0].selectedOption).toBe('Old build decision');
    // Back: the frozen build still reads everything after this build wrote to the database (application rollback).
    for(const brand of brands)expect((await e.context(session.token,brand.id)).decisions).toHaveLength(1);
    expect((await old.authorize(session.token)).userId).toBe(a.userId);
    expect((await s.pool.query('select count(*)::int n from pilot_events where name like $1',['ai_notice_accepted:%'])).rows[0].n).toBe(1);
    expect((await s.db.select().from(t.feedback).where(eq(t.feedback.userId,a.userId))).length).toBe(1);
   }finally{await s.pool.end();}
  },120000);
 });
}
