import "server-only";
import { and, eq, gt, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { users, type User } from "@/db/schema";
import { currentPeriod, planLimit } from "./plans";

export type QuotaSource = "plan" | "credit";

/**
 * Consumes one analysis: plan quota first, then extra credits. Returns null if none left.
 * Each step is a single conditional UPDATE, so parallel uploads can never over- or under-charge.
 */
export async function consumeAnalysis(user: User): Promise<QuotaSource | null> {
  const limit = planLimit(user);

  if (user.plan === "PRO") {
    // Roll an expired Pro period over first – guarded on the old start, so only one request does it.
    const p = currentPeriod(user);
    if (p.periodStart.getTime() !== user.periodStart.getTime()) {
      await db
        .update(users)
        .set({ periodStart: p.periodStart, periodUsed: 0 })
        .where(and(eq(users.id, user.id), eq(users.periodStart, user.periodStart)));
    }
  }

  const plan = await db
    .update(users)
    .set({ periodUsed: sql`${users.periodUsed} + 1` })
    .where(and(eq(users.id, user.id), lt(users.periodUsed, limit)))
    .returning({ id: users.id });
  if (plan.length) return "plan";

  const credit = await db
    .update(users)
    .set({ extraCredits: sql`${users.extraCredits} - 1` })
    .where(and(eq(users.id, user.id), gt(users.extraCredits, 0)))
    .returning({ id: users.id });
  return credit.length ? "credit" : null;
}

export async function refundAnalysis(userId: string, source: QuotaSource) {
  if (source === "plan") {
    await db
      .update(users)
      .set({ periodUsed: sql`max(0, ${users.periodUsed} - 1)` })
      .where(eq(users.id, userId));
  } else {
    await db
      .update(users)
      .set({ extraCredits: sql`${users.extraCredits} + 1` })
      .where(eq(users.id, userId));
  }
}

export async function spendCredit(userId: string): Promise<boolean> {
  const res = await db
    .update(users)
    .set({ extraCredits: sql`${users.extraCredits} - 1` })
    .where(and(eq(users.id, userId), gt(users.extraCredits, 0)))
    .returning({ id: users.id });
  return res.length > 0;
}
