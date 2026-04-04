"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { RunMetrics, ROIResult } from "@/lib/roi";

interface Props {
  runs: Array<{ id: string; label: string }>;
  baselineId?: string;
  improvedId?: string;
  comparison: {
    baseline: RunMetrics;
    improved: RunMetrics;
    roi: ROIResult;
  } | null;
}

export function CompareView({
  runs,
  baselineId,
  improvedId,
  comparison,
}: Props) {
  const router = useRouter();
  const [baseline, setBaseline] = useState(baselineId ?? "");
  const [improved, setImproved] = useState(improvedId ?? "");

  function handleCompare() {
    if (!baseline || !improved) return;
    router.push(`/compare?baseline=${baseline}&improved=${improved}`);
  }

  return (
    <div className="space-y-6">
      {/* Run selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4">
          <label className="block text-sm font-medium mb-2 text-[var(--accent-red)]">
            Baseline (Before)
          </label>
          <select
            value={baseline}
            onChange={(e) => setBaseline(e.target.value)}
            className="w-full bg-[var(--background)] border border-[var(--border)] rounded-md px-3 py-2 text-sm"
          >
            <option value="">Select a run...</option>
            {runs.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4">
          <label className="block text-sm font-medium mb-2 text-[var(--accent-green)]">
            Improved (After)
          </label>
          <select
            value={improved}
            onChange={(e) => setImproved(e.target.value)}
            className="w-full bg-[var(--background)] border border-[var(--border)] rounded-md px-3 py-2 text-sm"
          >
            <option value="">Select a run...</option>
            {runs.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        onClick={handleCompare}
        disabled={!baseline || !improved}
        className="bg-[#58A6FF] hover:bg-[#79B8FF] text-white font-medium py-2 px-6 rounded-md transition-colors disabled:opacity-50"
      >
        Compare
      </button>

      {/* ROI Results */}
      {comparison && <ROIDisplay {...comparison} />}
    </div>
  );
}

