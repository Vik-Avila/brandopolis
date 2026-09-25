import { ConfigError } from '../src/transport/pilot-auth.js';
// Single source of PILOT configuration rules. Used by pilot:validate-config, pilot:preflight, pilot:start,
// pilot:migrate, pilot:operator and pilot:backup. Messages name variables, never their secret values.
export interface PilotSettings {
  databaseUrl:string;origin:string;port:number;bindHost:string;trustProxy:boolean;requestAccessUrl:string|null;
  oidc:{issuer:string;clientId:string;confidential:boolean;redirectUri:string};
  ai:{enabled:boolean;model:string|null;timeoutMs:number;dailyCapPerTester:number;dailyCapTotal:number;noticeFile:string};
}
const localHost=(host:string)=>/^(localhost|127\.|0\.0\.0\.0|\[?::1\]?$|.*\.local$|.*\.localhost$)/i.test(host);
const placeholder=(host:string)=>/(^|\.)example\.(com|org|net)$/i.test(host);
function parse(value:string|undefined,name:string,errors:string[]):URL|null {
  if(!value?.trim()){errors.push(`${name} is required.`);return null;}
  try{return new URL(value.trim());}catch{errors.push(`${name} is not a valid URL.`);return null;}
}
function integer(env:NodeJS.ProcessEnv,name:string,fallback:number,min:number,max:number,errors:string[]) {
  const raw=env[name]?.trim();if(!raw)return fallback;
  const n=Number(raw);if(!Number.isInteger(n)||n<min||n>max){errors.push(`${name} must be an integer between ${min} and ${max}.`);return fallback;}
  return n;
}
export function validatePilotEnv(env:NodeJS.ProcessEnv=process.env):{errors:string[];warnings:string[];settings:PilotSettings|null} {
  const errors:string[]=[],warnings:string[]=[];
  // Local HTTPS rehearsals may use loopback origins; Internet mode never does.
  const rehearsal=env.PILOT_LOCAL_REHEARSAL==='true';
  if(env.PILOT_DATA_CLASS!=='PILOT')errors.push('PILOT_DATA_CLASS must be PILOT (dedicated PILOT database).');
  if(env.NODE_ENV==='production')warnings.push('NODE_ENV=production is ignored: PILOT is not production.');
  const db=parse(env.DATABASE_URL,'DATABASE_URL',errors);
  if(db&&!['postgres:','postgresql:'].includes(db.protocol))errors.push('DATABASE_URL must use postgres:// or postgresql://.');
  if(db&&!rehearsal&&localHost(db.hostname)&&!db.searchParams.get('sslmode'))warnings.push('DATABASE_URL points to a local host; confirm this is the dedicated PILOT database.');
  if(db&&!localHost(db.hostname)&&!['require','verify-ca','verify-full'].includes(db.searchParams.get('sslmode')??''))warnings.push('DATABASE_URL has no sslmode=require|verify-ca|verify-full; confirm the network path to PostgreSQL is private or encrypted.');
  const origin=parse(env.PILOT_ORIGIN,'PILOT_ORIGIN',errors);
  if(origin){
    if(origin.protocol!=='https:')errors.push('PILOT_ORIGIN must use https://.');
    if(origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash)errors.push('PILOT_ORIGIN must be a bare origin (no path, query, fragment or credentials).');
    if(!rehearsal&&localHost(origin.hostname))errors.push('PILOT_ORIGIN must be the public HTTPS host, not a local address (set PILOT_LOCAL_REHEARSAL=true only for local rehearsals).');
    if(placeholder(origin.hostname))errors.push('PILOT_ORIGIN still uses an example.* placeholder domain.');
  }
  const issuer=parse(env.OIDC_ISSUER,'OIDC_ISSUER',errors);
  if(issuer&&issuer.protocol!=='https:')errors.push('OIDC_ISSUER must use https://.');
  if(issuer&&placeholder(issuer.hostname))errors.push('OIDC_ISSUER still uses an example.* placeholder domain.');
  const clientId=env.OIDC_CLIENT_ID?.trim()??'';if(!clientId)errors.push('OIDC_CLIENT_ID is required.');
  const confidential=Boolean(env.OIDC_CLIENT_SECRET?.trim());
  if(!confidential&&env.OIDC_PUBLIC_CLIENT!=='true')errors.push('Set OIDC_CLIENT_SECRET (confidential client) or OIDC_PUBLIC_CLIENT=true (public PKCE client).');
  if(confidential&&env.OIDC_PUBLIC_CLIENT==='true')errors.push('OIDC_CLIENT_SECRET and OIDC_PUBLIC_CLIENT=true are mutually exclusive.');
  const callback=origin?`${origin.origin}/auth/callback`:'';
  if(env.OIDC_REDIRECT_URI?.trim()&&env.OIDC_REDIRECT_URI.trim()!==callback)errors.push('OIDC_REDIRECT_URI must equal PILOT_ORIGIN + /auth/callback.');
  const port=integer(env,'PORT',3000,1,65535,errors);
  if(!['','true','false'].includes(env.TRUST_PROXY??''))errors.push('TRUST_PROXY must be true or false.');
  let requestAccessUrl:string|null=env.PILOT_REQUEST_ACCESS_URL?.trim()||null;
  if(requestAccessUrl){
    try{const u=new URL(requestAccessUrl);
      if(!['https:','mailto:'].includes(u.protocol))errors.push('PILOT_REQUEST_ACCESS_URL must be https: or mailto:.');
      else if(placeholder(u.protocol==='mailto:'?u.pathname.split('@')[1]??'':u.hostname))errors.push('PILOT_REQUEST_ACCESS_URL still uses an example.* placeholder.');
    }catch{errors.push('PILOT_REQUEST_ACCESS_URL is not a valid URL.');requestAccessUrl=null;}
  } else warnings.push('PILOT_REQUEST_ACCESS_URL not set: the gateway asks visitors to contact the organizer.');
  const key=Boolean(env.ANTHROPIC_API_KEY?.trim()),model=env.ANTHROPIC_MODEL?.trim()||null;
  if(key!==Boolean(model))errors.push('Set both ANTHROPIC_API_KEY and ANTHROPIC_MODEL to enable AI, or neither to run PILOT without AI.');
  if(!key&&!model)warnings.push('AI disabled: testers can decide without proposals.');
  const ai={enabled:key&&Boolean(model),model,timeoutMs:integer(env,'AI_TIMEOUT_MS',30000,1000,120000,errors),dailyCapPerTester:integer(env,'PILOT_AI_DAILY_CAP_PER_TESTER',30,0,1000,errors),dailyCapTotal:integer(env,'PILOT_AI_DAILY_CAP_TOTAL',300,0,100000,errors),noticeFile:env.PILOT_AI_NOTICE_FILE?.trim()||'config/pilot/ai-notice.v1.md'};
  if(errors.length||!db||!origin||!issuer)return {errors,warnings,settings:null};
  return {errors,warnings,settings:{databaseUrl:env.DATABASE_URL!.trim(),origin:origin.origin,port,bindHost:env.BIND_HOST?.trim()||'127.0.0.1',trustProxy:env.TRUST_PROXY==='true',requestAccessUrl,
    oidc:{issuer:env.OIDC_ISSUER!.trim(),clientId,confidential,redirectUri:callback},ai}};
}
export function pilotConfig(env:NodeJS.ProcessEnv=process.env):PilotSettings {
  const {errors,settings}=validatePilotEnv(env);
  if(!settings)throw new ConfigError('PILOT configuration invalid:\n- '+errors.join('\n- '));
  return settings;
}
