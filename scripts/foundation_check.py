#!/usr/bin/env python3
"""Read-only repository contract checks. Python 3.10+; pip install -r requirements-foundation.txt."""
from pathlib import Path
import json,re,sys,collections
try:
 from jsonschema import Draft202012Validator
except ImportError:
 print('ERROR: install requirements-foundation.txt to validate JSON Schemas');sys.exit(2)
ROOT=Path(__file__).resolve().parents[1];errors=[]
required=['README.md','AGENTS.md','CLAUDE.md','CONTRIBUTING.md','SESSION_STATE.md','CHANGELOG.md','.gitignore','.env.example','LOCAL_HANDOFF.md','docs/01-product/product-bible-v1.md','docs/00-index/source-of-truth.md','docs/04-domain-model/state-machines.md']
for n in required:
 if not (ROOT/n).exists():errors.append('Missing '+n)
for p in ROOT.rglob('*.md'):
 s=p.read_text()
 for link in re.findall(r'\]\(([^)]+)\)',s):
  if link.startswith(('http:','https:','#','mailto:')):continue
  if not (p.parent/link.split('#')[0]).exists():errors.append('Broken link '+str(p.relative_to(ROOT))+' -> '+link)
 if 'cotejo con Bible pendiente' in s and 'reconciliation-log' not in str(p):errors.append('Stale Bible pending '+str(p.relative_to(ROOT)))
for p in ROOT.rglob('*.json'):
 try:data=json.loads(p.read_text())
 except Exception as e:errors.append('JSON parse '+str(p)+': '+str(e));continue
 if p.name.endswith('.schema.json'):
  try:
   Draft202012Validator.check_schema(data)
   if not data.get('examples'):errors.append('No examples '+p.name)
   for ex in data.get('examples',[]):Draft202012Validator(data).validate(ex)
  except Exception as e:errors.append('Schema/example '+p.name+': '+str(e))
schemas={p.stem.removesuffix('.schema'):json.loads(p.read_text()) for p in (ROOT/'schemas').glob('*.schema.json')}
def en(sc,key):return schemas.get(sc,{}).get('properties',{}).get(key,{}).get('enum')
expected={'hypothesis':{'status':['UNTESTED','TESTING','SUPPORTED','WEAKENED','REJECTED']},'experiment':{'status':['PLANNED','RUNNING','COMPLETED','INCONCLUSIVE','CANCELLED']},'dependency':{'kind':['HARD','SOFT','INFORMATIVE']},'telemetry-event':{'dataClass':['DEMO','PILOT','PRODUCTION'],'cohort':['A','B','NONE'],'intervention':['PRODUCT_ONLY','ASSISTED','CONCIERGE','NONE'],'actor':['USER','SYSTEM','AI']}}
for sc,fields in expected.items():
 for key,vals in fields.items():
  if en(sc,key)!=vals:errors.append('Enum drift '+sc+'.'+key)
t=schemas.get('telemetry-event',{}).get('properties',{}).get('workspaceId',{})
if t.get('type')!=['string','null']:errors.append('Telemetry workspaceId must be nullable')
reqs=set(re.findall(r'\b(?:DEC|CTX|EVD|CI|HYP|LRN|DEP|AI|PROD|UX|SEC|CAP|VAL)-\d{3}\b',(ROOT/'docs/00-index/traceability-matrix.md').read_text()))
cases=json.loads((ROOT/'evals/golden-cases/cases.json').read_text())['cases']
case_ids=[c['id'] for c in cases]
if len(case_ids)!=len(set(case_ids)):errors.append('Duplicate golden case IDs')
for c in cases:
 for rid in c.get('requirements',[]):
  if rid not in reqs:errors.append('Eval references unknown requirement '+rid)
for p in (ROOT/'docs/14-decisions').glob('ADR-*.md'):
 if 'cotejo con Bible pendiente' in p.read_text():errors.append('Stale ADR '+p.name)
 if p.read_text().count('\nStatus: ')>0:errors.append('Duplicate ADR headers '+p.name)
expected_schemas={'strategic-question','recommendation','decision','decision-version','dependency','review-item','decision-commit','impact-result','evidence','hypothesis','telemetry-event','experiment','signal','learning','capability-evidence','assessment','user-input','open-question','inference'}
for name in sorted(expected_schemas-set(schemas)):errors.append('Missing schema '+name)
if 'ASSUMPTION_IN_USE' in json.dumps(schemas.get('hypothesis',{}).get('properties',{}).get('status',{})):errors.append('Assumption incorrectly modeled as Hypothesis status')
if 'INFORMATIVE' not in json.dumps(schemas.get('dependency',{})):errors.append('Dependency INFORMATIVE missing')
if 'INCONCLUSIVE' not in json.dumps(schemas.get('experiment',{})):errors.append('Experiment INCONCLUSIVE missing')
for n in ('0001','0002','0005','0006','0007','0008','0009','0010'):
 if not (ROOT/f'docs/14-decisions/ADR-{n}.md').read_text().startswith('Status: accepted'):errors.append('ADR accepted drift '+n)
for n in ('0003','0004'):
 if not (ROOT/f'docs/14-decisions/ADR-{n}.md').read_text().startswith('Status: open'):errors.append('ADR open drift '+n)
print('Markdown',len(list(ROOT.rglob('*.md'))),'JSON',len(list(ROOT.rglob('*.json'))),'schemas',len(schemas),'requirements',len(reqs),'golden cases',len(cases),'errors',len(errors))
for e in errors:print('ERROR:',e)
sys.exit(1 if errors else 0)
