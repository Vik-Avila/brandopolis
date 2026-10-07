import { describe,it,expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { strategicIntelligence,supportLevel,type IntelligenceState } from '../src/domain/intelligence.js';
import { journey } from '../src/domain/modules.js';
import { rules } from '../src/domain/contracts.js';

/** Builds a canonical Brand state: decisions in journey order with versions and the rule edges among them. */
function build(decided:string[],extra:Partial<IntelligenceState>={},at=(i:number)=>new Date(Date.UTC(2026,9,1,10,i)).toISOString()):IntelligenceState{
 const questions=journey.map(m=>({id:`q-${m.primaryDecision}`,module:m.primaryDecision}));
 const decisions=decided.map(m=>({id:`d-${m}`,questionId:`q-${m}`,activeVersionId:`v-${m}-1`,reviewStatus:'APPROVED'}));
 const versions=decided.map((m,i)=>({id:`v-${m}-1`,decisionId:`d-${m}`,sequence:1,selectedOption:`${m} elegido`,rationale:'Criterio',approvedAt:at(i),previousVersionId:null,versionStatus:'APPROVED',hypothesisUsages:[] as unknown[]}));
 const dependencies=rules.rules.filter(r=>decided.includes(r.upstream)&&decided.includes(r.downstream)).map(r=>({id:`e-${r.upstream}-${r.downstream}`,upstreamDecisionId:`d-${r.upstream}`,downstreamDecisionId:`d-${r.downstream}`,kind:r.kind,reason:r.reason,ruleVersion:r.ruleVersion}));
 return {questions,decisions,versions,dependencies,reviews:[],evidence:[],hypotheses:[],learnings:[],signals:[],experimentPlans:[],userInputs:[],audit:[],brandContext:null,...extra};
}
const ALL=journey.map(m=>m.primaryDecision);
// Bases first, so each fixture isolates the issue it evaluates.
const BASE=['Strategic Objective','Market Arena','Primary Customer'];
const kinds=(s:IntelligenceState)=>strategicIntelligence(s).issues.map(i=>i.kind).sort();

function fixture(id:string):IntelligenceState{
 if(id==='A')return build(ALL,{experimentPlans:[{experimentId:'x1',decisionId:'d-Priority Experiment'}]});
 if(id==='B'||id==='C'){const s=build([...BASE,'Value Mechanism','Positioning']);s.versions[2].hypothesisUsages=[{hypothesisId:'h1',assumptionInUse:true}];s.hypotheses=[{id:'h1',statement:'Las agencias pagarían',status:id==='B'?'REJECTED':'WEAKENED',evidenceReferences:[]}];return s;}
 if(id==='H')return build([...BASE,'Value Mechanism','Positioning','Core Message']);
 if(id==='X')return build(['Primary Customer','Positioning']);
 if(id==='D'||id==='E'){const s=build(BASE);s.versions[2].hypothesisUsages=[{hypothesisId:'h1',assumptionInUse:true}];
  s.hypotheses=[{id:'h1',statement:'Las agencias regresan',status:id==='D'?'TESTING':'UNTESTED',evidenceReferences:id==='D'?['ev1']:[]}];
  s.evidence=id==='D'?[{id:'ev1',claim:'Dos entrevistas',sourceQuality:'LOW',relevance:'INDIRECT',freshness:'CURRENT'}]:[];return s;}
 if(id==='F'){const s=build([...BASE,'Value Mechanism','Positioning','Brand Promise','Core Message']);
  s.versions.push({id:'v-Primary Customer-2',decisionId:'d-Primary Customer',sequence:2,selectedOption:'Equipos internos',rationale:'Cambio',approvedAt:new Date(Date.UTC(2026,9,2)).toISOString(),previousVersionId:'v-Primary Customer-1',versionStatus:'APPROVED',hypothesisUsages:[]});
  s.versions[2].versionStatus='SUPERSEDED';s.decisions[2].activeVersionId='v-Primary Customer-2';
  s.reviews=[{id:'r1',triggerVersionId:'v-Primary Customer-2',downstreamDecisionId:'d-Positioning',dependencyType:'HARD',status:'OPEN'},{id:'r2',triggerVersionId:'v-Primary Customer-2',downstreamDecisionId:'d-Core Message',dependencyType:'SOFT',status:'REVIEW_SUGGESTED'}];
  s.decisions.find(d=>d.id==='d-Positioning')!.reviewStatus='NEEDS_REVIEW';return s;}
 if(id==='G')return build(['Strategic Objective','Market Arena'],{brandContext:{geographicInfluence:'LOCAL',primaryMarket:'Xalapa, Veracruz'},audit:[{operation:'BRAND_CONTEXT_UPDATED',occurredAt:new Date(Date.UTC(2026,9,5)).toISOString()}]});
 throw new Error(id);
}

describe('Strategic Intelligence evaluation harness (evals/strategic-intelligence.json)',()=>{
 const evals=JSON.parse(readFileSync('evals/strategic-intelligence.json','utf8')) as {fixtures:{id:string;evaluatorResult:string;issueKinds:string[];support?:Record<string,string>;reviewOrder?:string[];declaredContext?:Record<string,string[]>}[]};
 for(const expected of evals.fixtures)it(`fixture ${expected.id}: ${expected.evaluatorResult}`,()=>{
  const state=fixture(expected.id),snapshot=strategicIntelligence(state);
  expect(snapshot.evaluatorResult).toBe(expected.evaluatorResult);
  expect(kinds(state)).toEqual([...expected.issueKinds].sort());
  for(const [module,level] of Object.entries(expected.support??{}))expect(snapshot.memory.find(m=>m.module===module)!.support).toBe(level);
  if(expected.reviewOrder)expect(snapshot.reviewPlan.map(r=>r.module)).toEqual(expected.reviewOrder);
  for(const [module,itemKinds] of Object.entries(expected.declaredContext??{}))expect(snapshot.declaredContext[module].map(i=>i.kind)).toEqual(itemKinds);
  // Never a probability or a percentage anywhere in the projection.
  expect(JSON.stringify(snapshot)).not.toMatch(/\d+\s*%|probab|confidence/i);
 });
});

describe('Strategic Intelligence contracts',()=>{
 it('separates the evaluator result from the issue severity scale',()=>{
  const b=strategicIntelligence(fixture('B'));
  expect(['PASS','PASS_WITH_CAUTION','REVIEW_REQUIRED']).toContain(b.evaluatorResult);
  for(const issue of b.issues){expect(['INFO','REVIEW','CONFLICT']).toContain(issue.severity);expect(issue.origin).toBe('RULE');}
  expect(b.issues[0]).toMatchObject({severity:'CONFLICT',modules:['Primary Customer'],decisionIds:['d-Primary Customer'],versionIds:['v-Primary Customer-1'],hypothesisRefs:['h1'],reviewFirst:'Primary Customer'});
  // A brand created before ADR-0021 (Customer before Arena) gets INFO guidance only, never a degraded verdict.
  const legacy=strategicIntelligence(fixture('X'));
  expect(legacy.issues.every(i=>i.severity==='INFO'&&i.kind==='MISSING_BASIS')).toBe(true);
  expect(legacy.evaluatorResult).toBe('PASS');
 });
 it('is a pure projection: it never mutates the state it reads',()=>{
  const state=fixture('F'),before=JSON.stringify(state);
  strategicIntelligence(state);
  expect(JSON.stringify(state)).toBe(before);
 });
 it('explains Change Impact: triggers, mandatory first, later changes and follow-ups (explanation only)',()=>{
  const s=fixture('F');
  // Value Mechanism gets a new version after the Positioning review opened: folded into that review, shown as a later change.
  s.versions.find(v=>v.id==='v-Value Mechanism-1')!.versionStatus='SUPERSEDED';
  s.versions.push({id:'v-vm',decisionId:'d-Value Mechanism',sequence:2,approvedAt:new Date(Date.UTC(2026,9,3)).toISOString(),previousVersionId:'v-Value Mechanism-1',versionStatus:'APPROVED',hypothesisUsages:[]});
  s.decisions.find(d=>d.id==='d-Value Mechanism')!.activeVersionId='v-vm';
  const plan=strategicIntelligence(s).reviewPlan;
  expect(plan[0]).toMatchObject({order:1,module:'Positioning',mandatory:true,laterChanges:[{module:'Value Mechanism',versionId:'v-vm',sequence:2}]});
  expect(plan[0].triggers).toEqual([expect.objectContaining({module:'Primary Customer',sequence:2,firstVersion:false,kind:'HARD'})]);
  expect(plan[0].followUps).toEqual(['Brand Promise','Core Message']);
  expect(plan[1]).toMatchObject({order:2,module:'Core Message',mandatory:false});
 });
 it('keeps onboarding context as context: declared items never become decisions',()=>{
  const s=build([],{userInputs:[{id:'u1',statement:'Objetivo inmediato: validar mi propuesta'},{id:'u2',statement:'Qué está construyendo: café de autor'},{id:'u3',statement:'Una nota libre'}],brandContext:{geographicInfluence:'LOCAL',primaryMarket:'Xalapa, Veracruz'}});
  const snapshot=strategicIntelligence(s);
  expect(snapshot.declaredContext['Strategic Objective'].map(i=>[i.kind,i.text])).toEqual([['GOAL','validar mi propuesta'],['INITIAL_CONTEXT','café de autor']]);
  expect(snapshot.declaredContext['Market Arena']).toEqual([{kind:'GEOGRAPHY',text:'LOCAL · Xalapa, Veracruz',sourceId:null}]);
  expect(snapshot.memory.every(m=>m.activeVersionId===null)).toBe(true);
  expect(snapshot.issues).toEqual([]);
 });
 it('support levels describe recorded support only, never probabilities',()=>{
  expect(supportLevel([],[])).toBe('UNVALIDATED');
  expect(supportLevel([{status:'SUPPORTED'}],[{sourceQuality:'HIGH',relevance:'DIRECT',freshness:'CURRENT'}])).toBe('STRONG_SUPPORT');
  expect(supportLevel([{status:'TESTING'}],[{sourceQuality:'MEDIUM',relevance:'DIRECT',freshness:'AGING'}])).toBe('MODERATE_SUPPORT');
  expect(supportLevel([{status:'SUPPORTED'}],[{sourceQuality:'HIGH',relevance:'DIRECT',freshness:'HISTORICAL'}])).toBe('LIMITED_SUPPORT');
 });
 it('memory separates accepted learning from learning still awaiting human review',()=>{
  const s=fixture('A');
  s.signals=[{id:'s1',experimentId:'x1'},{id:'s2',experimentId:'x1'}];
  s.learnings=[{id:'l1',signalIds:['s1'],status:'ACCEPTED'},{id:'l2',signalIds:['s2'],status:'CANDIDATE'}];
  const memory=strategicIntelligence(s).memory.find(m=>m.module==='Priority Experiment')!;
  expect(memory).toMatchObject({acceptedLearningRefs:['l1'],pendingLearningRefs:['l2']});
 });
});
