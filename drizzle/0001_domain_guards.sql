-- Custom SQL migration file, put your code below! --
ALTER TABLE memberships ADD CONSTRAINT membership_role CHECK (role IN ('ADMIN','MEMBER','AI'));
--> statement-breakpoint
ALTER TABLE brands ADD CONSTRAINT brand_data_class CHECK ("dataClass" IN ('DEMO','PILOT','PRODUCTION'));
--> statement-breakpoint
ALTER TABLE decision_versions ADD CONSTRAINT positive_sequence CHECK (sequence > 0);
--> statement-breakpoint
ALTER TABLE decision_versions ADD CONSTRAINT previous_same_decision FOREIGN KEY ("workspaceId","brandId","decisionId","previousVersionId") REFERENCES decision_versions("workspaceId","brandId","decisionId",id);
--> statement-breakpoint
ALTER TABLE decisions ADD CONSTRAINT active_same_decision FOREIGN KEY ("workspaceId","brandId",id,"activeVersionId") REFERENCES decision_versions("workspaceId","brandId","decisionId",id) DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
CREATE UNIQUE INDEX one_approved_version ON decision_versions("decisionId") WHERE "versionStatus" = 'APPROVED';
--> statement-breakpoint
ALTER TABLE impacts ADD CONSTRAINT impact_status CHECK (status IN ('IMPACT_PENDING','COMPLETED'));
--> statement-breakpoint
ALTER TABLE review_items ADD CONSTRAINT human_completed_review CHECK ((status = 'COMPLETED') = ("reviewedBy" IS NOT NULL));
--> statement-breakpoint
ALTER TABLE recommendations ADD CONSTRAINT recommendation_resolution CHECK (resolution IN ('GENERATED','ACCEPTED','MODIFIED','REJECTED','STALE'));
--> statement-breakpoint
CREATE FUNCTION preserve_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Decision history cannot be deleted'; END IF;
 IF (to_jsonb(NEW) - 'versionStatus') IS DISTINCT FROM (to_jsonb(OLD) - 'versionStatus')
    OR OLD."versionStatus" <> 'APPROVED' OR NEW."versionStatus" <> 'SUPERSEDED' THEN
   RAISE EXCEPTION 'Only APPROVED to SUPERSEDED metadata transition is allowed';
 END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER preserve_version BEFORE UPDATE OR DELETE ON decision_versions FOR EACH ROW EXECUTE FUNCTION preserve_version();
--> statement-breakpoint
CREATE FUNCTION preserve_audit() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Strategic audit is append only'; END $$;
--> statement-breakpoint
CREATE TRIGGER preserve_audit BEFORE UPDATE OR DELETE ON strategic_audit FOR EACH ROW EXECUTE FUNCTION preserve_audit();
--> statement-breakpoint
CREATE FUNCTION valid_version_chain() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE prior_sequence integer;
BEGIN
 IF NEW.sequence = 1 THEN
  IF NEW."previousVersionId" IS NOT NULL THEN RAISE EXCEPTION 'First version has no predecessor'; END IF;
 ELSE
  SELECT sequence INTO prior_sequence FROM decision_versions WHERE id=NEW."previousVersionId" AND "decisionId"=NEW."decisionId";
  IF prior_sequence IS NULL OR prior_sequence <> NEW.sequence - 1 THEN RAISE EXCEPTION 'Broken version chain'; END IF;
 END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER valid_version_chain BEFORE INSERT ON decision_versions FOR EACH ROW EXECUTE FUNCTION valid_version_chain();
--> statement-breakpoint
CREATE FUNCTION valid_active_version() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE active_id text;
BEGIN
 SELECT "activeVersionId" INTO active_id FROM decisions WHERE id=NEW.id;
 IF active_id IS NULL OR NOT EXISTS(SELECT 1 FROM decision_versions WHERE id=active_id AND "decisionId"=NEW.id AND "versionStatus"='APPROVED') THEN
  RAISE EXCEPTION 'Decision must point to approved current version';
 END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER valid_active_version AFTER INSERT OR UPDATE ON decisions DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION valid_active_version();
--> statement-breakpoint
CREATE FUNCTION dependency_no_cycle() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 PERFORM 1 FROM brands WHERE id=NEW."brandId" AND "workspaceId"=NEW."workspaceId" FOR UPDATE;
 IF NEW."upstreamDecisionId"=NEW."downstreamDecisionId" OR EXISTS (
  WITH RECURSIVE reachable(id) AS (
   SELECT "downstreamDecisionId" FROM dependencies WHERE "upstreamDecisionId"=NEW."downstreamDecisionId" AND "workspaceId"=NEW."workspaceId" AND "brandId"=NEW."brandId" AND id<>NEW.id
   UNION
   SELECT d."downstreamDecisionId" FROM dependencies d JOIN reachable r ON d."upstreamDecisionId"=r.id WHERE d."workspaceId"=NEW."workspaceId" AND d."brandId"=NEW."brandId" AND d.id<>NEW.id
  ) SELECT 1 FROM reachable WHERE id=NEW."upstreamDecisionId"
 ) THEN RAISE EXCEPTION 'Dependency cycle'; END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER dependency_no_cycle BEFORE INSERT OR UPDATE ON dependencies FOR EACH ROW EXECUTE FUNCTION dependency_no_cycle();
