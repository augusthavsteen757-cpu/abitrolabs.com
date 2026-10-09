import { NextResponse } from "next/server";
import {
  fulfill,
  subscriptionEnded,
  subscriptionRenewed,
  verifyStripeSignature,
  type CheckoutKind,
} from "@/lib/billing";

export const runtime = "nodejs";

type StripeObject = {
  id: string;
  subscription?: string | null;
  payment_intent?: string | null;
  billing_reason?: string | null;
  payment_status?: string | null;
  metadata?: Record<string, string>;
  parent?: { subscription_details?: { subscription?: string | null } | null } | null;
};
type StripeEvent = { type: string; data: { object: StripeObject } };

export async function POST(req: Request) {
  const payload = await req.text();
  if (!verifyStripeSignature(payload, req.headers.get("stripe-signature"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }
  const event = JSON.parse(payload) as StripeEvent;
  const o = event.data.object;
  if (event.type === "checkout.session.completed") {
    const kind = o.metadata?.kind as CheckoutKind | undefined;
    const userId = o.metadata?.userId;
    // Delayed payment methods complete the session before the money arrives – only grant when paid.
    const paid = o.payment_status === "paid" || o.payment_status === "no_payment_required";
    if (userId && paid && (kind === "PRO_MONTHLY" || kind === "SINGLE")) {
      await fulfill({
        userId,
        kind,
        provider: "stripe",
        reference: o.subscription || o.id,
        paymentIntent: o.payment_intent ?? null,
        quoteId: o.metadata?.quoteId || null,
        consentAt: o.metadata?.consentAt ? new Date(o.metadata.consentAt) : null,
        consentText: o.metadata?.consentText || null,
      });
    }
  }
  if (event.type === "invoice.paid" && o.billing_reason === "subscription_cycle") {
    const sub = o.subscription ?? o.parent?.subscription_details?.subscription ?? null;
    if (sub) await subscriptionRenewed(sub, o.id, o.payment_intent ?? null);
  }
  if (event.type === "customer.subscription.deleted") {
    await subscriptionEnded(o.id);
  }
  return NextResponse.json({ received: true });
}
