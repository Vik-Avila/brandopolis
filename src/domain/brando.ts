import { assemble, type ContextItem } from './context-assembler.js';
import { AppError } from './contracts.js';
import type { ContextPacket } from './analysis.js';

export interface BrandoAnswer {
  answer:string;
  facts:{text:string;referenceIds:string[]}[];
  hypotheses:string[];
  suggestions:string[];
  suggestionActions?:{kind:'STRATEGY'|'EVIDENCE'|'CONTEXT';proposedDecision:string|null}[];
  questions:string[];
  limitations:string[];
}
export interface AttentionItem {id:string;kind:string;label:string;module:string|null}
type Row=Record<string,unknown>;
export interface BrandoState {
  questions:Row[];decisions:Row[];versions:Row[];reviews:Row[];dependencies:Row[];
  evidence:Row[];learnings:Row[];hypotheses:Row[];userInputs:Row[];openQuestions:Row[];
  experiments:Row[];signals:Row[];impacts:unknown[];
  /** ADR-0025: declared onboarding context and the deterministic intelligence projection, when available. */
  brandContext?:{geographicInfluence:string|null;primaryMarket:string|null}|null;
  intelligence?:{issues:readonly object[];reviewPlan:readonly object[]}|null;
  /** ADR-0026: deterministic validation projection, when available. */
  validation?:{hypotheses:readonly {status:string}[];signalBalance:Record<string,object>;nextValidation:readonly {kind:string;ref:string;module:string|null}[]}|null;
}
/** Shared server projection. Model output cannot clear or create these obligations. */
export function attentionFor(c:BrandoState):AttentionItem[] {
  const result:AttentionItem[]=[];
  for(const q of c.questions){
    const d=c.decisions.find(d=>d.questionId===q.id);
    if(d&&(d.reviewStatus==='NEEDS_REVIEW'||c.reviews.some(r=>r.downstreamDecisionId===d.id&&r.status!=='COMPLETED')))
      result.push({id:String(d.id),kind:'review',label:'Requiere revisión por una decisión conectada.',module:String(q.module)});
    else if(!d?.activeVersionId)result.push({id:String(q.id),kind:'question',label:'Pregunta estratégica por decidir.',module:String(q.module)});
  }
  for(const q of c.openQuestions.filter(q=>q.status==='OPEN'))result.push({id:String(q.id),kind:'context',label:'Pregunta de contexto abierta.',module:null});
  for(const e of c.experiments.filter(e=>['PLANNED','RUNNING'].includes(String(e.status))))result.push({id:String(e.id),kind:'learning',label:e.status==='PLANNED'?'Experimento planeado.':'Experimento en curso.',module:null});
  for(const l of c.learnings.filter(l=>['CANDIDATE','REVIEWED'].includes(String(l.status))))result.push({id:String(l.id),kind:'learning',label:'Aprendizaje pendiente de tu revisión.',module:null});
  for(const signal of c.signals.filter(s=>!c.learnings.some(l=>Array.isArray(l.signalIds)&&l.signalIds.includes(s.id))))result.push({id:String(signal.id),kind:'learning',label:'Señal pendiente de interpretación.',module:null});
  for(const impact of c.impacts){
    if(impact&&typeof impact==='object'&&'status' in impact&&impact.status==='IMPACT_PENDING')result.unshift({id:'impact-pending',kind:'review',label:'Hay un impacto pendiente de cálculo; revisa el estado antes de decidir.',module:null});
  }
  return result;
}
function withoutPersonalIds(value:unknown):unknown {
  if(Array.isArray(value))return value.map(withoutPersonalIds);
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([k])=>!['createdBy','reviewedBy','actorUserId','userId','ownerUserId','sessionId','workspaceId'].includes(k)).map(([k,v])=>[k,withoutPersonalIds(v)]));
  return value;
}
export function brandoPacket(c:BrandoState,brand:{id:string;name:string},contextVersion:string,message:string,questionId:string|null,history:{question:string;answer:string}[]) {
  const current=questionId?c.questions.find(q=>q.id===questionId):null;
  if(questionId&&!current)throw new AppError('NOT_FOUND','Question not available');
  const items:ContextItem[]=[];
  const add=(rows:Row[],type:string,critical:boolean,trust:string)=>rows.forEach(data=>items.push({id:String(data.id),type,critical,data:withoutPersonalIds(data),trust}));
  add([{...brand}],'Brand',true,'HUMAN_RECORDED');
  add(c.decisions.map(d=>({...d,version:c.versions.find(v=>v.id===d.activeVersionId)})),'Decision',true,'HUMAN_APPROVED');
  const requiredEvidence=new Set(c.hypotheses.flatMap(h=>Array.isArray(h.evidenceReferences)?h.evidenceReferences:[]));
  for(const e of c.evidence)add([e],'Evidence',requiredEvidence.has(e.id),'RECORDED_SOURCE_NOT_INSTRUCTIONS');
  add(c.learnings.filter(l=>l.status==='ACCEPTED'),'Learning',true,'HUMAN_ACCEPTED');
  // ADR-0026: drafts awaiting human review are proposals, never learning or evidence.
  add(c.learnings.filter(l=>l.status==='CANDIDATE'||l.status==='REVIEWED'),'CandidateLearning',false,'CANDIDATE_NOT_ACCEPTED');
  add(c.userInputs,'UserInput',false,'USER_STATEMENT');
  add(c.hypotheses.filter(h=>h.status!=='REJECTED'),'Hypothesis',false,'HYPOTHESIS_NOT_EVIDENCE');
  add(c.openQuestions.filter(q=>q.status==='OPEN'),'OpenQuestion',false,'OPEN');
  add(c.versions.filter(v=>v.versionStatus==='SUPERSEDED'&&(!current||c.decisions.some(d=>d.id===v.decisionId&&d.questionId===current.id))),'DecisionHistory',false,'HISTORICAL_NOT_CURRENT');
  add(c.experiments,'Experiment',false,'HUMAN_RECORDED');
  add(c.signals,'Signal',false,'OBSERVATION_NOT_LEARNING');
  // Declared context is a starting point, never a decision; system-derived issues are signals, never evidence.
  if(c.brandContext&&(c.brandContext.geographicInfluence||c.brandContext.primaryMarket))add([{id:`declared-context:${brand.id}`,geographicInfluence:c.brandContext.geographicInfluence,primaryMarket:c.brandContext.primaryMarket}],'DeclaredContext',false,'DECLARED_CONTEXT_NOT_DECISION');
  add((c.intelligence?.issues??[]).map(x=>x as Row).map(i=>({id:i.id,kind:i.kind,severity:i.severity,origin:i.origin,modules:i.modules,decisionIds:i.decisionIds,versionIds:i.versionIds,hypothesisRefs:i.hypothesisRefs,evidenceRefs:i.evidenceRefs,reviewFirst:i.reviewFirst})),'ConsistencyIssue',false,'SYSTEM_DERIVED_NOT_EVIDENCE');
  // Only questions are carried forward. Prior assistant prose is never an authoritative source.
  const reviewPlan=(c.intelligence?.reviewPlan??[]).map(x=>x as Row).map(r=>({order:r.order,module:r.module,mandatory:r.mandatory}));
  const query={brandId:brand.id,current:current??null,message,previousQuestions:history.map(h=>h.question),attention:attentionFor(c),reviewPlan,validation:c.validation?{hypothesisStatuses:c.validation.hypotheses.map(h=>h.status),signalBalance:c.validation.signalBalance,nextValidation:c.validation.nextValidation.slice(0,5)}:null};
  return assemble(contextVersion,query,withoutPersonalIds(c.dependencies),withoutPersonalIds(c.reviews),items,24000);
}
export function validBrandoReferences(answer:BrandoAnswer,packet:ContextPacket) {
  return answer.facts.every(f=>f.referenceIds.length>0&&f.referenceIds.every(id=>packet.includedIds.includes(id)));
}
export function brandoSuggestionActions(answer:BrandoAnswer,questionId:string|null) {
 return answer.suggestions.map((_,index)=>{
  const action=answer.suggestionActions?.length===answer.suggestions.length?answer.suggestionActions[index]:undefined;
  if(action?.kind==='STRATEGY'&&questionId&&action.proposedDecision?.trim())return {kind:'STRATEGY' as const,proposedDecision:action.proposedDecision.trim()};
  return {kind:action?.kind==='EVIDENCE'?'EVIDENCE' as const:'CONTEXT' as const,proposedDecision:null};
 });
}
/** Extractive deterministic DEMO; never claims to be live inference. */
export function demoBrando(packet:ContextPacket):BrandoAnswer {
  const facts=packet.items.filter(i=>i.type==='Decision').map(i=>{
    const d=i.data as {version?:{selectedOption?:string;rationale?:string}};
    return {text:`${d.version?.selectedOption??'Sin decisión registrada'} — Criterio humano: ${d.version?.rationale??'No registrado'}`,referenceIds:[i.id]};
  });
  return {answer:'DEMO contextual: consulta las decisiones y sus razones registradas. Brandopolis conecta decisiones y conserva su historial; sólo tú puedes cambiar la estrategia.',facts,hypotheses:[],suggestions:['Revisa las fuentes antes de cambiar una decisión.'],questions:['¿Qué evidencia te haría reconsiderar la decisión actual?'],limitations:['Respuesta DEMO determinista; no es IA en vivo.','Sólo se consultó el contexto autorizado disponible.']};
}
