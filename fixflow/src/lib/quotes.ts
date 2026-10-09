import { DEFAULT_LOCALE, type Locale } from "@/i18n/config";
import "server-only";
import { da } from "@/i18n/dict/da";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { contractorMessages, quotes, type Quote, type User } from "@/db/schema";
import { AnalysisError, analyzeQuote } from "./ai";
import { readStoredFile } from "./storage";
import { consumeAnalysis, refundAnalysis } from "./quota";
import { HttpError } from "./auth";
import { parseStoredAnalysis, redactForFree, type LockInfo, type QuoteAnalysis } from "./analysis";
import { hasFullAccess } from "./plans";

export async function listQuotes(userId: string) {
  return db.query.quotes.findMany({ where: eq(quotes.userId, userId), orderBy: [desc(quotes.createdAt)] });
}

export async function getQuote(userId: string, id: string): Promise<Quote | null> {
  const q = await db.query.quotes.findFirst({ where: and(eq(quotes.id, id), eq(quotes.userId, userId)) });
  return q ?? null;
}

export async function listMessages(quoteId: string) {
  return db.query.contractorMessages.findMany({
    where: eq(contractorMessages.quoteId, quoteId),
    orderBy: [desc(contractorMessages.createdAt)],
  });
}

/**
 * Consumes quota, runs the analysis synchronously and stores the result.
 * On failure the quota/credit is refunded and the quote is marked FAILED.
 */
export async function runAnalysis(user: User, quote: Quote, locale: Locale = DEFAULT_LOCALE): Promise<Quote> {
  const source = await consumeAnalysis(user);
  if (!source) throw new HttpError(402, da.errors.noAnalysesLeft);

  await db.update(quotes).set({ status: "ANALYZING", error: null, updatedAt: new Date() }).where(eq(quotes.id, quote.id));

  try {
    const data = await readStoredFile(quote.fileKey);
    const { analysis, meta } = await analyzeQuote(data, quote.mimeType, quote.fileName, locale);
    const unlocked = quote.unlocked || user.plan === "PRO" || source === "credit";
    const [updated] = await db
      .update(quotes)
      .set({
        status: "DONE",
        error: null,
        analysisJson: JSON.stringify(analysis),
        contractorName: analysis.contractor.name,
        title: analysis.title,
        totalInclVat: analysis.totals.inclVat,
        score: analysis.score.total,
        unlocked,
        aiModel: meta?.model ?? null,
        aiInputTokens: meta?.inputTokens ?? null,
        aiOutputTokens: meta?.outputTokens ?? null,
        aiMs: meta?.ms ?? null,
        updatedAt: new Date(),
      })
      .where(eq(quotes.id, quote.id))
      .returning();
    return updated;
  } catch (err) {
    console.error("Analysis failed", err);
    await refundAnalysis(user.id, source);
    const message =
      err instanceof AnalysisError
        ? err.message
        : da.errors.analysisFailed;
    const [updated] = await db
      .update(quotes)
      .set({ status: "FAILED", error: message, updatedAt: new Date() })
      .where(eq(quotes.id, quote.id))
      .returning();
    return updated;
  }
}

/** Shape sent to the client. Locked (free) quotes never include the paid details. */
export function publicQuote(user: User, quote: Quote) {
  const analysis = parseStoredAnalysis(quote.analysisJson);
  const full = hasFullAccess(user, quote);
  let safe: QuoteAnalysis | null = analysis;
  let lock: LockInfo | null = null;
  if (analysis && !full) ({ analysis: safe, lock } = redactForFree(analysis));
  const { analysisJson: _omit, fileKey: _key, aiModel: _m, aiInputTokens: _i, aiOutputTokens: _o, aiMs: _ms, ...rest } = quote;
  return { ...rest, analysis: safe, fullAccess: full, lock };
}
