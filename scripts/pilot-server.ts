import { readFileSync } from 'node:fs';
import type { PoolClient } from 'pg';
import { connect } from '../src/persistence/database.js';
import { readiness,dataClassViolation,SINGLE_INSTANCE_LOCK } from '../src/persistence/readiness.js';
import { Engine } from '../src/application/engine.js';
import { ModelGateway } from '../src/domain/analysis.js';
import { AnthropicProvider,UnavailableProvider,PILOT_PROMPT_VERSION } from '../src/transport/anthropic-provider.js';
import { createApp } from '../src/transport/http.js';
import { runtimeAssets } from '../src/transport/assets.js';
import { pilotAuth,ConfigError,loadAiNotice } from '../src/transport/pilot-auth.js';
import { pilotConfig } from './pilot-config.js';
// PILOT runs as exactly one application instance: rate limits are in memory. A session-level advisory
// lock on a dedicated connection enforces it; a second instance refuses to start until the first exits.

let connection:ReturnType<typeof connect>|undefined,lock:PoolClient|undefined;
try {
  const settings=pilotConfig();connection=connect(settings.databaseUrl);
  if(await readiness(connection.pool)!=='READY')throw new ConfigError('Database not READY: run pnpm pilot:migrate (after a verified backup) before starting PILOT.');
  const violation=await dataClassViolation(connection.pool,'PILOT');if(violation)throw new ConfigError(violation);
  lock=await connection.pool.connect();
  if(!(await lock.query('select pg_try_advisory_lock($1) as ok',[SINGLE_INSTANCE_LOCK])).rows[0].ok)throw new ConfigError('Another PILOT instance holds the single-instance lock. PILOT runs as one instance; stop the other process first.');
  const provider=settings.ai.enabled?new AnthropicProvider(process.env.ANTHROPIC_API_KEY!.trim(),settings.ai.model!):new UnavailableProvider();
  const ai={notice:settings.ai.enabled?loadAiNotice(settings.ai.noticeFile):null,capPerTester:settings.ai.dailyCapPerTester,capTotal:settings.ai.dailyCapTotal};
  const auth=await pilotAuth(connection.db,settings.origin,{trustProxy:settings.trustProxy,requestAccessUrl:settings.requestAccessUrl,ai}).catch(error=>{throw error instanceof ConfigError?error:new ConfigError('OIDC discovery failed: check OIDC_ISSUER, network egress and provider status (pnpm pilot:preflight).');});
  const engine=new Engine(connection.db,undefined,new ModelGateway(provider,PILOT_PROMPT_VERSION,settings.ai.timeoutMs));
  const server=createApp(engine,path=>{const file=runtimeAssets[path as keyof typeof runtimeAssets];return file?{content:readFileSync(file[0]),type:file[1]}:undefined;},()=>readiness(connection!.pool),auth);
  await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(settings.port,settings.bindHost,resolve);});
  console.log(JSON.stringify({event:'pilot_started',port:settings.port,ai:provider.name,model:provider.model,aiNotice:ai.notice?.version??null,trustProxy:settings.trustProxy}));
  let closing=false;
  const stop=async()=>{if(closing)return;closing=true;console.log(JSON.stringify({event:'pilot_stopping'}));await new Promise<void>(r=>server.close(()=>r()));lock?.release(true);await connection!.pool.end();console.log(JSON.stringify({event:'pilot_stopped'}));};
  process.once('SIGINT',stop);process.once('SIGTERM',stop);
}catch(error){console.error(error instanceof ConfigError?error.message:'PILOT startup refused. Run pnpm pilot:preflight for a detailed check; no secrets are logged.');lock?.release(true);await connection?.pool.end();process.exitCode=1;}
