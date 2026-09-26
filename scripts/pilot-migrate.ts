import { ConfigError } from '../src/transport/pilot-auth.js';
import { existsSync,statSync } from 'node:fs';
import { connect } from '../src/persistence/database.js';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { drizzle } from 'drizzle-orm/node-postgres';
import { resolve } from 'node:path';
import { pilotConfig } from './pilot-config.js';
import { migrationPlan,dataClassViolation } from '../src/persistence/readiness.js';
let connection:ReturnType<typeof connect>|undefined;
try{
 const config=pilotConfig();connection=connect(config.databaseUrl);
 const plan=await migrationPlan(connection.pool);
 if(plan.diverged)throw new ConfigError(`Refused: the database migrations (${plan.applied}) diverge from this checkout (${plan.expected}). Deploy the matching release; never edit or downgrade published migrations.`);
 if(plan.pending===0){console.log(`Up to date: ${plan.applied}/${plan.expected} migrations; nothing applied.`);process.exit(0);}
 if((await connection.pool.query("select to_regclass('public.brands') as name")).rows[0].name){const v=await dataClassViolation(connection.pool,'PILOT');if(v)throw new ConfigError(v);}
 const tables=await connection.pool.query("select count(*)::int as n from pg_tables where schemaname='public'");
 if(tables.rows[0].n>0){const backup=process.env.PILOT_BACKUP_FILE;if(!backup||!existsSync(backup)||statSync(backup).size===0||process.env.PILOT_RECOVERY_VERIFIED!=='yes')throw new ConfigError('Existing data found: set PILOT_BACKUP_FILE to a non-empty verified backup and PILOT_RECOVERY_VERIFIED=yes before migrating.');}
 const client=await connection.pool.connect();
 try{await client.query('select pg_advisory_lock(9262501)');try{await migrate(drizzle(client),{migrationsFolder:resolve('drizzle')});}finally{await client.query('select pg_advisory_unlock(9262501)');}}finally{client.release();}
 console.log(`Forward migrations applied: ${plan.pending} pending → ${plan.expected}/${plan.expected}. No seed, reset or drop performed.`);
}catch(error){console.error(error instanceof ConfigError?error.message:'Migration gate refused. Verify PILOT config and a tested recovery backup before upgrading existing data.');process.exitCode=1;}
finally{await connection?.pool.end();}
