-- ADR-0032 · DOM-004: periodic re-verification of custom domains. A held hostname (VERIFIED or NEEDS_REVERIFICATION)
-- stays reserved; a domain is served only while its last confirmation is current; a failed lookup never transfers it.
DROP INDEX "site_domains_one_verified_host";--> statement-breakpoint
ALTER TABLE "site_domains" ADD COLUMN "lastConfirmedAt" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "site_domains" ADD COLUMN "failingSince" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "site_domains" ADD COLUMN "nextCheckAt" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "site_domains" ADD COLUMN "lastOutcome" text;--> statement-breakpoint
CREATE UNIQUE INDEX "site_domains_one_held_host" ON "site_domains" USING btree ("hostname") WHERE status IN ('VERIFIED','NEEDS_REVERIFICATION');--> statement-breakpoint
CREATE INDEX "site_domains_due" ON "site_domains" USING btree ("nextCheckAt");--> statement-breakpoint
ALTER TABLE site_domains DROP CONSTRAINT site_domain_values;--> statement-breakpoint
ALTER TABLE site_domains ADD CONSTRAINT site_domain_values CHECK (kind IN ('BRANDOPOLIS','CUSTOM') AND status IN ('PENDING_VERIFICATION','VERIFIED','NEEDS_REVERIFICATION','FAILED','REMOVED') AND hostname ~ '^[a-z0-9.:-]{4,253}$' AND ("lastOutcome" IS NULL OR "lastOutcome" IN ('CONFIRMED','RECORD_MISSING','LOOKUP_FAILED','LOST','EXPIRED','NOT_FOUND','REPLACED')));--> statement-breakpoint
CREATE OR REPLACE FUNCTION guard_site_domain() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP = 'DELETE' THEN
  IF brand_deletion_in_progress(OLD."workspaceId", OLD."brandId") THEN RETURN OLD; END IF;
  RAISE EXCEPTION 'site_domains rows are kept';
 END IF;
 IF OLD.status = 'REMOVED' OR NOT ((OLD.status = 'PENDING_VERIFICATION' AND NEW.status IN ('PENDING_VERIFICATION','VERIFIED','FAILED','REMOVED')) OR (OLD.status IN ('VERIFIED','NEEDS_REVERIFICATION') AND NEW.status IN ('VERIFIED','NEEDS_REVERIFICATION','FAILED','REMOVED')) OR (OLD.status = 'FAILED' AND NEW.status IN ('PENDING_VERIFICATION','VERIFIED','FAILED','REMOVED'))) THEN RAISE EXCEPTION 'site domain transition % -> % is not allowed', OLD.status, NEW.status; END IF;
 IF (to_jsonb(NEW) - 'status' - 'checkedAt' - 'verifiedAt' - 'removedBy' - 'removedAt' - 'lastConfirmedAt' - 'failingSince' - 'nextCheckAt' - 'lastOutcome') IS DISTINCT FROM (to_jsonb(OLD) - 'status' - 'checkedAt' - 'verifiedAt' - 'removedBy' - 'removedAt' - 'lastConfirmedAt' - 'failingSince' - 'nextCheckAt' - 'lastOutcome') THEN RAISE EXCEPTION 'site domain identity is immutable'; END IF;
 RETURN NEW;
END $$;--> statement-breakpoint
UPDATE site_domains SET "lastConfirmedAt" = COALESCE("checkedAt", "verifiedAt", "createdAt"), "nextCheckAt" = CASE WHEN kind = 'CUSTOM' THEN now() ELSE NULL END WHERE status = 'VERIFIED';
