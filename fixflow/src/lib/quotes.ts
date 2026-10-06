import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { contractorMessages, quotes, type Quote, type User } from "@/db/schema";
import { AnalysisError, analyzeQuote } from "./ai";
import { readStoredFile } from "./storage";
import { consumeAnalysis, refundAnalysis } from "./quota";
import { HttpError } from "./auth";
import { parseStoredAnalysis, type QuoteAnalysis } from "./analysis";
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
export async function runAnalysis(user: User, quote: Quote): Promise<Quote> {
  const source = await consumeAnalysis(user);
  if (!source) throw new HttpError(402, "Du har ikke flere analyser tilbage. Opgradér til Pro eller køb en enkelt analyse.");

  await db.update(quotes).set({ status: "ANALYZING", error: null, updatedAt: new Date() }).where(eq(quotes.id, quote.id));

  try {
    const data = await readStoredFile(quote.fileKey);
    const analysis = await analyzeQuote(data, quote.mimeType, quote.fileName);
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
        : "Analysen mislykkedes. Du er ikke blevet trukket for en analyse – prøv igen.";
    const [updated] = await db
      .update(quotes)
      .set({ status: "FAILED", error: message, updatedAt: new Date() })
      .where(eq(quotes.id, quote.id))
      .returning();
    return updated;
  }
}

/** Shape sent to the client. Locked (free) quotes only get the first 3 questions. */
export function publicQuote(user: User, quote: Quote, freeQuestionLimit = 3) {
  const analysis = parseStoredAnalysis(quote.analysisJson);
  const full = hasFullAccess(user, quote);
  let safe: QuoteAnalysis | null = analysis;
  let hiddenQuestions = 0;
  if (analysis && !full) {
    hiddenQuestions = Math.max(0, analysis.questions.length - freeQuestionLimit);
    safe = { ...analysis, questions: analysis.questions.slice(0, freeQuestionLimit) };
  }
  const { analysisJson: _omit, fileKey: _key, ...rest } = quote;
  return { ...rest, analysis: safe, fullAccess: full, hiddenQuestions };
}
