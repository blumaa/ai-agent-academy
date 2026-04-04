import { NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";

export async function GET() {
  const rubrics = await db.select().from(schema.rubrics);
  return NextResponse.json(rubrics);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { title, description, evalCategory, deltaThreshold } = body;

  if (!title || !evalCategory) {
    return NextResponse.json(
      { error: "title and evalCategory are required" },
      { status: 400 },
    );
  }

  // Create rubric
  const [rubric] = await db
    .insert(schema.rubrics)
    .values({
      title,
      description: description ?? null,
      evalCategory,
      deltaThreshold: deltaThreshold ?? 1.0,
    })
    .returning();

  // Create initial version
  const [version] = await db
    .insert(schema.rubricVersions)
    .values({
      rubricId: rubric.id,
      version: 1,
      isCurrent: true,
    })
    .returning();

  // Create default 5 performance levels
  const defaultLabels = ["1", "2", "3", "4", "5"];
  await db.insert(schema.performanceLevels).values(
    defaultLabels.map((label, i) => ({
      versionId: version.id,
      label,
      sortOrder: i,
      numericValue: i + 1,
      isPassing: i >= 2,
    })),
  );

  return NextResponse.json({ ...rubric, versionId: version.id }, { status: 201 });
}
