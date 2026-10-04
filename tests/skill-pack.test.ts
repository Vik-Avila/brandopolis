// Engineering Skill Pack guard. Skills are procedures, routing and gates: they must point at canonical sources,
// never become a second Product Bible, and the Claude Code copy must stay byte-identical to the source. The
// mirror tooling is exercised on throwaway folders, never on the repository's own skills.
import { describe, it, expect, afterEach } from 'vitest';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { compareSkillCopies, layoutProblems, listFiles, ROOT, rootProblems, runCli, SKILLS_COPY, SKILLS_SOURCE, syncSkillCopies } from '../scripts/skill-pack.js';

const EXPECTED = ['brandopolis-brando', 'brandopolis-feature', 'brandopolis-review', 'brandopolis-security', 'brandopolis-ui'];
const MAX_LINES = 100;
const JUSTIFICATION = /<!--\s*line-limit-justification:\s*\S.*-->/;

// Unicode-aware upper-case term (ATENCIÓN stays whole), not glued to other word characters.
const UPPER_TERM = /(?<![\p{L}\p{N}_])\p{Lu}[\p{Lu}\p{N}]*(?:_[\p{Lu}\p{N}]+)*(?![\p{L}\p{N}_])/gu;
const isTerm = (t: string) => (t.match(/\p{Lu}/gu) ?? []).length >= 2;
// CLAUDE.md: «Vigente»/Current is display-only, never a status. Spanish «vigente» in any case and English
// Current/CURRENT are flagged unless the same sentence explicitly calls them display or presentation vocabulary.
// Lower-case English «current» is ordinary prose and is not inspected.
const PRESENTATION_WORD = /(?<![\p{L}\p{N}_])(?:[Vv]igentes?|VIGENTES?|Current|CURRENT)(?![\p{L}\p{N}_])/u;
const DISPLAY_ONLY = /display relation|display[- ]only|presentation (?:word|vocabulary|relation)|never a (?:status|state)|not a (?:status|state)|nunca (?:un )?estado|sólo de presentación/i;
// Acronyms and protocol names: identifiers, never lifecycle states. Never add a state here.
const ACRONYMS = new Set(['AI', 'IA', 'UI', 'UX', 'API', 'CSS', 'DNS', 'SMTP', 'HEAD', 'PATH', 'MX', 'ADR', 'INV', 'ENG',
  'OIDC', 'CSP', 'HTTP', 'SDK', 'RAG', 'DB', 'SQL', 'SHA', 'LF', 'ID', 'URL', 'RC']);
// Lower-case nouns that name an object when they follow a state word ("a HARD dependency").
const OBJECT_NOUNS: Record<string, RegExp> = {
  Dependency: /^\s+dependenc(?:y|ies)\b/i, Decision: /^\s+decisions?\b/i, DecisionVersion: /^\s+versions?\b/i,
  ReviewItem: /^\s+review(?: items?)?\b/i, Hypothesis: /^\s+hypothes[ie]s\b/i, Experiment: /^\s+experiments?\b/i,
  Recommendation: /^\s+recommendations?\b/i, Learning: /^\s+learnings?\b/i, AccessStatus: /^\s+(?:access|participants?|accounts?)\b/i,
};

const skillDirs = () => readdirSync(join(ROOT, SKILLS_SOURCE), { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name).sort();
const skillFile = (name: string) => join(ROOT, SKILLS_SOURCE, name, 'SKILL.md');
const read = (name: string) => readFileSync(skillFile(name), 'utf8').replace(/\r\n/g, '\n');
const terms = (text: string) => (text.match(UPPER_TERM) ?? []).filter(isTerm);
const pascal = (stem: string) => stem.split('-').map(s => s[0].toUpperCase() + s.slice(1)).join('');

function frontmatter(text: string): Record<string, string> {
  const match = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) throw new Error('SKILL.md must start with a --- frontmatter block');
  const fields: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const kv = line.match(/^([a-z][a-z-]*): (.+)$/);
    if (!kv) throw new Error(`Frontmatter line is not a single-line "key: value": ${line}`);
    if (kv[1] in fields) throw new Error(`Duplicate frontmatter key ${kv[1]}`);
    fields[kv[1]] = kv[2];
  }
  return fields;
}

