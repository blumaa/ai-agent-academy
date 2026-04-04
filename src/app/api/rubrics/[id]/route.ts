import { NextResponse } from "next/server";
import { db } from "@/db";
import { eq, and } from "drizzle-orm";
import * as schema from "@/db/schema";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const [rubric] = await db
    .select()
    .from(schema.rubrics)
    .where(eq(schema.rubrics.id, id));

  if (!rubric) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
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

  const criteria = version
    ? await db
        .select()
        .from(schema.criteria)
        .where(eq(schema.criteria.versionId, version.id))
        .orderBy(schema.criteria.sortOrder)
    : [];

  const levels = version
    ? await db
        .select()
        .from(schema.performanceLevels)
        .where(eq(schema.performanceLevels.versionId, version.id))
        .orderBy(schema.performanceLevels.sortOrder)
    : [];

  const cells = await db.select().from(schema.rubricCells);
  const relevantCells = cells.filter((c) =>
    criteria.some((cr) => cr.id === c.criterionId),
  );

  return NextResponse.json({
    rubric,
    version,
    criteria,
    levels,
    cells: relevantCells,
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();

  const [updated] = await db
    .update(schema.rubrics)
    .set({
      title: body.title,
      description: body.description ?? null,
      evalCategory: body.evalCategory,
      deltaThreshold: body.deltaThreshold ?? 1.0,
      updatedAt: new Date(),
    })
    .where(eq(schema.rubrics.id, id))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const [deleted] = await db
    .delete(schema.rubrics)
    .where(eq(schema.rubrics.id, id))
    .returning();

  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ deleted: true });
}
