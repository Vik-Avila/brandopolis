import { existsSync,statSync } from 'node:fs';
import { connect } from '../src/persistence/database.js';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { drizzle } from 'drizzle-orm/node-postgres';
import { resolve } from 'node:path';
import { pilotConfig } from './pilot-config.js';
let connection:ReturnType<typeof connect>|undefined;
try{
 const config=pilotConfig();connection=connect(config.databaseUrl);
 const tables=await connection.pool.query("select count(*)::int as n from pg_tables where schemaname='public'");
 if(tables.rows[0].n>0){const backup=process.env.PILOT_BACKUP_FILE;if(!backup||!existsSync(backup)||statSync(backup).size===0||process.env.PILOT_RECOVERY_VERIFIED!=='yes')throw new Error('Recovery prerequisite missing');}
 const client=await connection.pool.connect();
 try{await client.query('select pg_advisory_lock(9262501)');try{await migrate(drizzle(client),{migrationsFolder:resolve('drizzle')});}finally{await client.query('select pg_advisory_unlock(9262501)');}}finally{client.release();}
 console.log('Forward migrations applied; no seed/reset performed.');
}catch{console.error('Migration gate refused. Verify PILOT config and a tested recovery backup before upgrading existing data.');process.exitCode=1;}
finally{await connection?.pool.end();}
