CREATE TABLE "capability_events" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"payload" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "experiments" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"payload" jsonb NOT NULL,
	"createdBy" text NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	"hypothesisId" text NOT NULL,
	"decisionId" text NOT NULL,
	CONSTRAINT "experiments_workspaceId_brandId_id_unique" UNIQUE("workspaceId","brandId","id")
);
--> statement-breakpoint
CREATE TABLE "learning_signals" (
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"learningId" text NOT NULL,
	"signalId" text NOT NULL,
	CONSTRAINT "learning_signals_workspaceId_brandId_learningId_signalId_pk" PRIMARY KEY("workspaceId","brandId","learningId","signalId")
);
--> statement-breakpoint
CREATE TABLE "learnings" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"payload" jsonb NOT NULL,
	"createdBy" text NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	CONSTRAINT "learnings_workspaceId_brandId_id_unique" UNIQUE("workspaceId","brandId","id")
);
--> statement-breakpoint
CREATE TABLE "signals" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"brandId" text NOT NULL,
	"payload" jsonb NOT NULL,
	"createdBy" text NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	"experimentId" text NOT NULL,
	CONSTRAINT "signals_workspaceId_brandId_id_unique" UNIQUE("workspaceId","brandId","id")
);
--> statement-breakpoint
ALTER TABLE "capability_events" ADD CONSTRAINT "capability_events_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experiments" ADD CONSTRAINT "experiments_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experiments" ADD CONSTRAINT "experiments_workspaceId_brandId_hypothesisId_hypotheses_workspaceId_brandId_id_fk" FOREIGN KEY ("workspaceId","brandId","hypothesisId") REFERENCES "public"."hypotheses"("workspaceId","brandId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experiments" ADD CONSTRAINT "experiments_workspaceId_brandId_decisionId_decisions_workspaceId_brandId_id_fk" FOREIGN KEY ("workspaceId","brandId","decisionId") REFERENCES "public"."decisions"("workspaceId","brandId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_signals" ADD CONSTRAINT "learning_signals_workspaceId_brandId_learningId_learnings_workspaceId_brandId_id_fk" FOREIGN KEY ("workspaceId","brandId","learningId") REFERENCES "public"."learnings"("workspaceId","brandId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_signals" ADD CONSTRAINT "learning_signals_workspaceId_brandId_signalId_signals_workspaceId_brandId_id_fk" FOREIGN KEY ("workspaceId","brandId","signalId") REFERENCES "public"."signals"("workspaceId","brandId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learnings" ADD CONSTRAINT "learnings_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learnings" ADD CONSTRAINT "learnings_workspaceId_brandId_brands_workspaceId_id_fk" FOREIGN KEY ("workspaceId","brandId") REFERENCES "public"."brands"("workspaceId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signals" ADD CONSTRAINT "signals_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signals" ADD CONSTRAINT "signals_workspaceId_brandId_experimentId_experiments_workspaceId_brandId_id_fk" FOREIGN KEY ("workspaceId","brandId","experimentId") REFERENCES "public"."experiments"("workspaceId","brandId","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "capability_events_userId_index" ON "capability_events" USING btree ("userId");