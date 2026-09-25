import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { connect } from '../src/persistence/database.js';
import { readiness,dataClassViolation,SINGLE_INSTANCE_LOCK,migrationPlan } from '../src/persistence/readiness.js';
import { discoverIssuer,loadAiNotice } from '../src/transport/pilot-auth.js';
import { validatePilotEnv } from './pilot-config.js';
export type Check={name:string;status:'PASS'|'WARN'|'FAIL';detail:string};
// Read-only launch pre-flight. Never migrates, seeds, writes data or calls the AI provider.
export async function preflight(env:NodeJS.ProcessEnv=process.env,options:{discover?:()=>Promise<string>}={}):Promise<Check[]> {
  const checks:Check[]=[],add=(name:string,status:Check['status'],detail:string)=>checks.push({name,status,detail});
  const {errors,warnings,settings}=validatePilotEnv(env);
  for(const e of errors)add('config','FAIL',e);for(const w of warnings)add('config','WARN',w);
  if(!settings)return checks;
  add('config','PASS',`origin ${settings.origin}; callback ${settings.oidc.redirectUri}; OIDC ${settings.oidc.confidential?'confidential':'public PKCE'} client; AI ${settings.ai.enabled?`enabled (${settings.ai.model}, caps ${settings.ai.dailyCapPerTester}/tester, ${settings.ai.dailyCapTotal}/day)`:'disabled'}`);
  if(settings.ai.enabled){try{add('ai-notice','PASS',`version ${loadAiNotice(settings.ai.noticeFile).version} from ${settings.ai.noticeFile}`);}catch{add('ai-notice','FAIL',`AI notice file ${settings.ai.noticeFile} missing or empty.`);}}
  for(const file of ['drizzle/meta/_journal.json','prompts/pilot-strategic-v1.md','src/transport/public/index.html'])if(!existsSync(file))add('files','FAIL',`${file} missing: run from the repository root of a complete checkout.`);
  const db=connect(settings.databaseUrl);
  try {
    const state=await readiness(db.pool);
    if(state==='DATABASE_UNAVAILABLE')add('database','FAIL','PostgreSQL unreachable with DATABASE_URL.');
    else {
      add('database','PASS','PostgreSQL reachable.');
      const plan=await migrationPlan(db.pool);
      if(plan.diverged)add('migrations','FAIL',`Database migrations (${plan.applied}) diverge from this checkout (${plan.expected}): deploy the matching release; never downgrade the schema.`);
      else if(plan.pending)add('migrations','FAIL',`${plan.applied}/${plan.expected} applied, ${plan.pending} pending: take a verified backup, then run pnpm pilot:migrate.`);
      else add('migrations','PASS',`${plan.applied}/${plan.expected} migrations applied and matching.`);
      if(state==='READY'){const v=await dataClassViolation(db.pool,'PILOT');add('data-class',v?'FAIL':'PASS',v??'No DEMO data in the PILOT database.');}
      const lock=await db.pool.connect();
      try{const free=(await lock.query('select pg_try_advisory_lock($1) as ok',[SINGLE_INSTANCE_LOCK])).rows[0].ok;add('single-instance',free?'PASS':'WARN',free?'No other PILOT instance is running.':'A PILOT instance is already running (expected after deploy, not before).');}
      finally{lock.release(true);}
    }
  } finally {await db.pool.end();}
  try{const issuer=await (options.discover??discoverIssuer)();add('oidc','PASS',`Discovery OK; testers are bound to issuer ${issuer}`);}
  catch{add('oidc','FAIL','OIDC discovery failed: check OIDC_ISSUER, network egress and provider status.');}
  const pgBin=(name:string)=>env.PG_BIN?resolve(env.PG_BIN,name+(process.platform==='win32'?'.exe':'')):name;
  try{const {stdout}=await promisify(execFile)(pgBin('pg_dump'),['--version']);add('backup-tools','PASS',stdout.trim());}
  catch{add('backup-tools','WARN','pg_dump not found (set PG_BIN): hosted backups via pnpm pilot:backup need PostgreSQL 17 client tools, or rely on a tested provider restore.');}
  return checks;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  const checks=await preflight().catch(()=>[{name:'preflight',status:'FAIL' as const,detail:'Pre-flight could not complete; no secrets were printed.'}]);
  for(const c of checks)console.log(`${c.status.padEnd(4)} ${c.name.padEnd(15)} ${c.detail}`);
  const failed=checks.some(c=>c.status==='FAIL');
  console.log(failed?'PRE-FLIGHT FAILED: do not launch.':'PRE-FLIGHT PASSED: safe to start pnpm pilot:start.');
  process.exitCode=failed?1:0;
}
