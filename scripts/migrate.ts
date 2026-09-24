import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { connect, type Database } from '../src/persistence/database.js';
import { databaseUrl } from './local-db.js';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
export async function migrateDatabase(db:Database) {await migrate(db,{migrationsFolder:resolve('drizzle')});}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  const {db,pool}=connect(databaseUrl());
  try {await migrateDatabase(db);console.log('Migraciones aplicadas.');} finally {await pool.end();}
}
