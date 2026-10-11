CREATE TABLE "plan_progress_updates" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"snapshotId" text NOT NULL,
	"actionId" text NOT NULL,
	"status" text NOT NULL,
	"date" text NOT NULL,
	"note" text,
	"actorId" text NOT NULL,
	"createdAt" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_snapshot_approvals" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"snapshotId" text NOT NULL,
	"fingerprint" text NOT NULL,
	"decision" text NOT NULL,
	"criterion" text NOT NULL,
	"supersededSnapshotId" text,
	"actorId" text NOT NULL,
	"idempotencyKey" text NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	CONSTRAINT "plan_snapshot_approvals_workspaceId_brandId_actorId_idempotencyKey_unique" UNIQUE("workspaceId","brandId","actorId","idempotencyKey")
);
--> statement-breakpoint
CREATE TABLE "plan_snapshots" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"planId" text NOT NULL,
	"sequence" integer NOT NULL,
	"status" text NOT NULL,
	"content" jsonb NOT NULL,
	"fingerprint" text NOT NULL,
	"planRevision" integer NOT NULL,
	"createdBy" text NOT NULL,
	"idempotencyKey" text NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	"decidedBy" text,
	"decidedAt" timestamp with time zone,
	"decisionCriterion" text,
	CONSTRAINT "plan_snapshots_workspaceId_brandId_id_unique" UNIQUE("workspaceId","brandId","id"),
	CONSTRAINT "plan_snapshots_planId_sequence_unique" UNIQUE("planId","sequence"),
	CONSTRAINT "plan_snapshots_workspaceId_brandId_createdBy_idempotencyKey_unique" UNIQUE("workspaceId","brandId","createdBy","idempotencyKey")
);
--> statement-breakpoint
ALTER TABLE "plan_progress_updates" ADD CONSTRAINT "plan_progress_updates_actorId_users_id_fk" FOREIGN KEY ("actorId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_progress_updates" ADD CONSTRAINT "plan_progress_updates_workspaceId_brandId_snapshotId_plan_snapshots_workspaceId_brandId_id_fk" FOREIGN KEY ("workspaceId","brandId","snapshotId") REFERENCES "public"."plan_snapshots"("workspaceId","brandId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_snapshot_approvals" ADD CONSTRAINT "plan_snapshot_approvals_actorId_users_id_fk" FOREIGN KEY ("actorId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_snapshot_approvals" ADD CONSTRAINT "plan_snapshot_approvals_workspaceId_brandId_snapshotId_plan_snapshots_workspaceId_brandId_id_fk" FOREIGN KEY ("workspaceId","brandId","snapshotId") REFERENCES "public"."plan_snapshots"("workspaceId","brandId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_snapshots" ADD CONSTRAINT "plan_snapshots_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_snapshots" ADD CONSTRAINT "plan_snapshots_decidedBy_users_id_fk" FOREIGN KEY ("decidedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_snapshots" ADD CONSTRAINT "plan_snapshots_workspaceId_brandId_planId_marketing_plans_workspaceId_brandId_id_fk" FOREIGN KEY ("workspaceId","brandId","planId") REFERENCES "public"."marketing_plans"("workspaceId","brandId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "plan_progress_updates_workspaceId_brandId_snapshotId_index" ON "plan_progress_updates" USING btree ("workspaceId","brandId","snapshotId");--> statement-breakpoint
CREATE INDEX "plan_snapshots_workspaceId_brandId_planId_index" ON "plan_snapshots" USING btree ("workspaceId","brandId","planId");--> statement-breakpoint
-- PLN-001…003 · a snapshot is frozen at creation; its status only moves forward; approvals and progress are append-only.
ALTER TABLE plan_snapshots ADD CONSTRAINT plan_snapshot_status CHECK (status IN ('IN_REVIEW','CHANGES_REQUESTED','APPROVED','SUPERSEDED'));
--> statement-breakpoint
ALTER TABLE plan_snapshots ADD CONSTRAINT plan_snapshot_fingerprint CHECK (fingerprint ~ '^[a-f0-9]{64}$');
--> statement-breakpoint
ALTER TABLE plan_snapshot_approvals ADD CONSTRAINT plan_snapshot_approval_decision CHECK (decision IN ('APPROVE','REQUEST_CHANGES'));
--> statement-breakpoint
ALTER TABLE plan_progress_updates ADD CONSTRAINT plan_progress_status CHECK (status IN ('PLANNED','IN_PROGRESS','DONE','CANCELLED'));
--> statement-breakpoint
ALTER TABLE plan_progress_updates ADD CONSTRAINT plan_progress_date CHECK (date ~ '^\d{4}-\d{2}-\d{2}$');
--> statement-breakpoint
CREATE OR REPLACE FUNCTION preserve_plan_snapshot() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP = 'DELETE' THEN
  IF brand_deletion_in_progress(OLD."workspaceId", OLD."brandId") THEN RETURN OLD; END IF;
  RAISE EXCEPTION 'plan snapshots cannot be deleted';
 END IF;
 IF NEW.content IS DISTINCT FROM OLD.content OR NEW.fingerprint IS DISTINCT FROM OLD.fingerprint OR NEW."planId" IS DISTINCT FROM OLD."planId" OR NEW.sequence IS DISTINCT FROM OLD.sequence OR NEW."planRevision" IS DISTINCT FROM OLD."planRevision" OR NEW."workspaceId" IS DISTINCT FROM OLD."workspaceId" OR NEW."brandId" IS DISTINCT FROM OLD."brandId" OR NEW."createdBy" IS DISTINCT FROM OLD."createdBy" THEN
  RAISE EXCEPTION 'A plan snapshot is immutable';
 END IF;
 IF NEW.status IS DISTINCT FROM OLD.status AND NOT (
  (OLD.status = 'IN_REVIEW' AND NEW.status IN ('APPROVED','CHANGES_REQUESTED')) OR
  (OLD.status = 'APPROVED' AND NEW.status = 'SUPERSEDED')) THEN
  RAISE EXCEPTION 'Snapshot transition % -> % is not allowed', OLD.status, NEW.status;
 END IF;
 IF OLD."decidedAt" IS NOT NULL AND (NEW."decidedBy" IS DISTINCT FROM OLD."decidedBy" OR NEW."decidedAt" IS DISTINCT FROM OLD."decidedAt" OR NEW."decisionCriterion" IS DISTINCT FROM OLD."decisionCriterion") THEN
  RAISE EXCEPTION 'A recorded decision is immutable';
 END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER plan_snapshots_preserve BEFORE UPDATE OR DELETE ON plan_snapshots FOR EACH ROW EXECUTE FUNCTION preserve_plan_snapshot();
--> statement-breakpoint
CREATE TRIGGER plan_snapshot_approvals_append_only BEFORE UPDATE OR DELETE ON plan_snapshot_approvals FOR EACH ROW EXECUTE FUNCTION preserve_append_only();
--> statement-breakpoint
CREATE TRIGGER plan_progress_updates_append_only BEFORE UPDATE OR DELETE ON plan_progress_updates FOR EACH ROW EXECUTE FUNCTION preserve_append_only();
