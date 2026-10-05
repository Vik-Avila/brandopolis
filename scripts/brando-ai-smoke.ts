import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ModelGateway, type ModelProvider } from '../src/domain/analysis.js';
import { attentionFor, brandoPacket, validBrandoReferences, type BrandoState } from '../src/domain/brando.js';
import { AnthropicProvider } from '../src/transport/anthropic-provider.js';

// Human-only live execution. One Gateway query with synthetic context, no database or server access.
// Reuses the configured adapter (including its existing retry policy and output-token bound).
export async function brandoAiSmoke(provider:ModelProvider,timeoutMs=30000) {
  const brandId=randomUUID(),questionId=randomUUID(),positioningId=randomUUID();
  const decisionId=randomUUID(),currentId=randomUUID(),oldId=randomUUID(),evidenceId=randomUUID();
  const state:BrandoState={
    questions:[{id:questionId,module:'Primary Customer',text:'¿Quién es el cliente prioritario?'},{id:positioningId,module:'Positioning',text:'¿Cómo nos posicionaremos?'}],
    decisions:[{id:decisionId,questionId,activeVersionId:currentId,reviewStatus:'APPROVED'}],
    versions:[
      {id:currentId,decisionId,sequence:2,versionStatus:'APPROVED',selectedOption:'Agencias pequeñas que gestionan varias marcas',rationale:'Concentrar el piloto en equipos con problemas de continuidad entre marcas; no hemos validado disposición a pagar.'},
      {id:oldId,decisionId,sequence:1,versionStatus:'SUPERSEDED',selectedOption:'Cualquier pequeña empresa',rationale:'Hipótesis inicial demasiado amplia; sustituida por un foco de piloto más concreto.'}
    ],
    evidence:[{id:evidenceId,claim:'En seis entrevistas simuladas, cuatro mencionaron pérdida del porqué de las decisiones.',source:'Fixture ficticio de seis entrevistas',sourceDate:'2026-10-01',provenance:'Datos inventados exclusivamente para esta prueba; no son investigación real.',quality:'LOW',relevance:'DIRECT',freshness:'CURRENT',limitations:['Muestra ficticia, pequeña y no representativa.','No valida demanda, tamaño de mercado ni disposición a pagar.']}],
    hypotheses:[{id:randomUUID(),statement:'Las agencias podrían valorar la continuidad de decisiones entre marcas.',status:'UNVALIDATED',evidenceReferences:[evidenceId]}],
    openQuestions:[{id:randomUUID(),statement:'¿Pagarían por una marca activa?',status:'OPEN'}],
    userInputs:[],learnings:[],reviews:[],dependencies:[],experiments:[],signals:[],impacts:[]
  };
  const promptVersion='brando-contextual-v4',contextVersion='synthetic-smoke-'+randomUUID();
  const message='Explica qué decidimos y por qué; distingue la decisión vigente de la anterior. ¿Qué evidencia tenemos y cuáles son sus límites? ¿Qué necesita atención? Propón una hipótesis, una pregunta y un siguiente paso. No inventes tamaño de mercado ni ingresos. No apruebes ni cambies estrategia.';
  const packet=brandoPacket(state,{id:brandId,name:'Lumbre Estudio · marca ficticia de prueba'},contextVersion,message,null,[]);
  const response=await new ModelGateway(provider,promptVersion,timeoutMs).invoke({task:'BRANDO_CONTEXTUAL',module:'Brando B1',promptVersion,contextVersion,input:packet,outputSchema:'brando-answer-v2',budget:{maxCharacters:30000,timeoutMs},tenantScope:{workspaceId:'synthetic-smoke',brandId},questionId});
  const referencesValid=Boolean(response.result&&validBrandoReferences(response.result,packet));
  const outcome=response.error??(referencesValid?'OK':'INVALID_REFERENCES');
  return {outcome,provider:response.provider,model:response.model,promptVersion,latencyMs:response.latencyMs,tokenIn:response.tokenIn,tokenOut:response.tokenOut,
    schemaValid:Boolean(response.result),referencesValid,answer:outcome==='OK'?response.result:null,
    sources:packet.items.map(item=>({id:item.id,type:item.type,data:item.data})),attention:attentionFor(state),
    review:'Revisión humana: cliente vigente = agencias; pequeña empresa = histórico. Entrevistas ficticias no prueban mercado/demanda/precio. Posicionamiento y disposición a pagar pendientes. Ninguna aprobación ni cambio automático.'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const key=process.env.ANTHROPIC_API_KEY?.trim(),model=process.env.ANTHROPIC_MODEL?.trim();
  if(!key||!model){console.error('Falta la clave o el identificador del modelo en el entorno temporal.');process.exitCode=1;}
  else {
    const report=await brandoAiSmoke(new AnthropicProvider(key,model));
    // JSON escapes terminal control characters. Only synthetic sources and answers are printed.
    console.log(JSON.stringify(report,null,2));
    console.log(report.outcome==='OK'?'BRANDO LIVE TECHNICAL SMOKE PASSED — revisión semántica humana pendiente; nada almacenado.':'BRANDO LIVE SMOKE FAILED — nada almacenado; producción intacta.');
    process.exitCode=report.outcome==='OK'?0:1;
  }
}
