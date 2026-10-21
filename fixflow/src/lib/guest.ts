import "server-only";
import { randomBytes } from "crypto";
import { and, eq, lt } from "drizzle-orm";
import { db } from "@/db";
import { users, type User } from "@/db/schema";
import bcrypt from "bcryptjs";
import { deleteAccountData } from "./account";
import { GUEST_ANALYSES, GUEST_DELETE_MS, GUEST_EMAIL_DOMAIN } from "./guest-rules";

export { GUEST_ANALYSES, GUEST_DELETE_DAYS, isGuest } from "./guest-rules";

/**
 * "Tjek uden konto": a temporary account so a visitor can upload and see a quote check without typing an e-mail.
 * It has a placeholder e-mail on a reserved domain (.invalid never receives mail) and a random password nobody
 * knows, so it can't be logged into – only the session cookie reaches it. Creating a real account converts it.
 */
export async function createGuest() {
  const id = randomBytes(9).toString("base64url").toLowerCase().replace(/[^a-z0-9]/g, "x");
  const [user] = await db
    .insert(users)
    .values({
      name: "",
      email: `gaest-${id}@${GUEST_EMAIL_DOMAIN}`,
      // Nobody ever types this password, so a low bcrypt cost is fine (and keeps starting a check fast).
      passwordHash: await bcrypt.hash(randomBytes(32).toString("base64url"), 8),
      acceptedTermsAt: new Date(),
      betaLimit: GUEST_ANALYSES,
      guest: true,
    })
    .returning();
  return user;
}

/** Deletes guest checks nobody turned into an account (stated in the privacy policy). Runs hourly. */
export async function deleteOldGuests(now = Date.now()) {
  const stale: User[] = await db.query.users.findMany({
    where: and(eq(users.guest, true), lt(users.createdAt, new Date(now - GUEST_DELETE_MS))),
    limit: 200,
  });
  for (const u of stale) {
    try {
      await deleteAccountData(u);
    } catch (err) {
      console.error("Could not delete guest", u.id, err);
    }
  }
  if (stale.length) console.info(JSON.stringify({ event: "guests_deleted", count: stale.length }));
  return stale.length;
}
