import { pgTable, text, integer, boolean, jsonb, timestamp, primaryKey, unique, uniqueIndex, foreignKey, index, pgEnum } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { states } from '../domain/contracts.js';
export const questionState=pgEnum('question_state',states('strategic-question','status'));
export const reviewState=pgEnum('decision_review_state',states('decision','reviewStatus'));
export const versionState=pgEnum('version_state',states('decision-version','versionStatus'));
export const dependencyKind=pgEnum('dependency_kind',states('dependency','kind'));
export const reviewItemState=pgEnum('review_item_state',states('review-item','status'));
export const users=pgTable('users',{id:text().primaryKey()});
export const workspaces=pgTable('workspaces',{id:text().primaryKey(),name:text().notNull()});
export const memberships=pgTable('memberships',{workspaceId:text().notNull().references(()=>workspaces.id),userId:text().notNull().references(()=>users.id),role:text().notNull(),active:boolean().notNull().default(true),canCreateBrand:boolean().notNull().default(false)},t=>[primaryKey({columns:[t.workspaceId,t.userId]})]);
export const sessions=pgTable('sessions',{tokenHash:text().primaryKey(),userId:text().notNull().references(()=>users.id),workspaceId:text().notNull().references(()=>workspaces.id),expiresAt:timestamp({withTimezone:true}).notNull()},t=>[foreignKey({columns:[t.workspaceId,t.userId],foreignColumns:[memberships.workspaceId,memberships.userId]})]);
export const brands=pgTable('brands',{id:text().primaryKey(),workspaceId:text().notNull().references(()=>workspaces.id),name:text().notNull(),dataClass:text().notNull().default('DEMO')},t=>[unique().on(t.workspaceId,t.id)]);
export const assignments=pgTable('brand_assignments',{workspaceId:text().notNull(),brandId:text().notNull(),userId:text().notNull()},t=>[primaryKey({columns:[t.workspaceId,t.brandId,t.userId]}),foreignKey({columns:[t.workspaceId,t.brandId],foreignColumns:[brands.workspaceId,brands.id]}),foreignKey({columns:[t.workspaceId,t.userId],foreignColumns:[memberships.workspaceId,memberships.userId]})]);
const scope=()=>({workspaceId:text().notNull(),brandId:text().notNull()});
export const questions=pgTable('questions',{id:text().primaryKey(),...scope(),module:text().notNull(),text:text().notNull(),status:questionState().notNull()},t=>[unique().on(t.workspaceId,t.brandId,t.id),unique().on(t.workspaceId,t.brandId,t.module),foreignKey({columns:[t.workspaceId,t.brandId],foreignColumns:[brands.workspaceId,brands.id]})]);
export const recommendations=pgTable('recommendations',{id:text().primaryKey(),...scope(),questionId:text().notNull(),payload:jsonb().notNull(),contextVersion:text().notNull(),resolution:text().notNull().default('GENERATED')},t=>[unique().on(t.workspaceId,t.brandId,t.id),foreignKey({columns:[t.workspaceId,t.brandId,t.questionId],foreignColumns:[questions.workspaceId,questions.brandId,questions.id]})]);
export const decisions=pgTable('decisions',{id:text().primaryKey(),...scope(),questionId:text().notNull(),activeVersionId:text(),reviewStatus:reviewState().notNull()},t=>[unique().on(t.workspaceId,t.brandId,t.id),unique().on(t.workspaceId,t.brandId,t.questionId),foreignKey({columns:[t.workspaceId,t.brandId,t.questionId],foreignColumns:[questions.workspaceId,questions.brandId,questions.id]})]);
export const versions=pgTable('decision_versions',{id:text().primaryKey(),...scope(),decisionId:text().notNull(),sequence:integer().notNull(),selectedOption:text().notNull(),rationale:text().notNull(),actorUserId:text().notNull().references(()=>users.id),approvedAt:timestamp({withTimezone:true}).notNull(),previousVersionId:text(),versionStatus:versionState().notNull(),hypothesisUsages:jsonb().notNull().default([])},t=>[unique().on(t.workspaceId,t.brandId,t.decisionId,t.id),unique().on(t.workspaceId,t.brandId,t.id),unique().on(t.decisionId,t.sequence),foreignKey({columns:[t.workspaceId,t.brandId,t.decisionId],foreignColumns:[decisions.workspaceId,decisions.brandId,decisions.id]})]);
export const dependencies=pgTable('dependencies',{id:text().primaryKey(),...scope(),upstreamDecisionId:text().notNull(),downstreamDecisionId:text().notNull(),kind:dependencyKind().notNull(),reason:text().notNull(),ruleVersion:text().notNull()},t=>[unique().on(t.workspaceId,t.brandId,t.upstreamDecisionId,t.downstreamDecisionId,t.ruleVersion),foreignKey({columns:[t.workspaceId,t.brandId,t.upstreamDecisionId],foreignColumns:[decisions.workspaceId,decisions.brandId,decisions.id]}),foreignKey({columns:[t.workspaceId,t.brandId,t.downstreamDecisionId],foreignColumns:[decisions.workspaceId,decisions.brandId,decisions.id]})]);
export const reviews=pgTable('review_items',{id:text().primaryKey(),...scope(),triggerVersionId:text().notNull(),downstreamDecisionId:text().notNull(),dependencyType:dependencyKind().notNull(),status:reviewItemState().notNull(),reason:text().notNull(),reviewedBy:text().references(()=>users.id),ruleVersion:text().notNull()},t=>[unique().on(t.workspaceId,t.brandId,t.triggerVersionId,t.downstreamDecisionId,t.ruleVersion),foreignKey({columns:[t.workspaceId,t.brandId,t.triggerVersionId],foreignColumns:[versions.workspaceId,versions.brandId,versions.id]}),foreignKey({columns:[t.workspaceId,t.brandId,t.downstreamDecisionId],foreignColumns:[decisions.workspaceId,decisions.brandId,decisions.id]}),index().on(t.workspaceId,t.brandId,t.status)]);
export const impacts=pgTable('impacts',{triggerVersionId:text().primaryKey(),...scope(),status:text().notNull(),result:jsonb(),attempts:integer().notNull().default(0)},t=>[foreignKey({columns:[t.workspaceId,t.brandId,t.triggerVersionId],foreignColumns:[versions.workspaceId,versions.brandId,versions.id]})]);
export const audits=pgTable('strategic_audit',{id:text().primaryKey(),...scope(),actorUserId:text().notNull().references(()=>users.id),decisionId:text(),previousVersion:text(),newVersion:text(),operation:text().notNull(),idempotencyKey:text().notNull(),rationale:text(),sourceRecommendationId:text(),occurredAt:timestamp({withTimezone:true}).notNull()},t=>[foreignKey({columns:[t.workspaceId,t.brandId],foreignColumns:[brands.workspaceId,brands.id]}),index().on(t.workspaceId,t.brandId)]);
export const idempotency=pgTable('idempotency',{...scope(),actorUserId:text().notNull().references(()=>users.id),command:text().notNull(),key:text().notNull(),fingerprint:text().notNull(),result:jsonb().notNull()},t=>[primaryKey({columns:[t.workspaceId,t.brandId,t.actorUserId,t.command,t.key]}),foreignKey({columns:[t.workspaceId,t.brandId],foreignColumns:[brands.workspaceId,brands.id]})]);
export const telemetry=pgTable('telemetry',{eventId:text().primaryKey(),...scope(),payload:jsonb().notNull()},t=>[foreignKey({columns:[t.workspaceId,t.brandId],foreignColumns:[brands.workspaceId,brands.id]})]);
export const reviewReceipts=pgTable('review_receipts',{id:text().primaryKey(),...scope(),actorUserId:text().notNull().references(()=>users.id),decisionId:text().notNull(),activeVersionId:text().notNull(),triggerFingerprint:text().notNull()},t=>[foreignKey({columns:[t.workspaceId,t.brandId,t.decisionId,t.activeVersionId],foreignColumns:[versions.workspaceId,versions.brandId,versions.decisionId,versions.id]})]);
// Separate canonical entities; payloads are schema-validated at the application boundary.
const contextColumns=()=>({id:text().primaryKey(),...scope(),payload:jsonb().$type<Record<string,unknown>>().notNull(),createdBy:text().notNull().references(()=>users.id),createdAt:timestamp({withTimezone:true}).notNull()});
export const userInputs=pgTable('user_inputs',contextColumns(),t=>[unique().on(t.workspaceId,t.brandId,t.id),foreignKey({columns:[t.workspaceId,t.brandId],foreignColumns:[brands.workspaceId,brands.id]})]);
export const evidence=pgTable('evidence',contextColumns(),t=>[unique().on(t.workspaceId,t.brandId,t.id),foreignKey({columns:[t.workspaceId,t.brandId],foreignColumns:[brands.workspaceId,brands.id]})]);
export const hypotheses=pgTable('hypotheses',contextColumns(),t=>[unique().on(t.workspaceId,t.brandId,t.id),foreignKey({columns:[t.workspaceId,t.brandId],foreignColumns:[brands.workspaceId,brands.id]})]);
export const openQuestions=pgTable('open_questions',contextColumns(),t=>[unique().on(t.workspaceId,t.brandId,t.id),foreignKey({columns:[t.workspaceId,t.brandId],foreignColumns:[brands.workspaceId,brands.id]})]);
export const analyses=pgTable('analyses',{id:text().primaryKey(),...scope(),recommendationId:text(),contextVersion:text().notNull(),evaluation:jsonb(),trace:jsonb().notNull(),createdAt:timestamp({withTimezone:true}).notNull()},t=>[foreignKey({columns:[t.workspaceId,t.brandId],foreignColumns:[brands.workspaceId,brands.id]}),foreignKey({columns:[t.workspaceId,t.brandId,t.recommendationId],foreignColumns:[recommendations.workspaceId,recommendations.brandId,recommendations.id]})]);
export const experiments=pgTable('experiments',{...contextColumns(),hypothesisId:text().notNull(),decisionId:text().notNull(),objective:text().notNull().default(''),successCriteria:text().notNull().default(''),startedAt:timestamp({withTimezone:true}),completedAt:timestamp({withTimezone:true})},t=>[unique().on(t.workspaceId,t.brandId,t.id),foreignKey({columns:[t.workspaceId,t.brandId,t.hypothesisId],foreignColumns:[hypotheses.workspaceId,hypotheses.brandId,hypotheses.id]}),foreignKey({columns:[t.workspaceId,t.brandId,t.decisionId],foreignColumns:[decisions.workspaceId,decisions.brandId,decisions.id]}),index().on(t.workspaceId,t.brandId,t.hypothesisId),index().on(t.workspaceId,t.brandId,t.decisionId)]);
export const signals=pgTable('signals',{...contextColumns(),experimentId:text().notNull()},t=>[unique().on(t.workspaceId,t.brandId,t.id),foreignKey({columns:[t.workspaceId,t.brandId,t.experimentId],foreignColumns:[experiments.workspaceId,experiments.brandId,experiments.id]}),index().on(t.workspaceId,t.brandId,t.experimentId)]);
export const learnings=pgTable('learnings',contextColumns(),t=>[unique().on(t.workspaceId,t.brandId,t.id),foreignKey({columns:[t.workspaceId,t.brandId],foreignColumns:[brands.workspaceId,brands.id]})]);
export const learningSignals=pgTable('learning_signals',{...scope(),learningId:text().notNull(),signalId:text().notNull()},t=>[primaryKey({columns:[t.workspaceId,t.brandId,t.learningId,t.signalId]}),foreignKey({columns:[t.workspaceId,t.brandId,t.learningId],foreignColumns:[learnings.workspaceId,learnings.brandId,learnings.id]}),foreignKey({columns:[t.workspaceId,t.brandId,t.signalId],foreignColumns:[signals.workspaceId,signals.brandId,signals.id]}),index().on(t.workspaceId,t.brandId,t.signalId)]);
// Personal evidence only. Never joined into a Brand Context or model request.
export const sourceDocuments=pgTable('source_documents',{
  id:text().primaryKey(),
  ...scope(),
  originalName:text().notNull(),
  mediaType:text().notNull(),
  bytes:integer().notNull(),
  sha256:text().notNull(),
  storageKey:text().notNull(),
  status:text().notNull().default('UPLOADED'),
  uploadedBy:text().notNull().references(()=>users.id),
  uploadedAt:timestamp({withTimezone:true}).notNull()
},t=>[
  unique().on(t.workspaceId,t.brandId,t.id),
  foreignKey({
    columns:[t.workspaceId,t.brandId],
    foreignColumns:[brands.workspaceId,brands.id]
  }),
  index().on(t.workspaceId,t.brandId,t.uploadedAt),
  index().on(t.workspaceId,t.brandId,t.sha256)
]);

