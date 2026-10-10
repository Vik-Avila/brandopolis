import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

/**
 * ADR-0026 · synthetic DEMO brand for the owner's Validation & Learning review. Uses the local app's own HTTP API
 * (same authorization, idempotency and audit as a person), never calls an AI provider and never prints the token.
 * Leaves: Priority Experiment decided; hypothesis A UNTESTED with a PLANNED experiment (plan quality, start);
 * hypothesis B TESTING with a RUNNING experiment, one EXPECTED and one CONTRARY signal and a manual candidate.
 */
const base=process.env.BRANDOPOLIS_BASE_URL??'http://127.0.0.1:3001';
const sessionFile=process.env.BRANDOPOLIS_SESSION_FILE??'.local/rc1-smoke/demo-session.json';
if(!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base))throw new Error('Sólo se permite una DEMO local (127.0.0.1).');
let cookie='';
async function call<T=Record<string,unknown>>(path:string,body?:unknown):Promise<T>{
  const r=await fetch(base+path,{method:body===undefined?'GET':'POST',headers:{Origin:base,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(30000)});
  const setCookie=r.headers.get('set-cookie');if(setCookie)cookie=setCookie.split(';')[0];
  const data=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(`${path} → HTTP ${r.status} ${(data as {code?:string}).code??''}`);
  return data as T;
}
let token:string;
try{token=(JSON.parse(readFileSync(sessionFile,'utf8')) as {token:string}).token;}catch{throw new Error('No se pudo leer el archivo de sesión local.');}
await call('/api/session',{token});
const me=await call<{userId:string}>('/api/me');
const NAME='Lumbre Café · Revisión Fase 3 (sintética)';
const existing=(await call<{id:string;name:string}[]>('/api/brands')).find(b=>b.name===NAME);
if(existing){console.log(JSON.stringify({brand:NAME,url:`${base}/?brand=${encodeURIComponent(existing.id)}`,reused:true}));process.exit(0);}
const brand=await call<{id:string}>('/api/brands',{name:NAME});
await call('/api/brands/geography',{brandId:brand.id,geographicInfluence:'LOCAL',primaryMarket:'Xalapa, Veracruz (ficticio)'});
const ctx=()=>call<{questions:{id:string;module:string}[];decisions:{id:string;questionId:string;activeVersionId:string|null}[]}>(`/api/context?brandId=${encodeURIComponent(brand.id)}`);
async function decide(module:string,selectedOption:string){
  const c=await ctx(),q=c.questions.find(x=>x.module===module)!,d=c.decisions.find(x=>x.questionId===q.id);
  await call('/api/questions/prepare',{brandId:brand.id,questionId:q.id,expectedActiveVersion:d?.activeVersionId??null});
  return call<{decisionId:string}>('/api/decisions/commit',{command:{brandId:brand.id,questionId:q.id,selectedOption,rationale:'Criterio humano sintético para la revisión del propietario',expectedActiveVersion:d?.activeVersionId??null,sourceRecommendationId:null,idempotencyKey:randomUUID(),actorUserId:me.userId}});
}
await decide('Strategic Objective','Ser el café de referencia para trabajo creativo en el centro (ficticio)');
await decide('Market Arena','Espacios de trabajo y café en el centro de Xalapa (ficticio)');
await decide('Primary Customer','Cualquier persona que trabaje con laptop (ficticio)');
// A real human evolution for Mi práctica: the customer decision is narrowed in a second version.
await decide('Primary Customer','Profesionales creativos independientes (ficticio)');
const hypA=await call<{id:string}>('/api/context/capture',{brandId:brand.id,kind:'hypothesis',entity:{statement:'Los profesionales creativos pagarían una membresía mensual por mesa reservada'}});
const hypB=await call<{id:string}>('/api/context/capture',{brandId:brand.id,kind:'hypothesis',entity:{statement:'Los clientes creativos vuelven al menos dos veces por semana'}});
const priority=await decide('Priority Experiment','Validar primero si los clientes creativos vuelven dos veces por semana');
const expA=await call<{id:string}>('/api/learning/create',{brandId:brand.id,kind:'experiment',decisionId:priority.decisionId,plan:{objective:'Probar disposición a pagar una membresía',successCriteria:'Cinco personas reservan una mesa pagada'},entity:{hypothesisId:hypA.id,intendedSignal:'Creemos que les gustará'}});
void expA;
const expB=await call<{id:string}>('/api/learning/create',{brandId:brand.id,kind:'experiment',decisionId:priority.decisionId,plan:{objective:'Medir la frecuencia de regreso',successCriteria:'La mitad de los clientes registrados vuelve dos veces por semana'},entity:{hypothesisId:hypB.id,intendedSignal:'Clientes registrados que regresan dos veces en la misma semana',disconfirmingCriteria:'Menos de una cuarta parte regresa dos veces en tres semanas',method:'Registro voluntario de visitas con tarjeta de cliente (ficticio)',plannedPeriod:'Tres semanas',limitations:['Sólo clientes que aceptan registrarse']}});
await call('/api/learning/transition',{brandId:brand.id,kind:'experiment',objectId:expB.id,expectedStatus:'PLANNED',status:'RUNNING'});
await call('/api/hypotheses/review',{brandId:brand.id,review:{hypothesisId:hypB.id,expectedStatus:'UNTESTED',status:'TESTING',rationale:'Empezamos el registro de visitas (sintético)',learningId:null,idempotencyKey:randomUUID()}});
const observed=(days:number)=>new Date(Date.now()-days*86400000).toISOString();
const s1=await call<{id:string}>('/api/learning/create',{brandId:brand.id,kind:'signal',entity:{experimentId:expB.id,observation:'7 de 20 clientes registrados volvieron dos veces la primera semana',source:'Registro de visitas ficticio',observedAt:observed(6),direction:'EXPECTED'}});
await call('/api/learning/create',{brandId:brand.id,kind:'signal',entity:{experimentId:expB.id,observation:'En la segunda semana sólo 3 de 20 volvieron dos veces; varios dijeron que trabajan desde casa',source:'Registro de visitas y conversación en caja (ficticio)',observedAt:observed(1),direction:'CONTRARY',limitation:'Semana con lluvias intensas'}});
await call('/api/learning/create',{brandId:brand.id,kind:'learning',entity:{signalIds:[s1.id],hypothesisId:hypB.id,interpretation:'Borrador: parece que sí vuelven con frecuencia',limitations:['Sólo una semana observada']}});
await call('/api/reflections',{changedThinking:'Separé el ámbito geográfico de la decisión de mercado (reflexión sintética).',doDifferently:'Registrar la señal contraria antes de interpretar (sintético).',brandId:brand.id,idempotencyKey:randomUUID()});
console.log(JSON.stringify({brand:NAME,url:`${base}/?brand=${encodeURIComponent(brand.id)}`}));
