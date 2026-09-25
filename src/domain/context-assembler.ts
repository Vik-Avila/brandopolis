import { AppError } from './contracts.js';
export interface ContextItem {id:string;type:string;critical:boolean;data:unknown;trust:string}
/** No provider tokens are guessed: this deterministic bound explicitly measures characters. */
export function assemble(contextVersion:string,question:unknown,dependencies:unknown,reviews:unknown,items:ContextItem[],budget:number) {
  if(!Number.isInteger(budget)||budget<100||budget>40000) throw new AppError('INVALID','Invalid context budget');
  const included:ContextItem[]=[],omitted:{id:string;reason:string}[]=[];
  let used=JSON.stringify({question,dependencies,reviews}).length;
  for(const item of items) {
    const size=JSON.stringify(item).length;
    if(used+size>budget) {
      if(item.critical) throw new AppError('INVALID','Budget cannot preserve current decisions and dependencies');
      omitted.push({id:item.id,reason:'CHARACTER_BUDGET'});
    } else {included.push(item);used+=size;}
  }
  if(used>budget) throw new AppError('INVALID','Budget cannot preserve critical context');
  return {packetVersion:'v1',contextVersion,question,dependencies,reviews,budget:{unit:'CHARACTERS',limit:budget,used},items:included,includedIds:included.map(i=>i.id),omitted,exhaustive:omitted.length===0};
}
