import { da } from "@/i18n/dict/da";
import "server-only";
import { headers } from "next/headers";
import { lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { rateLimits } from "@/db/schema";
import { HttpError } from "./auth";

/** Best-effort client IP. Behind a proxy, make sure it sets X-Forwarded-For (Vercel, Caddy and nginx do). */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  return (fwd?.split(",")[0] || h.get("x-real-ip") || "unknown").trim().slice(0, 64);
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