export const documentExtractions=pgTable('document_extractions',{
  id:text().primaryKey(),
  ...scope(),
  documentId:text().notNull(),
  status:text().notNull().default('PENDING'),
  provider:text(),
  model:text(),
  content:text(),
  metadata:jsonb().$type<Record<string,unknown>>().notNull().default({}),
  createdAt:timestamp({withTimezone:true}).notNull()
},t=>[
  unique().on(t.workspaceId,t.brandId,t.id),
  unique().on(t.workspaceId,t.brandId,t.documentId,t.id),
  foreignKey({
    columns:[t.workspaceId,t.brandId,t.documentId],
    foreignColumns:[
      sourceDocuments.workspaceId,
      sourceDocuments.brandId,
      sourceDocuments.id
    ]
  }),
  index().on(t.workspaceId,t.brandId,t.documentId)
]);

export const documentClaims=pgTable('document_claims',{
  id:text().primaryKey(),
  ...scope(),
  documentId:text().notNull(),
  extractionId:text().notNull(),
  claimType:text().notNull(),
  statement:text().notNull(),
  location:jsonb().$type<Record<string,unknown>>().notNull().default({}),
  confidence:text().notNull().default('UNASSESSED'),
  reviewStatus:text().notNull().default('CANDIDATE'),
  reviewedStatement:text(),
  reviewedBy:text().references(()=>users.id),
  reviewedAt:timestamp({withTimezone:true}),
  contextKind:text(),
  contextEntityId:text(),
  createdAt:timestamp({withTimezone:true}).notNull()
},t=>[
  unique().on(t.workspaceId,t.brandId,t.id),
  foreignKey({
    columns:[t.workspaceId,t.brandId,t.documentId],
    foreignColumns:[
      sourceDocuments.workspaceId,
      sourceDocuments.brandId,
      sourceDocuments.id
    ]
  }),
  foreignKey({
    columns:[
      t.workspaceId,
      t.brandId,
      t.documentId,
      t.extractionId
    ],
    foreignColumns:[
      documentExtractions.workspaceId,
      documentExtractions.brandId,
      documentExtractions.documentId,
      documentExtractions.id
    ]
  }),
  index().on(t.workspaceId,t.brandId,t.documentId),
  index().on(t.workspaceId,t.brandId,t.reviewStatus)
]);

