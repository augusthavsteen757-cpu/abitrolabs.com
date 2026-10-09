import { DEFAULT_LOCALE, type Locale } from "@/i18n/config";
import "server-only";
import { da } from "@/i18n/dict/da";
import { and, desc, eq, inArray, lt } from "drizzle-orm";
import { db } from "@/db";
import { contractorMessages, quotes, type Quote, type User } from "@/db/schema";
import { AnalysisError, analyzeQuote } from "./ai";
import { readStoredFile } from "./storage";
import { consumeAnalysis, refundAnalysis } from "./quota";
import { HttpError } from "./auth";
import { rateLimit } from "./rate-limit";
import { logError } from "./api";
import { parseStoredAnalysis, redactForFree, type LockInfo, type QuoteAnalysis } from "./analysis";
import { hasFullAccess } from "./plans";

/** An analysis still "running" after this long died with its server (deploy, crash, out of memory). */
const STALE_MS = 10 * 60 * 1000;

/**
 * Marks analyses that never finished as FAILED and refunds what they cost, so a crash or redeploy can
 * never leave a user with a stuck quote and a used-up analysis. Safe to run concurrently.
 */
export async function recoverStaleAnalyses(userId?: string) {
  const cutoff = new Date(Date.now() - STALE_MS);
  const stale = await db.query.quotes.findMany({
    where: and(
      inArray(quotes.status, ["ANALYZING", "PENDING"]),
      lt(quotes.updatedAt, cutoff),
      ...(userId ? [eq(quotes.userId, userId)] : []),
    ),
    limit: 100,
  });
  for (const q of stale) {
    const [claimed] = await db
      .update(quotes)
      .set({ status: "FAILED", error: da.errors.analysisFailed, chargedSource: null, updatedAt: new Date() })
      .where(and(eq(quotes.id, q.id), eq(quotes.status, q.status)))
      .returning();
    if (claimed && q.chargedSource) await refundAnalysis(q.userId, q.chargedSource);
    if (claimed) console.warn(JSON.stringify({ event: "analysis_recovered", quoteId: q.id, refunded: !!q.chargedSource }));
  }
}

export async function listQuotes(userId: string) {
  await recoverStaleAnalyses(userId).catch(logError);
  return db.query.quotes.findMany({ where: eq(quotes.userId, userId), orderBy: [desc(quotes.createdAt)] });
}

export async function getQuote(userId: string, id: string): Promise<Quote | null> {
  await recoverStaleAnalyses(userId).catch(logError);
  const q = await db.query.quotes.findFirst({ where: and(eq(quotes.id, id), eq(quotes.userId, userId)) });
  return q ?? null;
}

export async function listMessages(quoteId: string) {
  return db.query.contractorMessages.findMany({
    where: eq(contractorMessages.quoteId, quoteId),
    orderBy: [desc(contractorMessages.createdAt)],
  });
}

/** Max AI analyses per day across all users (protects the AI budget against abuse). */
const AI_DAILY_LIMIT = () => Number.parseInt(process.env.AI_DAILY_LIMIT ?? "", 10) || 300;

/**
 * Claims the quote, charges quota, runs the analysis and stores the result.
 * On failure the quota/credit is refunded and the quote is marked FAILED with a clear reason.
 */
export async function runAnalysis(user: User, quote: Quote, locale: Locale = DEFAULT_LOCALE): Promise<Quote> {
  // Atomic claim: two tabs (or a double click) can never run – and pay for – the same analysis twice.
  const [claimed] = await db
    .update(quotes)
    .set({ status: "ANALYZING", error: null, updatedAt: new Date() })
    .where(and(eq(quotes.id, quote.id), inArray(quotes.status, ["PENDING", "FAILED"])))
    .returning();
  if (!claimed) throw new HttpError(409, da.errors.alreadyAnalyzed);

  const fail = async (message: string) => {
    const [row] = await db
      .update(quotes)
      .set({ status: "FAILED", error: message, chargedSource: null, updatedAt: new Date() })
      .where(eq(quotes.id, quote.id))
      .returning();
    return row;
  };

  try {
    await rateLimit("ai-daily", AI_DAILY_LIMIT(), 24 * 60 * 60);
  } catch {
    console.warn(JSON.stringify({ event: "ai_daily_limit_reached" }));
    const row = await fail(da.errors.aiDailyLimit);
    if (!row) throw new HttpError(404, da.errors.quoteNotFound);
    return row;
  }

  const source = await consumeAnalysis(user);
  if (!source) {
    await fail(da.errors.noAnalysesLeft);
    throw new HttpError(402, da.errors.noAnalysesLeft);
  }
  await db.update(quotes).set({ chargedSource: source }).where(eq(quotes.id, quote.id));

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
    if (!updated) {
      // The user deleted the quote while it was being analysed.
      await refundAnalysis(user.id, source);
      throw new HttpError(404, da.errors.quoteNotFound);
    }
    return updated;
  } catch (err) {
    if (err instanceof HttpError) throw err;
    if (!(err instanceof AnalysisError)) logError(err);
    await refundAnalysis(user.id, source);
    const row = await fail(err instanceof AnalysisError ? err.message : da.errors.analysisFailed);
    if (!row) throw new HttpError(404, da.errors.quoteNotFound);
    return row;
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
