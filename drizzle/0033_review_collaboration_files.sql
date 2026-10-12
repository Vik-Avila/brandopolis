-- Owner review 2026-10-12 (PHASE4_SPEC §13, ADR-0036): approval circuit, comments per version, notifications, email
-- outbox, brand files (references, final art, templates), offer lineage, and the Performance Max / Meta messages
-- campaign types. Additive: six new tables, two nullable columns on offers and a widened CHECK on campaigns (both
-- tables only exist on this branch).
CREATE TABLE "approval_policies" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"subjectType" text NOT NULL,
	"defaultReviewerId" text,
	"allowSelfApproval" boolean NOT NULL,
	"clientStep" boolean NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"updatedBy" text NOT NULL,
	"updatedAt" timestamp with time zone NOT NULL,
	CONSTRAINT "approval_policies_workspaceId_brandId_subjectType_unique" UNIQUE("workspaceId","brandId","subjectType")
);
--> statement-breakpoint
CREATE TABLE "brand_files" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"purpose" text NOT NULL,
	"lineageId" text NOT NULL,
	"sequence" integer NOT NULL,
	"previousFileId" text,
	"deliverableId" text,
	"deliverableVersionId" text,
	"category" text,
	"originalName" text NOT NULL,
	"format" text NOT NULL,
	"mediaType" text NOT NULL,
	"bytes" integer NOT NULL,
	"sha256" text NOT NULL,
	"storageKey" text NOT NULL,
	"uploadedBy" text NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	"retiredAt" timestamp with time zone,
	CONSTRAINT "brand_files_workspaceId_brandId_id_unique" UNIQUE("workspaceId","brandId","id"),
	CONSTRAINT "brand_files_lineageId_sequence_unique" UNIQUE("lineageId","sequence")
);
--> statement-breakpoint
CREATE TABLE "email_outbox" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"template" text NOT NULL,
	"recipient" text NOT NULL,
	"relatedType" text NOT NULL,
	"relatedId" text NOT NULL,
	"payload" jsonb NOT NULL,
	"dedupeKey" text NOT NULL,
	"status" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"lastError" text,
	"nextAttemptAt" timestamp with time zone NOT NULL,
	"provider" text,
	"providerMessageId" text,
	"simulated" boolean NOT NULL,
	"createdBy" text NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	"updatedAt" timestamp with time zone NOT NULL,
	"sentAt" timestamp with time zone,
	CONSTRAINT "email_outbox_workspaceId_brandId_dedupeKey_unique" UNIQUE("workspaceId","brandId","dedupeKey")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"recipientId" text NOT NULL,
	"kind" text NOT NULL,
	"subjectType" text NOT NULL,
	"subjectId" text NOT NULL,
	"versionId" text,
	"actorId" text,
	"title" text NOT NULL,
	"dedupeKey" text NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	"readAt" timestamp with time zone,
	CONSTRAINT "notifications_recipientId_dedupeKey_unique" UNIQUE("recipientId","dedupeKey")
);
--> statement-breakpoint
CREATE TABLE "review_assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"subjectType" text NOT NULL,
	"subjectId" text NOT NULL,
	"versionId" text NOT NULL,
	"authorId" text NOT NULL,
	"reviewerId" text NOT NULL,
	"selfApproval" boolean NOT NULL,
	"assignedBy" text NOT NULL,
	"assignedAt" timestamp with time zone NOT NULL,
	"active" boolean NOT NULL,
	"closedAt" timestamp with time zone,
	"closeReason" text
);
--> statement-breakpoint
CREATE TABLE "review_comments" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"subjectType" text NOT NULL,
	"subjectId" text NOT NULL,
	"versionId" text NOT NULL,
	"authorId" text NOT NULL,
	"visibility" text NOT NULL,
	"body" text NOT NULL,
	"parentId" text,
	"mentions" jsonb NOT NULL,
	"idempotencyKey" text NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	CONSTRAINT "review_comments_workspaceId_brandId_authorId_idempotencyKey_unique" UNIQUE("workspaceId","brandId","authorId","idempotencyKey")
);
--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "derivedFromOfferId" text;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "derivedFromVersionId" text;--> statement-breakpoint
ALTER TABLE "approval_policies" ADD CONSTRAINT "approval_policies_defaultReviewerId_users_id_fk" FOREIGN KEY ("defaultReviewerId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_policies" ADD CONSTRAINT "approval_policies_updatedBy_users_id_fk" FOREIGN KEY ("updatedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_policies" ADD CONSTRAINT "approval_policies_workspaceId_brandId_brands_workspaceId_id_fk" FOREIGN KEY ("workspaceId","brandId") REFERENCES "public"."brands"("workspaceId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_files" ADD CONSTRAINT "brand_files_uploadedBy_users_id_fk" FOREIGN KEY ("uploadedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_files" ADD CONSTRAINT "brand_files_workspaceId_brandId_brands_workspaceId_id_fk" FOREIGN KEY ("workspaceId","brandId") REFERENCES "public"."brands"("workspaceId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_outbox" ADD CONSTRAINT "email_outbox_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_outbox" ADD CONSTRAINT "email_outbox_workspaceId_brandId_brands_workspaceId_id_fk" FOREIGN KEY ("workspaceId","brandId") REFERENCES "public"."brands"("workspaceId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipientId_users_id_fk" FOREIGN KEY ("recipientId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actorId_users_id_fk" FOREIGN KEY ("actorId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_workspaceId_brandId_brands_workspaceId_id_fk" FOREIGN KEY ("workspaceId","brandId") REFERENCES "public"."brands"("workspaceId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_assignments" ADD CONSTRAINT "review_assignments_authorId_users_id_fk" FOREIGN KEY ("authorId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_assignments" ADD CONSTRAINT "review_assignments_reviewerId_users_id_fk" FOREIGN KEY ("reviewerId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_assignments" ADD CONSTRAINT "review_assignments_assignedBy_users_id_fk" FOREIGN KEY ("assignedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_assignments" ADD CONSTRAINT "review_assignments_workspaceId_brandId_brands_workspaceId_id_fk" FOREIGN KEY ("workspaceId","brandId") REFERENCES "public"."brands"("workspaceId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_comments" ADD CONSTRAINT "review_comments_authorId_users_id_fk" FOREIGN KEY ("authorId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_comments" ADD CONSTRAINT "review_comments_workspaceId_brandId_brands_workspaceId_id_fk" FOREIGN KEY ("workspaceId","brandId") REFERENCES "public"."brands"("workspaceId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "brand_files_workspaceId_brandId_purpose_index" ON "brand_files" USING btree ("workspaceId","brandId","purpose");--> statement-breakpoint
CREATE INDEX "email_outbox_status_nextAttemptAt_index" ON "email_outbox" USING btree ("status","nextAttemptAt");--> statement-breakpoint
CREATE INDEX "notifications_recipientId_readAt_index" ON "notifications" USING btree ("recipientId","readAt");--> statement-breakpoint
CREATE UNIQUE INDEX "review_assignments_one_active" ON "review_assignments" USING btree ("versionId") WHERE active;--> statement-breakpoint
CREATE INDEX "review_assignments_workspaceId_brandId_reviewerId_index" ON "review_assignments" USING btree ("workspaceId","brandId","reviewerId");--> statement-breakpoint
CREATE INDEX "review_comments_workspaceId_brandId_subjectId_index" ON "review_comments" USING btree ("workspaceId","brandId","subjectId");--> statement-breakpoint
ALTER TABLE campaigns DROP CONSTRAINT campaign_values;--> statement-breakpoint
ALTER TABLE campaigns ADD CONSTRAINT campaign_values CHECK (provider IN ('GOOGLE_ADS','META_ADS') AND objective IN ('SEARCH','TRAFFIC','LEADS','PMAX','MESSAGES') AND (objective NOT IN ('LEADS','MESSAGES') OR provider = 'META_ADS') AND (objective <> 'PMAX' OR provider = 'GOOGLE_ADS') AND status IN ('ACTIVE','ARCHIVED') AND "utmCampaign" ~ '^bp-[a-z0-9-]{3,60}$');--> statement-breakpoint
ALTER TABLE approval_policies ADD CONSTRAINT approval_policy_values CHECK ("subjectType" IN ('OFFER','SALES_PRESENTATION','OFFER_COPY','SOCIAL_POST','AD','DESIGN_BRIEF') AND revision >= 0);--> statement-breakpoint
ALTER TABLE review_assignments ADD CONSTRAINT review_assignment_values CHECK ("subjectType" IN ('OFFER','SALES_PRESENTATION','OFFER_COPY','SOCIAL_POST','AD','DESIGN_BRIEF') AND "selfApproval" = ("reviewerId" = "authorId") AND (active = ("closedAt" IS NULL)) AND ("closeReason" IS NULL OR "closeReason" IN ('REASSIGNED','DECIDED')));--> statement-breakpoint
ALTER TABLE review_comments ADD CONSTRAINT review_comment_values CHECK (visibility IN ('INTERNAL','SHARED') AND length(body) BETWEEN 1 AND 2000 AND jsonb_typeof(mentions) = 'array');--> statement-breakpoint
ALTER TABLE notifications ADD CONSTRAINT notification_values CHECK (kind IN ('REVIEW_ASSIGNED','REVIEW_REASSIGNED','CHANGES_REQUESTED','APPROVED','COMMENT','MENTION','GUEST_COMMENT','GUEST_DECISION','EMAIL_FAILED'));--> statement-breakpoint
ALTER TABLE email_outbox ADD CONSTRAINT email_outbox_values CHECK (template IN ('GUEST_INVITATION') AND status IN ('QUEUED','SENDING','SENT','FAILED','CANCELLED') AND attempts >= 0 AND (status = 'SENT') = ("sentAt" IS NOT NULL));--> statement-breakpoint
ALTER TABLE brand_files ADD CONSTRAINT brand_file_values CHECK (purpose IN ('REFERENCE','FINAL_ART','TEMPLATE') AND sequence >= 1 AND bytes > 0 AND format IN ('PNG','JPEG','WEBP','PDF','PPTX','DOCX','XLSX') AND (purpose = 'TEMPLATE' OR "deliverableId" IS NOT NULL) AND (purpose <> 'TEMPLATE' OR "deliverableId" IS NULL));--> statement-breakpoint
CREATE TRIGGER review_comments_guard BEFORE UPDATE OR DELETE ON review_comments FOR EACH ROW EXECUTE FUNCTION guard_block8_append_only();--> statement-breakpoint
CREATE OR REPLACE FUNCTION guard_review_assignment() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP = 'DELETE' THEN
  IF brand_deletion_in_progress(OLD."workspaceId", OLD."brandId") THEN RETURN OLD; END IF;
  RAISE EXCEPTION 'review_assignments rows are kept';
 END IF;
 IF NOT (OLD.active AND NOT NEW.active) THEN RAISE EXCEPTION 'a review assignment only closes'; END IF;
 IF (to_jsonb(NEW) - 'active' - 'closedAt' - 'closeReason') IS DISTINCT FROM (to_jsonb(OLD) - 'active' - 'closedAt' - 'closeReason') THEN RAISE EXCEPTION 'review assignment identity is immutable'; END IF;
 RETURN NEW;
END $$;--> statement-breakpoint
CREATE TRIGGER review_assignments_guard BEFORE UPDATE OR DELETE ON review_assignments FOR EACH ROW EXECUTE FUNCTION guard_review_assignment();--> statement-breakpoint
CREATE OR REPLACE FUNCTION guard_brand_file() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP = 'DELETE' THEN
  IF brand_deletion_in_progress(OLD."workspaceId", OLD."brandId") THEN RETURN OLD; END IF;
  RAISE EXCEPTION 'brand_files rows are kept (retire instead)';
 END IF;
 IF OLD."retiredAt" IS NOT NULL OR (to_jsonb(NEW) - 'retiredAt') IS DISTINCT FROM (to_jsonb(OLD) - 'retiredAt') THEN RAISE EXCEPTION 'a brand file only gets retired'; END IF;
 RETURN NEW;
END $$;--> statement-breakpoint
CREATE TRIGGER brand_files_guard BEFORE UPDATE OR DELETE ON brand_files FOR EACH ROW EXECUTE FUNCTION guard_brand_file();
