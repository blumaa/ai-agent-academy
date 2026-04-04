import { NextResponse } from "next/server";
import { db } from "@/db";
import { eq, and } from "drizzle-orm";
import * as schema from "@/db/schema";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const url = new URL(request.url);
  const task = url.searchParams.get("task")?.trim();

  if (!task) {
    return NextResponse.json(
      { error: "Missing 'task' query parameter" },
      { status: 400 },
    );
  }

  const [rubric] = await db
    .select()
    .from(schema.rubrics)
    .where(eq(schema.rubrics.id, id));

  if (!rubric) {
    return NextResponse.json({ error: "Rubric not found" }, { status: 404 });
  }

  const [version] = await db
    .select()
    .from(schema.rubricVersions)
    .where(
      and(
        eq(schema.rubricVersions.rubricId, id),
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

  const criteriaList = criteria
    .map((c) => `  - "${c.name}" (criterion_id: "${c.id}")`)
    .join("\n");

  const levelsList = levels
    .map(
      (l) =>
        `  - Level ${l.numericValue} "${l.label}" (level_id: "${l.id}")${l.isPassing ? " [passing]" : ""}`,
    )
    .join("\n");

  const prompt = `${task}

---

## Self-Evaluation Instructions

When you finish the task above, evaluate your own work against the "${rubric.title}" rubric.

**Criteria you will be scored on:**
${criteriaList}

**Performance levels:**
${levelsList}

**Steps:**
1. Call the \`get_rubric\` MCP tool with \`rubric_id: "${id}"\` and \`include_descriptions: true\` to see the full rubric with level descriptions.
2. For each criterion, honestly assess which level best matches your work. Provide specific file:line citations as evidence.
3. Call the \`submit_self_score\` MCP tool with:
   - \`rubric_id\`: \`"${id}"\`
   - \`scores\`: one entry per criterion containing \`criterion_id\`, \`level_id\`, \`comment\`, and \`citations\`
   - \`agent_tokens\`: your total token usage if known`;

  return NextResponse.json({ prompt });
}
