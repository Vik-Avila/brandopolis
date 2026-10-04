#!/usr/bin/env python3
"""Read-only repository contract checks. Python 3.10+; pip install -r requirements-foundation.txt."""
from pathlib import Path
import json,re,sys,collections,os
try:
 from jsonschema import Draft202012Validator
except ImportError:
 print('ERROR: install requirements-foundation.txt to validate JSON Schemas');sys.exit(2)
ROOT=Path(__file__).resolve().parents[1];errors=[]
def files(suffix):
 for directory, dirs, names in os.walk(ROOT):
  dirs[:] = [d for d in dirs if d not in {'.git','.venv','node_modules','.pnpm-store','.next','dist','coverage','.local','test-results','playwright-report'}]
  if Path(directory)==ROOT/'.claude':dirs[:]=[d for d in dirs if d!='worktrees']
  for name in names:
   if name.endswith(suffix): yield Path(directory)/name
required=['README.md','AGENTS.md','CLAUDE.md','CONTRIBUTING.md','SESSION_STATE.md','CHANGELOG.md','.gitignore','.env.example','LOCAL_HANDOFF.md','docs/01-product/product-bible-v1.md','docs/00-index/source-of-truth.md','docs/04-domain-model/state-machines.md']
for n in required:
 if not (ROOT/n).exists():errors.append('Missing '+n)
for p in files('.md'):
 s=p.read_text(encoding='utf-8')
 for link in re.findall(r'\]\(([^)]+)\)',s):
  if link.startswith(('http:','https:','#','mailto:')):continue
  if not (p.parent/link.split('#')[0]).exists():errors.append('Broken link '+str(p.relative_to(ROOT))+' -> '+link)
 if 'cotejo con Bible pendiente' in s and 'reconciliation-log' not in str(p):errors.append('Stale Bible pending '+str(p.relative_to(ROOT)))
for p in files('.json'):
 try:data=json.loads(p.read_text(encoding='utf-8'))
 except Exception as e:errors.append('JSON parse '+str(p)+': '+str(e));continue
 if p.name.endswith('.schema.json'):
  try:
   Draft202012Validator.check_schema(data)
   if not data.get('examples'):errors.append('No examples '+p.name)
   for ex in data.get('examples',[]):Draft202012Validator(data).validate(ex)
  except Exception as e:errors.append('Schema/example '+p.name+': '+str(e))
schemas={p.stem.removesuffix('.schema'):json.loads(p.read_text(encoding='utf-8')) for p in (ROOT/'schemas').glob('*.schema.json')}
def en(sc,key):return schemas.get(sc,{}).get('properties',{}).get(key,{}).get('enum')
expected={'hypothesis':{'status':['UNTESTED','TESTING','SUPPORTED','WEAKENED','REJECTED']},'experiment':{'status':['PLANNED','RUNNING','COMPLETED','INCONCLUSIVE','CANCELLED']},'dependency':{'kind':['HARD','SOFT','INFORMATIVE']},'telemetry-event':{'dataClass':['DEMO','PILOT','PRODUCTION'],'cohort':['A','B','NONE'],'intervention':['PRODUCT_ONLY','ASSISTED','CONCIERGE','NONE'],'actor':['USER','SYSTEM','AI']}}
for sc,fields in expected.items():
 for key,vals in fields.items():
  if en(sc,key)!=vals:errors.append('Enum drift '+sc+'.'+key)
t=schemas.get('telemetry-event',{}).get('properties',{}).get('workspaceId',{})
if t.get('type')!=['string','null']:errors.append('Telemetry workspaceId must be nullable')
reqs=set(re.findall(r'\b(?:DEC|CTX|EVD|CI|HYP|LRN|DEP|AI|PROD|UX|SEC|CAP|VAL)-\d{3}\b',(ROOT/'docs/00-index/traceability-matrix.md').read_text(encoding='utf-8')))
cases=json.loads((ROOT/'evals/golden-cases/cases.json').read_text(encoding='utf-8'))['cases']
case_ids=[c['id'] for c in cases]
if len(case_ids)!=len(set(case_ids)):errors.append('Duplicate golden case IDs')
for c in cases:
 for rid in c.get('requirements',[]):
  if rid not in reqs:errors.append('Eval references unknown requirement '+rid)
