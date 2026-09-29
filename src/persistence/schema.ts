import { pgTable, text, integer, boolean, jsonb, timestamp, primaryKey, unique, foreignKey, index, pgEnum } from 'drizzle-orm/pg-core';
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

export const feedback=pgTable('pilot_feedback',{id:text().primaryKey(),userId:text().notNull().references(()=>users.id),workspaceId:text().notNull().references(()=>pilotWorkspaces.workspaceId),brandId:text().notNull(),sessionId:text().notNull(),usefulness:integer().notNull(),clarity:integer().notNull(),confidence:integer().notNull(),comment:text().notNull(),kind:text().notNull(),createdAt:timestamp({withTimezone:true}).notNull()},t=>[foreignKey({columns:[t.workspaceId,t.brandId],foreignColumns:[brands.workspaceId,brands.id]})]);
