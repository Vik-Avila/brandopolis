ALTER TABLE "document_claims" ADD COLUMN "reviewedStatement" text;--> statement-breakpoint
ALTER TABLE "document_claims" ADD COLUMN "reviewedBy" text;--> statement-breakpoint
ALTER TABLE "document_claims" ADD COLUMN "reviewedAt" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "document_claims" ADD COLUMN "contextKind" text;--> statement-breakpoint
ALTER TABLE "document_claims" ADD COLUMN "contextEntityId" text;--> statement-breakpoint
ALTER TABLE "document_claims" ADD CONSTRAINT "document_claims_reviewedBy_users_id_fk" FOREIGN KEY ("reviewedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;