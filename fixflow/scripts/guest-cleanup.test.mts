/**
 * Unclaimed guest checks are deleted after 7 days with their quotes; real accounts and newer guests stay.
 * Uses its own throw-away SQLite database:  npx tsx --import ./scripts/no-server-only.mjs scripts/guest-cleanup.test.mts
 */
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const dir = mkdtempSync(path.join(tmpdir(), "klardal-guest-"));
process.env.DATABASE_URL = `file:${path.join(dir, "test.db")}`;
process.env.UPLOAD_DIR = path.join(dir, "uploads");
execSync("npx drizzle-kit push", { stdio: "ignore", env: process.env });

const { db } = await import("../src/db/index");
const { users, quotes } = await import("../src/db/schema");
const { createGuest, deleteOldGuests } = await import("../src/lib/guest");
const { eq } = await import("drizzle-orm");

const DAY = 24 * 60 * 60 * 1000;
const old = await createGuest();
const fresh = await createGuest();
const [real] = await db.insert(users).values({ name: "", email: "anna@eksempel.dk", passwordHash: "x" }).returning();
const eightDaysAgo = new Date(Date.now() - 8 * DAY);
await db.update(users).set({ createdAt: eightDaysAgo }).where(eq(users.id, old.id));
await db.update(users).set({ createdAt: eightDaysAgo }).where(eq(users.id, real.id));
await db.insert(quotes).values({ userId: old.id, fileName: "t.pdf", fileKey: "missing-key", mimeType: "application/pdf", fileSize: 1 });

assert.ok(old.email.endsWith("@gaest.klardal.invalid") && old.guest === true, "guest has a placeholder e-mail and the flag");
assert.notEqual(old.email, fresh.email, "every guest gets its own placeholder e-mail");
const deleted = await deleteOldGuests();
assert.equal(deleted, 1, "only the guest older than 7 days is deleted");
const left = (await db.select({ id: users.id }).from(users)).map((u) => u.id).sort();
assert.deepEqual(left, [fresh.id, real.id].sort(), "the newer guest and the 8-day-old real account stay");
assert.equal((await db.select().from(quotes)).length, 0, "the old guest's quote is deleted too");
console.log("  ✓ unclaimed guests are deleted after 7 days with their quotes; accounts and newer guests stay");
