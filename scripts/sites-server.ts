// ADR-0032 · starts ONE site server for a local DEMO profile, in its own process: the public server
// (`--public`, http://<slug>.localhost:3100) or the authenticated preview (`--preview`, http://127.0.0.2:3200).
// `--isolated` uses the isolated profile (3101/3201). Development only: never a real domain, DNS or deployment.
// `--domain-checks` (public server only) also runs the DOM-004 re-verification worker every 10 minutes: it only reads
// public TXT records of the custom domains a brand verified; it never changes DNS. Off by default in development.
import { readFile, stat } from 'node:fs/promises';
import { applySiteEnvironment, competitionProfile, localCompetitionUrl } from './competition-environment.js';
import { connect } from '../src/persistence/database.js';
import { Engine } from '../src/application/engine.js';
import { createPublicSiteServer } from '../src/transport/sites-public.js';
import { createPreviewServer } from '../src/transport/sites-preview.js';
import { resolveDocumentStoragePath, resolveTxtRecords } from '../src/transport/http.js';

if (process.env.NODE_ENV === 'production') throw new Error('Los servidores de sitios de desarrollo no se ejecutan en producción.');
const profile = competitionProfile(process.argv.includes('--isolated'));
applySiteEnvironment(profile);
const url = localCompetitionUrl(profile);
if (!url) throw new Error('Inicia primero la DEMO (pnpm competition:start).');
const { db, pool } = connect(url), engine = new Engine(db);
const load = async (storageKey: string, max: number) => { try { const p = resolveDocumentStoragePath(storageKey), s = await stat(p); return s.isFile() && s.size <= max ? await readFile(p) : null; } catch { return null; } };
const preview = process.argv.includes('--preview');
const server = preview ? createPreviewServer(engine, load) : createPublicSiteServer(engine);
const [host, port] = preview ? ['127.0.0.2', profile.previewPort] : ['127.0.0.1', profile.sitesPort];
server.listen(port, host, () => console.log(preview ? `Vista previa de sitios: http://127.0.0.2:${port}` : `Sitios publicados (desarrollo): http://<dirección>.localhost:${port}`));
const worker = !preview && process.argv.includes('--domain-checks') ? setInterval(() => { engine.reverifyDomains(resolveTxtRecords).then(done => { if (done.length) console.log(`Dominios comprobados: ${done.length}`); }).catch(() => console.error('La comprobación periódica de dominios falló; se reintentará.')); }, 10 * 60_000) : null;
const stop = () => { if (worker) clearInterval(worker); server.close(() => void pool.end().then(() => process.exit(0))); };
process.on('SIGINT', stop); process.on('SIGTERM', stop);
