import { describe, it, expect, vi } from "vitest";
import type { CriterionContext } from "./types";

vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: class MockAnthropic {
      messages = {
        create: vi.fn().mockResolvedValue({
          content: [
            {
              type: "text",
              text: JSON.stringify({
                level: 3,
                comment: "Passes WCAG AA, keyboard navigable",
                citations: [
                  {
                    file: "src/app/page.tsx",
                    line: 15,
                    note: "Uses semantic HTML",
                  },
                ],
              }),
            },
          ],
          usage: {
            input_tokens: 200,
            output_tokens: 80,
          },
        }),
      };
    },
  };
});

const baseCriterion: CriterionContext = {
  criterionName: "Accessibility",
  stableKey: "accessibility",
  graderType: "model",
  graderConfig: null,
  levelDescriptions: [
    "No ARIA labels",
    "Some alt text",
    "Passes WCAG AA",
    "Full WCAG AA",
    "WCAG AAA",
  ],
  repoPath: "/tmp/test-app",
};

describe("modelGrader", () => {
  it("returns parsed score with citations and token usage", async () => {
    const { modelGrader } = await import("./model");

    const result = await modelGrader(baseCriterion);
    expect(result.levelIndex).toBe(2); // level 3 -> 0-based index 2
    expect(result.comment).toBe("Passes WCAG AA, keyboard navigable");
    expect(result.citations).toHaveLength(1);
    expect(result.citations![0].file).toBe("src/app/page.tsx");
    expect(result.tokenUsage).toEqual({
      promptTokens: 200,
      completionTokens: 80,
      totalTokens: 280,
    });
  });
});
