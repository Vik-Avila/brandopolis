ALTER TABLE "experiments" ADD COLUMN "objective" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "experiments" ADD COLUMN "successCriteria" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "experiments" ADD COLUMN "startedAt" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "experiments" ADD COLUMN "completedAt" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "experiments_workspaceId_brandId_hypothesisId_index" ON "experiments" USING btree ("workspaceId","brandId","hypothesisId");--> statement-breakpoint
CREATE INDEX "experiments_workspaceId_brandId_decisionId_index" ON "experiments" USING btree ("workspaceId","brandId","decisionId");--> statement-breakpoint
CREATE INDEX "learning_signals_workspaceId_brandId_signalId_index" ON "learning_signals" USING btree ("workspaceId","brandId","signalId");--> statement-breakpoint
CREATE INDEX "signals_workspaceId_brandId_experimentId_index" ON "signals" USING btree ("workspaceId","brandId","experimentId");
--> statement-breakpoint
-- Preserve existing declared content; do not invent historical execution dates.
UPDATE experiments e SET objective=h.payload->>'statement', "successCriteria"=e.payload->>'intendedSignal'
FROM hypotheses h WHERE h.id=e."hypothesisId" AND h."workspaceId"=e."workspaceId" AND h."brandId"=e."brandId";
