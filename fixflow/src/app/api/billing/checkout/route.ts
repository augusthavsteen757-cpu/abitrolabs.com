import { NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import { requireApiUser } from "@/lib/auth";
import { handle, jsonError } from "@/lib/api";
import { cancelPro, createStripeCheckout, fulfill, isStripeEnabled } from "@/lib/billing";

const schema = z.object({
  kind: z.enum(["PRO_MONTHLY", "SINGLE", "CANCEL"]),
  quoteId: z.string().max(64).nullish(),
});

export const POST = handle(async (req: Request) => {
  const user = await requireApiUser();
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("Ugyldigt køb.");
  const { kind } = parsed.data;
  const quoteId = parsed.data.quoteId || null;

  if (kind === "CANCEL") {
    if (user.plan !== "PRO") return jsonError("Du har ikke et aktivt Pro-abonnement.");
    await cancelPro(user);
    return NextResponse.json({ ok: true });
  }
  if (kind === "PRO_MONTHLY" && user.plan === "PRO") return jsonError("Du har allerede Pro.");

  if (isStripeEnabled()) {
    const url = await createStripeCheckout(user, kind, quoteId);
    return NextResponse.json({ url });
  }

  // Test mode: simulate a successful payment right away.
  await fulfill({
    userId: user.id,
    kind,
    provider: "simulated",
    reference: `sim_${randomBytes(8).toString("hex")}`,
    quoteId,
  });
  return NextResponse.json({ ok: true, simulated: true });
});
