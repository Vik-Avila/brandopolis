import fs from 'node:fs';
import path from 'node:path';

const [outputArg, ...givenRoots] = process.argv.slice(2);
const roots = givenRoots.length ? givenRoots : [
  'C:\\Proyectos\\brandopolis',
  'C:\\Proyectos\\brandopolis-brando-b1',
  'C:\\Proyectos\\brandopolis-brando-sections'
];
const output = outputArg || 'C:\\Proyectos\\Brandopolis_respaldo_20261012_132719\\ENLACES_EXCLUIDOS.json';
const links = [], errors = [];
let directories = 0;
for (const root of roots) {
  const stack = [path.resolve(root)];
  while (stack.length) {
    const dir = stack.pop();
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      directories++;
      for (const entry of entries) {
        if (entry.name.toLowerCase() === 'node_modules') continue;
        const full = path.join(dir, entry.name);
        if (entry.isSymbolicLink()) {
          try { links.push({ path: full, target: fs.readlinkSync(full) }); }
          catch (e) { errors.push({ path: full, code: e.code }); }
        } else if (entry.isDirectory()) stack.push(full);
      }
    } catch (e) { errors.push({ path: dir, code: e.code }); }
  }
}
const result = { date: new Date().toISOString(), roots, exclusions: ['node_modules'], directories, links, errors, complete: errors.length === 0, scope: 'Enlaces de archivos/carpetas dentro de los worktrees; no detecta todas las rutas externas configuradas en la aplicación.' };
try {
  fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
} catch (e) {
  console.error(`No se pudo guardar el inventario: ${e.message}`);
  process.exit(1);
}
console.log(`Directorios revisados: ${directories}`);
console.log(`ENLACES FUERA DE node_modules: ${links.length}`);
console.log(`ERRORES DE LECTURA: ${errors.length}`);
for (const link of links) console.log(`${link.path} -> ${link.target}`);
for (const error of errors) console.log(`No revisado: ${error.path} (${error.code})`);
console.log(`Inventario guardado en: ${output}`);
if (errors.length) process.exitCode = 1;