function enumValues(node: unknown, out: Set<string>) {
  if (Array.isArray(node)) node.forEach(n => enumValues(n, out));
  else if (node && typeof node === 'object') for (const [key, value] of Object.entries(node)) {
    if (key === 'enum' && Array.isArray(value)) value.forEach(v => typeof v === 'string' && out.add(v));
    else enumValues(value, out);
  }
}

function markdownBasenames(dir: string, out: Set<string>) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (['.git', 'node_modules', '.local', '.venv', 'worktrees', 'test-results'].includes(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) markdownBasenames(full, out);
    // Dated handoff files are cited without their date suffix (CURRENT_IMPLEMENTATION_STATE_2026-09-28).
    else if (entry.name.endsWith('.md')) terms(basename(entry.name, '.md').replace(/_\d{4}-\d{2}-\d{2}$/, '')).forEach(t => out.add(t));
  }
}

/**
 * Canonical states keyed by token → objects that own them (schemas, the approved-states table, access status),
 * plus identifiers: acronyms, configuration names from .env.example, and document names, which only count when
 * quoted as link text or code so that a file name can never pass for a state.
 */
const vocabulary = (() => {
  const states = new Map<string, Set<string>>();
  const add = (token: string, object: string) => { if (!states.has(token)) states.set(token, new Set()); states.get(token)!.add(object); };
  for (const file of readdirSync(join(ROOT, 'schemas')).filter(f => f.endsWith('.schema.json'))) {
    const values = new Set<string>();
    enumValues(JSON.parse(readFileSync(join(ROOT, 'schemas', file), 'utf8')), values);
    values.forEach(v => add(v, pascal(file.replace('.schema.json', ''))));
  }
  // Only the table of approved states counts; the prose below it mentions technical names such as CURRENT.
  for (const row of readFileSync(join(ROOT, 'docs/04-domain-model/state-machines.md'), 'utf8').split(/\r?\n/)) {
    const cols = row.split('|').map(c => c.trim());
    if (cols.length < 4 || !/^[A-Z][A-Za-z]+$/.test(cols[1])) continue;
    terms(cols[2]).forEach(t => add(t, cols[1]));
  }
  const access = readFileSync(join(ROOT, 'src/application/pilot-access.ts'), 'utf8').match(/ACCESS_STATUS=Object\.freeze\(\{([^}]*)\}/)?.[1] ?? '';
  for (const value of access.match(/'([A-Z_]+)'/g) ?? []) add(value.slice(1, -1), 'AccessStatus');
  const config = new Set<string>(ACRONYMS);
  terms(readFileSync(join(ROOT, '.env.example'), 'utf8')).filter(t => t.includes('_')).forEach(t => config.add(t));
  const documents = new Set<string>();
  markdownBasenames(ROOT, documents);
  return { states, config, documents };
})();

const OBJECT_ALIASES: Record<string, RegExp> = { AccessStatus: /\baccess status\b/i };
function objectsIn(sentence: string): string[] {
  const objects = new Set<string>();
  for (const owners of vocabulary.states.values()) owners.forEach(o => objects.add(o));
  return [...objects].filter(o => (OBJECT_ALIASES[o] ?? new RegExp(`\\b${o}\\b`)).test(sentence));
}

