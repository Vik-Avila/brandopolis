import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { connect, type Database } from '../src/persistence/database.js';
import { databaseUrl } from './local-db.js';
import { containsPilotData } from '../src/persistence/readiness.js';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
export async function migrateDatabase(db:Database) {await migrate(db,{migrationsFolder:resolve('drizzle')});}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  const {db,pool}=connect(databaseUrl());
  try {
    // DEMO tooling never touches a PILOT database: PILOT upgrades go through pnpm pilot:migrate and its backup gate.
    if(await containsPilotData(pool)){console.error('Esta base contiene datos PILOT. Usa pnpm pilot:migrate con respaldo verificado.');process.exitCode=1;}
    else {await migrateDatabase(db);console.log('Migraciones aplicadas.');}
  } finally {await pool.end();}
}
