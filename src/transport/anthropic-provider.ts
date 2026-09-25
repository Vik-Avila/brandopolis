import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import type { GatewayRequest,ModelProvider } from '../domain/analysis.js';
import { schema } from '../domain/contracts.js';
function providerSchema(value:unknown):unknown {
  if(Array.isArray(value))return value.map(providerSchema);
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([k])=>!['$schema','$id','x-version','examples','minLength','minItems'].includes(k)).map(([k,v])=>[k,providerSchema(v)]));
  return value;
}
export class AnthropicProvider implements ModelProvider {
  name='ANTHROPIC';
  constructor(private key:string,readonly model:string,private request:typeof fetch=fetch){}
  async generate(r:GatewayRequest){return (await this.generateMeasured(r)).output;}
  async generateMeasured(r:GatewayRequest){
    const response=await this.request('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'content-type':'application/json','anthropic-version':'2023-06-01','x-api-key':this.key},signal:AbortSignal.timeout(r.budget.timeoutMs),body:JSON.stringify({model:this.model,max_tokens:2400,system:readFileSync('prompts/pilot-strategic-v1.md','utf8'),messages:[{role:'user',content:JSON.stringify({id:randomUUID(),brandId:r.tenantScope.brandId,questionId:r.questionId,contextVersion:r.contextVersion,module:r.module,context:r.input})}],output_config:{format:{type:'json_schema',schema:providerSchema(schema('recommendation'))}}})});
    if(!response.ok)throw new Error('Provider unavailable');
    const payload=await response.json() as {stop_reason?:string;content?:{type:string;text?:string}[];usage?:{input_tokens?:number;output_tokens?:number}};
    if(payload.stop_reason!=='end_turn')throw new Error('Incomplete provider response');
    const output=JSON.parse(payload.content?.filter(b=>b.type==='text').map(b=>b.text??'').join('')??'');
    return {output,tokenIn:payload.usage?.input_tokens??null,tokenOut:payload.usage?.output_tokens??null};
  }
}
export class UnavailableProvider implements ModelProvider {name='PILOT_UNCONFIGURED';model='none';async generate(){throw new Error('Provider unavailable');}}