function ProofChart({
  baseline,
  improved,
}: {
  baseline: RunMetrics;
  improved: RunMetrics;
}) {
  const svgWidth = 480;
  const svgHeight = 260;
  const margin = { top: 24, right: 64, bottom: 40, left: 56 };
  const chartW = svgWidth - margin.left - margin.right;
  const chartH = svgHeight - margin.top - margin.bottom;

  // Quality axis: 0-5
  const maxQuality = 5;
  const qScale = (v: number) => chartH - (v / maxQuality) * chartH;

  // Token axis: 0 to max with 20% headroom
  const maxTokens = Math.max(baseline.agentTokens, improved.agentTokens, 1);
  const tokenCeil = maxTokens * 1.2;
  const tScale = (v: number) => chartH - (v / tokenCeil) * chartH;

  // Bar layout: two groups, each with quality + token bar
  const groupWidth = chartW / 2;
  const barWidth = groupWidth * 0.28;
  const gap = groupWidth * 0.08;

  const groups = [
    { label: "Baseline", quality: baseline.avgScore, tokens: baseline.agentTokens },
    { label: "Improved", quality: improved.avgScore, tokens: improved.agentTokens },
  ];

  const qualityColor = (i: number) => i === 0 ? "var(--accent-red)" : "var(--accent-green)";
  const tokenColor = "#58A6FF";

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-6">
      <h3 className="font-semibold mb-4">Before / After</h3>
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full max-w-lg mx-auto"
        role="img"
        aria-label="Before/after comparison chart showing quality and token usage"
      >
        <g transform={`translate(${margin.left},${margin.top})`}>
          {/* Grid lines */}
          {[0, 1, 2, 3, 4, 5].map((v) => (
            <line
              key={`grid-${v}`}
              x1={0}
              x2={chartW}
              y1={qScale(v)}
              y2={qScale(v)}
              stroke="var(--border)"
              strokeDasharray={v === 0 ? undefined : "4 4"}
            />
          ))}

          {/* Left Y-axis label (Quality) */}
          <text
            x={-40}
            y={chartH / 2}
            textAnchor="middle"
            transform={`rotate(-90, -40, ${chartH / 2})`}
            fill="var(--muted)"
            fontSize={11}
          >
            Quality (0-5)
          </text>
          {/* Left Y-axis ticks */}
          {[0, 1, 2, 3, 4, 5].map((v) => (
            <text
              key={`ytick-${v}`}
              x={-8}
              y={qScale(v) + 4}
              textAnchor="end"
              fill="var(--muted)"
              fontSize={10}
            >
              {v}
            </text>
          ))}

          {/* Right Y-axis label (Tokens) */}
          <text
            x={chartW + 48}
            y={chartH / 2}
            textAnchor="middle"
            transform={`rotate(90, ${chartW + 48}, ${chartH / 2})`}
            fill="var(--muted)"
            fontSize={11}
          >
            Agent Tokens
          </text>
          {/* Right Y-axis ticks */}
          {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
            const v = Math.round(tokenCeil * frac);
            return (
              <text
                key={`ttick-${frac}`}
                x={chartW + 8}
                y={tScale(v) + 4}
                textAnchor="start"
                fill="var(--muted)"
                fontSize={10}
              >
                {v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
              </text>
            );
          })}

          {/* Bars */}
          {groups.map((g, i) => {
            const gx = i * groupWidth + groupWidth / 2;
            const qBarX = gx - barWidth - gap / 2;
            const tBarX = gx + gap / 2;
            const qH = chartH - qScale(g.quality);
            const tH = chartH - tScale(g.tokens);

            return (
              <g key={g.label} data-testid={`chart-group-${i}`}>
                {/* Quality bar */}
                <rect
                  x={qBarX}
                  y={qScale(g.quality)}
                  width={barWidth}
                  height={Math.max(qH, 1)}
                  fill={qualityColor(i)}
                  rx={3}
                  data-testid={`quality-bar-${i}`}
                />
                {/* Quality value label */}
                <text
                  x={qBarX + barWidth / 2}
                  y={qScale(g.quality) - 6}
                  textAnchor="middle"
                  fill={qualityColor(i)}
                  fontSize={11}
                  fontWeight="bold"
                >
                  {g.quality.toFixed(1)}
                </text>

                {/* Token bar */}
                <rect
                  x={tBarX}
                  y={tScale(g.tokens)}
                  width={barWidth}
                  height={Math.max(tH, 1)}
                  fill={tokenColor}
                  rx={3}
                  opacity={i === 0 ? 0.5 : 0.9}
                  data-testid={`token-bar-${i}`}
                />
                {/* Token value label */}
                <text
                  x={tBarX + barWidth / 2}
                  y={tScale(g.tokens) - 6}
                  textAnchor="middle"
                  fill={tokenColor}
                  fontSize={11}
                  fontWeight="bold"
                >
                  {g.tokens >= 1000
                    ? `${(g.tokens / 1000).toFixed(1)}k`
                    : g.tokens}
                </text>

                {/* X-axis label */}
                <text
                  x={gx}
                  y={chartH + 20}
                  textAnchor="middle"
                  fill="var(--foreground)"
                  fontSize={12}
                  fontWeight="500"
                >
                  {g.label}
                </text>
              </g>
            );
          })}

          {/* Legend */}
          <g transform={`translate(${chartW / 2 - 80}, ${chartH + 32})`}>
            <rect width={10} height={10} fill="var(--accent-green)" rx={2} />
            <text x={14} y={9} fill="var(--muted)" fontSize={10}>Quality</text>
            <rect x={70} width={10} height={10} fill={tokenColor} rx={2} />
            <text x={84} y={9} fill="var(--muted)" fontSize={10}>Tokens</text>
          </g>
        </g>
      </svg>
    </div>
  );
}

