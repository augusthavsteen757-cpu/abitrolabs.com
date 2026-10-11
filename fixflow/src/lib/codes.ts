import "server-only";
import { and, eq, lt, notInArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { codeRedemptions, partnerCodes, users, type User } from "@/db/schema";
import { HttpError } from "./auth";
import { isBeta } from "./plans";
import { da } from "@/i18n/dict/da";
import { normalizeCode, parsePartnerCodes } from "./code-format";

export { normalizeCode, parsePartnerCodes };

/**
 * Makes the partner_codes table match PARTNER_CODES. A code removed from the variable is closed (no more uses),
 * but kept, so the redemptions that already happened stay on record.
 */
export async function syncPartnerCodes(raw = process.env.PARTNER_CODES) {
  const specs = parsePartnerCodes(raw);
  for (const s of specs) {
    await db
      .insert(partnerCodes)
      .values(s)
      .onConflictDoUpdate({ target: partnerCodes.code, set: { maxUses: s.maxUses, credits: s.credits } });
  }
  const keep = specs.map((s) => s.code);
  await db
    .update(partnerCodes)
    .set({ maxUses: sql`${partnerCodes.uses}` })
    .where(keep.length ? notInArray(partnerCodes.code, keep) : undefined);
}

/**
 * Redeems a partner code for the user: adds the code's analyses as gift credits.
 * Every step is a single conditional statement, so double clicks and parallel requests can't redeem twice
 * or go past the number of uses the partner paid for.
 */
export async function redeemCode(user: User, input: string): Promise<{ credits: number }> {
  if (isBeta()) throw new HttpError(400, da.errors.codeBeta);
  const code = normalizeCode(input);
  const row = code ? await db.query.partnerCodes.findFirst({ where: eq(partnerCodes.code, code) }) : null;
  if (!row) throw new HttpError(400, da.errors.codeInvalid);

  const claimed = await db
    .insert(codeRedemptions)
    .values({ code, userId: user.id })
    .onConflictDoNothing()
    .returning({ code: codeRedemptions.code });
  if (!claimed.length) throw new HttpError(400, da.errors.codeAlreadyUsed);

  const used = await db
    .update(partnerCodes)
    .set({ uses: sql`${partnerCodes.uses} + 1` })
    .where(and(eq(partnerCodes.code, code), lt(partnerCodes.uses, partnerCodes.maxUses)))
    .returning({ credits: partnerCodes.credits });
  if (!used.length) {
    await db.delete(codeRedemptions).where(and(eq(codeRedemptions.code, code), eq(codeRedemptions.userId, user.id)));
    throw new HttpError(400, da.errors.codeUsedUp);
  }

  const credits = used[0].credits;
  await db
    .update(users)
    .set({ giftCredits: sql`${users.giftCredits} + ${credits}` })
    .where(eq(users.id, user.id));
  return { credits };
}
