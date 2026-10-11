-- ADR-0032 · a hostname is reserved only once its TXT proof is verified; unverified claims never block the real owner.
DROP INDEX "site_domains_one_active_host";--> statement-breakpoint
CREATE UNIQUE INDEX "site_domains_one_verified_host" ON "site_domains" USING btree ("hostname") WHERE status = 'VERIFIED';