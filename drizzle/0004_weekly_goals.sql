CREATE TABLE "weekly_goals" (
	"user_id" text NOT NULL,
	"week_start" date NOT NULL,
	"contests" integer DEFAULT 0 NOT NULL,
	"problems" integer DEFAULT 0 NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "weekly_goals_user_id_week_start_pk" PRIMARY KEY("user_id","week_start"),
	CONSTRAINT "weekly_goals_contests_check" CHECK ("weekly_goals"."contests" between 0 and 21),
	CONSTRAINT "weekly_goals_problems_check" CHECK ("weekly_goals"."problems" between 0 and 500),
	CONSTRAINT "weekly_goals_monday_check" CHECK (extract(isodow from "weekly_goals"."week_start") = 1)
);
--> statement-breakpoint
ALTER TABLE "weekly_goals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "weekly_goals" ADD CONSTRAINT "weekly_goals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;