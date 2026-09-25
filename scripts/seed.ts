import { randomBytes, randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { connect,type Database } from '../src/persistence/database.js';
import * as t from '../src/persistence/schema.js';
import { hash } from '../src/application/engine.js';
import { databaseUrl } from './local-db.js';
import { containsPilotData } from '../src/persistence/readiness.js';
export async function seedIdentity(db:Database,role='ADMIN',workspaceId=randomUUID()) {
  const userId=randomUUID(),token=randomBytes(32).toString('base64url');
  await db.transaction(async tx=>{
    await tx.insert(t.users).values({id:userId});
    await tx.insert(t.workspaces).values({id:workspaceId,name:'Workspace DEMO'}).onConflictDoNothing();
    await tx.insert(t.memberships).values({workspaceId,userId,role,active:true});
    await tx.insert(t.sessions).values({tokenHash:hash(token),userId,workspaceId,expiresAt:new Date(Date.now()+86400000)});
  });
  return {token,userId,workspaceId};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  if(process.env.NODE_ENV==='production') throw new Error('DEMO seed disabled in production');
  const {db,pool}=connect(databaseUrl());
  try {if(await containsPilotData(pool)){console.error('DEMO seed refused: this database contains PILOT data.');process.exitCode=1;}else{const identity=await seedIdentity(db);mkdirSync('.local',{recursive:true});writeFileSync('.local/demo-session.json',JSON.stringify(identity),{mode:0o600});console.log('Sesión DEMO creada en .local/demo-session.json (privado, expira en 24h).');}} finally {await pool.end();}
}
