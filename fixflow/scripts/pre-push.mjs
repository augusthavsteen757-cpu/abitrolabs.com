// Runs before `drizzle-kit push` at startup. Adds columns that drizzle-kit can't add on its own.
// drizzle-kit wants to `delete from users` before adding a NOT NULL column to a table with rows, even when the
// column has a default, and stops at a data-loss prompt. Adding the column here first leaves push nothing to do.
import "dotenv/config";
import { createClient } from "@libsql/client";

const url = process.env.DATABASE_URL || "file:./data/fixflow.db";
const db = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN || undefined });

const COLUMNS = [["users", "gift_credits", "integer DEFAULT 0 NOT NULL"]];

for (const [table, column, type] of COLUMNS) {
  const tables = await db.execute({ sql: "select 1 from sqlite_master where type = 'table' and name = ?", args: [table] });
  if (!tables.rows.length) continue; // a fresh database: push creates the table with the column
  const cols = await db.execute(`pragma table_info(\`${table}\`)`);
  if (cols.rows.some((c) => c.name === column)) continue;
  await db.execute(`ALTER TABLE \`${table}\` ADD \`${column}\` ${type}`);
  console.log(JSON.stringify({ event: "column_added", table, column }));
}
db.close();
