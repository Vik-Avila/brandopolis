import { rules, reviewOrder } from './contracts.js';
import { journey } from './modules.js';

/**
 * Strategic Intelligence (ADR-0025): a deterministic, auditable projection over persisted Brand state.
 * It never writes, never changes a status, never creates a dependency and never decides. Rules first;
 * semantic judgement stays with Brando on explicit human request and with the human who decides.
 */
export const INTELLIGENCE_VERSION='strategic-intelligence-v1';
export type EvaluatorResult='PASS'|'PASS_WITH_CAUTION'|'REVIEW_REQUIRED';
export type IssueSeverity='INFO'|'REVIEW'|'CONFLICT';
export type SupportLevel='STRONG_SUPPORT'|'MODERATE_SUPPORT'|'LIMITED_SUPPORT'|'UNVALIDATED';
export type IssueKind='PENDING_REVIEW'|'MISSING_BASIS'|'INVALIDATED_UPSTREAM'|'RELIES_ON_REJECTED_HYPOTHESIS'|'RELIES_ON_WEAKENED_HYPOTHESIS'|'CONTEXT_CHANGED_AFTER_DECISION'|'EXPERIMENT_NOT_PLANNED';
export interface ConsistencyIssue {
  id:string; kind:IssueKind; severity:IssueSeverity; origin:'RULE';
  modules:string[]; decisionIds:string[]; versionIds:string[];
  hypothesisRefs:string[]; evidenceRefs:string[];
  /** Module the human should open first; a recommendation, never an action. */
  reviewFirst:string;
}
export interface ReviewStep {
  order:number; module:string; decisionId:string; activeVersionId:string|null; mandatory:boolean;
  triggers:{module:string; versionId:string; sequence:number; firstVersion:boolean; kind:string; approvedAt:string}[];
  /** Connected decisions whose version was approved after the review opened (folded into this review). */
  laterChanges:{module:string; versionId:string; sequence:number}[];
  /** Explanation only: decisions that may need review after this one changes. Never written to. */
  followUps:string[];
}
export interface DecisionMemory {
  module:string; decisionId:string; activeVersionId:string|null; sequence:number|null; versions:number;
  reviewStatus:string|null; upstream:{module:string;kind:string}[]; downstream:{module:string;kind:string}[];
  support:SupportLevel; hypothesisRefs:string[]; evidenceRefs:string[]; acceptedLearningRefs:string[]; pendingLearningRefs:string[];
}
export interface DeclaredContextItem {kind:'GEOGRAPHY'|'INITIAL_CONTEXT'|'GOAL'|'STAGE'|'COMPETITIVE_REFERENCES'; text:string; sourceId:string|null}
export interface StrategicIntelligenceSnapshot {
  version:string; evaluatorResult:EvaluatorResult; issues:ConsistencyIssue[]; reviewPlan:ReviewStep[];
  memory:DecisionMemory[]; recentChanges:{module:string;decisionId:string;versionId:string;sequence:number;approvedAt:string}[];
  declaredContext:Record<string,DeclaredContextItem[]>;
}

type Row=Record<string,unknown>;
export interface IntelligenceState {
  questions:Row[]; decisions:Row[]; versions:Row[]; dependencies:Row[]; reviews:Row[];
  evidence:Row[]; hypotheses:Row[]; learnings:Row[]; signals:Row[]; experimentPlans:Row[]; userInputs:Row[];
  audit?:Row[]; brandContext?:{geographicInfluence:string|null; primaryMarket:string|null}|null;
}

const str=(v:unknown)=>typeof v==='string'?v:'';
const time=(v:unknown)=>v instanceof Date?v.getTime():Date.parse(str(v))||0;
const severityRank:Record<IssueSeverity,number>={CONFLICT:0,REVIEW:1,INFO:2};

/** Onboarding statements are context, never decisions. Prefixes are the ones the app records today. */
const DECLARED_PREFIXES:{prefix:string;kind:DeclaredContextItem['kind'];modules:string[]}[]=[
  {prefix:'Qué está construyendo:',kind:'INITIAL_CONTEXT',modules:['Strategic Objective']},
  {prefix:'Objetivo inmediato:',kind:'GOAL',modules:['Strategic Objective']},
  {prefix:'Punto de partida declarado:',kind:'STAGE',modules:['Strategic Objective']},
  {prefix:'Entorno competitivo — referencias aportadas por el usuario:',kind:'COMPETITIVE_REFERENCES',modules:['Market Arena','Positioning']}
];

