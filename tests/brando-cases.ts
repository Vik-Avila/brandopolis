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
 const setup=async(strategic=false)=>{
  const db=connection().db,engine=new Engine(db,undefined,strategic?new ModelGateway({name:'test',model:'test',generate:async request=>request.task==='BRANDO_CONTEXTUAL'?{...demoBrando(request.input),suggestionActions:[{kind:'STRATEGY',proposedDecision:'Agencias con varias cuentas activas'}]}:new DemoProvider().generate(request)}):undefined),who=await seedIdentity(db),brand=await engine.createBrand(who.token,'Brando A','Contexto exclusivo de A');
  // The Customer section by module, not by position: ADR-0021 put Objetivo and Arena first in the journey.
  const c=await engine.context(who.token,brand.id),q=c.questions.find(q=>q.module==='Primary Customer')!;
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
   const answer=await (await post({brandId:brand.id,message:'Sugiere algo',questionId:null})).json();
   const review={ticketId:answer.suggestionTickets[0].ticketId,action:'REJECT',rationale:'No concuerda con el problema observado.',revisedText:null};
   const reviewPost=(bearer:string,origin?:string)=>fetch(base+'/api/brando/suggestions/review',{method:'POST',headers:{'Content-Type':'application/json',...(origin?{Cookie:`brandopolis_session=${bearer}`,Origin:origin}:{Authorization:`Bearer ${bearer}`})},body:JSON.stringify({brandId:brand.id,review})});
   expect((await reviewPost('bad')).status).toBe(401);
   expect((await reviewPost(who.token,'https://foreign.example')).status).toBe(403);
   expect((await reviewPost(who.token)).status).toBe(200);

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
 it('human rejection records criterion once, preserves strategy and refuses acceptance through the reflection endpoint',async()=>{
  const {engine,who,brand,q}=await setup(),before=await engine.context(who.token,brand.id),practice=await engine.practice(who.token);
  const answer=await engine.askBrando(who.token,brand.id,'Sugiere un cambio',q.id),ticketId=answer.suggestionTickets[0].ticketId;
  const input={ticketId,action:'REJECT' as const,rationale:'No corresponde al problema que observamos.',revisedText:null};
  const first=await engine.reviewBrandoSuggestion(who.token,brand.id,input);expect(await engine.reviewBrandoSuggestion(who.token,brand.id,input)).toEqual(first);
  const after=await engine.context(who.token,brand.id);expect(after.versions).toEqual(before.versions);expect(after.decisions).toEqual(before.decisions);expect(after.reviews).toEqual(before.reviews);expect(after.learnings).toEqual(before.learnings);
  expect((await engine.practice(who.token)).length).toBe(practice.length+1);
  await expect(engine.reviewBrandoSuggestion(who.token,brand.id,{...input,rationale:'Ahora tengo otro criterio.'})).rejects.toMatchObject({code:'CONFLICT'});
  await expect(engine.reviewBrandoSuggestion(who.token,brand.id,{...input,action:'ACCEPT'})).rejects.toMatchObject({code:'INVALID'});
  await expect(engine.reviewBrandoSuggestion('invalid',brand.id,input)).rejects.toMatchObject({code:'UNAUTHORIZED'});
 });
 it('accepting Brando through human commit creates a version, records criterion once and retains dependency reviews',async()=>{
  const {engine,who,brand,q}=await setup(true);let c=await engine.context(who.token,brand.id);
  const downstream=c.questions.find(q=>q.module==='Positioning')!;
  await engine.prepareQuestion(who.token,brand.id,downstream.id,null);
  await engine.commitDecision(who.token,{brandId:brand.id,questionId:downstream.id,selectedOption:'Continuidad estratégica para agencias',rationale:'Posicionamiento coherente con el cliente aprobado',expectedActiveVersion:null,sourceRecommendationId:null,idempotencyKey:randomUUID(),actorUserId:who.userId});
  c=await engine.context(who.token,brand.id);const beforeDownstream=c.decisions.find(d=>d.questionId===downstream.id)!;
  const answer=await engine.askBrando(who.token,brand.id,'Sugiere un cliente más concreto',q.id),origin={ticketId:answer.suggestionTickets[0].ticketId,action:'ACCEPT' as const};
  const old=c.decisions.find(d=>d.questionId===q.id)!.activeVersionId,practice=(await engine.practice(who.token)).length;
  await engine.prepareQuestion(who.token,brand.id,q.id,old);
  const command={brandId:brand.id,questionId:q.id,selectedOption:'Agencias con varias cuentas activas',rationale:'Elegimos un foco más concreto por la continuidad que necesitan.',expectedActiveVersion:old,sourceRecommendationId:null,idempotencyKey:randomUUID(),actorUserId:who.userId};
  const result=await engine.commitDecision(who.token,command,undefined,origin);await engine.commitDecision(who.token,command,undefined,origin);
  const after=await engine.context(who.token,brand.id);expect(result.versionId).not.toBe(old);expect(after.versions.some(v=>v.id===old&&v.versionStatus==='SUPERSEDED')).toBe(true);
  expect(after.decisions.find(d=>d.id===beforeDownstream.id)?.activeVersionId).toBe(beforeDownstream.activeVersionId);
  expect(after.reviews.some(r=>r.downstreamDecisionId===beforeDownstream.id&&r.dependencyType==='HARD'&&r.status!=='COMPLETED')).toBe(true);
  expect((await engine.practice(who.token)).length).toBe(practice+1);expect(after.audit.filter(a=>a.operation==='BRANDO_SUGGESTION_APPLIED_BY_HUMAN')).toHaveLength(1);
  expect(after.learnings).toEqual(c.learnings);
 });
 it.each([
  ['ACCEPT','Agencias con varias cuentas activas','ACCEPT'],
  ['ACCEPT','Equipos internos que gestionan varias marcas','MODIFY'],
  ['MODIFY','Agencias con varias cuentas activas','MODIFY']
 ] as const)('records final human review accurately: %s / %s becomes %s',async(action,selectedOption,expectedAction)=>{
  const {engine,who,brand,q}=await setup(true);
  const answer=await engine.askBrando(who.token,brand.id,'Propón un cliente',q.id);
  const before=await engine.context(who.token,brand.id),practice=(await engine.practice(who.token)).length;
  const old=before.decisions.find(d=>d.questionId===q.id)!.activeVersionId;
  await engine.prepareQuestion(who.token,brand.id,q.id,old);
  const command={brandId:brand.id,questionId:q.id,selectedOption,rationale:'Este foco representa el criterio que quiero confirmar.',expectedActiveVersion:old,sourceRecommendationId:null,idempotencyKey:randomUUID(),actorUserId:who.userId};
  const origin={ticketId:answer.suggestionTickets[0].ticketId,action};
  const first=await engine.commitDecision(who.token,command,undefined,origin);
  expect((await engine.commitDecision(who.token,command,undefined,origin)).versionId).toBe(first.versionId);
  const after=await engine.context(who.token,brand.id);
  const audit=after.audit.filter(a=>a.operation==='BRANDO_SUGGESTION_APPLIED_BY_HUMAN');
  expect(audit).toHaveLength(1);
  expect(JSON.parse(audit[0].rationale!)).toMatchObject({action:expectedAction,selectedOption});
  const events=await engine.practice(who.token);expect(events).toHaveLength(practice+1);
  expect(events.some(e=>typeof e.behavior==='string'&&e.behavior.startsWith(expectedAction==='MODIFY'?'Modificaste una sugerencia de Brando':'Aceptaste una sugerencia de Brando')&&e.behavior.includes(command.rationale))).toBe(true);
  expect(after.versions.find(v=>v.id===first.versionId)?.selectedOption).toBe(selectedOption);
 });
 it('stale, foreign and invented Brando proposal proof cannot modify strategy or practice',async()=>{
  const {engine,who,brand,q}=await setup(true),answer=await engine.askBrando(who.token,brand.id,'Sugiere un cambio',q.id),ticketId=answer.suggestionTickets[0].ticketId;
  await engine.captureContext(who.token,brand.id,'user-input',{statement:'Tenemos información nueva.'});
  const before=await engine.context(who.token,brand.id),practice=await engine.practice(who.token);
  await expect(engine.reviewBrandoSuggestion(who.token,brand.id,{ticketId,action:'REJECT',rationale:'Ahora sabemos algo diferente.',revisedText:null})).rejects.toMatchObject({code:'CONFLICT'});
  await engine.prepareQuestion(who.token,brand.id,q.id,before.decisions[0].activeVersionId);
  const command={brandId:brand.id,questionId:q.id,selectedOption:'Otro segmento',rationale:'Nuevo criterio humano para elegir un cliente.',expectedActiveVersion:before.decisions[0].activeVersionId,sourceRecommendationId:null,idempotencyKey:randomUUID(),actorUserId:who.userId};
  await expect(engine.commitDecision(who.token,command,undefined,{ticketId,action:'MODIFY'})).rejects.toMatchObject({code:'CONFLICT'});
  await expect(engine.commitDecision(who.token,command,undefined,{ticketId:randomUUID(),action:'ACCEPT'})).rejects.toMatchObject({code:'NOT_FOUND'});
  const other=await engine.createBrand(who.token,'Otra marca');await expect(engine.reviewBrandoSuggestion(who.token,other.id,{ticketId,action:'REJECT',rationale:'No es la marca de esta sugerencia.',revisedText:null})).rejects.toMatchObject({code:'NOT_FOUND'});
  expect((await engine.context(who.token,brand.id)).versions).toEqual(before.versions);expect(await engine.practice(who.token)).toEqual(practice);
 });

 it('generic advice cannot become a strategic commit through a forged client action',async()=>{
  const {engine,who,brand,q}=await setup(),answer=await engine.askBrando(who.token,brand.id,'Qué fuentes revisar',q.id);
  expect(answer.suggestionTickets[0].kind).toBe('EVIDENCE');
  const before=await engine.context(who.token,brand.id),practice=await engine.practice(who.token),old=before.decisions.find(d=>d.questionId===q.id)!.activeVersionId;
  await engine.prepareQuestion(who.token,brand.id,q.id,old);
  await expect(engine.commitDecision(who.token,{brandId:brand.id,questionId:q.id,selectedOption:'Cambio fabricado',rationale:'Criterio simulado para probar la protección',expectedActiveVersion:old,sourceRecommendationId:null,idempotencyKey:randomUUID(),actorUserId:who.userId},undefined,{ticketId:answer.suggestionTickets[0].ticketId,action:'ACCEPT'})).rejects.toMatchObject({code:'INVALID'});
  expect((await engine.context(who.token,brand.id)).versions).toEqual(before.versions);expect(await engine.practice(who.token)).toEqual(practice);
 });

}
