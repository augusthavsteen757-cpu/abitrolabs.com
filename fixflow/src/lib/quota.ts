import "server-only";
import { and, eq, gt, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { users, type User } from "@/db/schema";
import { currentPeriod, isBeta, planLimit } from "./plans";

export type QuotaSource = "plan" | "gift" | "credit";

/**
 * Consumes one analysis. Free users with partner-code (gift) or bought credits use those first, so they get the
 * full analysis; otherwise the plan quota (free half-shown analyses, or Pro), then credits. Returns null if none left. Gift credits go before bought ones, so a bought analysis stays unused – and refundable – for longer.
 * Each step is a single conditional UPDATE, so parallel uploads can never over- or under-charge.
 */
export async function consumeAnalysis(user: User): Promise<QuotaSource | null> {
  const limit = planLimit(user);

  if (user.plan === "PRO" && !isBeta()) {
    // Roll an expired Pro period over first – guarded on the old start, so only one request does it.
    const p = currentPeriod(user);
    if (p.periodStart.getTime() !== user.periodStart.getTime()) {
      await db
        .update(users)
        .set({ periodStart: p.periodStart, periodUsed: 0 })
        .where(and(eq(users.id, user.id), eq(users.periodStart, user.periodStart)));
    }
  }

  // Someone who has bought analyses (or got them from a partner code) gets a full analysis, not the free half.
  if (!isBeta() && user.plan !== "PRO") {
    const credit = await takeCredit(user.id);
    if (credit) return credit;
  }

  const plan = await db
    .update(users)
    .set({ periodUsed: sql`${users.periodUsed} + 1` })
    .where(and(eq(users.id, user.id), lt(users.periodUsed, limit)))
    .returning({ id: users.id });
  if (plan.length) return "plan";
  if (isBeta()) return null; // no extra purchases in the beta – the cap is the cap

  return takeCredit(user.id);
}

/** Takes one gift credit, or else one bought credit. Each step is a single conditional UPDATE. */
async function takeCredit(userId: string): Promise<"gift" | "credit" | null> {
  const gift = await db
    .update(users)
    .set({ giftCredits: sql`${users.giftCredits} - 1` })
    .where(and(eq(users.id, userId), gt(users.giftCredits, 0)))
    .returning({ id: users.id });
  if (gift.length) return "gift";
  const credit = await db
    .update(users)
    .set({ extraCredits: sql`${users.extraCredits} - 1` })
    .where(and(eq(users.id, userId), gt(users.extraCredits, 0)))
    .returning({ id: users.id });
  return credit.length ? "credit" : null;
}

export async function refundAnalysis(userId: string, source: QuotaSource) {
  if (source === "plan") {
    await db
      .update(users)
      .set({ periodUsed: sql`max(0, ${users.periodUsed} - 1)` })
      .where(eq(users.id, userId));
  } else if (source === "gift") {
    await db
      .update(users)
      .set({ giftCredits: sql`${users.giftCredits} + 1` })
      .where(eq(users.id, userId));
  } else {
    await db
      .update(users)
      .set({ extraCredits: sql`${users.extraCredits} + 1` })
      .where(eq(users.id, userId));
  }
}

/** Spends one credit (gift first) to unlock an already analysed quote. */
export async function spendCredit(userId: string): Promise<boolean> {
  return (await takeCredit(userId)) !== null;
}
