/**
 * Worker process — run in a separate terminal: npm run worker
 *
 * Watches for new job files and executes them.
 * Runs in your authenticated terminal session so claude auth works.
 */

import { readdirSync, existsSync, readFileSync } from "fs";
import { execFileSync } from "child_process";
import { tmpdir } from "os";
import path from "path";

const PROJECT_DIR = process.env.PROJECT_DIR ?? process.cwd();
const POLL_INTERVAL = 2000;

function findPendingJobs(): string[] {
  const dir = tmpdir();
  try {
    return readdirSync(dir)
      .filter((f) => f.startsWith("aaanalytics-job-") && f.endsWith(".json") && !f.includes(".result") && !f.includes(".log"))
      .map((f) => path.join(dir, f))
      .filter((f) => {
        const resultFile = `${f}.result.json`;
        return !existsSync(resultFile);
      });
  } catch {
    return [];
  }
}

function runJob(jobFile: string) {
  console.log(`[worker] Running job: ${path.basename(jobFile)}`);
  const job = JSON.parse(readFileSync(jobFile, "utf-8"));
  console.log(`[worker] Agent: ${job.agentPath}, Model: ${job.model ?? "sonnet"}`);

  try {
    execFileSync("npx", ["tsx", path.join(PROJECT_DIR, "src/lib/run-agent.ts"), jobFile], {
      cwd: PROJECT_DIR,
      encoding: "utf-8",
      timeout: 600_000,
      stdio: "inherit",
      env: {
        ...process.env,
        DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://localhost:5432/aaanalytics",
        PROJECT_DIR,
      },
    });
    console.log(`[worker] Job completed: ${path.basename(jobFile)}`);
  } catch (err) {
    console.error(`[worker] Job failed: ${path.basename(jobFile)}`);
  }
}

console.log("[worker] Watching for evaluation jobs...");
console.log(`[worker] Project: ${PROJECT_DIR}`);
console.log(`[worker] Temp dir: ${tmpdir()}`);

setInterval(() => {
  const jobs = findPendingJobs();
  for (const jobFile of jobs) {
    runJob(jobFile);
  }
}, POLL_INTERVAL);
