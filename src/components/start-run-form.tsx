"use client";

import { useState, useRef, useEffect } from "react";

interface Props {
  tests: Array<{ id: string; name: string }>;
  agents: Array<{ id: string; name: string }>;
  rubrics: Array<{ id: string; title: string }>;
}

type JobState =
  | { phase: "idle" }
  | { phase: "starting" }
  | { phase: "running"; jobId: string; agentName: string; elapsed: number; log: string }
  | { phase: "completed"; runId: string }
  | { phase: "failed"; error: string; log: string };

export function StartRunForm({ tests, agents, rubrics }: Props) {
  const [testId, setTestId] = useState(tests[0]?.id ?? "");
  const [appId, setAppId] = useState(agents[0]?.id ?? "");
  const [rubricId, setRubricId] = useState(rubrics[0]?.id ?? "");
  const [model, setModel] = useState("sonnet");
  const [job, setJob] = useState<JobState>({ phase: "idle" });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setJob({ phase: "starting" });

    const res = await fetch("/api/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ testId, appId, rubricId, model }),
    });

    const data = await res.json();

    if (!res.ok || !data.jobId) {
      setJob({ phase: "failed", error: data.error ?? "Failed to start", log: "" });
      return;
    }

    const startTime = Date.now();
    setJob({
      phase: "running",
      jobId: data.jobId,
      agentName: data.agent,
      elapsed: 0,
      log: "",
    });

    // Poll every 3 seconds
    intervalRef.current = setInterval(async () => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      try {
        const pollRes = await fetch(
          `/api/evaluate?jobId=${data.jobId}`,
        );
        const pollData = await pollRes.json();
        const log = pollData.log ?? "";

        if (pollData.status === "completed") {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          setJob({ phase: "completed", runId: pollData.runId });
        } else if (pollData.status === "failed") {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          setJob({ phase: "failed", error: pollData.error, log });
        } else {
          setJob((prev) =>
            prev.phase === "running" ? { ...prev, elapsed, log } : prev,
          );
        }
      } catch {
        setJob((prev) =>
          prev.phase === "running" ? { ...prev, elapsed } : prev,
        );
      }
    }, 3000);
  }

  if (tests.length === 0 || agents.length === 0 || rubrics.length === 0) {
    return (
      <p className="text-[var(--muted)] text-sm">
        No tests, agents, or rubrics found. Run the seed script first.
      </p>
    );
  }

  const isRunning = job.phase === "starting" || job.phase === "running";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Test</label>
        <select
          value={testId}
          onChange={(e) => setTestId(e.target.value)}
          disabled={isRunning}
          className="w-full bg-[var(--background)] border border-[var(--border)] rounded-md px-3 py-2 text-sm disabled:opacity-50"
        >
          {tests.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Agent</label>
        <select
          value={appId}
          onChange={(e) => setAppId(e.target.value)}
          disabled={isRunning}
          className="w-full bg-[var(--background)] border border-[var(--border)] rounded-md px-3 py-2 text-sm disabled:opacity-50"
        >
          {agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Rubric</label>
        <select
          value={rubricId}
          onChange={(e) => setRubricId(e.target.value)}
          disabled={isRunning}
          className="w-full bg-[var(--background)] border border-[var(--border)] rounded-md px-3 py-2 text-sm disabled:opacity-50"
        >
          {rubrics.map((r) => (
            <option key={r.id} value={r.id}>
              {r.title}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Model</label>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          disabled={isRunning}
          className="w-full bg-[var(--background)] border border-[var(--border)] rounded-md px-3 py-2 text-sm disabled:opacity-50"
        >
          <option value="sonnet">Sonnet (fast)</option>
          <option value="opus">Opus (thorough)</option>
          <option value="haiku">Haiku (fastest)</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={isRunning}
        className="w-full bg-[var(--accent-green-dark)] hover:bg-[var(--accent-green)] text-white font-medium py-2 px-4 rounded-md transition-colors disabled:opacity-50"
      >
        {isRunning ? "Running..." : "Start Evaluation"}
      </button>

      {/* Status feedback */}
      {job.phase === "running" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-[var(--accent-yellow)] bg-[var(--accent-yellow)]/10 border border-[var(--accent-yellow)]/30 rounded-md p-3">
            <span className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
            <span>
              {job.agentName} is working... ({job.elapsed}s)
            </span>
          </div>
          {job.log && (
            <pre className="text-xs font-mono text-[var(--muted)] bg-[var(--background)] border border-[var(--border)] rounded-md p-3 max-h-40 overflow-auto whitespace-pre-wrap">
              {job.log}
            </pre>
          )}
        </div>
      )}

      {job.phase === "completed" && (
        <div className="text-sm bg-[var(--accent-green)]/10 border border-[var(--accent-green)]/30 rounded-md p-3">
          <span className="text-[var(--accent-green)] font-medium">
            Evaluation complete!
          </span>{" "}
          <a
            href={`/runs/${job.runId}`}
            className="text-[#58A6FF] hover:underline"
          >
            View run &rarr;
          </a>
        </div>
      )}

      {job.phase === "failed" && (
        <div className="space-y-2">
          <div className="text-sm text-[var(--accent-red)] bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 rounded-md p-3">
            <span className="font-medium">Failed:</span> {job.error}
          </div>
          {job.log && (
            <pre className="text-xs font-mono text-[var(--muted)] bg-[var(--background)] border border-[var(--border)] rounded-md p-3 max-h-40 overflow-auto whitespace-pre-wrap">
              {job.log}
            </pre>
          )}
        </div>
      )}
    </form>
  );
}