export function declaredContext(s:IntelligenceState):Record<string,DeclaredContextItem[]> {
  const out:Record<string,DeclaredContextItem[]>={};
  const push=(module:string,item:DeclaredContextItem)=>{(out[module]??=[]).push(item);};
  const geo=s.brandContext;
  if(geo&&(geo.geographicInfluence||geo.primaryMarket))push('Market Arena',{kind:'GEOGRAPHY',text:[geo.geographicInfluence,geo.primaryMarket].filter(Boolean).join(' · '),sourceId:null});
  for(const input of s.userInputs){
    const statement=str(input.statement).trim();
    const match=DECLARED_PREFIXES.find(p=>statement.startsWith(p.prefix));
    if(!match)continue;
    const text=statement.slice(match.prefix.length).trim();
    if(text)for(const module of match.modules)push(module,{kind:match.kind,text,sourceId:str(input.id)||null});
  }
  return out;
}

export function strategicIntelligence(s:IntelligenceState):StrategicIntelligenceSnapshot {
  const moduleOf=(decisionId:unknown)=>{const d=s.decisions.find(x=>x.id===decisionId);return str(s.questions.find(q=>q.id===d?.questionId)?.module);};
  const decisionOf=(module:string)=>{const q=s.questions.find(x=>x.module===module);return q?s.decisions.find(d=>d.questionId===q.id):undefined;};
  const active=(d:Row|undefined)=>d?s.versions.find(v=>v.id===d.activeVersionId):undefined;
  const openReviews=(decisionId:unknown)=>s.reviews.filter(r=>r.downstreamDecisionId===decisionId&&r.status!=='COMPLETED');
  const issues:ConsistencyIssue[]=[];
  const add=(issue:Omit<ConsistencyIssue,'id'|'origin'>)=>{
    const id=`issue:${issue.kind}:${[...issue.decisionIds].sort().join('+')}:${[...issue.versionIds].sort().join('+')}`;
    if(!issues.some(i=>i.id===id))issues.push({...issue,id,origin:'RULE'});
  };

  // 1. Pending human reviews (Change Impact): HARD is a REVIEW issue, a suggestion alone is INFO.
  for(const d of s.decisions){
    const open=openReviews(d.id);if(!open.length)continue;
    const hard=open.some(r=>r.dependencyType==='HARD');
    add({kind:'PENDING_REVIEW',severity:hard?'REVIEW':'INFO',modules:[moduleOf(d.id)],decisionIds:[str(d.id)],versionIds:[str(d.activeVersionId)].filter(Boolean),hypothesisRefs:[],evidenceRefs:[],reviewFirst:moduleOf(d.id)});
  }
  // 2. A decision exists while the basis its HARD rule requires is still undecided. INFO: guidance, not a verdict
  //    (brands created before ADR-0021 decided Customer before Arena existed; that is not a contradiction).
  for(const rule of rules.rules.filter(r=>r.kind==='HARD')){
    const up=decisionOf(rule.upstream),down=decisionOf(rule.downstream);
    const upQuestion=s.questions.some(q=>q.module===rule.upstream);
    if(upQuestion&&down?.activeVersionId&&!up?.activeVersionId)
      add({kind:'MISSING_BASIS',severity:'INFO',modules:[rule.downstream,rule.upstream],decisionIds:[str(down.id)],versionIds:[str(down.activeVersionId)],hypothesisRefs:[],evidenceRefs:[],reviewFirst:rule.upstream});
  }
  // 3. An invalidated upstream still feeds an active downstream decision.
  for(const e of s.dependencies){
    const up=s.decisions.find(d=>d.id===e.upstreamDecisionId),down=s.decisions.find(d=>d.id===e.downstreamDecisionId);
    if(up?.reviewStatus==='INVALIDATED'&&down?.activeVersionId&&down.reviewStatus!=='INVALIDATED')
      add({kind:'INVALIDATED_UPSTREAM',severity:'CONFLICT',modules:[moduleOf(down.id),moduleOf(up.id)],decisionIds:[str(down.id),str(up.id)],versionIds:[str(down.activeVersionId)],hypothesisRefs:[],evidenceRefs:[],reviewFirst:moduleOf(down.id)});
  }
  // 4. An active decision relies on a hypothesis a human has since rejected or weakened.
  for(const d of s.decisions){
    const v=active(d);if(!v)continue;
    for(const usage of (Array.isArray(v.hypothesisUsages)?v.hypothesisUsages:[]) as {hypothesisId:string}[]){
      const h=s.hypotheses.find(x=>x.id===usage.hypothesisId);
      if(h?.status==='REJECTED'||h?.status==='WEAKENED')
        add({kind:h.status==='REJECTED'?'RELIES_ON_REJECTED_HYPOTHESIS':'RELIES_ON_WEAKENED_HYPOTHESIS',severity:h.status==='REJECTED'?'CONFLICT':'REVIEW',modules:[moduleOf(d.id)],decisionIds:[str(d.id)],versionIds:[str(v.id)],hypothesisRefs:[str(h.id)],evidenceRefs:(Array.isArray(h.evidenceReferences)?h.evidenceReferences:[]).map(String),reviewFirst:moduleOf(d.id)});
    }
  }
  // 5. Declared market context changed after the Market Arena version was approved.
  const arena=decisionOf('Market Arena'),arenaVersion=active(arena);
  const lastGeography=(s.audit??[]).filter(a=>a.operation==='BRAND_CONTEXT_UPDATED').map(a=>time(a.occurredAt)).sort((a,b)=>b-a)[0];
  if(arena&&arenaVersion&&lastGeography&&lastGeography>time(arenaVersion.approvedAt))
    add({kind:'CONTEXT_CHANGED_AFTER_DECISION',severity:'REVIEW',modules:['Market Arena'],decisionIds:[str(arena.id)],versionIds:[str(arenaVersion.id)],hypothesisRefs:[],evidenceRefs:[],reviewFirst:'Market Arena'});
  // 6. The Priority Experiment was chosen but nothing executes it yet.
  const experiment=decisionOf('Priority Experiment');
  if(experiment?.activeVersionId&&!s.experimentPlans.some(p=>p.decisionId===experiment.id))
    add({kind:'EXPERIMENT_NOT_PLANNED',severity:'INFO',modules:['Priority Experiment'],decisionIds:[str(experiment.id)],versionIds:[str(experiment.activeVersionId)],hypothesisRefs:[],evidenceRefs:[],reviewFirst:'Priority Experiment'});

  const order=(m:string)=>journey.findIndex(j=>j.primaryDecision===m);
  issues.sort((a,b)=>severityRank[a.severity]-severityRank[b.severity]||order(a.reviewFirst)-order(b.reviewFirst));
  const evaluatorResult:EvaluatorResult=issues.some(i=>i.severity==='CONFLICT')?'REVIEW_REQUIRED':issues.some(i=>i.severity==='REVIEW')?'PASS_WITH_CAUTION':'PASS';

  // Change Impact 2.0: one step per decision under review, mandatory first, then dependency order.
  const pending=s.decisions.filter(d=>openReviews(d.id).length);
  const edges=s.dependencies.map(e=>({upstreamDecisionId:str(e.upstreamDecisionId),downstreamDecisionId:str(e.downstreamDecisionId)}));
  const ordered=reviewOrder(pending.map(d=>({downstreamDecisionId:str(d.id),dependencyType:openReviews(d.id).some(r=>r.dependencyType==='HARD')?'HARD':'SOFT'})),edges);
  const reviewPlan:ReviewStep[]=ordered.map((decisionId,index)=>{
    const open=openReviews(decisionId),d=s.decisions.find(x=>x.id===decisionId)!;
    const triggers=open.map(r=>{const v=s.versions.find(x=>x.id===r.triggerVersionId);return {module:moduleOf(v?.decisionId),versionId:str(v?.id),sequence:Number(v?.sequence??0),firstVersion:v?.previousVersionId==null,kind:str(r.dependencyType),approvedAt:str(v?.approvedAt)};}).sort((a,b)=>time(a.approvedAt)-time(b.approvedAt));
    const since=Math.min(...triggers.map(t=>time(t.approvedAt)));
    const laterChanges=s.dependencies.filter(e=>e.downstreamDecisionId===decisionId).map(e=>{const up=s.decisions.find(x=>x.id===e.upstreamDecisionId),v=active(up);return v&&time(v.approvedAt)>since&&!triggers.some(t=>t.versionId===v.id)?{module:moduleOf(up!.id),versionId:str(v.id),sequence:Number(v.sequence)}:null;}).filter((x):x is {module:string;versionId:string;sequence:number}=>!!x);
    const followUps=s.dependencies.filter(e=>e.upstreamDecisionId===decisionId).map(e=>moduleOf(e.downstreamDecisionId)).filter(Boolean).sort((a,b)=>order(a)-order(b));
    return {order:index+1,module:moduleOf(decisionId),decisionId,activeVersionId:str(d.activeVersionId)||null,mandatory:open.some(r=>r.dependencyType==='HARD'),triggers,laterChanges,followUps};
  });

  // Strategic Memory 2.0 and evidence-aware support, per journey decision.
  const memory:DecisionMemory[]=[];
  for(const step of journey){
    const d=decisionOf(step.primaryDecision);if(!d)continue;
    const v=active(d);
    const usages=(Array.isArray(v?.hypothesisUsages)?v!.hypothesisUsages:[]) as {hypothesisId:string}[];
    const hypotheses=usages.map(u=>s.hypotheses.find(h=>h.id===u.hypothesisId)).filter((h):h is Row=>!!h);
    const evidenceRefs=[...new Set(hypotheses.flatMap(h=>Array.isArray(h.evidenceReferences)?h.evidenceReferences.map(String):[]))];
    const evidence=evidenceRefs.map(id=>s.evidence.find(e=>e.id===id)).filter((e):e is Row=>!!e);
    const experimentIds=s.experimentPlans.filter(p=>p.decisionId===d.id).map(p=>str(p.experimentId));
    const signalIds=s.signals.filter(x=>experimentIds.includes(str(x.experimentId))).map(x=>str(x.id));
    const linked=s.learnings.filter(l=>(Array.isArray(l.signalIds)?l.signalIds:[]).some(id=>signalIds.includes(String(id))));
    memory.push({module:step.primaryDecision,decisionId:str(d.id),activeVersionId:str(d.activeVersionId)||null,sequence:v?Number(v.sequence):null,
      versions:s.versions.filter(x=>x.decisionId===d.id).length,reviewStatus:str(d.reviewStatus)||null,
      upstream:s.dependencies.filter(e=>e.downstreamDecisionId===d.id).map(e=>({module:moduleOf(e.upstreamDecisionId),kind:str(e.kind)})),
      downstream:s.dependencies.filter(e=>e.upstreamDecisionId===d.id).map(e=>({module:moduleOf(e.downstreamDecisionId),kind:str(e.kind)})),
      support:supportLevel(hypotheses,evidence),hypothesisRefs:hypotheses.map(h=>str(h.id)),evidenceRefs,
      acceptedLearningRefs:linked.filter(l=>l.status==='ACCEPTED').map(l=>str(l.id)),pendingLearningRefs:linked.filter(l=>l.status!=='ACCEPTED'&&l.status!=='REJECTED').map(l=>str(l.id))});
  }
  const recentChanges=s.versions.filter(v=>Number(v.sequence)>1).sort((a,b)=>time(b.approvedAt)-time(a.approvedAt)).slice(0,5)
    .map(v=>({module:moduleOf(v.decisionId),decisionId:str(v.decisionId),versionId:str(v.id),sequence:Number(v.sequence),approvedAt:str(v.approvedAt)}));
  return {version:INTELLIGENCE_VERSION,evaluatorResult,issues,reviewPlan,memory,recentChanges,declaredContext:declaredContext(s)};
}

/**
 * Support describes the strength of recorded support, never a probability. Only evidence linked through a
 * hypothesis the decision actually used counts; brand-level evidence is not silently attributed.
 */
export function supportLevel(hypotheses:Row[],evidence:Row[]):SupportLevel {
  if(!hypotheses.length||!evidence.length)return 'UNVALIDATED';
  const supported=hypotheses.some(h=>h.status==='SUPPORTED');
  const strong=evidence.some(e=>e.sourceQuality==='HIGH'&&e.relevance==='DIRECT'&&e.freshness==='CURRENT');
  const moderate=evidence.some(e=>e.sourceQuality!=='LOW'&&e.relevance==='DIRECT'&&e.freshness!=='HISTORICAL');
  if(supported&&strong)return 'STRONG_SUPPORT';
  if(moderate)return 'MODERATE_SUPPORT';
  return 'LIMITED_SUPPORT';
}
