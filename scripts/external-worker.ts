// Block 8 · ADR-0031 worker for the local DEMO profile, with the deterministic simulator (never a real provider).
// `pnpm external:worker [--isolated]` starts a SUPERVISOR that spawns the worker as a child process on this host and
// records its real exit (the only process evidence the C1 retry gate accepts). The child registers itself with its own
// PID, then claims jobs with leases and runs them step by step. Development only: no spend, no real account.
import { spawn } from 'node:child_process';
import { hostname } from 'node:os';
import { fileURLToPath } from 'node:url';
import { applySiteEnvironment, competitionProfile, localCompetitionUrl } from './competition-environment.js';
import { connect } from '../src/persistence/database.js';
import { createDemoEmail, createDemoExternal } from '../src/transport/external-demo.js';
import { drainEmails } from '../src/application/email-outbox.js';
import { superviseWorker } from '../src/application/worker-supervisor.js';

if (process.env.NODE_ENV === 'production') throw new Error('El worker simulado sólo se ejecuta en la DEMO local.');
const isolated = process.argv.includes('--isolated'), profile = competitionProfile(isolated);
applySiteEnvironment(profile);
const url = localCompetitionUrl(profile);
if (!url) throw new Error('Inicia primero la DEMO (pnpm competition:start).');
const { db, pool } = connect(url), external = createDemoExternal(db), email = createDemoEmail(external.vault);

if (process.argv.includes('--child')) {
  const instanceId = await external.ops.registerWorker(hostname(), process.pid);
  process.stdout.write(`WORKER ${instanceId}\n`);
  let stopping = false;
  const loop = async () => {
    while (!stopping) {
      try {
        const claim = await external.ops.claimNext(instanceId);
        if (claim) { const end = await external.ops.runJob(instanceId, claim); console.log(`Trabajo ${claim.jobId.slice(0, 8)}: ${end}`); continue; }
      } catch { console.error('El worker simulado no pudo procesar un trabajo; lo reintentará.'); }
      // PHASE4_SPEC §13 · queued emails (simulated provider): atomic claims, so the web server may also send them.
      try { const sent = await drainEmails(db, email, 5); if (sent.length) console.log(`Correo simulado: ${sent.join(', ')}`); }
      catch { console.error('El worker no pudo procesar el correo; lo reintentará.'); }
      await new Promise(r => setTimeout(r, 1000));
    }
    await pool.end();
  };
  const stop = () => { stopping = true; };
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
  await loop();
} else {
  const child = spawn(process.execPath, [...process.execArgv, fileURLToPath(import.meta.url), '--child', ...(isolated ? ['--isolated'] : [])], { stdio: ['ignore', 'pipe', 'inherit'] });
  let supervised = false;
  child.stdout.setEncoding('utf8').on('data', (chunk: string) => {
    for (const line of chunk.split('\n').filter(Boolean)) {
      const m = /^WORKER ([0-9a-f-]{36})$/.exec(line);
      if (m && !supervised) { supervised = true; console.log(`Worker de operaciones externas (simulador): instancia ${m[1].slice(0, 8)}, PID ${child.pid}`); void superviseWorker(child, m[1], external.ops).then(({ code }) => { console.log(`El worker terminó (código ${code}); salida registrada.`); void pool.end().then(() => process.exit(0)); }); }
      else console.log(line);
    }
  });
  const stop = () => child.kill('SIGTERM');
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
}
