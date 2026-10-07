import { da } from "@/i18n/dict/da";
import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { contractorMessages, payments, quotes, users } from "@/db/schema";
import { checkPassword, clearSessionCookie, requireApiUser } from "@/lib/auth";
import { handle, jsonError } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { deleteStoredFile } from "@/lib/storage";
import { cancelPro } from "@/lib/billing";

const schema = z.object({ password: z.string().max(200) });

/** GDPR art. 17: deletes the account, all quotes, files and messages. Payment records are kept anonymised for bookkeeping. */
export const POST = handle(async (req: Request) => {
  const user = await requireApiUser();
  await rateLimit(`delete:${user.id}`, 5, 15 * 60);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !(await checkPassword(parsed.data.password, user.passwordHash))) {
    return jsonError(da.errors.pwWrong, 401);
  }
  if (user.plan === "PRO") await cancelPro(user, { immediately: true });

  const qs = await db.query.quotes.findMany({ where: eq(quotes.userId, user.id) });
  if (qs.length) await db.delete(contractorMessages).where(inArray(contractorMessages.quoteId, qs.map((q) => q.id)));
  for (const q of qs) await deleteStoredFile(q.fileKey);
  await db.delete(quotes).where(eq(quotes.userId, user.id));
  await db.update(payments).set({ userId: null }).where(eq(payments.userId, user.id));
  await db.delete(users).where(eq(users.id, user.id));
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
});
