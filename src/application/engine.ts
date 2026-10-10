import {BrandoSuggestions,BrandoAssistance} from '../domain/brando-suggestions.js';
import { attentionFor, brandoPacket,brandoSuggestionActions, validBrandoReferences } from '../domain/brando.js';
import { randomUUID, createHash } from 'node:crypto';
import { and, eq, ne, asc, desc, sql } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { AppError, validate, rules, reviewsOnFirstUpstreamVersion, transition, reviewOrder, type CommitCommand } from '../domain/contracts.js';
import type { Database, Transaction } from '../persistence/database.js';
import * as t from '../persistence/schema.js';
import { journey, modulesVersion, learningMoments } from '../domain/modules.js';
import { assemble } from '../domain/context-assembler.js';
import { strategicIntelligence } from '../domain/intelligence.js';
import { HYPOTHESIS_TRANSITIONS,RESOLVED_STATUSES,validationSnapshot,validationCycleStart,learningAcceptedAt,type HypothesisStatus } from '../domain/validation.js';
import { GEOGRAPHIC_INFLUENCE,type GeographicInfluence } from '../domain/brand-context.js';
import { ModelGateway, DemoProvider, evaluate, type Recommendation } from '../domain/analysis.js';

const id=()=>randomUUID();
export const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
type Scope={workspaceId:string;brandId:string;userId:string;sessionId?:string};
const inScope=(table:{workspaceId:AnyPgColumn;brandId:AnyPgColumn},s:Scope)=>and(eq(table.workspaceId,s.workspaceId),eq(table.brandId,s.brandId));
// All application entry points authenticate from an opaque credential; callers never supply a trusted actor.
export class Engine {
  private brandoSuggestions=new BrandoSuggestions();
  private brandoAssistance=new BrandoAssistance();
  constructor(private db:Database, private impactHook?:()=>void,private gateway=new ModelGateway(new DemoProvider())) {}
  /** Whether explicit AI requests reach a real provider (local live AI) or the deterministic DEMO fixture. */
  get aiMode():'LIVE'|'DEMO' {return this.gateway.providerName==='DEMO_FIXTURE'?'DEMO':'LIVE';}
  private async identity(tx:Transaction,token:string) {
    if (!token || token.length>256) throw new AppError('UNAUTHORIZED','Human session required');
    const [session]=await tx.select().from(t.sessions).where(eq(t.sessions.tokenHash,hash(token)));
    if (!session || session.expiresAt<=new Date()) throw new AppError('UNAUTHORIZED','Session expired or invalid');
    const [member]=await tx.select().from(t.memberships).where(and(eq(t.memberships.workspaceId,session.workspaceId),eq(t.memberships.userId,session.userId))).for('share');
    if (!member?.active || !['ADMIN','MEMBER'].includes(member.role)) throw new AppError('FORBIDDEN','Active human membership required');
    const [pilotSession]=await tx.select().from(t.pilotSessions).where(eq(t.pilotSessions.tokenHash,session.tokenHash));
    return {...session,member,sessionId:pilotSession?.sessionId};
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
    return {workspaceId:who.workspaceId,brandId,userId:who.userId,sessionId:who.sessionId};
  }
  private async event(tx:Transaction,s:Scope,name:string,actor='USER',eventId:string=id()) {
    const [brand]=await tx.select().from(t.brands).where(and(eq(t.brands.workspaceId,s.workspaceId),eq(t.brands.id,s.brandId)));
    const [workspace]=brand.dataClass==='PILOT'?await tx.select().from(t.pilotWorkspaces).where(eq(t.pilotWorkspaces.workspaceId,s.workspaceId)):[];
    const [session]=s.sessionId?await tx.select().from(t.pilotSessions).where(eq(t.pilotSessions.sessionId,s.sessionId)):[];
    const payload={eventId,name,occurredAtUtc:new Date().toISOString(),schemaVersion:'v1',workspaceId:s.workspaceId,brandId:s.brandId,userId:s.userId,dataClass:brand.dataClass,cohort:workspace?.cohort??'NONE',intervention:session?.intervention??'NONE',actor};
    validate('telemetry-event',payload);
    await tx.insert(t.telemetry).values({eventId,workspaceId:s.workspaceId,brandId:s.brandId,payload}).onConflictDoNothing();
    if(brand.dataClass==='PILOT'){
      await tx.insert(t.pilotEvents).values({id:eventId,userId:s.userId,workspaceId:s.workspaceId,brandId:s.brandId,sessionId:s.sessionId,name,cohort:workspace.cohort,intervention:session?.intervention??'NONE',occurredAt:new Date()}).onConflictDoNothing();
    }
  }
  private async audit(tx:Transaction,s:Scope,values:{operation:string;idempotencyKey:string;decisionId?:string;previousVersion?:string|null;newVersion?:string|null;rationale?:string;sourceRecommendationId?:string|null}) {
    await tx.insert(t.audits).values({id:id(),workspaceId:s.workspaceId,brandId:s.brandId,actorUserId:s.userId,occurredAt:new Date(),...values});
  }
  async me(token:string) {
    return this.db.transaction(async tx=>{const who=await this.identity(tx,token);return {userId:who.userId,workspaceId:who.workspaceId,expiresAt:who.expiresAt,learningMoments};});
  }
  async listBrands(token:string) {
    return this.db.transaction(async tx=>{
      const who=await this.identity(tx,token);
      const rows=await tx.select().from(t.brands).where(eq(t.brands.workspaceId,who.workspaceId));
      // Demo classification travels with the brand so the interface can label the sandbox without
      // guessing from its name. Absent profile row means a real brand.
      const profiles=await tx.select().from(t.brandProfiles).where(eq(t.brandProfiles.workspaceId,who.workspaceId));
      const demo=new Set(profiles.filter(p=>p.isDemo).map(p=>p.brandId));
      const withKind=rows.map(b=>({...b,isDemo:demo.has(b.id)}));
      if(who.member.role==='ADMIN') return withKind;
      const grants=await tx.select().from(t.assignments).where(and(eq(t.assignments.workspaceId,who.workspaceId),eq(t.assignments.userId,who.userId)));
      return withKind.filter(b=>grants.some(g=>g.brandId===b.id));
    });
  }
  async documentUploadScope(token:string,brandId:string) {
    return this.db.transaction(async tx=>{
      const s=await this.scope(tx,token,brandId,false);
      return {
        workspaceId:s.workspaceId,
        brandId:s.brandId,
        userId:s.userId
      };
    });
  }

  async registerSourceDocument(
    token:string,
    brandId:string,
    input:{
      id:string;
      originalName:string;
      mediaType:string;
      bytes:number;
      sha256:string;
      storageKey:string;
    }
  ) {
    if(
      !input.id ||
      !input.originalName.trim() ||
      input.originalName.length>255 ||
      !input.mediaType.trim() ||
      input.mediaType.length>160 ||
      !Number.isSafeInteger(input.bytes) ||
      input.bytes<=0 ||
      input.bytes>20*1024*1024 ||
      !/^[a-f0-9]{64}$/i.test(input.sha256) ||
      !input.storageKey.trim() ||
      input.storageKey.length>1000
    ) throw new AppError('INVALID','Invalid source document');

    return this.db.transaction(async tx=>{
      const s=await this.scope(tx,token,brandId);
      const now=new Date();

      const row={
        id:input.id,
        workspaceId:s.workspaceId,
        brandId:s.brandId,
        originalName:input.originalName.trim(),
        mediaType:input.mediaType.trim(),
        bytes:input.bytes,
        sha256:input.sha256.toLowerCase(),
        storageKey:input.storageKey,
        status:'UPLOADED',
        uploadedBy:s.userId,
        uploadedAt:now
      };

      await tx.insert(t.sourceDocuments).values(row);

      await this.audit(tx,s,{
        operation:'SOURCE_DOCUMENT_UPLOADED',
        idempotencyKey:row.id,
        rationale:'User-supplied private source document registered'
      });

      await this.event(tx,s,'source_document_uploaded');

      return {
        id:row.id,
        brandId:row.brandId,
        originalName:row.originalName,
        mediaType:row.mediaType,
        bytes:row.bytes,
        sha256:row.sha256,
        status:row.status,
        uploadedBy:row.uploadedBy,
        uploadedAt:row.uploadedAt.toISOString()
      };
    });
  }

  async sourceDocument(
    token:string,
    brandId:string,
    documentId:string
  ) {
    return this.db.transaction(async tx=>{
      const s=await this.scope(tx,token,brandId,false);

      const [document]=await tx
        .select()
        .from(t.sourceDocuments)
        .where(and(
          inScope(t.sourceDocuments,s),
          eq(t.sourceDocuments.id,documentId)
        ));

      if(!document)
        throw new AppError('NOT_FOUND','Source document not available');

      return document;
    });
  }

  async persistDocumentExtraction(
    token:string,
    brandId:string,
    documentId:string,
    input:{
      extractorVersion:string;
      content:string;
      metadata:Record<string,unknown>;
    }
  ) {
    if(
      !input.extractorVersion ||
      input.extractorVersion.length>120 ||
      typeof input.content!=='string' ||
      !input.content.trim() ||
      input.content.length>2_000_000
    ) throw new AppError('INVALID','Invalid document extraction');

    return this.db.transaction(async tx=>{
      const s=await this.scope(tx,token,brandId);

      const [document]=await tx
        .select()
        .from(t.sourceDocuments)
        .where(and(
          inScope(t.sourceDocuments,s),
          eq(t.sourceDocuments.id,documentId)
        ));

      if(!document)
        throw new AppError('NOT_FOUND','Source document not available');

      const previous=await tx
        .select()
        .from(t.documentExtractions)
        .where(and(
          inScope(t.documentExtractions,s),
          eq(t.documentExtractions.documentId,documentId)
        ))
        .orderBy(asc(t.documentExtractions.createdAt));

      const reusable=previous.find(row=>{
        if(row.status!=='COMPLETE')return false;

        const metadata=row.metadata??{};

        return (
          metadata.sourceSha256===document.sha256 &&
          metadata.extractorVersion===input.extractorVersion
        );
      });

      if(reusable){
        return {
          id:reusable.id,
          documentId:reusable.documentId,
          status:reusable.status,
          provider:reusable.provider,
          model:reusable.model,
          metadata:reusable.metadata,
          createdAt:reusable.createdAt.toISOString(),
          reused:true
        };
      }

      const now=new Date();
      const extractionId=id();

      const metadata={
        ...input.metadata,
        sourceSha256:document.sha256,
        extractorVersion:input.extractorVersion
      };

      await tx.insert(t.documentExtractions).values({
        id:extractionId,
        workspaceId:s.workspaceId,
        brandId:s.brandId,
        documentId,
        status:'COMPLETE',
        provider:'LOCAL',
        model:input.extractorVersion,
        content:input.content,
        metadata,
        createdAt:now
      });

      await tx
        .update(t.sourceDocuments)
        .set({status:'EXTRACTED'})
        .where(and(
          inScope(t.sourceDocuments,s),
          eq(t.sourceDocuments.id,documentId)
        ));

      await this.audit(tx,s,{
        operation:'SOURCE_DOCUMENT_EXTRACTED',
        idempotencyKey:extractionId,
        rationale:`Local deterministic extraction ${input.extractorVersion}`
      });

      await this.event(tx,s,'source_document_extracted');

      return {
        id:extractionId,
        documentId,
        status:'COMPLETE',
        provider:'LOCAL',
        model:input.extractorVersion,
        metadata,
        createdAt:now.toISOString(),
        reused:false
      };
    });
  }

  async documentExtractionForClaims(
    token:string,
    brandId:string,
    documentId:string
  ) {
    return this.db.transaction(async tx=>{
      const s=await this.scope(tx,token,brandId,false);

      const [document]=await tx
        .select()
        .from(t.sourceDocuments)
        .where(and(
          inScope(t.sourceDocuments,s),
          eq(t.sourceDocuments.id,documentId)
        ));

      if(!document)
        throw new AppError('NOT_FOUND','Source document not available');

      const extractions=await tx
        .select()
        .from(t.documentExtractions)
        .where(and(
          inScope(t.documentExtractions,s),
          eq(t.documentExtractions.documentId,documentId),
          eq(t.documentExtractions.status,'COMPLETE')
        ))
        .orderBy(asc(t.documentExtractions.createdAt));

      const extraction=extractions.at(-1);

      if(!extraction?.content)
        throw new AppError('CONFLICT','Document must be processed first');

      return {
        document,
        extraction
      };
    });
  }

