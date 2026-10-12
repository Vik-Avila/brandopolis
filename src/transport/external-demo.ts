/**
 * Block 8 · external operations in the local DEMO only: the existing ADR-0031 queue with the deterministic simulator.
 * Simulator state lives in a local file so the separate worker process and the web server see the same simulated
 * provider. Simulated credentials are sealed with a local random key (or BRANDOPOLIS_CREDENTIALS_KEY when set); they
 * are not provider secrets. Nothing here can reach Google, Meta or Canva.
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { randomBytes, randomUUID } from 'node:crypto';
import { join, resolve } from 'node:path';
import type { Database } from '../persistence/database.js';
import { ExternalOperations } from '../application/external-operations.js';
import { SimulatedProvider, type SimulatorSnapshot, type SimulatorStore } from '../application/provider-adapter.js';
import { createVault, vaultFromEnv } from '../application/credential-vault.js';
import { SimulatedCanva } from '../application/canva-adapter.js';

export function externalRoot() { return resolve(process.env.BRANDOPOLIS_EXTERNAL_ROOT?.trim() || '.local/external'); }

function fileStore(path: string): SimulatorStore {
  return {
    load() { try { return JSON.parse(readFileSync(path, 'utf8')) as SimulatorSnapshot; } catch { return null; } },
    save(snapshot) { const tmp = `${path}.${randomUUID()}.tmp`; writeFileSync(tmp, JSON.stringify(snapshot)); renameSync(tmp, path); },
  };
}

/** Local vault for simulated credentials: a random key created once per DEMO profile, readable only locally. */
function localVault(root: string) {
  const file = join(root, 'credentials.key');
  if (!existsSync(file)) writeFileSync(file, randomBytes(32).toString('base64'), { mode: 0o600, flag: 'wx' });
  return createVault(Buffer.from(readFileSync(file, 'utf8').trim(), 'base64'), 'demo-local');
}

export function createDemoExternal(db: Database) {
  if (process.env.NODE_ENV === 'production') throw new Error('Las operaciones externas simuladas sólo existen en la DEMO local.');
  const root = externalRoot();
  mkdirSync(root, { recursive: true });
  const vault = vaultFromEnv() ?? localVault(root);
  const adapter = new SimulatedProvider(() => new Date(), fileStore(join(root, 'simulator.json')));
  return { ops: new ExternalOperations(db, vault, adapter), adapter, canva: new SimulatedCanva(), vault, simulated: true as const };
}
export type DemoExternal = ReturnType<typeof createDemoExternal>;
