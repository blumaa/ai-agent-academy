import { describe, it, expect } from "vitest";
import { execFileSync, execSync, spawn } from "child_process";
import { writeFileSync, readFileSync, mkdtempSync, existsSync } from "fs";
import { tmpdir } from "os";
import path from "path";

const PROJECT_DIR = path.resolve(process.cwd());
// Use a real UUID format for the fake app ID (won't match a real row, but won't crash the query)
const FAKE_APP_ID = "00000000-0000-0000-0000-000000000000";

describe("run-agent", () => {
  it("claude CLI is accessible and authenticated", { timeout: 60_000 }, () => {
    const result = execFileSync("claude", ["-p", "say ok", "--output-format", "json", "--model", "haiku"], {
      cwd: PROJECT_DIR,
      encoding: "utf-8",
      timeout: 30_000,
    });
    const parsed = JSON.parse(result);
    expect(parsed.type).toBe("result");
    expect(parsed.is_error).toBe(false);
  });

  it("claude can see aaanalytics MCP tools from the project dir", { timeout: 60_000 }, () => {
    const result = execFileSync("claude", [
      "-p", "List tools starting with mcp__aaanalytics. Just list the names, nothing else.",
      "--output-format", "json",
      "--model", "haiku",
    ], {
      cwd: PROJECT_DIR,
      encoding: "utf-8",
      timeout: 30_000,
    });
    const parsed = JSON.parse(result);
    expect(parsed.result).toContain("get_rubric");
    expect(parsed.result).toContain("submit_self_score");
  });

  it("run-agent.ts script writes result file (no auth error)", { timeout: 120_000 }, () => {
    const workDir = mkdtempSync(path.join(tmpdir(), "aaanalytics-test-"));
    const jobFile = path.join(tmpdir(), `aaanalytics-test-job-${Date.now()}.json`);

    writeFileSync(jobFile, JSON.stringify({
      prompt: "Create a file called test.txt containing 'hello'. Do nothing else.",
      agentPath: "ui-engineer",
      workDir,
      appId: FAKE_APP_ID,
      model: "haiku",
    }));

    try {
      execSync(
        `npx tsx ${path.join(PROJECT_DIR, "src/lib/run-agent.ts")} ${jobFile}`,
        {
          cwd: PROJECT_DIR,
          encoding: "utf-8",
          timeout: 120_000,
          env: {
            ...process.env,
            DATABASE_URL: "postgresql://localhost:5432/aaanalytics",
            PROJECT_DIR,
            HOME: process.env.HOME,
          },
        },
      );
    } catch {
      // May exit non-zero if no matching run in DB — that's expected
    }

    const resultFile = `${jobFile}.result.json`;
    expect(existsSync(resultFile)).toBe(true);

    const result = JSON.parse(readFileSync(resultFile, "utf-8"));
    expect(result.status).toBeDefined();
    // The critical check: no auth error
    expect(result.error ?? "").not.toContain("Invalid API key");
    // Agent should have worked but no DB run found (fake app ID)
    if (result.status === "failed") {
      expect(result.error).toContain("did not submit self-scores");
    }
  });

  it("spawned process inherits auth (no Invalid API key)", { timeout: 120_000 }, () => {
    const jobFile = path.join(tmpdir(), `aaanalytics-spawn-test-${Date.now()}.json`);

    writeFileSync(jobFile, JSON.stringify({
      prompt: "Say 'spawn test ok'. Nothing else.",
      agentPath: "ui-engineer",
      workDir: tmpdir(),
      appId: FAKE_APP_ID,
      model: "haiku",
    }));

    const child = spawn(
      "npx",
      ["tsx", path.join(PROJECT_DIR, "src/lib/run-agent.ts"), jobFile],
      {
        cwd: PROJECT_DIR,
        stdio: ["ignore", "pipe", "pipe"],
        env: {
          ...process.env,
          DATABASE_URL: "postgresql://localhost:5432/aaanalytics",
          PROJECT_DIR,
          HOME: process.env.HOME,
        },
      },
    );

    return new Promise<void>((resolve, reject) => {
      let stderr = "";
      child.stderr?.on("data", (d) => { stderr += d.toString(); });

      const timeout = setTimeout(() => {
        child.kill();
        reject(new Error(`Timed out. stderr: ${stderr}`));
      }, 110_000);

      child.on("close", () => {
        clearTimeout(timeout);
        const resultFile = `${jobFile}.result.json`;

        if (!existsSync(resultFile)) {
          reject(new Error(`No result file. stderr: ${stderr}`));
          return;
        }

        const result = JSON.parse(readFileSync(resultFile, "utf-8"));
        // Critical: auth must work
        expect(result.error ?? "").not.toContain("Invalid API key");
        resolve();
      });
    });
  });
});
