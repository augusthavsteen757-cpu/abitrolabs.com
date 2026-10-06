import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { payments, quotes, users, type User } from "@/db/schema";
import { PRO_PRICE_DKK, SINGLE_PRICE_DKK, currentPeriod } from "./plans";
import { spendCredit } from "./quota";

export type CheckoutKind = "PRO_MONTHLY" | "SINGLE";

export const isStripeEnabled = () => !!process.env.STRIPE_SECRET_KEY;

/** Grants what was bought. Called directly in simulated mode, or from the Stripe webhook. */
export async function fulfill(opts: {
  userId: string;
  kind: CheckoutKind;
  provider: "stripe" | "simulated";
  reference: string | null;
  quoteId?: string | null;
  consentAt?: Date | null;
}) {
  const { userId, kind, provider, reference, quoteId, consentAt } = opts;
  if (reference) {
    const dup = await db.query.payments.findFirst({ where: eq(payments.reference, reference) });
    if (dup) return; // idempotent for webhook retries
  }
  await db.insert(payments).values({
    userId,
    kind,
    provider,
    reference,
    consentAt: consentAt ?? null,
    amountDkk: kind === "PRO_MONTHLY" ? PRO_PRICE_DKK : SINGLE_PRICE_DKK,
  });

  if (kind === "PRO_MONTHLY") {
    // New Pro period starts now with a fresh quota. Free-plan usage does not carry over.
    await db.update(users).set({ plan: "PRO", planEndsAt: null, periodStart: new Date(), periodUsed: 0 }).where(eq(users.id, userId));
    await db.update(quotes).set({ unlocked: true }).where(eq(quotes.userId, userId));
    return;
  }

  await db
    .update(users)
    .set({ extraCredits: sql`${users.extraCredits} + 1` })
    .where(eq(users.id, userId));

  if (quoteId) {
    const quote = await db.query.quotes.findFirst({ where: and(eq(quotes.id, quoteId), eq(quotes.userId, userId)) });
    if (quote && quote.status === "DONE" && !quote.unlocked && (await spendCredit(userId))) {
      await db.update(quotes).set({ unlocked: true }).where(eq(quotes.id, quote.id));
    }
  }
}

/** Cancels Pro at the end of the current paid period (the customer keeps what they paid for). */
export async function cancelPro(user: User, opts: { immediately?: boolean } = {}) {
  if (isStripeEnabled()) {
    const last = await db.query.payments.findFirst({
      where: and(eq(payments.userId, user.id), eq(payments.kind, "PRO_MONTHLY"), eq(payments.provider, "stripe")),
      orderBy: [desc(payments.createdAt)],
    });
    if (last?.reference?.startsWith("sub_")) {
      if (opts.immediately) await stripe(`/v1/subscriptions/${last.reference}`, {}, "DELETE");
      else await stripe(`/v1/subscriptions/${last.reference}`, { cancel_at_period_end: "true" });
    }
  }
  if (opts.immediately) {
    await db.update(users).set({ plan: "FREE", planEndsAt: null, periodUsed: 1 }).where(eq(users.id, user.id));
    return;
  }
  const { periodEnd } = currentPeriod(user);
  await db.update(users).set({ planEndsAt: periodEnd }).where(eq(users.id, user.id));
}

/** Re-activates a cancelled Pro subscription before it runs out. */
export async function resumePro(user: User) {
  if (isStripeEnabled()) {
    const last = await db.query.payments.findFirst({
      where: and(eq(payments.userId, user.id), eq(payments.kind, "PRO_MONTHLY"), eq(payments.provider, "stripe")),
      orderBy: [desc(payments.createdAt)],
    });
    if (last?.reference?.startsWith("sub_")) {
      await stripe(`/v1/subscriptions/${last.reference}`, { cancel_at_period_end: "false" });
    }
  }
  await db.update(users).set({ planEndsAt: null }).where(eq(users.id, user.id));
}

/** Stripe told us the subscription has ended (after cancellation or failed payments). */
export async function subscriptionEnded(subscriptionId: string) {
  const pay = await db.query.payments.findFirst({ where: eq(payments.reference, subscriptionId) });
  if (!pay?.userId) return;
  await db.update(users).set({ plan: "FREE", planEndsAt: null, periodUsed: 1 }).where(eq(users.id, pay.userId));
}

/* ---------------------------- Stripe (REST) ---------------------------- */

async function stripe(path: string, params: Record<string, string>, method = "POST") {
  const res = await fetch(`https://api.stripe.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: method === "GET" ? undefined : new URLSearchParams(params).toString(),
  });
  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok) throw new Error(`Stripe error: ${JSON.stringify(json)}`);
  return json;
}

export async function createStripeCheckout(user: User, kind: CheckoutKind, quoteId: string | null) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const price = kind === "PRO_MONTHLY" ? process.env.STRIPE_PRICE_PRO_MONTHLY : process.env.STRIPE_PRICE_SINGLE;
  if (!price) throw new Error("Stripe price id is not configured");
  const back = quoteId ? `/dashboard/tilbud/${quoteId}` : "/dashboard/konto";
  const session = await stripe("/v1/checkout/sessions", {
    mode: kind === "PRO_MONTHLY" ? "subscription" : "payment",
    "line_items[0][price]": price,
    "line_items[0][quantity]": "1",
    customer_email: user.email,
    client_reference_id: user.id,
    "metadata[userId]": user.id,
    "metadata[kind]": kind,
    "metadata[quoteId]": quoteId ?? "",
    "metadata[consentAt]": new Date().toISOString(),
    success_url: `${appUrl}${back}?betalt=1`,
    cancel_url: `${appUrl}/dashboard/konto`,
    locale: "da",
  });
  return session.url as string;
}

/** Verifies the Stripe-Signature header (v1 HMAC-SHA256, 5 min tolerance). */
export function verifyStripeSignature(payload: string, header: string | null): boolean {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !header) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]));
  const t = Number(parts.t);
  if (!t || Math.abs(Date.now() / 1000 - t) > 300) return false;
  const expected = createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex");
  const sigs = header
    .split(",")
    .filter((p) => p.startsWith("v1="))
    .map((p) => p.slice(3));
  return sigs.some((s) => s.length === expected.length && timingSafeEqual(Buffer.from(s), Buffer.from(expected)));
}
