import { describe, it, expect, vi } from "vitest";
import type { CriterionContext } from "./types";

vi.mock("./model", () => ({
  modelGrader: vi.fn().mockResolvedValue({
    levelIndex: 2,
    comment: "Model scored this at level 3",
    citations: [],
    tokenUsage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
  }),
}));

const baseContext: CriterionContext = {
  criterionName: "Test",
  stableKey: "test",
  graderType: "automated",
  graderConfig: { command: "echo ok", passingExitCode: 0 },
  levelDescriptions: ["bad", "ok", "good"],
  repoPath: "/tmp",
};

describe("dispatchGrader", () => {
  it("routes automated criteria to automatedGrader", async () => {
    const { dispatchGrader } = await import("./dispatcher");
    const result = await dispatchGrader(baseContext);
    expect(result).not.toBeNull();
    expect(result!.levelIndex).toBe(2);
    expect(result!.comment).toContain("passed");
  });

  it("returns null for human grader type", async () => {
    const { dispatchGrader } = await import("./dispatcher");
    const result = await dispatchGrader({
      ...baseContext,
      graderType: "human",
    });
    expect(result).toBeNull();
  });

  it("routes model criteria to modelGrader", async () => {
    const { dispatchGrader } = await import("./dispatcher");
    const result = await dispatchGrader({
      ...baseContext,
      graderType: "model",
    });
    expect(result).not.toBeNull();
    expect(result!.levelIndex).toBe(2);
    expect(result!.comment).toContain("Model scored");
  });
});
