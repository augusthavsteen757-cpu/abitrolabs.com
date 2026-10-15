import { z } from "zod";
import { languageCode } from "./analysis";

/**
 * "Tjek regningen": the invoice compared with the quote it belongs to. The AI only describes differences and
 * suggests questions – it never says whether the customer must pay (that would be legal advice).
 */

/** How one invoice line relates to the quote. */
export const INVOICE_ITEM_STATUSES = ["as_quoted", "higher", "lower", "open_in_quote", "new"] as const;
export type InvoiceItemStatus = (typeof INVOICE_ITEM_STATUSES)[number];

const str = z.string().nullable().catch(null);
const num = z.coerce.number().refine(Number.isFinite).nullable().catch(null);

function lenientArray<T extends z.ZodTypeAny>(item: T) {
  return z
    .array(z.unknown())
    .catch([])
    .transform((arr) =>
      arr.flatMap((v) => {
        const r = item.safeParse(v);
        return r.success ? [r.data as z.infer<T>] : [];
      }),
    );
}

const itemSchema = z.object({
  description: z.string().min(1),
  /** Amount on the invoice, excl. VAT. */
  invoiceAmount: z.coerce.number().refine(Number.isFinite).catch(0),
  /** The matching amount in the quote, excl. VAT (null when the quote had no price for it). */
  quoteAmount: num,
  status: z.enum(INVOICE_ITEM_STATUSES).catch("new"),
  note: z.string().catch(""),
});
export type InvoiceItem = z.infer<typeof itemSchema>;

const missingSchema = z.object({
  description: z.string().min(1),
  quoteAmount: num,
});

const questionSchema = z.object({ question: z.string().min(1), why: z.string().catch("") });

export const rawInvoiceSchema = z.object({
  contractorName: str,
  invoiceDate: str,
  totals: z.object({ exclVat: num, vat: num, inclVat: num }).catch({ exclVat: null, vat: null, inclVat: null }),
  currency: z
    .string()
    .transform((c) => c.trim().toUpperCase())
    .pipe(z.string().regex(/^[A-Z]{3}$/))
    .catch("DKK"),
  language: z.string().transform((v) => languageCode(v)).catch("da"),
  outputLocale: z.string().catch("da"),
  summary: z.string().catch(""),
  items: lenientArray(itemSchema),
  missingFromInvoice: lenientArray(missingSchema),
  questions: lenientArray(questionSchema),
  documentCheck: z
    .object({
      isInvoice: z.boolean().catch(true),
      /** "final" = slutregning, "partial" = a conto/delregning, "unclear" = can't tell. */
      invoiceKind: z.enum(["final", "partial", "unclear"]).catch("unclear"),
      /** Does the invoice belong to the same firm and job as the quote? */
      sameJob: z.enum(["yes", "no", "unclear"]).catch("unclear"),
      readability: z.enum(["good", "partial", "poor"]).catch("good"),
      unreadableNote: str,
      suspiciousInstructions: z.boolean().catch(false),
    })
    .catch({ isInvoice: true, invoiceKind: "unclear" as const, sameJob: "unclear" as const, readability: "good" as const, unreadableNote: null, suspiciousInstructions: false }),
});

export type InvoiceResult = z.infer<typeof rawInvoiceSchema> & {
  /** Invoice total incl. VAT as Klardal reads it (stated, or worked out from excl. VAT + 25 %). */
  invoiceInclVat: number | null;
  /** The quote's total incl. VAT when the check was made (the quote can't change afterwards, but its VAT choice can). */
  quoteInclVat: number | null;
  /** Invoice minus quote, incl. VAT. Only for a final invoice in the quote's currency – otherwise null. */
  differenceInclVat: number | null;
  /** Sum of lines that are not in the quote, excl. VAT. */
  newSum: number;
  /** Sum of what lines cost more than quoted, excl. VAT. */
  higherSum: number;
  demo?: boolean;
  cprHidden?: number;
};

const round = (n: number) => Math.round(n * 100) / 100;
const SEVERITY: Record<InvoiceItemStatus, number> = { new: 0, higher: 1, open_in_quote: 2, lower: 3, as_quoted: 4 };

/** Validates the model's output and adds the numbers Klardal works out itself (never left to the AI). */
export function normalizeInvoice(raw: unknown, quote: { inclVat: number | null; currency: string }): InvoiceResult {
  const a = rawInvoiceSchema.parse(raw ?? {});
  const t = a.totals;
  const invoiceInclVat = t.inclVat ?? (t.exclVat != null ? (t.vat != null ? t.exclVat + t.vat : t.exclVat * 1.25) : null);
  // Lines that match the quote within 1 % (or 1 kr.) are "as quoted", whatever the model called them.
  const items = a.items
    .map((i) => {
      if (i.quoteAmount == null || i.status === "new" || i.status === "open_in_quote") return i;
      const diff = i.invoiceAmount - i.quoteAmount;
      if (Math.abs(diff) <= Math.max(1, Math.abs(i.quoteAmount) * 0.01)) return { ...i, status: "as_quoted" as const };
      return { ...i, status: diff > 0 ? ("higher" as const) : ("lower" as const) };
    })
    .sort((x, y) => SEVERITY[x.status] - SEVERITY[y.status]);
  const invoiceTotal = invoiceInclVat == null ? null : round(invoiceInclVat);
  return {
    ...a,
    items,
    invoiceInclVat: invoiceTotal,
    quoteInclVat: quote.inclVat == null ? null : round(quote.inclVat),
    differenceInclVat: invoiceDifference({ ...a, invoiceInclVat: invoiceTotal }, quote),
    newSum: round(items.filter((i) => i.status === "new").reduce((s, i) => s + Math.max(0, i.invoiceAmount), 0)),
    higherSum: round(items.filter((i) => i.status === "higher").reduce((s, i) => s + Math.max(0, i.invoiceAmount - (i.quoteAmount ?? 0)), 0)),
  };
}

/**
 * Invoice minus quote, incl. VAT – only when that comparison is fair: a final invoice for the same job, in the
 * quote's currency. Worked out again on every page view, so it follows a later change of the quote's VAT choice.
 */
export function invoiceDifference(
  r: Pick<InvoiceResult, "documentCheck" | "currency" | "invoiceInclVat">,
  quote: { inclVat: number | null; currency: string },
): number | null {
  if (r.documentCheck.invoiceKind !== "final" || r.documentCheck.sameJob === "no") return null;
  if (r.currency !== quote.currency || r.invoiceInclVat == null || quote.inclVat == null) return null;
  return round(r.invoiceInclVat - quote.inclVat);
}

export function parseStoredInvoice(json: string | null): InvoiceResult | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as InvoiceResult;
  } catch {
    return null;
  }
}
