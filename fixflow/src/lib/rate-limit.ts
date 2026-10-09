import { da } from "@/i18n/dict/da";
import "server-only";
import { headers } from "next/headers";
import { lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { rateLimits } from "@/db/schema";
import { HttpError } from "./auth";

/**
 * Client IP for rate limiting. The left-most X-Forwarded-For entry is set by the client and can be forged,
 * so we prefer headers our edge proxy overwrites (Cloudflare in front of Render), then the right-most
 * X-Forwarded-For entry, which our own proxy appended.
 */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const trusted = process.env.TRUSTED_IP_HEADER;
  const fromTrusted = trusted ? h.get(trusted) : null;
  const fwd = h.get("x-forwarded-for")?.split(",").map((s) => s.trim()).filter(Boolean);
  const ip = fromTrusted || h.get("cf-connecting-ip") || h.get("true-client-ip") || fwd?.at(-1) || h.get("x-real-ip") || "unknown";
  return ip.trim().slice(0, 64);
}

let lastCleanup = 0;

/**
 * Fixed-window limiter stored in the database, so it holds across several server instances.
 * Throws a 429 HttpError with a Danish message when the limit is exceeded.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number) {
  const now = Date.now();
  const resetAt = now + windowSeconds * 1000;
  const [row] = await db
    .insert(rateLimits)
    .values({ key, count: 1, resetAt })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        count: sql`CASE WHEN ${rateLimits.resetAt} < ${now} THEN 1 ELSE ${rateLimits.count} + 1 END`,
        resetAt: sql`CASE WHEN ${rateLimits.resetAt} < ${now} THEN ${resetAt} ELSE ${rateLimits.resetAt} END`,
      },
    })
    .returning();

  if (now - lastCleanup > 10 * 60 * 1000) {
    lastCleanup = now;
    void db.delete(rateLimits).where(lt(rateLimits.resetAt, now)).catch(() => undefined);
  }

  if (row && row.count > limit) {
    const minutes = Math.max(1, Math.ceil((row.resetAt - now) / 60000));
    throw new HttpError(429, da.errors.tooMany, { n: minutes });
  }
}
