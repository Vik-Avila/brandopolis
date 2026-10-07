import { describe,it,expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { generateKeyPair,exportJWK,SignJWT } from 'jose';
import * as oidc from 'openid-client';
import { and,eq,inArray } from 'drizzle-orm';
import type { AddressInfo } from 'node:net';
import { connect } from '../src/persistence/database.js';
import { startLocalDb,stopLocalDb } from '../scripts/local-db.js';
import { migrateDatabase } from '../scripts/migrate.js';
import { coldCopy } from '../scripts/local-recovery.js';
import { resolve,dirname } from 'node:path';
import { existsSync,mkdirSync,writeFileSync,readFileSync,copyFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { readiness,dataClassViolation } from '../src/persistence/readiness.js';
import { Engine,hash } from '../src/application/engine.js';
import { ACCESS_STATUS,ACCESS_STATUSES,DEMO_BRAND,GEOGRAPHIC_INFLUENCE,PilotAccess } from '../src/application/pilot-access.js';
import { PilotAuth,pilotDefaultAccessStatus,type PilotBoundary } from '../src/transport/pilot-auth.js';
import { createApp,RateLimiter } from '../src/transport/http.js';
import { AnthropicProvider,UnavailableProvider } from '../src/transport/anthropic-provider.js';
import { ModelGateway,DemoProvider,type GatewayRequest } from '../src/domain/analysis.js';
import * as t from '../src/persistence/schema.js';
import { seedIdentity } from '../scripts/seed.js';

export function pilotCases(connection:()=>ReturnType<typeof connect>){
 describe('PILOT boundaries',()=>{
  async function setup(){const {db}=connection(),access=new PilotAccess(db,'https://issuer.example'),subject=randomUUID(),who=await access.provision(subject,'A'),session=await access.issueSession(subject);return {db,access,who,session,subject,engine:new Engine(db)};}
  it('recognises verified identities, self-provisions only when enabled, and never duplicates an account',async()=>{
   const {db}=connection(),access=new PilotAccess(db,'https://issuer.example');
   const subject='self-'+randomUUID(),claims=(over:Record<string,unknown>={})=>({subject,email:`${subject}@example.test`,emailVerified:true,displayName:'Estratega',avatarUrl:null,...over});
   // Fail-closed: an unknown identity is denied while auto-provisioning is off.
   await expect(access.recognise(claims(),false)).rejects.toMatchObject({code:'FORBIDDEN'});
   // A verified email is mandatory even when auto-provisioning is on.
   await expect(access.recognise(claims({email:undefined}),true)).rejects.toMatchObject({code:'FORBIDDEN'});
   await expect(access.recognise(claims({emailVerified:false}),true)).rejects.toMatchObject({code:'FORBIDDEN'});
   const userId=await access.recognise(claims(),true);
   const [account]=await db.select().from(t.userAccounts).where(eq(t.userAccounts.userId,userId));
   expect(account.normalizedEmail).toBe(`${subject}@example.test`.toLowerCase());
   expect(account.emailVerifiedAt).toBeInstanceOf(Date);
   // The same identity signing in again reuses the same user and workspace.
   expect(await access.recognise(claims(),true)).toBe(userId);
   const identities=await db.select().from(t.pilotIdentities).where(and(eq(t.pilotIdentities.issuer,'https://issuer.example'),eq(t.pilotIdentities.subject,subject)));
   expect(identities).toHaveLength(1);
   // Concurrent first callbacks for one identity must not create a second account or workspace.
   const racer='race-'+randomUUID(),raceClaims={subject:racer,email:`${racer}@example.test`,emailVerified:true};
   const settled=await Promise.allSettled([access.recognise(raceClaims,true),access.recognise(raceClaims,true),access.recognise(raceClaims,true)]);
   const winners=new Set(settled.flatMap(r=>r.status==='fulfilled'?[r.value]:[]));
   expect(winners.size).toBe(1);
   expect(await db.select().from(t.pilotIdentities).where(and(eq(t.pilotIdentities.issuer,'https://issuer.example'),eq(t.pilotIdentities.subject,racer)))).toHaveLength(1);
   // A disabled identity stays denied even with auto-provisioning on.
   await access.disable(userId);
   await expect(access.issueSession(subject)).rejects.toMatchObject({code:'FORBIDDEN'});
  });
  it('assigns a deterministic cohort from the canonical identity, never at random',async()=>{
   const issuer='https://issuer.example',subject='cohort-fixture';
   const once=PilotAccess.cohortFor(issuer,subject);
   expect(['A','B']).toContain(once);
   for(let i=0;i<5;i++)expect(PilotAccess.cohortFor(issuer,subject)).toBe(once);
   // Different identities distribute across both arms; the issuer participates in the hash.
   const spread=new Set(Array.from({length:40},(_,i)=>PilotAccess.cohortFor(issuer,'spread-'+i)));
   expect(spread).toEqual(new Set(['A','B']));
   expect(PilotAccess.cohortFor('https://other.example',subject)).toBeDefined();
  });
  // MULTI-USER GOOGLE READINESS. Certifies that nothing in the auth path is bound to one user, one
  // email, one workspace or one pre-provisioned identity.
  it('serves arbitrary verified Google identities: distinct users, distinct private workspaces, no sharing',async()=>{
   const {db}=connection(),issuer='https://accounts.google.com',access=new PilotAccess(db,issuer);
   const run=randomUUID().slice(0,8);
   const claimsFor=(who:string)=>({subject:`google-${who}-${run}`,email:`${who}.${run}@example.test`,emailVerified:true,displayName:`Estratega ${who.toUpperCase()}`,avatarUrl:null});
   const A=claimsFor('a'),B=claimsFor('b');

   // Two different Google identities each self-provision.
   const userA=await access.recognise(A,true),userB=await access.recognise(B,true);
   expect(userA).not.toBe(userB);

   const identityOf=async(subject:string)=>(await db.select().from(t.pilotIdentities).where(and(eq(t.pilotIdentities.issuer,issuer),eq(t.pilotIdentities.subject,subject))))[0];
   const idA=await identityOf(A.subject),idB=await identityOf(B.subject);
   expect(idA.workspaceId).not.toBe(idB.workspaceId);      // private workspace each
   expect(idA.active).toBe(true);expect(idB.active).toBe(true);

   // Active membership with the right to create brands, for both.
   for(const id of [idA,idB]){
    const [member]=await db.select().from(t.memberships).where(and(eq(t.memberships.workspaceId,id.workspaceId),eq(t.memberships.userId,id.userId)));
    expect(member.active).toBe(true);expect(member.canCreateBrand).toBe(true);expect(member.role).toBe('MEMBER');
   }

   // Repeated sign-in reuses the same canonical user; it never creates a second one.
   expect(await access.recognise(A,true)).toBe(userA);
   expect(await access.recognise(B,true)).toBe(userB);
   expect(await db.select().from(t.pilotIdentities).where(and(eq(t.pilotIdentities.issuer,issuer),eq(t.pilotIdentities.subject,A.subject)))).toHaveLength(1);
   expect(await db.select().from(t.pilotIdentities).where(and(eq(t.pilotIdentities.issuer,issuer),eq(t.pilotIdentities.subject,B.subject)))).toHaveLength(1);

   // Tenant isolation across the real product surface, not just the identity tables.
   const engine=new Engine(db);
   const sessionA=await access.issueSession(A.subject),sessionB=await access.issueSession(B.subject);
   const brandA=await engine.createBrand(sessionA.token,'Marca A','Contexto privado de A');
   const brandB=await engine.createBrand(sessionB.token,'Marca B','Contexto privado de B');
   expect((await engine.listBrands(sessionA.token)).map(x=>x.id)).toEqual([brandA.id]);
   expect((await engine.listBrands(sessionB.token)).map(x=>x.id)).toEqual([brandB.id]);
   // Strategic context, documents and decisions of one are unreachable from the other.
   await expect(engine.context(sessionB.token,brandA.id)).rejects.toMatchObject({code:'NOT_FOUND'});
   await expect(engine.context(sessionA.token,brandB.id)).rejects.toMatchObject({code:'NOT_FOUND'});
   await expect(engine.listSourceDocuments(sessionB.token,brandA.id)).rejects.toMatchObject({code:'NOT_FOUND'});
   await expect(engine.blueprint(sessionB.token,brandA.id)).rejects.toMatchObject({code:'NOT_FOUND'});
   await expect(engine.documentUploadScope(sessionB.token,brandA.id)).rejects.toMatchObject({code:'NOT_FOUND'});
   await expect(engine.captureContext(sessionB.token,brandA.id,'evidence',{claim:'intento de fuga'})).rejects.toMatchObject({code:'NOT_FOUND'});
   await expect(access.assign(idB.userId,brandA.id)).rejects.toMatchObject({code:'NOT_FOUND'});
   // Sessions do not cross either.
   expect((await access.authorize(sessionA.token)).userId).toBe(userA);
   expect((await access.authorize(sessionB.token)).userId).toBe(userB);
  });

  it('keeps canonical identity at issuer+subject: email is profile metadata and cannot take an account over',async()=>{
   const {db}=connection(),issuer='https://accounts.google.com',access=new PilotAccess(db,issuer);
   const run=randomUUID().slice(0,8),shared=`shared.${run}@example.test`;
   const first={subject:`google-first-${run}`,email:shared,emailVerified:true,displayName:'Primera',avatarUrl:null};
   const owner=await access.recognise(first,true);

   // Same identity, same email: same user. The profile refreshes, the identity does not move.
   expect(await access.recognise({...first,displayName:'Primera Renombrada'},true)).toBe(owner);
   const [profile]=await db.select().from(t.userAccounts).where(eq(t.userAccounts.userId,owner));
   expect(profile.displayName).toBe('Primera Renombrada');
   expect(profile.normalizedEmail).toBe(shared.toLowerCase());

   // A DIFFERENT subject presenting the SAME verified email must never become the first account.
   const impostor={subject:`google-second-${run}`,email:shared,emailVerified:true,displayName:'Segunda',avatarUrl:null};
   await expect(access.recognise(impostor,true)).rejects.toBeTruthy();
   // Fail-safe: the first account is untouched and no identity was created for the second subject.
   const [stillOwner]=await db.select().from(t.userAccounts).where(eq(t.userAccounts.normalizedEmail,shared.toLowerCase()));
   expect(stillOwner.userId).toBe(owner);
   expect(stillOwner.displayName).toBe('Primera Renombrada');
   expect(await db.select().from(t.pilotIdentities).where(and(eq(t.pilotIdentities.issuer,issuer),eq(t.pilotIdentities.subject,impostor.subject)))).toHaveLength(0);
   // And the impostor cannot obtain a session.
   await expect(access.issueSession(impostor.subject)).rejects.toMatchObject({code:'FORBIDDEN'});

   // Changing the email on an existing identity does not repoint anyone else's account.
   const moved=`moved.${run}@example.test`;
   expect(await access.recognise({...first,email:moved},true)).toBe(owner);
   const [after]=await db.select().from(t.userAccounts).where(eq(t.userAccounts.userId,owner));
   expect(after.normalizedEmail).toBe(moved.toLowerCase());
  });

  it('gates self-provisioning on the flag and on verified Google claims',async()=>{
   const {db}=connection(),issuer='https://accounts.google.com',access=new PilotAccess(db,issuer);
   const run=randomUUID().slice(0,8);
   const fresh=(tag:string)=>({subject:`gate-${tag}-${run}`,email:`gate.${tag}.${run}@example.test`,emailVerified:true});

   // OFF: a perfectly valid, verified, unknown Google identity is denied and nothing is created.
   const denied=fresh('off');
   await expect(access.recognise(denied,false)).rejects.toMatchObject({code:'FORBIDDEN'});
   expect(await db.select().from(t.pilotIdentities).where(and(eq(t.pilotIdentities.issuer,issuer),eq(t.pilotIdentities.subject,denied.subject)))).toHaveLength(0);

   // ON: the same identity is provisioned.
   const userId=await access.recognise(denied,true);
   expect(userId).toBeTruthy();
   // Reused, never recreated, and the flag no longer matters for a known identity.
   expect(await access.recognise(denied,false)).toBe(userId);

   // First-time provisioning demands sub, email and email_verified===true.
   await expect(access.recognise({subject:'',email:`x.${run}@example.test`,emailVerified:true},true)).rejects.toMatchObject({code:'FORBIDDEN'});
   await expect(access.recognise({subject:`gate-noemail-${run}`,emailVerified:true},true)).rejects.toMatchObject({code:'FORBIDDEN'});
   await expect(access.recognise({...fresh('unverified'),emailVerified:false},true)).rejects.toMatchObject({code:'FORBIDDEN'});
   await expect(access.recognise({...fresh('undef')},true)).resolves.toBeTruthy();

   // A disabled account stays denied whatever the flag says, and is never re-provisioned.
   await access.disable(userId);
   await expect(access.issueSession(denied.subject)).rejects.toMatchObject({code:'FORBIDDEN'});
   expect(await access.recognise(denied,true)).toBe(userId);   // recognised, still the same user
   await expect(access.issueSession(denied.subject)).rejects.toMatchObject({code:'FORBIDDEN'});
   expect(await db.select().from(t.pilotIdentities).where(and(eq(t.pilotIdentities.issuer,issuer),eq(t.pilotIdentities.subject,denied.subject)))).toHaveLength(1);

   // An identity from another issuer is a different principal entirely.
   const otherIssuer=new PilotAccess(db,'https://login.microsoftonline.com/x');
   await expect(otherIssuer.issueSession(denied.subject)).rejects.toMatchObject({code:'FORBIDDEN'});
  });

  it('does not duplicate accounts when several Google identities sign in for the first time at once',async()=>{
   const {db}=connection(),issuer='https://accounts.google.com',access=new PilotAccess(db,issuer);
   const run=randomUUID().slice(0,8);
   const people=['p1','p2','p3'].map(tag=>({subject:`burst-${tag}-${run}`,email:`burst.${tag}.${run}@example.test`,emailVerified:true}));
   // Each identity races itself three times, and all identities race each other.
   const attempts=people.flatMap(claims=>[claims,claims,claims].map(c=>access.recognise(c,true)));
   const settled=await Promise.allSettled(attempts);
   const byPerson=new Map<string,Set<string>>();
   settled.forEach((r,i)=>{if(r.status==='fulfilled')byPerson.set(people[Math.floor(i/3)].subject,(byPerson.get(people[Math.floor(i/3)].subject)??new Set()).add(r.value));});
   expect(byPerson.size).toBe(3);
   for(const [subject,ids] of byPerson){
    expect(ids.size,`${subject} resolved to one canonical user`).toBe(1);
    expect(await db.select().from(t.pilotIdentities).where(and(eq(t.pilotIdentities.issuer,issuer),eq(t.pilotIdentities.subject,subject)))).toHaveLength(1);
   }
   // Three people, three distinct users and three distinct workspaces.
   const users=[...byPerson.values()].map(s=>[...s][0]);
   expect(new Set(users).size).toBe(3);
   const workspaces=await Promise.all(users.map(async u=>(await db.select().from(t.pilotIdentities).where(eq(t.pilotIdentities.userId,u)))[0].workspaceId));
   expect(new Set(workspaces).size).toBe(3);
  });

  // ACCESS POLICY. The current validation phase admits every authenticated participant immediately, but
  // the model keeps PENDING and SUSPENDED live so a future controlled pilot is a configuration change.
  it('admits new participants immediately under the current APPROVED policy, and isolates them',async()=>{
   const {db}=connection(),issuer='https://accounts.google.com',access=new PilotAccess(db,issuer);
   const run=randomUUID().slice(0,8),engine=new Engine(db);
   const claims=(tag:string)=>({subject:`policy-${tag}-${run}`,email:`policy.${tag}.${run}@example.test`,emailVerified:true});
   const A=claims('a'),B=claims('b');

   // Default policy: no explicit status argument means APPROVED for this phase.
   const userA=await access.recognise(A,true);
   const [idA]=await db.select().from(t.userAccounts).where(eq(t.userAccounts.userId,userA));
   expect(idA.accessStatus).toBe(ACCESS_STATUS.approved);

   // Immediate access to the private workspace: no manual approval step in between.
   const sessionA=await access.issueSession(A.subject);
   const brandA=await engine.createBrand(sessionA.token,'Marca A','Contexto de A');
   expect((await access.authorize(sessionA.token)).userId).toBe(userA);

   // A second auto-approved participant is still a separate tenant.
   const userB=await access.recognise(B,true);
   const sessionB=await access.issueSession(B.subject);
   expect(userB).not.toBe(userA);
   expect(await engine.listBrands(sessionB.token)).toEqual([]);
   await expect(engine.context(sessionB.token,brandA.id)).rejects.toMatchObject({code:'NOT_FOUND'});

   // Signing in again preserves the status rather than re-deciding it.
   expect(await access.recognise(A,true)).toBe(userA);
   const [again]=await db.select().from(t.userAccounts).where(eq(t.userAccounts.userId,userA));
   expect(again.accessStatus).toBe(ACCESS_STATUS.approved);
  });

  it('supports a PENDING gateway and SUSPENDED enforcement without a schema change',async()=>{
   const {db}=connection(),issuer='https://accounts.google.com',access=new PilotAccess(db,issuer);
   const run=randomUUID().slice(0,8);
   const waiting={subject:`pending-${run}`,email:`pending.${run}@example.test`,emailVerified:true};

   // PENDING: the account exists, but access is withheld until something approves it.
   const userId=await access.recognise(waiting,true,ACCESS_STATUS.pending);
   const [profile]=await db.select().from(t.userAccounts).where(eq(t.userAccounts.userId,userId));
   expect(profile.accessStatus).toBe(ACCESS_STATUS.pending);
   expect((await db.select().from(t.pilotIdentities).where(eq(t.pilotIdentities.userId,userId)))[0].active).toBe(true);                       // not disabled, just not admitted yet
   await expect(access.issueSession(waiting.subject)).rejects.toMatchObject({code:'FORBIDDEN'});
   // A repeat sign-in does not silently promote them.
   expect(await access.recognise(waiting,true,ACCESS_STATUS.pending)).toBe(userId);
   await expect(access.issueSession(waiting.subject)).rejects.toMatchObject({code:'FORBIDDEN'});
   // Flipping the default policy must not retroactively approve an existing PENDING participant.
   expect(await access.recognise(waiting,true,ACCESS_STATUS.approved)).toBe(userId);
   expect((await db.select().from(t.userAccounts).where(eq(t.userAccounts.userId,userId)))[0].accessStatus).toBe(ACCESS_STATUS.pending);
   await expect(access.issueSession(waiting.subject)).rejects.toMatchObject({code:'FORBIDDEN'});

   // Approving opens the workspace, and the same account is reused.
   await access.setAccessStatus(userId,ACCESS_STATUS.approved);
   const session=await access.issueSession(waiting.subject);
   expect((await access.authorize(session.token)).userId).toBe(userId);

   // SUSPENDED withdraws access immediately: the live session is revoked outright, so the very next
   // request fails at session lookup rather than merely being refused authorization.
   await access.setAccessStatus(userId,ACCESS_STATUS.suspended);
   await expect(access.authorize(session.token)).rejects.toMatchObject({code:'UNAUTHORIZED'});
   await expect(access.issueSession(waiting.subject)).rejects.toMatchObject({code:'FORBIDDEN'});
   // Defence in depth: even a session that somehow outlives the status change is refused, so the guard
   // does not depend on revocation having happened.
   await access.setAccessStatus(userId,ACCESS_STATUS.approved);
   const live=await access.issueSession(waiting.subject);
   expect((await access.authorize(live.token)).userId).toBe(userId);
   await db.update(t.userAccounts).set({accessStatus:ACCESS_STATUS.suspended}).where(eq(t.userAccounts.userId,userId));
   await expect(access.authorize(live.token)).rejects.toMatchObject({code:'FORBIDDEN'});
   // Signing in again does not resurrect a suspended participant, whatever the default policy says.
   expect(await access.recognise(waiting,true,ACCESS_STATUS.approved)).toBe(userId);
   await expect(access.issueSession(waiting.subject)).rejects.toMatchObject({code:'FORBIDDEN'});
   // The account itself is preserved, not deleted.
   expect((await db.select().from(t.userAccounts).where(eq(t.userAccounts.userId,userId)))[0].accessStatus).toBe(ACCESS_STATUS.suspended);

   // An invalid status is refused rather than stored.
   await expect(access.setAccessStatus(userId,'BANNED' as never)).rejects.toMatchObject({code:'INVALID'});
  });

  it('reads the default access policy from configuration, never from hardcoded logic',async()=>{
   // Current validation phase: unset means APPROVED.
   expect(pilotDefaultAccessStatus({})).toBe(ACCESS_STATUS.approved);
   expect(pilotDefaultAccessStatus({PILOT_DEFAULT_ACCESS_STATUS:''})).toBe(ACCESS_STATUS.approved);
   expect(pilotDefaultAccessStatus({PILOT_DEFAULT_ACCESS_STATUS:'APPROVED'})).toBe(ACCESS_STATUS.approved);
   // A future controlled pilot switches with one variable.
   expect(pilotDefaultAccessStatus({PILOT_DEFAULT_ACCESS_STATUS:'PENDING'})).toBe(ACCESS_STATUS.pending);
   // A default of SUSPENDED would create accounts that can never sign in.
   expect(()=>pilotDefaultAccessStatus({PILOT_DEFAULT_ACCESS_STATUS:'SUSPENDED'})).toThrow(/APPROVED or PENDING/);
   for(const bad of ['approved','Pending','YES','1'])
    expect(()=>pilotDefaultAccessStatus({PILOT_DEFAULT_ACCESS_STATUS:bad}),bad).toThrow(/PILOT_DEFAULT_ACCESS_STATUS/);
   // All three states stay part of the model.
   expect([...ACCESS_STATUSES].sort()).toEqual(['APPROVED','PENDING','SUSPENDED']);
  });

  it('keeps operator-disabled participants denied regardless of access status',async()=>{
   const {db}=connection(),issuer='https://accounts.google.com',access=new PilotAccess(db,issuer);
   const run=randomUUID().slice(0,8);
   const person={subject:`disabled-${run}`,email:`disabled.${run}@example.test`,emailVerified:true};
   const userId=await access.recognise(person,true);
   await access.issueSession(person.subject);
   await access.disable(userId);
   // disable() is the hard kill and outranks an APPROVED status.
   const [identity]=await db.select().from(t.pilotIdentities).where(eq(t.pilotIdentities.userId,userId));
   expect(identity.active).toBe(false);
   expect((await db.select().from(t.userAccounts).where(eq(t.userAccounts.userId,userId)))[0].accessStatus).toBe(ACCESS_STATUS.approved);
   await expect(access.issueSession(person.subject)).rejects.toMatchObject({code:'FORBIDDEN'});
   // Re-approving does not undo a disable.
   await access.setAccessStatus(userId,ACCESS_STATUS.approved);
   await expect(access.issueSession(person.subject)).rejects.toMatchObject({code:'FORBIDDEN'});
  });

  // METRIC INTEGRITY. CoffeePolis exists to teach the product; it must never be presented as work the
  // participant did. These assertions are the guard on competition evidence.
  it('seeds a CoffeePolis sandbox that never counts as participant-created strategic work',async()=>{
   const {db}=connection(),issuer='https://accounts.google.com',access=new PilotAccess(db,issuer);
   const run=randomUUID().slice(0,8),engine=new Engine(db);
   const claims={subject:`demo-${run}`,email:`demo.${run}@example.test`,emailVerified:true};
   const userId=await access.recognise(claims,true);
   const session=await access.issueSession(claims.subject);

   // First entry seeds the sandbox; a second entry must not seed another.
   const seeded=await access.ensureDemoBrand(session.token);
   expect(seeded?.name).toBe(DEMO_BRAND.name);
   expect(await access.ensureDemoBrand(session.token)).toBeNull();
   expect(await engine.listBrands(session.token)).toHaveLength(1);

   // Classified server-side, with the canonical geography: a local brand, not a national one.
   const [profile]=await db.select().from(t.brandProfiles).where(eq(t.brandProfiles.brandId,seeded!.id));
   expect(profile.isDemo).toBe(true);
   expect(profile.geographicInfluence).toBe('LOCAL');
   expect(profile.primaryMarket).toBe('Xalapa, Veracruz');

   // It is explorable: a decision can be taken inside it.
   const q=(await engine.context(session.token,seeded!.id)).questions.find((x:{module:string})=>x.module==='Primary Customer')!;
   await engine.prepareQuestion(session.token,seeded!.id,q.id,null);
   await engine.commitDecision(session.token,{brandId:seeded!.id,questionId:q.id,selectedOption:'Millennials de Xalapa',rationale:'Exploración del demo',expectedActiveVersion:null,actorUserId:userId,sourceRecommendationId:null,idempotencyKey:randomUUID()});

   // ...and none of that demo activity reaches the participant metrics.
   const only=(await access.metrics()).find(m=>m.userId===userId)!;
   expect(only.brands,'demo brand must not count as a real brand').toBe(0);
   expect(only.decisionsApproved,'demo decision must not count').toBe(0);
   expect(only.activated,'demo activity must not activate a participant').toBe(false);
   expect(only.timeToFirstDecisionSeconds,'TTFD must ignore demo-only decisions').toBeNull();
   expect(only.secondHighValueEvent14d).toBe(false);
   // Demo exploration stays visible, separately, so reports can distinguish it.
   expect(only.demoBrands).toBe(1);
   expect(only.demoDecisions).toBe(1);

   // The first REAL brand is the first real brand, and it does activate.
   const real=await engine.createBrand(session.token,'Mi marca real','Contexto propio');
   const rq=(await engine.context(session.token,real.id)).questions.find((x:{module:string})=>x.module==='Primary Customer')!;
   await engine.prepareQuestion(session.token,real.id,rq.id,null);
   await engine.commitDecision(session.token,{brandId:real.id,questionId:rq.id,selectedOption:'Equipos de marketing',rationale:'Decisión real',expectedActiveVersion:null,actorUserId:userId,sourceRecommendationId:null,idempotencyKey:randomUUID()});
   const afterReal=(await access.metrics()).find(m=>m.userId===userId)!;
   expect(afterReal.brands,'CoffeePolis + one real brand is ONE real brand').toBe(1);
   expect(afterReal.decisionsApproved).toBe(1);
   expect(afterReal.activated).toBe(true);
   expect(afterReal.timeToFirstDecisionSeconds).not.toBeNull();

   // A second real brand is what produces a second-brand signal, never the demo.
   await engine.createBrand(session.token,'Segunda marca real','Otro contexto');
   expect((await access.metrics()).find(m=>m.userId===userId)!.brands).toBe(2);
  });

  it('fills the demo sandbox with a worked strategy, idempotently, without ever overwriting real work',async()=>{
   const {db}=connection(),issuer='https://accounts.google.com',access=new PilotAccess(db,issuer);
   const run=randomUUID().slice(0,8),engine=new Engine(db);
   const claims={subject:`content-${run}`,email:`content.${run}@example.test`,emailVerified:true};
   const userId=await access.recognise(claims,true);
   const session=await access.issueSession(claims.subject);
   const demo=(await access.ensureDemoBrand(session.token))!;

   // A fresh sandbox is empty until the content runs: that is the production defect being fixed.
   expect((await engine.context(session.token,demo.id)).versions).toHaveLength(0);
   const seeded=await access.ensureDemoContent(session.token);
   expect(seeded?.decisions).toBe(9);

   // All nine journey decisions are approved, so the Blueprint has something to show (ADR-0021..0024).
   const filled=await engine.context(session.token,demo.id);
   expect(filled.versions).toHaveLength(9);
   const modules=filled.questions.filter((q:{id:string})=>filled.decisions.some((d:{questionId:string;activeVersionId:string|null})=>d.questionId===q.id&&d.activeVersionId)).map((q:{module:string})=>q.module);
   expect(new Set(modules)).toEqual(new Set(['Strategic Objective','Market Arena','Primary Customer','Value Mechanism','Positioning','Brand Promise','Core Message','GTM Priority','Priority Experiment']));
   // Seeded upstream first, so no connected decision predates its upstream: nothing asks for review.
   expect(filled.reviews).toHaveLength(0);
   expect(filled.decisions.every((d:{reviewStatus:string})=>d.reviewStatus==='APPROVED')).toBe(true);
   // Context: an explicit hypothesis and a labelled demo contribution, never invented research.
   expect(filled.hypotheses.length).toBeGreaterThanOrEqual(1);
   expect(JSON.stringify(filled.hypotheses)).toContain('Sin validar');
   expect(filled.userInputs.length).toBeGreaterThanOrEqual(1);
   expect((await engine.blueprint(session.token,demo.id)) as unknown).toBeTruthy();

   // Idempotent: running again changes nothing at all.
   expect(await access.ensureDemoContent(session.token)).toBeNull();
   expect(await access.ensureDemoContent(session.token)).toBeNull();
   const again=await engine.context(session.token,demo.id);
   expect(again.versions).toHaveLength(9);
   expect(again.hypotheses.length).toBe(filled.hypotheses.length);
   expect(again.userInputs.length).toBe(filled.userInputs.length);

   // ...and none of it reaches participant evidence.
   const metrics=(await access.metrics()).find(m=>m.userId===userId)!;
   expect(metrics.brands,'seeded demo is not a real brand').toBe(0);
   expect(metrics.decisionsApproved,'seeded demo decisions do not count').toBe(0);
   expect(metrics.activated,'a seeded demo never activates a participant').toBe(false);
   expect(metrics.timeToFirstDecisionSeconds).toBeNull();
   expect(metrics.timeToFirstInsightSeconds).toBeNull();
   expect(metrics.secondHighValueEvent14d).toBe(false);
   expect(metrics.demoDecisions).toBeGreaterThanOrEqual(9);
  });

  it('upgrades an older empty demo but never touches one the participant has worked in',async()=>{
   const {db}=connection(),issuer='https://accounts.google.com',access=new PilotAccess(db,issuer);
   const run=randomUUID().slice(0,8),engine=new Engine(db);

   // A CoffeePolis created before this content existed: seeded, but strategically empty.
   const older={subject:`older-${run}`,email:`older.${run}@example.test`,emailVerified:true};
   await access.recognise(older,true);
   const olderSession=await access.issueSession(older.subject);
   const olderDemo=(await access.ensureDemoBrand(olderSession.token))!;
   expect((await engine.context(olderSession.token,olderDemo.id)).versions).toHaveLength(0);
   expect((await access.ensureDemoContent(olderSession.token))?.decisions).toBe(9);
   expect((await engine.context(olderSession.token,olderDemo.id)).versions).toHaveLength(9);

   // A sandbox created before ADR-0021 (four sections) is seeded with what it has; sections are never added here.
   const preAdr={subject:`preadr-${run}`,email:`preadr.${run}@example.test`,emailVerified:true};
   await access.recognise(preAdr,true);
   const preAdrSession=await access.issueSession(preAdr.subject);
   const preAdrDemo=(await access.ensureDemoBrand(preAdrSession.token))!;
   await db.delete(t.questions).where(and(eq(t.questions.brandId,preAdrDemo.id),inArray(t.questions.module,['Strategic Objective','Market Arena','Brand Promise','GTM Priority','Priority Experiment'])));
   expect((await access.ensureDemoContent(preAdrSession.token))?.decisions).toBe(4);
   const preAdrContext=await engine.context(preAdrSession.token,preAdrDemo.id);
   expect(preAdrContext.questions.map((q:{module:string})=>q.module)).toEqual(['Primary Customer','Value Mechanism','Positioning','Core Message']);
   expect(preAdrContext.versions).toHaveLength(4);
   expect(preAdrContext.reviews).toHaveLength(0);

   // A participant who already decided something inside their demo keeps it, untouched.
   const edited={subject:`edited-${run}`,email:`edited.${run}@example.test`,emailVerified:true};
   const editedUser=await access.recognise(edited,true);
   const editedSession=await access.issueSession(edited.subject);
   const editedDemo=(await access.ensureDemoBrand(editedSession.token))!;
   const q=(await engine.context(editedSession.token,editedDemo.id)).questions.find((x:{module:string})=>x.module==='Primary Customer')!;
   await engine.prepareQuestion(editedSession.token,editedDemo.id,q.id,null);
   await engine.commitDecision(editedSession.token,{brandId:editedDemo.id,questionId:q.id,selectedOption:'Mi propia exploración',rationale:'Lo decidí yo',expectedActiveVersion:null,actorUserId:editedUser,sourceRecommendationId:null,idempotencyKey:randomUUID()});
   expect(await access.ensureDemoContent(editedSession.token),'must not seed over existing work').toBeNull();
   const kept=await engine.context(editedSession.token,editedDemo.id);
   expect(kept.versions).toHaveLength(1);
   expect(kept.versions[0].selectedOption).toBe('Mi propia exploración');

   // A workspace whose only brand is real is never seeded with demo content.
   const real={subject:`realonly-${run}`,email:`realonly.${run}@example.test`,emailVerified:true};
   const realUser=await access.recognise(real,true);
   const realSession=await access.issueSession(real.subject);
   const realBrand=await engine.createBrand(realSession.token,'Marca propia','Contexto propio');
   // No demo brand exists here, so the upgrade is a no-op and the real brand is untouched.
   expect(await access.ensureDemoContent(realSession.token)).toBeNull();
   expect((await engine.context(realSession.token,realBrand.id)).versions).toHaveLength(0);
   expect((await access.metrics()).find(m=>m.userId===realUser)!.brands).toBe(1);
  });

  it('measures Mapa estratégico views and exports as distinct acts, excluding the demo sandbox',async()=>{
   const {db}=connection(),issuer='https://accounts.google.com',access=new PilotAccess(db,issuer);
   const run=randomUUID().slice(0,8),engine=new Engine(db);
   const claims={subject:`map-${run}`,email:`map.${run}@example.test`,emailVerified:true};
   const userId=await access.recognise(claims,true);
   const session=await access.issueSession(claims.subject);
   const brand=await engine.createBrand(session.token,'Marca del mapa','Contexto');

   const mine=async()=>(await access.metrics()).find(m=>m.userId===userId)!;
   expect((await mine()).mapaEstrategicoViewed,'no view before opening it').toBe(false);
   expect((await mine()).mapaEstrategicoExports).toBe(0);

   // Viewing the map and taking it away are different acts and must not be conflated.
   await engine.blueprint(session.token,brand.id);
   expect((await mine()).mapaEstrategicoViewed).toBe(true);
   expect((await mine()).mapaEstrategicoExports,'a view is not an export').toBe(0);

   await engine.blueprintExported(session.token,brand.id);
   expect((await mine()).mapaEstrategicoExports).toBe(1);
   await engine.blueprintExported(session.token,brand.id);
   expect((await mine()).mapaEstrategicoExports,'each export counts').toBe(2);

   // The demo sandbox can never fabricate either signal.
   const demoUser={subject:`mapdemo-${run}`,email:`mapdemo.${run}@example.test`,emailVerified:true};
   const demoId=await access.recognise(demoUser,true);
   const demoSession=await access.issueSession(demoUser.subject);
   const demo=(await access.ensureDemoBrand(demoSession.token))!;
   await engine.blueprint(demoSession.token,demo.id);
   await engine.blueprintExported(demoSession.token,demo.id);
   const demoMetrics=(await access.metrics()).find(m=>m.userId===demoId)!;
   expect(demoMetrics.mapaEstrategicoViewed,'demo viewing is not real engagement').toBe(false);
   expect(demoMetrics.mapaEstrategicoExports).toBe(0);

   // Aggregate rollup separates participants who exported from the number of exports.
   const report=await access.report();
   expect(report.mapaEstrategico.viewed).toBeGreaterThanOrEqual(1);
   expect(report.mapaEstrategico.exports).toBeGreaterThanOrEqual(2);
   expect(report.mapaEstrategico.exportedParticipants).toBeGreaterThanOrEqual(1);
  });

  it('derives Evidence Engagement from opening evidence, against those exposed to a proposal',async()=>{
   const {db}=connection(),issuer='https://accounts.google.com',access=new PilotAccess(db,issuer);
   const run=randomUUID().slice(0,8),engine=new Engine(db);
   const claims={subject:`ev-${run}`,email:`ev.${run}@example.test`,emailVerified:true};
   const userId=await access.recognise(claims,true);
   const session=await access.issueSession(claims.subject);
   const brand=await engine.createBrand(session.token,'Marca con evidencia','Contexto');

   const mine=async()=>(await access.metrics()).find(m=>m.userId===userId)!;
   expect((await mine()).openedEvidence).toBe(false);
   await engine.evidenceOpened(session.token,brand.id);
   expect((await mine()).openedEvidence).toBe(true);
   // Opening is the canonical numerator; supplying evidence is a different, stronger act reported apart.
   expect((await mine()).evidenceSupplied,'opening is not supplying').toBe(0);

   // The rate never divides by zero and is null while nobody has been exposed to a proposal.
   const report=await access.report();
   expect(report.evidence.opened).toBeGreaterThanOrEqual(1);
   if(report.evidence.exposed===0)expect(report.evidence.rate).toBeNull();
   else expect(report.evidence.rate).toBeGreaterThanOrEqual(0);
  });

  it('anchors TTFI and TTFD on the brand, and leaves retention unobserved until its window closes',async()=>{
   const {db}=connection(),issuer='https://accounts.google.com',access=new PilotAccess(db,issuer);
   const run=randomUUID().slice(0,8),engine=new Engine(db);
   const claims={subject:`ttf-${run}`,email:`ttf.${run}@example.test`,emailVerified:true};
   const userId=await access.recognise(claims,true);
   const session=await access.issueSession(claims.subject);
   const brand=await engine.createBrand(session.token,'Marca del reloj','Contexto');
   const ctx=await engine.context(session.token,brand.id);
   const customer=ctx.questions.find((q:{module:string})=>q.module==='Primary Customer')!;
   await engine.prepareQuestion(session.token,brand.id,customer.id,null);
   await engine.commitDecision(session.token,{brandId:brand.id,questionId:customer.id,selectedOption:'Mi cliente',
    rationale:'Mi criterio',expectedActiveVersion:null,sourceRecommendationId:null,actorUserId:userId,idempotencyKey:randomUUID()});

   const mine=(await access.metrics()).find(m=>m.userId===userId)!;
   // Canonical anchor is the brand, so a decision taken moments after creating it reads as near zero
   // rather than carrying the time spent before the brand existed.
   expect(mine.timeToFirstDecisionSeconds).not.toBeNull();
   expect(mine.timeToFirstDecisionSeconds!,'TTFD is measured from the brand, not the session').toBeLessThan(120);
   expect(mine.activated).toBe(true);

   // Retention windows have not elapsed, so they are unobserved rather than false.
   expect(mine.retainedD7,'D7 cannot be known on day zero').toBeNull();
   expect(mine.retainedD14).toBeNull();
   expect(mine.retainedD30).toBeNull();
   const report=await access.report();
   // An unobserved window contributes to neither numerator nor denominator.
   expect(report.retention.D30.rate).toBeNull();
   expect(report.retention.D30.observed).toBe(0);
  });

  it('gives every participant their own CoffeePolis and keeps demo work isolated',async()=>{
   const {db}=connection(),issuer='https://accounts.google.com',access=new PilotAccess(db,issuer);
   const run=randomUUID().slice(0,8),engine=new Engine(db);
   const open=async(tag:string)=>{
    const claims={subject:`iso-${tag}-${run}`,email:`iso.${tag}.${run}@example.test`,emailVerified:true};
    const userId=await access.recognise(claims,true);
    const session=await access.issueSession(claims.subject);
    const demo=await access.ensureDemoBrand(session.token);
    return {userId,session,demo:demo!};
   };
   const A=await open('a'),B=await open('b');

   // Separate instances, not a shared mutable brand.
   expect(A.demo.id).not.toBe(B.demo.id);
   expect(A.demo.name).toBe(DEMO_BRAND.name);expect(B.demo.name).toBe(DEMO_BRAND.name);
   expect((await engine.listBrands(A.session.token)).map((x:{id:string})=>x.id)).toEqual([A.demo.id]);
   expect((await engine.listBrands(B.session.token)).map((x:{id:string})=>x.id)).toEqual([B.demo.id]);

   // Neither can reach the other's sandbox.
   await expect(engine.context(B.session.token,A.demo.id)).rejects.toMatchObject({code:'NOT_FOUND'});
   await expect(engine.context(A.session.token,B.demo.id)).rejects.toMatchObject({code:'NOT_FOUND'});

   // Editing A's demo leaves B's untouched.
   const q=(await engine.context(A.session.token,A.demo.id)).questions.find((x:{module:string})=>x.module==='Primary Customer')!;
   await engine.prepareQuestion(A.session.token,A.demo.id,q.id,null);
   await engine.commitDecision(A.session.token,{brandId:A.demo.id,questionId:q.id,selectedOption:'Sólo en el demo de A',rationale:'A explora',expectedActiveVersion:null,actorUserId:A.userId,sourceRecommendationId:null,idempotencyKey:randomUUID()});
   expect((await engine.context(A.session.token,A.demo.id)).versions).toHaveLength(1);
   expect((await engine.context(B.session.token,B.demo.id)).versions).toHaveLength(0);

   // Participant profiles are per account and never readable across accounts.
   const intake={firstName:'Ana',lastName:'Ruiz',country:'México',region:'Veracruz',city:'Xalapa',primaryProfile:'FUNDADOR',privacyAccepted:true,termsAccepted:true};
   await access.saveParticipantProfile(A.session.token,intake);
   expect((await access.participantProfile(A.session.token))?.firstName).toBe('Ana');
   expect(await access.participantProfile(B.session.token)).toBeNull();
  });

  it('captures participant intake with acceptances, and refuses incomplete or unaccepted intake',async()=>{
   const {db}=connection(),issuer='https://accounts.google.com',access=new PilotAccess(db,issuer);
   const run=randomUUID().slice(0,8);
   const claims={subject:`intake-${run}`,email:`intake.${run}@example.test`,emailVerified:true};
   await access.recognise(claims,true);
   const session=await access.issueSession(claims.subject);
   const base={firstName:'Luis',lastName:'Mora',country:'México',region:'Veracruz',city:'Xalapa',primaryProfile:'CONSULTOR',privacyAccepted:true,termsAccepted:true};

   expect(await access.participantProfile(session.token)).toBeNull();   // intake still pending
   await access.saveParticipantProfile(session.token,{...base,companyOrProject:'Estudio Mora',sector:'Servicios',pilotGoal:'Definir a quién sirvo'});
   const saved=(await access.participantProfile(session.token))!;
   expect(saved.lastName).toBe('Mora');
   expect(saved.pilotGoal).toBe('Definir a quién sirvo');
   expect(saved.privacyAcceptedAt).toBeInstanceOf(Date);
   expect(saved.termsAcceptedAt).toBeInstanceOf(Date);
   // The verified email is never taken from the form: it stays on the account from the ID token.
   expect(Object.keys(saved)).not.toContain('email');
   const [account]=await db.select().from(t.userAccounts).where(eq(t.userAccounts.userId,saved.userId));
   expect(account.normalizedEmail).toBe(claims.email.toLowerCase());

   // Both acceptances are mandatory, and required fields are enforced.
   for(const bad of [{...base,privacyAccepted:false},{...base,termsAccepted:false},{...base,firstName:''},{...base,city:''},{...base,primaryProfile:'ALGO'}])
    await expect(access.saveParticipantProfile(session.token,bad)).rejects.toMatchObject({code:'INVALID'});
  });

  it('persists strategic geography without inferring it from where the brand operates',async()=>{
   const {db}=connection(),issuer='https://accounts.google.com',access=new PilotAccess(db,issuer);
   const run=randomUUID().slice(0,8),engine=new Engine(db);
   const claims={subject:`geo-${run}`,email:`geo.${run}@example.test`,emailVerified:true};
   await access.recognise(claims,true);
   const session=await access.issueSession(claims.subject);
   const brand=await engine.createBrand(session.token,'Marca con alcance','Opera en Xalapa');

   // A brand operating in one city may compete nationally: the value is declared, never derived.
   const set=await access.setBrandGeography(session.token,brand.id,'NATIONAL','México');
   expect(set.geographicInfluence).toBe('NATIONAL');
   const [row]=await db.select().from(t.brandProfiles).where(eq(t.brandProfiles.brandId,brand.id));
   expect(row.geographicInfluence).toBe('NATIONAL');
   expect(row.primaryMarket).toBe('México');
   expect(row.isDemo,'declaring geography must not mark a real brand as demo').toBe(false);
   // Updating replaces the declaration rather than duplicating the row.
   await access.setBrandGeography(session.token,brand.id,'LATAM',null);
   expect(await db.select().from(t.brandProfiles).where(eq(t.brandProfiles.brandId,brand.id))).toHaveLength(1);
   expect(GEOGRAPHIC_INFLUENCE).toEqual(['LOCAL','REGIONAL','STATE','NATIONAL','LATAM','GLOBAL']);
   await expect(access.setBrandGeography(session.token,brand.id,'CONTINENTAL' as never)).rejects.toMatchObject({code:'INVALID'});
   // Another participant cannot declare geography on a brand that is not theirs.
   const other={subject:`geo-other-${run}`,email:`geo.other.${run}@example.test`,emailVerified:true};
   await access.recognise(other,true);
   const otherSession=await access.issueSession(other.subject);
   await expect(access.setBrandGeography(otherSession.token,brand.id,'LOCAL')).rejects.toMatchObject({code:'NOT_FOUND'});
  });

  it('provisions unique testers, isolates workspaces and brands, and rejects manipulated IDs',async()=>{
   const a=await setup(),b=await setup(),brand=await a.engine.createBrand(a.session.token,'Tester A','Context A');
   expect(brand.dataClass).toBe('PILOT');expect(a.who.workspaceId).not.toBe(b.who.workspaceId);
   expect(await b.engine.listBrands(b.session.token)).toEqual([]);
   await expect(b.engine.context(b.session.token,brand.id)).rejects.toMatchObject({code:'NOT_FOUND'});
   await expect(b.access.assign(b.who.userId,brand.id)).rejects.toMatchObject({code:'NOT_FOUND'});
   await expect(a.access.provision(a.subject,'A')).rejects.toMatchObject({code:'CONFLICT'});
   const teammateSubject=randomUUID(),teammate=await a.access.provision(teammateSubject,'A',a.who.workspaceId),other=await a.access.issueSession(teammateSubject);
   await expect(a.engine.context(other.token,brand.id)).rejects.toMatchObject({code:'FORBIDDEN'});
   await a.access.assign(teammate.userId,brand.id);expect((await a.engine.context(other.token,brand.id)).userInputs).toHaveLength(1);
  });
  it('DEMO sessions never enter PILOT; disable and expiry revoke access',async()=>{
   const a=await setup(),demo=await seedIdentity(a.db);
   await expect(a.access.authorize(demo.token)).rejects.toMatchObject({code:'FORBIDDEN'});
   await a.db.update(t.sessions).set({expiresAt:new Date(0)}).where(eq(t.sessions.tokenHash,hash(a.session.token)));
   await expect(a.access.authorize(a.session.token)).rejects.toMatchObject({code:'UNAUTHORIZED'});
   const current=await a.access.issueSession(a.subject);await a.access.disable(a.who.userId);
   await expect(a.access.authorize(current.token)).rejects.toMatchObject({code:'UNAUTHORIZED'});
   await expect(a.access.issueSession(a.subject)).rejects.toMatchObject({code:'FORBIDDEN'});
  });
  it('persists cohort/session telemetry and scoped feedback without altering decisions',async()=>{
   const a=await setup(),b=await setup(),brand=await a.engine.createBrand(a.session.token,'Feedback','Initial context');
   const input={brandId:brand.id,usefulness:4,clarity:5,confidence:3,comment:'Useful test fixture',kind:'FEEDBACK'};
   await expect(b.access.saveFeedback(b.session.token,input)).rejects.toMatchObject({code:'NOT_FOUND'});
   await expect(a.access.saveFeedback(a.session.token,{...input,usefulness:6})).rejects.toMatchObject({code:'INVALID'});
   await a.access.saveFeedback(a.session.token,input);
   const events=await a.db.select().from(t.pilotEvents).where(eq(t.pilotEvents.userId,a.who.userId));
   expect(events.map(e=>e.name)).toEqual(expect.arrayContaining(['account_created','session_started','brand_created','meaningful_context_supplied']));
   expect(events.filter(e=>e.brandId).every(e=>e.cohort==='A'&&e.intervention==='PRODUCT_ONLY'&&e.sessionId)).toBe(true);
   expect(JSON.stringify(events)).not.toContain(a.session.token);expect(JSON.stringify(events)).not.toContain('Initial context');
   expect((await a.engine.context(a.session.token,brand.id)).versions).toHaveLength(0);
  });
  it('OIDC validates signed issuer tokens, browser state, single-use callback and secure application session',async()=>{
   const a=await setup(),issuer='https://issuer.example',clientId='test-client';
   const {privateKey,publicKey}=await generateKeyPair('RS256'),jwk={...await exportJWK(publicKey),kid:'test-key',alg:'RS256',use:'sig'};
   let nonce='',valid=true,sub=a.subject;
   const config=new oidc.Configuration({issuer,authorization_endpoint:issuer+'/authorize',token_endpoint:issuer+'/token',jwks_uri:issuer+'/jwks'},clientId,'test-fixture-secret');
   config[oidc.customFetch]=async input=>{
    if(String(input).endsWith('/jwks'))return Response.json({keys:[jwk]});
    const token=await new SignJWT({nonce,sub}).setProtectedHeader({alg:'RS256',kid:'test-key'}).setIssuer(valid?issuer:'https://attacker.example').setAudience(clientId).setIssuedAt().setExpirationTime('5m').sign(privateKey);
    return Response.json({access_token:'fixture-access',token_type:'Bearer',id_token:token});
   };
   const server=createApp(a.engine,undefined,async()=>'READY');await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const port=(server.address() as AddressInfo).port;await new Promise<void>(r=>server.close(()=>r()));
   const origin=`https://127.0.0.1:${port}`,base=`http://127.0.0.1:${port}`,app=createApp(a.engine,undefined,async()=>'READY',new PilotAuth(a.db,config,origin));await new Promise<void>(r=>app.listen(port,'127.0.0.1',r));
   try{
    async function login(){const r=await fetch(base+'/auth/login',{redirect:'manual'}),target=new URL(r.headers.get('location')!);nonce=target.searchParams.get('nonce')!;return {cookie:r.headers.getSetCookie()[0].split(';')[0],state:target.searchParams.get('state')!};}
    const refused=(r:Response,reason:string)=>{expect(r.status).toBe(302);expect(r.headers.get('location')).toBe('/?login='+reason);expect(r.headers.getSetCookie().some(c=>c.startsWith('__Host-brandopolis_session='))).toBe(false);};
    const first=await login();expect(first.cookie).toMatch(/^__Host-brandopolis_flow=/);
    refused(await fetch(base+'/auth/callback?code=fixture&state=wrong',{headers:{Cookie:first.cookie},redirect:'manual'}),'failed');
    const result=await fetch(base+`/auth/callback?code=fixture&state=${first.state}`,{headers:{Cookie:first.cookie},redirect:'manual'});expect(result.status).toBe(302);
    const sessionCookie=result.headers.getSetCookie().find(v=>v.startsWith('__Host-brandopolis_session='))!;expect(sessionCookie).toContain('Secure; HttpOnly; SameSite=Strict');const cookie=sessionCookie.split(';')[0];
    expect((await fetch(base+'/api/me',{headers:{Cookie:cookie}})).status).toBe(200);
    refused(await fetch(base+`/auth/callback?code=fixture&state=${first.state}`,{headers:{Cookie:first.cookie},redirect:'manual'}),'expired');
    expect((await fetch(base+'/api/me',{headers:{Authorization:`Bearer ${a.session.token}`}})).status).toBe(401);
    expect((await fetch(base+'/api/brands',{method:'POST',headers:{Cookie:cookie,Origin:'https://attacker.example','Content-Type':'application/json'},body:'{}'})).status).toBe(403);
    expect((await fetch(base+'/api/session',{method:'POST',headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json'},body:'{}'})).status).toBe(403);
    expect((await fetch(base+'/api/logout',{method:'POST',headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json'},body:'{}'})).status).toBe(200);
    expect((await fetch(base+'/api/me',{headers:{Cookie:cookie}})).status).toBe(401);
    valid=false;const second=await login();refused(await fetch(base+`/auth/callback?code=fixture&state=${second.state}`,{headers:{Cookie:second.cookie},redirect:'manual'}),'failed');
    // A validly signed identity that was never provisioned (or was disabled) is denied, never auto-linked.
    valid=true;sub='unprovisioned-'+randomUUID();const third=await login();refused(await fetch(base+`/auth/callback?code=fixture&state=${third.state}`,{headers:{Cookie:third.cookie},redirect:'manual'}),'denied');
    sub=a.subject;await a.access.disable(a.who.userId);const fourth=await login();refused(await fetch(base+`/auth/callback?code=fixture&state=${fourth.state}`,{headers:{Cookie:fourth.cookie},redirect:'manual'}),'denied');
   }finally{await new Promise<void>(r=>app.close(()=>r()));}
  });
  it('real-provider adapter validates output and usage; outage never falls back to a DEMO or commits',async()=>{
   const a=await setup(),brand=await a.engine.createBrand(a.session.token,'AI'),ctx=await a.engine.context(a.session.token,brand.id),q=ctx.questions[0],packet=await a.engine.assembleContext(a.session.token,brand.id,q.id);
   const message=(text:string,stop='end_turn')=>({id:'msg_fixture',type:'message',role:'assistant',model:'configured-model',content:[{type:'text',text}],stop_reason:stop,stop_sequence:null,usage:{input_tokens:50,output_tokens:60}});
   const req:GatewayRequest={task:'STRATEGIC_ANALYSIS',module:q.module,promptVersion:'pilot-strategic-v1',contextVersion:packet.contextVersion,input:packet,outputSchema:'recommendation',budget:{maxCharacters:20000,timeoutMs:1000},tenantScope:{workspaceId:a.who.workspaceId,brandId:brand.id},questionId:q.id};
   const output=await new DemoProvider().generate(req);let captured='';
   const provider=new AnthropicProvider('fixture-key','configured-model',async(_url,init)=>{captured=String(init?.body);return Response.json(message(JSON.stringify(output)));});
   const result=await new ModelGateway(provider).invoke(req);expect(result.error).toBeNull();expect(result.tokenIn).toBe(50);expect(result.tokenOut).toBe(60);expect(captured).toContain('json_schema');expect(captured).not.toContain('fixture-key');
   const unavailable=new Engine(a.db,undefined,new ModelGateway(new UnavailableProvider(),'pilot-strategic-v1'));
   expect((await unavailable.analyze(a.session.token,brand.id,q.id)).error).toBe('UNAVAILABLE');expect((await a.engine.context(a.session.token,brand.id)).versions).toHaveLength(0);
   const malformed=new AnthropicProvider('fixture-key','configured-model',async()=>Response.json(message('{}')));expect((await new ModelGateway(malformed).invoke(req)).error).toBe('INVALID_OUTPUT');
   const refusal=new AnthropicProvider('fixture-key','configured-model',async()=>Response.json(message(JSON.stringify(output),'refusal')));expect((await new ModelGateway(refusal).invoke(req)).error).toBe('INVALID_OUTPUT');
   const truncated=new AnthropicProvider('fixture-key','configured-model',async()=>Response.json(message('{"id":','max_tokens')));expect((await new ModelGateway(truncated).invoke(req)).error).toBe('INVALID_OUTPUT');
   const limited=new AnthropicProvider('fixture-key','configured-model',async()=>Response.json({type:'error',error:{type:'rate_limit_error',message:'slow down'}},{status:429,headers:{'retry-after':'0'}}));expect((await new ModelGateway(limited).invoke(req)).error).toBe('RATE_LIMIT');
  });
  it('backup, later changes and isolated restore: restored cluster holds exactly the pre-backup PILOT state',async()=>{
   const root=resolve('.local/recovery-tests',randomUUID()),source=resolve(root,'source'),backup=resolve(root,'backup'),restored=resolve(root,'restored');
   let cluster=await startLocalDb(false,{directory:source,port:55435}),db=connect(cluster.url),running=true;
   try{
    await migrateDatabase(db.db);const access=new PilotAccess(db.db,'https://recovery.example'),who=await access.provision('recovery-fixture','B'),session=await access.issueSession('recovery-fixture'),engine=new Engine(db.db),brand=await engine.createBrand(session.token,'Restore fixture','Preserved context');
    const questions=(await engine.context(session.token,brand.id)).questions,q=(m:string)=>questions.find(x=>x.module===m)!.id;
    const commit=async(module:string,option:string,expected:string|null,reviewToken?:string)=>{await engine.prepareQuestion(session.token,brand.id,q(module),expected);return engine.commitDecision(session.token,{brandId:brand.id,questionId:q(module),selectedOption:option,rationale:'Human recovery fixture',expectedActiveVersion:expected,actorUserId:who.userId,sourceRecommendationId:null,idempotencyKey:randomUUID()},reviewToken);};
    const c1=await commit('Primary Customer','Preserved customer',null);await commit('Positioning','Preserved positioning',null);await commit('Primary Customer','Changed customer',c1.versionId);
    const before=await engine.context(session.token,brand.id);expect(before.reviews).toHaveLength(1);expect(before.dependencies.length).toBeGreaterThan(0);
    expect(()=>coldCopy(source,backup)).toThrow('Stop PostgreSQL');
    await db.pool.end();await stopLocalDb(cluster);running=false;
    expect(existsSync(resolve(source,'data/postmaster.pid'))).toBe(false);coldCopy(source,backup);
    // Changes after the backup must not appear in the restore.
    cluster=await startLocalDb(false,{directory:source,port:55435});running=true;db=connect(cluster.url);
    await new Engine(db.db).createBrand(session.token,'After backup');
    await db.pool.end();await stopLocalDb(cluster);running=false;
    coldCopy(backup,restored);expect(()=>coldCopy(backup,restored)).toThrow();
    cluster=await startLocalDb(false,{directory:restored,port:55435});running=true;db=connect(cluster.url);
    expect(await readiness(db.pool)).toBe('READY');await migrateDatabase(db.db);
    const after=await new Engine(db.db).context(session.token,brand.id);
    for(const key of ['versions','decisions','dependencies','reviews','audit','userInputs','impacts'] as const)expect(after[key]).toEqual(before[key]);
    expect((await new Engine(db.db).listBrands(session.token)).map(b=>b.name)).toEqual(['Restore fixture']);
    expect((await new PilotAccess(db.db,'https://recovery.example').authorize(session.token)).userId).toBe(who.userId);
   }finally{await db.pool.end().catch(()=>{});if(running)await stopLocalDb(cluster);}
  },120000);

  it('AI failure leaves strategic state untouched, records telemetry and allows retry and human decision',async()=>{
   const a=await setup(),brand=await a.engine.createBrand(a.session.token,'AI outage'),q=(await a.engine.context(a.session.token,brand.id)).questions.find(x=>x.module==='Primary Customer')!;
   const down=new Engine(a.db,undefined,new ModelGateway(new UnavailableProvider(),'pilot-strategic-v1')),before=await a.engine.context(a.session.token,brand.id);
   const failed=await down.analyze(a.session.token,brand.id,q.id);expect(failed).toMatchObject({recommendation:null,error:'UNAVAILABLE'});
   const after=await a.engine.context(a.session.token,brand.id);
   for(const key of ['decisions','versions','reviews','impacts','audit','recommendations','questions'] as const)expect(after[key]).toEqual(before[key]);
   expect(after.analyses).toHaveLength(1);expect(after.analyses[0].recommendationId).toBeNull();
   const names=(await a.db.select().from(t.pilotEvents).where(eq(t.pilotEvents.brandId,brand.id))).map(e=>e.name);
   expect(names).toEqual(expect.arrayContaining(['recommendation_requested','analysis_failed']));expect(names).not.toContain('recommendation_generated');
   // Retry against a recovered provider succeeds; the proposal still needs a human commit.
   const up=new Engine(a.db,undefined,new ModelGateway(new DemoProvider(),'pilot-strategic-v1'));const ok=await up.analyze(a.session.token,brand.id,q.id);expect(ok.recommendation).not.toBeNull();
   expect((await a.engine.context(a.session.token,brand.id)).versions).toHaveLength(0);
   await a.engine.prepareQuestion(a.session.token,brand.id,q.id,null);
   await a.engine.commitDecision(a.session.token,{brandId:brand.id,questionId:q.id,selectedOption:'Decisión humana sin IA',rationale:'Criterio propio',expectedActiveVersion:null,actorUserId:a.who.userId,sourceRecommendationId:null,idempotencyKey:randomUUID()});
   expect((await a.engine.context(a.session.token,brand.id)).versions).toHaveLength(1);
  });
  it('HTTP tenancy: testers, workspaces, brands, forged IDs, wrong/revoked/expired sessions and DEMO tokens all fail closed',async()=>{
   const a=await setup(),b=await setup(),brandA=await a.engine.createBrand(a.session.token,'Private A','Secret context A'),brandB=await b.engine.createBrand(b.session.token,'Private B');
   const qA=(await a.engine.context(a.session.token,brandA.id)).questions[0].id,demo=await seedIdentity(a.db);
   const boundary:PilotBoundary={origin:'',handle:async()=>false,authorize:token=>a.access.authorize(token),logout:token=>a.access.logout(token),feedback:(token:string,input:Record<string,unknown>)=>a.access.saveFeedback(token,input)},app=createApp(a.engine,undefined,async()=>'READY',boundary);
   await new Promise<void>(r=>app.listen(0,'127.0.0.1',r));const port=(app.address() as AddressInfo).port,origin=boundary.origin=`https://127.0.0.1:${port}`;
   const call=(token:string,path:string,body?:unknown)=>fetch(`http://127.0.0.1:${port}${path}`,{method:body?'POST':'GET',headers:{Origin:origin,'Content-Type':'application/json',Cookie:`__Host-brandopolis_session=${token}`},body:body?JSON.stringify(body):undefined});
   try{
    expect((await call(a.session.token,`/api/context?brandId=${brandA.id}`)).status).toBe(200);
    const attempts:[string,unknown?][]=[[`/api/context?brandId=${brandA.id}`],[`/api/blueprint?brandId=${brandA.id}`],['/api/questions/prepare',{brandId:brandA.id,questionId:qA,expectedActiveVersion:null}],['/api/recommendations/generate',{brandId:brandA.id,questionId:qA}],['/api/feedback',{brandId:brandA.id,usefulness:1,clarity:1,confidence:1,comment:'',kind:'FEEDBACK'}],['/api/decisions/commit',{command:{brandId:brandA.id,questionId:qA,selectedOption:'x',rationale:'x',expectedActiveVersion:null,actorUserId:b.who.userId,sourceRecommendationId:null,idempotencyKey:randomUUID()}}]];
    for(const [path,body] of attempts)expect((await call(b.session.token,path,body)).status).toBe(404);
    const listB=await (await call(b.session.token,'/api/brands')).json();expect(listB.map((x:{id:string})=>x.id)).toEqual([brandB.id]);
    // Forged combination: own Brand, another workspace's question id.
    expect((await call(b.session.token,'/api/questions/prepare',{brandId:brandB.id,questionId:qA,expectedActiveVersion:null})).status).toBe(404);
    for(const token of ['',randomUUID(),demo.token])expect([401,403]).toContain((await call(token,`/api/context?brandId=${brandA.id}`)).status);
    await a.db.update(t.sessions).set({expiresAt:new Date(Date.now()-1)}).where(eq(t.sessions.tokenHash,hash(b.session.token)));
    expect((await call(b.session.token,'/api/brands')).status).toBe(401);
    const fresh=await a.access.issueSession(a.subject);expect((await a.access.revokeSessions(a.who.userId)).revoked).toBeGreaterThanOrEqual(2);
    expect((await call(fresh.token,'/api/brands')).status).toBe(401);expect((await call(a.session.token,'/api/brands')).status).toBe(401);
    // An identity from another issuer never authorizes, even with the same subject.
    await expect(new PilotAccess(a.db,'https://other-issuer.example').issueSession(a.subject)).rejects.toMatchObject({code:'FORBIDDEN'});
    expect(JSON.stringify(await a.db.select().from(t.telemetry).where(eq(t.telemetry.brandId,brandA.id)))).not.toContain('Secret context A');
   }finally{await new Promise<void>(r=>app.close(()=>r()));}
  });
  it('operator inspect, revoke and metrics expose access and activation without tokens',async()=>{
   const a=await setup(),brand=await a.engine.createBrand(a.session.token,'Metrics');
   const info=await a.access.inspect({subject:a.subject});expect(info).toMatchObject({userId:a.who.userId,cohort:'A',identityActive:true,membershipActive:true,activeSessions:1,brands:[{id:brand.id,name:'Metrics'}]});
   expect(JSON.stringify(info)).not.toContain(a.session.token);
   const q=(await a.engine.context(a.session.token,brand.id)).questions.find(x=>x.module==='Primary Customer')!;
   await new Engine(a.db,undefined,new ModelGateway(new DemoProvider(),'pilot-strategic-v1')).analyze(a.session.token,brand.id,q.id);
   await a.engine.prepareQuestion(a.session.token,brand.id,q.id,null);
   await a.engine.commitDecision(a.session.token,{brandId:brand.id,questionId:q.id,selectedOption:'Primera',rationale:'Humana',expectedActiveVersion:null,actorUserId:a.who.userId,sourceRecommendationId:null,idempotencyKey:randomUUID()});
   const mine=(await a.access.metrics()).find(m=>m.userId===a.who.userId)!;
   expect(mine).toMatchObject({cohort:'A',sessions:1,brands:1,recommendationsRequested:1,decisionsApproved:1,activated:true,secondHighValueEvent14d:false});
   expect(mine.timeToFirstInsightSeconds).toBeGreaterThanOrEqual(0);expect(mine.timeToFirstDecisionSeconds).toBeGreaterThanOrEqual(mine.timeToFirstInsightSeconds!);
   // Opening the next connected question after activation is a second High-Value Strategic Event.
   const positioning=(await a.engine.context(a.session.token,brand.id)).questions.find(x=>x.module==='Positioning')!;await a.engine.prepareQuestion(a.session.token,brand.id,positioning.id,null);
   expect((await a.access.metrics()).find(m=>m.userId===a.who.userId)).toMatchObject({secondHighValueEvent14d:true});
   await a.access.disable(a.who.userId);expect(await a.access.inspect({userId:a.who.userId})).toMatchObject({identityActive:false,membershipActive:false,activeSessions:0});
   await expect(a.access.inspect({subject:'nobody'})).rejects.toMatchObject({code:'NOT_FOUND'});
  });
  it('per-client rate limits protect login and AI without sharing one global budget',async()=>{
   const now={t:0},limiter=new RateLimiter(()=>now.t);
   for(let i=0;i<20;i++)expect(limiter.allow('auth:1.1.1.1',20,60000)).toBe(true);
   expect(limiter.allow('auth:1.1.1.1',20,60000)).toBe(false);expect(limiter.allow('auth:2.2.2.2',20,60000)).toBe(true);
   now.t=60000;expect(limiter.allow('auth:1.1.1.1',20,60000)).toBe(true);
   const a=await setup(),boundary:PilotBoundary={origin:'',limiter:new RateLimiter(),handle:async(_req,res,url)=>{if(url.pathname!=='/auth/login')return false;res.writeHead(302,{Location:'/'});res.end();return true;},authorize:token=>a.access.authorize(token),logout:token=>a.access.logout(token),feedback:(token:string,input:Record<string,unknown>)=>a.access.saveFeedback(token,input)},app=createApp(a.engine,undefined,async()=>'READY',boundary);
   await new Promise<void>(r=>app.listen(0,'127.0.0.1',r));const port=(app.address() as AddressInfo).port;boundary.origin=`https://127.0.0.1:${port}`;
   try{
    const statuses:number[]=[];for(let i=0;i<21;i++)statuses.push((await fetch(`http://127.0.0.1:${port}/auth/login`,{redirect:'manual'})).status);
    expect(statuses.slice(0,20).every(s=>s===302)).toBe(true);expect(statuses[20]).toBe(429);
    expect((await fetch(`http://127.0.0.1:${port}/health`)).status).toBe(200);
   }finally{await new Promise<void>(r=>app.close(()=>r()));}
  });
  it('DEMO and PILOT databases refuse each other’s data',async()=>{
   const {pool}=connection(),name=`class_${randomUUID().replaceAll('-','')}`;await pool.query(`CREATE DATABASE "${name}"`);
   const db=connect(pool.options.connectionString!.replace(/\/[^/]+$/,`/${name}`));
   try{
    await migrateDatabase(db.db);expect(await dataClassViolation(db.pool,'DEMO')).toBeNull();expect(await dataClassViolation(db.pool,'PILOT')).toBeNull();
    const demo=await seedIdentity(db.db);await new Engine(db.db).createBrand(demo.token,'Demo brand');
    expect(await dataClassViolation(db.pool,'PILOT')).toMatch(/Dedicated PILOT/);expect(await dataClassViolation(db.pool,'DEMO')).toBeNull();
    await new PilotAccess(db.db,'https://issuer.example').provision('mixed','A');
    expect(await dataClassViolation(db.pool,'DEMO')).toMatch(/PILOT data/);
   }finally{await db.pool.end();}
  });
  it('RC1 data written by the frozen RC1 engine survives the Pilot migration intact and stays usable',async()=>{
   const rc1='f4946683c8767aedc6c2fc7403d03beb3ab61e04',root=resolve('.local/rc1-engine',randomUUID());
   for(const file of execFileSync('git',['ls-tree','-r','--name-only',rc1,'src','schemas','config'],{encoding:'utf8'}).split('\n').filter(Boolean)){mkdirSync(dirname(resolve(root,file)),{recursive:true});writeFileSync(resolve(root,file),execFileSync('git',['show',`${rc1}:${file}`]));}
   const {Engine:Rc1Engine}=await import(pathToFileURL(resolve(root,'src/application/engine.ts')).href) as {Engine:typeof Engine};
   const {pool}=connection(),name=`rc1_${randomUUID().replaceAll('-','')}`,folder=`.local/migration-fixtures/${name}`;await pool.query(`CREATE DATABASE "${name}"`);
   const db=connect(pool.options.connectionString!.replace(/\/[^/]+$/,`/${name}`));
   const journal=JSON.parse(readFileSync('drizzle/meta/_journal.json','utf8'));journal.entries=journal.entries.filter((e:{idx:number})=>e.idx<=7);
   mkdirSync(`${folder}/meta`,{recursive:true});writeFileSync(`${folder}/meta/_journal.json`,JSON.stringify(journal));for(const e of journal.entries)copyFileSync(`drizzle/${e.tag}.sql`,`${folder}/${e.tag}.sql`);
   try{
    await migrate(db.db,{migrationsFolder:folder});
    const who=await seedIdentity(db.db),old=new Rc1Engine(db.db),brand=await old.createBrand(who.token,'RC1 brand','Contexto RC1');
    const qs=(await old.context(who.token,brand.id)).questions,q=(m:string)=>qs.find(x=>x.module===m)!.id;
    const commit=async(e:Engine,m:string,option:string,expected:string|null,reviewToken?:string)=>{await e.prepareQuestion(who.token,brand.id,q(m),expected);return e.commitDecision(who.token,{brandId:brand.id,questionId:q(m),selectedOption:option,rationale:'RC1 human rationale',expectedActiveVersion:expected,actorUserId:who.userId,sourceRecommendationId:null,idempotencyKey:randomUUID()},reviewToken);};
    const c1=await commit(old,'Primary Customer','Agencias',null),p1=await commit(old,'Positioning','Continuidad para agencias',null);await commit(old,'Primary Customer','Equipos internos',c1.versionId);
    const rc1State=await old.context(who.token,brand.id);expect(rc1State.decisions.find(d=>d.id===p1.decisionId)?.reviewStatus).toBe('NEEDS_REVIEW');expect(rc1State.reviews).toHaveLength(1);expect(rc1State.dependencies.length).toBeGreaterThan(0);
    const tables=(await db.pool.query(`select tablename from pg_tables where schemaname='public' order by 1`)).rows.map(r=>r.tablename as string);
    const snapshot=async()=>Object.fromEntries(await Promise.all(tables.map(async table=>[table,(await db.pool.query(`select * from "${table}" order by 1`)).rows])));
    const before=await snapshot();expect(await readiness(db.pool)).toBe('MIGRATIONS_REQUIRED');
    await migrateDatabase(db.db);await migrateDatabase(db.db);
    expect(await readiness(db.pool)).toBe('READY');expect(await snapshot()).toEqual(before);
    for(const table of ['pilot_workspaces','pilot_identities','pilot_sessions','pilot_events','pilot_feedback','login_flows'])expect((await db.pool.query('select to_regclass($1) as name',[table])).rows[0].name).toBe(table);
    // The current engine completes the pending human review on RC1 history.
    const now=new Engine(db.db),review=await now.beginReview(who.token,brand.id,p1.decisionId);await commit(now,'Positioning','Continuidad para equipos internos',p1.versionId,review.reviewToken);
    const final=await now.context(who.token,brand.id);expect(final.versions).toHaveLength(4);expect(final.versions.filter(v=>v.versionStatus==='SUPERSEDED').map(v=>v.selectedOption).sort()).toEqual(['Agencias','Continuidad para agencias']);
    expect(final.reviews[0]).toMatchObject({status:'COMPLETED',reviewedBy:who.userId});expect(final.audit.length).toBeGreaterThan(rc1State.audit.length);
    expect(await dataClassViolation(db.pool,'DEMO')).toBeNull();
   }finally{await db.pool.end();}
  },120000);
 });
}
