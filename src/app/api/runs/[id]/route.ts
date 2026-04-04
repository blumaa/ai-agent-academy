import { NextResponse } from "next/server";
import { getRunWithScores } from "@/lib/scoring-engine";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const data = await getRunWithScores(id);

  if (!data) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}