  async existingDocumentClaims(
    token:string,
    brandId:string,
    documentId:string,
    extractionId:string,
    generatorVersion:string
  ) {
    return this.db.transaction(async tx=>{
      const s=await this.scope(tx,token,brandId,false);

      const rows=await tx
        .select()
        .from(t.documentClaims)
        .where(and(
          inScope(t.documentClaims,s),
          eq(t.documentClaims.documentId,documentId),
          eq(t.documentClaims.extractionId,extractionId)
        ))
        .orderBy(asc(t.documentClaims.createdAt));

      return rows.filter(row=>{
        const location=row.location??{};
        return location.generatorVersion===generatorVersion;
      });
    });
  }

  async persistDocumentClaims(
    token:string,
    brandId:string,
    documentId:string,
    extractionId:string,
    input:{
      provider:string;
      model:string;
      generatorVersion:string;
      claims:Array<{
        claimType:string;
        statement:string;
        location:Record<string,unknown>;
        confidence:string;
      }>;
    }
  ) {
    if(
      !input.provider ||
      !input.model ||
      !input.generatorVersion ||
      !Array.isArray(input.claims) ||
      !input.claims.length ||
      input.claims.length>15
    ) throw new AppError('INVALID','Invalid document claims');

    return this.db.transaction(async tx=>{
      const s=await this.scope(tx,token,brandId);

      const [extraction]=await tx
        .select()
        .from(t.documentExtractions)
        .where(and(
          inScope(t.documentExtractions,s),
          eq(t.documentExtractions.documentId,documentId),
          eq(t.documentExtractions.id,extractionId),
          eq(t.documentExtractions.status,'COMPLETE')
        ));

      if(!extraction)
        throw new AppError('NOT_FOUND','Document extraction unavailable');

      const previous=await tx
        .select()
        .from(t.documentClaims)
        .where(and(
          inScope(t.documentClaims,s),
          eq(t.documentClaims.documentId,documentId),
          eq(t.documentClaims.extractionId,extractionId)
        ));

      const reusable=previous.filter(row=>{
        const location=row.location??{};
        return location.generatorVersion===input.generatorVersion;
      });

      if(reusable.length){
        return {
          claims:reusable,
          reused:true
        };
      }

      const now=new Date();

      const rows=input.claims.map(claim=>({
        id:id(),
        workspaceId:s.workspaceId,
        brandId:s.brandId,
        documentId,
        extractionId,
        claimType:claim.claimType,
        statement:claim.statement,
        location:{
          ...claim.location,
          provider:input.provider,
          model:input.model,
          generatorVersion:input.generatorVersion
        },
        confidence:claim.confidence,
        reviewStatus:'CANDIDATE',
        createdAt:now
      }));

      await tx.insert(t.documentClaims).values(rows);

      await this.audit(tx,s,{
        operation:'DOCUMENT_CLAIMS_GENERATED',
        idempotencyKey:`${extractionId}:${input.generatorVersion}`,
        rationale:`AI-assisted document claims · ${input.provider} · ${input.model}`
      });

      await this.event(tx,s,'document_claims_generated');

      return {
        claims:rows,
        reused:false
      };
    });
  }

  async reviewDocumentClaim(
    token:string,
    brandId:string,
    claimId:string,
    action:'ACCEPT'|'REJECT',
    reviewedStatement?:string
  ) {
    if(!claimId.trim())
      throw new AppError('INVALID','Invalid document claim');

    if(!['ACCEPT','REJECT'].includes(action))
      throw new AppError('INVALID','Invalid document claim review action');

    const edited=reviewedStatement?.trim();

    if(reviewedStatement!==undefined&&(!edited||edited.length>16000))
      throw new AppError('INVALID','Invalid reviewed statement');

    return this.db.transaction(async tx=>{
      const s=await this.scope(tx,token,brandId);

      const [claim]=await tx
        .select()
        .from(t.documentClaims)
        .where(and(
          inScope(t.documentClaims,s),
          eq(t.documentClaims.id,claimId)
        ))
        .for('update');

      if(!claim)
        throw new AppError('NOT_FOUND','Document claim unavailable');

      /*
       * A reviewed claim is immutable. Repeating the same human action
       * returns the persisted result instead of creating duplicate context.
       */
      if(claim.reviewStatus!=='CANDIDATE'){
        const sameAction=
          (action==='ACCEPT'&&claim.reviewStatus==='ACCEPTED') ||
          (action==='REJECT'&&claim.reviewStatus==='REJECTED');

        const sameStatement=
          action==='REJECT' ||
          (claim.reviewedStatement??claim.statement)===(edited??claim.statement);

        if(sameAction&&sameStatement)
          return {
            claim,
            reused:true
          };

        throw new AppError('CONFLICT','Document claim already reviewed');
      }

      const now=new Date();
      const finalStatement=edited??claim.statement;

      if(action==='REJECT'){
        const [reviewed]=await tx
          .update(t.documentClaims)
          .set({
            reviewStatus:'REJECTED',
            reviewedStatement:null,
            reviewedBy:s.userId,
            reviewedAt:now,
            contextKind:null,
            contextEntityId:null,
            location:{
              ...(claim.location??{}),
              provenance:'USER_DOCUMENT'
            }
          })
          .where(and(
            inScope(t.documentClaims,s),
            eq(t.documentClaims.id,claim.id)
          ))
          .returning();

        await this.audit(tx,s,{
          operation:'DOCUMENT_CLAIM_REJECTED',
          idempotencyKey:`document-claim:${claim.id}:reject`,
          rationale:'Human reviewed AI-extracted document claim and did not incorporate it'
        });

        await this.event(tx,s,'document_claim_rejected');

        return {
          claim:reviewed,
          context:null,
          reused:false
        };
      }

      const contextKind=
        claim.claimType==='HYPOTHESIS'
          ?'hypothesis'
          :claim.claimType==='OPEN_QUESTION'
            ?'open-question'
            :'user-input';

      const entity=
        contextKind==='open-question'
          ?{
              text:finalStatement,
              relatedHypothesisId:null
            }
          :{
              statement:finalStatement
            };

      const contextEntity=await this.createContextEntity(
        tx,
        s,
        brandId,
        contextKind,
        entity
      );

      const [reviewed]=await tx
        .update(t.documentClaims)
        .set({
          reviewStatus:'ACCEPTED',
          reviewedStatement:finalStatement,
          reviewedBy:s.userId,
          reviewedAt:now,
          contextKind,
          contextEntityId:String(contextEntity.id),
          location:{
            ...(claim.location??{}),
            provenance:'USER_DOCUMENT',
            originalStatement:claim.statement
          }
        })
        .where(and(
          inScope(t.documentClaims,s),
          eq(t.documentClaims.id,claim.id)
        ))
        .returning();

      await this.audit(tx,s,{
        operation:
          finalStatement===claim.statement
            ?'DOCUMENT_CLAIM_ACCEPTED'
            :'DOCUMENT_CLAIM_MODIFIED_AND_ACCEPTED',
        idempotencyKey:`document-claim:${claim.id}:accept`,
        rationale:`Human-reviewed document claim incorporated as ${contextKind}`
      });

      await this.event(
        tx,
        s,
        finalStatement===claim.statement
          ?'document_claim_accepted'
          :'document_claim_modified_and_accepted'
      );

      return {
        claim:reviewed,
        context:contextEntity,
        reused:false
      };
    });
  }

  async listDocumentClaims(
    token:string,
    brandId:string
  ) {
    return this.db.transaction(async tx=>{
      const s=await this.scope(tx,token,brandId,false);

      return tx
        .select()
        .from(t.documentClaims)
        .where(inScope(t.documentClaims,s))
        .orderBy(asc(t.documentClaims.createdAt));
    });
  }

  async listSourceDocuments(token:string,brandId:string) {
    return this.db.transaction(async tx=>{
      const s=await this.scope(tx,token,brandId,false);

      const rows=await tx
        .select()
        .from(t.sourceDocuments)
        .where(inScope(t.sourceDocuments,s))
        .orderBy(asc(t.sourceDocuments.uploadedAt));

      return rows.map(row=>({
        id:row.id,
        brandId:row.brandId,
        originalName:row.originalName,
        mediaType:row.mediaType,
        bytes:row.bytes,
        sha256:row.sha256,
        status:row.status,
        uploadedBy:row.uploadedBy,
        uploadedAt:row.uploadedAt.toISOString()
      }));
    });
  }

