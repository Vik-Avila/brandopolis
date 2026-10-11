import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { Engine } from '../application/engine.js';
import { contentSecurityPolicy,ga4MeasurementId } from './analytics.js';
import { buildBlueprintPdf,blueprintFilename } from '../application/blueprint-pdf.js';
import { buildBrandBookPdf,brandBookFilename } from '../application/brandbook-pdf.js';
import { NON_INDEXABLE_VIEWS } from './assets.js';
import { AppError, type CommitCommand } from '../domain/contracts.js';
import type { PilotBoundary } from './pilot-auth.js';
import type { CompetitiveResearchService } from './competitive-research.js';
import type { DocumentClaimsService } from './document-claims.js';
import { randomUUID,createHash } from 'node:crypto';
import { open,mkdir,rename,rm,readFile,writeFile } from 'node:fs/promises';
import { dirname,relative,resolve,sep } from 'node:path';
import { extractDocument } from '../documents/extractor.js';
import { inspectKitAsset,KIT_ASSET_MAX_BYTES } from '../domain/kit-assets.js';
import { kitCandidatesFromText } from '../domain/brand-kit.js';

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

/**
 * ADR-0029 · removes the private document directory of a deleted Brand (`<root>/<workspaceId>/<brandId>`).
 * Same confinement rule as resolveDocumentStoragePath, and stricter: the prefix must resolve to exactly two
 * levels below the root, so it can never remove the root or a whole workspace. A missing directory is success.
 */
export async function purgeBrandFiles(storagePrefix:string):Promise<void> {
  const root=resolve(documentStorageRoot());
  const target=resolveDocumentStoragePath(storagePrefix);
  const parts=relative(root,target).split(sep);
  if(target===root||parts.length!==2||parts.some(part=>!part||part==='..'||part==='.'))
    throw new AppError('INVALID','Invalid brand storage prefix');
  await rm(target,{recursive:true,force:true});
}

export type BrandFilePurge=(storagePrefix:string)=>Promise<void>;

