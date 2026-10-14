CREATE TABLE "reminder_worker_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"success" boolean,
	"scheduled" integer DEFAULT 0 NOT NULL,
	"cancelled" integer DEFAULT 0 NOT NULL,
	"retried" integer DEFAULT 0 NOT NULL,
	"failed" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reminder_worker_runs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "mail_events" ADD COLUMN "occurred_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "worker_runs_started_idx" ON "reminder_worker_runs" USING btree ("started_at");