-- Custom SQL migration file, put your code below! --
-- PHASE4_SPEC §4.9/§4.10 · eleven work priorities (owner request 2026-10-11). Additive: the allowed values only grow;
-- existing records (including the earlier CONTENT value) stay valid and untouched (the table is append-only).
ALTER TABLE brand_work_priorities DROP CONSTRAINT brand_work_priority_intent;
--> statement-breakpoint
ALTER TABLE brand_work_priorities ADD CONSTRAINT brand_work_priority_intent CHECK (intent IN ('STRATEGY_FULL','STRATEGY_POINT','SELL_OFFER','VISUAL_IDENTITY','MARKETING_PLAN','SOCIAL_MEDIA','WEBSITE','CAMPAIGN','SALES_MATERIALS','OTHER','HELP_ME_CHOOSE','CONTENT'));
