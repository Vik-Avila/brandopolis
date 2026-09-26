import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Check } from './pilot-preflight.js';
// Post-deploy smoke against the public origin. Unauthenticated and read-only: it proves the release is up,
// hardened and wired to the identity provider. Tester login is then verified by a person (runbook step).
export async function launchSmoke(base:string,expected:{origin:string;issuerHost?:string}):Promise<Check[]> {
  const checks:Check[]=[],add=(name:string,ok:boolean,detail:string)=>checks.push({name,status:ok?'PASS':'FAIL',detail});
  const get=(path:string,init:RequestInit={})=>fetch(base+path,{redirect:'manual',signal:AbortSignal.timeout(10000),...init});
  const health=await get('/health');const h=await health.json().catch(()=>null);
  add('health',health.status===200&&h?.application==='brandopolis-pilot'&&h?.status==='ready',`GET /health → ${health.status} ${h?.application??''} ${h?.status??''}`);
  const mode=await (await get('/api/mode')).json().catch(()=>null);
  add('mode',mode?.mode==='PILOT',`mode ${mode?.mode}; request access ${mode?.requestAccessUrl?'configured':'not configured'}; AI notice ${mode?.aiNotice?.version??'none (AI disabled)'}`);
  const home=await get('/');const headers=home.headers;
  add('headers',home.status===200&&/max-age=\d+/.test(headers.get('strict-transport-security')??'')&&(headers.get('content-security-policy')??'').includes("frame-ancestors 'none'")&&headers.get('x-content-type-options')==='nosniff',`HSTS ${headers.get('strict-transport-security')?'yes':'no'}, CSP ${headers.get('content-security-policy')?'yes':'no'}`);
  const login=await get('/auth/login'),target=login.headers.get('location');let authorize:URL|null=null;try{authorize=target?new URL(target):null;}catch{authorize=null;}
  const flow=login.headers.getSetCookie().find(c=>c.startsWith('__Host-brandopolis_flow='))??'';
  add('oidc-login',login.status===302&&Boolean(authorize)&&authorize!.searchParams.get('redirect_uri')===expected.origin+'/auth/callback'&&authorize!.searchParams.get('code_challenge_method')==='S256'&&Boolean(authorize!.searchParams.get('state'))&&Boolean(authorize!.searchParams.get('nonce'))&&(!expected.issuerHost||authorize!.host===expected.issuerHost),
    `redirect to ${authorize?.host??'nowhere'}; callback ${authorize?.searchParams.get('redirect_uri')??'missing'}; PKCE ${authorize?.searchParams.get('code_challenge_method')??'missing'}`);
  add('flow-cookie',/Secure/.test(flow)&&/HttpOnly/.test(flow),'login flow cookie __Host-, Secure, HttpOnly');
  const anonymous=await get('/api/brands');add('auth-required',anonymous.status===401,`GET /api/brands without session → ${anonymous.status}`);
  const csrf=await get('/api/brands',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://attacker.invalid'},body:'{}'});
  add('csrf',csrf.status===403,`cross-origin POST → ${csrf.status}`);
  const demo=await get('/api/session',{method:'POST',headers:{'Content-Type':'application/json',Origin:expected.origin},body:JSON.stringify({token:'x'})});
  add('demo-disabled',demo.status===401||demo.status===403,`DEMO token login → ${demo.status}`);
  return checks;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  const origin=process.env.PILOT_ORIGIN?.trim(),issuer=process.env.OIDC_ISSUER?.trim();
  if(!origin){console.error('Set PILOT_ORIGIN to the deployed https origin.');process.exitCode=1;}
  else {
    const checks=await launchSmoke(new URL(origin).origin,{origin:new URL(origin).origin}).catch(()=>[{name:'smoke',status:'FAIL' as const,detail:`${origin} unreachable.`}]);
    for(const c of checks)console.log(`${c.status.padEnd(4)} ${c.name.padEnd(14)} ${c.detail}`);
    const failed=checks.some(c=>c.status==='FAIL');
    console.log(failed?'LAUNCH SMOKE FAILED':`LAUNCH SMOKE PASSED. Next: a provisioned tester logs in via ${issuer?new URL(issuer).host:'the OIDC provider'} and creates a Brand (runbook §Release).`);
    process.exitCode=failed?1:0;
  }
}
