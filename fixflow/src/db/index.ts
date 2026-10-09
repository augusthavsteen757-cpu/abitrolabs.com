import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { mkdirSync } from "fs";
import path from "path";
import * as schema from "./schema";

const url = process.env.DATABASE_URL || "file:./data/fixflow.db";

// On hosts without a persistent disk a local SQLite file is wiped on every restart – refuse to start
// instead of silently losing all users and quotes (set ALLOW_LOCAL_DB=1 for Docker with a volume or tests).
if (
  process.env.NODE_ENV === "production" &&
  process.env.NEXT_PHASE !== "phase-production-build" &&
  url.startsWith("file:") &&
  process.env.ALLOW_LOCAL_DB !== "1"
) {
  throw new Error("DATABASE_URL points to a local file in production. Set a Turso URL, or ALLOW_LOCAL_DB=1 if the file is on a persistent volume.");
}

function makeClient(): Client {
  if (url.startsWith("file:")) {
    const filePath = url.slice("file:".length);
    mkdirSync(path.dirname(path.resolve(filePath)), { recursive: true });
  }
  const client = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN || undefined });
  // SQLite needs this per connection for ON DELETE CASCADE to work.
  void client.execute("PRAGMA foreign_keys = ON").catch(() => undefined);
  return client;
}

const globalForDb = globalThis as unknown as { __ffClient?: Client; __ffDb?: LibSQLDatabase<typeof schema> };

const client = globalForDb.__ffClient ?? makeClient();
export const db = globalForDb.__ffDb ?? drizzle(client, { schema });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__ffClient = client;
  globalForDb.__ffDb = db;
}

export { schema };
