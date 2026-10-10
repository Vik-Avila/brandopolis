import { describe,it,expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

// Pure presentation projections, loaded like tests/brando-sections.test.ts does (no DOM, no requests).
const source=readFileSync('src/transport/public/product-views.js','utf8').replace(/export (?=const |function )/g,'');
const views=runInNewContext(source+'\n({nextStep,strategyProgress,attentionGroups,labels,homeHtml,railHistoryHtml});') as {
 nextStep:(c:unknown)=>{kind:string;title:string;cta:string;action:{type:string;module?:string;view?:string}};
 strategyProgress:(c:unknown)=>{defined:number;total:number;segments:{module:string;state:string}[]};
 attentionGroups:(c:unknown,d?:unknown)=>{decide:{text:string}[];observe:{text:string}[];mandatoryReviews:number};
 labels:Record<string,string>;homeHtml:(c:unknown,d?:unknown)=>string;railHistoryHtml:(c:unknown,m:string|null)=>string;
};
const MODULES=['Strategic Objective','Market Arena','Primary Customer','Value Mechanism','Positioning','Brand Promise','Core Message','GTM Priority','Priority Experiment'];
function brand(decided:string[],extra:Record<string,unknown>={}){
 const questions=MODULES.map(m=>({id:`q-${m}`,module:m}));
 const decisions=decided.map(m=>({id:`d-${m}`,questionId:`q-${m}`,activeVersionId:`v-${m}`,reviewStatus:'APPROVED'}));
 const versions=decided.map(m=>({id:`v-${m}`,decisionId:`d-${m}`,sequence:1,selectedOption:`${m} elegido`,rationale:'Criterio',approvedAt:'2026-10-08T10:00:00.000Z'}));
 return {questions,decisions,versions,reviews:[],experiments:[],impacts:[],intelligence:{issues:[],reviewPlan:[]},validation:{nextValidation:[],learningsAwaitingReview:[],uninterpretedSignals:[],inconclusive:[]},...extra};
}

describe('ADR-0027 · Inicio',()=>{
 it('shows Mercado objetivo as the visible name of Market Arena',()=>{
  expect(views.labels['Market Arena']).toBe('Mercado objetivo');
  expect(Object.keys(views.labels)).toEqual(MODULES);
 });
 it('progress counts real decisions by position, never the first N segments',()=>{
  const p=views.strategyProgress(brand(['Strategic Objective','Priority Experiment']));
  expect(p).toMatchObject({defined:2,total:9});
  expect(p.segments.map(s=>s.state)).toEqual(['defined','open','open','open','open','open','open','open','defined']);
 });
 it('the next step follows the journey (dependency order) when nothing needs review',()=>{
  const step=views.nextStep(brand(['Strategic Objective']));
  expect(step).toMatchObject({kind:'DECISION',title:'Define tu mercado objetivo',cta:'Definir mercado',action:{type:'module',module:'Market Arena'}});
 });
 it('a mandatory review comes before any new decision; a pending learning comes after the next decision',()=>{
  const review=brand(['Strategic Objective','Primary Customer','Positioning'],{intelligence:{issues:[],reviewPlan:[{module:'Positioning',mandatory:true,triggers:[{module:'Primary Customer'}]}]}});
  expect(views.nextStep(review)).toMatchObject({kind:'REVIEW',action:{module:'Positioning'}});
  // Owner decision 2026-10-09: optional validation follows the next decision; it never takes over Inicio.
  const pending={validation:{nextValidation:[{kind:'REVIEW_LEARNING'}],learningsAwaitingReview:['l1'],uninterpretedSignals:[],inconclusive:[]}};
  expect(views.nextStep(brand(['Strategic Objective'],pending))).toMatchObject({kind:'DECISION',action:{module:'Market Arena'}});
  expect(views.nextStep(brand(MODULES,pending))).toMatchObject({kind:'LEARNING',action:{type:'view',view:'validation'}});
 });
 it('all nine defined and nothing pending says so without inventing work',()=>{
  expect(views.nextStep(brand(MODULES))).toMatchObject({kind:'UP_TO_DATE'});
 });
 it('attention separates decisions from observations and never contradicts zero mandatory reviews',()=>{
  const c=brand(['Strategic Objective'],{experiments:[{id:'x',status:'RUNNING'}],intelligence:{issues:[{kind:'MISSING_BASIS',severity:'INFO',modules:['Primary Customer','Market Arena'],reviewFirst:'Primary Customer'}],reviewPlan:[{module:'Core Message',mandatory:false,triggers:[]}]},validation:{nextValidation:[],learningsAwaitingReview:['l1'],uninterpretedSignals:['s1'],inconclusive:[]}});
  const g=views.attentionGroups(c);
  expect(g.mandatoryReviews).toBe(0);
  expect(g.decide.map(i=>i.text)).toEqual(['Hay un aprendizaje pendiente de revisión']);
  expect(g.observe.map(i=>i.text)).toEqual(['Podrías revisar mensaje principal',expect.stringContaining('Cliente principal se decidió antes que Mercado objetivo'),'Tu experimento continúa en ejecución','1 señal sin interpretar']);
  const html=views.homeHtml(c);
  expect(html).toContain('Sin revisiones obligatorias pendientes');
  expect(html).toContain('Requiere tu decisión');
  expect(html).toContain('Observación');
 });
 it('escapes every brand text it renders',()=>{
  const c=brand(['Strategic Objective']);(c.versions[0] as {selectedOption:string}).selectedOption='<img src=x onerror=alert(1)>';
  expect(views.railHistoryHtml(c,'Strategic Objective')).not.toContain('<img src=x');
  expect(views.railHistoryHtml(c,'Strategic Objective')).toContain('&lt;img src=x');
 });
});
