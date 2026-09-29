CREATE TABLE "brand_profiles" (
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"isDemo" boolean DEFAULT false NOT NULL,
	"geographicInfluence" text,
	"primaryMarket" text,
	CONSTRAINT "brand_profiles_workspaceId_brandId_pk" PRIMARY KEY("workspaceId","brandId")
);
--> statement-breakpoint
CREATE TABLE "participant_profiles" (
	"userId" text PRIMARY KEY NOT NULL,
	"firstName" text NOT NULL,
	"lastName" text NOT NULL,
	"country" text NOT NULL,
	"region" text NOT NULL,
	"city" text NOT NULL,
	"primaryProfile" text NOT NULL,
	"companyOrProject" text,
	"sector" text,
	"pilotGoal" text,
	"privacyAcceptedAt" timestamp with time zone NOT NULL,
	"termsAcceptedAt" timestamp with time zone NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	"updatedAt" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "brand_profiles" ADD CONSTRAINT "brand_profiles_workspaceId_brandId_brands_workspaceId_id_fk" FOREIGN KEY ("workspaceId","brandId") REFERENCES "public"."brands"("workspaceId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participant_profiles" ADD CONSTRAINT "participant_profiles_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "brand_profiles_isDemo_index" ON "brand_profiles" USING btree ("isDemo");