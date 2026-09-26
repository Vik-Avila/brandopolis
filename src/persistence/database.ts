import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema.js';
export function connect(connectionString:string) { const pool=new pg.Pool({connectionString,connectionTimeoutMillis:3000,query_timeout:5000});pool.on('error',()=>{});return {pool,db:drizzle(pool,{schema})}; }
export type Database=ReturnType<typeof connect>['db'];
export type Transaction=Parameters<Parameters<Database['transaction']>[0]>[0];
