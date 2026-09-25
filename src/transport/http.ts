import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { Engine } from '../application/engine.js';
import { AppError, type CommitCommand } from '../domain/contracts.js';
import type { PilotBoundary } from './pilot-auth.js';
import { randomUUID } from 'node:crypto';

async function body(req:IncomingMessage):Promise<Record<string,unknown>> {
  if(!req.headers['content-type']?.startsWith('application/json')) throw new AppError('INVALID','JSON required');
  let content='';
  for await(const chunk of req) {content+=chunk.toString();if(Buffer.byteLength(content)>40000) throw new AppError('INVALID','Request too large');}
  try {const value=JSON.parse(content);if(!value||Array.isArray(value)||typeof value!=='object') throw new Error();return value;} catch {throw new AppError('INVALID','Invalid JSON');}
}
function string(value:unknown):string {if(typeof value!=='string'||!value) throw new AppError('INVALID','String required');return value;}
export function cookieMaxAge(expiresAt:Date,now=Date.now()) {return Math.max(0,Math.floor((expiresAt.getTime()-now)/1000));}
function send(res:ServerResponse,status:number,data:unknown) {res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data));}
export function createApp(engine:Engine,assets?:(path:string)=>{content:string|Buffer;type:string}|undefined,health?:()=>Promise<string>,pilot?:PilotBoundary) {
  let windowStart=Date.now(),requests=0,logins=0;
  return createServer(async(req,res)=>{
    if(pilot){const requestId=randomUUID();res.setHeader('X-Request-Id',requestId);res.once('finish',()=>console.log(JSON.stringify({event:'http_request',requestId,status:res.statusCode,method:req.method})));}
    res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    try {
      // Loopback Host allowlist also prevents DNS rebinding against the local demo.
      if(pilot){
        if(req.headers.host!==new URL(pilot.origin).host)throw new AppError('FORBIDDEN','Host not allowed');
        res.setHeader('Strict-Transport-Security','max-age=31536000');
        if(Date.now()-windowStart>60000){windowStart=Date.now();requests=0;logins=0;}
        if(++requests>600){res.setHeader('Retry-After','60');return send(res,429,{code:'UNAVAILABLE'});}
        if(req.url?.startsWith('/auth/login')&&++logins>30){res.setHeader('Retry-After','60');return send(res,429,{code:'UNAVAILABLE'});}
      }else if(!/^127\.0\.0\.1:\d+$/.test(req.headers.host??'')) throw new AppError('FORBIDDEN','Loopback host required');
      const url=new URL(req.url??'/',pilot?.origin??`http://${req.headers.host}`),path=url.pathname;
      if(pilot&&url.origin!==pilot.origin)throw new AppError('FORBIDDEN','Origin not allowed');
      if(pilot&&await pilot.handle(req,res,url))return;
      if(req.method==='GET'&&path==='/api/mode')return send(res,200,{mode:pilot?'PILOT':'DEMO'});
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
        await pilot.authorize(token);
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
      else send(res,503,{code:'UNAVAILABLE',message:'Operation unavailable; retry with the same idempotency key.'});
    }
  });
}
