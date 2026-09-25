import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
// Static assets served by both DEMO and PILOT. Paths are relative to the repository root (process cwd).
// Only runtime-selected files are listed; the full design package stays under design/ and is never served.
// Mapping and rationale: design/brandopolis-ui/FRONTEND_ASSET_MAPPING.md
export const runtimeAssets={
  '/':['src/transport/public/index.html','text/html; charset=utf-8'],
  '/app.js':['src/transport/public/app.js','text/javascript; charset=utf-8'],
  '/style.css':['src/transport/public/style.css','text/css; charset=utf-8'],
  '/tokens.css':['design/brandopolis-ui/tokens/brandopolis.tokens.css','text/css; charset=utf-8'],
  // Identity: byte-identical copies of the canonical Brand Master (design/brandopolis-ui/brand-master/
  // final-canonical-2026-09-25); tests/brand-runtime.test.ts fails on any drift.
  '/brand/logo.svg':['public/brand/logo/brandopolis-logo-horizontal.svg','image/svg+xml'],
  '/brand/symbol.svg':['public/brand/symbols/brandopolis-symbol.svg','image/svg+xml'],
  '/favicon.ico':['public/brand/ui/favicon.ico','image/x-icon'],
  '/brand/favicon-32.png':['public/brand/ui/favicon-32.png','image/png'],
  '/brand/apple-touch-icon.png':['public/brand/ui/apple-touch-icon.png','image/png'],
  // The canonical manifest references exactly /brand/app-icon-192.png and /brand/app-icon-512.png.
  '/site.webmanifest':['public/brand/ui/site.webmanifest','application/manifest+json'],
  '/brand/app-icon-192.png':['public/brand/ui/app-icon-192.png','image/png'],
  '/brand/app-icon-512.png':['public/brand/ui/app-icon-512.png','image/png'],
  '/brand/web/hero-signature-desktop.webp':['public/brand/web/hero-signature-desktop.webp','image/webp'],
  '/brand/web/hero-signature-tablet.webp':['public/brand/web/hero-signature-tablet.webp','image/webp'],
  '/brand/web/hero-signature-mobile.webp':['public/brand/web/hero-signature-mobile.webp','image/webp'],
  '/brand/web/flow-loop.webm':['public/brand/web/flow-loop.webm','video/webm'],
  '/brand/web/flow-loop.mp4':['public/brand/web/flow-loop.mp4','video/mp4'],
  '/brand/web/flow-loop-poster.webp':['public/brand/web/flow-loop-poster.webp','image/webp'],
  '/brand/web/workspace-atmosphere-desktop.webp':['public/brand/web/workspace-atmosphere-desktop.webp','image/webp'],
  '/brand/web/workspace-atmosphere-mobile.webp':['public/brand/web/workspace-atmosphere-mobile.webp','image/webp'],
  '/brand/web/access-panel.webp':['public/brand/web/access-panel.webp','image/webp'],
  '/brand/web/og.webp':['public/brand/web/og.webp','image/webp']
} satisfies Record<string,[string,string]>;
// Client-side views of the single page; the server always returns the same document.
const views=new Set(['/','/login','/request-access','/workspace']);
export function assetPath(path:string):keyof typeof runtimeAssets|undefined {
  const key=views.has(path)?'/':path;
  return Object.hasOwn(runtimeAssets,key)?key as keyof typeof runtimeAssets:undefined;
}
// Files are immutable for the life of a release: read once, keep in memory with a strong validator.
const cache=new Map<string,{content:Buffer;type:string;etag:string}>();
export function loadAsset(path:string):{content:Buffer;type:string;etag:string}|undefined {
  const key=assetPath(path);if(!key)return undefined;
  let entry=cache.get(key);
  if(!entry){const [file,type]=runtimeAssets[key],content=readFileSync(file);entry={content,type,etag:`"${createHash('sha256').update(content).digest('base64url').slice(0,27)}"`};cache.set(key,entry);}
  return entry;
}
