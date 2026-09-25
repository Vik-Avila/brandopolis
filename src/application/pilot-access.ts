import { randomBytes,randomUUID } from 'node:crypto';
import { and,asc,count,eq,gt } from 'drizzle-orm';
import type { Database } from '../persistence/database.js';
import * as t from '../persistence/schema.js';
import { AppError } from '../domain/contracts.js';
import { Engine,hash } from './engine.js';

export class PilotAccess {
  constructor(private db:Database,readonly issuer:string) {}
  async provision(subject:string,cohort:string,workspaceId?:string) {
    if(!subject.trim()||subject.length>500||!['A','B'].includes(cohort))throw new AppError('INVALID','Invalid tester');
    return this.db.transaction(async tx=>{
      if((await tx.select().from(t.pilotIdentities).where(and(eq(t.pilotIdentities.issuer,this.issuer),eq(t.pilotIdentities.subject,subject)))).length)throw new AppError('CONFLICT','Tester already provisioned');
      const userId=randomUUID(),wid=workspaceId??randomUUID(),now=new Date();
      if(workspaceId){if(!(await tx.select().from(t.pilotWorkspaces).where(and(eq(t.pilotWorkspaces.workspaceId,wid),eq(t.pilotWorkspaces.cohort,cohort))))[0])throw new AppError('INVALID','PILOT workspace and cohort required');}
      else {await tx.insert(t.workspaces).values({id:wid,name:'Workspace PILOT'});await tx.insert(t.pilotWorkspaces).values({workspaceId:wid,cohort,createdAt:now});}
      await tx.insert(t.users).values({id:userId});
      await tx.insert(t.memberships).values({workspaceId:wid,userId,role:'MEMBER',active:true,canCreateBrand:true});
      await tx.insert(t.pilotIdentities).values({userId,issuer:this.issuer,subject,workspaceId:wid});
      await tx.insert(t.pilotEvents).values({id:randomUUID(),userId,workspaceId:wid,name:'account_created',cohort,intervention:'NONE',occurredAt:now});
      return {userId,workspaceId:wid};
    });
  }
  async assign(userId:string,brandId:string) {
    await this.db.transaction(async tx=>{
      const [who]=await tx.select().from(t.pilotIdentities).where(eq(t.pilotIdentities.userId,userId));
      if(!who?.active)throw new AppError('FORBIDDEN','Tester unavailable');
      const [brand]=await tx.select().from(t.brands).where(and(eq(t.brands.id,brandId),eq(t.brands.workspaceId,who.workspaceId),eq(t.brands.dataClass,'PILOT')));
      if(!brand)throw new AppError('NOT_FOUND','Brand unavailable');
      await tx.insert(t.assignments).values({userId,brandId,workspaceId:who.workspaceId}).onConflictDoNothing();
    });
  }
  async disable(userId:string) {
    await this.db.transaction(async tx=>{
      const [who]=await tx.select().from(t.pilotIdentities).where(eq(t.pilotIdentities.userId,userId)).for('update');
      if(!who)throw new AppError('NOT_FOUND','Tester unavailable');
      await tx.update(t.pilotIdentities).set({active:false}).where(eq(t.pilotIdentities.userId,userId));
      await tx.update(t.memberships).set({active:false}).where(and(eq(t.memberships.userId,userId),eq(t.memberships.workspaceId,who.workspaceId)));
      await tx.delete(t.sessions).where(eq(t.sessions.userId,userId));
    });
  }
  async inspect(ref:{userId?:string;subject?:string}) {
    const [who]=await this.db.select().from(t.pilotIdentities).where(ref.userId?eq(t.pilotIdentities.userId,ref.userId):and(eq(t.pilotIdentities.issuer,this.issuer),eq(t.pilotIdentities.subject,String(ref.subject??''))));
    if(!who)throw new AppError('NOT_FOUND','Tester unavailable');
    const [member]=await this.db.select().from(t.memberships).where(and(eq(t.memberships.workspaceId,who.workspaceId),eq(t.memberships.userId,who.userId)));
    const [workspace]=await this.db.select().from(t.pilotWorkspaces).where(eq(t.pilotWorkspaces.workspaceId,who.workspaceId));
    const brands=await this.db.select({id:t.brands.id,name:t.brands.name}).from(t.assignments).innerJoin(t.brands,and(eq(t.brands.id,t.assignments.brandId),eq(t.brands.workspaceId,t.assignments.workspaceId))).where(and(eq(t.assignments.userId,who.userId),eq(t.assignments.workspaceId,who.workspaceId)));
    const sessions=await this.db.select().from(t.sessions).where(and(eq(t.sessions.userId,who.userId),gt(t.sessions.expiresAt,new Date())));
    // Subject is shown for operator correlation only; session tokens are never exposed.
    return {userId:who.userId,issuer:who.issuer,subject:who.subject,workspaceId:who.workspaceId,cohort:workspace?.cohort??null,identityActive:who.active,membershipActive:member?.active??false,role:member?.role??null,brands,activeSessions:sessions.length};
  }
  async revokeSessions(userId:string) {
    const [who]=await this.db.select().from(t.pilotIdentities).where(eq(t.pilotIdentities.userId,userId));
    if(!who)throw new AppError('NOT_FOUND','Tester unavailable');
    return {revoked:(await this.db.delete(t.sessions).where(eq(t.sessions.userId,userId)).returning()).length};
  }
  // Activation = first strategic Decision approved. Durations in seconds from the tester's first session.
  async metrics() {
    const rows=await this.db.select().from(t.pilotEvents).orderBy(asc(t.pilotEvents.occurredAt));
    const users=new Map<string,typeof rows>();for(const r of rows)users.set(r.userId,[...(users.get(r.userId)??[]),r]);
    const first=(events:typeof rows,name:string)=>events.find(e=>e.name===name)?.occurredAt;
    const since=(a?:Date,b?:Date)=>a&&b?Math.round((b.getTime()-a.getTime())/1000):null;
    return [...users].map(([userId,events])=>{
      const start=first(events,'session_started'),decisions=events.filter(e=>e.name==='decision_created');
      return {userId,cohort:events[0].cohort,sessions:events.filter(e=>e.name==='session_started').length,brands:new Set(events.filter(e=>e.name==='brand_created').map(e=>e.brandId)).size,
        recommendationsRequested:events.filter(e=>e.name==='recommendation_requested').length,recommendationsFailed:events.filter(e=>e.name==='analysis_failed').length,
        decisionsApproved:decisions.length,activated:decisions.length>0,reviewsCompleted:events.filter(e=>e.name==='change_impact_review_completed').length,
        secondStrategicEvent:decisions.length>1,timeToFirstInsightSeconds:since(start,first(events,'recommendation_generated')),timeToFirstDecisionSeconds:since(start,decisions[0]?.occurredAt)};
    });
  }
  // AI guardrails for PILOT: one acknowledgement per notice version (append-only event, no schema change)
  // and rolling 24 h request caps per tester and in total. A cap of 0 disables AI requests.
  async aiGate(token:string,policy:{noticeVersion:string|null;capPerTester:number;capTotal:number}):Promise<'OK'|'CONSENT_REQUIRED'|'CAP_REACHED'> {
    const who=await this.authorize(token),since=new Date(Date.now()-86400000);
    if(policy.noticeVersion){
      const [accepted]=await this.db.select({id:t.pilotEvents.id}).from(t.pilotEvents).where(and(eq(t.pilotEvents.userId,who.userId),eq(t.pilotEvents.name,'ai_notice_accepted:'+policy.noticeVersion))).limit(1);
      if(!accepted)return 'CONSENT_REQUIRED';
    }
    const requested=and(eq(t.pilotEvents.name,'recommendation_requested'),gt(t.pilotEvents.occurredAt,since));
    const [mine]=await this.db.select({n:count()}).from(t.pilotEvents).where(and(requested,eq(t.pilotEvents.userId,who.userId)));
    const [all]=await this.db.select({n:count()}).from(t.pilotEvents).where(requested);
    return mine.n>=policy.capPerTester||all.n>=policy.capTotal?'CAP_REACHED':'OK';
  }
  async acceptAiNotice(token:string,version:string) {
    const who=await this.authorize(token);
    if(!/^[a-f0-9]{12}$/.test(version))throw new AppError('INVALID','Invalid notice version');
    const [workspace]=await this.db.select().from(t.pilotWorkspaces).where(eq(t.pilotWorkspaces.workspaceId,who.workspaceId));
    const [session]=await this.db.select().from(t.pilotSessions).where(eq(t.pilotSessions.sessionId,who.sessionId));
    await this.db.insert(t.pilotEvents).values({id:randomUUID(),userId:who.userId,workspaceId:who.workspaceId,sessionId:who.sessionId,name:'ai_notice_accepted:'+version,cohort:workspace.cohort,intervention:session?.intervention??'NONE',occurredAt:new Date()});
    return {accepted:true};
  }
  // Aggregate Pilot evidence for the operator: counts, rates and durations only; no strategy text, no subjects.
  async report() {
    const people=await this.metrics(),feedback=await this.db.select().from(t.feedback);
    const stats=(values:(number|null)[])=>{const v=values.filter((x):x is number=>x!==null).sort((a,b)=>a-b);if(!v.length)return {n:0,medianSeconds:null,averageSeconds:null};
      const mid=Math.floor(v.length/2);return {n:v.length,medianSeconds:v.length%2?v[mid]:Math.round((v[mid-1]+v[mid])/2),averageSeconds:Math.round(v.reduce((a,b)=>a+b,0)/v.length)};};
    const distribution=(key:'usefulness'|'clarity'|'confidence')=>Object.fromEntries([1,2,3,4,5].map(n=>[n,feedback.filter(f=>f[key]===n).length]));
    const activated=people.filter(p=>p.activated).length,identities=await this.db.select().from(t.pilotIdentities);
    return {generatedAt:new Date().toISOString(),testers:identities.length,activeTesters:identities.filter(i=>i.active).length,testersWithSessions:people.filter(p=>p.sessions>0).length,
      activated,activationRate:identities.length?Math.round(activated/identities.length*1000)/1000:null,
      returningTesters:people.filter(p=>p.sessions>1).length,secondStrategicEvent:people.filter(p=>p.secondStrategicEvent).length,testersWithSecondBrand:people.filter(p=>p.brands>1).length,
      timeToFirstInsight:stats(people.map(p=>p.timeToFirstInsightSeconds)),timeToFirstDecision:stats(people.map(p=>p.timeToFirstDecisionSeconds)),
      ai:{requested:people.reduce((a,p)=>a+p.recommendationsRequested,0),failed:people.reduce((a,p)=>a+p.recommendationsFailed,0)},
      reviewsCompleted:people.reduce((a,p)=>a+p.reviewsCompleted,0),
      feedback:{responses:feedback.filter(f=>f.kind==='FEEDBACK').length,issues:feedback.filter(f=>f.kind==='ISSUE').length,usefulness:distribution('usefulness'),clarity:distribution('clarity'),confidence:distribution('confidence')}};
  }
  async issueSession(subject:string) {
    return this.db.transaction(async tx=>{
      const [who]=await tx.select().from(t.pilotIdentities).where(and(eq(t.pilotIdentities.issuer,this.issuer),eq(t.pilotIdentities.subject,subject))).for('share');
      if(!who?.active)throw new AppError('FORBIDDEN','Tester not authorized');
      const [member]=await tx.select().from(t.memberships).where(and(eq(t.memberships.workspaceId,who.workspaceId),eq(t.memberships.userId,who.userId))).for('share');
      if(!member?.active||!['MEMBER','ADMIN'].includes(member.role))throw new AppError('FORBIDDEN','Membership unavailable');
      const token=randomBytes(32).toString('base64url'),sessionId=randomUUID(),now=new Date(),expiresAt=new Date(now.getTime()+8*3600000);
      await tx.insert(t.sessions).values({tokenHash:hash(token),userId:who.userId,workspaceId:who.workspaceId,expiresAt});
      await tx.insert(t.pilotSessions).values({sessionId,tokenHash:hash(token),userId:who.userId,intervention:'PRODUCT_ONLY',startedAt:now});
      const [workspace]=await tx.select().from(t.pilotWorkspaces).where(eq(t.pilotWorkspaces.workspaceId,who.workspaceId));
      await tx.insert(t.pilotEvents).values({id:randomUUID(),userId:who.userId,workspaceId:who.workspaceId,sessionId,name:'session_started',cohort:workspace.cohort,intervention:'PRODUCT_ONLY',occurredAt:now});
      return {token,expiresAt};
    });
  }
  async authorize(token:string) {
    const who=await new Engine(this.db).me(token);
    const [identity]=await this.db.select().from(t.pilotIdentities).where(and(eq(t.pilotIdentities.userId,who.userId),eq(t.pilotIdentities.issuer,this.issuer),eq(t.pilotIdentities.active,true)));
    const [session]=await this.db.select().from(t.pilotSessions).where(eq(t.pilotSessions.tokenHash,hash(token)));
    if(!identity||identity.workspaceId!==who.workspaceId||!session)throw new AppError('FORBIDDEN','PILOT session required');
    return {...who,sessionId:session.sessionId};
  }
  async logout(token:string){await this.db.delete(t.sessions).where(eq(t.sessions.tokenHash,hash(token)));}
  async classifySession(sessionId:string,intervention:string){
    if(!['PRODUCT_ONLY','ASSISTED','CONCIERGE'].includes(intervention))throw new AppError('INVALID','Invalid intervention');
    const changed=await this.db.update(t.pilotSessions).set({intervention}).where(eq(t.pilotSessions.sessionId,sessionId)).returning();
    if(!changed.length)throw new AppError('NOT_FOUND','Session unavailable');
  }
  async saveFeedback(token:string,input:Record<string,unknown>) {
    const who=await this.authorize(token),brandId=String(input.brandId??'');
    await new Engine(this.db).context(token,brandId);
    if(!['usefulness','clarity','confidence'].every(k=>Number.isInteger(input[k])&&Number(input[k])>=1&&Number(input[k])<=5)||typeof input.comment!=='string'||input.comment.length>2000||!['FEEDBACK','ISSUE'].includes(String(input.kind)))throw new AppError('INVALID','Invalid feedback');
    const id=randomUUID();await this.db.insert(t.feedback).values({id,userId:who.userId,workspaceId:who.workspaceId,brandId,sessionId:who.sessionId,usefulness:Number(input.usefulness),clarity:Number(input.clarity),confidence:Number(input.confidence),comment:input.comment,kind:String(input.kind),createdAt:new Date()});return {id};
  }
}
