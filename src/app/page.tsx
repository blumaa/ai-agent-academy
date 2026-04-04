import { db } from "@/db";
import * as schema from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { StartRunForm } from "@/components/start-run-form";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const tests = await db.select().from(schema.tests);
  const agents = await db
    .select()
    .from(schema.apps)
    .where(eq(schema.apps.appType, "agent"));
  const rubrics = await db.select().from(schema.rubrics);
  const recentRuns = await db
    .select()
    .from(schema.evaluationRuns)
    .orderBy(desc(schema.evaluationRuns.startedAt))
    .limit(10);

  // Enrich runs with rubric and app names
  const enrichedRuns = await Promise.all(
    recentRuns.map(async (run) => {
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
      return { ...run, rubricTitle: rubric?.title, appName: app?.name };
    }),
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-[var(--muted)] mt-1">
          Evaluate AI agent output against rubrics. Quality up, tokens down.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Start a new run */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Start Evaluation</h2>
          <StartRunForm tests={tests} agents={agents} rubrics={rubrics} />
        </div>

        {/* Stats */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Overview</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-2xl font-bold">{recentRuns.length}</div>
              <div className="text-sm text-[var(--muted)]">Total Runs</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{tests.length}</div>
              <div className="text-sm text-[var(--muted)]">Tests</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{agents.length}</div>
              <div className="text-sm text-[var(--muted)]">Agents</div>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {recentRuns
                  .reduce((sum, r) => sum + (r.scoringTotalTokens ?? 0), 0)
                  .toLocaleString()}
              </div>
              <div className="text-sm text-[var(--muted)]">Total Tokens</div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent runs */}
      {enrichedRuns.length > 0 && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Runs</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[var(--muted)] text-left">
                <th className="pb-3 font-medium">Agent</th>
                <th className="pb-3 font-medium">Rubric</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Agent Tokens</th>
                <th className="pb-3 font-medium">Scoring Tokens</th>
                <th className="pb-3 font-medium">Date</th>
                <th className="pb-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {enrichedRuns.map((run) => (
                <tr key={run.id}>
                  <td className="py-3">{run.appName ?? "—"}</td>
                  <td className="py-3">{run.rubricTitle ?? "—"}</td>
                  <td className="py-3">
                    <StatusBadge status={run.status} />
                  </td>
                  <td className="py-3 font-mono text-xs">
                    {run.agentTotalTokens?.toLocaleString() ?? "—"}
                  </td>
                  <td className="py-3 font-mono text-xs">
                    {run.scoringTotalTokens?.toLocaleString() ?? "—"}
                  </td>
                  <td className="py-3 text-[var(--muted)]">
                    {run.startedAt.toLocaleDateString()}
                  </td>
                  <td className="py-3">
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

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: "bg-[var(--muted)]/20 text-[var(--muted)]",
    scoring: "bg-[var(--accent-yellow)]/20 text-[var(--accent-yellow)]",
    discussing: "bg-[var(--accent-orange)]/20 text-[var(--accent-orange)]",
    finalized: "bg-[var(--accent-green)]/20 text-[var(--accent-green)]",
  };

  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] ?? colors.pending}`}
    >
      {status}
    </span>
  );
}
