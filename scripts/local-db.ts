import EmbeddedPostgres from 'embedded-postgres';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
export async function startLocalDb(test=false) {
  const directory=resolve('.local',test?'test-postgres':'postgres');
  mkdirSync(directory,{recursive:true});
  const secret=resolve(directory,'connection.json');
  const settings=existsSync(secret)?JSON.parse(readFileSync(secret,'utf8')):{password:randomBytes(32).toString('hex'),port:test?55433:55432};
  if(!existsSync(secret)) writeFileSync(secret,JSON.stringify(settings),{mode:0o600});
  const db=new EmbeddedPostgres({databaseDir:resolve(directory,'data'),user:'postgres',password:settings.password,port:settings.port,persistent:true,authMethod:'scram-sha-256',postgresFlags:['-h','127.0.0.1'],initdbFlags:['--encoding=UTF8','--locale=C'],onLog:()=>{},onError:()=>{}});
  if(!existsSync(resolve(directory,'data','PG_VERSION'))) await db.initialise();
  await db.start();
  return {db,url:`postgresql://postgres:${settings.password}@127.0.0.1:${settings.port}/postgres`};
}
export function databaseUrl() {
  if(process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const p=resolve('.local/postgres/connection.json');
  if(!existsSync(p)) throw new Error('Start pnpm db:start or set DATABASE_URL');
  const {password,port}=JSON.parse(readFileSync(p,'utf8'));
  return `postgresql://postgres:${password}@127.0.0.1:${port}/postgres`;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  const {db}=await startLocalDb();
  console.log('PostgreSQL local listo en 127.0.0.1:55432. Ctrl+C para detener.');
  const timer=setInterval(()=>{},1000);
  const stop=async()=>{clearInterval(timer);await db.stop();};
  process.once('SIGINT',stop);process.once('SIGTERM',stop);
}
