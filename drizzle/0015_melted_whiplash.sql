CREATE TABLE "brand_deletions" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"actorUserId" text NOT NULL,
	"idempotencyKey" text NOT NULL,
	"status" text NOT NULL,
	"storagePrefix" text,
	"createdAt" timestamp with time zone NOT NULL,
	"completedAt" timestamp with time zone,
	CONSTRAINT "brand_deletions_workspaceId_actorUserId_idempotencyKey_unique" UNIQUE("workspaceId","actorUserId","idempotencyKey")
);
--> statement-breakpoint
ALTER TABLE "pilot_feedback" ALTER COLUMN "brandId" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "brand_deletions" ADD CONSTRAINT "brand_deletions_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_deletions" ADD CONSTRAINT "brand_deletions_actorUserId_users_id_fk" FOREIGN KEY ("actorUserId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "brand_deletions_workspaceId_brandId_index" ON "brand_deletions" USING btree ("workspaceId","brandId");--> statement-breakpoint
CREATE INDEX "brand_deletions_status_index" ON "brand_deletions" USING btree ("status");--> statement-breakpoint
ALTER TABLE brand_deletions ADD CONSTRAINT brand_deletion_status CHECK (status IN ('DELETED','FILES_PENDING'));
--> statement-breakpoint
ALTER TABLE brand_deletions ADD CONSTRAINT brand_deletion_pending_prefix CHECK (status <> 'FILES_PENDING' OR "storagePrefix" IS NOT NULL);
--> statement-breakpoint
-- ADR-0029: decision history and the strategic audit stay undeletable, except inside the one transaction that
-- recorded an authorized Brand deletion for that same Workspace/Brand (the brand_deletions row was inserted by
-- this very transaction: its xmin is the current transaction id). Updates keep the original rules.
CREATE OR REPLACE FUNCTION brand_deletion_in_progress(workspace_id text, brand_id text) RETURNS boolean LANGUAGE sql AS $$
 SELECT EXISTS (
  SELECT 1 FROM brand_deletions d
  WHERE d."workspaceId"=workspace_id AND d."brandId"=brand_id
    AND d.xmin::text::bigint = (txid_current() % 4294967296)
 )
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION preserve_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP = 'DELETE' THEN
  IF brand_deletion_in_progress(OLD."workspaceId", OLD."brandId") THEN RETURN OLD; END IF;
  RAISE EXCEPTION 'Decision history cannot be deleted';
 END IF;
 IF (to_jsonb(NEW) - 'versionStatus') IS DISTINCT FROM (to_jsonb(OLD) - 'versionStatus')
    OR OLD."versionStatus" <> 'APPROVED' OR NEW."versionStatus" <> 'SUPERSEDED' THEN
   RAISE EXCEPTION 'Only APPROVED to SUPERSEDED metadata transition is allowed';
 END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION preserve_audit() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP = 'DELETE' AND brand_deletion_in_progress(OLD."workspaceId", OLD."brandId") THEN RETURN OLD; END IF;
 RAISE EXCEPTION 'Strategic audit is append only';
END $$;
