import { readFileSync } from 'node:fs';
const method=JSON.parse(readFileSync(new URL('../../config/strategic-method/modules.v2.json',import.meta.url),'utf8')) as {version:string;modules:{id:string;primaryQuestion:string;primaryDecision:string;priorityDepth:boolean;journey:boolean}[]};
export const modulesVersion=method.version;
/** Canonical MVP depth slice (Customer → Business → Position → Message). */
export const vertical=method.modules.filter(m=>m.priorityDepth);
/** Sections a Brand works through, in Decision Spine order (ADR-0021). */
export const journey=method.modules.filter(m=>m.journey);
export const learningMoments=(JSON.parse(readFileSync(new URL('../../config/strategic-method/learning-moments.v2.json',import.meta.url),'utf8')) as {moments:Record<string,{capability:string;why:string;observe:string;apply:string;caution:string}>}).moments;
