import * as oidc from 'openid-client';
import { and,eq,gt,lt } from 'drizzle-orm';
import type { IncomingMessage,ServerResponse } from 'node:http';
import type { Database } from '../persistence/database.js';
import { loginFlows } from '../persistence/schema.js';
import { hash } from '../application/engine.js';
import { PilotAccess } from '../application/pilot-access.js';
import type { Limiter } from './http.js';
export interface PilotBoundary {
  origin:string;
  trustProxy?:boolean;
  requestAccessUrl?:string|null;
  limiter?:Limiter;
  handle(req:IncomingMessage,res:ServerResponse,url:URL):Promise<boolean>;
  authorize(token:string):Promise<unknown>;
  logout(token:string):Promise<void>;
  feedback(token:string,input:Record<string,unknown>):Promise<unknown>;
}
export interface PilotAuthOptions {redirectUri?:string;trustProxy?:boolean;requestAccessUrl?:string|null;limiter?:Limiter}
/** Operator-facing configuration error; messages never include secret values. */
export class ConfigError extends Error {}
const FLOW='__Host-brandopolis_flow',SESSION='__Host-brandopolis_session';
// Provider-neutral OIDC Authorization Code + PKCE + state + nonce. openid-client validates the ID token
// signature (JWKS), issuer, audience, expiry and nonce; identity is keyed by (issuer, subject), never email.
export class PilotAuth implements PilotBoundary {
  private access:PilotAccess;
  readonly redirectUri:string;readonly trustProxy:boolean;readonly requestAccessUrl:string|null;readonly limiter?:Limiter;
  constructor(private db:Database,private config:oidc.Configuration,readonly origin:string,options:PilotAuthOptions={}){
    this.access=new PilotAccess(db,config.serverMetadata().issuer);
    this.redirectUri=options.redirectUri??origin+'/auth/callback';this.trustProxy=options.trustProxy??false;this.requestAccessUrl=options.requestAccessUrl??null;this.limiter=options.limiter;
    if(new URL(this.redirectUri).origin!==origin||new URL(this.redirectUri).pathname!=='/auth/callback')throw new ConfigError('OIDC_REDIRECT_URI must be PILOT_ORIGIN/auth/callback');
  }
  authorize(token:string){return this.access.authorize(token);}
  logout(token:string){return this.access.logout(token);}
  feedback(token:string,input:Record<string,unknown>){return this.access.saveFeedback(token,input);}
  private fail(res:ServerResponse,reason:'denied'|'expired'|'failed'){
    res.setHeader('Set-Cookie',`${FLOW}=; Secure; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
    res.writeHead(302,{Location:'/?login='+reason});res.end();return true;
  }
  async handle(req:IncomingMessage,res:ServerResponse,url:URL){
    if(req.method!=='GET'||!['/auth/login','/auth/callback'].includes(url.pathname))return false;
    if(url.pathname==='/auth/login'){
      const state=oidc.randomState(),verifier=oidc.randomPKCECodeVerifier(),nonce=oidc.randomNonce();
      await this.db.delete(loginFlows).where(lt(loginFlows.expiresAt,new Date()));
      await this.db.insert(loginFlows).values({stateHash:hash(state),verifier,nonce,expiresAt:new Date(Date.now()+600000)});
      const target=oidc.buildAuthorizationUrl(this.config,{redirect_uri:this.redirectUri,scope:'openid',state,nonce,code_challenge:await oidc.calculatePKCECodeChallenge(verifier),code_challenge_method:'S256',prompt:'login'});
      res.setHeader('Set-Cookie',`${FLOW}=${state}; Secure; HttpOnly; SameSite=Lax; Path=/; Max-Age=600`);
      res.writeHead(302,{Location:target.href});res.end();return true;
    }
    const state=req.headers.cookie?.split(';').map(c=>c.trim()).find(c=>c.startsWith(FLOW+'='))?.slice(FLOW.length+1);
    if(!state||state!==url.searchParams.get('state'))return this.fail(res,'failed');
    // Single use: the flow row is consumed before the code exchange, so a replayed callback always fails.
    const [flow]=await this.db.delete(loginFlows).where(and(eq(loginFlows.stateHash,hash(state)),gt(loginFlows.expiresAt,new Date()))).returning();
    if(!flow)return this.fail(res,'expired');
    let subject:string;
    try {
      const tokens=await oidc.authorizationCodeGrant(this.config,url,{pkceCodeVerifier:flow.verifier,expectedState:state,expectedNonce:flow.nonce,idTokenExpected:true});
      const claims=tokens.claims();if(!claims?.sub)return this.fail(res,'failed');subject=claims.sub;
    } catch {return this.fail(res,'failed');}
    let session:{token:string;expiresAt:Date};
    try {session=await this.access.issueSession(subject);} catch {return this.fail(res,'denied');}
    res.setHeader('Set-Cookie',[`${SESSION}=${session.token}; Secure; HttpOnly; SameSite=Strict; Path=/; Max-Age=${Math.max(0,Math.floor((session.expiresAt.getTime()-Date.now())/1000))}`,`${FLOW}=; Secure; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`]);
    res.writeHead(302,{Location:'/'});res.end();return true;
  }
}
export function oidcSettings(env:NodeJS.ProcessEnv=process.env){
  const issuer=env.OIDC_ISSUER,clientId=env.OIDC_CLIENT_ID,secret=env.OIDC_CLIENT_SECRET||undefined;
  if(!issuer||new URL(issuer).protocol!=='https:'||!clientId)throw new ConfigError('Configure OIDC_ISSUER (HTTPS) and OIDC_CLIENT_ID server-side.');
  if(!secret&&env.OIDC_PUBLIC_CLIENT!=='true')throw new ConfigError('Set OIDC_CLIENT_SECRET, or OIDC_PUBLIC_CLIENT=true for a PKCE public client.');
  return {issuer:new URL(issuer),clientId,secret,redirectUri:env.OIDC_REDIRECT_URI||undefined};
}
export async function pilotAuth(db:Database,origin:string,options:Omit<PilotAuthOptions,'redirectUri'>={}){
  const s=oidcSettings();
  const config=await oidc.discovery(s.issuer,s.clientId,s.secret,s.secret?undefined:oidc.None(),{timeout:10});
  return new PilotAuth(db,config,origin,{...options,redirectUri:s.redirectUri});
}
