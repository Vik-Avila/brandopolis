import { readFileSync } from 'node:fs';
import { Ajv2020 } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

export class AppError extends Error {
  constructor(public code: 'UNAUTHORIZED'|'FORBIDDEN'|'CONFLICT'|'INVALID'|'NOT_FOUND'|'UNAVAILABLE', message: string) { super(message); }
}
const ajv = new Ajv2020({ allErrors: true, strict: false });
// JSON schemas remain the executable source of states; no independently maintained enums.
(addFormats as unknown as (a: Ajv2020) => void)(ajv);
export function schema(name: string) { return JSON.parse(readFileSync(new URL(`../../schemas/${name}.schema.json`, import.meta.url), 'utf8')); }
const validators = new Map<string, ReturnType<Ajv2020['compile']>>();
export function validate(name: string, value: unknown): void {
  let check = validators.get(name);
  if (!check) { check = ajv.compile(schema(name)); validators.set(name, check); }
  if (!check(value)) throw new AppError('INVALID', `Invalid ${name}`);
  if(name==='learning') {
    const learning=value as {status:string;reviewedBy:string|null};
    if(['REVIEWED','ACCEPTED','REJECTED'].includes(learning.status)&&!learning.reviewedBy) throw new AppError('INVALID','Learning requires human review');
  }
}
export function states(name: string, property: string): [string,...string[]] { return schema(name).properties[property].enum; }
export const rules: { version: string; rules: {upstream:string; downstream:string; kind:string; reason:string}[] } = JSON.parse(readFileSync(new URL('../../config/dependencies/v1.json',import.meta.url),'utf8'));
export interface CommitCommand {
  brandId:string; questionId:string; sourceRecommendationId:string|null; selectedOption:string; rationale:string;
  expectedActiveVersion:string|null; idempotencyKey:string; actorUserId:string;
}
export const questionTransitions: Record<string,readonly string[]> = {
  OPEN:['IN_ANALYSIS'], IN_ANALYSIS:['READY_FOR_DECISION'], READY_FOR_DECISION:['DECIDED'], DECIDED:['REOPENED'], REOPENED:['IN_ANALYSIS']
};
export function transition(current:string, next:string) {
  if (!questionTransitions[current]?.includes(next)) throw new AppError('CONFLICT','Invalid question transition');
}
export function reviewOrder(affected:{downstreamDecisionId:string;dependencyType:string}[],edges:{upstreamDecisionId:string;downstreamDecisionId:string}[]):string[] {
  const pending=new Set(edges.flatMap(e=>[e.upstreamDecisionId,e.downstreamDecisionId])),ordered:string[]=[];
  while(pending.size) {
    const ready=[...pending].filter(n=>!edges.some(e=>e.downstreamDecisionId===n&&pending.has(e.upstreamDecisionId))).sort();
    if(!ready.length) throw new AppError('INVALID','Dependency cycle');
    for(const node of ready) {pending.delete(node);ordered.push(node);}
  }
  return affected.filter(a=>a.dependencyType!=='INFORMATIVE').sort((a,b)=>(a.dependencyType==='HARD'?0:1)-(b.dependencyType==='HARD'?0:1)||ordered.indexOf(a.downstreamDecisionId)-ordered.indexOf(b.downstreamDecisionId)).map(a=>a.downstreamDecisionId);
}