  async createBrand(token:string,name:string,initialContext?:string) {
    if(typeof name!=='string'||!name.trim()||name.length>160) throw new AppError('INVALID','Brand name required');
    if(initialContext!==undefined&&(typeof initialContext!=='string'||initialContext.length>6000))throw new AppError('INVALID','Invalid initial context');
    return this.db.transaction(async tx=>{
      const who=await this.identity(tx,token);
      if(who.member.role!=='ADMIN'&&!who.member.canCreateBrand) throw new AppError('FORBIDDEN','Cannot create Brand');
      const [pilotWorkspace]=await tx.select().from(t.pilotWorkspaces).where(eq(t.pilotWorkspaces.workspaceId,who.workspaceId));
      const brand={id:id(),workspaceId:who.workspaceId,name:name.trim(),dataClass:pilotWorkspace?'PILOT':'DEMO'};
      await tx.insert(t.brands).values(brand);
      await tx.insert(t.assignments).values({workspaceId:who.workspaceId,brandId:brand.id,userId:who.userId});
      for(const {primaryDecision:module,primaryQuestion:text} of journey) {
        await tx.insert(t.questions).values({id:id(),workspaceId:who.workspaceId,brandId:brand.id,module,text,status:'OPEN'});
      }
      const s={workspaceId:who.workspaceId,brandId:brand.id,userId:who.userId,sessionId:who.sessionId};
      if(initialContext?.trim()) {
        const now=new Date(),payload={id:id(),brandId:brand.id,statement:initialContext.trim(),createdBy:who.userId,createdAt:now.toISOString()};validate('user-input',payload);
        await tx.insert(t.userInputs).values({id:payload.id,workspaceId:who.workspaceId,brandId:brand.id,payload,createdBy:who.userId,createdAt:now});
        await this.audit(tx,s,{operation:'CONTEXT_USER-INPUT_CAPTURED',idempotencyKey:payload.id});
      }
      await this.audit(tx,s,{operation:'BRAND_CREATED',idempotencyKey:brand.id});
      await this.event(tx,s,'brand_created');
      if(initialContext?.trim()&&pilotWorkspace)await this.event(tx,s,'meaningful_context_supplied');
      return brand;
    });
  }
  /**
   * ADR-0029 · Eliminar marca. Workspace ADMIN only, typed-name confirmation, idempotent per (workspace, actor, key).
   * One transaction with the Brand row locked FOR UPDATE: every row owned by the Brand is deleted in FK-safe order,
   * private reflections and pilot analytics are unlinked (never deleted), and a minimal brand_deletions record is kept.
   * File purge happens after commit in the transport layer (storagePrefix); the engine never touches the file system.
   */
  async deleteBrand(token:string,input:{brandId?:unknown;confirmName?:unknown;idempotencyKey?:unknown}):Promise<{deletionId:string;status:'DELETED'|'FILES_PENDING';brandId:string;storagePrefix:string|null}> {
    if(!input||typeof input!=='object'||Array.isArray(input))throw new AppError('INVALID','Invalid brand deletion');
    const {brandId,confirmName,idempotencyKey}=input;
    if(typeof brandId!=='string'||!brandId||brandId.length>200)throw new AppError('INVALID','Brand required');
    if(typeof confirmName!=='string'||!confirmName)throw new AppError('INVALID','Brand name confirmation required');
    if(typeof idempotencyKey!=='string'||!idempotencyKey.trim()||idempotencyKey.length>200)throw new AppError('INVALID','Invalid idempotency key');
    const replay=async(tx:Transaction,workspaceId:string,userId:string)=>{
      const [prior]=await tx.select().from(t.brandDeletions).where(and(eq(t.brandDeletions.workspaceId,workspaceId),eq(t.brandDeletions.actorUserId,userId),eq(t.brandDeletions.idempotencyKey,idempotencyKey)));
      if(!prior)return undefined;
      if(prior.brandId!==brandId)throw new AppError('CONFLICT','Idempotency key already used for another brand');
      return {deletionId:prior.id,status:prior.status as 'DELETED'|'FILES_PENDING',brandId:prior.brandId,storagePrefix:prior.status==='FILES_PENDING'?prior.storagePrefix:null};
    };
    try {
      return await this.db.transaction(async tx=>{
        const who=await this.identity(tx,token);
        // Replay first: the outcome is returned to the same actor in the same workspace even after the Brand is gone.
        const prior=await replay(tx,who.workspaceId,who.userId);
        if(prior)return prior;
        let s:Scope;
        try {s=await this.scope(tx,token,brandId);}
        catch(error){
          // A concurrent delete with the same key may have committed while this one waited on the row lock.
          if(error instanceof AppError&&error.code==='NOT_FOUND'){const winner=await replay(tx,who.workspaceId,who.userId);if(winner)return winner;}
          throw error;
        }
        if(who.member.role!=='ADMIN')throw new AppError('FORBIDDEN','Only a workspace administrator can delete a Brand');
        const [brand]=await tx.select().from(t.brands).where(and(eq(t.brands.workspaceId,s.workspaceId),eq(t.brands.id,s.brandId)));
        if(confirmName!==brand.name)throw new AppError('INVALID','Brand name confirmation does not match');
        const documents=await tx.select({id:t.sourceDocuments.id}).from(t.sourceDocuments).where(inScope(t.sourceDocuments,s));
        const storagePrefix=documents.length?`${s.workspaceId}/${s.brandId}`:null;
        const record={id:id(),workspaceId:s.workspaceId,brandId:s.brandId,actorUserId:s.userId,idempotencyKey,status:storagePrefix?'FILES_PENDING':'DELETED',storagePrefix,createdAt:new Date(),completedAt:storagePrefix?null:new Date()};
        // Inserted first: the history guards (migration 0015) only allow deleting versions/audit of a Brand whose
        // deletion record was written by this same transaction.
        await tx.insert(t.brandDeletions).values(record);
        const ws=s.workspaceId,b=s.brandId;
        // Private reflections belong to their authors: unlink, never delete (also inside the stored payload).
        await tx.update(t.personalReflections).set({brandId:null,decisionId:null,payload:sql`${t.personalReflections.payload} || '{"brandId":null,"decisionId":null}'::jsonb`}).where(and(eq(t.personalReflections.workspaceId,ws),eq(t.personalReflections.brandId,b)));
        // Pilot analytics carry no brand content: kept, unlinked from the deleted Brand.
        await tx.update(t.pilotEvents).set({brandId:null}).where(and(eq(t.pilotEvents.workspaceId,ws),eq(t.pilotEvents.brandId,b)));
        await tx.update(t.feedback).set({brandId:null}).where(and(eq(t.feedback.workspaceId,ws),eq(t.feedback.brandId,b)));
        // FK-safe order: children before parents. decisions.activeVersionId → versions is DEFERRABLE, so versions go
        // before decisions; the self reference of versions is satisfied because the whole chain goes in one statement.
        for(const table of [t.audits,t.telemetry,t.idempotency,t.reviewReceipts,t.reviews,t.impacts,t.dependencies,t.learningSignals,t.signals,t.learnings,t.experiments,t.analyses,t.documentClaims,t.documentExtractions,t.sourceDocuments,t.versions,t.decisions,t.recommendations,t.questions,t.userInputs,t.evidence,t.hypotheses,t.openQuestions,t.brandProfiles,t.assignments] as const)
          await tx.delete(table).where(and(eq(table.workspaceId,ws),eq(table.brandId,b)));
        await tx.delete(t.brands).where(and(eq(t.brands.workspaceId,ws),eq(t.brands.id,b)));
        return {deletionId:record.id,status:record.status as 'DELETED'|'FILES_PENDING',brandId:b,storagePrefix};
      });
    } catch(error) {
      // Lost a same-key race on the unique record: replay the winner's outcome.
      if((error as {code?:string})?.code==='23505'||(error as {cause?:{code?:string}})?.cause?.code==='23505')
        return this.db.transaction(async tx=>{const who=await this.identity(tx,token);const prior=await replay(tx,who.workspaceId,who.userId);if(!prior)throw error;return prior;});
      throw error;
    }
  }
  /** System-only (no token): deletion records whose files still need purging. Used by the transport retry. */
  async pendingBrandFilePurges() {
    return (await this.db.select({id:t.brandDeletions.id,storagePrefix:t.brandDeletions.storagePrefix}).from(t.brandDeletions).where(eq(t.brandDeletions.status,'FILES_PENDING'))).filter((r):r is {id:string;storagePrefix:string}=>!!r.storagePrefix);
  }
  /** System-only: marks a pending file purge as done. Idempotent. */
  async completeBrandFilePurge(deletionId:string) {
    await this.db.update(t.brandDeletions).set({status:'DELETED',completedAt:new Date()}).where(and(eq(t.brandDeletions.id,deletionId),eq(t.brandDeletions.status,'FILES_PENDING')));
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
    // One edge per decision pair, whatever ruleVersion created it: a newer config never duplicates an edge or its reviews.
    const edges=await tx.select().from(t.dependencies).where(inScope(t.dependencies,s));
    for(const rule of rules.rules) {
      const up=ds.find(d=>d.question.module===rule.upstream), down=ds.find(d=>d.question.module===rule.downstream);
      if(!up||!down||edges.some(e=>e.upstreamDecisionId===up.decision.id&&e.downstreamDecisionId===down.decision.id)) continue;
      await tx.insert(t.dependencies).values({id:id(),workspaceId:s.workspaceId,brandId:s.brandId,upstreamDecisionId:up.decision.id,downstreamDecisionId:down.decision.id,kind:rule.kind,reason:rule.reason,ruleVersion:rule.ruleVersion}).onConflictDoNothing();
    }
  }
  /** Outgoing edges a first upstream version may review: only rules that declare it, never the frozen v1 rules. */
  private async firstVersionEdges(tx:Transaction,s:Scope,decisionId:string) {
    const outgoing=await tx.select({dependency:t.dependencies,question:t.questions}).from(t.dependencies)
      .innerJoin(t.decisions,and(eq(t.decisions.id,t.dependencies.downstreamDecisionId),eq(t.decisions.workspaceId,t.dependencies.workspaceId),eq(t.decisions.brandId,t.dependencies.brandId)))
      .innerJoin(t.questions,and(eq(t.questions.id,t.decisions.questionId),eq(t.questions.workspaceId,t.decisions.workspaceId),eq(t.questions.brandId,t.decisions.brandId)))
      .where(and(inScope(t.dependencies,s),eq(t.dependencies.upstreamDecisionId,decisionId)));
    const [upstream]=await tx.select({module:t.questions.module}).from(t.decisions).innerJoin(t.questions,and(eq(t.questions.id,t.decisions.questionId),eq(t.questions.workspaceId,t.decisions.workspaceId),eq(t.questions.brandId,t.decisions.brandId))).where(and(inScope(t.decisions,s),eq(t.decisions.id,decisionId)));
    return outgoing.filter(row=>upstream&&reviewsOnFirstUpstreamVersion(upstream.module,row.question.module)).map(row=>row.dependency);
  }
  /**
   * Explicit human action (ADR-0021): adds the journey sections an existing Brand lacks as OPEN questions.
   * Idempotent through the (workspace, brand, module) unique key; never touches decisions, versions,
   * reviews, dependencies or impacts. Reading context never creates questions.
   */
  async addStrategicSections(token:string,brandId:string) {
    return this.db.transaction(async tx=>{
      const s=await this.scope(tx,token,brandId);
      const added:string[]=[];
      for(const {primaryDecision:module,primaryQuestion:text} of journey) {
        const rows=await tx.insert(t.questions).values({id:id(),workspaceId:s.workspaceId,brandId:s.brandId,module,text,status:'OPEN'}).onConflictDoNothing().returning({module:t.questions.module});
        added.push(...rows.map(r=>r.module));
      }
      if(added.length) await this.audit(tx,s,{operation:'STRATEGIC_SECTIONS_ADDED',idempotencyKey:`strategic-sections:${modulesVersion}:${s.brandId}`,rationale:JSON.stringify(added)});
      return {brandId,added};
    });
  }
  /**
   * Declared geography is onboarding context, never a decision (ADR-0025). Scoped by brand assignment like
   * any brand write; audited so a later change can ask for a human look at Market Arena without rewriting it.
   */
  async setBrandGeography(token:string,brandId:string,influence:GeographicInfluence,primaryMarket?:string|null) {
    if(!GEOGRAPHIC_INFLUENCE.includes(influence))throw new AppError('INVALID','Invalid geographic influence');
    if(primaryMarket!=null&&(typeof primaryMarket!=='string'||primaryMarket.length>160))throw new AppError('INVALID','Invalid primary market');
    const market=primaryMarket?.trim()||null;
    return this.db.transaction(async tx=>{
      const s=await this.scope(tx,token,brandId);
      const [before]=await tx.select().from(t.brandProfiles).where(and(eq(t.brandProfiles.workspaceId,s.workspaceId),eq(t.brandProfiles.brandId,s.brandId)));
      await tx.insert(t.brandProfiles).values({workspaceId:s.workspaceId,brandId:s.brandId,isDemo:false,geographicInfluence:influence,primaryMarket:market})
        .onConflictDoUpdate({target:[t.brandProfiles.workspaceId,t.brandProfiles.brandId],set:{geographicInfluence:influence,primaryMarket:market}});
      if(before?.geographicInfluence!==influence||(before?.primaryMarket??null)!==market)
        await this.audit(tx,s,{operation:'BRAND_CONTEXT_UPDATED',idempotencyKey:id()});
      return {brandId:s.brandId,geographicInfluence:influence,primaryMarket:market};
    });
  }
  private async contextVersion(tx:Transaction,s:Scope) {
    const decisions=await tx.select().from(t.decisions).where(inScope(t.decisions,s));
    return hash(JSON.stringify([decisions.map(d=>[d.id,d.activeVersionId,d.reviewStatus]).sort(),await this.contextEntities(tx,s)]));
  }
  private async contextEntities(tx:Transaction,s:Scope) {
    const read=async(table:typeof t.userInputs|typeof t.evidence|typeof t.hypotheses|typeof t.openQuestions|typeof t.experiments|typeof t.signals|typeof t.learnings)=> (await tx.select().from(table).where(inScope(table,s)).orderBy(asc(table.id))).map(r=>r.payload);
    return {experiments:await read(t.experiments),signals:await read(t.signals),learnings:await read(t.learnings),userInputs:await read(t.userInputs),evidence:await read(t.evidence),hypotheses:await read(t.hypotheses),openQuestions:await read(t.openQuestions)};
  }
  private async createContextEntity(
    tx:Transaction,
    s:Scope,
    brandId:string,
    kind:string,
    input:Record<string,unknown>
  ) {
    const tables={
      'user-input':t.userInputs,
      evidence:t.evidence,
      hypothesis:t.hypotheses,
      'open-question':t.openQuestions
    };

    if(
      !Object.hasOwn(tables,kind) ||
      !input ||
      Array.isArray(input) ||
      JSON.stringify(input).length>16000
    ) throw new AppError('INVALID','Invalid context entity');

    const now=new Date();

    const payload={
      ...input,
      id:id(),
      brandId,
      ...(kind==='user-input'
        ?{createdBy:s.userId,createdAt:now.toISOString()}
        :{}),
      ...(kind==='hypothesis'
        ?{status:'UNTESTED',evidenceReferences:[]}
        :{}),
      ...(kind==='open-question'
        ?{status:'OPEN'}
        :{})
    };

    validate(kind,payload);

    if(Object.values(payload).some(v=>typeof v==='string'&&!v.trim()))
      throw new AppError('INVALID','Empty context content');

    if(kind==='open-question'&&input.relatedHypothesisId){
      const [hypothesis]=await tx
        .select()
        .from(t.hypotheses)
        .where(and(
          inScope(t.hypotheses,s),
          eq(t.hypotheses.id,String(input.relatedHypothesisId))
        ));

      if(!hypothesis)
        throw new AppError('NOT_FOUND','Hypothesis not available');
    }

    await tx.insert(tables[kind as keyof typeof tables]).values({
      id:payload.id,
      workspaceId:s.workspaceId,
      brandId,
      payload,
      createdBy:s.userId,
      createdAt:now
    });

    await tx.update(t.recommendations)
      .set({resolution:'STALE'})
      .where(and(
        inScope(t.recommendations,s),
        eq(t.recommendations.resolution,'GENERATED')
      ));

    if(kind==='evidence')
      await this.event(tx,s,'evidence_added');

    if(kind==='user-input')
      await this.event(tx,s,'meaningful_context_supplied');

    return payload;
  }

