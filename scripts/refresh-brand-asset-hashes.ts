import { readFileSync,writeFileSync,readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
// Refreshes design/brandopolis-ui/specs/brand-assets.json after a deliberate change to runtime brand assets or
// canonical screenshots (UPDATE_CANONICAL_SCREENSHOTS=1 pnpm test:visual). Adds runtime web assets and screenshots
// not yet listed. Never lists reference-only material.
const file='design/brandopolis-ui/specs/brand-assets.json',data=JSON.parse(readFileSync(file,'utf8')) as {meta:Record<string,string>;assets:{path:string;bytes:number;sha256:string;type:string;purpose:string;canonicalStatus:string}[]};
const describe=(path:string)=>{const bytes=readFileSync(path);return {bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};};
const wanted=[
  ...readdirSync('public/brand/web').map(f=>({path:`public/brand/web/${f}`,purpose:'runtime-brand-asset'})),
  ...readdirSync('design/brandopolis-ui/reference/screenshots').filter(f=>f.endsWith('.png')).map(f=>({path:`design/brandopolis-ui/reference/screenshots/${f}`,purpose:'canonical-screen-reference'}))
];
for(const w of wanted)if(!data.assets.some(a=>a.path===w.path))data.assets.push({path:w.path,bytes:0,sha256:'',type:w.path.split('.').pop()!,purpose:w.purpose,canonicalStatus:'CANONICAL'});
let changed=0;
for(const asset of data.assets){const now=describe(asset.path);if(now.sha256!==asset.sha256){Object.assign(asset,now);changed++;}}
data.meta.version='2026-09-25-final-visual-integration';
writeFileSync(file,JSON.stringify(data,null,2)+'\n');
console.log(`brand-assets.json: ${data.assets.length} assets, ${changed} updated or added.`);
