import { db } from "@/db";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import type { RunMetrics } from "./roi";

export async function getRunMetrics(runId: string): Promise<RunMetrics | null> {
  const [run] = await db
    .select()
    .from(schema.evaluationRuns)
    .where(eq(schema.evaluationRuns.id, runId));

  if (!run) return null;

  const scores = await db
    .select()
    .from(schema.scores)
    .where(eq(schema.scores.runId, runId));

  const levels = await db
    .select()
    .from(schema.performanceLevels)
    .where(eq(schema.performanceLevels.versionId, run.rubricVersionId));

  const allCriteria = await db
    .select()
    .from(schema.criteria)
    .where(eq(schema.criteria.versionId, run.rubricVersionId));

  // Build per-criterion scores using final > user > claude > auto
  const criterionScores: Record<string, number> = {};
  const numericScores: number[] = [];

  for (const score of scores) {
    const levelId =
      score.finalLevelId ??
      score.userLevelId ??
      score.claudeLevelId ??
      score.autoLevelId;
    if (!levelId) continue;

    const level = levels.find((l) => l.id === levelId);
    if (!level?.numericValue) continue;

    const criterion = allCriteria.find((c) => c.id === score.criterionId);
    if (!criterion) continue;

    criterionScores[criterion.stableKey] = level.numericValue;
    numericScores.push(level.numericValue);
  }

  const avgScore =
    numericScores.length > 0
      ? numericScores.reduce((a, b) => a + b, 0) / numericScores.length
      : 0;

  return {
    avgScore,
    agentTokens: run.agentTotalTokens ?? 0,
    scoringTokens: run.scoringTotalTokens ?? 0,
    criterionScores,
  };
}
