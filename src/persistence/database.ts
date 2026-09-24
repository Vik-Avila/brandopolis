import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema.js';
export function connect(connectionString:string) { const pool=new pg.Pool({connectionString}); return {pool,db:drizzle(pool,{schema})}; }
export type Database=ReturnType<typeof connect>['db'];
export type Transaction=Parameters<Parameters<Database['transaction']>[0]>[0];
