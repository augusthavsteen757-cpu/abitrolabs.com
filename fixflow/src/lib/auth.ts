import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users, type User } from "@/db/schema";
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession, verifySession } from "./session";

const BCRYPT_COST = 12;
// Used when the e-mail doesn't exist, so login takes the same time either way (no user enumeration by timing).
const DUMMY_HASH = bcrypt.hashSync("fixflow-timing-dummy", BCRYPT_COST);

const COMMON_PASSWORDS = new Set([
  "1234567890", "12345678910", "qwertyuiop", "password123", "adgangskode", "adgangskode1", "kodeord123",
  "sommer2024", "sommer2025", "sommer2026", "vinter2025", "vinter2026", "danmark123", "fixflow123", "abcdefghij",
]);

/** Returns a Danish error message, or null if the password is acceptable. */
export function passwordProblem(pw: string, email?: string): string | null {
  if (pw.length < 10) return "Adgangskoden skal være mindst 10 tegn.";
  if (pw.length > 200) return "Adgangskoden er for lang.";
  if (COMMON_PASSWORDS.has(pw.toLowerCase()) || /^(.)\1+$/.test(pw)) return "Adgangskoden er for nem at gætte. Vælg en anden.";
  if (email && pw.toLowerCase().includes(email.split("@")[0].toLowerCase()) && email.split("@")[0].length >= 4)
    return "Adgangskoden må ikke indeholde din e-mail.";
  return null;
}

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, BCRYPT_COST);
}

export async function checkPassword(pw: string, hash: string | null | undefined) {
  const ok = await bcrypt.compare(pw, hash ?? DUMMY_HASH);
  return ok && !!hash;
}

export async function setSessionCookie(user: Pick<User, "id" | "sessionVersion">) {
  const token = await signSession(user.id, user.sessionVersion);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && !process.env.ALLOW_INSECURE_COOKIES,
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<User | null> {
  const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const user = await db.query.users.findFirst({ where: eq(users.id, session.userId) });
  // A bumped sessionVersion (log out everywhere / password change) invalidates older tokens.
  if (!user || user.sessionVersion !== session.version) return null;
  // A cancelled Pro subscription ends at the end of the paid period.
  if (user.plan === "PRO" && user.planEndsAt && user.planEndsAt.getTime() <= Date.now()) {
    const [downgraded] = await db
      .update(users)
      .set({ plan: "FREE", planEndsAt: null, periodUsed: 1 })
      .where(eq(users.id, user.id))
      .returning();
    return downgraded;
  }
  return user;
}

/** For pages: redirects to /login if not signed in. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** For API routes: throws a 401 HttpError if not signed in. */
export async function requireApiUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, "Du skal være logget ind.");
  return user;
}
