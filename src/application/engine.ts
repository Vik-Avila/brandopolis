import { randomUUID, createHash } from 'node:crypto';
import { and, eq, ne, asc } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { AppError, validate, rules, transition, reviewOrder, type CommitCommand } from '../domain/contracts.js';
import type { Database, Transaction } from '../persistence/database.js';
import * as t from '../persistence/schema.js';
import { vertical, learningMoments } from '../domain/modules.js';
import { assemble } from '../domain/context-assembler.js';
import { ModelGateway, DemoProvider, evaluate, type Recommendation } from '../domain/analysis.js';

const id=()=>randomUUID();
export const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
type Scope={workspaceId:string;brandId:string;userId:string};
const inScope=(table:{workspaceId:AnyPgColumn;brandId:AnyPgColumn},s:Scope)=>and(eq(table.workspaceId,s.workspaceId),eq(table.brandId,s.brandId));
// All application entry points authenticate from an opaque credential; callers never supply a trusted actor.
export class Engine {
  constructor(private db:Database, private impactHook?:()=>void,private gateway=new ModelGateway(new DemoProvider())) {}
  private async identity(tx:Transaction,token:string) {
    if (!token || token.length>256) throw new AppError('UNAUTHORIZED','Human session required');
    const [session]=await tx.select().from(t.sessions).where(eq(t.sessions.tokenHash,hash(token)));
    if (!session || session.expiresAt<=new Date()) throw new AppError('UNAUTHORIZED','Session expired or invalid');
    const [member]=await tx.select().from(t.memberships).where(and(eq(t.memberships.workspaceId,session.workspaceId),eq(t.memberships.userId,session.userId))).for('share');
    if (!member?.active || !['ADMIN','MEMBER'].includes(member.role)) throw new AppError('FORBIDDEN','Active human membership required');
    return {...session,member};
  }
  private async scope(tx:Transaction,token:string,brandId:string,lock=true):Promise<Scope> {
    const who=await this.identity(tx,token);
    const query=tx.select().from(t.brands).where(and(eq(t.brands.id,brandId),eq(t.brands.workspaceId,who.workspaceId)));
    const [brand]=await (lock?query.for('update'):query);
    if (!brand) throw new AppError('NOT_FOUND','Brand not available');
    if (who.member.role!=='ADMIN') {
      const [assignment]=await tx.select().from(t.assignments).where(and(eq(t.assignments.workspaceId,who.workspaceId),eq(t.assignments.brandId,brandId),eq(t.assignments.userId,who.userId)));
      if (!assignment) throw new AppError('FORBIDDEN','Brand not assigned');
    }
    return {workspaceId:who.workspaceId,brandId,userId:who.userId};
  }
  private async event(tx:Transaction,s:Scope,name:string,actor='USER',eventId:string=id()) {
    const [brand]=await tx.select().from(t.brands).where(and(eq(t.brands.workspaceId,s.workspaceId),eq(t.brands.id,s.brandId)));
    const payload={eventId,name,occurredAtUtc:new Date().toISOString(),schemaVersion:'v1',workspaceId:s.workspaceId,brandId:s.brandId,userId:s.userId,dataClass:brand.dataClass,cohort:'NONE',intervention:'NONE',actor};
    validate('telemetry-event',payload);
    await tx.insert(t.telemetry).values({eventId,workspaceId:s.workspaceId,brandId:s.brandId,payload}).onConflictDoNothing();
  }
  private async audit(tx:Transaction,s:Scope,values:{operation:string;idempotencyKey:string;decisionId?:string;previousVersion?:string|null;newVersion?:string|null;rationale?:string;sourceRecommendationId?:string|null}) {
    await tx.insert(t.audits).values({id:id(),workspaceId:s.workspaceId,brandId:s.brandId,actorUserId:s.userId,occurredAt:new Date(),...values});
  }
  async me(token:string) {
    return this.db.transaction(async tx=>{const who=await this.identity(tx,token);return {userId:who.userId,workspaceId:who.workspaceId,learningMoments};});
  }
  async listBrands(token:string) {
    return this.db.transaction(async tx=>{
      const who=await this.identity(tx,token);
      const rows=await tx.select().from(t.brands).where(eq(t.brands.workspaceId,who.workspaceId));
      if(who.member.role==='ADMIN') return rows;
      const grants=await tx.select().from(t.assignments).where(and(eq(t.assignments.workspaceId,who.workspaceId),eq(t.assignments.userId,who.userId)));
      return rows.filter(b=>grants.some(g=>g.brandId===b.id));
    });
  }
  async createBrand(token:string,name:string,initialContext?:string) {
    if(typeof name!=='string'||!name.trim()||name.length>160) throw new AppError('INVALID','Brand name required');
    if(initialContext!==undefined&&(typeof initialContext!=='string'||initialContext.length>6000))throw new AppError('INVALID','Invalid initial context');
    return this.db.transaction(async tx=>{
      const who=await this.identity(tx,token);
      if(who.member.role!=='ADMIN'&&!who.member.canCreateBrand) throw new AppError('FORBIDDEN','Cannot create Brand');
      const brand={id:id(),workspaceId:who.workspaceId,name:name.trim(),dataClass:'DEMO'};
      await tx.insert(t.brands).values(brand);
      await tx.insert(t.assignments).values({workspaceId:who.workspaceId,brandId:brand.id,userId:who.userId});
      for(const {primaryDecision:module,primaryQuestion:text} of vertical) {
        await tx.insert(t.questions).values({id:id(),workspaceId:who.workspaceId,brandId:brand.id,module,text,status:'OPEN'});
      }
      const s={workspaceId:who.workspaceId,brandId:brand.id,userId:who.userId};
      if(initialContext?.trim()) {
        const now=new Date(),payload={id:id(),brandId:brand.id,statement:initialContext.trim(),createdBy:who.userId,createdAt:now.toISOString()};validate('user-input',payload);
        await tx.insert(t.userInputs).values({id:payload.id,workspaceId:who.workspaceId,brandId:brand.id,payload,createdBy:who.userId,createdAt:now});
        await this.audit(tx,s,{operation:'CONTEXT_USER-INPUT_CAPTURED',idempotencyKey:payload.id});
      }
      await this.audit(tx,s,{operation:'BRAND_CREATED',idempotencyKey:brand.id});
      await this.event(tx,s,'brand_created');
      return brand;
    });
  }
  async transitionQuestion(token:string,brandId:string,questionId:string,next:string) {
    return this.db.transaction(async tx=>{
      const s=await this.scope(tx,token,brandId);
      const [q]=await tx.select().from(t.questions).where(and(inScope(t.questions,s),eq(t.questions.id,questionId)));
      if(!q) throw new AppError('NOT_FOUND','Question not available');
      transition(q.status,next);
      if(next==='DECIDED') throw new AppError('INVALID','Use human commit');
      await tx.update(t.questions).set({status:next}).where(and(inScope(t.questions,s),eq(t.questions.id,q.id)));
      await this.audit(tx,s,{operation:`QUESTION_${next}`,idempotencyKey:id()});
      if(next==='IN_ANALYSIS') await this.event(tx,s,'strategic_question_started');
      return {...q,status:next};
    });
  }
  async prepareQuestion(token:string,brandId:string,questionId:string,expectedActiveVersion:string|null) {
    return this.db.transaction(async tx=>{
      const s=await this.scope(tx,token,brandId);
      const [q]=await tx.select().from(t.questions).where(and(inScope(t.questions,s),eq(t.questions.id,questionId)));
      if(!q) throw new AppError('NOT_FOUND','Question not available');
      const [d]=await tx.select().from(t.decisions).where(and(inScope(t.decisions,s),eq(t.decisions.questionId,questionId)));
      if((d?.activeVersionId??null)!==expectedActiveVersion) throw new AppError('CONFLICT','Stale active version');
      let current=q.status;
      const path=current==='DECIDED'?['REOPENED','IN_ANALYSIS','READY_FOR_DECISION']:current==='OPEN'||current==='REOPENED'?['IN_ANALYSIS','READY_FOR_DECISION']:current==='IN_ANALYSIS'?['READY_FOR_DECISION']:[];
      for(const next of path) {
        transition(current,next);
        await tx.update(t.questions).set({status:next}).where(and(inScope(t.questions,s),eq(t.questions.id,q.id)));
        await this.audit(tx,s,{operation:`QUESTION_${next}`,idempotencyKey:id()});
        if(next==='IN_ANALYSIS') await this.event(tx,s,'strategic_question_started');
        current=next;
      }
      return {questionId,status:current};
    });
  }
  private async syncDependencies(tx:Transaction,s:Scope) {
    const ds=await tx.select({decision:t.decisions,question:t.questions}).from(t.decisions).innerJoin(t.questions,and(eq(t.decisions.questionId,t.questions.id),eq(t.decisions.workspaceId,t.questions.workspaceId),eq(t.decisions.brandId,t.questions.brandId))).where(inScope(t.decisions,s));
    for(const rule of rules.rules) {
      const up=ds.find(d=>d.question.module===rule.upstream), down=ds.find(d=>d.question.module===rule.downstream);
      if(up&&down) await tx.insert(t.dependencies).values({id:id(),workspaceId:s.workspaceId,brandId:s.brandId,upstreamDecisionId:up.decision.id,downstreamDecisionId:down.decision.id,kind:rule.kind,reason:rule.reason,ruleVersion:rules.version}).onConflictDoNothing();
    }
  }
  private async contextVersion(tx:Transaction,s:Scope) {
    const decisions=await tx.select().from(t.decisions).where(inScope(t.decisions,s));
    return hash(JSON.stringify([decisions.map(d=>[d.id,d.activeVersionId,d.reviewStatus]).sort(),await this.contextEntities(tx,s)]));
  }
  private async contextEntities(tx:Transaction,s:Scope) {
    const read=async(table:typeof t.userInputs|typeof t.evidence|typeof t.hypotheses|typeof t.openQuestions|typeof t.experiments|typeof t.signals|typeof t.learnings)=> (await tx.select().from(table).where(inScope(table,s)).orderBy(asc(table.id))).map(r=>r.payload);
    return {experiments:await read(t.experiments),signals:await read(t.signals),learnings:await read(t.learnings),userInputs:await read(t.userInputs),evidence:await read(t.evidence),hypotheses:await read(t.hypotheses),openQuestions:await read(t.openQuestions)};
  }
  async captureContext(token:string,brandId:string,kind:string,input:Record<string,unknown>) {
    const tables={'user-input':t.userInputs,evidence:t.evidence,hypothesis:t.hypotheses,'open-question':t.openQuestions};
    if(!Object.hasOwn(tables,kind)||!input||Array.isArray(input)||JSON.stringify(input).length>16000) throw new AppError('INVALID','Invalid context entity');
    return this.db.transaction(async tx=>{
      const s=await this.scope(tx,token,brandId),now=new Date();
      const payload={...input,id:id(),brandId,...(kind==='user-input'?{createdBy:s.userId,createdAt:now.toISOString()}:{}),...(kind==='hypothesis'?{status:'UNTESTED',evidenceReferences:[]}:{}),...(kind==='open-question'?{status:'OPEN'}:{})};
      validate(kind,payload);
      if(Object.values(payload).some(v=>typeof v==='string'&&!v.trim())) throw new AppError('INVALID','Empty context content');
      if(kind==='open-question'&&input.relatedHypothesisId) {
        const [hypothesis]=await tx.select().from(t.hypotheses).where(and(inScope(t.hypotheses,s),eq(t.hypotheses.id,String(input.relatedHypothesisId))));
        if(!hypothesis) throw new AppError('NOT_FOUND','Hypothesis not available');
      }
      await tx.insert(tables[kind as keyof typeof tables]).values({id:payload.id,workspaceId:s.workspaceId,brandId,payload,createdBy:s.userId,createdAt:now});
      await tx.update(t.recommendations).set({resolution:'STALE'}).where(and(inScope(t.recommendations,s),eq(t.recommendations.resolution,'GENERATED')));
      await this.audit(tx,s,{operation:`CONTEXT_${kind.toUpperCase()}_CAPTURED`,idempotencyKey:payload.id,rationale:kind==='evidence'?'Human source assessment recorded; not independent verification':undefined});
      return payload;
    });
  }
  private async openReviews(tx:Transaction,s:Scope,decisionId:string) {
    return tx.select().from(t.reviews).where(and(inScope(t.reviews,s),eq(t.reviews.downstreamDecisionId,decisionId),ne(t.reviews.status,'COMPLETED')));
  }
  async assembleContext(token:string,brandId:string,questionId:string,budget=12000) {
    const ctx=await this.context(token,brandId),question=ctx.questions.find(q=>q.id===questionId);
    if(!question) throw new AppError('NOT_FOUND','Question not available');
    return assemble(ctx.contextVersion,question,ctx.dependencies,ctx.reviews,[
      ...ctx.decisions.map(d=>({id:d.id,type:'Decision',critical:true,data:{...d,version:ctx.versions.find(v=>v.id===d.activeVersionId)},trust:'HUMAN_APPROVED'})),
      ...ctx.evidence.map(e=>({id:String(e.id),type:'Evidence',critical:false,data:e,trust:e.external?'UNTRUSTED_EXTERNAL':'HUMAN_RECORDED'})),
      ...ctx.learnings.filter(e=>e.status==='ACCEPTED').map(e=>({id:String(e.id),type:'Learning',critical:false,data:e,trust:'HUMAN_ACCEPTED'})),
      ...ctx.userInputs.map(e=>({id:String(e.id),type:'UserInput',critical:false,data:e,trust:'USER_STATEMENT'})),
      ...ctx.hypotheses.filter(e=>e.status!=='REJECTED').map(e=>({id:String(e.id),type:'Hypothesis',critical:false,data:e,trust:e.status==='SUPPORTED'?'HUMAN_REVIEWED':'UNVALIDATED'})),
      ...ctx.openQuestions.filter(e=>e.status==='OPEN').map(e=>({id:String(e.id),type:'OpenQuestion',critical:false,data:e,trust:'OPEN'})),
      ...ctx.versions.filter(v=>v.versionStatus==='SUPERSEDED'&&ctx.decisions.some(d=>d.id===v.decisionId&&d.questionId===questionId)).map(v=>({id:v.id,type:'DecisionHistory',critical:false,data:v,trust:'HISTORICAL_NOT_CURRENT'}))
    ],budget);
  }
  async analyze(token:string,brandId:string,questionId:string) {
    const actor=await this.me(token),packet=await this.assembleContext(token,brandId,questionId),question=packet.question as {module:string};
    const response=await this.gateway.invoke({task:'STRATEGIC_ANALYSIS',module:question.module,promptVersion:'competition-demo-v1',contextVersion:packet.contextVersion,input:packet,outputSchema:'recommendation',budget:{maxCharacters:20000,timeoutMs:5000},tenantScope:{workspaceId:actor.workspaceId,brandId},questionId});
    const {result,...trace}=response;
    return this.db.transaction(async tx=>{
      const s=await this.scope(tx,token,brandId);
      if(await this.contextVersion(tx,s)!==packet.contextVersion) throw new AppError('CONFLICT','Context changed during analysis');
      const evaluation=result?evaluate(result,packet):null;
      const invalid=!result||result.brandId!==brandId||result.questionId!==questionId||result.contextVersion!==packet.contextVersion||evaluation?.issues.some(i=>i.severity==='CONFLICT');
      if(invalid) {
        await tx.insert(t.analyses).values({id:id(),workspaceId:s.workspaceId,brandId,contextVersion:packet.contextVersion,evaluation,trace:{...trace,error:trace.error??'INVALID_OUTPUT'},createdAt:new Date()});
        return {recommendation:null,evaluation,error:trace.error??'INVALID_OUTPUT',provider:trace.provider};
      }
      await tx.update(t.recommendations).set({resolution:'STALE'}).where(and(inScope(t.recommendations,s),eq(t.recommendations.questionId,questionId),eq(t.recommendations.resolution,'GENERATED')));
      await tx.insert(t.recommendations).values({id:result.id,workspaceId:s.workspaceId,brandId,questionId,payload:result,contextVersion:packet.contextVersion});
      await tx.insert(t.analyses).values({id:id(),workspaceId:s.workspaceId,brandId,recommendationId:result.id,contextVersion:packet.contextVersion,evaluation,trace,createdAt:new Date()});
      await this.event(tx,s,'recommendation_generated','AI');
      await this.audit(tx,s,{operation:'RECOMMENDATION_GENERATED',idempotencyKey:result.id,sourceRecommendationId:result.id});
      return {recommendation:result,evaluation,error:null,provider:trace.provider};
    });
  }
  async rejectRecommendation(token:string,brandId:string,recommendationId:string,rationale:string) {
    if(typeof rationale!=='string'||!rationale.trim()||rationale.length>12000)throw new AppError('INVALID','Human rationale required');
    return this.db.transaction(async tx=>{
      const s=await this.scope(tx,token,brandId);
      const [rec]=await tx.select().from(t.recommendations).where(and(inScope(t.recommendations,s),eq(t.recommendations.id,recommendationId)));
      if(!rec||!['GENERATED','REJECTED'].includes(rec.resolution))throw new AppError('CONFLICT','Recommendation unavailable');
      if(rec.resolution==='REJECTED')return {resolution:'REJECTED'};
      await tx.update(t.recommendations).set({resolution:'REJECTED'}).where(and(inScope(t.recommendations,s),eq(t.recommendations.id,recommendationId)));
      await this.audit(tx,s,{operation:'RECOMMENDATION_REJECTED',idempotencyKey:recommendationId,sourceRecommendationId:recommendationId,rationale});
      await this.event(tx,s,'recommendation_rejected');return {resolution:'REJECTED'};
    });
  }
  async createLearningObject(token:string,brandId:string,kind:string,input:Record<string,unknown>,decisionId?:string) {
    if(!['experiment','signal','learning'].includes(kind)||!input||Array.isArray(input)||JSON.stringify(input).length>16000)throw new AppError('INVALID','Invalid learning object');
    return this.db.transaction(async tx=>{
      const s=await this.scope(tx,token,brandId),now=new Date(),objectId=id();
      const payload:Record<string,unknown>={...input,id:objectId,brandId,...(kind==='experiment'?{ownerUserId:s.userId,status:'PLANNED'}:kind==='learning'?{status:'CANDIDATE',reviewedBy:null}:{})};validate(kind,payload);
      if(Object.values(payload).some(v=>typeof v==='string'&&!v.trim()))throw new AppError('INVALID','Empty content');
      const base={id:objectId,workspaceId:s.workspaceId,brandId,payload,createdBy:s.userId,createdAt:now};
      if(kind==='experiment') {
        const [hypothesis]=await tx.select().from(t.hypotheses).where(and(inScope(t.hypotheses,s),eq(t.hypotheses.id,String(payload.hypothesisId))));
        const [decision]=await tx.select().from(t.decisions).where(and(inScope(t.decisions,s),eq(t.decisions.id,decisionId??'')));
        if(!hypothesis||!decision?.activeVersionId)throw new AppError('NOT_FOUND','Hypothesis or decision unavailable');
        await tx.insert(t.experiments).values({...base,hypothesisId:hypothesis.id,decisionId:decision.id});
      } else if(kind==='signal') {
        const [experiment]=await tx.select().from(t.experiments).where(and(inScope(t.experiments,s),eq(t.experiments.id,String(payload.experimentId))));
        if(!experiment)throw new AppError('NOT_FOUND','Experiment unavailable');
        if(experiment.payload.status!=='RUNNING')throw new AppError('CONFLICT','Start the experiment before recording signals');
        if(new Date(String(payload.observedAt))>now)throw new AppError('INVALID','Observation cannot be in the future');
        await tx.insert(t.signals).values({...base,experimentId:experiment.id});
      } else {
        const signalIds=payload.signalIds as string[];
        if(new Set(signalIds).size!==signalIds.length)throw new AppError('INVALID','Duplicate signals');
        for(const signalId of signalIds) {const [signal]=await tx.select().from(t.signals).where(and(inScope(t.signals,s),eq(t.signals.id,signalId)));if(!signal)throw new AppError('NOT_FOUND','Signal unavailable');}
        await tx.insert(t.learnings).values(base);
        await tx.insert(t.learningSignals).values(signalIds.map(signalId=>({workspaceId:s.workspaceId,brandId,learningId:objectId,signalId})));
      }
      await tx.update(t.recommendations).set({resolution:'STALE'}).where(and(inScope(t.recommendations,s),eq(t.recommendations.resolution,'GENERATED')));
      await this.audit(tx,s,{operation:`${kind.toUpperCase()}_CREATED`,idempotencyKey:objectId,decisionId:kind==='experiment'?decisionId:undefined});
      await this.event(tx,s,kind==='signal'?'signal_recorded':`${kind}_created`);return payload;
    });
  }
  async transitionLearningObject(token:string,brandId:string,kind:string,objectId:string,expectedStatus:string,status:string) {
    if(!['experiment','learning'].includes(kind))throw new AppError('INVALID','Invalid transition type');
    return this.db.transaction(async tx=>{
      const s=await this.scope(tx,token,brandId),table=kind==='experiment'?t.experiments:t.learnings;
      const [row]=await tx.select().from(table).where(and(inScope(table,s),eq(table.id,objectId)));
      if(!row)throw new AppError('NOT_FOUND','Object unavailable');
      if(row.payload.status!==expectedStatus)throw new AppError('CONFLICT','State changed; reload');
      const paths:Record<string,string[]>=kind==='experiment'?{PLANNED:['RUNNING'],RUNNING:['COMPLETED','INCONCLUSIVE','CANCELLED']}:{CANDIDATE:['REVIEWED'],REVIEWED:['ACCEPTED','REJECTED']};
      if(!paths[expectedStatus]?.includes(status))throw new AppError('CONFLICT','Invalid human transition');
      if(kind==='experiment'&&status==='COMPLETED') {const signals=await tx.select().from(t.signals).where(and(inScope(t.signals,s),eq(t.signals.experimentId,objectId)));if(!signals.length)throw new AppError('CONFLICT','No signal; choose inconclusive');}
      const payload={...row.payload,status,...(kind==='learning'?{reviewedBy:s.userId}:{})};validate(kind,payload);
      await tx.update(table).set({payload}).where(and(inScope(table,s),eq(table.id,objectId)));
      await tx.update(t.recommendations).set({resolution:'STALE'}).where(and(inScope(t.recommendations,s),eq(t.recommendations.resolution,'GENERATED')));
      await this.audit(tx,s,{operation:`${kind.toUpperCase()}_${status}`,idempotencyKey:id(),rationale:`${objectId}: ${expectedStatus} -> ${status}`});return payload;
    });
  }
  async practice(token:string) {
    return this.db.transaction(async tx=>{const who=await this.identity(tx,token);return (await tx.select().from(t.capabilityEvents).where(eq(t.capabilityEvents.userId,who.userId))).map(e=>e.payload);});
  }
  async blueprint(token:string,brandId:string) {
    const projection=await this.context(token,brandId);
    await this.db.transaction(async tx=>{const s=await this.scope(tx,token,brandId);await this.event(tx,s,'blueprint_viewed');});
    return projection;
  }
  private reviewFingerprint(rows:{triggerVersionId:string;ruleVersion:string}[]) {return hash(JSON.stringify(rows.map(r=>[r.triggerVersionId,r.ruleVersion]).sort()));}
  async beginReview(token:string,brandId:string,decisionId:string) {
    await this.retryImpact(token,brandId);
    return this.db.transaction(async tx=>{
      const s=await this.scope(tx,token,brandId);
      await this.requireNoPending(tx,s);
      const [d]=await tx.select().from(t.decisions).where(and(inScope(t.decisions,s),eq(t.decisions.id,decisionId)));
      const rows=await this.openReviews(tx,s,decisionId);
      if(!d?.activeVersionId||!rows.length) throw new AppError('CONFLICT','No active review');
      const receipt={id:id(),workspaceId:s.workspaceId,brandId,actorUserId:s.userId,decisionId,activeVersionId:d.activeVersionId,triggerFingerprint:this.reviewFingerprint(rows)};
      await tx.insert(t.reviewReceipts).values(receipt);
      await this.event(tx,s,'change_impact_review_started');
      return {reviewToken:receipt.id,decisionId,activeVersionId:d.activeVersionId,reviews:rows.map(reviewOutput)};
    });
  }
  private async requireNoPending(tx:Transaction,s:Scope) {
    const rows=await tx.select().from(t.impacts).where(and(inScope(t.impacts,s),eq(t.impacts.status,'IMPACT_PENDING')));
    if(rows.length) throw new AppError('UNAVAILABLE','Impact pending: retry before another strategic commit');
  }
  async commitDecision(token:string,command:CommitCommand,reviewToken?:string) {
    validate('decision-commit',command);
    if(!command.selectedOption.trim()||!command.rationale.trim()||command.selectedOption.length>12000||command.rationale.length>12000||command.idempotencyKey.length>200) throw new AppError('INVALID','Invalid command content or size');
    const fingerprint=hash(JSON.stringify([command.questionId,command.sourceRecommendationId,command.selectedOption,command.rationale,command.expectedActiveVersion,command.actorUserId,reviewToken??null]));
    const result=await this.db.transaction(async tx=>{
      const s=await this.scope(tx,token,command.brandId);
      if(s.userId!==command.actorUserId) throw new AppError('FORBIDDEN','Actor does not match session');
      const key=and(inScope(t.idempotency,s),eq(t.idempotency.actorUserId,s.userId),eq(t.idempotency.command,'COMMIT_DECISION'),eq(t.idempotency.key,command.idempotencyKey));
      const [prior]=await tx.select().from(t.idempotency).where(key);
      if(prior) {
        if(prior.fingerprint!==fingerprint) throw new AppError('CONFLICT','Idempotency key reused with different command');
        return prior.result as {decisionId:string;versionId:string};
      }
      await this.requireNoPending(tx,s);
      const [question]=await tx.select().from(t.questions).where(and(inScope(t.questions,s),eq(t.questions.id,command.questionId)));
      if(!question) throw new AppError('NOT_FOUND','Question not available');
      if(question.status!=='READY_FOR_DECISION') throw new AppError('CONFLICT','Question not ready for human decision');
      let [decision]=await tx.select().from(t.decisions).where(and(inScope(t.decisions,s),eq(t.decisions.questionId,command.questionId)));
      if((decision?.activeVersionId??null)!==command.expectedActiveVersion) throw new AppError('CONFLICT','Stale active version');
      if(decision?.reviewStatus==='INVALIDATED') throw new AppError('CONFLICT','Invalidated decision');
      if(question.module==='Positioning') {
        const upstream=await tx.select().from(t.decisions).innerJoin(t.questions,eq(t.questions.id,t.decisions.questionId)).where(and(inScope(t.decisions,s),eq(t.questions.module,'Primary Customer')));
        if(!upstream[0]?.decisions.activeVersionId) throw new AppError('CONFLICT','Approve Primary Customer first');
      }
      const hypothesisUsages:{hypothesisId:string;assumptionInUse:boolean}[]=[];
      if(command.sourceRecommendationId) {
        const [rec]=await tx.select().from(t.recommendations).where(and(inScope(t.recommendations,s),eq(t.recommendations.id,command.sourceRecommendationId),eq(t.recommendations.questionId,command.questionId)));
        if(!rec||rec.resolution!=='GENERATED'||rec.contextVersion!==await this.contextVersion(tx,s)) throw new AppError('CONFLICT','Recommendation unavailable or stale');
        validate('recommendation',rec.payload);
        const proposal=rec.payload as Recommendation;
        for(const hypothesisId of proposal.hypothesesUsed) {
          const [hypothesis]=await tx.select().from(t.hypotheses).where(and(inScope(t.hypotheses,s),eq(t.hypotheses.id,hypothesisId)));
          if(!hypothesis||hypothesis.payload.status==='REJECTED')throw new AppError('CONFLICT','Hypothesis unavailable');
          hypothesisUsages.push({hypothesisId,assumptionInUse:hypothesis.payload.status!=='SUPPORTED'});
        }
        const resolution=proposal.options.find(o=>o.id===proposal.recommendedOptionId)?.label===command.selectedOption?'ACCEPTED':'MODIFIED';
        await tx.update(t.recommendations).set({resolution}).where(and(inScope(t.recommendations,s),eq(t.recommendations.id,rec.id)));
        await this.event(tx,s,resolution==='ACCEPTED'?'recommendation_accepted':'recommendation_modified');
      }
      if(!decision) {
        [decision]=await tx.insert(t.decisions).values({id:id(),workspaceId:s.workspaceId,brandId:s.brandId,questionId:question.id,activeVersionId:null,reviewStatus:'APPROVED'}).returning();
      }
      const open=await this.openReviews(tx,s,decision.id);
      if(open.length) {
        const [receipt]=reviewToken?await tx.select().from(t.reviewReceipts).where(and(inScope(t.reviewReceipts,s),eq(t.reviewReceipts.id,reviewToken),eq(t.reviewReceipts.actorUserId,s.userId),eq(t.reviewReceipts.decisionId,decision.id))):[];
        if(!receipt||receipt.activeVersionId!==decision.activeVersionId||receipt.triggerFingerprint!==this.reviewFingerprint(open)) throw new AppError('CONFLICT','Review changed; reopen human review');
      }
      const [previous]=decision.activeVersionId?await tx.select().from(t.versions).where(and(inScope(t.versions,s),eq(t.versions.id,decision.activeVersionId))):[];
      if(previous) await tx.update(t.versions).set({versionStatus:'SUPERSEDED'}).where(and(inScope(t.versions,s),eq(t.versions.id,previous.id)));
      const version={id:id(),workspaceId:s.workspaceId,brandId:s.brandId,decisionId:decision.id,sequence:(previous?.sequence??0)+1,selectedOption:command.selectedOption,rationale:command.rationale,actorUserId:s.userId,approvedAt:new Date(),previousVersionId:previous?.id??null,versionStatus:'APPROVED',hypothesisUsages};
      validate('decision-version',versionOutput(version));
      await tx.insert(t.versions).values(version);
      await tx.update(t.decisions).set({activeVersionId:version.id,reviewStatus:'APPROVED'}).where(and(inScope(t.decisions,s),eq(t.decisions.id,decision.id)));
      await tx.update(t.questions).set({status:'DECIDED'}).where(and(inScope(t.questions,s),eq(t.questions.id,question.id)));
      if(open.length) {
        await tx.update(t.reviews).set({status:'COMPLETED',reviewedBy:s.userId}).where(and(inScope(t.reviews,s),eq(t.reviews.downstreamDecisionId,decision.id),ne(t.reviews.status,'COMPLETED')));
        await this.event(tx,s,'change_impact_review_completed');
      }
      await this.syncDependencies(tx,s);
      await this.audit(tx,s,{operation:'COMMIT_DECISION',idempotencyKey:command.idempotencyKey,decisionId:decision.id,previousVersion:previous?.id??null,newVersion:version.id,rationale:command.rationale,sourceRecommendationId:command.sourceRecommendationId});
      await this.event(tx,s,'decision_created');
      const capability={id:id(),userId:s.userId,capability:learningMoments[question.module]?.capability??'Problem Framing',behavior:'Explicitó una elección y su criterio en una decisión humana.',decisionId:decision.id,occurredAt:version.approvedAt.toISOString()};
      validate('capability-event',capability);
      await tx.insert(t.capabilityEvents).values({id:capability.id,userId:s.userId,payload:capability});
      if(previous) {
        await this.event(tx,s,'decision_superseded');
        await tx.insert(t.impacts).values({workspaceId:s.workspaceId,brandId:s.brandId,triggerVersionId:version.id,status:'IMPACT_PENDING'});
      }
      // Context-dependent proposals become stale on every strategic commit.
      await tx.update(t.recommendations).set({resolution:'STALE'}).where(and(inScope(t.recommendations,s),eq(t.recommendations.resolution,'GENERATED')));
      const output={decisionId:decision.id,versionId:version.id};
      await tx.insert(t.idempotency).values({workspaceId:s.workspaceId,brandId:s.brandId,actorUserId:s.userId,command:'COMMIT_DECISION',key:command.idempotencyKey,fingerprint,result:output});
      return output;
    });
    const impact=await this.retryImpact(token,command.brandId);
    return {...result,impactPending:impact.pending};
  }
  async retryImpact(token:string,brandId:string):Promise<{pending:boolean}> {
    // Authorization failures remain visible; only impact computation failures become pending.
    await this.db.transaction(tx=>this.scope(tx,token,brandId));
    try {
      await this.db.transaction(async tx=>{
        const s=await this.scope(tx,token,brandId);
        const jobs=await tx.select().from(t.impacts).where(and(inScope(t.impacts,s),eq(t.impacts.status,'IMPACT_PENDING')));
        for(const job of jobs) {
          this.impactHook?.();
          const [trigger]=await tx.select().from(t.versions).where(and(inScope(t.versions,s),eq(t.versions.id,job.triggerVersionId)));
          const outgoing=await tx.select().from(t.dependencies).where(and(inScope(t.dependencies,s),eq(t.dependencies.upstreamDecisionId,trigger.decisionId)));
          const affected=[];
          for(const dep of outgoing) {
            const status=dep.kind==='HARD'?'NEEDS_REVIEW':dep.kind==='SOFT'?'REVIEW_SUGGESTED':'INFORMATION_ONLY';
            const reason=`${dep.reason}. Cambio humano: versión ${trigger.sequence-1} → ${trigger.sequence}. Revisa la decisión dependiente; su contenido se conserva.`;
            affected.push({downstreamDecisionId:dep.downstreamDecisionId,dependencyType:dep.kind,impactStatus:status,reason});
            if(dep.kind==='HARD') await tx.update(t.decisions).set({reviewStatus:'NEEDS_REVIEW'}).where(and(inScope(t.decisions,s),eq(t.decisions.id,dep.downstreamDecisionId)));
            if(dep.kind!=='INFORMATIVE') await tx.insert(t.reviews).values({id:id(),workspaceId:s.workspaceId,brandId:s.brandId,triggerVersionId:trigger.id,downstreamDecisionId:dep.downstreamDecisionId,dependencyType:dep.kind,status:dep.kind==='HARD'?'OPEN':'REVIEW_SUGGESTED',reason,reviewedBy:null,ruleVersion:dep.ruleVersion}).onConflictDoNothing();
            await this.event(tx,s,'dependency_triggered','SYSTEM',hash(`${trigger.id}:${dep.id}`));
          }
          const allEdges=await tx.select().from(t.dependencies).where(inScope(t.dependencies,s));
          const result={triggerVersionId:trigger.id,affectedDecisionIds:affected.map(a=>a.downstreamDecisionId),affected,reviewOrder:reviewOrder(affected,allEdges)};
          validate('impact-result',result);
          await tx.update(t.impacts).set({status:'COMPLETED',result,attempts:job.attempts+1}).where(and(inScope(t.impacts,s),eq(t.impacts.triggerVersionId,job.triggerVersionId)));
          await this.audit(tx,s,{operation:'CHANGE_IMPACT',idempotencyKey:trigger.id,decisionId:trigger.decisionId,newVersion:trigger.id});
        }
      });
      return {pending:false};
    } catch(error) {
      if(error instanceof AppError && ['UNAUTHORIZED','FORBIDDEN','NOT_FOUND'].includes(error.code)) throw error;
      return {pending:true};
    }
  }
  async showImpact(token:string,brandId:string) {
    return this.db.transaction(async tx=>{const s=await this.scope(tx,token,brandId);const rows=await tx.select().from(t.impacts).where(inScope(t.impacts,s));await this.event(tx,s,'change_impact_shown');return rows.map(x=>({status:x.status,result:x.result,triggerVersionId:x.triggerVersionId}));});
  }
  async context(token:string,brandId:string) {
    return this.db.transaction(async tx=>{
      const s=await this.scope(tx,token,brandId);
      const qs=await tx.select().from(t.questions).where(inScope(t.questions,s));
      const ds=await tx.select().from(t.decisions).where(inScope(t.decisions,s));
      const vs=await tx.select().from(t.versions).where(inScope(t.versions,s)).orderBy(asc(t.versions.sequence));
      const deps=await tx.select().from(t.dependencies).where(inScope(t.dependencies,s));
      const rs=await tx.select().from(t.reviews).where(inScope(t.reviews,s));
      const impact=await tx.select().from(t.impacts).where(inScope(t.impacts,s));
      const audit=await tx.select().from(t.audits).where(inScope(t.audits,s));
      const recommendations=await tx.select().from(t.recommendations).where(inScope(t.recommendations,s));
      const analyses=await tx.select().from(t.analyses).where(inScope(t.analyses,s));
      const output={recommendations,analyses,...await this.contextEntities(tx,s),contextVersion:await this.contextVersion(tx,s),questions:qs.sort((a,b)=>vertical.findIndex(m=>m.primaryDecision===a.module)-vertical.findIndex(m=>m.primaryDecision===b.module)).map(({workspaceId:_w,...q})=>q),decisions:ds.map(({workspaceId:_w,...d})=>d),versions:vs.map(versionOutput),dependencies:deps.map(({workspaceId:_w,...d})=>d),reviews:rs.map(reviewOutput),impacts:impact.map(({status,result,triggerVersionId})=>({status,result,triggerVersionId})),audit};
      for(const [name,rows] of [['strategic-question',output.questions],['decision',output.decisions],['decision-version',output.versions],['dependency',output.dependencies],['review-item',output.reviews]] as const) for(const row of rows) validate(name,row);
      return output;
    });
  }
}
export function versionOutput(v:typeof t.versions.$inferSelect) {
  return {id:v.id,decisionId:v.decisionId,sequence:v.sequence,selectedOption:v.selectedOption,rationale:v.rationale,actorUserId:v.actorUserId,approvedAt:v.approvedAt.toISOString(),previousVersionId:v.previousVersionId,versionStatus:v.versionStatus,hypothesisUsages:v.hypothesisUsages};
}
function reviewOutput(r:typeof t.reviews.$inferSelect) {
  return {id:r.id,brandId:r.brandId,triggerVersionId:r.triggerVersionId,downstreamDecisionId:r.downstreamDecisionId,dependencyType:r.dependencyType,status:r.status,reason:r.reason,reviewedBy:r.reviewedBy};
}
