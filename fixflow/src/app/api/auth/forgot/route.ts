import { NextResponse } from "next/server";
import { z } from "zod";
import { createHash, randomBytes } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { passwordResets, users } from "@/db/schema";
import { handle } from "@/lib/api";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { isEmailEnabled, sendEmail } from "@/lib/email";

const schema = z.object({ email: z.string().trim().toLowerCase().email().max(200) });

/** Sends a reset link. Always answers the same way, so nobody can find out which e-mails have an account. */
export const POST = handle(async (req: Request) => {
  await rateLimit(`forgot-ip:${await clientIp()}`, 10, 60 * 60);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (parsed.success) {
    await rateLimit(`forgot-email:${parsed.data.email}`, 3, 60 * 60);
    // Never build the link from the request's Host header in production: an attacker could point it at their own site.
    const base = process.env.APP_URL || (process.env.NODE_ENV === "production" ? null : new URL(req.url).origin);
    if (!base) console.error(JSON.stringify({ event: "app_url_missing", hint: "Set APP_URL so password reset e-mails can be sent" }));
    const user = await db.query.users.findFirst({ where: eq(users.email, parsed.data.email) });
    if (user && base && isEmailEnabled()) {
      const token = randomBytes(32).toString("base64url");
      await db.insert(passwordResets).values({
        tokenHash: createHash("sha256").update(token).digest("hex"),
        userId: user.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });
      const url = `${base}/nulstil?token=${token}`;
      // Not awaited: the answer must take the same time whether or not the e-mail has an account.
      void sendEmail({
        to: user.email,
        toName: user.name || undefined,
        subject: "Nulstil din adgangskode til Klardal",
        text: `Hej${user.name ? ` ${user.name}` : ""}\n\nDu (eller en anden) har bedt om at nulstille adgangskoden til din Klardal-konto.\n\nVælg en ny adgangskode her (linket virker i 1 time og kan kun bruges én gang):\n${url}\n\nHar du ikke bedt om det, kan du se bort fra denne mail – din adgangskode er uændret.`,
      }).catch((e) => console.error(JSON.stringify({ event: "reset_email_failed", error: String(e) })));
    }
  }
  return NextResponse.json({ ok: true, emailEnabled: isEmailEnabled() });
});
