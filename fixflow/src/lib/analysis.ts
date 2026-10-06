import { z } from "zod";

export const CATEGORIES = [
  "Arbejdsløn",
  "Materialer",
  "Kørsel",
  "Bortskaffelse",
  "Leje af udstyr",
  "Projektering",
  "Diverse",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const CHECK_KEYS = [
  "cvr",
  "validity",
  "timeline",
  "payment",
  "vat",
  "materials",
  "hourly",
  "unforeseen",
  "cleanup",
  "warranty",
] as const;
export type CheckKey = (typeof CHECK_KEYS)[number];

export const CHECK_LABELS: Record<CheckKey, string> = {
  cvr: "CVR-nummer og firmaoplysninger",
  validity: "Hvor længe tilbuddet gælder",
  timeline: "Tidsplan (start og aflevering)",
  payment: "Betalingsplan (rater, forfald)",
  vat: "Priser tydeligt med eller uden moms",
  materials: "Materialer specificeret (mærke, type, mængde)",
  hourly: "Timepris for ekstraarbejde",
  unforeseen: "Hvordan uforudsete udgifter håndteres",
  cleanup: "Oprydning og bortskaffelse",
  warranty: "Garanti, forsikring eller byggeskadeordning",
};

export const PRICE_TYPE_LABELS = {
  fast_pris: "Fast pris",
  tilbud: "Tilbud",
  overslag: "Overslag",
  uklart: "Uklar prisform",
} as const;
export type PriceType = keyof typeof PRICE_TYPE_LABELS;

const str = z.string().nullable().catch(null);
const num = z.coerce.number().refine(Number.isFinite).nullable().catch(null);

const lineItemSchema = z.object({
  description: z.string().catch("Ukendt post"),
  category: z.enum(CATEGORIES).catch("Diverse"),
  amount: z.coerce.number().refine(Number.isFinite).catch(0),
  quantity: num,
  unit: str,
  unitPrice: num,
  explanation: z.string().catch(""),
  clarity: z.enum(["clear", "vague", "unclear"]).catch("vague"),
  note: str,
});
export type LineItem = z.infer<typeof lineItemSchema>;

const flagSchema = z.object({
  severity: z.enum(["high", "medium", "low"]).catch("medium"),
  type: z.enum(["hidden_cost", "vague_item", "missing_info", "terms", "price"]).catch("missing_info"),
  title: z.string().catch("Punkt der bør afklares"),
  explanation: z.string().catch(""),
  relatedItem: str,
  estimatedExtraMin: num,
  estimatedExtraMax: num,
});
export type Flag = z.infer<typeof flagSchema>;

const checkSchema = z.object({
  key: z.enum(CHECK_KEYS),
  present: z.boolean().catch(false),
  note: z.string().catch(""),
});
export type Check = z.infer<typeof checkSchema>;

const questionSchema = z.object({
  question: z.string(),
  why: z.string().catch(""),
  priority: z.enum(["high", "medium", "low"]).catch("medium"),
});
export type Question = z.infer<typeof questionSchema>;

/** Keeps the valid elements of an array and silently drops broken ones. */
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

export const rawAnalysisSchema = z.object({
  contractor: z
    .object({ name: str, cvr: str, phone: str, email: str, address: str })
    .catch({ name: null, cvr: null, phone: null, email: null, address: null }),
  title: z.string().catch("Håndværkertilbud"),
  quoteDate: str,
  validUntil: str,
  priceType: z.enum(["fast_pris", "tilbud", "overslag", "uklart"]).catch("uklart"),
  totals: z
    .object({ exclVat: num, vat: num, inclVat: num })
    .catch({ exclVat: null, vat: null, inclVat: null }),
  summary: z.string().catch(""),
  lineItems: lenientArray(lineItemSchema),
  flags: lenientArray(flagSchema),
  checks: lenientArray(checkSchema),
  questions: lenientArray(questionSchema),
  extraCostRisk: z
    .object({ min: z.coerce.number().catch(0), max: z.coerce.number().catch(0), explanation: z.string().catch("") })
    .catch({ min: 0, max: 0, explanation: "" }),
});

export type ScoreBreakdownItem = { key: string; label: string; points: number; max: number; hint: string };
export type ScoreResult = { total: number; label: string; breakdown: ScoreBreakdownItem[] };

export type QuoteAnalysis = Omit<z.infer<typeof rawAnalysisSchema>, "totals"> & {
  totals: { exclVat: number; vat: number; inclVat: number };
  score: ScoreResult;
  demo?: boolean;
};

const round = (n: number) => Math.round(n * 100) / 100;

/** Validates raw model output and fills in gaps so the UI never has to guess. */
export function normalizeAnalysis(raw: unknown): Omit<QuoteAnalysis, "score"> {
  const a = rawAnalysisSchema.parse(raw ?? {});

  let { exclVat, vat, inclVat } = a.totals;
  const sumItems = a.lineItems.reduce((s, i) => s + i.amount, 0);
  if (exclVat == null && inclVat != null) exclVat = inclVat / 1.25;
  if (exclVat == null && vat != null) exclVat = vat * 4;
  if (exclVat == null) exclVat = sumItems;
  if (vat == null) vat = inclVat != null ? inclVat - exclVat : exclVat * 0.25;
  if (inclVat == null) inclVat = exclVat + vat;

  // Make sure all 10 checks are present exactly once, in a stable order.
  const byKey = new Map(a.checks.map((c) => [c.key, c]));
  const checks = CHECK_KEYS.map((key) => byKey.get(key) ?? { key, present: false, note: "Ikke nævnt i tilbuddet." });

  const order = { high: 0, medium: 1, low: 2 } as const;
  const flags = [...a.flags].sort((x, y) => order[x.severity] - order[y.severity]);

  const min = Math.max(0, a.extraCostRisk.min || 0);
  const max = Math.max(min, a.extraCostRisk.max || 0);

  return {
    ...a,
    totals: { exclVat: round(exclVat), vat: round(vat), inclVat: round(inclVat) },
    checks,
    flags,
    extraCostRisk: { ...a.extraCostRisk, min, max },
  };
}

export function parseStoredAnalysis(json: string | null): QuoteAnalysis | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as QuoteAnalysis;
  } catch {
    return null;
  }
}

/** Share of the amount (excl. VAT) that sits in vague or unclear line items, 0..1 */
export function unspecifiedShare(a: Pick<QuoteAnalysis, "lineItems">): number {
  const total = a.lineItems.reduce((s, i) => s + Math.max(0, i.amount), 0);
  if (total <= 0) return 1;
  const unclear = a.lineItems.filter((i) => i.clarity !== "clear").reduce((s, i) => s + Math.max(0, i.amount), 0);
  return unclear / total;
}

export function categoryTotals(a: Pick<QuoteAnalysis, "lineItems">): Record<Category, number> {
  const out = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<Category, number>;
  for (const i of a.lineItems) out[i.category] += i.amount;
  return out;
}

/** Worst case incl. VAT: price + maximum estimated extra cost (estimates are excl. VAT). */
export function worstCase(a: Pick<QuoteAnalysis, "totals" | "extraCostRisk">): number {
  return a.totals.inclVat + a.extraCostRisk.max * 1.25;
}