/** Problems with state vocabulary in a skill text; empty means every state word is canonical in its context. */
function stateProblems(markdown: string): string[] {
  const problems: string[] = [];
  const text = markdown.replace(/\]\([^)]*\)/g, ']');
  for (const sentence of text.split(/(?<=[.;!?])\s+|\n/)) {
    if (PRESENTATION_WORD.test(sentence) && !DISPLAY_ONLY.test(sentence)) problems.push(`presentation word used as a state: ${sentence.trim()}`);
    const quoted = new Set([...sentence.matchAll(/\[([^\]]*)\]|`([^`]*)`/g)].flatMap(m => terms(m[1] ?? m[2] ?? '')));
    const objects = objectsIn(sentence);
    for (const match of sentence.matchAll(UPPER_TERM)) {
      const term = match[0];
      if (!isTerm(term) || /^(?:VIGENTES?|CURRENT)$/.test(term)) continue;
      const fileName = sentence.startsWith('.md', match.index! + term.length);
      if (vocabulary.config.has(term) || ((quoted.has(term) || fileName) && vocabulary.documents.has(term))) continue;
      if (!vocabulary.states.has(term)) { problems.push(`${term} is not a canonical state or identifier`); continue; }
      // A state word directly qualifying an object noun ("a HARD dependency") is checked against that object.
      const after = sentence.slice(match.index! + term.length);
      const qualified = Object.entries(OBJECT_NOUNS).filter(([, noun]) => noun.test(after)).map(([object]) => object);
      const context = qualified.length ? qualified : objects;
      if (context.length && !context.some(o => vocabulary.states.get(term)!.has(o))) problems.push(`${term} is not a state of ${context.join('/')}`);
    }
  }
  return problems;
}

// GitHub heading anchors: lower case, punctuation removed (hyphens and underscores kept), spaces to hyphens.
const slug = (heading: string) => heading.trim().toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, '').replace(/\s/g, '-');
const headingsOf = (file: string) => readFileSync(file, 'utf8').split(/\r?\n/).filter(l => /^#{1,6} /.test(l)).map(l => slug(l.replace(/^#+ /, '')));

const SECTIONS: [string, RegExp][] = [
  ['canonical sources', /^(Read first|\d+\. Find the canonical source)$/],
  ['procedure or gates', /^(Procedure|Gates|Stage gate|\d+\. (Freeze and scope gate|Route|Implement).*)$/],
  ['escalation', /^Escalate to a human$/],
  ['prohibitions', /^Never$/],
  ['checks', /^(Checks|Single check matrix)$/],
];

describe('Engineering Skill Pack · content', () => {
  it('ships exactly the approved five skills, with no database, release or router skill', () => {
    expect(skillDirs()).toEqual(EXPECTED);
  });

  it('keeps .claude/skills byte-identical to the canonical .agents/skills, both real directories', () => {
    expect(layoutProblems()).toEqual([]);
    expect(compareSkillCopies(), 'run pnpm skills:check, then pnpm skills:sync').toEqual([]);
  });

  it.each(EXPECTED)('%s has valid minimal frontmatter whose name matches its directory', name => {
    const fields = frontmatter(read(name));
    expect(Object.keys(fields).sort()).toEqual(['description', 'name']);
    expect(fields.name).toBe(name);
    expect(fields.name).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    // Double-quoted single line without inner quotes or escapes: valid YAML for every agent's parser.
    expect(fields.description).toMatch(/^"[^"\\]+"$/);
    expect(fields.description.length).toBeGreaterThan(100);
    expect(fields.description.length).toBeLessThanOrEqual(1024);
  });

  it.each(EXPECTED)(`%s stays within ${MAX_LINES} lines unless explicitly justified`, name => {
    const text = read(name);
    if (!JUSTIFICATION.test(text)) expect(text.trimEnd().split('\n').length).toBeLessThanOrEqual(MAX_LINES);
  });

  it.each(EXPECTED)('%s has each required section under its own heading', name => {
    const headings = read(name).split('\n').filter(l => l.startsWith('## ')).map(l => l.slice(3).trim());
    const used = new Set<number>();
    for (const [label, pattern] of SECTIONS) {
      const index = headings.findIndex((h, i) => !used.has(i) && pattern.test(h));
      expect(index, `${name} misses a heading for ${label}`).toBeGreaterThanOrEqual(0);
      used.add(index);
    }
  });

  it.each(EXPECTED)('%s applies the freeze by linking its single definition', name => {
    expect(read(name)).toContain('](../../../CLAUDE.md#pilot-freeze)');
  });

  it.each(EXPECTED)('%s only references files, anchors and repo paths that exist', name => {
    const text = read(name), base = dirname(skillFile(name));
    const links = [...text.matchAll(/\]\(([^)\s]+)\)/g)].map(m => m[1]).filter(l => !/^(https?:|mailto:)/.test(l));
    expect(links.length, `${name} must link canonical sources`).toBeGreaterThan(0);
    for (const link of links) {
      const [file, anchor] = link.split('#');
      const target = file ? join(base, file) : skillFile(name);
      expect(existsSync(target), `${name}: broken link ${link}`).toBe(true);
      if (anchor) expect(headingsOf(target), `${name}: missing anchor ${link}`).toContain(anchor);
    }
    const paths = [...text.matchAll(/`((?:src|scripts|tests|docs|design|prompts|evals|config|schemas|public|telemetry|handoff)\/[^`\s*<>]+)`/g)].map(m => m[1]);
    for (const path of paths) expect(existsSync(join(ROOT, path.replace(/\/$/, ''))), `${name}: missing path ${path}`).toBe(true);
  });

  it.each(EXPECTED)('%s cites only existing invariant IDs and never copies their text', name => {
    const text = read(name), invariants = readFileSync(join(ROOT, 'docs/04-domain-model/invariants.md'), 'utf8');
    const known = new Set(invariants.match(/\b(?:INV|ENG)-\d{3}\b/g));
    for (const id of text.match(/\b(?:INV|ENG)-\d{3}\b/g) ?? []) expect(known.has(id), `${name}: unknown ${id}`).toBe(true);
    for (const row of invariants.split(/\r?\n/).filter(l => /^\| (INV|ENG)-\d{3} \|/.test(l))) {
      const statement = row.split('|')[2].trim();
      expect(text.includes(statement), `${name} copies the text of ${row.split('|')[1].trim()}`).toBe(false);
    }
  });

  it.each(EXPECTED)('%s uses only canonical states, in the right object context', name => {
    expect(stateProblems(read(name))).toEqual([]);
  });
});

