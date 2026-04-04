import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { CreateRubricButton } from "@/components/create-rubric-button";

export const dynamic = "force-dynamic";

export default async function RubricsPage() {
  const rubrics = await db.select().from(schema.rubrics);

  // Get criteria count per rubric
  const enriched = await Promise.all(
    rubrics.map(async (rubric) => {
      const [version] = await db
        .select()
        .from(schema.rubricVersions)
        .where(eq(schema.rubricVersions.rubricId, rubric.id));
      const criteria = version
        ? await db
            .select()
            .from(schema.criteria)
            .where(eq(schema.criteria.versionId, version.id))
        : [];
      return { ...rubric, criteriaCount: criteria.length };
    }),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Rubrics</h1>
          <p className="text-[var(--muted)] mt-1">
            Create and edit rubrics to evaluate agent output.
          </p>
        </div>
        <CreateRubricButton />
      </div>

      {enriched.length === 0 ? (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-8 text-center">
          <p className="text-[var(--muted)]">
            No rubrics yet. Create one to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {enriched.map((rubric) => (
            <a
              key={rubric.id}
              href={`/rubrics/${rubric.id}`}
              className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-5 hover:border-[#58A6FF] transition-colors"
            >
              <h3 className="font-semibold text-base">{rubric.title}</h3>
              {rubric.description && (
                <p className="text-sm text-[var(--muted)] mt-1 line-clamp-2">
                  {rubric.description}
                </p>
              )}
              <div className="flex gap-3 mt-3 text-xs text-[var(--muted)]">
                <span>{rubric.criteriaCount} criteria</span>
                <span>delta: {rubric.deltaThreshold}</span>
                <span className="capitalize">{rubric.evalCategory}</span>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
