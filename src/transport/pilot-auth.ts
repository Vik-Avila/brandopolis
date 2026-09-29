import * as oidc from 'openid-client';
import { readFileSync } from 'node:fs';
import { and,eq,gt,lt } from 'drizzle-orm';
import type { IncomingMessage,ServerResponse } from 'node:http';
import type { Database } from '../persistence/database.js';
import { loginFlows } from '../persistence/schema.js';
import { hash } from '../application/engine.js';
import { ACCESS_STATUS,PilotAccess,type AccessStatus,type GeographicInfluence,type VerifiedClaims } from '../application/pilot-access.js';
import { PilotAdmin,evidenceCsv } from '../application/pilot-admin.js';
import { AppError } from '../domain/contracts.js';
import { createHash } from 'node:crypto';
import type { Limiter } from './http.js';
export interface PilotBoundary {
  origin:string;
  trustProxy?:boolean;
  requestAccessUrl?:string|null;
  limiter?:Limiter;
  ai?:PilotAiPolicy;
  aiGate?(token:string):Promise<'OK'|'CONSENT_REQUIRED'|'CAP_REACHED'>;
  acceptAiNotice?(token:string,version:string):Promise<unknown>;
  handle(req:IncomingMessage,res:ServerResponse,url:URL):Promise<boolean>;
  authorize(token:string):Promise<unknown>;
  logout(token:string):Promise<void>;
  feedback(token:string,input:Record<string,unknown>):Promise<unknown>;
  intakeRequired?(token:string):Promise<boolean>;
  isAdmin?(token:string):Promise<boolean>;
  adminSummary?(token:string):Promise<unknown>;
  adminParticipants?(token:string):Promise<unknown>;
  adminEvidence?(token:string,range?:{from?:Date;to?:Date}):Promise<unknown>;
  adminEvidenceCsv?(token:string,range?:{from?:Date;to?:Date}):Promise<string>;
  adminFeedback?(token:string):Promise<unknown>;
  adminSetAccessStatus?(token:string,userId:string,status:AccessStatus):Promise<unknown>;
  participantProfile?(token:string):Promise<unknown>;
  saveParticipantProfile?(token:string,input:Record<string,unknown>):Promise<unknown>;
  setBrandGeography?(token:string,brandId:string,influence:GeographicInfluence,primaryMarket?:string|null):Promise<unknown>;
}
/** notice is null when AI is disabled (nothing is sent to a provider, so no acknowledgement is needed). */
export interface PilotAiPolicy {notice:{version:string;text:string}|null;capPerTester:number;capTotal:number}
export interface PilotAuthOptions {redirectUri?:string;trustProxy?:boolean;requestAccessUrl?:string|null;limiter?:Limiter;ai?:PilotAiPolicy;autoProvision?:boolean;defaultAccessStatus?:AccessStatus}
/** Operator-facing configuration error; messages never include secret values. */
export class ConfigError extends Error {}
const FLOW='__Host-brandopolis_flow',SESSION='__Host-brandopolis_session';
// Provider-neutral OIDC Authorization Code + PKCE + state + nonce. openid-client validates the ID token
// signature (JWKS), issuer, audience, expiry and nonce; identity is keyed by (issuer, subject), never email.
export class PilotAuth implements PilotBoundary {
  private access:PilotAccess;
  private admin:PilotAdmin;
  readonly redirectUri:string;readonly trustProxy:boolean;readonly requestAccessUrl:string|null;readonly limiter?:Limiter;readonly ai?:PilotAiPolicy;readonly autoProvision:boolean;readonly defaultAccessStatus:AccessStatus;
  constructor(private db:Database,private config:oidc.Configuration,readonly origin:string,options:PilotAuthOptions={}){
    this.access=new PilotAccess(db,config.serverMetadata().issuer);
    this.admin=new PilotAdmin(db,this.access);
    this.redirectUri=options.redirectUri??origin+'/auth/callback';this.trustProxy=options.trustProxy??false;this.requestAccessUrl=options.requestAccessUrl??null;this.limiter=options.limiter;this.ai=options.ai;this.autoProvision=options.autoProvision??false;this.defaultAccessStatus=options.defaultAccessStatus??ACCESS_STATUS.approved;
    if(new URL(this.redirectUri).origin!==origin||new URL(this.redirectUri).pathname!=='/auth/callback')throw new ConfigError('OIDC_REDIRECT_URI must be PILOT_ORIGIN/auth/callback');
  }
  authorize(token:string){return this.access.authorize(token);}
  logout(token:string){return this.access.logout(token);}
  feedback(token:string,input:Record<string,unknown>){return this.access.saveFeedback(token,input);}
  intakeRequired(token:string){return this.access.intakeRequired(token);}
  isAdmin(token:string){return this.admin.isAdmin(token);}
  async adminSummary(token:string){await this.admin.authorizeAdmin(token);return this.admin.summary();}
  async adminParticipants(token:string){await this.admin.authorizeAdmin(token);return this.admin.participants();}
  async adminEvidence(token:string,range?:{from?:Date;to?:Date}){await this.admin.authorizeAdmin(token);return this.admin.evidence(range);}
  async adminEvidenceCsv(token:string,range?:{from?:Date;to?:Date}){await this.admin.authorizeAdmin(token);return evidenceCsv(await this.admin.evidence(range));}
  async adminFeedback(token:string){await this.admin.authorizeAdmin(token);return this.admin.feedback();}
  adminSetAccessStatus(token:string,userId:string,status:AccessStatus){return this.admin.setAccessStatus(token,userId,status);}
  participantProfile(token:string){return this.access.participantProfile(token);}
  saveParticipantProfile(token:string,input:Record<string,unknown>){return this.access.saveParticipantProfile(token,input);}
  setBrandGeography(token:string,brandId:string,influence:GeographicInfluence,primaryMarket?:string|null){return this.access.setBrandGeography(token,brandId,influence,primaryMarket);}
  async aiGate(token:string){return this.ai?this.access.aiGate(token,{noticeVersion:this.ai.notice?.version??null,capPerTester:this.ai.capPerTester,capTotal:this.ai.capTotal}):'OK' as const;}
  acceptAiNotice(token:string,version:string){
    if(!this.ai?.notice||version!==this.ai.notice.version)throw new AppError('CONFLICT','Notice changed; reload');
    return this.access.acceptAiNotice(token,version);
  }
  private fail(res:ServerResponse,reason:'denied'|'expired'|'failed'){
    // Category only: never the code, state, tokens or the identity's subject.
    console.log(JSON.stringify({event:'auth_failure',reason}));
    res.setHeader('Set-Cookie',`${FLOW}=; Secure; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
    res.writeHead(302,{Location:'/?login='+reason});res.end();return true;
  }
  async handle(req:IncomingMessage,res:ServerResponse,url:URL){
    if(req.method!=='GET'||!['/auth/login','/auth/callback'].includes(url.pathname))return false;
    if(url.pathname==='/auth/login'){
      const state=oidc.randomState(),verifier=oidc.randomPKCECodeVerifier(),nonce=oidc.randomNonce();
      await this.db.delete(loginFlows).where(lt(loginFlows.expiresAt,new Date()));
      await this.db.insert(loginFlows).values({stateHash:hash(state),verifier,nonce,expiresAt:new Date(Date.now()+600000)});
      const target=oidc.buildAuthorizationUrl(this.config,{redirect_uri:this.redirectUri,scope:'openid email profile',state,nonce,code_challenge:await oidc.calculatePKCECodeChallenge(verifier),code_challenge_method:'S256',prompt:'login'});
      res.setHeader('Set-Cookie',`${FLOW}=${state}; Secure; HttpOnly; SameSite=Lax; Path=/; Max-Age=600`);
      res.writeHead(302,{Location:target.href});res.end();return true;
    }
    const state=req.headers.cookie?.split(';').map(c=>c.trim()).find(c=>c.startsWith(FLOW+'='))?.slice(FLOW.length+1);
    if(!state||state!==url.searchParams.get('state'))return this.fail(res,'failed');
    // Single use: the flow row is consumed before the code exchange, so a replayed callback always fails.
    const [flow]=await this.db.delete(loginFlows).where(and(eq(loginFlows.stateHash,hash(state)),gt(loginFlows.expiresAt,new Date()))).returning();
    if(!flow)return this.fail(res,'expired');
    let subject:string,verified:VerifiedClaims;
    try {
      const tokens=await oidc.authorizationCodeGrant(this.config,url,{pkceCodeVerifier:flow.verifier,expectedState:state,expectedNonce:flow.nonce,idTokenExpected:true});
      const claims=tokens.claims();if(!claims?.sub)return this.fail(res,'failed');subject=claims.sub;
      verified={subject,email:typeof claims.email==='string'?claims.email:undefined,emailVerified:claims.email_verified===true,
        displayName:typeof claims.name==='string'?claims.name:null,avatarUrl:typeof claims.picture==='string'?claims.picture:null};
    } catch {return this.fail(res,'failed');}
    let session:{token:string;expiresAt:Date};
    try {
      // Recognise (or, when enabled, provision) before a session exists: an unknown or unverified
      // identity never reaches issueSession.
      await this.access.recognise(verified,this.autoProvision,this.defaultAccessStatus);
      session=await this.access.issueSession(subject);
      // Each participant gets their own CoffeePolis sandbox on first entry. Seeding must never block a
      // sign-in, so a failure here is logged by category and the session still stands.
      try{await this.access.ensureDemoBrand(session.token);}catch{console.log(JSON.stringify({event:'demo_seed_failed'}));}
    } catch {return this.fail(res,'denied');}
    res.setHeader('Set-Cookie',[`${SESSION}=${session.token}; Secure; HttpOnly; SameSite=Strict; Path=/; Max-Age=${Math.max(0,Math.floor((session.expiresAt.getTime()-Date.now())/1000))}`,`${FLOW}=; Secure; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`]);
    res.writeHead(302,{Location:'/?login=ok'});res.end();return true;
  }
}
export function oidcSettings(env:NodeJS.ProcessEnv=process.env){
  const issuer=env.OIDC_ISSUER,clientId=env.OIDC_CLIENT_ID,secret=env.OIDC_CLIENT_SECRET||undefined;
  if(!issuer||new URL(issuer).protocol!=='https:'||!clientId)throw new ConfigError('Configure OIDC_ISSUER (HTTPS) and OIDC_CLIENT_ID server-side.');
  if(!secret&&env.OIDC_PUBLIC_CLIENT!=='true')throw new ConfigError('Set OIDC_CLIENT_SECRET, or OIDC_PUBLIC_CLIENT=true for a PKCE public client.');
  return {issuer:new URL(issuer),clientId,secret,redirectUri:env.OIDC_REDIRECT_URI||undefined};
}
// Testers are bound to the issuer exactly as the provider's discovery document states it (the ID token `iss`),
// so provisioning and login must both use this value, never the raw environment string.
export async function discoverIssuer(){
  const s=oidcSettings();
  return (await oidc.discovery(s.issuer,s.clientId,s.secret,s.secret?undefined:oidc.None(),{timeout:10})).serverMetadata().issuer;
}
export function autoProvisionEnabled(env:NodeJS.ProcessEnv=process.env){
  const raw=env.PILOT_AUTO_PROVISION?.trim();
  if(raw===undefined||raw==='')return false;
  if(!['true','false'].includes(raw))throw new ConfigError('PILOT_AUTO_PROVISION must be true or false.');
  return raw==='true';
}
/**
 * Which access status a NEW participant starts in. APPROVED for the current validation phase: every
 * authenticated participant is admitted immediately, with no manual approval step. Set PENDING for a
 * future controlled pilot; the status model already supports it, so no schema change is involved.
 * SUSPENDED is rejected here because a default of SUSPENDED would create accounts that can never sign in.
 */
export function pilotDefaultAccessStatus(env:NodeJS.ProcessEnv=process.env):AccessStatus {
  const raw=env.PILOT_DEFAULT_ACCESS_STATUS?.trim();
  if(!raw)return ACCESS_STATUS.approved;
  if(raw!==ACCESS_STATUS.approved&&raw!==ACCESS_STATUS.pending)throw new ConfigError('PILOT_DEFAULT_ACCESS_STATUS must be APPROVED or PENDING.');
  return raw;
}
export async function pilotAuth(db:Database,origin:string,options:Omit<PilotAuthOptions,'redirectUri'>={}){
  const s=oidcSettings();
  const config=await oidc.discovery(s.issuer,s.clientId,s.secret,s.secret?undefined:oidc.None(),{timeout:10});
  return new PilotAuth(db,config,origin,{autoProvision:autoProvisionEnabled(),defaultAccessStatus:pilotDefaultAccessStatus(),...options,redirectUri:s.redirectUri});
}
export function loadAiNotice(file:string){
  const text=readFileSync(file,'utf8').trim();
  if(!text)throw new ConfigError(`AI notice file ${file} is empty.`);
  return {version:createHash('sha256').update(text).digest('hex').slice(0,12),text};
}
