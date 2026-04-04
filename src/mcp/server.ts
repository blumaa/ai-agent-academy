import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, and } from "drizzle-orm";
import * as schema from "../db/schema.js";

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://localhost:5432/aaanalytics";

const client = postgres(DATABASE_URL);
const db = drizzle(client, { schema });

const server = new McpServer({
  name: "aaanalytics",
  version: "0.1.0",
});

// ── Tool 1: get_rubric ──────────────────────────────────────

server.registerTool(
  "get_rubric",
  {
    title: "Get Rubric",
    description:
      "Load a rubric's criteria and performance levels for self-grading. Call this at the end of your task to see what you're being graded on.",
    inputSchema: {
      rubric_id: z
        .string()
        .optional()
        .describe(
          "Rubric ID. If omitted, returns the first available rubric.",
        ),
      include_descriptions: z
        .boolean()
        .optional()
        .default(false)
        .describe(
          "Include cell descriptions for each level. Increases token count.",
        ),
    },
    annotations: { readOnlyHint: true },
  },
  async ({ rubric_id, include_descriptions }) => {
    let rubric;
    if (rubric_id) {
      [rubric] = await db
        .select()
        .from(schema.rubrics)
        .where(eq(schema.rubrics.id, rubric_id));
    } else {
      [rubric] = await db.select().from(schema.rubrics).limit(1);
    }

    if (!rubric) {
      return { content: [{ type: "text" as const, text: "No rubric found." }] };
    }

    const [version] = await db
      .select()
      .from(schema.rubricVersions)
      .where(
        and(
          eq(schema.rubricVersions.rubricId, rubric.id),
          eq(schema.rubricVersions.isCurrent, true),
        ),
      );

    if (!version) {
      return {
        content: [
          { type: "text" as const, text: "No current rubric version." },
        ],
      };
    }

    const criteria = await db
      .select()
      .from(schema.criteria)
      .where(eq(schema.criteria.versionId, version.id))
      .orderBy(schema.criteria.sortOrder);

    const levels = await db
      .select()
      .from(schema.performanceLevels)
      .where(eq(schema.performanceLevels.versionId, version.id))
      .orderBy(schema.performanceLevels.sortOrder);

    let cells: Array<{
      criterionId: string;
      levelId: string;
      description: string | null;
    }> = [];
    if (include_descriptions) {
      cells = await db.select().from(schema.rubricCells);
    }

    const output = {
      rubric_id: rubric.id,
      title: rubric.title,
      delta_threshold: rubric.deltaThreshold,
      levels: levels.map((l) => ({
        id: l.id,
        label: l.label,
        value: l.numericValue,
        passing: l.isPassing,
      })),
      criteria: criteria.map((c) => {
        const entry: Record<string, unknown> = {
          id: c.id,
          key: c.stableKey,
          name: c.name,
          weight: c.weight,
          grader: c.graderType,
        };
        if (include_descriptions) {
          entry.levels = levels.map((l) => {
            const cell = cells.find(
              (cl) => cl.criterionId === c.id && cl.levelId === l.id,
            );
            return { level: l.label, description: cell?.description ?? "" };
          });
        }
        return entry;
      }),
    };

    return {
      content: [{ type: "text" as const, text: JSON.stringify(output) }],
    };
  },
);

// ── Tool 2: submit_self_score ───────────────────────────────

