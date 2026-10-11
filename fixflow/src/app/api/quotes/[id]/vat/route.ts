import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { quotes } from "@/db/schema";
import { requireApiUser } from "@/lib/auth";
import { handle, jsonError } from "@/lib/api";
import { getQuote } from "@/lib/quotes";
import { analysisOfQuote, isVatUnclear, parseStoredAnalysis } from "@/lib/analysis";
import { da } from "@/i18n/dict/da";

export const runtime = "nodejs";

const schema = z.object({ choice: z.enum(["excl", "incl"]) });

/** The user tells us whether the quote's prices include VAT (only when the quote doesn't say). */
export const POST = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const user = await requireApiUser();
  const quote = await getQuote(user.id, id);
  if (!quote) return jsonError(da.errors.quoteNotFound, 404);
  const analysis = parseStoredAnalysis(quote.analysisJson);
  if (!analysis) return jsonError(da.errors.notAnalyzed);
  if (!isVatUnclear(analysis)) return jsonError(da.errors.vatNotUnclear);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(da.errors.vatNotUnclear);

  const choice = parsed.data.choice;
  // Keep the stored price in step, so lists that only read the column agree with the analysis.
  const price = analysisOfQuote({ analysisJson: quote.analysisJson, vatChoice: choice })?.totals.inclVat ?? quote.totalInclVat;
  await db
    .update(quotes)
    .set({ vatChoice: choice, totalInclVat: price, updatedAt: new Date() })
    .where(and(eq(quotes.id, quote.id), eq(quotes.userId, user.id)));
  return NextResponse.json({ ok: true, choice, totalInclVat: price });
});
