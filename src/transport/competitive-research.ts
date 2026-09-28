import { randomUUID } from 'node:crypto';
import Anthropic from '@anthropic-ai/sdk';

export interface CompetitiveResearchInput {
  brandId:string;
  brandName:string;
  marketContext:string[];
  competitiveReferences:string[];
}

export interface CompetitiveResearchSource {
  title:string;
  url:string;
  pageAge:string|null;
}

export interface CompetitiveResearchFinding {
  id:string;
  subject:string;
  observation:string;
  strategicRelevance:string;
  limitations:string[];
  sources:CompetitiveResearchSource[];
}

export interface CompetitiveResearchResult {
  findings:CompetitiveResearchFinding[];
  searchedAt:string;
  provider:string;
  model:string;
}

export interface CompetitiveResearchService {
  research(input:CompetitiveResearchInput):Promise<CompetitiveResearchResult>;
}

export class CompetitiveResearchUnavailable implements CompetitiveResearchService {
  async research():Promise<never>{
    throw new Error('COMPETITIVE_RESEARCH_UNAVAILABLE');
  }
}

export class DemoCompetitiveResearch implements CompetitiveResearchService {
  async research(input:CompetitiveResearchInput):Promise<CompetitiveResearchResult>{
    const mentioned=input.competitiveReferences.length
      ?input.competitiveReferences.join(', ')
      :'No se aportaron competidores específicos';

    return {
      findings:[
        {
          id:String(randomUUID()),
          subject:'Alternativas que compiten por la misma necesidad',
          observation:`DEMO: para ${input.brandName}, conviene distinguir entre competidores directos y soluciones sustitutas. ${mentioned}.`,
          strategicRelevance:'DEMO: ampliar el marco competitivo puede evitar definir el posicionamiento sólo contra marcas aparentemente similares.',
          limitations:[
            'Hallazgo DEMO simulado; no procede de investigación web real.',
            'Debe sustituirse por evidencia pública antes de incorporarse a una marca real.'
          ],
          sources:[
            {
              title:'Fuente DEMO · alternativa de mercado',
              url:'https://example.com/brandopolis-demo/alternative',
              pageAge:null
            }
          ]
        },
        {
          id:String(randomUUID()),
          subject:'Patrones de propuesta de valor',
          observation:'DEMO: varias ofertas comparables suelen concentrar su mensaje en facilidad, velocidad o reducción de esfuerzo.',
          strategicRelevance:'DEMO: si el mercado comunica beneficios funcionales similares, puede existir espacio para diferenciarse mediante un resultado estratégico más específico.',
          limitations:[
            'Patrón ilustrativo generado para probar la experiencia.',
            'No representa una conclusión sobre un mercado real.'
          ],
          sources:[
            {
              title:'Fuente DEMO · patrón de posicionamiento',
              url:'https://example.com/brandopolis-demo/positioning',
              pageAge:null
            }
          ]
        },
        {
          id:String(randomUUID()),
          subject:'Señales para revisar antes de posicionar',
          observation:'DEMO: precio, tipo de cliente, promesa principal y forma de entrega son dimensiones útiles para comparar alternativas.',
          strategicRelevance:'DEMO: estructurar la comparación por dimensiones ayuda a evitar una lista superficial de competidores.',
          limitations:[
            'Marco de análisis DEMO.',
            'No constituye evidencia externa validada.'
          ],
          sources:[
            {
              title:'Fuente DEMO · marco comparativo',
              url:'https://example.com/brandopolis-demo/comparison',
              pageAge:null
            }
          ]
        }
      ],
      searchedAt:new Date().toISOString(),
      provider:'BRANDOPOLIS_DEMO',
      model:'deterministic-fixture'
    };
  }
}

type ResearchJson = {
  findings?:Array<{
    subject?:unknown;
    observation?:unknown;
    strategicRelevance?:unknown;
    limitations?:unknown;
    sources?:unknown;
  }>;
};

const stringValue=(value:unknown)=>typeof value==='string'?value.trim():'';

const validUrl=(value:unknown)=>{
  const text=stringValue(value);
  if(!text)return '';
  try {
    const url=new URL(text);
    return ['http:','https:'].includes(url.protocol)?url.toString():'';
  } catch {
    return '';
  }
};

function extractJson(text:string):ResearchJson {
  const trimmed=text.trim();

  try {
    return JSON.parse(trimmed) as ResearchJson;
  } catch {
    const fenced=/```(?:json)?\s*([\s\S]*?)```/i.exec(trimmed);
    if(fenced?.[1]){
      try {
        return JSON.parse(fenced[1]) as ResearchJson;
      } catch {
        // Continue to object extraction.
      }
    }

    const first=trimmed.indexOf('{');
    const last=trimmed.lastIndexOf('}');

    if(first>=0&&last>first){
      try {
        return JSON.parse(trimmed.slice(first,last+1)) as ResearchJson;
      } catch {
        return {};
      }
    }

    return {};
  }
}

export class AnthropicCompetitiveResearch implements CompetitiveResearchService {
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

