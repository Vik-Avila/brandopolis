// Static assets served by both DEMO and PILOT. Paths are relative to the repository root (process cwd).
export const runtimeAssets={
  '/':['src/transport/public/index.html','text/html; charset=utf-8'],
  '/app.js':['src/transport/public/app.js','text/javascript; charset=utf-8'],
  '/style.css':['src/transport/public/style.css','text/css; charset=utf-8'],
  '/brand/logo.svg':['public/brand/logo/brandopolis-logo-horizontal.svg','image/svg+xml'],
  '/brand/symbol.svg':['public/brand/symbols/brandopolis-symbol.svg','image/svg+xml'],
  '/brand/flow.webp':['public/brand/flow/brand-flow-light.webp','image/webp'],
  '/tokens.css':['design/brandopolis-ui/tokens/brandopolis.tokens.css','text/css; charset=utf-8']
} satisfies Record<string,[string,string]>;
