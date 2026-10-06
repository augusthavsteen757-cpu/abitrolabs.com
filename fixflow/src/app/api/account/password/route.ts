import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { checkPassword, hashPassword, passwordProblem, requireApiUser, setSessionCookie } from "@/lib/auth";
import { handle, jsonError } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({ current: z.string().max(200), next: z.string().max(200) });

export const POST = handle(async (req: Request) => {
  const user = await requireApiUser();
  await rateLimit(`pw:${user.id}`, 5, 15 * 60);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("Udfyld begge felter.");
  if (!(await checkPassword(parsed.data.current, user.passwordHash))) return jsonError("Den nuværende adgangskode er forkert.", 401);
  const problem = passwordProblem(parsed.data.next, user.email);
  if (problem) return jsonError(problem);
  // New hash + bumped session version logs out every other device.
  const [updated] = await db
    .update(users)
    .set({ passwordHash: await hashPassword(parsed.data.next), sessionVersion: sql`${users.sessionVersion} + 1` })
    .where(eq(users.id, user.id))
    .returning();
  await setSessionCookie(updated);
  return NextResponse.json({ ok: true });
});
