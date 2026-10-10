import { it,expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { AddressInfo } from 'node:net';
import { Engine } from '../src/application/engine.js';
import { ModelGateway,type GatewayRequest } from '../src/domain/analysis.js';
import { demoBrando } from '../src/domain/brando.js';
import { seedIdentity } from '../scripts/seed.js';
import { createApp } from '../src/transport/http.js';
import type { connect } from '../src/persistence/database.js';
import * as t from '../src/persistence/schema.js';

/** ADR-0027 · Mi aprendizaje: private PersonalReflection, separate from Brand Context and Capability Context. */
export function reflectionCases(connection:()=>ReturnType<typeof connect>){
 const setup=async(engine?:Engine)=>{
  const db=connection().db,e=engine??new Engine(db),who=await seedIdentity(db),brand=await e.createBrand(who.token,'Reflexiones');
  const reflect=(extra:Record<string,unknown>={},token=who.token)=>e.createReflection(token,{changedThinking:'Aprendí a delimitar el mercado antes de elegir mensajes',idempotencyKey:randomUUID(),...extra});
  return {db,engine:e,who,brand,reflect};
 };

 it('ADR-0027: a reflection belongs to its author only; colleagues and other workspaces never read it',async()=>{
  const {db,engine,who,brand,reflect}=await setup();
  await expect(engine.createReflection(who.token,{idempotencyKey:randomUUID()}),'at least one answer').rejects.toMatchObject({code:'INVALID'});
  await expect(engine.createReflection(who.token,{changedThinking:'   ',idempotencyKey:randomUUID()})).rejects.toMatchObject({code:'INVALID'});
  await expect(engine.createReflection(who.token,{changedThinking:'x'.repeat(2001),idempotencyKey:randomUUID()})).rejects.toMatchObject({code:'INVALID'});
  const mine=await reflect({doDifferently:'Separar lo que sé de lo que necesito validar',brandId:brand.id});
  expect(mine).toMatchObject({brandId:brand.id,decisionId:null,changedThinking:expect.any(String),doDifferently:expect.any(String)});
  const colleague=await seedIdentity(db,'ADMIN',who.workspaceId),stranger=await seedIdentity(db);
  await reflect({changedThinking:'Reflexión de otra persona'},colleague.token);
  expect((await engine.reflections(who.token)).map(r=>r.id)).toEqual([mine.id]);
  expect((await engine.reflections(colleague.token)).map(r=>r.changedThinking),'an admin of the same workspace sees only their own').toEqual(['Reflexión de otra persona']);
  expect(await engine.reflections(stranger.token)).toEqual([]);
  // Linking to a brand never changes ownership, and only brands/decisions the author may open can be linked.
  const foreignBrand=await engine.createBrand(stranger.token,'Ajena');
  await expect(reflect({brandId:foreignBrand.id}),'other workspace brand').rejects.toMatchObject({code:'NOT_FOUND'});
  const member=await seedIdentity(db,'MEMBER',who.workspaceId);
  await expect(reflect({brandId:brand.id},member.token),'brand not assigned').rejects.toMatchObject({code:'FORBIDDEN'});
  const other=await engine.createBrand(who.token,'Otra marca');
  const c=await engine.context(who.token,other.id),q=c.questions.find(x=>x.module==='Primary Customer')!;
  await engine.prepareQuestion(who.token,other.id,q.id,null);
  const committed=await engine.commitDecision(who.token,{brandId:other.id,questionId:q.id,selectedOption:'Agencias',rationale:'Criterio',expectedActiveVersion:null,sourceRecommendationId:null,idempotencyKey:randomUUID(),actorUserId:who.userId});
  await expect(reflect({brandId:brand.id,decisionId:committed.decisionId}),'decision of another brand').rejects.toMatchObject({code:'NOT_FOUND'});
  await expect(reflect({decisionId:committed.decisionId}),'decision needs its brand').rejects.toMatchObject({code:'INVALID'});
  expect(await reflect({brandId:other.id,decisionId:committed.decisionId,learnedFromDecision:'Comparar antes de elegir'})).toMatchObject({decisionId:committed.decisionId});
 });

 it('ADR-0027: double submit is idempotent and HTML is stored as text, never interpreted',async()=>{
  const {engine,who,reflect}=await setup();
  const key=randomUUID(),payload='<img src=x onerror=alert(1)> cambió mi criterio';
  const first=await reflect({changedThinking:payload,idempotencyKey:key});
  expect(await reflect({changedThinking:payload,idempotencyKey:key}),'same key, same reflection').toEqual(first);
  await expect(reflect({changedThinking:'Otra cosa',idempotencyKey:key}),'same key, different content').rejects.toMatchObject({code:'CONFLICT'});
  // Two simultaneous submits with one key (double click) store one reflection and both succeed.
  const twin=randomUUID(),[x,y]=await Promise.all([reflect({changedThinking:'Doble clic',idempotencyKey:twin}),reflect({changedThinking:'Doble clic',idempotencyKey:twin})]);
  expect(x.id).toBe(y.id);
  const all=(await engine.reflections(who.token)).filter(r=>r.changedThinking!=='Doble clic');
  expect(all).toHaveLength(1);
  expect(all[0].changedThinking).toBe(payload);
 });

 it('ADR-0027: saving a reflection never changes Brand Context and never reaches Brando',async()=>{
  const requests:GatewayRequest[]=[];
  const gateway=new ModelGateway({name:'test',model:'test',generate:async r=>{requests.push(r);return demoBrando(r.input);}},'brando-contextual-v6');
  const db=connection().db,engine=new Engine(db,undefined,gateway);
  const {who,brand,reflect}=await setup(engine);
  await engine.captureContext(who.token,brand.id,'hypothesis',{statement:'Las agencias vuelven'});
  const tables=[t.decisions,t.versions,t.reviews,t.dependencies,t.hypotheses,t.learnings,t.evidence,t.experiments,t.signals,t.audits,t.telemetry] as const;
  const snapshot=async()=>Promise.all(tables.map(async table=>JSON.stringify((await db.select().from(table).where(eq(table.brandId,brand.id))).map(r=>JSON.stringify(r)).sort())));
  const practice=async()=>(await engine.practice(who.token)).length;
  const before=await snapshot(),practiceBefore=await practice();
  await reflect({changedThinking:'REFLEXION-PRIVADA-123',brandId:brand.id});
  expect(await snapshot(),'no decision, version, review, hypothesis, learning, evidence, audit or telemetry change').toEqual(before);
  expect(await practice(),'a reflection is not capability practice').toBe(practiceBefore);
  await engine.askBrando(who.token,brand.id,'¿Qué aprendí?',null);
  expect(JSON.stringify(requests),'reflections are never part of the provider packet').not.toContain('REFLEXION-PRIVADA-123');
 });

 it('ADR-0027: the reflection endpoints share the same-origin and session gates',async()=>{
  const {engine,who}=await setup();
  const server=createApp(engine);await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try{
   const login=await fetch(base+'/api/session',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({token:who.token})});
   const cookie=(login.headers.get('set-cookie')??'').split(';')[0];
   const post=(headers:Record<string,string>)=>fetch(base+'/api/reflections',{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify({changedThinking:'Una reflexión',idempotencyKey:randomUUID()})});
   expect((await post({Origin:'https://untrusted.example',Cookie:cookie})).status).toBe(403);
   expect((await post({Origin:base})).status).toBe(401);
   expect((await post({Origin:base,Cookie:cookie})).status).toBe(201);
   expect((await fetch(base+'/api/reflections')).status).toBe(401);
   const list=await (await fetch(base+'/api/reflections',{headers:{Cookie:cookie}})).json();
   expect(list).toHaveLength(1);
  }finally{await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));}
 });
}
