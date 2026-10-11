CREATE TABLE "offer_approvals" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"offerId" text NOT NULL,
	"versionId" text NOT NULL,
	"fingerprint" text NOT NULL,
	"decision" text NOT NULL,
	"criterion" text NOT NULL,
	"supersededVersionId" text,
	"actorId" text NOT NULL,
	"idempotencyKey" text NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	CONSTRAINT "offer_approvals_workspaceId_brandId_actorId_idempotencyKey_unique" UNIQUE("workspaceId","brandId","actorId","idempotencyKey")
);
--> statement-breakpoint
ALTER TABLE "offer_approvals" ADD CONSTRAINT "offer_approvals_actorId_users_id_fk" FOREIGN KEY ("actorId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_approvals" ADD CONSTRAINT "offer_approvals_workspaceId_brandId_offerId_offers_workspaceId_brandId_id_fk" FOREIGN KEY ("workspaceId","brandId","offerId") REFERENCES "public"."offers"("workspaceId","brandId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_approvals" ADD CONSTRAINT "offer_approvals_workspaceId_brandId_versionId_offer_versions_workspaceId_brandId_id_fk" FOREIGN KEY ("workspaceId","brandId","versionId") REFERENCES "public"."offer_versions"("workspaceId","brandId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "offer_approvals_workspaceId_brandId_offerId_index" ON "offer_approvals" USING btree ("workspaceId","brandId","offerId");--> statement-breakpoint
-- Security review of offers (2026-10-10): decisions are append-only; a version only moves forward and its decision is frozen.
ALTER TABLE offer_approvals ADD CONSTRAINT offer_approval_decision CHECK (decision IN ('APPROVE','REQUEST_CHANGES'));
--> statement-breakpoint
CREATE TRIGGER offer_approvals_append_only BEFORE UPDATE OR DELETE ON offer_approvals FOR EACH ROW EXECUTE FUNCTION preserve_append_only();
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
 IF NEW."offerId" IS DISTINCT FROM OLD."offerId" OR NEW.sequence IS DISTINCT FROM OLD.sequence OR NEW."workspaceId" IS DISTINCT FROM OLD."workspaceId" OR NEW."brandId" IS DISTINCT FROM OLD."brandId" OR NEW."createdBy" IS DISTINCT FROM OLD."createdBy" OR NEW."previousVersionId" IS DISTINCT FROM OLD."previousVersionId" THEN
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
 IF OLD."submittedAt" IS NOT NULL AND NEW."submittedAt" IS DISTINCT FROM OLD."submittedAt" THEN
  RAISE EXCEPTION 'A recorded submission is immutable';
 END IF;
 RETURN NEW;
END $$;
