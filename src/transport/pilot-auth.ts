import * as oidc from 'openid-client';
import { and,eq,gt,lt } from 'drizzle-orm';
import type { IncomingMessage,ServerResponse } from 'node:http';
import type { Database } from '../persistence/database.js';
import { loginFlows } from '../persistence/schema.js';
import { hash } from '../application/engine.js';
import { PilotAccess } from '../application/pilot-access.js';
import { AppError } from '../domain/contracts.js';
export interface PilotBoundary {
  origin:string;
  handle(req:IncomingMessage,res:ServerResponse,url:URL):Promise<boolean>;
  authorize(token:string):Promise<unknown>;
  logout(token:string):Promise<void>;
  feedback(token:string,input:Record<string,unknown>):Promise<unknown>;
}
export class PilotAuth implements PilotBoundary {
  private access:PilotAccess;
  constructor(private db:Database,private config:oidc.Configuration,readonly origin:string){this.access=new PilotAccess(db,config.serverMetadata().issuer);}
  authorize(token:string){return this.access.authorize(token);}
  logout(token:string){return this.access.logout(token);}
  feedback(token:string,input:Record<string,unknown>){return this.access.saveFeedback(token,input);}
  async handle(req:IncomingMessage,res:ServerResponse,url:URL){
    if(req.method!=='GET'||!['/auth/login','/auth/callback'].includes(url.pathname))return false;
    const redirect_uri=this.origin+'/auth/callback';
    if(url.pathname==='/auth/login'){
      const state=oidc.randomState(),verifier=oidc.randomPKCECodeVerifier(),nonce=oidc.randomNonce();
      await this.db.delete(loginFlows).where(lt(loginFlows.expiresAt,new Date()));
      await this.db.insert(loginFlows).values({stateHash:hash(state),verifier,nonce,expiresAt:new Date(Date.now()+600000)});
      const target=oidc.buildAuthorizationUrl(this.config,{redirect_uri,scope:'openid',state,nonce,code_challenge:await oidc.calculatePKCECodeChallenge(verifier),code_challenge_method:'S256',prompt:'login'});
      res.setHeader('Set-Cookie',`__Host-brandopolis_flow=${state}; Secure; HttpOnly; SameSite=Lax; Path=/; Max-Age=600`);
      res.writeHead(302,{Location:target.href});res.end();return true;
    }
    const state=req.headers.cookie?.split(';').map(c=>c.trim()).find(c=>c.startsWith('__Host-brandopolis_flow='))?.split('=')[1];
    if(!state||state!==url.searchParams.get('state'))throw new AppError('UNAUTHORIZED','Login unavailable');
    const [flow]=await this.db.delete(loginFlows).where(and(eq(loginFlows.stateHash,hash(state)),gt(loginFlows.expiresAt,new Date()))).returning();
    if(!flow)throw new AppError('UNAUTHORIZED','Login expired');
    try {
      const tokens=await oidc.authorizationCodeGrant(this.config,url,{pkceCodeVerifier:flow.verifier,expectedState:state,expectedNonce:flow.nonce,idTokenExpected:true});
      const claims=tokens.claims();if(!claims?.sub)throw new Error('Missing subject');
      const session=await this.access.issueSession(claims.sub);
      res.setHeader('Set-Cookie',[`__Host-brandopolis_session=${session.token}; Secure; HttpOnly; SameSite=Strict; Path=/; Max-Age=${Math.max(0,Math.floor((session.expiresAt.getTime()-Date.now())/1000))}`,'__Host-brandopolis_flow=; Secure; HttpOnly; SameSite=Lax; Path=/; Max-Age=0']);
      res.writeHead(302,{Location:'/'});res.end();return true;
    }catch{throw new AppError('UNAUTHORIZED','Login unavailable');}
  }
}
export async function pilotAuth(db:Database,origin:string){
  const issuer=process.env.OIDC_ISSUER,clientId=process.env.OIDC_CLIENT_ID,secret=process.env.OIDC_CLIENT_SECRET;
  if(!issuer||new URL(issuer).protocol!=='https:'||!clientId||!secret)throw new Error('Configure OIDC_ISSUER HTTPS, OIDC_CLIENT_ID and OIDC_CLIENT_SECRET server-side.');
  const config=await oidc.discovery(new URL(issuer),clientId,secret,undefined,{timeout:10});
  return new PilotAuth(db,config,origin);
}