describe('Engineering Skill Pack · state vocabulary guard', () => {
  it.each([
    ['Marca la Decision como vigente.', /presentation word/],
    ['Set the Decision to Vigente and display the badge.', /presentation word/],
    ['The Decision is CURRENT.', /presentation word/],
    ['Mark the Decision Current.', /presentation word/],
    ['The Decision goes RUNNING then CANCELLED.', /RUNNING is not a state of Decision/],
    ['A Hypothesis cannot be NEEDS_REVIEW.', /NEEDS_REVIEW is not a state of Hypothesis/],
    ['A HARD decision is approved.', /HARD is not a state of Decision/],
    ['Escalate when ATENCIÓN shows.', /ATENCIÓN is not a canonical/],
    ['Mark it ARCHIVED_FOREVER.', /ARCHIVED_FOREVER is not a canonical/],
    ['The Decision moves to CHANGELOG.', /CHANGELOG is not a canonical/],
  ])('rejects %s', (text, problem) => {
    expect(stateProblems(text).join('\n')).toMatch(problem);
  });

  it.each([
    'A HARD dependency moves the Decision to NEEDS_REVIEW.',
    'A Decision in NEEDS_REVIEW stays readable.',
    'Access status PENDING or SUSPENDED blocks sign-in.',
    'A Hypothesis moves to SUPPORTED.',
    '«Vigente» is a display relation over the active version, never a status.',
    '«Current» is presentation vocabulary, never a status.',
    'Read the current state in [CURRENT_IMPLEMENTATION_STATE] first.',
    'NEEDS_REVIEW, SUPERSEDED and HARD come from the canonical sources.',
    'See [PRODUCT_DESIGN_SYSTEM] and set `PILOT_AUTO_PROVISION` in the host.',
  ])('accepts %s', text => {
    expect(stateProblems(text)).toEqual([]);
  });

  it('resolves heading anchors like GitHub, keeping underscores', () => {
    expect(slug('Requisitos de PILOT_ORIGIN')).toBe('requisitos-de-pilot_origin');
    expect(slug('Pilot freeze')).toBe('pilot-freeze');
  });
});

