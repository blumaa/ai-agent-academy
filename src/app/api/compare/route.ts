import { NextResponse } from "next/server";
import { getRunMetrics } from "@/lib/run-metrics";
import { calculateROI } from "@/lib/roi";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const baselineId = searchParams.get("baseline");
  const improvedId = searchParams.get("improved");

  if (!baselineId || !improvedId) {
    return NextResponse.json(
      { error: "baseline and improved query params are required" },
      { status: 400 },
    );
  }

  const [baseline, improved] = await Promise.all([
    getRunMetrics(baselineId),
    getRunMetrics(improvedId),
  ]);

  if (!baseline || !improved) {
    return NextResponse.json(
      { error: "One or both runs not found" },
      { status: 404 },
    );
  }

  const roi = calculateROI(baseline, improved);

  return NextResponse.json({
    baseline,
    improved,
    roi,
  });
}
