CREATE TABLE "brand_guests" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"userId" text NOT NULL,
	"invitationId" text NOT NULL,
	"status" text NOT NULL,
	"invitedBy" text NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	"revokedBy" text,
	"revokedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "brand_invitations" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"normalizedEmail" text NOT NULL,
	"tokenHash" text NOT NULL,
	"status" text NOT NULL,
	"delivery" text NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"invitedBy" text NOT NULL,
	"idempotencyKey" text NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	"acceptedBy" text,
	"acceptedAt" timestamp with time zone,
	"revokedBy" text,
	"revokedAt" timestamp with time zone,
	CONSTRAINT "brand_invitations_tokenHash_unique" UNIQUE("tokenHash"),
	CONSTRAINT "brand_invitations_workspaceId_brandId_invitedBy_idempotencyKey_unique" UNIQUE("workspaceId","brandId","invitedBy","idempotencyKey"),
	CONSTRAINT "brand_invitations_workspaceId_brandId_id_unique" UNIQUE("workspaceId","brandId","id")
);
--> statement-breakpoint
CREATE TABLE "portal_approvals" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"shareId" text NOT NULL,
	"targetType" text NOT NULL,
	"targetId" text NOT NULL,
	"fingerprint" text NOT NULL,
	"actorId" text NOT NULL,
	"actorContext" text NOT NULL,
	"decision" text NOT NULL,
	"comment" text NOT NULL,
	"idempotencyKey" text NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	CONSTRAINT "portal_approvals_workspaceId_brandId_actorId_idempotencyKey_unique" UNIQUE("workspaceId","brandId","actorId","idempotencyKey")
);
--> statement-breakpoint
CREATE TABLE "portal_comments" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"shareId" text NOT NULL,
	"authorId" text NOT NULL,
	"actorContext" text NOT NULL,
	"visibility" text NOT NULL,
	"body" text NOT NULL,
	"idempotencyKey" text NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	CONSTRAINT "portal_comments_workspaceId_brandId_authorId_idempotencyKey_unique" UNIQUE("workspaceId","brandId","authorId","idempotencyKey")
);
--> statement-breakpoint
CREATE TABLE "portal_shares" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"targetType" text NOT NULL,
	"targetId" text NOT NULL,
	"fingerprint" text NOT NULL,
	"title" text NOT NULL,
	"content" jsonb,
	"sharedBy" text NOT NULL,
	"sharedAt" timestamp with time zone NOT NULL,
	"idempotencyKey" text NOT NULL,
	"withdrawnBy" text,
	"withdrawnAt" timestamp with time zone,
	CONSTRAINT "portal_shares_workspaceId_brandId_id_unique" UNIQUE("workspaceId","brandId","id"),
	CONSTRAINT "portal_shares_workspaceId_brandId_sharedBy_idempotencyKey_unique" UNIQUE("workspaceId","brandId","sharedBy","idempotencyKey")
);
--> statement-breakpoint
ALTER TABLE "brand_guests" ADD CONSTRAINT "brand_guests_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_guests" ADD CONSTRAINT "brand_guests_invitedBy_users_id_fk" FOREIGN KEY ("invitedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_guests" ADD CONSTRAINT "brand_guests_revokedBy_users_id_fk" FOREIGN KEY ("revokedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_guests" ADD CONSTRAINT "brand_guests_workspaceId_brandId_brands_workspaceId_id_fk" FOREIGN KEY ("workspaceId","brandId") REFERENCES "public"."brands"("workspaceId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_guests" ADD CONSTRAINT "brand_guests_workspaceId_brandId_invitationId_brand_invitations_workspaceId_brandId_id_fk" FOREIGN KEY ("workspaceId","brandId","invitationId") REFERENCES "public"."brand_invitations"("workspaceId","brandId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_invitations" ADD CONSTRAINT "brand_invitations_invitedBy_users_id_fk" FOREIGN KEY ("invitedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_invitations" ADD CONSTRAINT "brand_invitations_acceptedBy_users_id_fk" FOREIGN KEY ("acceptedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_invitations" ADD CONSTRAINT "brand_invitations_revokedBy_users_id_fk" FOREIGN KEY ("revokedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_invitations" ADD CONSTRAINT "brand_invitations_workspaceId_brandId_brands_workspaceId_id_fk" FOREIGN KEY ("workspaceId","brandId") REFERENCES "public"."brands"("workspaceId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_approvals" ADD CONSTRAINT "portal_approvals_actorId_users_id_fk" FOREIGN KEY ("actorId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_approvals" ADD CONSTRAINT "portal_approvals_workspaceId_brandId_shareId_portal_shares_workspaceId_brandId_id_fk" FOREIGN KEY ("workspaceId","brandId","shareId") REFERENCES "public"."portal_shares"("workspaceId","brandId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_comments" ADD CONSTRAINT "portal_comments_authorId_users_id_fk" FOREIGN KEY ("authorId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_comments" ADD CONSTRAINT "portal_comments_workspaceId_brandId_shareId_portal_shares_workspaceId_brandId_id_fk" FOREIGN KEY ("workspaceId","brandId","shareId") REFERENCES "public"."portal_shares"("workspaceId","brandId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_shares" ADD CONSTRAINT "portal_shares_sharedBy_users_id_fk" FOREIGN KEY ("sharedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_shares" ADD CONSTRAINT "portal_shares_withdrawnBy_users_id_fk" FOREIGN KEY ("withdrawnBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_shares" ADD CONSTRAINT "portal_shares_workspaceId_brandId_brands_workspaceId_id_fk" FOREIGN KEY ("workspaceId","brandId") REFERENCES "public"."brands"("workspaceId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "brand_guests_one_active" ON "brand_guests" USING btree ("brandId","userId") WHERE status = 'ACTIVE';--> statement-breakpoint
CREATE INDEX "brand_guests_userId_index" ON "brand_guests" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "brand_invitations_workspaceId_brandId_index" ON "brand_invitations" USING btree ("workspaceId","brandId");--> statement-breakpoint
CREATE INDEX "portal_approvals_workspaceId_brandId_shareId_index" ON "portal_approvals" USING btree ("workspaceId","brandId","shareId");--> statement-breakpoint
CREATE INDEX "portal_comments_workspaceId_brandId_shareId_index" ON "portal_comments" USING btree ("workspaceId","brandId","shareId");--> statement-breakpoint
CREATE UNIQUE INDEX "portal_shares_one_active" ON "portal_shares" USING btree ("workspaceId","brandId","targetType","targetId") WHERE "withdrawnAt" IS NULL;--> statement-breakpoint
-- ADR-0033 guards. Invitations: PENDING → ACCEPTED / REVOKED once; everything else immutable. Guests: ACTIVE → REVOKED
-- once. Shares: only their withdrawal is recorded, once. Comments and approvals: append-only. Rows disappear only
-- inside a registered brand deletion (ADR-0029).
ALTER TABLE brand_invitations ADD CONSTRAINT brand_invitation_status CHECK (status IN ('PENDING','ACCEPTED','REVOKED'));--> statement-breakpoint
ALTER TABLE brand_invitations ADD CONSTRAINT brand_invitation_delivery CHECK (delivery IN ('EMAIL','LINK'));--> statement-breakpoint
ALTER TABLE brand_invitations ADD CONSTRAINT brand_invitation_closed CHECK ((status <> 'ACCEPTED' OR ("acceptedBy" IS NOT NULL AND "acceptedAt" IS NOT NULL)) AND (status <> 'REVOKED' OR ("revokedBy" IS NOT NULL AND "revokedAt" IS NOT NULL)));--> statement-breakpoint
ALTER TABLE brand_guests ADD CONSTRAINT brand_guest_status CHECK (status IN ('ACTIVE','REVOKED'));--> statement-breakpoint
ALTER TABLE brand_guests ADD CONSTRAINT brand_guest_revoked CHECK (status <> 'REVOKED' OR ("revokedBy" IS NOT NULL AND "revokedAt" IS NOT NULL));--> statement-breakpoint
ALTER TABLE portal_shares ADD CONSTRAINT portal_share_target CHECK ("targetType" IN ('STRATEGY_SNAPSHOT','PLAN_SNAPSHOT','DELIVERABLE_VERSION','KIT_VERSION'));--> statement-breakpoint
ALTER TABLE portal_shares ADD CONSTRAINT portal_share_strategy_content CHECK (("targetType" = 'STRATEGY_SNAPSHOT') = (content IS NOT NULL));--> statement-breakpoint
ALTER TABLE portal_comments ADD CONSTRAINT portal_comment_context CHECK ("actorContext" IN ('TEAM','GUEST') AND visibility IN ('SHARED','INTERNAL') AND ("actorContext" = 'TEAM' OR visibility = 'SHARED'));--> statement-breakpoint
ALTER TABLE portal_comments ADD CONSTRAINT portal_comment_body CHECK (char_length(body) BETWEEN 1 AND 2000);--> statement-breakpoint
ALTER TABLE portal_approvals ADD CONSTRAINT portal_approval_values CHECK ("actorContext" IN ('TEAM','GUEST') AND decision IN ('APPROVE','REQUEST_CHANGES') AND char_length(comment) <= 2000);--> statement-breakpoint
CREATE OR REPLACE FUNCTION guard_brand_invitation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP = 'DELETE' THEN
  IF brand_deletion_in_progress(OLD."workspaceId", OLD."brandId") THEN RETURN OLD; END IF;
  RAISE EXCEPTION 'brand_invitations rows are kept';
 END IF;
 IF OLD.status <> 'PENDING' THEN RAISE EXCEPTION 'brand invitation is closed'; END IF;
 IF NEW.status = 'PENDING' OR (to_jsonb(NEW) - 'status' - 'acceptedBy' - 'acceptedAt' - 'revokedBy' - 'revokedAt') IS DISTINCT FROM (to_jsonb(OLD) - 'status' - 'acceptedBy' - 'acceptedAt' - 'revokedBy' - 'revokedAt') THEN
  RAISE EXCEPTION 'brand invitation only changes by acceptance or revocation';
 END IF;
 RETURN NEW;
END $$;--> statement-breakpoint
CREATE TRIGGER brand_invitations_guard BEFORE UPDATE OR DELETE ON brand_invitations FOR EACH ROW EXECUTE FUNCTION guard_brand_invitation();--> statement-breakpoint
CREATE OR REPLACE FUNCTION guard_brand_guest() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP = 'DELETE' THEN
  IF brand_deletion_in_progress(OLD."workspaceId", OLD."brandId") THEN RETURN OLD; END IF;
  RAISE EXCEPTION 'brand_guests rows are kept';
 END IF;
 IF OLD.status <> 'ACTIVE' OR NEW.status <> 'REVOKED' OR (to_jsonb(NEW) - 'status' - 'revokedBy' - 'revokedAt') IS DISTINCT FROM (to_jsonb(OLD) - 'status' - 'revokedBy' - 'revokedAt') THEN
  RAISE EXCEPTION 'brand guest only changes by revocation';
 END IF;
 RETURN NEW;
END $$;--> statement-breakpoint
CREATE TRIGGER brand_guests_guard BEFORE UPDATE OR DELETE ON brand_guests FOR EACH ROW EXECUTE FUNCTION guard_brand_guest();--> statement-breakpoint
CREATE OR REPLACE FUNCTION guard_portal_share() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP = 'DELETE' THEN
  IF brand_deletion_in_progress(OLD."workspaceId", OLD."brandId") THEN RETURN OLD; END IF;
  RAISE EXCEPTION 'portal_shares rows are kept';
 END IF;
 IF OLD."withdrawnAt" IS NOT NULL OR NEW."withdrawnAt" IS NULL OR NEW."withdrawnBy" IS NULL OR (to_jsonb(NEW) - 'withdrawnBy' - 'withdrawnAt') IS DISTINCT FROM (to_jsonb(OLD) - 'withdrawnBy' - 'withdrawnAt') THEN
  RAISE EXCEPTION 'portal share only changes by its withdrawal';
 END IF;
 RETURN NEW;
END $$;--> statement-breakpoint
CREATE TRIGGER portal_shares_guard BEFORE UPDATE OR DELETE ON portal_shares FOR EACH ROW EXECUTE FUNCTION guard_portal_share();--> statement-breakpoint
CREATE TRIGGER portal_comments_append_only BEFORE UPDATE OR DELETE ON portal_comments FOR EACH ROW EXECUTE FUNCTION preserve_append_only();--> statement-breakpoint
CREATE TRIGGER portal_approvals_append_only BEFORE UPDATE OR DELETE ON portal_approvals FOR EACH ROW EXECUTE FUNCTION preserve_append_only();
