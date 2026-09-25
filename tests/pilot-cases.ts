import { describe,it,expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { generateKeyPair,exportJWK,SignJWT } from 'jose';
import * as oidc from 'openid-client';
import { eq } from 'drizzle-orm';
import type { AddressInfo } from 'node:net';
import { connect } from '../src/persistence/database.js';
import { startLocalDb } from '../scripts/local-db.js';
import { migrateDatabase } from '../scripts/migrate.js';
import { coldCopy } from '../scripts/local-recovery.js';
import { resolve } from 'node:path';
import { Engine,hash } from '../src/application/engine.js';
import { PilotAccess } from '../src/application/pilot-access.js';
import { PilotAuth } from '../src/transport/pilot-auth.js';
import { createApp } from '../src/transport/http.js';
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
   let nonce='',valid=true;
   const config=new oidc.Configuration({issuer,authorization_endpoint:issuer+'/authorize',token_endpoint:issuer+'/token',jwks_uri:issuer+'/jwks'},clientId,'test-fixture-secret');
   config[oidc.customFetch]=async input=>{
    if(String(input).endsWith('/jwks'))return Response.json({keys:[jwk]});
    const token=await new SignJWT({nonce,sub:a.subject}).setProtectedHeader({alg:'RS256',kid:'test-key'}).setIssuer(valid?issuer:'https://attacker.example').setAudience(clientId).setIssuedAt().setExpirationTime('5m').sign(privateKey);
    return Response.json({access_token:'fixture-access',token_type:'Bearer',id_token:token});
   };
   const server=createApp(a.engine,undefined,async()=>'READY');await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const port=(server.address() as AddressInfo).port;await new Promise<void>(r=>server.close(()=>r()));
   const origin=`https://127.0.0.1:${port}`,base=`http://127.0.0.1:${port}`,app=createApp(a.engine,undefined,async()=>'READY',new PilotAuth(a.db,config,origin));await new Promise<void>(r=>app.listen(port,'127.0.0.1',r));
   try{
    async function login(){const r=await fetch(base+'/auth/login',{redirect:'manual'}),target=new URL(r.headers.get('location')!);nonce=target.searchParams.get('nonce')!;return {cookie:r.headers.getSetCookie()[0].split(';')[0],state:target.searchParams.get('state')!};}
    const first=await login();expect(first.cookie).toMatch(/^__Host-brandopolis_flow=/);
    expect((await fetch(base+'/auth/callback?code=fixture&state=wrong',{headers:{Cookie:first.cookie},redirect:'manual'})).status).toBe(401);
    const result=await fetch(base+`/auth/callback?code=fixture&state=${first.state}`,{headers:{Cookie:first.cookie},redirect:'manual'});expect(result.status).toBe(302);
    const sessionCookie=result.headers.getSetCookie().find(v=>v.startsWith('__Host-brandopolis_session='))!;expect(sessionCookie).toContain('Secure; HttpOnly; SameSite=Strict');const cookie=sessionCookie.split(';')[0];
    expect((await fetch(base+'/api/me',{headers:{Cookie:cookie}})).status).toBe(200);
    expect((await fetch(base+`/auth/callback?code=fixture&state=${first.state}`,{headers:{Cookie:first.cookie},redirect:'manual'})).status).toBe(401);
    expect((await fetch(base+'/api/me',{headers:{Authorization:`Bearer ${a.session.token}`}})).status).toBe(401);
    expect((await fetch(base+'/api/brands',{method:'POST',headers:{Cookie:cookie,Origin:'https://attacker.example','Content-Type':'application/json'},body:'{}'})).status).toBe(403);
    expect((await fetch(base+'/api/session',{method:'POST',headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json'},body:'{}'})).status).toBe(403);
    expect((await fetch(base+'/api/logout',{method:'POST',headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json'},body:'{}'})).status).toBe(200);
    expect((await fetch(base+'/api/me',{headers:{Cookie:cookie}})).status).toBe(401);
    valid=false;const second=await login();expect((await fetch(base+`/auth/callback?code=fixture&state=${second.state}`,{headers:{Cookie:second.cookie},redirect:'manual'})).status).toBe(401);
   }finally{await new Promise<void>(r=>app.close(()=>r()));}
  });
  it('real-provider adapter validates output and usage; outage never falls back to a DEMO or commits',async()=>{
   const a=await setup(),brand=await a.engine.createBrand(a.session.token,'AI'),ctx=await a.engine.context(a.session.token,brand.id),q=ctx.questions[0],packet=await a.engine.assembleContext(a.session.token,brand.id,q.id);
   const req:GatewayRequest={task:'STRATEGIC_ANALYSIS',module:q.module,promptVersion:'pilot-strategic-v1',contextVersion:packet.contextVersion,input:packet,outputSchema:'recommendation',budget:{maxCharacters:20000,timeoutMs:1000},tenantScope:{workspaceId:a.who.workspaceId,brandId:brand.id},questionId:q.id};
   const output=await new DemoProvider().generate(req);let captured='';
   const provider=new AnthropicProvider('fixture-key','configured-model',async(_url,init)=>{captured=String(init?.body);return Response.json({stop_reason:'end_turn',content:[{type:'text',text:JSON.stringify(output)}],usage:{input_tokens:50,output_tokens:60}});});
   const result=await new ModelGateway(provider).invoke(req);expect(result.error).toBeNull();expect(result.tokenIn).toBe(50);expect(result.tokenOut).toBe(60);expect(captured).toContain('json_schema');expect(captured).not.toContain('fixture-key');
   const unavailable=new Engine(a.db,undefined,new ModelGateway(new UnavailableProvider(),'pilot-strategic-v1'));
   expect((await unavailable.analyze(a.session.token,brand.id,q.id)).error).toBe('PROVIDER_ERROR');expect((await a.engine.context(a.session.token,brand.id)).versions).toHaveLength(0);
   const malformed=new AnthropicProvider('fixture-key','configured-model',async()=>Response.json({stop_reason:'end_turn',content:[{type:'text',text:'{}'}]}));expect((await new ModelGateway(malformed).invoke(req)).error).toBe('INVALID_OUTPUT');
  });
  it('cold backup restores actual PILOT identity, context and decision history without resetting data',async()=>{
   const root=resolve('.local/recovery-tests',randomUUID()),source=resolve(root,'source'),backup=resolve(root,'backup'),restored=resolve(root,'restored');
   let cluster=await startLocalDb(false,{directory:source,port:55435}),db=connect(cluster.url);
   let stopped=false;
   try{
    await migrateDatabase(db.db);const access=new PilotAccess(db.db,'https://recovery.example'),who=await access.provision('recovery-fixture','B'),session=await access.issueSession('recovery-fixture'),engine=new Engine(db.db),brand=await engine.createBrand(session.token,'Restore fixture','Preserved context');
    const question=(await engine.context(session.token,brand.id)).questions.find(q=>q.module==='Primary Customer')!;
    await engine.prepareQuestion(session.token,brand.id,question.id,null);await engine.commitDecision(session.token,{brandId:brand.id,questionId:question.id,selectedOption:'Preserved choice',rationale:'Human recovery fixture',expectedActiveVersion:null,actorUserId:who.userId,sourceRecommendationId:null,idempotencyKey:randomUUID()});
    const before=await engine.context(session.token,brand.id);expect(()=>coldCopy(source,backup)).toThrow('Stop PostgreSQL');
    await db.pool.end();await cluster.db.stop();stopped=true;coldCopy(source,backup);coldCopy(backup,restored);expect(()=>coldCopy(backup,restored)).toThrow();
    cluster=await startLocalDb(false,{directory:restored,port:55435});stopped=false;db=connect(cluster.url);
    await migrateDatabase(db.db);await migrateDatabase(db.db);
    const after=await new Engine(db.db).context(session.token,brand.id);expect(after.versions).toEqual(before.versions);expect(after.userInputs).toEqual(before.userInputs);expect(after.audit).toEqual(before.audit);
    expect((await new PilotAccess(db.db,'https://recovery.example').authorize(session.token)).userId).toBe(who.userId);
   }finally{await db.pool.end().catch(()=>{});if(!stopped)await cluster.db.stop();}
  },60000);
 });
}
