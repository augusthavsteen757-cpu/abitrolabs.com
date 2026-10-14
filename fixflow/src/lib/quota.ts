import "server-only";
import { and, eq, gt, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { users, type User } from "@/db/schema";
import { FREE_BASIC_PER_MONTH, currentPeriod, isBeta, monthKey, planLimit } from "./plans";

/** plan: the trial or Pro quota · free: the monthly free basic analysis · gift: partner code · credit: bought. */
export type QuotaSource = "plan" | "free" | "gift" | "credit";

/**
 * Consumes one analysis. Returns null if none left. Each step is a single conditional UPDATE, so parallel uploads
 * can never over- or under-charge.
 * - Trial and Pro: the plan quota first, then partner-code (gift) analyses, then bought ones.
 * - Free (after the trial): partner-code and bought analyses first – they give the full report, which is what the
 *   user got them for – and only then the free basic analysis of the month. Gift goes before bought, so a bought
 *   analysis stays unused – and refundable – for longer.
 */
export async function consumeAnalysis(user: User): Promise<QuotaSource | null> {
  if (!isBeta() && user.plan !== "PRO") return (await takeCredit(user.id)) ?? (await takeFreeBasic(user.id));
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

  const plan = await db
    .update(users)
    .set({ periodUsed: sql`${users.periodUsed} + 1` })
    .where(and(eq(users.id, user.id), lt(users.periodUsed, limit)))
    .returning({ id: users.id });
  if (plan.length) return "plan";
  if (isBeta()) return null; // no extra purchases in the beta – the cap is the cap

  return takeCredit(user.id);
}

/** Takes this month's free basic analysis: the counter starts again at 0 in a new month. */
async function takeFreeBasic(userId: string): Promise<"free" | null> {
  const month = monthKey();
  const row = await db
    .update(users)
    .set({
      freeUsed: sql`CASE WHEN ${users.freeMonth} = ${month} THEN coalesce(${users.freeUsed}, 0) + 1 ELSE 1 END`,
      freeMonth: month,
    })
    .where(and(eq(users.id, userId), sql`(${users.freeMonth} IS NOT ${month} OR coalesce(${users.freeUsed}, 0) < ${FREE_BASIC_PER_MONTH})`))
    .returning({ id: users.id });
  return row.length ? "free" : null;
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
  } else if (source === "free") {
    // Only this month's counter; a failed analysis from last month doesn't need giving back.
    await db
      .update(users)
      .set({ freeUsed: sql`max(0, coalesce(${users.freeUsed}, 0) - 1)` })
      .where(and(eq(users.id, userId), eq(users.freeMonth, monthKey())));
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