server.registerTool(
  "submit_self_score",
  {
    title: "Submit Self-Score",
    description:
      "Submit your self-assessment scores after completing a task. Include evidence (file:line citations) for each criterion.",
    inputSchema: {
      rubric_id: z.string().describe("The rubric ID (from get_rubric)"),
      app_id: z
        .string()
        .optional()
        .describe(
          "App/agent ID. If omitted, uses the first available app.",
        ),
      scores: z
        .array(
          z.object({
            criterion_id: z
              .string()
              .describe("Criterion ID from get_rubric"),
            level_id: z.string().describe("Performance level ID"),
            comment: z
              .string()
              .describe("Brief explanation of why you chose this level"),
            citations: z
              .array(
                z.object({
                  file: z.string(),
                  line: z.number(),
                  note: z.string(),
                }),
              )
              .optional()
              .describe("File:line evidence supporting your score"),
          }),
        )
        .describe("Your self-assessment for each criterion"),
      agent_tokens: z
        .number()
        .optional()
        .describe(
          "Total tokens you consumed building the code (if known)",
        ),
    },
  },
  async ({ rubric_id, app_id, scores, agent_tokens }) => {
    const [version] = await db
      .select()
      .from(schema.rubricVersions)
      .where(
        and(
          eq(schema.rubricVersions.rubricId, rubric_id),
          eq(schema.rubricVersions.isCurrent, true),
        ),
      );

    if (!version) {
      return {
        content: [
          { type: "text" as const, text: "Rubric version not found." },
        ],
      };
    }

    let app;
    if (app_id) {
      [app] = await db
        .select()
        .from(schema.apps)
        .where(eq(schema.apps.id, app_id));
    } else {
      [app] = await db.select().from(schema.apps).limit(1);
    }

    if (!app) {
      return { content: [{ type: "text" as const, text: "No app found." }] };
    }

    const [run] = await db
      .insert(schema.evaluationRuns)
      .values({
        rubricVersionId: version.id,
        appId: app.id,
        status: "scoring",
        agentTotalTokens: agent_tokens ?? null,
      })
      .returning();

    for (const score of scores) {
      await db.insert(schema.scores).values({
        runId: run.id,
        criterionId: score.criterion_id,
        claudeLevelId: score.level_id,
        claudeComment: score.comment,
        citations: score.citations ?? [],
      });
    }

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            run_id: run.id,
            status: "scoring",
            message:
              "Self-scores submitted. The human will now score independently via the web UI, then compare.",
            view_url: `http://localhost:3000/runs/${run.id}`,
          }),
        },
      ],
    };
  },
);

// ── Tool 3: get_feedback ────────────────────────────────────

server.registerTool(
  "get_feedback",
  {
    title: "Get Feedback",
    description:
      "Get finalized feedback from a completed evaluation run. Shows where your scores diverged from the human's and what to improve.",
    inputSchema: {
      run_id: z.string().describe("The evaluation run ID"),
    },
    annotations: { readOnlyHint: true },
  },
  async ({ run_id }) => {
    const [run] = await db
      .select()
      .from(schema.evaluationRuns)
      .where(eq(schema.evaluationRuns.id, run_id));

    if (!run) {
      return { content: [{ type: "text" as const, text: "Run not found." }] };
    }

    const scores = await db
      .select()
      .from(schema.scores)
      .where(eq(schema.scores.runId, run_id));

    const criteria = await db
      .select()
      .from(schema.criteria)
      .where(eq(schema.criteria.versionId, run.rubricVersionId));

    const levels = await db
      .select()
      .from(schema.performanceLevels)
      .where(eq(schema.performanceLevels.versionId, run.rubricVersionId));

    const feedback = scores.map((score) => {
      const criterion = criteria.find((c) => c.id === score.criterionId);
      const claudeLevel = levels.find((l) => l.id === score.claudeLevelId);
      const userLevel = levels.find((l) => l.id === score.userLevelId);
      const finalLevel = levels.find((l) => l.id === score.finalLevelId);

      const delta =
        claudeLevel && userLevel
          ? Math.abs(
              (claudeLevel.numericValue ?? 0) -
                (userLevel.numericValue ?? 0),
            )
          : null;

      return {
        criterion: criterion?.stableKey,
        your_score: claudeLevel?.numericValue,
        human_score: userLevel?.numericValue,
        final_score: finalLevel?.numericValue,
        delta,
        human_comment: score.userComment,
        your_comment: score.claudeComment,
      };
    });

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            run_id,
            status: run.status,
            feedback,
          }),
        },
      ],
    };
  },
);

// ── Start server ────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
