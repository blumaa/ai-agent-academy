import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { CompareView } from "./compare-view";
import type { RunMetrics, ROIResult } from "@/lib/roi";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const baseline: RunMetrics = {
  avgScore: 2.3,
  agentTokens: 15000,
  scoringTokens: 500,
  criterionScores: { accessibility: 2, performance: 3 },
};

const improved: RunMetrics = {
  avgScore: 4.1,
  agentTokens: 9000,
  scoringTokens: 600,
  criterionScores: { accessibility: 4, performance: 4 },
};

const roi: ROIResult = {
  qualityDelta: 1.8,
  qualityImprovedPercent: 78.3,
  agentTokensSaved: 6000,
  agentTokensSavedPercent: 40,
  totalScoringCost: 1100,
  netTokensSaved: 4900,
  criterionDeltas: { accessibility: 2, performance: 1 },
  rubricPaidForItself: true,
};

function renderWithComparison() {
  return render(
    <CompareView
      runs={[
        { id: "1", label: "Run 1" },
        { id: "2", label: "Run 2" },
      ]}
      baselineId="1"
      improvedId="2"
      comparison={{ baseline, improved, roi }}
    />,
  );
}

describe("CompareView", () => {
  it("renders the proof chart with both bar groups", () => {
    const { container } = renderWithComparison();

    expect(container.querySelector("[data-testid='chart-group-0']")).toBeTruthy();
    expect(container.querySelector("[data-testid='chart-group-1']")).toBeTruthy();
    expect(container.querySelector("[data-testid='quality-bar-0']")).toBeTruthy();
    expect(container.querySelector("[data-testid='quality-bar-1']")).toBeTruthy();
    expect(container.querySelector("[data-testid='token-bar-0']")).toBeTruthy();
    expect(container.querySelector("[data-testid='token-bar-1']")).toBeTruthy();
  });

  it("renders improved quality bar taller than baseline", () => {
    const { container } = renderWithComparison();

    const baselineBar = container.querySelector("[data-testid='quality-bar-0']")!;
    const improvedBar = container.querySelector("[data-testid='quality-bar-1']")!;
    const baselineY = Number(baselineBar.getAttribute("y"));
    const improvedY = Number(improvedBar.getAttribute("y"));
    // Higher quality = taller bar = lower SVG y coordinate
    expect(improvedY).toBeLessThan(baselineY);
  });

  it("renders improved token bar shorter than baseline", () => {
    const { container } = renderWithComparison();

    const baselineBar = container.querySelector("[data-testid='token-bar-0']")!;
    const improvedBar = container.querySelector("[data-testid='token-bar-1']")!;
    const baselineH = Number(baselineBar.getAttribute("height"));
    const improvedH = Number(improvedBar.getAttribute("height"));
    // Fewer tokens = shorter bar
    expect(improvedH).toBeLessThan(baselineH);
  });

  it("does not render chart when no comparison data", () => {
    const { container } = render(
      <CompareView
        runs={[{ id: "1", label: "Run 1" }]}
        comparison={null}
      />,
    );

    expect(container.querySelector("[data-testid='chart-group-0']")).toBeNull();
  });
});