function ROIDisplay({
  baseline,
  improved,
  roi,
}: {
  baseline: RunMetrics;
  improved: RunMetrics;
  roi: ROIResult;
}) {
  return (
    <div className="space-y-6">
      {/* Headline verdict */}
      <div
        className={`rounded-lg p-6 text-center border ${
          roi.rubricPaidForItself
            ? "bg-[var(--accent-green)]/10 border-[var(--accent-green)]/30"
            : "bg-[var(--accent-red)]/10 border-[var(--accent-red)]/30"
        }`}
      >
        <div className="text-2xl font-bold mb-2">
          {roi.rubricPaidForItself
            ? "The rubric paid for itself."
            : "The rubric hasn't paid off yet."}
        </div>
        <div className="text-[var(--muted)]">
          Quality {roi.qualityDelta > 0 ? "up" : "down"}{" "}
          {Math.abs(roi.qualityDelta).toFixed(1)} pts (
          {roi.qualityImprovedPercent > 0 ? "+" : ""}
          {roi.qualityImprovedPercent.toFixed(0)}%) · Agent tokens{" "}
          {roi.agentTokensSaved > 0 ? "saved" : "increased"}{" "}
          {Math.abs(roi.agentTokensSaved).toLocaleString()} · Net{" "}
          {roi.netTokensSaved > 0 ? "saved" : "cost"}{" "}
          {Math.abs(roi.netTokensSaved).toLocaleString()} tokens
        </div>
      </div>

      {/* Before/After proof chart */}
      <ProofChart baseline={baseline} improved={improved} />

      {/* Metrics grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Quality (Before)"
          value={baseline.avgScore.toFixed(1)}
          suffix="/5"
          color="var(--accent-red)"
        />
        <MetricCard
          label="Quality (After)"
          value={improved.avgScore.toFixed(1)}
          suffix="/5"
          color="var(--accent-green)"
        />
        <MetricCard
          label="Agent Tokens (Before)"
          value={baseline.agentTokens.toLocaleString()}
          color="var(--accent-red)"
        />
        <MetricCard
          label="Agent Tokens (After)"
          value={improved.agentTokens.toLocaleString()}
          color="var(--accent-green)"
        />
      </div>

      {/* Token breakdown */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-6">
        <h3 className="font-semibold mb-4">Token Economics</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">
              Agent tokens saved (before → after)
            </span>
            <span
              className={`font-mono font-medium ${roi.agentTokensSaved > 0 ? "text-[var(--accent-green)]" : "text-[var(--accent-red)]"}`}
            >
              {roi.agentTokensSaved > 0 ? "+" : ""}
              {roi.agentTokensSaved.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">
              Scoring cost (both runs)
            </span>
            <span className="font-mono text-[var(--accent-yellow)]">
              -{roi.totalScoringCost.toLocaleString()}
            </span>
          </div>
          <div className="border-t border-[var(--border)] pt-3 flex justify-between font-medium">
            <span>Net token ROI</span>
            <span
              className={`font-mono ${roi.netTokensSaved > 0 ? "text-[var(--accent-green)]" : "text-[var(--accent-red)]"}`}
            >
              {roi.netTokensSaved > 0 ? "+" : ""}
              {roi.netTokensSaved.toLocaleString()} tokens
            </span>
          </div>
        </div>
      </div>

      {/* Per-criterion breakdown */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-6">
        <h3 className="font-semibold mb-4">Per-Criterion Change</h3>
        <div className="space-y-3">
          {Object.entries(roi.criterionDeltas).map(([key, delta]) => (
            <div key={key} className="flex items-center gap-3">
              <span className="text-sm font-medium w-32 capitalize">
                {key}
              </span>
              <div className="flex-1 flex items-center gap-2">
                <span className="text-sm font-mono text-[var(--muted)]">
                  {baseline.criterionScores[key] ?? "?"}
                </span>
                <span className="text-[var(--muted)]">→</span>
                <span className="text-sm font-mono">
                  {improved.criterionScores[key] ?? "?"}
                </span>
                <span
                  className={`text-xs font-mono px-2 py-0.5 rounded-full ${
                    delta > 0
                      ? "bg-[var(--accent-green)]/20 text-[var(--accent-green)]"
                      : delta < 0
                        ? "bg-[var(--accent-red)]/20 text-[var(--accent-red)]"
                        : "bg-[var(--muted)]/20 text-[var(--muted)]"
                  }`}
                >
                  {delta > 0 ? "+" : ""}
                  {delta}
                </span>
              </div>
              {/* Visual bar */}
              <div className="w-32 bg-[var(--background)] rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full ${delta > 0 ? "bg-[var(--accent-green)]" : delta < 0 ? "bg-[var(--accent-red)]" : "bg-[var(--muted)]"}`}
                  style={{
                    width: `${Math.min(100, ((improved.criterionScores[key] ?? 0) / 5) * 100)}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  suffix,
  color,
}: {
  label: string;
  value: string;
  suffix?: string;
  color: string;
}) {
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4">
      <div className="text-xs text-[var(--muted)] mb-1">{label}</div>
      <div className="text-2xl font-bold font-mono" style={{ color }}>
        {value}
        {suffix && (
          <span className="text-sm text-[var(--muted)]">{suffix}</span>
        )}
      </div>
    </div>
  );
}
