import { NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";

export async function GET() {
  const apps = await db.select().from(schema.apps);
  return NextResponse.json(apps);
}
