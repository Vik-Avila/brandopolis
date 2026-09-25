import { readFileSync } from 'node:fs';
import { connect } from '../src/persistence/database.js';
import { PilotAccess } from '../src/application/pilot-access.js';
import { pilotConfig } from './pilot-config.js';
import { readiness } from '../src/persistence/readiness.js';
let connection:ReturnType<typeof connect>|undefined;
try {
  const settings=pilotConfig(),issuer=process.env.OIDC_ISSUER;if(!issuer||new URL(issuer).protocol!=='https:')throw new Error();
  connection=connect(settings.databaseUrl);if(await readiness(connection.pool)!=='READY')throw new Error();
  const access=new PilotAccess(connection.db,issuer),[command,file]=process.argv.slice(2);
  const input=JSON.parse(readFileSync(file,'utf8'));
  if(command==='create')console.log(JSON.stringify(await access.provision(input.subject,input.cohort,input.workspaceId)));
  else if(command==='assign'){await access.assign(input.userId,input.brandId);console.log('Assignment saved.');}
  else if(command==='disable'){await access.disable(input.userId);console.log('Tester disabled; sessions revoked.');}
  else if(command==='classify-session'){await access.classifySession(input.sessionId,input.intervention);console.log('Future events will use the selected intervention; historical events unchanged.');}
  else throw new Error();
}catch{console.error('Operator request refused. Use create|assign|disable|classify-session and a private JSON file; verify PILOT configuration and scope.');process.exitCode=1;}
finally{await connection?.pool.end();}
