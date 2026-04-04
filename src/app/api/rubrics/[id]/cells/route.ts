import { NextResponse } from "next/server";
import { db } from "@/db";
import { eq, and, inArray } from "drizzle-orm";
import * as schema from "@/db/schema";

// Batch update rubric cell descriptions
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: rubricId } = await params;
  const { cells: newCells } = (await request.json()) as {
    cells: Array<{
      criterionId: string;
      levelId: string;
      description: string;
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

  // Get criteria IDs for this version to scope the delete
  const criteria = await db
    .select()
    .from(schema.criteria)
    .where(eq(schema.criteria.versionId, version.id));
  const criteriaIds = criteria.map((c) => c.id);

  if (criteriaIds.length > 0) {
    // Delete existing cells for these criteria
    await db
      .delete(schema.rubricCells)
      .where(inArray(schema.rubricCells.criterionId, criteriaIds));
  }

  // Insert new cells
  if (newCells.length > 0) {
    await db.insert(schema.rubricCells).values(
      newCells.map((c) => ({
        criterionId: c.criterionId,
        levelId: c.levelId,
        description: c.description,
      })),
    );
  }

  return NextResponse.json({ updated: newCells.length });
}
