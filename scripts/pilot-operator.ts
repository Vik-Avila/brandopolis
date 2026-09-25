import { ConfigError } from '../src/transport/pilot-auth.js';
import { readFileSync } from 'node:fs';
import { connect } from '../src/persistence/database.js';
import { AppError } from '../src/domain/contracts.js';
import { PilotAccess } from '../src/application/pilot-access.js';
import { pilotConfig } from './pilot-config.js';
import { readiness } from '../src/persistence/readiness.js';
let connection:ReturnType<typeof connect>|undefined;
try {
  const settings=pilotConfig(),issuer=process.env.OIDC_ISSUER;if(!issuer||new URL(issuer).protocol!=='https:')throw new ConfigError('OIDC_ISSUER (HTTPS) is required: testers are bound to issuer + subject.');
  connection=connect(settings.databaseUrl);if(await readiness(connection.pool)!=='READY')throw new ConfigError('Database not READY: run pnpm pilot:migrate first.');
  const access=new PilotAccess(connection.db,issuer),[command,file]=process.argv.slice(2);
  // Inputs come from a private JSON file so subjects and IDs stay out of shell history.
  const input=command==='metrics'?{}:JSON.parse(readFileSync(file,'utf8'));
  if(command==='create')console.log(JSON.stringify(await access.provision(input.subject,input.cohort,input.workspaceId)));
  else if(command==='assign'){await access.assign(input.userId,input.brandId);console.log('Assignment saved.');}
  else if(command==='disable'){await access.disable(input.userId);console.log('Tester disabled; sessions revoked.');}
  else if(command==='classify-session'){await access.classifySession(input.sessionId,input.intervention);console.log('Future events will use the selected intervention; historical events unchanged.');}
  else if(command==='inspect')console.log(JSON.stringify(await access.inspect(input),null,2));
  else if(command==='revoke-sessions')console.log(JSON.stringify(await access.revokeSessions(input.userId)));
  else if(command==='metrics')console.log(JSON.stringify(await access.metrics(),null,2));
  else throw new ConfigError('Usage: pnpm pilot:operator <create|assign|inspect|revoke-sessions|disable|classify-session> <private.json> | pnpm pilot:operator metrics');
}catch(error){console.error(error instanceof ConfigError?error.message:error instanceof AppError?`${error.code}: ${error.message}`:'Operator request refused. Use create|assign|disable|classify-session and a private JSON file; verify PILOT configuration and scope.');process.exitCode=1;}
finally{await connection?.pool.end();}
