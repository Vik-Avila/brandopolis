import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { Engine } from '../application/engine.js';
import { contentSecurityPolicy,ga4MeasurementId } from './analytics.js';
import { buildBlueprintPdf,blueprintFilename } from '../application/blueprint-pdf.js';
import { NON_INDEXABLE_VIEWS } from './assets.js';
import { AppError, type CommitCommand } from '../domain/contracts.js';
import type { PilotBoundary } from './pilot-auth.js';
import type { CompetitiveResearchService } from './competitive-research.js';
import type { DocumentClaimsService } from './document-claims.js';
import { randomUUID,createHash } from 'node:crypto';
import { open,mkdir,rename,rm } from 'node:fs/promises';
import { resolve,sep } from 'node:path';
import { extractDocument } from '../documents/extractor.js';

async function body(req:IncomingMessage):Promise<Record<string,unknown>> {
  if(!req.headers['content-type']?.startsWith('application/json')) throw new AppError('INVALID','JSON required');
  let content='';
  for await(const chunk of req) {content+=chunk.toString();if(Buffer.byteLength(content)>40000) throw new AppError('INVALID','Request too large');}
  try {const value=JSON.parse(content);if(!value||Array.isArray(value)||typeof value!=='object') throw new Error();return value;} catch {throw new AppError('INVALID','Invalid JSON');}
}
function string(value:unknown):string {if(typeof value!=='string'||!value) throw new AppError('INVALID','String required');return value;}
export function cookieMaxAge(expiresAt:Date,now=Date.now()) {return Math.max(0,Math.floor((expiresAt.getTime()-now)/1000));}
function send(res:ServerResponse,status:number,data:unknown) {res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data));}

const documentMimeTypes=new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain'
]);

const documentMaxBytes=20*1024*1024;

function requestHeader(req:IncomingMessage,name:string):string|undefined {
  const value=req.headers[name];
  return Array.isArray(value)?value[0]:value;
}

function sourceFileName(value:string|undefined):string {
  if(!value)throw new AppError('INVALID','File name required');

  let decoded:string;

  try {
    decoded=decodeURIComponent(value);
  } catch {
    throw new AppError('INVALID','Invalid file name');
  }

  const clean=decoded
    .trim()
    .replace(/[\/\\]/g,'_');

  if(
    !clean ||
    clean.length>255 ||
    /[\u0000-\u001f\u007f]/.test(clean)
  ) throw new AppError('INVALID','Invalid file name');

  return clean;
}

function documentStorageRoot():string {
  return process.env.BRANDOPOLIS_DOCUMENT_ROOT?.trim()
    || '/home/wwwbrando/.brandopolis/documents';
}

function resolveDocumentStoragePath(storageKey:string):string {
  const root=resolve(documentStorageRoot());
  const target=resolve(root,storageKey);

  if(
    target!==root &&
    !target.startsWith(root+sep)
  ) throw new AppError('INVALID','Invalid document storage key');

  return target;
}

const documentExtractorVersion='local-v1';


