import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { payments, quotes, users, type User } from "@/db/schema";
import { PRO_PRICE_DKK, SINGLE_PRICE_DKK, currentPeriod } from "./plans";
import { spendCredit } from "./quota";
import { COMPANY, WITHDRAWAL_DAYS } from "./company";
import { sendEmail } from "./email";
import { HttpError } from "./auth";
import { da } from "@/i18n/dict/da";

const DAY = 24 * 60 * 60 * 1000;
const appUrl = () => process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

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
  consentText?: string | null;
  paymentIntent?: string | null;
}) {
  const { userId, kind, provider, reference, quoteId, consentAt } = opts;
  if (reference) {
    const dup = await db.query.payments.findFirst({ where: eq(payments.reference, reference) });
    if (dup) return; // idempotent for webhook retries
  }
  const [payment] = await db
    .insert(payments)
    .values({
      userId,
      kind,
      provider,
      reference,
      consentAt: consentAt ?? null,
      consentText: opts.consentText ?? null,
      paymentIntent: opts.paymentIntent ?? null,
      amountDkk: kind === "PRO_MONTHLY" ? PRO_PRICE_DKK : SINGLE_PRICE_DKK,
    })
    .returning();
  await sendOrderConfirmation(userId, payment);

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
      if (opts.immediately) {
        await stripe(`/v1/subscriptions/${last.reference}`, {}, "DELETE");
      } else {
        const sub = await stripe(`/v1/subscriptions/${last.reference}`, { cancel_at_period_end: "true" });
        // Pro runs until the end of the period the customer paid for at Stripe.
        const end = stripePeriodEnd(sub);
        if (end) {
          await db.update(users).set({ planEndsAt: end }).where(eq(users.id, user.id));
          return;
        }
      }
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

/** A Pro subscription renewed (Stripe invoice.paid with billing_reason subscription_cycle). */
export async function subscriptionRenewed(subscriptionId: string, invoiceId: string, paymentIntent: string | null) {
  const first = await db.query.payments.findFirst({ where: eq(payments.reference, subscriptionId) });
  if (!first?.userId) return;
  const dup = await db.query.payments.findFirst({ where: eq(payments.reference, invoiceId) });
  if (dup) return;
  const [payment] = await db
    .insert(payments)
    .values({
      userId: first.userId,
      kind: "PRO_MONTHLY",
      provider: "stripe",
      reference: invoiceId,
      paymentIntent,
      renewal: true,
      amountDkk: PRO_PRICE_DKK,
    })
    .returning();
  await db.update(users).set({ plan: "PRO", periodStart: new Date(), periodUsed: 0 }).where(eq(users.id, first.userId));
  await sendOrderConfirmation(first.userId, payment);
}

/* ---------------------- Right of withdrawal (fortrydelsesret) ---------------------- */

type Payment = typeof payments.$inferSelect;

/**
 * Single purchases whose credit is still unused. Credits are interchangeable, so the newest purchases count as
 * the unused ones (the customer has spent the oldest first).
 */
export function unusedSinglePurchases(user: User, all: Payment[]): Set<string> {
  const singles = all
    .filter((p) => p.kind === "SINGLE" && !p.refundedAt)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return new Set(singles.slice(0, Math.max(0, user.extraCredits)).map((p) => p.id));
}

/** What the customer gets back if they withdraw now, in øre – or why they can't. */
export function withdrawalQuote(
  p: Payment,
  unusedSingles: Set<string>,
  now = Date.now(),
): { refundOere: number } | { reason: keyof typeof da.errors } {
  if (p.refundedAt) return { reason: "withdrawDone" };
  if (p.renewal || now - p.createdAt.getTime() > WITHDRAWAL_DAYS * DAY) return { reason: "withdrawExpired" };
  const paid = p.amountDkk * 100;
  if (p.kind === "SINGLE") {
    if (!unusedSingles.has(p.id)) return { reason: "withdrawUsed" };
    return { refundOere: paid };
  }
  // Pro: the customer pays for each started day they have had it (30-day month).
  const daysUsed = Math.max(1, Math.ceil((now - p.createdAt.getTime()) / DAY));
  return { refundOere: Math.max(0, paid - Math.round((paid * daysUsed) / 30)) };
}

export async function withdrawPurchase(user: User, paymentId: string) {
  const p = await db.query.payments.findFirst({ where: and(eq(payments.id, paymentId), eq(payments.userId, user.id)) });
  if (!p) throw new HttpError(404, da.errors.withdrawNotFound);
  const all = await db.query.payments.findMany({ where: eq(payments.userId, user.id) });
  const q = withdrawalQuote(p, unusedSinglePurchases(user, all));
  if ("reason" in q) throw new HttpError(400, da.errors[q.reason]);

  let refundedAutomatically = p.provider === "simulated";
  if (p.provider === "stripe" && q.refundOere > 0) {
    const intent = p.paymentIntent ?? (p.reference?.startsWith("sub_") ? await firstInvoicePaymentIntent(p.reference) : null);
    if (intent) {
      await stripe("/v1/refunds", { payment_intent: intent, amount: String(q.refundOere) });
      refundedAutomatically = true;
    }
  }

  if (p.kind === "SINGLE") {
    await db.update(users).set({ extraCredits: sql`max(0, ${users.extraCredits} - 1)` }).where(eq(users.id, user.id));
  } else {
    await cancelPro(user, { immediately: true });
  }
  await db.update(payments).set({ refundedAt: new Date(), refundedOere: q.refundOere }).where(eq(payments.id, p.id));

  const amount = (q.refundOere / 100).toFixed(2).replace(".", ",");
  await sendEmail({
    to: user.email,
    toName: user.name,
    subject: `Bekræftelse: du har fortrudt dit køb hos ${COMPANY.name}`,
    text: [
      `Hej ${user.name}`,
      "",
      `Vi har modtaget, at du fortryder dit køb (${p.kind === "PRO_MONTHLY" ? "Pro – 1 måned" : "Engangskøb – 1 analyse"}) af ${p.createdAt.toLocaleDateString("da-DK")}.`,
      `Du får ${amount} kr. tilbage på det betalingsmiddel, du brugte, senest 14 dage fra i dag.`,
      p.kind === "PRO_MONTHLY" ? "Pro er stoppet med det samme." : "",
    ].join("\n"),
  });
  if (!refundedAutomatically) {
    // No Stripe reference to refund automatically – the owner must refund by hand within 14 days.
    await sendEmail({
      to: COMPANY.email,
      subject: `Manuel tilbagebetaling: ${amount} kr. (betaling ${p.id})`,
      text: `Kunden ${user.id} har fortrudt betaling ${p.id} (${p.reference}). Tilbagebetal ${amount} kr. senest om 14 dage.`,
    });
  }
  return { refundOere: q.refundOere };
}

async function firstInvoicePaymentIntent(subscriptionId: string): Promise<string | null> {
  try {
    const list = (await stripe(`/v1/invoices?subscription=${subscriptionId}&limit=1`, {}, "GET")) as { data?: { payment_intent?: string | null }[] };
    return list.data?.[0]?.payment_intent ?? null;
  } catch {
    return null;
  }
}

/* ---------------------------- Order confirmation ---------------------------- */

/** Order confirmation on a durable medium (forbrugeraftaleloven § 17), incl. the consent the customer gave. */
async function sendOrderConfirmation(userId: string, p: Payment) {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) return;
  const pro = p.kind === "PRO_MONTHLY";
  const product = pro ? "Budsyn Pro – 1 måned" : "Budsyn engangskøb – 1 komplet analyse";
  const lines = [
    `Hej ${user.name}`,
    "",
    p.renewal ? "Dit Pro-abonnement er fornyet. Her er din kvittering." : "Tak for dit køb. Her er din ordrebekræftelse.",
    "",
    `Produkt: ${product}`,
    `Pris: ${p.amountDkk} kr. inkl. moms (heraf moms ${((p.amountDkk * 0.2)).toFixed(2).replace(".", ",")} kr.)`,
    `Dato: ${p.createdAt.toLocaleString("da-DK", { timeZone: "Europe/Copenhagen" })}`,
    `Ordrenummer: ${p.id}`,
  ];
  if (pro) lines.push("", "Pro fornyes automatisk hver måned til 49 kr. inkl. moms, indtil du opsiger. Du kan opsige når som helst på din kontoside.");
  if (!p.renewal) {
    lines.push(
      "",
      "Dit samtykke:",
      `»${p.consentText ?? (pro ? da.checkout.consentPro : da.checkout.consentSingle)}«`,
      p.consentAt ? `Givet ${p.consentAt.toLocaleString("da-DK", { timeZone: "Europe/Copenhagen" })}.` : "",
      "",
      "Fortrydelsesret:",
      pro
        ? `Du kan fortryde inden for ${WITHDRAWAL_DAYS} dage fra i dag. Du betaler da for de dage, du har haft Pro, og får resten tilbage.`
        : `Du kan fortryde inden for ${WITHDRAWAL_DAYS} dage, så længe du ikke har brugt købet. Når analysen er leveret (du har brugt købet), har du ingen fortrydelsesret.`,
      `Fortryd på ${appUrl()}/dashboard/konto, eller skriv til ${COMPANY.email}. Du kan bruge standardfortrydelsesformularen i handelsbetingelserne, men det er ikke et krav.`,
      "",
      `Handelsbetingelser: ${appUrl()}/handelsbetingelser`,
      `Privatlivspolitik: ${appUrl()}/privatlivspolitik`,
    );
  }
  await sendEmail({
    to: user.email,
    toName: user.name,
    subject: p.renewal ? `Kvittering: Budsyn Pro er fornyet` : `Ordrebekræftelse: ${product}`,
    text: lines.join("\n"),
  });
}

/* ---------------------------- Stripe (REST) ---------------------------- */

function stripePeriodEnd(sub: Record<string, unknown>): Date | null {
  const items = sub.items as { data?: { current_period_end?: number }[] } | undefined;
  const end = (sub.current_period_end as number | undefined) ?? items?.data?.[0]?.current_period_end;
  return end ? new Date(end * 1000) : null;
}

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

export async function createStripeCheckout(user: User, kind: CheckoutKind, quoteId: string | null, consentText: string) {
  const base = appUrl();
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
    "metadata[consentText]": consentText.slice(0, 500),
    "custom_text[submit][message]":
      kind === "PRO_MONTHLY"
        ? `Du forpligter dig til at betale ${PRO_PRICE_DKK} kr. inkl. moms pr. måned, indtil du opsiger.`
        : `Du forpligter dig til at betale ${SINGLE_PRICE_DKK} kr. inkl. moms.`,
    success_url: `${base}${back}?betalt=1`,
    cancel_url: `${base}/dashboard/konto`,
    locale: "auto",
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
