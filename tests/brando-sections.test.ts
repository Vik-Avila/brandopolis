import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const views=runInNewContext(readFileSync('src/transport/public/product-views.js','utf8').replace(/export (?=const |function )/g,'')+'\n({brandoSectionOrientation,brandoSectionHtml,brandoTicketExpired});');
const base=()=>({questions:['Primary Customer','Value Mechanism','Positioning','Core Message'].map((module,i)=>({id:`q${i}`,module})),decisions:[],versions:[],reviews:[],impacts:[],evidence:[],userInputs:[{id:'input'}],learnings:[]});
describe('Brando section orientation',()=>{
 it('guides each runtime section without claiming AI inference or strategic approval',()=>{
  const c=base();
  const orientations=c.questions.map(q=>views.brandoSectionOrientation(c,q.id));
  expect(new Set(orientations.map(o=>o.query)).size).toBe(4);
  for(const o of orientations){expect(o.state).toBe('pending');expect(views.brandoSectionHtml(o)).toContain('sin consulta a la IA');expect(o.query).toContain('no apruebes ni cambies estrategia');}
  expect(views.brandoSectionOrientation(c,'foreign')).toBeNull();
 });
 it('distinguishes missing brand context from a registered decision without certifying evidence',()=>{
  const c={...base(),userInputs:[],decisions:[{id:'d',questionId:'q0',activeVersionId:'v',reviewStatus:'APPROVED'}],versions:[{id:'v',decisionId:'d',selectedOption:'Agencias',rationale:'Foco'}]};
  expect(views.brandoSectionOrientation({...base(),userInputs:[]},'q0').state).toBe('context');
  expect(views.brandoSectionOrientation(c,'q0').state).toBe('context');
  const o=views.brandoSectionOrientation({...c,evidence:[{id:'e',quality:'LOW'}]},'q0');expect(o.state).toBe('current');expect(o.message).not.toContain('validada');
 });
 it('prioritizes dependency review and preserves the exact recorded trigger and rationale',()=>{
  const c={...base(),decisions:[{id:'up',questionId:'q0',activeVersionId:'new',reviewStatus:'APPROVED'},{id:'down',questionId:'q2',activeVersionId:'old',reviewStatus:'NEEDS_REVIEW'}],versions:[{id:'new',decisionId:'up',selectedOption:'<script>Cliente cambiado</script>',rationale:'Criterio humano'},{id:'old',decisionId:'down'}],reviews:[{downstreamDecisionId:'down',triggerVersionId:'new',status:'OPEN'}]};
  const before=JSON.stringify(c),o=views.brandoSectionOrientation(c,'q2');
  expect(o.state).toBe('review');expect(o.changes[0]).toMatchObject({label:'Cliente principal',rationale:'Criterio humano'});
  expect(views.brandoSectionHtml(o)).toContain('&lt;script&gt;');expect(views.brandoSectionHtml(o)).not.toContain('<script>');expect(JSON.stringify(c)).toBe(before);
  c.reviews[0].status='COMPLETED';c.decisions[1].reviewStatus='APPROVED';expect(views.brandoSectionOrientation(c,'q2').state).toBe('current');
 });
 it('does not allow impact or invalidation to appear as an ordinary current decision',()=>{
  const c={...base(),decisions:[{id:'d',questionId:'q0',activeVersionId:'v',reviewStatus:'INVALIDATED'}],versions:[{id:'v',decisionId:'d'}],impacts:[{status:'IMPACT_PENDING'}]};
  expect(views.brandoSectionOrientation(c,'q0').state).toBe('impact');c.impacts=[];expect(views.brandoSectionOrientation(c,'q0').state).toBe('invalidated');
 });
 it('expires action affordances at the server deadline, or within fifteen minutes for legacy responses',()=>{
  expect(views.brandoTicketExpired({expiresAt:new Date(1000).toISOString()},0,999)).toBe(false);
  expect(views.brandoTicketExpired({expiresAt:new Date(1000).toISOString()},0,1000)).toBe(true);
  expect(views.brandoTicketExpired({},0,900000)).toBe(true);
  expect(views.brandoTicketExpired({expiresAt:'invalid'},0,0)).toBe(true);
 });
});
