CREATE TABLE "brand_setup_drafts" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text,
	"createdBy" text NOT NULL,
	"status" text NOT NULL,
	"step" integer NOT NULL,
	"fields" jsonb NOT NULL,
	"identityChoice" text,
	"version" integer NOT NULL,
	"startKey" text NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	"updatedAt" timestamp with time zone NOT NULL,
	"confirmedAt" timestamp with time zone,
	"abandonedAt" timestamp with time zone,
	CONSTRAINT "brand_setup_drafts_workspaceId_createdBy_startKey_unique" UNIQUE("workspaceId","createdBy","startKey")
);
--> statement-breakpoint
ALTER TABLE "brand_setup_drafts" ADD CONSTRAINT "brand_setup_drafts_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_setup_drafts" ADD CONSTRAINT "brand_setup_drafts_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_setup_drafts" ADD CONSTRAINT "brand_setup_drafts_workspaceId_brandId_brands_workspaceId_id_fk" FOREIGN KEY ("workspaceId","brandId") REFERENCES "public"."brands"("workspaceId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "brand_setup_drafts_one_open_per_brand" ON "brand_setup_drafts" USING btree ("workspaceId","brandId") WHERE status = 'IN_PROGRESS' AND "brandId" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "brand_setup_drafts_one_open_unlinked" ON "brand_setup_drafts" USING btree ("workspaceId","createdBy") WHERE status = 'IN_PROGRESS' AND "brandId" IS NULL;--> statement-breakpoint
-- PHASE4_SPEC §4.10 guards: IN_PROGRESS → CONFIRMED / ABANDONED only; a closed draft is immutable; the brand link,
-- author and workspace never change once set; deletion only inside a registered brand deletion (ADR-0029).
ALTER TABLE brand_setup_drafts ADD CONSTRAINT brand_setup_draft_status CHECK (status IN ('IN_PROGRESS','CONFIRMED','ABANDONED'));--> statement-breakpoint
ALTER TABLE brand_setup_drafts ADD CONSTRAINT brand_setup_draft_step CHECK (step BETWEEN 1 AND 4);--> statement-breakpoint
ALTER TABLE brand_setup_drafts ADD CONSTRAINT brand_setup_draft_identity CHECK ("identityChoice" IS NULL OR "identityChoice" IN ('HAVE','COMPLETE','CREATE','LATER'));--> statement-breakpoint
ALTER TABLE brand_setup_drafts ADD CONSTRAINT brand_setup_draft_confirmed_brand CHECK (status <> 'CONFIRMED' OR ("brandId" IS NOT NULL AND "confirmedAt" IS NOT NULL));--> statement-breakpoint
ALTER TABLE brand_setup_drafts ADD CONSTRAINT brand_setup_draft_version CHECK (version >= 1);--> statement-breakpoint
CREATE OR REPLACE FUNCTION guard_brand_setup_draft() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP = 'DELETE' THEN
  IF OLD."brandId" IS NOT NULL AND brand_deletion_in_progress(OLD."workspaceId", OLD."brandId") THEN RETURN OLD; END IF;
  RAISE EXCEPTION 'brand_setup_drafts rows are kept';
 END IF;
 IF OLD.status <> 'IN_PROGRESS' THEN RAISE EXCEPTION 'brand setup draft is closed'; END IF;
 IF NEW."workspaceId" IS DISTINCT FROM OLD."workspaceId" OR NEW."createdBy" IS DISTINCT FROM OLD."createdBy" OR NEW."startKey" IS DISTINCT FROM OLD."startKey" THEN
  RAISE EXCEPTION 'brand setup draft owner is immutable';
 END IF;
 IF OLD."brandId" IS NOT NULL AND NEW."brandId" IS DISTINCT FROM OLD."brandId" THEN RAISE EXCEPTION 'brand setup draft brand link is immutable'; END IF;
 IF NEW.version <> OLD.version + 1 THEN RAISE EXCEPTION 'brand setup draft version must advance by one'; END IF;
 RETURN NEW;
END $$;--> statement-breakpoint
CREATE TRIGGER brand_setup_drafts_guard BEFORE UPDATE OR DELETE ON brand_setup_drafts FOR EACH ROW EXECUTE FUNCTION guard_brand_setup_draft();
