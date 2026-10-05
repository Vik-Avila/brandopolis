import { expect,it } from 'vitest';
import { brandoAiSmoke } from '../scripts/brando-ai-smoke.js';
import { demoBrando } from '../src/domain/brando.js';
import type { GatewayRequest,ModelProvider } from '../src/domain/analysis.js';

it('live-smoke harness sends one B1 query with only synthetic context and the provided model',async()=>{
  const requests:GatewayRequest[]=[];
  const provider:ModelProvider={name:'fixture',model:'operator-selected',generate:async request=>{requests.push(request);return demoBrando(request.input);}};
  const report=await brandoAiSmoke(provider);
  expect(requests).toHaveLength(1);
  expect(requests[0]).toMatchObject({task:'BRANDO_CONTEXTUAL',outputSchema:'brando-answer-v2',promptVersion:'brando-contextual-v4'});
  expect(JSON.stringify(requests[0])).toContain('Fixture ficticio');
  expect(report).toMatchObject({outcome:'OK',schemaValid:true,referencesValid:true,model:'operator-selected'});
  expect(report.sources.some(s=>s.type==='DecisionHistory')).toBe(true);
  expect(report.attention.map(a=>a.kind)).toEqual(['question','context']);
});
it('live-smoke harness withholds fabricated references and never falls back after a provider error',async()=>{
  const fabricated:ModelProvider={name:'fixture',model:'fixture',generate:async request=>{const answer=demoBrando(request.input);answer.facts[0].referenceIds=['invented-source'];return answer;}};
  expect(await brandoAiSmoke(fabricated)).toMatchObject({outcome:'INVALID_REFERENCES',answer:null});
  const failed:ModelProvider={name:'fixture',model:'fixture',generate:async()=>{throw Error('fixture secret must not be logged');}};
  const report=await brandoAiSmoke(failed);
  expect(report).toMatchObject({outcome:'PROVIDER_ERROR',answer:null});
  expect(JSON.stringify(report)).not.toContain('fixture secret');
});
