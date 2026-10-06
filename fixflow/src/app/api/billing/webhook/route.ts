import { NextResponse } from "next/server";
import { fulfill, verifyStripeSignature, type CheckoutKind } from "@/lib/billing";

export const runtime = "nodejs";

type StripeEvent = {
  type: string;
  data: { object: { id: string; subscription?: string | null; metadata?: Record<string, string> } };
};

export async function POST(req: Request) {
  const payload = await req.text();
  if (!verifyStripeSignature(payload, req.headers.get("stripe-signature"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }
  const event = JSON.parse(payload) as StripeEvent;
  if (event.type === "checkout.session.completed") {
    const s = event.data.object;
    const kind = s.metadata?.kind as CheckoutKind | undefined;
    const userId = s.metadata?.userId;
    if (userId && (kind === "PRO_MONTHLY" || kind === "SINGLE")) {
      await fulfill({
        userId,
        kind,
        provider: "stripe",
        reference: s.subscription || s.id,
        quoteId: s.metadata?.quoteId || null,
      });
    }
  }
  return NextResponse.json({ received: true });
}
