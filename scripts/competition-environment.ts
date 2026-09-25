import { CompetitionError } from './competition-error.js';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { Database } from '../src/persistence/database.js';
import { Engine,hash } from '../src/application/engine.js';
import { AppError } from '../src/domain/contracts.js';
import { sessions,memberships,workspaces } from '../src/persistence/schema.js';
import { seedIdentity } from './seed.js';
import { runtimeAssets } from '../src/transport/server.js';
export function competitionProfile(isolated=false) {
  const root=resolve('.local',isolated?'rc1-smoke':'');return {root,dbDirectory:resolve(root,'postgres'),dbPort:isolated?55434:55432,port:isolated?3001:3000,sessionFile:resolve(root,'demo-session.json'),demoFile:resolve(root,'competition-demo.json')};
}
export function checkRuntime() {
  if(Number(process.versions.node.split('.')[0])!==24)throw new CompetitionError('Se requiere Node 24.x. Usa el runtime documentado en LOCAL_HANDOFF.md.');
  if(process.env.NODE_ENV==='production'||process.env.DATABASE_URL?.trim())throw new CompetitionError('Competition tooling sólo admite PostgreSQL local DEMO. No uses NODE_ENV=production ni DATABASE_URL externo.');
  if(process.env.npm_config_user_agent&&!process.env.npm_config_user_agent.startsWith('pnpm/12.4.2'))throw new CompetitionError('Usa pnpm 12.4.2, la versión fijada por el proyecto.');
  for(const [file] of Object.values(runtimeAssets))if(!existsSync(file))throw new CompetitionError(`Falta un asset requerido: ${file}. Restaura el checkout antes de iniciar.`);
  for(const file of ['drizzle/meta/_journal.json','schemas/decision-commit.schema.json','config/strategic-method/learning-moments.v1.json'])if(!existsSync(file))throw new CompetitionError(`Falta ${file}. Ejecuta desde la raíz del repositorio.`);
}
export function localCompetitionUrl(profile:ReturnType<typeof competitionProfile>) {
  const path=resolve(profile.dbDirectory,'connection.json');if(!existsSync(path))return null;
  const settings=JSON.parse(readFileSync(path,'utf8'));
  if(settings.port!==profile.dbPort||typeof settings.password!=='string')throw new CompetitionError('El perfil PostgreSQL local no coincide con sus puertos documentados.');
  return `postgresql://postgres:${encodeURIComponent(settings.password)}@127.0.0.1:${settings.port}/postgres`;
}
export async function ensureDemoSession(db:Database,profile:ReturnType<typeof competitionProfile>) {
  const engine=new Engine(db);let saved:{token:string;userId:string;workspaceId:string}|undefined;
  if(existsSync(profile.sessionFile))try{saved=JSON.parse(readFileSync(profile.sessionFile,'utf8'));}catch{throw new CompetitionError('El archivo local de sesión no es JSON válido. Consérvalo para diagnóstico y usa --isolated.');}
  if(saved) {
    // Private local provisioning file; never a credential supplied through HTTP.
    const [session]=await db.select().from(sessions).where(eq(sessions.tokenHash,hash(saved.token)));
    const [workspace]=await db.select().from(workspaces).where(eq(workspaces.id,saved.workspaceId));
    if(session&&session.userId===saved.userId&&session.workspaceId===saved.workspaceId&&workspace?.name==='Workspace DEMO') {
      const member=await db.select().from(memberships).where(eq(memberships.userId,saved.userId));
      if(!member.some(m=>m.workspaceId===saved!.workspaceId&&m.active&&m.role==='ADMIN'))throw new CompetitionError('La sesión DEMO perdió permisos. No se elevarán privilegios automáticamente.');
      try{await engine.me(saved.token);if(session.expiresAt.getTime()>Date.now()+3600000)return saved;}catch(error){if(!(error instanceof AppError)||error.code!=='UNAUTHORIZED')throw error;}
      const token=randomBytes(32).toString('base64url');await db.insert(sessions).values({tokenHash:hash(token),userId:saved.userId,workspaceId:saved.workspaceId,expiresAt:new Date(Date.now()+86400000)});saved={...saved,token};
    } else throw new CompetitionError('La sesión no corresponde a este perfil DEMO. No se cambiará su identidad automáticamente. Usa --isolated.');
  } else saved=await seedIdentity(db);
  mkdirSync(profile.root,{recursive:true});writeFileSync(profile.sessionFile,JSON.stringify(saved),{mode:0o600});return saved;
}
