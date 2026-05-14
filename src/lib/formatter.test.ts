import { describe, it, expect } from "vitest";
import { formatReport } from "./formatter.js";
import type { CriterionResult, FailureDetail } from "./evaluator.js";

const passingResults: CriterionResult[] = [
  { criterion: "Error handling", score: 4, passed: true },
  { criterion: "State management", score: 5, passed: true },
  { criterion: "Edge cases", score: 3, passed: true },
  { criterion: "Type safety", score: 3, passed: true },
];

const failingResults: CriterionResult[] = [
  { criterion: "Error handling", score: 4, passed: true },
  { criterion: "State management", score: 2, passed: false },
  { criterion: "Edge cases", score: 3, passed: true },
  { criterion: "Type safety", score: 1, passed: false },
];

const failures: FailureDetail[] = [
  {
    criterion: "State management",
    score: 2,
    current_level: "Some shared state but updates conflict",
    next_level: "Single store or context per domain",
  },
  {
    criterion: "Type safety",
    score: 1,
    current_level: "Widespread `any`, no strict mode",
    next_level: "Some types but frequent `as` casts",
  },
];

describe("formatReport", () => {
  it("includes the rubric title", () => {
    const report = formatReport("Bugs & Correctness", passingResults, []);
    expect(report).toContain("Bugs & Correctness");
  });

  it("includes box-drawing characters", () => {
    const report = formatReport("Test", passingResults, []);
    expect(report).toContain("┌");
    expect(report).toContain("┐");
    expect(report).toContain("└");
    expect(report).toContain("┘");
    expect(report).toContain("│");
  });

  it("shows filled blocks matching the score", () => {
    const report = formatReport("Test", passingResults, []);
    const lines = report.split("\n");
    const errorHandlingLine = lines.find((l) => l.includes("Error handling"))!;
    const filled = (errorHandlingLine.match(/█/g) || []).length;
    expect(filled).toBe(4);
  });

  it("shows empty blocks for remaining score", () => {
    const report = formatReport("Test", passingResults, []);
    const lines = report.split("\n");
    const errorHandlingLine = lines.find((l) => l.includes("Error handling"))!;
    const empty = (errorHandlingLine.match(/░/g) || []).length;
    expect(empty).toBe(1);
  });

  it("shows the numeric score after the bar", () => {
    const report = formatReport("Test", passingResults, []);
    const lines = report.split("\n");
    const edgeCasesLine = lines.find((l) => l.includes("Edge cases"))!;
    expect(edgeCasesLine).toMatch(/3/);
  });

  it("shows PASS with checkmark when all pass", () => {
    const report = formatReport("Test", passingResults, []);
    expect(report).toContain("Quality Gate: PASS");
    expect(report).toContain("✓");
  });

  it("shows FAIL with cross when any fail", () => {
    const report = formatReport("Test", failingResults, failures);
    expect(report).toContain("Quality Gate: FAIL");
    expect(report).toContain("✗");
  });

  it("shows failure details below the box", () => {
    const report = formatReport("Test", failingResults, failures);
    expect(report).toContain("✗ State management (2/5)");
    expect(report).toContain("Some shared state but updates conflict");
  });

  it("shows next level target for failures", () => {
    const report = formatReport("Test", failingResults, failures);
    expect(report).toContain("→");
    expect(report).toContain("Single store or context per domain");
  });

  it("does not show failure details when all pass", () => {
    const report = formatReport("Test", passingResults, []);
    expect(report).not.toContain("✗");
  });

  it("pads labels to align bars", () => {
    const report = formatReport("Test", passingResults, []);
    const lines = report.split("\n").filter((l) => l.includes("█"));
    const barPositions = lines.map((l) => l.indexOf("█"));
    const uniquePositions = new Set(barPositions);
    expect(uniquePositions.size).toBe(1);
  });

  it("handles 5-criteria rubric", () => {
    const fiveResults: CriterionResult[] = [
      { criterion: "Atomic Design", score: 3, passed: true },
      { criterion: "Design Tokens", score: 4, passed: true },
      { criterion: "Component reuse", score: 5, passed: true },
      { criterion: "Spacing & layout", score: 3, passed: true },
      { criterion: "Typography", score: 3, passed: true },
    ];
    const report = formatReport("Design System", fiveResults, []);
    expect(report).toContain("Atomic Design");
    expect(report).toContain("Typography");
    expect(report).toContain("PASS");
  });
});
