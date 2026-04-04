import { db } from "@/db";
import { eq, and } from "drizzle-orm";
import * as schema from "@/db/schema";
import { dispatchGrader } from "./graders";
import type { CriterionContext, TokenUsage } from "./graders";

export async function createEvaluationRun(appId: string, rubricId: string) {
  // Get current rubric version
  const [version] = await db
    .select()
    .from(schema.rubricVersions)
    .where(
      and(
        eq(schema.rubricVersions.rubricId, rubricId),
        eq(schema.rubricVersions.isCurrent, true),
      ),
    );

  if (!version) throw new Error("No current rubric version found");

  // Create the run
  const [run] = await db
    .insert(schema.evaluationRuns)
    .values({
      rubricVersionId: version.id,
      appId,
      status: "pending",
    })
    .returning();

  return run;
}

export async function executeAutomatedAndModelScoring(runId: string) {
  // Get run details
  const [run] = await db
    .select()
    .from(schema.evaluationRuns)
    .where(eq(schema.evaluationRuns.id, runId));

  if (!run) throw new Error("Run not found");

  // Get app for repo path
  const [app] = await db
    .select()
    .from(schema.apps)
    .where(eq(schema.apps.id, run.appId));

  // Get criteria for this rubric version
  const allCriteria = await db
    .select()
    .from(schema.criteria)
    .where(eq(schema.criteria.versionId, run.rubricVersionId))
    .orderBy(schema.criteria.sortOrder);

  // Get performance levels
  const levels = await db
    .select()
    .from(schema.performanceLevels)
    .where(eq(schema.performanceLevels.versionId, run.rubricVersionId))
    .orderBy(schema.performanceLevels.sortOrder);

  // Get rubric cells for level descriptions
  const cells = await db.select().from(schema.rubricCells);

  // Update run to scoring status
  await db
    .update(schema.evaluationRuns)
    .set({ status: "scoring" })
    .where(eq(schema.evaluationRuns.id, runId));

  let totalTokens: TokenUsage = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
  };

  // Score each non-human criterion
  for (const criterion of allCriteria) {
    if (criterion.graderType === "human") continue;

    // Build level descriptions for this criterion
    const levelDescriptions = levels.map((level) => {
      const cell = cells.find(
        (c) => c.criterionId === criterion.id && c.levelId === level.id,
      );
      return cell?.description ?? level.label;
    });

    const context: CriterionContext = {
      criterionName: criterion.name,
      stableKey: criterion.stableKey,
      graderType: criterion.graderType as "automated" | "model",
      graderConfig: criterion.graderConfig as Record<string, unknown> | null,
      levelDescriptions,
      repoPath: app?.repoPath ?? "",
    };

    const result = await dispatchGrader(context);
    if (!result) continue;

    const scoredLevel = levels[result.levelIndex];
    if (!scoredLevel) continue;

    // Upsert score
    const baseScore = {
      runId,
      criterionId: criterion.id,
      citations: result.citations ?? [],
    };

    const scoreValues =
      criterion.graderType === "automated"
        ? {
            ...baseScore,
            autoLevelId: scoredLevel.id,
            autoOutput: result.rawOutput ?? "",
          }
        : {
            ...baseScore,
            claudeLevelId: scoredLevel.id,
            claudeComment: result.comment,
          };

    await db.insert(schema.scores).values(scoreValues).onConflictDoUpdate({
      target: [schema.scores.runId, schema.scores.criterionId],
      set: scoreValues,
    });

    // Accumulate token usage
    if (result.tokenUsage) {
      totalTokens.promptTokens += result.tokenUsage.promptTokens;
      totalTokens.completionTokens += result.tokenUsage.completionTokens;
      totalTokens.totalTokens += result.tokenUsage.totalTokens;
    }
  }

  // Also create empty score rows for human criteria
  for (const criterion of allCriteria) {
    if (criterion.graderType !== "human") continue;

    const existing = await db
      .select()
      .from(schema.scores)
      .where(
        and(
          eq(schema.scores.runId, runId),
          eq(schema.scores.criterionId, criterion.id),
        ),
      );

    if (existing.length === 0) {
      await db.insert(schema.scores).values({
        runId,
        criterionId: criterion.id,
      });
    }
  }

  // Update run with token usage
  await db
    .update(schema.evaluationRuns)
    .set({
      status: "scoring",
      scoringPromptTokens: totalTokens.promptTokens,
      scoringCompletionTokens: totalTokens.completionTokens,
      scoringTotalTokens: totalTokens.totalTokens,
    })
    .where(eq(schema.evaluationRuns.id, runId));

  return { runId, totalTokens };
}

export async function getRunWithScores(runId: string) {
  const [run] = await db
    .select()
    .from(schema.evaluationRuns)
    .where(eq(schema.evaluationRuns.id, runId));

  if (!run) return null;

  const [app] = await db
    .select()
    .from(schema.apps)
    .where(eq(schema.apps.id, run.appId));

  const runScores = await db
    .select()
    .from(schema.scores)
    .where(eq(schema.scores.runId, runId));

  const allCriteria = await db
    .select()
    .from(schema.criteria)
    .where(eq(schema.criteria.versionId, run.rubricVersionId))
    .orderBy(schema.criteria.sortOrder);

  const levels = await db
    .select()
    .from(schema.performanceLevels)
    .where(eq(schema.performanceLevels.versionId, run.rubricVersionId))
    .orderBy(schema.performanceLevels.sortOrder);

  const cells = await db.select().from(schema.rubricCells);

  // Get rubric info
  const [version] = await db
    .select()
    .from(schema.rubricVersions)
    .where(eq(schema.rubricVersions.id, run.rubricVersionId));

  const [rubric] = await db
    .select()
    .from(schema.rubrics)
    .where(eq(schema.rubrics.id, version.rubricId));

  return {
    run,
    app,
    rubric,
    criteria: allCriteria.map((criterion) => {
      const score = runScores.find((s) => s.criterionId === criterion.id);
      const levelDescriptions = levels.map((level) => {
        const cell = cells.find(
          (c) => c.criterionId === criterion.id && c.levelId === level.id,
        );
        return { ...level, cellDescription: cell?.description ?? "" };
      });

      return {
        ...criterion,
        score,
        levels: levelDescriptions,
      };
    }),
    levels,
  };
}
