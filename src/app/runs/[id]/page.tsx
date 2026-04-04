import { getRunWithScores } from "@/lib/scoring-engine";
import { notFound } from "next/navigation";
import { ScoreView } from "@/components/score-view";

export const dynamic = "force-dynamic";

export default async function RunPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getRunWithScores(id);

  if (!data) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {data.rubric.title} — {data.app?.name}
          </h1>
          <p className="text-[var(--muted)] text-sm mt-1">
            Run #{data.run.id.slice(0, 8)} · Status: {data.run.status}
          </p>
        </div>
        <a
          href="/"
          className="text-sm text-[#58A6FF] hover:underline"
        >
          Back to Dashboard
        </a>
      </div>

      {/* Token Analytics */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-6">
        <h2 className="text-sm font-semibold mb-3 text-[var(--muted)]">Token Usage</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-xl font-bold font-mono text-[#58A6FF]">
              {data.run.agentTotalTokens?.toLocaleString() ?? "—"}
            </div>
            <div className="text-xs text-[var(--muted)]">Agent Tokens</div>
          </div>
          <div>
            <div className="text-xl font-bold font-mono text-[var(--accent-yellow)]">
              {data.run.scoringTotalTokens?.toLocaleString() ?? "—"}
            </div>
            <div className="text-xs text-[var(--muted)]">Scoring Tokens</div>
          </div>
          <div>
            <div className="text-xl font-bold font-mono text-[var(--muted)]">
              {data.run.scoringPromptTokens?.toLocaleString() ?? "—"}
            </div>
            <div className="text-xs text-[var(--muted)]">Prompt Tokens</div>
          </div>
          <div>
            <div className="text-xl font-bold font-mono text-[var(--muted)]">
              {data.run.scoringCompletionTokens?.toLocaleString() ?? "—"}
            </div>
            <div className="text-xs text-[var(--muted)]">Completion Tokens</div>
          </div>
        </div>
      </div>

      <ScoreView
        runId={data.run.id}
        status={data.run.status}
        criteria={data.criteria}
        deltaThreshold={data.rubric.deltaThreshold}
      />
    </div>
  );
}
