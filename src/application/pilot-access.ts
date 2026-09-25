import { randomBytes,randomUUID } from 'node:crypto';
import { and,eq } from 'drizzle-orm';
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
