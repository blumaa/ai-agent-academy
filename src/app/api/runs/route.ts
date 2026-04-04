import { NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import {
  createEvaluationRun,
  executeAutomatedAndModelScoring,
} from "@/lib/scoring-engine";
import { desc } from "drizzle-orm";

export async function POST(request: Request) {
  const { appId, rubricId } = await request.json();

  if (!appId || !rubricId) {
    return NextResponse.json(
      { error: "appId and rubricId are required" },
      { status: 400 },
    );
  }

  const run = await createEvaluationRun(appId, rubricId);

  // Fire off automated/model scoring (don't await for faster response)
  executeAutomatedAndModelScoring(run.id).catch(console.error);

  return NextResponse.json(run, { status: 201 });
}

export async function GET() {
  const runs = await db
    .select()
    .from(schema.evaluationRuns)
    .orderBy(desc(schema.evaluationRuns.startedAt));

  return NextResponse.json(runs);
}
