CREATE TABLE "account_deletions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"auth_id" text,
	"receipt_hash" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"lease_token" uuid,
	"lease_until" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "account_deletions_receipt_hash_unique" UNIQUE("receipt_hash")
);
--> statement-breakpoint
ALTER TABLE "account_deletions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "account_preferences" (
	"user_id" text PRIMARY KEY NOT NULL,
	"default_reminder" text DEFAULT '15m' NOT NULL,
	"reminders_paused" boolean DEFAULT false NOT NULL,
	"onboarding_dismissed" boolean DEFAULT false NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "preferences_reminder_check" CHECK ("account_preferences"."default_reminder" in ('15m','1h','3h'))
);
--> statement-breakpoint
ALTER TABLE "account_preferences" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "feedback_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"category" text NOT NULL,
	"subject" text NOT NULL,
	"message" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "feedback_messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "operational_alerts" (
	"key" text PRIMARY KEY NOT NULL,
	"last_attempt_at" timestamp with time zone NOT NULL,
	"last_success_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "operational_alerts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "request_buckets" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "request_buckets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "account_state" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "account_preferences" ADD CONSTRAINT "account_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_messages" ADD CONSTRAINT "feedback_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "deletion_work_idx" ON "account_deletions" USING btree ("status","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "deletion_owner_idx" ON "account_deletions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "feedback_owner_idx" ON "feedback_messages" USING btree ("user_id","created_at");