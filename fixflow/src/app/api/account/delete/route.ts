import { da } from "@/i18n/dict/da";
import { NextResponse } from "next/server";
import { z } from "zod";
import { checkPassword, clearSessionCookie, requireApiUser } from "@/lib/auth";
import { handle, jsonError } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { deleteAccountData } from "@/lib/account";

const schema = z.object({ password: z.string().max(200) });

/** GDPR art. 17: deletes the account, all quotes, files and messages. Payment records are kept anonymised for bookkeeping. */
export const POST = handle(async (req: Request) => {
  const user = await requireApiUser();
  await rateLimit(`delete:${user.id}`, 5, 15 * 60);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !(await checkPassword(parsed.data.password, user.passwordHash))) {
    return jsonError(da.errors.pwWrong, 401);
  }
  await deleteAccountData(user);
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
});
