-- Custom SQL migration file, put your code below! --
ALTER TABLE decision_versions ADD CONSTRAINT version_actor_membership FOREIGN KEY ("workspaceId","actorUserId") REFERENCES memberships("workspaceId","userId");
--> statement-breakpoint
ALTER TABLE strategic_audit ADD CONSTRAINT audit_actor_membership FOREIGN KEY ("workspaceId","actorUserId") REFERENCES memberships("workspaceId","userId");
--> statement-breakpoint
ALTER TABLE strategic_audit ADD CONSTRAINT audit_decision_scope FOREIGN KEY ("workspaceId","brandId","decisionId") REFERENCES decisions("workspaceId","brandId",id);
--> statement-breakpoint
ALTER TABLE strategic_audit ADD CONSTRAINT audit_previous_scope FOREIGN KEY ("workspaceId","brandId","decisionId","previousVersion") REFERENCES decision_versions("workspaceId","brandId","decisionId",id);
--> statement-breakpoint
ALTER TABLE strategic_audit ADD CONSTRAINT audit_new_scope FOREIGN KEY ("workspaceId","brandId","decisionId","newVersion") REFERENCES decision_versions("workspaceId","brandId","decisionId",id);
--> statement-breakpoint
ALTER TABLE strategic_audit ADD CONSTRAINT audit_recommendation_scope FOREIGN KEY ("workspaceId","brandId","sourceRecommendationId") REFERENCES recommendations("workspaceId","brandId",id);
--> statement-breakpoint
CREATE FUNCTION version_current_integrity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS (
  SELECT 1 FROM decisions d JOIN decision_versions v ON v.id=d."activeVersionId" AND v."decisionId"=d.id
  WHERE d.id=NEW."decisionId" AND v."versionStatus"='APPROVED'
 ) THEN RAISE EXCEPTION 'Supersede requires a new active approved version'; END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER version_current_integrity AFTER INSERT OR UPDATE ON decision_versions DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION version_current_integrity();
--> statement-breakpoint
CREATE FUNCTION version_human_actor() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS (
  SELECT 1 FROM memberships m WHERE m."workspaceId"=NEW."workspaceId" AND m."userId"=NEW."actorUserId" AND m.active AND (
   m.role='ADMIN' OR (m.role='MEMBER' AND EXISTS(SELECT 1 FROM brand_assignments a WHERE a."workspaceId"=m."workspaceId" AND a."userId"=m."userId" AND a."brandId"=NEW."brandId"))
  )
 ) THEN RAISE EXCEPTION 'Human strategic authority required'; END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER version_human_actor BEFORE INSERT ON decision_versions FOR EACH ROW EXECUTE FUNCTION version_human_actor();
