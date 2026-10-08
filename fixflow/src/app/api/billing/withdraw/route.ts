import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth";
import { handle, jsonError } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { withdrawPurchase } from "@/lib/billing";
import { da } from "@/i18n/dict/da";

export const runtime = "nodejs";

const schema = z.object({ paymentId: z.string().min(1).max(64) });

/** "Fortryd købet" – the in-app withdrawal function (forbrugeraftaleloven, CRD art. 11a). */
export const POST = handle(async (req: Request) => {
  const user = await requireApiUser();
  await rateLimit(`withdraw:${user.id}`, 10, 60 * 60);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(da.errors.invalidRequest);
  const result = await withdrawPurchase(user, parsed.data.paymentId);
  return NextResponse.json({ ok: true, ...result });
});
