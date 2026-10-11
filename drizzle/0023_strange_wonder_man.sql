CREATE TABLE "brand_kit_approvals" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"kitId" text NOT NULL,
	"versionId" text NOT NULL,
	"fingerprint" text NOT NULL,
	"decision" text NOT NULL,
	"criterion" text NOT NULL,
	"supersededVersionId" text,
	"actorId" text NOT NULL,
	"idempotencyKey" text NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	CONSTRAINT "brand_kit_approvals_workspaceId_brandId_actorId_idempotencyKey_unique" UNIQUE("workspaceId","brandId","actorId","idempotencyKey")
);
--> statement-breakpoint
CREATE TABLE "brand_kit_publications" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"kitId" text NOT NULL,
	"versionId" text NOT NULL,
	"fingerprint" text NOT NULL,
	"actorId" text NOT NULL,
	"idempotencyKey" text NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	CONSTRAINT "brand_kit_publications_workspaceId_brandId_actorId_idempotencyKey_unique" UNIQUE("workspaceId","brandId","actorId","idempotencyKey")
);
--> statement-breakpoint
CREATE TABLE "brand_kit_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"kitId" text NOT NULL,
	"sequence" integer NOT NULL,
	"previousVersionId" text,
	"entry" text NOT NULL,
	"status" text NOT NULL,
	"content" jsonb NOT NULL,
	"fingerprint" text NOT NULL,
	"adoptions" jsonb NOT NULL,
	"createdBy" text NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	"submittedAt" timestamp with time zone,
	"decidedBy" text,
	"decidedAt" timestamp with time zone,
	"decisionCriterion" text,
	CONSTRAINT "brand_kit_versions_workspaceId_brandId_id_unique" UNIQUE("workspaceId","brandId","id"),
	CONSTRAINT "brand_kit_versions_kitId_sequence_unique" UNIQUE("kitId","sequence")
);
--> statement-breakpoint
CREATE TABLE "brand_kits" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"draftVersionId" text,
	"approvedVersionId" text,
	"publishedVersionId" text,
	"revision" integer DEFAULT 0 NOT NULL,
	"createdBy" text NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	"updatedAt" timestamp with time zone NOT NULL,
	CONSTRAINT "brand_kits_workspaceId_brandId_id_unique" UNIQUE("workspaceId","brandId","id"),
	CONSTRAINT "brand_kits_workspaceId_brandId_unique" UNIQUE("workspaceId","brandId")
);
--> statement-breakpoint
CREATE TABLE "kit_assets" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"role" text NOT NULL,
	"originalName" text NOT NULL,
	"format" text NOT NULL,
	"mediaType" text NOT NULL,
	"bytes" integer NOT NULL,
	"sha256" text NOT NULL,
	"width" integer,
	"height" integer,
	"alpha" boolean,
	"storageKey" text NOT NULL,
	"rights" text NOT NULL,
	"createdBy" text NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	CONSTRAINT "kit_assets_workspaceId_brandId_id_unique" UNIQUE("workspaceId","brandId","id"),
	CONSTRAINT "kit_assets_workspaceId_brandId_sha256_unique" UNIQUE("workspaceId","brandId","sha256")
);
--> statement-breakpoint
ALTER TABLE "brand_kit_approvals" ADD CONSTRAINT "brand_kit_approvals_actorId_users_id_fk" FOREIGN KEY ("actorId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_kit_approvals" ADD CONSTRAINT "brand_kit_approvals_workspaceId_brandId_versionId_brand_kit_versions_workspaceId_brandId_id_fk" FOREIGN KEY ("workspaceId","brandId","versionId") REFERENCES "public"."brand_kit_versions"("workspaceId","brandId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_kit_publications" ADD CONSTRAINT "brand_kit_publications_actorId_users_id_fk" FOREIGN KEY ("actorId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_kit_publications" ADD CONSTRAINT "brand_kit_publications_workspaceId_brandId_versionId_brand_kit_versions_workspaceId_brandId_id_fk" FOREIGN KEY ("workspaceId","brandId","versionId") REFERENCES "public"."brand_kit_versions"("workspaceId","brandId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_kit_versions" ADD CONSTRAINT "brand_kit_versions_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_kit_versions" ADD CONSTRAINT "brand_kit_versions_decidedBy_users_id_fk" FOREIGN KEY ("decidedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_kit_versions" ADD CONSTRAINT "brand_kit_versions_workspaceId_brandId_kitId_brand_kits_workspaceId_brandId_id_fk" FOREIGN KEY ("workspaceId","brandId","kitId") REFERENCES "public"."brand_kits"("workspaceId","brandId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_kits" ADD CONSTRAINT "brand_kits_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_kits" ADD CONSTRAINT "brand_kits_workspaceId_brandId_brands_workspaceId_id_fk" FOREIGN KEY ("workspaceId","brandId") REFERENCES "public"."brands"("workspaceId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kit_assets" ADD CONSTRAINT "kit_assets_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kit_assets" ADD CONSTRAINT "kit_assets_workspaceId_brandId_brands_workspaceId_id_fk" FOREIGN KEY ("workspaceId","brandId") REFERENCES "public"."brands"("workspaceId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "brand_kit_versions_workspaceId_brandId_kitId_index" ON "brand_kit_versions" USING btree ("workspaceId","brandId","kitId");--> statement-breakpoint
CREATE INDEX "kit_assets_workspaceId_brandId_index" ON "kit_assets" USING btree ("workspaceId","brandId");--> statement-breakpoint
-- ADR-0034 · brand kit guards: versions move forward only and are frozen out of DRAFT; approvals, publications and
-- uploaded originals are append-only (removed only by the registered brand deletion of ADR-0029).
ALTER TABLE brand_kit_versions ADD CONSTRAINT brand_kit_version_status CHECK (status IN ('DRAFT','IN_REVIEW','CHANGES_REQUESTED','APPROVED','SUPERSEDED'));
--> statement-breakpoint
ALTER TABLE brand_kit_versions ADD CONSTRAINT brand_kit_version_entry CHECK (entry IN ('INGEST','COMPLETE','CREATE'));
--> statement-breakpoint
ALTER TABLE brand_kit_versions ADD CONSTRAINT brand_kit_version_fingerprint CHECK (fingerprint ~ '^[a-f0-9]{64}$');
--> statement-breakpoint
ALTER TABLE brand_kit_approvals ADD CONSTRAINT brand_kit_approval_decision CHECK (decision IN ('APPROVE','REQUEST_CHANGES'));
--> statement-breakpoint
ALTER TABLE kit_assets ADD CONSTRAINT kit_asset_format CHECK (format IN ('PNG','JPEG','WEBP','SVG','PDF','TTF','OTF','WOFF','WOFF2'));
--> statement-breakpoint
ALTER TABLE kit_assets ADD CONSTRAINT kit_asset_role CHECK (role IN ('LOGO','MANUAL','FONT','REFERENCE','DESIGNER_DELIVERY'));
--> statement-breakpoint
ALTER TABLE kit_assets ADD CONSTRAINT kit_asset_rights CHECK (rights IN ('UNKNOWN','DECLARED_OWNED','LICENSED'));
--> statement-breakpoint
ALTER TABLE kit_assets ADD CONSTRAINT kit_asset_sha CHECK (sha256 ~ '^[a-f0-9]{64}$');
--> statement-breakpoint
CREATE OR REPLACE FUNCTION preserve_brand_kit_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP = 'DELETE' THEN
  IF brand_deletion_in_progress(OLD."workspaceId", OLD."brandId") THEN RETURN OLD; END IF;
  RAISE EXCEPTION 'brand kit versions cannot be deleted';
 END IF;
 IF OLD.status <> 'DRAFT' AND (NEW.content IS DISTINCT FROM OLD.content OR NEW.fingerprint IS DISTINCT FROM OLD.fingerprint OR NEW.adoptions IS DISTINCT FROM OLD.adoptions) THEN
  RAISE EXCEPTION 'A version out of DRAFT is immutable';
 END IF;
 IF NEW."kitId" IS DISTINCT FROM OLD."kitId" OR NEW.sequence IS DISTINCT FROM OLD.sequence OR NEW.entry IS DISTINCT FROM OLD.entry OR NEW."workspaceId" IS DISTINCT FROM OLD."workspaceId" OR NEW."brandId" IS DISTINCT FROM OLD."brandId" OR NEW."createdBy" IS DISTINCT FROM OLD."createdBy" OR NEW."previousVersionId" IS DISTINCT FROM OLD."previousVersionId" THEN
  RAISE EXCEPTION 'Version identity is immutable';
 END IF;
 IF NEW.status IS DISTINCT FROM OLD.status AND NOT (
  (OLD.status = 'DRAFT' AND NEW.status = 'IN_REVIEW') OR
  (OLD.status = 'IN_REVIEW' AND NEW.status IN ('APPROVED','CHANGES_REQUESTED')) OR
  (OLD.status = 'APPROVED' AND NEW.status = 'SUPERSEDED')) THEN
  RAISE EXCEPTION 'Editorial transition % -> % is not allowed', OLD.status, NEW.status;
 END IF;
 IF OLD."decidedAt" IS NOT NULL AND (NEW."decidedBy" IS DISTINCT FROM OLD."decidedBy" OR NEW."decidedAt" IS DISTINCT FROM OLD."decidedAt" OR NEW."decisionCriterion" IS DISTINCT FROM OLD."decisionCriterion") THEN
  RAISE EXCEPTION 'A recorded decision is immutable';
 END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER brand_kit_versions_preserve BEFORE UPDATE OR DELETE ON brand_kit_versions FOR EACH ROW EXECUTE FUNCTION preserve_brand_kit_version();
--> statement-breakpoint
CREATE TRIGGER brand_kit_approvals_append_only BEFORE UPDATE OR DELETE ON brand_kit_approvals FOR EACH ROW EXECUTE FUNCTION preserve_append_only();
--> statement-breakpoint
CREATE TRIGGER brand_kit_publications_append_only BEFORE UPDATE OR DELETE ON brand_kit_publications FOR EACH ROW EXECUTE FUNCTION preserve_append_only();
--> statement-breakpoint
CREATE TRIGGER kit_assets_append_only BEFORE UPDATE OR DELETE ON kit_assets FOR EACH ROW EXECUTE FUNCTION preserve_append_only();
