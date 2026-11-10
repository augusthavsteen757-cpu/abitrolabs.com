import { da } from "@/i18n/dict/da";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { quotes } from "@/db/schema";
import { requireApiUser } from "@/lib/auth";
import { handle, jsonError } from "@/lib/api";
import { getQuote } from "@/lib/quotes";
import { spendCredit } from "@/lib/quota";

export const POST = handle(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const user = await requireApiUser();
  const quote = await getQuote(user.id, id);
  if (!quote) return jsonError(da.errors.quoteNotFound, 404);
  if (quote.unlocked) return NextResponse.json({ ok: true, alreadyUnlocked: true });
  if (quote.status !== "DONE") return jsonError(da.errors.notAnalyzed);
  // Claim first: of two parallel clicks only one wins, so only one credit is spent.
  const claimed = await db
    .update(quotes)
    .set({ unlocked: true, updatedAt: new Date() })
    .where(and(eq(quotes.id, quote.id), eq(quotes.unlocked, false)))
    .returning({ id: quotes.id });
  if (!claimed.length) return NextResponse.json({ ok: true, alreadyUnlocked: true });
  if (!(await spendCredit(user.id))) {
    await db.update(quotes).set({ unlocked: false }).where(eq(quotes.id, quote.id));
    return jsonError(da.errors.noCredits, 402);
  }
  return NextResponse.json({ ok: true });
});
