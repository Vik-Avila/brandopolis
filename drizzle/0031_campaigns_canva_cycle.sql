-- Block 8 (ADR-0031): campaigns with editorial versions, append-only metrics with their source, Canva designs linked to
-- deliverable versions and human cycle reviews. Additive: new tables only.
CREATE TABLE "campaign_approvals" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"campaignId" text NOT NULL,
	"versionId" text NOT NULL,
	"fingerprint" text NOT NULL,
	"decision" text NOT NULL,
	"criterion" text NOT NULL,
	"actorId" text NOT NULL,
	"supersededVersionId" text,
	"idempotencyKey" text NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	CONSTRAINT "campaign_approvals_workspaceId_brandId_actorId_idempotencyKey_unique" UNIQUE("workspaceId","brandId","actorId","idempotencyKey")
);
--> statement-breakpoint
CREATE TABLE "campaign_metrics" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"campaignId" text NOT NULL,
	"jobId" text,
	"source" text NOT NULL,
	"providerStatus" text,
	"reviewStatus" text,
	"periodStart" text NOT NULL,
	"periodEnd" text NOT NULL,
	"currency" text NOT NULL,
	"spendMinor" integer,
	"impressions" integer,
	"clicks" integer,
	"providerConversions" integer,
	"recordedAt" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"campaignId" text NOT NULL,
	"sequence" integer NOT NULL,
	"previousVersionId" text,
	"status" text NOT NULL,
	"content" jsonb NOT NULL,
	"fingerprint" text NOT NULL,
	"manifest" jsonb NOT NULL,
	"provenance" text NOT NULL,
	"createdBy" text NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	"submittedAt" timestamp with time zone,
	"decidedBy" text,
	"decidedAt" timestamp with time zone,
	"decisionCriterion" text,
	CONSTRAINT "campaign_versions_workspaceId_brandId_id_unique" UNIQUE("workspaceId","brandId","id"),
	CONSTRAINT "campaign_versions_campaignId_sequence_unique" UNIQUE("campaignId","sequence")
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"provider" text NOT NULL,
	"name" text NOT NULL,
	"objective" text NOT NULL,
	"utmCampaign" text NOT NULL,
	"status" text NOT NULL,
	"draftVersionId" text,
	"approvedVersionId" text,
	"revision" integer DEFAULT 0 NOT NULL,
	"createdBy" text NOT NULL,
	"idempotencyKey" text NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	"updatedAt" timestamp with time zone NOT NULL,
	CONSTRAINT "campaigns_workspaceId_brandId_id_unique" UNIQUE("workspaceId","brandId","id"),
	CONSTRAINT "campaigns_workspaceId_brandId_createdBy_idempotencyKey_unique" UNIQUE("workspaceId","brandId","createdBy","idempotencyKey"),
	CONSTRAINT "campaigns_workspaceId_brandId_utmCampaign_unique" UNIQUE("workspaceId","brandId","utmCampaign")
);
--> statement-breakpoint
CREATE TABLE "canva_designs" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"deliverableId" text NOT NULL,
	"sourceVersionId" text NOT NULL,
	"connectionId" text NOT NULL,
	"designRef" text NOT NULL,
	"simulated" boolean NOT NULL,
	"status" text NOT NULL,
	"retrievedVersionId" text,
	"createdBy" text NOT NULL,
	"idempotencyKey" text NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	"retrievedAt" timestamp with time zone,
	CONSTRAINT "canva_designs_workspaceId_brandId_createdBy_idempotencyKey_unique" UNIQUE("workspaceId","brandId","createdBy","idempotencyKey")
);
--> statement-breakpoint
CREATE TABLE "cycle_reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"periodStart" text NOT NULL,
	"periodEnd" text NOT NULL,
	"results" jsonb NOT NULL,
	"limitations" jsonb NOT NULL,
	"learnings" text NOT NULL,
	"proposals" jsonb NOT NULL,
	"decision" text NOT NULL,
	"criterion" text NOT NULL,
	"createdBy" text NOT NULL,
	"idempotencyKey" text NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	CONSTRAINT "cycle_reviews_workspaceId_brandId_createdBy_idempotencyKey_unique" UNIQUE("workspaceId","brandId","createdBy","idempotencyKey")
);
--> statement-breakpoint
ALTER TABLE "campaign_approvals" ADD CONSTRAINT "campaign_approvals_actorId_users_id_fk" FOREIGN KEY ("actorId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_approvals" ADD CONSTRAINT "campaign_approvals_workspaceId_brandId_versionId_campaign_versions_workspaceId_brandId_id_fk" FOREIGN KEY ("workspaceId","brandId","versionId") REFERENCES "public"."campaign_versions"("workspaceId","brandId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_metrics" ADD CONSTRAINT "campaign_metrics_workspaceId_brandId_campaignId_campaigns_workspaceId_brandId_id_fk" FOREIGN KEY ("workspaceId","brandId","campaignId") REFERENCES "public"."campaigns"("workspaceId","brandId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_versions" ADD CONSTRAINT "campaign_versions_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_versions" ADD CONSTRAINT "campaign_versions_decidedBy_users_id_fk" FOREIGN KEY ("decidedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_versions" ADD CONSTRAINT "campaign_versions_workspaceId_brandId_campaignId_campaigns_workspaceId_brandId_id_fk" FOREIGN KEY ("workspaceId","brandId","campaignId") REFERENCES "public"."campaigns"("workspaceId","brandId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_workspaceId_brandId_brands_workspaceId_id_fk" FOREIGN KEY ("workspaceId","brandId") REFERENCES "public"."brands"("workspaceId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canva_designs" ADD CONSTRAINT "canva_designs_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canva_designs" ADD CONSTRAINT "canva_designs_workspaceId_brandId_brands_workspaceId_id_fk" FOREIGN KEY ("workspaceId","brandId") REFERENCES "public"."brands"("workspaceId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cycle_reviews" ADD CONSTRAINT "cycle_reviews_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cycle_reviews" ADD CONSTRAINT "cycle_reviews_workspaceId_brandId_brands_workspaceId_id_fk" FOREIGN KEY ("workspaceId","brandId") REFERENCES "public"."brands"("workspaceId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "campaign_metrics_campaignId_recordedAt_index" ON "campaign_metrics" USING btree ("campaignId","recordedAt");--> statement-breakpoint
ALTER TABLE campaigns ADD CONSTRAINT campaign_values CHECK (provider IN ('GOOGLE_ADS','META_ADS') AND objective IN ('SEARCH','TRAFFIC') AND status IN ('ACTIVE','ARCHIVED') AND "utmCampaign" ~ '^bp-[a-z0-9-]{3,60}$');--> statement-breakpoint
ALTER TABLE campaign_versions ADD CONSTRAINT campaign_version_values CHECK (status IN ('DRAFT','IN_REVIEW','APPROVED','CHANGES_REQUESTED','SUPERSEDED') AND provenance IN ('MANUAL','AI_ASSISTED'));--> statement-breakpoint
ALTER TABLE campaign_approvals ADD CONSTRAINT campaign_approval_values CHECK (decision IN ('APPROVE','REQUEST_CHANGES') AND length(criterion) >= 10);--> statement-breakpoint
ALTER TABLE campaign_metrics ADD CONSTRAINT campaign_metric_values CHECK (source IN ('SIMULATED','PROVIDER') AND (("spendMinor" IS NULL) OR "spendMinor" >= 0));--> statement-breakpoint
ALTER TABLE canva_designs ADD CONSTRAINT canva_design_values CHECK (status IN ('CREATED','RETRIEVED'));--> statement-breakpoint
ALTER TABLE cycle_reviews ADD CONSTRAINT cycle_review_values CHECK (decision IN ('MAINTAIN','ADJUST','RETEST') AND length(criterion) >= 10);--> statement-breakpoint
CREATE OR REPLACE FUNCTION guard_campaign_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP = 'DELETE' THEN
  IF brand_deletion_in_progress(OLD."workspaceId", OLD."brandId") THEN RETURN OLD; END IF;
  RAISE EXCEPTION 'campaign_versions rows are kept';
 END IF;
 IF OLD.status = 'DRAFT' AND NEW.status = 'DRAFT' THEN
  IF (to_jsonb(NEW) - 'content' - 'fingerprint' - 'manifest' - 'provenance') IS DISTINCT FROM (to_jsonb(OLD) - 'content' - 'fingerprint' - 'manifest' - 'provenance') THEN RAISE EXCEPTION 'campaign draft identity is immutable'; END IF;
  RETURN NEW;
 END IF;
 IF NOT ((OLD.status = 'DRAFT' AND NEW.status = 'IN_REVIEW') OR (OLD.status = 'IN_REVIEW' AND NEW.status IN ('APPROVED','CHANGES_REQUESTED')) OR (OLD.status = 'APPROVED' AND NEW.status = 'SUPERSEDED')) THEN RAISE EXCEPTION 'campaign version transition % -> % is not allowed', OLD.status, NEW.status; END IF;
 IF (to_jsonb(NEW) - 'status' - 'submittedAt' - 'decidedBy' - 'decidedAt' - 'decisionCriterion') IS DISTINCT FROM (to_jsonb(OLD) - 'status' - 'submittedAt' - 'decidedBy' - 'decidedAt' - 'decisionCriterion') THEN RAISE EXCEPTION 'campaign version content is immutable once it leaves DRAFT'; END IF;
 RETURN NEW;
END $$;--> statement-breakpoint
CREATE TRIGGER campaign_versions_guard BEFORE UPDATE OR DELETE ON campaign_versions FOR EACH ROW EXECUTE FUNCTION guard_campaign_version();--> statement-breakpoint
CREATE OR REPLACE FUNCTION guard_block8_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP = 'DELETE' AND brand_deletion_in_progress(OLD."workspaceId", OLD."brandId") THEN RETURN OLD; END IF;
 RAISE EXCEPTION '% rows are append-only', TG_TABLE_NAME;
END $$;--> statement-breakpoint
CREATE TRIGGER campaign_approvals_guard BEFORE UPDATE OR DELETE ON campaign_approvals FOR EACH ROW EXECUTE FUNCTION guard_block8_append_only();--> statement-breakpoint
CREATE TRIGGER campaign_metrics_guard BEFORE UPDATE OR DELETE ON campaign_metrics FOR EACH ROW EXECUTE FUNCTION guard_block8_append_only();--> statement-breakpoint
CREATE TRIGGER cycle_reviews_guard BEFORE UPDATE OR DELETE ON cycle_reviews FOR EACH ROW EXECUTE FUNCTION guard_block8_append_only();--> statement-breakpoint
CREATE OR REPLACE FUNCTION guard_canva_design() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP = 'DELETE' THEN
  IF brand_deletion_in_progress(OLD."workspaceId", OLD."brandId") THEN RETURN OLD; END IF;
  RAISE EXCEPTION 'canva_designs rows are kept';
 END IF;
 IF NOT (OLD.status = 'CREATED' AND NEW.status = 'RETRIEVED') THEN RAISE EXCEPTION 'canva design transition % -> % is not allowed', OLD.status, NEW.status; END IF;
 IF (to_jsonb(NEW) - 'status' - 'retrievedVersionId' - 'retrievedAt') IS DISTINCT FROM (to_jsonb(OLD) - 'status' - 'retrievedVersionId' - 'retrievedAt') THEN RAISE EXCEPTION 'canva design identity is immutable'; END IF;
 RETURN NEW;
END $$;--> statement-breakpoint
CREATE TRIGGER canva_designs_guard BEFORE UPDATE OR DELETE ON canva_designs FOR EACH ROW EXECUTE FUNCTION guard_canva_design();
