import { SignJWT, jwtVerify } from "jose";

/** Edge-safe JWT helpers (used by both middleware-adjacent code and server routes). */

export const SESSION_COOKIE = "ff_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function secretKey() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) {
    if (process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build") {
      throw new Error("AUTH_SECRET mangler eller er for kort (mindst 32 tegn anbefales).");
    }
    return new TextEncoder().encode("fixflow-dev-secret-change-me-please-0123456789");
  }
  return new TextEncoder().encode(s);
}

export async function signSession(userId: string, version: number): Promise<string> {
  return new SignJWT({ sub: userId, ver: version })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secretKey());
}

export async function verifySession(token: string | undefined): Promise<{ userId: string; version: number } | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    if (typeof payload.sub !== "string") return null;
    return { userId: payload.sub, version: typeof payload.ver === "number" ? payload.ver : 0 };
  } catch {
    return null;
  }
}
