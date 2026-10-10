CREATE TABLE "offer_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"offerId" text NOT NULL,
	"sequence" integer NOT NULL,
	"previousVersionId" text,
	"status" text NOT NULL,
	"content" jsonb NOT NULL,
	"fingerprint" text NOT NULL,
	"createdBy" text NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	"submittedAt" timestamp with time zone,
	"decidedBy" text,
	"decidedAt" timestamp with time zone,
	"decisionCriterion" text,
	CONSTRAINT "offer_versions_workspaceId_brandId_id_unique" UNIQUE("workspaceId","brandId","id"),
	CONSTRAINT "offer_versions_offerId_sequence_unique" UNIQUE("offerId","sequence")
);
--> statement-breakpoint
CREATE TABLE "offers" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"status" text NOT NULL,
	"draftVersionId" text,
	"approvedVersionId" text,
	"revision" integer DEFAULT 0 NOT NULL,
	"createdBy" text NOT NULL,
	"idempotencyKey" text NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	"updatedAt" timestamp with time zone NOT NULL,
	CONSTRAINT "offers_workspaceId_brandId_id_unique" UNIQUE("workspaceId","brandId","id"),
	CONSTRAINT "offers_workspaceId_brandId_createdBy_idempotencyKey_unique" UNIQUE("workspaceId","brandId","createdBy","idempotencyKey")
);
--> statement-breakpoint
ALTER TABLE "offer_versions" ADD CONSTRAINT "offer_versions_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_versions" ADD CONSTRAINT "offer_versions_decidedBy_users_id_fk" FOREIGN KEY ("decidedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_versions" ADD CONSTRAINT "offer_versions_workspaceId_brandId_offerId_offers_workspaceId_brandId_id_fk" FOREIGN KEY ("workspaceId","brandId","offerId") REFERENCES "public"."offers"("workspaceId","brandId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_workspaceId_brandId_brands_workspaceId_id_fk" FOREIGN KEY ("workspaceId","brandId") REFERENCES "public"."brands"("workspaceId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "offer_versions_workspaceId_brandId_offerId_index" ON "offer_versions" USING btree ("workspaceId","brandId","offerId");--> statement-breakpoint
CREATE INDEX "offers_workspaceId_brandId_index" ON "offers" USING btree ("workspaceId","brandId");--> statement-breakpoint
-- ADR-0030 · offers. States mirror editorial-version v1; a version leaving DRAFT is frozen (content and fingerprint).
ALTER TABLE offers ADD CONSTRAINT offer_status CHECK (status IN ('ACTIVE','RETIRED'));
--> statement-breakpoint
ALTER TABLE offer_versions ADD CONSTRAINT offer_version_status CHECK (status IN ('DRAFT','IN_REVIEW','CHANGES_REQUESTED','APPROVED','SUPERSEDED'));
--> statement-breakpoint
ALTER TABLE offer_versions ADD CONSTRAINT offer_version_fingerprint CHECK (fingerprint ~ '^[a-f0-9]{64}$');
--> statement-breakpoint
CREATE OR REPLACE FUNCTION preserve_editorial_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP = 'DELETE' THEN
  IF brand_deletion_in_progress(OLD."workspaceId", OLD."brandId") THEN RETURN OLD; END IF;
  RAISE EXCEPTION '% versions cannot be deleted', TG_TABLE_NAME;
 END IF;
 IF OLD.status <> 'DRAFT' AND (NEW.content IS DISTINCT FROM OLD.content OR NEW.fingerprint IS DISTINCT FROM OLD.fingerprint) THEN
  RAISE EXCEPTION 'A version out of DRAFT is immutable';
 END IF;
 IF NEW."offerId" IS DISTINCT FROM OLD."offerId" OR NEW.sequence IS DISTINCT FROM OLD.sequence OR NEW."workspaceId" IS DISTINCT FROM OLD."workspaceId" OR NEW."brandId" IS DISTINCT FROM OLD."brandId" THEN
  RAISE EXCEPTION 'Version identity is immutable';
 END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER offer_versions_preserve BEFORE UPDATE OR DELETE ON offer_versions FOR EACH ROW EXECUTE FUNCTION preserve_editorial_version();