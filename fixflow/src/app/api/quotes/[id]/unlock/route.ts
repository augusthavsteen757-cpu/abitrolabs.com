import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
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
  if (!quote) return jsonError("Tilbuddet blev ikke fundet.", 404);
  if (quote.unlocked) return NextResponse.json({ ok: true, alreadyUnlocked: true });
  if (quote.status !== "DONE") return jsonError("Tilbuddet er ikke analyseret endnu.");
  if (!(await spendCredit(user.id))) {
    return jsonError("Du har ingen engangskøb tilbage. Køb en analyse for at låse tilbuddet op.", 402);
  }
  await db.update(quotes).set({ unlocked: true, updatedAt: new Date() }).where(eq(quotes.id, quote.id));
  return NextResponse.json({ ok: true });
});
