#!/usr/bin/env python3
import argparse, json, hashlib, re, sys
from pathlib import Path

parser=argparse.ArgumentParser(); parser.add_argument('--root',default='.'); parser.add_argument('--integrated',action='store_true',help='Validate the copied kit in the host repository without package-only archive requirements')
args=parser.parse_args(); root=Path(args.root).resolve(); kit=root/'design'/'brandopolis-ui'; public=root/'public'/'brand'
errors=[]

def need(p):
    if not p.exists(): errors.append(f'MISSING: {p.relative_to(root) if p.is_absolute() and root in p.parents else p}')

required=[kit/'README.md',kit/'docs/02_DESIGN_SYSTEM.md',kit/'docs/03_PRODUCT_UI_PRINCIPLES.md',kit/'docs/05_DOMAIN_UI_MAPPING.md',kit/'docs/07_STRATEGIC_GLASSMORPHISM.md',kit/'tokens/brandopolis.tokens.json',kit/'tokens/brandopolis.tokens.css',kit/'specs/screens.json',kit/'specs/components.json',kit/'specs/domain-ui-mapping.json',kit/'assets/logo/brandopolis-logo-horizontal-flat-outlined.svg',kit/'assets/symbols/brandopolis-symbol-flat.svg',kit/'handoff/CODEX_WEB_UI_START_HERE.md',kit/'handoff/CLAUDE_WEB_UI_REVIEW.md',kit/'reference/screenshots/README.md',kit/'validation/validate.py',public/'logo/brandopolis-logo-horizontal.svg',public/'symbols/brandopolis-symbol.svg',public/'ui/favicon.ico',root/'INTEGRATION_MANIFEST.md']
for p in required:
    if args.integrated and p.name=='INTEGRATION_MANIFEST.md': continue
    need(p)

# Repo safety.
for name in ['AGENTS.md','CLAUDE.md','package.json','tsconfig.json','pnpm-lock.yaml']:
    if not args.integrated and (root/name).exists(): errors.append(f'ROOT COLLISION FILE IN PACKAGE: {name}')
if (kit/'archive'/'brand-marketing').exists(): errors.append('Marketing archive remains inside copy-to-main kit')
if not args.integrated and not (root/'reference-only'/'brand-marketing'/'README.md').exists(): errors.append('Reference-only marketing archive missing/undocumented')

# Parse JSON.
for p in [kit/'tokens/brandopolis.tokens.json',kit/'specs/screens.json',kit/'specs/components.json',kit/'specs/domain-ui-mapping.json']:
    if p.exists():
        try: json.loads(p.read_text(encoding='utf-8'))
        except Exception as e: errors.append(f'JSON INVALID {p.relative_to(root)}: {e}')

# Token groups incl. glass.
tp=kit/'tokens/brandopolis.tokens.json'
if tp.exists():
    d=json.loads(tp.read_text(encoding='utf-8'))
    for k in ['primitive','semantic']:
        if k not in d: errors.append(f'Missing token group: {k}')
    if 'glass' not in d.get('primitive',{}): errors.append('Missing primitive.glass tokens')
    if 'glass' not in d.get('semantic',{}): errors.append('Missing semantic.glass tokens')

# Domain-state guard.
mp=kit/'specs/domain-ui-mapping.json'
if mp.exists():
    data=json.loads(mp.read_text(encoding='utf-8'))
    for item in data.get('decisionStatusMap',[]):
        if 'CURRENT' in item.get('domain',[]): errors.append('CURRENT used as Decision.status')

# Official logo outlines; no font-dependent text.
for p in [kit/'assets/logo/brandopolis-logo-horizontal-flat-outlined.svg',public/'logo/brandopolis-logo-horizontal.svg']:
    if p.exists():
        s=p.read_text(encoding='utf-8')
        if '<text' in s: errors.append(f'Official logo contains <text>: {p.relative_to(root)}')
        if 'Arial' in s: errors.append(f'Official logo references Arial: {p.relative_to(root)}')

