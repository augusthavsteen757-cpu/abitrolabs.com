import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { isAiMissing } from "@/lib/ai";

export const dynamic = "force-dynamic";

/** Used by the hosting platform to check that the app and database are up. */
export async function GET() {
  try {
    await db.run(sql`select 1`);
    // Without an AI key the site can't do its job – report unhealthy so it is noticed immediately.
    if (isAiMissing()) return NextResponse.json({ ok: false, ai: false }, { status: 503 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
