import { execaCommand } from "execa";
import type { CriterionContext, GraderResult } from "./types";

export async function automatedGrader(
  criterion: CriterionContext,
): Promise<GraderResult> {
  if (!criterion.graderConfig) {
    return {
      levelIndex: 0,
      comment: "No grader config provided for automated criterion.",
      rawOutput: "",
      tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    };
  }

  const { command, passingExitCode = 0 } = criterion.graderConfig as {
    command: string;
    passingExitCode?: number;
  };

  try {
    const result = await execaCommand(command, {
      cwd: criterion.repoPath,
      shell: true,
      timeout: 30_000,
      reject: false,
    });

    const passed = result.exitCode === passingExitCode;
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n");
    const maxLevel = criterion.levelDescriptions.length - 1;

    return {
      levelIndex: passed ? maxLevel : 0,
      comment: passed
        ? `Command passed (exit ${result.exitCode})`
        : `Command failed (exit ${result.exitCode})`,
      rawOutput: output,
      tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      levelIndex: 0,
      comment: `Command failed: ${message}`,
      rawOutput: message,
      tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    };
  }
}
