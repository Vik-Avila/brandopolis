import { randomUUID } from 'node:crypto';
import { validate } from './contracts.js';
import type { assemble } from './context-assembler.js';
export type ContextPacket=ReturnType<typeof assemble>;
export interface Recommendation {id:string;brandId:string;questionId:string;contextVersion:string;options:{id:string;label:string;rationale:string;tradeoffs:string[]}[];recommendedOptionId:string|null;rationale:string;evidenceReferences:string[];hypothesesUsed:string[];tradeoffs:string[];openQuestions:string[];supportLevel:string;affectedDomains:string[];failureConditions:string[]}
export interface GatewayRequest {task:'STRATEGIC_ANALYSIS';module:string;promptVersion:string;contextVersion:string;input:ContextPacket;outputSchema:'recommendation';budget:{maxCharacters:number;timeoutMs:number};tenantScope:{workspaceId:string;brandId:string};questionId:string}
export type GatewayError='UNAVAILABLE'|'TIMEOUT'|'INVALID_OUTPUT'|'RATE_LIMIT'|'BUDGET_EXCEEDED'|'PROVIDER_ERROR';
export class ProviderFailure extends Error {constructor(readonly code:GatewayError){super(code);}}
export interface ModelProvider {name:string;model:string;generate(request:GatewayRequest):Promise<unknown>;generateMeasured?(request:GatewayRequest):Promise<{output:unknown;tokenIn:number|null;tokenOut:number|null}>}
export class ModelGateway {
  constructor(private provider:ModelProvider,readonly promptVersion='competition-demo-v1',readonly timeoutMs=5000) {}
  async invoke(request:GatewayRequest) {
    const started=Date.now(),traceId=randomUUID();let timer:ReturnType<typeof setTimeout>|undefined;
    let tokenIn:number|null=null,tokenOut:number|null=null;
    const meta=()=>({traceId,provider:this.provider.name,model:this.provider.model,latencyMs:Date.now()-started,tokenIn,tokenOut,cost:null,promptVersion:request.promptVersion,contextVersion:request.contextVersion});
    try {
      if(JSON.stringify(request.input).length>request.budget.maxCharacters) return {error:'BUDGET_EXCEEDED' as GatewayError,result:null,...meta()};
      const generated=this.provider.generateMeasured?this.provider.generateMeasured(request).then(r=>{tokenIn=r.tokenIn;tokenOut=r.tokenOut;return r.output;}):this.provider.generate(request);
      const result=await Promise.race([generated,new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error('TIMEOUT')),request.budget.timeoutMs);})]);
      try {validate(request.outputSchema,result);} catch {return {error:'INVALID_OUTPUT' as GatewayError,result:null,...meta()};}
      return {error:null,result:result as Recommendation,...meta()};
    } catch(error) {return {error:(error instanceof ProviderFailure?error.code:error instanceof Error&&error.message==='TIMEOUT'?'TIMEOUT':'PROVIDER_ERROR') as GatewayError,result:null,...meta()};}
    finally {if(timer)clearTimeout(timer);}
  }
}
const examples:Record<string,[string,string]>={
  'Primary Customer':['Agencias con varias marcas','Equipos internos de marketing'],
  'Value Mechanism':['Suscripción por marca activa','Servicio de acompañamiento estratégico'],
  Positioning:['Continuidad de decisiones estratégicas','Acompañamiento para ordenar la estrategia'],
  'Core Message':['Decisiones conectadas, criterio compartido','Convierte tu estrategia en decisiones claras']
};
/** Deterministic fixture, never presented as live AI or market evidence. */
export class DemoProvider implements ModelProvider {
  name='DEMO_FIXTURE';model='competition-v1';
  async generate(r:GatewayRequest):Promise<Recommendation> {
    const labels=examples[r.module];if(!labels)throw new Error('Unsupported module');
    const options=labels.map((label,i)=>({id:`option-${i+1}`,label,rationale:'Ejemplo didáctico para comparar enfoques; requiere adaptación a tu marca.',tradeoffs:[i===0?'Mayor foco; menor amplitud inicial.':'Mayor amplitud; exige más coordinación.']}));
    return {id:randomUUID(),brandId:r.tenantScope.brandId,questionId:r.questionId,contextVersion:r.contextVersion,options,recommendedOptionId:options[0].id,rationale:'Propuesta DEMO fija. No deriva una conclusión de tus fuentes ni sustituye tu criterio.',evidenceReferences:[],hypothesesUsed:[],tradeoffs:['La prioridad elegida deja alternativas fuera del foco inicial.'],openQuestions:['¿Qué observación real justificaría elegir esta opción?'],supportLevel:'UNVALIDATED',affectedDomains:[r.module],failureConditions:['El cliente no reconoce el problema o no adopta la propuesta.']};
  }
}
export function evaluate(rec:Recommendation,packet:ContextPacket) {
  const issues:{severity:'INFO'|'REVIEW'|'CONFLICT';reason:string;objectIds:string[]}[]=[];
  const evidence=packet.items.filter(i=>i.type==='Evidence'),hypotheses=packet.items.filter(i=>i.type==='Hypothesis');
  if(rec.evidenceReferences.some(id=>!evidence.some(e=>e.id===id))||rec.hypothesesUsed.some(id=>!hypotheses.some(h=>h.id===id))) issues.push({severity:'CONFLICT',reason:'Referencias ausentes del contexto autorizado.',objectIds:[]});
  if(rec.recommendedOptionId&&!rec.options.some(o=>o.id===rec.recommendedOptionId))issues.push({severity:'CONFLICT',reason:'La opción recomendada no existe.',objectIds:[]});
  if(new Set(rec.options.map(o=>o.label.trim())).size<2)issues.push({severity:'CONFLICT',reason:'Faltan alternativas diferenciadas.',objectIds:[]});
  if(rec.supportLevel!=='UNVALIDATED'&&!rec.evidenceReferences.length)issues.push({severity:'CONFLICT',reason:'El soporte declarado no tiene evidencia.',objectIds:[]});
  const dimensions=['Relevancia','Evidencia','Diferenciación','Coherencia','Accionabilidad','Decidibilidad'];
  for(const dimension of dimensions)issues.push({severity:'REVIEW',reason:`${dimension}: requiere juicio humano; esta evaluación determinista no certifica calidad estratégica.`,objectIds:[rec.id]});
  const result={recommendationId:rec.id,result:issues.some(i=>i.severity==='CONFLICT')?'REVIEW_REQUIRED':'PASS_WITH_CAUTION',issues};validate('evaluator-result',result);return result;
}
