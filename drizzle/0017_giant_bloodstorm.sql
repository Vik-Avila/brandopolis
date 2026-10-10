CREATE TABLE "external_step_releases" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"stepId" text NOT NULL,
	"attemptNumber" integer NOT NULL,
	"releasedBy" text NOT NULL,
	"criterion" text NOT NULL,
	"releasedAt" timestamp with time zone NOT NULL,
	CONSTRAINT "external_step_releases_stepId_attemptNumber_unique" UNIQUE("stepId","attemptNumber")
);
--> statement-breakpoint
ALTER TABLE "external_step_releases" ADD CONSTRAINT "external_step_releases_releasedBy_users_id_fk" FOREIGN KEY ("releasedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_step_releases" ADD CONSTRAINT "external_step_releases_workspaceId_brandId_stepId_external_steps_workspaceId_brandId_id_fk" FOREIGN KEY ("workspaceId","brandId","stepId") REFERENCES "public"."external_steps"("workspaceId","brandId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "external_jobs_one_open_per_subject" ON "external_jobs" USING btree ("workspaceId","brandId","subjectKind","subjectId") WHERE status NOT IN ('SUCCEEDED','FAILED','EXPIRED','CANCELLED');--> statement-breakpoint
-- ADR-0031 C1 (security review 2026-10-10): human releases are append-only; deleted only inside a registered Brand deletion.
CREATE TRIGGER external_step_releases_append_only BEFORE UPDATE OR DELETE ON external_step_releases FOR EACH ROW EXECUTE FUNCTION preserve_append_only();
--> statement-breakpoint
ALTER TABLE external_step_releases ADD CONSTRAINT external_step_release_criterion CHECK (char_length(criterion) BETWEEN 10 AND 2000);