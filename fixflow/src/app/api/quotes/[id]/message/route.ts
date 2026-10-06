import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { contractorMessages } from "@/db/schema";
import { requireApiUser } from "@/lib/auth";
import { handle, jsonError } from "@/lib/api";
import { getQuote } from "@/lib/quotes";
import { draftMessage } from "@/lib/ai";
import { parseStoredAnalysis } from "@/lib/analysis";
import { hasFullAccess } from "@/lib/plans";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

const schema = z.object({
  topic: z.string().trim().min(3).max(500),
  tone: z.enum(["venlig", "neutral", "bestemt"]).catch("venlig"),
});

export const POST = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const user = await requireApiUser();
  await rateLimit(`message:${user.id}`, 40, 60 * 60);
  const quote = await getQuote(user.id, id);
  if (!quote) return jsonError("Tilbuddet blev ikke fundet.", 404);
  if (!hasFullAccess(user, quote)) {
    return jsonError("Beskedgeneratoren kræver Pro eller et engangskøb for dette tilbud.", 402);
  }
  const analysis = parseStoredAnalysis(quote.analysisJson);
  if (!analysis) return jsonError("Tilbuddet er ikke analyseret endnu.");
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("Skriv hvad du vil spørge om (mindst 3 tegn).");

  const body = await draftMessage(analysis, parsed.data.topic, parsed.data.tone, user.name);
  const [message] = await db
    .insert(contractorMessages)
    .values({ quoteId: quote.id, topic: parsed.data.topic, body })
    .returning();
  return NextResponse.json({ message });
});
