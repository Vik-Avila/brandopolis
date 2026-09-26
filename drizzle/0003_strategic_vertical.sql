INSERT INTO questions (id, "workspaceId", "brandId", module, text, status)
SELECT gen_random_uuid()::text, b."workspaceId", b.id, 'Value Mechanism', 'Â¿CÃ³mo creamos y capturamos valor para ese cliente?', 'OPEN' FROM brands b
ON CONFLICT ("workspaceId", "brandId", module) DO NOTHING;
--> statement-breakpoint
INSERT INTO questions (id, "workspaceId", "brandId", module, text, status)
SELECT gen_random_uuid()::text, b."workspaceId", b.id, 'Core Message', 'Â¿QuÃ© idea principal queremos que comprenda y recuerde el cliente?', 'OPEN' FROM brands b
ON CONFLICT ("workspaceId", "brandId", module) DO NOTHING;