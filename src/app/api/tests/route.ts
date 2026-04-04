import { NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";

export async function GET() {
  const tests = await db.select().from(schema.tests);
  return NextResponse.json(tests);
}

export async function POST(request: Request) {
  const body = await request.json();

  const [test] = await db
    .insert(schema.tests)
    .values({
      name: body.name,
      description: body.description,
    })
    .returning();

  return NextResponse.json(test, { status: 201 });
}