async function receiveSourceDocument(
  req:IncomingMessage,
  target:string
):Promise<{bytes:number;sha256:string}> {
  const handle=await open(target,'wx',0o600);
  const digest=createHash('sha256');
  let bytes=0;

  try {
    for await(const chunk of req) {
      const buffer=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk);
      bytes+=buffer.length;

      if(bytes>documentMaxBytes)
        throw new AppError('INVALID','Document too large');

      digest.update(buffer);
      await handle.write(buffer);
    }

    if(bytes===0)
      throw new AppError('INVALID','Empty document');

    await handle.sync();

    return {
      bytes,
      sha256:digest.digest('hex')
    };
  } finally {
    await handle.close();
  }
}

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
export function createApp(engine:Engine,assets?:(path:string)=>{content:string|Buffer;type:string;etag?:string}|undefined,health?:()=>Promise<string>,pilot?:PilotBoundary,competitiveResearch?:CompetitiveResearchService,documentClaims?:DocumentClaimsService) {
  const limiter=pilot?.limiter??new RateLimiter();
  // Resolved once at construction: a malformed Measurement ID fails at boot, never per request.
  const ga4=ga4MeasurementId(),csp=contentSecurityPolicy(ga4);
  return createServer(async(req,res)=>{
    const requestId=randomUUID();
    const limited=(key:string,[limit,windowMs]:readonly [number,number])=>{if(limiter.allow(key,limit,windowMs))return false;res.setHeader('Retry-After',String(Math.ceil(windowMs/1000)));send(res,429,{code:'RATE_LIMITED',message:'Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.'});return true;};
    // Structured access log without paths, query strings, cookies or bodies (they may carry identifiers or strategy text).
    if(pilot){res.setHeader('X-Request-Id',requestId);res.once('finish',()=>console.log(JSON.stringify({event:'http_request',requestId,status:res.statusCode,method:req.method})));}
    res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('Content-Security-Policy',csp);
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
      if(req.method==='GET'&&path==='/api/mode')return send(res,200,{mode:pilot?'PILOT':'DEMO',requestAccessUrl:pilot?.requestAccessUrl??null,aiNotice:pilot?.ai?.notice??null,ga4MeasurementId:ga4});
      if(req.method==='GET'&&path==='/health') {
        const ready=health?await health():'UNAVAILABLE';
        if(pilot&&ready!=='READY')console.error(JSON.stringify({event:'readiness',status:ready}));return send(res,ready==='READY'?200:503,{application:pilot?'brandopolis-pilot':'brandopolis-competition',protocol:pilot?'pilot-v1':'rc1',status:ready==='READY'?'ready':'unavailable'});
      }
      if(req.method==='GET'&&!path.startsWith('/api/')) {
        const asset=assets?.(path);if(!asset) return send(res,404,{code:'NOT_FOUND'});
        // Brand media and icons are cacheable for a day; the document stays no-store; scripts and styles revalidate (ETag/304).
        const media=path.startsWith('/brand/')||path==='/favicon.ico'||path==='/site.webmanifest',document=asset.type.startsWith('text/html');
        const cache=media?'public, max-age=86400':document?'no-store':'no-cache';
        if(asset.etag&&!document&&req.headers['if-none-match']===asset.etag){res.writeHead(304,{'Cache-Control':cache,ETag:asset.etag});res.end();return;}
        const body=typeof asset.content==='string'?Buffer.from(asset.content):asset.content;
        // Route-specific, never global: only the views declared non-indexable carry the directive, so
        // the landing, the legal documents, access and every product route keep their SEO behaviour.
        const headers={'Content-Type':asset.type,'Cache-Control':cache,'Content-Length':String(body.length),...(NON_INDEXABLE_VIEWS.has(path)?{'X-Robots-Tag':'noindex, follow'}:{}),...(media?{'Accept-Ranges':'bytes'}:{}),...(asset.etag&&!document?{ETag:asset.etag}:{})};
        // Media honours a single byte range: Safari/iOS only plays MP4 video from servers that answer 206.
        const range=media&&req.headers.range?/^bytes=(\d*)-(\d*)$/.exec(req.headers.range):null;
        if(range&&(range[1]||range[2])){
          const size=body.length,start=range[1]===''?Math.max(0,size-Number(range[2])):Number(range[1]),end=range[1]===''||range[2]===''?size-1:Math.min(Number(range[2]),size-1);
          if(start>end||start>=size){res.writeHead(416,{'Content-Range':`bytes */${size}`});res.end();return;}
          res.writeHead(206,{...headers,'Content-Length':String(end-start+1),'Content-Range':`bytes ${start}-${end}/${size}`});res.end(body.subarray(start,end+1));return;
        }
        res.writeHead(200,headers);res.end(body);return;
      }
      const bearer=req.headers.authorization?.startsWith('Bearer ')?req.headers.authorization.slice(7):undefined;
      const cookieName=pilot?'__Host-brandopolis_session':'brandopolis_session';
      const cookie=req.headers.cookie?.split(';').map(v=>v.trim()).find(v=>v.startsWith(cookieName+'='))?.slice(cookieName.length+1);
      const token=(pilot?cookie:bearer??cookie)??'';
      // Session probe for public pages: answers without an error status so anonymous visits stay clean.
      // Full checks still apply (expiry, membership, PILOT identity); it never reveals why a session is invalid.
      if(req.method==='GET'&&path==='/api/session-state'){
        try{
          if(pilot){await pilot.authorize(token);return send(res,200,{authenticated:true,intakeRequired:await pilot.intakeRequired?.(token)??false});}
          await engine.me(token);return send(res,200,{authenticated:true,intakeRequired:false});
        }
        catch(error){if(error instanceof AppError)return send(res,200,{authenticated:false,intakeRequired:false});throw error;}
      }
      if(pilot){
        if(req.method==='POST'&&req.headers.origin!==pilot.origin)throw new AppError('FORBIDDEN','Same-origin action required');
        // Logout always clears the browser cookie, even for an already expired or revoked session.
        if(req.method==='POST'&&path==='/api/logout'){if(token)await pilot.logout(token);res.setHeader('Set-Cookie',`${cookieName}=; Secure; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`);return send(res,200,{authenticated:false});}
        await pilot.authorize(token);
        const subject=createHash('sha256').update(token).digest('hex');
        if(req.method==='POST'&&(path==='/api/recommendations/generate'||path==='/api/competitive/research'||path==='/api/documents/claims')){
          if(limited('ai:'+subject,pilotLimits.ai))return;
          const gate=await pilot.aiGate?.(token)??'OK';
          if(gate==='CONSENT_REQUIRED')return send(res,428,{code:'AI_CONSENT_REQUIRED',message:'Confirm the AI data notice first.'});
          if(gate==='CAP_REACHED'){res.setHeader('Retry-After','3600');return send(res,429,{code:'AI_CAP_REACHED',message:'Daily AI request limit reached.'});}
        }
        if(req.method==='POST'&&path==='/api/ai-notice/accept'){const input=await body(req);return send(res,200,await pilot.acceptAiNotice!(token,string(input.version)));}
        if(req.method==='POST'&&path==='/api/feedback'&&limited('feedback:'+subject,pilotLimits.feedback))return;
        // Required intake is enforced server-side, not by hiding a screen. Only the endpoints needed to
        // complete it, read identity or leave stay open until the profile exists.
        const intakeOpen=['/api/participant','/api/logout','/api/me','/api/session-state','/api/mode'];
        if(path.startsWith('/api/admin/'))intakeOpen.push(path);
        if(!intakeOpen.includes(path)&&await pilot.intakeRequired?.(token))
          return send(res,403,{code:'INTAKE_REQUIRED',message:'Completa tu perfil de Estratega de Marca para continuar.'});
      }
      if(req.method==='POST') {
        if(!pilot&&!bearer&&req.headers.origin!==`http://${req.headers.host}`) throw new AppError('FORBIDDEN','Same-origin human action required');

        if(path==='/api/documents/extract'){
          const input=await body(req);
          const extractionBrandId=string(input.brandId);
          const documentId=string(input.documentId);

          const document=await engine.sourceDocument(
            token,
            extractionBrandId,
            documentId
          );

          const extracted=await extractDocument({
            filePath:resolveDocumentStoragePath(document.storageKey),
            mediaType:document.mediaType,
            originalName:document.originalName
          });

          const result=await engine.persistDocumentExtraction(
            token,
            extractionBrandId,
            documentId,
            {
              extractorVersion:documentExtractorVersion,
              content:extracted.text,
              metadata:{
                format:extracted.metadata.format,
                pages:extracted.metadata.pages??null,
                slides:extracted.metadata.slides??null,
                characters:extracted.metadata.characters,
                segments:extracted.segments.length,
                truncated:extracted.metadata.truncated
              }
            }
          );

          return send(res,result.reused?200:201,result);
        }

        if(path==='/api/documents'){
          const brandId=string(requestHeader(req,'x-brand-id'));
          const originalName=sourceFileName(requestHeader(req,'x-file-name'));
          const mediaType=String(requestHeader(req,'content-type')??'')
            .split(';')[0]
            .trim()
            .toLowerCase();

          if(!documentMimeTypes.has(mediaType))
            throw new AppError('INVALID','Unsupported document type');

          const declaredRaw=requestHeader(req,'content-length');

          if(declaredRaw){
            const declared=Number(declaredRaw);

            if(
              !Number.isSafeInteger(declared) ||
              declared<=0 ||
              declared>documentMaxBytes
            ) throw new AppError('INVALID','Invalid document size');
          }

          const scope=await engine.documentUploadScope(token,brandId);
          const documentId=randomUUID();
          const root=resolve(documentStorageRoot());

          const directory=resolve(
            root,
            scope.workspaceId,
            scope.brandId,
            documentId
          );

          const temporary=resolve(directory,'.upload');
          const target=resolve(directory,'original');

          await mkdir(directory,{recursive:true,mode:0o700});

          try {
            const received=await receiveSourceDocument(req,temporary);

            await rename(temporary,target);

            const storageKey=[
              scope.workspaceId,
              scope.brandId,
              documentId,
              'original'
            ].join('/');

            const result=await engine.registerSourceDocument(
              token,
              brandId,
              {
                id:documentId,
                originalName,
                mediaType,
                bytes:received.bytes,
                sha256:received.sha256,
                storageKey
              }
            );

            return send(res,201,result);
          } catch(error) {
            await rm(directory,{recursive:true,force:true});
            throw error;
          }
        }

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
        if(pilot&&path==='/api/participant')return send(res,201,await pilot.saveParticipantProfile!(token,input));
        if(pilot&&path==='/api/admin/access-status')return send(res,200,await pilot.adminSetAccessStatus!(token,string(input.userId),string(input.status) as never));
        if(pilot&&path==='/api/brands/geography')return send(res,200,await pilot.setBrandGeography!(token,string(input.brandId),string(input.geographicInfluence) as never,input.primaryMarket==null?null:string(input.primaryMarket)));
        if(path==='/api/brands') return send(res,201,await engine.createBrand(token,string(input.name),input.initialContext===undefined?undefined:string(input.initialContext)));
        if(path==='/api/context/capture') return send(res,201,await engine.captureContext(
          token,
          string(input.brandId),
          string(input.kind),
          input.entity as Record<string,unknown>,
          input.idempotencyKey===undefined?undefined:string(input.idempotencyKey)
        ));
        if(path==='/api/context/assemble') return send(res,200,await engine.assembleContext(token,string(input.brandId),string(input.questionId),input.budget===undefined?undefined:Number(input.budget)));

        if(path==='/api/document-claims/review') return send(
          res,
          200,
          await engine.reviewDocumentClaim(
            token,
            string(input.brandId),
            string(input.claimId),
            string(input.action) as 'ACCEPT'|'REJECT',
            input.reviewedStatement===undefined
              ?undefined
              :string(input.reviewedStatement)
          )
        );

        if(path==='/api/documents/claims') {
          if(!documentClaims)
            throw new AppError('UNAVAILABLE','Document claims unavailable');

          const claimsBrandId=string(input.brandId);
          const documentId=string(input.documentId);

          const {document,extraction}=
            await engine.documentExtractionForClaims(
              token,
              claimsBrandId,
              documentId
            );

          const existing=await engine.existingDocumentClaims(
            token,
            claimsBrandId,
            documentId,
            extraction.id,
            'document-claims-v1'
          );

          if(existing.length){
            return send(res,200,{
              claims:existing,
              reused:true,
              provider:String(existing[0]?.location?.provider??''),
              model:String(existing[0]?.location?.model??'')
            });
          }

          const brands=await engine.listBrands(token);
          const brand=brands.find(item=>item.id===claimsBrandId);

          if(!brand)
            throw new AppError('NOT_FOUND','Brand unavailable');

          const generated=await documentClaims.generate({
            brandName:brand.name,
            documentName:document.originalName,
            extractionId:extraction.id,
            content:extraction.content!
          });

          const persisted=await engine.persistDocumentClaims(
            token,
            claimsBrandId,
            documentId,
            extraction.id,
            generated
          );

          if(pilot)console.log(JSON.stringify({
            event:'document_claims',
            requestId,
            outcome:'OK',
            provider:generated.provider,
            claims:persisted.claims.length,
            reused:persisted.reused
          }));

          return send(
            res,
            persisted.reused?200:201,
            {
              claims:persisted.claims,
              reused:persisted.reused,
              provider:generated.provider,
              model:generated.model
            }
          );
        }

        if(path==='/api/competitive/research') {
          if(!competitiveResearch)throw new AppError('UNAVAILABLE','Competitive research unavailable');

          const researchBrandId=string(input.brandId);

          const [researchContext,brands]=await Promise.all([
            engine.context(token,researchBrandId),
            engine.listBrands(token)
          ]);

          const brand=brands.find(item=>item.id===researchBrandId);
          if(!brand)throw new AppError('NOT_FOUND','Brand unavailable');

          const userPrefix='Entorno competitivo — referencias aportadas por el usuario:';

          const competitiveReferences=researchContext.userInputs
            .filter(item=>String(item.statement??'').startsWith(userPrefix))
            .map(item=>String(item.statement).slice(userPrefix.length).trim())
            .filter(Boolean);

          const marketContext=[
            ...researchContext.userInputs.map(item=>String(item.statement??'')),
            ...researchContext.evidence.map(item=>String(item.claim??'')),
            ...researchContext.hypotheses
              .filter(item=>item.status!=='REJECTED')
              .map(item=>`Hipótesis: ${String(item.statement??'')}`),
            ...researchContext.versions.map(item=>`Decisión: ${String(item.selectedOption??'')}`)
          ].filter(Boolean);

          const result=await competitiveResearch.research({
            brandId:researchBrandId,
            brandName:brand.name,
            marketContext,
            competitiveReferences
          });

          await engine.completeCompetitiveResearchRequest(
              token,
              string(input.brandId)
            );

            if(pilot)console.log(JSON.stringify({
            event:'competitive_research',
            requestId,
            outcome:'OK',
            provider:result.provider,
            findings:result.findings.length
          }));

          return send(res,200,result);
        }
        if(path==='/api/competitive/reject') return send(
          res,
          200,
          await engine.rejectCompetitiveFinding(
            token,
            string(input.brandId),
            string(input.claim)
          )
        );

        if(path==='/api/recommendations/generate') {
          const result=await engine.analyze(token,string(input.brandId),string(input.questionId));
          // Outcome only; no prompt, context or proposal text.
          if(pilot)console.log(JSON.stringify({event:'ai_request',requestId,outcome:result.error??'OK',provider:result.provider}));
          return send(res,200,result);
        }
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
        if(path==='/api/competitive/rejections') return send(
          res,
          200,
          await engine.competitiveRejections(
            token,
            string(url.searchParams.get('brandId'))
          )
        );
        if(path==='/api/document-claims') return send(res,200,await engine.listDocumentClaims(token,string(url.searchParams.get('brandId'))));
        if(path==='/api/documents') return send(res,200,await engine.listSourceDocuments(token,string(url.searchParams.get('brandId'))));
        if(path==='/api/me') return send(res,200,await engine.me(token));
        if(pilot&&path==='/api/participant') return send(res,200,{profile:await pilot.participantProfile!(token)});
        // Every admin endpoint authorizes independently inside its own handler.
        if(pilot&&path==='/api/admin/session') return send(res,200,{admin:await pilot.isAdmin!(token)});
        if(pilot&&path==='/api/admin/summary') return send(res,200,await pilot.adminSummary!(token));
        if(pilot&&path==='/api/admin/users') return send(res,200,{participants:await pilot.adminParticipants!(token)});
        if(pilot&&path==='/api/admin/feedback') return send(res,200,{feedback:await pilot.adminFeedback!(token)});
        if(pilot&&(path==='/api/admin/evidence'||path==='/api/admin/evidence.csv')){
          const parse=(key:string)=>{const raw=url.searchParams.get(key);if(!raw)return undefined;const at=new Date(raw);if(Number.isNaN(at.getTime()))throw new AppError('INVALID','Rango de fechas inválido');return at;};
          const range={from:parse('from'),to:parse('to')};
          if(path==='/api/admin/evidence.csv'){
            const csv=await pilot.adminEvidenceCsv!(token,range);
            res.writeHead(200,{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="brandopolis-evidencia.csv"','Cache-Control':'no-store'});
            res.end(csv);return;
          }
          return send(res,200,await pilot.adminEvidence!(token,range));
        }
        if(path==='/api/practice') return send(res,200,await engine.practice(token));
        if(path==='/api/blueprint') return send(res,200,await engine.blueprint(token,string(url.searchParams.get('brandId'))));
        if(path==='/api/blueprint/pdf') {
          // Every read below is the authorized, workspace-scoped one the Blueprint view already uses,
          // so the export carries exactly the strategy this participant can already see — no more.
          const brandId=string(url.searchParams.get('brandId'));
          const [projection,brand,rejections]=await Promise.all([
            engine.blueprint(token,brandId),
            engine.brandDossier(token,brandId),
            engine.competitiveRejections(token,brandId)
          ]);
          // Canonical competitive status from stored state alone: incorporated findings are evidence,
          // discarded ones are recorded rejections. Unresolved candidates live only inside the session
          // that produced them and are never strategy, so they cannot appear here.
          const incorporated=projection.evidence.filter(item=>{
            const row=item as {provenance?:string;claim?:string};
            return String(row.provenance??'').toLowerCase().includes('entorno competitivo')
              ||String(row.claim??'').startsWith('Entorno competitivo —');
          });
          const competitiveStatus=incorporated.length||(rejections.claims?.length??0)?'Revisado':'Sin investigar';
          const generatedAt=new Date();
          const pdf=buildBlueprintPdf({
            brand,
            context:projection as unknown as Parameters<typeof buildBlueprintPdf>[0]['context'],
            competitiveStatus,
            generatedAt
          });
          res.writeHead(200,{
            'Content-Type':'application/pdf',
            'Content-Length':String(pdf.byteLength),
            'Content-Disposition':`attachment; filename="${blueprintFilename(brand.name,generatedAt)}"`,
            'Cache-Control':'no-store'
          });
          return res.end(Buffer.from(pdf));
        }
        if(path==='/api/brands') return send(res,200,await engine.listBrands(token));
        if(path==='/api/context') return send(res,200,await engine.context(token,string(url.searchParams.get('brandId'))));
      }
      send(res,404,{code:'NOT_FOUND'});
    } catch(error) {
      if(error instanceof AppError) {const status={UNAUTHORIZED:401,FORBIDDEN:403,CONFLICT:409,INVALID:400,NOT_FOUND:404,UNAVAILABLE:503}[error.code];send(res,status,{code:error.code,message:error.message});}
      else {
        if(pilot)console.error(JSON.stringify({
          event:'http_error',
          requestId,
          kind:error instanceof Error?error.name:'unknown'
        }));
        send(res,503,{code:'UNAVAILABLE',message:'Operation unavailable; retry with the same idempotency key.'});
      }
    }
  });
}
