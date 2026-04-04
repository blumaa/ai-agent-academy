/**
 * Standalone script to run an agent evaluation.
 * Called via: npx tsx src/lib/run-agent.ts <jobFile>
 *
 * Reads job spec from jobFile, runs claude -p, writes result to <jobFile>.result.json
 */

import { execFileSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, desc } from "drizzle-orm";
import * as schema from "../db/schema.js";

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://localhost:5432/aaanalytics";
const PROJECT_DIR = process.env.PROJECT_DIR ?? process.cwd();

const jobFile = process.argv[2];
if (!jobFile) {
  console.error("Usage: npx tsx src/lib/run-agent.ts <jobFile>");
  process.exit(1);
}

const resultFile = `${jobFile}.result.json`;

function writeResult(data: Record<string, unknown>) {
  writeFileSync(resultFile, JSON.stringify(data));
}

// Write "running" status immediately
writeResult({ status: "running" });

const job = JSON.parse(readFileSync(jobFile, "utf-8")) as {
  prompt: string;
  agentPath: string;
  workDir: string;
  appId: string;
  model?: string;
};

console.log(`[run-agent] Starting ${job.agentPath} in ${job.workDir}`);

let stdout: string;
try {
  const args = [
    "-p", job.prompt,
    "--agent", job.agentPath,
    "--model", job.model ?? "sonnet",
    "--output-format", "json",
    "--add-dir", job.workDir,
    "--permission-mode", "acceptEdits",
    "--allowedTools", "Bash,Edit,Write,Read,Glob,Grep,mcp__aaanalytics__get_rubric,mcp__aaanalytics__submit_self_score",
  ];
  console.log(`[run-agent] Model: ${job.model ?? "sonnet"}`);
  stdout = execFileSync("claude", args, {
    cwd: PROJECT_DIR,
    timeout: 600_000,
    maxBuffer: 10 * 1024 * 1024,
    encoding: "utf-8",
  });
} catch (err: unknown) {
  const execErr = err as { stderr?: string; stdout?: string; status?: number };
  const stderr = execErr.stderr ?? "";
  const errStdout = execErr.stdout ?? "";
  const status = execErr.status;
  const error = stderr || errStdout || (err instanceof Error ? err.message.slice(0, 1000) : String(err));
  console.error(`[run-agent] Exit code: ${status}`);
  console.error(`[run-agent] stderr: ${stderr.slice(0, 500)}`);
  console.error(`[run-agent] stdout: ${errStdout.slice(0, 500)}`);
  writeResult({ status: "failed", error: error.slice(0, 1000) });
  process.exit(1);
}

console.log("[run-agent] Agent finished. Updating DB...");

// Connect to DB to find the run and update tokens
const client = postgres(DATABASE_URL);
const db = drizzle(client, { schema });

async function finalize() {
  try {
    const runs = await db
      .select()
      .from(schema.evaluationRuns)
      .where(eq(schema.evaluationRuns.appId, job.appId))
      .orderBy(desc(schema.evaluationRuns.startedAt))
      .limit(1);

    const runId = runs[0]?.id;

    // Extract token usage from JSON output
    let agentTokens: number | undefined;
    try {
      const output = JSON.parse(stdout);
      const usage = output?.usage;
      if (usage) {
        agentTokens =
          (usage.input_tokens ?? 0) +
          (usage.output_tokens ?? 0) +
          (usage.cache_creation_input_tokens ?? 0) +
          (usage.cache_read_input_tokens ?? 0);

        if (runId) {
          await db
            .update(schema.evaluationRuns)
            .set({ agentTotalTokens: agentTokens })
            .where(eq(schema.evaluationRuns.id, runId));
        }
      }
    } catch {
      // JSON parse failed
    }

    if (runId) {
      writeResult({ status: "completed", runId, agentTokens });
      console.log(
        `[run-agent] Done. Run: ${runId}, tokens: ${agentTokens ?? "unknown"}`,
      );
    } else {
      writeResult({
        status: "failed",
        error: "Agent finished but did not submit self-scores",
      });
    }
  } finally {
    await client.end();
  }
}

finalize().catch((err) => {
  console.error("[run-agent] Fatal:", err);
  writeResult({
    status: "failed",
    error: err instanceof Error ? err.message : String(err),
  });
  process.exit(1);
});
