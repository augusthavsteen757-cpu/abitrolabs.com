import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { clearSessionCookie, requireApiUser } from "@/lib/auth";
import { handle } from "@/lib/api";

export const POST = handle(async () => {
  const user = await requireApiUser();
  await db.update(users).set({ sessionVersion: sql`${users.sessionVersion} + 1` }).where(eq(users.id, user.id));
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
});
