import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { signups } from "@/db/schema";
import { stripe } from "./billing";
import type { Plan } from "./signup";

/** Free first month: the card is saved now and first charged after this many days. */
export const TRIAL_DAYS = 30;

const appUrl = () => process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const priceOf = (plan: Plan) => (plan === "199" ? process.env.STRIPE_PRICE_KLARDAL_199 : process.env.STRIPE_PRICE_KLARDAL_149);

/** Card payments run automatically once Stripe and both monthly prices are set up in Render. */
export const isCardPaymentEnabled = () => !!process.env.STRIPE_SECRET_KEY && !!priceOf("149") && !!priceOf("199");

/** Stripe Checkout for a monthly subscription: card saved today, first charge after the free month. */
export async function createSignupCheckout(s: { id: number; company: string; email: string; plan: Plan }) {
  const price = priceOf(s.plan);
  if (!price) throw new Error("Stripe price id is not configured");
  const base = appUrl();
  const session = await stripe("/v1/checkout/sessions", {
    mode: "subscription",
    "line_items[0][price]": price,
    "line_items[0][quantity]": "1",
    "subscription_data[trial_period_days]": String(TRIAL_DAYS),
    "subscription_data[metadata][signupId]": String(s.id),
    payment_method_collection: "always",
    customer_email: s.email,
    client_reference_id: `signup-${s.id}`,
    "metadata[signupId]": String(s.id),
    "custom_text[submit][message]": `Første måned er gratis. Derefter trækkes ${s.plan} kr. automatisk hver måned, indtil I opsiger. Ingen binding.`,
    success_url: `${base}/tilmeld/tak`,
    cancel_url: `${base}/tilmeld/tak?betaling=afbrudt`,
    locale: "da",
  });
  return session.url as string;
}

/** Called from the Stripe webhook when the card is saved (checkout completed). */
export async function signupCardApproved(signupId: number, subscriptionId: string | null) {
  await db.update(signups).set({ paymentStatus: "godkendt", stripeSubscription: subscriptionId }).where(eq(signups.id, signupId));
}

/** Called from the Stripe webhook when a customer's subscription ends. Returns true if it was a sign-up. */
export async function signupSubscriptionEnded(subscriptionId: string) {
  const rows = await db.update(signups).set({ paymentStatus: "opsagt" }).where(eq(signups.stripeSubscription, subscriptionId)).returning({ id: signups.id });
  return rows.length > 0;
}
