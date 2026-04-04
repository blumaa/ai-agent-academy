CREATE TABLE "apps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"app_type" text NOT NULL,
	"repo_path" text,
	"agent_path" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "criteria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version_id" uuid NOT NULL,
	"stable_key" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"sort_order" integer NOT NULL,
	"weight" real DEFAULT 1 NOT NULL,
	"grader_type" text NOT NULL,
	"grader_config" jsonb
);
--> statement-breakpoint
CREATE TABLE "evaluation_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rubric_version_id" uuid NOT NULL,
	"app_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"trial_number" integer DEFAULT 1 NOT NULL,
	"batch_id" uuid,
	"temperature" real DEFAULT 0 NOT NULL,
	"scoring_prompt_tokens" integer,
	"scoring_completion_tokens" integer,
	"scoring_total_tokens" integer,
	"agent_total_tokens" integer,
	"agent_prompt_hash" text,
	"prompt_log" text,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"finalized_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "performance_levels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version_id" uuid NOT NULL,
	"label" text NOT NULL,
	"sort_order" integer NOT NULL,
	"numeric_value" real,
	"is_passing" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rubric_cells" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"criterion_id" uuid NOT NULL,
	"level_id" uuid NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "rubric_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rubric_id" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"is_current" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rubrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"eval_category" text NOT NULL,
	"is_template" boolean DEFAULT false NOT NULL,
	"delta_threshold" real DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "score_discussions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"score_id" uuid NOT NULL,
	"role" text NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"criterion_id" uuid NOT NULL,
	"user_level_id" uuid,
	"claude_level_id" uuid,
	"auto_level_id" uuid,
	"final_level_id" uuid,
	"user_comment" text,
	"claude_comment" text,
	"auto_output" text,
	"final_comment" text,
	"citations" jsonb
);
--> statement-breakpoint
ALTER TABLE "criteria" ADD CONSTRAINT "criteria_version_id_rubric_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."rubric_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_runs" ADD CONSTRAINT "evaluation_runs_rubric_version_id_rubric_versions_id_fk" FOREIGN KEY ("rubric_version_id") REFERENCES "public"."rubric_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_runs" ADD CONSTRAINT "evaluation_runs_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_levels" ADD CONSTRAINT "performance_levels_version_id_rubric_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."rubric_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rubric_cells" ADD CONSTRAINT "rubric_cells_criterion_id_criteria_id_fk" FOREIGN KEY ("criterion_id") REFERENCES "public"."criteria"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rubric_cells" ADD CONSTRAINT "rubric_cells_level_id_performance_levels_id_fk" FOREIGN KEY ("level_id") REFERENCES "public"."performance_levels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rubric_versions" ADD CONSTRAINT "rubric_versions_rubric_id_rubrics_id_fk" FOREIGN KEY ("rubric_id") REFERENCES "public"."rubrics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "score_discussions" ADD CONSTRAINT "score_discussions_score_id_scores_id_fk" FOREIGN KEY ("score_id") REFERENCES "public"."scores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scores" ADD CONSTRAINT "scores_run_id_evaluation_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."evaluation_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scores" ADD CONSTRAINT "scores_criterion_id_criteria_id_fk" FOREIGN KEY ("criterion_id") REFERENCES "public"."criteria"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scores" ADD CONSTRAINT "scores_user_level_id_performance_levels_id_fk" FOREIGN KEY ("user_level_id") REFERENCES "public"."performance_levels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scores" ADD CONSTRAINT "scores_claude_level_id_performance_levels_id_fk" FOREIGN KEY ("claude_level_id") REFERENCES "public"."performance_levels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scores" ADD CONSTRAINT "scores_auto_level_id_performance_levels_id_fk" FOREIGN KEY ("auto_level_id") REFERENCES "public"."performance_levels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scores" ADD CONSTRAINT "scores_final_level_id_performance_levels_id_fk" FOREIGN KEY ("final_level_id") REFERENCES "public"."performance_levels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "rubric_cells_criterion_level_idx" ON "rubric_cells" USING btree ("criterion_id","level_id");--> statement-breakpoint
CREATE UNIQUE INDEX "scores_run_criterion_idx" ON "scores" USING btree ("run_id","criterion_id");