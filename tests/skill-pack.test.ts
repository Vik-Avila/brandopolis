// Engineering Skill Pack guard. Skills are procedures, routing and gates: they must point at canonical sources,
// never become a second Product Bible, and the Claude Code copy must stay byte-identical to the source.
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { compareSkillCopies, listFiles, ROOT, SKILLS_COPY, SKILLS_SOURCE } from '../scripts/skill-pack.js';

const EXPECTED = ['brandopolis-brando', 'brandopolis-feature', 'brandopolis-review', 'brandopolis-security', 'brandopolis-ui'];
const MAX_LINES = 100;
const JUSTIFICATION = /<!--\s*line-limit-justification:\s*\S.*-->/;
// Upper-case words that are not lifecycle states: acronyms, protocols and document names. Statuses must come from
// schemas/*.schema.json or the canonical state machines, never from this list.
const NON_STATUS_TERMS = new Set(['AI', 'IA', 'UI', 'UX', 'API', 'CSS', 'DNS', 'SMTP', 'HEAD', 'PATH', 'MX', 'ADR', 'INV', 'ENG', 'MVP', 'OIDC', 'CSP', 'HTTP', 'SDK', 'RAG', 'DB', 'SQL', 'SHA',
  'LF', 'ID', 'URL', 'AGENTS', 'CLAUDE', 'SESSION_STATE', 'CHANGELOG', 'PRODUCT_DESIGN_SYSTEM', 'FRONTEND_ASSET_MAPPING',
  'FRONTEND_BRAND_INTEGRATION', 'BRAND_ASSET_USAGE_MATRIX', 'NEXT_DEVELOPER_START_HERE', 'CURRENT_IMPLEMENTATION_STATE',
  'POST_MVP_DEFERRED_SCOPE', 'GOOGLE_AUTH_PRODUCTION', 'PILOT_DEPLOYMENT_CONTRACT', 'AI_PROVIDER_LAUNCH', 'CLAUDE_START_HERE',
  'LIVE_PILOT_LAUNCH_CHECKLIST', 'PILOT_RUNBOOK', 'UPDATE_CANONICAL_SCREENSHOTS']);

const skillDirs = () => readdirSync(join(ROOT, SKILLS_SOURCE), { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name).sort();
const skillFile = (name: string) => join(ROOT, SKILLS_SOURCE, name, 'SKILL.md');
const read = (name: string) => readFileSync(skillFile(name), 'utf8').replace(/\r\n/g, '\n');

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

function canonicalVocabulary(): Set<string> {
  const vocabulary = new Set<string>();
  for (const file of readdirSync(join(ROOT, 'schemas')).filter(f => f.endsWith('.schema.json')))
    enumValues(JSON.parse(readFileSync(join(ROOT, 'schemas', file), 'utf8')), vocabulary);
  for (const token of readFileSync(join(ROOT, 'docs/04-domain-model/state-machines.md'), 'utf8').match(/\b[A-Z][A-Z_]{2,}\b/g) ?? []) vocabulary.add(token);
  for (const line of readFileSync(join(ROOT, '.env.example'), 'utf8').split(/\r?\n/)) {
    const name = line.match(/^#?\s*([A-Z][A-Z0-9_]+)=/)?.[1];
    if (name) vocabulary.add(name);
  }
  return vocabulary;
}

function unknownTerms(markdown: string): string[] {
  const vocabulary = canonicalVocabulary(), text = markdown.replace(/\]\([^)]*\)/g, ']');
  return [...new Set(text.match(/\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*\b/g) ?? [])]
    .filter(t => (t.match(/[A-Z]/g) ?? []).length >= 2 && !vocabulary.has(t) && !NON_STATUS_TERMS.has(t));
}

// GitHub-style heading anchor, enough for the headings the skills link to.
const slug = (heading: string) => heading.trim().toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s/g, '-');

describe('Engineering Skill Pack', () => {
  it('ships exactly the approved five skills, with no database, release or router skill', () => {
    expect(skillDirs()).toEqual(EXPECTED);
  });

  it('keeps .claude/skills byte-identical to the canonical .agents/skills, without symlinks', () => {
    expect(compareSkillCopies(), `run pnpm skills:sync`).toEqual([]);
    expect(listFiles(join(ROOT, SKILLS_COPY))).toEqual(listFiles(join(ROOT, SKILLS_SOURCE)));
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

  it.each(EXPECTED)('%s stays within %i lines unless explicitly justified', name => {
    const text = read(name);
    if (!JUSTIFICATION.test(text)) expect(text.trimEnd().split('\n').length).toBeLessThanOrEqual(MAX_LINES);
  });

  it.each(EXPECTED)('%s carries the required procedural sections', name => {
    const text = read(name);
    for (const section of [/^## Read first|^## 1\./m, /^## (Procedure|Gates|Stage gate|Authority gate|\d\.)/m, /^## Escalate to a human$/m, /^## Never$/m, /^## Checks$|^## Single check matrix$/m])
      expect(text, `${name} misses ${section}`).toMatch(section);
  });

  it.each(EXPECTED)('%s only references canonical files, anchors and repo paths that exist', name => {
    const text = read(name), base = dirname(skillFile(name));
    const links = [...text.matchAll(/\]\(([^)\s]+)\)/g)].map(m => m[1]).filter(l => !/^(https?:|mailto:)/.test(l));
    expect(links.length, `${name} must link canonical sources`).toBeGreaterThan(0);
    for (const link of links) {
      const [file, anchor] = link.split('#');
      const target = join(base, file);
      expect(existsSync(target), `${name}: broken link ${link}`).toBe(true);
      if (anchor) {
        const headings = readFileSync(target, 'utf8').split(/\r?\n/).filter(l => /^#{1,6} /.test(l)).map(l => slug(l.replace(/^#+ /, '')));
        expect(headings, `${name}: missing anchor ${link}`).toContain(anchor);
      }
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

  it('flags an invented state and accepts canonical ones', () => {
    expect(unknownTerms('Mark it VIGENTE, then ARCHIVED_FOREVER.')).toEqual(['VIGENTE', 'ARCHIVED_FOREVER']);
    expect(unknownTerms('NEEDS_REVIEW, SUPERSEDED and HARD come from the canonical sources.')).toEqual([]);
  });

  it.each(EXPECTED)('%s invents no state: every upper-case term is canonical or a declared non-status term', name => {
    expect(unknownTerms(read(name)), `${name}: add statuses to the canonical schemas/state machines, not to a skill`).toEqual([]);
  });
});