  async captureContext(token:string,brandId:string,kind:string,input:Record<string,unknown>,idempotencyKey?:string) {
    if(idempotencyKey!==undefined&&(!idempotencyKey.trim()||idempotencyKey.length>200))
      throw new AppError('INVALID','Invalid idempotency key');

    const fingerprint=idempotencyKey
      ?hash(JSON.stringify([kind,input]))
      :null;

    return this.db.transaction(async tx=>{
      const s=await this.scope(tx,token,brandId);

      if(idempotencyKey&&fingerprint){
        const replayKey=and(
          inScope(t.idempotency,s),
          eq(t.idempotency.actorUserId,s.userId),
          eq(t.idempotency.command,'CAPTURE_CONTEXT'),
          eq(t.idempotency.key,idempotencyKey)
        );

        const [prior]=await tx.select().from(t.idempotency).where(replayKey);

        if(prior){
          if(prior.fingerprint!==fingerprint)
            throw new AppError('CONFLICT','Idempotency key reused with different context');

          return prior.result as Record<string,unknown>;
        }
      }

      const payload=await this.createContextEntity(
        tx,
        s,
        brandId,
        kind,
        input
      );

      await this.audit(tx,s,{
        operation:`CONTEXT_${kind.toUpperCase()}_CAPTURED`,
        idempotencyKey:idempotencyKey??String(payload.id),
        rationale:kind==='evidence'
          ?'Human source assessment recorded; not independent verification'
          :undefined
      });

      if(
        kind==='evidence'
        && String(input.provenance??'').toLowerCase().includes('entorno competitivo')
      ){
        const now=new Date();

        const capability={
          id:id(),
          userId:s.userId,
          capability:'Strategic Differentiation',
          behavior:'Evaluaste un hallazgo competitivo y decidiste incorporarlo como evidencia relevante para el contexto estratégico de la marca.',
          decisionId:null,
          occurredAt:now.toISOString()
        };

        validate('capability-event',capability);

        await tx.insert(t.capabilityEvents).values({
          id:capability.id,
          userId:s.userId,
          payload:capability
        });
      }

      if(idempotencyKey&&fingerprint){
        await tx.insert(t.idempotency).values({
          workspaceId:s.workspaceId,
          brandId,
          actorUserId:s.userId,
          command:'CAPTURE_CONTEXT',
          key:idempotencyKey,
          fingerprint,
          result:payload
        });
      }

      return payload;
    });
  }

  async rejectCompetitiveFinding(token:string,brandId:string,claim:string) {
    if(!claim.trim()||claim.length>16000)
      throw new AppError('INVALID','Invalid competitive finding');

    const fingerprint=hash(claim);
    const key=`competitive-reject:${fingerprint}`;

    return this.db.transaction(async tx=>{
      const s=await this.scope(tx,token,brandId);
      const replayKey=and(
        inScope(t.idempotency,s),
        eq(t.idempotency.actorUserId,s.userId),
        eq(t.idempotency.command,'REJECT_COMPETITIVE_FINDING'),
        eq(t.idempotency.key,key)
      );

      const [prior]=await tx.select()
        .from(t.idempotency)
        .where(replayKey);

      if(prior){
        if(prior.fingerprint!==fingerprint)
          throw new AppError('CONFLICT','Competitive finding rejection conflict');

        return prior.result as Record<string,unknown>;
      }

      const now=new Date();
      const result={claim,status:'REJECTED'};

      const capability={
        id:id(),
        userId:s.userId,
        capability:'Strategic Differentiation',
        behavior:'Evaluaste un hallazgo competitivo y decidiste no incorporarlo al contexto estratégico de la marca.',
        decisionId:null,
        occurredAt:now.toISOString()
      };

      validate('capability-event',capability);

      await tx.insert(t.capabilityEvents).values({
        id:capability.id,
        userId:s.userId,
        payload:capability
      });

      await this.audit(tx,s,{
        operation:'COMPETITIVE_FINDING_REJECTED',
        idempotencyKey:key
      });

      await tx.insert(t.idempotency).values({
        workspaceId:s.workspaceId,
        brandId,
        actorUserId:s.userId,
        command:'REJECT_COMPETITIVE_FINDING',
        key,
        fingerprint,
        result
      });

      return result;
    });
  }

  async competitiveRejections(token:string,brandId:string) {
    return this.db.transaction(async tx=>{
      const s=await this.scope(tx,token,brandId,false);

      const rows=await tx.select()
        .from(t.idempotency)
        .where(and(
          inScope(t.idempotency,s),
          eq(t.idempotency.actorUserId,s.userId),
          eq(t.idempotency.command,'REJECT_COMPETITIVE_FINDING')
        ));

      const claims=rows
        .map(row=>(row.result as Record<string,unknown>)?.claim)
        .filter((claim):claim is string=>typeof claim==='string');

      return {claims};
    });
  }


  async completeCompetitiveResearchRequest(token:string,brandId:string) {
    const prefix='Entorno competitivo — investigación pendiente:';

    return this.db.transaction(async tx=>{
      const s=await this.scope(tx,token,brandId);
      const rows=await tx.select()
        .from(t.openQuestions)
        .where(inScope(t.openQuestions,s));

      const pending=rows.filter(row=>{
        const payload=row.payload as Record<string,unknown>;
        return payload.status==='OPEN'
          && String(payload.text??'').startsWith(prefix);
      });

      if(!pending.length)return {answered:0};

      for(const row of pending){
        const current=row.payload as Record<string,unknown>;
        const next={...current,status:'ANSWERED'};

        validate('open-question',next);

        await tx.update(t.openQuestions)
          .set({payload:next})
          .where(and(
            inScope(t.openQuestions,s),
            eq(t.openQuestions.id,row.id)
          ));
      }

      await tx.update(t.recommendations)
        .set({resolution:'STALE'})
        .where(and(
          inScope(t.recommendations,s),
          eq(t.recommendations.resolution,'GENERATED')
        ));

      await this.audit(tx,s,{
        operation:'COMPETITIVE_RESEARCH_REQUEST_ANSWERED',
        idempotencyKey:`competitive-research-answered:${brandId}`
      });

      return {answered:pending.length};
    });
  }

