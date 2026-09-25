CREATE TABLE "pilot_feedback" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"sessionId" text NOT NULL,
	"usefulness" integer NOT NULL,
	"clarity" integer NOT NULL,
	"confidence" integer NOT NULL,
	"comment" text NOT NULL,
	"kind" text NOT NULL,
	"createdAt" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "login_flows" (
	"stateHash" text PRIMARY KEY NOT NULL,
	"verifier" text NOT NULL,
	"nonce" text NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pilot_events" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text,
	"sessionId" text,
	"name" text NOT NULL,
	"cohort" text NOT NULL,
	"intervention" text NOT NULL,
	"occurredAt" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pilot_identities" (
	"userId" text PRIMARY KEY NOT NULL,
	"issuer" text NOT NULL,
	"subject" text NOT NULL,
	"workspaceId" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "pilot_identities_issuer_subject_unique" UNIQUE("issuer","subject")
);
--> statement-breakpoint
CREATE TABLE "pilot_sessions" (
	"sessionId" text PRIMARY KEY NOT NULL,
	"tokenHash" text NOT NULL,
	"userId" text NOT NULL,
	"intervention" text NOT NULL,
	"startedAt" timestamp with time zone NOT NULL,
	CONSTRAINT "pilot_sessions_tokenHash_unique" UNIQUE("tokenHash")
);
--> statement-breakpoint
CREATE TABLE "pilot_workspaces" (
	"workspaceId" text PRIMARY KEY NOT NULL,
	"cohort" text NOT NULL,
	"createdAt" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pilot_feedback" ADD CONSTRAINT "pilot_feedback_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pilot_feedback" ADD CONSTRAINT "pilot_feedback_workspaceId_pilot_workspaces_workspaceId_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."pilot_workspaces"("workspaceId") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pilot_feedback" ADD CONSTRAINT "pilot_feedback_workspaceId_brandId_brands_workspaceId_id_fk" FOREIGN KEY ("workspaceId","brandId") REFERENCES "public"."brands"("workspaceId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pilot_events" ADD CONSTRAINT "pilot_events_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pilot_events" ADD CONSTRAINT "pilot_events_workspaceId_pilot_workspaces_workspaceId_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."pilot_workspaces"("workspaceId") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pilot_events" ADD CONSTRAINT "pilot_events_workspaceId_brandId_brands_workspaceId_id_fk" FOREIGN KEY ("workspaceId","brandId") REFERENCES "public"."brands"("workspaceId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pilot_identities" ADD CONSTRAINT "pilot_identities_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pilot_identities" ADD CONSTRAINT "pilot_identities_workspaceId_pilot_workspaces_workspaceId_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."pilot_workspaces"("workspaceId") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pilot_identities" ADD CONSTRAINT "pilot_identities_workspaceId_userId_memberships_workspaceId_userId_fk" FOREIGN KEY ("workspaceId","userId") REFERENCES "public"."memberships"("workspaceId","userId") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pilot_sessions" ADD CONSTRAINT "pilot_sessions_tokenHash_sessions_tokenHash_fk" FOREIGN KEY ("tokenHash") REFERENCES "public"."sessions"("tokenHash") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pilot_sessions" ADD CONSTRAINT "pilot_sessions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pilot_workspaces" ADD CONSTRAINT "pilot_workspaces_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pilot_events_userId_occurredAt_index" ON "pilot_events" USING btree ("userId","occurredAt");