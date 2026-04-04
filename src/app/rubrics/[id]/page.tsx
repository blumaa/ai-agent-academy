import { db } from "@/db";
import { eq, and } from "drizzle-orm";
import * as schema from "@/db/schema";
import { notFound } from "next/navigation";
import { RubricEditor } from "@/components/rubric-editor";

export const dynamic = "force-dynamic";

export default async function RubricEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [rubric] = await db
    .select()
    .from(schema.rubrics)
    .where(eq(schema.rubrics.id, id));

  if (!rubric) notFound();

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

  const allCells = await db.select().from(schema.rubricCells);
  const criteriaIds = new Set(criteria.map((c) => c.id));
  const cells = allCells.filter((c) => criteriaIds.has(c.criterionId));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Edit Rubric</h1>
        <a href="/rubrics" className="text-sm text-[#58A6FF] hover:underline">
          Back to Rubrics
        </a>
      </div>
      <RubricEditor
        rubric={rubric}
        criteria={criteria}
        levels={levels}
        cells={cells}
      />
    </div>
  );
}
