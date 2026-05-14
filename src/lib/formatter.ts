import type { CriterionResult, FailureDetail } from "./evaluator.js";

const MAX_SCORE = 5;
const FILLED = "█";
const EMPTY = "░";

export function formatReport(
  title: string,
  results: CriterionResult[],
  failures: FailureDetail[]
): string {
  const passed = failures.length === 0;
  const maxLabelWidth = Math.max(...results.map((r) => r.criterion.length));

  const barLines = results.map((r) => {
    const label = r.criterion.padEnd(maxLabelWidth);
    const filled = FILLED.repeat(r.score);
    const empty = EMPTY.repeat(MAX_SCORE - r.score);
    return `│ ${label}  ${filled}${empty}  ${r.score} │`;
  });

  const contentWidth = barLines[0]!.length - 2;
  const topBorder = `┌${"─".repeat(contentWidth)}┐`;
  const bottomBorder = `└${"─".repeat(contentWidth)}┘`;

  const titleLine = `│ ${title.padEnd(contentWidth - 2)} │`;
  const emptyLine = `│${" ".repeat(contentWidth)}│`;

  const verdict = passed ? "Quality Gate: PASS ✓" : "Quality Gate: FAIL ✗";
  const verdictLine = `│ ${verdict.padEnd(contentWidth - 2)} │`;

  const lines = [
    topBorder,
    titleLine,
    emptyLine,
    ...barLines,
    emptyLine,
    verdictLine,
    bottomBorder,
  ];

  if (failures.length > 0) {
    lines.push("");
    for (const f of failures) {
      lines.push(`✗ ${f.criterion} (${f.score}/${MAX_SCORE}): ${f.current_level}`);
      lines.push(`  → Next: ${f.next_level}`);
    }
  }

  return lines.join("\n");
}
