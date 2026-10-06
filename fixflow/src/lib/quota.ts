import "server-only";
import { and, eq, gt, sql } from "drizzle-orm";
import { db } from "@/db";
import { users, type User } from "@/db/schema";
import { currentPeriod, planLimit } from "./plans";

export type QuotaSource = "plan" | "credit";

/** Consumes one analysis: plan quota first, then extra credits. Returns null if none left. */
export async function consumeAnalysis(user: User): Promise<QuotaSource | null> {
  const limit = planLimit(user);
  const p = user.plan === "PRO" ? currentPeriod(user) : { periodStart: user.periodStart, periodUsed: user.periodUsed };

  if (p.periodUsed < limit) {
    // Optimistic check on the stored value guards against double-submits.
    const res = await db
      .update(users)
      .set({ periodStart: p.periodStart, periodUsed: p.periodUsed + 1 })
      .where(and(eq(users.id, user.id), eq(users.periodUsed, user.periodUsed)))
      .returning({ id: users.id });
    if (res.length) return "plan";
  }

  const res = await db
    .update(users)
    .set({ extraCredits: sql`${users.extraCredits} - 1` })
    .where(and(eq(users.id, user.id), gt(users.extraCredits, 0)))
    .returning({ id: users.id });
  return res.length ? "credit" : null;
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
