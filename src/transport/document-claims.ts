import Anthropic from '@anthropic-ai/sdk';

export const DOCUMENT_CLAIMS_GENERATOR_VERSION='document-claims-v1';

const claimTypes=[
  'FACT',
  'HYPOTHESIS',
  'DECISION',
  'OPEN_QUESTION',
  'POSITIONING',
  'AUDIENCE',
  'OFFER',
  'PRICING',
  'RISK',
  'PRINCIPLE'
] as const;

export type DocumentClaimType=typeof claimTypes[number];

export interface DocumentClaimCandidate {
  claimType:DocumentClaimType;
  statement:string;
  location:{
    label:string;
    evidence:string;
  };
  confidence:'HIGH'|'MEDIUM'|'LOW';
}

export interface DocumentClaimsInput {
  brandName:string;
  documentName:string;
  extractionId:string;
  content:string;
}

export interface DocumentClaimsResult {
  claims:DocumentClaimCandidate[];
  provider:string;
  model:string;
  generatorVersion:string;
}

export interface DocumentClaimsService {
  generate(input:DocumentClaimsInput):Promise<DocumentClaimsResult>;
}

export class DocumentClaimsUnavailable implements DocumentClaimsService {
  async generate():Promise<DocumentClaimsResult>{
    throw new Error('DOCUMENT_CLAIMS_UNAVAILABLE');
  }
}

function clean(value:unknown,max=4000):string {
  return typeof value==='string'
    ?value.replace(/\s+/g,' ').trim().slice(0,max)
    :'';
}

function confidence(value:unknown):'HIGH'|'MEDIUM'|'LOW' {
  return value==='HIGH'||value==='MEDIUM'||value==='LOW'
    ?value
    :'LOW';
}

function claimType(value:unknown):DocumentClaimType|null {
  return typeof value==='string' &&
    (claimTypes as readonly string[]).includes(value)
      ?value as DocumentClaimType
      :null;
}

export class AnthropicDocumentClaims implements DocumentClaimsService {
  private client:Anthropic;

  constructor(
    key:string,
    private model:string,
    fetchImpl?:typeof fetch
  ){
    this.client=new Anthropic({
      apiKey:key,
      maxRetries:1,
      ...(fetchImpl?{fetch:fetchImpl}:{})
    });
  }

