import { NextResponse } from "next/server";
import { z } from "zod";
import { createHash } from "crypto";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { passwordResets, users } from "@/db/schema";
import { handle, jsonError } from "@/lib/api";
import { hashPassword, passwordProblem } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { da } from "@/i18n/dict/da";

const schema = z.object({ token: z.string().min(20).max(200), password: z.string().max(200) });

export const POST = handle(async (req: Request) => {
  await rateLimit(`reset-ip:${await clientIp()}`, 20, 60 * 60);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(da.errors.resetInvalid);
  const tokenHash = createHash("sha256").update(parsed.data.token).digest("hex");
  // Single use: claim the token atomically before changing anything.
  const [reset] = await db
    .update(passwordResets)
    .set({ usedAt: new Date() })
    .where(and(eq(passwordResets.tokenHash, tokenHash), isNull(passwordResets.usedAt), gt(passwordResets.expiresAt, new Date())))
    .returning();
  if (!reset) return jsonError(da.errors.resetInvalid);
  const user = await db.query.users.findFirst({ where: eq(users.id, reset.userId) });
  if (!user) return jsonError(da.errors.resetInvalid);
  const problem = passwordProblem(parsed.data.password, user.email);
  if (problem) {
    // Let the user try again with the same link.
    await db.update(passwordResets).set({ usedAt: null }).where(eq(passwordResets.tokenHash, tokenHash));
    return jsonError(problem);
  }
  await db
    .update(users)
    .set({ passwordHash: await hashPassword(parsed.data.password), sessionVersion: sql`${users.sessionVersion} + 1` })
    .where(eq(users.id, user.id));
  return NextResponse.json({ ok: true });
});
