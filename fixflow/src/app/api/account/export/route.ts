import { NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { contractorMessages, payments, quotes } from "@/db/schema";
import { requireApiUser } from "@/lib/auth";
import { handle } from "@/lib/api";
import { parseStoredAnalysis, redactForFree } from "@/lib/analysis";
import { hasFullAccess } from "@/lib/plans";
import { rateLimit } from "@/lib/rate-limit";

/** GDPR art. 15 + 20: the user's own data as JSON. */
export const GET = handle(async () => {
  const user = await requireApiUser();
  await rateLimit(`export:${user.id}`, 10, 60 * 60);
  const qs = await db.query.quotes.findMany({ where: eq(quotes.userId, user.id) });
  const msgs = qs.length
    ? await db.query.contractorMessages.findMany({ where: inArray(contractorMessages.quoteId, qs.map((q) => q.id)) })
    : [];
  const pays = await db.query.payments.findMany({ where: eq(payments.userId, user.id) });
  const data = {
    exportedAt: new Date().toISOString(),
    account: {
      name: user.name,
      email: user.email,
      plan: user.plan,
      postalCode: user.postalCode,
      extraCredits: user.extraCredits,
      createdAt: user.createdAt,
      acceptedTermsAt: user.acceptedTermsAt,
    },
    quotes: qs.map((q) => ({
      id: q.id,
      projectName: q.projectName,
      fileName: q.fileName,
      status: q.status,
      createdAt: q.createdAt,
      analysis: (() => {
        const a = parseStoredAnalysis(q.analysisJson);
        return a && !hasFullAccess(user, q) ? redactForFree(a).analysis : a;
      })(),
      messages: msgs.filter((m) => m.quoteId === q.id).map((m) => ({ topic: m.topic, body: m.body, createdAt: m.createdAt })),
    })),
    payments: pays.map((p) => ({ kind: p.kind, amountDkk: p.amountDkk, provider: p.provider, createdAt: p.createdAt })),
  };
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="fixflow-data.json"`,
      "Cache-Control": "no-store",
    },
  });
});
