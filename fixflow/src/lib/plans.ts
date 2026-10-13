import type { User } from "@/db/schema";

export const PRO_PRICE_DKK = 49;
export const SINGLE_PRICE_DKK = 49;
/** 3-pakke: three complete analyses for people who get several quotes for the same job. */
export const PACK3_PRICE_DKK = 99;
export const PACK3_CREDITS = 3;
export const PRO_ANALYSES_PER_PERIOD = 10;
export const FREE_ANALYSES_TOTAL = 1;
export const PERIOD_DAYS = 30;

/** Free beta: everyone gets the full analysis, a fixed number of analyses per person, and nothing can be bought. */
export const isBeta = () => process.env.BETA_FREE === "1";
/** Last day of the free trial period (inclusive), shown everywhere the trial is mentioned. */
export const BETA_END_DATE = process.env.BETA_END_DATE || "2026-10-19";
/** "19. oktober 2026" in the reader's language. */
export function betaEndText(intlLocale: string) {
  return new Date(`${BETA_END_DATE}T12:00:00Z`).toLocaleDateString(intlLocale, { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Copenhagen" });
}
export const BETA_ANALYSES_TOTAL = Number.parseInt(process.env.BETA_ANALYSES ?? "", 10) || 5;


const PERIOD_MS = PERIOD_DAYS * 24 * 60 * 60 * 1000;

/** Returns the current period values, rolled forward if the 30-day period has expired. */
export function currentPeriod(user: Pick<User, "periodStart" | "periodUsed">, now = new Date()) {
  let start = user.periodStart;
  let used = user.periodUsed;
  if (now.getTime() - start.getTime() >= PERIOD_MS) {
    const periods = Math.floor((now.getTime() - start.getTime()) / PERIOD_MS);
    start = new Date(start.getTime() + periods * PERIOD_MS);
    used = 0;
  }
  return { periodStart: start, periodUsed: used, periodEnd: new Date(start.getTime() + PERIOD_MS) };
}

/** In the beta everyone has the same deal (no Pro, no periods, no extra purchases). */
export function planLimit(user: Pick<User, "plan">) {
  if (isBeta()) return BETA_ANALYSES_TOTAL;
  if (user.plan === "PRO") return PRO_ANALYSES_PER_PERIOD;
  return FREE_ANALYSES_TOTAL;
}

export type Usage = {
  plan: "FREE" | "PRO";
  used: number;
  limit: number;
  planRemaining: number;
  credits: number;
  remaining: number;
  periodEnd: Date | null;
};

/**
 * Free users: 1 analysis in total (periodUsed is never reset for them).
 * Pro users: 10 per rolling 30-day period. Extra credits come on top.
 */
export function getUsage(user: User, now = new Date()): Usage {
  const limit = planLimit(user);
  if (isBeta()) {
    // A plan or credits left over from before the beta (e.g. test purchases) don't apply.
    const remaining = Math.max(0, limit - user.periodUsed);
    return { plan: "FREE", used: Math.min(user.periodUsed, limit), limit, planRemaining: remaining, credits: 0, remaining, periodEnd: null };
  }
  const p = user.plan === "PRO" ? currentPeriod(user, now) : { periodUsed: user.periodUsed, periodEnd: null };
  const planRemaining = Math.max(0, limit - p.periodUsed);
  return {
    plan: user.plan,
    used: p.periodUsed,
    limit,
    planRemaining,
    credits: user.extraCredits + user.giftCredits,
    remaining: planRemaining + user.extraCredits + user.giftCredits,
    periodEnd: p.periodEnd,
  };
}

/** Pro (and the beta) compares any analysed quotes; others can compare quotes they have unlocked, if they have two. */
export function canCompare(user: Pick<User, "plan">, unlockedQuotes = 0) {
  return isBeta() || user.plan === "PRO" || unlockedQuotes >= 2;
}

export function hasFullAccess(user: Pick<User, "plan">, quote: { unlocked: boolean }) {
  return isBeta() || user.plan === "PRO" || quote.unlocked;
}