  private async openReviews(tx:Transaction,s:Scope,decisionId:string) {
    return tx.select().from(t.reviews).where(and(inScope(t.reviews,s),eq(t.reviews.downstreamDecisionId,decisionId),ne(t.reviews.status,'COMPLETED')));
  }
  async assembleContext(token:string,brandId:string,questionId:string,budget=12000) {
    const ctx=await this.context(token,brandId),question=ctx.questions.find(q=>q.id===questionId);
    if(!question) throw new AppError('NOT_FOUND','Question not available');
    const requiredEvidence=new Set(ctx.hypotheses.flatMap(h=>h.evidenceReferences as string[]));
    return assemble(ctx.contextVersion,question,ctx.dependencies,ctx.reviews,[
      ...ctx.decisions.map(d=>({id:d.id,type:'Decision',critical:true,data:{...d,version:ctx.versions.find(v=>v.id===d.activeVersionId)},trust:'HUMAN_APPROVED'})),
      ...ctx.evidence.map(e=>({id:String(e.id),type:'Evidence',critical:requiredEvidence.has(String(e.id)),data:e,trust:e.external?'UNTRUSTED_EXTERNAL':'HUMAN_RECORDED'})),
      ...ctx.learnings.filter(e=>e.status==='ACCEPTED').map(e=>({id:String(e.id),type:'Learning',critical:true,data:e,trust:'HUMAN_ACCEPTED'})),
      ...ctx.userInputs.map(e=>({id:String(e.id),type:'UserInput',critical:false,data:e,trust:'USER_STATEMENT'})),
      ...ctx.hypotheses.filter(e=>e.status!=='REJECTED').map(e=>({id:String(e.id),type:'Hypothesis',critical:false,data:e,trust:e.status==='SUPPORTED'?'HUMAN_REVIEWED':'UNVALIDATED'})),
      ...ctx.openQuestions.filter(e=>e.status==='OPEN').map(e=>({id:String(e.id),type:'OpenQuestion',critical:false,data:e,trust:'OPEN'})),
      ...ctx.versions.filter(v=>v.versionStatus==='SUPERSEDED'&&ctx.decisions.some(d=>d.id===v.decisionId&&d.questionId===questionId)).map(v=>({id:v.id,type:'DecisionHistory',critical:false,data:v,trust:'HISTORICAL_NOT_CURRENT'}))
    ],budget);
  }
  /** Read projection; never invokes analyze(), commitDecision() or context capture. */
  async askBrando(token:string,brandId:string,message:string,questionId:string|null,history:{question:string;answer:string}[]=[],interpretation?:{signalIds:string[];hypothesisId?:string|null;experimentId?:string|null}) {
    if(interpretation!==undefined&&(!interpretation||typeof interpretation!=='object'||!Array.isArray(interpretation.signalIds)||!interpretation.signalIds.length||interpretation.signalIds.length>20||interpretation.signalIds.some(x=>typeof x!=='string')||(interpretation.hypothesisId!=null&&typeof interpretation.hypothesisId!=='string')||(interpretation.experimentId!=null&&typeof interpretation.experimentId!=='string')))throw new AppError('INVALID','Invalid interpretation scope');
    if(typeof message!=='string'||!message.trim()||message.length>2000||!Array.isArray(history)||history.length>4||history.some(h=>!h||typeof h.question!=='string'||h.question.length>2000||typeof h.answer!=='string'||h.answer.length>8000))throw new AppError('INVALID','Invalid Brando query');
    const snapshot=async()=>{
      const c=await this.context(token,brandId);
      const brands=await this.listBrands(token),brand=brands.find(b=>b.id===brandId);
      if(!brand)throw new AppError('NOT_FOUND','Brand not available');
      // Hash every selected source, including review and history changes, not only active versions.
      const fingerprint=hash(JSON.stringify([brand.name,c.brandoContextVersion]));
      return {c,brand,fingerprint};
    };
    const before=await snapshot();
    // ADR-0026: an interpretation request names signals, hypothesis and experiment of this brand only.
    if(interpretation){
      const signals=interpretation.signalIds.map(id=>before.c.signals.find(x=>x.id===id));
      if(signals.some(x=>!x)||(interpretation.hypothesisId&&!before.c.hypotheses.some(h=>h.id===interpretation.hypothesisId))||(interpretation.experimentId&&(!before.c.experiments.some(e=>e.id===interpretation.experimentId)||signals.some(x=>x!.experimentId!==interpretation.experimentId))))throw new AppError('NOT_FOUND','Interpretation sources unavailable');
    }
    const packet=brandoPacket(before.c,before.brand,before.fingerprint,message.trim(),questionId,history);
    const actor=await this.me(token);
    // Operational request only: separate name so pilot recommendation metrics stay unchanged.
    await this.db.transaction(async tx=>{const s=await this.scope(tx,token,brandId);await this.event(tx,s,'brando_requested');});
    const response=await this.gateway.invoke({task:'BRANDO_CONTEXTUAL',module:'Brando B1',promptVersion:'brando-contextual-v6',contextVersion:packet.contextVersion,input:packet,outputSchema:'brando-answer-v2',budget:{maxCharacters:30000,timeoutMs:this.gateway.timeoutMs},tenantScope:{workspaceId:actor.workspaceId,brandId},questionId:questionId??''});
    const after=await snapshot(); // Re-authorize after provider latency, before returning any content.
    if(after.fingerprint!==before.fingerprint)throw new AppError('CONFLICT','Brando context changed');
    const answer=response.result;
    const error=response.error??(answer&&!validBrandoReferences(answer,packet)?'INVALID_OUTPUT':null);
    const refs=answer&&!error?[...new Set(answer.facts.flatMap(f=>f.referenceIds))]:[];
    const suggestionActions=answer&&!error?brandoSuggestionActions(answer,questionId):[];
    const suggestionTickets=answer&&!error?answer.suggestions.map((suggestion,index)=>({...suggestionActions[index],...this.brandoSuggestions.issue({...suggestionActions[index],workspaceId:actor.workspaceId,userId:actor.userId,brandId,questionId,sourceVersion:before.fingerprint,contextVersion:before.c.contextVersion,suggestion,capability:learningMoments[before.c.questions.find(q=>q.id===questionId)?.module??'']?.capability??'Problem Framing'})})):[];
    const assistanceProof=interpretation&&answer&&!error?this.brandoAssistance.issue({workspaceId:actor.workspaceId,userId:actor.userId,brandId,signalIds:[...new Set(interpretation.signalIds)],hypothesisId:interpretation.hypothesisId??null,experimentId:interpretation.experimentId??null,sourceVersion:validationFingerprint(before.c,[...new Set(interpretation.signalIds)],interpretation.hypothesisId??null,interpretation.experimentId??null)}):null;
    return {answer:error?null:answer,suggestionTickets,assistanceProof,error,provider:response.provider,contextVersion:before.c.contextVersion,sourceContextVersion:before.c.brandoContextVersion,sourceVersion:before.fingerprint,brandId,questionId,attention:attentionFor(before.c),omitted:packet.omitted,sources:packet.items.filter(i=>refs.includes(i.id)),trace:{traceId:response.traceId,model:response.model,latencyMs:response.latencyMs,tokenIn:response.tokenIn,tokenOut:response.tokenOut,cost:response.cost}};
  }
  /** Human rejection reflection only; acceptance/modification goes through commitDecision. */
  async reviewBrandoSuggestion(token:string,brandId:string,input:{ticketId:string;action:'ACCEPT'|'MODIFY'|'REJECT';rationale:string;revisedText:string|null}) {
    validate('brando-suggestion-review',input);
    if(input.rationale.trim().length<10)throw new AppError('INVALID','Explain your criterion in at least ten characters');
    return this.db.transaction(async tx=>{
      const s=await this.scope(tx,token,brandId);
      if(input.action!=='REJECT'||input.revisedText!==null)throw new AppError('INVALID','Acceptance or modification requires the human decision commit workflow');
      const fingerprint=hash(JSON.stringify(input));
      const replayKey=and(inScope(t.idempotency,s),eq(t.idempotency.actorUserId,s.userId),eq(t.idempotency.command,'REVIEW_BRANDO_SUGGESTION'),eq(t.idempotency.key,input.ticketId));
      const [prior]=await tx.select().from(t.idempotency).where(replayKey);
      if(prior){if(prior.fingerprint!==fingerprint)throw new AppError('CONFLICT','Suggestion already reviewed differently');return prior.result;}
      const ticket=this.brandoSuggestions.read(input.ticketId,s);
      const current=await this.contextProjection(tx,s);
      const [brand]=await tx.select().from(t.brands).where(and(eq(t.brands.workspaceId,s.workspaceId),eq(t.brands.id,s.brandId)));
      if(hash(JSON.stringify([brand.name,current.brandoContextVersion]))!==ticket.sourceVersion)throw new AppError('CONFLICT','Suggestion context changed; request a fresh answer');
      const wording={REJECT:'Rechazaste una sugerencia'};
      const text=ticket.suggestion;
      const capability={id:id(),userId:s.userId,capability:ticket.capability,behavior:`${wording[input.action]} de Brando. Tu criterio: ${input.rationale.trim()}. Sugerencia evaluada: ${text}`,decisionId:null,occurredAt:new Date().toISOString()};
      validate('capability-event',capability);
      await tx.insert(t.capabilityEvents).values({id:capability.id,userId:s.userId,payload:capability});
      await this.audit(tx,s,{operation:'BRANDO_SUGGESTION_REVIEWED',idempotencyKey:input.ticketId,rationale:JSON.stringify({action:input.action,original:ticket.suggestion,text,rationale:input.rationale.trim(),sourceVersion:ticket.sourceVersion,questionId:ticket.questionId})});
      await this.event(tx,s,'brando_suggestion_reviewed');
      const result={action:input.action,practiceEventId:capability.id,strategyChanged:false};
      await tx.insert(t.idempotency).values({workspaceId:s.workspaceId,brandId:s.brandId,actorUserId:s.userId,command:'REVIEW_BRANDO_SUGGESTION',key:input.ticketId,fingerprint,result});
      return result;
    });
  }
  async analyze(token:string,brandId:string,questionId:string) {
    const actor=await this.me(token),packet=await this.assembleContext(token,brandId,questionId),question=packet.question as {module:string};
    const response=await this.gateway.invoke({task:'STRATEGIC_ANALYSIS',module:question.module,promptVersion:this.gateway.promptVersion,contextVersion:packet.contextVersion,input:packet,outputSchema:'recommendation',budget:{maxCharacters:20000,timeoutMs:this.gateway.timeoutMs},tenantScope:{workspaceId:actor.workspaceId,brandId},questionId});
    const {result,...trace}=response;
    return this.db.transaction(async tx=>{
      const s=await this.scope(tx,token,brandId);
      if(await this.contextVersion(tx,s)!==packet.contextVersion) throw new AppError('CONFLICT','Context changed during analysis');
      const evaluation=result?evaluate(result,packet):null;
      const invalid=!result||result.brandId!==brandId||result.questionId!==questionId||result.contextVersion!==packet.contextVersion||evaluation?.issues.some(i=>i.severity==='CONFLICT');
      await this.event(tx,s,'recommendation_requested');
      if(invalid) {
        await this.event(tx,s,'analysis_failed','SYSTEM');
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
  async createLearningObject(token:string,brandId:string,kind:string,input:Record<string,unknown>,decisionId?:string,plan?:{objective:string;successCriteria:string},idempotencyKey?:string) {
    if(!['experiment','signal','learning'].includes(kind)||!input||Array.isArray(input)||JSON.stringify(input).length>16000)throw new AppError('INVALID','Invalid learning object');
    if(plan&&[plan.objective,plan.successCriteria].some(v=>typeof v!=='string'||!v.trim()||v.length>4000))throw new AppError('INVALID','Experiment plan required');
    if(idempotencyKey!==undefined&&(typeof idempotencyKey!=='string'||!idempotencyKey.trim()||idempotencyKey.length>200))throw new AppError('INVALID','Invalid idempotency key');
    // Provenance is decided by the server (ADR-0026): only a valid assistance proof can mark a learning BRANDO_ASSISTED.
    const proofId=kind==='learning'&&typeof input.assistanceProof==='string'?input.assistanceProof:null;
    if(kind==='learning'){const {origin:_o,brandoAssisted:_b,assistanceProof:_p,...rest}=input;input=rest;}
    return this.db.transaction(async tx=>{
      const s=await this.scope(tx,token,brandId),now=new Date(),objectId=id();
      const command=`CREATE_${kind.toUpperCase()}`,fingerprint=hash(JSON.stringify([input,proofId,decisionId??null,plan??null]));
      let consumeProof=false;
      if(kind==='learning'){
        const proof=proofId?this.brandoAssistance.read(proofId,s):null;
        const signalIds=Array.isArray(input.signalIds)?input.signalIds.map(String):[];
        const [used]=proofId?await tx.select().from(t.idempotency).where(and(inScope(t.idempotency,s),eq(t.idempotency.actorUserId,s.userId),eq(t.idempotency.command,'BRANDO_ASSISTANCE_PROOF'),eq(t.idempotency.key,proofId))):[];
        const matches=!!proof&&!used&&signalIds.length>0&&signalIds.every(x=>proof.signalIds.includes(x))
          &&(input.hypothesisId===undefined?null:String(input.hypothesisId))===proof.hypothesisId
          &&proof.sourceVersion===validationFingerprint(await this.contextProjection(tx,s),proof.signalIds,proof.hypothesisId,proof.experimentId);
        consumeProof=matches;
        input={...input,origin:matches?'BRANDO_ASSISTED':'MANUAL'};
      }
      if(idempotencyKey){
        const [prior]=await tx.select().from(t.idempotency).where(and(inScope(t.idempotency,s),eq(t.idempotency.actorUserId,s.userId),eq(t.idempotency.command,command),eq(t.idempotency.key,idempotencyKey)));
        if(prior){if(prior.fingerprint!==fingerprint)throw new AppError('CONFLICT','Idempotency key reused with different content');return prior.result as Record<string,unknown>;}
      }
      const payload:Record<string,unknown>={...input,id:objectId,brandId,...(kind==='experiment'?{ownerUserId:s.userId,status:'PLANNED'}:kind==='learning'?{status:'CANDIDATE',reviewedBy:null}:{capturedAt:now.toISOString()})};validate(kind,payload);
      if(Object.values(payload).some(v=>typeof v==='string'&&!v.trim()))throw new AppError('INVALID','Empty content');
      const base={id:objectId,workspaceId:s.workspaceId,brandId,payload,createdBy:s.userId,createdAt:now};
      if(kind==='experiment') {
        const [hypothesis]=await tx.select().from(t.hypotheses).where(and(inScope(t.hypotheses,s),eq(t.hypotheses.id,String(payload.hypothesisId))));
        const [decision]=await tx.select().from(t.decisions).where(and(inScope(t.decisions,s),eq(t.decisions.id,decisionId??'')));
        if(!hypothesis||!decision?.activeVersionId)throw new AppError('NOT_FOUND','Hypothesis or decision unavailable');
        await tx.insert(t.experiments).values({...base,hypothesisId:hypothesis.id,decisionId:decision.id,objective:plan?.objective.trim()??String(hypothesis.payload.statement),successCriteria:plan?.successCriteria.trim()??String(payload.intendedSignal)});
      } else if(kind==='signal') {
        const [experiment]=await tx.select().from(t.experiments).where(and(inScope(t.experiments,s),eq(t.experiments.id,String(payload.experimentId))));
        if(!experiment)throw new AppError('NOT_FOUND','Experiment unavailable');
        if(experiment.payload.status!=='RUNNING')throw new AppError('CONFLICT','Start the experiment before recording signals');
        if(new Date(String(payload.observedAt))>now)throw new AppError('INVALID','Observation cannot be in the future');
        await tx.insert(t.signals).values({...base,experimentId:experiment.id});
      } else {
        const signalIds=payload.signalIds as string[];
        if(new Set(signalIds).size!==signalIds.length)throw new AppError('INVALID','Duplicate signals');
        if(payload.hypothesisId!==undefined){const [hypothesis]=await tx.select().from(t.hypotheses).where(and(inScope(t.hypotheses,s),eq(t.hypotheses.id,String(payload.hypothesisId))));if(!hypothesis)throw new AppError('NOT_FOUND','Hypothesis unavailable');}
        for(const signalId of signalIds) {const [signal]=await tx.select().from(t.signals).where(and(inScope(t.signals,s),eq(t.signals.id,signalId)));if(!signal)throw new AppError('NOT_FOUND','Signal unavailable');}
        await tx.insert(t.learnings).values(base);
        await tx.insert(t.learningSignals).values(signalIds.map(signalId=>({workspaceId:s.workspaceId,brandId,learningId:objectId,signalId})));
      }
      await tx.update(t.recommendations).set({resolution:'STALE'}).where(and(inScope(t.recommendations,s),eq(t.recommendations.resolution,'GENERATED')));
      await this.audit(tx,s,{operation:`${kind.toUpperCase()}_CREATED`,idempotencyKey:objectId,decisionId:kind==='experiment'?decisionId:undefined});
      await this.event(tx,s,kind==='signal'?'signal_added':kind==='learning'?'learning_candidate_created':'experiment_created');
      if(kind==='experiment')await this.event(tx,s,'experiment_planned');
      // ADR-0026: descriptive practice, never mastery or a score.
      if(kind==='experiment'||kind==='signal')await this.practiceEvent(tx,s,kind==='experiment'?'Diseñaste un experimento y definiste qué señal observar para poner a prueba una hipótesis.':'Registraste una observación con su fuente, separada de su interpretación.');
      if(consumeProof)await tx.insert(t.idempotency).values({workspaceId:s.workspaceId,brandId:s.brandId,actorUserId:s.userId,command:'BRANDO_ASSISTANCE_PROOF',key:proofId!,fingerprint:hash(objectId),result:{learningId:objectId}});
      if(idempotencyKey)await tx.insert(t.idempotency).values({workspaceId:s.workspaceId,brandId:s.brandId,actorUserId:s.userId,command,key:idempotencyKey,fingerprint,result:payload});
      return payload;
    });
  }
  async transitionLearningObject(token:string,brandId:string,kind:string,objectId:string,expectedStatus:string,status:string,rationale?:string) {
    if(!['experiment','learning'].includes(kind))throw new AppError('INVALID','Invalid transition type');
    if(rationale!==undefined&&(typeof rationale!=='string'||rationale.length>2000))throw new AppError('INVALID','Invalid rationale');
    const why=rationale?.trim()||null;
    if(kind==='learning'&&status==='REJECTED'&&!why)throw new AppError('INVALID','Explain why this learning is rejected');
    return this.db.transaction(async tx=>{
      const s=await this.scope(tx,token,brandId),table=kind==='experiment'?t.experiments:t.learnings;
      const [row]=await tx.select().from(table).where(and(inScope(table,s),eq(table.id,objectId)));
      if(!row)throw new AppError('NOT_FOUND','Object unavailable');
      // Exact replay of the same actor's acceptance is harmless; never duplicate audit/events.
      if(kind==='learning'&&status==='ACCEPTED'&&expectedStatus==='REVIEWED'&&row.payload.status==='ACCEPTED'&&row.payload.reviewedBy===s.userId)return row.payload;
      if(row.payload.status!==expectedStatus)throw new AppError('CONFLICT','State changed; reload');
      const paths:Record<string,string[]>=kind==='experiment'?{PLANNED:['RUNNING','CANCELLED'],RUNNING:['COMPLETED','INCONCLUSIVE','CANCELLED']}:{CANDIDATE:['REVIEWED'],REVIEWED:['ACCEPTED','REJECTED']};
      if(!paths[expectedStatus]?.includes(status))throw new AppError('CONFLICT','Invalid human transition');
      if(kind==='experiment'&&status==='COMPLETED') {const signals=await tx.select().from(t.signals).where(and(inScope(t.signals,s),eq(t.signals.experimentId,objectId)));if(!signals.length)throw new AppError('CONFLICT','No signal; choose inconclusive');}
      const payload={...row.payload,status,...(kind==='learning'?{reviewedBy:s.userId}:{})};validate(kind,payload);
      if(kind==='experiment')await tx.update(t.experiments).set({payload,...(status==='RUNNING'?{startedAt:new Date()}:{completedAt:new Date()})}).where(and(inScope(t.experiments,s),eq(t.experiments.id,objectId)));
      else await tx.update(t.learnings).set({payload}).where(and(inScope(t.learnings,s),eq(t.learnings.id,objectId)));
      await tx.update(t.recommendations).set({resolution:'STALE'}).where(and(inScope(t.recommendations,s),eq(t.recommendations.resolution,'GENERATED')));
      if(kind==='learning'&&status==='ACCEPTED'){await this.event(tx,s,'learning_created');await this.event(tx,s,'learning_accepted');}
      if(kind==='learning'&&status==='REVIEWED')await this.event(tx,s,'learning_reviewed');
      if(kind==='learning'&&status==='REJECTED')await this.event(tx,s,'learning_rejected');
      if(kind==='experiment'&&status==='RUNNING'){
        // The hypothesis is never moved automatically (ADR-0024/0026): the person marks it TESTING explicitly.
        await this.event(tx,s,'experiment_started');
      }
      if(kind==='learning'&&(status==='ACCEPTED'||status==='REJECTED'))await this.practiceEvent(tx,s,status==='ACCEPTED'?'Revisaste una interpretación de señales y la aceptaste como aprendizaje.':'Revisaste una interpretación de señales y la descartaste con tu criterio.');
      if(kind==='experiment'&&status==='INCONCLUSIVE')await this.practiceEvent(tx,s,'Cerraste un experimento como no concluyente en lugar de forzar un resultado.');
      await this.audit(tx,s,{operation:`${kind.toUpperCase()}_${status}`,idempotencyKey:id(),rationale:why?`${objectId}: ${expectedStatus} -> ${status} · ${why}`:`${objectId}: ${expectedStatus} -> ${status}`});return payload;
    });
  }
  /** Human edit of a learning that is not yet accepted or rejected. Accepted learnings are historical record. */
  async reviseLearning(token:string,brandId:string,learningId:string,expectedStatus:string,changes:Record<string,unknown>,expected:Record<string,unknown>) {
    const editable=['interpretation','limitations','supports','doesNotSupport','alternativeExplanations','hypothesisId'];
    if(!changes||typeof changes!=='object'||Array.isArray(changes)||!Object.keys(changes).length||Object.keys(changes).some(k=>!editable.includes(k))||JSON.stringify(changes).length>16000)throw new AppError('INVALID','Invalid learning revision');
    // The person states what they saw for every field they change; a concurrent edit returns 409 instead of being overwritten.
    if(!expected||typeof expected!=='object'||Array.isArray(expected)||Object.keys(changes).some(k=>!(k in expected))||JSON.stringify(expected).length>16000)throw new AppError('INVALID','Expected values required');
    if(!['CANDIDATE','REVIEWED'].includes(expectedStatus))throw new AppError('CONFLICT','Only pending learnings can be edited');
    return this.db.transaction(async tx=>{
      const s=await this.scope(tx,token,brandId);
      const [row]=await tx.select().from(t.learnings).where(and(inScope(t.learnings,s),eq(t.learnings.id,learningId)));
      if(!row)throw new AppError('NOT_FOUND','Object unavailable');
      if(row.payload.status!==expectedStatus)throw new AppError('CONFLICT','State changed; reload');
      if(Object.keys(changes).some(k=>JSON.stringify(row.payload[k]??null)!==JSON.stringify(expected[k]??null)))throw new AppError('CONFLICT','Learning changed; reload');
      if(changes.hypothesisId!==undefined){const [hypothesis]=await tx.select().from(t.hypotheses).where(and(inScope(t.hypotheses,s),eq(t.hypotheses.id,String(changes.hypothesisId))));if(!hypothesis)throw new AppError('NOT_FOUND','Hypothesis unavailable');}
      // Editing reopens the human review (nobody accepts text they did not review); changing the hypothesis of an
      // assisted interpretation leaves the scope Brando was asked about, so its provenance becomes MANUAL.
      const rescoped=changes.hypothesisId!==undefined&&changes.hypothesisId!==row.payload.hypothesisId&&row.payload.origin==='BRANDO_ASSISTED';
      const payload={...row.payload,...changes,status:'CANDIDATE',reviewedBy:null,...(rescoped?{origin:'MANUAL'}:{})};validate('learning',payload);
      if(Object.values(payload).some(v=>typeof v==='string'&&!v.trim()))throw new AppError('INVALID','Empty content');
      await tx.update(t.learnings).set({payload}).where(and(inScope(t.learnings,s),eq(t.learnings.id,learningId)));
      await this.audit(tx,s,{operation:'LEARNING_REVISED',idempotencyKey:id(),rationale:`${learningId}: ${Object.keys(changes).sort().join(',')}`});
      return payload;
    });
  }
  /**
   * Human review of a Hypothesis (ADR-0026). Never automatic: SUPPORTED / WEAKENED / REJECTED require the
   * person's rationale and an ACCEPTED learning about this hypothesis. Decisions that rely on it are reported,
   * never rewritten (no automatic cascade; Strategic Intelligence raises the attention).
   */
  async reviewHypothesis(token:string,brandId:string,input:{hypothesisId:string;expectedStatus:string;status:string;rationale:string;learningId?:string|null;idempotencyKey:string}) {
    if(!input||typeof input!=='object'||[input.hypothesisId,input.expectedStatus,input.status,input.rationale,input.idempotencyKey].some(v=>typeof v!=='string')||input.rationale.length>2000||input.idempotencyKey.length>200||!input.idempotencyKey.trim())throw new AppError('INVALID','Invalid hypothesis review');
    if(!input.rationale.trim())throw new AppError('INVALID','Explain your review');
    if(input.learningId!=null&&(typeof input.learningId!=='string'||input.learningId.length>200||input.status==='TESTING'))throw new AppError('INVALID','Invalid learning');
    if(input.hypothesisId.length>200)throw new AppError('INVALID','Invalid hypothesis');
    const to=input.status as HypothesisStatus,resolved=RESOLVED_STATUSES.includes(to);
    if(resolved&&!input.learningId)throw new AppError('INVALID','An accepted learning is required');
    return this.db.transaction(async tx=>{
      const s=await this.scope(tx,token,brandId);
      const fingerprint=hash(JSON.stringify([input.hypothesisId,input.expectedStatus,input.status,input.rationale.trim(),input.learningId??null]));
      const [prior]=await tx.select().from(t.idempotency).where(and(inScope(t.idempotency,s),eq(t.idempotency.actorUserId,s.userId),eq(t.idempotency.command,'REVIEW_HYPOTHESIS'),eq(t.idempotency.key,input.idempotencyKey)));
      if(prior){if(prior.fingerprint!==fingerprint)throw new AppError('CONFLICT','Hypothesis already reviewed differently');return prior.result as Record<string,unknown>;}
      const [row]=await tx.select().from(t.hypotheses).where(and(inScope(t.hypotheses,s),eq(t.hypotheses.id,input.hypothesisId)));
      if(!row)throw new AppError('NOT_FOUND','Hypothesis unavailable');
      if(row.payload.status!==input.expectedStatus)throw new AppError('CONFLICT','State changed; reload');
      if(!HYPOTHESIS_TRANSITIONS[input.expectedStatus as HypothesisStatus]?.includes(to))throw new AppError('CONFLICT','Invalid human transition');
      if(resolved){
        const [learning]=await tx.select().from(t.learnings).where(and(inScope(t.learnings,s),eq(t.learnings.id,String(input.learningId))));
        if(!learning||learning.payload.status!=='ACCEPTED')throw new AppError('CONFLICT','Learning must be accepted first');
        const experiments=(await tx.select().from(t.experiments).where(and(inScope(t.experiments,s),eq(t.experiments.hypothesisId,row.id)))).map(e=>e.id);
        const signals=(await tx.select().from(t.signals).where(inScope(t.signals,s))).filter(x=>experiments.includes(x.experimentId)).map(x=>x.id);
        const linked=learning.payload.hypothesisId===row.id||(learning.payload.signalIds as string[]).some(x=>signals.includes(x));
        if(!linked)throw new AppError('CONFLICT','Learning is not about this hypothesis');
        // A new validation cycle needs new learning: one accepted after the latest move to TESTING.
        const audit=await tx.select().from(t.audits).where(inScope(t.audits,s));
        const cycle=validationCycleStart(audit,row.id);
        if(cycle&&learningAcceptedAt(audit,learning.id)<=cycle)throw new AppError('CONFLICT','Learning belongs to a previous validation cycle');
      }
      const payload={...row.payload,status:to};validate('hypothesis',payload);
      await tx.update(t.hypotheses).set({payload}).where(and(inScope(t.hypotheses,s),eq(t.hypotheses.id,row.id)));
      await tx.update(t.recommendations).set({resolution:'STALE'}).where(and(inScope(t.recommendations,s),eq(t.recommendations.resolution,'GENERATED')));
      await this.audit(tx,s,{operation:`HYPOTHESIS_${to}`,idempotencyKey:input.idempotencyKey,rationale:JSON.stringify({hypothesisId:row.id,from:input.expectedStatus,to,learningId:input.learningId??null,rationale:input.rationale.trim()})});
      await this.practiceEvent(tx,s,to==='TESTING'?'Pusiste una hipótesis a prueba de forma explícita.':`Revisaste una hipótesis con aprendizaje aceptado y la marcaste como ${({SUPPORTED:'respaldada',WEAKENED:'debilitada',REJECTED:'rechazada'} as Record<string,string>)[to]}.`);
      await this.event(tx,s,'hypothesis_reviewed');
      const projection=await this.contextProjection(tx,s);
      const view=projection.validation.hypotheses.find(h=>h.id===row.id);
      const affected=[...(view?.inUseBy??[]),...(view?.testedBy??[])].filter((x,i,all)=>all.findIndex(y=>y.decisionId===x.decisionId)===i);
      const result={hypothesis:payload,affectedDecisions:to==='WEAKENED'||to==='REJECTED'?affected:[],strategyChanged:false};
      await tx.insert(t.idempotency).values({workspaceId:s.workspaceId,brandId:s.brandId,actorUserId:s.userId,command:'REVIEW_HYPOTHESIS',key:input.idempotencyKey,fingerprint,result});
      return result;
    });
  }
  private async practiceEvent(tx:Transaction,s:Scope,behavior:string) {
    const capability={id:id(),userId:s.userId,capability:'Experimentation & Learning',behavior,decisionId:null,occurredAt:new Date().toISOString()};
    validate('capability-event',capability);
    await tx.insert(t.capabilityEvents).values({id:capability.id,userId:s.userId,payload:capability});
  }
  /**
   * ADR-0027 · a private reflection of the signed-in person. Only the author can read it; an optional link to a
   * brand (and decision) must be one they may already open. It never writes Brand Context, never resolves a
   * review, never changes a hypothesis or learning and is never part of a Brando packet.
   */
  async createReflection(token:string,input:{changedThinking?:unknown;learnedFromDecision?:unknown;doDifferently?:unknown;brandId?:unknown;decisionId?:unknown;idempotencyKey?:unknown}) {
    if(!input||typeof input!=='object'||Array.isArray(input))throw new AppError('INVALID','Invalid reflection');
    const fields=['changedThinking','learnedFromDecision','doDifferently'] as const;
    const text:Record<string,string>={};
    for(const f of fields){const v=input[f];if(v===undefined||v===null||v==='')continue;if(typeof v!=='string'||v.length>2000)throw new AppError('INVALID','Invalid reflection');if(v.trim())text[f]=v.trim();}
    if(!Object.keys(text).length)throw new AppError('INVALID','Write at least one reflection');
    if(typeof input.idempotencyKey!=='string'||!input.idempotencyKey.trim()||input.idempotencyKey.length>200)throw new AppError('INVALID','Invalid idempotency key');
    if(input.brandId!=null&&(typeof input.brandId!=='string'||input.brandId.length>200))throw new AppError('INVALID','Invalid brand');
    if(input.decisionId!=null&&(typeof input.decisionId!=='string'||input.decisionId.length>200||input.brandId==null))throw new AppError('INVALID','Invalid decision');
    return this.db.transaction(async tx=>{
      const who=await this.identity(tx,token);
      const key=input.idempotencyKey as string,brandId=(input.brandId as string|null|undefined)??null,decisionId=(input.decisionId as string|null|undefined)??null;
      const [prior]=await tx.select().from(t.personalReflections).where(and(eq(t.personalReflections.userId,who.userId),eq(t.personalReflections.idempotencyKey,key)));
      if(prior){
        const same=JSON.stringify([prior.brandId,prior.decisionId,...fields.map(f=>prior.payload[f]??null)])===JSON.stringify([brandId,decisionId,...fields.map(f=>text[f]??null)]);
        if(!same)throw new AppError('CONFLICT','Reflection already saved with different content');
        return prior.payload;
      }
      if(brandId){
        const s=await this.scope(tx,token,brandId,false);
        if(decisionId){const [decision]=await tx.select().from(t.decisions).where(and(inScope(t.decisions,s),eq(t.decisions.id,decisionId)));if(!decision)throw new AppError('NOT_FOUND','Decision unavailable');}
      }
      const now=new Date(),payload={id:id(),brandId,decisionId,...text,createdAt:now.toISOString()};
      validate('personal-reflection',payload);
      // A concurrent double submit with the same key never errors: the first insert wins, the second replays it.
      const inserted=await tx.insert(t.personalReflections).values({id:payload.id,userId:who.userId,workspaceId:who.workspaceId,brandId,decisionId,idempotencyKey:key,payload,createdAt:now}).onConflictDoNothing().returning({id:t.personalReflections.id});
      if(!inserted.length){const [winner]=await tx.select().from(t.personalReflections).where(and(eq(t.personalReflections.userId,who.userId),eq(t.personalReflections.idempotencyKey,key)));return winner.payload;}
      return payload;
    });
  }
  /** The author's own reflections, newest first. Never another person's, never another workspace's. */
  async reflections(token:string) {
    return this.db.transaction(async tx=>{
      const who=await this.identity(tx,token);
      return (await tx.select().from(t.personalReflections).where(and(eq(t.personalReflections.userId,who.userId),eq(t.personalReflections.workspaceId,who.workspaceId))).orderBy(desc(t.personalReflections.createdAt))).map(r=>r.payload);
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
  /**
   * Records that the participant took their Mapa estratégico away as a document. The export reuses
   * blueprint(), so without its own event a download is indistinguishable from a view. Authorization is
   * scope() as everywhere else, so this can only ever record a brand the caller may already read.
   */
  async blueprintExported(token:string,brandId:string) {
    await this.db.transaction(async tx=>{const s=await this.scope(tx,token,brandId,false);await this.event(tx,s,'blueprint_pdf_exported');});
  }
  /** ADR-0028: the Brand Book download, distinct from the Mapa estratégico one. Telemetry only; no strategic write. */
  async brandBookExported(token:string,brandId:string) {
    await this.db.transaction(async tx=>{const s=await this.scope(tx,token,brandId,false);await this.event(tx,s,'brandbook_pdf_exported');});
  }
  /**
   * Records that the participant opened the evidence and hypotheses panel for a decision. This is the
   * numerator of the canonical Evidence Engagement rate; supplying evidence (evidence_added) is a
   * different and later act, so it cannot stand in for opening it.
   */
  async evidenceOpened(token:string,brandId:string) {
    await this.db.transaction(async tx=>{const s=await this.scope(tx,token,brandId,false);await this.event(tx,s,'evidence_panel_opened');});
  }
  /**
   * Identity of a brand the caller may read: name, demo classification and declared geography.
   *
   * Authorization is scope() itself, unchanged — the brand must belong to the caller's workspace and,
   * unless they are a workspace ADMIN, be assigned to them. Cross-tenant reads are impossible because
   * workspaceId is part of the lookup, not a filter applied afterwards.
   */
  async brandDossier(token:string,brandId:string) {
    return this.db.transaction(async tx=>{
      const s=await this.scope(tx,token,brandId,false);
      const [brand]=await tx.select().from(t.brands).where(and(eq(t.brands.workspaceId,s.workspaceId),eq(t.brands.id,brandId)));
      const [profile]=await tx.select().from(t.brandProfiles).where(and(eq(t.brandProfiles.workspaceId,s.workspaceId),eq(t.brandProfiles.brandId,brandId)));
      return {
        name:brand.name,
        isDemo:profile?.isDemo??false,
        geographicInfluence:profile?.geographicInfluence??null,
        primaryMarket:profile?.primaryMarket??null
      };
    });
  }
  private reviewFingerprint(rows:{triggerVersionId:string;ruleVersion:string}[]) {return hash(JSON.stringify(rows.map(r=>[r.triggerVersionId,r.ruleVersion]).sort()));}
  /**
   * ADR-0022: a review receipt also binds the active versions of every connected upstream decision, so a
   * change folded into a pending review (no duplicate ReviewItem) still forces the human to reopen it.
   */
  private async reviewState(tx:Transaction,s:Scope,decisionId:string,rows:{triggerVersionId:string;ruleVersion:string}[]) {
    const incoming=await tx.select({version:t.decisions.activeVersionId}).from(t.dependencies)
      .innerJoin(t.decisions,and(eq(t.decisions.id,t.dependencies.upstreamDecisionId),eq(t.decisions.workspaceId,t.dependencies.workspaceId),eq(t.decisions.brandId,t.dependencies.brandId)))
      .where(and(inScope(t.dependencies,s),eq(t.dependencies.downstreamDecisionId,decisionId)));
    return hash(JSON.stringify([this.reviewFingerprint(rows),incoming.map(r=>r.version??'').sort()]));
  }
  async beginReview(token:string,brandId:string,decisionId:string) {
    await this.retryImpact(token,brandId);
    return this.db.transaction(async tx=>{
      const s=await this.scope(tx,token,brandId);
      await this.requireNoPending(tx,s);
      const [d]=await tx.select().from(t.decisions).where(and(inScope(t.decisions,s),eq(t.decisions.id,decisionId)));
      const rows=await this.openReviews(tx,s,decisionId);
      if(!d?.activeVersionId||!rows.length) throw new AppError('CONFLICT','No active review');
      const receipt={id:id(),workspaceId:s.workspaceId,brandId,actorUserId:s.userId,decisionId,activeVersionId:d.activeVersionId,triggerFingerprint:await this.reviewState(tx,s,decisionId,rows)};
      await tx.insert(t.reviewReceipts).values(receipt);
      await this.event(tx,s,'change_impact_review_started');
      return {reviewToken:receipt.id,decisionId,activeVersionId:d.activeVersionId,reviews:rows.map(reviewOutput)};
    });
  }
  private async requireNoPending(tx:Transaction,s:Scope) {
    const rows=await tx.select().from(t.impacts).where(and(inScope(t.impacts,s),eq(t.impacts.status,'IMPACT_PENDING')));
    if(rows.length) throw new AppError('UNAVAILABLE','Impact pending: retry before another strategic commit');
  }
  async commitDecision(token:string,command:CommitCommand,reviewToken?:string,brandoReview?:{ticketId:string;action:'ACCEPT'|'MODIFY'}) {
    validate('decision-commit',command);
    if(!command.selectedOption.trim()||!command.rationale.trim()||command.selectedOption.length>12000||command.rationale.length>12000||command.idempotencyKey.length>200) throw new AppError('INVALID','Invalid command content or size');
    if(brandoReview&&(command.rationale.trim().length<10||typeof brandoReview.ticketId!=='string'||brandoReview.ticketId.length>100||!brandoReview.ticketId||!['ACCEPT','MODIFY'].includes(brandoReview.action)||Object.keys(brandoReview).some(key=>!['ticketId','action'].includes(key))))throw new AppError('INVALID','Invalid Brando origin');
    const originalFingerprint=[command.questionId,command.sourceRecommendationId,command.selectedOption,command.rationale,command.expectedActiveVersion,command.actorUserId,reviewToken??null];
    const fingerprint=hash(JSON.stringify(brandoReview?[...originalFingerprint,brandoReview]:originalFingerprint));
    const result=await this.db.transaction(async tx=>{
      const s=await this.scope(tx,token,command.brandId);
      if(s.userId!==command.actorUserId) throw new AppError('FORBIDDEN','Actor does not match session');
      const key=and(inScope(t.idempotency,s),eq(t.idempotency.actorUserId,s.userId),eq(t.idempotency.command,'COMMIT_DECISION'),eq(t.idempotency.key,command.idempotencyKey));
      const [prior]=await tx.select().from(t.idempotency).where(key);
      if(prior) {
        if(prior.fingerprint!==fingerprint) throw new AppError('CONFLICT','Idempotency key reused with different command');
        return prior.result as {decisionId:string;versionId:string};
      }
      const brandoTicket=brandoReview?this.brandoSuggestions.read(brandoReview.ticketId,s):null;
      if(brandoTicket&&brandoTicket.kind!=='STRATEGY')throw new AppError('INVALID','This suggestion opens context; it is not a strategic proposal');
      if(brandoTicket){const [rejected]=await tx.select().from(t.idempotency).where(and(inScope(t.idempotency,s),eq(t.idempotency.actorUserId,s.userId),eq(t.idempotency.command,'REVIEW_BRANDO_SUGGESTION'),eq(t.idempotency.key,brandoReview!.ticketId)));if(rejected)throw new AppError('CONFLICT','Suggestion already rejected; request a fresh answer');}
      if(brandoTicket&&(command.sourceRecommendationId!==null||(brandoTicket.questionId&&brandoTicket.questionId!==command.questionId)||await this.contextVersion(tx,s)!==brandoTicket.contextVersion))throw new AppError('CONFLICT','Brando proposal context changed');
      const reviewedAction=brandoTicket?(command.selectedOption.trim()!==brandoTicket.proposedDecision?.trim()?'MODIFY':brandoReview!.action):null;
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
        await this.event(tx,s,resolution==='ACCEPTED'?'recommendation_approved':'recommendation_modified');
      }
      if(!decision) {
        [decision]=await tx.insert(t.decisions).values({id:id(),workspaceId:s.workspaceId,brandId:s.brandId,questionId:question.id,activeVersionId:null,reviewStatus:'APPROVED'}).returning();
      }
      const open=await this.openReviews(tx,s,decision.id);
      if(open.length) {
        const [receipt]=reviewToken?await tx.select().from(t.reviewReceipts).where(and(inScope(t.reviewReceipts,s),eq(t.reviewReceipts.id,reviewToken),eq(t.reviewReceipts.actorUserId,s.userId),eq(t.reviewReceipts.decisionId,decision.id))):[];
        if(!receipt||receipt.activeVersionId!==decision.activeVersionId||receipt.triggerFingerprint!==await this.reviewState(tx,s,decision.id,open)) throw new AppError('CONFLICT','Review changed; reopen human review');
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
      const capabilityBehaviorByModule:Record<string,string>={
        'Strategic Objective':'Precisaste qué quieres construir o cambiar con tu marca y cómo reconocerás que avanzas.',
        'Market Arena':'Delimitaste dónde compite tu marca, frente a qué alternativas y con qué límites.',
        'Brand Promise':'Definiste qué debe significar tu marca para tu cliente y qué puede esperar de ella.',
        'GTM Priority':'Elegiste dónde concentrar primero tus recursos para llegar a tu cliente y qué dejas para después.',
        'Priority Experiment':'Elegiste qué supuesto crítico validar primero y qué señal te diría si se sostiene.',
        'Primary Customer':'Identificaste y priorizaste el segmento de cliente que consideras más relevante para tu marca.',
        'Value Mechanism':'Relacionaste lo que ofreces con una necesidad concreta del cliente que quieres atender.',
        'Positioning':'Articulaste una diferencia que puede ayudarte a ser elegido frente a otras alternativas.',
        'Core Message':'Priorizaste una idea central para comunicar con mayor claridad el valor de tu marca.'
      };
      const behavior=brandoTicket?`${reviewedAction==='MODIFY'?'Modificaste':'Aceptaste'} una sugerencia de Brando y confirmaste una nueva decisión. Tu criterio: ${command.rationale}`:capabilityBehaviorByModule[question.module]??'Tomaste una decisión estratégica y explicaste el criterio que utilizaste.';
      const capability={id:id(),userId:s.userId,capability:learningMoments[question.module]?.capability??'Problem Framing',behavior,decisionId:decision.id,occurredAt:version.approvedAt.toISOString()};
      validate('capability-event',capability);
      await tx.insert(t.capabilityEvents).values({id:capability.id,userId:s.userId,payload:capability});
      if(brandoTicket){
        await this.audit(tx,s,{operation:'BRANDO_SUGGESTION_APPLIED_BY_HUMAN',idempotencyKey:command.idempotencyKey,decisionId:decision.id,newVersion:version.id,rationale:JSON.stringify({action:reviewedAction,suggestion:brandoTicket.suggestion,selectedOption:command.selectedOption,rationale:command.rationale,sourceVersion:brandoTicket.sourceVersion})});
        await this.event(tx,s,'brando_suggestion_reviewed');
      }
      if(previous) await this.event(tx,s,'decision_superseded');
      if(previous){
        const weak=(await tx.select().from(t.hypotheses).where(inScope(t.hypotheses,s))).filter(h=>h.payload.status==='WEAKENED'||h.payload.status==='REJECTED').map(h=>h.id);
        const tested=(await tx.select().from(t.experiments).where(and(inScope(t.experiments,s),eq(t.experiments.decisionId,decision.id)))).map(e=>e.hypothesisId);
        if(weak.some(h=>(previous.hypothesisUsages as {hypothesisId:string}[]|null??[]).some(u=>u.hypothesisId===h)||tested.includes(h)))await this.event(tx,s,'validation_impact_reviewed');
      }
      // Dependencies were synced above, so a first version sees edges to decisions approved before it (ADR-0021).
      if(previous||(await this.firstVersionEdges(tx,s,decision.id)).length) {
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
          // A first version only reaches rules that declare it; a later version reaches every outgoing edge, as before.
          const first=trigger.previousVersionId===null;
          const outgoing=first?await this.firstVersionEdges(tx,s,trigger.decisionId):await tx.select().from(t.dependencies).where(and(inScope(t.dependencies,s),eq(t.dependencies.upstreamDecisionId,trigger.decisionId)));
          const affected=[];
          const allEdges=await tx.select().from(t.dependencies).where(inScope(t.dependencies,s));
          for(const dep of outgoing) {
            const status=dep.kind==='HARD'?'NEEDS_REVIEW':dep.kind==='SOFT'?'REVIEW_SUGGESTED':'INFORMATION_ONLY';
            // ADR-0022: a pending review caused by a direct upstream of this trigger already covers the change that
            // propagated through it (Positioning → Promise → Message with Positioning → Message). Only an equal or
            // stronger pending review counts: a pending suggestion never hides a HARD review.
            const pending=dep.kind==='INFORMATIVE'?[]:await tx.select({review:t.reviews,trigger:t.versions}).from(t.reviews).innerJoin(t.versions,and(eq(t.versions.id,t.reviews.triggerVersionId),eq(t.versions.workspaceId,t.reviews.workspaceId),eq(t.versions.brandId,t.reviews.brandId))).where(and(inScope(t.reviews,s),eq(t.reviews.downstreamDecisionId,dep.downstreamDecisionId),ne(t.reviews.status,'COMPLETED')));
            const covered=pending.some(p=>p.review.triggerVersionId!==trigger.id&&(p.review.status==='OPEN'||dep.kind!=='HARD')&&allEdges.some(e=>e.upstreamDecisionId===p.trigger.decisionId&&e.downstreamDecisionId===trigger.decisionId));
            const reason=first?`${dep.reason}. Primera decisión humana registrada en una sección conectada, después de esta decisión. Revisa su coherencia; su contenido se conserva.`:`${dep.reason}. Cambio humano: versión ${trigger.sequence-1} → ${trigger.sequence}. Revisa la decisión dependiente; su contenido se conserva.`;
            affected.push({downstreamDecisionId:dep.downstreamDecisionId,dependencyType:dep.kind,impactStatus:status,reason:covered?`${reason} Ya tiene una revisión pendiente por el cambio que originó éste; no se duplica.`:reason});
            if(dep.kind==='HARD') await tx.update(t.decisions).set({reviewStatus:'NEEDS_REVIEW'}).where(and(inScope(t.decisions,s),eq(t.decisions.id,dep.downstreamDecisionId)));
            if(dep.kind!=='INFORMATIVE'&&!covered) await tx.insert(t.reviews).values({id:id(),workspaceId:s.workspaceId,brandId:s.brandId,triggerVersionId:trigger.id,downstreamDecisionId:dep.downstreamDecisionId,dependencyType:dep.kind,status:dep.kind==='HARD'?'OPEN':'REVIEW_SUGGESTED',reason,reviewedBy:null,ruleVersion:dep.ruleVersion}).onConflictDoNothing();
            await this.event(tx,s,'dependency_triggered','SYSTEM',hash(`${trigger.id}:${dep.id}`));
          }
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
    return this.db.transaction(async tx=>this.contextProjection(tx,await this.scope(tx,token,brandId)));
  }
  private async contextProjection(tx:Transaction,s:Scope) {
      const qs=await tx.select().from(t.questions).where(inScope(t.questions,s));
      const ds=await tx.select().from(t.decisions).where(inScope(t.decisions,s));
      const vs=await tx.select().from(t.versions).where(inScope(t.versions,s)).orderBy(asc(t.versions.sequence));
      const deps=await tx.select().from(t.dependencies).where(inScope(t.dependencies,s));
      const rs=await tx.select().from(t.reviews).where(inScope(t.reviews,s));
      const impact=await tx.select().from(t.impacts).where(inScope(t.impacts,s));
      const audit=await tx.select().from(t.audits).where(inScope(t.audits,s));
      const recommendations=await tx.select().from(t.recommendations).where(inScope(t.recommendations,s));
      const analyses=await tx.select().from(t.analyses).where(inScope(t.analyses,s));
      const experimentPlans=(await tx.select().from(t.experiments).where(inScope(t.experiments,s))).map(e=>({experimentId:e.id,decisionId:e.decisionId,objective:e.objective,successCriteria:e.successCriteria,createdAt:e.createdAt.toISOString(),createdBy:e.createdBy,startedAt:e.startedAt?.toISOString()??null,completedAt:e.completedAt?.toISOString()??null}));
      const output={experimentPlans,recommendations,analyses,...await this.contextEntities(tx,s),contextVersion:await this.contextVersion(tx,s),questions:qs.sort((a,b)=>journey.findIndex(m=>m.primaryDecision===a.module)-journey.findIndex(m=>m.primaryDecision===b.module)).map(({workspaceId:_w,...q})=>q),decisions:ds.map(({workspaceId:_w,...d})=>d),versions:vs.map(versionOutput),dependencies:deps.map(({workspaceId:_w,...d})=>d),reviews:rs.map(reviewOutput),impacts:impact.map(({status,result,triggerVersionId})=>({status,result,triggerVersionId})),audit};
      for(const [name,rows] of [['strategic-question',output.questions],['decision',output.decisions],['decision-version',output.versions],['dependency',output.dependencies],['review-item',output.reviews]] as const) for(const row of rows) validate(name,row);
      const [profile]=await tx.select().from(t.brandProfiles).where(and(eq(t.brandProfiles.workspaceId,s.workspaceId),eq(t.brandProfiles.brandId,s.brandId)));
      const brandContext={geographicInfluence:profile?.geographicInfluence??null,primaryMarket:profile?.primaryMarket??null};
      const validation=validationSnapshot({...output});
      const intelligence=strategicIntelligence({...output,brandContext});
      const brandoContextVersion=hash(JSON.stringify([brandContext,output.questions,output.decisions,output.versions,output.dependencies,output.reviews,output.evidence,output.hypotheses,output.userInputs,output.openQuestions,output.learnings,output.experiments,output.signals,output.impacts]));
      return {...output,brandContext,intelligence,validation,attention:attentionFor(output),brandoContextVersion};
  }
}
/** ADR-0026: fingerprint of exactly the sources an interpretation used (signals, hypothesis, experiment). */
function validationFingerprint(c:{signals:Record<string,unknown>[];hypotheses:Record<string,unknown>[];experiments:Record<string,unknown>[]},signalIds:string[],hypothesisId:string|null,experimentId:string|null) {
  return hash(JSON.stringify([[...signalIds].sort().map(id=>c.signals.find(x=>x.id===id)??null),hypothesisId?c.hypotheses.find(h=>h.id===hypothesisId)??null:null,experimentId?c.experiments.find(e=>e.id===experimentId)??null:null]));
}
export function versionOutput(v:typeof t.versions.$inferSelect) {
  return {id:v.id,decisionId:v.decisionId,sequence:v.sequence,selectedOption:v.selectedOption,rationale:v.rationale,actorUserId:v.actorUserId,approvedAt:v.approvedAt.toISOString(),previousVersionId:v.previousVersionId,versionStatus:v.versionStatus,hypothesisUsages:v.hypothesisUsages};
}
function reviewOutput(r:typeof t.reviews.$inferSelect) {
  return {id:r.id,brandId:r.brandId,triggerVersionId:r.triggerVersionId,downstreamDecisionId:r.downstreamDecisionId,dependencyType:r.dependencyType,status:r.status,reason:r.reason,reviewedBy:r.reviewedBy};
}
