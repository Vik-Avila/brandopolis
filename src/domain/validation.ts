/**
 * Validation & Learning Engine (ADR-0026): deterministic rules over persisted Hypotheses, Experiments, Signals
 * and Learnings. Pure functions: they never write, never change a status and never decide. Every status change
 * remains an explicit, audited human action in the engine.
 */
export type HypothesisStatus='UNTESTED'|'TESTING'|'SUPPORTED'|'WEAKENED'|'REJECTED';
/**
 * Canonical state machine (ADR-0026): UNTESTED → TESTING → SUPPORTED / WEAKENED / REJECTED. SUPPORTED and WEAKENED
 * describe the evidence available now, so a person may open a new validation cycle (→ TESTING). REJECTED is final:
 * a different formulation is a new Hypothesis, never a silent rewrite.
 */
export const HYPOTHESIS_TRANSITIONS:Record<HypothesisStatus,readonly HypothesisStatus[]>={UNTESTED:['TESTING'],TESTING:['SUPPORTED','WEAKENED','REJECTED'],SUPPORTED:['TESTING'],WEAKENED:['TESTING'],REJECTED:[]};
type AuditRow={operation?:unknown;rationale?:unknown;occurredAt?:unknown};
const at=(a:AuditRow)=>a.occurredAt instanceof Date?a.occurredAt.getTime():Date.parse(String(a.occurredAt))||0;
const about=(a:AuditRow,hypothesisId:string)=>{try{return JSON.parse(String(a.rationale)).hypothesisId===hypothesisId;}catch{return false;}};
/**
 * Start of a retest cycle: the latest human move to TESTING that follows an earlier resolution. The first cycle
 * returns 0, because signals are usually gathered before the person marks the hypothesis TESTING.
 */
export function validationCycleStart(audit:readonly AuditRow[],hypothesisId:string):number {
  const mine=audit.filter(a=>about(a,hypothesisId));
  const testing=Math.max(0,...mine.filter(a=>a.operation==='HYPOTHESIS_TESTING').map(at));
  const resolvedBefore=mine.some(a=>['HYPOTHESIS_SUPPORTED','HYPOTHESIS_WEAKENED'].includes(String(a.operation))&&at(a)<=testing);
  return resolvedBefore?testing:0;
}
/** When a person accepted a learning (from the audit trail); 0 when unknown. */
export function learningAcceptedAt(audit:readonly AuditRow[],learningId:string):number {
  return Math.max(0,...audit.filter(a=>a.operation==='LEARNING_ACCEPTED'&&String(a.rationale).startsWith(`${learningId}:`)).map(at));
}
export const RESOLVED_STATUSES:readonly HypothesisStatus[]=['SUPPORTED','WEAKENED','REJECTED'];

