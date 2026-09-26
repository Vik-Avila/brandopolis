import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import pg from 'pg';

// Only reverse the exact, known UTF-8-as-Latin-1 fixture corruption. Never guess at user text.
export function fixtureRepair(module, text, modules) {
  const canonical = modules.find(m => m.primaryDecision === module)?.primaryQuestion;
  return canonical && text !== canonical && Buffer.from(canonical, 'utf8').toString('latin1') === text ? canonical : null;
}

export async function inspectDemoEncoding(apply = false, isolated = false) {
  if (process.env.NODE_ENV === 'production' || process.env.DATABASE_URL?.trim()) throw new Error('Local DEMO only; external DATABASE_URL and production are refused.');
  const root = resolve('.local', isolated ? 'rc1-smoke' : '');
  const settings = JSON.parse(readFileSync(resolve(root, 'postgres/connection.json'), 'utf8'));
  if (settings.port !== (isolated ? 55434 : 55432)) throw new Error('Unexpected local DEMO port.');
  const pool = new pg.Pool({ host: '127.0.0.1', port: settings.port, user: 'postgres', password: settings.password, database: 'postgres', connectionTimeoutMillis: 3000 });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const pilot = await client.query('select 1 from pilot_workspaces limit 1');
    if (pilot.rowCount) throw new Error('PILOT data detected; refused.');
    const encodings = await client.query("select current_setting('server_encoding') as server, current_setting('client_encoding') as client");
    if (encodings.rows[0].server !== 'UTF8' || encodings.rows[0].client !== 'UTF8') throw new Error('Expected UTF8 server and client.');
    const { modules } = JSON.parse(readFileSync('config/strategic-method/modules.v1.json', 'utf8'));
    const result = await client.query(`select q.id,q."workspaceId",q."brandId",q.module,q.text from questions q join brands b on b.id=q."brandId" and b."workspaceId"=q."workspaceId" join workspaces w on w.id=b."workspaceId" where b."dataClass"='DEMO' and w.name='Workspace DEMO' for update of q`);
    const repairs = result.rows.flatMap(row => { const text = fixtureRepair(row.module, row.text, modules); return text ? [{ ...row, repairedText: text }] : []; });
    let backup;
    if (apply && repairs.length) {
      backup = resolve(root, `encoding-backup-${Date.now()}.json`);
      writeFileSync(backup, JSON.stringify(repairs, null, 2), { encoding: 'utf8', mode: 0o600, flag: 'wx' });
      for (const row of repairs) await client.query('update questions set text=$1 where id=$2 and "workspaceId"=$3 and "brandId"=$4 and text=$5', [row.repairedText, row.id, row.workspaceId, row.brandId, row.text]);
    }
    await client.query(apply ? 'COMMIT' : 'ROLLBACK');
    return { mode: apply ? 'apply' : 'inspect', encodings: encodings.rows[0], inspected: result.rowCount, repairs: repairs.length, backup: backup ?? null };
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); await pool.end(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  console.log(JSON.stringify(await inspectDemoEncoding(process.argv.includes('--apply'), process.argv.includes('--isolated')), null, 2));
}
