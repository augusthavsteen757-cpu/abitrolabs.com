import "dotenv/config";
import { mkdirSync } from "fs";
import path from "path";
import { defineConfig } from "drizzle-kit";

const url = process.env.DATABASE_URL || "file:./data/fixflow.db";
// SQLite can't create the file if its folder is missing.
if (url.startsWith("file:")) mkdirSync(path.dirname(path.resolve(url.slice(5))), { recursive: true });

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: url.startsWith("file:") ? "sqlite" : "turso",
  dbCredentials: { url, authToken: process.env.DATABASE_AUTH_TOKEN || undefined },
});
