import { NextResponse } from "next/server";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";

// Add a discussion message to a score
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: runId } = await params;
  const { scoreId, role, message } = (await request.json()) as {
    scoreId: string;
    role: "user" | "claude" | "system";
    message: string;
  };

  if (!scoreId || !role || !message) {
    return NextResponse.json(
      { error: "scoreId, role, and message are required" },
      { status: 400 },
    );
  }

  // Verify run exists and is in discussing state
  const [run] = await db
    .select()
    .from(schema.evaluationRuns)
    .where(eq(schema.evaluationRuns.id, runId));

  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  const [discussion] = await db
    .insert(schema.scoreDiscussions)
    .values({ scoreId, role, message })
    .returning();

  return NextResponse.json(discussion, { status: 201 });
}

// Get all discussions for a run
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: runId } = await params;

  const scores = await db
    .select()
    .from(schema.scores)
    .where(eq(schema.scores.runId, runId));

  const scoreIds = scores.map((s) => s.id);

  const discussions = [];
  for (const scoreId of scoreIds) {
    const msgs = await db
      .select()
      .from(schema.scoreDiscussions)
      .where(eq(schema.scoreDiscussions.scoreId, scoreId))
      .orderBy(schema.scoreDiscussions.createdAt);
    discussions.push({ scoreId, messages: msgs });
  }

  return NextResponse.json(discussions);
}
