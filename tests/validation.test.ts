import { describe,it,expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { experimentPlanQuality,validationSnapshot,HYPOTHESIS_TRANSITIONS,type ValidationState } from '../src/domain/validation.js';
import { brandoPacket,type BrandoState } from '../src/domain/brando.js';

const base=():ValidationState=>({questions:[{id:'q-pe',module:'Priority Experiment'}],decisions:[{id:'d-pe',questionId:'q-pe',activeVersionId:'v1'}],versions:[{id:'v1',decisionId:'d-pe',hypothesisUsages:[]}],
 hypotheses:[{id:'h1',statement:'Las agencias regresan',status:'TESTING'}],experiments:[{id:'x1',hypothesisId:'h1',intendedSignal:'Agencias que regresan cada semana',status:'RUNNING'}],
 experimentPlans:[{experimentId:'x1',decisionId:'d-pe',objective:'Medir regreso',successCriteria:'Tres de cinco',startedAt:'2026-10-01T00:00:00.000Z'}],signals:[],learnings:[],audit:[],now:Date.parse('2026-10-07T00:00:00.000Z')});

describe('ADR-0026 · validation rules',()=>{
 it('hypothesis state machine: supported and weakened can be retested, rejected is final',()=>{
  expect(HYPOTHESIS_TRANSITIONS).toEqual({UNTESTED:['TESTING'],TESTING:['SUPPORTED','WEAKENED','REJECTED'],SUPPORTED:['TESTING'],WEAKENED:['TESTING'],REJECTED:[]});
 });
 it('plan quality is deterministic guidance',()=>{
  expect(experimentPlanQuality({hypothesisId:'h',objective:'Medir regreso',intendedSignal:'Agencias que regresan cada semana',successCriteria:'Tres de cinco',disconfirmingCriteria:'Menos de dos',method:'Uso'})).toEqual({result:'READY',findings:[]});
  expect(experimentPlanQuality({hypothesisId:'h',objective:'Medir',intendedSignal:'Agencias que regresan cada semana',successCriteria:'Tres'}).result).toBe('READY_WITH_CAUTION');
  expect(experimentPlanQuality({objective:'',intendedSignal:'creo que sí'}).findings).toEqual(['NO_HYPOTHESIS','EMPTY_OBJECTIVE','SIGNAL_NOT_OBSERVABLE','NO_DISCONFIRMING_CRITERIA','NO_METHOD']);
 });
 it('stale running experiments, uninterpreted signals and the next validation order',()=>{
  const s=base();
  s.experimentPlans[0].startedAt='2026-08-01T00:00:00.000Z';
  s.signals=[{id:'s1',experimentId:'x1',direction:'AMBIGUOUS'},{id:'s2',experimentId:'x1'}];
  s.learnings=[{id:'l1',signalIds:['s1'],status:'CANDIDATE'}];
  const v=validationSnapshot(s);
  expect(v.stale).toEqual(['x1']);
  expect(v.uninterpretedSignals).toEqual(['s2']);
  expect(v.signalBalance.x1).toEqual({expected:0,contrary:0,ambiguous:1,unclassified:1});
  expect(v.nextValidation.map(n=>n.kind)).toEqual(['REVIEW_LEARNING','INTERPRET_SIGNALS']);
  expect(v.hypotheses[0].testedBy).toEqual([{decisionId:'d-pe',module:'Priority Experiment'}]);
 });
 it('an assumption in use without an experiment asks to be tested; the priority experiment asks to be executed',()=>{
  const s=base();s.experiments=[];s.experimentPlans=[];s.hypotheses[0].status='UNTESTED';s.versions[0].hypothesisUsages=[{hypothesisId:'h1',assumptionInUse:true}];
  expect(validationSnapshot(s).nextValidation).toEqual([{kind:'TEST_ASSUMPTION_IN_USE',ref:'h1',module:'Priority Experiment'},{kind:'EXECUTE_PRIORITY_EXPERIMENT',ref:'d-pe',module:'Priority Experiment'}]);
 });
});

/** B3 fixtures A–H (evals/brando-learning-copilot.json): what the provider may see and with which trust label. */
function brandoFixture(id:string):BrandoState{
 const learning=(status:string)=>({id:'l1',signalIds:['s1'],interpretation:'Borrador',limitations:[],status,reviewedBy:status==='CANDIDATE'?null:'user-private-1',origin:'MANUAL'});
 return {questions:[],decisions:[],versions:[],reviews:[],dependencies:[],evidence:[],userInputs:[],openQuestions:[],impacts:[],
  hypotheses:[{id:'h1',statement:'Regresan',status:id==='G'?'REJECTED':'TESTING',evidenceReferences:[]}],
  experiments:[{id:'x1',hypothesisId:'h1',intendedSignal:'Regreso semanal',status:id==='H'?'INCONCLUSIVE':'RUNNING',disconfirmingCriteria:'Menos de dos',ownerUserId:'user-private-1'}],
  signals:[{id:'s1',experimentId:'x1',observation:'Una regresó',source:'Registro',observedAt:'2026-10-05',direction:'CONTRARY'}],
  learnings:id==='B'?[learning('REJECTED')]:id==='C'?[learning('ACCEPTED')]:['A','E','F'].includes(id)?[learning('CANDIDATE')]:[],
  validation:{hypotheses:[{status:'TESTING'}],signalBalance:{x1:{expected:0,contrary:1,ambiguous:0,unclassified:0}},nextValidation:id==='E'?[{kind:'REVIEW_LEARNING',ref:'l1',module:null}]:[]}};
}
const evals=JSON.parse(readFileSync('evals/brando-learning-copilot.json','utf8')) as {version:string;fixtures:{id:string;name:string;includes:Record<string,string>;excludesTypes?:string[];containsText?:string[];notContainsText?:string[];queryValidation?:string[]}[]};
describe('Brando B3 Learning Copilot eval harness (evals/brando-learning-copilot.json)',()=>{
 it('evaluates the v6 prompt contract with eight fixtures',()=>{expect(evals.version).toBe('brando-contextual-v6');expect(evals.fixtures.map(f=>f.id)).toEqual(['A','B','C','D','E','F','G','H']);});
 for(const f of evals.fixtures)it(`fixture ${f.id}: ${f.name}`,()=>{
  const packet=brandoPacket(brandoFixture(f.id),{id:'b1',name:'Marca ficticia'},'ctx','Ayúdame a interpretar',null,[]);
  const text=JSON.stringify(packet);
  for(const [type,trust] of Object.entries(f.includes))expect(packet.items.filter(i=>i.type===type).map(i=>i.trust)).toContain(trust);
  for(const type of f.excludesTypes??[])expect(packet.items.some(i=>i.type===type),type).toBe(false);
  for(const needle of f.containsText??[])expect(text).toContain(needle);
  for(const needle of f.notContainsText??[])expect(text).not.toContain(needle);
  if(f.queryValidation)expect((packet.question as {validation:{nextValidation:{kind:string}[]}}).validation.nextValidation.map(n=>n.kind)).toEqual(f.queryValidation);
 });
});
