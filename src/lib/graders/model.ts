import Anthropic from "@anthropic-ai/sdk";
import type { CriterionContext, GraderResult, Citation } from "./types";

const anthropic = new Anthropic();

export async function modelGrader(
  criterion: CriterionContext,
): Promise<GraderResult> {
  const levelsText = criterion.levelDescriptions
    .map((desc, i) => `  Level ${i + 1}: ${desc}`)
    .join("\n");

  const prompt = `You are evaluating a codebase at "${criterion.repoPath}" on the criterion "${criterion.criterionName}".

Performance levels (1 = worst, ${criterion.levelDescriptions.length} = best):
${levelsText}

Analyze the codebase for this criterion. Respond with ONLY valid JSON:
{
  "level": <number 1-${criterion.levelDescriptions.length}>,
  "comment": "<1-2 sentence explanation>",
  "citations": [{"file": "<path>", "line": <number>, "note": "<what you found>"}]
}`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    const parsed = JSON.parse(text) as {
      level: number;
      comment: string;
      citations?: Citation[];
    };

    return {
      levelIndex: Math.max(0, parsed.level - 1), // convert 1-based to 0-based
      comment: parsed.comment,
      citations: parsed.citations ?? [],
      tokenUsage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      levelIndex: 0,
      comment: `Model grader error: ${message}`,
      citations: [],
    };
  }
}
