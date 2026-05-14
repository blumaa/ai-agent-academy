import { describe, it, expect } from "vitest";
import { evaluate, type ScoreInput } from "./evaluator.js";

const passingScores: ScoreInput[] = [
  { criterion: "Error handling", score: 4, reasoning: "Error boundaries in place" },
  { criterion: "State management", score: 3, reasoning: "Context per domain" },
  { criterion: "Edge cases", score: 5, reasoning: "Full coverage" },
  { criterion: "Type safety", score: 3, reasoning: "Strict mode on" },
];

const failingScores: ScoreInput[] = [
  { criterion: "Error handling", score: 4, reasoning: "Error boundaries in place" },
  { criterion: "State management", score: 2, reasoning: "Updates conflict" },
  { criterion: "Edge cases", score: 3, reasoning: "Basic guards" },
  { criterion: "Type safety", score: 1, reasoning: "Widespread any" },
];

describe("evaluate", () => {
  it("returns passed=true when all scores >= 3", () => {
    const result = evaluate("bugs-correctness", passingScores);
    expect(result.passed).toBe(true);
  });

  it("returns passed=false when any score < 3", () => {
    const result = evaluate("bugs-correctness", failingScores);
    expect(result.passed).toBe(false);
  });

  it("returns results for all criteria with scores", () => {
    const result = evaluate("bugs-correctness", passingScores);
    expect(result.results).toHaveLength(4);
    expect(result.results[0]).toEqual({
      criterion: "Error handling",
      score: 4,
      passed: true,
    });
  });

  it("returns failures only for criteria scoring below 3", () => {
    const result = evaluate("bugs-correctness", failingScores);
    expect(result.failures).toHaveLength(2);
    expect(result.failures[0]!.criterion).toBe("State management");
    expect(result.failures[1]!.criterion).toBe("Type safety");
  });

  it("includes current level description in failures", () => {
    const result = evaluate("bugs-correctness", failingScores);
    const typeSafety = result.failures.find((f) => f.criterion === "Type safety");
    expect(typeSafety!.score).toBe(1);
    expect(typeSafety!.current_level).toBe(
      "Widespread `any`, no strict mode, runtime type mismatches"
    );
  });

  it("includes next level description in failures", () => {
    const result = evaluate("bugs-correctness", failingScores);
    const typeSafety = result.failures.find((f) => f.criterion === "Type safety");
    expect(typeSafety!.next_level).toBe(
      "Some types but frequent `as` casts and non-null assertions"
    );
  });

  it("uses level 3 as next_level when score is 2", () => {
    const result = evaluate("bugs-correctness", failingScores);
    const stateMgmt = result.failures.find((f) => f.criterion === "State management");
    expect(stateMgmt!.next_level).toBe(
      "Single store or context per domain, basic optimistic updates"
    );
  });

  it("throws on unknown rubric slug", () => {
    expect(() => evaluate("nonexistent", passingScores)).toThrow("Unknown rubric");
  });

  it("throws when scores don't cover all criteria", () => {
    const partial = passingScores.slice(0, 2);
    expect(() => evaluate("bugs-correctness", partial)).toThrow("Missing criteria");
  });

  it("throws on unknown criterion name", () => {
    const bad = [
      ...passingScores.slice(0, 3),
      { criterion: "Nonexistent criterion", score: 3 as const, reasoning: "test" },
    ];
    expect(() => evaluate("bugs-correctness", bad)).toThrow("Unknown criterion");
  });

  it("throws on score outside 1-5 range", () => {
    const bad = [
      ...passingScores.slice(0, 3),
      { criterion: "Type safety", score: 6 as unknown as 1, reasoning: "test" },
    ];
    expect(() => evaluate("bugs-correctness", bad)).toThrow("Score must be between 1 and 5");
  });

  it("works with design-system rubric (5 criteria)", () => {
    const scores: ScoreInput[] = [
      { criterion: "Atomic Design", score: 3, reasoning: "ok" },
      { criterion: "Design Tokens", score: 3, reasoning: "ok" },
      { criterion: "Component reuse", score: 3, reasoning: "ok" },
      { criterion: "Spacing & layout", score: 3, reasoning: "ok" },
      { criterion: "Typography", score: 3, reasoning: "ok" },
    ];
    const result = evaluate("design-system", scores);
    expect(result.passed).toBe(true);
    expect(result.results).toHaveLength(5);
  });
});