export type PlanQuality='READY'|'READY_WITH_CAUTION'|'REWORK';
export type PlanFinding='NO_HYPOTHESIS'|'EMPTY_OBJECTIVE'|'EMPTY_SIGNAL'|'SIGNAL_NOT_OBSERVABLE'|'CIRCULAR_CRITERIA'|'NO_DISCONFIRMING_CRITERIA'|'NO_METHOD';
const REWORK:readonly PlanFinding[]=['NO_HYPOTHESIS','EMPTY_OBJECTIVE','EMPTY_SIGNAL','CIRCULAR_CRITERIA'];
const norm=(v:unknown)=>String(v??'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9ñ ]/g,' ').replace(/\s+/g,' ').trim();
// Words that describe a belief or feeling rather than something a person could observe and record.
const OPINION=/\b(creo|creemos|siento|sentimos|pienso|pensamos|parece que|ojala|esperamos que les guste|nos gusta)\b/;

/** Deterministic plan review. A result is guidance for the human, never an approval or a block. */
export function experimentPlanQuality(plan:{hypothesisId?:unknown;hypothesisStatement?:unknown;objective?:unknown;intendedSignal?:unknown;successCriteria?:unknown;disconfirmingCriteria?:unknown;method?:unknown}):{result:PlanQuality;findings:PlanFinding[]} {
  const findings:PlanFinding[]=[];
  const signal=norm(plan.intendedSignal),objective=norm(plan.objective),success=norm(plan.successCriteria),hypothesis=norm(plan.hypothesisStatement);
  if(!String(plan.hypothesisId??'').trim())findings.push('NO_HYPOTHESIS');
  if(!objective)findings.push('EMPTY_OBJECTIVE');
  if(!signal)findings.push('EMPTY_SIGNAL');
  else if(signal.split(' ').length<3||OPINION.test(signal))findings.push('SIGNAL_NOT_OBSERVABLE');
  if(success&&[objective,signal,hypothesis].filter(Boolean).includes(success))findings.push('CIRCULAR_CRITERIA');
  if(!norm(plan.disconfirmingCriteria))findings.push('NO_DISCONFIRMING_CRITERIA');
  if(!norm(plan.method))findings.push('NO_METHOD');
  const result:PlanQuality=findings.some(f=>REWORK.includes(f))?'REWORK':findings.length?'READY_WITH_CAUTION':'READY';
  return {result,findings};
}

type Row=Record<string,unknown>;
export interface ValidationState {
  questions:Row[]; decisions:Row[]; versions:Row[]; hypotheses:Row[]; experiments:Row[]; experimentPlans:Row[];
  signals:Row[]; learnings:Row[]; audit?:Row[]; now?:number;
}
export type NextValidationKind='REVIEW_LEARNING'|'INTERPRET_SIGNALS'|'RESOLVE_HYPOTHESIS'|'REVIEW_AFFECTED_DECISION'|'TEST_ASSUMPTION_IN_USE'|'RESOLVE_INCONCLUSIVE'|'EXECUTE_PRIORITY_EXPERIMENT'|'RETEST_WEAKENED';
export interface NextValidation {kind:NextValidationKind; ref:string; module:string|null}
export interface HypothesisView {
  id:string; statement:string; status:string; inUseBy:{decisionId:string;module:string}[]; testedBy:{decisionId:string;module:string}[];
  experimentIds:string[]; signalIds:string[]; acceptedLearningIds:string[]; pendingLearningIds:string[];
  /** Accepted learnings that belong to the current validation cycle (accepted after the latest move to TESTING). */
  cycleLearningIds:string[]; cycles:number;
  lastReview:{status:string;at:string;actorUserId:string}|null;
}
export interface ValidationSnapshot {
  hypotheses:HypothesisView[]; running:string[]; stale:string[]; inconclusive:string[];
  uninterpretedSignals:string[]; learningsAwaitingReview:string[];
  planQuality:Record<string,{result:PlanQuality;findings:PlanFinding[]}>;
  signalBalance:Record<string,{expected:number;contrary:number;ambiguous:number;unclassified:number}>;
  nextValidation:NextValidation[];
}
const STALE_DAYS=30;
const str=(v:unknown)=>typeof v==='string'?v:'';
const time=(v:unknown)=>v instanceof Date?v.getTime():Date.parse(str(v))||0;

export function validationSnapshot(s:ValidationState):ValidationSnapshot {
  const now=s.now??Date.now();
  const moduleOf=(decisionId:unknown)=>{const d=s.decisions.find(x=>x.id===decisionId);return str(s.questions.find(q=>q.id===d?.questionId)?.module);};
  const activeVersions=s.decisions.map(d=>s.versions.find(v=>v.id===d.activeVersionId)).filter((v):v is Row=>!!v);
  const usesOf=(hypothesisId:string)=>activeVersions.filter(v=>(Array.isArray(v.hypothesisUsages)?v.hypothesisUsages:[]).some((u:{hypothesisId:string;assumptionInUse:boolean})=>u.hypothesisId===hypothesisId&&u.assumptionInUse)).map(v=>({decisionId:str(v.decisionId),module:moduleOf(v.decisionId)}));
  const testedOf=(hypothesisId:string)=>s.experiments.filter(e=>e.hypothesisId===hypothesisId).map(e=>str(s.experimentPlans.find(p=>p.experimentId===e.id)?.decisionId)).filter((d,i,all)=>d&&all.indexOf(d)===i&&s.decisions.some(x=>x.id===d&&x.activeVersionId)).map(d=>({decisionId:d,module:moduleOf(d)}));
  const experimentsOf=(hypothesisId:string)=>s.experiments.filter(e=>e.hypothesisId===hypothesisId).map(e=>str(e.id));
  const signalsOf=(experimentIds:string[])=>s.signals.filter(x=>experimentIds.includes(str(x.experimentId))).map(x=>str(x.id));
  const learningsFor=(hypothesisId:string,signalIds:string[])=>s.learnings.filter(l=>l.hypothesisId===hypothesisId||(Array.isArray(l.signalIds)?l.signalIds:[]).some(id=>signalIds.includes(String(id))));
  const reviews=(s.audit??[]).filter(a=>/^HYPOTHESIS_/.test(str(a.operation)));
  const hypotheses:HypothesisView[]=s.hypotheses.map(h=>{
    const id=str(h.id),experimentIds=experimentsOf(id),signalIds=signalsOf(experimentIds),learnings=learningsFor(id,signalIds);
    const last=reviews.filter(a=>{try{return JSON.parse(str(a.rationale)).hypothesisId===id;}catch{return false;}}).sort((a,b)=>time(b.occurredAt)-time(a.occurredAt))[0];
    return {id,statement:str(h.statement),status:str(h.status),inUseBy:usesOf(id),testedBy:testedOf(id).filter(t=>!usesOf(id).some(u=>u.decisionId===t.decisionId)),experimentIds,signalIds,
      acceptedLearningIds:learnings.filter(l=>l.status==='ACCEPTED').map(l=>str(l.id)),
      cycleLearningIds:learnings.filter(l=>l.status==='ACCEPTED'&&(validationCycleStart(s.audit??[],id)===0||learningAcceptedAt(s.audit??[],str(l.id))>validationCycleStart(s.audit??[],id))).map(l=>str(l.id)),
      cycles:(s.audit??[]).filter(a=>a.operation==='HYPOTHESIS_TESTING'&&str(a.rationale).includes(`"hypothesisId":"${id}"`)).length,pendingLearningIds:learnings.filter(l=>l.status==='CANDIDATE'||l.status==='REVIEWED').map(l=>str(l.id)),
      lastReview:last?{status:str(last.operation).replace('HYPOTHESIS_',''),at:new Date(time(last.occurredAt)).toISOString(),actorUserId:str(last.actorUserId)}:null};
  });
  const plan=(experimentId:string)=>s.experimentPlans.find(p=>p.experimentId===experimentId);
  const running=s.experiments.filter(e=>e.status==='RUNNING').map(e=>str(e.id));
  const stale=running.filter(id=>{const started=time(plan(id)?.startedAt);return started>0&&now-started>STALE_DAYS*86400000;});
  const inconclusive=s.experiments.filter(e=>e.status==='INCONCLUSIVE').map(e=>str(e.id));
  const interpreted=new Set(s.learnings.flatMap(l=>Array.isArray(l.signalIds)?l.signalIds.map(String):[]));
  const uninterpretedSignals=s.signals.filter(x=>!interpreted.has(str(x.id))).map(x=>str(x.id));
  const learningsAwaitingReview=s.learnings.filter(l=>l.status==='CANDIDATE'||l.status==='REVIEWED').map(l=>str(l.id));
  const planQuality:ValidationSnapshot['planQuality']={};
  for(const e of s.experiments.filter(x=>x.status==='PLANNED')){
    const p=plan(str(e.id)),h=s.hypotheses.find(x=>x.id===e.hypothesisId);
    planQuality[str(e.id)]=experimentPlanQuality({hypothesisId:e.hypothesisId,hypothesisStatement:h?.statement,objective:p?.objective,intendedSignal:e.intendedSignal,successCriteria:p?.successCriteria,disconfirmingCriteria:e.disconfirmingCriteria,method:e.method});
  }
  const signalBalance:ValidationSnapshot['signalBalance']={};
  for(const e of s.experiments){
    const rows=s.signals.filter(x=>x.experimentId===e.id);
    signalBalance[str(e.id)]={expected:rows.filter(x=>x.direction==='EXPECTED').length,contrary:rows.filter(x=>x.direction==='CONTRARY').length,ambiguous:rows.filter(x=>x.direction==='AMBIGUOUS').length,unclassified:rows.filter(x=>!x.direction).length};
  }
  // Next best validation: review what you already learned before creating more work (rules first).
  const next:NextValidation[]=[];
  for(const id of learningsAwaitingReview)next.push({kind:'REVIEW_LEARNING',ref:id,module:null});
  if(uninterpretedSignals.length)next.push({kind:'INTERPRET_SIGNALS',ref:uninterpretedSignals[0],module:null});
  for(const h of hypotheses){
    if(h.status==='TESTING'&&h.cycleLearningIds.length)next.push({kind:'RESOLVE_HYPOTHESIS',ref:h.id,module:null});
    if(h.status==='WEAKENED'||h.status==='REJECTED')for(const use of [...h.inUseBy,...h.testedBy])next.push({kind:'REVIEW_AFFECTED_DECISION',ref:h.id,module:use.module});
  }
  for(const id of inconclusive)next.push({kind:'RESOLVE_INCONCLUSIVE',ref:id,module:null});
  for(const h of hypotheses)if(h.status==='UNTESTED'&&h.inUseBy.length&&!h.experimentIds.length)next.push({kind:'TEST_ASSUMPTION_IN_USE',ref:h.id,module:h.inUseBy[0].module});
  const priority=s.decisions.find(d=>s.questions.find(q=>q.id===d.questionId)?.module==='Priority Experiment'&&d.activeVersionId);
  if(priority&&!s.experimentPlans.some(p=>p.decisionId===priority.id))next.push({kind:'EXECUTE_PRIORITY_EXPERIMENT',ref:str(priority.id),module:'Priority Experiment'});
  for(const h of hypotheses)if(h.status==='WEAKENED'&&!h.inUseBy.length&&!h.testedBy.length)next.push({kind:'RETEST_WEAKENED',ref:h.id,module:null});
  return {hypotheses,running,stale,inconclusive,uninterpretedSignals,learningsAwaitingReview,planQuality,signalBalance,nextValidation:next};
}
