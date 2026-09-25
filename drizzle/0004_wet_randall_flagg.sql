CREATE TABLE "evidence" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"payload" jsonb NOT NULL,
	"createdBy" text NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	CONSTRAINT "evidence_workspaceId_brandId_id_unique" UNIQUE("workspaceId","brandId","id")
);
--> statement-breakpoint
CREATE TABLE "hypotheses" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"payload" jsonb NOT NULL,
	"createdBy" text NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	CONSTRAINT "hypotheses_workspaceId_brandId_id_unique" UNIQUE("workspaceId","brandId","id")
);
--> statement-breakpoint
CREATE TABLE "open_questions" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"payload" jsonb NOT NULL,
	"createdBy" text NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	CONSTRAINT "open_questions_workspaceId_brandId_id_unique" UNIQUE("workspaceId","brandId","id")
);
--> statement-breakpoint
CREATE TABLE "user_inputs" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"payload" jsonb NOT NULL,
	"createdBy" text NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	CONSTRAINT "user_inputs_workspaceId_brandId_id_unique" UNIQUE("workspaceId","brandId","id")
);
--> statement-breakpoint
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_workspaceId_brandId_brands_workspaceId_id_fk" FOREIGN KEY ("workspaceId","brandId") REFERENCES "public"."brands"("workspaceId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hypotheses" ADD CONSTRAINT "hypotheses_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hypotheses" ADD CONSTRAINT "hypotheses_workspaceId_brandId_brands_workspaceId_id_fk" FOREIGN KEY ("workspaceId","brandId") REFERENCES "public"."brands"("workspaceId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "open_questions" ADD CONSTRAINT "open_questions_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "open_questions" ADD CONSTRAINT "open_questions_workspaceId_brandId_brands_workspaceId_id_fk" FOREIGN KEY ("workspaceId","brandId") REFERENCES "public"."brands"("workspaceId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_inputs" ADD CONSTRAINT "user_inputs_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_inputs" ADD CONSTRAINT "user_inputs_workspaceId_brandId_brands_workspaceId_id_fk" FOREIGN KEY ("workspaceId","brandId") REFERENCES "public"."brands"("workspaceId","id") ON DELETE no action ON UPDATE no action;