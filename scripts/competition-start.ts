import { CompetitionError } from './competition-error.js';
import { existsSync,readFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { checkRuntime,competitionProfile,localCompetitionUrl,ensureDemoSession } from './competition-environment.js';
import { startLocalDb,stopLocalDb } from './local-db.js';
import { connect } from '../src/persistence/database.js';
import { Engine } from '../src/application/engine.js';
import { migrateDatabase } from './migrate.js';
import { createCompetitionDemo } from './competition-demo.js';
import { startServer } from '../src/transport/server.js';
import { readiness } from '../src/persistence/readiness.js';

const profile=competitionProfile(process.argv.includes('--isolated'));
let ownedDb:Awaited<ReturnType<typeof startLocalDb>>|undefined,app:Awaited<ReturnType<typeof startServer>>|undefined,connection:ReturnType<typeof connect>|undefined;
let closing=false;
async function stop(){if(closing)return;closing=true;await app?.stop();await connection?.pool.end();connection=undefined;if(ownedDb)await stopLocalDb(ownedDb);}
async function portAvailable(port:number){const probe=createServer();try{await new Promise<void>((resolve,reject)=>{probe.once('error',reject);probe.listen(port,'127.0.0.1',resolve);});return true;}catch{return false;}finally{if(probe.listening)await new Promise<void>(resolve=>probe.close(()=>resolve()));}}
try {
  checkRuntime();
  const existingServer=!(await portAvailable(profile.port));
  if(existingServer){
    let healthy=false;try{const r=await fetch(`http://127.0.0.1:${profile.port}/health`,{signal:AbortSignal.timeout(2500)}),h=await r.json();healthy=r.ok&&h.application==='brandopolis-competition'&&h.protocol==='rc1';}catch{/* Never kill an unknown process. */}
    if(!healthy)throw new CompetitionError(`Puerto ${profile.port} ocupado por una instancia incompatible. Cierra esa instancia o usa --isolated.`);
  }
  let url=localCompetitionUrl(profile),reachable=false;
  if(url){connection=connect(url);try{await connection.pool.query('select 1');reachable=true;}catch{await connection.pool.end();connection=undefined;}}
  if(!reachable){
    if(!(await portAvailable(profile.dbPort)))throw new CompetitionError(`El puerto PostgreSQL ${profile.dbPort} está ocupado por otro proceso. No se modificará.`);
    console.log('Iniciando PostgreSQL local DEMO…');ownedDb=await startLocalDb(false,{directory:profile.dbDirectory,port:profile.dbPort});url=ownedDb.url;connection=connect(url);
  }
  console.log('Aplicando migraciones pendientes sin borrar datos…');await migrateDatabase(connection!.db);
  if(await readiness(connection!.pool)!=='READY')throw new CompetitionError('El historial de migraciones no coincide con el checkout. Revisa competition:check; no se reescribirá.');
  const identity=await ensureDemoSession(connection!.db,profile),engine=new Engine(connection!.db);
  let demo:{brandId:string;url:string}|undefined;
  if(existsSync(profile.demoFile))try{const saved=JSON.parse(readFileSync(profile.demoFile,'utf8'));const brands=await engine.listBrands(identity.token);if(brands.some(b=>b.id===saved.brandId&&b.dataClass==='DEMO'))demo=saved;}catch{/* Inaccessible demos are never reused. */}
  if(!demo)demo=await createCompetitionDemo(connection!.db,profile);
  await connection!.pool.end();connection=undefined;
  if(!existingServer)app=await startServer(url!,profile.port);
  console.log(`DEMO lista: http://127.0.0.1:${profile.port}/?brand=${encodeURIComponent(demo.brandId)}&module=Primary%20Customer`);
  console.log(`Acceso: copia sólo el campo token del archivo privado ${profile.sessionFile}. No lo compartas.`);
  console.log('Guía: docs/15-handoff/competition-demo-runbook.md. Para otra marca: pnpm demo:competition'+(process.argv.includes('--isolated')?' --isolated':''));
  if(app||ownedDb){console.log('Mantén esta terminal abierta. Ctrl+C detiene sólo los procesos iniciados aquí y conserva datos.');process.once('SIGINT',()=>void stop());process.once('SIGTERM',()=>void stop());}
} catch(error) {
  const safe=error instanceof CompetitionError?error.message:'No se pudo iniciar PostgreSQL o preparar la demo. Revisa puertos y ejecuta pnpm competition:check.';
  console.error(safe);await stop();process.exitCode=1;
}
