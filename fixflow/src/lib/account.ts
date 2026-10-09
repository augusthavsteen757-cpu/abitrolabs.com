import "server-only";
import { and, eq, inArray, isNull, lt, or } from "drizzle-orm";
import { db } from "@/db";
import { analysisReports, contractorMessages, payments, quotes, users, type User } from "@/db/schema";
import { deleteStoredFile } from "./storage";
import { cancelPro } from "./billing";

/** Accounts not used for this long are deleted (stated in the privacy policy). */
export const INACTIVE_DELETE_MS = 3 * 365 * 24 * 60 * 60 * 1000;

/** GDPR art. 17: deletes the account, all quotes, files and messages. Payments are kept without name/e-mail for bookkeeping. */
export async function deleteAccountData(user: User) {
  if (user.plan === "PRO") await cancelPro(user, { immediately: true });
  const qs = await db.query.quotes.findMany({ where: eq(quotes.userId, user.id) });
  if (qs.length) {
    const ids = qs.map((q) => q.id);
    await db.delete(contractorMessages).where(inArray(contractorMessages.quoteId, ids));
    await db.delete(analysisReports).where(inArray(analysisReports.quoteId, ids));
  }
  for (const q of qs) await deleteStoredFile(q.fileKey);
  await db.delete(quotes).where(eq(quotes.userId, user.id));
  await db.update(payments).set({ userId: null }).where(eq(payments.userId, user.id));
  await db.delete(users).where(eq(users.id, user.id));
}

/** Deletes accounts that have been inactive for 3 years. Runs daily from instrumentation.ts. */
export async function deleteInactiveAccounts(now = Date.now()) {
  const cutoff = new Date(now - INACTIVE_DELETE_MS);
  const stale = await db.query.users.findMany({
    where: or(lt(users.lastSeenAt, cutoff), and(isNull(users.lastSeenAt), lt(users.createdAt, cutoff))),
    limit: 200,
  });
  for (const u of stale) {
    try {
      await deleteAccountData(u);
    } catch (err) {
      console.error("Could not delete inactive account", u.id, err);
    }
  }
  if (stale.length) console.info(`Deleted ${stale.length} inactive account(s)`);
}
