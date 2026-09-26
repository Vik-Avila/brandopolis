import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ModelGateway,evaluate,type ModelProvider } from '../src/domain/analysis.js';
import { assemble } from '../src/domain/context-assembler.js';
import { AnthropicProvider,PILOT_PROMPT_VERSION } from '../src/transport/anthropic-provider.js';
// Controlled real-provider smoke: one request built from a synthetic, fictitious brand. No database access,
// no tester data, no decision or recommendation is stored. Output: outcome, validation and usage only.
export async function aiSmoke(provider:ModelProvider,timeoutMs=30000) {
  const brandId=randomUUID(),questionId=randomUUID(),contextVersion='smoke-'+randomUUID();
  const packet=assemble(contextVersion,{id:questionId,module:'Primary Customer',text:'¿Quién debe ser nuestro cliente prioritario?',status:'IN_ANALYSIS'},[],[],[
    {id:randomUUID(),type:'UserInput',critical:false,data:{statement:'Marca ficticia de prueba: software para organizar decisiones estratégicas de marca.'},trust:'USER_STATEMENT'}
  ],12000);
  const response=await new ModelGateway(provider,PILOT_PROMPT_VERSION,timeoutMs).invoke({task:'STRATEGIC_ANALYSIS',module:'Primary Customer',promptVersion:PILOT_PROMPT_VERSION,contextVersion,input:packet,outputSchema:'recommendation',budget:{maxCharacters:20000,timeoutMs},tenantScope:{workspaceId:'smoke',brandId},questionId});
  const {result,...trace}=response;
  const bound=Boolean(result&&result.brandId===brandId&&result.questionId===questionId&&result.contextVersion===contextVersion);
  const evaluation=result?evaluate(result,packet):null;
  return {outcome:trace.error??(bound?'OK':'INVALID_OUTPUT'),provider:trace.provider,model:trace.model,promptVersion:trace.promptVersion,latencyMs:trace.latencyMs,tokenIn:trace.tokenIn,tokenOut:trace.tokenOut,
    schemaValid:Boolean(result),boundToRequest:bound,options:result?.options.length??0,evaluation:evaluation?.result??null,conflicts:evaluation?.issues.filter(i=>i.severity==='CONFLICT').length??null};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  const key=process.env.ANTHROPIC_API_KEY?.trim(),model=process.env.ANTHROPIC_MODEL?.trim();
  if(!key||!model){console.error('Set ANTHROPIC_API_KEY and ANTHROPIC_MODEL (server-side) to run the controlled provider smoke.');process.exitCode=1;}
  else {
    const report=await aiSmoke(new AnthropicProvider(key,model),Number(process.env.AI_TIMEOUT_MS??30000));
    console.log(JSON.stringify(report,null,2));
    console.log(report.outcome==='OK'&&report.conflicts===0?'AI PROVIDER SMOKE PASSED (proposal only; nothing stored).':'AI PROVIDER SMOKE FAILED: PILOT stays usable without AI; check key, model, quota and network.');
    process.exitCode=report.outcome==='OK'&&report.conflicts===0?0:1;
  }
}
