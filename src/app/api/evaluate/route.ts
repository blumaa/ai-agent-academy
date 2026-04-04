import { NextResponse } from "next/server";
import { db } from "@/db";
import { eq, and } from "drizzle-orm";
import * as schema from "@/db/schema";
import { mkdtemp, writeFile, readFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const jobId = url.searchParams.get("jobId");

  if (!jobId) {
    return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
  }

  // Read log file
  const logFile = `${jobId}.log`;
  let log = "";
  try {
    log = await readFile(logFile, "utf-8");
  } catch {
    // No log yet
  }

  // Read result from file system
  const resultFile = `${jobId}.result.json`;
  try {
    const data = JSON.parse(await readFile(resultFile, "utf-8"));
    return NextResponse.json({ ...data, log });
  } catch {
    // File doesn't exist yet — still running
    return NextResponse.json({ status: "running", log });
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  const { testId, appId, rubricId, model } = body;

  // Load test
  const [test] = await db
    .select()
    .from(schema.tests)
    .where(eq(schema.tests.id, testId));

  if (!test) {
    return NextResponse.json({ error: "Test not found" }, { status: 404 });
  }

  // Load agent
  const [agent] = await db
    .select()
    .from(schema.apps)
    .where(eq(schema.apps.id, appId));

  if (!agent || !agent.agentPath) {
    return NextResponse.json(
      { error: "Agent not found or missing agent path" },
      { status: 404 },
    );
  }

  // Load rubric + version + criteria + levels for prompt generation
  const [rubric] = await db
    .select()
    .from(schema.rubrics)
    .where(eq(schema.rubrics.id, rubricId));

  if (!rubric) {
    return NextResponse.json({ error: "Rubric not found" }, { status: 404 });
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
    return NextResponse.json(
      { error: "No current rubric version" },
      { status: 404 },
    );
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

  // Create temp directory for the agent to work in
  const workDir = await mkdtemp(path.join(tmpdir(), "aaanalytics-run-"));

  // Build the prompt
  const criteriaList = criteria
    .map((c) => `  - "${c.name}" (criterion_id: "${c.id}")`)
    .join("\n");

  const levelsList = levels
    .map(
      (l) =>
        `  - Level ${l.numericValue} "${l.label}" (level_id: "${l.id}")${l.isPassing ? " [passing]" : ""}`,
    )
    .join("\n");

  const prompt = `Do all your work in the directory: ${workDir}

${test.description}

---

## Self-Evaluation Instructions

When you finish the task above, evaluate your own work against the "${rubric.title}" rubric.

**Criteria you will be scored on:**
${criteriaList}

**Performance levels:**
${levelsList}

**Steps:**
1. Call the \`get_rubric\` MCP tool with \`rubric_id: "${rubric.id}"\` and \`include_descriptions: true\` to see the full rubric with level descriptions.
2. For each criterion, honestly assess which level best matches your work. Provide specific file:line citations as evidence.
3. Call the \`submit_self_score\` MCP tool with:
   - \`rubric_id\`: \`"${rubric.id}"\`
   - \`scores\`: one entry per criterion containing \`criterion_id\`, \`level_id\`, \`comment\`, and \`citations\`
   - \`agent_tokens\`: your total token usage if known`;

  // Write job spec to a temp file — the worker process picks it up
  const jobFile = path.join(tmpdir(), `aaanalytics-job-${crypto.randomUUID()}.json`);
  await writeFile(
    jobFile,
    JSON.stringify({ prompt, agentPath: agent.agentPath, workDir, appId, model: model ?? "sonnet" }),
  );

  return NextResponse.json({
    status: "started",
    jobId: jobFile,
    agent: agent.name,
    test: test.name,
  });
}
