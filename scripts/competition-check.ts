import { CompetitionError } from './competition-error.js';
import { existsSync,readFileSync } from 'node:fs';
import { checkRuntime,competitionProfile,localCompetitionUrl } from './competition-environment.js';
import { connect } from '../src/persistence/database.js';
import { readiness } from '../src/persistence/readiness.js';
import { Engine } from '../src/application/engine.js';
let connection:ReturnType<typeof connect>|undefined;
try {
  checkRuntime();console.log('PASS runtime, entorno local y assets requeridos.');
  const profile=competitionProfile(process.argv.includes('--isolated')),url=localCompetitionUrl(profile);
  if(!url)throw new CompetitionError('PostgreSQL local aún no está preparado. Ejecuta pnpm competition:start.');
  connection=connect(url);const state=await readiness(connection.pool);
  if(state!=='READY')throw new CompetitionError(state==='DATABASE_UNAVAILABLE'?'PostgreSQL local no está disponible. Ejecuta pnpm competition:start.':'Migraciones ausentes o incompatibles. Ejecuta pnpm competition:start; no alteres el journal.');
  console.log('PASS PostgreSQL reachable y ocho migraciones coincidentes.');
  if(!existsSync(profile.sessionFile))throw new CompetitionError('Falta sesión DEMO. Ejecuta pnpm competition:start.');
  const {token}=JSON.parse(readFileSync(profile.sessionFile,'utf8'));
  try{await new Engine(connection.db).me(token);}catch{throw new CompetitionError('Sesión DEMO vencida o no disponible. Ejecuta pnpm competition:start para recuperarla.');}
  console.log('PASS sesión DEMO autorizada.');
  let response:Response|undefined;
  try{response=await fetch(`http://127.0.0.1:${profile.port}/health`,{signal:AbortSignal.timeout(2500)});}
  catch{console.log('INFO servidor aún no responde. Inicia pnpm competition:start; este resultado sólo acredita prerrequisitos, no disponibilidad HTTP.');}
  if(response){
    let body;try{body=await response.json();}catch{throw new CompetitionError(`El puerto ${profile.port} responde con contenido incompatible. Revisa la instancia antes de presentar.`);}
    if(!response.ok||body.application!=='brandopolis-competition'||body.protocol!=='rc1'||body.status!=='ready')throw new CompetitionError('El servidor responde pero no está listo o es incompatible. Revisa la instancia antes de presentar.');
    console.log('PASS servidor listo.');
  }
  console.log('Competition preflight PASS. Este chequeo no reemplaza la validación completa.');
} catch(error){console.error(error instanceof CompetitionError?error.message:'Preflight no disponible. Revisa el perfil local; no se mostrarán credenciales.');process.exitCode=1;}
finally {await connection?.pool.end();}
