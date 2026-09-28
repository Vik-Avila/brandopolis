CREATE TABLE "user_accounts" (
	"userId" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"normalizedEmail" text NOT NULL,
	"emailVerifiedAt" timestamp with time zone,
	"displayName" text,
	"avatarUrl" text,
	"createdAt" timestamp with time zone NOT NULL,
	"lastLoginAt" timestamp with time zone,
	CONSTRAINT "user_accounts_normalizedEmail_unique" UNIQUE("normalizedEmail")
);
--> statement-breakpoint
ALTER TABLE "user_accounts" ADD CONSTRAINT "user_accounts_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_accounts_normalizedEmail_index" ON "user_accounts" USING btree ("normalizedEmail");