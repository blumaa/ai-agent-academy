import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { join, resolve, basename } from "node:path";
import type { FailureDetail, ScoreInput } from "./evaluator.js";

export type LessonEntry = {
  id: string;
  timestamp: string;
  rubric: string;
  passed: boolean;
  scores: ScoreInput[];
  failures: FailureDetail[];
  lesson: string;
};

export type CompiledLessons = {
  total_runs: number;
  last_run: string | null;
  pass_rate: number;
  chronic_failures: Array<{
    criterion: string;
    fail_count: number;
    last_score: number;
    next_level: string;
  }>;
  recent_lessons: string[];
};

const RECENT_LESSON_COUNT = 5;
const CHRONIC_THRESHOLD = 2;

export function compileLessons(entries: LessonEntry[]): CompiledLessons {
  if (entries.length === 0) {
    return {
      total_runs: 0,
      last_run: null,
      pass_rate: 0,
      chronic_failures: [],
      recent_lessons: [],
    };
  }

  const sorted = [...entries].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const passCount = sorted.filter((e) => e.passed).length;

  const failureCounts = new Map<string, { count: number; lastScore: number; nextLevel: string }>();
  for (const entry of sorted) {
    for (const f of entry.failures) {
      const existing = failureCounts.get(f.criterion);
      failureCounts.set(f.criterion, {
        count: (existing?.count ?? 0) + 1,
        lastScore: f.score,
        nextLevel: f.next_level,
      });
    }
  }

  const chronic = Array.from(failureCounts.entries())
    .filter(([, v]) => v.count >= CHRONIC_THRESHOLD)
    .map(([criterion, v]) => ({
      criterion,
      fail_count: v.count,
      last_score: v.lastScore,
      next_level: v.nextLevel,
    }));

  const recentLessons = sorted
    .filter((e) => e.lesson)
    .slice(-RECENT_LESSON_COUNT)
    .reverse()
    .map((e) => e.lesson);

  return {
    total_runs: entries.length,
    last_run: sorted[sorted.length - 1]!.timestamp,
    pass_rate: passCount / entries.length,
    chronic_failures: chronic,
    recent_lessons: recentLessons,
  };
}

export interface LessonsStore {
  append(projectId: string, entry: LessonEntry): Promise<void>;
  compile(projectId: string): Promise<CompiledLessons>;
}

export class InMemoryLessonsStore implements LessonsStore {
  private data = new Map<string, LessonEntry[]>();

  async append(projectId: string, entry: LessonEntry): Promise<void> {
    const entries = this.data.get(projectId) ?? [];
    entries.push(entry);
    this.data.set(projectId, entries);
  }

  async compile(projectId: string): Promise<CompiledLessons> {
    return compileLessons(this.data.get(projectId) ?? []);
  }
}

function validateProjectId(projectId: string): void {
  if (
    !projectId ||
    projectId.includes("..") ||
    projectId.includes("/") ||
    projectId.includes("\\") ||
    basename(projectId) !== projectId
  ) {
    throw new Error(`Invalid project ID: "${projectId}"`);
  }
}

export class FileLessonsStore implements LessonsStore {
  constructor(private readonly dataDir: string) {}

  private filePath(projectId: string): string {
    validateProjectId(projectId);
    return resolve(join(this.dataDir, `${projectId}.json`));
  }

  private async load(projectId: string): Promise<LessonEntry[]> {
    try {
      const raw = await readFile(this.filePath(projectId), "utf-8");
      const parsed = JSON.parse(raw);
      return parsed.entries ?? [];
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw err;
    }
  }

  async append(projectId: string, entry: LessonEntry): Promise<void> {
    const entries = await this.load(projectId);
    entries.push(entry);

    const filePath = this.filePath(projectId);
    await mkdir(this.dataDir, { recursive: true });

    const tmpPath = `${filePath}.tmp`;
    await writeFile(tmpPath, JSON.stringify({ project_id: projectId, entries }, null, 2));
    await rename(tmpPath, filePath);
  }

  async compile(projectId: string): Promise<CompiledLessons> {
    return compileLessons(await this.load(projectId));
  }
}
