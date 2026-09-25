import { createServer as httpsServer } from 'node:https';
import { request } from 'node:http';
import type { AddressInfo } from 'node:net';
import { readFileSync,writeFileSync,mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import * as oidc from 'openid-client';
import { generateKeyPair,exportJWK,SignJWT } from 'jose';
import { databaseUrl } from '../scripts/local-db.js';
import { connect } from '../src/persistence/database.js';
import { migrateDatabase } from '../scripts/migrate.js';
import { PilotAccess } from '../src/application/pilot-access.js';
import { Engine } from '../src/application/engine.js';
import { ModelGateway } from '../src/domain/analysis.js';
import { UnavailableProvider } from '../src/transport/anthropic-provider.js';
import { PilotAuth } from '../src/transport/pilot-auth.js';
import { createApp } from '../src/transport/http.js';
import { runtimeAssets } from '../src/transport/server.js';
import { readiness } from '../src/persistence/readiness.js';
// Test-only fixtures: a throwaway PILOT database, a fixture OIDC provider and an operator revoke hook.
// Never imported by pilot:start; the production server has no HTTP provisioning or bypass.
if(process.env.DATABASE_URL)throw new Error('Browser fixtures require the local development DB.');
const folder='.local/pilot-browser';mkdirSync(folder,{recursive:true});
execFileSync(process.env.OPENSSL_BIN??(process.platform==='win32'?'C:/Program Files/Git/usr/bin/openssl.exe':'openssl'),['req','-x509','-newkey','rsa:2048','-nodes','-keyout',folder+'/key.pem','-out',folder+'/cert.pem','-days','1','-subj','/CN=127.0.0.1','-addext','subjectAltName=IP:127.0.0.1'],{stdio:'ignore'});
const admin=connect(databaseUrl()),name=`pilot_browser_${randomUUID().replaceAll('-','')}`;await admin.pool.query(`CREATE DATABASE "${name}"`);await admin.pool.end();
const db=connect(databaseUrl().replace(/\/postgres$/,`/${name}`));await migrateDatabase(db.db);
const origin='https://127.0.0.1:3002',issuer='https://browser-idp.example',clientId='fixture-client',access=new PilotAccess(db.db,issuer);
await access.provision('tester-a','A');await access.provision('tester-b','B');
for(const project of ['wide','desktop','compact','tablet','mobile'])await access.provision('fresh-'+project,'A');
// One session pair per viewport: each run ends with a real logout that revokes its own session.
const sessions:Record<string,unknown>={};for(const project of ['wide','desktop','compact','tablet','mobile'])sessions[project]={a:await access.issueSession('tester-a'),b:await access.issueSession('tester-b')};
writeFileSync(folder+'/sessions.json',JSON.stringify(sessions),{mode:0o600});
const {privateKey,publicKey}=await generateKeyPair('RS256'),jwk={...await exportJWK(publicKey),kid:'fixture',alg:'RS256',use:'sig'},codes=new Map<string,{nonce:string;subject:string}>();
const config=new oidc.Configuration({issuer,authorization_endpoint:origin+'/fixture-idp/authorize',token_endpoint:issuer+'/token',jwks_uri:issuer+'/jwks'},clientId,'fixture-secret');
config[oidc.customFetch]=async(url,options)=>{
  if(String(url).endsWith('/jwks'))return Response.json({keys:[jwk]});
  const code=new URLSearchParams(String(options.body)).get('code')??'',grant=codes.get(code);codes.delete(code);
  if(!grant)return Response.json({error:'invalid_grant'},{status:400});
  const id_token=await new SignJWT({nonce:grant.nonce,sub:grant.subject}).setProtectedHeader({alg:'RS256',kid:'fixture'}).setIssuer(issuer).setAudience(clientId).setIssuedAt().setExpirationTime('5m').sign(privateKey);
  return Response.json({access_token:'fixture-access',token_type:'Bearer',id_token});
};
// Five viewports share one loopback client; production limits are covered by the engine-level test.
const auth=new PilotAuth(db.db,config,origin,{limiter:{allow:()=>true}});
const app=createApp(new Engine(db.db,undefined,new ModelGateway(new UnavailableProvider(),'pilot-strategic-v1')),path=>{const entry=runtimeAssets[path as keyof typeof runtimeAssets];return entry?{content:readFileSync(entry[0]),type:entry[1]}:undefined;},()=>readiness(db.pool),auth);
await new Promise<void>(r=>app.listen(0,'127.0.0.1',r));
const cookie=(header:string|undefined,key:string)=>header?.split(';').map(c=>c.trim()).find(c=>c.startsWith(key+'='))?.slice(key.length+1);
const server=httpsServer({key:readFileSync(folder+'/key.pem'),cert:readFileSync(folder+'/cert.pem')},(req,res)=>{
  const url=new URL(req.url??'/',origin);
  if(url.pathname==='/fixture-idp/authorize'){
    const subject=cookie(req.headers.cookie,'fixture_subject')??'unknown',code=randomUUID();codes.set(code,{nonce:url.searchParams.get('nonce')??'',subject});
    const back=new URL(url.searchParams.get('redirect_uri')!);back.searchParams.set('code',code);back.searchParams.set('state',url.searchParams.get('state')??'');
    res.writeHead(302,{Location:back.href});res.end();return;
  }
  if(url.pathname==='/fixture-admin/revoke'){
    void access.inspect({subject:url.searchParams.get('subject')??''}).then(who=>access.revokeSessions(who.userId)).then(r=>{res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(r));},()=>{res.writeHead(404);res.end();});return;
  }
  const upstream=request({host:'127.0.0.1',port:(app.address() as AddressInfo).port,path:req.url,method:req.method,headers:req.headers},response=>{res.writeHead(response.statusCode??503,response.headers);response.pipe(res);});
  upstream.on('error',()=>{res.writeHead(503);res.end();});req.pipe(upstream);
});
server.listen(3002,'127.0.0.1');let closing=false;const stop=async()=>{if(closing)return;closing=true;await new Promise<void>(r=>server.close(()=>r()));await new Promise<void>(r=>app.close(()=>r()));await db.pool.end();};process.once('SIGINT',stop);process.once('SIGTERM',stop);
