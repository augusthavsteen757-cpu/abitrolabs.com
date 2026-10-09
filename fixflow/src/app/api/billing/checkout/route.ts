import { da } from "@/i18n/dict/da";
import { NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import { requireApiUser } from "@/lib/auth";
import { handle, jsonError } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { resumePro, cancelPro, createStripeCheckout, fulfill, isStripeEnabled } from "@/lib/billing";
import { isDemoMode } from "@/lib/ai";
import { isBeta } from "@/lib/plans";
import { getDict } from "@/i18n/server";

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
  if (isBeta()) return jsonError(da.errors.paymentsOffline, 503);
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
  // The exact wording the customer saw and accepted (in their language) is kept as proof.
  const t = (await getDict()).checkout;
  const consentText = kind === "PRO_MONTHLY" ? t.consentPro : t.consentSingle;

  if (isStripeEnabled()) {
    // Never take real money while the app can only produce example analyses.
    if (isDemoMode()) return jsonError(da.errors.paymentsOffline, 503);
    const url = await createStripeCheckout(user, kind, quoteId, consentText);
    return NextResponse.json({ url });
  }

  // Test mode: simulate a successful payment right away – never in production unless explicitly allowed.
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_SIMULATED_PAYMENTS !== "1") {
    return jsonError(da.errors.paymentsOffline, 503);
  }
  await fulfill({
    userId: user.id,
    kind,
    provider: "simulated",
    reference: `sim_${randomBytes(8).toString("hex")}`,
    quoteId,
    consentAt: new Date(),
    consentText,
  });
  return NextResponse.json({ ok: true, simulated: true });
});
