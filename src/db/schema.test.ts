import { describe, it, expect } from "vitest";
import * as schema from "./schema";

describe("schema", () => {
  it("exports all expected tables", () => {
    expect(schema.rubrics).toBeDefined();
    expect(schema.rubricVersions).toBeDefined();
    expect(schema.performanceLevels).toBeDefined();
    expect(schema.criteria).toBeDefined();
    expect(schema.rubricCells).toBeDefined();
    expect(schema.apps).toBeDefined();
    expect(schema.evaluationRuns).toBeDefined();
    expect(schema.scores).toBeDefined();
    expect(schema.scoreDiscussions).toBeDefined();
  });

  it("evaluationRuns includes scoring token tracking columns", () => {
    const columns = schema.evaluationRuns;
    expect(columns.scoringPromptTokens).toBeDefined();
    expect(columns.scoringCompletionTokens).toBeDefined();
    expect(columns.scoringTotalTokens).toBeDefined();
  });

  it("evaluationRuns includes agent token tracking", () => {
    expect(schema.evaluationRuns.agentTotalTokens).toBeDefined();
  });

  it("evaluationRuns includes agent prompt hash", () => {
    expect(schema.evaluationRuns.agentPromptHash).toBeDefined();
  });

  it("apps includes agent path", () => {
    expect(schema.apps.agentPath).toBeDefined();
  });

  it("evaluationRuns includes prompt log column", () => {
    expect(schema.evaluationRuns.promptLog).toBeDefined();
  });
});
