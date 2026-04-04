export type GraderType = "automated" | "model" | "human";

export interface GraderResult {
  levelIndex: number; // 0-based index into performance levels
  comment: string;
  citations?: Citation[];
  rawOutput?: string;
  tokenUsage?: TokenUsage;
}

export interface Citation {
  file: string;
  line: number;
  note: string;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface CriterionContext {
  criterionName: string;
  stableKey: string;
  graderType: GraderType;
  graderConfig: Record<string, unknown> | null;
  levelDescriptions: string[]; // ordered 0..n
  repoPath: string;
}
