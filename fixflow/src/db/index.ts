import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { mkdirSync } from "fs";
import path from "path";
import * as schema from "./schema";

const url = process.env.DATABASE_URL || "file:./data/fixflow.db";

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
