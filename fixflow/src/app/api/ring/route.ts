import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { callbackRequests } from "@/db/schema";
import { handle } from "@/lib/api";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { COMPANY } from "@/lib/company";
import { sendEmail } from "@/lib/email";
import { CALLBACK_KEEP_DAYS, normalizePhone } from "@/lib/callback";
import { lt } from "drizzle-orm";

export const runtime = "nodejs";

const schema = z.object({
  telefon: z.string().max(40),
  firma: z.string().max(120).optional().default(""),
});

/** "Ring mig op" from the landing page: stores the number and e-mails it to the owner. No account needed. */
export const POST = handle(async (req: Request) => {
  await rateLimit(`ring:${await clientIp()}`, 5, 60 * 60);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  const phone = parsed.success ? normalizePhone(parsed.data.telefon) : null;
  if (!parsed.success || !phone) {
    return NextResponse.json({ ok: false, error: "Skriv et dansk telefonnummer med 8 cifre." }, { status: 400 });
  }
  const company = parsed.data.firma.replace(/[\r\n\t]+/g, " ").trim().slice(0, 120) || null;
  await db.insert(callbackRequests).values({ phone, company });
  // Keeps the promise in the privacy policy: old requests disappear by themselves.
  await db.delete(callbackRequests).where(lt(callbackRequests.createdAt, new Date(Date.now() - CALLBACK_KEEP_DAYS * 86_400_000)));
  const to = process.env.CALLBACK_EMAIL || COMPANY.email;
  if (to.includes("@")) {
    await sendEmail({
      to,
      subject: `Ring op: ${phone}${company ? ` (${company})` : ""}`,
      text: `Nyt ønske om et gratis AI-tjek fra klardal.com.\n\nTelefon: ${phone}\nFirma: ${company ?? "ikke oplyst"}\nTidspunkt: ${new Date().toLocaleString("da-DK", { timeZone: "Europe/Copenhagen" })}`,
    });
  }
  return NextResponse.json({ ok: true });
});
