import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  real,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ── Rubrics ──────────────────────────────────────────────────

export const rubrics = pgTable("rubrics", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description"),
  evalCategory: text("eval_category", {
    enum: ["capability", "regression"],
  }).notNull(),
  isTemplate: boolean("is_template").notNull().default(false),
  deltaThreshold: real("delta_threshold").notNull().default(1.0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const rubricVersions = pgTable("rubric_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  rubricId: uuid("rubric_id")
    .notNull()
    .references(() => rubrics.id, { onDelete: "cascade" }),
  version: integer("version").notNull().default(1),
  isCurrent: boolean("is_current").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── Performance Levels (columns of the rubric) ──────────────

export const performanceLevels = pgTable("performance_levels", {
  id: uuid("id").primaryKey().defaultRandom(),
  versionId: uuid("version_id")
    .notNull()
    .references(() => rubricVersions.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  sortOrder: integer("sort_order").notNull(),
  numericValue: real("numeric_value"),
  isPassing: boolean("is_passing").notNull().default(false),
});

// ── Criteria (rows of the rubric) ───────────────────────────

export const criteria = pgTable("criteria", {
  id: uuid("id").primaryKey().defaultRandom(),
  versionId: uuid("version_id")
    .notNull()
    .references(() => rubricVersions.id, { onDelete: "cascade" }),
  stableKey: text("stable_key").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").notNull(),
  weight: real("weight").notNull().default(1.0),
  graderType: text("grader_type", {
    enum: ["automated", "model", "human"],
  }).notNull(),
  graderConfig: jsonb("grader_config"),
});

// ── Rubric Cells (intersection of criteria x levels) ────────

export const rubricCells = pgTable(
  "rubric_cells",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    criterionId: uuid("criterion_id")
      .notNull()
      .references(() => criteria.id, { onDelete: "cascade" }),
    levelId: uuid("level_id")
      .notNull()
      .references(() => performanceLevels.id, { onDelete: "cascade" }),
    description: text("description"),
  },
  (table) => [
    uniqueIndex("rubric_cells_criterion_level_idx").on(
      table.criterionId,
      table.levelId,
    ),
  ],
);

// ── Tests (task descriptions) ───────────────────────────────

export const tests = pgTable("tests", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description").notNull(), // the task prompt
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── Apps / Agents ───────────────────────────────────────────

export const apps = pgTable("apps", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  appType: text("app_type", { enum: ["app", "agent"] }).notNull(),
  repoPath: text("repo_path"),
  agentPath: text("agent_path"), // path to agent .md file (e.g. ~/.claude/agents/ui-engineer.md)
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── Evaluation Runs ─────────────────────────────────────────

export const evaluationRuns = pgTable("evaluation_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  rubricVersionId: uuid("rubric_version_id")
    .notNull()
    .references(() => rubricVersions.id),
  appId: uuid("app_id")
    .notNull()
    .references(() => apps.id),
  status: text("status", {
    enum: ["pending", "scoring", "discussing", "finalized"],
  })
    .notNull()
    .default("pending"),
  trialNumber: integer("trial_number").notNull().default(1),
  batchId: uuid("batch_id"),
  temperature: real("temperature").notNull().default(0),
  // Token tracking — scoring cost (what AAAnalytics spends grading)
  scoringPromptTokens: integer("scoring_prompt_tokens"),
  scoringCompletionTokens: integer("scoring_completion_tokens"),
  scoringTotalTokens: integer("scoring_total_tokens"),
  // Token tracking — agent cost (what the agent spent building the code)
  agentTotalTokens: integer("agent_total_tokens"),
  // Net ROI: agentTotalTokens(attempt1) - agentTotalTokens(attempt2) - scoringTotalTokens
  // Agent prompt tracking
  agentPromptHash: text("agent_prompt_hash"), // hash of agent .md at time of run
  promptLog: text("prompt_log"),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  finalizedAt: timestamp("finalized_at"),
});

// ── Scores ──────────────────────────────────────────────────

export const scores = pgTable(
  "scores",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    runId: uuid("run_id")
      .notNull()
      .references(() => evaluationRuns.id, { onDelete: "cascade" }),
    criterionId: uuid("criterion_id")
      .notNull()
      .references(() => criteria.id),
    userLevelId: uuid("user_level_id").references(() => performanceLevels.id),
    claudeLevelId: uuid("claude_level_id").references(
      () => performanceLevels.id,
    ),
    autoLevelId: uuid("auto_level_id").references(() => performanceLevels.id),
    finalLevelId: uuid("final_level_id").references(
      () => performanceLevels.id,
    ),
    userComment: text("user_comment"),
    claudeComment: text("claude_comment"),
    autoOutput: text("auto_output"),
    finalComment: text("final_comment"),
    citations: jsonb("citations"),
  },
  (table) => [
    uniqueIndex("scores_run_criterion_idx").on(table.runId, table.criterionId),
  ],
);

// ── Score Discussions ───────────────────────────────────────

export const scoreDiscussions = pgTable("score_discussions", {
  id: uuid("id").primaryKey().defaultRandom(),
  scoreId: uuid("score_id")
    .notNull()
    .references(() => scores.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["user", "claude", "system"] }).notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
