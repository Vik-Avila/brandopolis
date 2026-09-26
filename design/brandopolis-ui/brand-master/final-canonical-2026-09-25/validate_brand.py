#!/usr/bin/env python3
"""Validate the canonical brand package without external dependencies."""
from pathlib import Path
import json,hashlib,struct,xml.etree.ElementTree as ET,re,sys
R=Path(__file__).resolve().parent
errors=[]
def check(test,message):
 if not test:errors.append(message)
def j(path):
 try:return json.loads((R/path).read_text())
 except Exception as e:errors.append(f'{path}: {e}');return None
required=['README.md','01_master/brandopolis-symbol-master.svg','01_master/brandopolis-logo-horizontal-master.svg','01_master/brandopolis-wordmark.svg','02_runtime/favicon/favicon.ico','02_runtime/manifest/site.webmanifest','05_micro/brandopolis-symbol-micro.svg','BRAND_ASSET_REPLACEMENT_MAP.json','08_manifest/brand-assets.json']
for size in (128,180,192,256,512,1024):required.append(f'02_runtime/app-icons/app-icon-{size}.png')
for p in required:check((R/p).is_file(),f'missing required: {p}')
for p in (R/'01_master').glob('*.svg'):
 try:
  s=p.read_text();root=ET.fromstring(s)
  check('viewBox' in root.attrib and len(root.attrib['viewBox'].split())==4,f'bad viewBox: {p.name}')
  check('<image' not in s and 'data:image' not in s and '<text' not in s and '<foreignObject' not in s,f'nonvector master: {p.name}')
  check(not re.search(r'font-family|@font-face|<style[^>]*>.*font',s,re.I|re.S),f'font dependency: {p.name}')
  check(any(el.tag.endswith('path') for el in root.iter()),f'no paths: {p.name}')
 except Exception as e:errors.append(f'SVG {p}: {e}')
for p in (R/'02_runtime').rglob('*.svg'):
 try:ET.parse(p)
 except Exception as e:errors.append(f'SVG {p}: {e}')
for p in (R/'04_mono').glob('*.svg'):
 try:ET.parse(p)
 except Exception as e:errors.append(f'SVG {p}: {e}')
for p in (R/'05_micro').glob('*.svg'):
 try:ET.parse(p)
 except Exception as e:errors.append(f'SVG {p}: {e}')
def png_size(p):
 try:
  b=p.read_bytes();check(b[:8]==b'\x89PNG\r\n\x1a\n',f'bad PNG: {p}');return struct.unpack('>II',b[16:24])
 except Exception as e:errors.append(f'PNG {p}: {e}');return None
for size in (128,180,192,256,512,1024):check(png_size(R/f'02_runtime/app-icons/app-icon-{size}.png')==(size,size),f'app size {size}')
for size in (16,24,32,48,64,128,256):check(png_size(R/f'05_micro/favicon-{size}.png')==(size,size),f'micro size {size}')
for size in (16,32,48,64,128,256):check(png_size(R/f'02_runtime/favicon/favicon-{size}.png')==(size,size),f'favicon PNG {size}')
for p in (R/'03_premium').glob('*.png'):
 check(png_size(p) is not None and p.read_bytes()[25] in (4,6),f'premium PNG alpha: {p}')
try:
 b=(R/'02_runtime/favicon/favicon.ico').read_bytes();count=struct.unpack_from('<H',b,4)[0];sizes={int(b[6+i*16] or 256) for i in range(count)}
 check({16,32,48,64,128,256}<=sizes,f'ICO sizes: {sizes}')
