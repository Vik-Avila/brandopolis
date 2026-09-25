import { ConfigError } from '../src/transport/pilot-auth.js';
import { readFileSync } from 'node:fs';
import { connect } from '../src/persistence/database.js';
import { readiness,dataClassViolation } from '../src/persistence/readiness.js';
import { Engine } from '../src/application/engine.js';
import { ModelGateway } from '../src/domain/analysis.js';
import { AnthropicProvider,UnavailableProvider,PILOT_PROMPT_VERSION } from '../src/transport/anthropic-provider.js';
import { createApp } from '../src/transport/http.js';
import { runtimeAssets } from '../src/transport/server.js';
import { pilotAuth } from '../src/transport/pilot-auth.js';
import { pilotConfig } from './pilot-config.js';
let connection:ReturnType<typeof connect>|undefined;
try {
  const settings=pilotConfig();connection=connect(settings.databaseUrl);
  if(await readiness(connection.pool)!=='READY')throw new ConfigError('Database not READY: run pnpm pilot:migrate (after a verified backup) before starting PILOT.');
  const violation=await dataClassViolation(connection.pool,'PILOT');if(violation)throw new ConfigError(violation);
  const provider=process.env.ANTHROPIC_API_KEY&&process.env.ANTHROPIC_MODEL?new AnthropicProvider(process.env.ANTHROPIC_API_KEY,process.env.ANTHROPIC_MODEL):new UnavailableProvider();
  const auth=await pilotAuth(connection.db,settings.origin,{trustProxy:settings.trustProxy,requestAccessUrl:settings.requestAccessUrl}),engine=new Engine(connection.db,undefined,new ModelGateway(provider,PILOT_PROMPT_VERSION,Number(process.env.AI_TIMEOUT_MS??30000)));
  const server=createApp(engine,path=>{const file=runtimeAssets[(path==='/'?'/':path) as keyof typeof runtimeAssets];return file?{content:readFileSync(file[0]),type:file[1]}:undefined;},()=>readiness(connection!.pool),auth);
  await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(settings.port,process.env.BIND_HOST??'127.0.0.1',resolve);});
  console.log(JSON.stringify({event:'pilot_started',ai:provider.name,model:provider.model,trustProxy:settings.trustProxy}));
  let closing=false;const stop=async()=>{if(closing)return;closing=true;await new Promise<void>(r=>server.close(()=>r()));await connection!.pool.end();};process.once('SIGINT',stop);process.once('SIGTERM',stop);
}catch(error){console.error(error instanceof ConfigError?error.message:'PILOT startup refused. Verify dedicated DB, forward migrations, HTTPS origin and OIDC configuration; no secrets logged.');await connection?.pool.end();process.exitCode=1;}