export const capabilityEvents=pgTable('capability_events',{id:text().primaryKey(),userId:text().notNull().references(()=>users.id),payload:jsonb().$type<Record<string,unknown>>().notNull()},t=>[index().on(t.userId)]);
// ADR-0027 · private reflections belong to one user (never Brand Context). An optional brand/decision link stays
// inside the author's workspace; idempotency is per author so a double submit never creates two reflections.
export const personalReflections=pgTable('personal_reflections',{id:text().primaryKey(),userId:text().notNull().references(()=>users.id),workspaceId:text().notNull().references(()=>workspaces.id),brandId:text(),decisionId:text(),idempotencyKey:text().notNull(),payload:jsonb().$type<Record<string,unknown>>().notNull(),createdAt:timestamp({withTimezone:true}).notNull()},t=>[unique().on(t.userId,t.idempotencyKey),index().on(t.userId,t.workspaceId,t.createdAt),foreignKey({columns:[t.workspaceId,t.brandId],foreignColumns:[brands.workspaceId,brands.id]}),foreignKey({columns:[t.workspaceId,t.brandId,t.decisionId],foreignColumns:[decisions.workspaceId,decisions.brandId,decisions.id]})]);
// Pilot metadata is additive. Existing DEMO identities and strategic history remain unchanged.
export const pilotWorkspaces=pgTable('pilot_workspaces',{workspaceId:text().primaryKey().references(()=>workspaces.id),cohort:text().notNull(),createdAt:timestamp({withTimezone:true}).notNull()});
export const pilotIdentities=pgTable('pilot_identities',{userId:text().primaryKey().references(()=>users.id),issuer:text().notNull(),subject:text().notNull(),workspaceId:text().notNull().references(()=>pilotWorkspaces.workspaceId),active:boolean().notNull().default(true)},t=>[unique().on(t.issuer,t.subject),foreignKey({columns:[t.workspaceId,t.userId],foreignColumns:[memberships.workspaceId,memberships.userId]})]);
export const pilotSessions=pgTable('pilot_sessions',{sessionId:text().primaryKey(),tokenHash:text().notNull().unique().references(()=>sessions.tokenHash,{onDelete:'cascade'}),userId:text().notNull().references(()=>users.id),intervention:text().notNull(),startedAt:timestamp({withTimezone:true}).notNull()});
export const loginFlows=pgTable('login_flows',{stateHash:text().primaryKey(),verifier:text().notNull(),nonce:text().notNull(),expiresAt:timestamp({withTimezone:true}).notNull()});
export const pilotEvents=pgTable('pilot_events',{id:text().primaryKey(),userId:text().notNull().references(()=>users.id),workspaceId:text().notNull().references(()=>pilotWorkspaces.workspaceId),brandId:text(),sessionId:text(),name:text().notNull(),cohort:text().notNull(),intervention:text().notNull(),occurredAt:timestamp({withTimezone:true}).notNull()},t=>[foreignKey({columns:[t.workspaceId,t.brandId],foreignColumns:[brands.workspaceId,brands.id]}),index().on(t.userId,t.occurredAt)]);
// Account profile from the verified OIDC claims. Identity stays (issuer, subject) in pilot_identities;
// email is metadata for recognition, admin and recovery, never the canonical identity. normalizedEmail is
// unique so one mailbox cannot end up attached to two accounts.
export const userAccounts=pgTable('user_accounts',{userId:text().primaryKey().references(()=>users.id),email:text().notNull(),normalizedEmail:text().notNull(),emailVerifiedAt:timestamp({withTimezone:true}),displayName:text(),avatarUrl:text(),createdAt:timestamp({withTimezone:true}).notNull(),lastLoginAt:timestamp({withTimezone:true}),accessStatus:text().notNull().default('APPROVED')},t=>[unique().on(t.normalizedEmail),index().on(t.normalizedEmail)]);

