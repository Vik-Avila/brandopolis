import { readFileSync } from 'node:fs';
import { it,expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { AddressInfo } from 'node:net';
import { Engine,hash } from '../src/application/engine.js';
import { ModelGateway,DemoProvider,type GatewayRequest } from '../src/domain/analysis.js';
import { demoBrando } from '../src/domain/brando.js';
import { seedIdentity } from '../scripts/seed.js';
import { createApp } from '../src/transport/http.js';
import type { connect } from '../src/persistence/database.js';
import * as t from '../src/persistence/schema.js';

export function brandoCases(connection:()=>ReturnType<typeof connect>){
 const setup=async()=>{
  const db=connection().db,engine=new Engine(db),who=await seedIdentity(db),brand=await engine.createBrand(who.token,'Brando A','Contexto exclusivo de A');
  const c=await engine.context(who.token,brand.id),q=c.questions[0];
  await engine.prepareQuestion(who.token,brand.id,q.id,null);
  await engine.commitDecision(who.token,{brandId:brand.id,questionId:q.id,selectedOption:'Agencias pequeñas',rationale:'Necesitan conservar el criterio de varias marcas',expectedActiveVersion:null,sourceRecommendationId:null,idempotencyKey:randomUUID(),actorUserId:who.userId});
  return {db,engine,who,brand,q};
 };
 it('B1 reads human reasons without changing strategy, audit, recommendations or learning',async()=>{
  const {engine,who,brand,q}=await setup();
  await engine.analyze(who.token,brand.id,q.id);
  const before=await engine.context(who.token,brand.id);
  const response=await engine.askBrando(who.token,brand.id,'¿Qué decidimos y por qué?',q.id);
  expect(response.error).toBeNull();expect(response.answer?.facts[0].text).toContain('Necesitan conservar');
  expect(await engine.context(who.token,brand.id)).toEqual(before);
  expect(response.sources.every(s=>!JSON.stringify(s).includes(who.userId))).toBe(true);
 });
 it('B1 rejects foreign brands, questions, invalid sessions and unassigned brands before provider invocation',async()=>{
  const {db,who,brand,q}=await setup(),other=await seedIdentity(db);let calls=0;
  const gateway=new ModelGateway({name:'test',model:'test',generate:async r=>{calls++;return demoBrando(r.input);}}),engine=new Engine(db,undefined,gateway);
  await expect(engine.askBrando(other.token,brand.id,'consulta',null)).rejects.toMatchObject({code:'NOT_FOUND'});
  await expect(engine.askBrando('invalid',brand.id,'consulta',null)).rejects.toMatchObject({code:'UNAUTHORIZED'});
  const second=await engine.createBrand(who.token,'Brando B');
  await expect(engine.askBrando(who.token,second.id,'consulta',q.id)).rejects.toMatchObject({code:'NOT_FOUND'});
  await db.update(t.memberships).set({role:'MEMBER'}).where(eq(t.memberships.userId,who.userId));
  await db.delete(t.assignments).where(eq(t.assignments.brandId,brand.id));
  await expect(engine.askBrando(who.token,brand.id,'consulta',null)).rejects.toMatchObject({code:'FORBIDDEN'});
  expect(calls).toBe(0);
 });
 it('B1 rechecks context and session after inference and never returns stale or unauthorized content',async()=>{
  const {db,who,brand}=await setup();let engine:Engine;
  engine=new Engine(db,undefined,new ModelGateway({name:'test',model:'test',generate:async r=>{
   await engine.captureContext(who.token,brand.id,'user-input',{statement:'Contexto cambiado'});return demoBrando(r.input);
  }}));
  await expect(engine.askBrando(who.token,brand.id,'consulta',null)).rejects.toMatchObject({code:'CONFLICT'});
  engine=new Engine(db,undefined,new ModelGateway({name:'test',model:'test',generate:async r=>{
   await db.update(t.sessions).set({expiresAt:new Date(0)}).where(eq(t.sessions.tokenHash,hash(who.token)));return demoBrando(r.input);
  }}));
  await expect(engine.askBrando(who.token,brand.id,'consulta',null)).rejects.toMatchObject({code:'UNAUTHORIZED'});
 });
 it('B1 rejects fabricated citations and injection cannot acquire strategic write authority',async()=>{
  const {db,who,brand,engine:base}=await setup(),before=await base.context(who.token,brand.id);
  const engine=new Engine(db,undefined,new ModelGateway({name:'test',model:'test',generate:async r=>({...demoBrando(r.input),facts:[{text:'Inventado',referenceIds:['foreign-source']}]})}));
  const fixtures=JSON.parse(readFileSync('evals/brando-b1.json','utf8')) as {input:string;expectedCommits:number}[];
  for(const fixture of fixtures){
    const response=await engine.askBrando(who.token,brand.id,fixture.input,null);
    expect(response).toMatchObject({error:'INVALID_OUTPUT',answer:null,sources:[]});
    const after=await base.context(who.token,brand.id);
    expect(after.versions.length-before.versions.length).toBe(fixture.expectedCommits);
    expect(after).toEqual(before);
  }
 });
 it('B1 HTTP validates authority and input before returning a response',async()=>{
  const {engine,who,brand}=await setup();
  const server=createApp(engine);await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
  const base=`http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try{
   const post=(input:unknown,token=who.token)=>fetch(base+'/api/brando/ask',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(input)});
   expect((await post({brandId:brand.id,message:'consulta',questionId:null})).status).toBe(200);
   expect((await post({brandId:brand.id,message:'consulta'},'bad')).status).toBe(401);
   expect((await post({brandId:brand.id,message:'x'.repeat(2001)})).status).toBe(400);
   expect((await post({brandId:brand.id,message:'consulta',history:[{}]})).status).toBe(400);
   expect((await fetch(base+'/api/brando/ask',{method:'POST',headers:{Origin:'https://foreign.example','Content-Type':'application/json',Cookie:`brandopolis_session=${who.token}`},body:JSON.stringify({brandId:brand.id,message:'consulta'})})).status).toBe(403);
  }finally{await new Promise<void>(r=>server.close(()=>r()));}
 });
 it('B1 uses the authorized brand packet only and preserves manual operation on provider failure',async()=>{
  const {db,who,brand}=await setup();let request:GatewayRequest|undefined;
  const engine=new Engine(db,undefined,new ModelGateway({name:'test',model:'test',generate:async r=>{request=r;throw new Error('offline');}}));
  await engine.createBrand(who.token,'Foreign brand','Never send this other brand');
  const result=await engine.askBrando(who.token,brand.id,'consulta',null);
  expect(result.error).toBe('PROVIDER_ERROR');expect(result.answer).toBeNull();
  expect(JSON.stringify(request?.input)).not.toContain('Never send');
  expect(request?.task).toBe('BRANDO_CONTEXTUAL');expect(await engine.context(who.token,brand.id)).toBeTruthy();
  // The original deterministic recommendation path remains usable.
  const demo=new Engine(db,undefined,new ModelGateway(new DemoProvider()));
  const c=await demo.context(who.token,brand.id);expect((await demo.analyze(who.token,brand.id,c.questions[0].id)).error).toBeNull();
 });
}
