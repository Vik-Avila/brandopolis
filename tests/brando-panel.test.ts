import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const render=runInNewContext(readFileSync('src/transport/public/product-views.js','utf8').replace(/export (?=const |function )/g,'')+'\nbrandoContextHtml;');
const base={questions:[{id:'q',module:'Primary Customer'}],decisions:[{id:'d',questionId:'q',activeVersionId:'new'}],versions:[{id:'old',sequence:1,selectedOption:'Historical choice',rationale:'Old reason'},{id:'new',sequence:2,selectedOption:'Current choice',rationale:'Human reason'}],reviews:[],evidence:[],hypotheses:[],attention:[]};
describe('Brando local contextual panel',()=>{
 it('shows only the active version and the recorded human reason, without inventing missing evidence',()=>{
  const html=render(base,'q');expect(html).toContain('Current choice');expect(html).toContain('Human reason');expect(html).toContain('Vigente · v2');expect(html).not.toContain('Historical choice');expect(html).toContain('Aún no hay evidencia registrada.');
  const pending=render({...base,decisions:[]},'q');expect(pending).toContain('Por decidir');expect(pending).not.toContain('Current choice');
 });
 it('treats stored context and attention as untrusted text and does not mutate them',()=>{
  const c={...base,evidence:[{claim:'<script>attack()</script>'}],hypotheses:[{statement:'<img onerror=attack()>'}],attention:[{module:'" onclick="attack()',label:'<b>untrusted</b>'}]};
  const before=JSON.stringify(c),html=render(c,'q');expect(html).not.toContain('<script>');expect(html).not.toContain('<img onerror');expect(html).not.toContain('data-brando-module="" onclick=');expect(html).toContain('&lt;script&gt;');expect(JSON.stringify(c)).toBe(before);
 });
});
