CREATE TYPE "public"."dependency_kind" AS ENUM('HARD', 'SOFT', 'INFORMATIVE');--> statement-breakpoint
CREATE TYPE "public"."question_state" AS ENUM('OPEN', 'IN_ANALYSIS', 'READY_FOR_DECISION', 'DECIDED', 'REOPENED');--> statement-breakpoint
CREATE TYPE "public"."review_item_state" AS ENUM('OPEN', 'REVIEW_SUGGESTED', 'COMPLETED');--> statement-breakpoint
CREATE TYPE "public"."decision_review_state" AS ENUM('APPROVED', 'NEEDS_REVIEW', 'INVALIDATED');--> statement-breakpoint
CREATE TYPE "public"."version_state" AS ENUM('APPROVED', 'SUPERSEDED');--> statement-breakpoint
CREATE TABLE "brand_assignments" (
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"userId" text NOT NULL,
	CONSTRAINT "brand_assignments_workspaceId_brandId_userId_pk" PRIMARY KEY("workspaceId","brandId","userId")
);
--> statement-breakpoint
CREATE TABLE "strategic_audit" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"actorUserId" text NOT NULL,
	"decisionId" text,
	"previousVersion" text,
	"newVersion" text,
	"operation" text NOT NULL,
	"idempotencyKey" text NOT NULL,
	"rationale" text,
	"sourceRecommendationId" text,
	"occurredAt" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brands" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"name" text NOT NULL,
	"dataClass" text DEFAULT 'DEMO' NOT NULL,
	CONSTRAINT "brands_workspaceId_id_unique" UNIQUE("workspaceId","id")
);
--> statement-breakpoint
CREATE TABLE "decisions" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"questionId" text NOT NULL,
	"activeVersionId" text,
	"reviewStatus" "decision_review_state" NOT NULL,
	CONSTRAINT "decisions_workspaceId_brandId_id_unique" UNIQUE("workspaceId","brandId","id"),
	CONSTRAINT "decisions_workspaceId_brandId_questionId_unique" UNIQUE("workspaceId","brandId","questionId")
);
--> statement-breakpoint
CREATE TABLE "dependencies" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"upstreamDecisionId" text NOT NULL,
	"downstreamDecisionId" text NOT NULL,
	"kind" "dependency_kind" NOT NULL,
	"reason" text NOT NULL,
	"ruleVersion" text NOT NULL,
	CONSTRAINT "dependencies_workspaceId_brandId_upstreamDecisionId_downstreamDecisionId_ruleVersion_unique" UNIQUE("workspaceId","brandId","upstreamDecisionId","downstreamDecisionId","ruleVersion")
);
--> statement-breakpoint
CREATE TABLE "idempotency" (
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"actorUserId" text NOT NULL,
	"command" text NOT NULL,
	"key" text NOT NULL,
	"fingerprint" text NOT NULL,
	"result" jsonb NOT NULL,
	CONSTRAINT "idempotency_workspaceId_brandId_actorUserId_command_key_pk" PRIMARY KEY("workspaceId","brandId","actorUserId","command","key")
);
--> statement-breakpoint
CREATE TABLE "impacts" (
	"triggerVersionId" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"status" text NOT NULL,
	"result" jsonb,
	"attempts" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"workspaceId" text NOT NULL,
	"userId" text NOT NULL,
	"role" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"canCreateBrand" boolean DEFAULT false NOT NULL,
	CONSTRAINT "memberships_workspaceId_userId_pk" PRIMARY KEY("workspaceId","userId")
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"module" text NOT NULL,
	"text" text NOT NULL,
	"status" "question_state" NOT NULL,
	CONSTRAINT "questions_workspaceId_brandId_id_unique" UNIQUE("workspaceId","brandId","id"),
	CONSTRAINT "questions_workspaceId_brandId_module_unique" UNIQUE("workspaceId","brandId","module")
);
--> statement-breakpoint
CREATE TABLE "recommendations" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"questionId" text NOT NULL,
	"payload" jsonb NOT NULL,
	"contextVersion" text NOT NULL,
	"resolution" text DEFAULT 'GENERATED' NOT NULL,
	CONSTRAINT "recommendations_workspaceId_brandId_id_unique" UNIQUE("workspaceId","brandId","id")
);
--> statement-breakpoint
CREATE TABLE "review_receipts" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"actorUserId" text NOT NULL,
	"decisionId" text NOT NULL,
	"activeVersionId" text NOT NULL,
	"triggerFingerprint" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_items" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"triggerVersionId" text NOT NULL,
	"downstreamDecisionId" text NOT NULL,
	"dependencyType" "dependency_kind" NOT NULL,
	"status" "review_item_state" NOT NULL,
	"reason" text NOT NULL,
	"reviewedBy" text,
	"ruleVersion" text NOT NULL,
	CONSTRAINT "review_items_workspaceId_brandId_triggerVersionId_downstreamDecisionId_ruleVersion_unique" UNIQUE("workspaceId","brandId","triggerVersionId","downstreamDecisionId","ruleVersion")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"tokenHash" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"workspaceId" text NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "telemetry" (
	"eventId" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"payload" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE "decision_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"decisionId" text NOT NULL,
	"sequence" integer NOT NULL,
	"selectedOption" text NOT NULL,
	"rationale" text NOT NULL,
	"actorUserId" text NOT NULL,
	"approvedAt" timestamp with time zone NOT NULL,
	"previousVersionId" text,
	"versionStatus" "version_state" NOT NULL,
	"hypothesisUsages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	CONSTRAINT "decision_versions_workspaceId_brandId_decisionId_id_unique" UNIQUE("workspaceId","brandId","decisionId","id"),
	CONSTRAINT "decision_versions_workspaceId_brandId_id_unique" UNIQUE("workspaceId","brandId","id"),
	CONSTRAINT "decision_versions_decisionId_sequence_unique" UNIQUE("decisionId","sequence")
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "brand_assignments" ADD CONSTRAINT "brand_assignments_workspaceId_brandId_brands_workspaceId_id_fk" FOREIGN KEY ("workspaceId","brandId") REFERENCES "public"."brands"("workspaceId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_assignments" ADD CONSTRAINT "brand_assignments_workspaceId_userId_memberships_workspaceId_userId_fk" FOREIGN KEY ("workspaceId","userId") REFERENCES "public"."memberships"("workspaceId","userId") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "strategic_audit" ADD CONSTRAINT "strategic_audit_actorUserId_users_id_fk" FOREIGN KEY ("actorUserId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "strategic_audit" ADD CONSTRAINT "strategic_audit_workspaceId_brandId_brands_workspaceId_id_fk" FOREIGN KEY ("workspaceId","brandId") REFERENCES "public"."brands"("workspaceId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brands" ADD CONSTRAINT "brands_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_workspaceId_brandId_questionId_questions_workspaceId_brandId_id_fk" FOREIGN KEY ("workspaceId","brandId","questionId") REFERENCES "public"."questions"("workspaceId","brandId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dependencies" ADD CONSTRAINT "dependencies_workspaceId_brandId_upstreamDecisionId_decisions_workspaceId_brandId_id_fk" FOREIGN KEY ("workspaceId","brandId","upstreamDecisionId") REFERENCES "public"."decisions"("workspaceId","brandId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dependencies" ADD CONSTRAINT "dependencies_workspaceId_brandId_downstreamDecisionId_decisions_workspaceId_brandId_id_fk" FOREIGN KEY ("workspaceId","brandId","downstreamDecisionId") REFERENCES "public"."decisions"("workspaceId","brandId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idempotency" ADD CONSTRAINT "idempotency_actorUserId_users_id_fk" FOREIGN KEY ("actorUserId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idempotency" ADD CONSTRAINT "idempotency_workspaceId_brandId_brands_workspaceId_id_fk" FOREIGN KEY ("workspaceId","brandId") REFERENCES "public"."brands"("workspaceId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "impacts" ADD CONSTRAINT "impacts_workspaceId_brandId_triggerVersionId_decision_versions_workspaceId_brandId_id_fk" FOREIGN KEY ("workspaceId","brandId","triggerVersionId") REFERENCES "public"."decision_versions"("workspaceId","brandId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_workspaceId_brandId_brands_workspaceId_id_fk" FOREIGN KEY ("workspaceId","brandId") REFERENCES "public"."brands"("workspaceId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_workspaceId_brandId_questionId_questions_workspaceId_brandId_id_fk" FOREIGN KEY ("workspaceId","brandId","questionId") REFERENCES "public"."questions"("workspaceId","brandId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_receipts" ADD CONSTRAINT "review_receipts_actorUserId_users_id_fk" FOREIGN KEY ("actorUserId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_receipts" ADD CONSTRAINT "review_receipts_workspaceId_brandId_decisionId_activeVersionId_decision_versions_workspaceId_brandId_decisionId_id_fk" FOREIGN KEY ("workspaceId","brandId","decisionId","activeVersionId") REFERENCES "public"."decision_versions"("workspaceId","brandId","decisionId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_items" ADD CONSTRAINT "review_items_reviewedBy_users_id_fk" FOREIGN KEY ("reviewedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_items" ADD CONSTRAINT "review_items_workspaceId_brandId_triggerVersionId_decision_versions_workspaceId_brandId_id_fk" FOREIGN KEY ("workspaceId","brandId","triggerVersionId") REFERENCES "public"."decision_versions"("workspaceId","brandId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_items" ADD CONSTRAINT "review_items_workspaceId_brandId_downstreamDecisionId_decisions_workspaceId_brandId_id_fk" FOREIGN KEY ("workspaceId","brandId","downstreamDecisionId") REFERENCES "public"."decisions"("workspaceId","brandId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_workspaceId_userId_memberships_workspaceId_userId_fk" FOREIGN KEY ("workspaceId","userId") REFERENCES "public"."memberships"("workspaceId","userId") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telemetry" ADD CONSTRAINT "telemetry_workspaceId_brandId_brands_workspaceId_id_fk" FOREIGN KEY ("workspaceId","brandId") REFERENCES "public"."brands"("workspaceId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_versions" ADD CONSTRAINT "decision_versions_actorUserId_users_id_fk" FOREIGN KEY ("actorUserId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_versions" ADD CONSTRAINT "decision_versions_workspaceId_brandId_decisionId_decisions_workspaceId_brandId_id_fk" FOREIGN KEY ("workspaceId","brandId","decisionId") REFERENCES "public"."decisions"("workspaceId","brandId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "strategic_audit_workspaceId_brandId_index" ON "strategic_audit" USING btree ("workspaceId","brandId");--> statement-breakpoint
CREATE INDEX "review_items_workspaceId_brandId_status_index" ON "review_items" USING btree ("workspaceId","brandId","status");