for p in (ROOT/'docs/14-decisions').glob('ADR-*.md'):
 if 'cotejo con Bible pendiente' in p.read_text(encoding='utf-8'):errors.append('Stale ADR '+p.name)
 if p.read_text(encoding='utf-8').count('\nStatus: ')>0:errors.append('Duplicate ADR headers '+p.name)
expected_schemas={'strategic-question','recommendation','decision','decision-version','dependency','review-item','decision-commit','impact-result','evidence','hypothesis','telemetry-event','experiment','signal','learning','capability-evidence','assessment','user-input','open-question','inference'}
for name in sorted(expected_schemas-set(schemas)):errors.append('Missing schema '+name)
if 'ASSUMPTION_IN_USE' in json.dumps(schemas.get('hypothesis',{}).get('properties',{}).get('status',{})):errors.append('Assumption incorrectly modeled as Hypothesis status')
if 'INFORMATIVE' not in json.dumps(schemas.get('dependency',{})):errors.append('Dependency INFORMATIVE missing')
if 'INCONCLUSIVE' not in json.dumps(schemas.get('experiment',{})):errors.append('Experiment INCONCLUSIVE missing')
for n in ('0001','0002','0003','0005','0006','0007','0008','0009','0010'):
 if not (ROOT/f'docs/14-decisions/ADR-{n}.md').read_text(encoding='utf-8').startswith('Status: accepted'):errors.append('ADR accepted drift '+n)
for n in ('0004',):
 if not (ROOT/f'docs/14-decisions/ADR-{n}.md').read_text(encoding='utf-8').startswith('Status: open'):errors.append('ADR open drift '+n)
# Engineering Skill Pack: light gate only. .claude/skills must be a byte-identical copy of .agents/skills
# (pnpm skills:sync). Inside the repository no path segment may be a symlink or junction, and linked entries are
# reported, never followed; aliases above the repository are ignored. Frontmatter, references and vocabulary are
# checked semantically in tests/skill-pack.test.ts, never here.
def linked(p):return p.is_symlink() or (hasattr(os.path,'isjunction') and os.path.isjunction(p))
def skill_root(rel):
 p=ROOT
 for part in rel.split('/'):
  p=p/part
  if linked(p):errors.append('Skill pack path is a symlink or junction: '+rel);return None
  if not p.is_dir():errors.append('Skill pack root missing: '+rel);return None
 return p
def skill_tree(d):
 out=[]
 for directory,dirs,names in os.walk(d,followlinks=False):
  for n in list(dirs):
   if linked(Path(directory)/n):errors.append('Skill pack linked entry: '+(Path(directory)/n).relative_to(ROOT).as_posix());dirs.remove(n)
  out+=[(Path(directory)/n).relative_to(d).as_posix() for n in names if not linked(Path(directory)/n)]
 return sorted(out)
skills_src,skills_copy=skill_root('.agents/skills'),skill_root('.claude/skills')
if skills_src and skills_copy:
 src_files,copy_files=skill_tree(skills_src),skill_tree(skills_copy)
 if not src_files:errors.append('Skill pack source is empty')
 if src_files!=copy_files:errors.append('Skill pack copy diverges from .agents/skills (run pnpm skills:check)')
 for rel in src_files:
  if rel in copy_files and (skills_src/rel).read_bytes()!=(skills_copy/rel).read_bytes():errors.append('Skill pack bytes differ '+rel)
print('Markdown',len(list(files('.md'))),'JSON',len(list(files('.json'))),'schemas',len(schemas),'requirements',len(reqs),'golden cases',len(cases),'errors',len(errors))
for e in errors:print('ERROR:',e)
sys.exit(1 if errors else 0)