// Brand-level pilot classification and strategic geography. Deliberately NOT columns on `brands`:
// that table is shared with the frozen Pilot build exercised by the release rehearsal, and widening it
// breaks that compatibility test. No row means a real brand with no declared market.
export const brandProfiles=pgTable('brand_profiles',{...scope(),isDemo:boolean().notNull().default(false),geographicInfluence:text(),primaryMarket:text()},t=>[primaryKey({columns:[t.workspaceId,t.brandId]}),foreignKey({columns:[t.workspaceId,t.brandId],foreignColumns:[brands.workspaceId,brands.id]}),index().on(t.isDemo)]);

export const participantProfiles=pgTable('participant_profiles',{userId:text().primaryKey().references(()=>users.id),firstName:text().notNull(),lastName:text().notNull(),country:text().notNull(),region:text().notNull(),city:text().notNull(),primaryProfile:text().notNull(),companyOrProject:text(),sector:text(),pilotGoal:text(),privacyAcceptedAt:timestamp({withTimezone:true}).notNull(),termsAcceptedAt:timestamp({withTimezone:true}).notNull(),createdAt:timestamp({withTimezone:true}).notNull(),updatedAt:timestamp({withTimezone:true}).notNull()});

// ADR-0029: brandId becomes nullable so feedback survives the deletion of the brand it was given in (unlinked, never deleted).
export const feedback=pgTable('pilot_feedback',{id:text().primaryKey(),userId:text().notNull().references(()=>users.id),workspaceId:text().notNull().references(()=>pilotWorkspaces.workspaceId),brandId:text(),sessionId:text().notNull(),usefulness:integer().notNull(),clarity:integer().notNull(),confidence:integer().notNull(),comment:text().notNull(),kind:text().notNull(),createdAt:timestamp({withTimezone:true}).notNull()},t=>[foreignKey({columns:[t.workspaceId,t.brandId],foreignColumns:[brands.workspaceId,brands.id]})]);

