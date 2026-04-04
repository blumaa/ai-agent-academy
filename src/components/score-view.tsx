"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DiscussionPanel } from "./discussion-panel";

interface Level {
  id: string;
  label: string;
  numericValue: number | null;
  isPassing: boolean;
  cellDescription: string;
}

interface Score {
  id: string;
  userLevelId: string | null;
  claudeLevelId: string | null;
  autoLevelId: string | null;
  finalLevelId: string | null;
  userComment: string | null;
  claudeComment: string | null;
  autoOutput: string | null;
  citations: unknown;
}

interface Criterion {
  id: string;
  name: string;
  stableKey: string;
  graderType: string;
  weight: number;
  score: Score | undefined;
  levels: Level[];
}

interface Props {
  runId: string;
  status: string;
  criteria: Criterion[];
  deltaThreshold: number;
}

const LEVEL_COLORS = [
  "border-[var(--accent-red)] bg-[var(--accent-red)]/5",
  "border-[var(--accent-orange)] bg-[var(--accent-orange)]/5",
  "border-[var(--accent-yellow)] bg-[var(--accent-yellow)]/5",
  "border-[var(--accent-green)] bg-[var(--accent-green)]/5",
  "border-[var(--accent-green-dark)] bg-[var(--accent-green-dark)]/5",
];

