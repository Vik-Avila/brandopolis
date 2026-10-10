CREATE TABLE "personal_reflections" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text,
	"decisionId" text,
	"idempotencyKey" text NOT NULL,
	"payload" jsonb NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	CONSTRAINT "personal_reflections_userId_idempotencyKey_unique" UNIQUE("userId","idempotencyKey")
);
--> statement-breakpoint
ALTER TABLE "personal_reflections" ADD CONSTRAINT "personal_reflections_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal_reflections" ADD CONSTRAINT "personal_reflections_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal_reflections" ADD CONSTRAINT "personal_reflections_workspaceId_brandId_brands_workspaceId_id_fk" FOREIGN KEY ("workspaceId","brandId") REFERENCES "public"."brands"("workspaceId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal_reflections" ADD CONSTRAINT "personal_reflections_workspaceId_brandId_decisionId_decisions_workspaceId_brandId_id_fk" FOREIGN KEY ("workspaceId","brandId","decisionId") REFERENCES "public"."decisions"("workspaceId","brandId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "personal_reflections_userId_workspaceId_createdAt_index" ON "personal_reflections" USING btree ("userId","workspaceId","createdAt");