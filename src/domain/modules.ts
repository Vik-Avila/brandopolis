import { readFileSync } from 'node:fs';
const method=JSON.parse(readFileSync(new URL('../../config/strategic-method/modules.v1.json',import.meta.url),'utf8')) as {modules:{id:string;primaryQuestion:string;primaryDecision:string;priorityDepth:boolean}[]};
export const vertical=method.modules.filter(m=>m.priorityDepth);
export const learningMoments=(JSON.parse(readFileSync(new URL('../../config/strategic-method/learning-moments.v1.json',import.meta.url),'utf8')) as {moments:Record<string,{capability:string;why:string;observe:string;apply:string;caution:string}>}).moments;
