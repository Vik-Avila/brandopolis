CREATE TABLE "deliverable_approvals" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"deliverableId" text NOT NULL,
	"versionId" text NOT NULL,
	"fingerprint" text NOT NULL,
	"decision" text NOT NULL,
	"criterion" text NOT NULL,
	"supersededVersionId" text,
	"actorId" text NOT NULL,
	"idempotencyKey" text NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	CONSTRAINT "deliverable_approvals_workspaceId_brandId_actorId_idempotencyKey_unique" UNIQUE("workspaceId","brandId","actorId","idempotencyKey")
);
--> statement-breakpoint
CREATE TABLE "deliverable_publications" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"deliverableId" text NOT NULL,
	"versionId" text NOT NULL,
	"publishedOn" text NOT NULL,
	"url" text,
	"note" text,
	"actorId" text NOT NULL,
	"idempotencyKey" text NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	CONSTRAINT "deliverable_publications_workspaceId_brandId_actorId_idempotencyKey_unique" UNIQUE("workspaceId","brandId","actorId","idempotencyKey")
);
--> statement-breakpoint
CREATE TABLE "deliverable_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"deliverableId" text NOT NULL,
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
	CONSTRAINT "deliverable_versions_workspaceId_brandId_id_unique" UNIQUE("workspaceId","brandId","id"),
	CONSTRAINT "deliverable_versions_deliverableId_sequence_unique" UNIQUE("deliverableId","sequence")
);
--> statement-breakpoint
CREATE TABLE "deliverables" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"type" text NOT NULL,
	"status" text NOT NULL,
	"draftVersionId" text,
	"approvedVersionId" text,
	"revision" integer DEFAULT 0 NOT NULL,
	"createdBy" text NOT NULL,
	"idempotencyKey" text NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	"updatedAt" timestamp with time zone NOT NULL,
	CONSTRAINT "deliverables_workspaceId_brandId_id_unique" UNIQUE("workspaceId","brandId","id"),
	CONSTRAINT "deliverables_workspaceId_brandId_createdBy_idempotencyKey_unique" UNIQUE("workspaceId","brandId","createdBy","idempotencyKey")
);
--> statement-breakpoint
ALTER TABLE "deliverable_approvals" ADD CONSTRAINT "deliverable_approvals_actorId_users_id_fk" FOREIGN KEY ("actorId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliverable_approvals" ADD CONSTRAINT "deliverable_approvals_workspaceId_brandId_versionId_deliverable_versions_workspaceId_brandId_id_fk" FOREIGN KEY ("workspaceId","brandId","versionId") REFERENCES "public"."deliverable_versions"("workspaceId","brandId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliverable_publications" ADD CONSTRAINT "deliverable_publications_actorId_users_id_fk" FOREIGN KEY ("actorId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliverable_publications" ADD CONSTRAINT "deliverable_publications_workspaceId_brandId_versionId_deliverable_versions_workspaceId_brandId_id_fk" FOREIGN KEY ("workspaceId","brandId","versionId") REFERENCES "public"."deliverable_versions"("workspaceId","brandId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliverable_versions" ADD CONSTRAINT "deliverable_versions_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliverable_versions" ADD CONSTRAINT "deliverable_versions_decidedBy_users_id_fk" FOREIGN KEY ("decidedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliverable_versions" ADD CONSTRAINT "deliverable_versions_workspaceId_brandId_deliverableId_deliverables_workspaceId_brandId_id_fk" FOREIGN KEY ("workspaceId","brandId","deliverableId") REFERENCES "public"."deliverables"("workspaceId","brandId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliverables" ADD CONSTRAINT "deliverables_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliverables" ADD CONSTRAINT "deliverables_workspaceId_brandId_brands_workspaceId_id_fk" FOREIGN KEY ("workspaceId","brandId") REFERENCES "public"."brands"("workspaceId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "deliverable_versions_workspaceId_brandId_deliverableId_index" ON "deliverable_versions" USING btree ("workspaceId","brandId","deliverableId");--> statement-breakpoint
CREATE INDEX "deliverables_workspaceId_brandId_type_index" ON "deliverables" USING btree ("workspaceId","brandId","type");--> statement-breakpoint
-- ADR-0030 · deliverables: same editorial guards as offers; approvals and manual publication records are append-only.
ALTER TABLE deliverables ADD CONSTRAINT deliverable_type CHECK (type IN ('SALES_PRESENTATION','OFFER_COPY','SOCIAL_POST','AD','DESIGN_BRIEF'));
--> statement-breakpoint
ALTER TABLE deliverables ADD CONSTRAINT deliverable_status CHECK (status IN ('ACTIVE','RETIRED'));
--> statement-breakpoint
ALTER TABLE deliverable_versions ADD CONSTRAINT deliverable_version_status CHECK (status IN ('DRAFT','IN_REVIEW','CHANGES_REQUESTED','APPROVED','SUPERSEDED'));
--> statement-breakpoint
ALTER TABLE deliverable_versions ADD CONSTRAINT deliverable_version_fingerprint CHECK (fingerprint ~ '^[a-f0-9]{64}$');
--> statement-breakpoint
ALTER TABLE deliverable_versions ADD CONSTRAINT deliverable_version_provenance CHECK (provenance IN ('MANUAL','AI_ASSISTED'));
--> statement-breakpoint
ALTER TABLE deliverable_approvals ADD CONSTRAINT deliverable_approval_decision CHECK (decision IN ('APPROVE','REQUEST_CHANGES'));
--> statement-breakpoint
ALTER TABLE deliverable_publications ADD CONSTRAINT deliverable_publication_date CHECK ("publishedOn" ~ '^\d{4}-\d{2}-\d{2}$');
--> statement-breakpoint
CREATE OR REPLACE FUNCTION preserve_deliverable_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP = 'DELETE' THEN
  IF brand_deletion_in_progress(OLD."workspaceId", OLD."brandId") THEN RETURN OLD; END IF;
  RAISE EXCEPTION 'deliverable versions cannot be deleted';
 END IF;
 IF OLD.status <> 'DRAFT' AND (NEW.content IS DISTINCT FROM OLD.content OR NEW.fingerprint IS DISTINCT FROM OLD.fingerprint OR NEW.manifest IS DISTINCT FROM OLD.manifest OR NEW.provenance IS DISTINCT FROM OLD.provenance) THEN
  RAISE EXCEPTION 'A version out of DRAFT is immutable';
 END IF;
 IF NEW."deliverableId" IS DISTINCT FROM OLD."deliverableId" OR NEW.sequence IS DISTINCT FROM OLD.sequence OR NEW."workspaceId" IS DISTINCT FROM OLD."workspaceId" OR NEW."brandId" IS DISTINCT FROM OLD."brandId" OR NEW."createdBy" IS DISTINCT FROM OLD."createdBy" OR NEW."previousVersionId" IS DISTINCT FROM OLD."previousVersionId" THEN
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
CREATE TRIGGER deliverable_versions_preserve BEFORE UPDATE OR DELETE ON deliverable_versions FOR EACH ROW EXECUTE FUNCTION preserve_deliverable_version();
--> statement-breakpoint
CREATE TRIGGER deliverable_approvals_append_only BEFORE UPDATE OR DELETE ON deliverable_approvals FOR EACH ROW EXECUTE FUNCTION preserve_append_only();
--> statement-breakpoint
CREATE TRIGGER deliverable_publications_append_only BEFORE UPDATE OR DELETE ON deliverable_publications FOR EACH ROW EXECUTE FUNCTION preserve_append_only();
