import { cpSync,existsSync,realpathSync,mkdirSync } from 'node:fs';
import { resolve,relative,isAbsolute } from 'node:path';
// Local PostgreSQL 17 cold-copy verification only; hosted PILOT uses pg_dump/managed recovery.
export function coldCopy(source:string,destination:string){
  const root=realpathSync('.local'),from=realpathSync(source),to=resolve(destination);
  for(const path of [from,to]){const rel=relative(root,path);if(!rel||rel.startsWith('..')||isAbsolute(rel))throw new Error('Recovery paths must be distinct children of .local');}
  if(to.startsWith(from+'\\')||to.startsWith(from+'/')||existsSync(to))throw new Error('Recovery destination must not exist or overlap');
  if(!existsSync(resolve(from,'data/PG_VERSION'))||existsSync(resolve(from,'data/postmaster.pid')))throw new Error('Stop PostgreSQL cleanly before taking a cold copy');
  mkdirSync(to,{recursive:true});cpSync(from,to,{recursive:true,errorOnExist:true,force:false});
}