describe('Engineering Skill Pack · mirror tooling', () => {
  const temps: string[] = [];
  afterEach(() => { for (const t of temps.splice(0)) rmSync(t, { recursive: true, force: true }); });
  const tempDir = (prefix = 'skill-pack-') => { const d = mkdtempSync(join(tmpdir(), prefix)); temps.push(d); return d; };

  function fixture(root = tempDir()): string {
    mkdirSync(join(root, SKILLS_SOURCE, 'demo', 'assets'), { recursive: true });
    writeFileSync(join(root, SKILLS_SOURCE, 'demo', 'SKILL.md'), '---\nname: demo\n---\n');
    writeFileSync(join(root, SKILLS_SOURCE, 'demo', 'assets', 'mark.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    return root;
  }
  const snapshot = (root: string) => {
    const out: Record<string, string> = {};
    const walk = (dir: string) => { for (const e of readdirSync(dir, { withFileTypes: true })) { const f = join(dir, e.name); if (e.isDirectory()) walk(f); else out[f] = readFileSync(f).toString('base64'); } };
    walk(root);
    return out;
  };
  const quiet = () => { const lines: string[] = []; return { lines, log: (l: string) => lines.push(l) }; };
  const copyFile = (root: string) => readFileSync(join(root, SKILLS_COPY, 'demo', 'SKILL.md'), 'utf8');

  it('syncs a byte-identical copy (binaries included)', () => {
    const root = fixture(), out = quiet();
    expect(runCli([], root, out.log, out.log)).toBe(0);
    expect(compareSkillCopies(root)).toEqual([]);
    expect(readdirSync(join(root, '.claude'))).toEqual(['skills']);
  });

  it('re-sync over an existing copy removes its backup and staging folders', () => {
    const root = fixture();
    syncSkillCopies(root);
    writeFileSync(join(root, SKILLS_SOURCE, 'demo', 'SKILL.md'), 'version 2');
    syncSkillCopies(root);
    expect(copyFile(root)).toBe('version 2');
    expect(readdirSync(join(root, '.claude'))).toEqual(['skills']);
  });

  it('reports and replaces drifted generated files that also exist in the source', () => {
    const root = fixture(), out = quiet();
    syncSkillCopies(root);
    writeFileSync(join(root, SKILLS_COPY, 'demo', 'SKILL.md'), 'edited by hand');
    expect(runCli([], root, out.log, out.log)).toBe(0);
    expect(out.lines.join('\n')).toMatch(/Replaced drifted[\s\S]*demo\/SKILL\.md/);
    expect(compareSkillCopies(root)).toEqual([]);
  });

  it('refuses to sync when a file exists only in the copy, and leaves everything in place', () => {
    const root = fixture(), out = quiet();
    syncSkillCopies(root);
    mkdirSync(join(root, SKILLS_COPY, 'new-skill'));
    writeFileSync(join(root, SKILLS_COPY, 'new-skill', 'SKILL.md'), 'unversioned work');
    const before = snapshot(root);
    expect(runCli([], root, out.log, out.log)).toBe(1);
    expect(out.lines.join('\n')).toMatch(/exist only in \.claude\/skills[\s\S]*new-skill\/SKILL\.md/);
    expect(snapshot(root)).toEqual(before);
  });

  it('restores the previous copy when the swap fails', () => {
    const root = fixture();
    syncSkillCopies(root);
    writeFileSync(join(root, SKILLS_SOURCE, 'demo', 'SKILL.md'), 'version 2');
    let renames = 0;
    const failingSwap = (from: string, to: string) => { renames++; if (renames === 2) throw new Error('EBUSY simulated'); renameSync(from, to); };
    expect(() => syncSkillCopies(root, { copyFile: copyFileSync, rename: failingSwap })).toThrow(/Swap failed; previous \.claude\/skills restored/);
    expect(renames).toBe(3);
    expect(copyFile(root)).toBe('---\nname: demo\n---\n');
    expect(readdirSync(join(root, '.claude'))).toEqual(['skills']);
  });

  it('never swaps in a staging copy that fails verification', () => {
    const root = fixture();
    syncSkillCopies(root);
    writeFileSync(join(root, SKILLS_SOURCE, 'demo', 'SKILL.md'), 'version 2');
    const corrupting = (from: string, to: string) => { copyFileSync(from, to); writeFileSync(to, 'corrupted'); };
    expect(() => syncSkillCopies(root, { copyFile: corrupting, rename: renameSync })).toThrow(/failed verification/);
    expect(copyFile(root)).toBe('---\nname: demo\n---\n');
    expect(readdirSync(join(root, '.claude'))).toEqual(['skills']);
  });

  it('check is read-only and fails on drift', () => {
    const root = fixture(), out = quiet();
    syncSkillCopies(root);
    writeFileSync(join(root, SKILLS_COPY, 'demo', 'SKILL.md'), 'drift');
    const before = snapshot(root);
    expect(runCli(['--check'], root, out.log, out.log)).toBe(1);
    expect(snapshot(root)).toEqual(before);
  });

  it.each(['--dry-run', '--check --force', 'sync'])('refuses unknown arguments "%s" before touching any file', args => {
    const root = fixture(), out = quiet();
    const before = snapshot(root);
    expect(runCli(args.split(' '), root, out.log, out.log)).toBe(2);
    expect(snapshot(root)).toEqual(before);
    expect(existsSync(join(root, SKILLS_COPY))).toBe(false);
  });

  it('refuses a linked source root and never deletes the files behind it', () => {
    const root = tempDir();
    mkdirSync(join(root, SKILLS_COPY, 'demo'), { recursive: true });
    writeFileSync(join(root, SKILLS_COPY, 'demo', 'SKILL.md'), 'only copy of this work');
    mkdirSync(join(root, '.agents'));
    symlinkSync(join(root, SKILLS_COPY), join(root, SKILLS_SOURCE), 'junction');
    expect(compareSkillCopies(root).join('\n')).toMatch(/symlink or junction/);
    expect(() => syncSkillCopies(root)).toThrow(/Refusing to sync/);
    expect(readFileSync(join(root, SKILLS_COPY, 'demo', 'SKILL.md'), 'utf8')).toBe('only copy of this work');
  });

  it('refuses a linked parent folder inside the repository, even before the copy exists', () => {
    const root = fixture(), elsewhere = tempDir('skill-pack-elsewhere-');
    symlinkSync(elsewhere, join(root, '.claude'), 'junction');
    expect(rootProblems(root, SKILLS_COPY, false).join('\n')).toMatch(/\.claude is a symlink or junction/);
    expect(() => syncSkillCopies(root)).toThrow(/Refusing to sync/);
    expect(readdirSync(elsewhere)).toEqual([]);
  });

  it('accepts a repository reached through an alias above it (/var → /private/var, 8.3 names, mapped drives)', () => {
    const real = tempDir('skill-pack-real-'), alias = join(tempDir('skill-pack-alias-'), 'link');
    symlinkSync(real, alias, 'junction');
    const root = fixture(join(alias, 'repo'));
    expect(layoutProblems(root, false)).toEqual([]);
    syncSkillCopies(root);
    expect(compareSkillCopies(root)).toEqual([]);
    expect(existsSync(join(real, 'repo', SKILLS_COPY, 'demo', 'SKILL.md'))).toBe(true);
  });

  it('refuses to sync from an empty source and keeps the existing copy', () => {
    const root = fixture();
    syncSkillCopies(root);
    rmSync(join(root, SKILLS_SOURCE, 'demo'), { recursive: true });
    expect(() => syncSkillCopies(root)).toThrow(/has no files/);
    expect(existsSync(join(root, SKILLS_COPY, 'demo', 'SKILL.md'))).toBe(true);
  });

  it('lists files without following links inside the pack', () => {
    const root = fixture();
    symlinkSync(join(root, SKILLS_SOURCE, 'demo'), join(root, SKILLS_SOURCE, 'alias'), 'junction');
    expect(() => listFiles(join(root, SKILLS_SOURCE))).toThrow(/not allowed/);
  });
});
