import { da } from "@/i18n/dict/da";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth";
import { handle, jsonError } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { redeemCode } from "@/lib/codes";
import { isGuest } from "@/lib/guest";

const schema = z.object({ code: z.string().trim().min(1).max(64) });

/** Redeem a partner code: POST { code }. */
export const POST = handle(async (req: Request) => {
  const user = await requireApiUser();
  // Gift analyses would be lost when an unclaimed guest is deleted.
  if (isGuest(user)) return jsonError(da.errors.guestNeedsAccount, 403);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(da.errors.codeInvalid);
  // Guessing codes must be slow: 10 tries per hour per account.
  await rateLimit(`code:${user.id}`, 10, 60 * 60);
  const { credits } = await redeemCode(user, parsed.data.code);
  return NextResponse.json({ ok: true, credits });
});
