import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync,mkdirSync } from 'node:fs';
import { resolve,dirname } from 'node:path';
import { pilotConfig } from './pilot-config.js';
const execute=promisify(execFile);
try {
 const settings=pilotConfig(),[operation,file]=process.argv.slice(2),url=new URL(settings.databaseUrl);
 if(!file||!['backup','restore-empty'].includes(operation))throw new Error();
 const target=resolve(file),env={...process.env,PGHOST:url.hostname,PGPORT:url.port||'5432',PGUSER:decodeURIComponent(url.username),PGPASSWORD:decodeURIComponent(url.password),PGDATABASE:decodeURIComponent(url.pathname.slice(1)),PGSSLMODE:url.searchParams.get('sslmode')??'verify-full'};
 const binary=(name:string)=>process.env.PG_BIN?resolve(process.env.PG_BIN,name+(process.platform==='win32'?'.exe':'')):name;
 if(operation==='backup'){
  if(existsSync(target))throw new Error();mkdirSync(dirname(target),{recursive:true});
  await execute(binary('pg_dump'),['--format=custom','--no-owner','--no-acl','--file',target],{env});console.log('Backup created. Test restore before accepting recovery evidence.');
 }else{
  if(process.env.PILOT_RESTORE_CONFIRM!=='EMPTY_ISOLATED_DATABASE'||!existsSync(target))throw new Error();
  const {stdout}=await execute(binary('psql'),['-X','-A','-t','-c',"select count(*) from pg_tables where schemaname not in ('pg_catalog','information_schema')"],{env});
  if(stdout.trim()!=='0')throw new Error();
  await execute(binary('pg_restore'),['--exit-on-error','--single-transaction','--no-owner','--no-acl','--dbname',env.PGDATABASE,target],{env});console.log('Restored into empty isolated database. Verify history/readiness before any cutover.');
 }
}catch{console.error('Backup/restore refused or failed. Check PostgreSQL client tools, private target, TLS and empty isolated restore DB. Existing DBs are never cleared.');process.exitCode=1;}
