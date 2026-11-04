import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { callbackRequests } from "@/db/schema";
import { handle } from "@/lib/api";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { COMPANY } from "@/lib/company";
import { sendEmail } from "@/lib/email";
import { normalizePhone } from "@/lib/callback";

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
  const to = process.env.CALLBACK_EMAIL || COMPANY.email;
  if (to.includes("@")) {
    await sendEmail({
      to,
      subject: `Ring op: ${phone}${company ? ` (${company})` : ""}`,
      text: `Nyt ønske om en gratis prøve fra klardal.com.\n\nTelefon: ${phone}\nFirma: ${company ?? "ikke oplyst"}\nTidspunkt: ${new Date().toLocaleString("da-DK", { timeZone: "Europe/Copenhagen" })}`,
    });
  }
  return NextResponse.json({ ok: true });
});
