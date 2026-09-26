import { describe,it,expect } from 'vitest';
import { readFileSync,existsSync,statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { runtimeAssets,loadAsset } from '../src/transport/assets.js';
// Runtime identity must be the approved Brand Master, byte for byte; legacy polygonal assets must not be served.
const master='design/brandopolis-ui/brand-master/final-canonical-2026-09-25';
const sha=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
const canonical:Record<string,string>={
  '/brand/logo.svg':`${master}/01_master/brandopolis-logo-horizontal-master.svg`,
  '/brand/symbol.svg':`${master}/01_master/brandopolis-symbol-master.svg`,
  '/favicon.ico':`${master}/02_runtime/favicon/favicon.ico`,
  '/brand/favicon-32.png':`${master}/02_runtime/favicon/favicon-32.png`,
  '/brand/apple-touch-icon.png':`${master}/02_runtime/app-icons/app-icon-180.png`,
  '/brand/app-icon-192.png':`${master}/02_runtime/app-icons/app-icon-192.png`,
  '/brand/app-icon-512.png':`${master}/02_runtime/app-icons/app-icon-512.png`,
  '/site.webmanifest':`${master}/02_runtime/manifest/site.webmanifest`
};
describe('canonical brand runtime',()=>{
  it('prominent identity uses the approved material derivative without serving the oversized master',()=>{
    expect(sha(`${master}/03_premium/brandopolis-logo-horizontal-premium.png`)).toBe('28877e609f4e051ed4eff4906a81170b02d17cbe769efdd093d9fa5d227150ad');
    const file=runtimeAssets['/brand/logo-premium.webp'][0];
    expect(sha(file)).toBe('0dbb6a7aac540e40ee96137bdeee13d180cde98d779cba5f1a6fccf5438653a6');
    expect(statSync(file).size).toBeLessThan(25000);
    const html=readFileSync('src/transport/public/index.html','utf8');
    expect(html).toContain('src="/brand/logo-premium.webp" alt="Brandopolis" width="660" height="151"');
    expect(html).toContain('srcset="/brand/symbol.svg"');
    expect(html).not.toContain('src="/brand/logo.svg"');
  });
  it('every identity route serves a byte-identical copy of the Brand Master',()=>{
    for(const [route,source] of Object.entries(canonical)){
      const served=runtimeAssets[route as keyof typeof runtimeAssets];expect(served,route).toBeDefined();
      expect(sha(served[0]),route).toBe(sha(source));
    }
  });
  it('the manifest icons resolve to served canonical icons',()=>{
    const manifest=JSON.parse(loadAsset('/site.webmanifest')!.content.toString('utf8')) as {icons:{src:string;sizes:string}[]};
    expect(manifest.icons.map(i=>i.sizes)).toEqual(['192x192','512x512']);
    for(const icon of manifest.icons)expect(loadAsset(icon.src),icon.src).toBeDefined();
  });
  it('no legacy polygonal or deprecated brand file is served',()=>{
    const deprecated=JSON.parse(readFileSync(`${master}/BRAND_ASSET_REPLACEMENT_MAP.json`,'utf8')) as {legacyAsset:string}[];
    const legacy=new Map(deprecated.filter(d=>existsSync(d.legacyAsset)).map(d=>[d.legacyAsset,sha(d.legacyAsset)]));
    for(const [route,[file]] of Object.entries(runtimeAssets)){
      // A legacy path may remain only if its bytes were replaced by the canonical file.
      if(legacy.has(file))expect(Object.values(canonical).map(sha),route).toContain(legacy.get(file));
    }
    expect(Object.keys(runtimeAssets).some(r=>/brandopolis-symbol-(black|emerald|gold|white|flat)\.png|\/brand\/flow\.webp|\/brand\/ui\/icon-/.test(r))).toBe(false);
  });
  it('design sources and boards are never served',()=>{
    for(const path of ['/design/brandopolis-ui/brand-master/final-canonical-2026-09-25/BRANDOPOLIS_CANONICAL_BRAND_ASSET_BOARD.png','/brand/brandopolis-symbol-premium-4096.webp','/12_canonical_reference/brandopolis-canonical-product-vision-v1.png','/brand/flow.webp','/brand/ui/icon-32.png'])expect(loadAsset(path),path).toBeUndefined();
  });
});
