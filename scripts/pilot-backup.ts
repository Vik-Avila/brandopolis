import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync,mkdirSync } from 'node:fs';
import { resolve,dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ConfigError } from '../src/transport/pilot-auth.js';
import { pilotConfig } from './pilot-config.js';
// Hosted logical backup/restore with PostgreSQL 17 client tools. Never drops, cleans or overwrites:
// backup refuses an existing file; restore only targets an explicitly confirmed, empty, isolated database.
export type Step={binary:string;args:string[]};
export function backupPlan(operation:string|undefined,file:string|undefined,env:NodeJS.ProcessEnv=process.env,exists:(p:string)=>boolean=existsSync){
  if(!file||!['backup','restore-empty'].includes(operation??''))throw new ConfigError('Usage: pnpm pilot:backup backup <new-file.dump> | pnpm pilot:backup restore-empty <file.dump>');
  const url=new URL(pilotConfig(env).databaseUrl),target=resolve(file);
  const binary=(name:string)=>env.PG_BIN?resolve(env.PG_BIN,name+(process.platform==='win32'?'.exe':'')):name;
  // Connection details travel in PG* variables, never in argv (visible in process listings).
  const pgEnv={PGHOST:url.hostname,PGPORT:url.port||'5432',PGUSER:decodeURIComponent(url.username),PGPASSWORD:decodeURIComponent(url.password),PGDATABASE:decodeURIComponent(url.pathname.slice(1)),PGSSLMODE:url.searchParams.get('sslmode')??'verify-full'};
  if(operation==='backup'){
    if(exists(target))throw new ConfigError('Refused: backup target already exists; choose a new file name.');
    return {target,pgEnv,steps:[{binary:binary('pg_dump'),args:['--format=custom','--no-owner','--no-acl','--file',target]}] as Step[]};
  }
  if(env.PILOT_RESTORE_CONFIRM!=='EMPTY_ISOLATED_DATABASE')throw new ConfigError('Refused: set PILOT_RESTORE_CONFIRM=EMPTY_ISOLATED_DATABASE and point DATABASE_URL at a new, empty, isolated database.');
  if(!exists(target))throw new ConfigError('Refused: backup file not found.');
  return {target,pgEnv,steps:[
    {binary:binary('psql'),args:['-X','-A','-t','-c',"select count(*) from pg_tables where schemaname not in ('pg_catalog','information_schema')"]},
    {binary:binary('pg_restore'),args:['--exit-on-error','--single-transaction','--no-owner','--no-acl','--dbname',pgEnv.PGDATABASE,target]}
  ] as Step[]};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  const execute=promisify(execFile);
  try {
    const [operation,file]=process.argv.slice(2),plan=backupPlan(operation,file),env={...process.env,...plan.pgEnv};
    if(operation==='backup'){mkdirSync(dirname(plan.target),{recursive:true});await execute(plan.steps[0].binary,plan.steps[0].args,{env});console.log('Backup created. Restore it into an empty isolated database before accepting it as recovery evidence.');}
    else {
      const {stdout}=await execute(plan.steps[0].binary,plan.steps[0].args,{env});
      if(stdout.trim()!=='0')throw new ConfigError('Refused: the restore target database is not empty. Existing databases are never cleared.');
      await execute(plan.steps[1].binary,plan.steps[1].args,{env});console.log('Restored into the empty isolated database. Verify /health, history and a tester login before any cutover.');
    }
  } catch(error) {console.error(error instanceof ConfigError?error.message:'Backup/restore failed. Check PostgreSQL 17 client tools (PG_BIN), network/TLS and permissions.');process.exitCode=1;}
}
