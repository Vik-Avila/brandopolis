import EmbeddedPostgres from 'embedded-postgres';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { connect as tcp } from 'node:net';
if(existsSync('.env')) process.loadEnvFile('.env');
export async function startLocalDb(test=false,profile?:{directory:string;port:number}) {
  const directory=profile?.directory??resolve('.local',test?'test-postgres':'postgres');
  mkdirSync(directory,{recursive:true});
  const secret=resolve(directory,'connection.json');
  const settings=existsSync(secret)?JSON.parse(readFileSync(secret,'utf8')):{password:randomBytes(32).toString('hex'),port:profile?.port??(test?55433:55432)};
  if(!existsSync(secret)) writeFileSync(secret,JSON.stringify(settings),{mode:0o600});
  const db=new EmbeddedPostgres({databaseDir:resolve(directory,'data'),user:'postgres',password:settings.password,port:settings.port,persistent:true,authMethod:'scram-sha-256',postgresFlags:['-h','127.0.0.1'],initdbFlags:['--encoding=UTF8','--locale=C'],onLog:()=>{},onError:()=>{}});
  if(!existsSync(resolve(directory,'data','PG_VERSION'))) await db.initialise();
  await db.start();
  return {db,directory,port:settings.port as number,url:`postgresql://postgres:${settings.password}@127.0.0.1:${settings.port}/postgres`};
}
// embedded-postgres stops Windows clusters with a forced taskkill that returns before exit and leaves
// postmaster.pid behind. A clean stop goes through pg_ctl on this cluster's own data directory only.
async function pgCtl() {
  const platform=`@embedded-postgres/${process.platform==='win32'?'windows':process.platform}-${process.arch}`;
  const from=createRequire(createRequire(import.meta.url).resolve('embedded-postgres'));
  return (await import(pathToFileURL(from.resolve(platform)).href) as {pg_ctl:string}).pg_ctl;
}
const portOpen=(port:number)=>new Promise<boolean>(done=>{const s=tcp({host:'127.0.0.1',port},()=>{s.destroy();done(true);});s.on('error',()=>done(false));});
export async function stopLocalDb(handle:{directory:string;port:number},timeoutMs=60000) {
  const data=resolve(handle.directory,'data'),pid=resolve(data,'postmaster.pid');
  if(existsSync(pid)) {
    try {await promisify(execFile)(await pgCtl(),['stop','-D',data,'-m','fast','-w','-t',String(Math.ceil(timeoutMs/1000))],{timeout:timeoutMs+5000});}
    catch {
      if(!existsSync(pid))return;
      // No server answered but the lock file remains: the previous stop was not clean. Refuse, never delete it.
      if(!await portOpen(handle.port))throw new Error(`PostgreSQL at ${data} is not running but postmaster.pid remains (unclean shutdown). Start it once and stop it cleanly before copying.`);
      throw new Error(`PostgreSQL at ${data} did not shut down cleanly within ${timeoutMs} ms.`);
    }
  }
  const deadline=Date.now()+timeoutMs;
  while(existsSync(pid)||await portOpen(handle.port)) {
    if(Date.now()>deadline)throw new Error(`PostgreSQL at ${data} still running after ${timeoutMs} ms; data files were not copied.`);
    await new Promise(r=>setTimeout(r,100));
  }
}
export function databaseUrl() {
  if(process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const p=resolve('.local/postgres/connection.json');
  if(!existsSync(p)) throw new Error('Start pnpm db:start or set DATABASE_URL');
  const {password,port}=JSON.parse(readFileSync(p,'utf8'));
  return `postgresql://postgres:${password}@127.0.0.1:${port}/postgres`;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  const handle=await startLocalDb();
  console.log('PostgreSQL local listo en 127.0.0.1:55432. Ctrl+C para detener.');
  const timer=setInterval(()=>{},1000);
  const stop=async()=>{clearInterval(timer);await stopLocalDb(handle);};
  process.once('SIGINT',stop);process.once('SIGTERM',stop);
}
