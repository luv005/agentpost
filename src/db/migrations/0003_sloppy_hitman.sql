CREATE TABLE "magic_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"token" varchar(128) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "magic_links_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "google_id" varchar(255);--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "avatar_url" varchar(512);--> statement-breakpoint
CREATE INDEX "magic_links_token_idx" ON "magic_links" USING btree ("token");--> statement-breakpoint
CREATE INDEX "magic_links_email_idx" ON "magic_links" USING btree ("email");--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_google_id_unique" UNIQUE("google_id");