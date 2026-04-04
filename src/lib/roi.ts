export interface RunMetrics {
  avgScore: number;
  agentTokens: number;
  scoringTokens: number;
  criterionScores: Record<string, number>;
}

export interface ROIResult {
  // Quality
  qualityDelta: number; // improved.avgScore - baseline.avgScore
  qualityImprovedPercent: number; // (delta / baseline) * 100

  // Tokens
  agentTokensSaved: number; // baseline.agentTokens - improved.agentTokens
  agentTokensSavedPercent: number; // (saved / baseline) * 100
  totalScoringCost: number; // baseline.scoringTokens + improved.scoringTokens
  netTokensSaved: number; // agentTokensSaved - totalScoringCost

  // Per-criterion
  criterionDeltas: Record<string, number>; // improved - baseline per criterion

  // The headline
  rubricPaidForItself: boolean; // quality went up AND net tokens saved > 0
}

export function calculateROI(
  baseline: RunMetrics,
  improved: RunMetrics,
): ROIResult {
  const qualityDelta = improved.avgScore - baseline.avgScore;
  const qualityImprovedPercent =
    baseline.avgScore !== 0 ? (qualityDelta / baseline.avgScore) * 100 : 0;

  const agentTokensSaved = baseline.agentTokens - improved.agentTokens;
  const agentTokensSavedPercent =
    baseline.agentTokens !== 0
      ? (agentTokensSaved / baseline.agentTokens) * 100
      : 0;

  const totalScoringCost =
    baseline.scoringTokens + improved.scoringTokens;
  const netTokensSaved = agentTokensSaved - totalScoringCost;

  // Per-criterion deltas
  const allKeys = new Set([
    ...Object.keys(baseline.criterionScores),
    ...Object.keys(improved.criterionScores),
  ]);
  const criterionDeltas: Record<string, number> = {};
  for (const key of allKeys) {
    criterionDeltas[key] =
      (improved.criterionScores[key] ?? 0) -
      (baseline.criterionScores[key] ?? 0);
  }

  return {
    qualityDelta,
    qualityImprovedPercent,
    agentTokensSaved,
    agentTokensSavedPercent,
    totalScoringCost,
    netTokensSaved,
    criterionDeltas,
    rubricPaidForItself: qualityDelta > 0 && netTokensSaved > 0,
  };
}