// ADR-0029 · Eliminar marca. Minimal deletion record: no brand name and no brand content (privacy). brandId has no FK
// because the brand row is gone; the record carries the idempotent outcome and the pending file purge, if any.
export const brandDeletions=pgTable('brand_deletions',{id:text().primaryKey(),workspaceId:text().notNull().references(()=>workspaces.id),brandId:text().notNull(),actorUserId:text().notNull().references(()=>users.id),idempotencyKey:text().notNull(),status:text().notNull(),storagePrefix:text(),createdAt:timestamp({withTimezone:true}).notNull(),completedAt:timestamp({withTimezone:true})},t=>[unique().on(t.workspaceId,t.actorUserId,t.idempotencyKey),index().on(t.workspaceId,t.brandId),index().on(t.status)]);

// ─── Phase 4 · block 2 (ADR-0030, ADR-0031, ADR-0033). Side tables only: no existing table is widened. ───
const at=()=>timestamp({withTimezone:true});
// ADR-0033 · capabilities granted to a MEMBER for one brand (an ADMIN holds them all implicitly). Revocation keeps the row.
export const brandCapabilities=pgTable('brand_capabilities',{id:text().primaryKey(),...scope(),userId:text().notNull(),capability:text().notNull(),grantedBy:text().notNull().references(()=>users.id),grantedAt:at().notNull(),revokedBy:text().references(()=>users.id),revokedAt:at()},t=>[foreignKey({columns:[t.workspaceId,t.brandId],foreignColumns:[brands.workspaceId,brands.id]}),foreignKey({columns:[t.workspaceId,t.userId],foreignColumns:[memberships.workspaceId,memberships.userId]}),uniqueIndex('brand_capabilities_active_unique').on(t.workspaceId,t.brandId,t.userId,t.capability).where(sql`"revokedAt" IS NULL`),index().on(t.workspaceId,t.brandId)]);
// PHASE4_SPEC §4.9 · work priority, append-only; the current one is the latest. Never a decision, never a permission.
export const brandWorkPriorities=pgTable('brand_work_priorities',{id:text().primaryKey(),...scope(),intent:text().notNull(),note:text(),createdBy:text().notNull().references(()=>users.id),idempotencyKey:text().notNull(),createdAt:at().notNull()},t=>[unique().on(t.workspaceId,t.brandId,t.createdBy,t.idempotencyKey),foreignKey({columns:[t.workspaceId,t.brandId],foreignColumns:[brands.workspaceId,brands.id]}),index().on(t.workspaceId,t.brandId,t.createdAt)]);
// ADR-0031 · worker processes. A supervisor on the same host records the observed termination (C1 evidence).
export const workerInstances=pgTable('worker_instances',{id:text().primaryKey(),host:text().notNull(),pid:integer().notNull(),startedAt:at().notNull(),heartbeatAt:at().notNull(),terminatedAt:at(),terminationEvidence:jsonb().$type<Record<string,unknown>>()});
// ADR-0031 · a provider credential of the workspace (Canva: owned by one person). The secret is encrypted server-side.
export const connections=pgTable('connections',{id:text().primaryKey(),workspaceId:text().notNull().references(()=>workspaces.id),provider:text().notNull(),accountLabel:text().notNull(),scopes:jsonb().$type<string[]>().notNull().default([]),ownerUserId:text().references(()=>users.id),connectedBy:text().notNull().references(()=>users.id),status:text().notNull(),credentialCiphertext:text(),credentialKeyId:text(),createdAt:at().notNull(),updatedAt:at().notNull(),revokedAt:at()},t=>[unique().on(t.workspaceId,t.id),index().on(t.workspaceId,t.provider)]);
// ADR-0031 · explicit link of one external account of a connection to one brand. One active link per account.
export const connectionBrandLinks=pgTable('connection_brand_links',{id:text().primaryKey(),...scope(),connectionId:text().notNull(),externalAccountId:text().notNull(),externalAccountLabel:text().notNull(),linkedBy:text().notNull().references(()=>users.id),linkedAt:at().notNull(),unlinkedAt:at()},t=>[unique().on(t.workspaceId,t.brandId,t.id),foreignKey({columns:[t.workspaceId,t.brandId],foreignColumns:[brands.workspaceId,brands.id]}),foreignKey({columns:[t.workspaceId,t.connectionId],foreignColumns:[connections.workspaceId,connections.id]}),uniqueIndex('connection_brand_links_active_account').on(t.workspaceId,t.connectionId,t.externalAccountId).where(sql`"unlinkedAt" IS NULL`),index().on(t.workspaceId,t.brandId)]);
// ADR-0031 · human authorization of one external operation, reserved by exactly one job and consumed once.
export const operationAuthorizations=pgTable('operation_authorizations',{id:text().primaryKey(),...scope(),linkId:text().notNull(),operation:text().notNull(),subjectKind:text().notNull(),subjectId:text().notNull(),subjectVersionId:text().notNull(),summary:jsonb().$type<Record<string,unknown>>().notNull(),summaryFingerprint:text().notNull(),contentFingerprint:text().notNull(),status:text().notNull(),actorUserId:text().notNull().references(()=>users.id),idempotencyKey:text().notNull(),expiresAt:at().notNull(),createdAt:at().notNull(),decidedAt:at(),reservedJobId:text()},t=>[unique().on(t.workspaceId,t.brandId,t.id),unique().on(t.workspaceId,t.brandId,t.actorUserId,t.idempotencyKey),foreignKey({columns:[t.workspaceId,t.brandId,t.linkId],foreignColumns:[connectionBrandLinks.workspaceId,connectionBrandLinks.brandId,connectionBrandLinks.id]}),index().on(t.workspaceId,t.brandId,t.subjectId)]);
// ADR-0031 · queued external operation; the lease is persisted (claimedBy, leaseNumber, leaseUntil).
export const externalJobs=pgTable('external_jobs',{id:text().primaryKey(),...scope(),authorizationId:text().notNull(),operationKey:text().notNull(),subjectKind:text().notNull(),subjectId:text().notNull(),provider:text().notNull(),operation:text().notNull(),status:text().notNull(),claimedBy:text().references(()=>workerInstances.id),leaseNumber:integer().notNull().default(0),leaseUntil:at(),blockedReason:text(),lastErrorCode:text(),createdAt:at().notNull(),updatedAt:at().notNull()},t=>[unique().on(t.workspaceId,t.brandId,t.id),unique().on(t.authorizationId),unique().on(t.operationKey),foreignKey({columns:[t.workspaceId,t.brandId,t.authorizationId],foreignColumns:[operationAuthorizations.workspaceId,operationAuthorizations.brandId,operationAuthorizations.id]}),index().on(t.status,t.createdAt),index().on(t.workspaceId,t.brandId,t.subjectId),uniqueIndex('external_jobs_one_open_per_subject').on(t.workspaceId,t.brandId,t.subjectKind,t.subjectId).where(sql`status NOT IN ('SUCCEEDED','FAILED','EXPIRED','CANCELLED')`)]);
// ADR-0031 · one remote step of a job (unit of dispatch, reconciliation and partial results).
export const externalSteps=pgTable('external_steps',{id:text().primaryKey(),...scope(),jobId:text().notNull(),ordinal:integer().notNull(),stepKey:text().notNull(),remoteTag:text().notNull(),status:text().notNull(),providerIds:jsonb().$type<Record<string,string>>().notNull().default({}),updatedAt:at().notNull()},t=>[unique().on(t.workspaceId,t.brandId,t.id),unique().on(t.jobId,t.stepKey),unique().on(t.jobId,t.ordinal),foreignKey({columns:[t.workspaceId,t.brandId,t.jobId],foreignColumns:[externalJobs.workspaceId,externalJobs.brandId,externalJobs.id]})]);
// ADR-0031 · an attempt starts at the confirmed DISPATCHING transition; append-only.
export const externalAttempts=pgTable('external_attempts',{id:text().primaryKey(),...scope(),stepId:text().notNull(),attemptNumber:integer().notNull(),workerInstanceId:text().notNull().references(()=>workerInstances.id),leaseNumber:integer().notNull(),startedAt:at().notNull(),dispatchBy:at().notNull(),requestTimeoutMs:integer().notNull(),credentialExpiresAt:at()},t=>[unique().on(t.workspaceId,t.brandId,t.id),unique().on(t.stepId,t.attemptNumber),foreignKey({columns:[t.workspaceId,t.brandId,t.stepId],foreignColumns:[externalSteps.workspaceId,externalSteps.brandId,externalSteps.id]})]);
// ADR-0031 · append-only evidence per attempt; late results are added, never overwrite.
export const externalAttemptOutcomes=pgTable('external_attempt_outcomes',{id:text().primaryKey(),...scope(),attemptId:text().notNull(),kind:text().notNull(),providerIds:jsonb().$type<Record<string,string>>().notNull().default({}),evidence:jsonb().$type<Record<string,unknown>>(),recordedAt:at().notNull()},t=>[foreignKey({columns:[t.workspaceId,t.brandId,t.attemptId],foreignColumns:[externalAttempts.workspaceId,externalAttempts.brandId,externalAttempts.id]}),index().on(t.attemptId)]);
// ADR-0031 C1 · a step that is REJECTED or NOT_CREATED is dispatched again only after a person released it for that
// exact next attempt number (criterion + AUTHORIZE_SPEND). Append-only.
export const externalStepReleases=pgTable('external_step_releases',{id:text().primaryKey(),...scope(),stepId:text().notNull(),attemptNumber:integer().notNull(),releasedBy:text().notNull().references(()=>users.id),criterion:text().notNull(),releasedAt:at().notNull()},t=>[unique().on(t.stepId,t.attemptNumber),foreignKey({columns:[t.workspaceId,t.brandId,t.stepId],foreignColumns:[externalSteps.workspaceId,externalSteps.brandId,externalSteps.id]})]);
// ADR-0030 · offers (products and services). The parent keeps separate pointers: working draft and current approved.
export const offers=pgTable('offers',{id:text().primaryKey(),...scope(),status:text().notNull(),draftVersionId:text(),approvedVersionId:text(),revision:integer().notNull().default(0),createdBy:text().notNull().references(()=>users.id),idempotencyKey:text().notNull(),createdAt:at().notNull(),updatedAt:at().notNull()},t=>[unique().on(t.workspaceId,t.brandId,t.id),unique().on(t.workspaceId,t.brandId,t.createdBy,t.idempotencyKey),foreignKey({columns:[t.workspaceId,t.brandId],foreignColumns:[brands.workspaceId,brands.id]}),index().on(t.workspaceId,t.brandId)]);
// ADR-0030 · offer versions: editorial status per version; content and fingerprint are frozen once out of DRAFT.
export const offerVersions=pgTable('offer_versions',{id:text().primaryKey(),...scope(),offerId:text().notNull(),sequence:integer().notNull(),previousVersionId:text(),status:text().notNull(),content:jsonb().$type<Record<string,unknown>>().notNull(),fingerprint:text().notNull(),createdBy:text().notNull().references(()=>users.id),createdAt:at().notNull(),submittedAt:at(),decidedBy:text().references(()=>users.id),decidedAt:at(),decisionCriterion:text()},t=>[unique().on(t.workspaceId,t.brandId,t.id),unique().on(t.offerId,t.sequence),foreignKey({columns:[t.workspaceId,t.brandId,t.offerId],foreignColumns:[offers.workspaceId,offers.brandId,offers.id]}),index().on(t.workspaceId,t.brandId,t.offerId)]);// ADR-0030 / PHASE4_SPEC §4.2 · annual marketing plan: one per brand and year; focusStart opens the current 90-day window.
export const marketingPlans=pgTable('marketing_plans',{id:text().primaryKey(),...scope(),year:integer().notNull(),focusStart:text(),revision:integer().notNull().default(0),createdBy:text().notNull().references(()=>users.id),createdAt:at().notNull(),updatedAt:at().notNull()},t=>[unique().on(t.workspaceId,t.brandId,t.id),unique().on(t.workspaceId,t.brandId,t.year),foreignKey({columns:[t.workspaceId,t.brandId],foreignColumns:[brands.workspaceId,brands.id]})]);
// Objectives (annual or 90-day priority) and actions: numbered revision per record; every change appends to plan_changes.
export const planObjectives=pgTable('plan_objectives',{id:text().primaryKey(),...scope(),planId:text().notNull(),content:jsonb().$type<Record<string,unknown>>().notNull(),revision:integer().notNull().default(0),createdBy:text().notNull().references(()=>users.id),idempotencyKey:text().notNull(),createdAt:at().notNull(),updatedAt:at().notNull()},t=>[unique().on(t.workspaceId,t.brandId,t.id),unique().on(t.workspaceId,t.brandId,t.createdBy,t.idempotencyKey),foreignKey({columns:[t.workspaceId,t.brandId,t.planId],foreignColumns:[marketingPlans.workspaceId,marketingPlans.brandId,marketingPlans.id]}),index().on(t.workspaceId,t.brandId,t.planId)]);
export const planActions=pgTable('plan_actions',{id:text().primaryKey(),...scope(),planId:text().notNull(),content:jsonb().$type<Record<string,unknown>>().notNull(),revision:integer().notNull().default(0),createdBy:text().notNull().references(()=>users.id),idempotencyKey:text().notNull(),createdAt:at().notNull(),updatedAt:at().notNull()},t=>[unique().on(t.workspaceId,t.brandId,t.id),unique().on(t.workspaceId,t.brandId,t.createdBy,t.idempotencyKey),foreignKey({columns:[t.workspaceId,t.brandId,t.planId],foreignColumns:[marketingPlans.workspaceId,marketingPlans.brandId,marketingPlans.id]}),index().on(t.workspaceId,t.brandId,t.planId)]);
// Append-only change log of the plan (who changed what, at which revision, with the resulting content).
export const planChanges=pgTable('plan_changes',{id:text().primaryKey(),...scope(),planId:text().notNull(),entityType:text().notNull(),entityId:text().notNull(),revision:integer().notNull(),operation:text().notNull(),content:jsonb().$type<Record<string,unknown>>().notNull(),actorId:text().notNull().references(()=>users.id),createdAt:at().notNull()},t=>[unique().on(t.entityType,t.entityId,t.revision),foreignKey({columns:[t.workspaceId,t.brandId,t.planId],foreignColumns:[marketingPlans.workspaceId,marketingPlans.brandId,marketingPlans.id]}),index().on(t.workspaceId,t.brandId,t.planId)]);
// ADR-0033 / INV-010 · append-only record of each human decision on an offer version (exact version + fingerprint).
export const offerApprovals=pgTable('offer_approvals',{id:text().primaryKey(),...scope(),offerId:text().notNull(),versionId:text().notNull(),fingerprint:text().notNull(),decision:text().notNull(),criterion:text().notNull(),supersededVersionId:text(),actorId:text().notNull().references(()=>users.id),idempotencyKey:text().notNull(),createdAt:at().notNull()},t=>[unique().on(t.workspaceId,t.brandId,t.actorId,t.idempotencyKey),foreignKey({columns:[t.workspaceId,t.brandId,t.offerId],foreignColumns:[offers.workspaceId,offers.brandId,offers.id]}),foreignKey({columns:[t.workspaceId,t.brandId,t.versionId],foreignColumns:[offerVersions.workspaceId,offerVersions.brandId,offerVersions.id]}),index().on(t.workspaceId,t.brandId,t.offerId)]);
