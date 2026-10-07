import { getLocale } from "@/i18n/server";
import { da } from "@/i18n/dict/da";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { contractorMessages, quotes, users } from "@/db/schema";
import { requireApiUser } from "@/lib/auth";
import { handle, jsonError } from "@/lib/api";
import { getQuote, publicQuote, runAnalysis } from "@/lib/quotes";
import { deleteStoredFile } from "@/lib/storage";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 120;

type Ctx = { params: Promise<{ id: string }> };

export const GET = handle(async (_req: Request, { params }: Ctx) => {
  const { id } = await params;
  const user = await requireApiUser();
  const quote = await getQuote(user.id, id);
  if (!quote) return jsonError(da.errors.quoteNotFound, 404);
  return NextResponse.json({ quote: publicQuote(user, quote) });
});

/** Retry a failed analysis. */
export const POST = handle(async (_req: Request, { params }: Ctx) => {
  const { id } = await params;
  const user = await requireApiUser();
  const quote = await getQuote(user.id, id);
  if (!quote) return jsonError(da.errors.quoteNotFound, 404);
  if (quote.status !== "FAILED") return jsonError(da.errors.alreadyAnalyzed);
  await rateLimit(`upload:${user.id}`, 20, 60 * 60);
  const fresh = await db.query.users.findFirst({ where: eq(users.id, user.id) });
  const result = await runAnalysis(fresh ?? user, quote, await getLocale());
  return NextResponse.json({ quote: publicQuote(user, result) });
});

export const DELETE = handle(async (_req: Request, { params }: Ctx) => {
  const { id } = await params;
  const user = await requireApiUser();
  const quote = await getQuote(user.id, id);
  if (!quote) return jsonError(da.errors.quoteNotFound, 404);
  await db.delete(contractorMessages).where(eq(contractorMessages.quoteId, quote.id));
  await db.delete(quotes).where(eq(quotes.id, quote.id));
  await deleteStoredFile(quote.fileKey);
  return NextResponse.json({ ok: true });
});
