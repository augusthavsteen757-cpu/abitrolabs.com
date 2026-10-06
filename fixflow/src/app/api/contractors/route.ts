import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireApiUser } from "@/lib/auth";
import { handle, jsonError } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { TRADES, findContractors, type TradeKey } from "@/lib/contractors";

export const runtime = "nodejs";

const schema = z.object({
  trade: z.enum(Object.keys(TRADES) as [TradeKey, ...TradeKey[]]),
  postalCode: z.string().regex(/^\d{4}$/),
  radius: z.coerce.number().int().min(5).max(100).catch(25),
});

export const GET = handle(async (req: Request) => {
  const user = await requireApiUser();
  await rateLimit(`find:${user.id}`, 40, 60 * 60);
  const params = Object.fromEntries(new URL(req.url).searchParams);
  const parsed = schema.safeParse(params);
  if (!parsed.success) return jsonError("Vælg fag og skriv et postnummer med 4 cifre.");
  const { trade, postalCode, radius } = parsed.data;

  let result;
  try {
    result = await findContractors(trade, postalCode, radius);
  } catch (err) {
    console.error("Contractor search failed", err);
    return jsonError("Søgningen i CVR-registret mislykkedes. Prøv igen om lidt.", 502);
  }
  if (!result.origin) return jsonError("Vi kender ikke det postnummer. Tjek at det er rigtigt.");
  if (user.postalCode !== postalCode) {
    await db.update(users).set({ postalCode }).where(eq(users.id, user.id));
  }
  return NextResponse.json(result);
});