# Forbidden invented contact / framework fork language in operative kit.
for p in kit.rglob('*'):
    if p.name == 'FINAL_SEARCH_REPORT.json':
        continue
    if p.is_file() and p.suffix.lower() in {'.md','.html','.json','.css','.js','.svg','.txt'}:
        try:s=p.read_text(encoding='utf-8')
        except:continue
        if 'hello@brandopolis.ai' in s: errors.append(f'Invented contact found: {p.relative_to(root)}')
        if 'implementation/nextjs-blueprint' in s: errors.append(f'Deprecated framework blueprint reference found: {p.relative_to(root)}')

# No hardcoded hex/rgb in component stylesheet; tokens.css is the source.
styles=kit/'prototype/shared/styles.css'
if styles.exists():
    s=styles.read_text(encoding='utf-8')
    if re.search(r'#[0-9a-fA-F]{3,8}\b|rgba?\(',s): errors.append('Hardcoded color found in prototype/shared/styles.css; use semantic tokens')

# Visible-language drift in canonical product HTML.
for page in ['m1-workspace','m1-needs-review','m1-guided-review']:
    p=kit/'prototype'/page/'index.html'
    if p.exists():
        s=p.read_text(encoding='utf-8')
        forbidden=['Strategic Workspace','Decision history','Needs Review','Guided Review','Your strategy has evolved','Active Brand','Demo User','Settings']
        for phrase in forbidden:
            if phrase in s: errors.append(f'Visible language drift "{phrase}" in {p.relative_to(root)}')
        if 'data-app-menu-toggle' not in s or 'data-app-nav' not in s: errors.append(f'Mobile app navigation trigger missing in {p.relative_to(root)}')

# User-facing micro-patch guards: no engineering/prototype notes or engineering vocabulary in canonical UI.
visible_forbidden = [
    'Referencia visual estática', 'autenticación real pertenece', 'endpoint definitivo', 'este kit',
    'Cambio upstream', ' upstream', ' downstream', 'Usuario de referencia',
    'Mantener sin cambios*', 'Modificar*', 'Confirmar revisión*',
    'acciones finales deben conectarse', 'nuevo estado de dominio'
]
for p in (kit/'prototype').rglob('*.html'):
    s=p.read_text(encoding='utf-8')
    for phrase in visible_forbidden:
        if phrase in s: errors.append(f'User-facing technical/prototype copy found "{phrase}" in {p.relative_to(root)}')

# Anchors.
for p in (kit/'prototype').rglob('*.html'):
    s=p.read_text(encoding='utf-8'); ids=set(re.findall(r'id=["\']([^"\']+)',s))
    for h in re.findall(r'href=["\']#([^"\']*)',s):
        if not h or h not in ids: errors.append(f'Broken local anchor #{h} in {p.relative_to(root)}')

# Browser screenshots.
shotdir=kit/'reference/screenshots'
for n in ['public-gateway-desktop.png','login-desktop.png','request-access-desktop.png','m1-workspace-desktop.png','m1-needs-review-desktop.png','m1-guided-review-desktop.png','m1-workspace-mobile.png','m1-needs-review-mobile.png','m1-guided-review-mobile.png']:
    need(shotdir/n)

# Manifest hashes.
manifest=kit/'specs/brand-assets.json'
if manifest.exists():
    try:d=json.loads(manifest.read_text(encoding='utf-8'))
    except:d={}
    for item in d.get('assets',[]):
        p=root/item['path']
        if not p.exists(): errors.append(f'Manifest path missing: {item["path"]}'); continue
        h=hashlib.sha256(p.read_bytes()).hexdigest()
        if h!=item['sha256']: errors.append(f'Hash mismatch: {item["path"]}')
        if item['path'].startswith('reference-only/'): errors.append('Reference-only archive must not be in operative asset manifest')

# Key READMEs.
for p in [kit/'assets/logo/README.md',kit/'prototype/README.md',kit/'reference/screenshots/README.md',kit/'reference/future-concepts/README.md',root/'reference-only/brand-marketing/README.md']:
    if args.integrated and 'reference-only' in p.parts: continue
    need(p)

if errors:
    print('VALIDATION: FAIL')
    for e in errors: print(' -',e)
    sys.exit(1)
print('VALIDATION: PASS')
print(f'Root: {root}')
print('Checks: repo safety, required docs, JSON, glass tokens, official logo outlines, domain-state guard, language guard, semantic-color guard, mobile nav, anchors, browser screenshots, asset hashes, archive separation')