  async research(input:CompetitiveResearchInput):Promise<CompetitiveResearchResult>{
    const system=[
      'You are Brandopolis Competitive Research.',
      'Your job is to investigate the public competitive environment of a brand.',
      'Search before concluding.',
      'When useful, open the most relevant pages you find and inspect them directly.',
      'Prefer official company, product, pricing, about and documentation pages.',
      'Use reputable secondary sources only when they materially add context.',
      'Never invent market share, revenue, customer sentiment, traction or private facts.',
      'Separate source-observed facts from interpretation.',
      'A competitor can be a direct competitor, substitute or relevant alternative.',
      'The human user decides whether any finding becomes Brand Context.',
      'All user-facing output must be written in clear, professional Mexican Spanish (es-MX), except proper names, brand names, URLs and source titles that should remain faithful to the original source.',
      'Do not use English classification labels such as direct competitor, substitute, market pattern, observation or interpretation in user-facing text.',
      'Do not prefix fields with words such as Interpretation:, Observation:, Finding: or similar labels; the interface already provides those labels.',
      'Keep findings concise, executive and easy to scan.',
      'Return only valid JSON. No markdown.'
    ].join(' ');

    const user=[
      'Investiga el entorno competitivo de la siguiente marca.',
      'IMPORTANTE: responde todo el contenido destinado al usuario en español de México (es-MX).',
      '',
      `Brand name: ${input.brandName}`,
      '',
      'Known Brand Context:',
      ...(input.marketContext.length
        ?input.marketContext.map(item=>`- ${item}`)
        :['- No additional context available']),
      '',
      'Competitors, alternatives or references already supplied by the user:',
      ...(input.competitiveReferences.length
        ?input.competitiveReferences.map(item=>`- ${item}`)
        :['- None supplied']),
      '',
      'Research objectives:',
      '- Identify strategically relevant direct competitors, substitutes or reference brands.',
      '- Inspect positioning, audience signals, public value proposition, offer structure and declared differentiators.',
      '- Look for repeated patterns and meaningful contrast.',
      '- Prefer current public sources.',
      '- Open relevant source pages when search snippets are insufficient.',
      '',
      'Devuelve entre 3 y 6 hallazgos concisos y ejecutivos.',
      'Cada subject debe ser únicamente el nombre limpio del competidor, alternativa, marca de referencia o patrón de mercado; no agregues clasificaciones entre paréntesis.',
      'observation debe contener únicamente señales o hechos observables en las fuentes revisadas, sin mezclar interpretación.',
      'strategicRelevance debe explicar de forma breve por qué el hallazgo podría importar a esta marca y debe presentarse claramente como interpretación, pero sin anteponer la palabra Interpretation o Interpretación.',
      'Si una relación entre entidades no está confirmada, exprésala como señal o posibilidad por verificar y declara la limitación.',
      'Evita describir el proceso de búsqueda. No escribas frases como search result previews show, the model found o similares.',
      'Procura que observation no exceda aproximadamente 90 palabras y strategicRelevance no exceda aproximadamente 70 palabras.',
      '',
      'Return exactly this JSON shape:',
      '{',
      '  "findings": [',
      '    {',
      '      "subject": "nombre limpio del competidor, alternativa, marca de referencia o patrón de mercado",',
      '      "observation": "hechos o señales observables que indican las fuentes revisadas, en español",',
      '      "strategicRelevance": "por qué podría importar a la marca; interpretación breve y claramente separada de los hechos",',
      '      "limitations": ["limitación o incertidumbre importante, en español"],',
      '      "sources": [',
      '        {',
      '          "title": "source title",',
      '          "url": "https://...",',
      '          "pageAge": "date or freshness signal when available, otherwise null"',
      '        }',
      '      ]',
      '    }',
      '  ]',
      '}',
      '',
      'Every finding must contain at least one real source URL you actually reviewed.',
      'Do not include a source merely because it appeared in search results if you did not rely on it.',
      'Do not make a recommendation or choose a strategy for the user.'
    ].join('\n');

    const message=await this.client.messages.create({
      model:this.model,
      max_tokens:7000,
      system,
      tools:[
        {
          type:'web_search_20260318',
          name:'web_search',
          max_uses:4
        },
        {
          type:'web_fetch_20260318',
          name:'web_fetch',
          max_uses:5,
          citations:{enabled:true},
          max_content_tokens:12000
        }
      ],
      messages:[{
        role:'user',
        content:user
      }]
    },{timeout:120000});

    const text=message.content
      .flatMap(block=>block.type==='text'?[block.text]:[])
      .join('\n');

    const parsed=extractJson(text);

    const findings:CompetitiveResearchFinding[]=[];

    for(const raw of Array.isArray(parsed.findings)?parsed.findings:[]){
      const subject=stringValue(raw.subject);
      const observation=stringValue(raw.observation);
      const strategicRelevance=stringValue(raw.strategicRelevance);

      const limitations=Array.isArray(raw.limitations)
        ?raw.limitations.map(stringValue).filter(Boolean).slice(0,6)
        :[];

      const sources=Array.isArray(raw.sources)
        ?raw.sources.flatMap(source=>{
            if(!source||typeof source!=='object')return [];
            const row=source as Record<string,unknown>;
            const url=validUrl(row.url);
            if(!url)return [];

            return [{
              title:stringValue(row.title)||new URL(url).hostname,
              url,
              pageAge:stringValue(row.pageAge)||null
            }];
          }).slice(0,8)
        :[];

      if(!subject||!observation||!strategicRelevance||!sources.length)continue;

      findings.push({
        id:String(randomUUID()),
        subject,
        observation,
        strategicRelevance,
        limitations:limitations.length
          ?limitations
          :['Hallazgo asistido por IA basado en fuentes públicas; requiere revisión humana.'],
        sources
      });

      if(findings.length>=6)break;
    }

    if(!findings.length){
      throw new Error('COMPETITIVE_RESEARCH_INVALID_OUTPUT');
    }

    return {
      findings,
      searchedAt:new Date().toISOString(),
      provider:'ANTHROPIC',
      model:this.model
    };
  }
}