  async generate(
    input:DocumentClaimsInput
  ):Promise<DocumentClaimsResult>{
    const system=[
      'You are Brandopolis Source Corpus Analyst.',
      'You analyze one private user-provided brand document.',
      'Your task is extraction and classification, not strategic decision-making.',
      'Do not decide what is true for the brand.',
      'Do not reconcile contradictions with other documents.',
      'Do not invent missing facts.',
      'Distinguish explicit facts, hypotheses, provisional decisions, questions, positioning statements, audiences, offers, pricing, risks and principles.',
      'A statement described as draft, proposal, working assumption, target, idea or unresolved disagreement must not be upgraded into an approved fact.',
      'Every candidate must be traceable to wording actually present in the supplied document.',
      'Use concise professional Mexican Spanish for statement, label and evidence.',
      'Return only valid JSON.'
    ].join(' ');

    const user=[
      `Marca: ${input.brandName}`,
      `Documento: ${input.documentName}`,
      `Extraction ID: ${input.extractionId}`,
      '',
      'TIPOS PERMITIDOS:',
      claimTypes.join(', '),
      '',
      'REGLAS:',
      '- Devuelve entre 1 y 15 hallazgos útiles; evita fragmentos triviales.',
      '- FACT: algo presentado explícitamente por el documento como dato o condición existente.',
      '- HYPOTHESIS: supuesto, expectativa, creencia o afirmación pendiente de validación.',
      '- DECISION: decisión o acuerdo expresamente declarado; si es provisional, dilo en el statement.',
      '- OPEN_QUESTION: pregunta, desacuerdo o tema expresamente pendiente.',
      '- POSITIONING: propuesta de posicionamiento o forma deseada de ser percibido.',
      '- AUDIENCE: segmento o perfil de audiencia mencionado.',
      '- OFFER: producto, servicio, programa o estructura de oferta.',
      '- PRICING: precio, rango, meta económica o condición comercial.',
      '- RISK: riesgo, restricción, preocupación o amenaza identificada.',
      '- PRINCIPLE: principio, criterio, valor o regla de actuación.',
      '- confidence mide qué tan claramente respalda el documento esa clasificación, NO la verdad externa del contenido.',
      '- location.label debe identificar página, sección o referencia disponible en el texto.',
      '- location.evidence debe ser una paráfrasis breve del pasaje que sostiene el claim; no copies párrafos completos.',
      '- No hagas recomendaciones.',
      '- No agregues información externa.',
      '',
      'FORMATO JSON EXACTO:',
      '{',
      '  "claims": [',
      '    {',
      '      "claimType": "FACT",',
      '      "statement": "hallazgo conciso en español",',
      '      "location": {',
      '        "label": "Página 1 / sección / documento",',
      '        "evidence": "paráfrasis breve de lo que lo sustenta"',
      '      },',
      '      "confidence": "HIGH"',
      '    }',
      '  ]',
      '}',
      '',
      'CONTENIDO EXTRAÍDO:',
      input.content
    ].join('\n');

    const message=await this.client.messages.create({
      model:this.model,
      max_tokens:8000,
      system,
      messages:[{
        role:'user',
        content:user
      }],
      output_config:{
        format:{
          type:'json_schema',
          schema:{
            type:'object',
            additionalProperties:false,
            properties:{
              claims:{
                type:'array',
                items:{
                  type:'object',
                  additionalProperties:false,
                  properties:{
                    claimType:{
                      type:'string',
                      enum:[...claimTypes]
                    },
                    statement:{
                      type:'string'
                    },
                    location:{
                      type:'object',
                      additionalProperties:false,
                      properties:{
                        label:{type:'string'},
                        evidence:{type:'string'}
                      },
                      required:['label','evidence']
                    },
                    confidence:{
                      type:'string',
                      enum:['HIGH','MEDIUM','LOW']
                    }
                  },
                  required:[
                    'claimType',
                    'statement',
                    'location',
                    'confidence'
                  ]
                }
              }
            },
            required:['claims']
          }
        }
      }
    },{timeout:120000});

    if(message.stop_reason!=='end_turn')
      throw new Error('DOCUMENT_CLAIMS_INVALID_OUTPUT');

    const text=message.content
      .flatMap(block=>block.type==='text'?[block.text]:[])
      .join('');

    let parsed:unknown;

    try{
      parsed=JSON.parse(text);
    }catch{
      throw new Error('DOCUMENT_CLAIMS_INVALID_JSON');
    }

    const rawClaims=
      parsed &&
      typeof parsed==='object' &&
      Array.isArray((parsed as {claims?:unknown}).claims)
        ?(parsed as {claims:unknown[]}).claims
        :[];

    const claims:DocumentClaimCandidate[]=[];

    for(const raw of rawClaims){
      if(!raw||typeof raw!=='object')continue;

      const row=raw as Record<string,unknown>;
      const type=claimType(row.claimType);
      const statement=clean(row.statement,2000);

      const rawLocation=
        row.location&&typeof row.location==='object'
          ?row.location as Record<string,unknown>
          :{};

      const label=clean(rawLocation.label,500);
      const evidence=clean(rawLocation.evidence,1500);

      if(!type||!statement||!label||!evidence)continue;

      claims.push({
        claimType:type,
        statement,
        location:{
          label,
          evidence
        },
        confidence:confidence(row.confidence)
      });
    }

    if(!claims.length)
      throw new Error('DOCUMENT_CLAIMS_EMPTY');

    return {
      claims,
      provider:'ANTHROPIC',
      model:this.model,
      generatorVersion:DOCUMENT_CLAIMS_GENERATOR_VERSION
    };
  }
}
