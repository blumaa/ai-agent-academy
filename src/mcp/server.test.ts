import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "./server.js";
import { InMemoryLessonsStore } from "../lib/lessons.js";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf-8"));

let client: Client;
let cleanup: () => Promise<void>;
const lessonsStore = new InMemoryLessonsStore();

beforeAll(async () => {
  const server = createServer(lessonsStore);
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  await server.connect(serverTransport);
  client = new Client({ name: "test-client", version: "1.0.0" });
  await client.connect(clientTransport);

  cleanup = async () => {
    await client.close();
    await server.close();
  };
});

afterAll(async () => {
  await cleanup();
});

describe("health_check", () => {
  it("returns server name, version, rubric count, and status ok", async () => {
    const result = await client.callTool({ name: "health_check", arguments: {} });
    const data = JSON.parse((result.content as Array<{ text: string }>)[0]!.text);
    expect(data.status).toBe("ok");
    expect(data.server).toBe("ai-agent-academy");
    expect(data.version).toBe(pkg.version);
    expect(data.rubrics_loaded).toBe(6);
  });
});

describe("list_rubrics", () => {
  it("returns 6 rubrics", async () => {
    const result = await client.callTool({ name: "list_rubrics", arguments: {} });
    const data = JSON.parse((result.content as Array<{ text: string }>)[0]!.text);
    expect(data.rubrics).toHaveLength(6);
  });

  it("includes slug, title, criteria_count, and criteria_names", async () => {
    const result = await client.callTool({ name: "list_rubrics", arguments: {} });
    const data = JSON.parse((result.content as Array<{ text: string }>)[0]!.text);
    const first = data.rubrics[0];
    expect(first).toHaveProperty("slug");
    expect(first).toHaveProperty("title");
    expect(first).toHaveProperty("criteria_count");
    expect(first).toHaveProperty("criteria_names");
    expect(first.criteria_names.length).toBe(first.criteria_count);
  });
});

describe("get_rubric", () => {
  it("returns full rubric data for valid slug", async () => {
    const result = await client.callTool({
      name: "get_rubric",
      arguments: { slug: "bugs-correctness" },
    });
    const data = JSON.parse((result.content as Array<{ text: string }>)[0]!.text);
    expect(data.slug).toBe("bugs-correctness");
    expect(data.title).toBe("Bugs & Correctness");
    expect(data.criteria).toHaveLength(4);
    expect(data.criteria[0].levels).toHaveLength(5);
  });

  it("returns error for invalid slug", async () => {
    const result = await client.callTool({
      name: "get_rubric",
      arguments: { slug: "nonexistent" },
    });
    expect(result.isError).toBe(true);
  });
});

describe("run_specs", () => {
  it("returns PASS report when all scores >= 3", async () => {
    const result = await client.callTool({
      name: "run_specs",
      arguments: {
        rubric: "bugs-correctness",
        scores: [
          { criterion: "Error handling", score: 4, reasoning: "Good" },
          { criterion: "State management", score: 3, reasoning: "OK" },
          { criterion: "Edge cases", score: 5, reasoning: "Great" },
          { criterion: "Type safety", score: 3, reasoning: "OK" },
        ],
      },
    });
    const data = JSON.parse((result.content as Array<{ text: string }>)[0]!.text);
    expect(data.passed).toBe(true);
    expect(data.failures).toHaveLength(0);
    expect(data.display).toContain("PASS");
    expect(data.display).toContain("✓");
  });

  it("returns FAIL report with failure details when scores < 3", async () => {
    const result = await client.callTool({
      name: "run_specs",
      arguments: {
        rubric: "bugs-correctness",
        scores: [
          { criterion: "Error handling", score: 4, reasoning: "Good" },
          { criterion: "State management", score: 2, reasoning: "Bad" },
          { criterion: "Edge cases", score: 3, reasoning: "OK" },
          { criterion: "Type safety", score: 1, reasoning: "Terrible" },
        ],
      },
    });
    const data = JSON.parse((result.content as Array<{ text: string }>)[0]!.text);
    expect(data.passed).toBe(false);
    expect(data.failures).toHaveLength(2);
    expect(data.display).toContain("FAIL");
    expect(data.display).toContain("✗");
    expect(data.failures[0].criterion).toBe("State management");
    expect(data.failures[0]).toHaveProperty("current_level");
    expect(data.failures[0]).toHaveProperty("next_level");
  });

  it("returns error for unknown rubric", async () => {
    const result = await client.callTool({
      name: "run_specs",
      arguments: {
        rubric: "nonexistent",
        scores: [{ criterion: "X", score: 3, reasoning: "Y" }],
      },
    });
    expect(result.isError).toBe(true);
  });

  it("returns error for missing criteria", async () => {
    const result = await client.callTool({
      name: "run_specs",
      arguments: {
        rubric: "bugs-correctness",
        scores: [{ criterion: "Error handling", score: 3, reasoning: "OK" }],
      },
    });
    expect(result.isError).toBe(true);
  });

  it("returns error for invalid score", async () => {
    const result = await client.callTool({
      name: "run_specs",
      arguments: {
        rubric: "bugs-correctness",
        scores: [
          { criterion: "Error handling", score: 6, reasoning: "Invalid" },
          { criterion: "State management", score: 3, reasoning: "OK" },
          { criterion: "Edge cases", score: 3, reasoning: "OK" },
          { criterion: "Type safety", score: 3, reasoning: "OK" },
        ],
      },
    });
    expect(result.isError).toBe(true);
  });
});

describe("save_lesson", () => {
  it("saves a lesson and returns entry id", async () => {
    const result = await client.callTool({
      name: "save_lesson",
      arguments: {
        project_id: "test-project",
        rubric: "bugs-correctness",
        passed: true,
        scores: [
          { criterion: "Error handling", score: 4, reasoning: "Good" },
        ],
        failures: [],
        lesson: "Always validate inputs at system boundaries.",
      },
    });
    const data = JSON.parse((result.content as Array<{ text: string }>)[0]!.text);
    expect(data.saved).toBe(true);
    expect(data.entry_id).toBeDefined();
  });
});

describe("get_lessons", () => {
  it("returns compiled lessons for a project with history", async () => {
    const result = await client.callTool({
      name: "get_lessons",
      arguments: { project_id: "test-project" },
    });
    const data = JSON.parse((result.content as Array<{ text: string }>)[0]!.text);
    expect(data.total_runs).toBeGreaterThanOrEqual(1);
    expect(data.recent_lessons).toContain("Always validate inputs at system boundaries.");
  });

  it("returns empty state for unknown project", async () => {
    const result = await client.callTool({
      name: "get_lessons",
      arguments: { project_id: "no-such-project" },
    });
    const data = JSON.parse((result.content as Array<{ text: string }>)[0]!.text);
    expect(data.total_runs).toBe(0);
    expect(data.recent_lessons).toHaveLength(0);
  });
});
