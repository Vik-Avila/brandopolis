import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
try {
  const m = JSON.parse(fs.readFileSync(path.join(root, 'MANIFIESTO_SHA256.json'), 'utf8'));
  for (const entry of m.files) {
    const p = path.resolve(root, entry.path);
    const rel = path.relative(root, p);
    if (rel.startsWith(`..${path.sep}`) || rel === '..' || path.isAbsolute(rel)) throw new Error('Ruta inválida en el manifiesto.');
    const data = fs.readFileSync(p);
    const actual = crypto.createHash('sha256').update(data).digest('hex');
    if (actual !== entry.sha256 || data.length !== entry.bytes) throw new Error(`No coincide: ${entry.path}`);
  }
  console.log(`Integridad verificada: ${m.files.length} archivos coinciden.`);
} catch (e) { console.error(`Verificación fallida: ${e.message}`); process.exitCode = 1; }
