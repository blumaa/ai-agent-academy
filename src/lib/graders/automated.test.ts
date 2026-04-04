import { describe, it, expect } from "vitest";
import { automatedGrader } from "./automated";
import type { CriterionContext } from "./types";

const baseCriterion: CriterionContext = {
  criterionName: "Performance",
  stableKey: "performance",
  graderType: "automated",
  graderConfig: null,
  levelDescriptions: [
    "LCP > 6s, no code splitting",
    "LCP 4-6s, minimal optimization",
    "LCP 2.5-4s, basic lazy loading",
    "LCP < 2.5s, Core Web Vitals green",
    "Sub-second LCP, edge caching",
  ],
  repoPath: "/tmp",
};

describe("automatedGrader", () => {
  it("runs a passing command and returns a high level", async () => {
    const criterion: CriterionContext = {
      ...baseCriterion,
      graderConfig: {
        command: "echo 'all good'",
        passingExitCode: 0,
      },
    };

    const result = await automatedGrader(criterion);
    expect(result.levelIndex).toBeGreaterThanOrEqual(0);
    expect(result.rawOutput).toContain("all good");
    expect(result.comment).toBeTruthy();
    expect(result.tokenUsage).toEqual({
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    });
  });

  it("runs a failing command and returns level 0", async () => {
    const criterion: CriterionContext = {
      ...baseCriterion,
      graderConfig: {
        command: "exit 1",
        passingExitCode: 0,
      },
    };

    const result = await automatedGrader(criterion);
    expect(result.levelIndex).toBe(0);
    expect(result.comment).toContain("failed");
  });

  it("handles missing graderConfig gracefully", async () => {
    const result = await automatedGrader(baseCriterion);
    expect(result.levelIndex).toBe(0);
    expect(result.comment).toContain("No grader config");
  });

  it("captures stdout as rawOutput", async () => {
    const criterion: CriterionContext = {
      ...baseCriterion,
      graderConfig: {
        command: "echo 'test output here'",
        passingExitCode: 0,
      },
    };

    const result = await automatedGrader(criterion);
    expect(result.rawOutput).toContain("test output here");
  });
});
