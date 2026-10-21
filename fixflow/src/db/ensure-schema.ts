import { sql } from "drizzle-orm";
import { db } from "./index";

/**
 * Additive schema changes applied at startup, before anything else touches the database.
 *
 * Why: the container runs `drizzle-kit push` first, but for some changes on Turso it stops to ask
 * "THIS ACTION WILL CAUSE DATA LOSS – do you still want to push?" (e.g. a new NOT NULL column on a table
 * with rows). There is no terminal to answer, so nothing is applied and the app crashes on the missing
 * column. Forcing the push is not an option: it would empty the table. These statements only ever ADD
 * (IF NOT EXISTS / column missing), never drop or rewrite, and match what drizzle-kit itself would create,
 * so the next push sees no difference.
 */
const TABLES = [
  `CREATE TABLE IF NOT EXISTS \`partner_codes\` (
	\`code\` text PRIMARY KEY NOT NULL,
	\`max_uses\` integer NOT NULL,
	\`uses\` integer DEFAULT 0 NOT NULL,
	\`credits\` integer DEFAULT 1 NOT NULL,
	\`created_at\` integer NOT NULL
)`,
  `CREATE TABLE IF NOT EXISTS \`code_redemptions\` (
	\`code\` text NOT NULL,
	\`user_id\` text NOT NULL,
	\`created_at\` integer NOT NULL,
	PRIMARY KEY(\`code\`, \`user_id\`),
	FOREIGN KEY (\`code\`) REFERENCES \`partner_codes\`(\`code\`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
)`,
  `CREATE TABLE IF NOT EXISTS \`usage_events\` (
	\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	\`name\` text NOT NULL,
	\`day\` text NOT NULL
)`,
  "CREATE INDEX IF NOT EXISTS `usage_events_day_idx` ON `usage_events` (`day`,`name`)",
];

/** [table, column, definition] – added with ALTER TABLE only when missing. */
const COLUMNS: [string, string, string][] = [
  ["users", "gift_credits", "integer DEFAULT 0 NOT NULL"],
  ["quotes", "job_context", "text"],
  ["users", "beta_limit", "integer"],
  ["users", "guest", "integer"],
];

export async function ensureSchema() {
  for (const [table, column, definition] of COLUMNS) {
    const info = await db.all<{ name: string }>(sql.raw(`PRAGMA table_info(\`${table}\`)`));
    if (info.length && !info.some((c) => c.name === column)) {
      await db.run(sql.raw(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`));
      console.info(JSON.stringify({ event: "schema_column_added", table, column }));
    }
  }
  for (const statement of TABLES) await db.run(sql.raw(statement));
}
