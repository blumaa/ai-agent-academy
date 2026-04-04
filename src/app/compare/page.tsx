import { db } from "@/db";
import * as schema from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { getRunMetrics } from "@/lib/run-metrics";
import { calculateROI } from "@/lib/roi";
import { CompareView } from "@/components/compare-view";

export const dynamic = "force-dynamic";

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ baseline?: string; improved?: string }>;
}) {
  const { baseline: baselineId, improved: improvedId } = await searchParams;

  // Get all finalized runs for the selectors
  const allRuns = await db
    .select()
    .from(schema.evaluationRuns)
    .orderBy(desc(schema.evaluationRuns.startedAt));

  const enrichedRuns = await Promise.all(
    allRuns.map(async (run) => {
      const [version] = await db
        .select()
        .from(schema.rubricVersions)
        .where(eq(schema.rubricVersions.id, run.rubricVersionId));
      const [rubric] = version
        ? await db
            .select()
            .from(schema.rubrics)
            .where(eq(schema.rubrics.id, version.rubricId))
        : [null];
      const [app] = await db
        .select()
        .from(schema.apps)
        .where(eq(schema.apps.id, run.appId));
      return {
        id: run.id,
        label: `${app?.name ?? "?"} — ${rubric?.title ?? "?"} (${run.status}, ${run.startedAt.toLocaleDateString()})`,
      };
    }),
  );

  // If both IDs provided, calculate ROI
  let comparison = null;
  if (baselineId && improvedId) {
    const [baseline, improved] = await Promise.all([
      getRunMetrics(baselineId),
      getRunMetrics(improvedId),
    ]);

    if (baseline && improved) {
      comparison = {
        baseline,
        improved,
        roi: calculateROI(baseline, improved),
      };
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Compare Runs</h1>
        <p className="text-[var(--muted)] mt-1">
          Before &amp; after — did the rubric pay for itself?
        </p>
      </div>

      <CompareView
        runs={enrichedRuns}
        baselineId={baselineId}
        improvedId={improvedId}
        comparison={comparison}
      />
    </div>
  );
}
