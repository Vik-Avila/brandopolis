import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

function git(cwd, args, optional = false) {
  const r = spawnSync('git', ['-C', cwd, ...args], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (r.error) throw r.error;
  if (r.status !== 0 && !(optional && r.status === 1)) throw new Error(`Git falló: ${args[0]}\n${r.stderr}`);
  return r.stdout.trim();
}
try {
  const [repoArg, targetArg, ...extra] = process.argv.slice(2);
  if (!repoArg || !targetArg || extra.length) throw new Error('Uso: node 02_exportar_codigo.mjs RUTA_REPOSITORIO CARPETA_NUEVA_DE_SALIDA');
  const repo = fs.realpathSync(repoArg);
  const target = path.resolve(targetArg);
  if (fs.existsSync(target)) throw new Error('La carpeta de salida ya existe; elige una nueva.');
  const top = fs.realpathSync(git(repo, ['rev-parse', '--show-toplevel']));
  const normalize = p => process.platform === 'win32' ? p.toLowerCase() : p;
  if (normalize(repo) !== normalize(top)) throw new Error('Indica la raíz del repositorio.');
  // Resolver el ancestro existente evita destinos dentro del repo a través de enlaces.
  let ancestor = path.dirname(target);
  while (!fs.existsSync(ancestor)) ancestor = path.dirname(ancestor);
  const resolvedTarget = path.resolve(fs.realpathSync(ancestor), path.relative(ancestor, target));
  const rel = path.relative(normalize(repo), normalize(resolvedTarget));
  if (!rel || (!rel.startsWith(`..${path.sep}`) && rel !== '..' && !path.isAbsolute(rel))) throw new Error('La salida debe estar fuera del repositorio.');
  if (git(repo, ['status', '--porcelain=v1', '--untracked-files=all'])) throw new Error('Hay cambios o archivos sin seguimiento. Presérvalos antes; no se hará commit ni se descartará nada.');
  if (git(repo, ['rev-parse', '--is-shallow-repository']) !== 'false') throw new Error('Repositorio shallow: requiere preparación específica.');
  if (git(repo, ['config', '--get', 'extensions.partialClone'], true)) throw new Error('Repositorio partial: requiere preparación específica.');
  if (git(repo, ['config', '--get-regexp', '^remote\\..*\\.promisor$'], true)) throw new Error('Repositorio con objetos remotos parciales: preparar copia completa.');
  if (git(repo, ['ls-files', '--', '.gitmodules'])) throw new Error('Hay submódulos: preparar también sus repositorios antes del traspaso.');
  const attrs = git(repo, ['ls-files', '-z', '--', '.gitattributes', '**/.gitattributes']).split('\0').filter(Boolean);
  for (const f of attrs) if (/filter\s*=\s*lfs/.test(fs.readFileSync(path.join(repo, f), 'utf8'))) throw new Error('Hay Git LFS: necesita exportación de sus objetos además del bundle.');
  const branch = git(repo, ['symbolic-ref', '--short', 'HEAD']);
  const head = git(repo, ['rev-parse', 'HEAD']);
  fs.mkdirSync(target, { recursive: true });
  const bundle = path.join(target, 'brandopolis.bundle');
  git(repo, ['bundle', 'create', bundle, '--all']);
  git(repo, ['bundle', 'verify', bundle]);
  if (git(repo, ['rev-parse', 'HEAD']) !== head || git(repo, ['status', '--porcelain=v1', '--untracked-files=all'])) throw new Error('El repositorio cambió durante la exportación. No usar esta carpeta; repetir en un destino nuevo.');
  const sha256 = crypto.createHash('sha256').update(fs.readFileSync(bundle)).digest('hex');
  fs.writeFileSync(path.join(target, 'TRASPASO_CODIGO.json'), JSON.stringify({ format: 1, createdAt: new Date().toISOString(), branch, head, clean: true, bundle: 'brandopolis.bundle', sha256, scope: 'Referencias e historial Git; excluye archivos no versionados, bases y credenciales locales.' }, null, 2) + '\n');
  console.log(`Exportación verificada.\nRama: ${branch}\nHEAD: ${head}\nCarpeta: ${target}`);
} catch (e) { console.error(`No se completó la exportación: ${e.message}`); process.exitCode = 1; }
