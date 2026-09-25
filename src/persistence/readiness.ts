import { readMigrationFiles } from 'drizzle-orm/migrator';
import type { Pool } from 'pg';
export const expectedMigrations=()=>readMigrationFiles({migrationsFolder:'drizzle'});
export const migrationsReadyMessage=()=>`PASS PostgreSQL reachable y ${expectedMigrations().length} migraciones coincidentes.`;
export async function readiness(pool:Pool):Promise<'READY'|'DATABASE_UNAVAILABLE'|'MIGRATIONS_REQUIRED'> {
  try {
    await pool.query('select 1');
    const exists=await pool.query("select to_regclass('drizzle.__drizzle_migrations') as name");
    if(!exists.rows[0].name)return 'MIGRATIONS_REQUIRED';
    const actual=await pool.query('select hash, created_at from drizzle.__drizzle_migrations order by created_at');
    const expected=expectedMigrations();
    return actual.rows.length===expected.length&&expected.every((e,i)=>e.hash===actual.rows[i].hash&&String(e.folderMillis)===String(actual.rows[i].created_at))?'READY':'MIGRATIONS_REQUIRED';
  } catch {return 'DATABASE_UNAVAILABLE';}
}
// DEMO and PILOT never share a database: each server refuses data of the other class.
export async function dataClassViolation(pool:Pool,mode:'DEMO'|'PILOT'):Promise<string|null> {
  if(mode==='PILOT')return (await pool.query(`select 1 from brands where "dataClass" <> 'PILOT' limit 1`)).rowCount?'Dedicated PILOT database required: non-PILOT brands found.':null;
  const pilot=await pool.query(`select 1 from pilot_workspaces limit 1`);
  return pilot.rowCount||(await pool.query(`select 1 from brands where "dataClass" = 'PILOT' limit 1`)).rowCount?'DEMO server refused: this database contains PILOT data.':null;
}
// PILOT runs as one application instance (in-memory rate limits); pilot:start holds this advisory lock.
export const SINGLE_INSTANCE_LOCK=9262502;
// Forward-only plan: applied migrations must be an exact prefix of this checkout's journal (same hash and
// timestamp). Anything else is divergence (edited migration or a newer database) and is never auto-applied.
export async function migrationPlan(pool:Pool):Promise<{applied:number;expected:number;pending:number;diverged:boolean}> {
  const expected=expectedMigrations(),exists=(await pool.query("select to_regclass('drizzle.__drizzle_migrations') as name")).rows[0].name;
  const actual=exists?(await pool.query('select hash, created_at from drizzle.__drizzle_migrations order by created_at')).rows:[];
  const diverged=actual.length>expected.length||actual.some((row,i)=>row.hash!==expected[i].hash||String(row.created_at)!==String(expected[i].folderMillis));
  return {applied:actual.length,expected:expected.length,pending:diverged?0:expected.length-actual.length,diverged};
}
export async function containsPilotData(pool:Pool) {
  if(!(await pool.query("select to_regclass('public.pilot_workspaces') as name")).rows[0].name)return false;
  return Boolean((await pool.query('select 1 from pilot_workspaces limit 1')).rowCount)||Boolean((await pool.query(`select 1 from brands where "dataClass"='PILOT' limit 1`)).rowCount);
}
