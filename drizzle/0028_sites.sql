CREATE TABLE "site_approvals" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"siteId" text NOT NULL,
	"versionId" text NOT NULL,
	"fingerprint" text NOT NULL,
	"decision" text NOT NULL,
	"criterion" text NOT NULL,
	"actorId" text NOT NULL,
	"supersededVersionId" text,
	"idempotencyKey" text NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	CONSTRAINT "site_approvals_workspaceId_brandId_actorId_idempotencyKey_unique" UNIQUE("workspaceId","brandId","actorId","idempotencyKey")
);
--> statement-breakpoint
CREATE TABLE "site_domains" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"siteId" text NOT NULL,
	"hostname" text NOT NULL,
	"kind" text NOT NULL,
	"status" text NOT NULL,
	"token" text NOT NULL,
	"createdBy" text NOT NULL,
	"idempotencyKey" text NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	"checkedAt" timestamp with time zone,
	"verifiedAt" timestamp with time zone,
	"removedBy" text,
	"removedAt" timestamp with time zone,
	CONSTRAINT "site_domains_workspaceId_brandId_createdBy_idempotencyKey_unique" UNIQUE("workspaceId","brandId","createdBy","idempotencyKey")
);
--> statement-breakpoint
CREATE TABLE "site_preview_codes" (
	"id" text PRIMARY KEY NOT NULL,
	"codeHash" text NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"siteId" text NOT NULL,
	"versionId" text NOT NULL,
	"userId" text NOT NULL,
	"state" text NOT NULL,
	"challenge" text NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"usedAt" timestamp with time zone,
	"createdAt" timestamp with time zone NOT NULL,
	CONSTRAINT "site_preview_codes_codeHash_unique" UNIQUE("codeHash")
);
--> statement-breakpoint
CREATE TABLE "site_preview_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"tokenHash" text NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"siteId" text NOT NULL,
	"versionId" text NOT NULL,
	"userId" text NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	CONSTRAINT "site_preview_sessions_tokenHash_unique" UNIQUE("tokenHash")
);
--> statement-breakpoint
CREATE TABLE "site_publications" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"siteId" text NOT NULL,
	"versionId" text NOT NULL,
	"status" text NOT NULL,
	"host" text NOT NULL,
	"fingerprint" text NOT NULL,
	"restoredFrom" text,
	"publishedBy" text NOT NULL,
	"idempotencyKey" text NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	"completedAt" timestamp with time zone,
	"replacedAt" timestamp with time zone,
	"failure" text,
	CONSTRAINT "site_publications_workspaceId_brandId_publishedBy_idempotencyKey_unique" UNIQUE("workspaceId","brandId","publishedBy","idempotencyKey")
);
--> statement-breakpoint
CREATE TABLE "site_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"siteId" text NOT NULL,
	"sequence" integer NOT NULL,
	"previousVersionId" text,
	"status" text NOT NULL,
	"content" jsonb NOT NULL,
	"fingerprint" text NOT NULL,
	"measurementFingerprint" text NOT NULL,
	"manifest" jsonb NOT NULL,
	"provenance" text NOT NULL,
	"createdBy" text NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	"submittedAt" timestamp with time zone,
	"decidedBy" text,
	"decidedAt" timestamp with time zone,
	"decisionCriterion" text,
	CONSTRAINT "site_versions_workspaceId_brandId_id_unique" UNIQUE("workspaceId","brandId","id"),
	CONSTRAINT "site_versions_siteId_sequence_unique" UNIQUE("siteId","sequence")
);
--> statement-breakpoint
CREATE TABLE "sites" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"goal" text NOT NULL,
	"status" text NOT NULL,
	"draftVersionId" text,
	"approvedVersionId" text,
	"publishedVersionId" text,
	"formId" text,
	"revision" integer DEFAULT 0 NOT NULL,
	"createdBy" text NOT NULL,
	"idempotencyKey" text NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	"updatedAt" timestamp with time zone NOT NULL,
	CONSTRAINT "sites_slug_unique" UNIQUE("slug"),
	CONSTRAINT "sites_workspaceId_brandId_id_unique" UNIQUE("workspaceId","brandId","id"),
	CONSTRAINT "sites_workspaceId_brandId_createdBy_idempotencyKey_unique" UNIQUE("workspaceId","brandId","createdBy","idempotencyKey")
);
--> statement-breakpoint
ALTER TABLE "site_approvals" ADD CONSTRAINT "site_approvals_actorId_users_id_fk" FOREIGN KEY ("actorId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_approvals" ADD CONSTRAINT "site_approvals_workspaceId_brandId_versionId_site_versions_workspaceId_brandId_id_fk" FOREIGN KEY ("workspaceId","brandId","versionId") REFERENCES "public"."site_versions"("workspaceId","brandId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_domains" ADD CONSTRAINT "site_domains_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_domains" ADD CONSTRAINT "site_domains_removedBy_users_id_fk" FOREIGN KEY ("removedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_domains" ADD CONSTRAINT "site_domains_workspaceId_brandId_siteId_sites_workspaceId_brandId_id_fk" FOREIGN KEY ("workspaceId","brandId","siteId") REFERENCES "public"."sites"("workspaceId","brandId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_preview_codes" ADD CONSTRAINT "site_preview_codes_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_preview_codes" ADD CONSTRAINT "site_preview_codes_workspaceId_brandId_versionId_site_versions_workspaceId_brandId_id_fk" FOREIGN KEY ("workspaceId","brandId","versionId") REFERENCES "public"."site_versions"("workspaceId","brandId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_preview_sessions" ADD CONSTRAINT "site_preview_sessions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_preview_sessions" ADD CONSTRAINT "site_preview_sessions_workspaceId_brandId_versionId_site_versions_workspaceId_brandId_id_fk" FOREIGN KEY ("workspaceId","brandId","versionId") REFERENCES "public"."site_versions"("workspaceId","brandId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_publications" ADD CONSTRAINT "site_publications_publishedBy_users_id_fk" FOREIGN KEY ("publishedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_publications" ADD CONSTRAINT "site_publications_workspaceId_brandId_versionId_site_versions_workspaceId_brandId_id_fk" FOREIGN KEY ("workspaceId","brandId","versionId") REFERENCES "public"."site_versions"("workspaceId","brandId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_versions" ADD CONSTRAINT "site_versions_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_versions" ADD CONSTRAINT "site_versions_decidedBy_users_id_fk" FOREIGN KEY ("decidedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_versions" ADD CONSTRAINT "site_versions_workspaceId_brandId_siteId_sites_workspaceId_brandId_id_fk" FOREIGN KEY ("workspaceId","brandId","siteId") REFERENCES "public"."sites"("workspaceId","brandId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_workspaceId_brandId_brands_workspaceId_id_fk" FOREIGN KEY ("workspaceId","brandId") REFERENCES "public"."brands"("workspaceId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_workspaceId_brandId_formId_lead_forms_workspaceId_brandId_id_fk" FOREIGN KEY ("workspaceId","brandId","formId") REFERENCES "public"."lead_forms"("workspaceId","brandId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "site_domains_one_active_host" ON "site_domains" USING btree ("hostname") WHERE status <> 'REMOVED';--> statement-breakpoint
CREATE UNIQUE INDEX "site_publications_one_live" ON "site_publications" USING btree ("siteId") WHERE status = 'PUBLISHED';--> statement-breakpoint
CREATE INDEX "site_publications_workspaceId_brandId_siteId_index" ON "site_publications" USING btree ("workspaceId","brandId","siteId");--> statement-breakpoint
-- ADR-0032 guards. Versions: content changes only while DRAFT; leaving DRAFT follows the editorial transitions and
-- records who decided. Approvals append-only. Publications: PENDING → PUBLISHED/FAILED, PUBLISHED → REPLACED, once.
-- Domains: PENDING_VERIFICATION → VERIFIED/FAILED/REMOVED, VERIFIED → REMOVED/FAILED. Preview codes are used once.
-- Rows disappear only inside a registered brand deletion (ADR-0029).
ALTER TABLE sites ADD CONSTRAINT site_values CHECK (status IN ('ACTIVE','RETIRED') AND goal IN ('LEADS','SELL','INFORM','EVENT') AND slug ~ '^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$' AND char_length(name) BETWEEN 1 AND 120 AND revision >= 0);--> statement-breakpoint
ALTER TABLE site_versions ADD CONSTRAINT site_version_values CHECK (status IN ('DRAFT','IN_REVIEW','CHANGES_REQUESTED','APPROVED','SUPERSEDED') AND provenance IN ('MANUAL','AI_ASSISTED') AND sequence >= 1);--> statement-breakpoint
ALTER TABLE site_approvals ADD CONSTRAINT site_approval_values CHECK (decision IN ('APPROVE','REQUEST_CHANGES') AND char_length(criterion) BETWEEN 10 AND 2000);--> statement-breakpoint
ALTER TABLE site_publications ADD CONSTRAINT site_publication_values CHECK (status IN ('PENDING','PUBLISHED','FAILED','REPLACED'));--> statement-breakpoint
ALTER TABLE site_domains ADD CONSTRAINT site_domain_values CHECK (kind IN ('BRANDOPOLIS','CUSTOM') AND status IN ('PENDING_VERIFICATION','VERIFIED','FAILED','REMOVED') AND hostname ~ '^[a-z0-9.:-]{4,253}$');--> statement-breakpoint
ALTER TABLE portal_shares DROP CONSTRAINT portal_share_target;--> statement-breakpoint
ALTER TABLE portal_shares ADD CONSTRAINT portal_share_target CHECK ("targetType" IN ('STRATEGY_SNAPSHOT','PLAN_SNAPSHOT','DELIVERABLE_VERSION','KIT_VERSION','SITE_VERSION'));--> statement-breakpoint
CREATE OR REPLACE FUNCTION guard_site_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP = 'DELETE' THEN
  IF brand_deletion_in_progress(OLD."workspaceId", OLD."brandId") THEN RETURN OLD; END IF;
  RAISE EXCEPTION 'site_versions rows are kept';
 END IF;
 IF OLD.status = 'DRAFT' AND NEW.status = 'DRAFT' THEN
  IF (to_jsonb(NEW) - 'content' - 'fingerprint' - 'measurementFingerprint' - 'manifest' - 'provenance') IS DISTINCT FROM (to_jsonb(OLD) - 'content' - 'fingerprint' - 'measurementFingerprint' - 'manifest' - 'provenance') THEN RAISE EXCEPTION 'site draft identity is immutable'; END IF;
  RETURN NEW;
 END IF;
 IF NOT ((OLD.status = 'DRAFT' AND NEW.status = 'IN_REVIEW') OR (OLD.status = 'IN_REVIEW' AND NEW.status IN ('APPROVED','CHANGES_REQUESTED')) OR (OLD.status = 'APPROVED' AND NEW.status = 'SUPERSEDED')) THEN RAISE EXCEPTION 'site version transition % -> % is not allowed', OLD.status, NEW.status; END IF;
 IF (to_jsonb(NEW) - 'status' - 'submittedAt' - 'decidedBy' - 'decidedAt' - 'decisionCriterion') IS DISTINCT FROM (to_jsonb(OLD) - 'status' - 'submittedAt' - 'decidedBy' - 'decidedAt' - 'decisionCriterion') THEN RAISE EXCEPTION 'site version content is immutable once it leaves DRAFT'; END IF;
 RETURN NEW;
END $$;--> statement-breakpoint
CREATE TRIGGER site_versions_guard BEFORE UPDATE OR DELETE ON site_versions FOR EACH ROW EXECUTE FUNCTION guard_site_version();--> statement-breakpoint
CREATE OR REPLACE FUNCTION guard_site_publication() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP = 'DELETE' THEN
  IF brand_deletion_in_progress(OLD."workspaceId", OLD."brandId") THEN RETURN OLD; END IF;
  RAISE EXCEPTION 'site_publications rows are kept';
 END IF;
 IF NOT ((OLD.status = 'PENDING' AND NEW.status IN ('PUBLISHED','FAILED')) OR (OLD.status = 'PUBLISHED' AND NEW.status = 'REPLACED')) THEN RAISE EXCEPTION 'site publication transition % -> % is not allowed', OLD.status, NEW.status; END IF;
 IF (to_jsonb(NEW) - 'status' - 'completedAt' - 'replacedAt' - 'failure') IS DISTINCT FROM (to_jsonb(OLD) - 'status' - 'completedAt' - 'replacedAt' - 'failure') THEN RAISE EXCEPTION 'site publication identity is immutable'; END IF;
 RETURN NEW;
END $$;--> statement-breakpoint
CREATE TRIGGER site_publications_guard BEFORE UPDATE OR DELETE ON site_publications FOR EACH ROW EXECUTE FUNCTION guard_site_publication();--> statement-breakpoint
CREATE OR REPLACE FUNCTION guard_site_domain() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP = 'DELETE' THEN
  IF brand_deletion_in_progress(OLD."workspaceId", OLD."brandId") THEN RETURN OLD; END IF;
  RAISE EXCEPTION 'site_domains rows are kept';
 END IF;
 IF OLD.status = 'REMOVED' OR NOT ((OLD.status = 'PENDING_VERIFICATION' AND NEW.status IN ('PENDING_VERIFICATION','VERIFIED','FAILED','REMOVED')) OR (OLD.status = 'VERIFIED' AND NEW.status IN ('VERIFIED','FAILED','REMOVED')) OR (OLD.status = 'FAILED' AND NEW.status IN ('PENDING_VERIFICATION','VERIFIED','FAILED','REMOVED'))) THEN RAISE EXCEPTION 'site domain transition % -> % is not allowed', OLD.status, NEW.status; END IF;
 IF (to_jsonb(NEW) - 'status' - 'checkedAt' - 'verifiedAt' - 'removedBy' - 'removedAt') IS DISTINCT FROM (to_jsonb(OLD) - 'status' - 'checkedAt' - 'verifiedAt' - 'removedBy' - 'removedAt') THEN RAISE EXCEPTION 'site domain identity is immutable'; END IF;
 RETURN NEW;
END $$;--> statement-breakpoint
CREATE TRIGGER site_domains_guard BEFORE UPDATE OR DELETE ON site_domains FOR EACH ROW EXECUTE FUNCTION guard_site_domain();--> statement-breakpoint
CREATE OR REPLACE FUNCTION guard_site_preview_code() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP = 'DELETE' THEN
  IF brand_deletion_in_progress(OLD."workspaceId", OLD."brandId") THEN RETURN OLD; END IF;
  RAISE EXCEPTION 'site_preview_codes rows are kept';
 END IF;
 IF OLD."usedAt" IS NOT NULL OR NEW."usedAt" IS NULL OR (to_jsonb(NEW) - 'usedAt') IS DISTINCT FROM (to_jsonb(OLD) - 'usedAt') THEN RAISE EXCEPTION 'a preview code is used once'; END IF;
 RETURN NEW;
END $$;--> statement-breakpoint
CREATE TRIGGER site_preview_codes_guard BEFORE UPDATE OR DELETE ON site_preview_codes FOR EACH ROW EXECUTE FUNCTION guard_site_preview_code();--> statement-breakpoint
CREATE TRIGGER site_approvals_append_only BEFORE UPDATE OR DELETE ON site_approvals FOR EACH ROW EXECUTE FUNCTION preserve_append_only();--> statement-breakpoint
CREATE TRIGGER site_preview_sessions_append_only BEFORE UPDATE OR DELETE ON site_preview_sessions FOR EACH ROW EXECUTE FUNCTION preserve_append_only();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION guard_site_delete() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF brand_deletion_in_progress(OLD."workspaceId", OLD."brandId") THEN RETURN OLD; END IF;
 RAISE EXCEPTION 'sites rows are kept';
END $$;--> statement-breakpoint
CREATE TRIGGER sites_delete_guard BEFORE DELETE ON sites FOR EACH ROW EXECUTE FUNCTION guard_site_delete();
