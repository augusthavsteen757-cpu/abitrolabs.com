import { da } from "@/i18n/dict/da";
import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { checkPassword, setSessionCookie } from "@/lib/auth";
import { handle, jsonError } from "@/lib/api";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const schema = z.object({ email: z.string().trim().toLowerCase().max(200), password: z.string().max(200) });

export const POST = handle(async (req: Request) => {
  const ip = await clientIp();
  await rateLimit(`login-ip:${ip}`, 30, 15 * 60);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(da.errors.enterLogin);
  // Limit guesses per account too, so a single account can't be brute-forced from many IPs.
  // Per email *and* IP, so a stranger can't lock the owner out; plus a looser per-email cap against spraying.
  await rateLimit(`login-email-ip:${parsed.data.email}:${ip}`, 10, 15 * 60);
  await rateLimit(`login-email:${parsed.data.email}`, 50, 15 * 60);

  const user = await db.query.users.findFirst({ where: eq(users.email, parsed.data.email) });
  const ok = await checkPassword(parsed.data.password, user?.passwordHash);
  if (!user || !ok) return jsonError(da.errors.wrongLogin, 401);
  await setSessionCookie(user);
  return NextResponse.json({ ok: true });
});
