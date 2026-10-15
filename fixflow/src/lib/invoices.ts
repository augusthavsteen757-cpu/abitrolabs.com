import "server-only";
import { and, desc, eq, lt, sql } from "drizzle-orm";
import { da } from "@/i18n/dict/da";
import { DEFAULT_LOCALE, type Locale } from "@/i18n/config";
import { db } from "@/db";
import { invoiceChecks, newId, type InvoiceCheck, type Quote, type User } from "@/db/schema";
import { AnalysisError, compareInvoice } from "./ai";
import { analysisOfQuote } from "./analysis";
import { consumeAnalysis, refundAnalysis } from "./quota";
import { HttpError } from "./auth";
import { rateLimit } from "./rate-limit";
import { logError } from "./api";
import { track } from "./events";
import { parseStoredInvoice } from "./invoice";

const STALE_MS = 10 * 60 * 1000;
const AI_DAILY_LIMIT = () => Number.parseInt(process.env.AI_DAILY_LIMIT ?? "", 10) || 300;

/** Checks that never finished (server restart mid-check) are marked FAILED and refunded. */
export async function recoverStaleInvoiceChecks(userId: string) {
  const cutoff = new Date(Date.now() - STALE_MS);
  const stale = await db.query.invoiceChecks.findMany({
    where: and(eq(invoiceChecks.userId, userId), eq(invoiceChecks.status, "ANALYZING"), lt(invoiceChecks.updatedAt, cutoff)),
  });
  for (const c of stale) {
    const [claimed] = await db
      .update(invoiceChecks)
      .set({ status: "FAILED", error: da.errors.analysisFailed, chargedSource: null, updatedAt: new Date() })
      .where(and(eq(invoiceChecks.id, c.id), eq(invoiceChecks.status, "ANALYZING")))
      .returning();
    if (claimed && c.chargedSource) await refundAnalysis(c.userId, c.chargedSource);
  }
}

/** The finished checks of a quote, newest first. Failed ones are not kept (the user just tries again). */
export async function listInvoiceChecks(userId: string, quoteId: string) {
  await recoverStaleInvoiceChecks(userId).catch(logError);
  return db.query.invoiceChecks.findMany({
    where: and(eq(invoiceChecks.quoteId, quoteId), eq(invoiceChecks.userId, userId), eq(invoiceChecks.status, "DONE")),
    orderBy: [desc(invoiceChecks.createdAt)],
  });
}

/** Shape sent to the client (no AI cost data). */
export function publicInvoiceCheck(c: InvoiceCheck) {
  return { id: c.id, quoteId: c.quoteId, fileName: c.fileName, status: c.status, createdAt: c.createdAt, result: parseStoredInvoice(c.resultJson) };
}

/**
 * Compares an uploaded invoice with an analysed quote. Costs one analysis; refunded when the check fails or the
 * document isn't an invoice. Only one check per quote can run at a time (a double click never pays twice).
 * The invoice file is only held in memory and never stored.
 */
export async function runInvoiceCheck(
  user: User,
  quote: Quote,
  file: { data: Buffer; mimeType: string; name: string },
  locale: Locale = DEFAULT_LOCALE,
): Promise<InvoiceCheck> {
  const analysis = analysisOfQuote(quote);
  if (quote.status !== "DONE" || !analysis) throw new HttpError(400, da.errors.notAnalyzed);
  await recoverStaleInvoiceChecks(user.id).catch(logError);

  // Atomic claim: the row is only inserted when no other check of this quote is running.
  const id = newId();
  const now = Date.now();
  await db.run(sql`
    INSERT INTO invoice_checks (id, quote_id, user_id, file_name, status, created_at, updated_at)
    SELECT ${id}, ${quote.id}, ${user.id}, ${file.name.slice(0, 200)}, 'ANALYZING', ${now}, ${now}
    WHERE NOT EXISTS (SELECT 1 FROM invoice_checks WHERE quote_id = ${quote.id} AND status = 'ANALYZING')`);
  const claimed = await db.query.invoiceChecks.findFirst({ where: eq(invoiceChecks.id, id) });
  if (!claimed) throw new HttpError(409, da.errors.invoiceBusy);

  const drop = () => db.delete(invoiceChecks).where(eq(invoiceChecks.id, id));
  try {
    await rateLimit("ai-daily", AI_DAILY_LIMIT(), 24 * 60 * 60);
  } catch {
    await drop();
    throw new HttpError(429, da.errors.aiDailyLimit);
  }
  const source = await consumeAnalysis(user);
  if (!source) {
    await drop();
    throw new HttpError(402, da.errors.noAnalysesLeft);
  }
  await db.update(invoiceChecks).set({ chargedSource: source }).where(eq(invoiceChecks.id, id));

  try {
    const { result, meta } = await compareInvoice(file.data, file.mimeType, file.name, analysis, locale);
    const [done] = await db
      .update(invoiceChecks)
      .set({
        status: "DONE",
        resultJson: JSON.stringify(result),
        aiModel: meta?.model ?? null,
        aiInputTokens: meta?.inputTokens ?? null,
        aiOutputTokens: meta?.outputTokens ?? null,
        aiMs: meta?.ms ?? null,
        updatedAt: new Date(),
      })
      .where(eq(invoiceChecks.id, id))
      .returning();
    if (!done) {
      // The quote (and with it this check) was deleted while the check ran.
      await refundAnalysis(user.id, source);
      throw new HttpError(404, da.errors.quoteNotFound);
    }
    await track("invoice_checked");
    return done;
  } catch (err) {
    await drop();
    if (err instanceof HttpError) throw err;
    await refundAnalysis(user.id, source);
    if (err instanceof AnalysisError) throw new HttpError(422, err.message);
    logError(err);
    throw new HttpError(500, da.errors.analysisFailed);
  }
}
