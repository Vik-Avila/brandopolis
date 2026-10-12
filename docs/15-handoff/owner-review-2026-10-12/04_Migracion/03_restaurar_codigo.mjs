import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

function git(args) {
  const r = spawnSync('git', args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (r.error) throw r.error;
  if (r.status !== 0) throw new Error(`Git falló: ${args[0]}\n${r.stderr}`);
  return r.stdout.trim();
}
try {
  const [sourceArg, targetArg, ...extra] = process.argv.slice(2);
  if (!sourceArg || !targetArg || extra.length) throw new Error('Uso: node 03_restaurar_codigo.mjs CARPETA_DEL_BUNDLE DESTINO_NUEVO');
  const source = fs.realpathSync(sourceArg);
  const target = path.resolve(targetArg);
  if (fs.existsSync(target)) throw new Error('El destino ya existe. No se sobrescribirá; elige una carpeta nueva.');
  const info = JSON.parse(fs.readFileSync(path.join(source, 'TRASPASO_CODIGO.json'), 'utf8'));
  if (info.format !== 1 || info.bundle !== 'brandopolis.bundle' || !/^[a-f0-9]{40,64}$/.test(info.head) || !/^[a-f0-9]{64}$/.test(info.sha256) || typeof info.branch !== 'string') throw new Error('Manifiesto inválido.');
  git(['check-ref-format', '--branch', info.branch]);
  if (info.branch.startsWith('-')) throw new Error('Rama inválida.');
  const bundle = path.join(source, info.bundle);
  const actual = crypto.createHash('sha256').update(fs.readFileSync(bundle)).digest('hex');
  if (actual !== info.sha256) throw new Error('El hash del bundle no coincide. No se restauró nada.');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  git(['clone', '--branch', info.branch, '--', bundle, target]);
  const head = git(['-C', target, 'rev-parse', 'HEAD']);
  if (head !== info.head) throw new Error('El HEAD restaurado no coincide. Conservar la copia original e investigar.');
  if (git(['-C', target, 'status', '--porcelain=v1', '--untracked-files=all'])) throw new Error('La copia restaurada no está limpia. Revisar antes de continuar.');
  git(['-C', target, 'bundle', 'verify', bundle]);
  console.log(`Restauración verificada.\nRama: ${info.branch}\nHEAD: ${head}\nDestino: ${target}\nOrigin apunta al bundle local; no se hizo push.`);
} catch (e) { console.error(`No se completó la restauración: ${e.message}`); process.exitCode = 1; }
