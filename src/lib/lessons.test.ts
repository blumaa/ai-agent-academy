import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  type LessonEntry,
  type LessonsStore,
  FileLessonsStore,
  InMemoryLessonsStore,
  compileLessons,
} from "./lessons.js";

function makeEntry(overrides: Partial<LessonEntry> = {}): LessonEntry {
  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    rubric: "bugs-correctness",
    passed: true,
    scores: [
      { criterion: "Error handling", score: 4, reasoning: "Good" },
    ],
    failures: [],
    lesson: "Always validate inputs at the boundary.",
    ...overrides,
  };
}

describe("compileLessons", () => {
  it("returns empty state for no entries", () => {
    const result = compileLessons([]);
    expect(result.total_runs).toBe(0);
    expect(result.last_run).toBeNull();
    expect(result.pass_rate).toBe(0);
    expect(result.chronic_failures).toHaveLength(0);
    expect(result.recent_lessons).toHaveLength(0);
  });

  it("calculates pass rate", () => {
    const entries = [
      makeEntry({ passed: true }),
      makeEntry({ passed: false }),
      makeEntry({ passed: true }),
      makeEntry({ passed: true }),
    ];
    const result = compileLessons(entries);
    expect(result.pass_rate).toBe(0.75);
  });

  it("identifies chronic failures (failed >= 2 times)", () => {
    const entries = [
      makeEntry({
        passed: false,
        failures: [
          { criterion: "Type safety", score: 2, current_level: "Bad", next_level: "Use strict types" },
        ],
      }),
      makeEntry({
        passed: false,
        failures: [
          { criterion: "Type safety", score: 1, current_level: "Terrible", next_level: "Some types" },
        ],
      }),
      makeEntry({
        passed: false,
        failures: [
          { criterion: "Edge cases", score: 2, current_level: "Missing", next_level: "Cover basics" },
        ],
      }),
    ];
    const result = compileLessons(entries);
    expect(result.chronic_failures).toHaveLength(1);
    expect(result.chronic_failures[0]!.criterion).toBe("Type safety");
    expect(result.chronic_failures[0]!.fail_count).toBe(2);
  });

  it("collects recent lessons from last 5 entries", () => {
    const entries = Array.from({ length: 7 }, (_, i) =>
      makeEntry({ lesson: `Lesson ${i}`, timestamp: new Date(2026, 0, i + 1).toISOString() })
    );
    const result = compileLessons(entries);
    expect(result.recent_lessons).toHaveLength(5);
    expect(result.recent_lessons[0]).toBe("Lesson 6");
  });

  it("tracks last_run timestamp", () => {
    const entries = [
      makeEntry({ timestamp: "2026-01-01T00:00:00Z" }),
      makeEntry({ timestamp: "2026-05-14T12:00:00Z" }),
      makeEntry({ timestamp: "2026-03-01T00:00:00Z" }),
    ];
    const result = compileLessons(entries);
    expect(result.last_run).toBe("2026-05-14T12:00:00Z");
  });
});

describe("InMemoryLessonsStore", () => {
  let store: LessonsStore;

  beforeEach(() => {
    store = new InMemoryLessonsStore();
  });

  it("returns empty compiled result for unknown project", async () => {
    const result = await store.compile("unknown-project");
    expect(result.total_runs).toBe(0);
  });

  it("round-trips append and compile", async () => {
    const entry = makeEntry({ lesson: "Always check nulls" });
    await store.append("my-app", entry);
    const result = await store.compile("my-app");
    expect(result.total_runs).toBe(1);
    expect(result.recent_lessons).toContain("Always check nulls");
  });

  it("isolates projects from each other", async () => {
    await store.append("app-a", makeEntry({ lesson: "Lesson A" }));
    await store.append("app-b", makeEntry({ lesson: "Lesson B" }));
    const resultA = await store.compile("app-a");
    const resultB = await store.compile("app-b");
    expect(resultA.total_runs).toBe(1);
    expect(resultB.total_runs).toBe(1);
    expect(resultA.recent_lessons).toContain("Lesson A");
    expect(resultB.recent_lessons).toContain("Lesson B");
  });
});

describe("FileLessonsStore", () => {
  let tmpDir: string;
  let store: FileLessonsStore;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "aaa-lessons-"));
    store = new FileLessonsStore(tmpDir);
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("returns empty compiled result for nonexistent file", async () => {
    const result = await store.compile("no-such-project");
    expect(result.total_runs).toBe(0);
  });

  it("round-trips append and compile", async () => {
    const entry = makeEntry({ lesson: "Validate at boundaries" });
    await store.append("my-app", entry);
    const result = await store.compile("my-app");
    expect(result.total_runs).toBe(1);
    expect(result.recent_lessons).toContain("Validate at boundaries");
  });

  it("appends multiple entries to the same project", async () => {
    await store.append("my-app", makeEntry({ lesson: "First" }));
    await store.append("my-app", makeEntry({ lesson: "Second" }));
    const result = await store.compile("my-app");
    expect(result.total_runs).toBe(2);
  });

  it("rejects project IDs with path traversal", async () => {
    await expect(store.append("../etc", makeEntry())).rejects.toThrow();
  });
});
