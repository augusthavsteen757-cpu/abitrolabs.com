import { sqliteTable, text, integer, real, index, blob, primaryKey } from "drizzle-orm/sqlite-core";
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
  /** Set when Pro is cancelled: Pro keeps working until this date, then the account falls back to Gratis. */
  planEndsAt: integer("plan_ends_at", { mode: "timestamp_ms" }),
  /** Danish postal code used to find nearby contractors and show distances. */
  postalCode: text("postal_code"),
  /** Bumped to invalidate all existing sessions (log out everywhere, password change). */
  sessionVersion: integer("session_version").notNull().default(0),
  acceptedTermsAt: integer("accepted_terms_at", { mode: "timestamp_ms" }),
  /** Last time the user was active (at most updated daily). Inactive accounts are deleted after 3 years. */
  lastSeenAt: integer("last_seen_at", { mode: "timestamp_ms" }),
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
    // Nullable: payment records are kept for bookkeeping (bogføringsloven, 5 år) after account deletion.
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    kind: text("kind", { enum: ["PRO_MONTHLY", "SINGLE"] }).notNull(),
    amountDkk: integer("amount_dkk").notNull(),
    provider: text("provider", { enum: ["stripe", "simulated"] }).notNull(),
    reference: text("reference"),
    /** When the customer consented to immediate delivery (forbrugeraftaleloven § 18, stk. 2, nr. 13). */
    consentAt: integer("consent_at", { mode: "timestamp_ms" }),
    /** The exact consent wording the customer accepted (proof for the right-of-withdrawal rules). */
    consentText: text("consent_text"),
    /** Stripe payment intent – needed to refund a withdrawal. */
    paymentIntent: text("payment_intent"),
    /** A monthly Pro renewal (not a new contract, so no new withdrawal period). */
    renewal: integer("renewal", { mode: "boolean" }).default(false),
    refundedAt: integer("refunded_at", { mode: "timestamp_ms" }),
    refundedOere: integer("refunded_oere"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  },
  (t) => [index("payments_user_idx").on(t.userId)],
);

/** Fixed-window rate limit counters (works across server instances because it lives in the database). */
export const rateLimits = sqliteTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  resetAt: integer("reset_at").notNull(),
});

/** Cached postal code → coordinates lookups. */
export const geoCache = sqliteTable("geo_cache", {
  postalCode: text("postal_code").primaryKey(),
  name: text("name"),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  approx: integer("approx", { mode: "boolean" }).notNull().default(false),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

/**
 * Uploaded files stored in the database (used on hosts without a permanent disk, e.g. Render free + Turso).
 * Split into 512 KB chunks to stay well under per-row and per-request limits.
 */
export const fileChunks = sqliteTable(
  "file_chunks",
  {
    key: text("key").notNull(),
    idx: integer("idx").notNull(),
    data: blob("data", { mode: "buffer" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.key, t.idx] })],
);

export type User = typeof users.$inferSelect;
export type Quote = typeof quotes.$inferSelect;
export type ContractorMessage = typeof contractorMessages.$inferSelect;
export type Payment = typeof payments.$inferSelect;
