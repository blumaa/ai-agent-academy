import { NextResponse } from "next/server";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";

// Finalize a run — locks all scores
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: runId } = await params;

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

  // Set final scores: prefer user score, fall back to claude, then auto
  const scores = await db
    .select()
    .from(schema.scores)
    .where(eq(schema.scores.runId, runId));

  for (const score of scores) {
    const finalLevelId =
      score.userLevelId ?? score.claudeLevelId ?? score.autoLevelId ?? null;

    await db
      .update(schema.scores)
      .set({ finalLevelId })
      .where(eq(schema.scores.id, score.id));
  }

  await db
    .update(schema.evaluationRuns)
    .set({ status: "finalized", finalizedAt: new Date() })
    .where(eq(schema.evaluationRuns.id, runId));

  return NextResponse.json({ status: "finalized", runId });
}
