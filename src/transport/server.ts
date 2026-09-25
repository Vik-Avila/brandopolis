import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { connect } from '../persistence/database.js';
import { readiness,dataClassViolation } from '../persistence/readiness.js';
import { Engine } from '../application/engine.js';
import { createApp } from './http.js';
import { databaseUrl } from '../../scripts/local-db.js';
export const runtimeAssets={
  '/':['src/transport/public/index.html','text/html; charset=utf-8'],
  '/app.js':['src/transport/public/app.js','text/javascript; charset=utf-8'],
  '/style.css':['src/transport/public/style.css','text/css; charset=utf-8'],
  '/brand/logo.svg':['public/brand/logo/brandopolis-logo-horizontal.svg','image/svg+xml'],
  '/brand/symbol.svg':['public/brand/symbols/brandopolis-symbol.svg','image/svg+xml'],
  '/brand/flow.webp':['public/brand/flow/brand-flow-light.webp','image/webp'],
  '/tokens.css':['design/brandopolis-ui/tokens/brandopolis.tokens.css','text/css; charset=utf-8']
} satisfies Record<string,[string,string]>;
export async function startServer(url=databaseUrl(),port=3000) {
  if(process.env.NODE_ENV==='production')throw new Error('RC1 es una demo local; autenticación de producción no habilitada.');
  for(const [file] of Object.values(runtimeAssets))readFileSync(file);
  const {db,pool}=connect(url),state=await readiness(pool);
  if(state!=='READY'){await pool.end();throw new Error(state==='MIGRATIONS_REQUIRED'?'Faltan migraciones o no coinciden. Ejecuta pnpm competition:start.':'PostgreSQL local no está disponible. Ejecuta pnpm competition:start o pnpm db:start.');}
  const violation=await dataClassViolation(pool,'DEMO');if(violation){await pool.end();throw new Error('Esta base contiene datos PILOT; la demo sólo usa su base DEMO local.');}
  const server=createApp(new Engine(db),path=>{
    const file=runtimeAssets[(path==='/login'||path==='/workspace'?'/':path) as keyof typeof runtimeAssets];
    return file?{content:readFileSync(file[0]),type:file[1]}:undefined;
  },()=>readiness(pool));
  try {await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',()=>{server.removeListener('error',reject);resolve();});});}
  catch {await pool.end();throw new Error(`El puerto ${port} está ocupado. Cierra la instancia anterior o usa pnpm competition:start --isolated.`);}
  console.log(`Brandopolis Competition MVP DEMO: http://127.0.0.1:${port}`);
  return {server,stop:async()=>{await new Promise<void>(resolve=>server.close(()=>resolve()));await pool.end();}};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  try {const app=await startServer();let closing=false;const stop=async()=>{if(closing)return;closing=true;await app.stop();};process.once('SIGINT',stop);process.once('SIGTERM',stop);}
  catch(error){console.error(error instanceof Error?error.message:'No se pudo iniciar la demo. Ejecuta pnpm competition:check.');process.exitCode=1;}
}
