import { readFileSync } from 'node:fs';
const method=JSON.parse(readFileSync(new URL('../../config/strategic-method/modules.v1.json',import.meta.url),'utf8')) as {modules:{id:string;primaryQuestion:string;primaryDecision:string;priorityDepth:boolean}[]};
export const vertical=method.modules.filter(m=>m.priorityDepth);
