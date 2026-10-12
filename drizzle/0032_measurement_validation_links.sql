-- Block 8 (ADR-0031/0032): simulated measurement evidence for lead campaigns, cycle review → Validation experiment
-- links, and the LEADS objective for Meta campaigns. Additive: two new tables and a widened CHECK on a table that
-- only exists on this branch (0031).
CREATE TABLE "cycle_review_experiments" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"reviewId" text NOT NULL,
	"proposalIndex" integer NOT NULL,
	"experimentId" text NOT NULL,
	"mode" text NOT NULL,
	"campaignId" text,
	"campaignVersionId" text,
	"periodStart" text NOT NULL,
	"periodEnd" text NOT NULL,
	"createdBy" text NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	CONSTRAINT "cycle_review_experiments_reviewId_proposalIndex_unique" UNIQUE("reviewId","proposalIndex")
);
--> statement-breakpoint
CREATE TABLE "measurement_evidence" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"siteId" text NOT NULL,
	"publicationId" text NOT NULL,
	"measurementFingerprint" text NOT NULL,
	"source" text NOT NULL,
	"status" text NOT NULL,
	"recordedBy" text NOT NULL,
	"recordedAt" timestamp with time zone NOT NULL,
	"withdrawnAt" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "cycle_review_experiments" ADD CONSTRAINT "cycle_review_experiments_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cycle_review_experiments" ADD CONSTRAINT "cycle_review_experiments_workspaceId_brandId_brands_workspaceId_id_fk" FOREIGN KEY ("workspaceId","brandId") REFERENCES "public"."brands"("workspaceId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cycle_review_experiments" ADD CONSTRAINT "cycle_review_experiments_workspaceId_brandId_experimentId_experiments_workspaceId_brandId_id_fk" FOREIGN KEY ("workspaceId","brandId","experimentId") REFERENCES "public"."experiments"("workspaceId","brandId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "measurement_evidence" ADD CONSTRAINT "measurement_evidence_recordedBy_users_id_fk" FOREIGN KEY ("recordedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "measurement_evidence" ADD CONSTRAINT "measurement_evidence_workspaceId_brandId_siteId_sites_workspaceId_brandId_id_fk" FOREIGN KEY ("workspaceId","brandId","siteId") REFERENCES "public"."sites"("workspaceId","brandId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "measurement_evidence_siteId_recordedAt_index" ON "measurement_evidence" USING btree ("siteId","recordedAt");--> statement-breakpoint
ALTER TABLE campaigns DROP CONSTRAINT campaign_values;--> statement-breakpoint
ALTER TABLE campaigns ADD CONSTRAINT campaign_values CHECK (provider IN ('GOOGLE_ADS','META_ADS') AND objective IN ('SEARCH','TRAFFIC','LEADS') AND (objective <> 'LEADS' OR provider = 'META_ADS') AND status IN ('ACTIVE','ARCHIVED') AND "utmCampaign" ~ '^bp-[a-z0-9-]{3,60}$');--> statement-breakpoint
ALTER TABLE measurement_evidence ADD CONSTRAINT measurement_evidence_values CHECK (source IN ('SIMULATED','PROVIDER') AND status IN ('VERIFIED','WITHDRAWN') AND (status = 'VERIFIED') = ("withdrawnAt" IS NULL));--> statement-breakpoint
ALTER TABLE cycle_review_experiments ADD CONSTRAINT cycle_review_experiment_values CHECK (mode IN ('CREATED','LINKED') AND "proposalIndex" >= 0);--> statement-breakpoint
CREATE OR REPLACE FUNCTION guard_measurement_evidence() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP = 'DELETE' THEN
  IF brand_deletion_in_progress(OLD."workspaceId", OLD."brandId") THEN RETURN OLD; END IF;
  RAISE EXCEPTION 'measurement_evidence rows are kept';
 END IF;
 IF NOT (OLD.status = 'VERIFIED' AND NEW.status = 'WITHDRAWN') THEN RAISE EXCEPTION 'measurement evidence transition % -> % is not allowed', OLD.status, NEW.status; END IF;
 IF (to_jsonb(NEW) - 'status' - 'withdrawnAt') IS DISTINCT FROM (to_jsonb(OLD) - 'status' - 'withdrawnAt') THEN RAISE EXCEPTION 'measurement evidence identity is immutable'; END IF;
 RETURN NEW;
END $$;--> statement-breakpoint
CREATE TRIGGER measurement_evidence_guard BEFORE UPDATE OR DELETE ON measurement_evidence FOR EACH ROW EXECUTE FUNCTION guard_measurement_evidence();--> statement-breakpoint
CREATE TRIGGER cycle_review_experiments_guard BEFORE UPDATE OR DELETE ON cycle_review_experiments FOR EACH ROW EXECUTE FUNCTION guard_block8_append_only();
