import { da } from "@/i18n/dict/da";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser, setSessionCookie } from "@/lib/auth";
import { handle, jsonError } from "@/lib/api";
import { createGuest } from "@/lib/guest";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { track } from "@/lib/events";

const schema = z.object({ acceptTerms: z.literal(true) });

/** Starts a check without an account (see lib/guest.ts). Already signed in (guest or not): nothing new is made. */
export const POST = handle(async (req: Request) => {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(da.errors.acceptTerms);
  if (await getCurrentUser()) return NextResponse.json({ ok: true });
  // Each guest gets a free AI analysis, so creating them is limited per IP and in total per day.
  await rateLimit(`guest:${await clientIp()}`, 5, 24 * 60 * 60);
  await rateLimit("guest-all", 300, 24 * 60 * 60);
  const user = await createGuest();
  await setSessionCookie(user);
  await track("guest_started");
  return NextResponse.json({ ok: true });
});
