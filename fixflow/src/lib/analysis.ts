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

/** Danish rules and schemes checked for every quote (shown separately – not part of the score). */
export const RULE_KEYS = [
  "autorisation",
  "abForbruger",
  "fradrag",
  "rut",
  "tilladelse",
  "miljoe",
  "vaadrum",
  "ankenaevn",
] as const;
export type RuleKey = (typeof RULE_KEYS)[number];

export const RULE_LABELS: Record<RuleKey, string> = {
  autorisation: "Autorisation til el, VVS, kloak eller gas",
  abForbruger: "AB-Forbruger eller tilsvarende vilkår",
  fradrag: "Arbejdsløn opgjort for sig (håndværkerfradrag)",
  rut: "Udenlandsk firma registreret i RUT",
  tilladelse: "Byggetilladelse eller anmeldelse til kommunen",
  miljoe: "Asbest, PCB og bly i ældre bygninger",
  vaadrum: "Vådrum efter BUILD-anvisning 252",
  ankenaevn: "Byggeriets Ankenævn eller garantiordning",
};

const LANGUAGE_NAMES_DA: Record<string, string> = {
  dansk: "da", engelsk: "en", svensk: "sv", norsk: "no", tysk: "de", polsk: "pl", ukrainsk: "uk", rumænsk: "ro",
  litauisk: "lt", lettisk: "lv", estisk: "et", finsk: "fi", fransk: "fr", spansk: "es", italiensk: "it", hollandsk: "nl",
};

/** Normalises "dansk" / "Danish" / "da-DK" / "DA" to an ISO 639-1 code. Unknown → "da". */
export function languageCode(v: unknown): string {
  if (typeof v !== "string") return "da";
  const s = v.trim().toLowerCase();
  if (/^[a-z]{2}(-[a-z]{2})?$/.test(s)) return s.slice(0, 2) === "nb" || s.slice(0, 2) === "nn" ? "no" : s.slice(0, 2);
  const word = s.split(/[\s(,]/)[0];
  if (LANGUAGE_NAMES_DA[word]) return LANGUAGE_NAMES_DA[word];
  const en: Record<string, string> = { danish: "da", english: "en", swedish: "sv", norwegian: "no", german: "de", polish: "pl", ukrainian: "uk", romanian: "ro" };
  return en[word] ?? "da";
}

/** "sv" → "svensk" / "Swedish" / "szwedzki" … in the viewer's language. */
export function languageDisplayName(code: string | null | undefined, intlLocale: string): string {
  if (!code) return "";
  try {
    return new Intl.DisplayNames([intlLocale], { type: "language" }).of(code) ?? code;
  } catch {
    return code;
  }
}

export const PRICE_LEVEL_LABELS = { lav: "Lav pris", normal: "Normal pris", hoej: "Høj pris", ukendt: "Kan ikke vurderes" } as const;

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

const ruleSchema = z.object({
  key: z.enum(RULE_KEYS),
  status: z.enum(["ok", "missing", "unclear", "not_relevant"]).catch("unclear"),
  note: z.string().catch(""),
});
export type Rule = z.infer<typeof ruleSchema>;

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
  /** ISO currency of the quote's amounts. Non-DKK quotes are shown in their own currency. */
  currency: z
    .string()
    .transform((c) => c.trim().toUpperCase())
    .pipe(z.string().regex(/^[A-Z]{3}$/))
    .catch("DKK"),
  /** Language the quote document was written in, as an ISO 639-1 code ("da", "sv", "de", "pl", …). */
  language: z
    .string()
    .transform((v) => languageCode(v))
    .catch("da"),
  /** The UI language the analysis texts were written in. */
  outputLocale: z.string().catch("da"),
  rules: lenientArray(ruleSchema),
  priceLevel: z
    .object({ level: z.enum(["lav", "normal", "hoej", "ukendt"]).catch("ukendt"), explanation: z.string().catch("") })
    .catch({ level: "ukendt" as const, explanation: "" }),
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

  // Keep each Danish rule once, in a stable order; drop the ones that don't apply to this job.
  const ruleByKey = new Map(a.rules.map((x) => [x.key, x]));
  const rules = RULE_KEYS.flatMap((key) => {
    const x = ruleByKey.get(key);
    return x && x.status !== "not_relevant" ? [x] : [];
  });

  return {
    ...a,
    rules,
    totals: { exclVat: round(exclVat), vat: round(vat), inclVat: round(inclVat) },
    checks,
    flags,
    extraCostRisk: { ...a.extraCostRisk, min, max },
  };
}

export function parseStoredAnalysis(json: string | null): QuoteAnalysis | null {
  if (!json) return null;
  try {
    const a = JSON.parse(json) as QuoteAnalysis;
    // Analyses saved before the Danish rules / currency fields existed.
    return {
      ...a,
      rules: a.rules ?? [],
      currency: a.currency ?? "DKK",
      language: languageCode(a.language),
      outputLocale: a.outputLocale ?? "da",
      priceLevel: a.priceLevel ?? { level: "ukendt", explanation: "" },
    };
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

/* ------------------------------------------------------------------ */
/* Free preview: the important details stay on the server until paid. */
/* ------------------------------------------------------------------ */

export const FREE_PREVIEW = { flags: 1, itemExplanations: 2, questions: 1 } as const;

export type LockInfo = {
  /** Indexes of flags whose explanation and extra-cost estimate are hidden. */
  flags: number[];
  /** Indexes of line items whose explanation is hidden. */
  items: number[];
  /** The total extra-cost estimate and the price level are hidden. */
  extra: boolean;
  /** How many questions are hidden. */
  questions: number;
};

/**
 * Removes the paid details from an analysis. The real text never leaves the server for a locked
 * quote – the page only shows blurred placeholders – so it can't be read with developer tools.
 */
export function redactForFree(a: QuoteAnalysis): { analysis: QuoteAnalysis; lock: LockInfo } {
  const lock: LockInfo = { flags: [], items: [], extra: true, questions: 0 };
  const flags = a.flags.map((f, i) => {
    if (i < FREE_PREVIEW.flags) return f;
    lock.flags.push(i);
    return { ...f, explanation: "", relatedItem: null, estimatedExtraMin: null, estimatedExtraMax: null };
  });
  const lineItems = a.lineItems.map((it, i) => {
    if (i < FREE_PREVIEW.itemExplanations) return it;
    lock.items.push(i);
    return { ...it, explanation: "", note: null };
  });
  lock.questions = Math.max(0, a.questions.length - FREE_PREVIEW.questions);
  return {
    analysis: {
      ...a,
      flags,
      lineItems,
      questions: a.questions.slice(0, FREE_PREVIEW.questions),
      extraCostRisk: { min: 0, max: 0, explanation: "" },
      priceLevel: { level: "ukendt", explanation: "" },
      rules: (a.rules ?? []).map((x) => ({ ...x, note: "" })),
    },
    lock,
  };
}
