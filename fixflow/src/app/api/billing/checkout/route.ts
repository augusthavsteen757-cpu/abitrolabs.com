import { da } from "@/i18n/dict/da";
import { NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import { requireApiUser } from "@/lib/auth";
import { handle, jsonError } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { resumePro, cancelPro, createStripeCheckout, fulfill, isStripeEnabled } from "@/lib/billing";

const schema = z.object({
  kind: z.enum(["PRO_MONTHLY", "SINGLE", "CANCEL", "RESUME"]),
  quoteId: z.string().max(64).nullish(),
  consent: z.boolean().optional(),
});

export const POST = handle(async (req: Request) => {
  const user = await requireApiUser();
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(da.errors.invalidPurchase);
  const { kind } = parsed.data;
  const quoteId = parsed.data.quoteId || null;

  if (kind === "CANCEL") {
    if (user.plan !== "PRO") return jsonError(da.errors.noPro);
    if (user.planEndsAt) return jsonError(da.errors.alreadyCancelled);
    await cancelPro(user);
    return NextResponse.json({ ok: true });
  }
  if (kind === "RESUME") {
    if (user.plan !== "PRO" || !user.planEndsAt) return jsonError(da.errors.notCancelled);
    await resumePro(user);
    return NextResponse.json({ ok: true });
  }
  if (kind === "PRO_MONTHLY" && user.plan === "PRO") return jsonError(da.errors.alreadyPro);
  // Forbrugeraftaleloven: explicit consent to immediate delivery before the purchase.
  if (parsed.data.consent !== true) return jsonError(da.errors.needConsent);
  await rateLimit(`checkout:${user.id}`, 20, 60 * 60);

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
    consentAt: new Date(),
  });
  return NextResponse.json({ ok: true, simulated: true });
});
