CREATE TABLE "client_interactions" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"opportunityId" text NOT NULL,
	"kind" text NOT NULL,
	"attentionChannel" text NOT NULL,
	"acquisitionPlatform" text NOT NULL,
	"declaredOrigin" text,
	"utm" jsonb NOT NULL,
	"clickIds" jsonb NOT NULL,
	"landingPath" text,
	"referrerHost" text,
	"campaignStatus" text NOT NULL,
	"campaignCause" text,
	"eventId" text NOT NULL,
	"consent" jsonb,
	"occurredAt" timestamp with time zone,
	"receivedAt" timestamp with time zone NOT NULL,
	"createdAt" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_opportunities" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"status" text NOT NULL,
	"source" text NOT NULL,
	"formId" text,
	"personName" text NOT NULL,
	"contactEmail" text,
	"contactPhone" text,
	"need" text NOT NULL,
	"ownerUserId" text,
	"segmentId" text,
	"offerId" text,
	"nextAction" text,
	"nextActionDate" text,
	"receivedAt" timestamp with time zone NOT NULL,
	"captureScope" text NOT NULL,
	"captureKey" text NOT NULL,
	"captureFingerprint" text NOT NULL,
	"createdBy" text,
	"updatedBy" text,
	"createdAt" timestamp with time zone NOT NULL,
	"updatedAt" timestamp with time zone NOT NULL,
	CONSTRAINT "client_opportunities_workspaceId_brandId_id_unique" UNIQUE("workspaceId","brandId","id"),
	CONSTRAINT "client_opportunities_workspaceId_brandId_captureScope_captureKey_unique" UNIQUE("workspaceId","brandId","captureScope","captureKey")
);
--> statement-breakpoint
CREATE TABLE "client_opportunity_events" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"opportunityId" text NOT NULL,
	"kind" text NOT NULL,
	"actorId" text,
	"revision" integer NOT NULL,
	"detail" jsonb NOT NULL,
	"createdAt" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_segments" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"createdBy" text NOT NULL,
	"idempotencyKey" text NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	CONSTRAINT "client_segments_workspaceId_brandId_id_unique" UNIQUE("workspaceId","brandId","id"),
	CONSTRAINT "client_segments_workspaceId_brandId_name_unique" UNIQUE("workspaceId","brandId","name"),
	CONSTRAINT "client_segments_workspaceId_brandId_createdBy_idempotencyKey_unique" UNIQUE("workspaceId","brandId","createdBy","idempotencyKey")
);
--> statement-breakpoint
CREATE TABLE "lead_forms" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"publicId" text NOT NULL,
	"name" text NOT NULL,
	"segmentId" text,
	"status" text NOT NULL,
	"privacyNoticeVersion" text NOT NULL,
	"createdBy" text NOT NULL,
	"idempotencyKey" text NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	"disabledBy" text,
	"disabledAt" timestamp with time zone,
	CONSTRAINT "lead_forms_publicId_unique" UNIQUE("publicId"),
	CONSTRAINT "lead_forms_workspaceId_brandId_id_unique" UNIQUE("workspaceId","brandId","id"),
	CONSTRAINT "lead_forms_workspaceId_brandId_createdBy_idempotencyKey_unique" UNIQUE("workspaceId","brandId","createdBy","idempotencyKey")
);
--> statement-breakpoint
ALTER TABLE "client_interactions" ADD CONSTRAINT "client_interactions_workspaceId_brandId_brands_workspaceId_id_fk" FOREIGN KEY ("workspaceId","brandId") REFERENCES "public"."brands"("workspaceId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_interactions" ADD CONSTRAINT "client_interactions_workspaceId_brandId_opportunityId_client_opportunities_workspaceId_brandId_id_fk" FOREIGN KEY ("workspaceId","brandId","opportunityId") REFERENCES "public"."client_opportunities"("workspaceId","brandId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_opportunities" ADD CONSTRAINT "client_opportunities_ownerUserId_users_id_fk" FOREIGN KEY ("ownerUserId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_opportunities" ADD CONSTRAINT "client_opportunities_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_opportunities" ADD CONSTRAINT "client_opportunities_updatedBy_users_id_fk" FOREIGN KEY ("updatedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_opportunities" ADD CONSTRAINT "client_opportunities_workspaceId_brandId_brands_workspaceId_id_fk" FOREIGN KEY ("workspaceId","brandId") REFERENCES "public"."brands"("workspaceId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_opportunities" ADD CONSTRAINT "client_opportunities_workspaceId_brandId_formId_lead_forms_workspaceId_brandId_id_fk" FOREIGN KEY ("workspaceId","brandId","formId") REFERENCES "public"."lead_forms"("workspaceId","brandId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_opportunities" ADD CONSTRAINT "client_opportunities_workspaceId_brandId_segmentId_client_segments_workspaceId_brandId_id_fk" FOREIGN KEY ("workspaceId","brandId","segmentId") REFERENCES "public"."client_segments"("workspaceId","brandId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_opportunities" ADD CONSTRAINT "client_opportunities_workspaceId_brandId_offerId_offers_workspaceId_brandId_id_fk" FOREIGN KEY ("workspaceId","brandId","offerId") REFERENCES "public"."offers"("workspaceId","brandId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_opportunity_events" ADD CONSTRAINT "client_opportunity_events_actorId_users_id_fk" FOREIGN KEY ("actorId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_opportunity_events" ADD CONSTRAINT "client_opportunity_events_workspaceId_brandId_brands_workspaceId_id_fk" FOREIGN KEY ("workspaceId","brandId") REFERENCES "public"."brands"("workspaceId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_opportunity_events" ADD CONSTRAINT "client_opportunity_events_workspaceId_brandId_opportunityId_client_opportunities_workspaceId_brandId_id_fk" FOREIGN KEY ("workspaceId","brandId","opportunityId") REFERENCES "public"."client_opportunities"("workspaceId","brandId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_segments" ADD CONSTRAINT "client_segments_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_segments" ADD CONSTRAINT "client_segments_workspaceId_brandId_brands_workspaceId_id_fk" FOREIGN KEY ("workspaceId","brandId") REFERENCES "public"."brands"("workspaceId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_forms" ADD CONSTRAINT "lead_forms_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_forms" ADD CONSTRAINT "lead_forms_disabledBy_users_id_fk" FOREIGN KEY ("disabledBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_forms" ADD CONSTRAINT "lead_forms_workspaceId_brandId_brands_workspaceId_id_fk" FOREIGN KEY ("workspaceId","brandId") REFERENCES "public"."brands"("workspaceId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_forms" ADD CONSTRAINT "lead_forms_workspaceId_brandId_segmentId_client_segments_workspaceId_brandId_id_fk" FOREIGN KEY ("workspaceId","brandId","segmentId") REFERENCES "public"."client_segments"("workspaceId","brandId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "client_interactions_workspaceId_brandId_opportunityId_index" ON "client_interactions" USING btree ("workspaceId","brandId","opportunityId");--> statement-breakpoint
CREATE INDEX "client_opportunities_workspaceId_brandId_receivedAt_index" ON "client_opportunities" USING btree ("workspaceId","brandId","receivedAt");--> statement-breakpoint
CREATE INDEX "client_opportunity_events_workspaceId_brandId_opportunityId_index" ON "client_opportunity_events" USING btree ("workspaceId","brandId","opportunityId");--> statement-breakpoint
-- ADR-0035 guards. Opportunities: closed vocabularies; capture identity, origin and reception never change; every
-- change raises the revision by exactly one. Segments only deactivate; forms only disable, once. Interactions and
-- events are append-only. Rows disappear only inside a registered brand deletion (ADR-0029).
ALTER TABLE client_opportunities ADD CONSTRAINT client_opportunity_values CHECK (status IN ('NEW','IN_PROGRESS') AND source IN ('MANUAL','WEB_FORM') AND ((source = 'WEB_FORM') = ("formId" IS NOT NULL)) AND char_length("personName") BETWEEN 1 AND 160 AND char_length(need) BETWEEN 1 AND 2000 AND ("contactEmail" IS NULL OR char_length("contactEmail") <= 254) AND ("contactPhone" IS NULL OR char_length("contactPhone") <= 40) AND ("nextAction" IS NULL OR char_length("nextAction") <= 300) AND ("nextActionDate" IS NULL OR "nextActionDate" ~ '^\d{4}-\d{2}-\d{2}$') AND revision >= 0);--> statement-breakpoint
ALTER TABLE client_segments ADD CONSTRAINT client_segment_name CHECK (char_length(name) BETWEEN 1 AND 120);--> statement-breakpoint
ALTER TABLE lead_forms ADD CONSTRAINT lead_form_values CHECK (status IN ('ACTIVE','DISABLED') AND char_length(name) BETWEEN 1 AND 120 AND "publicId" ~ '^[A-Za-z0-9_-]{22}$' AND (status <> 'DISABLED' OR ("disabledBy" IS NOT NULL AND "disabledAt" IS NOT NULL)));--> statement-breakpoint
ALTER TABLE client_interactions ADD CONSTRAINT client_interaction_values CHECK (kind IN ('MANUAL_ENTRY','WEB_FORM_SUBMISSION') AND "attentionChannel" IN ('WEB_FORM','PHONE','EMAIL','IN_PERSON','WHATSAPP','SOCIAL','OTHER','UNKNOWN') AND "acquisitionPlatform" IN ('GOOGLE','META','TIKTOK','LINKEDIN','ORGANIC_SEARCH','REFERRAL','DIRECT','OTHER','UNKNOWN') AND "campaignStatus" IN ('UNIDENTIFIED','CAPTURED_UNVERIFIED') AND (("campaignStatus" = 'UNIDENTIFIED') = ("campaignCause" IS NOT NULL)) AND ("campaignCause" IS NULL OR "campaignCause" IN ('NO_REFERENCE','DECLARED_ONLY')));--> statement-breakpoint
ALTER TABLE client_opportunity_events ADD CONSTRAINT client_opportunity_event_kind CHECK (kind IN ('CREATED','REPLAYED_CAPTURE','ASSIGNED','UNASSIGNED','FOLLOW_UP_SET','FOLLOW_UP_CLEARED','STATUS_CHANGED','DETAILS_EDITED'));--> statement-breakpoint
CREATE OR REPLACE FUNCTION guard_client_opportunity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP = 'DELETE' THEN
  IF brand_deletion_in_progress(OLD."workspaceId", OLD."brandId") THEN RETURN OLD; END IF;
  RAISE EXCEPTION 'client_opportunities rows are kept';
 END IF;
 IF NEW.revision <> OLD.revision + 1 THEN RAISE EXCEPTION 'client opportunity revision must advance by one'; END IF;
 IF (to_jsonb(NEW) - 'revision' - 'status' - 'personName' - 'contactEmail' - 'contactPhone' - 'need' - 'ownerUserId' - 'segmentId' - 'offerId' - 'nextAction' - 'nextActionDate' - 'updatedBy' - 'updatedAt')
    IS DISTINCT FROM (to_jsonb(OLD) - 'revision' - 'status' - 'personName' - 'contactEmail' - 'contactPhone' - 'need' - 'ownerUserId' - 'segmentId' - 'offerId' - 'nextAction' - 'nextActionDate' - 'updatedBy' - 'updatedAt') THEN
  RAISE EXCEPTION 'client opportunity capture identity, origin and reception are immutable';
 END IF;
 RETURN NEW;
END $$;--> statement-breakpoint
CREATE TRIGGER client_opportunities_guard BEFORE UPDATE OR DELETE ON client_opportunities FOR EACH ROW EXECUTE FUNCTION guard_client_opportunity();--> statement-breakpoint
CREATE OR REPLACE FUNCTION guard_client_segment() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP = 'DELETE' THEN
  IF brand_deletion_in_progress(OLD."workspaceId", OLD."brandId") THEN RETURN OLD; END IF;
  RAISE EXCEPTION 'client_segments rows are kept';
 END IF;
 IF NOT OLD.active OR NEW.active OR (to_jsonb(NEW) - 'active') IS DISTINCT FROM (to_jsonb(OLD) - 'active') THEN
  RAISE EXCEPTION 'client segment only changes by deactivation';
 END IF;
 RETURN NEW;
END $$;--> statement-breakpoint
CREATE TRIGGER client_segments_guard BEFORE UPDATE OR DELETE ON client_segments FOR EACH ROW EXECUTE FUNCTION guard_client_segment();--> statement-breakpoint
CREATE OR REPLACE FUNCTION guard_lead_form() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP = 'DELETE' THEN
  IF brand_deletion_in_progress(OLD."workspaceId", OLD."brandId") THEN RETURN OLD; END IF;
  RAISE EXCEPTION 'lead_forms rows are kept';
 END IF;
 IF OLD.status <> 'ACTIVE' OR NEW.status <> 'DISABLED' OR (to_jsonb(NEW) - 'status' - 'disabledBy' - 'disabledAt') IS DISTINCT FROM (to_jsonb(OLD) - 'status' - 'disabledBy' - 'disabledAt') THEN
  RAISE EXCEPTION 'lead form only changes by being disabled';
 END IF;
 RETURN NEW;
END $$;--> statement-breakpoint
CREATE TRIGGER lead_forms_guard BEFORE UPDATE OR DELETE ON lead_forms FOR EACH ROW EXECUTE FUNCTION guard_lead_form();--> statement-breakpoint
CREATE TRIGGER client_interactions_append_only BEFORE UPDATE OR DELETE ON client_interactions FOR EACH ROW EXECUTE FUNCTION preserve_append_only();--> statement-breakpoint
CREATE TRIGGER client_opportunity_events_append_only BEFORE UPDATE OR DELETE ON client_opportunity_events FOR EACH ROW EXECUTE FUNCTION preserve_append_only();