except Exception as e:errors.append(f'ICO: {e}')
web=j('02_runtime/manifest/site.webmanifest')
if web:
 for k,v in [('name','Brandopolis'),('short_name','Brandopolis'),('background_color','#F7F3EA'),('theme_color','#073D2D')]:check(web.get(k)==v,f'webmanifest {k}')
 for icon in web.get('icons',[]):
  src=icon.get('src','');name=Path(src).name
  check(src.startswith('/brand/') and (R/'02_runtime/app-icons'/name).exists(),f'webmanifest icon {src}')
  check(icon.get('sizes') in ('192x192','512x512'),f'PWA size {src}')
  check(png_size(R/'02_runtime/app-icons'/name)==tuple(map(int,icon['sizes'].split('x'))),f'PWA actual dimensions {src}')
 check({x['sizes'] for x in web.get('icons',[])}=={'192x192','512x512'},'PWA 192/512 entries')
rows=j('BRAND_ASSET_REPLACEMENT_MAP.json')
if rows:
 deprecated={r['legacyAsset'] for r in rows};edges={r['legacyAsset']:r['replacement'] for r in rows}
 for r in rows:
  old=r['legacyAsset'];target=r['replacement'];check((R/target).is_file(),f'missing replacement: {old} -> {target}')
  check(target not in deprecated,f'deprecated target: {old} -> {target}')
  seen={old};cur=target
  while cur in edges:
   if cur in seen:errors.append(f'cycle: {old}');break
   seen.add(cur);cur=edges[cur]
  m=re.search(r'(?:app-)?icon-(\d+)\.png$',Path(old).name)
  if m:check(Path(target).name.endswith('-'+m.group(1)+'.png'),f'size mismatch: {old} -> {target}')
  if Path(old).name=='apple-touch-icon.png':check(Path(target).name=='app-icon-180.png','apple touch size')
  if '/ui/icon-' in old and int(re.search(r'icon-(\d+)',old).group(1))<=64:check('/favicon/' in target,'small favicon target')
  if Path(old).name=='favicon.ico':check(Path(target).name=='favicon.ico','favicon ICO target')
meta=j('08_manifest/brand-assets.json')
if meta:
 check(meta.get('status')=='CANONICAL / APPROVED / READY FOR REPOSITORY RECONCILIATION','manifest canonical status')
 statuses={'CANONICAL MASTER','CANONICAL RUNTIME','CANONICAL PREMIUM','CANONICAL MICRO','DEPRECATED','LEGACY','REFERENCE ONLY'}
 for a in meta.get('assets',[]):
  p=R/a['path'];check(p.is_file(),f'manifest missing {p}')
  if not p.is_file():continue
  check(a['bytes']==p.stat().st_size and a['sha256']==hashlib.sha256(p.read_bytes()).hexdigest(),f'stale manifest: {p}')
  for k in ('type','role','canonicalStatus','recommendedUsage','replacementFor','smallSizeSafe','runtime','premium'):check(k in a,f'missing manifest field {k}: {p}')
  check(a['canonicalStatus'] in statuses,f'bad canonical status: {p}')
  check(a['type']==p.suffix.lstrip('.'),f'bad type: {p}')
  if p.suffix=='.png':
   b=p.read_bytes();check(b[:8]==b'\x89PNG\r\n\x1a\n',f'bad raster: {p}')
 check({r['replacement'] for r in (rows or []) if r['replacement'] in {a['path'] for a in meta.get('assets',[])}}<={a['path'] for a in meta['assets']},'replacement manifest consistency')
readme=(R/'README.md').read_text();check(readme.startswith('# BRANDOPOLIS CANONICAL BRAND MASTER SYSTEM'),'README heading')
check('CANONICAL / APPROVED' in readme and 'READY FOR REPOSITORY RECONCILIATION' in readme,'README status')
for p in list(R.glob('*.md'))+list((R/'06_qa').glob('*.md')):
 check('REVIEW CANDIDATE' not in p.read_text(),f'candidate wording {p}')
check('brandopolis.ai' in readme,'domain')
print(json.dumps({'status':'PASS' if not errors else 'FAIL','errors':errors,'manifestAssets':len(meta['assets']) if meta else 0,'replacementMappings':len(rows) if rows else 0},indent=2))
sys.exit(bool(errors))
