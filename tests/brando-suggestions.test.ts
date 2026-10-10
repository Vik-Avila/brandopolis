import {describe,it,expect} from 'vitest';
import {brandoSuggestionActions} from '../src/domain/brando.js';
import {BrandoSuggestions} from '../src/domain/brando-suggestions.js';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const scope={workspaceId:'w',brandId:'b',userId:'u'};
const value={...scope,sourceVersion:'s',contextVersion:'c',questionId:'q',suggestion:'Revisa tu cliente.',capability:'Customer Understanding'};
describe('Human Brando proposal proof',()=>{
 it('binds an issued suggestion to its authenticated user, workspace and brand',()=>{
  const tickets=new BrandoSuggestions(),ticket=tickets.issue(value);
  expect(tickets.read(ticket.ticketId,scope).suggestion).toBe(value.suggestion);
  for(const foreign of [{...scope,userId:'other'},{...scope,brandId:'other'},{...scope,workspaceId:'other'}])expect(()=>tickets.read(ticket.ticketId,foreign)).toThrow();
  expect(()=>tickets.read('forged',scope)).toThrow();
 });
 it('expires proposal proof and bounds process memory without changing durable strategy',()=>{
  let now=0;const tickets=new BrandoSuggestions(()=>now,1000,2);
  const a=tickets.issue(value),b=tickets.issue(value);tickets.issue(value);
  expect(()=>tickets.read(a.ticketId,scope)).toThrow();expect(tickets.read(b.ticketId,scope)).toBeTruthy();now=1000;expect(()=>tickets.read(b.ticketId,scope)).toThrow();
 });
 it('renders internal codes in plain Spanish while escaping untrusted generated text',()=>{
  const api=runInNewContext(readFileSync('src/transport/public/product-views.js','utf8').replace(/export (?=const |function )/g,'')+'\n({brandoPlainText,brandoAnswerHtml});');
  const text='HARD, Fixture DEMO, UNTESTED, READY_FOR_DECISION';
  expect(api.brandoPlainText(text)).toBe('dependencia estricta, datos simulados de demostración, sin validar, lista para decidir');
  const result={provider:'ANTHROPIC',answer:{answer:text,facts:[],hypotheses:[],suggestions:['<script>attack()</script> '+text],questions:[],limitations:[]},omitted:[],attention:[],sources:[],suggestionTickets:[{ticketId:'proof',kind:'STRATEGY'}]};
  const html=api.brandoAnswerHtml(result);expect(html).not.toContain('<script>');expect(html).toContain('&lt;script&gt;');expect(html).toContain('Llevar al borrador');expect(html).toContain('Modificar');expect(html).toContain('Descartar');expect(html).toContain('Alternativa propuesta');expect(html).toContain('Sin aprobar');expect(html).not.toContain('READY_FOR_DECISION');
 });
});

it('never treats missing, generic or incomplete action metadata as strategic authority',()=>{
 const base={answer:'Respuesta',facts:[],hypotheses:[],suggestions:['Consejo'],questions:[],limitations:[]};
 expect(brandoSuggestionActions(base,'q')[0].kind).toBe('CONTEXT');
 expect(brandoSuggestionActions({...base,suggestionActions:[{kind:'EVIDENCE',proposedDecision:null}]},'q')[0].kind).toBe('EVIDENCE');
 expect(brandoSuggestionActions({...base,suggestionActions:[{kind:'STRATEGY',proposedDecision:'Agencias'}]},null)[0].kind).toBe('CONTEXT');
 expect(brandoSuggestionActions({...base,suggestionActions:[{kind:'STRATEGY',proposedDecision:'  '}]},'q')[0].kind).toBe('CONTEXT');
});
