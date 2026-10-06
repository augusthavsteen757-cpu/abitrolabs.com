import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";
import { randomBytes } from "crypto";

export const newId = () => randomBytes(12).toString("base64url");

export const users = sqliteTable("users", {
  id: text("id").primaryKey().$defaultFn(newId),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  plan: text("plan", { enum: ["FREE", "PRO"] }).notNull().default("FREE"),
  extraCredits: integer("extra_credits").notNull().default(0),
  periodStart: integer("period_start", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  periodUsed: integer("period_used").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export const quotes = sqliteTable(
  "quotes",
  {
    id: text("id").primaryKey().$defaultFn(newId),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    projectName: text("project_name").notNull().default("Mit projekt"),
    fileName: text("file_name").notNull(),
    fileKey: text("file_key").notNull(),
    mimeType: text("mime_type").notNull(),
    fileSize: integer("file_size").notNull(),
    status: text("status", { enum: ["PENDING", "ANALYZING", "DONE", "FAILED"] }).notNull().default("PENDING"),
    error: text("error"),
    contractorName: text("contractor_name"),
    title: text("title"),
    totalInclVat: real("total_incl_vat"),
    score: integer("score"),
    analysisJson: text("analysis_json"),
    unlocked: integer("unlocked", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  },
  (t) => [index("quotes_user_idx").on(t.userId)],
);

export const contractorMessages = sqliteTable(
  "contractor_messages",
  {
    id: text("id").primaryKey().$defaultFn(newId),
    quoteId: text("quote_id")
      .notNull()
      .references(() => quotes.id, { onDelete: "cascade" }),
    topic: text("topic").notNull(),
    body: text("body").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  },
  (t) => [index("messages_quote_idx").on(t.quoteId)],
);

export const payments = sqliteTable(
  "payments",
  {
    id: text("id").primaryKey().$defaultFn(newId),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["PRO_MONTHLY", "SINGLE"] }).notNull(),
    amountDkk: integer("amount_dkk").notNull(),
    provider: text("provider", { enum: ["stripe", "simulated"] }).notNull(),
    reference: text("reference"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  },
  (t) => [index("payments_user_idx").on(t.userId)],
);

export type User = typeof users.$inferSelect;
export type Quote = typeof quotes.$inferSelect;
export type ContractorMessage = typeof contractorMessages.$inferSelect;
export type Payment = typeof payments.$inferSelect;
