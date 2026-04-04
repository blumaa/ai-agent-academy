import { describe, it, expect } from "vitest";
import { calculateROI, type RunMetrics } from "./roi";

describe("calculateROI", () => {
  const baseline: RunMetrics = {
    avgScore: 2.0,
    agentTokens: 45000,
    scoringTokens: 500,
    criterionScores: { accessibility: 1, performance: 2, architecture: 3 },
  };

  const improved: RunMetrics = {
    avgScore: 3.8,
    agentTokens: 28000,
    scoringTokens: 500,
    criterionScores: { accessibility: 4, performance: 3, architecture: 4 },
  };

  it("calculates quality improvement", () => {
    const roi = calculateROI(baseline, improved);
    expect(roi.qualityDelta).toBeCloseTo(1.8);
    expect(roi.qualityImprovedPercent).toBeCloseTo(90); // 1.8/2.0 * 100
  });

  it("calculates token savings", () => {
    const roi = calculateROI(baseline, improved);
    expect(roi.agentTokensSaved).toBe(17000); // 45000 - 28000
    expect(roi.agentTokensSavedPercent).toBeCloseTo(37.78, 1); // 17000/45000 * 100
  });

  it("calculates net ROI including scoring cost", () => {
    const roi = calculateROI(baseline, improved);
    // Net savings = tokens saved - cost of scoring both runs
    expect(roi.netTokensSaved).toBe(16000); // 17000 - (500 + 500)
  });

  it("calculates per-criterion deltas", () => {
    const roi = calculateROI(baseline, improved);
    expect(roi.criterionDeltas).toEqual({
      accessibility: 3, // 4 - 1
      performance: 1, // 3 - 2
      architecture: 1, // 4 - 3
    });
  });

  it("handles negative ROI (agent got worse)", () => {
    const roi = calculateROI(improved, baseline);
    expect(roi.qualityDelta).toBeCloseTo(-1.8);
    expect(roi.agentTokensSaved).toBe(-17000);
    expect(roi.netTokensSaved).toBe(-18000); // -17000 - 1000 scoring
  });

  it("returns rubricPaidForItself flag", () => {
    const roi = calculateROI(baseline, improved);
    expect(roi.rubricPaidForItself).toBe(true); // quality up AND net tokens saved

    const roi2 = calculateROI(improved, baseline);
    expect(roi2.rubricPaidForItself).toBe(false);
  });
});
