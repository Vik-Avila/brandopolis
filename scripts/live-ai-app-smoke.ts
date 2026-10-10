import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

/**
 * ADR-0026 · in-app live AI smoke. Runs against a local DEMO already started with
 * `pnpm competition:start --isolated --live-ai`. It never reads or prints a provider key: the key lives only in
 * the server's own terminal. Synthetic data only, two real provider calls (Brando B3 + possibilities).
 */
const base=process.env.BRANDOPOLIS_BASE_URL??'http://127.0.0.1:3001';
const sessionFile=process.env.BRANDOPOLIS_SESSION_FILE??'.local/rc1-smoke/demo-session.json';
if(!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base))throw new Error('Sólo se permite una DEMO local (127.0.0.1).');
let cookie='';
async function call<T=Record<string,unknown>>(path:string,body?:unknown,timeoutMs=60000):Promise<T>{
  const r=await fetch(base+path,{method:body===undefined?'GET':'POST',headers:{Origin:base,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(timeoutMs)});
  const setCookie=r.headers.get('set-cookie');if(setCookie)cookie=setCookie.split(';')[0];
  const data=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(`${path} → HTTP ${r.status} ${(data as {code?:string}).code??''}`);
  return data as T;
}
type Ctx={questions:{id:string;module:string}[];decisions:{id:string;questionId:string;activeVersionId:string|null;reviewStatus:string}[];versions:unknown[];reviews:unknown[];hypotheses:{id:string;status:string}[];learnings:{id:string;status:string;origin?:string}[]};
const checks:{name:string;pass:boolean;detail?:string}[]=[];
const check=(name:string,pass:boolean,detail?:string)=>checks.push({name,pass,detail});
let realCalls=0;
try{
  let token:string;
  try{token=(JSON.parse(readFileSync(sessionFile,'utf8')) as {token:string}).token;}catch{throw new Error('No se pudo leer el archivo de sesión local.');}
  await call('/api/session',{token});
  const mode=await call<{mode:string;liveAi?:boolean}>('/api/mode');
  check('server in DEMO local live AI mode',mode.mode==='DEMO'&&mode.liveAi===true);
  if(!mode.liveAi)throw new Error('La DEMO no está en modo --live-ai.');
  const me=await call<{userId:string}>('/api/me');
  const brand=await call<{id:string}>('/api/brands',{name:`Smoke IA en vivo · sintética ${Date.now()}`});
  const ctx=()=>call<Ctx>(`/api/context?brandId=${encodeURIComponent(brand.id)}`);
  const strategy=async()=>{const c=await ctx();return JSON.stringify([c.decisions,c.versions,c.reviews,c.hypotheses.map(h=>[h.id,h.status]),c.learnings.map(l=>[l.id,l.status])]);};
  const hypothesis=await call<{id:string}>('/api/context/capture',{brandId:brand.id,kind:'hypothesis',entity:{statement:'Las agencias ficticias vuelven cada semana a consultar sus decisiones'}});
  let c=await ctx();
  const pq=c.questions.find(q=>q.module==='Priority Experiment')!;
  await call('/api/questions/prepare',{brandId:brand.id,questionId:pq.id,expectedActiveVersion:null});
  const decision=await call<{decisionId:string}>('/api/decisions/commit',{command:{brandId:brand.id,questionId:pq.id,selectedOption:'Validar primero el regreso semanal (sintético)',rationale:'Criterio humano sintético para la prueba',expectedActiveVersion:null,sourceRecommendationId:null,idempotencyKey:randomUUID(),actorUserId:me.userId}});
  const experiment=await call<{id:string}>('/api/learning/create',{brandId:brand.id,kind:'experiment',decisionId:decision.decisionId,plan:{objective:'Comprobar el regreso semanal',successCriteria:'Tres de cinco agencias ficticias regresan'},entity:{hypothesisId:hypothesis.id,intendedSignal:'Agencias ficticias que consultan su historial cada semana',disconfirmingCriteria:'Menos de dos regresan en tres semanas',method:'Seguimiento ficticio de uso'}});
  await call('/api/learning/transition',{brandId:brand.id,kind:'experiment',objectId:experiment.id,expectedStatus:'PLANNED',status:'RUNNING'});
  await call('/api/hypotheses/review',{brandId:brand.id,review:{hypothesisId:hypothesis.id,expectedStatus:'UNTESTED',status:'TESTING',rationale:'Empiezo a probarla (sintético)',learningId:null,idempotencyKey:randomUUID()}});
  const signal=(observation:string,direction:string)=>call<{id:string}>('/api/learning/create',{brandId:brand.id,kind:'signal',entity:{experimentId:experiment.id,observation,source:'Registro ficticio de prueba',observedAt:new Date().toISOString(),direction}});
  const s1=await signal('Dos de cinco agencias ficticias regresaron la segunda semana','EXPECTED');
  const s2=await signal('Tres agencias ficticias dijeron que no recordaban la herramienta','CONTRARY');
  const candidate=await call<{id:string;status:string}>('/api/learning/create',{brandId:brand.id,kind:'learning',entity:{signalIds:[s1.id],hypothesisId:hypothesis.id,interpretation:'Borrador: hay regreso parcial',limitations:['Datos ficticios']}});
  check('candidate learning stays a candidate',candidate.status==='CANDIDATE');
  const before=await strategy();

  // FLOW AI-1 · Brando B3 interpretation through the app (real provider call 1).
  realCalls++;
  const b3=await call<{error:string|null;provider:string;trace:{model?:string;latencyMs:number};answer:{facts:{referenceIds:string[]}[];hypotheses:string[]}|null;sources:{id:string}[];assistanceProof:{proofId:string}|null}>('/api/brando/ask',{brandId:brand.id,questionId:null,message:'Ayúdame a interpretar estas señales. ¿Qué apoyan, qué no apoyan, qué otras explicaciones existen, qué no podemos concluir y qué debería revisar después?',history:[],interpretation:{signalIds:[s1.id,s2.id],hypothesisId:hypothesis.id,experimentId:experiment.id}},90000);
  check('AI-1 Brando B3 answered without provider error',b3.error===null,b3.error??undefined);
  check('AI-1 provider is ANTHROPIC',b3.provider==='ANTHROPIC',b3.provider);
  check('AI-1 configured model reported',!!b3.trace.model,b3.trace.model);
  check('AI-1 schema valid and references authorized (server-validated)',!!b3.answer&&b3.answer.facts.every(f=>f.referenceIds.length>0));
  check('AI-1 assistance proof issued',!!b3.assistanceProof);

  // FLOW AI-2 · possibilities in a Strategic Decision (real provider call 2).
  c=await ctx();
  const customer=c.questions.find(q=>q.module==='Primary Customer')!;
  realCalls++;
  const rec=await call<{error:string|null;provider:string;recommendation:{options:unknown[]}|null}>('/api/recommendations/generate',{brandId:brand.id,questionId:customer.id},90000);
  check('AI-2 possibilities generated without provider error',rec.error===null,rec.error??undefined);
  check('AI-2 provider is ANTHROPIC',rec.provider==='ANTHROPIC',rec.provider);
  check('AI-2 schema-valid options',!!rec.recommendation&&rec.recommendation.options.length>0);

  // FLOW AI-3 · candidate learning from the B3 answer with the server proof.
  const assisted=await call<{origin:string;status:string}>('/api/learning/create',{brandId:brand.id,kind:'learning',entity:{signalIds:[s1.id,s2.id],hypothesisId:hypothesis.id,interpretation:'Interpretación asistida (sintética): señales mixtas',limitations:['Datos ficticios'],assistanceProof:b3.assistanceProof?.proofId}});
  check('AI-3 learning recorded as BRANDO_ASSISTED by the server',assisted.origin==='BRANDO_ASSISTED',assisted.origin);
  check('AI-3 learning is still a candidate',assisted.status==='CANDIDATE');

  // FLOW AI-4 · no query changed strategy.
  const after=await ctx();
  const strategyNow=JSON.stringify([after.decisions,after.versions,after.reviews,after.hypotheses.map(h=>[h.id,h.status]),after.learnings.filter(l=>l.id!==(assisted as unknown as {id:string}).id).map(l=>[l.id,l.status])]);
  check('AI-4 decisions, versions, reviews, hypothesis status and learnings unchanged by AI',strategyNow===before);
}catch(error){check('harness completed',false,error instanceof Error?error.message:'error');}
const pass=checks.every(x=>x.pass);
console.log(JSON.stringify({realProviderCalls:realCalls,checks},null,2));
console.log(pass?'LIVE AI IN-APP SMOKE PASSED':'LIVE AI IN-APP SMOKE FAILED');
process.exitCode=pass?0:1;
