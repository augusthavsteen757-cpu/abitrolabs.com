import { NextResponse } from "next/server";
import { db } from "@/db";
import { signups } from "@/db/schema";
import { handle } from "@/lib/api";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { COMPANY } from "@/lib/company";
import { sendEmail } from "@/lib/email";
import { signupSchema, signupSummary } from "@/lib/signup";

export const runtime = "nodejs";

/** "Ja tak" from /tilmeld: stores the signup and e-mails it to the owner. No account needed. */
export const POST = handle(async (req: Request) => {
  const parsed = signupSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message || "Tjek felterne og prøv igen." }, { status: 400 });
  }
  // Count only valid sign-ups, so a few typos never block the real "Ja".
  await rateLimit(`tilmeld:${await clientIp()}`, 5, 60 * 60);
  const s = parsed.data;
  const { firma, navn, telefon, email, pakke, accept: _accept, ...rest } = s;
  void _accept;
  await db.insert(signups).values({ company: firma, contactName: navn, phone: telefon, email, plan: pakke, details: JSON.stringify(rest) });
  const to = process.env.CALLBACK_EMAIL || COMPANY.email;
  if (to.includes("@")) {
    await sendEmail({ to, subject: `Ny kunde: ${firma} (${pakke} kr/md)`, text: `${firma} har sagt ja på klardal.com/tilmeld.\n\n${signupSummary(s)}` });
  }
  return NextResponse.json({ ok: true });
});
