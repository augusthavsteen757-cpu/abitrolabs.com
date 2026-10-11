/**
 * Pure purchase rules (no database), shared by the billing code and the unit tests.
 */
import type { Payment, User } from "@/db/schema";
import type { da } from "@/i18n/dict/da";
import { PACK3_CREDITS, PACK3_PRICE_DKK, PRO_PRICE_DKK, SINGLE_PRICE_DKK } from "./plans";
import { WITHDRAWAL_DAYS } from "./company";

const DAY = 24 * 60 * 60 * 1000;

export type CheckoutKind = "PRO_MONTHLY" | "SINGLE" | "PACK3";

export const PRICE_DKK: Record<CheckoutKind, number> = { PRO_MONTHLY: PRO_PRICE_DKK, SINGLE: SINGLE_PRICE_DKK, PACK3: PACK3_PRICE_DKK };
/** Analyses a one-off purchase adds to the account. */
export const CREDITS_OF: Record<Exclude<CheckoutKind, "PRO_MONTHLY">, number> = { SINGLE: 1, PACK3: PACK3_CREDITS };

/**
 * How many analyses of each one-off purchase (engangskøb, 3-pakke) are still unused, by payment id.
 * Bought credits are interchangeable, so the newest purchases count as the unused ones (the customer has spent the
 * oldest first). Gift credits from partner codes are kept apart and never count here.
 */
export function unusedPurchases(user: Pick<User, "extraCredits">, all: Payment[]): Map<string, number> {
  const bought = all
    .filter((p) => (p.kind === "SINGLE" || p.kind === "PACK3") && !p.refundedAt)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const out = new Map<string, number>();
  let left = Math.max(0, user.extraCredits);
  for (const p of bought) {
    const n = Math.min(left, CREDITS_OF[p.kind as "SINGLE" | "PACK3"]);
    if (n > 0) out.set(p.id, n);
    left -= n;
  }
  return out;
}

/** What the customer gets back if they withdraw now, in øre – or why they can't. */
export function withdrawalQuote(
  p: Payment,
  unused: Map<string, number>,
  now = Date.now(),
): { refundOere: number; credits?: number } | { reason: keyof typeof da.errors } {
  if (p.refundedAt) return { reason: "withdrawDone" };
  if (p.renewal || now - p.createdAt.getTime() > WITHDRAWAL_DAYS * DAY) return { reason: "withdrawExpired" };
  const paid = p.amountDkk * 100;
  if (p.kind === "SINGLE" || p.kind === "PACK3") {
    // Each analysis is delivered when it is used; the unused ones can still be withdrawn (pro rata for a pack).
    const credits = unused.get(p.id) ?? 0;
    if (credits === 0) return { reason: "withdrawUsed" };
    return { refundOere: Math.round((paid * credits) / CREDITS_OF[p.kind]), credits };
  }
  // Pro: the customer pays for each started day they have had it (30-day month).
  const daysUsed = Math.max(1, Math.ceil((now - p.createdAt.getTime()) / DAY));
  return { refundOere: Math.max(0, paid - Math.round((paid * daysUsed) / 30)) };
}
