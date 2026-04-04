import { NextResponse } from "next/server";
import { db } from "@/db";
import { eq, and } from "drizzle-orm";
import * as schema from "@/db/schema";

// Set performance levels for a rubric
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: rubricId } = await params;
  const { levels: newLevels } = (await request.json()) as {
    levels: Array<{
      label: string;
      sortOrder: number;
      numericValue: number;
      isPassing: boolean;
    }>;
  };

  const [version] = await db
    .select()
    .from(schema.rubricVersions)
    .where(
      and(
        eq(schema.rubricVersions.rubricId, rubricId),
        eq(schema.rubricVersions.isCurrent, true),
      ),
    );

  if (!version) {
    return NextResponse.json({ error: "No rubric version" }, { status: 404 });
  }

  // Delete existing levels (cascade deletes cells too)
  await db
    .delete(schema.performanceLevels)
    .where(eq(schema.performanceLevels.versionId, version.id));

  // Insert new levels
  const inserted = await db
    .insert(schema.performanceLevels)
    .values(
      newLevels.map((l) => ({
        versionId: version.id,
        label: l.label,
        sortOrder: l.sortOrder,
        numericValue: l.numericValue,
        isPassing: l.isPassing,
      })),
    )
    .returning();

  return NextResponse.json(inserted);
}
