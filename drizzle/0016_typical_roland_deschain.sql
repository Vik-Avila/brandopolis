CREATE TABLE "brand_capabilities" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"userId" text NOT NULL,
	"capability" text NOT NULL,
	"grantedBy" text NOT NULL,
	"grantedAt" timestamp with time zone NOT NULL,
	"revokedBy" text,
	"revokedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "brand_work_priorities" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"intent" text NOT NULL,
	"note" text,
	"createdBy" text NOT NULL,
	"idempotencyKey" text NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	CONSTRAINT "brand_work_priorities_workspaceId_brandId_createdBy_idempotencyKey_unique" UNIQUE("workspaceId","brandId","createdBy","idempotencyKey")
);
--> statement-breakpoint
CREATE TABLE "connection_brand_links" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"connectionId" text NOT NULL,
	"externalAccountId" text NOT NULL,
	"externalAccountLabel" text NOT NULL,
	"linkedBy" text NOT NULL,
	"linkedAt" timestamp with time zone NOT NULL,
	"unlinkedAt" timestamp with time zone,
	CONSTRAINT "connection_brand_links_workspaceId_brandId_id_unique" UNIQUE("workspaceId","brandId","id")
);
--> statement-breakpoint
CREATE TABLE "connections" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"provider" text NOT NULL,
	"accountLabel" text NOT NULL,
	"scopes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"ownerUserId" text,
	"connectedBy" text NOT NULL,
	"status" text NOT NULL,
	"credentialCiphertext" text,
	"credentialKeyId" text,
	"createdAt" timestamp with time zone NOT NULL,
	"updatedAt" timestamp with time zone NOT NULL,
	"revokedAt" timestamp with time zone,
	CONSTRAINT "connections_workspaceId_id_unique" UNIQUE("workspaceId","id")
);
--> statement-breakpoint
CREATE TABLE "external_attempt_outcomes" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"attemptId" text NOT NULL,
	"kind" text NOT NULL,
	"providerIds" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"evidence" jsonb,
	"recordedAt" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "external_attempts" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"stepId" text NOT NULL,
	"attemptNumber" integer NOT NULL,
	"workerInstanceId" text NOT NULL,
	"leaseNumber" integer NOT NULL,
	"startedAt" timestamp with time zone NOT NULL,
	"dispatchBy" timestamp with time zone NOT NULL,
	"requestTimeoutMs" integer NOT NULL,
	"credentialExpiresAt" timestamp with time zone,
	CONSTRAINT "external_attempts_workspaceId_brandId_id_unique" UNIQUE("workspaceId","brandId","id"),
	CONSTRAINT "external_attempts_stepId_attemptNumber_unique" UNIQUE("stepId","attemptNumber")
);
--> statement-breakpoint
CREATE TABLE "external_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"authorizationId" text NOT NULL,
	"operationKey" text NOT NULL,
	"subjectKind" text NOT NULL,
	"subjectId" text NOT NULL,
	"provider" text NOT NULL,
	"operation" text NOT NULL,
	"status" text NOT NULL,
	"claimedBy" text,
	"leaseNumber" integer DEFAULT 0 NOT NULL,
	"leaseUntil" timestamp with time zone,
	"blockedReason" text,
	"lastErrorCode" text,
	"createdAt" timestamp with time zone NOT NULL,
	"updatedAt" timestamp with time zone NOT NULL,
	CONSTRAINT "external_jobs_workspaceId_brandId_id_unique" UNIQUE("workspaceId","brandId","id"),
	CONSTRAINT "external_jobs_authorizationId_unique" UNIQUE("authorizationId"),
	CONSTRAINT "external_jobs_operationKey_unique" UNIQUE("operationKey")
);
--> statement-breakpoint
CREATE TABLE "external_steps" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"jobId" text NOT NULL,
	"ordinal" integer NOT NULL,
	"stepKey" text NOT NULL,
	"remoteTag" text NOT NULL,
	"status" text NOT NULL,
	"providerIds" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updatedAt" timestamp with time zone NOT NULL,
	CONSTRAINT "external_steps_workspaceId_brandId_id_unique" UNIQUE("workspaceId","brandId","id"),
	CONSTRAINT "external_steps_jobId_stepKey_unique" UNIQUE("jobId","stepKey"),
	CONSTRAINT "external_steps_jobId_ordinal_unique" UNIQUE("jobId","ordinal")
);
--> statement-breakpoint
CREATE TABLE "operation_authorizations" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"linkId" text NOT NULL,
	"operation" text NOT NULL,
	"subjectKind" text NOT NULL,
	"subjectId" text NOT NULL,
	"subjectVersionId" text NOT NULL,
	"summary" jsonb NOT NULL,
	"summaryFingerprint" text NOT NULL,
	"contentFingerprint" text NOT NULL,
	"status" text NOT NULL,
	"actorUserId" text NOT NULL,
	"idempotencyKey" text NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	"decidedAt" timestamp with time zone,
	"reservedJobId" text,
	CONSTRAINT "operation_authorizations_workspaceId_brandId_id_unique" UNIQUE("workspaceId","brandId","id"),
	CONSTRAINT "operation_authorizations_workspaceId_brandId_actorUserId_idempotencyKey_unique" UNIQUE("workspaceId","brandId","actorUserId","idempotencyKey")
);
--> statement-breakpoint
CREATE TABLE "worker_instances" (
	"id" text PRIMARY KEY NOT NULL,
	"host" text NOT NULL,
	"pid" integer NOT NULL,
	"startedAt" timestamp with time zone NOT NULL,
	"heartbeatAt" timestamp with time zone NOT NULL,
	"terminatedAt" timestamp with time zone,
	"terminationEvidence" jsonb
);
--> statement-breakpoint
ALTER TABLE "brand_capabilities" ADD CONSTRAINT "brand_capabilities_grantedBy_users_id_fk" FOREIGN KEY ("grantedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_capabilities" ADD CONSTRAINT "brand_capabilities_revokedBy_users_id_fk" FOREIGN KEY ("revokedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_capabilities" ADD CONSTRAINT "brand_capabilities_workspaceId_brandId_brands_workspaceId_id_fk" FOREIGN KEY ("workspaceId","brandId") REFERENCES "public"."brands"("workspaceId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_capabilities" ADD CONSTRAINT "brand_capabilities_workspaceId_userId_memberships_workspaceId_userId_fk" FOREIGN KEY ("workspaceId","userId") REFERENCES "public"."memberships"("workspaceId","userId") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_work_priorities" ADD CONSTRAINT "brand_work_priorities_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_work_priorities" ADD CONSTRAINT "brand_work_priorities_workspaceId_brandId_brands_workspaceId_id_fk" FOREIGN KEY ("workspaceId","brandId") REFERENCES "public"."brands"("workspaceId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connection_brand_links" ADD CONSTRAINT "connection_brand_links_linkedBy_users_id_fk" FOREIGN KEY ("linkedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connection_brand_links" ADD CONSTRAINT "connection_brand_links_workspaceId_brandId_brands_workspaceId_id_fk" FOREIGN KEY ("workspaceId","brandId") REFERENCES "public"."brands"("workspaceId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connection_brand_links" ADD CONSTRAINT "connection_brand_links_workspaceId_connectionId_connections_workspaceId_id_fk" FOREIGN KEY ("workspaceId","connectionId") REFERENCES "public"."connections"("workspaceId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connections" ADD CONSTRAINT "connections_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connections" ADD CONSTRAINT "connections_ownerUserId_users_id_fk" FOREIGN KEY ("ownerUserId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connections" ADD CONSTRAINT "connections_connectedBy_users_id_fk" FOREIGN KEY ("connectedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_attempt_outcomes" ADD CONSTRAINT "external_attempt_outcomes_workspaceId_brandId_attemptId_external_attempts_workspaceId_brandId_id_fk" FOREIGN KEY ("workspaceId","brandId","attemptId") REFERENCES "public"."external_attempts"("workspaceId","brandId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_attempts" ADD CONSTRAINT "external_attempts_workerInstanceId_worker_instances_id_fk" FOREIGN KEY ("workerInstanceId") REFERENCES "public"."worker_instances"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_attempts" ADD CONSTRAINT "external_attempts_workspaceId_brandId_stepId_external_steps_workspaceId_brandId_id_fk" FOREIGN KEY ("workspaceId","brandId","stepId") REFERENCES "public"."external_steps"("workspaceId","brandId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_jobs" ADD CONSTRAINT "external_jobs_claimedBy_worker_instances_id_fk" FOREIGN KEY ("claimedBy") REFERENCES "public"."worker_instances"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_jobs" ADD CONSTRAINT "external_jobs_workspaceId_brandId_authorizationId_operation_authorizations_workspaceId_brandId_id_fk" FOREIGN KEY ("workspaceId","brandId","authorizationId") REFERENCES "public"."operation_authorizations"("workspaceId","brandId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_steps" ADD CONSTRAINT "external_steps_workspaceId_brandId_jobId_external_jobs_workspaceId_brandId_id_fk" FOREIGN KEY ("workspaceId","brandId","jobId") REFERENCES "public"."external_jobs"("workspaceId","brandId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operation_authorizations" ADD CONSTRAINT "operation_authorizations_actorUserId_users_id_fk" FOREIGN KEY ("actorUserId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operation_authorizations" ADD CONSTRAINT "operation_authorizations_workspaceId_brandId_linkId_connection_brand_links_workspaceId_brandId_id_fk" FOREIGN KEY ("workspaceId","brandId","linkId") REFERENCES "public"."connection_brand_links"("workspaceId","brandId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "brand_capabilities_active_unique" ON "brand_capabilities" USING btree ("workspaceId","brandId","userId","capability") WHERE "revokedAt" IS NULL;--> statement-breakpoint
CREATE INDEX "brand_capabilities_workspaceId_brandId_index" ON "brand_capabilities" USING btree ("workspaceId","brandId");--> statement-breakpoint
CREATE INDEX "brand_work_priorities_workspaceId_brandId_createdAt_index" ON "brand_work_priorities" USING btree ("workspaceId","brandId","createdAt");--> statement-breakpoint
CREATE UNIQUE INDEX "connection_brand_links_active_account" ON "connection_brand_links" USING btree ("workspaceId","connectionId","externalAccountId") WHERE "unlinkedAt" IS NULL;--> statement-breakpoint
CREATE INDEX "connection_brand_links_workspaceId_brandId_index" ON "connection_brand_links" USING btree ("workspaceId","brandId");--> statement-breakpoint
CREATE INDEX "connections_workspaceId_provider_index" ON "connections" USING btree ("workspaceId","provider");--> statement-breakpoint
CREATE INDEX "external_attempt_outcomes_attemptId_index" ON "external_attempt_outcomes" USING btree ("attemptId");--> statement-breakpoint
CREATE INDEX "external_jobs_status_createdAt_index" ON "external_jobs" USING btree ("status","createdAt");--> statement-breakpoint
CREATE INDEX "external_jobs_workspaceId_brandId_subjectId_index" ON "external_jobs" USING btree ("workspaceId","brandId","subjectId");--> statement-breakpoint
CREATE INDEX "operation_authorizations_workspaceId_brandId_subjectId_index" ON "operation_authorizations" USING btree ("workspaceId","brandId","subjectId");--> statement-breakpoint
-- Phase 4 · block 2 guards (ADR-0030/0031/0033). States mirror the v1 JSON schemas (work-priority, brand-capability,
-- operation-authorization, external-job, external-attempt-outcome).
ALTER TABLE brand_capabilities ADD CONSTRAINT brand_capability_value CHECK (capability IN ('PUBLISH_SITE','PUBLISH_BRAND_KIT','AUTHORIZE_SPEND','MANAGE_CONNECTIONS','MANAGE_GUESTS'));
--> statement-breakpoint
ALTER TABLE brand_capabilities ADD CONSTRAINT brand_capability_revocation CHECK (("revokedAt" IS NULL) = ("revokedBy" IS NULL));
--> statement-breakpoint
ALTER TABLE brand_work_priorities ADD CONSTRAINT brand_work_priority_intent CHECK (intent IN ('STRATEGY_FULL','STRATEGY_POINT','MARKETING_PLAN','CAMPAIGN','CONTENT','WEBSITE','VISUAL_IDENTITY','SELL_OFFER','HELP_ME_CHOOSE'));
--> statement-breakpoint
ALTER TABLE brand_work_priorities ADD CONSTRAINT brand_work_priority_note CHECK (note IS NULL OR char_length(note) <= 500);
--> statement-breakpoint
ALTER TABLE connections ADD CONSTRAINT connection_provider CHECK (provider IN ('GOOGLE_ADS','META_ADS','CANVA'));
--> statement-breakpoint
ALTER TABLE connections ADD CONSTRAINT connection_status CHECK (status IN ('ACTIVE','EXPIRED','REVOKED','ERROR'));
--> statement-breakpoint
ALTER TABLE connections ADD CONSTRAINT connection_revoked_has_no_secret CHECK (status <> 'REVOKED' OR "credentialCiphertext" IS NULL);
--> statement-breakpoint
ALTER TABLE operation_authorizations ADD CONSTRAINT operation_authorization_operation CHECK (operation IN ('CREATE_PAUSED','ACTIVATE','PAUSE','UPDATE_BUDGET'));
--> statement-breakpoint
ALTER TABLE operation_authorizations ADD CONSTRAINT operation_authorization_status CHECK (status IN ('PENDING','AUTHORIZED','RESERVED','CONSUMED','CANCELLED','EXPIRED'));
--> statement-breakpoint
ALTER TABLE operation_authorizations ADD CONSTRAINT operation_authorization_reserved_job CHECK ((status IN ('RESERVED','CONSUMED')) = ("reservedJobId" IS NOT NULL) OR status IN ('CANCELLED','EXPIRED'));
--> statement-breakpoint
ALTER TABLE external_jobs ADD CONSTRAINT external_job_status CHECK (status IN ('QUEUED','CLAIMED','RUNNING','SUCCEEDED','FAILED','NEEDS_CHECK','PARTIAL','EXPIRED','CANCELLED'));
--> statement-breakpoint
ALTER TABLE external_jobs ADD CONSTRAINT external_job_lease CHECK ("leaseNumber" >= 0);
--> statement-breakpoint
ALTER TABLE external_steps ADD CONSTRAINT external_step_status CHECK (status IN ('PENDING','DISPATCHING','SUCCEEDED','REJECTED','NEEDS_CHECK','NOT_CREATED'));
--> statement-breakpoint
ALTER TABLE external_attempt_outcomes ADD CONSTRAINT external_attempt_outcome_kind CHECK (kind IN ('PROVIDER_SUCCESS','PROVIDER_REJECTED','AMBIGUOUS','NOT_SENT_DEADLINE','RECONCILED_FOUND','REMOTE_ABSENCE_CONFIRMED','EMIT_IMPOSSIBLE','LATE_RESULT'));
--> statement-breakpoint
-- Append-only records: the work-priority history and the per-attempt evidence are never updated, and are deleted only
-- inside an authorized Brand deletion recorded by the same transaction (brand_deletion_in_progress, migration 0015).
CREATE OR REPLACE FUNCTION preserve_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP = 'DELETE' THEN
  IF brand_deletion_in_progress(OLD."workspaceId", OLD."brandId") THEN RETURN OLD; END IF;
  RAISE EXCEPTION '% is append-only', TG_TABLE_NAME;
 END IF;
 RAISE EXCEPTION '% is append-only', TG_TABLE_NAME;
END $$;
--> statement-breakpoint
CREATE TRIGGER brand_work_priorities_append_only BEFORE UPDATE OR DELETE ON brand_work_priorities FOR EACH ROW EXECUTE FUNCTION preserve_append_only();
--> statement-breakpoint
CREATE TRIGGER external_attempts_append_only BEFORE UPDATE OR DELETE ON external_attempts FOR EACH ROW EXECUTE FUNCTION preserve_append_only();
--> statement-breakpoint
CREATE TRIGGER external_attempt_outcomes_append_only BEFORE UPDATE OR DELETE ON external_attempt_outcomes FOR EACH ROW EXECUTE FUNCTION preserve_append_only();