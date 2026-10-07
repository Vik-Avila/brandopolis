import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import Anthropic from '@anthropic-ai/sdk';
import { ProviderFailure,type GatewayRequest,type ModelProvider } from '../domain/analysis.js';
import { schema } from '../domain/contracts.js';
// Provider-side structured output supports a JSON Schema subset; the full local schema v1 still validates every response.
function providerSchema(value:unknown):unknown {
  if(Array.isArray(value))return value.map(providerSchema);
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([k])=>!['$schema','$id','x-version','examples','minLength','minItems','maxLength','maxItems'].includes(k)).map(([k,v])=>[k,providerSchema(v)]));
  return value;
}
export const PILOT_PROMPT_VERSION='pilot-strategic-v1';
export class AnthropicProvider implements ModelProvider {
  name='ANTHROPIC';
  private client:Anthropic;
  // Secrets stay server-side; the key is never part of the request body, logs or traces.
  constructor(key:string,readonly model:string,fetchImpl?:typeof fetch){this.client=new Anthropic({apiKey:key,maxRetries:1,...(fetchImpl?{fetch:fetchImpl}:{})});}
  async generate(r:GatewayRequest){return (await this.generateMeasured(r)).output;}
  async generateMeasured(r:GatewayRequest){
    // Constrain citations to the exact authorized source IDs in this request, not nested object IDs.
    // Keep the local reference guard: provider constraints do not replace authorization/validation.
    const outputSchema=providerSchema(schema(r.outputSchema)) as Record<string,unknown>;
    if(r.task==='BRANDO_CONTEXTUAL'&&r.outputSchema==='brando-answer-v2'&&r.input.includedIds.length){
      const facts=(outputSchema.properties as Record<string,unknown>).facts as {items:{properties:{referenceIds:{items:Record<string,unknown>}}}};
      facts.items.properties.referenceIds.items.enum=[...new Set(r.input.includedIds)];
    }
    let message:Anthropic.Message;
    try {
      message=await this.client.messages.create({
        model:this.model,max_tokens:16000,
        system:readFileSync(`prompts/${r.task==='BRANDO_CONTEXTUAL'?(r.promptVersion==='brando-contextual-v5'?'brando-contextual-v5':r.promptVersion==='brando-contextual-v4'?'brando-contextual-v4':r.promptVersion==='brando-contextual-v3'?'brando-contextual-v3':r.promptVersion==='brando-contextual-v2'?'brando-contextual-v2':'brando-contextual-v1'):PILOT_PROMPT_VERSION}.md`,'utf8'),
        messages:[{role:'user',content:JSON.stringify({id:randomUUID(),brandId:r.tenantScope.brandId,questionId:r.questionId,contextVersion:r.contextVersion,module:r.module,context:r.input})}],
        output_config:{format:{type:'json_schema',schema:outputSchema}}
      },{timeout:r.budget.timeoutMs});
    } catch(error) {
      if(error instanceof Anthropic.RateLimitError)throw new ProviderFailure('RATE_LIMIT');
      if(error instanceof Anthropic.APIConnectionTimeoutError)throw new ProviderFailure('TIMEOUT');
      throw new ProviderFailure('PROVIDER_ERROR');
    }
    // refusal, max_tokens or any other stop is never treated as a usable proposal.
    if(message.stop_reason!=='end_turn')throw new ProviderFailure('INVALID_OUTPUT');
    const text=message.content.flatMap(b=>b.type==='text'?[b.text]:[]).join('');
    let output:unknown;try{output=JSON.parse(text);}catch{throw new ProviderFailure('INVALID_OUTPUT');}
    return {output,tokenIn:message.usage.input_tokens??null,tokenOut:message.usage.output_tokens??null};
  }
}
export class UnavailableProvider implements ModelProvider {name='PILOT_UNCONFIGURED';model='none';async generate():Promise<never>{throw new ProviderFailure('UNAVAILABLE');}}
