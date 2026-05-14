import { readFileSync } from "node:fs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { rubrics, getRubricBySlug } from "../lib/rubrics.js";
import { evaluate } from "../lib/evaluator.js";
import { formatReport } from "../lib/formatter.js";
import { type LessonsStore, FileLessonsStore } from "../lib/lessons.js";

const pkg = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf-8"));
const DEFAULT_DATA_DIR = new URL("../../data/lessons", import.meta.url).pathname;

export function createServer(store?: LessonsStore): McpServer {
  const lessonsStore = store ?? new FileLessonsStore(DEFAULT_DATA_DIR);
  const server = new McpServer({
    name: "ai-agent-academy",
    version: pkg.version,
  });

  server.tool("health_check", "Check if the AI Agent Academy MCP server is running", {}, () => {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            status: "ok",
            server: "ai-agent-academy",
            version: pkg.version,
            rubrics_loaded: rubrics.length,
          }),
        },
      ],
    };
  });

  server.tool("list_rubrics", "List all available rubrics", {}, () => {
    const summary = rubrics.map((r) => ({
      slug: r.slug,
      title: r.title,
      criteria_count: r.criteria.length,
      criteria_names: r.criteria.map((c) => c.label),
    }));

    return {
      content: [{ type: "text" as const, text: JSON.stringify({ rubrics: summary }, null, 2) }],
    };
  });

  server.tool(
    "get_rubric",
    "Get full rubric details including criteria and level descriptions",
    { slug: z.string().describe("Rubric slug (e.g. 'bugs-correctness')") },
    ({ slug }) => {
      const rubric = getRubricBySlug(slug);
      if (!rubric) {
        return {
          isError: true,
          content: [{ type: "text" as const, text: `Unknown rubric: "${slug}"` }],
        };
      }

      return {
        content: [{ type: "text" as const, text: JSON.stringify(rubric, null, 2) }],
      };
    }
  );

  server.tool(
    "run_specs",
    "Evaluate work against a rubric. Returns a formatted scorecard and pass/fail verdict.",
    {
      rubric: z.string().describe("Rubric slug to evaluate against"),
      scores: z
        .array(
          z.object({
            criterion: z.string().describe("Criterion label (exact match from rubric)"),
            score: z.number().int().min(1).max(5).describe("Self-assessed score 1-5"),
            reasoning: z.string().describe("Why this score, with file:line citations"),
          })
        )
        .describe("One entry per criterion in the rubric"),
    },
    ({ rubric: rubricSlug, scores }) => {
      try {
        const rubric = getRubricBySlug(rubricSlug);
        if (!rubric) {
          return {
            isError: true,
            content: [{ type: "text" as const, text: `Unknown rubric: "${rubricSlug}"` }],
          };
        }

        const result = evaluate(rubricSlug, scores);
        const display = formatReport(rubric.title, result.results, result.failures);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  display,
                  passed: result.passed,
                  failures: result.failures,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (err) {
        return {
          isError: true,
          content: [
            { type: "text" as const, text: err instanceof Error ? err.message : String(err) },
          ],
        };
      }
    }
  );

  server.tool(
    "save_lesson",
    "Save a lesson learned from an evaluation. Call after run_specs when the user approves committing the learning.",
    {
      project_id: z.string().describe("Project identifier (e.g. directory name)"),
      rubric: z.string().describe("Rubric slug used for evaluation"),
      passed: z.boolean().describe("Whether the quality gate passed"),
      scores: z
        .array(
          z.object({
            criterion: z.string(),
            score: z.number().int().min(1).max(5),
            reasoning: z.string(),
          })
        )
        .describe("Scores from the evaluation"),
      failures: z
        .array(
          z.object({
            criterion: z.string(),
            score: z.number(),
            current_level: z.string(),
            next_level: z.string(),
          })
        )
        .describe("Failure details (empty array if passed)"),
      lesson: z.string().describe("What the agent learned during this task"),
    },
    async ({ project_id, rubric, passed, scores, failures, lesson }) => {
      try {
        const entry = {
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          rubric,
          passed,
          scores,
          failures,
          lesson,
        };
        await lessonsStore.append(project_id, entry);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ saved: true, entry_id: entry.id }),
            },
          ],
        };
      } catch (err) {
        return {
          isError: true,
          content: [
            { type: "text" as const, text: err instanceof Error ? err.message : String(err) },
          ],
        };
      }
    }
  );

  server.tool(
    "get_lessons",
    "Retrieve compiled lessons from past evaluations for a project. Call at the start of a task to learn from past mistakes.",
    {
      project_id: z.string().describe("Project identifier (e.g. directory name)"),
    },
    async ({ project_id }) => {
      try {
        const compiled = await lessonsStore.compile(project_id);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(compiled, null, 2),
            },
          ],
        };
      } catch (err) {
        return {
          isError: true,
          content: [
            { type: "text" as const, text: err instanceof Error ? err.message : String(err) },
          ],
        };
      }
    }
  );

  return server;
}

async function main() {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

const isMainModule =
  process.argv[1]?.endsWith("server.ts") || process.argv[1]?.endsWith("server.js");
if (isMainModule) {
  main().catch(console.error);
}
