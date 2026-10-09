import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { clearSessionCookie, getCurrentUser } from "@/lib/auth";

export async function POST() {
  // Bumping sessionVersion invalidates the token everywhere it might have been copied.
  const user = await getCurrentUser().catch(() => null);
  if (user) {
    await db.update(users).set({ sessionVersion: sql`${users.sessionVersion} + 1` }).where(eq(users.id, user.id)).catch(() => undefined);
  }
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
