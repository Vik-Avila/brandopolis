CREATE TABLE "marketing_plans" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"year" integer NOT NULL,
	"focusStart" text,
	"revision" integer DEFAULT 0 NOT NULL,
	"createdBy" text NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	"updatedAt" timestamp with time zone NOT NULL,
	CONSTRAINT "marketing_plans_workspaceId_brandId_id_unique" UNIQUE("workspaceId","brandId","id"),
	CONSTRAINT "marketing_plans_workspaceId_brandId_year_unique" UNIQUE("workspaceId","brandId","year")
);
--> statement-breakpoint
CREATE TABLE "plan_actions" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"planId" text NOT NULL,
	"content" jsonb NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"createdBy" text NOT NULL,
	"idempotencyKey" text NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	"updatedAt" timestamp with time zone NOT NULL,
	CONSTRAINT "plan_actions_workspaceId_brandId_id_unique" UNIQUE("workspaceId","brandId","id"),
	CONSTRAINT "plan_actions_workspaceId_brandId_createdBy_idempotencyKey_unique" UNIQUE("workspaceId","brandId","createdBy","idempotencyKey")
);
--> statement-breakpoint
CREATE TABLE "plan_changes" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"planId" text NOT NULL,
	"entityType" text NOT NULL,
	"entityId" text NOT NULL,
	"revision" integer NOT NULL,
	"operation" text NOT NULL,
	"content" jsonb NOT NULL,
	"actorId" text NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	CONSTRAINT "plan_changes_entityType_entityId_revision_unique" UNIQUE("entityType","entityId","revision")
);
--> statement-breakpoint
CREATE TABLE "plan_objectives" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"planId" text NOT NULL,
	"content" jsonb NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"createdBy" text NOT NULL,
	"idempotencyKey" text NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	"updatedAt" timestamp with time zone NOT NULL,
	CONSTRAINT "plan_objectives_workspaceId_brandId_id_unique" UNIQUE("workspaceId","brandId","id"),
	CONSTRAINT "plan_objectives_workspaceId_brandId_createdBy_idempotencyKey_unique" UNIQUE("workspaceId","brandId","createdBy","idempotencyKey")
);
--> statement-breakpoint
ALTER TABLE "marketing_plans" ADD CONSTRAINT "marketing_plans_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_plans" ADD CONSTRAINT "marketing_plans_workspaceId_brandId_brands_workspaceId_id_fk" FOREIGN KEY ("workspaceId","brandId") REFERENCES "public"."brands"("workspaceId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_actions" ADD CONSTRAINT "plan_actions_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_actions" ADD CONSTRAINT "plan_actions_workspaceId_brandId_planId_marketing_plans_workspaceId_brandId_id_fk" FOREIGN KEY ("workspaceId","brandId","planId") REFERENCES "public"."marketing_plans"("workspaceId","brandId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_changes" ADD CONSTRAINT "plan_changes_actorId_users_id_fk" FOREIGN KEY ("actorId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_changes" ADD CONSTRAINT "plan_changes_workspaceId_brandId_planId_marketing_plans_workspaceId_brandId_id_fk" FOREIGN KEY ("workspaceId","brandId","planId") REFERENCES "public"."marketing_plans"("workspaceId","brandId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_objectives" ADD CONSTRAINT "plan_objectives_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_objectives" ADD CONSTRAINT "plan_objectives_workspaceId_brandId_planId_marketing_plans_workspaceId_brandId_id_fk" FOREIGN KEY ("workspaceId","brandId","planId") REFERENCES "public"."marketing_plans"("workspaceId","brandId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "plan_actions_workspaceId_brandId_planId_index" ON "plan_actions" USING btree ("workspaceId","brandId","planId");--> statement-breakpoint
CREATE INDEX "plan_changes_workspaceId_brandId_planId_index" ON "plan_changes" USING btree ("workspaceId","brandId","planId");--> statement-breakpoint
CREATE INDEX "plan_objectives_workspaceId_brandId_planId_index" ON "plan_objectives" USING btree ("workspaceId","brandId","planId");--> statement-breakpoint
-- ADR-0030 / PHASE4_SPEC §4.2 · plan guards. Revisions never go backwards; the change log is append-only.
ALTER TABLE marketing_plans ADD CONSTRAINT marketing_plan_year CHECK (year BETWEEN 2000 AND 2100);
--> statement-breakpoint
ALTER TABLE marketing_plans ADD CONSTRAINT marketing_plan_focus CHECK ("focusStart" IS NULL OR "focusStart" ~ '^\d{4}-\d{2}-\d{2}$');
--> statement-breakpoint
ALTER TABLE plan_changes ADD CONSTRAINT plan_change_entity CHECK ("entityType" IN ('PLAN','OBJECTIVE','ACTION'));
--> statement-breakpoint
ALTER TABLE plan_changes ADD CONSTRAINT plan_change_operation CHECK (operation IN ('CREATE','UPDATE','STATUS'));
--> statement-breakpoint
CREATE OR REPLACE FUNCTION preserve_plan_revision() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.revision < OLD.revision THEN RAISE EXCEPTION 'A plan revision cannot go backwards'; END IF;
 IF NEW."workspaceId" IS DISTINCT FROM OLD."workspaceId" OR NEW."brandId" IS DISTINCT FROM OLD."brandId" THEN RAISE EXCEPTION 'Plan scope is immutable'; END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER marketing_plans_revision BEFORE UPDATE ON marketing_plans FOR EACH ROW EXECUTE FUNCTION preserve_plan_revision();
--> statement-breakpoint
CREATE TRIGGER plan_objectives_revision BEFORE UPDATE ON plan_objectives FOR EACH ROW EXECUTE FUNCTION preserve_plan_revision();
--> statement-breakpoint
CREATE TRIGGER plan_actions_revision BEFORE UPDATE ON plan_actions FOR EACH ROW EXECUTE FUNCTION preserve_plan_revision();
--> statement-breakpoint
CREATE TRIGGER plan_changes_append_only BEFORE UPDATE OR DELETE ON plan_changes FOR EACH ROW EXECUTE FUNCTION preserve_append_only();
