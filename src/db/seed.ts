import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as schema from "./schema";

const RUBRIC_CELLS: Record<string, string[]> = {
  accessibility: [
    "No ARIA labels, no keyboard nav, fails WCAG",
    "Some alt text, inconsistent focus management",
    "Passes WCAG AA, keyboard navigable",
    "Full WCAG AA, screen reader tested",
    "WCAG AAA, a11y tests in CI",
  ],
  performance: [
    "LCP > 6s, no code splitting",
    "LCP 4-6s, minimal optimization",
    "LCP 2.5-4s, basic lazy loading",
    "LCP < 2.5s, Core Web Vitals green",
    "Sub-second LCP, edge caching",
  ],
  architecture: [
    "God components, no separation of concerns",
    "Some breakdown, unclear boundaries",
    "Clear hierarchy, hooks for logic",
    "Atomic design, shared tokens",
    "Composable, tested library, documented APIs",
  ],
};

const CRITERIA_CONFIG = [
  {
    stableKey: "accessibility",
    name: "Accessibility",
    graderType: "model" as const,
  },
  {
    stableKey: "performance",
    name: "Performance",
    graderType: "automated" as const,
  },
  {
    stableKey: "architecture",
    name: "Architecture",
    graderType: "model" as const,
  },
];

const LEVEL_LABELS = ["1", "2", "3", "4", "5"];

export async function seed(db: PostgresJsDatabase<typeof schema>) {
  // Idempotency: check if rubric already exists
  const existing = await db
    .select()
    .from(schema.rubrics)
    .where(eq(schema.rubrics.title, "Frontend UX"));

  if (existing.length > 0) {
    await seedAgents(db);
    await seedTests(db);
    return;
  }

  // Create rubric
  const [rubric] = await db
    .insert(schema.rubrics)
    .values({
      title: "Frontend UX",
      description:
        "Evaluates frontend code quality across accessibility, performance, and architecture.",
      evalCategory: "capability",
      isTemplate: true,
      deltaThreshold: 1.0,
    })
    .returning();

  // Create version
  const [version] = await db
    .insert(schema.rubricVersions)
    .values({
      rubricId: rubric.id,
      version: 1,
      isCurrent: true,
    })
    .returning();

  // Create performance levels
  const levels = await db
    .insert(schema.performanceLevels)
    .values(
      LEVEL_LABELS.map((label, i) => ({
        versionId: version.id,
        label,
        sortOrder: i,
        numericValue: i + 1,
        isPassing: i >= 2, // 3, 4, 5 are passing
      })),
    )
    .returning();

  // Create criteria and cells
  for (let i = 0; i < CRITERIA_CONFIG.length; i++) {
    const config = CRITERIA_CONFIG[i];
    const [criterion] = await db
      .insert(schema.criteria)
      .values({
        versionId: version.id,
        stableKey: config.stableKey,
        name: config.name,
        sortOrder: i,
        weight: 1.0,
        graderType: config.graderType,
      })
      .returning();

    const cellDescriptions = RUBRIC_CELLS[config.stableKey];
    await db.insert(schema.rubricCells).values(
      levels.map((level, j) => ({
        criterionId: criterion.id,
        levelId: level.id,
        description: cellDescriptions[j],
      })),
    );
  }

  // Create agents
  await seedAgents(db);

  // Create smoke test
  await seedTests(db);
}

const AGENTS = [
  {
    name: "UI Engineer",
    description: "Frontend and UI specialist",
    agentPath: "ui-engineer",
  },
  {
    name: "Backend Architect",
    description: "Backend system architecture and API design",
    agentPath: "backend-architect",
  },
  {
    name: "Marketing SEO Expert",
    description: "Marketing strategy and SEO optimization",
    agentPath: "marketing-seo-expert",
  },
  {
    name: "Design Engineer",
    description: "Design engineer for frontend and UI tasks",
    agentPath: "design-engineer",
  },
];

async function seedAgents(db: PostgresJsDatabase<typeof schema>) {
  for (const agent of AGENTS) {
    const existing = await db
      .select()
      .from(schema.apps)
      .where(eq(schema.apps.name, agent.name));

    if (existing.length > 0) continue;

    await db.insert(schema.apps).values({
      name: agent.name,
      description: agent.description,
      appType: "agent",
      agentPath: agent.agentPath,
    });
  }
}

async function seedTests(db: PostgresJsDatabase<typeof schema>) {
  const existingTests = await db
    .select()
    .from(schema.tests)
    .where(eq(schema.tests.name, "Smoke Test"));

  if (existingTests.length > 0) return;

  await db.insert(schema.tests).values({
    name: "Smoke Test",
    description:
      "Create a single index.html file with a heading, a short paragraph, and a contact link. Use semantic HTML and basic accessibility (lang attribute, alt text if images).",
  });
}

// CLI entry point
if (process.argv[1]?.endsWith("seed.ts")) {
  (async () => {
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const postgres = (await import("postgres")).default;

    const client = postgres(process.env.DATABASE_URL!);
    const database = drizzle(client, { schema });

    await seed(database);
    console.log("Seeded successfully.");
    await client.end();
  })();
}