export function ScoreView({ runId, status, criteria, deltaThreshold }: Props) {
  const router = useRouter();
  const [userScores, setUserScores] = useState<
    Record<string, { levelId: string; comment: string }>
  >(() => {
    const initial: Record<string, { levelId: string; comment: string }> = {};
    for (const c of criteria) {
      if (c.score?.userLevelId) {
        initial[c.id] = {
          levelId: c.score.userLevelId,
          comment: c.score.userComment ?? "",
        };
      }
    }
    return initial;
  });
  const [submitting, setSubmitting] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [openDiscussions, setOpenDiscussions] = useState<Set<string>>(
    new Set(),
  );

  function getClaudeLevel(criterion: Criterion) {
    const levelId =
      criterion.score?.claudeLevelId ?? criterion.score?.autoLevelId;
    if (!levelId) return null;
    return criterion.levels.find((l) => l.id === levelId) ?? null;
  }

  function getUserLevel(criterion: Criterion) {
    const levelId = userScores[criterion.id]?.levelId;
    if (!levelId) return null;
    return criterion.levels.find((l) => l.id === levelId) ?? null;
  }

  function getDelta(criterion: Criterion): number | null {
    const claude = getClaudeLevel(criterion);
    const user = getUserLevel(criterion);
    if (!claude || !user) return null;
    return Math.abs((user.numericValue ?? 0) - (claude.numericValue ?? 0));
  }

  async function submitScores() {
    setSubmitting(true);
    const scores = Object.entries(userScores).map(
      ([criterionId, { levelId, comment }]) => ({
        criterionId,
        userLevelId: levelId,
        userComment: comment || undefined,
      }),
    );

    await fetch(`/api/runs/${runId}/scores`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scores }),
    });

    setSubmitting(false);
    router.refresh();
  }

  async function finalizeRun() {
    setFinalizing(true);
    await fetch(`/api/runs/${runId}/finalize`, { method: "POST" });
    setFinalizing(false);
    router.refresh();
  }

  const allScored = criteria.every((c) => userScores[c.id]?.levelId);
  const isFinalized = status === "finalized";

  return (
    <div className="space-y-6">
      {/* Criteria scoring grid */}
      {criteria.map((criterion) => {
        const claudeLevel = getClaudeLevel(criterion);
        const userLevel = getUserLevel(criterion);
        const delta = getDelta(criterion);
        const needsDiscussion =
          delta !== null && delta >= deltaThreshold;

        return (
          <div
            key={criterion.id}
            className={`bg-[var(--surface)] border rounded-lg p-5 ${
              needsDiscussion
                ? "border-[var(--accent-orange)]"
                : "border-[var(--border)]"
            }`}
          >
            {/* Criterion header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-base">{criterion.name}</h3>
                <span className="text-xs text-[var(--muted)]">
                  {criterion.graderType} · weight {criterion.weight}
                </span>
              </div>
              {delta !== null && (
                <span
                  className={`text-sm font-mono ${
                    needsDiscussion
                      ? "text-[var(--accent-orange)]"
                      : "text-[var(--accent-green)]"
                  }`}
                >
                  delta: {delta}
                  {needsDiscussion && " — discussion required"}
                </span>
              )}
            </div>

            {/* Level selection grid */}
            <div className="grid grid-cols-5 gap-2 mb-4">
              {criterion.levels.map((level, i) => {
                const isClaudeChoice = claudeLevel?.id === level.id;
                const isUserChoice = userLevel?.id === level.id;

                return (
                  <button
                    key={level.id}
                    disabled={isFinalized}
                    onClick={() =>
                      setUserScores((prev) => ({
                        ...prev,
                        [criterion.id]: {
                          levelId: level.id,
                          comment: prev[criterion.id]?.comment ?? "",
                        },
                      }))
                    }
                    className={`relative border-l-4 rounded-md p-3 text-left text-xs transition-all ${LEVEL_COLORS[i]} ${
                      isUserChoice
                        ? "ring-2 ring-[#58A6FF]"
                        : "hover:ring-1 hover:ring-[var(--muted)]"
                    } ${isFinalized ? "cursor-default" : "cursor-pointer"}`}
                  >
                    <div className="font-medium mb-1">Level {level.label}</div>
                    <div className="text-[var(--muted)] leading-relaxed">
                      {level.cellDescription}
                    </div>
                    {/* Indicators */}
                    <div className="absolute top-2 right-2 flex gap-1">
                      {isClaudeChoice && (
                        <span className="bg-purple-500/20 text-purple-400 text-[10px] px-1.5 py-0.5 rounded">
                          Claude
                        </span>
                      )}
                      {isUserChoice && (
                        <span className="bg-blue-500/20 text-blue-400 text-[10px] px-1.5 py-0.5 rounded">
                          You
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Claude's comment / auto output */}
            {(criterion.score?.claudeComment ||
              criterion.score?.autoOutput) && (
              <div className="bg-[var(--background)] rounded-md p-3 text-xs">
                <span className="text-purple-400 font-medium">
                  {criterion.graderType === "automated"
                    ? "Auto output"
                    : "Claude"}
                  :{" "}
                </span>
                <span className="text-[var(--muted)]">
                  {criterion.score?.claudeComment ??
                    criterion.score?.autoOutput}
                </span>
              </div>
            )}

            {/* User comment input */}
            {!isFinalized && (
              <input
                type="text"
                placeholder="Your comment (optional)..."
                value={userScores[criterion.id]?.comment ?? ""}
                onChange={(e) =>
                  setUserScores((prev) => ({
                    ...prev,
                    [criterion.id]: {
                      levelId: prev[criterion.id]?.levelId ?? "",
                      comment: e.target.value,
                    },
                  }))
                }
                className="mt-3 w-full bg-[var(--background)] border border-[var(--border)] rounded-md px-3 py-2 text-sm placeholder:text-[var(--muted)]"
              />
            )}

            {/* Discussion toggle + panel */}
            {needsDiscussion && criterion.score?.id && (
              <>
                <button
                  onClick={() =>
                    setOpenDiscussions((prev) => {
                      const next = new Set(prev);
                      if (next.has(criterion.id)) {
                        next.delete(criterion.id);
                      } else {
                        next.add(criterion.id);
                      }
                      return next;
                    })
                  }
                  className="mt-3 text-xs text-[var(--accent-orange)] hover:underline"
                >
                  {openDiscussions.has(criterion.id)
                    ? "Hide discussion"
                    : "Open discussion"}
                </button>
                <DiscussionPanel
                  runId={runId}
                  scoreId={criterion.score.id}
                  criterionName={criterion.name}
                  isOpen={openDiscussions.has(criterion.id)}
                />
              </>
            )}
          </div>
        );
      })}

      {/* Actions */}
      {!isFinalized && (
        <div className="flex gap-3">
          <button
            onClick={submitScores}
            disabled={!allScored || submitting}
            className="bg-[#58A6FF] hover:bg-[#79B8FF] text-white font-medium py-2 px-6 rounded-md transition-colors disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Submit Scores"}
          </button>
          <button
            onClick={finalizeRun}
            disabled={!allScored || finalizing}
            className="bg-[var(--accent-green-dark)] hover:bg-[var(--accent-green)] text-white font-medium py-2 px-6 rounded-md transition-colors disabled:opacity-50"
          >
            {finalizing ? "Finalizing..." : "Finalize Run"}
          </button>
        </div>
      )}

      {isFinalized && (
        <div className="bg-[var(--accent-green)]/10 border border-[var(--accent-green)]/30 rounded-lg p-4 text-center">
          <span className="text-[var(--accent-green)] font-medium">
            This evaluation has been finalized.
          </span>
        </div>
      )}
    </div>
  );
}
