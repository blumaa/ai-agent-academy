import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import * as schema from "./schema";
import { seed } from "./seed";

const connectionString = "postgresql://localhost:5432/aaanalytics";
const client = postgres(connectionString);
const db = drizzle(client, { schema });

describe("seed", () => {
  beforeAll(async () => {
    await seed(db);
  });

  afterAll(async () => {
    await client.end();
  });

  it("creates the Frontend UX rubric", async () => {
    const rubrics = await db
      .select()
      .from(schema.rubrics)
      .where(eq(schema.rubrics.title, "Frontend UX"));

    expect(rubrics).toHaveLength(1);
    expect(rubrics[0].evalCategory).toBe("capability");
    expect(rubrics[0].isTemplate).toBe(true);
    expect(rubrics[0].deltaThreshold).toBe(1.0);
  });

  it("creates a rubric version", async () => {
    const versions = await db.select().from(schema.rubricVersions);
    expect(versions.length).toBeGreaterThanOrEqual(1);
    expect(versions[0].version).toBe(1);
    expect(versions[0].isCurrent).toBe(true);
  });

  it("creates 5 performance levels (1-5)", async () => {
    const [rubric] = await db
      .select()
      .from(schema.rubrics)
      .where(eq(schema.rubrics.title, "Frontend UX"));
    const [version] = await db
      .select()
      .from(schema.rubricVersions)
      .where(eq(schema.rubricVersions.rubricId, rubric.id));

    const levels = await db
      .select()
      .from(schema.performanceLevels)
      .where(eq(schema.performanceLevels.versionId, version.id))
      .orderBy(schema.performanceLevels.sortOrder);

    expect(levels).toHaveLength(5);
    expect(levels[0].label).toBe("1");
    expect(levels[0].isPassing).toBe(false);
    expect(levels[4].label).toBe("5");
    expect(levels[4].isPassing).toBe(true);
  });

  it("creates 3 criteria (Accessibility, Performance, Architecture)", async () => {
    const [rubric] = await db
      .select()
      .from(schema.rubrics)
      .where(eq(schema.rubrics.title, "Frontend UX"));
    const [version] = await db
      .select()
      .from(schema.rubricVersions)
      .where(eq(schema.rubricVersions.rubricId, rubric.id));

    const allCriteria = await db
      .select()
      .from(schema.criteria)
      .where(eq(schema.criteria.versionId, version.id))
      .orderBy(schema.criteria.sortOrder);

    expect(allCriteria).toHaveLength(3);
    expect(allCriteria.map((c) => c.name)).toEqual([
      "Accessibility",
      "Performance",
      "Architecture",
    ]);
    expect(allCriteria.map((c) => c.stableKey)).toEqual([
      "accessibility",
      "performance",
      "architecture",
    ]);
  });

  it("creates 15 rubric cells (3 criteria x 5 levels)", async () => {
    const [rubric] = await db
      .select()
      .from(schema.rubrics)
      .where(eq(schema.rubrics.title, "Frontend UX"));
    const [version] = await db
      .select()
      .from(schema.rubricVersions)
      .where(eq(schema.rubricVersions.rubricId, rubric.id));

    const versionCriteria = await db
      .select()
      .from(schema.criteria)
      .where(eq(schema.criteria.versionId, version.id));
    const criterionIds = versionCriteria.map((c) => c.id);

    const allCells = await db.select().from(schema.rubricCells);
    const cells = allCells.filter((cell) =>
      criterionIds.includes(cell.criterionId),
    );

    expect(cells).toHaveLength(15);
    cells.forEach((cell) => {
      expect(cell.description).toBeTruthy();
    });
  });

  it("creates agent entries", async () => {
    const agents = await db
      .select()
      .from(schema.apps)
      .where(eq(schema.apps.appType, "agent"));

    expect(agents.length).toBeGreaterThanOrEqual(4);
    expect(agents.map((a) => a.name)).toContain("UI Engineer");
    expect(agents[0].agentPath).toBeTruthy();
  });

  it("seed is idempotent (running twice does not duplicate)", async () => {
    await seed(db);

    const rubrics = await db
      .select()
      .from(schema.rubrics)
      .where(eq(schema.rubrics.title, "Frontend UX"));

    expect(rubrics).toHaveLength(1);
  });
});
