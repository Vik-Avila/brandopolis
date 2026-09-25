import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { Engine } from '../application/engine.js';
import { AppError, type CommitCommand } from '../domain/contracts.js';
import type { PilotBoundary } from './pilot-auth.js';
import { randomUUID,createHash } from 'node:crypto';

async function body(req:IncomingMessage):Promise<Record<string,unknown>> {
  if(!req.headers['content-type']?.startsWith('application/json')) throw new AppError('INVALID','JSON required');
  let content='';
  for await(const chunk of req) {content+=chunk.toString();if(Buffer.byteLength(content)>40000) throw new AppError('INVALID','Request too large');}
  try {const value=JSON.parse(content);if(!value||Array.isArray(value)||typeof value!=='object') throw new Error();return value;} catch {throw new AppError('INVALID','Invalid JSON');}
}
function string(value:unknown):string {if(typeof value!=='string'||!value) throw new AppError('INVALID','String required');return value;}
export function cookieMaxAge(expiresAt:Date,now=Date.now()) {return Math.max(0,Math.floor((expiresAt.getTime()-now)/1000));}
function send(res:ServerResponse,status:number,data:unknown) {res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data));}
// Single-node, in-memory fixed-window limiter for the PILOT process. Counters reset on restart and are
// not shared across replicas; a multi-instance deployment needs a shared limiter at the proxy or store.
export interface Limiter {allow(key:string,limit:number,windowMs:number):boolean}
export class RateLimiter implements Limiter {
  private hits=new Map<string,{start:number;count:number}>();
  constructor(private now=()=>Date.now()) {}
  allow(key:string,limit:number,windowMs:number) {
    const t=this.now(),entry=this.hits.get(key);
    if(this.hits.size>50000)for(const [k,v] of this.hits)if(t-v.start>3600000)this.hits.delete(k);
    if(!entry||t-entry.start>=windowMs){this.hits.set(key,{start:t,count:1});return true;}
    return ++entry.count<=limit;
  }
}
export const pilotLimits={all:[600,60000],auth:[20,60000],ai:[20,600000],feedback:[20,600000]} as const;
export function createApp(engine:Engine,assets?:(path:string)=>{content:string|Buffer;type:string}|undefined,health?:()=>Promise<string>,pilot?:PilotBoundary) {
  const limiter=pilot?.limiter??new RateLimiter();
  return createServer(async(req,res)=>{
    const requestId=randomUUID();
    const limited=(key:string,[limit,windowMs]:readonly [number,number])=>{if(limiter.allow(key,limit,windowMs))return false;res.setHeader('Retry-After',String(Math.ceil(windowMs/1000)));send(res,429,{code:'RATE_LIMITED',message:'Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.'});return true;};
    // Structured access log without paths, query strings, cookies or bodies (they may carry identifiers or strategy text).
    if(pilot){res.setHeader('X-Request-Id',requestId);res.once('finish',()=>console.log(JSON.stringify({event:'http_request',requestId,status:res.statusCode,method:req.method})));}
    res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    try {
      // Loopback Host allowlist also prevents DNS rebinding against the local demo.
      if(pilot){
        if(req.headers.host!==new URL(pilot.origin).host)throw new AppError('FORBIDDEN','Host not allowed');
        res.setHeader('Strict-Transport-Security','max-age=31536000');
        const forwarded=pilot.trustProxy?String(req.headers['x-forwarded-for']??'').split(',').map(v=>v.trim()).filter(Boolean).at(-1):undefined;
        const client=forwarded??req.socket.remoteAddress??'unknown';
        if(limited('all:'+client,pilotLimits.all))return;
        if(req.url?.startsWith('/auth/')&&limited('auth:'+client,pilotLimits.auth))return;
      }else if(!/^127\.0\.0\.1:\d+$/.test(req.headers.host??'')) throw new AppError('FORBIDDEN','Loopback host required');
      const url=new URL(req.url??'/',pilot?.origin??`http://${req.headers.host}`),path=url.pathname;
      if(pilot&&url.origin!==pilot.origin)throw new AppError('FORBIDDEN','Origin not allowed');
      if(pilot&&await pilot.handle(req,res,url))return;
      if(req.method==='GET'&&path==='/api/mode')return send(res,200,{mode:pilot?'PILOT':'DEMO',requestAccessUrl:pilot?.requestAccessUrl??null});
      if(req.method==='GET'&&path==='/health') {
        const ready=health?await health():'UNAVAILABLE';return send(res,ready==='READY'?200:503,{application:pilot?'brandopolis-pilot':'brandopolis-competition',protocol:pilot?'pilot-v1':'rc1',status:ready==='READY'?'ready':'unavailable'});
      }
      if(req.method==='GET'&&!path.startsWith('/api/')) {
        const asset=assets?.(path);if(!asset) return send(res,404,{code:'NOT_FOUND'});
        res.writeHead(200,{'Content-Type':asset.type});res.end(asset.content);return;
      }
      const bearer=req.headers.authorization?.startsWith('Bearer ')?req.headers.authorization.slice(7):undefined;
      const cookieName=pilot?'__Host-brandopolis_session':'brandopolis_session';
      const cookie=req.headers.cookie?.split(';').map(v=>v.trim()).find(v=>v.startsWith(cookieName+'='))?.slice(cookieName.length+1);
      const token=(pilot?cookie:bearer??cookie)??'';
      if(pilot){
        if(req.method==='POST'&&req.headers.origin!==pilot.origin)throw new AppError('FORBIDDEN','Same-origin action required');
        // Logout always clears the browser cookie, even for an already expired or revoked session.
        if(req.method==='POST'&&path==='/api/logout'){if(token)await pilot.logout(token);res.setHeader('Set-Cookie',`${cookieName}=; Secure; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`);return send(res,200,{authenticated:false});}
        await pilot.authorize(token);
        const subject=createHash('sha256').update(token).digest('hex');
        if(req.method==='POST'&&path==='/api/recommendations/generate'&&limited('ai:'+subject,pilotLimits.ai))return;
        if(req.method==='POST'&&path==='/api/feedback'&&limited('feedback:'+subject,pilotLimits.feedback))return;
      }
      if(req.method==='POST') {
        if(!pilot&&!bearer&&req.headers.origin!==`http://${req.headers.host}`) throw new AppError('FORBIDDEN','Same-origin human action required');
        const input=await body(req);
        if(path==='/api/session') {
          if(pilot)throw new AppError('FORBIDDEN','DEMO access disabled');
          const sessionToken=string(input.token),{expiresAt}=await engine.me(sessionToken);
          // Cookie never outlives the server-side session; the server check remains authoritative.
          res.setHeader('Set-Cookie',`brandopolis_session=${sessionToken}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${cookieMaxAge(expiresAt)}`);
          return send(res,200,{authenticated:true});
        }
        if(path==='/api/logout') {if(pilot)await pilot.logout(token);res.setHeader('Set-Cookie',`${cookieName}=; ${pilot?'Secure; ':''}HttpOnly; SameSite=Strict; Path=/; Max-Age=0`);return send(res,200,{authenticated:false});}
        if(pilot&&path==='/api/feedback')return send(res,201,await pilot.feedback(token,input));
        if(path==='/api/brands') return send(res,201,await engine.createBrand(token,string(input.name),input.initialContext===undefined?undefined:string(input.initialContext)));
        if(path==='/api/context/capture') return send(res,201,await engine.captureContext(token,string(input.brandId),string(input.kind),input.entity as Record<string,unknown>));
        if(path==='/api/context/assemble') return send(res,200,await engine.assembleContext(token,string(input.brandId),string(input.questionId),input.budget===undefined?undefined:Number(input.budget)));
        if(path==='/api/recommendations/generate') return send(res,200,await engine.analyze(token,string(input.brandId),string(input.questionId)));
        if(path==='/api/recommendations/reject') return send(res,200,await engine.rejectRecommendation(token,string(input.brandId),string(input.recommendationId),string(input.rationale)));
        if(path==='/api/learning/create') return send(res,201,await engine.createLearningObject(token,string(input.brandId),string(input.kind),input.entity as Record<string,unknown>,input.decisionId===undefined?undefined:string(input.decisionId),input.plan as {objective:string;successCriteria:string}|undefined));
        if(path==='/api/learning/transition') return send(res,200,await engine.transitionLearningObject(token,string(input.brandId),string(input.kind),string(input.objectId),string(input.expectedStatus),string(input.status)));
        if(path==='/api/questions/transition') return send(res,200,await engine.transitionQuestion(token,string(input.brandId),string(input.questionId),string(input.status)));
        if(path==='/api/questions/prepare') return send(res,200,await engine.prepareQuestion(token,string(input.brandId),string(input.questionId),input.expectedActiveVersion===null?null:string(input.expectedActiveVersion)));
        if(path==='/api/decisions/commit') return send(res,200,await engine.commitDecision(token,input.command as CommitCommand,input.reviewToken===undefined?undefined:string(input.reviewToken)));
        if(path==='/api/reviews/start') return send(res,200,await engine.beginReview(token,string(input.brandId),string(input.decisionId)));
        if(path==='/api/impacts/retry') return send(res,200,await engine.retryImpact(token,string(input.brandId)));
        if(path==='/api/impacts/shown') return send(res,200,await engine.showImpact(token,string(input.brandId)));
      }
      if(req.method==='GET') {
        if(path==='/api/me') return send(res,200,await engine.me(token));
        if(path==='/api/practice') return send(res,200,await engine.practice(token));
        if(path==='/api/blueprint') return send(res,200,await engine.blueprint(token,string(url.searchParams.get('brandId'))));
        if(path==='/api/brands') return send(res,200,await engine.listBrands(token));
        if(path==='/api/context') return send(res,200,await engine.context(token,string(url.searchParams.get('brandId'))));
      }
      send(res,404,{code:'NOT_FOUND'});
    } catch(error) {
      if(error instanceof AppError) {const status={UNAUTHORIZED:401,FORBIDDEN:403,CONFLICT:409,INVALID:400,NOT_FOUND:404,UNAVAILABLE:503}[error.code];send(res,status,{code:error.code,message:error.message});}
      else {
        if(pilot)console.error(JSON.stringify({event:'http_error',requestId,kind:error instanceof Error?error.name:'unknown'}));
        send(res,503,{code:'UNAVAILABLE',message:'Operation unavailable; retry with the same idempotency key.'});
      }
    }
  });
}
