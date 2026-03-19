CREATE TABLE "attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"key" varchar(512) NOT NULL,
	"filename" varchar(255) NOT NULL,
	"content_type" varchar(255) NOT NULL,
	"size" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "domains" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"domain" varchar(255) NOT NULL,
	"verification_status" varchar(20) DEFAULT 'pending' NOT NULL,
	"dkim_tokens" jsonb DEFAULT '[]'::jsonb,
	"verification_token" varchar(255),
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "inboxes" ADD COLUMN "domain_id" uuid;--> statement-breakpoint
ALTER TABLE "inboxes" ADD COLUMN "total_sent" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "domains" ADD CONSTRAINT "domains_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attachments_account_id_idx" ON "attachments" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "domains_account_id_idx" ON "domains" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "domains_account_domain_idx" ON "domains" USING btree ("account_id","domain");--> statement-breakpoint
ALTER TABLE "inboxes" ADD CONSTRAINT "inboxes_domain_id_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id") ON DELETE no action ON UPDATE no action;