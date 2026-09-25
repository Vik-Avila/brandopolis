CREATE TABLE "analyses" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"recommendationId" text,
	"contextVersion" text NOT NULL,
	"evaluation" jsonb,
	"trace" jsonb NOT NULL,
	"createdAt" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_workspaceId_brandId_brands_workspaceId_id_fk" FOREIGN KEY ("workspaceId","brandId") REFERENCES "public"."brands"("workspaceId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_workspaceId_brandId_recommendationId_recommendations_workspaceId_brandId_id_fk" FOREIGN KEY ("workspaceId","brandId","recommendationId") REFERENCES "public"."recommendations"("workspaceId","brandId","id") ON DELETE no action ON UPDATE no action;