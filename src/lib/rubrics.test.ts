import { describe, it, expect } from "vitest";
import { rubrics } from "./rubrics.js";

describe("rubrics", () => {
  it("contains exactly 6 rubrics", () => {
    expect(rubrics).toHaveLength(6);
  });

  it("has unique slugs", () => {
    const slugs = rubrics.map((r) => r.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("uses kebab-case slugs", () => {
    for (const rubric of rubrics) {
      expect(rubric.slug).toMatch(/^[a-z][a-z0-9-]+$/);
    }
  });

  it("has non-empty titles", () => {
    for (const rubric of rubrics) {
      expect(rubric.title.length).toBeGreaterThan(0);
    }
  });

  it("has 4-5 criteria per rubric", () => {
    for (const rubric of rubrics) {
      expect(rubric.criteria.length).toBeGreaterThanOrEqual(4);
      expect(rubric.criteria.length).toBeLessThanOrEqual(5);
    }
  });

  it("has exactly 5 levels per criterion numbered 1-5", () => {
    for (const rubric of rubrics) {
      for (const criterion of rubric.criteria) {
        expect(criterion.levels).toHaveLength(5);
        const levelNumbers = criterion.levels.map((l) => l.level);
        expect(levelNumbers).toEqual([1, 2, 3, 4, 5]);
      }
    }
  });

  it("has non-empty descriptions for all levels", () => {
    for (const rubric of rubrics) {
      for (const criterion of rubric.criteria) {
        for (const level of criterion.levels) {
          expect(level.description.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it("has non-empty labels for all criteria", () => {
    for (const rubric of rubrics) {
      for (const criterion of rubric.criteria) {
        expect(criterion.label.length).toBeGreaterThan(0);
      }
    }
  });

  it("includes expected rubric slugs", () => {
    const slugs = rubrics.map((r) => r.slug);
    expect(slugs).toContain("bugs-correctness");
    expect(slugs).toContain("performance");
    expect(slugs).toContain("security");
    expect(slugs).toContain("ux-accessibility");
    expect(slugs).toContain("design-system");
    expect(slugs).toContain("dry-solid-ssot-kiss");
  });
});
