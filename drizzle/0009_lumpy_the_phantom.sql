CREATE TABLE "document_claims" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"documentId" text NOT NULL,
	"extractionId" text NOT NULL,
	"claimType" text NOT NULL,
	"statement" text NOT NULL,
	"location" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"confidence" text DEFAULT 'UNASSESSED' NOT NULL,
	"reviewStatus" text DEFAULT 'CANDIDATE' NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	CONSTRAINT "document_claims_workspaceId_brandId_id_unique" UNIQUE("workspaceId","brandId","id")
);
--> statement-breakpoint
CREATE TABLE "document_extractions" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"documentId" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"provider" text,
	"model" text,
	"content" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	CONSTRAINT "document_extractions_workspaceId_brandId_id_unique" UNIQUE("workspaceId","brandId","id"),
	CONSTRAINT "document_extractions_workspaceId_brandId_documentId_id_unique" UNIQUE("workspaceId","brandId","documentId","id")
);
--> statement-breakpoint
CREATE TABLE "source_documents" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"originalName" text NOT NULL,
	"mediaType" text NOT NULL,
	"bytes" integer NOT NULL,
	"sha256" text NOT NULL,
	"storageKey" text NOT NULL,
	"status" text DEFAULT 'UPLOADED' NOT NULL,
	"uploadedBy" text NOT NULL,
	"uploadedAt" timestamp with time zone NOT NULL,
	CONSTRAINT "source_documents_workspaceId_brandId_id_unique" UNIQUE("workspaceId","brandId","id")
);
--> statement-breakpoint
ALTER TABLE "document_claims" ADD CONSTRAINT "document_claims_workspaceId_brandId_documentId_source_documents_workspaceId_brandId_id_fk" FOREIGN KEY ("workspaceId","brandId","documentId") REFERENCES "public"."source_documents"("workspaceId","brandId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_claims" ADD CONSTRAINT "document_claims_workspaceId_brandId_documentId_extractionId_document_extractions_workspaceId_brandId_documentId_id_fk" FOREIGN KEY ("workspaceId","brandId","documentId","extractionId") REFERENCES "public"."document_extractions"("workspaceId","brandId","documentId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_extractions" ADD CONSTRAINT "document_extractions_workspaceId_brandId_documentId_source_documents_workspaceId_brandId_id_fk" FOREIGN KEY ("workspaceId","brandId","documentId") REFERENCES "public"."source_documents"("workspaceId","brandId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_documents" ADD CONSTRAINT "source_documents_uploadedBy_users_id_fk" FOREIGN KEY ("uploadedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_documents" ADD CONSTRAINT "source_documents_workspaceId_brandId_brands_workspaceId_id_fk" FOREIGN KEY ("workspaceId","brandId") REFERENCES "public"."brands"("workspaceId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "document_claims_workspaceId_brandId_documentId_index" ON "document_claims" USING btree ("workspaceId","brandId","documentId");--> statement-breakpoint
CREATE INDEX "document_claims_workspaceId_brandId_reviewStatus_index" ON "document_claims" USING btree ("workspaceId","brandId","reviewStatus");--> statement-breakpoint
CREATE INDEX "document_extractions_workspaceId_brandId_documentId_index" ON "document_extractions" USING btree ("workspaceId","brandId","documentId");--> statement-breakpoint
CREATE INDEX "source_documents_workspaceId_brandId_uploadedAt_index" ON "source_documents" USING btree ("workspaceId","brandId","uploadedAt");--> statement-breakpoint
CREATE INDEX "source_documents_workspaceId_brandId_sha256_index" ON "source_documents" USING btree ("workspaceId","brandId","sha256");