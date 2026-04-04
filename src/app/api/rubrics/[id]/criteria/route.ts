import { NextResponse } from "next/server";
import { db } from "@/db";
import { eq, and } from "drizzle-orm";
import * as schema from "@/db/schema";

// Add or update criteria for a rubric
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: rubricId } = await params;
  const { criteria: newCriteria } = (await request.json()) as {
    criteria: Array<{
      id?: string;
      name: string;
      stableKey: string;
      description?: string;
      sortOrder: number;
      weight: number;
      graderType: "automated" | "model" | "human";
      graderConfig?: Record<string, unknown>;
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

  // Delete existing criteria (cascade deletes cells too)
  await db
    .delete(schema.criteria)
    .where(eq(schema.criteria.versionId, version.id));

  // Insert new criteria
  const inserted = [];
  for (const c of newCriteria) {
    const [criterion] = await db
      .insert(schema.criteria)
      .values({
        versionId: version.id,
        name: c.name,
        stableKey: c.stableKey,
        description: c.description ?? null,
        sortOrder: c.sortOrder,
        weight: c.weight,
        graderType: c.graderType,
        graderConfig: c.graderConfig ?? null,
      })
      .returning();
    inserted.push(criterion);
  }

  return NextResponse.json(inserted);
}
