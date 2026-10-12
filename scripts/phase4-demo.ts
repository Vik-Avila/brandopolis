// Phase 4 · local DEMO for the owner's acceptance (isolated profile only). Starts, in order and as child processes:
// the isolated app (3001, PostgreSQL 55434), the public site server (3101), the authenticated preview (127.0.0.2:3201)
// and the supervised worker with the provider simulators. Ctrl+C stops all of them. Development only: no real provider,
// no spend, no DNS, no deployment.
import { spawn, type ChildProcess } from 'node:child_process';
import { connect as netConnect } from 'node:net';
import { resolve } from 'node:path';
import { competitionProfile } from './competition-environment.js';

if (process.env.NODE_ENV === 'production') throw new Error('La DEMO de la Fase 4 sólo se ejecuta en local.');
const profile = competitionProfile(true), children: ChildProcess[] = [];
const run = (label: string, script: string, args: string[]) => {
  const child = spawn(process.execPath, [...process.execArgv, resolve('scripts', script), ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
  const prefix = (chunk: Buffer) => chunk.toString().split('\n').filter(Boolean).forEach(line => console.log(`[${label}] ${line}`));
  child.stdout?.on('data', prefix); child.stderr?.on('data', prefix);
  children.push(child);
  return child;
};
const listening = (port: number, host = '127.0.0.1') => new Promise<boolean>(done => { const s = netConnect(port, host); s.once('connect', () => { s.end(); done(true); }); s.once('error', () => done(false)); });
const waitFor = async (port: number, host?: string) => { for (let i = 0; i < 120; i++) { if (await listening(port, host)) return; await new Promise(r => setTimeout(r, 1000)); } throw new Error(`El puerto ${port} no respondió.`); };

for (const [port, host] of [[profile.port, '127.0.0.1'], [profile.sitesPort, '127.0.0.1'], [profile.previewPort, '127.0.0.2']] as const)
  if (await listening(port, host)) throw new Error(`El puerto ${port} ya está en uso. Detén la instancia anterior antes de iniciar la DEMO.`);
let stopping = false;
const stop = () => { if (stopping) return; stopping = true; console.log('Deteniendo la DEMO…'); for (const c of children.reverse()) c.kill('SIGINT'); setTimeout(() => process.exit(0), 4000); };
process.on('SIGINT', stop); process.on('SIGTERM', stop);
run('app', 'competition-start.ts', ['--isolated']);
await waitFor(profile.port);
run('sitio', 'sites-server.ts', ['--public', '--isolated']);
run('vista previa', 'sites-server.ts', ['--preview', '--isolated']);
run('worker', 'external-worker.ts', ['--isolated']);
await waitFor(profile.sitesPort); await waitFor(profile.previewPort, '127.0.0.2');
console.log([
  '',
  'DEMO de la Fase 4 lista (local, aislada).',
  `  Aplicación:      http://127.0.0.1:${profile.port}  (token de sesión: campo token de ${profile.sessionFile})`,
  `  Sitio público:   http://<dirección>.localhost:${profile.sitesPort}`,
  `  Vista previa:    http://127.0.0.2:${profile.previewPort}`,
  '  Proveedores:     simuladores de Google Ads, Meta Ads y Canva (nada real, sin gasto).',
  'Pulsa Ctrl+C para detener todos los procesos.',
].join('\n'));
