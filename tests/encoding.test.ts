import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const suspicious = /\u00c3|\u00c2|\u00e2\u20ac|\u00ef\u00bf\u00bd|\ufffd/;
function files(root:string):string[] { return readdirSync(root, { withFileTypes:true }).flatMap(entry => entry.isDirectory() ? files(join(root,entry.name)) : [join(root,entry.name)]); }

describe('UTF-8 product text', () => {
  it('the DEMO repair leaves correct and custom questions untouched', () => {
    expect(() => execFileSync(process.execPath, ['--test', 'tests/demo-encoding.node.mjs'], { stdio:'pipe' })).not.toThrow();
  });
  it('runtime, method config and demo sources are valid UTF-8 without common mojibake', () => {
    const paths = [...files('src'), ...files('config'), ...files('prompts'), 'scripts/seed.ts', 'scripts/competition-demo.ts'];
    const decoder = new TextDecoder('utf-8', { fatal:true });
    for (const path of paths.filter(p => /\.(ts|js|html|css|json|md)$/.test(p))) {
      const text = decoder.decode(readFileSync(path));
      expect(suspicious.test(text), path).toBe(false);
    }
  });
  it('Spanish punctuation and accents survive JSON and UTF-8 bytes exactly', () => {
    const text = '¿Cómo? ¡Qué decisión! á é í ó ú ü ñ Á É Í Ó Ú Ü Ñ';
    expect(JSON.parse(new TextDecoder('utf-8', { fatal:true }).decode(Buffer.from(JSON.stringify(text), 'utf8')))).toBe(text);
    expect(readFileSync('src/transport/http.ts', 'utf8')).toContain('application/json; charset=utf-8');
    expect(readFileSync('src/transport/assets.ts', 'utf8')).toContain('text/html; charset=utf-8');
    expect(readFileSync('scripts/local-db.ts', 'utf8')).toContain('--encoding=UTF8');
  });
});
