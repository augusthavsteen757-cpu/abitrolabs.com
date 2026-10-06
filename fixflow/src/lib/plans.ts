import type { User } from "@/db/schema";

export const PRO_PRICE_DKK = 49;
export const SINGLE_PRICE_DKK = 99;
export const PRO_ANALYSES_PER_PERIOD = 10;
export const FREE_ANALYSES_TOTAL = 1;
export const PERIOD_DAYS = 30;
export const FREE_QUESTION_LIMIT = 3;

export const PLANS = {
  FREE: {
    name: "Gratis",
    price: 0,
    priceLabel: "0 kr.",
    period: "",
    tagline: "Se hvad der er galt med dit tilbud.",
    features: [
      "1 tilbud gennemgået",
      "Tilbudsscore og kort forklaring",
      "Se hvilke røde flag der er – det første forklaret",
      "Detaljer, ekstraudgifter og spørgsmål er låst",
    ],
  },
  PRO: {
    name: "Pro",
    price: PRO_PRICE_DKK,
    priceLabel: `${PRO_PRICE_DKK} kr.`,
    period: "/md.",
    tagline: "Til dig, der indhenter flere tilbud.",
    features: [
      `${PRO_ANALYSES_PER_PERIOD} analyser pr. måned`,
      "Sammenlign op til 4 tilbud side om side",
      "Alle spørgsmål til håndværkeren",
      "Skriv beskeder til håndværkeren med ét klik",
      "Historik over alle dine tilbud",
      "Opsig når som helst",
    ],
  },
  SINGLE: {
    name: "Engangskøb",
    price: SINGLE_PRICE_DKK,
    priceLabel: `${SINGLE_PRICE_DKK} kr.`,
    period: "",
    tagline: "Én komplet analyse – uden abonnement.",
    features: [
      "Lås hele analysen op for ét tilbud",
      "Mulige ekstraudgifter i kroner",
      "Alle røde flag forklaret og alle spørgsmål",
      "Færdige beskeder til håndværkeren",
    ],
  },
} as const;

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

export function planLimit(user: Pick<User, "plan">) {
  return user.plan === "PRO" ? PRO_ANALYSES_PER_PERIOD : FREE_ANALYSES_TOTAL;
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
  const p = user.plan === "PRO" ? currentPeriod(user, now) : { periodUsed: user.periodUsed, periodEnd: null };
  const planRemaining = Math.max(0, limit - p.periodUsed);
  return {
    plan: user.plan,
    used: p.periodUsed,
    limit,
    planRemaining,
    credits: user.extraCredits,
    remaining: planRemaining + user.extraCredits,
    periodEnd: p.periodEnd,
  };
}

export function canCompare(user: Pick<User, "plan">) {
  return user.plan === "PRO";
}

export function hasFullAccess(user: Pick<User, "plan">, quote: { unlocked: boolean }) {
  return user.plan === "PRO" || quote.unlocked;
}
