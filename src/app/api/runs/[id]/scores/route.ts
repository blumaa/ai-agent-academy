import { NextResponse } from "next/server";
import { db } from "@/db";
import { eq, and } from "drizzle-orm";
import * as schema from "@/db/schema";

// Submit or update human scores for a run
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: runId } = await params;
  const { scores: userScores } = (await request.json()) as {
    scores: Array<{
      criterionId: string;
      userLevelId: string;
      userComment?: string;
    }>;
  };

  if (!Array.isArray(userScores) || userScores.length === 0) {
    return NextResponse.json(
      { error: "scores array is required" },
      { status: 400 },
    );
  }

  // Verify run exists and isn't finalized
  const [run] = await db
    .select()
    .from(schema.evaluationRuns)
    .where(eq(schema.evaluationRuns.id, runId));

  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  if (run.status === "finalized") {
    return NextResponse.json(
      { error: "Run is already finalized" },
      { status: 400 },
    );
  }

  // Upsert each score
  for (const userScore of userScores) {
    const existing = await db
      .select()
      .from(schema.scores)
      .where(
        and(
          eq(schema.scores.runId, runId),
          eq(schema.scores.criterionId, userScore.criterionId),
        ),
      );

    if (existing.length > 0) {
      await db
        .update(schema.scores)
        .set({
          userLevelId: userScore.userLevelId,
          userComment: userScore.userComment ?? null,
        })
        .where(eq(schema.scores.id, existing[0].id));
    } else {
      await db.insert(schema.scores).values({
        runId,
        criterionId: userScore.criterionId,
        userLevelId: userScore.userLevelId,
        userComment: userScore.userComment ?? null,
      });
    }
  }

  // Check for deltas that require discussion
  const [rubricVersion] = await db
    .select()
    .from(schema.rubricVersions)
    .where(eq(schema.rubricVersions.id, run.rubricVersionId));

  const [rubric] = await db
    .select()
    .from(schema.rubrics)
    .where(eq(schema.rubrics.id, rubricVersion.rubricId));

  const allScores = await db
    .select()
    .from(schema.scores)
    .where(eq(schema.scores.runId, runId));

  const levels = await db
    .select()
    .from(schema.performanceLevels)
    .where(eq(schema.performanceLevels.versionId, run.rubricVersionId))
    .orderBy(schema.performanceLevels.sortOrder);

  // Compute deltas
  const deltas = allScores
    .filter((s) => s.userLevelId && s.claudeLevelId)
    .map((s) => {
      const userLevel = levels.find((l) => l.id === s.userLevelId);
      const claudeLevel = levels.find((l) => l.id === s.claudeLevelId);
      const delta = Math.abs(
        (userLevel?.numericValue ?? 0) - (claudeLevel?.numericValue ?? 0),
      );
      return { criterionId: s.criterionId, delta };
    });

  const needsDiscussion = deltas.some(
    (d) => d.delta >= rubric.deltaThreshold,
  );

  // Update run status
  await db
    .update(schema.evaluationRuns)
    .set({ status: needsDiscussion ? "discussing" : "scoring" })
    .where(eq(schema.evaluationRuns.id, runId));

  return NextResponse.json({
    deltas,
    needsDiscussion,
    discussionRequired: deltas.filter(
      (d) => d.delta >= rubric.deltaThreshold,
    ),
  });
}