/** Best-effort retry of every pending purge. Never throws: a failure leaves the record FILES_PENDING for the next try. */
export async function purgePendingBrandFiles(engine:Pick<Engine,'pendingBrandFilePurges'|'completeBrandFilePurge'>,purge:BrandFilePurge=purgeBrandFiles):Promise<{purged:number;pending:number}> {
  let purged=0,pending=0;
  let rows:{id:string;storagePrefix:string}[];
  try {rows=await engine.pendingBrandFilePurges();} catch {return {purged,pending};}
  for(const row of rows){
    try {await purge(row.storagePrefix);await engine.completeBrandFilePurge(row.id);purged++;}
    catch {pending++;}
  }
  return {purged,pending};
}


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
// ADR-0035 · public web form: reads of the form, submissions per client and per form; development only.
const LEAD_FORM_PATHS=new Set(['/formulario','/lead-form.js','/lead-form.css']);
export const leadFormLimits={read:[60,60000],submit:[10,600000],perForm:[200,3600000]} as const;
export const pilotLimits={all:[600,60000],auth:[20,60000],ai:[20,600000],feedback:[20,600000],reflections:[30,600000]} as const;
export function createApp(engine:Engine,assets?:(path:string)=>{content:string|Buffer;type:string;etag?:string}|undefined,health?:()=>Promise<string>,pilot?:PilotBoundary,competitiveResearch?:CompetitiveResearchService,documentClaims?:DocumentClaimsService,options?:{brandFilePurge?:BrandFilePurge}) {
  // ADR-0029: injectable only so tests can simulate a failing file purge; production uses purgeBrandFiles.
  const brandFilePurge=options?.brandFilePurge??purgeBrandFiles;
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
      if(req.method==='GET'&&path==='/api/mode')return send(res,200,{mode:pilot?'PILOT':'DEMO',liveAi:!pilot&&engine.aiMode==='LIVE',requestAccessUrl:pilot?.requestAccessUrl??null,aiNotice:pilot?.ai?.notice??null,ga4MeasurementId:ga4});
      if(req.method==='GET'&&path==='/health') {
        const ready=health?await health():'UNAVAILABLE';
        if(pilot&&ready!=='READY')console.error(JSON.stringify({event:'readiness',status:ready}));return send(res,ready==='READY'?200:503,{application:pilot?'brandopolis-pilot':'brandopolis-competition',protocol:pilot?'pilot-v1':'rc1',status:ready==='READY'?'ready':'unavailable'});
      }
      // ADR-0035 · the brand's web form: the only entry without a session. Same origin, bounded body, per-client and
      // per-form limits; the brand comes from the active form. Contents never reach logs or telemetry.
      // The provisional privacy notice is limited to development: PILOT (and any non-DEMO deployment) does not serve the
      // form page or its endpoints until the final notice is approved (PHASE4_SPEC §12.2, EXT-REQ-13).
      if(pilot&&(LEAD_FORM_PATHS.has(path)||path==='/api/forms/public'||path==='/api/forms/submit'))return send(res,404,{code:'NOT_FOUND'});
      if(path==='/api/forms/public'||path==='/api/forms/submit'){
        const forwarded=pilot?.trustProxy?String(req.headers['x-forwarded-for']??'').split(',').map(v=>v.trim()).filter(Boolean).at(-1):undefined;
        const client=forwarded??req.socket.remoteAddress??'unknown';
        if(req.method==='GET'&&path==='/api/forms/public'){if(limited('form-read:'+client,leadFormLimits.read))return;return send(res,200,await engine.publicLeadForm(url.searchParams.get('f')));}
        if(req.method==='POST'&&path==='/api/forms/submit'){
          if(req.headers.origin!==(pilot?pilot.origin:`http://${req.headers.host}`))throw new AppError('FORBIDDEN','Same-origin submission required');
          if(limited('form-submit:'+client,leadFormLimits.submit))return;
          const input=await body(req);
          if(typeof input.form==='string'&&limited('form-id:'+input.form.slice(0,40),leadFormLimits.perForm))return;
          const result=await engine.submitLeadForm(input);
          return send(res,result.replayed?200:201,{reference:result.reference,replayed:result.replayed});
        }
        return send(res,404,{code:'NOT_FOUND'});
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
        if(req.method==='POST'&&(path==='/api/recommendations/generate'||path==='/api/competitive/research'||path==='/api/documents/claims'||path==='/api/brando/ask'||path==='/api/brando/marketing'||path==='/api/brando/identity')){
          if(limited('ai:'+subject,pilotLimits.ai))return;
          const gate=await pilot.aiGate?.(token)??'OK';
          if(gate==='CONSENT_REQUIRED')return send(res,428,{code:'AI_CONSENT_REQUIRED',message:'Confirm the AI data notice first.'});
          if(gate==='CAP_REACHED'){res.setHeader('Retry-After','3600');return send(res,429,{code:'AI_CAP_REACHED',message:'Daily AI request limit reached.'});}
        }
        if(req.method==='POST'&&path==='/api/ai-notice/accept'){const input=await body(req);return send(res,200,await pilot.acceptAiNotice!(token,string(input.version)));}
        if(req.method==='POST'&&path==='/api/feedback'&&limited('feedback:'+subject,pilotLimits.feedback))return;
        if(req.method==='POST'&&path==='/api/reflections'&&limited('reflections:'+subject,pilotLimits.reflections))return;
        // Required intake is enforced server-side, not by hiding a screen. Only the endpoints needed to
        // complete it, read identity or leave stay open until the profile exists.
        // ADR-0033 · a client guest is not an Estratega de Marca: the portal and invitation acceptance do not need the intake.
        const intakeOpen=['/api/participant','/api/logout','/api/me','/api/session-state','/api/mode','/api/invitations/accept','/api/portal','/api/portal/brands','/api/portal/comment','/api/portal/decide','/api/portal/asset'];
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

        // ADR-0034 · kit files: raw body, format decided by signature, private original under <root>/<ws>/<brand>.
        if(req.method==='POST'&&path==='/api/brand-kit/assets'){
          const brandId=string(requestHeader(req,'x-brand-id'));
          const originalName=sourceFileName(requestHeader(req,'x-file-name'));
          const role=string(requestHeader(req,'x-asset-role'));
          const declared=Number(requestHeader(req,'content-length')??0);
          if(declared&&(!Number.isSafeInteger(declared)||declared<=0||declared>KIT_ASSET_MAX_BYTES))throw new AppError('INVALID','Invalid file size');
          const scope=await engine.kitUploadScope(token,brandId);
          const chunks:Buffer[]=[];let size=0;
          for await(const chunk of req){size+=(chunk as Buffer).length;if(size>KIT_ASSET_MAX_BYTES)throw new AppError('INVALID','File too large');chunks.push(chunk as Buffer);}
          const data=Buffer.concat(chunks);
          const info=inspectKitAsset(new Uint8Array(data));
          const assetId=randomUUID(),storageKey=`${scope.workspaceId}/${scope.brandId}/kit-${assetId}/original`;
          const target=resolveDocumentStoragePath(storageKey);
          await mkdir(dirname(target),{recursive:true});
          await writeFile(target,data,{flag:'wx'});
          let result:{assetId:string;reused:boolean};
          // A refused registration (role/format mismatch, lost access) never leaves an orphan file on disk.
          try{result=await engine.registerKitAsset(token,brandId,{id:assetId,role,originalName,info,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex'),storageKey});}
          catch(error){await rm(dirname(target),{recursive:true,force:true});throw error;}
          if(result.reused)await rm(dirname(target),{recursive:true,force:true});
          return send(res,result.reused?200:201,{...result,format:info.format,width:info.width,height:info.height,alpha:info.alpha});
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

            // The brand already keeps this exact file: drop the new copy and return the kept document.
            if(result.reused){await rm(directory,{recursive:true,force:true});return send(res,200,result);}
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
        // Declared geography (ADR-0025): PILOT keeps its own live-session gate; both modes write through the engine scope.
        if(path==='/api/brands/geography'){
          const brandIdInput=string(input.brandId),influence=string(input.geographicInfluence) as never,market=input.primaryMarket==null?null:string(input.primaryMarket);
          return send(res,200,pilot?await pilot.setBrandGeography!(token,brandIdInput,influence,market):await engine.setBrandGeography(token,brandIdInput,influence,market));
        }
        // ADR-0029 · Eliminar marca: same Origin/session/intake gates as every POST; authorization, confirmation and
        // idempotency live in the engine. Files are purged only after the database transaction committed.
        if(path==='/api/brands/delete'){
          await purgePendingBrandFiles(engine,brandFilePurge);
          const deleted=await engine.deleteBrand(token,{brandId:input.brandId,confirmName:input.confirmName,idempotencyKey:input.idempotencyKey});
          let status=deleted.status;
          if(status==='FILES_PENDING'&&deleted.storagePrefix){
            try {await brandFilePurge(deleted.storagePrefix);await engine.completeBrandFilePurge(deleted.deletionId);status='DELETED';}
            catch {if(pilot)console.error(JSON.stringify({event:'brand_files_pending',requestId}));}
          }
          return send(res,200,{status,brandId:deleted.brandId});
        }
        // PHASE4_SPEC §4.9 · work priority (append-only) and ADR-0033 per-brand capabilities: authorization in the engine.
        // PHASE4_SPEC §4.10 · guided start draft of its author; ownership, scope, 409 and idempotency in the engine.
        if(path==='/api/brand-setup/start') return send(res,201,await engine.startSetupDraft(token,{startKey:input.startKey,brandId:input.brandId,fields:input.fields}));
        if(path==='/api/brand-setup/save') return send(res,200,await engine.saveSetupDraft(token,{draftId:input.draftId,expectedVersion:input.expectedVersion,fields:input.fields,step:input.step,identityChoice:input.identityChoice}));
        if(path==='/api/brand-setup/create-brand') return send(res,201,await engine.createBrandFromDraft(token,{draftId:input.draftId,expectedVersion:input.expectedVersion,intent:input.intent,note:input.note}));
        if(path==='/api/brand-setup/confirm') return send(res,200,await engine.confirmSetupDraft(token,{draftId:input.draftId,expectedVersion:input.expectedVersion}));
        if(path==='/api/brand-setup/abandon') return send(res,200,await engine.abandonSetupDraft(token,{draftId:input.draftId,expectedVersion:input.expectedVersion}));
        if(path==='/api/brands/work-priority') return send(res,201,await engine.setWorkPriority(token,{brandId:input.brandId,intent:input.intent,note:input.note,idempotencyKey:input.idempotencyKey}));
        // PHASE4_SPEC §4.1 · offers: one path per operation; authorization, concurrency and audit in the engine.
        // ADR-0034 · candidates from a brand manual (PDF) through the existing extractor; DECLARED, never adopted.
        if(path==='/api/brand-kit/extract'){
          const asset=await engine.kitAssetFile(token,string(input.brandId),input.assetId);
          if(asset.format!=='PDF')throw new AppError('INVALID','Choose the brand manual (PDF)');
          const extracted=await extractDocument({filePath:resolveDocumentStoragePath(asset.storageKey),mediaType:'application/pdf',originalName:asset.originalName});
          return send(res,200,await engine.mergeKitCandidates(token,string(input.brandId),input.expectedRevision,kitCandidatesFromText(extracted.segments.map(s=>({index:s.index,text:s.text})),asset.id)));
        }
        // ONB-006 · a PDF the brand already uploaded becomes the kit manual without a new upload: same bytes, checked by
        // signature and hash, stored privately as a kit file (the same content twice → the same kit file).
        if(path==='/api/brand-kit/reuse-document'){
          const doc=await engine.kitReusableDocument(token,string(input.brandId),input.documentId);
          const data=await readFile(resolveDocumentStoragePath(doc.storageKey));
          if(createHash('sha256').update(data).digest('hex')!==doc.sha256)throw new AppError('CONFLICT','The stored document changed; upload it again');
          const info=inspectKitAsset(new Uint8Array(data));
          if(info.kind!=='DOCUMENT')throw new AppError('INVALID','Only a PDF can be used as the brand manual');
          const assetId=randomUUID(),storageKey=`${doc.workspaceId}/${doc.brandId}/kit-${assetId}/original`,target=resolveDocumentStoragePath(storageKey);
          await mkdir(dirname(target),{recursive:true});
          await writeFile(target,data,{flag:'wx'});
          let result:{assetId:string;reused:boolean};
          try{result=await engine.registerKitAsset(token,doc.brandId,{id:assetId,role:'MANUAL',originalName:doc.originalName,info,bytes:data.length,sha256:doc.sha256,storageKey});}
          catch(error){await rm(dirname(target),{recursive:true,force:true});throw error;}
          if(result.reused)await rm(dirname(target),{recursive:true,force:true});
          return send(res,result.reused?200:201,result);
        }
        // ADR-0033 · collaboration. Team routes go through membership + brand scope; portal routes through the guest
        // context of that exact brand. Neither path reads the other's data.
        // ADR-0035 · Clientes (team): membership + brand scope; guests never pass the brand scope.
        if(path.startsWith('/api/clients/')){const action=path.slice('/api/clients/'.length);if(['create','update','segment','form','disable-form'].includes(action)){const r=await engine.clientsCommand(token,action as 'create',input);return send(res,action==='update'||action==='disable-form'||r.replayed?200:201,r);}}
        if(path.startsWith('/api/collaboration/')){const action=path.slice('/api/collaboration/'.length);if(['invite','revoke-invitation','revoke-guest','share','withdraw','comment'].includes(action))return send(res,action==='invite'||action==='share'?201:200,await engine.collaborationCommand(token,action as 'invite',input));}
        if(path==='/api/invitations/accept') return send(res,200,await engine.acceptInvitation(token,{token:input.token}));
        if(path==='/api/portal/comment') return send(res,201,await engine.portalComment(token,{brandId:input.brandId,shareId:input.shareId,body:input.body,idempotencyKey:input.idempotencyKey}));
        if(path==='/api/portal/decide') return send(res,200,await engine.portalDecide(token,{brandId:input.brandId,shareId:input.shareId,fingerprint:input.fingerprint,decision:input.decision,comment:input.comment,idempotencyKey:input.idempotencyKey}));
        if(path==='/api/brand-kit/apply-direction') return send(res,200,await engine.applyIdentityDirection(token,input));
        if(path.startsWith('/api/brand-kit/')){const action=path.slice('/api/brand-kit/'.length);if(['start','draft','adopt','submit','decide','publish'].includes(action))return send(res,action==='start'?201:200,await engine.kitCommand(token,action as 'start',input));}
        // PHASE4_SPEC §4.4 · deliverables: one path per operation; authorization, revision and audit in the engine.
        if(path.startsWith('/api/deliverables/')){const action=path.slice('/api/deliverables/'.length);if(['create','draft','submit','decide','new-draft','retire','publication'].includes(action))return send(res,action==='create'||action==='publication'?201:200,await engine.deliverableCommand(token,action as 'create',input));}
        // PHASE4_SPEC §4.2 · marketing plan: one path per operation; authorization, revision and audit in the engine.
        if(path.startsWith('/api/plan/')){const action=path.slice('/api/plan/'.length);if(['create','update','add-objective','update-objective','add-action','update-action','action-status','share','decide-share'].includes(action))return send(res,action==='create'||action==='share'||action.startsWith('add-')?201:200,await engine.planCommand(token,action as 'create',input));}
        if(path.startsWith('/api/offers/')){const action=path.slice('/api/offers/'.length);if(['create','draft','submit','decide','new-draft','retire'].includes(action))return send(res,action==='create'?201:200,await engine.offerCommand(token,action as 'create',input));}
        if(path==='/api/brands/capabilities') return send(res,200,await engine.changeBrandCapability(token,{brandId:input.brandId,userId:input.userId,capability:input.capability,grant:input.grant}));
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

        if(path==='/api/brando/suggestions/review')return send(res,200,await engine.reviewBrandoSuggestion(token,string(input.brandId),input.review as Parameters<Engine['reviewBrandoSuggestion']>[2]));
        // ADR-0030 · Brando for marketing: proposal only (no writes); same AI limiter, consent gate and daily cap.
        if(path==='/api/brando/marketing') return send(res,200,await engine.proposeDeliverable(token,input));
        // ADR-0034 · Brando visual directions: proposal only; same AI limiter, consent gate and daily cap.
        if(path==='/api/brando/identity') return send(res,200,await engine.proposeIdentityDirections(token,input));
        if(path==='/api/brando/ask') {
          const result=await engine.askBrando(token,string(input.brandId),string(input.message),input.questionId==null?null:string(input.questionId),input.history as {question:string;answer:string}[]|undefined,input.interpretation as Parameters<Engine['askBrando']>[5]);
          if(pilot)await pilot.authorize(token);
          if(pilot)console.log(JSON.stringify({event:'brando_request',requestId,outcome:result.error??'OK',provider:result.provider,latencyMs:result.trace.latencyMs,tokenIn:result.trace.tokenIn,tokenOut:result.trace.tokenOut}));
          return send(res,200,result);
        }
        if(path==='/api/recommendations/generate') {
          const result=await engine.analyze(token,string(input.brandId),string(input.questionId));
          // Outcome only; no prompt, context or proposal text.
          if(pilot)console.log(JSON.stringify({event:'ai_request',requestId,outcome:result.error??'OK',provider:result.provider}));
          return send(res,200,result);
        }
        if(path==='/api/recommendations/reject') return send(res,200,await engine.rejectRecommendation(token,string(input.brandId),string(input.recommendationId),string(input.rationale)));
        if(path==='/api/learning/create') return send(res,201,await engine.createLearningObject(token,string(input.brandId),string(input.kind),input.entity as Record<string,unknown>,input.decisionId===undefined?undefined:string(input.decisionId),input.plan as {objective:string;successCriteria:string}|undefined,input.idempotencyKey===undefined?undefined:string(input.idempotencyKey)));
        if(path==='/api/learning/transition') return send(res,200,await engine.transitionLearningObject(token,string(input.brandId),string(input.kind),string(input.objectId),string(input.expectedStatus),string(input.status),input.rationale===undefined?undefined:string(input.rationale)));
        if(path==='/api/reflections') return send(res,201,await engine.createReflection(token,input as Parameters<Engine['createReflection']>[1]));
        if(path==='/api/learning/revise') return send(res,200,await engine.reviseLearning(token,string(input.brandId),string(input.learningId),string(input.expectedStatus),input.changes as Record<string,unknown>,input.expected as Record<string,unknown>));
        if(path==='/api/hypotheses/review') return send(res,200,await engine.reviewHypothesis(token,string(input.brandId),input.review as Parameters<Engine['reviewHypothesis']>[2]));
        if(path==='/api/questions/transition') return send(res,200,await engine.transitionQuestion(token,string(input.brandId),string(input.questionId),string(input.status)));
        if(path==='/api/brands/strategic-sections') return send(res,200,await engine.addStrategicSections(token,string(input.brandId)));
        if(path==='/api/questions/prepare') return send(res,200,await engine.prepareQuestion(token,string(input.brandId),string(input.questionId),input.expectedActiveVersion===null?null:string(input.expectedActiveVersion)));
        if(path==='/api/decisions/commit') return send(res,200,await engine.commitDecision(token,input.command as CommitCommand,input.reviewToken===undefined?undefined:string(input.reviewToken),input.brandoReview as Parameters<Engine['commitDecision']>[3]));
        if(path==='/api/reviews/start') return send(res,200,await engine.beginReview(token,string(input.brandId),string(input.decisionId)));
        if(path==='/api/impacts/retry') return send(res,200,await engine.retryImpact(token,string(input.brandId)));
        if(path==='/api/impacts/shown') return send(res,200,await engine.showImpact(token,string(input.brandId)));
        if(path==='/api/evidence/opened') {await engine.evidenceOpened(token,string(input.brandId));return send(res,200,{recorded:true});}
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
        if(path==='/api/reflections') return send(res,200,await engine.reflections(token));
        if(path==='/api/blueprint') return send(res,200,await engine.blueprint(token,string(url.searchParams.get('brandId'))));
        if(path==='/api/blueprint/pdf'||path==='/api/brandbook/pdf') {
          // ADR-0028: two documents over one projection. Every read below is the authorized, workspace-scoped
          // one the Mapa estratégico view already uses, so either export carries exactly the strategy this
          // participant can already see — no more. Neither reads proposals, reflections or uploaded documents.
          const book=path==='/api/brandbook/pdf';
          const brandId=string(url.searchParams.get('brandId'));
          const [projection,brand,rejections]=await Promise.all([
            // The Brand Book is not a view of the Mapa: it reads the same projection without a blueprint_viewed event.
            book?engine.context(token,brandId):engine.blueprint(token,brandId),
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
          const input={
            brand,
            context:projection as unknown as Parameters<typeof buildBlueprintPdf>[0]['context'],
            competitiveStatus,
            generatedAt
          };
          const pdf=book?buildBrandBookPdf(input):buildBlueprintPdf(input);
          // Recorded only once the document exists, so a failed build never counts as an export.
          await (book?engine.brandBookExported(token,brandId):engine.blueprintExported(token,brandId));
          res.writeHead(200,{
            'Content-Type':'application/pdf',
            'Content-Length':String(pdf.byteLength),
            'Content-Disposition':`attachment; filename="${(book?brandBookFilename:blueprintFilename)(brand.name,generatedAt)}"`,
            'Cache-Control':'no-store'
          });
          return res.end(Buffer.from(pdf));
        }
        if(path==='/api/offers') return send(res,200,await engine.offers(token,string(url.searchParams.get('brandId'))));
        if(path==='/api/plan') return send(res,200,await engine.marketingPlan(token,string(url.searchParams.get('brandId')),Number(url.searchParams.get('year'))));
        if(path==='/api/collaboration') return send(res,200,await engine.collaboration(token,string(url.searchParams.get('brandId'))));
        if(path==='/api/clients') return send(res,200,await engine.clients(token,string(url.searchParams.get('brandId'))));
        if(path==='/api/results') return send(res,200,await engine.results(token,string(url.searchParams.get('brandId'))));
        if(path==='/api/brand-guide') return send(res,200,await engine.brandGuide(token,string(url.searchParams.get('brandId'))));
        if(path==='/api/portal/brands') return send(res,200,await engine.portalBrands(token));
        if(path==='/api/portal') return send(res,200,await engine.portal(token,url.searchParams.get('brandId')));
        // ADR-0033 · a guest previews only raster files cited by the published guide or an active shared kit version;
        // checked on every request, so a withdrawn access stops here too.
        if(path==='/api/portal/asset'){
          const asset=await engine.portalAssetFile(token,url.searchParams.get('brandId'),url.searchParams.get('assetId'));
          if(!['PNG','JPEG','WEBP'].includes(asset.format))throw new AppError('NOT_FOUND','Preview not available');
          const data=await readFile(resolveDocumentStoragePath(asset.storageKey));
          res.writeHead(200,{'Content-Type':asset.mediaType,'Content-Length':data.length,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox",'Content-Disposition':'inline'});
          return res.end(data);
        }
        if(path==='/api/brand-kit') return send(res,200,await engine.brandKit(token,string(url.searchParams.get('brandId'))));
        // ADR-0034 · preview of a raster kit file only (never SVG, PDF or fonts), authorized on every request.
        if(path==='/api/brand-kit/assets/preview'){
          const asset=await engine.kitAssetFile(token,string(url.searchParams.get('brandId')),url.searchParams.get('assetId'));
          if(!['PNG','JPEG','WEBP'].includes(asset.format))throw new AppError('NOT_FOUND','Preview not available');
          const data=await readFile(resolveDocumentStoragePath(asset.storageKey));
          res.writeHead(200,{'Content-Type':asset.mediaType,'Content-Length':data.length,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox",'Content-Disposition':'inline'});
          return res.end(data);
        }
        if(path==='/api/deliverables') return send(res,200,await engine.deliverables(token,string(url.searchParams.get('brandId')),url.searchParams.get('types')?.split(',').filter(Boolean).slice(0,5)??null));
        if(path==='/api/plan/shared') return send(res,200,await engine.sharedPlan(token,string(url.searchParams.get('brandId')),Number(url.searchParams.get('year'))));
        if(path==='/api/brand-setup') return send(res,200,await engine.setupDraft(token,url.searchParams.get('brandId')||null));
        if(path==='/api/brands/work-priority') return send(res,200,await engine.workPriority(token,string(url.searchParams.get('brandId'))));
        if(path==='/api/brands/capabilities') return send(res,200,await engine.brandCapabilities(token,string(url.searchParams.get('brandId'))));
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
