import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { analysisReports } from "@/db/schema";
import { requireApiUser } from "@/lib/auth";
import { handle, jsonError } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { getQuote } from "@/lib/quotes";
import { sendEmail } from "@/lib/email";
import { COMPANY } from "@/lib/company";
import { da } from "@/i18n/dict/da";

export const runtime = "nodejs";

const schema = z.object({ message: z.string().trim().min(3).max(2000) });

/** "Rapportér fejl i analysen": a person reviews AI output that a user says is wrong. */
export const POST = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const user = await requireApiUser();
  await rateLimit(`report:${user.id}`, 10, 60 * 60);
  const quote = await getQuote(user.id, id);
  if (!quote) return jsonError(da.errors.quoteNotFound, 404);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(da.errors.topicShort);

  await db.insert(analysisReports).values({ quoteId: quote.id, message: parsed.data.message });
  console.warn(JSON.stringify({ event: "analysis_report", quoteId: quote.id, model: quote.aiModel }));
  const appUrl = process.env.APP_URL || "";
  await sendEmail({
    to: COMPANY.email,
    subject: `Klardal: en bruger har rapporteret en fejl i en analyse`,
    text: `Tilbud ${quote.id} (${quote.title ?? quote.fileName}), model ${quote.aiModel ?? "ukendt"}.\n\nBrugerens besked:\n${parsed.data.message}\n\n${appUrl}`,
  });
  return NextResponse.json({ ok: true });
});
