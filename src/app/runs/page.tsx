import { db } from "@/db";
import * as schema from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function RunsPage() {
  const runs = await db
    .select()
    .from(schema.evaluationRuns)
    .orderBy(desc(schema.evaluationRuns.startedAt));

  // Enrich with rubric/app names and compute average score
  const enrichedRuns = await Promise.all(
    runs.map(async (run) => {
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

      // Get scores with final levels
      const scores = await db
        .select()
        .from(schema.scores)
        .where(eq(schema.scores.runId, run.id));

      const levels = await db
        .select()
        .from(schema.performanceLevels)
        .where(eq(schema.performanceLevels.versionId, run.rubricVersionId));

      // Compute average final score
      const finalScores = scores
        .map((s) => {
          const levelId = s.finalLevelId ?? s.claudeLevelId ?? s.autoLevelId;
          if (!levelId) return null;
          return levels.find((l) => l.id === levelId)?.numericValue ?? null;
        })
        .filter((v): v is number => v !== null);

      const avgScore =
        finalScores.length > 0
          ? finalScores.reduce((a, b) => a + b, 0) / finalScores.length
          : null;

      return {
        ...run,
        rubricTitle: rubric?.title,
        appName: app?.name,
        avgScore,
      };
    }),
  );

  const STATUS_COLORS: Record<string, string> = {
    pending: "bg-[var(--muted)]/20 text-[var(--muted)]",
    scoring: "bg-[var(--accent-yellow)]/20 text-[var(--accent-yellow)]",
    discussing: "bg-[var(--accent-orange)]/20 text-[var(--accent-orange)]",
    finalized: "bg-[var(--accent-green)]/20 text-[var(--accent-green)]",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Run History</h1>
          <p className="text-[var(--muted)] mt-1">
            All evaluation runs with scores and token usage.
          </p>
        </div>
        <a
          href="/"
          className="bg-[var(--accent-green-dark)] hover:bg-[var(--accent-green)] text-white text-sm font-medium py-2 px-4 rounded-md transition-colors"
        >
          New Evaluation
        </a>
      </div>

      {enrichedRuns.length === 0 ? (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-8 text-center">
          <p className="text-[var(--muted)]">
            No runs yet. Start an evaluation from the dashboard.
          </p>
        </div>
      ) : (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[var(--muted)] text-left bg-[var(--surface-raised)]">
                <th className="px-4 py-3 font-medium">App</th>
                <th className="px-4 py-3 font-medium">Rubric</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Avg Score</th>
                <th className="px-4 py-3 font-medium">Tokens</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {enrichedRuns.map((run) => (
                <tr key={run.id} className="hover:bg-[var(--surface-raised)]">
                  <td className="px-4 py-3 font-medium">
                    {run.appName ?? "—"}
                  </td>
                  <td className="px-4 py-3">{run.rubricTitle ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[run.status] ?? STATUS_COLORS.pending}`}
                    >
                      {run.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono">
                    {run.avgScore !== null ? run.avgScore.toFixed(1) : "—"}
                    <span className="text-[var(--muted)]">/5</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {run.scoringTotalTokens?.toLocaleString() ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {run.startedAt.toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={`/runs/${run.id}`}
                      className="text-[#58A6FF] hover:underline"
                    >
                      View
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
