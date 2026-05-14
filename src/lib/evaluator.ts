import { getRubricBySlug } from "./rubrics.js";

export type ScoreInput = {
  criterion: string;
  score: number;
  reasoning: string;
};

export type CriterionResult = {
  criterion: string;
  score: number;
  passed: boolean;
};

export type FailureDetail = {
  criterion: string;
  score: number;
  current_level: string;
  next_level: string;
};

export type EvaluationResult = {
  passed: boolean;
  results: CriterionResult[];
  failures: FailureDetail[];
};

const PASS_THRESHOLD = 3;

export function evaluate(rubricSlug: string, scores: ScoreInput[]): EvaluationResult {
  const rubric = getRubricBySlug(rubricSlug);
  if (!rubric) {
    throw new Error(`Unknown rubric: "${rubricSlug}"`);
  }

  const criteriaLabels = new Set(rubric.criteria.map((c) => c.label));

  for (const s of scores) {
    if (!criteriaLabels.has(s.criterion)) {
      throw new Error(`Unknown criterion: "${s.criterion}"`);
    }
    if (s.score < 1 || s.score > 5 || !Number.isInteger(s.score)) {
      throw new Error(`Score must be between 1 and 5 (got ${s.score})`);
    }
  }

  const scoredCriteria = new Set(scores.map((s) => s.criterion));
  const missing = rubric.criteria.filter((c) => !scoredCriteria.has(c.label));
  if (missing.length > 0) {
    throw new Error(`Missing criteria: ${missing.map((c) => c.label).join(", ")}`);
  }

  const results: CriterionResult[] = [];
  const failures: FailureDetail[] = [];

  for (const criterion of rubric.criteria) {
    const scoreInput = scores.find((s) => s.criterion === criterion.label)!;
    const passed = scoreInput.score >= PASS_THRESHOLD;

    results.push({
      criterion: criterion.label,
      score: scoreInput.score,
      passed,
    });

    if (!passed) {
      const currentLevel = criterion.levels[scoreInput.score - 1]!;
      const nextLevel = criterion.levels[scoreInput.score]!;

      failures.push({
        criterion: criterion.label,
        score: scoreInput.score,
        current_level: currentLevel.description,
        next_level: nextLevel.description,
      });
    }
  }

  return {
    passed: failures.length === 0,
    results,
    failures,
  };
}
